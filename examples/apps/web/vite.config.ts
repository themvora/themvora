import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { themvoraVitePlugin } from "@themvora/web/vite";

const require = createRequire(import.meta.url);

/**
 * Serve `@themvora/web`'s standalone bundle as a classic script.
 *
 * The package's module entry is deferred by specification, so the custom
 * elements only upgrade after the body has been parsed. The toggle, selects and
 * scoped region would then appear (and a scope could inherit the page palette)
 * a module-load later. The classic bundle registers every element and injects
 * their stylesheet while the parser is still in the head, so all of them are in
 * the first painted frame.
 *
 * It is served from memory in dev and emitted as an asset in the build; no
 * generated copy is committed. The tag is injected with `order: "post"` so it
 * follows the plugin's CSS, configuration and blocking boot script.
 */
function themvoraClassicElements(): Plugin {
  const entry = require.resolve("@themvora/web");
  const bundlePath = join(dirname(dirname(entry)), "dist", "cdn.js");
  let base = "/";

  return {
    name: "themvora-classic-elements",
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use(
        "/themvora-classic.js",
        (_request: IncomingMessage, response: ServerResponse) => {
          response.setHeader(
            "content-type",
            "text/javascript; charset=utf-8",
          );
          response.end(readFileSync(bundlePath));
        },
      );
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "themvora-classic.js",
        source: readFileSync(bundlePath, "utf8"),
      });
    },
    transformIndexHtml: {
      order: "post",
      handler() {
        return [
          {
            tag: "script",
            attrs: { src: `${base}themvora-classic.js` },
            injectTo: "head",
          },
        ];
      },
    },
  };
}

/**
 * The whole build integration.
 *
 * `themvoraVitePlugin()` discovers `theme.config.ts` and injects, in order: the
 * render-blocking theme CSS, the configuration global, and the classic blocking
 * boot script. `themvoraClassicElements()` adds the element registration that
 * has to run before the body is parsed. Neither is a manual bootstrap script.
 */
export default defineConfig({
  plugins: [themvoraVitePlugin(), themvoraClassicElements()],
});
