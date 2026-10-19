import type { ThemeStore } from "../../types";
import type { ThemeDefinition } from "../../model";
import { applyDOMEffects } from "./effects";
import type { DOMBindingOptions } from "./types";

/**
 * Create a binding that syncs the store theme to the DOM: `data-theme`,
 *    `data-theme-mode`, `data-theme-family`, the `dark` class, and the
 *    `color-scheme` style — with transition support.
 *
 * @see {@link DOMBindingOptions}
 * @see {@link createCSSVariablesBinding}
 */
export function createDOMBinding(
  store: ThemeStore,
  options: DOMBindingOptions = {},
) {
  const target =
    options.target ??
    (typeof document !== "undefined" ? document.documentElement : null);

  if (!target) {
    return null;
  }

  const attributeName = options.attributeName ?? "data-theme";
  // This binding only flips identity/attributes; it never starts a View
  // Transition itself. The CSS-variables binding owns the single
  // `startViewTransition` lightswitch and runs this `apply` inside it, so the
  // old snapshot is captured with the old attributes AND old colors together
  // (no white-shift) and nothing pipes a second View Transition on top.
  const subscribe = options.subscribe ?? true;

  const selection = options.selection ?? null;

  // Mutable so a live `transition` change can reach the binding without
  // rebuilding it — {@link DOMBindingOptions.setTransition}.
  let transitionOption = options.transition;

  const applyTheme = (theme: ThemeDefinition, emitOptions?: { suppressTransition?: boolean }) => {
    applyDOMEffects({
      target,
      attributeName,
      theme,
      selection,
      ...(transitionOption !== undefined
        ? {
            transition: {
              ...transitionOption,
              // Transitions are enabled by default; only a transition
              // explicitly set to `false`, or an explicit suppression, turns
              // them off.
              enabled:
                (transitionOption.enabled ?? true) &&
                !emitOptions?.suppressTransition,
            },
          }
        : {}),
    });
  };

  // The selection attributes need their own subscription. A selection change
  // that resolves to the same theme — `setMode("light")` while the OS
  // preference is already light, or `setMode("system")` while the resolved
  // theme is unchanged — emits no store change, so the store subscription
  // alone would leave `data-theme-selection-mode` describing the previous
  // choice.
  //
  // It writes *only* the selection attributes. The selection controller
  // notifies its listeners before it commits the new theme to the store, so
  // re-applying the theme here would publish the previous theme first and the
  // new one a moment later — two DOM states per change, which is a visible
  // flash and a View Transition that starts on the old theme.
  const applySelectionAttributes = () =>
    applyDOMEffects({
      target,
      attributeName,
      theme: store.get(),
      selection,
      selectionOnly: true,
    });

  const unsubscribeSelection =
    selection?.subscribe(applySelectionAttributes) ?? null;

  if (subscribe) {
    // Initial synchronization must never animate. The theme bootstrap (when
    // present) has already established the first-paint state, and a binding
    // created after mount must not reinterpret that synchronization as a
    // theme change.
    applyTheme(store.get(), { suppressTransition: true });
    const unsubscribe = store.subscribe(applyTheme);

    return {
      apply: applyTheme,
      setTransition(next: DOMBindingOptions["transition"]) {
        transitionOption = next;
      },
      destroy() {
        unsubscribe();
        unsubscribeSelection?.();
      },
    };
  }

  // No store subscription: a co-binding (the CSS-variables binding) drives
  // `apply` from inside its own single commit point via `onBeforeSwap`. See
  // the note on `subscribe` in {@link DOMBindingOptions}.
  return {
    apply: applyTheme,
    setTransition(next: DOMBindingOptions["transition"]) {
      transitionOption = next;
    },
    destroy() {
      unsubscribeSelection?.();
    },
  };
}

export type { DOMBindingOptions } from "./types";
