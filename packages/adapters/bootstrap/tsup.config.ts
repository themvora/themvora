import { cpSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/prepaint.ts", "src/prepaint.ts", 
    "src/index.ts",
    "src/factory.ts",
    "src/react.ts",
    "src/vue.ts",
    "src/svelte.ts",
    "src/solid.ts",
    "src/angular.ts",
  ],
  format: ["esm"],
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
  external: [
    "react",
    "react-dom",
    "vue",
    "svelte",
    "solid-js",
    "@angular/core",
    "@themvora/core",
    "@themvora/adapters",
  ],
  loader: {
    ".css": "text",
  },
  onSuccess: () => {
    cpSync("src/bootstrap.css", "dist/bootstrap.css");
  },
});