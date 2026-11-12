import { defineConfig } from "vite";
import { themvoraVitePlugin } from "@themvora/core/vite";

/**
 * The Vite integration is one plugin call.
 *
 * `themvoraVitePlugin()` discovers `theme.config.ts` and injects three things
 * into the served HTML at build time: the render-blocking theme stylesheet, the
 * serializable configuration as `window.__THEMVORA_CONFIG__`, and the classic
 * blocking script that restores the saved selection. Nothing is added to
 * `index.html` and no asset is copied.
 *
 * That is the whole difference from the framework-free setup: the same
 * pre-paint mechanism, delivered by the build instead of by two tags.
 */
export default defineConfig({
  // `scrollbar: true` hides the native scrollbar in the same pre-paint pass, so
  // the overlay `createOverlayScrollbar()` draws in `main.ts` is never preceded
  // by a native bar. Without it the browser paints the platform bar first and
  // swaps it a moment later.
  plugins: [themvoraVitePlugin({ scrollbar: true })],
  server: { port: 5196, strictPort: true },
  preview: { port: 5196, strictPort: true },
});
