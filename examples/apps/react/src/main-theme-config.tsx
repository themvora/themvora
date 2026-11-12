import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@themvora/core/scrollbar.css";
import "./index.css";

import { ThemeProvider } from "@themvora/react";

import { App } from "./App";

/**
 * Entry for the build-integrated variant (`theme-config.html`).
 *
 * No theme props on purpose. `themvoraVitePlugin()` transported
 * `theme.config.ts` to the browser as `window.__THEMVORA_CONFIG__` before any
 * application code ran, and `<ThemeProvider>` builds its registry from that —
 * the documented setup, where the values are declared once in the config file
 * instead of being repeated here.
 *
 * The plugin also resolves `react-dom/client` to a shim that flushes the first
 * `render` synchronously, so the initial commit cannot lose a frame to React's
 * scheduler. Both behaviours are what the first-paint gate observes.
 *
 * `ThemeOverrideContext` is deliberately not provided: it has a no-op default,
 * and this variant exists to exercise the provider's own resolution, not the
 * demo's override plumbing.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
