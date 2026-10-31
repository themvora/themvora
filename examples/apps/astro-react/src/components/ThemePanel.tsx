// src/components/ThemePanel.tsx — the React half of the island.
import { ThemeReadout, useTheme } from "@themvora/astro/client";

export function ThemePanel() {
  // Setters only. The *values* this hook returns are deliberately not rendered:
  // they read through `useSyncExternalStore`, so during hydration they hold the
  // server's resolution — which cannot know the persisted selection or
  // `prefers-color-scheme` — and a line rendered from them changes from one
  // theme name to another a few frames after paint. That is the reported
  // "Resolved: fluctuates between mint-light and mint-dark".
  const { setMode, setFamily, toggleTheme } = useTheme();

  return (
    <section className="surface">
      <h2>React island</h2>

      <p className="muted">
        theme: <ThemeReadout kind="theme" fallback="—" /> · mode:{" "}
        <ThemeReadout kind="mode" fallback="—" /> · family:{" "}
        <ThemeReadout kind="family" fallback="—" />
      </p>

      <div>
        {/*
          `onClick={() => toggleTheme()}`, not `onClick={toggleTheme}`: React
          passes the click event as the first argument, and a handler that takes
          none should not be handed one. It is harmless today because
          `toggleTheme` ignores its arguments, but it is one refactor away from
          a real bug.
        */}
        <button className="btn" onClick={() => toggleTheme()}>
          Toggle light / dark
        </button>{" "}
        <button className="btn" onClick={() => setMode("system")}>
          System
        </button>{" "}
        <button className="btn" onClick={() => setFamily("mint")}>
          Mint family
        </button>
      </div>

      <p>
        Resolved: <ThemeReadout kind="label" fallback="—" /> · selection:{" "}
        <ThemeReadout kind="mode" fallback="—" /> /{" "}
        <ThemeReadout kind="family" fallback="—" />
      </p>
    </section>
  );
}
