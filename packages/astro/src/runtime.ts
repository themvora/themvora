/**
 * Browser entry for the Themvora Astro integration
 * (`@themvora/astro/runtime`).
 *
 * This is the **framework-neutral client API**, and it is the entry a `<script>`
 * in a `.astro` file should import. It ships the global runtime controller —
 * `getThemeController()` / `createThemeController()` — plus the low-level
 * shared-runtime accessors, and it imports no client framework.
 *
 * @remarks
 * **Why not `@themvora/astro`?** The root entry also exports `themvora()`, the
 * build integration, which reads `theme.config.ts` from disk. That drags `node:url`
 * (and `@themvora/core/config`, hence `fs` / `path` / `module`) into whatever
 * imports it. A browser bundle cannot resolve those: Astro externalises them for
 * browser compatibility and the build fails with
 * `"fileURLToPath" is not exported by "__vite-browser-external"`.
 *
 * So the package is split the way the runtime actually is:
 *
 * | Entry | Environment | Contents |
 * | ----- | ----------- | -------- |
 * | `@themvora/astro` | Node / build | `themvora()`, server helpers, type-only re-exports |
 * | `@themvora/astro/runtime` | Browser | `getThemeController()`, `getGlobalRuntime()` |
 * | `@themvora/astro/client` | Browser | React island + hooks (optional peer) |
 * | `@themvora/astro/provider.astro` | Server + browser | the SSR document |
 * | `@themvora/astro/ThemeToggle.astro` | Server + browser | the native toggle |
 *
 * `@themvora/astro` re-exports this entry's symbols for Node-side callers
 * (tests, scripts, a server-side integration), so importing from the root in a
 * server context keeps working. Import from `/runtime` in anything a browser
 * bundles.
 *
 * @example
 * ```astro
 * <button id="theme-toggle">Toggle theme</button>
 *
 * <script>
 *   import { getThemeController } from "@themvora/astro/runtime";
 *
 *   const theme = getThemeController();
 *
 *   document
 *     .querySelector("#theme-toggle")
 *     ?.addEventListener("click", () => theme.toggleTheme());
 * </script>
 * ```
 *
 * @packageDocumentation
 */
export { createThemeController, getThemeController } from "./controller";
export type {
  ThemeController,
  ThemeControllerOptions,
  ThemeControllerState,
} from "./controller";

export { getGlobalRuntime, requireGlobalRuntime, setGlobalRuntime } from "./shared-runtime";

export { THEME_READOUT_ATTRIBUTE, THEME_TOGGLE_ATTRIBUTE } from "./attributes";
