import {
  createOverlayScrollbar,
  PRE_PAINT_SCROLLBAR_CSS,
  SCROLLBAR_HIDING_STYLE_ATTR,
  SCROLLBAR_HIDING_STYLE_ID,
  type OverlayScrollbarOptions,
  type ThemeDefinition,
  type ThemeRuntime,
} from "@themvora/core";
import { ThemvoraRuntimeConsumer } from "./runtime-consumer";

/**
 * Injects the pre-paint scrollbar-hiding CSS and class into the document.
 *
 * Framework-free (vanilla JS). Adds a `<style>` carrying the pre-paint
 * scrollbar CSS and the `tv-scrollbar` class to the document root so the
 * native scrollbar is hidden before first paint. Idempotent and a no-op on the
 * server.
 *
 * This is a manual bootstrap helper for a page that wants the native bar hidden
 * before its own script runs. It is *not* how {@link ThemvoraScrollbar} hides
 * the bar — that happens through `createOverlayScrollbar`, which claims the
 * hiding and gives it back on `destroy()`. Calling this directly therefore
 * hides the bar without registering a claim, so pair it with
 * `restoreNativeScrollbar()` if you later want the native bar back.
 *
 * @see {@link ThemvoraScrollbar}
 * @see `createPrePaintScrollbarScript`
 */
export function injectPrePaintScrollbarCSS(): void {
  if (typeof document === "undefined") return;
  const docEl = document.documentElement;
  if (!document.getElementById(SCROLLBAR_HIDING_STYLE_ID) &&
      document.querySelector(`style[${SCROLLBAR_HIDING_STYLE_ATTR}]`) === null) {
    const style = document.createElement("style");
    style.id = SCROLLBAR_HIDING_STYLE_ID;
    style.setAttribute(SCROLLBAR_HIDING_STYLE_ATTR, "");
    style.textContent = PRE_PAINT_SCROLLBAR_CSS;
    document.head.appendChild(style);
  }
  docEl.classList.add("tv-scrollbar");
}

function parseBool(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  return value !== "false" && value !== "0";
}

function parseNum(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** A comma-separated attribute (`include=".a, .b"`) as a list of selectors. */
function parseList(value: string | null): string[] | undefined {
  if (value === null) return undefined;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length > 0 ? items : undefined;
}

function optionsFrom(el: HTMLElement): OverlayScrollbarOptions {
  const opts: OverlayScrollbarOptions = {};
  const autoHide = parseBool(el.getAttribute("auto-hide"));
  const autoHideDelay = parseNum(el.getAttribute("auto-hide-delay"));
  const hoverExpand = parseBool(el.getAttribute("hover-expand"));
  const draggable = parseBool(el.getAttribute("draggable"));
  const clickToJump = parseBool(el.getAttribute("click-to-jump"));
  const smooth = parseBool(el.getAttribute("smooth"));
  const overscroll = parseBool(el.getAttribute("overscroll"));
  const arrows = parseBool(el.getAttribute("arrows"));
  const arrowIcon = el.getAttribute("arrow-icon") ?? undefined;
  const arrowUpIcon = el.getAttribute("arrow-up-icon") ?? undefined;
  const arrowDownIcon = el.getAttribute("arrow-down-icon") ?? undefined;
  const arrowLeftIcon = el.getAttribute("arrow-left-icon") ?? undefined;
  const arrowRightIcon = el.getAttribute("arrow-right-icon") ?? undefined;
  const touch = parseBool(el.getAttribute("touch"));
  const thickness = parseNum(el.getAttribute("thickness"));
  const hoverThickness = parseNum(el.getAttribute("hover-thickness"));
  const radius = parseNum(el.getAttribute("radius"));
  const minThumbSize = parseNum(el.getAttribute("min-thumb-size"));
  const iconSize = parseNum(el.getAttribute("icon-size"));
  const offset = parseNum(el.getAttribute("offset"));
  const offsetTop = parseNum(el.getAttribute("offset-top"));
  const offsetRight = parseNum(el.getAttribute("offset-right"));
  const offsetBottom = parseNum(el.getAttribute("offset-bottom"));
  const offsetLeft = parseNum(el.getAttribute("offset-left"));
  const trackOpacity = parseNum(el.getAttribute("track-opacity"));
  const thumbOpacity = parseNum(el.getAttribute("thumb-opacity"));
  const duration = parseNum(el.getAttribute("duration"));
  const animationDuration = parseNum(el.getAttribute("animation-duration"));
  const thumbColor = el.getAttribute("thumb-color") ?? undefined;
  const trackColor = el.getAttribute("track-color") ?? undefined;
  const activeThumbColor = el.getAttribute("active-thumb-color") ?? undefined;
  const thumbHoverColor = el.getAttribute("thumb-hover-color") ?? undefined;
  const zIndex = parseNum(el.getAttribute("z-index"));

  if (autoHide !== undefined) opts.autoHide = autoHide;
  if (autoHideDelay !== undefined) opts.autoHideDelay = autoHideDelay;
  if (hoverExpand !== undefined) opts.hoverExpand = hoverExpand;
  if (draggable !== undefined) opts.draggable = draggable;
  if (clickToJump !== undefined) opts.clickToJump = clickToJump;
  if (smooth !== undefined) opts.smooth = smooth;
  if (overscroll !== undefined) opts.overscroll = overscroll;
  if (arrows !== undefined) opts.arrows = arrows;
  if (arrowIcon !== undefined) opts.arrowIcon = arrowIcon;
  if (arrowUpIcon !== undefined) opts.arrowUpIcon = arrowUpIcon;
  if (arrowDownIcon !== undefined) opts.arrowDownIcon = arrowDownIcon;
  if (arrowLeftIcon !== undefined) opts.arrowLeftIcon = arrowLeftIcon;
  if (arrowRightIcon !== undefined) opts.arrowRightIcon = arrowRightIcon;
  if (touch !== undefined) opts.touch = touch;
  if (thickness !== undefined) opts.thickness = thickness;
  if (hoverThickness !== undefined) opts.hoverThickness = hoverThickness;
  if (radius !== undefined) opts.radius = radius;
  if (minThumbSize !== undefined) opts.minThumbSize = minThumbSize;
  if (iconSize !== undefined) opts.iconSize = iconSize;
  // Per-side attributes win over the scalar `offset` when any is present.
  const sides = {
    ...(offsetTop !== undefined ? { top: offsetTop } : {}),
    ...(offsetRight !== undefined ? { right: offsetRight } : {}),
    ...(offsetBottom !== undefined ? { bottom: offsetBottom } : {}),
    ...(offsetLeft !== undefined ? { left: offsetLeft } : {}),
  };
  if (Object.keys(sides).length > 0) opts.offset = sides;
  else if (offset !== undefined) opts.offset = offset;
  if (trackOpacity !== undefined) opts.trackOpacity = trackOpacity;
  if (thumbOpacity !== undefined) opts.thumbOpacity = thumbOpacity;
  if (duration !== undefined) opts.duration = duration;
  if (animationDuration !== undefined) opts.animationDuration = animationDuration;
  if (thumbColor !== undefined) opts.thumbColor = thumbColor;
  if (trackColor !== undefined) opts.trackColor = trackColor;
  if (activeThumbColor !== undefined) opts.activeThumbColor = activeThumbColor;
  if (thumbHoverColor !== undefined) opts.thumbHoverColor = thumbHoverColor;
  if (zIndex !== undefined) opts.zIndex = zIndex;

  const dir = el.getAttribute("dir");
  if (dir === "ltr" || dir === "rtl" || dir === "auto") opts.dir = dir;

  const axes = el.getAttribute("axes");
  if (axes) {
    opts.axes = axes
      .split(",")
      .map((a) => a.trim())
      .filter((a): a is "vertical" | "horizontal" =>
        a === "vertical" || a === "horizontal",
      );
  }

  const include = parseList(el.getAttribute("include"));
  if (include) opts.include = include;
  const exclude = parseList(el.getAttribute("exclude"));
  if (exclude) opts.exclude = exclude;

  return opts;
}

/**
 * Phase 2 — ThemvoraScrollbar (Web Component): overlay only.
 *
 * Creates the custom scrollbar overlay.
 *
 * Lifecycle:
 *   connectedCallback  → resolve the runtime
 *                        ↓
 *   onRuntime          → hide native bar (Phase 1) → create overlay → attach
 *                        ↓ (Phase 2)
 *   later              → add tv-scrollbar-ready
 *                        ↓ (Phase 3)
 *   onDetach / destroy → remove overlay → restore native bar
 *
 * Phase 1 happens synchronously inside the overlay's construction. For static
 * HTML served via the Vite plugin (scrollbar: true), the pre-paint script in
 * <head> runs before first paint; for an SSR'd provider the class and CSS are
 * in the markup. This component's own hiding is the fallback for
 * dynamically-inserted elements (which may have already painted).
 *
 * The teardown is a real teardown. The hiding is claimed, not switched on, so
 * removing the element gives the native scrollbar back instead of leaving the
 * page with no scrollbar at all — and an attribute change swaps the overlay
 * without ever passing through the "hidden, but nothing drawn" state.
 *
 * @remarks
 * **Attributes.** Every option is an attribute; changing one rebuilds the
 * overlay. Booleans are presence-based: present (any value except `false` or
 * `0`) enables, absent or `false` disables. Numbers are unitless pixels.
 *
 * - Behaviour — `auto-hide`, `auto-hide-delay`, `hover-expand`, `draggable`,
 *   `click-to-jump`, `smooth`, `overscroll`, `touch`.
 * - Arrows — `arrows`, `arrow-icon`, `arrow-up-icon`, `arrow-down-icon`,
 *   `arrow-left-icon`, `arrow-right-icon` (SVG markup or URL).
 * - Geometry — `thickness`, `hover-thickness`, `radius`, `min-thumb-size`,
 *   `icon-size`, `offset` (uniform inset), `offset-top`, `offset-right`,
 *   `offset-bottom`, `offset-left` (per-side insets win over `offset`).
 * - Motion and paint — `track-opacity`, `thumb-opacity`, `duration`,
 *   `animation-duration`, `thumb-color`, `track-color`, `active-thumb-color`,
 *   `thumb-hover-color`. Colors default to the active theme's tokens.
 * - Placement — `z-index`, `dir` (`ltr` / `rtl` / `auto`), `axes`
 *   (comma-separated `vertical` / `horizontal`), `include` / `exclude`
 *   (comma-separated CSS selectors for the containers to track).
 *
 * **Properties.** None of its own beyond the standard `HTMLElement` surface.
 *
 * **Events.** Dispatches nothing of its own; it adds `tv-scrollbar-ready` to
 * the element once the overlay is measured and attached.
 *
 * **Slots.** None — the element renders nothing into the document flow; the
 * overlay it creates lives outside it.
 *
 * @see {@link ThemvoraProvider}
 */
export class ThemvoraScrollbar extends ThemvoraRuntimeConsumer {
  private handle: { destroy(): void } | null = null;

  /**
   * Every attribute `optionsFrom` reads.
   *
   * The engine resolves its options once, when the overlay is created, so a
   * changed attribute has to rebuild it — without this list a new value was
   * ignored until the page was reloaded.
   */
  static get observedAttributes(): string[] {
    return [
      "auto-hide",
      "auto-hide-delay",
      "hover-expand",
      "draggable",
      "click-to-jump",
      "smooth",
      "overscroll",
      "arrows",
      "arrow-icon",
      "arrow-up-icon",
      "arrow-down-icon",
      "arrow-left-icon",
      "arrow-right-icon",
      "touch",
      "thickness",
      "hover-thickness",
      "radius",
      "min-thumb-size",
      "icon-size",
      "offset",
      "offset-top",
      "offset-right",
      "offset-bottom",
      "offset-left",
      "track-opacity",
      "thumb-opacity",
      "duration",
      "animation-duration",
      "thumb-color",
      "track-color",
      "active-thumb-color",
      "thumb-hover-color",
      "z-index",
      "dir",
      "axes",
      "include",
      "exclude",
    ];
  }

  /** Lifecycle hook: rebuilds the overlay when a watched attribute changes. */
  attributeChangedCallback() {
    // Before the runtime is attached there is nothing to rebuild; the first
    // `onRuntime` reads the attributes as they are then.
    const runtime = this.runtime;
    if (!runtime || !this.isConnected) return;
    this.rebuild(runtime);
  }

  protected override onRuntime(runtime: ThemeRuntime<ThemeDefinition>): void {
    this.rebuild(runtime);
  }

  /** Lifecycle hook: destroys the overlay scrollbar. */
  protected override onDetach(): void {
    this.handle?.destroy();
    this.handle = null;
  }

  private rebuild(runtime: ThemeRuntime<ThemeDefinition>) {
    // Create the replacement BEFORE destroying the incumbent.
    //
    // Both operations touch one document-wide fact — whether the native
    // scrollbar is hidden — and that fact is reference counted. Destroying
    // first would drop the count to zero, hand the native bar back, and let the
    // new overlay take it away again: a one-frame flash of the native bar, and
    // a horizontal reflow of the whole page by the bar's width. Creating first
    // keeps the count at one across the swap, so changing a prop is invisible.
    const previous = this.handle;
    this.handle = createOverlayScrollbar(
      runtime.store as any,
      optionsFrom(this),
    );
    previous?.destroy();
  }

  static define(tag = "themvora-scrollbar") {
    // SSR-safe: customElements only exists in the browser. Framework wrappers
    // (Vue, Solid, Angular, Astro, …) call define() from both server and client
    // environments, so this must be a no-op on the server.
    if (typeof customElements === "undefined") return;
    if (!customElements.get(tag)) {
      customElements.define(tag, ThemvoraScrollbar);
    }
  }
}
