import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { themvoraVitePlugin } from "@themvora/core/vite";

const require = createRequire(import.meta.url);

/**
 * Copies `@themvora/web`'s standalone build into `public/`.
 *
 * A `<script type="module">` is deferred by specification, so the module import
 * in `main.ts` cannot register the elements before the browser paints — the
 * page appeared with the controls missing and they popped in ~100 ms later.
 * The package ships an IIFE for exactly this case; loading it as a classic
 * `<script>` in `<head>` registers the elements and injects their stylesheet
 * while the parser is still working, so the controls are in the first frame.
 *
 * Copying at config time (dev and build) keeps the served file in step with the
 * workspace package instead of freezing a stale snapshot in `public/`.
 */
function copyStandaloneComponents(): Plugin {
  return {
    name: "themvora-copy-standalone-components",
    configResolved() {
      const entry = require.resolve("@themvora/web");
      const source = join(dirname(dirname(entry)), "dist", "cdn.js");
      if (!existsSync(source)) {
        throw new Error(
          `@themvora/web has no dist/cdn.js (${source}). Build the package before starting the app.`,
        );
      }
      const publicDir = join(process.cwd(), "public");
      mkdirSync(publicDir, { recursive: true });
      copyFileSync(source, join(publicDir, "themvora-web.js"));
    },
  };
}

/**
 * The example is a plain Vite site: no framework plugin, no CSS framework.
 *
 * `themvoraVitePlugin()` is the one integration point. It discovers
 * `theme.config.ts` and injects the blocking pre-paint script (plus the
 * pre-paint scrollbar CSS) into the served HTML, so the first painted frame
 * already carries the resolved theme — no flash, in light, dark or system mode,
 * with nothing to wire per page.
 *
 * `@themvora/web` ships its own element stylesheet, and the page styles itself
 * from the active theme's CSS variables, so there is nothing else to configure.
 *
 * `scrollbar: true` is not optional here. The page uses
 * `<themvora-scrollbar>`, and the overlay only hides the native bar once the
 * element upgrades — so without the pre-paint class the browser paints a native
 * scrollbar first and swaps it for the overlay a moment later. That is the same
 * flash as an unthemed first frame, one axis over.
 */
export default defineConfig({
  plugins: [copyStandaloneComponents(), themvoraVitePlugin({ scrollbar: true })],
});
