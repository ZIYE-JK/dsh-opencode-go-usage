/**
 * Unit tests for the configuration loader.
 * @module dsh-ocgo-usage/config.test
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_BASE_URL,
  DEFAULT_CACHE_TTL,
  DEFAULT_TIMEOUT_MS,
  ENV_API_KEY,
  ENV_BASE_URL,
  ENV_CACHE_TTL,
  ENV_COOKIE,
  ENV_TIMEOUT_MS,
  ENV_WORKSPACE_ID,
  loadConfig,
  maskSecret,
  maskedConfigView,
  normalizeApiKey,
  normalizeCookie,
  readCredentialsRef,
  writeConfigFile,
} from './config.ts'

const ENV_KEYS = [
  ENV_API_KEY,
  ENV_COOKIE,
  ENV_WORKSPACE_ID,
  ENV_BASE_URL,
  ENV_CACHE_TTL,
  ENV_TIMEOUT_MS,
  'DSH_HOME',
]

/** Clear every env var the config reads, remembering the previous values. */
function clearEnv(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {}
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
  return saved
}

function restoreEnv(saved: Record<string, string | undefined>): void {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
}

describe('normalizeCookie', () => {
  it('passes through a full header and guarantees oc_locale', () => {
    expect(normalizeCookie('auth=Fe26.2*abc; oc_locale=zh')).toBe('auth=Fe26.2*abc; oc_locale=zh')
    expect(normalizeCookie('auth=Fe26.2*abc')).toBe('auth=Fe26.2*abc; oc_locale=en')
  })

  it('prefixes auth= onto a bare auth value', () => {
    expect(normalizeCookie('Fe26.2*abc')).toBe('auth=Fe26.2*abc; oc_locale=en')
  })

  it('keeps oc_locale when pasted with the auth value', () => {
    expect(normalizeCookie('Fe26.2*abc; oc_locale=zh')).toBe('auth=Fe26.2*abc; oc_locale=zh')
  })

  it('normalizes whitespace and rejects empty input', () => {
    expect(normalizeCookie('  auth=Fe26.2*abc ;  oc_locale=zh  ')).toBe('auth=Fe26.2*abc; oc_locale=zh')
    expect(normalizeCookie('   ')).toBeUndefined()
    expect(normalizeCookie(undefined)).toBeUndefined()
  })
})

describe('loadConfig', () => {
  let savedEnv: Record<string, string | undefined>
  let tmp: string

  beforeEach(() => {
    savedEnv = clearEnv()
    tmp = mkdtempSync(join(tmpdir(), 'dsh-ocgo-usage-test-'))
    process.env.DSH_HOME = tmp
  })

  afterEach(() => {
    restoreEnv(savedEnv)
    rmSync(tmp, { recursive: true, force: true })
  })

  it('returns defaults when nothing is configured', () => {
    const cfg = loadConfig()
    expect(cfg.cookie).toBeUndefined()
    expect(cfg.workspaceID).toBeUndefined()
    expect(cfg.baseUrl).toBe(DEFAULT_BASE_URL)
    expect(cfg.cacheTTL).toBe(DEFAULT_CACHE_TTL)
    expect(cfg.timeoutMs).toBe(DEFAULT_TIMEOUT_MS)
  })

  it('reads env vars and normalizes the cookie', () => {
    process.env[ENV_COOKIE] = 'Fe26.2*env'
    process.env[ENV_WORKSPACE_ID] = 'wrk_env'
    process.env[ENV_BASE_URL] = 'https://example.com'
    process.env[ENV_CACHE_TTL] = '120'
    process.env[ENV_TIMEOUT_MS] = '5000'
    const cfg = loadConfig()
    expect(cfg.cookie).toBe('auth=Fe26.2*env; oc_locale=en')
    expect(cfg.workspaceID).toBe('wrk_env')
    expect(cfg.baseUrl).toBe('https://example.com')
    expect(cfg.cacheTTL).toBe(120)
    expect(cfg.timeoutMs).toBe(5000)
  })

  it('env wins over the config file', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({
      cookie: 'auth=Fe26.2*file; oc_locale=zh',
      workspaceID: 'wrk_file',
      cacheTTL: 9999,
    }))
    process.env[ENV_COOKIE] = 'auth=Fe26.2*env; oc_locale=zh'
    const cfg = loadConfig()
    expect(cfg.cookie).toBe('auth=Fe26.2*env; oc_locale=zh')
    expect(cfg.workspaceID).toBe('wrk_file')
  })

  it('falls back to the config file and clamps cacheTTL', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({
      cookie: 'Fe26.2*file',
      workspaceID: 'wrk_file',
      cacheTTL: 9999,
    }))
    const cfg = loadConfig()
    expect(cfg.cookie).toBe('auth=Fe26.2*file; oc_locale=en')
    expect(cfg.workspaceID).toBe('wrk_file')
    expect(cfg.cacheTTL).toBe(3600)
    expect(cfg.timeoutMs).toBe(DEFAULT_TIMEOUT_MS)
  })

  it('tolerates a broken config file', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), '{not json')
    const cfg = loadConfig()
    expect(cfg.cookie).toBeUndefined()
    expect(cfg.baseUrl).toBe(DEFAULT_BASE_URL)
  })
})

describe('masked config view + write', () => {
  let savedEnv: Record<string, string | undefined>
  let tmp: string

  beforeEach(() => {
    savedEnv = clearEnv()
    tmp = mkdtempSync(join(tmpdir(), 'dsh-ocgo-usage-mask-'))
    process.env.DSH_HOME = tmp
  })

  afterEach(() => {
    restoreEnv(savedEnv)
    rmSync(tmp, { recursive: true, force: true })
  })

  it('masks the tail of a secret', () => {
    expect(maskSecret(undefined)).toEqual({ set: false, tail: '' })
    expect(maskSecret('abcd')).toEqual({ set: true, tail: 'abcd' })
    expect(maskSecret('Fe26.2*long-value-xyz1')).toEqual({ set: true, tail: 'xyz1' })
  })

  it('exposes only masked values in the view', () => {
    const cookie = 'auth=Fe26.2*secret-cookie-9abc; oc_locale=zh'
    const ws = 'wrk_01XXXXXXXXXXXXXXXXXXXX8q2w'
    process.env[ENV_COOKIE] = cookie
    process.env[ENV_WORKSPACE_ID] = ws
    const view = maskedConfigView()
    expect(view.cookie).toEqual({ set: true, tail: cookie.slice(-4) })
    expect(view.workspaceID).toEqual({ set: true, tail: ws.slice(-4) })
    expect(JSON.stringify(view)).not.toContain('secret-cookie')
  })

  it('writes new values to the config file and normalizes the cookie', () => {
    const view = writeConfigFile({ cookie: 'Fe26.2*new', workspaceID: 'wrk_new' })
    // The written cookie is normalized to "auth=Fe26.2*new; oc_locale=en";
    // its tail is the whole header's last 4 chars.
    expect(view.cookie).toEqual({ set: true, tail: 'auth=Fe26.2*new; oc_locale=en'.slice(-4) })
    expect(view.workspaceID).toEqual({ set: true, tail: 'wrk_new'.slice(-4) })
    // loadConfig now reads the written file (normalized cookie with auth=).
    const cfg = loadConfig()
    expect(cfg.workspaceID).toBe('wrk_new')
    expect(cfg.cookie).toBe('auth=Fe26.2*new; oc_locale=en')
  })

  it('preserves other fields and clears a field with null', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({
      cookie: 'auth=Fe26.2*old; oc_locale=zh',
      workspaceID: 'wrk_old',
      baseUrl: 'https://example.com',
      cacheTTL: 120,
    }))
    const view = writeConfigFile({ cookie: null, workspaceID: 'wrk_new2' })
    expect(view.cookie).toEqual({ set: false, tail: '' })
    expect(view.workspaceID).toEqual({ set: true, tail: 'wrk_new2'.slice(-4) })
    const raw = JSON.parse(readFileSync(join(tmp, 'ocgo-usage.json'), 'utf8'))
    expect(raw.baseUrl).toBe('https://example.com')
    expect(raw.cacheTTL).toBe(120)
    expect(raw.cookie).toBeUndefined()
  })

  it('keeps fields absent from the write untouched (no accidental clear)', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({
      cookie: 'auth=Fe26.2*keepme; oc_locale=zh',
      workspaceID: 'wrk_keep',
    }))
    // Only workspaceID is present in the partial; cookie must survive.
    const view = writeConfigFile({ workspaceID: 'wrk_new3' })
    expect(view.workspaceID).toEqual({ set: true, tail: 'wrk_new3'.slice(-4) })
    expect(view.cookie).toEqual({ set: true, tail: 'oc_locale=zh'.slice(-4) })
    const raw = JSON.parse(readFileSync(join(tmp, 'ocgo-usage.json'), 'utf8'))
    expect(raw.cookie).toBe('auth=Fe26.2*keepme; oc_locale=zh')
    expect(raw.workspaceID).toBe('wrk_new3')
  })
})

describe('normalizeApiKey', () => {
  it('passes through a bare key', () => {
    expect(normalizeApiKey('oc_sk_abc')).toBe('oc_sk_abc')
    expect(normalizeApiKey('sk-abcdefghij')).toBe('sk-abcdefghij')
  })

  it('strips a pasted Authorization header prefix', () => {
    expect(normalizeApiKey('Bearer oc_sk_abc')).toBe('oc_sk_abc')
    expect(normalizeApiKey('bearer oc_sk_abc')).toBe('oc_sk_abc')
    expect(normalizeApiKey('Bearer: oc_sk_abc')).toBe('oc_sk_abc')
  })

  it('trims surrounding whitespace and quotes', () => {
    expect(normalizeApiKey('  "oc_sk_abc"  ')).toBe('oc_sk_abc')
    expect(normalizeApiKey('oc_sk_abc\n')).toBe('oc_sk_abc')
  })

  it('rejects empty input', () => {
    expect(normalizeApiKey(undefined)).toBeUndefined()
    expect(normalizeApiKey('   ')).toBeUndefined()
    expect(normalizeApiKey('')).toBeUndefined()
  })
})

describe('credential discovery from the harness table', () => {
  let savedEnv: Record<string, string | undefined>
  let tmp: string

  /** A harness credential table with keys both inside and outside `refs:`. */
  const CREDENTIALS = [
    'version: 1',
    'refs:',
    '  DEEPSEEK_API_KEY: sk-deepseek-placeholder',
    '  OPENCODE_GO_API_KEY: sk-opencode-placeholder',
    '  QUOTED_KEY: "sk-quoted-value"',
    '  COMMENTED_KEY: sk-commented # trailing note',
    'records:',
    '  - kind: session',
    '    payload:',
    '      OPENCODE_GO_API_KEY: should-not-be-read',
  ].join('\n')

  function writeCredentials(body: string): void {
    writeFileSync(join(tmp, '.credentials.yaml'), body)
  }

  beforeEach(() => {
    savedEnv = clearEnv()
    tmp = mkdtempSync(join(tmpdir(), 'dsh-ocgo-usage-cred-'))
    process.env.DSH_HOME = tmp
  })

  afterEach(() => {
    restoreEnv(savedEnv)
    rmSync(tmp, { recursive: true, force: true })
  })

  it('reads a reference out of the refs block', () => {
    writeCredentials(CREDENTIALS)
    expect(readCredentialsRef('OPENCODE_GO_API_KEY')).toBe('sk-opencode-placeholder')
    expect(readCredentialsRef('DEEPSEEK_API_KEY')).toBe('sk-deepseek-placeholder')
  })

  it('unquotes a value and drops an inline comment', () => {
    writeCredentials(CREDENTIALS)
    expect(readCredentialsRef('QUOTED_KEY')).toBe('sk-quoted-value')
    expect(readCredentialsRef('COMMENTED_KEY')).toBe('sk-commented')
  })

  it('never reads a same-named key outside the refs block', () => {
    writeCredentials(CREDENTIALS)
    expect(readCredentialsRef('OPENCODE_GO_API_KEY')).not.toBe('should-not-be-read')
  })

  it('returns undefined for an unknown reference or a missing file', () => {
    writeCredentials(CREDENTIALS)
    expect(readCredentialsRef('NOT_A_KEY')).toBeUndefined()
    rmSync(join(tmp, '.credentials.yaml'))
    expect(readCredentialsRef('OPENCODE_GO_API_KEY')).toBeUndefined()
  })

  it('tolerates a credential table without a refs block', () => {
    writeCredentials('\tnot: [valid yaml')
    expect(readCredentialsRef('OPENCODE_GO_API_KEY')).toBeUndefined()
  })

  it('resolves the API key with no explicit plugin configuration', () => {
    writeCredentials(CREDENTIALS)
    const cfg = loadConfig()
    expect(cfg.apiKey).toBe('sk-opencode-placeholder')
    // Zero-config discovery must not be mistaken for a cookie setup.
    expect(cfg.cookie).toBeUndefined()
  })

  it('prefers the config file, then the env var, over the table', () => {
    writeCredentials(CREDENTIALS)
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({ apiKey: 'oc_sk_from_file' }))
    expect(loadConfig().apiKey).toBe('oc_sk_from_file')

    process.env[ENV_API_KEY] = 'oc_sk_from_env'
    expect(loadConfig().apiKey).toBe('oc_sk_from_env')
  })

  it('normalizes a pasted Bearer value from the config file', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({ apiKey: 'Bearer oc_sk_abc' }))
    expect(loadConfig().apiKey).toBe('oc_sk_abc')
  })

  it('masks the key in the view and writes it through the config editor', () => {
    const view = writeConfigFile({ apiKey: 'oc_sk_written_value' })
    expect(view.apiKey).toEqual({ set: true, tail: 'alue' })
    expect(JSON.stringify(view)).not.toContain('oc_sk_written')
    expect(loadConfig().apiKey).toBe('oc_sk_written_value')

    const cleared = writeConfigFile({ apiKey: null })
    expect(cleared.apiKey).toEqual({ set: false, tail: '' })
    expect(loadConfig().apiKey).toBeUndefined()
  })

  it('keeps a discovered key out of the masked view JSON', () => {
    writeCredentials(CREDENTIALS)
    expect(JSON.stringify(maskedConfigView())).not.toContain('oc_sk')
    expect(maskedConfigView().apiKey.set).toBe(true)
  })
})
