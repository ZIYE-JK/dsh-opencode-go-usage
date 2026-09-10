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
import { OcgoDockEntry } from "./OcgoDockEntry.js";
import { en, zh } from "./locales.js";
export { OCGO_PROVIDER } from "../provider.js";
export { OcgoDockEntry, formatDuration } from "./OcgoDockEntry.js";
/** Dictionary namespace owned by this plugin. */
const NS = 'ocgo';
/** Required services: slots for the composer-dock entry, locale for the copy. */
export const inject = ['slots', 'locale'];
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
function modelSelectionOf(scope, sessionId) {
    if (sessionId === undefined)
        return undefined;
    const sessions = scope.get('sessions');
    const face = sessions?.binding?.(sessionId)?.session?.projections?.faceOf?.('modelSelection');
    return face?.getSnapshot?.();
}
/**
 * Register the usage chip into the composer dock band.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ocgo-usage: dictionaries');
    ctx.inject(['slots', 'conversation', 'connection'], (scope) => {
        scope.effect(() => scope.slots.register({
            name: 'conversation.composer.dock',
            id: 'ocgo-usage',
            order: 110,
            locale: NS,
            inject: (sessionId) => ({
                dockSessionId: sessionId,
                provider: async () => {
                    const selection = modelSelectionOf(scope, sessionId);
                    return selection?.next?.provider ?? selection?.lastUsed?.provider ?? undefined;
                },
            }),
        }, OcgoDockEntry), 'dsh-ocgo-usage: chip registration');
    });
}
