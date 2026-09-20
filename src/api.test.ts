/**
 * Unit tests for the usage API layer: response adapters and fetch routing.
 *
 * Covers both upstream paths — the documented Go usage API
 * (`GET /zen/go/v1/usage`, API-key auth) and the console JSON API
 * (`GET /console/api/go/status`, cookie auth).
 * @module dsh-ocgo-usage/api.test
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CONSOLE_GO_STATUS_PATH,
  GO_USAGE_PATH,
  UsageError,
  fetchUsage,
  fromGoStatus,
  fromGoUsage,
} from './api.ts'
import type { OcgoConfig } from './types.ts'

/** Fixed clock: every resetsAt below is expressed relative to this instant. */
const NOW = Date.parse('2026-09-20T16:00:00.000Z')

const HOUR = '2026-09-20T17:00:00.000Z' // NOW + 1h
const DAY = '2026-09-21T16:00:00.000Z' // NOW + 24h
const MONTH = '2026-10-20T16:00:00.000Z' // NOW + 30d
const MONTH_SEC = 30 * 86400

/** The documented `/zen/go/v1/usage` payload. */
const GO_USAGE_BODY = {
  usage: {
    rolling: { status: 'ok', percent: 0, resetsAt: HOUR },
    weekly: { status: 'ok', percent: 21, resetsAt: DAY },
    monthly: { status: 'ok', percent: 12, resetsAt: MONTH },
  },
}

/** A `/console/api/go/status` payload (micro-cent meter strings). */
const GO_STATUS_BODY = {
  subscriberUserId: 'acc_x',
  access: {
    startsAt: '2026-09-01T00:00:00.000Z',
    endsAt: MONTH,
    meters: {
      fiveHour: { resetsAt: HOUR, limitMicroCents: '3000000000', usedMicroCents: '69000000' },
      week: { resetsAt: DAY, limitMicroCents: '3000000000', usedMicroCents: '648000000' },
      // The monthly meter carries no resetsAt: it resets with the period.
      month: { limitMicroCents: '3000000000', usedMicroCents: '360000000' },
    },
  },
}

/** Build a fully-resolved config with just the fields a test cares about. */
function cfg(over: Partial<OcgoConfig> = {}): OcgoConfig {
  return { baseUrl: 'https://opencode.ai', cacheTTL: 300, timeoutMs: 5000, ...over }
}

interface Call {
  url: string
  headers: Record<string, string>
}

/** Stub global fetch and record each request. */
function stubFetch(reply: { status?: number; body?: string }): Call[] {
  const calls: Call[] = []
  vi.stubGlobal('fetch', async (url: unknown, init?: { headers?: Record<string, string> }) => {
    calls.push({ url: String(url), headers: init?.headers ?? {} })
    return new Response(reply.body ?? '', { status: reply.status ?? 200 })
  })
  return calls
}

/** Await a rejection and hand back the error for inspection. */
async function failure(promise: Promise<unknown>): Promise<UsageError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(UsageError)
  return error as UsageError
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ============================================================================
// fromGoUsage — documented Go usage API
// ============================================================================

describe('fromGoUsage', () => {
  it('maps all three windows to percent used + seconds until reset', () => {
    expect(fromGoUsage(GO_USAGE_BODY, NOW)).toEqual({
      rolling: { kind: 'rolling', percent: 0, resetInSec: 3600, status: 'ok' },
      weekly: { kind: 'weekly', percent: 21, resetInSec: 86400, status: 'ok' },
      monthly: { kind: 'monthly', percent: 12, resetInSec: MONTH_SEC, status: 'ok' },
    })
  })

  it('omits a window the API did not report', () => {
    const parsed = fromGoUsage({ usage: { weekly: GO_USAGE_BODY.usage.weekly } }, NOW)
    expect(parsed.rolling).toBeUndefined()
    expect(parsed.weekly?.percent).toBe(21)
    expect(parsed.monthly).toBeUndefined()
  })

  it('accepts a bare window object without the usage envelope', () => {
    expect(fromGoUsage({ weekly: GO_USAGE_BODY.usage.weekly }, NOW).weekly).toEqual({
      kind: 'weekly',
      percent: 21,
      resetInSec: 86400,
      status: 'ok',
    })
  })

  it('trusts the upstream status flag when a window is limited', () => {
    const parsed = fromGoUsage(
      { usage: { rolling: { status: 'rate-limited', percent: 42, resetsAt: HOUR } } },
      NOW,
    )
    expect(parsed.rolling?.status).toBe('rate-limited')
  })

  it('reports rate-limited once a window reaches 100%', () => {
    const parsed = fromGoUsage(
      { usage: { monthly: { status: 'ok', percent: 100, resetsAt: MONTH } } },
      NOW,
    )
    expect(parsed.monthly).toEqual({
      kind: 'monthly',
      percent: 100,
      resetInSec: MONTH_SEC,
      status: 'rate-limited',
    })
  })

  it('keeps one decimal place and clamps into [0, 100]', () => {
    const parsed = fromGoUsage(
      {
        usage: {
          rolling: { percent: 10.53, resetsAt: HOUR },
          weekly: { percent: 150, resetsAt: DAY },
          monthly: { percent: -5, resetsAt: MONTH },
        },
      },
      NOW,
    )
    expect(parsed.rolling?.percent).toBe(10.5)
    expect(parsed.weekly?.percent).toBe(100)
    expect(parsed.monthly?.percent).toBe(0)
  })

  it('reads a percent encoded as a string', () => {
    expect(fromGoUsage({ usage: { weekly: { percent: '21', resetsAt: DAY } } }, NOW).weekly?.percent).toBe(21)
  })

  it('reports zero seconds for a past or missing resetsAt', () => {
    const parsed = fromGoUsage(
      {
        usage: {
          rolling: { percent: 1, resetsAt: '2026-09-20T15:00:00.000Z' }, // already past
          weekly: { percent: 1 }, // absent
        },
      },
      NOW,
    )
    expect(parsed.rolling?.resetInSec).toBe(0)
    expect(parsed.weekly?.resetInSec).toBe(0)
  })

  it('surfaces an in-band error envelope instead of guessing numbers', () => {
    return failure(
      Promise.resolve().then(() =>
        fromGoUsage({ error: { type: 'AuthError', message: 'invalid key' } }, NOW),
      ),
    ).then((error) => {
      expect(error.code).toBe('AuthError')
      expect(error.message).toBe('invalid key')
    })
  })

  it('rejects an unrecognized usage structure as empty', () => {
    expect(() => fromGoUsage({ usage: { somethingElse: 1 } }, NOW)).toThrowError(UsageError)
    try {
      fromGoUsage({}, NOW)
    } catch (e) {
      expect((e as UsageError).code).toBe('empty')
    }
  })

  it('rejects a non-object payload', () => {
    for (const body of [null, undefined, 42, 'text', []]) {
      try {
        fromGoUsage(body, NOW)
        throw new Error('should have thrown')
      } catch (e) {
        expect((e as UsageError).code).toBe('badjson')
      }
    }
  })
})

// ============================================================================
// fromGoStatus — console JSON API fallback
// ============================================================================

describe('fromGoStatus', () => {
  it('converts micro-cent meters and resets the month with the period', () => {
    expect(fromGoStatus(GO_STATUS_BODY as unknown as Record<string, unknown>, NOW)).toEqual({
      rolling: { kind: 'rolling', percent: 2.3, resetInSec: 3600, status: 'ok' },
      weekly: { kind: 'weekly', percent: 21.6, resetInSec: 86400, status: 'ok' },
      monthly: { kind: 'monthly', percent: 12, resetInSec: MONTH_SEC, status: 'ok' },
    })
  })

  it('marks a window rate-limited at 100% used', () => {
    const parsed = fromGoStatus(
      {
        access: {
          endsAt: MONTH,
          meters: { fiveHour: { resetsAt: HOUR, limitMicroCents: '100', usedMicroCents: '100' } },
        },
      },
      NOW,
    )
    expect(parsed.rolling).toEqual({
      kind: 'rolling',
      percent: 100,
      resetInSec: 3600,
      status: 'rate-limited',
    })
  })

  it('treats a zero allowance as exhausted only when something was used', () => {
    const used = fromGoStatus(
      { access: { endsAt: MONTH, meters: { month: { limitMicroCents: '0', usedMicroCents: '5' } } } },
      NOW,
    )
    expect(used.monthly?.percent).toBe(100)
    const unused = fromGoStatus(
      { access: { endsAt: MONTH, meters: { month: { limitMicroCents: '0', usedMicroCents: '0' } } } },
      NOW,
    )
    expect(unused.monthly?.percent).toBe(0)
  })

  it('maps a tagged OrgRequired body to its own error code', () => {
    try {
      fromGoStatus({ _tag: 'OrgRequired', message: 'x-org-id is required' }, NOW)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as UsageError).code).toBe('org-required')
    }
  })

  it('maps any other tagged error body to a generic api error', () => {
    try {
      fromGoStatus({ _tag: 'Unauthorized' }, NOW)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as UsageError).code).toBe('api')
      expect((e as UsageError).message).toContain('Unauthorized')
    }
  })

  it('reports a missing subscription when access is absent', () => {
    try {
      fromGoStatus({ subscriberUserId: 'acc_x' }, NOW)
      throw new Error('should have thrown')
    } catch (e) {
      expect((e as UsageError).code).toBe('noaccess')
    }
  })
})

// ============================================================================
// fetchUsage — credential routing and HTTP status mapping
// ============================================================================

describe('fetchUsage', () => {
  it('uses the documented Go endpoint with a Bearer key when a key is set', async () => {
    const calls = stubFetch({ status: 200, body: JSON.stringify(GO_USAGE_BODY) })
    const usage = await fetchUsage(cfg({ apiKey: 'oc_sk_test' }))

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(`https://opencode.ai${GO_USAGE_PATH}`)
    expect(calls[0]?.headers.Authorization).toBe('Bearer oc_sk_test')
    expect(calls[0]?.headers['User-Agent']).toBeTruthy()
    expect(usage.weekly?.percent).toBe(21)
    expect(typeof usage.updatedAt).toBe('number')
  })

  it('prefers the API key over a cookie when both are configured', async () => {
    const calls = stubFetch({ status: 200, body: JSON.stringify(GO_USAGE_BODY) })
    await fetchUsage(cfg({ apiKey: 'oc_sk_test', cookie: 'auth=Fe26.2*x', workspaceID: 'wrk_a' }))

    expect(calls[0]?.url).toBe(`https://opencode.ai${GO_USAGE_PATH}`)
    expect(calls[0]?.headers.Cookie).toBeUndefined()
  })

  it('falls back to the console endpoint with the cookie and org header', async () => {
    const calls = stubFetch({ status: 200, body: JSON.stringify(GO_STATUS_BODY) })
    const usage = await fetchUsage(cfg({ cookie: 'auth=Fe26.2*x; oc_locale=en', workspaceID: 'wrk_a' }))

    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe(`https://opencode.ai${CONSOLE_GO_STATUS_PATH}`)
    expect(calls[0]?.headers.Cookie).toBe('auth=Fe26.2*x; oc_locale=en')
    expect(calls[0]?.headers['x-org-id']).toBe('wrk_a')
    expect(usage.monthly?.percent).toBe(12)
  })

  it('omits the org header when no workspace id is configured', async () => {
    const calls = stubFetch({ status: 200, body: JSON.stringify(GO_STATUS_BODY) })
    await fetchUsage(cfg({ cookie: 'auth=Fe26.2*x' }))
    expect(calls[0]?.headers['x-org-id']).toBeUndefined()
  })

  it('normalizes a trailing slash on the base URL', async () => {
    const calls = stubFetch({ status: 200, body: JSON.stringify(GO_USAGE_BODY) })
    await fetchUsage(cfg({ apiKey: 'k', baseUrl: 'https://opencode.ai/' }))
    expect(calls[0]?.url).toBe(`https://opencode.ai${GO_USAGE_PATH}`)
  })

  it('reports an invalid or revoked key as unauthorized', async () => {
    stubFetch({ status: 401, body: '{"_tag":"Unauthorized"}' })
    const error = await failure(fetchUsage(cfg({ apiKey: 'oc_sk_bad' })))
    expect(error.code).toBe('unauthorized')
  })

  it('reports an expired cookie as unauthorized', async () => {
    stubFetch({ status: 403, body: '' })
    const error = await failure(fetchUsage(cfg({ cookie: 'auth=Fe26.2*old' })))
    expect(error.code).toBe('unauthorized')
  })

  it('carries a non-2xx status through as http<code>', async () => {
    stubFetch({ status: 500, body: '' })
    const error = await failure(fetchUsage(cfg({ apiKey: 'k' })))
    expect(error.code).toBe('http500')
  })

  it('surfaces an upstream error message on a failed status', async () => {
    stubFetch({ status: 400, body: '{"error":{"message":"bad request"}}' })
    const error = await failure(fetchUsage(cfg({ apiKey: 'k' })))
    expect(error.code).toBe('http400')
    expect(error.message).toBe('bad request')
  })

  it('rejects a 200 response whose body is not JSON', async () => {
    stubFetch({ status: 200, body: '<html>login</html>' })
    const error = await failure(fetchUsage(cfg({ apiKey: 'k' })))
    expect(error.code).toBe('badjson')
  })

  it('reports a request that exceeds the timeout', async () => {
    vi.stubGlobal(
      'fetch',
      (_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const abort = new Error('aborted')
            abort.name = 'AbortError'
            reject(abort)
          })
        }),
    )
    const error = await failure(fetchUsage(cfg({ apiKey: 'k', timeoutMs: 20 })))
    expect(error.code).toBe('timeout')
  })

  it('rejects with noconfig when no credential is configured', async () => {
    const error = await failure(fetchUsage(cfg()))
    expect(error.code).toBe('noconfig')
  })

  it('never leaks the key or cookie into an error message', async () => {
    stubFetch({ status: 500, body: '' })
    const error = await failure(
      fetchUsage(cfg({ apiKey: 'oc_sk_supersecret', cookie: 'auth=Fe26.2*supersecret' })),
    )
    expect(error.message).not.toContain('supersecret')
  })
})
