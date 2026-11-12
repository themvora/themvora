import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/prepaint.ts"],
  format: ["esm"],
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
});