/**
 * Unit tests for the composer-card locator: the DSH marker path, the geometry
 * fallback, and the theme-token regression that made the chip undraggable.
 * @module dsh-ocgo-usage/client/composerCard.test
 */

import { describe, expect, it } from 'vitest'
import { findCard, looksLikeComposerCard } from './composerCard.ts'

/** Minimal stand-in for an element, exposing only what findCard touches. */
interface FakeElement {
  style: { position: string; borderRadius: string; maxWidth: string }
  attrs: string[]
  parentElement: FakeElement | null
  children: FakeElement[]
  hasAttribute(name: string): boolean
}

/** Build one fake element with the given computed style / marker. */
function element(options: {
  position?: string
  radius?: string
  maxWidth?: string
  marked?: boolean
} = {}): FakeElement {
  const el: FakeElement = {
    style: {
      position: options.position ?? 'static',
      borderRadius: options.radius ?? '0px',
      maxWidth: options.maxWidth ?? 'none',
    },
    attrs: options.marked === true ? ['data-composer-card'] : [],
    parentElement: null,
    children: [],
    hasAttribute(name: string): boolean {
      return this.attrs.includes(name)
    },
  }
  return el
}

/** Attach children and wire the parent pointers the way a DOM would. */
function append(parent: FakeElement, ...kids: FakeElement[]): FakeElement {
  for (const kid of kids) {
    kid.parentElement = parent
    parent.children.push(kid)
  }
  return parent
}

/** Hand the locator the two globals it reads. */
const fakeBody = element()
const fakeGlobal = globalThis as unknown as Record<string, unknown>
fakeGlobal.window = { getComputedStyle: (el: FakeElement): FakeElement['style'] => el.style }
fakeGlobal.document = { body: fakeBody }

/** The chip wrapper as it sits inside the composer dock container. */
function wrapInsideDock(...dockChildren: FakeElement[]): FakeElement {
  const wrap = element()
  append(element(), wrap, ...dockChildren)
  return wrap
}

const asElement = (el: FakeElement): HTMLElement => el as unknown as HTMLElement

describe('looksLikeComposerCard', () => {
  it('accepts the current panel radius and the legacy 22px card', () => {
    expect(looksLikeComposerCard({ position: 'relative', borderRadius: '28px', maxWidth: '840px' })).toBe(true)
    expect(looksLikeComposerCard({ position: 'relative', borderRadius: '22px', maxWidth: '840px' })).toBe(true)
  })

  it('accepts any panel-sized radius so a theme token change cannot break it again', () => {
    for (const radius of ['16px', '20px', '24px', '32px']) {
      expect(looksLikeComposerCard({ position: 'relative', borderRadius: radius, maxWidth: '720px' })).toBe(true)
    }
  })

  it('rejects boxes that are not the composer card', () => {
    // Static layout (the dock's own notice / panel rows).
    expect(looksLikeComposerCard({ position: 'static', borderRadius: '28px', maxWidth: '840px' })).toBe(false)
    // Small radius: the 12px notice and dock panels.
    expect(looksLikeComposerCard({ position: 'relative', borderRadius: '12px', maxWidth: '840px' })).toBe(false)
    // Unbounded width: full-bleed rows are not the card.
    expect(looksLikeComposerCard({ position: 'relative', borderRadius: '28px', maxWidth: 'none' })).toBe(false)
    expect(looksLikeComposerCard({ position: 'relative', borderRadius: '28px', maxWidth: '' })).toBe(false)
  })
})

describe('findCard', () => {
  it('finds the card through the DSH data-composer-card marker', () => {
    const card = element({ marked: true, position: 'relative', radius: '28px', maxWidth: '840px' })
    const dock = element()
    const wrap = element()
    append(dock, wrap)
    append(element(), card, dock)

    expect(findCard(asElement(wrap))).toBe(asElement(card))
  })

  it('prefers the marked card over an unmarked geometry match', () => {
    const decoy = element({ position: 'relative', radius: '28px', maxWidth: '840px' })
    const card = element({ marked: true, position: 'relative', radius: '28px', maxWidth: '840px' })
    const dock = element()
    const wrap = element()
    append(dock, wrap)
    append(element(), decoy, card, dock)

    expect(findCard(asElement(wrap))).toBe(asElement(card))
  })

  it('falls back to the geometry signature on a host without the marker', () => {
    const card = element({ position: 'relative', radius: '28px', maxWidth: '840px' })
    const notice = element({ position: 'static', radius: '12px', maxWidth: '840px' })
    const dock = element()
    const wrap = element()
    append(dock, wrap)
    append(element(), notice, card, dock)

    expect(findCard(asElement(wrap))).toBe(asElement(card))
  })

  it('never returns the branch that contains the wrapper', () => {
    // A dock that itself looks like a card must not be mistaken for it: the
    // locator only scans the children it can reach down from.
    const dock = element({ position: 'relative', radius: '28px', maxWidth: '840px' })
    const wrap = element()
    append(dock, wrap)
    append(element(), dock)

    expect(findCard(asElement(wrap))).toBeNull()
  })

  it('returns null when neither the marker nor the geometry matches', () => {
    const dock = element()
    const wrap = element()
    append(dock, wrap)
    append(element(), element({ position: 'relative', radius: '12px', maxWidth: '840px' }), dock)

    expect(findCard(asElement(wrap))).toBeNull()
  })
})
