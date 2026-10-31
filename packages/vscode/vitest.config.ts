import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the extension.
 *
 * The `vscode` module only exists inside the extension host, so it is aliased to
 * a local fake. That is what makes activation testable without launching
 * Electron: the real `activate()` runs, the real command handler runs, and the
 * fake records what the extension asked the editor to do.
 */
export default defineConfig({
  resolve: {
    alias: {
      vscode: fileURLToPath(new URL("./test/stubs/vscode.ts", import.meta.url)),
    },
  },
  // The Studio webview is a React app. Rendering a component to static markup is
  // the only way to assert what the library actually emits without a DOM, so the
  // transformer has to handle JSX the way the webview build does.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
