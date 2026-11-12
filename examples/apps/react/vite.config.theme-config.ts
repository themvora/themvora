import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { themvoraVitePlugin } from "@themvora/core/vite";

/**
 * The build-integrated variant of the React example.
 *
 * Mirrors the documented registration — the framework plugin plus
 * `themvoraVitePlugin()` with no options, because the plugin discovers
 * `theme.config.ts` at the Vite root. Nothing here repeats a theme, a
 * `defaultTheme` or an `initialMode`; that duplication is what the config file
 * exists to remove.
 *
 * Output goes to `dist-theme-config/` so it sits beside the quick-start build in
 * `dist/` without either overwriting the other. `verify-react-first-paint.mjs`
 * serves `dist-theme-config/theme-config.html`.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), themvoraVitePlugin()],
  build: {
    outDir: "dist-theme-config",
    emptyOutDir: true,
    rollupOptions: { input: "theme-config.html" },
  },
});
