/**
 * HTTP fetch + response adapters for dsh-ocgo-usage
 *
 * Two upstream paths, selected by which credential is configured:
 *
 *  1. **API key** (`cfg.apiKey`, preferred) → `GET {baseUrl}/zen/go/v1/usage`
 *     with `Authorization: Bearer <oc_sk_...>`. This is the documented OpenCode
 *     Go usage endpoint: it returns the three windows already normalized as
 *     `{ usage: { rolling|weekly|monthly: { status, percent, resetsAt } } }`,
 *     with `percent` as the USED share (0–100) and `resetsAt` an ISO instant.
 *     It does not expire with the browser session.
 *
 *  2. **Session cookie** (fallback) → `GET {baseUrl}/console/api/go/status`
 *     with `Cookie` + `x-org-id`. This is the console SPA's own JSON API; it
 *     reports meters as micro-cent strings and the monthly reset as
 *     `access.endsAt`. Kept so a cookie-only setup keeps working.
 *
 * Historical note: until 2026-09 the plugin scraped a server-rendered page at
 * `/workspace/<wrk>/go`. opencode.ai replaced it with a client-rendered SPA, so
 * that route now redirects to `/console/login` — which surfaced as
 * `error 302` in the chip.
 *
 * @module dsh-ocgo-usage/api
 */

import type { NormalizedUsage, OcgoConfig, UsageWindow, UsageWindowKind } from './types.ts'

// ============================================================================
// Errors
// ============================================================================

/** Error thrown by the HTTP / parsing layer; carries a short code for the UI. */
export class UsageError extends Error {
  override readonly name = 'UsageError'
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
  }
}

// ============================================================================
// HTTP wrapper
// ============================================================================

/** One GET result: status plus the parsed JSON body when it was JSON. */
interface ApiResponse {
  readonly status: number
  readonly json?: unknown
  readonly text: string
}

/**
 * GET a usage endpoint. Never throws on a non-2xx status — the caller maps the
 * status onto a user-facing error so `401` can be told apart from a genuine
 * transport failure.
 */
async function getJson(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<ApiResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'GET', headers, signal: controller.signal })
    const text = await res.text()
    let json: unknown
    if (text.length > 0) {
      try {
        json = JSON.parse(text) as unknown
      } catch {
        json = undefined
      }
    }
    return { status: res.status, json, text }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new UsageError(`Request timed out after ${timeoutMs}ms`, 'timeout')
    }
    throw new UsageError(String(e instanceof Error ? e.message : e), 'fetch')
  } finally {
    clearTimeout(timer)
  }
}

/** Strip query params from a URL for safe error messages. */
function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}${u.pathname}`
  } catch {
    return url
  }
}

/**
 * Identify this client upstream.
 *
 * A custom User-Agent is REQUIRED, not cosmetic: the default Python/urllib
 * style UA is rejected by Cloudflare with `Error 1010: Access denied` (403).
 * Kept version-neutral so a release bump never has to touch this file.
 */
const USER_AGENT = 'dsh-ocgo-usage (+https://github.com/ZIYE-JK/dsh-ocgo-usage)'

// ============================================================================
// Path 1 (preferred): GET /zen/go/v1/usage — documented Go usage API
// ============================================================================

/** Path of the documented Go usage endpoint, relative to the base URL. */
export const GO_USAGE_PATH = '/zen/go/v1/usage'

/**
 * Read usage through the documented Go usage API with a service-account key.
 * Throws UsageError on any failure.
 */
export async function fetchViaApiKey(cfg: OcgoConfig): Promise<Omit<NormalizedUsage, 'updatedAt'>> {
  const apiKey = cfg.apiKey
  if (apiKey === undefined || apiKey.length === 0) {
    throw new UsageError('未配置 OpenCode 服务账号 API Key', 'noconfig')
  }
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}${GO_USAGE_PATH}`
  const res = await getJson(
    url,
    { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', 'User-Agent': USER_AGENT },
    cfg.timeoutMs,
  )

  if (res.status === 401 || res.status === 403) {
    throw new UsageError('认证失败：OpenCode 服务账号 API Key 无效或已被撤销', 'unauthorized')
  }
  if (res.status !== 200) {
    throw new UsageError(upstreamMessage(res) ?? `HTTP ${res.status} for ${sanitizeUrl(url)}`, `http${res.status}`)
  }
  if (res.json === undefined) {
    throw new UsageError('Go usage API returned a non-JSON body', 'badjson')
  }
  return fromGoUsage(res.json, Date.now())
}

/**
 * Map a `/zen/go/v1/usage` payload onto the normalized usage shape.
 *
 * Accepts both the documented `{ usage: { rolling, weekly, monthly } }`
 * envelope and a bare window object, mirroring the upstream's tolerance.
 */
export function fromGoUsage(
  body: unknown,
  nowMs: number,
): Omit<NormalizedUsage, 'updatedAt'> {
  const root = asRecord(body)
  if (root === undefined) throw new UsageError('Go usage API returned no object', 'badjson')

  // Some upstream errors arrive in-band as `{ error: { type, message } }`.
  const envelope = root.error
  if (envelope !== undefined) {
    const error = asRecord(envelope)
    const type = typeof error?.type === 'string' ? error.type : 'api'
    const message = typeof error?.message === 'string' ? error.message : 'OpenCode 返回了错误'
    throw new UsageError(message, type)
  }

  const windows = asRecord(root.usage) ?? root
  const rolling = windowOf('rolling', windows.rolling, nowMs)
  const weekly = windowOf('weekly', windows.weekly, nowMs)
  const monthly = windowOf('monthly', windows.monthly, nowMs)
  if (rolling === undefined && weekly === undefined && monthly === undefined) {
    throw new UsageError('Go usage API 返回了无法识别的额度结构', 'empty')
  }
  return {
    ...(rolling === undefined ? {} : { rolling }),
    ...(weekly === undefined ? {} : { weekly }),
    ...(monthly === undefined ? {} : { monthly }),
  }
}

/** Build one window from the documented `{ status, percent, resetsAt }` shape. */
function windowOf(kind: UsageWindowKind, raw: unknown, nowMs: number): UsageWindow | undefined {
  const w = asRecord(raw)
  if (w === undefined) return undefined
  const percent = clampPercent(asNumber(w.percent) ?? 0)
  const apiStatus = w.status
  return {
    kind,
    percent,
    resetInSec: secondsUntil(w.resetsAt, nowMs),
    status: apiStatus === 'rate-limited' || percent >= 100 ? 'rate-limited' : 'ok',
  }
}

/** Pull a human message out of an in-band upstream error body, if any. */
function upstreamMessage(res: ApiResponse): string | undefined {
  const root = asRecord(res.json)
  const error = asRecord(root?.error)
  const message = error?.message
  if (typeof message === 'string' && message.length > 0) return message
  const rootMessage = root?.message
  return typeof rootMessage === 'string' && rootMessage.length > 0 ? rootMessage : undefined
}

// ============================================================================
// Path 2 (fallback): GET /console/api/go/status — console SPA JSON API
// ============================================================================

/** Path of the console SPA usage endpoint, relative to the base URL. */
export const CONSOLE_GO_STATUS_PATH = '/console/api/go/status'

/**
 * Read usage through the console JSON API with the session cookie.
 * Throws UsageError on any failure.
 */
export async function fetchViaCookie(cfg: OcgoConfig): Promise<Omit<NormalizedUsage, 'updatedAt'>> {
  const cookie = cfg.cookie
  if (cookie === undefined || cookie.length === 0) {
    throw new UsageError('未配置 OpenCode Cookie', 'noconfig')
  }
  const url = `${cfg.baseUrl.replace(/\/+$/, '')}${CONSOLE_GO_STATUS_PATH}`
  const headers: Record<string, string> = {
    Cookie: cookie,
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
  }
  // The console API requires the workspace context for cookie-authenticated
  // reads (it answers `{"_tag":"OrgRequired"}` without it).
  if (cfg.workspaceID) headers['x-org-id'] = cfg.workspaceID

  const res = await getJson(url, headers, cfg.timeoutMs)

  if (res.status === 401 || res.status === 403) {
    throw new UsageError(
      '登录已过期：请在 opencode.ai 控制台重新登录，然后更新 Cookie（更推荐改用服务账号 API Key）',
      'unauthorized',
    )
  }
  if (res.status !== 200) {
    throw new UsageError(`HTTP ${res.status} for ${sanitizeUrl(url)}`, `http${res.status}`)
  }
  if (res.json === undefined) {
    throw new UsageError('Console usage API returned a non-JSON body', 'badjson')
  }
  return fromGoStatus(asRecord(res.json), Date.now())
}

/**
 * Map a `/console/api/go/status` payload onto the normalized usage shape.
 *
 * Meters report `limitMicroCents` / `usedMicroCents` as decimal STRINGS; the
 * monthly meter carries no `resetsAt`, so its reset comes from `access.endsAt`.
 */
export function fromGoStatus(
  root: Record<string, unknown> | undefined,
  nowMs: number,
): Omit<NormalizedUsage, 'updatedAt'> {
  if (root === undefined) throw new UsageError('Console usage API returned no object', 'badjson')

  // Tagged error bodies (`{"_tag":"Unauthorized"|"OrgRequired"|...}`) may arrive
  // with a 200; surface them instead of reporting "no data".
  const tag = root._tag
  if (typeof tag === 'string' && tag.length > 0) {
    if (tag === 'OrgRequired') {
      throw new UsageError('缺少组织上下文：workspaceID 未配置或无效', 'org-required')
    }
    throw new UsageError(`OpenCode 返回错误：${tag}`, 'api')
  }

  const access = asRecord(root.access)
  if (access === undefined) {
    // `access` is optional and absent when there is no live Go subscription.
    throw new UsageError('该账号当前没有可用的 OpenCode Go 订阅', 'noaccess')
  }

  const meters = asRecord(access.meters)
  const rolling = meterWindow('rolling', meters?.fiveHour, nowMs)
  const weekly = meterWindow('weekly', meters?.week, nowMs)
  const monthly = meterWindow('monthly', meters?.month, nowMs, access.endsAt)

  return {
    ...(rolling === undefined ? {} : { rolling }),
    ...(weekly === undefined ? {} : { weekly }),
    ...(monthly === undefined ? {} : { monthly }),
  }
}

/**
 * Build one usage window from a console meter object. `fallbackResetIso` is
 * used when the meter has no `resetsAt` (monthly resets with the period).
 */
function meterWindow(
  kind: UsageWindowKind,
  raw: unknown,
  nowMs: number,
  fallbackResetIso?: unknown,
): UsageWindow | undefined {
  const meter = asRecord(raw)
  if (meter === undefined) return undefined
  const percent = percentOf(asNumber(meter.limitMicroCents), asNumber(meter.usedMicroCents))
  return {
    kind,
    percent,
    resetInSec: secondsUntil(fallbackResetIso ?? meter.resetsAt, nowMs),
    status: percent >= 100 ? 'rate-limited' : 'ok',
  }
}

/** Percent used, clamped into [0, 100] with one decimal place. */
function percentOf(limit: number | undefined, used: number | undefined): number {
  const u = used ?? 0
  // A zero/absent limit means "no metered allowance"; report exhaustion only
  // when something was actually consumed, instead of dividing by zero.
  if (limit === undefined || limit <= 0) return u > 0 ? 100 : 0
  return clampPercent((u / limit) * 100)
}

// ============================================================================
// Orchestrator
// ============================================================================

/**
 * Fetch usage with the current config and stamp the fetch timestamp so the UI
 * can show data freshness. The API key path is preferred; the cookie path is
 * the fallback for setups that only hold a session cookie.
 */
export async function fetchUsage(cfg: OcgoConfig): Promise<NormalizedUsage> {
  const hasKey = cfg.apiKey !== undefined && cfg.apiKey.length > 0
  const data = hasKey ? await fetchViaApiKey(cfg) : await fetchViaCookie(cfg)
  return { ...data, updatedAt: Date.now() }
}

// ============================================================================
// Internal helpers
// ============================================================================

/** Narrow an unknown JSON value to a plain object. */
function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

/** Read a numeric field that the API may encode as a string or a number. */
function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string' && value.length > 0) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

/** Seconds from `nowMs` until an ISO instant; 0 when absent or unparseable. */
function secondsUntil(iso: unknown, nowMs: number): number {
  if (typeof iso !== 'string' || iso.length === 0) return 0
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return 0
  return Math.max(0, Math.round((at - nowMs) / 1000))
}

/** Clamp into [0, 100], keeping one decimal place. */
function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10))
}