import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      client: "src/client.ts",
      // A dedicated entry so the client provider gets a **stable** filename.
      //
      // `layout.tsx` imports it dynamically, and without an entry the bundler
      // emitted it as a content-hashed chunk (`provider-72F765BR.js`). Next's
      // dev-time validation worker resolves that reference by name and could
      // not instantiate it:
      //
      //   Module [project]/.../provider-72F765BR.js [app-rsc]
      //   (client reference proxy) ... the module factory is not available.
      //
      // which surfaced as `Could not validate 'instant'` on every request in
      // `next dev`. An entry keeps the name fixed and keeps `"use client"` on
      // the file, so the reference always resolves.
      provider: "src/provider.tsx",
    },
    format: ["esm", "cjs"],
    dts: false,
    clean: true,
    // `layout.tsx` imports the client provider through this specifier, and it
    // must stay a package specifier: inlined into the server bundle it loses
    // `"use client"` and the provider is then treated as server code. Next
    // resolves it through the package's own `exports` map.
    external: ["@themvora/next/client"],
    sourcemap: true,
    target: "es2022",
    outDir: "dist",
  },
  {
    entry: {
      "server/index": "src/server/index.ts",
    },
    format: ["esm", "cjs"],
    dts: false,
    clean: false,
    sourcemap: true,
    target: "es2022",
    outDir: "dist",
  },
]);
