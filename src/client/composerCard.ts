/**
 * Locate the composer input card the dock chip is pinned to. DSH stamps the
 * card with the `data-composer-card` attribute; hosts that predate the marker
 * fall back to the card's geometry signature. The card is a SIBLING of the
 * chip's dock container, never one of its ancestors, so detection walks up the
 * ancestor chain and scans each level's children.
 * @module dsh-ocgo-usage/client/composerCard
 */

/** Marker DSH stamps on the composer input card element. */
export const CARD_ATTR = 'data-composer-card'

/** Ancestor levels searched for the card before giving up. */
const MAX_CARD_LEVELS = 6

/** Smallest border radius (px) the geometry fallback accepts as a card. */
const MIN_CARD_RADIUS_PX = 16

/** The computed-style subset the geometry fallback reads. */
export interface CardGeometry {
  readonly position: string
  readonly borderRadius: string
  readonly maxWidth: string
}

/**
 * Geometry fallback for hosts without the `data-composer-card` marker: a
 * positioned box with a bounded width and a panel-sized radius.
 *
 * The radius is compared as a LOWER BOUND, never for equality: DSH themes the
 * card through `--dsw-radius-panel` (28px on 0.2.x, 22px on older builds), so
 * an exact `=== '22px'` test silently stops matching the moment the theme
 * token changes — which is what made the chip undraggable, because a chip
 * without a card has no position to drag from.
 * @param geometry - computed style fields of a candidate element.
 * @returns true when the element looks like the composer input card.
 */
export function looksLikeComposerCard(geometry: CardGeometry): boolean {
  if (geometry.position !== 'relative' && geometry.position !== 'absolute') return false
  if (geometry.maxWidth === '' || geometry.maxWidth === 'none') return false
  const radius = Number.parseFloat(geometry.borderRadius)
  return Number.isFinite(radius) && radius >= MIN_CARD_RADIUS_PX
}

/**
 * Find the composer input card for a chip wrapper: the nearest ancestor level
 * that holds a `[data-composer-card]` child, else the nearest level that holds
 * a geometry match. Returns null when the host exposes neither, so callers can
 * degrade instead of mispositioning the chip.
 * @param wrap - the chip's wrapper element (inside the composer dock).
 * @returns the card element, or null when it cannot be identified.
 */
export function findCard(wrap: HTMLElement): HTMLElement | null {
  let level: HTMLElement | null = wrap.parentElement
  // The branch of `level` that leads back down to the wrap: a card never
  // contains its own chip, so that child is never a candidate.
  let branch: HTMLElement = wrap
  for (let i = 0; level !== null && level !== document.body && i < MAX_CARD_LEVELS; i++) {
    const children = (Array.from(level.children) as HTMLElement[])
      .filter((child) => child !== branch)
    const marked = children.find((child) => child.hasAttribute(CARD_ATTR))
    if (marked !== undefined) return marked
    for (const child of children) {
      if (looksLikeComposerCard(window.getComputedStyle(child))) return child
    }
    branch = level
    level = level.parentElement
  }
  return null
}
