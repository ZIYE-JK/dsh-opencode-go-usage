/**
 * Unit tests for the cached usage service.
 * @module dsh-ocgo-usage/service.test
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ENV_API_KEY, ENV_COOKIE, ENV_WORKSPACE_ID } from './config.ts'
import { OcgoUsageService } from './service.ts'

const SAVED_KEY = process.env[ENV_API_KEY]
const SAVED_COOKIE = process.env[ENV_COOKIE]
const SAVED_WORKSPACE = process.env[ENV_WORKSPACE_ID]

/** Rolling window length the fixtures reset after. */
const ROLLING_SECONDS = 3600

const isoFromNow = (seconds: number): string => new Date(Date.now() + seconds * 1000).toISOString()

/**
 * A response for the documented Go usage API. A fresh Response is built per
 * call because a body can only be consumed once.
 */
function goUsageResponse(): Response {
  return new Response(
    JSON.stringify({
      usage: {
        rolling: { status: 'ok', percent: 23, resetsAt: isoFromNow(ROLLING_SECONDS) },
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

/** A response for the console JSON API (micro-cent meter strings). */
function goStatusResponse(): Response {
  return new Response(
    JSON.stringify({
      access: {
        endsAt: isoFromNow(30 * 86400),
        meters: {
          fiveHour: {
            resetsAt: isoFromNow(ROLLING_SECONDS),
            limitMicroCents: '1000',
            usedMicroCents: '230',
          },
        },
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
}

describe('OcgoUsageService', () => {
  let ctx: Context
  let tmp: string

  beforeEach(() => {
    process.env[ENV_API_KEY] = 'oc_sk_test'
    process.env[ENV_COOKIE] = 'auth=Fe26.2*test; oc_locale=zh'
    process.env[ENV_WORKSPACE_ID] = 'wrk_test'
    // An empty DSH_HOME keeps credential auto-discovery out of these tests.
    tmp = mkdtempSync(join(tmpdir(), 'dsh-ocgo-usage-svc-'))
    process.env.DSH_HOME = tmp
    ctx = new Context()
  })

  afterEach(() => {
    // Restore mocks FIRST so a failure below cannot leak state into the
    // next test. Cordis 4 exposes no public Context.dispose, and the service
    // owns no timers/subscriptions, so the test context is left for the
    // worker process to reclaim.
    vi.restoreAllMocks()
    const restore = (key: string, saved: string | undefined): void => {
      if (saved === undefined) delete process.env[key]
      else process.env[key] = saved
    }
    restore(ENV_API_KEY, SAVED_KEY)
    restore(ENV_COOKIE, SAVED_COOKIE)
    restore(ENV_WORKSPACE_ID, SAVED_WORKSPACE)
    delete process.env.DSH_HOME
    rmSync(tmp, { recursive: true, force: true })
  })

  it('returns the parsed windows on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => goUsageResponse())
    const service = new OcgoUsageService(ctx)
    const view = await service.view()
    expect(view.error).toBeUndefined()
    expect(view.rolling).toMatchObject({ kind: 'rolling', percent: 23, status: 'ok' })
    expect(view.rolling?.resetInSec).toBeGreaterThan(ROLLING_SECONDS - 10)
    expect(view.rolling?.resetInSec).toBeLessThanOrEqual(ROLLING_SECONDS)
    expect(view.updatedAt).toBeTypeOf('number')
  })

  it('deduplicates concurrent view() calls into one fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => goUsageResponse())
    const service = new OcgoUsageService(ctx)
    const [a, b] = await Promise.all([service.view(), service.view()])
    expect(a.rolling?.percent).toBe(23)
    expect(b.rolling?.percent).toBe(23)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('serves the cached view within the TTL without refetching', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => goUsageResponse())
    const service = new OcgoUsageService(ctx)
    await service.view()
    await service.view()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('uses the cookie path when no API key is configured', async () => {
    delete process.env[ENV_API_KEY]
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => goStatusResponse())
    const service = new OcgoUsageService(ctx)
    const view = await service.view()
    expect(view.error).toBeUndefined()
    expect(view.rolling?.percent).toBe(23)
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('/console/api/go/status')
  })

  it('returns a noconfig error when no credential is present', async () => {
    delete process.env[ENV_API_KEY]
    delete process.env[ENV_COOKIE]
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => goUsageResponse())
    const service = new OcgoUsageService(ctx)
    const view = await service.view()
    expect(view.error).toBe('noconfig')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('maps an HTTP failure to an http<status> code and enters cooldown', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response('boom', { status: 500 }))
    const service = new OcgoUsageService(ctx)
    const first = await service.view()
    expect(first.error).toBe('http500')
    // Cooldown: the second call reuses the error without fetching again.
    const second = await service.view()
    expect(second.error).toBe('http500')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('refresh() bypasses the cache window', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => goUsageResponse())
    const service = new OcgoUsageService(ctx)
    await service.view()
    await service.refresh()
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('answers disabled when the plugin is switched off', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => goUsageResponse())
    const service = new OcgoUsageService(ctx, { enabled: false })
    const view = await service.view()
    expect(view.error).toBe('disabled')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})