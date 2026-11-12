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
  // Out of scope (`scope.exclude`): no overlay is drawn there, so the reserved
  // gutter is dead space. The engine marks those containers; collapse it.
  "html.tv-scrollbar [data-themvora-scrollbar=excluded]::-webkit-scrollbar{width:0;height:0}" +
  // Firefox and other non-WebKit engines: reserve the same way, invisibly.
  "@supports not selector(::-webkit-scrollbar){" +
  "html.tv-scrollbar *{scrollbar-width:thin;scrollbar-color:transparent transparent}" +
  "html.tv-scrollbar body{scrollbar-width:none}" +
  "[data-themvora-scrollbar=overlay]{scrollbar-width:thin;scrollbar-color:transparent transparent}" +
  "html.tv-scrollbar [data-themvora-scrollbar=excluded]{scrollbar-width:none}" +
  "}";

/** The hiding CSS, for SSR output (e.g. Next inlines it as a `<style>` in
 *  `<head>`). Use together with the `tv-scrollbar` class on `<html>`. */
export function createPrePaintScrollbarCSS(): string {
  return PRE_PAINT_SCROLLBAR_CSS;
}

/**
 * `id` of the stylesheet the client-side bootstrap injects.
 *
 * Kept for compatibility — a teardown must find the stylesheet whoever wrote
 * it, so {@link restoreNativeScrollbar} looks for the marker attribute below as
 * well, and that is the one every producer sets.
 */
export const SCROLLBAR_HIDING_STYLE_ID = "tv-scrollbar-style";

/**
 * Marker on every stylesheet that hides the native scrollbar.
 *
 * Three different places can emit that CSS — this module's blocking script,
 * `createOverlayScrollbar`, and an SSR adapter (the Astro provider renders it
 * inline in `<head>`). A stylesheet is only removable if a teardown can find
 * it, and an id alone cannot: the SSR output has no id, and an id is a single
 * slot. So the marker is the contract, and the id is just a fast path.
 */
export const SCROLLBAR_HIDING_STYLE_ATTR = "data-themvora-scrollbar-hiding";

/** Every stylesheet currently hiding the native scrollbar. */
function hidingStylesheets(): HTMLStyleElement[] {
  const found: HTMLStyleElement[] = [];
  const byId = document.getElementById(SCROLLBAR_HIDING_STYLE_ID);
  if (byId instanceof HTMLStyleElement) found.push(byId);
  const marked = document.querySelectorAll<HTMLStyleElement>(
    `style[${SCROLLBAR_HIDING_STYLE_ATTR}]`,
  );
  for (let i = 0; i < marked.length; i += 1) {
    const el = marked[i];
    if (el && !found.includes(el)) found.push(el);
  }
  return found;
}

/**
 * How many live overlays are currently relying on the native scrollbar being
 * hidden. The hiding is a document-wide fact but overlays are per-instance, so
 * the last one out turns the lights off — a rebuild or a second overlay must
 * never hand the native bar back while another overlay is still drawing.
 */
let hidingClaims = 0;

/**
 * Restore the platform's native scrollbars, discarding any outstanding claims.
 *
 * Undoes the hiding completely: the `tv-scrollbar` class (and the
 * `tv-scrollbar-ready` phase marker) come off `<html>`, and every hiding
 * stylesheet is removed. Safe to call at any time and idempotent — a page that
 * never hid anything is left untouched.
 *
 * This is what makes the overlay's lifecycle symmetric. Without it, unmounting
 * the overlay left the page with the native bar still hidden and nothing to
 * replace it: an invisible scrollbar, not a native one.
 *
 * It is also a hard reset: the claim count drops to zero, so an overlay that
 * outlives the call no longer keeps the native bar hidden on its own. That is
 * the point — it is the escape hatch for a page that has decided the overlay is
 * gone (a teardown, a framework's `beforeunload`, a test), and it is why the
 * count cannot drift upwards forever.
 */
export function restoreNativeScrollbar(): void {
  hidingClaims = 0;
  if (typeof document === "undefined") return;
  try {
    const docEl = document.documentElement;
    docEl.classList.remove("tv-scrollbar");
    docEl.classList.remove("tv-scrollbar-ready");
    for (const sheet of hidingStylesheets()) sheet.remove();
  } catch {
    /* ignore */
  }
}

/**
 * Hide the native scrollbar and register a claim that keeps it hidden.
 *
 * Returns the release function for that claim. The hiding is applied
 * idempotently (the class may already be server-rendered, the stylesheet may
 * already exist), and it is released when the last claim goes away — so
 * `createOverlayScrollbar` and its `destroy()` are a matched pair rather than
 * a one-way switch.
 */
export function hideNativeScrollbar(): () => void {
  if (typeof document === "undefined") return () => {};

  try {
    const docEl = document.documentElement;
    if (!docEl.classList.contains("tv-scrollbar")) {
      docEl.classList.add("tv-scrollbar");
    }
    // Respect an SSR stylesheet that is already there instead of stacking a
    // duplicate: the rules are identical and order between them is irrelevant.
    if (hidingStylesheets().length === 0) {
      const style = document.createElement("style");
      style.id = SCROLLBAR_HIDING_STYLE_ID;
      style.setAttribute(SCROLLBAR_HIDING_STYLE_ATTR, "");
      style.textContent = PRE_PAINT_SCROLLBAR_CSS;
      document.head.appendChild(style);
    }
  } catch {
    /* ignore */
  }

  hidingClaims += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    hidingClaims = Math.max(0, hidingClaims - 1);
    if (hidingClaims === 0) restoreNativeScrollbar();
  };
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
s.id=${JSON.stringify(SCROLLBAR_HIDING_STYLE_ID)};
s.setAttribute(${JSON.stringify(SCROLLBAR_HIDING_STYLE_ATTR)},"");
s.textContent=${JSON.stringify(PRE_PAINT_SCROLLBAR_CSS)};
doc.head.appendChild(s);
}catch(e){}})();`;
}
