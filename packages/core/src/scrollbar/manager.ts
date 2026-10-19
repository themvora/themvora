import type { ThemeStore } from "../types";
import { createDiagnostic, emitDiagnostic } from "../diagnostics";
import {
  clamp,
  computeMaxScroll,
  computeThumbSize,
  overscrollFactor,
  toArray,
} from "./calculations";
import { easeAlpha, isSettled, lerp, prefersReducedMotion, FRAME_MS } from "./physics";
import { observeScrollbarSizing } from "./observers";
import { PRE_PAINT_SCROLLBAR_CSS } from "./pre-paint";
import {
  contrast,
  hexToRgb,
  pickThumbColor,
  pickThumbFromCandidates,
  THUMB_CONTRAST_FLOOR,
} from "./thumb-color";
import type {
  ArrowIcon,
  AxisState,
  Host,
  OverlayScrollbarHandle,
  OverlayScrollbarOptions,
  ScrollbarArrowDir,
  ScrollbarAxis,
  ScrollbarInsets,
  ScrollbarOffset,
  ScrollbarOffsetSides,
  ScrollbarOptionsResolved,
} from "./types";

function resolveOptions(options: OverlayScrollbarOptions): ScrollbarOptionsResolved {
  const thickness = options.thickness ?? 8;
  return {
     autoHide: options.autoHide ?? true,
    autoHideDelay: options.autoHideDelay ?? 900,
    hoverExpand: options.hoverExpand ?? false,
    draggable: options.draggable ?? true,
    clickToJump: options.clickToJump ?? true,
    // Exact tracking by default: the thumb always sits at the exact scroll
    // value (no easing lag). `smooth: true` opts into eased travel.
    smooth: options.smooth ?? false,
    overscroll: options.overscroll ?? true,
    arrows: options.arrows ?? true,
    arrowIcon: options.arrowIcon ?? undefined,
    arrowUpIcon: options.arrowUpIcon ?? undefined,
    arrowDownIcon: options.arrowDownIcon ?? undefined,
    arrowLeftIcon: options.arrowLeftIcon ?? undefined,
    arrowRightIcon: options.arrowRightIcon ?? undefined,
    arrowIconRenderer: options.arrowIconRenderer,
    thickness,
    hoverThickness: options.hoverThickness ?? thickness + 4,
    radius: options.radius ?? 999,
    minThumbSize: options.minThumbSize ?? 32,
    iconSize: validIconSize(options.iconSize),
    // Edge clearance (per side) and the content-side separation. `offset` is
    // the public knob for the former; the latter is an internal constant
    // exposed as `--tv-scrollbar-gap` on every strip.
    insets: resolveInsets(options.offset),
    gap: DEFAULT_CONTENT_GAP,
    trackOpacity: options.trackOpacity ?? 0.32,
    thumbOpacity: options.thumbOpacity ?? 0.92,
    thumbColor: options.thumbColor,
    trackColor: options.trackColor,
    activeThumbColor: options.activeThumbColor,
    thumbHoverColor: options.thumbHoverColor,
    zIndex: options.zIndex,
    duration: options.duration ?? 200,
    animationDuration: options.animationDuration ?? 140,
    axes: options.axes ?? ["vertical", "horizontal"],
    include: toArray(options.include),
    exclude: toArray(options.exclude),
    touch: options.touch ?? false,
    dir: resolveDir(options.dir),
  };
}

function resolveDir(dir: "ltr" | "rtl" | "auto" | undefined): "ltr" | "rtl" {
  if (dir === "ltr" || dir === "rtl") return dir;
  try {
    const d =
      (document.documentElement.getAttribute("dir") ||
        getComputedStyle(document.documentElement).direction ||
        "ltr") as "ltr" | "rtl";
    return d === "rtl" ? "rtl" : "ltr";
  } catch {
    return "ltr";
  }
}

function isCoarsePointer(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

/**
 * True when the document itself can still scroll.
 *
 * Apps lock the page behind a modal / mobile menu the standard way — by
 * setting `body { overflow: hidden }` (or `html`). When locked, the document
 * still reports `scrollHeight > clientHeight`, so without this check the root
 * overlay strip would keep floating over the fixed overlay and produce TWO
 * stacked scrollbars at the same right edge (the docs mobile-nav bug).
 *
 * Overflow follows the size-propagation rule: `<html>` is the viewport
 * scroller unless its `overflow` is `visible` (the initial value), in which
 * case `body`'s overflow is propagated to the viewport instead. `auto` /
 * `scroll` always offer scrolling when content overflows.
 */
function documentCanScroll(): boolean {
  if (typeof document === "undefined") return true;
  try {
    const h = getComputedStyle(document.documentElement).overflowY;
    const b = getComputedStyle(document.body).overflowY;
    if (h === "hidden" || h === "clip") return false;
    if ((h === "visible" || h === "") && (b === "hidden" || b === "clip")) return false;
    return true;
  } catch {
    return true;
  }
}

/** Z-index used when neither the scrollable nor any positioned ancestor
 *  declares one.
 *
 *  `0` — not a "high enough" number. The overlay is `position: fixed`, so it
 *  still paints above static content, but a sticky navbar, a fixed header or
 *  any other positioned layer with a positive `z-index` paints over it, exactly
 *  as that layer paints over the container the strip belongs to. A scrollable
 *  *inside* a header must never draw its rail across that header.
 *
 *  A container that *does* declare a stacking order keeps it (see
 *  `resolveOverlayZIndex`), so a scrollable inside a `z-index: 100` dialog still
 *  gets its strip above that dialog's own content. */
const DEFAULT_OVERLAY_Z = 0;

/** Z-index for the document (page) scrollbar.
 *
 *  The window scrollbar is browser chrome, not page content: a native one is
 *  painted above the document, so a fixed header scrolling underneath it never
 *  hides it. The overlay reproduces that by sitting above the layers a page
 *  uses for chrome — `z-index: 50` fixed headers are the common case (Tailwind's
 *  `z-50`, this repo's docs header, the web example's `20`) — while staying
 *  below the full-screen backdrops that are meant to cover the page (the docs
 *  search backdrop is `60`). A modal that locks body scroll hides this strip
 *  through `documentCanScroll()`, so it does not linger over a dialog either.
 *
 *  This applies to the root host only. Container strips keep their container's
 *  stacking order (`DEFAULT_OVERLAY_Z` / the container's own `z-index`), which
 *  is what keeps a horizontal rail inside a sticky navbar from floating above
 *  the navbar's own content. `zIndex` still overrides both. */
const ROOT_OVERLAY_Z = 55;

/** Default clearance between the custom overlay rail and each container edge,
 *  in px (the inline-end edge for a vertical rail; the inline-start,
 *  inline-end and bottom edges for a horizontal one — plus the near/far ends
 *  of a vertical rail). Overridable per side through the `offset` option. */
const DEFAULT_EDGE_INSET = 4;

/** Default rail insets, all four sides. The left edge defaults to `0`: the
 *  user's content already clears the rail thanks to the native scrollbar gutter
 *  the pre-paint CSS reserves, so no left inset is needed by default. */
const DEFAULT_INSETS: ScrollbarInsets = {
  top: DEFAULT_EDGE_INSET,
  right: DEFAULT_EDGE_INSET,
  bottom: DEFAULT_EDGE_INSET,
  left: 0,
};

/** Default transparent separation reserved on the content-facing side of the
 *  strip, in px, so the visible track never sits flush against the content.
 *  The strip's hit area grows by this much toward the content, but the band
 *  itself is unpainted and pointer-transparent (content stays interactive
 *  beneath it). Exposed on the strip as `--tv-scrollbar-gap`. */
const DEFAULT_CONTENT_GAP = 8;

/** Arrow-button CONTENT scrolling. A tap glides one step; press-and-hold keeps
 *  the historical "one step per ~60ms" repeat rate, after the same delay before
 *  it starts repeating. `opts.smooth` (the rail's own visual smoothness) is
 *  unrelated and untouched. */
const ARROW_MIN_STEP = 16;
const ARROW_HOLD_STEP_MS = 60;
const ARROW_HOLD_DELAY_MS = 350;
/** Exponential-smoothing time constant (ms) for a discrete arrow step. */
const ARROW_EASE_MS = 55;
/** A move is finished once it is within this many px of its target. */
const ARROW_SETTLE_PX = 0.5;

/** Arrow glyph sizing. A requested `iconSize` is floored at this (while the
 *  button's usable area allows it) and always capped at that usable area, so a
 *  larger request can never overflow an unusually thin rail. */
const ICON_MIN_SIZE = 8;

/** The strip's cross-axis footprint: the visible thickness plus the
 *  transparent content-side gap. Keeping this in one place is what stops the
 *  geometry from drifting between the vertical and horizontal axes. */
function stripCrossSize(opts: ScrollbarOptionsResolved, thickness = opts.thickness): number {
  return thickness + opts.gap;
}

/** The effective glyph size for a `cross × long` arrow button, in px.
 *
 *  Bounded by all three of the user's request, the internal minimum and the
 *  button's usable area — and the available-space bound always wins: when the
 *  button is thinner than the minimum, the button size is used rather than
 *  letting the glyph overflow it. */
function glyphSizeFor(requested: number | undefined, cross: number, long: number): number {
  const usable = Math.max(0, Math.min(cross, long));
  if (requested === undefined) return usable;
  return clamp(requested, Math.min(ICON_MIN_SIZE, usable), usable);
}

/** A usable icon size: a positive, finite number, else `undefined`. */
function validIconSize(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  warnInvalidOption("iconSize", value, "a positive, finite number of px");
  return undefined;
}

/** Report an unusable scrollbar option and keep the default. Deduped by code +
 *  property so a reactive caller cannot flood the console. */
function warnInvalidOption(property: string, received: unknown, expected: string): void {
  emitDiagnostic(
    createDiagnostic({
      code: "TV_SCROLLBAR_OPTION_INVALID",
      level: "warning",
      message: `ThemeScrollbar received an unusable \`${property}\`; the default was used instead.`,
      context: { api: "createThemeScrollbar", property, received, expected },
      hint: "Pass a non-negative, finite number of px — e.g. offset: 4 or offset: { top: 4, right: 4, bottom: 4 }.",
    }),
  );
}

/** A usable inset: a non-negative finite number, else `null`. */
function validInset(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Resolve the `offset` option into four concrete rail insets.
 *
 * Accepts a single number (every side) or a per-side object; a side that is
 * omitted keeps the component default. Values that are negative, non-finite or
 * not numbers are reported (see {@link warnInvalidOption}) and fall back to the
 * default, so a typo degrades gracefully rather than hiding the rail.
 */
function resolveInsets(offset: ScrollbarOffset | undefined): ScrollbarInsets {
  if (offset === undefined) return { ...DEFAULT_INSETS };
  if (typeof offset === "number") {
    const v = validInset(offset);
    if (v === null) {
      warnInvalidOption("offset", offset, "a non-negative, finite number or a per-side object");
      return { ...DEFAULT_INSETS };
    }
    return { top: v, right: v, bottom: v, left: v };
  }
  if (typeof offset !== "object" || offset === null) {
    warnInvalidOption("offset", offset, "a non-negative, finite number or a per-side object");
    return { ...DEFAULT_INSETS };
  }
  const sides = offset as ScrollbarOffsetSides;
  const out: ScrollbarInsets = { ...DEFAULT_INSETS };
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const raw = sides[side];
    if (raw === undefined) continue;
    const v = validInset(raw);
    if (v === null) {
      warnInvalidOption(`offset.${side}`, raw, "a non-negative, finite number");
      continue;
    }
    out[side] = v;
  }
  return out;
}

export type { ScrollbarOptionsResolved };

/** Parse `#rgb` / `#rrggbb` into an `[r,g,b]` tuple, or null. */

/**
 * Framework-agnostic, theme-aware scrollbar overlay engine.
 *
 * The browser performs all scrolling — this only renders + animates a visual
 * overlay that tracks it, so inertia, touch, wheel, keyboard and accessibility
 * remain native. Colors come from Themvora tokens, so the overlay re-themes
 * with the rest of the app (no flashes). It tracks the *document* plus every
 * scrollable element on the page by default (anywhere a native scrollbar would
 * appear); the native track is hidden automatically — no manual CSS required.
 */
export function createOverlayScrollbar(
  store: ThemeStore,
  options: OverlayScrollbarOptions = {},
): OverlayScrollbarHandle | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  // Phase 1 — Bootstrap: hide the native scrollbar before the overlay mounts.
  // This is normally done by a blocking `<script>` (createPrePaintScrollbarScript)
  // or by the Next.js server. When only `<ThemeScrollbar />` is mounted (no
  // provider scrollbar prop, no pre-paint script), we apply it here idempotently
  // so the native scrollbar is hidden and the overlay renders thumb + arrows.
  const docEl = document.documentElement;
  if (!docEl.classList.contains("tv-scrollbar")) {
    try {
      docEl.classList.add("tv-scrollbar");
      if (!document.getElementById("tv-scrollbar-style")) {
        const s = document.createElement("style");
        s.id = "tv-scrollbar-style";
        s.textContent = PRE_PAINT_SCROLLBAR_CSS;
        document.head.appendChild(s);
      }
    } catch { /* ignore */ }
  }

  // Touch devices already have excellent native scrollbars. Desktop first.
  if (isCoarsePointer() && !options.touch) {
    // Restore the platform's native scrollbars: undo the bootstrap's
    // `tv-scrollbar` hiding (SSR'd or injected) so coarse-pointer devices keep
    // their native bars when the overlay is intentionally skipped.
    try {
      docEl.classList.remove("tv-scrollbar");
      document.getElementById("tv-scrollbar-style")?.remove();
    } catch { /* ignore */ }
    return null;
  }

  const opts = resolveOptions(options);
  const scrollingEl: HTMLElement = (document.scrollingElement as HTMLElement | null) || docEl;

  const reduced = () => prefersReducedMotion();

  /** Rail insets for a host. The document scroller keeps the defaults and the
   *  physical-right rail, so a per-side `offset` never moves the page scrollbar
   *  (that edge is the browser's to own). */
  function insetsFor(host: Host): ScrollbarInsets {
    return host.isRoot ? DEFAULT_INSETS : opts.insets;
  }

  /** Which edge a vertical rail sits on — the inline-end edge, so it follows
   *  the writing direction for inner hosts. The document rail keeps its
   *  existing physical-right side. */
  function railSideFor(host: Host): "left" | "right" {
    if (host.isRoot) return "right";
    return opts.dir === "rtl" ? "left" : "right";
  }

  /** Rail insets at the two ends of an axis (the "0" end is the start). */
  function axisInsets(host: Host, vertical: boolean): { start: number; end: number } {
    const ins = insetsFor(host);
    return vertical ? { start: ins.top, end: ins.bottom } : { start: ins.left, end: ins.right };
  }

  /** The overlay should live inside its container's stacking order: use the
   *  container's own `z-index` when it declares one, otherwise the document's
   *  (no stacking context of its own → `0`). A horizontal strip over a sticky
   *  header, or a bar poking above a search overlay's blurred backdrop, then
   *  respects the page's layering instead of floating over it.
   *
   *  The root host is the exception: it *is* the page scrollbar, so it gets the
   *  page-chrome layer instead of the document's `0` — otherwise a fixed header
   *  covers the top of the track and the bar looks cut in half. */
  function resolveOverlayZIndex(host: Host): number {
    if (opts.zIndex !== undefined) return opts.zIndex;
    if (host.isRoot) return ROOT_OVERLAY_Z;
    // The strip is appended to <body> as `position: fixed`, so it lives in the
    // body's stacking context. A scrollable buried inside a high z-index overlay
    // (modal, mobile menu, command palette) often declares no z-index of its
    // own — e.g. an `overflow-y-auto` child of a fixed `z-100` dialog. Reading
    // only the element's own z-index then yields the low DEFAULT_OVERLAY_Z and
    // the strip hides *behind* the overlay that contains it. Walk the positioned
    // ancestors and adopt the highest z-index so the strip stays visible over
    // whatever fixed layer it belongs to.
    let node: HTMLElement | null = host.target;
    let highest = Number.NEGATIVE_INFINITY;
    while (node && node.nodeType === 1) {
      try {
        const cs = getComputedStyle(node);
        if (cs.position !== "static") {
          const z = parseFloat(cs.zIndex);
          if (Number.isFinite(z) && z > highest) highest = z;
        }
      } catch {
        /* ignore */
      }
      if (node === docEl || node === document.body) break;
      node = node.parentElement;
    }
    if (Number.isFinite(highest)) return highest;
    return DEFAULT_OVERLAY_Z;
  }

  const hosts = new Map<HTMLElement, Host>();
  let scrollableCache = new WeakMap<HTMLElement, { v: boolean; h: boolean }>();
  let needsRescan = true;
  let destroyed = false;

  const isRootCandidate = (el: HTMLElement) =>
    el === docEl || el === document.body || el === scrollingEl;

  // ---- theme colors -----------------------------------------------------
  // The overlay uses the ACTIVE theme's colors out of the box. The thumb takes
  // the first of `primary → accent → foreground` that clears the non-text floor
  // against the canvas (see `pickThumbColor`), the track a faint foreground wash
  // — so no manual token configuration is ever needed, and the thumb is
  // *guaranteed* visible rather than merely themed. That guarantee is the
  // `scrollbar-thumb-on-canvas` context in `generation/contexts.ts`.
  //
  // The theme's CSS variables are already applied on <html> by SSR or the
  // client provider *before* the overlay mounts, so we read from them first
  // for an instant pre-applied color — no flash of default gray.
  let base: [number, number, number] = resolveBaseColor(store);

  function readCSSVariableColor(): [number, number, number] | null {
    try {
      const cs = getComputedStyle(docEl);
      // `--theme-color-text` used to be in this list. Themvora has never
      // defined it — the reading role is `foreground` — so it was a dead lookup
      // that made the fallback chain look longer than it was.
      const vars = [
        "--theme-color-primary",
        "--theme-color-accent",
        "--theme-color-foreground",
      ];
      const parsed = vars
        .map((v) => cs.getPropertyValue(v).trim())
        .filter((val) => val.length > 0)
        .map((val) => hexToRgb(val));

      const canvas = hexToRgb(cs.getPropertyValue("--theme-color-background").trim());
      return pickThumbFromCandidates(parsed, canvas);
    } catch { /* ignore */ }
    return null;
  }

  function resolveBaseColor(s: ThemeStore): [number, number, number] {
    try {
      const theme = s.get() as any;
      const colors: Record<string, unknown> =
        theme?.tokens?.colors ??
        theme?.colors ??
        {};
      const rgb = pickThumbColor(colors);
      if (rgb) return rgb;
    } catch { /* ignore */ }
    // Fall back to CSS variables already applied on <html> — the theme is
    // present as CSS vars from SSR / provider before the overlay mounts.
    const cssVar = readCSSVariableColor();
    if (cssVar) return cssVar;
    return [115, 115, 115];
  }
  const rgba = (a: number) => `rgba(${base[0]}, ${base[1]}, ${base[2]}, ${a})`;
  const trackColor = () => `var(--tv-scrollbar-track, ${rgba(0.22)})`;

  // Resting / hover / active thumb colour. Every step ends at the engine's own
  // `rgba()` rather than `currentColor`: the hover and drag handlers used to
  // fall back to `currentColor`, which was only invisible while the stylesheet
  // defined `--tv-scrollbar-thumb`. It no longer does (deliberately — see
  // scrollbar.css), so a hover that ended left the thumb on the inherited text
  // colour and it never returned to the theme's primary.
  const thumbRest = () => `var(--tv-scrollbar-thumb, ${rgba(0.9)})`;
  const thumbHover = () => `var(--tv-scrollbar-thumb-hover, ${thumbRest()})`;
  const thumbActive = () => `var(--tv-scrollbar-thumb-active, ${thumbHover()})`;

  const storeUnsubscribe = store.subscribe(() => {
    base = resolveBaseColor(store);
    for (const host of hosts.values()) {
      if (host.vertical) paintAxis(host.vertical);
      if (host.horizontal) paintAxis(host.horizontal);
    }
    requestRender();
  });

  function paintAxis(state: AxisState) {
    state.thumb.style.background = thumbRest();
    state.track.style.background = trackColor();
    // Arrows carry no background — just a themed glyph, sized to the strip.
    state.btnTop.style.background = "transparent";
    state.btnBottom.style.background = "transparent";
    state.btnTop.style.color = thumbRest();
    state.btnBottom.style.color = thumbRest();
  }

  // ---- geometry helpers -------------------------------------------------
  const scrollTopOf = (host: Host) =>
    host.isRoot ? scrollingEl.scrollTop : host.target.scrollTop;
  const scrollLeftOf = (host: Host) =>
    host.isRoot ? scrollingEl.scrollLeft : host.target.scrollLeft;
  const contentLenOf = (host: Host) =>
    host.isRoot ? scrollingEl.scrollHeight : host.target.scrollHeight;
  const contentWidthOf = (host: Host) =>
    host.isRoot ? scrollingEl.scrollWidth : host.target.scrollWidth;
  const clientLenOf = (host: Host, vertical: boolean) =>
    vertical
      ? host.isRoot ? window.innerHeight : host.target.clientHeight
      : host.isRoot ? window.innerWidth : host.target.clientWidth;
  const maxScroll = (host: Host, vertical: boolean) =>
    computeMaxScroll(vertical ? contentLenOf(host) : contentWidthOf(host), clientLenOf(host, vertical));
  const scrollOf = (host: Host, vertical: boolean) =>
    vertical ? scrollTopOf(host) : scrollLeftOf(host);

  /** When the perpendicular axis is also active, the strip's END (bottom for
   *  vertical, right for horizontal) is shaved by the other strip's full
   *  cross-axis footprint (thickness + content gap) so the two meet at a clean
   *  native corner instead of overlapping — the horizontal bar never runs
   *  underneath the vertical one (nor pokes past the container's right edge),
   *  and the vertical bar stops above the horizontal one. Shaving by the whole
   *  footprint (not just the visible thickness) also keeps the two strips'
   *  pointer-active hit areas from stacking in the corner. This keeps both
   *  bars fitting *inside* their container. */
  function axisEndInset(host: Host, state: AxisState): number {
    const vertical = state.axis === "vertical";
    const otherActive = vertical
      ? host.horizontal !== null && contentWidthOf(host) > clientLenOf(host, false) + 1
      : host.vertical !== null && contentLenOf(host) > clientLenOf(host, true) + 1;
    return otherActive ? stripCrossSize(opts) : 0;
  }

  function hostRect(host: Host) {
    if (host.isRoot) {
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }
    const raw = host.target.getBoundingClientRect();
    return { left: raw.left, top: raw.top, width: raw.width, height: raw.height };
  }

  /** True when the element's native scrollbar is hidden. The overlay's own
   *  pre-paint CSS sets `scrollbar-width: none` on every element under
   *  `html.tv-scrollbar`; consumers can also hide it themselves. */
  function nativeScrollbarHidden(el: HTMLElement): boolean {
    try {
      return getComputedStyle(el).scrollbarWidth === "none";
    } catch {
      return false;
    }
  }

  /** The host's resolved border-radius on each corner (px, `0` when none).
   *  The document scroller is never rounded, so it returns all `0`. */
  function hostCornerRadius(host: Host): { tl: number; tr: number; br: number; bl: number } {
    if (host.isRoot) return { tl: 0, tr: 0, br: 0, bl: 0 };
    try {
      const cs = getComputedStyle(host.target);
      const px = (v: string): number => {
        const n = parseFloat(v);
        return Number.isFinite(n) && n > 0 ? n : 0;
      };
      return {
        tl: px(cs.borderTopLeftRadius),
        tr: px(cs.borderTopRightRadius),
        br: px(cs.borderBottomRightRadius),
        bl: px(cs.borderBottomLeftRadius),
      };
    } catch {
      return { tl: 0, tr: 0, br: 0, bl: 0 };
    }
  }

  /** The strip is appended to `<body>` as `position: fixed`, so its host's
   *  `overflow` / `border-radius` never clips it. A thin bar laid along a
   *  rounded container therefore pokes out past the corners — unlike the
   *  native scrollbar it replaces, which is clipped by the container itself.
   *  Clip the strip to the host's rounded rectangle: the clip rect is the
   *  host's border box (the strip sits just inside it, so the insets expand
   *  back toward the host's own edges — negative `inset()` values) rounded by
   *  the host's own radii. This reproduces exactly what the container's
   *  `overflow` would have done, on every corner independently. */
  function applyHostClip(
    host: Host,
    state: AxisState,
    rect: { left: number; top: number; width: number; height: number },
    stripLeft: number,
    stripTop: number,
    stripWidth: number,
    stripHeight: number,
  ) {
    if (host.isRoot) return;
    const r = hostCornerRadius(host);
    if (!r.tl && !r.tr && !r.br && !r.bl) {
      if (state.root.style.clipPath) state.root.style.clipPath = "";
      return;
    }
    const insetTop = rect.top - stripTop;
    const insetRight = stripLeft + stripWidth - (rect.left + rect.width);
    const insetBottom = stripTop + stripHeight - (rect.top + rect.height);
    const insetLeft = rect.left - stripLeft;
    state.root.style.clipPath =
      `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px ` +
      `round ${r.tl}px ${r.tr}px ${r.br}px ${r.bl}px)`;
  }

  // Force an *exact* scroll write. Browsers apply an element's CSS
  // `scroll-behavior: smooth` even to direct scrollTop/scrollLeft assignments,
  // which would make drag/arrow scrolling lag behind the pointer. We pin
  // `scroll-behavior: auto` inline just for the write so drags stay 1:1, then
  // restore the previous value so smooth programmatic scrolling still works.
  function writeScroll(el: HTMLElement, vertical: boolean, value: number) {
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    try {
      if (vertical) el.scrollTop = value;
      else el.scrollLeft = value;
    } finally {
      el.style.scrollBehavior = prev;
    }
  }

  function scrollTo(host: Host, value: number, vertical: boolean, smooth = false) {
    const max = maxScroll(host, vertical);
    const next = clamp(value, 0, max);
    if (host.isRoot) {
      if (smooth) {
        if (vertical) window.scrollTo({ top: next, behavior: "smooth" });
        else window.scrollTo({ left: next, behavior: "smooth" });
      } else {
        writeScroll(scrollingEl, vertical, next);
      }
      return;
    }
    if (smooth) {
      host.target.scrollTo({ top: vertical ? next : 0, left: vertical ? 0 : next, behavior: "smooth" });
    } else {
      writeScroll(host.target, vertical, next);
    }
  }

  // ---- axis creation ----------------------------------------------------
  function setArrowContent(el: HTMLDivElement, icon: ArrowIcon) {
    const items = Array.isArray(icon) ? icon : [icon];
    for (const item of items) {
      if (item == null) continue;
      if (typeof item === "string") {
        el.insertAdjacentHTML("beforeend", item);
      } else {
        el.appendChild(item as Node);
      }
    }
  }

  /** Wrap an arrow glyph and rotate it so a vertical icon can serve a
   *  horizontal arrow (and vice-versa) — keeps the whole scrollbar consistent
   *  when the user customizes only the up/down icons, like a native bar whose
   *  four buttons share one glyph family. */
  function rotatedIcon(icon: ArrowIcon | undefined, deg: number): ArrowIcon | undefined {
    const items = Array.isArray(icon) ? icon : [icon];
    // Skip null AND empty-string icons — an empty string is "no icon", not a
    // real glyph, so it must not suppress the CSS-triangle fallback.
    const meaningful = items.filter((i): i is string | Node => i != null && i !== "");
    if (meaningful.length === 0) return undefined;
    const wrap = document.createElement("span");
    wrap.className = "tv-arrow-glyph-rot";
    // The rotated box is the SAME square the engine sizes (`--tv-arrow-size`),
    // so a rotated glyph stays inside the button instead of turning its
    // non-square button box through 90°.
    wrap.style.cssText =
      "display:flex;align-items:center;justify-content:center;" +
      "box-sizing:border-box;width:var(--tv-arrow-size,100%);height:var(--tv-arrow-size,100%);" +
      "max-width:100%;max-height:100%;transform:rotate(" + deg + "deg)";
    for (const item of meaningful) {
      if (typeof item === "string") wrap.insertAdjacentHTML("beforeend", item);
      else wrap.appendChild(item.cloneNode(true) as Node);
    }
    return wrap;
  }

  function makeArrow(
    className: string,
    dir: ScrollbarArrowDir,
    label: string,
    icon: ArrowIcon,
  ): HTMLDivElement {
    const el = document.createElement("div");
    el.className = `tv-arrow ${className}`;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", label);
    // A custom renderer is the source of truth (framework-owned icons like
    // React/JSX that can't be plain HTML); it stamps `tv-arrow-custom` itself
    // only for directions that actually have an icon. Otherwise render the
    // string/Node icon, or fall back to the built-in CSS triangle.
    if (opts.arrowIconRenderer) {
      opts.arrowIconRenderer(el, dir);
    } else if (icon) {
      el.classList.add("tv-arrow-custom");
      setArrowContent(el, icon);
    }
    return el;
  }

  function createAxis(host: Host, axis: ScrollbarAxis): AxisState {
    const vertical = axis === "vertical";

    const root = document.createElement("div");
    root.className = `tv-scrollbar ${vertical ? "tv-v" : "tv-h"}`;
    root.setAttribute("aria-hidden", "true");
    root.setAttribute("data-themvora-host", "");
    // Fresh strips are off-screen until the layout pass fades them in.
    root.style.display = "none";

    const ensureChild = (
      selector: string,
      create: () => HTMLDivElement,
    ): HTMLDivElement => {
      const existing = root.querySelector<HTMLDivElement>(selector);
      if (existing) return existing;
      const el = create();
      root.appendChild(el);
      return el;
    };

    const track = ensureChild(".tv-track", () => {
      const el = document.createElement("div");
      el.className = "tv-track";
      return el;
    });
    const thumb = ensureChild(".tv-thumb", () => {
      const el = document.createElement("div");
      el.className = "tv-thumb";
      return el;
    });
    const allRotated = (main: ArrowIcon | undefined, ...alts: Array<[ArrowIcon | undefined, number]>) =>
      main || alts.reduce<ArrowIcon | undefined>((acc, [icon, deg]) => acc || rotatedIcon(icon, deg), undefined) || "";
    const topIcon = vertical
      ? allRotated(opts.arrowUpIcon || opts.arrowIcon, [opts.arrowRightIcon, -90], [opts.arrowLeftIcon, 90])
      : allRotated(opts.arrowLeftIcon || opts.arrowIcon, [opts.arrowUpIcon, -90], [opts.arrowRightIcon, 180]);
    const bottomIcon = vertical
      ? allRotated(opts.arrowDownIcon || opts.arrowIcon, [opts.arrowRightIcon, 90], [opts.arrowLeftIcon, -90])
      : allRotated(opts.arrowRightIcon || opts.arrowIcon, [opts.arrowUpIcon, 90], [opts.arrowLeftIcon, 180]);
    const btnTop = ensureChild(
      `.tv-arrow.${vertical ? "tv-arrow-up" : "tv-arrow-left"}`,
      () =>
        makeArrow(vertical ? "tv-arrow-up" : "tv-arrow-left", vertical ? "up" : "left", vertical ? "Scroll up" : "Scroll left", topIcon),
    );
    const btnBottom = ensureChild(
      `.tv-arrow.${vertical ? "tv-arrow-down" : "tv-arrow-right"}`,
      () =>
        makeArrow(vertical ? "tv-arrow-down" : "tv-arrow-right", vertical ? "down" : "right", vertical ? "Scroll down" : "Scroll right", bottomIcon),
    );
    if (host.isRoot) {
      document.body.appendChild(root);
      root.style.position = "fixed";
    } else {
      document.body.appendChild(root);
      root.setAttribute("data-overlay", "true");
      root.style.position = "fixed";
    }
    // Adopt the container's stacking order so the scrollbar never floats above
    // fixed headers/modals/backdrops of the page: a horizontal strip over a
    // sticky navbar or an un-blurred bar over a search overlay are both avoided.
    root.style.zIndex = String(resolveOverlayZIndex(host));

    // Geometry custom properties — the shared stylesheet positions the track,
    // thumb and arrow buttons against the rail's edge and leaves the content-side
    // `--tv-scrollbar-gap` band transparent. `--tv-scrollbar-inset` records the
    // rail's own edge inset (the rail side follows the writing direction), so a
    // host can tune spacing through the same custom-property convention the
    // colors already use. (`--tv-arrow` / `--tv-arrow-size` are set by
    // `applyGlyphSizing` once the axis state exists.)
    const insets = insetsFor(host);
    const railSide = railSideFor(host);
    root.setAttribute("data-rail", vertical ? railSide : "bottom");
    root.style.setProperty(
      "--tv-scrollbar-inset",
      `${railSide === "left" ? insets.left : insets.right}px`,
    );
    root.style.setProperty("--tv-scrollbar-gap", `${opts.gap}px`);
    if (opts.thumbColor != null) root.style.setProperty("--tv-scrollbar-thumb", opts.thumbColor);
    if (opts.trackColor != null) root.style.setProperty("--tv-scrollbar-track", opts.trackColor);
    if (opts.thumbHoverColor != null) root.style.setProperty("--tv-scrollbar-thumb-hover", opts.thumbHoverColor);
    if (opts.activeThumbColor != null) root.style.setProperty("--tv-scrollbar-thumb-active", opts.activeThumbColor);
    if (!opts.arrows) {
      btnTop.remove();
      btnBottom.remove();
    }

    const state: AxisState = {
      axis,
      root,
      track,
      thumb,
      btnTop,
      btnBottom,
      dragging: false,
      hovered: false,
      shown: false,
      pointerId: -1,
      dragStartClient: 0,
      dragStartScroll: 0,
      render: { size: 0, drawSize: 0, targetTranslate: 0, currentTranslate: 0 },
      lastGeometry: null,
      __displayed: false,
      __hideTimer: undefined,
      __cleanup: undefined,
    };

    paintAxis(state);
    applyGlyphSizing(state, opts.thickness);
    thumb.style.borderRadius = `${opts.radius}px`;
    track.style.borderRadius = `${opts.radius}px`;
    thumb.style.opacity = "0";
    track.style.opacity = "0";
    btnTop.style.opacity = "0";
    btnBottom.style.opacity = "0";
    root.style.transition = `width ${opts.duration}ms ease, height ${opts.duration}ms ease, opacity ${opts.duration}ms ease`;
    track.style.transition = `background-color ${opts.duration}ms ease, opacity ${opts.duration}ms ease`;
    thumb.style.transition = `background-color ${opts.duration}ms ease, opacity ${opts.duration}ms ease, width ${opts.duration}ms ease, height ${opts.duration}ms ease`;
    btnTop.style.transition = `background-color ${opts.duration}ms ease, opacity ${opts.duration}ms ease`;
    btnBottom.style.transition = `background-color ${opts.duration}ms ease, opacity ${opts.duration}ms ease`;

    if (vertical) {
      // The strip spans the visible thickness plus the transparent content-side
      // gap; the stylesheet keeps the track/thumb/arrows pinned to the
      // container-edge (right) side, leaving the gap band unpainted.
      root.style.width = `${stripCrossSize(opts)}px`;
      thumb.style.top = "0";
      thumb.style.height = "0px";
      btnTop.style.top = "0";
      btnBottom.style.bottom = "0";
    } else {
      root.style.height = `${stripCrossSize(opts)}px`;
      thumb.style.left = "0";
      thumb.style.width = "0px";
      btnTop.style.left = "0";
      btnBottom.style.right = "0";
    }

    wireAxis(host, state);
    return state;
  }

  // ---- button geometry --------------------------------------------------
  function buttonSize(state: AxisState): number {
    if (!opts.arrows) return 0;
    // Compact, native-feeling arrow buttons: roughly the strip thickness plus
    // a small buffer, never dominating a thin mobile scrollbar.
    return Math.max(10, Math.round(opts.thickness * 1.4));
  }

  /**
   * Size the arrow glyphs for a strip whose rail is `thickness` px across.
   *
   * Both the built-in CSS triangle and custom icons are driven from one
   * contract: `--tv-arrow-size` is the glyph's square box, `--tv-arrow` is the
   * triangle's half-width. The size is bounded by the button's usable area, so
   * a glyph can never overflow the button — however thin the rail or however
   * large `iconSize` is. Called when the strip is built and whenever hover
   * expand changes the thickness, so the glyph tracks the button.
   */
  function applyGlyphSizing(state: AxisState, thickness: number): void {
    const size = glyphSizeFor(opts.iconSize, thickness, buttonSize(state));
    state.root.style.setProperty("--tv-arrow-size", `${size}px`);
    // Without an explicit `iconSize` the triangle keeps its historical
    // thickness-derived size, so the default look is unchanged.
    const half =
      opts.iconSize === undefined
        ? Math.max(3, Math.floor((thickness - 2) / 2))
        : Math.max(1, Math.round(size / 2));
    state.root.style.setProperty("--tv-arrow", `${half}px`);
  }

  function wireAxis(host: Host, state: AxisState) {
    const vertical = state.axis === "vertical";
    const { root, track, thumb, btnTop, btnBottom } = state;

    const onEnter = () => {
      state.hovered = true;
      applyGrow(state);
      showAxis(state);
      thumb.style.background = thumbHover();
    };
    const onLeave = () => {
      state.hovered = false;
      applyGrow(state);
      scheduleAutoHide(host);
      if (!state.dragging) {
        thumb.style.background = thumbRest();
      }
    };
    root.addEventListener("mouseenter", onEnter);
    root.addEventListener("mouseleave", onLeave);

    // ---- drag (thumb follows the pointer exactly, like native) ----------
    const onPointerDown = (e: PointerEvent) => {
      if (!opts.draggable) return;
      state.pointerId = e.pointerId;
      state.dragging = true;
      state.dragStartClient = vertical ? e.clientY : e.clientX;
      state.dragStartScroll = scrollOf(host, vertical);
      thumb.setPointerCapture(e.pointerId);
      thumb.style.background = thumbActive();
      showAxis(state);
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!state.dragging || e.pointerId !== state.pointerId) return;
      const client = clientLenOf(host, vertical);
      const btn = buttonSize(state);
      const corner = axisEndInset(host, state);
      const { start, end } = axisInsets(host, vertical);
      const effClient = Math.max(client - btn * 2 - start - end - corner, 1);
      const thumbTravel = vertical ? thumb.offsetHeight : thumb.offsetWidth;
      const usable = Math.max(effClient - thumbTravel, 1);
      const max = maxScroll(host, vertical);
      const now = vertical ? e.clientY : e.clientX;
      const delta = now - state.dragStartClient;
      const next = state.dragStartScroll + (delta / usable) * max;
      scrollTo(host, next, vertical);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== state.pointerId) return;
      state.dragging = false;
      state.pointerId = -1;
      thumb.style.background = state.hovered ? thumbHover() : thumbRest();
      try { thumb.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      scheduleAutoHide(host);
    };

    // ---- track click → jump ---------------------------------------------
    const onTrackPointerDown = (e: PointerEvent) => {
      if (state.dragging || !opts.clickToJump || e.target === thumb) return;
      const client = clientLenOf(host, vertical);
      const btn = buttonSize(state);
      const corner = axisEndInset(host, state);
      const { start, end } = axisInsets(host, vertical);
      const effClient = Math.max(client - btn * 2 - start - end - corner, 1);
      const thumbTravel = vertical ? thumb.offsetHeight : thumb.offsetWidth;
      const usable = Math.max(effClient - thumbTravel, 1);
      const max = maxScroll(host, vertical);
      const rect = hostRect(host);
      const pos = (vertical ? e.clientY - rect.top : e.clientX - rect.left) - btn - start;
      if (pos < thumbTravel / 2) {
        scrollTo(host, 0, vertical, true);
      } else {
        const ratio = clamp((pos - thumbTravel) / usable, 0, 1);
        scrollTo(host, ratio * max, vertical, true);
      }
      showAxis(state);
    };

    // ---- arrow buttons: one rAF-driven content-scroll controller --------
    // A tap glides one step; press-and-hold glides continuously. Both share a
    // SINGLE frame loop per axis, so extra clicks retarget the same movement
    // (no queue, no lost increments) and a direction change reverses without a
    // jump. This moves the CONTENT only — it never touches the rail's own
    // visuals (`opts.smooth` still governs the thumb's eased travel). Native
    // `scrollTo({ behavior: "smooth" })` is deliberately not called per step:
    // repeated calls interrupt one another and make the content stutter.
    let arrowRaf = 0;
    let arrowLastTs = 0;
    let arrowDir: 0 | 1 | -1 = 0; // held direction; 0 = a discrete move
    let arrowTarget = 0; // eased destination for a discrete move
    let arrowSpeed = 0; // px per ms while held
    let arrowHoldTimer: ReturnType<typeof setTimeout> | null = null;

    const arrowStep = () => Math.max(ARROW_MIN_STEP, clientLenOf(host, vertical) * 0.05);
    const arrowPosition = () => scrollOf(host, vertical);

    function arrowClearHoldTimer() {
      if (arrowHoldTimer) {
        clearTimeout(arrowHoldTimer);
        arrowHoldTimer = null;
      }
    }

    function arrowStopLoop() {
      if (arrowRaf) {
        cancelAnimationFrame(arrowRaf);
        arrowRaf = 0;
      }
      arrowLastTs = 0;
    }

    function arrowTick(ts: number) {
      arrowRaf = 0;
      if (destroyed) return;
      const dt = arrowLastTs ? Math.min(ts - arrowLastTs, 50) : FRAME_MS;
      arrowLastTs = ts;
      const cur = arrowPosition();
      let next: number;
      if (arrowDir !== 0) {
        // Held: constant velocity from wherever the content actually is.
        next = clamp(cur + arrowDir * arrowSpeed * dt, 0, maxScroll(host, vertical));
      } else if (Math.abs(arrowTarget - cur) < ARROW_SETTLE_PX) {
        // Discrete move: land exactly on the target rather than creeping up on
        // it (an eased approach never quite arrives on its own).
        next = arrowTarget;
      } else {
        // Discrete move: eased toward the pending target, so extra taps add up
        // instead of restarting the animation.
        const k = reduced() ? 1 : 1 - Math.exp(-dt / ARROW_EASE_MS);
        next = cur + (arrowTarget - cur) * k;
      }
      if (Math.abs(next - cur) > 1e-6) {
        scrollTo(host, next, vertical);
        showAxis(state);
        arrowRaf = requestAnimationFrame(arrowTick);
        return;
      }
      // Nothing left to do — settled, or pinned at a boundary where the content
      // cannot move. Stop the loop; never spin against the edge.
      arrowDir = 0;
      arrowSpeed = 0;
      arrowTarget = cur;
      arrowLastTs = 0;
      scheduleAutoHide(host);
    }

    function arrowStartLoop() {
      if (arrowRaf || destroyed) return;
      arrowLastTs = 0;
      arrowRaf = requestAnimationFrame(arrowTick);
    }

    /** Move one step, retargeting an in-flight move so rapid taps accumulate. */
    function arrowStepOnce(dir: 1 | -1) {
      const base = arrowRaf && arrowDir === 0 ? arrowTarget : arrowPosition();
      arrowDir = 0;
      arrowSpeed = 0;
      arrowTarget = clamp(base + dir * arrowStep(), 0, maxScroll(host, vertical));
      showAxis(state);
      arrowStartLoop();
    }

    /** Glide continuously while held, starting from the current position. */
    function arrowBeginHold(dir: 1 | -1) {
      arrowDir = dir;
      arrowSpeed = arrowStep() / ARROW_HOLD_STEP_MS;
      arrowTarget = arrowPosition();
      showAxis(state);
      arrowStartLoop();
    }

    /** Press: one intentional step now, then keep scrolling while held. */
    function arrowPress(dir: 1 | -1) {
      arrowStepOnce(dir);
      arrowClearHoldTimer();
      arrowHoldTimer = setTimeout(() => {
        arrowHoldTimer = null;
        arrowBeginHold(dir);
      }, ARROW_HOLD_DELAY_MS);
    }

    /** Release: stop a held glide promptly; let a tap's short step finish. */
    function arrowRelease() {
      arrowClearHoldTimer();
      if (arrowDir !== 0) {
        arrowDir = 0;
        arrowSpeed = 0;
        arrowTarget = arrowPosition();
        arrowStopLoop();
        scheduleAutoHide(host);
      }
    }

    /** Hard stop (other input, teardown): drop any pending move too. */
    function arrowCancel() {
      arrowClearHoldTimer();
      arrowDir = 0;
      arrowSpeed = 0;
      arrowStopLoop();
      arrowTarget = arrowPosition();
      scheduleAutoHide(host);
    }

    const onArrowDown = (btn: HTMLDivElement, dir: 1 | -1) => (e: PointerEvent) => {
      e.preventDefault();
      // Capture so the hold continues while the pointer is down, even if it
      // moves off the button — and a release anywhere still stops it.
      try { btn.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      arrowPress(dir);
    };
    const onBtnTopDown = onArrowDown(btnTop, -1);
    const onBtnBottomDown = onArrowDown(btnBottom, 1);
    btnTop.addEventListener("pointerdown", onBtnTopDown);
    btnBottom.addEventListener("pointerdown", onBtnBottomDown);
    for (const btn of [btnTop, btnBottom]) {
      btn.addEventListener("pointerup", arrowRelease);
      btn.addEventListener("pointercancel", arrowCancel);
      btn.addEventListener("lostpointercapture", arrowCancel);
    }

    // The user's own scrolling wins: a wheel or touch gesture cancels an
    // in-flight arrow move so the two never fight.
    const arrowInterrupt = () => arrowCancel();
    const interruptTarget: EventTarget = host.isRoot ? window : host.target;
    interruptTarget.addEventListener("wheel", arrowInterrupt, { passive: true });
    interruptTarget.addEventListener("touchstart", arrowInterrupt, { passive: true });

    thumb.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    track.addEventListener("pointerdown", onTrackPointerDown);

    state.__cleanup = () => {
      root.removeEventListener("mouseenter", onEnter);
      root.removeEventListener("mouseleave", onLeave);
      thumb.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      track.removeEventListener("pointerdown", onTrackPointerDown);
      btnTop.removeEventListener("pointerdown", onBtnTopDown);
      btnBottom.removeEventListener("pointerdown", onBtnBottomDown);
      for (const btn of [btnTop, btnBottom]) {
        btn.removeEventListener("pointerup", arrowRelease);
        btn.removeEventListener("pointercancel", arrowCancel);
        btn.removeEventListener("lostpointercapture", arrowCancel);
      }
      interruptTarget.removeEventListener("wheel", arrowInterrupt);
      interruptTarget.removeEventListener("touchstart", arrowInterrupt);
      // Cancel without scheduling an auto-hide on a host that is going away.
      arrowClearHoldTimer();
      arrowDir = 0;
      arrowSpeed = 0;
      arrowStopLoop();
      if (state.__hideTimer) clearTimeout(state.__hideTimer);
    };
  }

  // ---- visibility / auto-hide ------------------------------------------
  function applyGrow(state: AxisState) {
    const vertical = state.axis === "vertical";
    const size = state.hovered && opts.hoverExpand ? opts.hoverThickness : opts.thickness;
    const cross = stripCrossSize(opts, size);
    if (vertical) state.root.style.width = `${cross}px`;
    else state.root.style.height = `${cross}px`;
    // The glyph tracks the button it sits in, so a grown rail gets a grown
    // (still clamped) glyph.
    applyGlyphSizing(state, size);
  }

  function showAxis(state: AxisState) {
    state.shown = true;
    writeShownOpacity(state);
  }
  function showHost(host: Host) {
    if (host.vertical) showAxis(host.vertical);
    if (host.horizontal) showAxis(host.horizontal);
  }
  /** Reveal only the document scrollbar. Skipped while the page is
   *  scroll-locked (modal/menu open) so an idle root strip never appears over
   *  the fixed overlay — even on the boot reveal. */
  function revealDoc() {
    if (documentCanScroll()) {
      showHost(rootHost);
      scheduleAutoHide(rootHost);
    }
  }
  function writeShownOpacity(state: AxisState) {
    state.thumb.style.opacity = String(opts.thumbOpacity);
    state.track.style.opacity = String(opts.trackOpacity);
    state.btnTop.style.opacity = String(Math.min(1, opts.thumbOpacity));
    state.btnBottom.style.opacity = String(Math.min(1, opts.thumbOpacity));
  }
  /** Apply whichever opacity the strip currently *should* have. Used to pick
   *  up a freshly-displayed strip on the frame after it was primed at 0. */
  function applyCurrentOpacity(state: AxisState) {
    if (state.shown) writeShownOpacity(state);
    else setIdle(state);
  }
  /** Idle (autoHide): the scrollbar fades out completely — invisible while not
   *  scrolling, reappears the moment scrolling starts. */
  function setIdle(state: AxisState | null) {
    if (!state) return;
    state.thumb.style.opacity = "0";
    state.track.style.opacity = "0";
    state.btnTop.style.opacity = "0";
    state.btnBottom.style.opacity = "0";
  }
  function setIdleAll(host: Host) {
    setIdle(host.vertical);
    setIdle(host.horizontal);
  }

  /** Bring a strip back from `display:none`. A display toggle can't transition
   *  on its own, so prime the strip at opacity 0 and ease to its current
   *  shown/idle target on the next frame — no more flash-in. Callers that want
   *  it visible class it shown through `showAxis`, which is then applied by the
   *  deferred `applyCurrentOpacity`. */
  function revealStrip(state: AxisState) {
    if (state.__displayed) return;
    state.__displayed = true;
    if (state.__hideTimer) {
      clearTimeout(state.__hideTimer);
      state.__hideTimer = undefined;
    }
    state.root.style.display = "";
    setIdle(state);
    requestAnimationFrame(() => {
      if (destroyed || !state.__displayed) return;
      applyCurrentOpacity(state);
    });
  }

  /** Fade a strip out, then take it out of the layout only after the fade
   *  completes — mirroring how native overlay scrollbars dissolve instead of
   *  vanishing. Idempotent: only the first call arms the `display:none` timer. */
  function concealStrip(state: AxisState) {
    if (!state.__displayed) return;
    state.__displayed = false;
    setIdle(state);
    if (state.__hideTimer) clearTimeout(state.__hideTimer);
    state.__hideTimer = setTimeout(() => {
      if (!destroyed && !state.__displayed) state.root.style.display = "none";
    }, opts.duration + 120);
  }
function concealStripImmediate(state: AxisState) {
     if (!state.__displayed) return;
     state.__displayed = false;
     setIdle(state);
     if (state.__hideTimer) clearTimeout(state.__hideTimer);
     // Hide immediately without fade-out delay
     if (!destroyed && !state.__displayed) state.root.style.display = "none";
   }
  function scheduleAutoHide(host: Host) {
    if (!opts.autoHide) return;
    if (host.hideTimer) clearTimeout(host.hideTimer);
     host.hideTimer = setTimeout(() => {
      if (!host.vertical?.dragging && !host.vertical?.hovered) setIdle(host.vertical);
      if (!host.horizontal?.dragging && !host.horizontal?.hovered) setIdle(host.horizontal);
    }, opts.autoHideDelay);
  }

  // ---- scrollable discovery --------------------------------------------
  /** Resolved overflow style verdict (does this element *permit* scrolling?).
   *  This is the expensive `getComputedStyle` call and the only thing that
   *  needs caching. The content-size comparison is re-read live by
   *  `scrollableVia` so overlay discovery never goes stale after navigation. */
  function overflowStyleOf(el: HTMLElement): { v: boolean; h: boolean } {
    let style = scrollableCache.get(el);
    if (!style) {
      let ov = "visible";
      let ox = "visible";
      try {
        const cs = getComputedStyle(el);
        ov = cs.overflowY;
        ox = cs.overflowX;
      } catch { /* ignore */ }
      style = {
        v: ov === "auto" || ov === "scroll" || ov === "overlay",
        h: ox === "auto" || ox === "scroll" || ox === "overlay",
      };
      scrollableCache.set(el, style);
    }
    return style;
  }

  function scrollableVia(el: HTMLElement): { v: boolean; h: boolean } {
    const style = overflowStyleOf(el);
    return {
      v: style.v && el.scrollHeight > el.clientHeight + 1,
      h: style.h && el.scrollWidth > el.clientWidth + 1,
    };
  }

  function isExcluded(el: HTMLElement): boolean {
    if (opts.exclude.length === 0) return false;
    return opts.exclude.some((sel) => {
      try { return el.matches(sel); } catch { return false; }
    });
  }

  // Collect every scrollable element the overlay should cover.
  //  - If `include` selectors are given, only those elements are tracked.
  //  - Otherwise *every* scrollable on the page is tracked (so the overlay
  //    appears wherever a native scrollbar would), minus `exclude` targets.
  // The full walk is gated behind `needsRescan` (mutation/load/update) so the
  // per-frame `syncHosts` call stays cheap even on large documents.
  function collectScrollables(): HTMLElement[] {
    const result: HTMLElement[] = [];
    const push = (el: HTMLElement) => {
      if (isRootCandidate(el)) return;
      if (isExcluded(el)) return;
      if (el.closest("[data-themvora-host]")) return;
      if (scrollableVia(el).v || scrollableVia(el).h) result.push(el);
    };
    if (opts.include.length > 0) {
      for (const sel of opts.include) {
        try {
          for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) push(el);
        } catch { /* invalid selector */ }
      }
      return result;
    }
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) push(el);
    return result;
  }

  function makeHost(el: HTMLElement, isRoot: boolean): Host {
    const host: Host = { target: el, isRoot, vertical: null, horizontal: null, ro: null, hideTimer: null };
    if (opts.axes.includes("vertical")) host.vertical = createAxis(host, "vertical");
    if (opts.axes.includes("horizontal")) host.horizontal = createAxis(host, "horizontal");
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => requestRender());
      ro.observe(el);
      host.ro = ro;
    }
    // The native scrollbar's gutter is kept (painted invisible) by the
    // pre-paint CSS, so the content already clears the rail without any layout
    // change — no padding is written and nothing reflows on load.
    if (!isRoot) el.setAttribute("data-themvora-scrollbar", "overlay");
    // Hovering the container itself reveals its scrollbar (e.g. a code block) —
    // you don't have to find the strip first. Only for inner containers: the
    // document scrollbar is revealed on scroll activity / on boot.
    if (!isRoot) {
      const onHoverEnter = () => { showHost(host); scheduleAutoHide(host); };
      const onHoverLeave = () => { if (opts.autoHide) setIdleAll(host); };
      el.addEventListener("mouseenter", onHoverEnter);
      el.addEventListener("mouseleave", onHoverLeave);
      host.targetCleanup = () => {
        el.removeEventListener("mouseenter", onHoverEnter);
        el.removeEventListener("mouseleave", onHoverLeave);
      };
    }
    return host;
  }

  function destroyHost(host: Host, el: HTMLElement) {
    host.vertical?.__cleanup?.();
    host.horizontal?.__cleanup?.();
    if (host.vertical?.__hideTimer) clearTimeout(host.vertical.__hideTimer);
    if (host.horizontal?.__hideTimer) clearTimeout(host.horizontal.__hideTimer);
    host.vertical?.root.remove();
    host.horizontal?.root.remove();
    host.ro?.disconnect();
    if (host.hideTimer) clearTimeout(host.hideTimer);
    host.targetCleanup?.();
    if (!host.isRoot) el.removeAttribute("data-themvora-scrollbar");
    hosts.delete(el);
  }

  function syncHosts() {
    // Only re-walk the DOM when a mutation/load/update invalidated the scan.
    if (needsRescan) {
      const desired = new Set<HTMLElement>(collectScrollables());
      for (const [el, host] of [...hosts.entries()]) {
        if (isRootCandidate(el)) continue;
        // Destroy hosts only when the element is actually gone from the DOM or
        // has stopped being scrollable BY STYLE (overflow flipped to
        // visible/hidden). Content-size alone is deliberately NOT grounds for
        // destruction: during a navigation a container's content can be
        // momentarily short (fonts/images loading), and destroying its host
        // then would leave the overlay missing until the next rescan even
        // after the content grows back. `layoutAxis` already conceals the
        // strip whenever content fits, and re-reveals it live.
        if (!document.body.contains(el) || !(overflowStyleOf(el).v || overflowStyleOf(el).h)) {
          destroyHost(host, el);
        }
      }
      for (const el of desired) {
        if (isRootCandidate(el) || hosts.has(el) || !document.body.contains(el)) continue;
        hosts.set(el, makeHost(el, false));
      }
      needsRescan = false;
    }
  }

  // ---- layout + physics ------------------------------------------------
  /** Visibility verdict + effective opacity (product of the ancestor chain) for
   *  a host. Opacity is reported so the engine can detect a host *fading out*
   *  (a panel closing) and dissolve its strip in sync — native scrollbars fade
   *  with their container instead of lingering at full opacity. */
  function visibilityOf(el: HTMLElement): { visible: boolean; opacity: number } {
    let node: HTMLElement | null = el;
    let opacity = 1;
    while (node && node.nodeType === 1) {
      try {
        const cs = getComputedStyle(node);
        if (cs.visibility === "hidden" || cs.visibility === "collapse") {
          return { visible: false, opacity };
        }
        if (cs.display === "none") {
          return { visible: false, opacity };
        }
        const op = parseFloat(cs.opacity);
        if (!isNaN(op)) {
          opacity *= op;
          if (opacity === 0) return { visible: false, opacity };
        }
      } catch {
        return { visible: false, opacity };
      }
      if (node === docEl) break;
      node = node.parentElement;
    }
    return { visible: true, opacity };
  }

  /** Snapshot the strip's fixed-placement geometry and report whether it moved
   *  vs. the previous frame. A non-finite / NaN reading is treated as "moved"
   *  so the loop keeps retrying rather than going stale. */
  function commitGeometry(
    state: AxisState,
    next: { display: string; left: number; top: number; width: number; height: number },
  ): boolean {
    const prev = state.lastGeometry;
    const changed =
      !prev ||
      prev.display !== next.display ||
      Math.abs(prev.left - next.left) > 0.5 ||
      Math.abs(prev.top - next.top) > 0.5 ||
      Math.abs(prev.width - next.width) > 0.5 ||
      Math.abs(prev.height - next.height) > 0.5;
    state.lastGeometry = next;
    return changed;
  }

  /** Position + size the strip and return `true` when its footprint changed —
   *  lets the render loop stay alive mid-transform/animation and keeps the bar
   *  visually attached to the host (like a native scrollbar), even when no
   *  scroll/resize/mutation event fires. */
  function layoutAxis(host: Host, state: AxisState): boolean {
    const vertical = state.axis === "vertical";
    const rect = hostRect(host);
    const client = clientLenOf(host, vertical);
    const content = vertical ? contentLenOf(host) : contentWidthOf(host);

    const nextGeometry: { display: string; left: number; top: number; width: number; height: number } = {
      display: "",
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };

    // The document scrollbar is the *only* strip tied to the page scroller.
    // When the page is scroll-locked behind a modal / mobile menu, the strip
    // must disappear (it would otherwise float over the fixed overlay and
    // render a second, translucent scrollbar stacked on the menu's own strip).
    if (host.isRoot && !documentCanScroll()) {
      concealStripImmediate(state);
      nextGeometry.display = "none";
      return commitGeometry(state, nextGeometry);
    }

    // Track hidden → visible transitions (a mobile menu / dialog opening) so
    // the strip shows the moment scrollable content is on screen — never
    // "late". The very first layout only *records* visibility — booting with
    // a page full of visible scrollables must not flash a stack of strips.
    let justRevealed = false;
    if (!host.isRoot) {
      const vis = visibilityOf(host.target);
      if (host.prevVisible === undefined) {
        host.prevVisible = vis.visible;
      } else if (!host.prevVisible && vis.visible) {
        host.prevVisible = true;
        justRevealed = true;
      } else {
        host.prevVisible = vis.visible;
      }
      // A host that just became invisible (or flipped its overflow to hidden)
      // must drop its strip *now* — no lingering fade. The fade-out path below
      // only handles the in-progress opacity transition.
      if (
        !vis.visible ||
        getComputedStyle(host.target).overflowY === "hidden" ||
        getComputedStyle(host.target).overflowX === "hidden"
      ) {
        concealStripImmediate(state);
        nextGeometry.display = "none";
        return commitGeometry(state, nextGeometry);
      }
      // Host is fading OUT (e.g. a modal/panel closing): its `visibility` and
      // `display` stay intact until the opacity transition completes, but a
      // fully-opaque strip lingering next to a dissolving container reads as a
      // UI mis-lead. Dissolve the strip in sync (same `opts.duration` fade).
      if (
        host.prevOpacity !== undefined &&
        vis.opacity < host.prevOpacity - 0.005
      ) {
        concealStrip(state);
        nextGeometry.display = "none";
        return commitGeometry(state, nextGeometry);
      }
      host.prevOpacity = vis.opacity;
    }

    if (content <= client + 1) {
      concealStripImmediate(state);
      nextGeometry.display = "none";
      return commitGeometry(state, nextGeometry);
    }

    // Display the strip (fade in from transparent on the next frame) before
    // any target opacity is applied, so shows are smooth like native bars.
    revealStrip(state);
    if (justRevealed) {
      // Class the axes as shown; `revealStrip`'s deferred *applyCurrentOpacity*
      // picks this up and eases the strip in — instead of flashing it on.
      if (host.vertical) host.vertical.shown = true;
      if (host.horizontal) host.horizontal.shown = true;
      scheduleAutoHide(host);
    }

    const thickness = opts.hoverExpand && state.hovered ? opts.hoverThickness : opts.thickness;
    const btn = buttonSize(state);

    if (vertical) {
      const corner = axisEndInset(host, state);
      const cross = stripCrossSize(opts, thickness);
      const ins = insetsFor(host);
      const side = railSideFor(host);
      // The strip's footprint is the visible thickness PLUS the transparent
      // content-side gap, held `offset` from the rail's edge (inline-end: right
      // in LTR, left in RTL). The painted track lands inside the container and a
      // transparent band separates it from the content; the top/bottom ends keep
      // their own insets.
      const railInset = side === "left" ? ins.left : ins.right;
      const stripLeft =
        side === "left"
          ? rect.left + railInset
          : rect.left + rect.width - railInset - cross;
      const stripTop = rect.top + ins.top;
      const stripHeight = Math.max(rect.height - ins.top - ins.bottom - corner, 0);
      state.root.style.top = `${stripTop}px`;
      state.root.style.left = `${stripLeft}px`;
      state.root.style.height = `${stripHeight}px`;
      state.btnTop.style.width = `${thickness}px`;
      state.btnTop.style.height = `${btn}px`;
      state.btnBottom.style.width = `${thickness}px`;
      state.btnBottom.style.height = `${btn}px`;
      applyHostClip(host, state, rect, stripLeft, stripTop, cross, stripHeight);
      nextGeometry.left = stripLeft;
      nextGeometry.top = stripTop;
      nextGeometry.width = cross;
      nextGeometry.height = stripHeight;
    } else {
      const corner = axisEndInset(host, state);
      const cross = stripCrossSize(opts, thickness);
      const ins = insetsFor(host);
      const rootWidth =
        host.isRoot && typeof document !== "undefined"
          ? document.documentElement.clientWidth
          : rect.width;
      // Only shave the native gutter when it's actually visible. When the
      // native scrollbar is hidden (this overlay's own pre-paint CSS sets
      // `scrollbar-width: none`), the gutter collapses and
      // `offsetWidth - clientWidth` is 0 — but some browsers reserve it anyway
      // via `scrollbar-gutter: stable`, leaving a phantom gutter here. That
      // used to push the strip (and its right arrow) short of the container's
      // right edge, which reads as the scrollbar "leaking" out of its box.
      const scrollbarV = host.isRoot
        ? 0
        : nativeScrollbarHidden(host.target)
          ? 0
          : host.target.offsetWidth - host.target.clientWidth;
      // The strip spans the container width (minus the left/right insets) like
      // the vertical strip spans the height; the arrow buttons are inset at the
      // ends and the thumb travels between them. When the vertical strip is
      // active it owns its edge, so the strip stops `corner` short of that end.
      // Its height is the visible thickness plus the transparent content-side
      // gap, held `bottom` inset above the bottom edge.
      const stripLeft = rect.left + ins.left;
      const stripTop = rect.top + rect.height - ins.bottom - cross;
      const stripWidth = Math.max(rootWidth - scrollbarV - ins.left - ins.right - corner, 0);
      state.root.style.left = `${stripLeft}px`;
      state.root.style.top = `${stripTop}px`;
      state.root.style.width = `${stripWidth}px`;
      state.btnTop.style.height = `${thickness}px`;
      state.btnTop.style.width = `${btn}px`;
      state.btnBottom.style.height = `${thickness}px`;
      state.btnBottom.style.width = `${btn}px`;
      applyHostClip(host, state, rect, stripLeft, stripTop, stripWidth, cross);
      nextGeometry.left = stripLeft;
      nextGeometry.top = stripTop;
      nextGeometry.width = stripWidth;
      nextGeometry.height = cross;
    }

    const max = maxScroll(host, vertical);
    const scrollPos = scrollOf(host, vertical);

    // Effective travel area sits between the two arrow buttons (and stops
    // short of the perpendicular strip's corner so the thumb never bleeds
    // past the visual strip).
    const corner = axisEndInset(host, state);
    const { start, end } = axisInsets(host, vertical);
    const effClient = Math.max(client - btn * 2 - start - end - corner, 1);
    // The thumb must never exceed the travel area between the arrows. When
    // content overflows by only a few pixels, `client²/content` already
    // approaches the full client width — wider than `effClient` — and the
    // un-clamped thumb poked out past the right arrow (and the container's
    // right edge), looking like the scrollbar leaks out of its box.
    const baseSize = Math.min(
      // The public helper clamps to `clientLen - offset·2`; passing the mean of
      // the two end insets keeps that clamp equal to `clientLen - (start + end)`.
      computeThumbSize(client, content, opts.minThumbSize, (start + end) / 2),
      effClient,
    );
    const factor = overscrollFactor(scrollPos, max, client, opts.overscroll);
    const drawSize = Math.max(Math.round(baseSize * factor), Math.min(opts.minThumbSize, effClient));
    const maxTranslate = Math.max(effClient - baseSize, 0);
    // Clamp so rubber-band overscroll (scrollPos beyond 0..max) never pushes
    // the thumb past the track ends — the overscroll factor already hints at
    // the boundary by compressing the thumb size.
    const targetTranslate =
      client > 0 && max > 0
        ? clamp((scrollPos / max) * maxTranslate, 0, maxTranslate)
        : 0;

    const render = state.render;
    // Snapshot the previous rendered thumb state so we can detect changes that
    // the strip *rectangle* alone won't reveal. When animated content grows or
    // shrinks (token-tree expand/collapse, CSS height/width transitions) the
    // strip's fixed position stays the same, but the thumb size/position change
    // on every frame. Reporting that here keeps the render loop alive so the
    // thumb tracks the animation frame-by-frame — exactly like a native
    // scrollbar instead of snapping after the animation settles.
    const prevSize = render.size;
    const prevDraw = render.drawSize;
    const prevTarget = render.targetTranslate;
    render.size = baseSize;
    render.drawSize = drawSize;
    render.targetTranslate = targetTranslate;

    if (vertical) {
      state.thumb.style.top = `${btn}px`;
      state.thumb.style.height = `${Math.round(drawSize)}px`;
    } else {
      state.thumb.style.left = `${btn}px`;
      state.thumb.style.width = `${Math.round(drawSize)}px`;
    }

    const geomChanged = commitGeometry(state, nextGeometry);
    const thumbChanged =
      Math.abs(prevSize - baseSize) > 0.5 ||
      Math.abs(prevDraw - drawSize) > 0.5 ||
      Math.abs(prevTarget - targetTranslate) > 0.5;

    return geomChanged || thumbChanged;
  }

  function applyTransform(state: AxisState, value: number) {
    const vertical = state.axis === "vertical";
    const sign = !vertical && opts.dir === "rtl" ? -1 : 1;
    const v = (value * sign).toFixed(2);
    state.thumb.style.transform = vertical
      ? `translate3d(0, ${v}px, 0)`
      : `translate3d(${v}px, 0, 0)`;
  }

  let rafId: number | null = null;
  let lastTs = 0;

  function renderFrame() {
    if (destroyed) return;
    const now = performance.now();
    const dt = lastTs ? Math.min(now - lastTs, 50) : FRAME_MS;
    lastTs = now;

    syncHosts();
    let moving = false;
    for (const host of hosts.values()) {
      if (host.vertical) moving = layoutAxis(host, host.vertical) || moving;
      if (host.horizontal) moving = layoutAxis(host, host.horizontal) || moving;
    }

    // Default (smooth:false) tracks the scroll position EXACTLY with zero
    // delay. With smooth:true, refresh-rate-independent easing applies (alpha
    // derives from the *real* frame delta); dragging always snaps 1:1.
    const ease = reduced() || !opts.smooth ? 1 : easeAlpha(opts.animationDuration, dt);
    let active = false;
    for (const host of hosts.values()) {
      for (const state of [host.vertical, host.horizontal]) {
        if (!state) continue;
        const render = state.render;
        const target = render.targetTranslate;
        if (state.dragging || ease === 1) {
          render.currentTranslate = target;
        } else if (!isSettled(render.currentTranslate, target, 0.25)) {
          render.currentTranslate = lerp(render.currentTranslate, target, ease);
          active = true;
        } else {
          render.currentTranslate = target;
        }
        applyTransform(state, render.currentTranslate);
      }
    }
    if (active || moving) requestTick();
  }

  function requestTick() {
    if (rafId != null || destroyed) return;
    rafId = requestAnimationFrame(() => {
      if (destroyed) { rafId = null; return; }
      rafId = null;
      renderFrame();
    });
  }
  function requestRender() {
    if (destroyed) return;
    requestTick();
  }

   // ---- boot ------------------------------------------------------------
   const rootHost: Host = makeHost(scrollingEl, true);
   hosts.set(scrollingEl, rootHost);

   const controls = observeScrollbarSizing(
     (el) => hosts.has(el),
     {
       onTargetActivity(target) {
         const host = hosts.get(target);
         // Reveal only the scrollbar the user is actually interacting with —
         // scrolling/hovering one scrollable must not surface every other
         // overlay on the page. Each host has its own auto-hide timer, so the
         // revealed scrollbar fades out independently after `autoHideDelay`.
if (host) {
            showHost(host);
            scheduleAutoHide(host);
          } else {
            revealDoc();
          }
        },
       onGlobalActivity() {
         // Global activity = document-level scroll (wheel on non-hosted content).
         // Reveal only the document scrollbar, not every inner overlay.
         revealDoc();
       },
       onResize() {
         requestRender();
       },
        onMutate(records) {
          // Invalidate the cached overflow *style* for every element whose
          // class/style/dir changed (attribute mutations) so an `overflow`
          // toggle (e.g. a menu class flipping `overflow-y-auto`) takes effect
          // immediately. Content-size changes need no invalidation — the
          // `scrollHeight`/`clientHeight` comparison is re-read on every scan.
          for (const record of records) {
            if (record.type === "attributes" && record.target instanceof HTMLElement) {
              scrollableCache.delete(record.target);
            }
          }
          needsRescan = true;
          requestRender();
        },
        onOpacityTransition(el) {
          // The element started an `opacity` transition — it is a host, or an
          // ancestor of a host (a panel/modal closing). Fade the affected
          // strip(s) in sync, right when the transition starts, instead of
          // letting a fully-opaque scrollbar linger next to a dissolving
          // container until the opacity reaches 0. `concealStrip` is
          // idempotent and a no-op while the strip is already hidden, so a
          // fade-IN transition never suppresses a strip.
          for (const [target, host] of hosts.entries()) {
            if (host.isRoot) continue;
            if (el === target || el.contains(target)) {
              if (host.vertical) concealStrip(host.vertical);
              if (host.horizontal) concealStrip(host.horizontal);
            }
          }
        },
      },
   );

   // Periodic full re-scan: catches containers that became (or stopped being)
   // scrollable purely from content growth, which mutations alone can't see.
   const rescanTimer = setInterval(() => {
     if (destroyed) return;
     scrollableCache = new WeakMap();
     needsRescan = true;
     requestRender();
   }, 4000);

   // Also rescan on viewport resize — responsive layout changes (e.g.
   // mobile menu appearing) can create new scrollables that the MutationObserver
   // won't catch because CSS media queries don't mutate DOM attributes.
   const onResizeRescan = () => {
     scrollableCache = new WeakMap();
     needsRescan = true;
     requestRender();
   };
   window.addEventListener("resize", onResizeRescan, { passive: true });

   requestRender();
   setTimeout(() => {
     if (destroyed) return;
     // Phase 3 — ready: the overlay has been painted once. This always happens
     // (it enables the CSS fade-in that turns .tv-scrollbar from opacity:0 to 1),
     // regardless of `autoHide` — otherwise an `autoHide: false` config leaves
     // the strips stuck at opacity:0 and nothing ever paints.
     docEl.classList.add("tv-scrollbar-ready");
     if (opts.autoHide) {
       // Reveal only the document scrollbar on first paint — inner scrollables
       // fade in independently the moment the user scrolls/hovers them, so a
       // page full of code blocks doesn't flash a stack of overlays on load.
       revealDoc();
     } else {
       // autoHide off → permanently visible: reveal every tracked scrollbar
       // (document + inner) and never schedule an idle fade.
       for (const h of hosts.values()) showHost(h);
     }
   }, 80);

  return {
    update() {
      scrollableCache = new WeakMap();
      needsRescan = true;
      requestRender();
    },
    destroy() {
      destroyed = true;
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
      clearInterval(rescanTimer);
      window.removeEventListener("resize", onResizeRescan);
      controls.dispose();
      storeUnsubscribe();
      for (const [el, host] of [...hosts.entries()]) destroyHost(host, el);
      hosts.clear();
    },
  };
}

/** Alias landing in the public API. */
export function createThemeScrollbar(
  store: ThemeStore,
  options: OverlayScrollbarOptions = {},
): OverlayScrollbarHandle | null {
  return createOverlayScrollbar(store, options);
}


