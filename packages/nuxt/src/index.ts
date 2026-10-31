/**
 * Themvora Nuxt integration.
 *
 * The Nuxt module wires auto-imported `useTheme*` composables, the
 * `ThemeScope` / `ThemeScrollbar` / `ThemeInspector` components, and the
 * server-side cookie + bootstrap helpers (`defineNuxtTheme`,
 * `resolveThemeFromCookies`, `NuxtThemeBootstrap`).
 *
 * @packageDocumentation
 */
import {
  defineNuxtModule,
  addImportsDir,
  addPlugin,
  createResolver,
  addComponentsDir,
} from "@nuxt/kit";
import type { NuxtModule } from "@nuxt/schema";
import type {
  PrePaintScrollbarOptions,
  ThemeDefinition,
  ThemeMode,
  ThemeScheduleOptions,
  ThemeTransitionOptions,
} from "@themvora/core";

/**
 * Configuration options for the `@themvora/nuxt` module, set under the
 * `themvora` key in `nuxt.config.ts`. The module installs an app-wide theme
 * runtime, registers the theme components and composables, and wires the
 * SSR-first cookie contract so the browser paints already themed.
 *
 * @example
 * ```ts
 * export default defineNuxtConfig({
 *   themvora: {
 *     defaultTheme: "light",
 *     initialMode: "system",
 *     scrollbar: true,
 *   },
 * });
 * ```
 *
 * @see {@link ResolveThemeFromCookiesOptions}
 * @see {@link NuxtThemeBootstrapOptions}
 */
export interface ModuleOptions {
  /** Theme registry. Defaults to the built-in themes when omitted. */
  themes?: ThemeDefinition[];
  /** Fallback theme name when no selection is persisted. */
  defaultTheme?: string;
  /**
   * An explicit theme override applied over any persisted selection.
   *
   * Applied once per value and never written to the theme cookies. Because it is
   * a module option it is fixed for the app rather than per page; use
   * `runtime.configure({ themeOverride })` from a plugin when it has to change
   * at runtime.
   */
  themeOverride?: import("@themvora/core").ThemeOverride<string>;
  /** Initial mode: `"light"`, `"dark"` or `"system"`. Default `"system"`. */
  initialMode?: ThemeMode;
  /** Initial theme family when no selection is persisted. */
  initialFamily?: string;
  /**
   * Theme transitions. `false` disables them; `true` (or an options object)
   * enables smooth cross-fades on theme changes through the shared
   * `@themvora/core` transition engine.
   */
  transition?: boolean | ThemeTransitionOptions;
  /**
   * Custom scrollbar bootstrap. `true` (or options) emits the pre-paint CSS
   * and the `tv-scrollbar` class on `<html>` so the native scrollbar is
   * hidden from first paint; mount `<ThemeScrollbar />` to create the
   * overlay engine (shared with every framework).
   */
  scrollbar?: boolean | PrePaintScrollbarOptions;
  /** localStorage key holding the persisted selection. Default `"theme-selection"`. */
  storageKey?: string;
  /**
   * Sunrise/sunset scheduling. Pass `{ lightTheme, darkTheme, latitude,
   * longitude, ... }` to auto-switch between a light and a dark theme at
   * sunrise/sunset. `false` (default) disables scheduling. Use
   * `useThemeSchedule()` to read `enabled`/`status`/`sunrise`/`sunset` and to
   * enable or disable the schedule reactively.
   */
  scheduled?: false | ThemeScheduleOptions<ThemeDefinition>;
}

const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@themvora/nuxt",
    configKey: "themvora",
    compatibility: { nuxt: ">=3.10.0" },
  },
  defaults: {
    themes: undefined,
    defaultTheme: undefined,
    themeOverride: undefined,
    initialMode: "system",
    initialFamily: undefined,
    transition: undefined,
    scrollbar: undefined,
    storageKey: undefined,
    scheduled: undefined,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // Only defined options are written. Nuxt serializes `undefined` runtime
    // config values as `""`, which the runtime would then read as an empty
    // theme override/default and warn about on every request.
    const publicConfig: Record<string, unknown> = {
      initialMode: options.initialMode ?? "system",
    };
    if (options.themes !== undefined) publicConfig.themes = options.themes;
    if (options.defaultTheme !== undefined) publicConfig.defaultTheme = options.defaultTheme;
    if (options.themeOverride !== undefined) publicConfig.themeOverride = options.themeOverride;
    if (options.initialFamily !== undefined) publicConfig.initialFamily = options.initialFamily;
    if (options.transition !== undefined) publicConfig.transition = options.transition;
    if (options.scrollbar !== undefined) publicConfig.scrollbar = options.scrollbar;
    if (options.storageKey !== undefined) publicConfig.storageKey = options.storageKey;
    if (options.scheduled !== undefined) publicConfig.scheduled = options.scheduled;
    nuxt.options.runtimeConfig.public.themvora = publicConfig;

    addImportsDir(resolver.resolve("./runtime/composables"));
    addComponentsDir({ path: resolver.resolve("./runtime/components"), prefix: "" });

    addPlugin(resolver.resolve("./runtime/plugin"));

    nuxt.hook("prepare:types", () => {
      const { themes } = nuxt.options.runtimeConfig.public.themvora as { themes?: ThemeDefinition[] };
      if (themes && themes.length > 0) {
        const themeNames = themes.map((t: ThemeDefinition) => `"${t.name}"`).join(" | ");
        nuxt.options.alias["#themvora-themes"] = `{ name: ${themeNames} }`;
      }
    });
  },
});

export default module;

export {
  ThemeProvider,
  ThemeScope,
  ThemeScrollbar,
  ThemeInspector,
  ThemeSymbol,
  provideThemeRuntime,
  createVueThemeBootstrapScript,
  useTheme,
  useThemeRuntime,
  useProvidedThemes,
  useThemeValue,
  useThemeTokens,
  useThemeMode,
  useEffectiveThemeMode,
  useThemeFamily,
  useThemeHistory,
  useThemeBatch,
  useThemeSnapshot,
  useThemeRestore,
  useThemeLifecycle,
  useThemePacks,
  useThemeSchedule,
} from "@themvora/vue";
export type {
  ThemeProviderProps,
  ThemeScrollbarProps,
  ThemeScopeProps,
  ThemeInspectorProps,
  ThemeScheduleController,
} from "@themvora/vue";
export * from "@themvora/core";

export {
  computeFingerprint,
  resolveThemeFromCookies,
  createNuxtThemeBootstrapScript,
  themvoraCookieNames,
  parseCookieHeader,
} from "./server";
export type {
  ResolveThemeFromCookiesOptions,
  NuxtThemeBootstrapOptions,
} from "./server";