/**
 * The standalone pre-paint bootstrap asset — `@themvora/core/prepaint.js`.
 *
 * @remarks
 * This is the non-Vite delivery of the same first-paint guarantee the Vite
 * plugin provides. It is built to a single, dependency-free classic script
 * (`dist/prepaint.js`) that an ordinary page loads from `<head>` with a plain
 * `<script src>`. No bundler, no import map, no module resolution: a classic
 * script in the head is parser-blocking, so it runs before the first paint.
 *
 * **It is not a second implementation.** The registry resolution, the CSS
 * variable serialization, the `family:mode` lookup, the `"system"` resolution
 * and the DOM writes all come from {@link buildBootstrapPlan} and
 * {@link applyThemeBootstrap} — the exact functions the Vite plugin's inline
 * script is generated from. This entry only supplies the two things the inline
 * script gets from the build: a theme registry and a storage key.
 *
 * **One configuration.** The registry and the fallback selection are read from
 * a single JSON element in the document:
 *
 * ```html
 * <script type="application/json" id="themvora-config">
 *   { "defaultTheme": "light", "initialMode": "system" }
 * </script>
 * ```
 *
 * Omitting `themes` uses the built-in catalog, which is why the smallest setup
 * needs two keys and no theme data at all. A custom catalog is added under
 * `themes` — the same definitions `new Themvora({ themes })` takes, so there is
 * still exactly one declaration. The asset then publishes the resolved
 * configuration as `window.__THEMVORA_CONFIG__`, the global the runtime already
 * reads through `resolveRuntimeOptions`, so the runtime adopts the same
 * registry, the same fallback and the same storage key as the first paint.
 *
 * @packageDocumentation
 */

import { buildBootstrapPlan } from "./bootstrap";
import {
  applyThemeBootstrap,
  DEFAULT_PREPAINT_STORAGE_KEY,
  type ThemeBootstrapApplied,
} from "./prepaint";
import { getBuiltInThemes } from "./built-in-themes";
import { toBootstrapConfig, type ThemeBootstrapConfig } from "./app-config";
import type { ThemeDefinition, ThemeMode } from "./model/theme";
import type { ThemeTransitionOptions } from "./transition";
import type { PrePaintScrollbarOptions } from "./scrollbar/pre-paint";
import {
  PRE_PAINT_SCROLLBAR_CSS,
  SCROLLBAR_HIDING_STYLE_ATTR,
  SCROLLBAR_HIDING_STYLE_ID,
} from "./scrollbar/pre-paint";

/** The element id the configuration is read from. */
export const PREPAINT_CONFIG_ELEMENT_ID = "themvora-config";

/** The global the resolved configuration is published on. */
export const PREPAINT_CONFIG_GLOBAL = "__THEMVORA_CONFIG__";

/**
 * The configuration this asset accepts.
 *
 * @remarks
 * A superset-free alias of {@link ThemeBootstrapConfig}: the JSON element
 * carries exactly the serializable projection of the application
 * configuration, so a build integration and this asset cannot disagree about
 * what a field means.
 */
export type PrepaintConfig = Partial<ThemeBootstrapConfig<ThemeDefinition>>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Whether a value is a theme definition this asset can serialize.
 *
 * @remarks
 * The registry crosses a trust boundary here — a JSON element is authored
 * markup, and it can be stale, truncated or hand-edited. A definition with no
 * `name` would be registered as `"undefined"` and could then never be resolved
 * from storage, so it is dropped rather than trusted. `tokens` is required for
 * the same reason: a theme with no tokens paints nothing, and applying it would
 * strip every variable from `<html>`.
 */
function isThemeDefinition(value: unknown): value is ThemeDefinition {
  return (
    isObject(value) &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    isObject(value.tokens)
  );
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Read and validate the JSON configuration element.
 *
 * @returns The configuration, or `null` when there is no element or its
 *   contents are not a JSON object.
 */
function readConfigElement(): PrepaintConfig | null {
  if (typeof document === "undefined") return null;

  const element = document.getElementById(PREPAINT_CONFIG_ELEMENT_ID);
  if (!element) return null;

  // Only a JSON element is a declaration. The Vite plugin also uses this id for
  // its `window.__THEMVORA_CONFIG__ = …` script; that one is a classic script
  // whose text is JavaScript, not JSON, so it is not read here — the plugin has
  // already set the global this asset falls back to.
  const type = element.getAttribute("type");
  if (type !== "application/json" && type !== "text/json") return null;

  const text = element.textContent ?? "";
  if (!text.trim()) return null;

  try {
    const parsed: unknown = JSON.parse(text);
    return isObject(parsed) ? (parsed as PrepaintConfig) : null;
  } catch {
    // A malformed declaration is not a broken page: the built-in catalog and
    // the derived fallback are still a complete, readable theme.
    return null;
  }
}

/** Read the configuration a build integration transported, if any. */
function readTransportedConfig(): PrepaintConfig | null {
  const scope = globalThis as unknown as Record<string, unknown>;
  const transported = scope[PREPAINT_CONFIG_GLOBAL];
  return isObject(transported) ? (transported as PrepaintConfig) : null;
}

/**
 * Normalize a raw configuration into what the plan and the runtime need.
 *
 * @remarks
 * Validation is explicit and per field rather than `as` casts. The inputs come
 * from markup and from `localStorage`, neither of which the compiler can check,
 * and an `initialMode` of `"Dark"` (or a `themes` array of strings) would
 * otherwise reach `resolveInitialTheme` and resolve a theme the plan then
 * cannot name — a silent fallback to the wrong palette on the first frame.
 */
function normalizeConfig(raw: PrepaintConfig): {
  config: ThemeBootstrapConfig<ThemeDefinition>;
  storageKey: string;
} {
  const themes = Array.isArray(raw.themes)
    ? raw.themes.filter(isThemeDefinition)
    : [];

  // No declared catalog means the built-in one. That is the whole reason the
  // minimal setup needs no theme data: the asset carries the default registry,
  // so `{ "defaultTheme": "light" }` is a complete declaration.
  const resolvedThemes = themes.length > 0 ? themes : getBuiltInThemes();

  // `transition` and `scrollbar` are not read by this asset, but they are part
  // of the transported projection: publishing them is what lets the runtime
  // honour a declared `transition: false` instead of silently using its own
  // default, which is the difference between one visual swap and an animated
  // one on the visitor's first interaction.
  const transition = raw.transition;
  const scrollbar = raw.scrollbar;

  const config: ThemeBootstrapConfig<ThemeDefinition> = {
    themes: resolvedThemes,
    ...(typeof raw.defaultTheme === "string" ? { defaultTheme: raw.defaultTheme } : {}),
    ...(isThemeMode(raw.initialMode) ? { initialMode: raw.initialMode } : {}),
    ...(typeof raw.initialFamily === "string" ? { initialFamily: raw.initialFamily } : {}),
    ...(typeof raw.storageKey === "string" && raw.storageKey
      ? { storageKey: raw.storageKey }
      : {}),
    ...(typeof raw.prefix === "string" ? { prefix: raw.prefix } : {}),
    ...(typeof transition === "boolean"
      ? { transition }
      : isObject(transition)
        ? { transition: transition as ThemeTransitionOptions }
        : {}),
    ...(typeof scrollbar === "boolean"
      ? { scrollbar }
      : isObject(scrollbar)
        ? { scrollbar: scrollbar as PrePaintScrollbarOptions }
        : {}),
  };

  return {
    config,
    storageKey: config.storageKey ?? DEFAULT_PREPAINT_STORAGE_KEY,
  };
}

/**
 * Apply the persisted selection to the document before the first paint.
 *
 * @param raw - The configuration. Defaults to the JSON element, then to the
 *   transported global.
 * @returns What was applied, or `null` when there is no document.
 *
 * @remarks
 * Idempotent. A second call — a duplicate script tag, a host that re-runs the
 * asset, or the Vite plugin's inline script having already painted — returns
 * the state already on the page instead of writing a second, conflicting one.
 *
 * @see {@link applyThemeBootstrap}
 */
export function applyPrepaint(
  raw?: PrepaintConfig | null,
): ThemeBootstrapApplied | null {
  const declared = raw ?? readConfigElement() ?? readTransportedConfig() ?? {};
  const { config, storageKey } = normalizeConfig(declared);

  const plan = buildBootstrapPlan(config.themes, {
    ...(config.defaultTheme !== undefined ? { defaultTheme: config.defaultTheme } : {}),
    ...(config.initialMode !== undefined ? { initialMode: config.initialMode } : {}),
    ...(config.initialFamily !== undefined ? { initialFamily: config.initialFamily } : {}),
    ...(config.prefix !== undefined ? { prefix: config.prefix } : {}),
  });

  // Published before the apply so a runtime that somehow ran first still reads
  // the same registry. An existing value wins: a build integration's
  // transported configuration is the application's declaration, and this asset
  // must not overwrite it with a JSON element that may only carry overrides.
  try {
    const scope = globalThis as unknown as Record<string, unknown>;
    if (!scope[PREPAINT_CONFIG_GLOBAL]) {
      scope[PREPAINT_CONFIG_GLOBAL] = toBootstrapConfig(config);
    }
  } catch {
    // A frozen global still gets the attributes and variables below.
  }

  const applied = applyThemeBootstrap(plan, { storageKey });

  // The native scrollbar, hidden before the first frame when the page draws an
  // overlay one. Same job as the Vite plugin's injected scrollbar script, from
  // the same constants, so the two delivery paths cannot disagree about the
  // class name or the rules.
  if (config.scrollbar !== undefined && config.scrollbar !== false) {
    try {
      applyScrollbarPrePaint(config.scrollbar);
    } catch {
      // A scrollbar is cosmetic; the theme above is not.
    }
  }

  // Readouts and selection controls are reconciled from the same attributes the
  // apply just wrote. Doing it here — rather than leaving it to the application
  // module — is what makes the first frame *consistent* rather than merely
  // correctly themed: without it the canvas is right and the control beside it
  // still reads its markup default, which is the "toggle says Dark while the
  // page is Light" defect in a smaller window.
  try {
    patchReadouts(applied?.label ?? null);
  } catch {
    // A readout is cosmetic; the theme above is not.
  }

  return applied;
}

/**
 * Hide the native scrollbar before the first paint.
 *
 * @param scrollbar - `true` hides it on fine-pointer devices; an object can also
 *   hide it on coarse-pointer devices (`{ touch: true }`).
 *
 * @remarks
 * Mirrors {@link createPrePaintScrollbarScript}: the class and the stylesheet are
 * added idempotently, and a coarse pointer is left alone unless `touch` is set —
 * hiding the only scrollbar on a touch device is not a cosmetic change, it is a
 * lost affordance.
 *
 * It deliberately does not go through `hideNativeScrollbar()`: that function
 * registers a *claim* which `createOverlayScrollbar` later releases, and a claim
 * taken here would keep the native bar hidden after the overlay was destroyed.
 * The pre-paint pass is not a participant in that lifecycle; it only makes the
 * first frame match what the overlay is about to draw.
 */
function applyScrollbarPrePaint(scrollbar: true | PrePaintScrollbarOptions): void {
  if (typeof document === "undefined") return;

  const options = scrollbar === true ? {} : scrollbar;
  const touch = options.touch ?? false;

  const coarse =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  if (coarse && !touch) return;

  const root = document.documentElement;
  if (!root || root.classList.contains("tv-scrollbar")) return;

  root.classList.add("tv-scrollbar");

  // Respect a stylesheet that is already there instead of stacking a duplicate:
  // the rules are identical and their order is irrelevant.
  if (document.querySelector(`style[${SCROLLBAR_HIDING_STYLE_ATTR}]`)) return;

  const style = document.createElement("style");
  style.id = SCROLLBAR_HIDING_STYLE_ID;
  style.setAttribute(SCROLLBAR_HIDING_STYLE_ATTR, "");
  style.textContent = PRE_PAINT_SCROLLBAR_CSS;
  document.head.appendChild(style);
}

/**
 * The attribute contract the readouts and controls opt into.
 *
 * @remarks
 * These are the same three attributes the Vite plugin's injected scripts
 * reconcile (`data-tv-readout`, `data-tv-pressed`, `data-tv-select`), so a page
 * can move between the plugin path and this asset without rewriting its markup.
 */
const READOUT_SELECTOR = "[data-tv-readout],[data-tv-pressed],[data-tv-select]";

/** The global that guards against installing a second observer. */
const READOUT_OBSERVER_GLOBAL = "__THEMVORA_READOUT_OBSERVER__";

function readAttr(root: Element, name: string): string | null {
  const value = root.getAttribute(name);
  return value === null || value === "" ? null : value;
}

/**
 * Write the applied theme's state into every element that opted in.
 *
 * @param label - The resolved theme's `meta.label`, when it declares one. It
 *   travels from the plan because a script that runs before the body is parsed
 *   has no registry to look it up in.
 *
 * @remarks
 * `data-tv-pressed` writes `aria-pressed` and nothing else: the accessible
 * state *is* the visual state, so a control styled from `[aria-pressed="true"]`
 * cannot disagree with what a screen reader announces.
 *
 * A `<select>` only takes a value it actually offers, so a control built from a
 * subset of the catalog is left alone instead of being blanked.
 */
function patchReadouts(label: string | null): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  const run = (): void => {
    const theme = readAttr(root, "data-theme");
    const effectiveMode = readAttr(root, "data-theme-mode");
    const mode = readAttr(root, "data-theme-selection-mode");
    const family = readAttr(root, "data-theme-selection-family");

    const elements = document.querySelectorAll(READOUT_SELECTOR);

    for (const element of Array.from(elements)) {
      const readout = element.getAttribute("data-tv-readout");
      if (readout) {
        // Once written, the element belongs to the application.
        //
        // This is not an optimization. The runtime commits a theme change
        // through `startViewTransition`, whose update callback runs in a *later
        // task*, so for one frame the store holds the new theme while
        // `data-theme-mode` still describes the old one. An application that
        // renders from the instance during that frame is correct; an observer
        // that re-reads the attribute would immediately overwrite it with the
        // previous value and the readout would settle one change behind.
        if (element.getAttribute("data-tv-patched") === "1") continue;

        let value: string | null =
          readout === "theme"
            ? theme
            : readout === "label"
              ? label
              : readout === "mode"
                ? mode
                : readout === "family"
                  ? family
                  : readout === "effective-mode"
                    ? effectiveMode
                    : null;

        if (value === null && readout.startsWith("var:")) {
          try {
            value =
              getComputedStyle(root).getPropertyValue(readout.slice(4)).trim() || null;
          } catch {
            value = null;
          }
        }

        if (value !== null) {
          if (element.textContent !== value) element.textContent = value;
          element.setAttribute("data-tv-patched", "1");
        }
        continue;
      }

      const pressed = element.getAttribute("data-tv-pressed");
      if (pressed) {
        const wanted = element.getAttribute("data-tv-value");
        const current = pressed === "mode" ? mode : pressed === "family" ? family : null;
        if (current !== null && wanted !== null) {
          const next = String(current === wanted);
          if (element.getAttribute("aria-pressed") !== next) {
            element.setAttribute("aria-pressed", next);
          }
        }
        continue;
      }

      const select = element.getAttribute("data-tv-select");
      if (select && element instanceof HTMLSelectElement) {
        const wanted = select === "family" ? family : select === "mode" ? mode : null;
        if (wanted !== null && element.value !== wanted) {
          for (const option of Array.from(element.options)) {
            if (option.value === wanted) {
              element.value = wanted;
              break;
            }
          }
        }
      }
    }
  };

  run();

  // This asset runs in `<head>`, before the body is parsed, so a single pass
  // finds nothing. The observer reconciles each element as the parser inserts
  // it — still before the first paint — which is the same mechanism the Vite
  // plugin uses. It is installed once per document: a second copy of this asset
  // would otherwise run N passes per mutation.
  const scope = globalThis as unknown as Record<string, unknown>;
  if (typeof MutationObserver === "undefined" || scope[READOUT_OBSERVER_GLOBAL]) return;

  try {
    const observer = new MutationObserver(run);
    observer.observe(root, { childList: true, subtree: true });
    scope[READOUT_OBSERVER_GLOBAL] = observer;
  } catch {
    // No observer means the controls keep their markup state until the
    // application module updates them; the theme is unaffected.
  }
}

/**
 * The asset's entry point.
 *
 * @remarks
 * Wrapped in a `try`/`catch` with no rethrow: this file is parser-blocking in
 * `<head>`, so an exception escaping it would abort the rest of the document's
 * head — including the application's own stylesheet link — and the page would
 * paint unstyled *and* unthemed. A failure here degrades to the stylesheet
 * fallback, which is the one layer that works without JavaScript.
 */
function boot(): void {
  try {
    applyPrepaint();
  } catch {
    // Intentionally silent: see the note above.
  }
}

boot();
