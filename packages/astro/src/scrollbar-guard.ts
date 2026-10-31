/**
 * Provisional native-scrollbar hiding.
 *
 * ## Why this exists
 *
 * `scrollbar` on `provider.astro` and `<ThemeScrollbar />` are two halves of one
 * feature:
 *
 * - the provider server-renders `tv-scrollbar` on `<html>` plus the hiding CSS,
 *   so the native bar is never painted — this is the only way to guarantee
 *   "overlay from the first frame", because the overlay's own script is
 *   deferred and would arrive after the first paint;
 * - the component renders `<themvora-scrollbar>`, which draws the replacement.
 *
 * Server-rendering the hiding is therefore only correct *while an overlay
 * element exists*. Nothing enforced that, and the failure was silent and
 * total: comment out `<ThemeScrollbar />` — or forget it — and the page kept
 * the class and the CSS with nothing to draw a scrollbar. The visitor got no
 * scrollbar at all, on any device. Removing the stylesheet import did not help,
 * because the hiding rules are inlined in `<head>` by the provider, not part of
 * the stylesheet the overlay's rails come from.
 *
 * So the hiding is treated as provisional. This script runs at the end of
 * `<body>`, once the slot has been parsed, and asks whether the overlay element
 * made it into the document:
 *
 * - present → do nothing; the overlay is the scrollbar.
 * - absent  → remove the class and every hiding stylesheet, so the platform's
 *   scrollbar returns.
 *
 * A mismatch between the two halves now degrades to a *native* scrollbar
 * instead of to *no* scrollbar.
 *
 * ## Why an inline script, and why here
 *
 * It must decide during parse, before the reader can interact — a deferred
 * module runs after hydration, and a timer would either flash or guess. An
 * inline script at the end of `<body>` runs synchronously at exactly the right
 * moment.
 *
 * It only ever *removes* hiding, so it cannot cause the flash it exists to
 * prevent. That asymmetry is the whole safety argument.
 *
 * @see {@link createScrollbarHidingGuardScript}
 */

/**
 * The marker attribute on every stylesheet that hides the native scrollbar.
 *
 * Duplicated from `@themvora/core` on purpose: this script is serialised into
 * HTML, so it cannot close over a module constant. `provider.astro` writes the
 * stylesheet with the same marker, and `restoreNativeScrollbar()` in core reads
 * it — the string is the contract between the three.
 */
const HIDING_STYLE_ATTR = "data-themvora-scrollbar-hiding";

/** The `id` the client-side bootstrap gives its stylesheet. */
const HIDING_STYLE_ID = "tv-scrollbar-style";

/** The element `<ThemeScrollbar />` renders. */
const OVERLAY_TAG = "themvora-scrollbar";

/**
 * Build the guard script.
 *
 * Returns a self-invoking function body as a string, ready for
 * `<script is:inline set:html={...}>`. Idempotent and exception-safe: a page
 * without the class, or a DOM that has already been torn down, is a no-op.
 */
export function createScrollbarHidingGuardScript(): string {
  return `(function(){
try{
var d=document,el=d.documentElement;
if(!el.classList.contains("tv-scrollbar"))return;
if(d.querySelector(${JSON.stringify(OVERLAY_TAG)}))return;
el.classList.remove("tv-scrollbar");
el.classList.remove("tv-scrollbar-ready");
var s=d.querySelectorAll(${JSON.stringify(
    `style[${HIDING_STYLE_ATTR}],#${HIDING_STYLE_ID}`,
  )});
for(var i=0;i<s.length;i++){var n=s[i];if(n.parentNode)n.parentNode.removeChild(n);}
}catch(e){}})();`;
}
