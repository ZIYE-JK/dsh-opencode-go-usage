/**
 * Unit tests for the provider matcher.
 * @module dsh-ocgo-usage/provider.test
 */

import { describe, expect, it } from 'vitest'
import { isOpenCodeGo, OCGO_PROVIDER } from './provider.ts'

describe('isOpenCodeGo', () => {
  it('accepts the exact provider', () => {
    expect(isOpenCodeGo(OCGO_PROVIDER)).toBe(true)
  })

  it('accepts every provider containing opencode', () => {
    expect(isOpenCodeGo('opencode-go/deepseek-v4-flash')).toBe(true)
    expect(isOpenCodeGo('opencode-go-ox')).toBe(true)
    expect(isOpenCodeGo('opencode-go-ox/ox-alpha-free')).toBe(true)
    expect(isOpenCodeGo('opencode-zen-go')).toBe(true)
    expect(isOpenCodeGo('opencode-zen-go/deepseek-v4-flash')).toBe(true)
    expect(isOpenCodeGo('custom-opencode-route/future-model')).toBe(true)
    expect(isOpenCodeGo('OpenCode-Other')).toBe(true)
  })

  it('rejects other providers and empty input', () => {
    expect(isOpenCodeGo('deepseek-official')).toBe(false)
    expect(isOpenCodeGo('deepseek')).toBe(false)
    expect(isOpenCodeGo(undefined)).toBe(false)
    expect(isOpenCodeGo('')).toBe(false)
  })

  it('also accepts future OpenCode-prefixed provider names', () => {
    expect(isOpenCodeGo('opencode-go-evil')).toBe(true)
  })
})
