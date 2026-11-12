// src/components/ThemeIsland.tsx
import { ThemeProviderClient } from "@themvora/astro/client";

import { ThemePanel } from "./ThemePanel";

// ThemeProviderClient renders nothing — it installs the runtime. Panel is a
// sibling that reads it, and both hydrate as one island.
export default function ThemeIsland() {
  return (
    <>
      {/*
        No theme props. The registry, the default theme, the initial
        mode/family and the transition all come from the theme.config.ts the
        integration transported to the browser, so restating any of them here
        would be a second source of truth for a decision the app already made.
        A transition prop is supported as a per-island override, but it must not
        be needed for the declared animation to apply.
      */}
      <ThemeProviderClient />
      <ThemePanel />
    </>
  );
}
