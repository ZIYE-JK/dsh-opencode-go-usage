/**
 * Unit tests for the SSR usage page parser.
 * @module dsh-ocgo-usage/api.test
 */

import { describe, expect, it } from 'vitest'
import { fromSSRHTML, parseDurationToSec } from './api.ts'

/** A full opencode.ai SSR usage page with all three windows. */
const FULL_PAGE = `
<!doctype html>
<html><head><title>OpenCode</title></head><body>
<div data-slot="usage-header">OpenCode Go</div>
<div data-slot="usage-item">
  <div data-slot="usage-header"><span data-slot="usage-label">Rolling Usage</span></div>
  <span data-slot="usage-value"><!--$-->23<!--/-->%</span>
  <span data-slot="reset-time"><!--$-->Resets in<!--/-->2 hours 29 minutes<!--/--></span>
</div>
<div data-slot="usage-item">
  <span data-slot="usage-label">Weekly Usage</span>
  <span data-slot="usage-value"><!--$-->80<!--/-->%</span>
  <span data-slot="reset-time"><!--$-->Resets in<!--/-->4 days 6 hours<!--/--></span>
</div>
<div data-slot="usage-item">
  <span data-slot="usage-label">Monthly Usage</span>
  <span data-slot="usage-value"><!--$-->100<!--/-->%</span>
  <span data-slot="reset-time"><!--$-->Resets in<!--/-->12 days 4 hours<!--/--></span>
</div>
</body></html>
`

describe('fromSSRHTML', () => {
  it('parses all three windows with percent and reset seconds', () => {
    const parsed = fromSSRHTML(FULL_PAGE)
    expect(parsed.rolling).toEqual({
      kind: 'rolling',
      percent: 23,
      resetInSec: 2 * 3600 + 29 * 60,
      status: 'ok',
    })
    expect(parsed.weekly).toEqual({
      kind: 'weekly',
      percent: 80,
      resetInSec: 4 * 86400 + 6 * 3600,
      status: 'ok',
    })
    expect(parsed.monthly).toEqual({
      kind: 'monthly',
      percent: 100,
      resetInSec: 12 * 86400 + 4 * 3600,
      status: 'rate-limited',
    })
  })

  it('omits missing windows (new account / trial outside window)', () => {
    const page = `
      <div data-slot="usage-item">
        <span data-slot="usage-label">Weekly Usage</span>
        <span data-slot="usage-value"><!--$-->10<!--/-->%</span>
        <span data-slot="reset-time"><!--$-->Resets in<!--/-->1 day<!--/--></span>
      </div>`
    const parsed = fromSSRHTML(page)
    expect(parsed.rolling).toBeUndefined()
    expect(parsed.weekly).toEqual({
      kind: 'weekly',
      percent: 10,
      resetInSec: 86400,
      status: 'ok',
    })
    expect(parsed.monthly).toBeUndefined()
  })

  it('returns an empty result for a login-redirect page', () => {
    const parsed = fromSSRHTML('<html><body>Sign in to continue</body></html>')
    expect(parsed.rolling).toBeUndefined()
    expect(parsed.weekly).toBeUndefined()
    expect(parsed.monthly).toBeUndefined()
  })

  it('ignores unknown usage labels', () => {
    const page = `
      <div data-slot="usage-item">
        <span data-slot="usage-label">Something Else</span>
        <span data-slot="usage-value"><!--$-->50<!--/-->%</span>
      </div>`
    const parsed = fromSSRHTML(page)
    expect(parsed.rolling).toBeUndefined()
    expect(parsed.weekly).toBeUndefined()
    expect(parsed.monthly).toBeUndefined()
  })

  it('parses current serialized usage references', () => {
    const page = `
      <script>
        rollingUsage:$R[34],weeklyUsage:$R[35],monthlyUsage:$R[36]
        $R[34]={status:"ok",resetInSec:18000,usagePercent:7,limit:3000000000}
        $R[35]={status:"ok",resetInSec:360000,usagePercent:12,limit:3000000000}
        $R[36]={status:"ok",resetInSec:2500000,usagePercent:9,limit:3000000000}
      </script>`
    expect(fromSSRHTML(page)).toEqual({
      rolling: { kind: 'rolling', percent: 7, resetInSec: 18000, status: 'ok' },
      weekly: { kind: 'weekly', percent: 12, resetInSec: 360000, status: 'ok' },
      monthly: { kind: 'monthly', percent: 9, resetInSec: 2500000, status: 'ok' },
    })
  })

  it('prefers live serialized values over stale data-slot markup', () => {
    const page = `
      <div data-slot="usage-item">
        <span data-slot="usage-label">Monthly Usage</span>
        <span data-slot="usage-value"><!--$-->100<!--/-->%</span>
        <span data-slot="reset-time"><!--$-->Resets in<!--/-->15 days 21 hours<!--/--></span>
      </div>
      monthlyUsage:$R[36]
      $R[36]={status:"ok",resetInSec:1370000,usagePercent:9}
    `
    expect(fromSSRHTML(page).monthly).toEqual({
      kind: 'monthly', percent: 9, resetInSec: 1370000, status: 'ok',
    })
  })

  it('does not treat serialized initialization placeholders as usage', () => {
    expect(fromSSRHTML('monthlyUsage:0')).toEqual({})
  })

  it('keeps one decimal place from serialized usagePercent', () => {
    const page = `
      rollingUsage:$R[34],weeklyUsage:$R[35]
      $R[34]={status:"ok",resetInSec:18000,usagePercent:10.5}
      $R[35]={status:"ok",resetInSec:360000,usagePercent:10.53}
    `
    expect(fromSSRHTML(page)).toEqual({
      rolling: { kind: 'rolling', percent: 10.5, resetInSec: 18000, status: 'ok' },
      weekly: { kind: 'weekly', percent: 10.5, resetInSec: 360000, status: 'ok' },
    })
  })

  it('keeps one decimal place from data-slot markup', () => {
    const page = `
      <div data-slot="usage-item">
        <span data-slot="usage-label">Rolling Usage</span>
        <span data-slot="usage-value"><!--$-->10.5<!--/-->%</span>
        <span data-slot="reset-time"><!--$-->Resets in<!--/-->2 hours 29 minutes<!--/--></span>
      </div>`
    expect(fromSSRHTML(page).rolling?.percent).toBe(10.5)
  })

  it('clamps a fractional percent into [0, 100]', () => {
    const page = `
      <div data-slot="usage-item">
        <span data-slot="usage-label">Monthly Usage</span>
        <span data-slot="usage-value"><!--$-->100.5<!--/-->%</span>
      </div>`
    expect(fromSSRHTML(page).monthly?.percent).toBe(100)
  })

  it('clamps percent into [0, 100]', () => {
    const page = `
      <div data-slot="usage-item">
        <span data-slot="usage-label">Monthly Usage</span>
        <span data-slot="usage-value"><!--$-->150<!--/-->%</span>
      </div>`
    const parsed = fromSSRHTML(page)
    expect(parsed.monthly?.percent).toBe(100)
  })
})

describe('parseDurationToSec', () => {
  it.each([
    ['2 hours 29 minutes', 2 * 3600 + 29 * 60],
    ['45 minutes', 45 * 60],
    ['5 days', 5 * 86400],
    ['30 seconds', 30],
    ['1 week', 604800],
    ['1 month', 2592000],
    ['1 year', 31536000],
    ['', 0],
    ['garbage text', 0],
  ])('parses %j → %i', (phrase, expected) => {
    expect(parseDurationToSec(phrase)).toBe(expected)
  })

  it('handles embedded SolidStart comment markers', () => {
    expect(parseDurationToSec('2<!--/--> hours 29<!--/--> minutes')).toBe(2 * 3600 + 29 * 60)
  })
})
