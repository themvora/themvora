import type { ThemeDefinition, ThemeMode } from "@themvora/core";
import { THEME_SELECTION_ATTRIBUTE, THEME_TOGGLE_ATTRIBUTE } from "./attributes";
import { getThemeController, type ThemeController } from "./controller";
import { syncPressedControls, syncSelectionControls } from "./dom";
import { getGlobalRuntime } from "./shared-runtime";

/**
 * Marks a document whose bindings are already installed.
 *
 * @remarks
 * A symbol property on `document` rather than a module variable: several
 * bundles can carry their own copy of this module (a page script, a component's
 * script, an island), and all of them install against the same document. A
 * module-level flag would let each copy install its own listeners, so one click
 * would toggle the theme once per copy.
 *
 * `document` — not `window` or `globalThis` — because `<ClientRouter />` keeps
 * the same `document` across navigations: the flag survives, and the delegated
 * listeners registered against it keep working for the life of the tab. That is
 * precisely what a per-page `<script>` cannot do.
 */
const INSTALLED = Symbol.for("@themvora/astro/theme-bindings");

/**
 * Installs the delegated DOM bindings for the Themvora contracts.
 *
 * @remarks
 * Two contracts, one listener each, registered once per document:
 *
 * | Contract | Event | Effect |
 * | -------- | ----- | ------ |
 * | `[data-tv-toggle]` | `click` | `toggleTheme()` |
 * | `[data-tv-select]` | `change` | `setFamily()` / `setMode()` from `value` |
 *
 * The `change` listener is the input half of `[data-tv-select]`; the output half
 * — writing the live selection back into the element — lives in
 * `syncSelectionControls`, and `[data-tv-pressed]` (a segmented control's
 * `aria-pressed`) is mirrored by `syncPressedControls` on the same change. A
 * page that renders `<ThemeToggle />` and a segmented control therefore needs no
 * script of its own, and the two controls cannot disagree.
 *
 * **Delegated, not per-element.** This is the fix for the interaction bug, not
 * a style preference. Astro bundles a component's `<script>` once per page, so
 * a component that rendered the select cannot know how many instances the page
 * has — `getElementById` binds one of them. And Astro's module scripts never
 * re-execute across `<ClientRouter />` navigations, so a page you navigate back
 * to keeps the listeners its *first* visit registered and no others. A
 * `document`-level listener has neither problem: it is registered once and
 * matches whatever the DOM contains at the moment the event fires.
 *
 * **Lazy.** Nothing here creates a runtime. The controller is resolved on the
 * first interaction, so a page that renders a control but is never used ships
 * the script and pays nothing else — the runtime, its persistence adapter and
 * its cross-tab channel are still created on demand.
 *
 * Safe to call more than once, and safe to call on the server (a no-op).
 *
 * @example
 * ```astro
 * <select data-tv-select="family">
 *   <option value="mint">mint</option>
 *   <option value="cocoa">cocoa</option>
 * </select>
 *
 * <script>
 *   import { installThemeBindings } from "@themvora/astro/runtime";
 *   installThemeBindings();
 * </script>
 * ```
 *
 * @see {@link THEME_SELECTION_ATTRIBUTE}
 * @see {@link THEME_TOGGLE_ATTRIBUTE}
 */
export function installThemeBindings(): void {
  if (typeof document === "undefined") return;

  const flag = document as unknown as Record<symbol, unknown>;
  if (flag[INSTALLED]) return;
  flag[INSTALLED] = true;

  // The controller the subscription belongs to. `getThemeController()` returns
  // a re-wrapped controller when the installed runtime changes — a React island
  // replacing the one a native control created — and a subscription left on the
  // previous controller would stop seeing changes.
  let observed: ThemeController<ThemeDefinition> | null = null;
  let unsubscribe: (() => void) | null = null;

  /**
   * Mirrors the live selection into every `[data-tv-select]` element.
   *
   * @param controller - The controller to observe.
   */
  const observe = (controller: ThemeController<ThemeDefinition>): void => {
    if (observed === controller) return;
    unsubscribe?.();
    observed = controller;
    unsubscribe = controller.subscribe((state) => {
      syncSelectionControls(state.mode, state.family);
      syncPressedControls(state.mode, state.family);
    });
  };

  /**
   * Resolves the controller for an interaction, subscribing to it on the way.
   *
   * @returns The app-wide controller.
   */
  const ensure = (): ThemeController<ThemeDefinition> => {
    const controller = getThemeController<ThemeDefinition>();
    observe(controller);
    return controller;
  };

  // A runtime may already exist — a page script or an island created it before
  // this ran — in which case there is nothing to defer: start mirroring now, so
  // a control added later is correct before the visitor touches it.
  //
  // `getGlobalRuntime()` rather than `getThemeController()`: the latter would
  // *create* a runtime, and creating one for a page whose controls are never
  // used is the cost this function exists to avoid.
  const live = getGlobalRuntime<ThemeDefinition>();
  if (live) observe(getThemeController<ThemeDefinition>());

  document.addEventListener("change", (event) => {
    const target = event.target as Element | null;
    const select = target?.closest?.(`[${THEME_SELECTION_ATTRIBUTE}]`) as
      | HTMLSelectElement
      | null;
    if (!select) return;

    const kind = select.getAttribute(THEME_SELECTION_ATTRIBUTE);
    if (kind !== "family" && kind !== "mode") return;

    const controller = ensure();
    if (kind === "family") controller.setFamily(select.value);
    else controller.setMode(select.value as ThemeMode);

    // Written synchronously as well as through the subscription: a selection
    // that resolves to the theme already applied emits no store change, and
    // sibling controls would otherwise keep the previous option until the next
    // change that does.
    syncSelectionControls(controller.getMode(), controller.getFamily());
    syncPressedControls(controller.getMode(), controller.getFamily());
  });

  document.addEventListener("click", (event) => {
    const target = event.target as Element | null;
    if (!target?.closest?.(`[${THEME_TOGGLE_ATTRIBUTE}]`)) return;

    const controller = ensure();
    controller.toggleTheme();
    syncSelectionControls(controller.getMode(), controller.getFamily());
    syncPressedControls(controller.getMode(), controller.getFamily());
  });
}
