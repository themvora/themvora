/**
 * Static, classic pre-paint boot script for pages that do not use the Vite
 * plugin.
 *
 * @remarks
 * Load this **synchronously in `<head>`**, before the body:
 *
 * ```html
 * <script src="/node_modules/@themvora/web/boot.js"></script>
 * ```
 *
 * A `type="module"` script is deferred by specification and cannot restore the
 * saved theme before the first paint. Do not add `async` or `defer`.
 *
 * The configuration is the same serializable object `defineThemvoraConfig()`
 * returns. Supply it before this script in one of two ways:
 *
 * ```html
 * <!-- 1. a global -->
 * <script>
 *   window.__THEMVORA_CONFIG__ = { themes: [...], defaultTheme: "light", initialMode: "system" };
 * </script>
 * <script src="/node_modules/@themvora/web/boot.js"></script>
 *
 * <!-- 2. JSON in the document -->
 * <script type="application/json" id="themvora-config">
 *   { "themes": [...], "defaultTheme": "light", "initialMode": "system" }
 * </script>
 * <script src="/node_modules/@themvora/web/boot.js"></script>
 * ```
 *
 * The Vite plugin uses the same global. When both are present the script is
 * idempotent: the first successful paint wins and the second copy is a no-op.
 *
 * @packageDocumentation
 */
import {
  applyThemeBootstrap,
  buildBootstrapPlan,
  type ApplyThemeBootstrapOptions,
  type ThemeBootstrapConfig,
  type ThemeBootstrapPlan,
  type ThemeDefinition,
} from "@themvora/core";

declare global {
  interface Window {
    /** Config written by the Vite plugin or by hand. */
    __THEMVORA_CONFIG__?: ThemeBootstrapConfig<ThemeDefinition>;
    /**
     * Pre-built plan, for a host that already ran `buildBootstrapPlan()`.
     * Takes precedence over the raw configuration.
     */
    __THEMVORA_BOOT_PLAN__?: {
      plan: ThemeBootstrapPlan;
      storageKey?: string;
    };
    /** Set to `true` before loading this script to skip the automatic run. */
    __THEMVORA_BOOT_DISABLED__?: boolean;
  }
}

/** The raw configuration accepted by {@link bootTheme}. */
export type ThemeBootConfig = ThemeBootstrapConfig<ThemeDefinition>;

/**
 * Read the configuration supplied to the static boot script.
 *
 * @returns The configuration, or `null` when none was supplied.
 */
export function readBootConfig(): ThemeBootConfig | null {
  if (typeof window !== "undefined") {
    const global = window.__THEMVORA_CONFIG__;
    if (global && Array.isArray(global.themes) && global.themes.length > 0) {
      return global;
    }
  }

  if (typeof document !== "undefined") {
    const element = document.getElementById("themvora-config");
    const text = element?.textContent?.trim();
    if (text) {
      try {
        const parsed: unknown = JSON.parse(text);
        if (
          parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as { themes?: unknown }).themes) &&
          (parsed as { themes: unknown[] }).themes.length > 0
        ) {
          return parsed as ThemeBootConfig;
        }
      } catch {
        // A malformed JSON block is reported by the page's own tooling; the
        // script falls back to the CSS-only guarantee instead of throwing.
      }
    }
  }

  return null;
}

/**
 * Build the pre-paint plan from a configuration.
 *
 * @param config - The application configuration.
 * @returns The plan consumed by {@link applyThemeBootstrap}.
 */
export function bootPlanFromConfig(config: ThemeBootConfig): ThemeBootstrapPlan {
  return buildBootstrapPlan(config.themes, {
    ...(config.defaultTheme !== undefined
      ? { defaultTheme: config.defaultTheme }
      : {}),
    ...(config.initialMode !== undefined
      ? { initialMode: config.initialMode }
      : {}),
    ...(config.initialFamily !== undefined
      ? { initialFamily: config.initialFamily }
      : {}),
    ...(config.prefix !== undefined ? { prefix: config.prefix } : {}),
  });
}

/**
 * Restore the persisted theme before the body is parsed.
 *
 * @param config - The configuration. Omit to read {@link readBootConfig}.
 * @param options - Storage/document/window overrides, for tests.
 * @returns What was written, or `null` when there was no configuration or no
 *   document.
 *
 * @remarks
 * The algorithm is core's `buildBootstrapPlan` + `applyThemeBootstrap`, the
 * same pair the generated Vite script uses. There is no second persistence or
 * theme-resolution implementation here.
 */
export function bootTheme(
  config: ThemeBootConfig | null = readBootConfig(),
  options: ApplyThemeBootstrapOptions = {},
) {
  if (!config?.themes?.length) return null;

  if (typeof window !== "undefined" && window.__THEMVORA_BOOT_PLAN__) {
    const preset = window.__THEMVORA_BOOT_PLAN__;
    return applyThemeBootstrap(preset.plan, {
      ...options,
      ...(preset.storageKey !== undefined ? { storageKey: preset.storageKey } : {}),
    });
  }

  return applyThemeBootstrap(bootPlanFromConfig(config), {
    ...options,
    ...(config.storageKey !== undefined ? { storageKey: config.storageKey } : {}),
  });
}

// Classic script semantics: this runs synchronously where it is loaded. The
// guard keeps a server render (where neither global exists) from throwing.
if (
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  window.__THEMVORA_BOOT_DISABLED__ !== true
) {
  bootTheme();
}
