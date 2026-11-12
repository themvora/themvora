import { themeToCSSVariables } from "../css";
import type { ThemeStore } from "../types";
import type { ThemeDefinition } from "../model";
import { DEFAULT_THEME_TRANSITION, type ThemeTransitionOptions } from "../transition";
import {
  registerThemeProperties,
} from "./dom/transition";
import { createDOMWriteBatch } from "./dom/batch";
import {
  beginDescendantTransitionSuppression,
  createThemeDiff,
  createTransitionPlan,
  disposeThemeTransitionStyles,
} from "../animation";

/**
 * Options for {@link createCSSVariablesBinding}.
 *
 * The binding keeps CSS custom properties (`--theme-*`) on a target element
 * (default `<html>`) in sync with the store, applying the current theme
 * immediately on creation and diffing subsequent updates. It can write
 * variables inline on the target or into a single `<style>` element wrapped
 * in a cascade layer.
 */
export interface CSSVariablesOptions {
  /** Element to write the CSS variables onto.
   *  @defaultValue `document.documentElement` (when present) */
  target?: HTMLElement;
  /** Prefix for the emitted custom properties.
   *  @defaultValue `"theme-"` */
  prefix?: string;
  /** Transition applied when the theme changes. When omitted, the default
   *  theme transition is used. */
  transition?: ThemeTransitionOptions;
  /** When `true`, write variables into a `<style>` element (in a cascade
   *  layer) instead of inline on the target.
   *  @defaultValue `false` */
  styleSheet?: boolean;
  /** Cascade layer name used when `styleSheet` is enabled.
   *  @defaultValue `"themvora"` */
  layerName?: string;
  /** Applied inside the single View Transition lightswitch right before the
   *  CSS variables are swapped, so the old snapshot shows the old attributes
   *  AND old colors together. Lets a co-binding (e.g. the DOM binding's
   *  `apply`) stay in sync with the crossfade instead of starting its own
   *  View Transition (which would skip/abort the first one). */
  onBeforeSwap?: (
    theme: ThemeDefinition,
    emitOptions?: { suppressTransition?: boolean },
  ) => void;
  /**
   * Called immediately **after** the new variables are on the target — in the
   * same task as the write, and inside the View Transition's update callback
   * when one is running.
   *
   * @remarks
   * This is the "the document now shows this theme" signal. A View Transition
   * applies its update callback in a *later* task than the store commit, so
   * anything a consumer derives from the theme (a label, a scoped region, an
   * adapter-driven UI) is one frame ahead of the pixels if it renders on the
   * store's own notification. A framework-free runtime uses this to publish
   * `themeChange` only once the document agrees with it.
   *
   * It fires on every applied change, including the initial suppressed one, so
   * a consumer must be idempotent.
   */
  onAfterSwap?: (
    theme: ThemeDefinition,
    emitOptions?: { suppressTransition?: boolean },
  ) => void;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Marker on the stylesheet that carries the configured crossfade timing. */
const VIEW_TRANSITION_TIMING_ATTR = "data-themvora-view-transition-timing";

let viewTransitionTimingGeneration = 0;

/**
 * The configured `duration`/`easing` for a native View Transition.
 *
 * The UA's default crossfade is ~250 ms and ignores the theme configuration, so
 * `transition: { duration: 600 }` used to look identical to the default on the
 * View Transition path — the one path a supporting browser takes. The duration
 * lives in a pseudo-element rule, so it is written to a temporary stylesheet
 * rather than an inline style, and the stylesheet is removed when the
 * transition finishes so later (e.g. Astro client-router) transitions keep
 * their own timing.
 *
 * @returns A disposer for this transition's stylesheet.
 */
function applyViewTransitionTiming(transition: {
  duration: number;
  easing: string;
}): () => void {
  if (
    typeof document === "undefined" ||
    !document.head ||
    typeof document.createElement !== "function"
  ) {
    return () => {};
  }

  // App-supplied CSS, inserted into a stylesheet: strip the characters that
  // could end the declaration or the rule. This is not a security boundary
  // (the config is the app's own), only a guard against a malformed value
  // breaking every later rule in the sheet.
  const easing = transition.easing.replace(/[;{}]/g, "").trim();
  const css =
    "::view-transition-group(root),::view-transition-old(root),::view-transition-new(root){" +
    `animation-duration:${transition.duration}ms;` +
    (easing ? `animation-timing-function:${easing};` : "") +
    "}";

  let node = document.head.querySelector<HTMLStyleElement>(
    `style[${VIEW_TRANSITION_TIMING_ATTR}]`,
  );
  if (!node) {
    node = document.createElement("style");
    node.setAttribute(VIEW_TRANSITION_TIMING_ATTR, "");
    document.head.appendChild(node);
  }

  // A second toggle before the first finishes must not have its stylesheet
  // removed by the first transition's cleanup.
  const generation = ++viewTransitionTimingGeneration;
  node.textContent = css;

  return () => {
    if (generation === viewTransitionTimingGeneration) node.remove();
  };
}

/**
 * Create a binding that keeps CSS custom properties (`--theme-*`) on a
 *    target element (default `<html>`) in sync with the store. Applies the
 *    current theme immediately on creation and diffs updates.
 *
 * @see {@link themeToCSSVariables}
 * @see {@link CSSVariablesOptions}
 */
export function createCSSVariablesBinding(
  store: ThemeStore,
  options: CSSVariablesOptions = {},
) {
  const target =
    options.target ??
    (typeof document !== "undefined" ? document.documentElement : null);

  if (!target && !options.styleSheet) {
    return null;
  }

  const element = target;
  const prefix = options.prefix ?? "theme-";
  const useStyleSheet = options.styleSheet ?? false;
  const layerName = options.layerName ?? "themvora";

  // Mutable so a live `transition` change reaches the binding without a
  // rebuild — see `setTransition` on the returned object.
  let transitionOption = options.transition;

  /**
   * The View Transition currently animating a theme change, if any.
   *
   * A second change that arrives while one is running is applied **without**
   * starting another crossfade. Starting a second one aborts the first, and an
   * aborted crossfade leaves the page mid-fade before snapping to the new
   * palette — which, on repeated clicks, reads as the theme "fluctuating"
   * rather than changing. The visitor's latest choice still wins: the variables
   * are written immediately, the running crossfade just finishes over them.
   */
  let activeTransition: { finished?: Promise<unknown> } | null = null;

  let appliedVariables = new Map<string, string>();
  let styleElement: HTMLStyleElement | null = null;

  function applyTheme(theme: ThemeDefinition, emitOptions?: { suppressTransition?: boolean }) {
    const variables = themeToCSSVariables(theme, { prefix });

    const suppressTransition = emitOptions?.suppressTransition ?? false;
    let cssNode: HTMLStyleElement | null = null;

    if (suppressTransition && typeof document !== "undefined" && document.head && !useStyleSheet) {
      cssNode = document.createElement("style");
      cssNode.appendChild(
        document.createTextNode(
          `*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`
        )
      );
      document.head.appendChild(cssNode);
    }

    if (useStyleSheet && typeof document !== "undefined") {
      applyStyleSheet(theme, variables, prefix, layerName);
      if (cssNode && document.head.contains(cssNode)) {
        document.head.removeChild(cssNode);
      }
      options.onAfterSwap?.(theme, emitOptions);
      return;
    }

    // Own the whole visual-update pipeline: diff → plan → coordinate → swap →
    // cleanup. The planner returns null when nothing animatable changed, when
    // transitions are disabled, or when the user prefers reduced motion — in
    // all of those cases the variables are swapped immediately and no
    // transition styles are ever attached.
    const applyNow = () => {
      options.onBeforeSwap?.(theme, emitOptions);
      applyInlineVariables(element!, variables);
    };

    /**
     * Apply, then report that the document now shows this theme.
     *
     * The report has to happen here rather than from the store subscription:
     * inside a View Transition this callback runs a task *after* the store
     * committed, so a consumer notified from the store is one frame ahead of
     * the pixels it describes.
     */
    const commit = () => {
      applyNow();
      options.onAfterSwap?.(theme, emitOptions);
    };

    // Prefer a native cross-fade (View Transition API). It paints the NEW theme
    // beneath a snapshot of the OLD one and fades that snapshot out, so a
    // light→dark switch never passes through white intermediates (the colour
    // values interpolate, but the snapshot opacity owns the visible fade). This
    // is the fix for the "white shift" on cards during toggles.
    const transition = { ...DEFAULT_THEME_TRANSITION, ...transitionOption };
    const supportsViewTransition =
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      typeof (document as any).startViewTransition === "function";
    const useViewTransition =
      transition.enabled &&
      !prefersReducedMotion() &&
      transition.useViewTransition &&
      supportsViewTransition &&
      // One crossfade at a time — see `activeTransition`.
      activeTransition === null;

    if (suppressTransition) {
      commit();
    } else if (useViewTransition) {
      // Mute descendant transitions for the crossfade, exactly as the CSS-property
      // run does. The snapshot the browser fades out already carries the old
      // palette; without this, any component that eases its own colour eases
      // *again* underneath the fade and lands well after the page has switched.
      // Measured before the fix on this repo's React + MUI fixture: the document
      // swapped in 1 frame while MUI's Button needed 30 (540 ms), and MUI's own
      // Paper had already snapped — three different timings for one change.
      const releaseSuppression = beginDescendantTransitionSuppression(element!);
      // The configured duration/easing must reach the native crossfade too;
      // the UA default is a fixed ~250 ms and would silently ignore the app's
      // `transition.duration`.
      const releaseTiming = applyViewTransitionTiming(transition);

      const viewTransition = (document as any).startViewTransition(() => {
        commit();
        return Promise.resolve();
      });

      // Marks the crossfade window. Cleared on both outcomes, because an
      // aborted transition still ends the window — and a flag left set would
      // disable the crossfade for the rest of the session.
      activeTransition = viewTransition;
      const release = () => {
        if (activeTransition === viewTransition) activeTransition = null;
        releaseSuppression();
        releaseTiming();
      };

      // A skipped transition is normal — a second toggle in the same frame, a
      // provider removed mid-swap, a tab going hidden — and the API reports it
      // by rejecting `ready` / `finished` with `AbortError`. Nothing awaits
      // them, so without this they surface as unhandled rejections in the
      // page's console (and in an error-reporting tool, as a crash).
      viewTransition?.ready?.catch?.(() => {});
      viewTransition?.finished?.catch?.(() => {});

      // The window ends when the crossfade does. `finished` rejects on an
      // aborted transition, so the release runs on both outcomes; the disposer
      // is idempotent, so the double call is harmless.
      if (viewTransition?.finished?.then) {
        viewTransition.finished.then(release, release);
      } else {
        release();
      }
    } else {
      const plan = createTransitionPlan(
        createThemeDiff(appliedVariables, variables),
        transitionOption,
        { reducedMotion: prefersReducedMotion() },
      );

      if (plan) {
        // No View Transition available, so the page cannot be crossfaded as one
        // image. Interpolating the variables here is *not* an equivalent
        // fallback: adapter-driven libraries (Ant Design, MUI, Mantine, Chakra)
        // re-render with the new tokens synchronously and cannot be
        // interpolated alongside the variables, so their components finish
        // changing on the first frame while every `--theme-*` surface is still
        // mid-fade. Measured on a themed dashboard: twelve intermediate sidebar
        // colours over ~170 ms, with the page visibly half-switched.
        //
        // The variables are therefore swapped in one step and descendant
        // transitions are muted for the configured duration, so nothing eases
        // into the new palette behind the swap. The change is atomic, which is
        // the property that matters when two systems paint the same pixels.
        //
        // This is also the path a change takes while a crossfade is already
        // running (see `activeTransition`): the latest choice is committed
        // immediately instead of stacking a second, aborting crossfade.
        const release = beginDescendantTransitionSuppression(element!);
        commit();
        setTimeout(release, plan.duration);
      } else {
        commit();
      }
    }

    if (cssNode && typeof document !== "undefined" && document.head) {
      if (document.body) {
        void document.body.offsetHeight;
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Guarded: the document can be replaced between scheduling this and
          // running it — a host tearing its document down, a test resetting the
          // DOM. `removeChild` on a node whose parent is gone throws
          // `NotFoundError`, and a frame callback sits outside any caller's
          // try/catch, so that becomes an uncaught exception rather than a
          // failed assertion. `contains` is the same guard the synchronous
          // removals above already use.
          if (cssNode && document.head.contains(cssNode)) {
            document.head.removeChild(cssNode);
          }
        });
      });
    }
  }

  function applyInlineVariables(element: HTMLElement, variables: Record<string, string>) {
    const batch = createDOMWriteBatch();

    for (const [variable, value] of Object.entries(variables)) {
      const previous = appliedVariables.get(variable);
      if (previous === value) continue;
      batch.setStyle(variable, value);
    }

    for (const variable of appliedVariables.keys()) {
      if (!(variable in variables)) {
        batch.setStyle(variable, null);
      }
    }

    batch.flush(element);

    appliedVariables = new Map(Object.entries(variables));
  }

  function applyStyleSheet(
    theme: ThemeDefinition,
    variables: Record<string, string>,
    cssPrefix: string,
    layer: string,
  ) {
    const id = `tv-vars-${layer}`;
    let el = document.getElementById(id) as HTMLStyleElement | null;

    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }

    const cssVars = Object.entries(variables)
      .filter(([key]) => {
        const prev = appliedVariables.get(key);
        return prev === undefined || prev !== variables[key];
      })
      .map(([key, value]) => `  ${key}: ${value};`)
      .join("\n");

    const removedVars = [...appliedVariables.keys()]
      .filter((key) => !(key in variables))
      .map((key) => `  ${key}: initial;`)
      .join("\n");

    const block = [cssVars, removedVars].filter(Boolean).join("\n");

    if (block) {
      el.textContent = `@layer ${layer} {\n  :root {\n${block}\n  }\n}`;
    }

    appliedVariables = new Map(Object.entries(variables));
  }

  // Register @property for all color variables ONCE at initialization.
  // This must happen before the first apply so the `@property` syntax is in
  // place, even though the first apply is suppressed (no animation on mount).
  if (element) {
    const initialVariables = themeToCSSVariables(store.get(), { prefix });
    registerThemeProperties(element, initialVariables, prefix);
  }

  // Seed the tracked set from any inline `--<prefix>*` already on the target.
  // An SSR shell (or the pre-paint bootstrap) writes the *default* theme's
  // variables, and the theme the store resolves to may define fewer token
  // groups (a preset with no `code` group, say). Seeding makes the first apply
  // below clear the groups the active theme does not define, instead of leaving
  // them to shadow a `var(--theme-*, fallback)` rule.
  if (element) {
    for (let i = 0; i < element.style.length; i++) {
      const property = element.style.item(i);
      if (property.startsWith(`--${prefix}`)) {
        appliedVariables.set(property, element.style.getPropertyValue(property));
      }
    }
  }

  // Apply the current theme immediately — no animation on first paint. Without
  // this the `--theme-*` variables are unset when the browser renders the
  // initial HTML, so the background/color rules fall back to the default
  // (white canvas / black text) — the classic "flash of unthemed content".
  //
  // The suppressTransition flag is essential: with `useViewTransition: true`
  // (the default), an unsuppressed apply would call `startViewTransition`,
  // capturing a snapshot of the page before React components are painted
  // (useLayoutEffect runs before paint). The crossfade would then fade the
  // React UI in, causing a visible flash on components like the theme
  // switcher button and scoped regions.
  applyTheme(store.get(), { suppressTransition: true });

  const unsubscribe = store.subscribe(applyTheme);

  return {
    /**
     * Replace the transition options used by subsequent theme changes, without
     * rebuilding the binding or touching the current theme.
     *
     * Turning transitions off also releases the persistent `:root` transition
     * stylesheet the animation coordinator installed: left in place it would
     * keep interpolating every later variable swap even though the planner now
     * returns `null` (see {@link disposeThemeTransitionStyles}).
     */
    setTransition(next: ThemeTransitionOptions | undefined) {
      transitionOption = next;
      if (next?.enabled === false && element) {
        disposeThemeTransitionStyles(element);
      }
    },
    destroy() {
      unsubscribe();
      if (element) disposeThemeTransitionStyles(element);
      if (styleElement && document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
        styleElement = null;
      }
      appliedVariables.clear();
    },
  };
}
