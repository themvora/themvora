import type {
  AdapterPlugin,
  AdapterStrategy,
  ThemeAdapter,
  ThemeDefinition,
  ThemeRuntime,
} from "@themvora/core";
import { resolveAdapterSource } from "@themvora/adapters";
import { generateShadcnVariables } from "./generator";
import { injectCSS, removeCSS, toCSS } from "./inject";
import {
  SHADCN_VARIABLES_STYLE_ID,
  SHADCN_STYLE_ID,
  DEFAULT_SHADCN_OPTIONS,
  type ShadcnAdapterOptions,
} from "./defaults";
import shadcnCss from "./shadcn.css";

/**
 * Options for {@link createShadcnAdapter}.
 *
 * @see {@link createShadcnAdapter}
 */
export interface CreateShadcnAdapterOptions extends ShadcnAdapterOptions {
  /**
   * Adapter plugins that customize how the shadcn/ui CSS variables are
   * generated. Defaults to no plugins.
   */
  plugins?: AdapterPlugin[];
}

/**
 * Creates a shadcn/ui adapter.
 *
 * The adapter is a DOM-only, framework-free adapter: it depends only on
 * `@themvora/core` and the DOM. On install it injects the shadcn/ui
 * compatibility stylesheet (when enabled) and a `<style>` element of CSS
 * variables derived from the active theme, then subscribes to the runtime
 * store and rewrites the variables whenever the theme selection changes. It
 * does not render any component or require a React tree.
 *
 * On uninstall it removes the injected styles and unsubscribes from the store.
 *
 * @param options Adapter options. Defaults to `{}`.
 * @returns A `ThemeAdapter` for shadcn/ui.
 *
 * @example
 * ```ts
 * import { createShadcnAdapter } from "@themvora/shadcn";
 *
 * runtime.installAdapter(createShadcnAdapter());
 * ```
 *
 * @see {@link useShadcnTheme}
 */
export function createShadcnAdapter<T extends ThemeDefinition>(
  options: CreateShadcnAdapterOptions = {},
): ThemeAdapter<T> {
  const strategy: AdapterStrategy =
    options.strategy ?? DEFAULT_SHADCN_OPTIONS.strategy;
  const injectCSSOption =
    options.injectCSS ?? DEFAULT_SHADCN_OPTIONS.injectCSS;
  const plugins = options.plugins ?? [];

  let styleEl: HTMLStyleElement | null = null;
  let cssEl: HTMLStyleElement | null = null;
  let unsubscribe: (() => void) | null = null;

  function apply(theme: ThemeDefinition) {
    const themeObj = resolveAdapterSource(theme as never);
    const variables = generateShadcnVariables(themeObj, {
      strategy,
      plugins,
    });

    if (styleEl) {
      styleEl.textContent = toCSS(variables);
    }
  }

  function install(runtime: ThemeRuntime<T>) {
    if (typeof document === "undefined") return;

    if (injectCSSOption) {
      cssEl = injectCSS(SHADCN_STYLE_ID, shadcnCss);
    }

    styleEl = injectCSS(
      SHADCN_VARIABLES_STYLE_ID,
      toCSS(
        generateShadcnVariables(resolveAdapterSource(runtime.store.get()), {
          strategy,
          plugins,
        }),
      ),
    );
    styleEl.setAttribute("data-themvora", "shadcn");

    unsubscribe = runtime.store.subscribe(() => {
      apply(runtime.store.get());
    });
  }

  function uninstall() {
    unsubscribe?.();
    unsubscribe = null;
    removeCSS(SHADCN_VARIABLES_STYLE_ID);
    if (cssEl) {
      cssEl.remove();
      cssEl = null;
    }
    styleEl = null;
  }

  return {
    id: "shadcn",
    /**
     * shadcn's own variable set, expressed as the Themvora semantic roles this
     * adapter translates into it.
     *
     * Note the shape: these are **Themvora role names**, not shadcn token
     * names. The translation to `--primary`, `--card-foreground` and the rest
     * happens in `generator.ts`. Declaring them here makes the requirement
     * checkable — a theme missing `primaryForeground` is a resolvable error
     * rather than a silently empty CSS variable and an unreadable button.
     */
    requires: {
      colors: [
        "background",
        "foreground",
        "card",
        "cardForeground",
        "popover",
        "popoverForeground",
        "primary",
        "primaryForeground",
        "secondary",
        "secondaryForeground",
        "muted",
        "mutedForeground",
        "accent",
        "accentForeground",
        "destructive",
        "destructiveForeground",
        "border",
        "input",
        "ring",
      ],
    },
    /**
     * Capabilities, not requirements.
     *
     * shadcn has no `success` / `warning` / `info` ramp — `destructive` is its
     * only status role — so this adapter consumes them only if a theme declares
     * them, and never fabricates a shadcn variable for a role shadcn does not
     * have. See the status-token policy in `shadcn.css`.
     */
    optional: {
      colors: ["success", "successForeground", "warning", "warningForeground", "info", "infoForeground"],
    },
    supports: () => true,
    install,
    uninstall,
  };
}