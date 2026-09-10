/**
 * dsh-ocgo-usage browser half — registers the OpenCode Go usage chip into
 * the composer dock band (`conversation.composer.dock`, the same seat the
 * official conversation stats line uses) and reads the host's same-origin
 * `/api/ocgo-usage` JSON endpoints: poll the host snapshot (every 10 s),
 * refresh on demand. The chip shows the three usage windows (rolling 5h /
 * weekly / monthly) with reset countdowns; while the host reports no usable
 * data (missing config, cookie error, or provider failure) it renders a
 * compact `<err:code>` state with a manual refresh action.
 *
 * Provider visibility is decided CLIENT-side from the live model selection:
 * the `modelSelection` session projection is read in memory (~ms, no
 * network), so switching models via `/model` is reflected on the very next
 * poll — the host's request-header fold lags until the next real request,
 * which is why visibility does not ride the usage endpoint. The chip renders
 * nothing only while the current provider is POSITIVELY known not to be
 * `opencode-go`; an unreadable selection keeps it visible, mirroring
 * pi-ocgo-usage.
 * @module dsh-ocgo-usage/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ui-conversation SlotMap merge (the composer dock entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import { OCGO_PROVIDER } from '../provider.ts'
import { OcgoDockEntry, type OcgoDockEntryProps } from './OcgoDockEntry.tsx'
import { en, zh, type OcgoKey } from './locales.ts'

export { OCGO_PROVIDER } from '../provider.ts'

export { OcgoDockEntry, formatDuration } from './OcgoDockEntry.tsx'
export type { OcgoDockEntryProps } from './OcgoDockEntry.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-ocgo-usage chip copy. */
    ocgo: OcgoKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'ocgo'

/** Required services: slots for the composer-dock entry, locale for the copy. */
export const inject = ['slots', 'locale']

/** The injected business face: the dock's owning session plus a live provider read. */
export interface OcgoInjected {
  /** The session this dock entry renders for (slot inject factory arg). */
  dockSessionId: string | undefined
  /**
   * Resolve the CURRENT model provider of the dock's session from the live
   * in-memory `modelSelection` projection (warm ~ms, no network). Undefined
   * when the session has no selection yet.
   */
  provider(): Promise<string | undefined>
}

/** The projected model-selection view of one session (`next` = pending ?? lastUsed). */
export interface ModelSelectionView {
  /** Selection intent not yet confirmed by a request header. */
  next?: { provider?: string | undefined } | null | undefined
  /** Selection confirmed by the session's last request header. */
  lastUsed?: { provider?: string | undefined } | null | undefined
}

/** Minimal structural face of the client `sessions` service. */
interface SessionsFace {
  /** The live binding of one session; absent while the session is not bound. */
  binding?(sessionId: string): {
    session: { projections: { faceOf(key: string): { getSnapshot(): unknown } | undefined } }
  } | undefined
}

/**
 * Read one session's CURRENT model selection from the `modelSelection` session
 * projection, which is where DSH carries it now (`next` already falls back to
 * `lastUsed`). The pre-0.1.2 `connection.api.sessions.models` RPC this plugin
 * used is gone from DSH, and its failure was silent: `provider()` returned
 * undefined, the dock entry read that as "not an OpenCode route", and rendered
 * nothing at all.
 *
 * The service is read structurally instead of through the typed service map
 * because this package's build-time devDependencies predate the client
 * `sessions` service, so naming it in the typed `inject` list would not
 * compile — while DSH runtime resolves it normally.
 * @param scope - the client scope owning the slot registration.
 * @param sessionId - the session the dock entry renders for.
 * @returns the projected selection, or undefined while it is unreadable.
 */
function modelSelectionOf(scope: ClientContext, sessionId: string | undefined): ModelSelectionView | undefined {
  if (sessionId === undefined) return undefined
  const sessions = (scope as unknown as { get(name: string): unknown }).get('sessions') as SessionsFace | undefined
  const face = sessions?.binding?.(sessionId)?.session?.projections?.faceOf?.('modelSelection')
  return face?.getSnapshot?.() as ModelSelectionView | undefined
}

/**
 * Register the usage chip into the composer dock band.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ocgo-usage: dictionaries')

  ctx.inject(['slots', 'conversation', 'connection'], (scope: ClientContext) => {
    scope.effect(() => scope.slots.register({
      name: 'conversation.composer.dock',
      id: 'ocgo-usage',
      order: 110,
      locale: NS,
      inject: (sessionId): OcgoInjected => ({
        dockSessionId: sessionId,
        provider: async () => {
          const selection = modelSelectionOf(scope, sessionId)
          return selection?.next?.provider ?? selection?.lastUsed?.provider ?? undefined
        },
      }),
    }, OcgoDockEntry), 'dsh-ocgo-usage: chip registration')
  })
}
