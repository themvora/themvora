import { defineConfig } from "vite";
import { themvoraVitePlugin } from "@themvora/core/vite";

/**
 * A plain Vite site with no framework and no CSS framework.
 *
 * `themvoraVitePlugin()` is the one integration point: it discovers
 * `theme.config.ts` and injects the blocking pre-paint script into the served
 * HTML, so the first painted frame already carries the resolved theme.
 *
 * `scrollbar: true` hides the native scrollbar in that same pre-paint pass. The
 * page draws the overlay with `createOverlayScrollbar()`, which only runs once
 * the module does — without this the browser would paint a native bar first and
 * swap it for the overlay a moment later.
 */
export default defineConfig({
  plugins: [themvoraVitePlugin({ scrollbar: true })],
  server: { port: 5196, strictPort: true },
  preview: { port: 5196, strictPort: true },
});
