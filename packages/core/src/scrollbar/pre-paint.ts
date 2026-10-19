/**
 * Phase 1 — Bootstrap: hide native scrollbar before first paint.
 *
 * This is a tiny, dependency-free, blocking `<script>` that runs before
 * React. It does ONE thing: inject a `<style>` and add `tv-scrollbar`
 * to `<html>` so the native scrollbar is never painted.
 *
 *   No DOM creation.
 *   No observers.
 *   No listeners.
 *   No React.
 *   No rAF.
 *
 * Executes in under 1 ms.
 *
 * The overlay (ThemeScrollbar) handles everything else: measure, draw,
 * animate, drag, hover, physics. When the overlay has been painted once,
 * it adds `tv-scrollbar-ready` to `<html>` — enabling CSS fade-in.
 *
 * Architecture:
 *
 *   Phase 1 — Bootstrap (this module)
 *     └─ hide native scrollbar
 *     └─ add tv-scrollbar
 *
 *   Phase 2 — ThemeScrollbar (React / Web / Angular)
 *     └─ create overlay
 *     └─ measure
 *     └─ attach listeners (scroll, resize, pointer, wheel, MutationObserver)
 *
 *   Phase 3 — Ready
 *     └─ tv-scrollbar-ready
 *     └─ overlay fades in via CSS
 *
 * Next.js (`@themvora/next`) server-renders the `tv-scrollbar` class on
 * `<html>` and inlines `createPrePaintScrollbarCSS()` as a `<style>` in
 * `<head>` when the `scrollbar` prop is set — so the native bar is hidden
 * from the very first paint AND React hydrates without a class mismatch.
 * Emitting `createPrePaintScrollbarScript()` yourself is only needed when
 * you're not on `@themvora/next` (no SSR of the class).
 */

export type PrePaintScrollbarOptions = {
  /** Keep native scrollbars on touch / coarse-pointer devices. Default `false`. */
  touch?: boolean;
};

/** The CSS that hides native scrollbars while `tv-scrollbar` is present on
 *  `<html>`. Shared by the client bootstrap script and Next's SSR output so
 *  both apply identical rules.
 *
 *  The bar is painted invisible while KEEPING its space, so the gutter that
 *  keeps content clear of the rail exists from the first frame (no load-time
 *  layout shift). Two groups:
 *
 *  - The PAGE / window scrollbar is collapsed (`scrollbar-width: none`). Its
 *    rail auto-hides, so a reserved empty strip at the window edge would read
 *    as a missing scrollbar; the standard property also overrides the WebKit
 *    sizing below, so the page never reserves one.
 *  - INNER scroll containers keep an invisible, space-occupying scrollbar. It
 *    is sized through `::-webkit-scrollbar` (not only `scrollbar-color`)
 *    because styling those pseudo-elements is what takes Chromium/Safari off
 *    OVERLAY scrollbars — so the gutter is reserved on macOS too, where the
 *    native path would take no space. The space appears only while the
 *    container actually scrolls, exactly like a native `overflow: auto` bar.
 *  - Engines without WebKit pseudo-elements (Firefox) get the same reserve
 *    through the standard properties.
 */
export const PRE_PAINT_SCROLLBAR_CSS =
  // Page / window: collapsed (no reserved strip).
  "html.tv-scrollbar,html.tv-scrollbar body,body.tv-scrollbar{scrollbar-width:none;-ms-overflow-style:none}" +
  "html.tv-scrollbar::-webkit-scrollbar,html.tv-scrollbar body::-webkit-scrollbar,body.tv-scrollbar::-webkit-scrollbar{width:0;height:0}" +
  // Inner scroll containers: invisible but space-occupying.
  "html.tv-scrollbar *::-webkit-scrollbar{width:15px;height:15px;background:transparent}" +
  "html.tv-scrollbar *::-webkit-scrollbar-thumb,html.tv-scrollbar *::-webkit-scrollbar-track,html.tv-scrollbar *::-webkit-scrollbar-corner{background:transparent}" +
  "[data-themvora-scrollbar=overlay]::-webkit-scrollbar{width:15px;height:15px;background:transparent}" +
  "[data-themvora-scrollbar=overlay]::-webkit-scrollbar-thumb,[data-themvora-scrollbar=overlay]::-webkit-scrollbar-track,[data-themvora-scrollbar=overlay]::-webkit-scrollbar-corner{background:transparent}" +
  // Firefox and other non-WebKit engines: reserve the same way, invisibly.
  "@supports not selector(::-webkit-scrollbar){" +
  "html.tv-scrollbar *{scrollbar-width:thin;scrollbar-color:transparent transparent}" +
  "html.tv-scrollbar body{scrollbar-width:none}" +
  "[data-themvora-scrollbar=overlay]{scrollbar-width:thin;scrollbar-color:transparent transparent}" +
  "}";

/** The hiding CSS, for SSR output (e.g. Next inlines it as a `<style>` in
 *  `<head>`). Use together with the `tv-scrollbar` class on `<html>`. */
export function createPrePaintScrollbarCSS(): string {
  return PRE_PAINT_SCROLLBAR_CSS;
}

/**
 * Generate a blocking `<script>` that hides the native scrollbar before
 * first paint. The script is idempotent — calling it multiple times is safe.
 * On coarse-pointer devices it returns early (unless `touch` is forced), so
 * native scrollbars are kept.
 */
export function createPrePaintScrollbarScript(
  options: PrePaintScrollbarOptions = {},
): string {
  const touch = options.touch ?? false;

  return `(function(){
try{
var doc=document,el=doc.documentElement;
if(el.classList.contains("tv-scrollbar"))return;
var coarse=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches;
if(coarse&&!${JSON.stringify(touch)})return;
el.classList.add("tv-scrollbar");
var s=doc.createElement("style");
s.id="tv-scrollbar-style";
s.textContent=${JSON.stringify(PRE_PAINT_SCROLLBAR_CSS)};
doc.head.appendChild(s);
}catch(e){}})();`;
}
