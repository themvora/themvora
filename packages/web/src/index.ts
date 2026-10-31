/**
 * Themvora web components — framework-free theming for any app.
 *
 * Provides the custom elements `ThemvoraProvider`, `ThemvoraScope`,
 * `ThemvoraToggle`, `ThemvoraSelect`, `ThemvoraScrollbar`, and
 * `ThemvoraInspector`, plus the `useTheme*` hooks, `getProviderRuntime`,
 * `getThemeSchedule`, and the `defineCustomElements` registration helper.
 *
 * ## HTML-first usage
 *
 * Importing this entry is enough: it registers the built-in elements and
 * injects their stylesheet once, so the consumer writes semantic HTML and
 * nothing else.
 *
 * ```html
 * <themvora-provider themes="light dark plum-dark" default-theme="light">
 *   <themvora-toggle></themvora-toggle>
 *   <themvora-select type="family"></themvora-select>
 *   <themvora-scope theme="plum-dark">…</themvora-scope>
 * </themvora-provider>
 * ```
 *
 * ```ts
 * import "@themvora/web";
 * ```
 *
 * Registration is idempotent and browser-only: importing the package during a
 * server render is a no-op, so Next.js, Remix, Nuxt, Astro and SvelteKit can
 * import it without a browser guard.
 *
 * @packageDocumentation
 */
import { ThemvoraProvider } from "./provider";
import { ThemvoraScope } from "./scope";
import { ThemvoraToggle } from "./toggle";
import { ThemvoraSelect } from "./select";
import { ThemvoraScrollbar } from "./scrollbar";
import { ThemvoraInspector } from "./inspector";
import { findProviderRuntime } from "./utils";
import { injectComponentStyles } from "./styles";
import {
  normalizeProvidedThemes,
  PRE_PAINT_SCROLLBAR_CSS,
  resolveGeneratedTheme,
  type ProvidedThemeFamily,
  type ThemeEffectiveSelection,
} from "@themvora/core";

export { ThemvoraProvider } from "./provider";
export { getProviderRuntime } from "./utils";
export { ThemvoraScope } from "./scope";
export { ThemvoraToggle } from "./toggle";
export { ThemvoraSelect } from "./select";
export { ThemvoraScrollbar, injectPrePaintScrollbarCSS } from "./scrollbar";
export { ThemvoraInspector } from "./inspector";
export type { ThemvoraProviderProps } from "./provider";

/**
 * Base class for a consumer-authored element that follows the nearest
 * `<themvora-provider>` runtime.
 *
 * Advanced: the built-in elements are built on it, and a custom control can be
 * too instead of re-implementing provider discovery, reconnection and
 * subscription cleanup.
 *
 * @see {@link ThemvoraRuntimeConsumer}
 */
export { ThemvoraRuntimeConsumer } from "./runtime-consumer";

export {
  THEME_READY_EVENT,
  THEMES_CHANGE_EVENT,
  type ThemvoraThemesChangeDetail,
} from "./events";

export {
  COMPONENT_CSS,
  COMPONENT_STYLE_ID,
  injectComponentStyles,
} from "./styles";

export { PRE_PAINT_SCROLLBAR_CSS, resolveGeneratedTheme };

/**
 * Resolves the active Themvora runtime from the first initialized
 * `<themvora-provider>` in the document.
 *
 * Framework-free (vanilla JS). Must be called after a `<themvora-provider>`
 * has initialized.
 *
 * **Multiple providers:** this returns the *first* provider in document order
 * that has a runtime. It is a page-level convenience, not a way to address a
 * specific provider — use `getProviderRuntime(element)` when more than one
 * provider exists, or when the element you hold is not the first.
 *
 * @returns The provider's runtime.
 * @throws {Error} When no initialized `<themvora-provider>` is present.
 *
 * @example
 * ```ts
 * const runtime = useThemeRuntime();
 * runtime.selection.setMode("dark");
 * ```
 *
 * @see {@link getProviderRuntime}
 * @see {@link defineCustomElements}
 */
export function useThemeRuntime() {
  const providers =
    typeof document === "undefined"
      ? []
      : Array.from(document.querySelectorAll<HTMLElement>("themvora-provider"));

  for (const el of providers) {
    const runtime = findProviderRuntime(el);
    if (runtime) return runtime;
  }

  throw new Error("useThemeRuntime must be used after a <themvora-provider> has initialized");
}

/**
 * Returns the currently selected theme definition from the active runtime.
 *
 * Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.
 *
 * @returns The active theme definition.
 *
 * @see {@link useThemeRuntime}
 * @see {@link defineCustomElements}
 */
export function useThemeValue() {
  return useThemeRuntime().store.get();
}

/**
 * Returns the theme produced by `generateTheme()` and registered with the
 * active `<themvora-provider>`.
 *
 * Resolves the registered theme that carries the generator's origin marker
 * (`meta.generation.kind === "generated"`); shipped presets never qualify. When
 * both halves of one `generateTheme()` call are registered, the theme the active
 * selection resolves to is returned.
 *
 * Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.
 *
 * Throws `ThemeError` with code `TV_GENERATION_THEME_NOT_FOUND` when the provider
 * holds no generated theme, and `TV_GENERATION_THEME_AMBIGUOUS` when several are
 * registered and the active selection does not identify one.
 *
 * Reads live on every call, so a theme removed from the registry is reported
 * immediately rather than a stale value being returned.
 *
 * @returns The registered generated theme.
 * @throws {ThemeError} `TV_GENERATION_THEME_NOT_FOUND` when the provider holds no
 *   generated theme; `TV_GENERATION_THEME_AMBIGUOUS` when several are registered
 *   and the active selection does not identify one.
 *
 * @see {@link useThemeValue}
 */
export function useGeneratedTheme() {
  const runtime = useThemeRuntime();
  return resolveGeneratedTheme(runtime.themes, runtime.store.get());
}

/**
 * Returns the themes the active `<themvora-provider>` was given, grouped by
 * family.
 *
 * Framework-free (vanilla JS). Reads live on every call, so a theme registered
 * after the provider initialized appears immediately — the vanilla surface has
 * no reactive wrapper by design, matching {@link useThemeValue}. For a push
 * notification, listen for the provider's `themes-change` event.
 *
 * ```js
 * const families = useProvidedThemes();
 * families.forEach((family) => {
 *   console.log(family.family, family.variants.map((v) => v.mode));
 * });
 * ```
 *
 * @returns The provider's theme families, in supplied order.
 *
 * @see {@link useThemeRuntime}
 * @see {@link normalizeProvidedThemes}
 */
export function useProvidedThemes(): readonly ProvidedThemeFamily[] {
  return normalizeProvidedThemes(useThemeRuntime().themes);
}

/**
 * Returns the active theme's token group from the active runtime.
 *
 * Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.
 *
 * @returns The active theme's tokens.
 *
 * @see {@link useThemeRuntime}
 * @see {@link defineCustomElements}
 */
export function useThemeTokens() {
  return useThemeRuntime().store.get().tokens;
}

/**
 * Returns the current theme mode (`system`, `light`, or `dark`).
 *
 * Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.
 *
 * @returns The current mode.
 *
 * @see {@link useThemeRuntime}
 * @see {@link defineCustomElements}
 */
export function useThemeMode() {
  return useThemeRuntime().selection.getMode();
}

/**
 * Returns the mode actually **applied** — `"light"` or `"dark"`, never
 * `"system"`.
 *
 * Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.
 *
 * Use this when a control states the current appearance. {@link useThemeMode}
 * reports what the visitor asked for: it stays `"system"` while that choice
 * stands and it does not move at a sunrise/sunset transition, so a label bound
 * to it kept announcing the old mode while the page changed colour.
 *
 * Pair it with {@link observeEffectiveThemeMode} to re-render on change.
 *
 * @returns The applied mode.
 *
 * @see {@link useThemeMode}
 * @see {@link observeEffectiveThemeMode}
 */
export function useEffectiveThemeMode(): "light" | "dark" {
  return useThemeRuntime().selection.getEffectiveMode();
}

/**
 * Calls `listener` whenever the applied mode changes, and returns an
 * unsubscribe function.
 *
 * Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.
 * The listener is **not** called once up front — read
 * {@link useEffectiveThemeMode} for the current value and call it again from the
 * listener.
 *
 * ```ts
 * const stop = observeEffectiveThemeMode(() => {
 *   label.textContent = useEffectiveThemeMode();
 * });
 * ```
 *
 * @param listener Called after the applied mode changes.
 * @returns An unsubscribe function.
 *
 * @see {@link useEffectiveThemeMode}
 */
export function observeEffectiveThemeMode(
  listener: (selection: ThemeEffectiveSelection) => void,
): () => void {
  return useThemeRuntime().selection.subscribeEffective(listener);
}

/**
 * Returns the current theme family.
 *
 * Framework-free (vanilla JS). Requires an initialized `<themvora-provider>`.
 *
 * @returns The current theme family.
 *
 * @see {@link useThemeRuntime}
 * @see {@link defineCustomElements}
 */
export function useThemeFamily() {
  return useThemeRuntime().selection.getFamily();
}

/**
 * Reactive sunrise/sunset schedule controller. Returns `null` when the
 * provider was created without the `scheduled` option.
 *
 * ```ts
 * const schedule = getThemeSchedule();
 * schedule?.enable();
 * schedule?.disable();
 * schedule?.set({ timeZone: "Asia/Kathmandu" });
 * ```
 */
export function getThemeSchedule() {
  return useThemeRuntime().schedule ?? null;
}

/**
 * Registers all Themvora custom elements with the browser and injects the
 * built-in component stylesheet.
 *
 * Framework-free (vanilla JS). Defines `<themvora-provider>`,
 * `<themvora-scope>`, `<themvora-toggle>`, `<themvora-select>`,
 * `<themvora-scrollbar>` and `<themvora-inspector>` if not already registered,
 * and adds the component stylesheet once. Safe to call more than once, and a
 * no-op on the server.
 *
 * @remarks
 * Importing `@themvora/web` already calls this, so a consumer normally never
 * calls it. It stays public for two cases: a consumer who wants to register a
 * different tag name (`ThemvoraProvider.define("my-provider")`), and a consumer
 * who needs the registration to happen at a specific point rather than at
 * module evaluation.
 *
 * @example
 * ```ts
 * import { defineCustomElements } from "@themvora/web";
 * defineCustomElements();
 * ```
 *
 * @see {@link ThemvoraProvider}
 */
export function defineCustomElements() {
  ThemvoraProvider.define();
  ThemvoraScope.define();
  ThemvoraToggle.define();
  ThemvoraSelect.define();
  ThemvoraScrollbar.define();
  ThemvoraInspector.define();
  injectComponentStyles();
}

// HTML-first: importing the package is the whole setup. Each `define()` checks
// `customElements.get(tag)` first, so a duplicate import, a double bundle
// evaluation or an explicit `defineCustomElements()` call afterwards is safe.
// Guarded by `customElements` rather than `window` because that is the exact
// global the registration needs — and it is absent during a server render.
if (typeof customElements !== "undefined") {
  defineCustomElements();
}
