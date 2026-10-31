import { createRoot } from "react-dom/client";
import { createDefaultPersistence } from "@themvora/core";
import { ThemeProvider } from "@themvora/react";
import App from "./App";
import { themes } from "./themes";

/*
  `createDefaultPersistence()` is the adapter the runtime already uses by
  default: a `localStorage`-backed selection adapter under the
  `"theme-selection"` key that also syncs across tabs via `storage` events.
  Passing it explicitly makes the dependency visible; the selection survives
  a reload. It returns `null` when storage is unavailable (e.g. SSR), which
  the provider accepts.
*/
createRoot(document.getElementById("root")!).render(
  <ThemeProvider themes={themes} persistence={createDefaultPersistence()}>
    <App />
  </ThemeProvider>,
);
