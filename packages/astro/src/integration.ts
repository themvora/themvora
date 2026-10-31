import type { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";
import {
  buildThemeCssMap,
  createPrePaintScrollbarScript,
  getBuiltInThemes,
  resolveInitialTheme,
  type PrePaintScrollbarOptions,
  type ThemeDefinition,
  type ThemvoraConfig,
  type ThemvoraThemeConfig,
  type ThemeMode,
  toBootstrapConfig,
} from "@themvora/core";
// Build-time only: `@themvora/core/config` is a separate entry precisely so the
// runtime entry never pulls in node builtins.
import { loadThemvoraConfig } from "@themvora/core/config";
import {
  buildThemeBootstrapPayload,
  createBlockingScript,
  systemModeCSSTemplate,
} from "./blocking-script";
import { createNavigationScript } from "./navigation-script";
import { computeFingerprint } from "./fingerprint";

/**
 * Serializes a value for embedding in executable inline script content.
 *
 * @param value - The value to serialize.
 * @returns A JSON literal that is also a valid JavaScript expression.
 *
 * @remarks
 * `head-inline` injects the string as the **body of a `<script>` element**, so
 * a `</script` sequence anywhere in the theme data ends the element and turns
 * the rest of it into markup. `JSON.stringify` does not escape markup
 * delimiters, so they are replaced with `\uXXXX` escapes here — equivalent
 * inside a JSON string literal, inert to the HTML tokenizer. U+2028/U+2029 are
 * included because they were JavaScript line terminators before ES2019.
 *
 * Core keeps an internal copy of this for its own script builders; it is not
 * part of its public API, so this package carries its own rather than importing
 * a private module.
 */
function serializeScriptJson(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) return "null";
  return json.replace(/[<>&\u2028\u2029]/g, (char) =>
    char === "<"
      ? "\\u003c"
      : char === ">"
        ? "\\u003e"
        : char === "&"
          ? "\\u0026"
          : char === "\u2028"
            ? "\\u2028"
            : "\\u2029",
  );
}

/**
 * Options for {@link themvora}. Configures the theme registry the injected
 * bootstrap resolves against and the fallback selection used when no
 * persisted cookie is present.
 *
 * @see {@link themvora}
 */
export interface ThemvoraIntegrationOptions {
  /**
   * The provider's theme configuration — the same object you pass to
   * `getInitialThemeState` and `provider.astro`.
   *
   * @remarks
   * Prefer this to the individual `themes` / `defaultTheme` / `mode` options.
   * The integration owns the pre-paint script, the page owns the server
   * resolution and the provider owns the runtime; giving all three one object
   * is what stops them disagreeing about the registry, the fallback theme or the
   * initial mode — a disagreement the visitor sees as a flash of the wrong
   * theme, with any theme-name readout contradicting the control that set it.
   */
  config?: ThemvoraThemeConfig<ThemeDefinition>;
  /**
   * The theme registry the bootstrap resolves against. Defaults to the
   * built-in neutral themes when omitted or empty.
   *
   * @deprecated Pass {@link ThemvoraIntegrationOptions.config} instead.
   */
  themes?: readonly ThemeDefinition[];
  /**
   * Fallback theme name when no selection is persisted.
   * @deprecated Pass {@link ThemvoraIntegrationOptions.config} instead.
   */
  defaultTheme?: string;
  /**
   * Fallback mode when no selection is persisted. Defaults to the fallback
   * theme's own mode — the mode `defaultTheme` resolves to.
   *
   * @remarks
   * Pass `"system"` to follow `prefers-color-scheme` instead. Whatever you
   * choose, the React island that mounts the runtime must be given the same
   * value as its `initialMode`; the integration owns the script and the island
   * owns the runtime, and a disagreement between them makes the runtime correct
   * the paint the script already produced.
   *
   * @deprecated Pass {@link ThemvoraIntegrationOptions.config} instead — one
   * object, so there is nothing to mirror.
   */
  mode?: ThemeMode;
  /**
   * Set to `false` to skip injecting the pre-paint bootstrap script (e.g. when
   * you emit it yourself with `createBlockingScript`). Defaults to `true`.
   */
  injectBootstrap?: boolean;
  /**
   * Hide the native scrollbar before first paint, so the Themvora overlay
   * scrollbar (`ThemeScrollbar`) is the only scrollbar from the first frame —
   * the same guarantee the Vite plugin and the Nuxt module provide.
   *
   * `true` hides it on fine-pointer (desktop) devices; pass
   * `{ touch: true }` to hide it on coarse-pointer devices too. Defaults to
   * `false`.
   *
   * @remarks
   * This half only *hides* the bar — `<ThemeScrollbar />` draws the
   * replacement — so it is only meaningful on a page that mounts the overlay.
   * Enabling it without the overlay used to leave the page with no scrollbar at
   * all; the hiding is now released when the overlay unmounts, and
   * `provider.astro` additionally hands the native bar back at the end of
   * `<body>` if no overlay element was rendered. A misconfiguration therefore
   * degrades to a native scrollbar rather than to nothing.
   *
   * The injected script keeps native scrollbars on coarse-pointer devices
   * unless `touch` is set. Pass `scrollbar` to `provider.astro` instead when
   * you want the `tv-scrollbar` class in the server-rendered HTML (no script,
   * but then it applies to every device, like `@themvora/nuxt`).
   */
  scrollbar?: boolean | PrePaintScrollbarOptions;
  /**
   * Keep the resolved theme across Astro client-side navigations
   * (`<ClientRouter />`). Defaults to `true`.
   *
   * @remarks
   * Astro copies each incoming page's `<html>` attributes over the live root,
   * which would revert a client navigation to that page's build-time theme
   * until the island re-hydrates. The injected listener re-applies the live
   * state on `astro:before-swap`, before Astro reads those attributes. It is
   * inert on sites without `<ClientRouter />`.
   */
  navigation?: boolean;
}

/**
 * Builds the inline bootstrap string injected into every page's `<head>`: the
 * zero-flash blocking script plus, for `system` mode, a
 * `prefers-color-scheme: dark` stylesheet so dark-mode visitors are themed
 * even before the script runs.
 */
function buildBootstrap(
  fingerprint: string,
  themes: readonly ThemeDefinition[],
  defaultTheme: string | undefined,
  mode: ThemeMode | undefined,
): string {
  const themeCssMap = buildThemeCssMap(themes);

  const initial = resolveInitialTheme({
    themes,
    ...(defaultTheme !== undefined ? { defaultTheme } : {}),
    ...(mode !== undefined ? { mode } : {}),
  });

  // One resolution contract: the fallback family, its light/dark variables, the
  // theme-name lookup AND the fallback mode all come from the same
  // `resolveInitialTheme` call the client runtime makes, so the pre-paint script
  // cannot disagree with it. The mode was the one that used to disagree: `mode`
  // was forwarded to a plan that defaulted its own fallback to `"system"` while
  // this resolution defaulted to the fallback theme's mode, so an app that
  // omitted `mode` painted one theme and corrected to another.
  const {
    names,
    labels,
    defaults,
    family: fallbackFamily,
    families,
  } = buildThemeBootstrapPayload(themes, initial.selection.family);

  const script = createBlockingScript(fingerprint, themeCssMap, {
    // Always forward the mode resolved above rather than letting this function
    // apply its own `"system"` default. That default was a second, independent
    // source of truth for the same decision — the drift the shared applier
    // exists to prevent — and it disagreed with the resolution above whenever
    // `mode` was omitted, which is how a default-config Astro app flashed.
    mode: initial.selection.mode,
    family: fallbackFamily,
    // The registry's families, so the script can reject a `theme-family` cookie
    // left over from before the app changed its family set instead of naming a
    // family with no variables behind it.
    families,
    names,
    labels,
    defaults,
  });

  if (initial.selection.mode !== "system") {
    return script;
  }

  // `"system"` cannot be expressed as an inline `style` on <html>: the server
  // would have to commit to light or dark, and an inline declaration outranks
  // the media query meant to correct it. So the whole selection is expressed in
  // CSS instead — both schemes, no inline variables — which is also what keeps
  // an OS-dark visitor correct when scripts are blocked.
  const systemCss = systemModeCSSTemplate(defaults.light, defaults.dark);

  // `head-inline` injects this string as the *body* of a <script> tag, so the
  // stylesheet is installed as a DOM write rather than raw CSS. The guard keeps
  // the install idempotent: `provider.astro` can emit the same stylesheet
  // statically, and without the guard a second install stacks a duplicate sheet.
  return (
    `${script};(function(){try{` +
    `if(document.querySelector('style[data-themvora="system"]'))return;` +
    `var s=document.createElement("style");` +
    `s.setAttribute("data-themvora","system");` +
    `s.textContent=${serializeScriptJson(systemCss)};` +
    `document.head.appendChild(s)` +
    `}catch(e){}})()`
  );
}

/**
 * Themvora Astro integration. Registers the pre-paint theme bootstrap with
 * Astro so every page is themed before first paint (zero-flash), without
 * requiring a client-side framework runtime.
 *
 * @param options - The integration options (see {@link ThemvoraIntegrationOptions}).
 * @returns An Astro integration to register in `astro.config.ts`.
 *
 * @example
 * ```ts
 * // Register the integration. No theme data.
 * import { defineConfig } from "astro/config";
 * import themvora from "@themvora/astro";
 *
 * export default defineConfig({
 *   integrations: [themvora()],
 * });
 * ```
 *
 * @remarks
 * **Config discovery.** The integration finds the application's
 * `theme.config.ts` in Astro's root, trying `theme.config.ts`, `.tsx`, `.mts`,
 * `.mjs`, `.js` and `.cjs` in that order, and requires a default export — the
 * object {@link defineThemvoraConfig} returns. Passing `config` skips discovery
 * and accepts either the object or a path to it.
 *
 * **Two consumers, one declaration.** The discovered configuration is projected
 * twice: {@link buildBootstrap} derives the blocking script from it, and the
 * same projection is injected as `window.__THEMVORA_CONFIG__` from `<head>`.
 * The island reads that global instead of taking theme props, so the markup the
 * server renders and the markup the browser hydrates come from the same
 * registry — a mismatch there is visible as the panel repainting as the real
 * families replace the presets. `getInitialThemeState` publishes the same global
 * on the server, because no integration runs there.
 *
 * When the app has no discoverable config, the built-in neutral themes are used
 * and nothing fails.
 *
 * The integration owns the framework/build boundary only. Server-rendering the
 * themed `<html>` element is handled by `@themvora/astro/provider.astro`, and
 * interactive controls are opt-in islands — React users import the island from
 * `@themvora/astro/client`, which is the only entry that depends on React.
 *
 * The bootstrap is injected at the **`head-inline`** stage, and that choice is
 * load-bearing rather than incidental. `before-hydration` looks equivalent —
 * both run before the island hydrates — but it ships the script as a *module*
 * (resolved and bundled by Vite), so it executes after the browser has already
 * painted. Measured on a prerendered page, where the server cannot know the
 * visitor's selection and always emits the default theme:
 *
 * | condition | `head-inline` | `before-hydration` |
 * |---|---|---|
 * | OS dark, no cookie | dark at 84 ms, never corrected | light painted at 74 ms, corrected at 98 ms |
 * | dark cookie, cold cache + slow network | dark at 518 ms, never corrected | light painted at 513 ms, corrected at 1052 ms |
 *
 * So `before-hydration` does not merely weaken the guarantee — it produces a
 * visible flash of the *wrong* theme, up to ~540 ms of it. Paint ordering
 * requires the inline head script; pre-hydration is not sufficient.
 *
 * For a `"system"` selection the script is not the first line of defence —
 * CSS is. The server cannot know the visitor's preference, so it must not
 * commit to one: an inline `style` on `<html>` outranks every stylesheet rule,
 * which means inlining a guess would silently defeat the
 * `prefers-color-scheme` block meant to correct it. Measured on the built
 * example with page scripts blocked and the OS set to dark, the
 * inline-variables-plus-dark-block combination painted the *light* canvas
 * (`rgb(248, 250, 252)`); emitting both schemes as media blocks and no inline
 * variables paints `rgb(2, 6, 23)`. See {@link systemModeCSSTemplate}.
 *
 * Client-side navigation (`<ClientRouter />`) is handled separately by
 * {@link createNavigationScript} — the injected bootstrap is byte-identical on
 * every page, so Astro de-duplicates it and it does not re-run, and the live
 * theme state would otherwise be replaced by the destination page's build-time
 * attributes.
 *
 * @see {@link ThemvoraIntegrationOptions}
 * @see `createBlockingScript`
 * @see `systemModeCSSTemplate`
 */
export function themvora(options: ThemvoraIntegrationOptions = {}): AstroIntegration {
  // `config` is the provider's own configuration, so it wins outright rather
  // than merging: a value has exactly one source.
  /**
   * Projects the application configuration onto this integration's option shape.
   *
   * @param discovered - The configuration found at `astro:config:setup`, or
   *   `null` when the app has none.
   * @returns The options the bootstrap is built from.
   */
  function projectThemeOptions(
    discovered: ThemvoraConfig<ThemeDefinition> | null | undefined,
  ): { themes?: readonly ThemeDefinition[]; defaultTheme?: string; mode?: ThemeMode } {
    const source =
      discovered ??
      (options.config && typeof options.config === "object" ? options.config : null);
    if (!source) return options;
    return {
      themes: source.themes,

      ...(source.defaultTheme !== undefined ? { defaultTheme: source.defaultTheme } : {}),

      ...(source.initialMode !== undefined ? { mode: source.initialMode } : {}),
    };
  }

  const eagerEffective = projectThemeOptions(
    options.config && typeof options.config === "object" ? options.config : null,
  );
  const themes = eagerEffective.themes?.length
    ? eagerEffective.themes
    : (getBuiltInThemes() as unknown as readonly ThemeDefinition[]);

  const fingerprint = computeFingerprint(themes, eagerEffective.defaultTheme);
  const bootstrap = buildBootstrap(fingerprint, themes, eagerEffective.defaultTheme, eagerEffective.mode);

  const scrollbarScript = options.scrollbar
    ? createPrePaintScrollbarScript(
        options.scrollbar === true ? {} : options.scrollbar,
      )
    : null;

  const navigationScript =
    options.navigation === false ? null : createNavigationScript();

  return {
    name: "@themvora/astro",
    hooks: {
      "astro:config:setup": async ({ injectScript, config }) => {
        // Discover the application configuration the same way the Vite plugin
        // does, so `astro.config.mjs` only registers the integration.
        //
        // `config.root` is a URL in Astro and is always set there; it is read
        // defensively because the hook is also exercised directly, where the
        // setup object may carry nothing but `injectScript`.
        const root = config?.root;
        const projectRoot = root
          ? typeof root === "string"
            ? root
            : fileURLToPath(root)
          : process.cwd();

        const discovered =
          options.config && typeof options.config === "object"
            ? (options.config as ThemvoraConfig<ThemeDefinition>)
            : await loadThemvoraConfig<ThemeDefinition>(
                projectRoot,
                typeof options.config === "string" ? options.config : undefined,
              );

        if (discovered) {
          // Transport it to the runtime: the island's provider reads this global
          // instead of taking the same values again as props.
          injectScript(
            "head-inline",
            "window.__THEMVORA_CONFIG__=" +
              serializeScriptJson(toBootstrapConfig(discovered)) +
              ";",
          );
        }

        if (options.injectBootstrap !== false) {
          const projected = projectThemeOptions(discovered);
          const resolvedThemes = projected.themes?.length
            ? projected.themes
            : (getBuiltInThemes() as unknown as readonly ThemeDefinition[]);
          injectScript(
            "head-inline",
            buildBootstrap(
              computeFingerprint(resolvedThemes, projected.defaultTheme),
              resolvedThemes,
              projected.defaultTheme,
              projected.mode,
            ),
          );
        }
        if (scrollbarScript) {
          injectScript("head-inline", scrollbarScript);
        }
        if (navigationScript) {
          injectScript("head-inline", navigationScript);
        }
      },
    },
  };
}

export default themvora;
