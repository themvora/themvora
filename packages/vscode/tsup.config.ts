import { defineConfig } from "tsup";

/**
 * The extension bundle.
 *
 * Two things about this config are load-bearing:
 *
 * - **`vscode` is external.** It is injected by the extension host at runtime and
 *   is not on disk, so bundling it would fail the build outright.
 * - **`@themvora/core` is inlined.** The extension ships as a single file with no
 *   `node_modules` beside it: `vsce package --no-dependencies` does not vendor
 *   runtime dependencies. Core has no dependencies of its own and no `node:`
 *   imports, so inlining it is complete — nothing is left unresolved at runtime.
 *
 * `dts` is off because declarations are emitted by `tsc -p tsconfig.build.json`
 * in the same `build` script. Two emitters writing `dist/index.d.ts` would race.
 */
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  platform: "node",
  target: "es2022",
  external: ["vscode"],
  noExternal: ["@themvora/core"],
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  dts: false,
});
