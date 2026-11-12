/**
 * Vite integration for `@themvora/web`.
 *
 * @remarks
 * This is the same plugin as `@themvora/core/vite`, re-exported from the
 * package a Web Components application already installs. There is one
 * implementation and one configuration, not a Web-Components-specific variant.
 *
 * It injects, from the discovered `theme.config.ts`:
 *
 * 1. a render-blocking `<style>` with the declared themes' CSS variables;
 * 2. the serializable configuration the provider reads;
 * 3. a classic, blocking boot script that restores the persisted selection.
 *
 * @example
 * ```ts
 * import { defineConfig } from "vite";
 * import { themvoraVitePlugin } from "@themvora/web/vite";
 *
 * export default defineConfig({
 *   plugins: [themvoraVitePlugin()],
 * });
 * ```
 *
 * @packageDocumentation
 */
export { themvoraVitePlugin } from "@themvora/core/vite";
export type {
  ThemvoraThemeConfig,
  ThemvoraViteInjectedTag,
  ThemvoraVitePlugin,
  ThemvoraVitePluginOptions,
} from "@themvora/core/vite";
