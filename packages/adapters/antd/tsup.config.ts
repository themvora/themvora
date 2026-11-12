import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/next.tsx"],
  format: ["esm"],
  sourcemap: true,
  clean: true,
  target: "es2022",
  outDir: "dist",
  external: [
    "react",
    "react-dom",
    "@themvora/core",
    "@themvora/adapters",
    "antd",
    "next/navigation",
    "@ant-design/cssinjs",
  ],
});