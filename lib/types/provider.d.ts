/**
 * Provider matching for dsh-ocgo-usage: decide when the chip should show.
 * Pure and shared so the client logic is unit-testable without a browser.
 * @module dsh-ocgo-usage/provider
 */
/** Stable name retained for consumers that import the primary Go route. */
export declare const OCGO_PROVIDER = "opencode-go";
/**
 * True when a provider/model belongs to any OpenCode route. Matching is
 * intentionally case-insensitive and unbounded after `opencode`, so newly
 * added OpenCode routes automatically show this subscription's usage chip.
 */
export declare function isOpenCodeGo(provider: string | undefined): boolean;
//# sourceMappingURL=provider.d.ts.map