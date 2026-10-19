import {
  resolveIconOptions,
  resolveScrollbarOptions,
  type OverlayScrollbarOptions,
  type ScrollbarGroupedOptions,
  type ScrollbarAppearanceOptions,
  type ScrollbarBehaviorOptions,
  type ScrollbarIconOptions,
  type ScrollbarScopeOptions,
} from "@themvora/core";

/**
 * Props accepted by the Svelte `ThemeScrollbar` component.
 *
 * Extends the core overlay scrollbar options to configure the overlay engine
 * (auto-hide, thickness, colors, axes, touch, direction, and so on). The
 * component renders nothing itself; it only creates and tears down the overlay
 * engine.
 *
 * Lives in its own module so `theme-scrollbar.svelte` can import it without
 * importing the barrel — a component that imported `index.ts` would create a
 * cycle, since the barrel exports the component.
 */
export interface ThemeScrollbarProps extends ScrollbarGroupedOptions {
  /** Arrow button icons: the arrow entry covers all four directions
   *  (per-direction entries win), plus the shared glyph size in CSS px. */
  icons?: ScrollbarIconOptions<string>;
}

/**
 * Narrows a `ThemeScrollbarProps` object to the overlay-engine options.
 *
 * Defined values are copied one key at a time and `undefined` keys are dropped
 * entirely, so an explicitly-undefined prop cannot override an engine default.
 * The result is a fresh object; `props` is never mutated.
 *
 * @param props - The component's props. Omit or pass `undefined` for an empty
 *   options object.
 * @returns A new `OverlayScrollbarOptions` containing only the keys that were
 *   defined on `props`.
 */
export function pickOptions(props?: ThemeScrollbarProps): OverlayScrollbarOptions {
  if (!props) return {};
  // The public API is the groups; the icons group maps onto the engine's
  // arrow options.
  return {
    ...resolveScrollbarOptions({
      behavior: props.behavior,
      appearance: props.appearance,
      scope: props.scope,
    }),
    ...resolveIconOptions(props.icons),
  };
}
