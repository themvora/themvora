import { createRoot } from "react-dom/client";
import "./index.css";
import "@themvora/core/scrollbar.css";

import { App } from "./App";
import { StrictMode, useState } from "react";
import { presetThemes, themvora } from "./themes/themes";
import { ThemeProvider } from "@themvora/react";
import { ThemeOverrideContext } from "./theme-override-context";

const themes = [...themvora, ...presetThemes];

/**
 * `themeOverride` is a provider prop, so its state has to live *above* the
 * provider — a component rendered inside it cannot change a prop on its parent.
 * The context is only a delivery mechanism for that state, not a second theme
 * registry: `ProvidedThemesCard` calls `setOverride`, this component re-renders
 * `<ThemeProvider>` with the new prop, and the runtime re-resolves centrally.
 *
 * `defaultTheme="cocoa-light"` is the **variant** form — that exact definition.
 * The **family** form is equally valid and picks the variant for `initialMode`,
 * leaving the visitor free to toggle within the family:
 *
 *     defaultTheme="cocoa" initialMode="light"   // cocoa-light, toggleable
 *
 * `scheduled` is created **disabled** so the example looks the same whatever
 * time of day you open it. `SolarScheduleCard` turns it on, which applies the
 * correct theme immediately and keeps applying it at each sunrise and sunset —
 * without touching `initialMode`, because a scheduled change is an automatic
 * one, not a choice.
 */
function Root() {
  const [override, setOverride] = useState<string | undefined>(undefined);

  return (
    <ThemeProvider
      themes={themes}
      initialMode="light"
      defaultTheme="cocoa-light"
      themeOverride={override}
      scheduled={{ enabled: false, checkInterval: 30_000 }}
      transition={{ enabled: true, duration: 250, easing: "ease-in-out" }}
    >
      <ThemeOverrideContext.Provider value={{ override, setOverride }}>
        <App />
      </ThemeOverrideContext.Provider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
