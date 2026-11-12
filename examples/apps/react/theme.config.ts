/**
 * The application's theme configuration, declared once.
 *
 * `themvoraVitePlugin()` discovers this file by convention and derives two
 * things from it at build time:
 *
 *   - the pre-paint bootstrap script injected into `theme-config.html`, which
 *     writes the resolved theme onto `<html>` before the first paint;
 *   - `window.__THEMVORA_CONFIG__`, the transport `<ThemeProvider>` reads when
 *     it is given no theme props.
 *
 * That is why `src/main-theme-config.tsx` renders a bare `<ThemeProvider>` and
 * `vite.config.theme-config.ts` passes no theme options: this file is the only
 * place the values appear, so the script and the runtime cannot drift.
 *
 * The values mirror what `src/main.tsx` passes to the provider explicitly, so
 * the two builds of this example resolve the same theme and the first-paint
 * gate compares like with like.
 *
 * @see https://themvora-dev.vercel.app/vite-plugin
 */
import { defineThemvoraConfig } from "@themvora/core";

import { themes } from "./src/themes/themes";

export default defineThemvoraConfig({
  themes,
  defaultTheme: "cocoa-light",
  initialMode: "light",
  initialFamily: "cocoa",
});
