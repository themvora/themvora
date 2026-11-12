/**
 * Early restoration of Astro's own saved scroll position.
 *
 * ## The defect this closes
 *
 * `<ClientRouter />` takes over scroll restoration on the first load:
 * it saves the position into `history.state` (`scrollX` / `scrollY`) and sets
 * `history.scrollRestoration = "manual"`. The position is then restored by the
 * router's **deferred module**, which runs after the document has been parsed
 * and may paint before it.
 *
 * That window is not theoretical. Measured against a production build with a
 * throttled network and CPU, the document was fully tall at ~240 ms but the
 * router did not restore until ~450 ms, and first paint happened in between.
 * In `astro dev` the module graph is larger, and the window widens to seconds.
 * The first frame therefore paints at `scrollY === 0` and the page jumps to
 * the saved position afterwards.
 *
 * The browser cannot fill the gap by itself: the router deliberately disabled
 * native restoration (`"manual"`), so there is no competing native restore to
 * let through. Re-enabling it before the router module runs does not help
 * either — the platform's restore is also gated on document-ready milestones
 * that the deferred module delays.
 *
 * ## Why reading `history.state` is not the sessionStorage workaround
 *
 * This does not invent a scroll store. It reads the exact value Astro's router
 * is about to restore, with three consequences:
 *
 * - **No duplicate source of truth.** There is no per-pathname key, so two
 *   history entries for the same URL keep their own positions, and a new
 *   navigation (whose entry has no Astro state) is never handed an old one.
 * - **No overwrite of the router's work.** Both paths restore the same value;
 *   the later one is a no-op.
 * - **No change to whose job restoration is.** `history.scrollRestoration`
 *   is untouched, and the router still owns client-side navigation and
 *   back/forward. This only closes the hard-load window before its module
 *   runs.
 *
 * The `index` check scopes the script to Astro's state shape — another
 * router's `history.state` is left alone.
 *
 * ## Why an inline script at the end of `<body>`
 *
 * The restore has to happen after the server-rendered content exists (before
 * that there is nothing to scroll) but before the deferred router module and
 * the first paint. An inline classic script at the end of `<body>` runs at
 * exactly that point. A bundled module would run with the router (too late),
 * and `DOMContentLoaded` waits for deferred modules (also too late).
 *
 * The scroll is forced instant: an app with `scroll-behavior: smooth` on
 * `<html>` would otherwise animate the restoration, turning a one-frame jump
 * into a visible slide. The inline override is reverted synchronously, so it
 * cannot affect later scrolling.
 *
 * @returns The inline script string to emit after the provider's slot.
 */
export function createScrollRestorationScript(): string {
  return `(function(){
try{
var s=history.state;
if(!s||typeof s!=="object"||typeof s.index!=="number")return;
var y=typeof s.scrollY==="number"?s.scrollY:0;
var x=typeof s.scrollX==="number"?s.scrollX:0;
if(!(y>0)&&!(x>0))return;
var el=document.documentElement,prev=el.style.scrollBehavior;
el.style.scrollBehavior="auto";
try{window.scrollTo(x,y);}finally{el.style.scrollBehavior=prev;}
}catch(e){}})();`;
}
