/**
 * Grouped scrollbar configuration — one canonical shape shared by every
 * framework adapter.
 *
 * The adapters (React, Vue, Svelte, Solid, Angular, Web Components, …) render
 * framework-owned arrow content, but the *options* are plain data. Resolving
 * them in one place keeps the groups, defaults and precedence identical
 * everywhere instead of each adapter re-implementing the merge.
 *
 * Precedence: a flat option always wins over the same key inside a group. That
 * is the rule React's `ThemeScrollbar` has always used for its flat aliases, so
 * keeping it here lets the flat names stay as deprecated compatibility inputs
 * without changing behaviour.
 */

import type { OverlayScrollbarOptions, ScrollbarAxis } from "./types";

/** How the overlay scrolls and hides. */
export interface ScrollbarBehaviorOptions {
  autoHide?: boolean;
  autoHideDelay?: number;
  hoverExpand?: boolean;
  draggable?: boolean;
  clickToJump?: boolean;
  smooth?: boolean;
  overscroll?: boolean;
  axes?: ScrollbarAxis[];
  touch?: boolean;
  dir?: "ltr" | "rtl" | "auto";
}

/** The look and size of every rail. */
export interface ScrollbarAppearanceOptions {
  arrows?: boolean;
  thickness?: number;
  hoverThickness?: number;
  radius?: number;
  minThumbSize?: number;
  /** Arrow glyph size, in CSS px (see {@link OverlayScrollbarOptions.iconSize}).
   *  Adapters surface this as `icons.size`. */
  iconSize?: number;
  /** Edge clearance between a rail and its container, in px — one number for
   *  every side, or per-side values. `0` means flush against the edge and is
   *  honoured on every host, the page scrollbar included (see
   *  {@link OverlayScrollbarOptions.offset}). */
  offset?: OverlayScrollbarOptions["offset"];
  trackOpacity?: number;
  thumbOpacity?: number;
  zIndex?: number;
  duration?: number;
  animationDuration?: number;
  thumbColor?: string;
  trackColor?: string;
  activeThumbColor?: string;
  thumbHoverColor?: string;
}

/**
 * Which containers the overlay tracks. Scope decides *where* the scrollbar
 * appears, not how it looks — so it is its own group rather than part of
 * `appearance`.
 */
export interface ScrollbarScopeOptions {
  /** Track only these containers (the document is always tracked). */
  include?: string[] | null;
  /** Skip these containers when tracking. An excluded container also loses the
   *  scrollbar gutter the pre-paint CSS would reserve for it, so it does not
   *  keep an empty strip where a bar would have been. It still scrolls
   *  normally; it just has no bar of ours. */
  exclude?: string[] | null;
}

/** The grouped form accepted by every adapter. Each group is optional and may
 *  be passed explicitly as `undefined`, so adapters can forward their raw props
 *  without stripping keys first. */
export interface ScrollbarGroupedOptions {
  behavior?: ScrollbarBehaviorOptions | undefined;
  appearance?: ScrollbarAppearanceOptions | undefined;
  scope?: ScrollbarScopeOptions | undefined;
}

/**
 * Flat options as the adapters forward them.
 *
 * Every key is optional AND may be explicitly `undefined` (adapters pass their
 * raw props straight through), so `exactOptionalPropertyTypes` does not force
 * every call site to strip undefined keys by hand.
 */
export type ScrollbarFlatOptions = {
  [K in keyof OverlayScrollbarOptions]?: OverlayScrollbarOptions[K] | undefined;
};

/**
 * Arrow icon content for the `icons` group. `arrow` covers every direction;
 * the per-direction entries override it; `size` is the shared glyph size in
 * CSS px. `T` is the adapter's native icon value (an HTML/node icon for the
 * string-based adapters, framework nodes for React and friends).
 */
export interface ScrollbarIconOptions<T> {
  arrow?: T;
  up?: T;
  down?: T;
  left?: T;
  right?: T;
  size?: number;
}

/**
 * Map an `icons` group onto the engine's flat icon options, so every adapter
 * resolves the group the same way. Only defined entries are copied.
 *
 * @param icons - The `icons` group (or `undefined`).
 * @returns Flat `arrowIcon` / `arrow*Icon` / `iconSize` values.
 */
export function resolveIconOptions<T>(icons?: ScrollbarIconOptions<T>): OverlayScrollbarOptions {
  const out: Record<string, unknown> = {};
  if (!icons) return out as OverlayScrollbarOptions;
  const assign = <K extends keyof OverlayScrollbarOptions>(
    key: K,
    value: OverlayScrollbarOptions[K] | undefined,
  ) => {
    if (value !== undefined) out[key] = value;
  };
  assign("arrowIcon", icons.arrow as OverlayScrollbarOptions["arrowIcon"]);
  assign("arrowUpIcon", icons.up as OverlayScrollbarOptions["arrowUpIcon"]);
  assign("arrowDownIcon", icons.down as OverlayScrollbarOptions["arrowDownIcon"]);
  assign("arrowLeftIcon", icons.left as OverlayScrollbarOptions["arrowLeftIcon"]);
  assign("arrowRightIcon", icons.right as OverlayScrollbarOptions["arrowRightIcon"]);
  assign("iconSize", icons.size);
  return out as OverlayScrollbarOptions;
}

/** The grouped group a key belongs to (used by the resolver only). */
const BEHAVIOR_KEYS: ReadonlyArray<keyof ScrollbarBehaviorOptions> = [
  "autoHide",
  "autoHideDelay",
  "hoverExpand",
  "draggable",
  "clickToJump",
  "smooth",
  "overscroll",
  "axes",
  "touch",
  "dir",
];

const APPEARANCE_KEYS: ReadonlyArray<keyof ScrollbarAppearanceOptions> = [
  "arrows",
  "thickness",
  "hoverThickness",
  "radius",
  "minThumbSize",
  "iconSize",
  "offset",
  "trackOpacity",
  "thumbOpacity",
  "zIndex",
  "duration",
  "animationDuration",
  "thumbColor",
  "trackColor",
  "activeThumbColor",
  "thumbHoverColor",
];

const SCOPE_KEYS: ReadonlyArray<keyof ScrollbarScopeOptions> = ["include", "exclude"];

/** Structural keys that are never engine options, so a flat input that happens
 *  to carry the groups (an adapter forwarding its whole props object) does not
 *  leak them into the resolved options. */
const GROUP_KEYS = new Set(["behavior", "appearance", "scope", "icons"]);

/** Copy the defined keys of a group onto `target`, unless the flat input set
 *  the same key (a flat option always wins). */
function copyGroup<K extends string>(
  target: Record<string, unknown>,
  flat: Record<string, unknown>,
  group: Partial<Record<K, unknown>> | undefined,
  keys: ReadonlyArray<K>,
): void {
  if (!group) return;
  for (const key of keys) {
    if (flat[key] !== undefined) continue;
    const value = group[key];
    if (value !== undefined) target[key] = value;
  }
}

/**
 * Merge grouped settings (plus any deprecated flat aliases) into one canonical
 * `OverlayScrollbarOptions` object.
 *
 * Only keys that are actually defined are copied, so an explicitly-`undefined`
 * value never overrides a core default, and the returned object is always a
 * fresh one (the inputs are never mutated).
 *
 * @param grouped - `behavior` / `appearance` / `scope` groups.
 * @param flat - Deprecated flat aliases (and framework-specific values such as
 *   `iconSize`); any defined key here wins over the same key in a group.
 * @returns A canonical options object for `createOverlayScrollbar`.
 */
export function resolveScrollbarOptions(
  grouped: ScrollbarGroupedOptions = {},
  flat: ScrollbarFlatOptions = {},
): OverlayScrollbarOptions {
  const flatRecord = flat as Record<string, unknown>;
  const merged: Record<string, unknown> = {};
  copyGroup(merged, flatRecord, grouped.behavior, BEHAVIOR_KEYS);
  copyGroup(merged, flatRecord, grouped.appearance, APPEARANCE_KEYS);
  copyGroup(merged, flatRecord, grouped.scope, SCOPE_KEYS);
  // Flat values (including any not covered by a group, e.g. `arrowIcon`) are
  // copied last so they win; structural group keys are skipped.
  for (const key of Object.keys(flatRecord)) {
    if (GROUP_KEYS.has(key)) continue;
    if (flatRecord[key] !== undefined) merged[key] = flatRecord[key];
  }
  return merged as OverlayScrollbarOptions;
}
