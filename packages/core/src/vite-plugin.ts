/**
 * Themvora Vite plugin — injects the zero-flash bootstrap script and the
 * pre-paint scrollbar CSS into the served HTML.
 *
 * Imported from the `@themvora/core/vite` subpath. Use with the Vite
 * configuration of vanilla or framework apps that render HTML on the
 * server.
 *
 * @packageDocumentation
 */
import type { ThemeDefinition, ThemeMode } from "./model/theme";
import { createThemeBootstrapScript, createThemeReadoutScript } from "./bootstrap";
import { toBootstrapConfig, type ThemvoraConfig } from "./app-config";
import { loadThemvoraConfig } from "./config-loader";
import {
  createPrePaintScrollbarScript,
  type PrePaintScrollbarOptions,
} from "./scrollbar/pre-paint";
import type { ThemeTransitionOptions } from "./transition";
import { serializeScriptJson } from "./script-safety";
import { createThemePrePaintCss } from "./prepaint";
import { getBuiltInThemes } from "./built-in-themes";
import { resolveInitialTheme } from "./resolver";
import { resolveThemeReference } from "./theme-reference";
import { validateTheme } from "./validate-theme";

/**
 * The deprecated inline form of the theme configuration: the registry, the
 * fallback theme, the initial mode/family, and the persistence key and prefix,
 * passed straight to {@link themvoraVitePlugin}.
 *
 * @typeParam T - The theme definition type used by the application.
 *
 * @deprecated Declare this once in `theme.config.ts` via
 * {@link defineThemvoraConfig} instead. The plugin discovers that file by
 * convention, so there is nothing to pass — and passing it here as well is
 * exactly the duplication that lets the pre-paint script and the runtime drift
 * apart. A drift is visible: the script paints `system` while the runtime
 * resolves `light`, the runtime corrects what the script painted, and the
 * visitor sees a flash. These options are still honoured when the app has no
 * discoverable config, so existing setups keep working.
 *
 * @see {@link themvoraVitePlugin}
 */
export interface ThemvoraThemeConfig<T extends ThemeDefinition> {
  /** The theme definitions registered with the runtime. */
  themes: readonly T[];
  /** Theme name to fall back to when no persisted selection exists. */
  defaultTheme?: T["name"];
  /**
   * Mode used when no persisted selection exists. Defaults to the fallback
   * theme's own mode — whatever `defaultTheme` resolves to, so a
   * `defaultTheme="light"` app paints light from frame one.
   */
  initialMode?: ThemeMode;
  /** Family used when no persisted selection exists. */
  initialFamily?: string;
  /** localStorage key holding the persisted theme selection. Defaults to `"theme-selection"`. */
  storageKey?: string;
  /** CSS custom property prefix. Defaults to `"theme-"`. */
  prefix?: string;
  /**
   * Theme-change transition. `true` uses the defaults, `false` swaps
   * synchronously, and an object configures the animation.
   *
   * @see {@link ThemeTransitionOptions}
   */
  transition?: boolean | ThemeTransitionOptions;
  /**
   * Pre-paint hiding of the native scrollbar for the overlay scrollbar.
   *
   * @see {@link PrePaintScrollbarOptions}
   */
  scrollbar?: boolean | PrePaintScrollbarOptions;
}

/**
 * Options for {@link themvoraVitePlugin}: where the application configuration
 * lives, plus the concerns that only exist at build time.
 *
 * @typeParam T - The theme definition type used by the application.
 *
 * @see {@link themvoraVitePlugin}
 */
export interface ThemvoraVitePluginOptions<T extends ThemeDefinition> {
  /**
   * The application's theme configuration, when discovery is not enough.
   *
   * @remarks
   * Omit this. The plugin finds `theme.config.ts` at Vite's root by convention,
   * which is the whole point of the file — a path is only needed when the
   * configuration lives somewhere unusual. The object form exists for
   * programmatic setups that build a config at runtime.
   *
   * @example
   * ```ts
   * import { themvoraVitePlugin } from "@themvora/core/vite";
   *
   * export default defineConfig({
   *   plugins: [
   *     // Only when the file is not at the root.
   *     themvoraVitePlugin({ config: "./config/theme.config.ts" }),
   *   ],
   * });
   * ```
   *
   * @see {@link ThemvoraThemeConfig}
   */
  config?: ThemvoraThemeConfig<T> | string;
  /**
   * The theme definitions registered with the runtime.
   *
   * @deprecated Pass {@link ThemvoraVitePluginOptions.config} instead — the same
   * object the provider spreads. Declaring the registry here as well means the
   * pre-paint script and the runtime are configured independently, which is how
   * they drift.
   */
  themes?: readonly T[];
  /**
   * Theme name to fall back to when no persisted selection exists.
   * @deprecated Pass {@link ThemvoraVitePluginOptions.config} instead.
   */
  defaultTheme?: T["name"];
  /**
   * Mode the pre-paint script uses when no persisted selection exists.
   * @deprecated Pass {@link ThemvoraVitePluginOptions.config} instead.
   */
  initialMode?: ThemeMode;
  /**
   * Family the pre-paint script uses when no persisted selection exists.
   * @deprecated Pass {@link ThemvoraVitePluginOptions.config} instead.
   */
  initialFamily?: string;
  /**
   * localStorage key holding the persisted theme selection.
   * @deprecated Pass {@link ThemvoraVitePluginOptions.config} instead.
   */
  storageKey?: string;
  /**
   * CSS custom property prefix.
   * @deprecated Pass {@link ThemvoraVitePluginOptions.config} instead.
   */
  prefix?: string;
  /**
   * Emit the render-blocking theme stylesheet generated from the declared
   * theme collection. Defaults to `true`.
   *
   * @remarks
   * The stylesheet is what themes a page when JavaScript is unavailable, and
   * what supplies the default light/dark fallback before the boot script runs.
   * Disabling it leaves only the script's inline variables — which means a
   * no-JavaScript visitor sees an unthemed document.
   */
  css?: boolean;
  /**
   * Emit the blocking pre-paint boot script. Defaults to `true`.
   *
   * @remarks
   * The script restores the persisted selection before the body is parsed.
   * Disabling it leaves the generated CSS fallback (the default theme and the
   * `system` light/dark pair) but cannot restore a saved non-default theme.
   */
  boot?: boolean;
  /** Hide native scrollbars before first paint by injecting the scrollbar
   *  pre-paint bootstrap script. `true` hides them (desktop), an options
   *  object keeps native bars on coarse-pointer devices unless `touch` is
   *  forced. Default `false` — the script is only needed when the page uses
   *  the Themvora overlay scrollbar. */
  scrollbar?: boolean | import("./scrollbar/pre-paint").PrePaintScrollbarOptions;
  /**
   * Make React's first render commit synchronously, so the browser's first
   * painted frame is already the app. Defaults to `true`.
   *
   * @remarks
   * React's concurrent root *schedules* the initial commit, so the browser can
   * paint a frame with the root still empty before React commits — one frame,
   * ~33 ms, plainly visible as the UI blinking on reload. It cannot be fixed
   * from inside the app's component tree: that frame is painted before any of
   * the app's React code runs, so no provider, insertion effect or layout effect
   * is in time. It has to happen at the root, and this plugin is the one place
   * that can reach the root without the application writing root-level code.
   *
   * It works by resolving `react-dom/client` to a shim that wraps `createRoot`
   * and flushes its **first** `render` call with `flushSync`; every later render
   * keeps React's normal concurrent scheduling. Three things keep the reach
   * narrow: the alias applies only to imports from **application** code, so a
   * dependency's own root is left alone; it is skipped entirely in an **SSR
   * build**, where nothing is painted and the shim could only break the build;
   * and `hydrateRoot` is never wrapped, so hydration is unaffected. React is not
   * required to be present — if nothing imports `react-dom/client`, the shim is
   * never loaded.
   *
   * Note this only closes the window *after* the bundle starts running. The
   * window before it — during which the document paints with an empty root — can
   * only be closed by markup in the HTML, i.e. by prerendering.
   *
   * Set `false` to opt out. `createThemeRoot()` remains the explicit opt-in for
   * apps that want Themvora to own the root outright.
   */
  syncFirstRender?: boolean;
  /**
   * Module that exports `render(): string` — the app's markup, server-rendered.
   * Set it and the plugin prerenders `#root` in the **dev server** as well as
   * in a build.
   *
   * @remarks
   * A production build can prerender with a separate step, but `vite dev` serves
   * the entry as individual unbundled modules: the first paint can be *seconds*
   * away from the app appearing, and `#root` is empty for that whole window.
   * Measured in `examples/apps/react` on a dev server: a reload painted a blank
   * frame
   * and did not show the app for ~7.9 s.
   *
   * With this set, `transformIndexHtml` renders the app on each dev page load and
   * injects the markup into `#root`, so the document's first paint has content.
   * The cost is one server render per page load, in dev only.
   *
   * @defaultValue `"/src/entry-server.tsx"` — the conventional path. If the
   * module is not there the render is skipped and nothing changes, so apps that
   * follow the convention get this for free and apps that do not are unaffected.
   * Pass `null` to opt out.
   */
  ssrEntry?: string | null;
  /**
   * `id` of the element `ssrEntry`'s markup is injected into.
   * @defaultValue `"root"`
   */
  ssrContainer?: string;
}

/**
 * Structural twin of Vite's `HtmlTagDescriptor`. Kept local so the plugin does
 * not need a hard dependency on `vite` types; the shape is assignable to
 * Vite's `IndexHtmlTransformResult` in Vite 4 through 8.
 */
export interface ThemvoraViteInjectedTag {
  tag: string;
  attrs?: Record<string, string | boolean | undefined>;
  children?: string;
  injectTo?: "head" | "body" | "head-prepend" | "body-prepend";
}

export interface ThemvoraVitePlugin {
  name: string;
  enforce: "pre";
  transformIndexHtml(
    html: string,
    ctx?: unknown,
  ):
    | string
    | ThemvoraViteInjectedTag[]
    | { html: string; tags: ThemvoraViteInjectedTag[] }
    | Promise<string | ThemvoraViteInjectedTag[] | { html: string; tags: ThemvoraViteInjectedTag[] }>;
  resolveId?(
    source: string,
    importer: string | undefined,
    // Deliberately `unknown`, not a hand-rolled shape. Vite's own `options`
    // parameter carries `attributes` / `ssr` / `isEntry` / `custom`, and a
    // narrower type here makes the whole plugin unassignable to `PluginOption`
    // (parameters are contravariant) — which is exactly how this broke a user's
    // `vite.config.ts`. The implementation narrows it.
    options?: unknown,
  ): string | null | undefined | Promise<string | null | undefined>;
  load?(id: string): string | null | undefined | Promise<string | null | undefined>;
  configResolved?(config: { build?: { ssr?: unknown } }): void;
  configureServer?(server: unknown): void;
}

/**
 * Virtual module the plugin resolves `react-dom/client` to when
 * `syncFirstRender` is on. The leading NUL keeps Vite from treating it as a
 * real file path.
 */
/**
 * Where an app's server entry conventionally lives. Used as the default for
 * `ssrEntry`, so the dev prerender works without configuration in the common
 * layout and silently does nothing elsewhere.
 */
const DEFAULT_SSR_ENTRY = "/src/entry-server.tsx";

const REACT_DOM_CLIENT_ID = "virtual:themvora/react-dom-client";
const RESOLVED_REACT_DOM_CLIENT_ID = "\0" + REACT_DOM_CLIENT_ID;
const REACT_DOM_CLIENT_WRAPPER_ID = "virtual:themvora/react-dom-client-wrapper";
const RESOLVED_REACT_DOM_CLIENT_WRAPPER_ID = "\0" + REACT_DOM_CLIENT_WRAPPER_ID;

/**
 * Builds the shim source — a pure re-export, with no local `createRoot` binding.
 *
 * That separation is load-bearing, and it took a broken SSR build to find.
 * Declaring the wrapper in the same module as `export * from "react-dom/client"`
 * makes the name `createRoot` resolve to the *local* binding, so a bundler
 * rewrites the real module's export to the local one and emits
 * `createSyncFirstRoot(createRoot, …)` — a temporal-dead-zone error at module
 * evaluation. Re-exporting from a separate module keeps the two bindings in
 * different scopes, so nothing can be confused.
 */
function buildShim(wrapperId: string): string {
  return [
    `export * from ${JSON.stringify(wrapperId)};`,
    `export { __tvCreateRoot as createRoot } from ${JSON.stringify(wrapperId)};`,
  ].join("\n");
}

/**
 * Builds the wrapper module: the only place that imports the real
 * `react-dom/client`, and the only place with a local `createRoot`.
 *
 * Ids are resolved absolute — importing the bare specifier would be re-aliased
 * by this same plugin and recurse.
 */
function buildWrapper(clientId: string, reactDomId: string, coreId: string): string {
  return [
    `import { createRoot as __tvRealCreateRoot } from ${JSON.stringify(clientId)};`,
    `import { flushSync as __tvFlushSync } from ${JSON.stringify(reactDomId)};`,
    `import { createSyncFirstRoot as __tvWrap } from ${JSON.stringify(coreId)};`,
    // `onlyFirstRoot` keeps the flush out of React's commit phase: libraries
    // legitimately call `createRoot` from an effect (Themvora's own
    // `ThemeScrollbar` does, once per arrow), and flushing there makes React log
    // "flushSync was called from inside a lifecycle method". The application's
    // own root is created at module scope, before anything renders, so it is
    // always the first one.
    `export const __tvCreateRoot = __tvWrap(__tvRealCreateRoot, __tvFlushSync, { onlyFirstRoot: true });`,
  ].join("\n");
}

/** True when a resolved path belongs to a dependency rather than app code. */
function isDependencyPath(id: string | undefined): boolean {
  if (!id) return false;
  return id.replace(/\\/g, "/").includes("/node_modules/");
}

/** A `<themvora-provider>` found in the raw `index.html`. */
interface ParsedProvider {
  attributes: Record<string, string>;
}

type ParsedProviderThemes =
  | { kind: "none" }
  | { kind: "names"; names: string[] }
  | { kind: "definitions"; themes: ThemeDefinition[] }
  | { kind: "invalid"; raw: string };

const PROVIDER_TAG_RE =
  /<themvora-provider\b((?:"[^"]*"|'[^']*'|[^>])*)>/i;
const HTML_ATTRIBUTE_RE =
  /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/** Decode the small HTML-entity set an attribute value realistically carries. */
function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

/**
 * Parse the first `<themvora-provider>` in the page.
 *
 * The plugin only validates a provider that is present in the document it
 * transforms. A framework may insert one later from a component tree; that is
 * runtime state and cannot be inspected here, which is why the plugin's
 * shipped config remains the single source of truth for the pre-paint assets.
 */
function parseProviderHtml(html: string): ParsedProvider | null {
  const match = PROVIDER_TAG_RE.exec(html);
  if (!match) return null;

  const attributes: Record<string, string> = {};
  const source = match[1] ?? "";
  HTML_ATTRIBUTE_RE.lastIndex = 0;
  let attribute: RegExpExecArray | null;
  while ((attribute = HTML_ATTRIBUTE_RE.exec(source)) !== null) {
    const name = attribute[1]?.toLowerCase();
    if (!name) continue;
    const value = attribute[2] ?? attribute[3] ?? attribute[4] ?? "";
    attributes[name] = decodeHtmlAttribute(value);
  }
  return { attributes };
}

function parseProviderThemes(provider: ParsedProvider): ParsedProviderThemes {
  const raw = provider.attributes.themes;
  if (raw === undefined) return { kind: "none" };

  const value = raw.trim();
  if (value.length === 0) return { kind: "none" };

  if (value.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (theme) =>
            typeof theme === "object" &&
            theme !== null &&
            typeof (theme as { name?: unknown }).name === "string",
        )
      ) {
        return { kind: "definitions", themes: parsed as ThemeDefinition[] };
      }
    } catch {
      // Reported by the caller as an invalid provider attribute.
    }
    return { kind: "invalid", raw };
  }

  return {
    kind: "names",
    names: value.split(/[\s,]+/).filter((name) => name.length > 0),
  };
}

/** First registration wins, matching the runtime registry. */
function uniqueThemes<T extends ThemeDefinition>(themes: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const theme of themes) {
    const name = String(theme.name);
    if (seen.has(name)) continue;
    seen.add(name);
    result.push(theme);
  }
  return result;
}

/** The catalog and diagnostics produced by reconciling config with the HTML. */
interface PreparedPluginConfig {
  config: ThemvoraConfig<ThemeDefinition>;
  errors: string[];
  warnings: string[];
}

/**
 * Reconcile the discovered `theme.config.ts` with the provider declared in the
 * page, and validate the result.
 *
 * A mismatch here is not cosmetic. The pre-paint script paints the plugin's
 * resolution; the provider then adopts what was painted, but if the two
 * disagree about the catalog or fallback, a later selection or reload resolves
 * differently and the page visibly corrects itself. Failing the build is the
 * only honest outcome — a warning would ship exactly the flash this plugin
 * exists to remove.
 */
function preparePluginConfig(
  discovered: ThemvoraConfig<ThemeDefinition> | null,
  provider: ParsedProvider | null,
): PreparedPluginConfig {
  const errors: string[] = [];
  const warnings: string[] = [];

  const declared = uniqueThemes(
    discovered ? discovered.themes : getBuiltInThemes(),
  );
  const parsedThemes = provider
    ? parseProviderThemes(provider)
    : ({ kind: "none" } as const);

  let catalog = declared;
  let providerCatalog: ThemeDefinition[] | null = null;

  if (parsedThemes.kind === "invalid") {
    errors.push(
      `The "themes" attribute on <themvora-provider> is not usable. Expected a ` +
        `space-separated list of registered theme names or a JSON array of ` +
        `theme definitions, received ${JSON.stringify(parsedThemes.raw)}.`,
    );
  } else if (parsedThemes.kind === "definitions") {
    catalog = uniqueThemes([...declared, ...parsedThemes.themes]);
    providerCatalog = parsedThemes.themes;
  } else if (parsedThemes.kind === "names") {
    const byName = new Map(catalog.map((theme) => [String(theme.name), theme]));
    const resolved: ThemeDefinition[] = [];
    const unknown: string[] = [];
    for (const name of parsedThemes.names) {
      const theme = byName.get(name);
      if (theme) resolved.push(theme);
      else unknown.push(name);
    }
    if (unknown.length > 0) {
      errors.push(
        `<themvora-provider> lists ${unknown
          .map((name) => `"${name}"`)
          .join(", ")}, but the generated theme collection does not declare ` +
          `${unknown.length === 1 ? "it" : "them"}. Add ${
            unknown.length === 1 ? "the theme" : "the themes"
          } to theme.config.ts (or pass the same definitions to the plugin), ` +
          `or remove ${unknown.length === 1 ? "it" : "them"} from the "themes" attribute.`,
      );
    }
    providerCatalog = resolved.length > 0 ? resolved : null;
  }

  const providerDefault = provider?.attributes["default-theme"]?.trim();
  const providerFamily = provider?.attributes["initial-family"]?.trim();

  let providerMode: ThemeMode | undefined;
  const rawMode = provider?.attributes["initial-mode"];
  if (rawMode !== undefined) {
    const normalized = rawMode.trim().toLowerCase();
    if (
      normalized === "light" ||
      normalized === "dark" ||
      normalized === "system"
    ) {
      providerMode = normalized;
    } else {
      errors.push(
        `The "initial-mode" attribute on <themvora-provider> is ` +
          `${JSON.stringify(rawMode)}. Expected "light", "dark" or "system".`,
      );
    }
  }

  // The provider's full JSON definitions are visible to the plugin, so they can
  // participate in the pre-paint assets. When the provider also names a default
  // or mode, those attributes describe the same runtime configuration the
  // provider will create, and the pre-paint config must follow them — otherwise
  // the build would reject a working runtime-only catalog as a "mismatch".
  const providerOwnsCatalog = parsedThemes.kind === "definitions";

  const config: ThemvoraConfig<ThemeDefinition> = {
    ...(discovered ?? { themes: catalog }),
    themes: discovered ? catalog : (providerCatalog ?? catalog),
    ...(!discovered
      ? {
          ...(providerDefault ? { defaultTheme: providerDefault } : {}),
          ...(providerMode !== undefined ? { initialMode: providerMode } : {}),
          ...(providerFamily ? { initialFamily: providerFamily } : {}),
        }
      : {}),
    ...(providerOwnsCatalog && providerDefault
      ? { defaultTheme: providerDefault }
      : {}),
    ...(providerOwnsCatalog && providerMode !== undefined
      ? { initialMode: providerMode }
      : {}),
    ...(providerOwnsCatalog && providerFamily
      ? { initialFamily: providerFamily }
      : {}),
  };

  if (!discovered && provider) {
    warnings.push(
      "[themvora] No theme.config.ts was found, so the Vite plugin used the " +
        "provider's attributes and the built-in catalog. Declare the catalog " +
        "once in theme.config.ts to keep the pre-paint assets and the runtime " +
        "on one configuration.",
    );
  }

  if (!discovered && !provider) {
    errors.push(
      "themvoraVitePlugin needs the theme registry: add a `theme.config.ts` at " +
        "the project root, or pass `config` — the object `defineThemvoraConfig` " +
        "returns (or a path to it). The deprecated inline `themes` option still " +
        "works.",
    );
  }

  const effectiveCatalog = uniqueThemes(config.themes);

  if (
    config.defaultTheme !== undefined &&
    resolveThemeReference(effectiveCatalog, config.defaultTheme) === null
  ) {
    errors.push(
      `The default theme "${config.defaultTheme}" is not in the generated theme ` +
        `collection. Add it to theme.config.ts, or correct the default theme.`,
    );
  }

  if (provider) {
    const providerTarget = providerCatalog ?? effectiveCatalog;

    if (
      providerDefault &&
      resolveThemeReference(providerTarget, providerDefault) === null
    ) {
      errors.push(
        `The "default-theme" attribute on <themvora-provider> names ` +
          `"${providerDefault}", which is not in the catalog the plugin ` +
          `generates. Add it to theme.config.ts or remove the attribute.`,
      );
    }

    // Compare the *resolved* theme, not the raw strings: a provider naming a
    // family and a config naming that family's light variant are the same
    // configuration, and must not be rejected as a mismatch.
    const pluginSelection = resolveInitialTheme({
      themes: effectiveCatalog,
      ...(config.defaultTheme !== undefined
        ? { defaultTheme: config.defaultTheme }
        : {}),
      ...(config.initialMode !== undefined
        ? { mode: config.initialMode }
        : {}),
      ...(config.initialFamily !== undefined
        ? { family: config.initialFamily }
        : {}),
    });
    const providerSelection = resolveInitialTheme({
      themes: providerTarget,
      ...(providerDefault ?? config.defaultTheme
        ? { defaultTheme: providerDefault ?? config.defaultTheme }
        : {}),
      ...(providerMode ?? config.initialMode
        ? { mode: providerMode ?? config.initialMode }
        : {}),
      ...(providerFamily ?? config.initialFamily
        ? { family: providerFamily ?? config.initialFamily }
        : {}),
    });

    const pluginTheme = String(pluginSelection.theme.name);
    const providerTheme = String(providerSelection.theme.name);

    if (
      pluginTheme !== providerTheme ||
      pluginSelection.selection.mode !== providerSelection.selection.mode
    ) {
      errors.push(
        `The Vite plugin and <themvora-provider> resolve different initial ` +
          `themes. Plugin: "${pluginTheme}" (${pluginSelection.selection.mode}); ` +
          `provider: "${providerTheme}" (${providerSelection.selection.mode}). ` +
          `Declare defaultTheme/initialMode once in theme.config.ts and remove ` +
          `the conflicting provider attribute, or make the attribute match.`,
      );
    }
  }

  // Token validation is a warning: a partial theme is a supported runtime
  // registration (the CSS binding emits the groups it has), so failing a build
  // over one would reject configurations that work today. Built-in themes are
  // shipped and already gated by the package's own tests.
  const builtInNames = new Set(
    getBuiltInThemes().map((theme) => String(theme.name)),
  );
  for (const theme of effectiveCatalog) {
    const name = String(theme.name);
    if (builtInNames.has(name)) continue;
    const result = validateTheme(theme, { themes: effectiveCatalog });
    if (result.valid) continue;
    const sample = result.issues
      .slice(0, 3)
      .map((issue) => issue.path)
      .join(", ");
    warnings.push(
      `[themvora] Theme "${name}" is missing ${result.issues.length} required ` +
        `semantic token${result.issues.length === 1 ? "" : "s"} (${sample}${
          result.issues.length > 3 ? ", …" : ""
        }). The generated CSS will emit only the tokens it declares.`,
    );
  }

  return { config, errors, warnings };
}

/**
 * Vite plugin that injects the theme bootstrap as a blocking inline script at
 * the top of `index.html`, so the persisted theme is applied before the first
 * paint. Prevents the flash-of-wrong-theme on reload for client-rendered apps.
 *
 * @typeParam T - The theme definition type used by the application.
 * @param options - Build-time options. Optional; the default discovery path
 *   needs none.
 * @returns A Vite plugin, to be added to `plugins`.
 *
 * @example
 * ```ts
 * // Nothing to configure beyond registering the plugin.
 * import { themvoraVitePlugin } from "@themvora/core/vite";
 *
 * export default defineConfig({
 *   plugins: [react(), themvoraVitePlugin()],
 * });
 * ```
 *
 * @remarks
 * **Config discovery.** The plugin looks for the application's
 * `theme.config.ts` in Vite's root (`config.root`, or `process.cwd()` when
 * unset), trying `theme.config.ts`, `.tsx`, `.mts`, `.mjs`, `.js` and `.cjs` in
 * that order. The file must have a default export — the object
 * {@link defineThemvoraConfig} returns. Discovery goes through Vite's own
 * `loadConfigFromFile`, so a TypeScript config resolves its imports exactly as
 * `vite.config.ts` does.
 *
 * **What it injects.** Three things, all derived from that one configuration
 * and emitted in this order (`head-prepend`, `enforce: "pre"`):
 *
 * 1. a render-blocking `<style>` from {@link createThemePrePaintCss} — the
 *    fallback theme, the `prefers-color-scheme` dark fallback when the mode is
 *    `"system"`, and one rule per declared theme;
 * 2. `window.__THEMVORA_CONFIG__`, the serializable
 *    {@link ThemeBootstrapConfig} projection the provider reads;
 * 3. the classic blocking bootstrap script that restores the persisted
 *    selection.
 *
 * When `scrollbar` is enabled, the pre-paint scrollbar script follows. The
 * stylesheet is what themes a page with JavaScript disabled; the script is what
 * restores a saved non-default theme before the body is parsed.
 *
 * **Validation.** The provider in the transformed HTML is parsed and checked
 * against the config: unknown theme names, a default theme outside the
 * generated collection, an invalid `initial-mode`, and a provider that resolves
 * a different initial theme all fail the build with an actionable message.
 * Provider JSON theme definitions are added to the generated collection, so a
 * runtime-only catalog the plugin can see is still painted.
 *
 * **Development.** `transformIndexHtml` runs on every dev page load, so the
 * injected resources are always current for the running process. The *discovered
 * config* is resolved once and memoized, so editing `theme.config.ts` needs a
 * dev-server restart; editing `vite.config.ts` restarts Vite anyway, so the
 * plugin's own options do not.
 *
 * **Production.** The resources are injected into the generated HTML at build
 * time and run before the application bundle. They are not emitted as separate
 * chunks.
 *
 * **Limitations.** The plugin only validates a provider that is present in the
 * document it transforms; a provider inserted later from framework state is
 * runtime-only. It does not serve SSR HTML: frameworks that render on the
 * server (Next.js, Nuxt, Remix, Astro) have their own packages, which emit the
 * same bootstrap from the server. Themes registered imperatively with
 * `runtime.use()` after load are not in the generated CSS.
 *
 * @see {@link ThemvoraVitePluginOptions}
 */
export function themvoraVitePlugin<T extends ThemeDefinition>(
  options: ThemvoraVitePluginOptions<T> = {},
): ThemvoraVitePlugin {
  const name = "themvora:vite";
  // The element `ssrEntry` fills. Vite's own template ships exactly
  // `<div id="root"></div>`, and the dev prerender only fires when that literal
  // is present — a different container simply keeps today's behaviour rather
  // than guessing where the markup belongs.
  const emptyContainer = `<div id="${options.ssrContainer ?? "root"}"></div>`;

  let scrollbarScript: string | null = null;

  // One configuration, two consumers. When `config` is given it *is* the theme
  // configuration — the same object the provider spreads — and the deprecated
  // inline options are ignored rather than merged, so there is exactly one
  // place a value can come from.
  const themeOptions: ThemvoraThemeConfig<T> | ThemvoraVitePluginOptions<T> =
    options.config && typeof options.config === "object"
      ? options.config
      : (options as ThemvoraVitePluginOptions<T>);

  /**
   * Generated pre-paint assets, memoized on their serializable configuration.
   *
   * Keyed on the config rather than on the first call because the effective
   * catalog can include themes the provider declared in the HTML; a dev reload
   * after editing that markup must regenerate rather than serve the old plan.
   */
  let generated: { key: string; script: string; css: string } | null = null;

  function configKey(config: ThemvoraConfig<ThemeDefinition>): string {
    try {
      return JSON.stringify(toBootstrapConfig(config));
    } catch {
      return config.themes.map((theme) => String(theme.name)).join("|");
    }
  }

  /**
   * Builds the two pre-paint resources from one configuration.
   *
   * The CSS and the script are produced from the same `buildBootstrapPlan`, so
   * the fallback theme, the system-mode pair and every theme name are identical
   * in both. There is no second configuration to keep in step.
   */
  function generatePrePaint(config: ThemvoraConfig<ThemeDefinition>): {
    script: string;
    css: string;
  } {
    const themes = config.themes;
    if (!themes?.length) {
      throw new Error(
        "[themvora] themvoraVitePlugin needs the theme registry: add a " +
          "`theme.config.ts` at the project root, or pass `config` — the object " +
          "`defineThemvoraConfig` returns (or a path to it). The deprecated " +
          "inline `themes` option still works.",
      );
    }

    const key = configKey(config);
    if (generated?.key === key) return generated;

    const script =
      options.boot === false
        ? ""
        : createThemeBootstrapScript({ ...toBootstrapConfig(config), themes });
    const css = options.css === false ? "" : createThemePrePaintCss(config);

    generated = { key, script, css };
    return generated;
  }

  function getScrollbarScript(): string | null {
    if (options.scrollbar === undefined || options.scrollbar === false) {
      return null;
    }
    if (scrollbarScript === null) {
      scrollbarScript = createPrePaintScrollbarScript(
        options.scrollbar === true
          ? {}
          : options.scrollbar,
      );
    }
    return scrollbarScript;
  }

  // The shim exists to fix a *browser* first paint, so it must never apply to
  // an SSR build. There it can do no good — nothing is painted — and it breaks
  // one: `@themvora/react` imports `react-dom/client`, so an SSR bundle would
  // pull the shim in and evaluate it in Node.
  let isSsrBuild = false;
  let projectRoot = "";
  let viteLogger: { warn(message: string): void } | null = null;

  /** Report a build-time configuration warning through Vite when available. */
  function warn(message: string): void {
    if (viteLogger) {
      viteLogger.warn(message);
      return;
    }
    // A unit test calls `transformIndexHtml` without a Vite config, so there is
    // no logger to carry the warning. Keep the output clean there; a real dev
    // server and build always have one.
    if (
      typeof process !== "undefined" &&
      process.env?.NODE_ENV === "test"
    ) {
      return;
    }
    console.warn(message);
  }

  /** Conventional config filenames, in resolution order. */
  const CONFIG_FILES = [
    "theme.config.ts",
    "theme.config.tsx",
    "theme.config.mts",
    "theme.config.mjs",
    "theme.config.js",
    "theme.config.cjs",
  ];

  /**
   * Whether a watched path is one of the conventional config filenames.
   *
   * Matched on the basename so it works for a config passed as a relative path,
   * an absolute path, and the platform's own separators.
   */
  function isThemeConfigFile(file: string): boolean {
    const name = file.replace(/\\/g, "/").split("/").pop() ?? "";
    return CONFIG_FILES.includes(name);
  }

  let appConfig: ThemvoraConfig<ThemeDefinition> | null | undefined;

  /**
   * Resolves the application configuration.
   *
   * `config` may be the object itself or a path to it; when neither is given the
   * conventional `theme.config.*` at the project root is used.
   *
   * @returns The configuration, or `null` when the app has none.
   *
   * @remarks
   * Memoized per *file version*, not for the lifetime of the process. The dev
   * server invalidates this when `theme.config.ts` changes (see
   * `configureServer`), and a build resolves it once.
   *
   * The memo used to be permanent, which made an edit to the catalog, the
   * fallback theme or `transition` look ignored: the plugin kept serving assets
   * derived from the configuration the server started with, and only a restart
   * picked the change up. That is indistinguishable from a configuration option
   * that does not work — which is exactly how it was reported.
   */
  async function resolveAppConfig(): Promise<ThemvoraConfig<ThemeDefinition> | null> {
    if (appConfig !== undefined) return appConfig;

    if (options.config && typeof options.config === "object") {
      appConfig = options.config as ThemvoraConfig<ThemeDefinition>;
      return appConfig;
    }

    const loaded = (await loadThemvoraConfig<ThemeDefinition>(
      projectRoot,
      typeof options.config === "string" ? options.config : undefined,
    )) as ThemvoraConfig<ThemeDefinition> | null;

    // The deprecated inline options remain a supported source when the app has
    // no discoverable config, so existing setups keep working. A discovered
    // config always wins: it is the one object the provider also consumes.
    appConfig =
      loaded ??
      ((themeOptions as ThemvoraThemeConfig<T>).themes?.length
        ? (themeOptions as unknown as ThemvoraConfig<ThemeDefinition>)
        : null);
    return appConfig;
  }

  // Kept only so the dev server can prerender (see `ssrEntry`). Absent in a
  // build, which is how `transformIndexHtml` tells the two apart.
  let devServer: {
    ssrLoadModule(id: string): Promise<Record<string, unknown>>;
    pluginContainer?: {
      resolveId(
        id: string,
        importer?: string,
        options?: { skipSelf?: boolean },
      ): Promise<{ id: string } | null>;
    };
  } | null = null;

  return {
    name,
    enforce: "pre",

    configResolved(config: {
      build?: { ssr?: unknown };
      root?: string;
      command?: string;
      mode?: string;
      logger?: { warn(message: string): void };
    }) {
      isSsrBuild = Boolean(config.build?.ssr);
      projectRoot = config.root ?? process.cwd();
      viteLogger = config.logger ?? null;
    },

    configureServer(server: unknown) {
      devServer = server as typeof devServer;

      // `theme.config.ts` is not imported by the application, so Vite has no
      // reason to invalidate anything when it changes: the file could be edited
      // and the served HTML kept the stylesheet, the configuration and the
      // blocking script derived from the version the server started with.
      //
      // Every option in that file — the catalog, `defaultTheme`, `initialMode`,
      // `storageKey`, `prefix`, `transition` — therefore appeared to be ignored
      // until the process was restarted. Drop the memo and reload, so an edit
      // behaves the way every other config edit in Vite does.
      const dev = server as {
        watcher?: { on(event: string, handler: (file: string) => void): void };
        hot?: { send(payload: { type: string }): void };
        ws?: { send(payload: { type: string }): void };
      };

      const invalidate = (file: string): void => {
        if (!isThemeConfigFile(file)) return;
        appConfig = undefined;
        (dev.hot ?? dev.ws)?.send({ type: "full-reload" });
      };

      dev.watcher?.on("change", invalidate);
      dev.watcher?.on("add", invalidate);
      dev.watcher?.on("unlink", invalidate);
    },

    // --- synchronous first render ------------------------------------------
    // `react-dom/client` is resolved to a shim so the app does not have to call
    // `flushSync` (or use `createThemeRoot`) to avoid the empty-root frame. The
    // alias is applied here rather than via `resolve.alias` because a plugin
    // cannot add config from inside itself, and `resolveId` with `enforce: "pre"`
    // runs first. `skipSelf` below is what stops the shim's own import of the
    // real module from being re-aliased.
    ...(options.syncFirstRender === false
      ? {}
      : {
          resolveId(source: string, importer: string | undefined, resolveOptions?: unknown) {
            if (isSsrBuild) return null;

            const internal =
              (resolveOptions as { custom?: { themvoraInternal?: boolean } } | undefined)
                ?.custom?.themvoraInternal === true;

            // Our own resolution of the real module (see `load`). `skipSelf`
            // does not skip this plugin when resolution is initiated from `load`
            // in dev, and the call has no importer to key off — so the caller
            // marks itself instead. Without this the wrapper imports the shim,
            // which imports the wrapper: an unresolvable cycle that Vite reports
            // as "Failed to resolve import virtual:themvora/react-dom-client"
            // and then as an internal server error.
            if (internal) return null;

            // The shim re-exports from the wrapper. This specifier is emitted by
            // this plugin and never by the app, so resolve it unconditionally —
            // before the self-guard below, which would otherwise reject it.
            if (source === REACT_DOM_CLIENT_WRAPPER_ID) {
              return RESOLVED_REACT_DOM_CLIENT_WRAPPER_ID;
            }

            if (source !== "react-dom/client") return null;

            // Never alias our own modules' import of the *real* module. The
            // wrapper imports it, and `skipSelf` does not skip this plugin when
            // resolution is initiated from `load` — so in dev the wrapper ended
            // up importing the shim, which imports the wrapper, and Vite
            // reported "Failed to resolve import virtual:themvora/...".
            // (Rollup's build-time `skipSelf` does behave, which is why only the
            // dev server broke.)
            if (
              importer === RESOLVED_REACT_DOM_CLIENT_ID ||
              importer === RESOLVED_REACT_DOM_CLIENT_WRAPPER_ID
            ) {
              return null;
            }

            // Application code only. A dependency's root is not the app's first
            // paint, and silently changing how another library mounts its tree
            // is not this plugin's business — so a `createRoot` imported from
            // inside node_modules resolves to the real module, untouched.
            if (isDependencyPath(importer)) return null;

            return RESOLVED_REACT_DOM_CLIENT_ID;
          },
          async load(this: {
            resolve(
              source: string,
              importer?: string,
              options?: { skipSelf?: boolean },
            ): Promise<{ id: string } | null>;
          }, id: string) {
            if (
              id !== RESOLVED_REACT_DOM_CLIENT_ID &&
              id !== RESOLVED_REACT_DOM_CLIENT_WRAPPER_ID
            ) {
              return null;
            }
            const internal = { custom: { themvoraInternal: true } };
            const [client, reactDom, core] = await Promise.all([
              this.resolve("react-dom/client", undefined, { skipSelf: true, ...internal }),
              this.resolve("react-dom", undefined, { skipSelf: true, ...internal }),
              this.resolve("@themvora/core", undefined, { skipSelf: true, ...internal }),
            ]);
            if (!client || !reactDom || !core) {
              // React (or Themvora itself) is not resolvable here. Fall back to
              // the real module rather than failing the build: the shim only
              // exists to fix a React artifact.
              return id === RESOLVED_REACT_DOM_CLIENT_ID
                ? `export * from "react-dom/client";`
                : `export { createRoot } from "react-dom/client";`;
            }
            return id === RESOLVED_REACT_DOM_CLIENT_ID
              ? buildShim(REACT_DOM_CLIENT_WRAPPER_ID)
              : buildWrapper(client.id, reactDom.id, core.id);
          },
        }),

    async transformIndexHtml(html: string) {
      // One configuration drives the stylesheet, the boot script and the
      // runtime. The provider declares its configuration in the HTML, so
      // reconcile that declaration with the build-time config before emitting
      // anything: a divergence here is exactly the wrong-theme flash the plugin
      // exists to prevent.
      const resolved = await resolveAppConfig();
      const provider = parseProviderHtml(html);
      const prepared = preparePluginConfig(resolved, provider);

      if (prepared.errors.length > 0) {
        throw new Error(
          "[themvora] The Vite plugin and <themvora-provider> are not " +
            "configured consistently:\n  - " +
            prepared.errors.join("\n  - "),
        );
      }
      for (const warning of prepared.warnings) warn(warning);

      const assets = generatePrePaint(prepared.config);

      // Return the plain `HtmlTagDescriptor[]` form of `transformIndexHtml`,
      // which is valid across Vite 4–8. (The old `{ tags, order }` object form
      // was dropped in Vite 6, where the object result requires `html`.)
      //
      // Order is part of the contract: Vite inserts `head-prepend` tags in
      // array order, so the stylesheet is parsed and applied first, then the
      // configuration global, then the blocking script. The script can then
      // safely rely on both.
      const tags: ThemvoraViteInjectedTag[] = [];

      if (options.css !== false) {
        tags.push({
          tag: "style",
          attrs: {
            id: "themvora-pre-paint-css",
            "data-themvora": "pre-paint",
          },
          children: assets.css,
          injectTo: "head-prepend",
        });
      }

      // Only the serializable projection travels: themes are data, but a config
      // may also carry plugins and adapters, which are functions and cannot be
      // expressed in a global. Those stay provider props.
      //
      // `serializeScriptJson` (not `JSON.stringify`) because this string is the
      // body of a `<script>` element: a `</script` sequence inside a theme name
      // or token value would end the element. Escaping `<` alone, which this
      // block used to do, left `&`, `>` and the U+2028/U+2029 line terminators
      // uncovered — and the copy below it used `.replace(/</g, "<")`, a no-op,
      // because `"<"` is just `<` in a JS string literal.
      tags.push({
        tag: "script",
        attrs: { id: "themvora-config" },
        children:
          "window.__THEMVORA_CONFIG__=" +
          serializeScriptJson(toBootstrapConfig(prepared.config)) +
          ";",
        injectTo: "head-prepend",
      });

      if (assets.script) {
        tags.push({
          tag: "script",
          attrs: { id: "themvora-bootstrap" },
          children: assets.script,
          injectTo: "head-prepend",
        });
      }

      const scrollbar = getScrollbarScript();
      if (scrollbar) {
        tags.push({
          tag: "script",
          attrs: { id: "tv-scrollbar-bootstrap" },
          children: scrollbar,
          injectTo: "head-prepend",
        });
      }

      // Bootstrap readouts, at the END of the body: elements marked
      // `data-tv-readout` get the value the pre-paint script resolved. Without
      // it, a prerendered readout shows whatever theme the prerender used (the
      // default) and only corrects when the app's JavaScript lands — which reads
      // as the UI "fluctuating" on reload, for as long as the bundle takes.
      tags.push({
        tag: "script",
        attrs: { id: "themvora-readouts" },
        children: createThemeReadoutScript(),
        injectTo: "body",
      });

      // Dev only: make Themvora's stylesheet render-blocking.
      //
      // Vite injects CSS through JavaScript in dev, so any server-rendered or
      // prerendered markup paints *unstyled* until that JS runs — a one-frame
      // flash of unstyled content. A real `<link>` is render-blocking, so the
      // first paint is already styled. A build is unaffected: Vite emits the
      // stylesheet as a `<link>` itself.
      if (devServer?.pluginContainer) {
        try {
          const css = await devServer.pluginContainer.resolveId(
            "@themvora/core/scrollbar.css",
            undefined,
            { skipSelf: true },
          );
          if (css) {
            tags.push({
              tag: "link",
              attrs: {
                rel: "stylesheet",
                // `?direct` is required: Vite's dev server transforms a `.css`
                // request into a JS module (`__vite__updateStyle(...)`), which a
                // `<link rel="stylesheet">` is not allowed to use — the browser
                // refuses it. `?direct` returns the stylesheet itself.
                href: "/@fs/" + css.id.replace(/\\/g, "/") + "?direct",
                "data-themvora": "stylesheet",
              },
              injectTo: "head",
            });
          }
        } catch {
          // Not installed, or not resolvable from here — the app's own import
          // still works, it is just injected later as before.
        }
      }

      // Dev only: prerender `#root`. A build gets this from its own step, but
      // the dev server hands the browser unbundled modules, so the app can be
      // seconds behind the first paint — and `#root` is empty for all of it.
      const ssrEntry =
        options.ssrEntry === null ? null : (options.ssrEntry ?? DEFAULT_SSR_ENTRY);
      if (devServer && ssrEntry && html.includes(emptyContainer)) {
        try {
          const mod = await devServer.ssrLoadModule(ssrEntry);
          const render = mod.render;
          if (typeof render === "function") {
            const markup = (render as () => string)();
            return {
              html: html.replace(
                emptyContainer,
                `<div id="${options.ssrContainer ?? "root"}">${markup}</div>`,
              ),
              tags,
            };
          }
        } catch {
          // A failing prerender must not take the dev server down: fall back to
          // the empty root and let the client render it, exactly as before.
        }
      }

      return tags;
    },
  };
}
