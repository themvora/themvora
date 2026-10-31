// src/components/ThemeIsland.tsx
import { ThemeProviderClient } from "@themvora/astro/client";

import { ThemePanel } from "./ThemePanel";

// ThemeProviderClient renders nothing — it installs the runtime. Panel is a
// sibling that reads it, and both hydrate as one island.
export default function ThemeIsland() {
  return (
    <>
      {/*
        No theme props. The registry, the default theme and the initial
        mode/family all come from the theme.config.ts the integration
        transported to the browser, so restating initialMode/initialFamily here
        would be a second source of truth for a decision the app already made.
      */}
      <ThemeProviderClient />
      <ThemePanel />
    </>
  );
}
