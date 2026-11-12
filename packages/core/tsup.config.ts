import { defineConfig } from "tsup";

/**
 * Two builds, one package.
 *
 * 1. The **module** entries (`index`, `vanilla`, `vite`, `config`), consumed by
 *    a bundler or Node.
 * 2. The **pre-paint asset** (`dist/prepaint.js`), consumed by a browser through
 *    a plain `<script src>`.
 *
 * They cannot share a config: the asset must be a classic, self-contained
 * script — an IIFE with no `import`, no `export` and no `require` — because the
 * whole point is that it runs before the page has a module loader, a bundler or
 * an import map. Emitting it in the same pass would give it ESM syntax, and a
 * `<script src>` without `type="module"` cannot evaluate that.
 *
 * `clean` runs once, on the first config, and the second build appends. tsup
 * builds an array of configs sequentially, so the module output is already on
 * disk when the asset is written.
 */
export default defineConfig([
  {
    entry: ["src/index.ts", "src/vanilla.ts", "src/vite-plugin.ts", "src/config.ts"],
    format: ["esm", "cjs"],
    sourcemap: true,
    clean: true,
    splitting: false,
    treeshake: true,
    minify: false,
    target: "es2022",
  },
  {
    entry: { prepaint: "src/prepaint-entry.ts" },
    format: ["iife"],
    globalName: "ThemvoraPrepaint",
    // Not `clean`: the module output above is already written.
    clean: false,
    sourcemap: false,
    splitting: false,
    treeshake: true,
    // Minified because this file is parser-blocking in `<head>`: every byte is
    // a byte the browser cannot paint without. It is also a separate, cacheable
    // file (unlike the Vite plugin's inline script), so the cost is paid once.
    minify: true,
    // `es2020` rather than the module build's `es2022`: the asset runs before
    // anything else, on whatever browser the visitor arrived with, and it uses
    // no syntax above `es2020`.
    target: "es2020",
    // A stable, documented filename. The docs and the example reference
    // `dist/prepaint.js` directly, so a hash or a `.mjs` extension would break
    // the one thing this asset exists to make simple.
    outExtension: () => ({ js: ".js" }),
  },
]);
