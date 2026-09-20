/**
 * HTTP fetch + response adapters for dsh-ocgo-usage
 *
 * Two upstream paths, selected by which credential is configured:
 *
 *  1. **API key** (`cfg.apiKey`, preferred) → `GET {baseUrl}/zen/go/v1/usage`
 *     with `Authorization: Bearer <oc_sk_...>`. This is the documented OpenCode
 *     Go usage endpoint: it returns the three windows already normalized as
 *     `{ usage: { rolling|weekly|monthly: { status, percent, resetsAt } } }`,
 *     with `percent` as the USED share (0–100) and `resetsAt` an ISO instant.
 *     It does not expire with the browser session.
 *
 *  2. **Session cookie** (fallback) → `GET {baseUrl}/console/api/go/status`
 *     with `Cookie` + `x-org-id`. This is the console SPA's own JSON API; it
 *     reports meters as micro-cent strings and the monthly reset as
 *     `access.endsAt`. Kept so a cookie-only setup keeps working.
 *
 * Historical note: until 2026-09 the plugin scraped a server-rendered page at
 * `/workspace/<wrk>/go`. opencode.ai replaced it with a client-rendered SPA, so
 * that route now redirects to `/console/login` — which surfaced as
 * `error 302` in the chip.
 *
 * @module dsh-ocgo-usage/api
 */
import type { NormalizedUsage, OcgoConfig } from './types.ts';
/** Error thrown by the HTTP / parsing layer; carries a short code for the UI. */
export declare class UsageError extends Error {
    readonly code: string;
    readonly name = "UsageError";
    constructor(message: string, code: string);
}
/** Path of the documented Go usage endpoint, relative to the base URL. */
export declare const GO_USAGE_PATH = "/zen/go/v1/usage";
/**
 * Read usage through the documented Go usage API with a service-account key.
 * Throws UsageError on any failure.
 */
export declare function fetchViaApiKey(cfg: OcgoConfig): Promise<Omit<NormalizedUsage, 'updatedAt'>>;
/**
 * Map a `/zen/go/v1/usage` payload onto the normalized usage shape.
 *
 * Accepts both the documented `{ usage: { rolling, weekly, monthly } }`
 * envelope and a bare window object, mirroring the upstream's tolerance.
 */
export declare function fromGoUsage(body: unknown, nowMs: number): Omit<NormalizedUsage, 'updatedAt'>;
/** Path of the console SPA usage endpoint, relative to the base URL. */
export declare const CONSOLE_GO_STATUS_PATH = "/console/api/go/status";
/**
 * Read usage through the console JSON API with the session cookie.
 * Throws UsageError on any failure.
 */
export declare function fetchViaCookie(cfg: OcgoConfig): Promise<Omit<NormalizedUsage, 'updatedAt'>>;
/**
 * Map a `/console/api/go/status` payload onto the normalized usage shape.
 *
 * Meters report `limitMicroCents` / `usedMicroCents` as decimal STRINGS; the
 * monthly meter carries no `resetsAt`, so its reset comes from `access.endsAt`.
 */
export declare function fromGoStatus(root: Record<string, unknown> | undefined, nowMs: number): Omit<NormalizedUsage, 'updatedAt'>;
/**
 * Fetch usage with the current config and stamp the fetch timestamp so the UI
 * can show data freshness. The API key path is preferred; the cookie path is
 * the fallback for setups that only hold a session cookie.
 */
export declare function fetchUsage(cfg: OcgoConfig): Promise<NormalizedUsage>;
//# sourceMappingURL=api.d.ts.map