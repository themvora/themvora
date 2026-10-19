import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: false,
    clean: true,
    sourcemap: true,
    target: "es2022",
    outDir: "dist",
  },
  {
    // Standalone browser bundle for plain HTML pages. `@themvora/core` is
    // inlined so the artifact has no bare imports to resolve; the package's
    // npm consumers keep using the ESM/CJS entries above, which leave core
    // external so it is shared rather than duplicated in their bundle.
    entry: { cdn: "src/cdn.ts" },
    format: ["iife"],
    globalName: "ThemvoraWeb",
    platform: "browser",
    target: "es2022",
    noExternal: [/^@themvora\/core$/],
    dts: false,
    // `clean` stays off: it would delete the ESM/CJS output built above.
    clean: false,
    sourcemap: false,
    outDir: "dist",
    outExtension: () => ({ js: ".js" }),
  },
]);
