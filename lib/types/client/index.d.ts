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
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type OcgoKey } from './locales.ts';
export { OCGO_PROVIDER } from '../provider.ts';
export { OcgoDockEntry, formatDuration } from './OcgoDockEntry.tsx';
export type { OcgoDockEntryProps } from './OcgoDockEntry.tsx';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** dsh-ocgo-usage chip copy. */
        ocgo: OcgoKey;
    }
}
/** Required services: slots for the composer-dock entry, locale for the copy. */
export declare const inject: string[];
/** The injected business face: the dock's owning session plus a live provider read. */
export interface OcgoInjected {
    /** The session this dock entry renders for (slot inject factory arg). */
    dockSessionId: string | undefined;
    /**
     * Resolve the CURRENT model provider of the dock's session from the live
     * in-memory `modelSelection` projection (warm ~ms, no network). Undefined
     * when the session has no selection yet.
     */
    provider(): Promise<string | undefined>;
}
/** The projected model-selection view of one session (`next` = pending ?? lastUsed). */
export interface ModelSelectionView {
    /** Selection intent not yet confirmed by a request header. */
    next?: {
        provider?: string | undefined;
    } | null | undefined;
    /** Selection confirmed by the session's last request header. */
    lastUsed?: {
        provider?: string | undefined;
    } | null | undefined;
}
/**
 * Register the usage chip into the composer dock band.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map