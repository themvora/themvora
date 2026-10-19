/**
 * The DOM events Themvora custom elements dispatch.
 *
 * Both are dispatched by `<themvora-provider>` with `bubbles: true` and
 * `composed: true`, so a listener on `document` sees them regardless of how
 * deeply the provider is nested.
 */

/**
 * Dispatched once by `<themvora-provider>` after its runtime exists and its
 * first theme has been applied.
 *
 * Custom elements are upgraded in document order, so a provider normally
 * initializes before its descendants. This event covers the remaining case —
 * an element defined or inserted after the provider — and the reconnection
 * case, where a provider that was removed and re-added creates a *new*
 * runtime.
 *
 * The payload carries no detail: read state from the runtime
 * (`getProviderRuntime(providerEl)`).
 */
export const THEME_READY_EVENT = "theme-ready";

/**
 * Detail payload of {@link THEMES_CHANGE_EVENT}.
 */
export interface ThemvoraThemesChangeDetail {
  /**
   * The theme names registered on the provider after the change, in catalog
   * order.
   */
  readonly themes: readonly string[];
}

/**
 * Dispatched by `<themvora-provider>` after an attribute change replaced its
 * theme catalog.
 *
 * A catalog change can leave the active theme untouched — the runtime
 * preserves a selection that is still valid — so `store.subscribe()` alone
 * cannot tell a consumer that the set of available themes moved. This event
 * reports exactly that, once per applied catalog change.
 *
 * It is not dispatched on initialization; {@link THEME_READY_EVENT} covers
 * that.
 */
export const THEMES_CHANGE_EVENT = "themes-change";
