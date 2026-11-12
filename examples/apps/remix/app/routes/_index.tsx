// The provider in app/root.tsx supplies the runtime, so a route just reads it.
import { useTheme } from "@themvora/remix";
import { HistoryScope } from "../components/history-scope";
import { WorkspaceCard } from "../components/workspace-card";

const modes = ["system", "light", "dark"] as const;

export default function Index() {
  const { theme, mode, setMode, toggleTheme } = useTheme();

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <h1>Themvora</h1>
      <p>
        Current theme: {theme.name} ({mode})
      </p>

      <div
        role="group"
        aria-label="Theme mode"
        style={{ display: "flex", gap: "0.5rem", margin: "1rem 0" }}
      >
        {modes.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
            style={{
              background:
                mode === option
                  ? "var(--theme-color-primary)"
                  : "var(--theme-color-secondary)",
              color:
                mode === option
                  ? "var(--theme-color-primaryForeground)"
                  : "var(--theme-color-secondaryForeground)",
              border: "1px solid var(--theme-color-border)",
              borderRadius: "0.5rem",
              padding: "0.4rem 0.8rem",
              textTransform: "capitalize",
              cursor: "pointer",
            }}
          >
            {option}
          </button>
        ))}
      </div>

      <button
        onClick={toggleTheme}
        style={{
          background: "var(--theme-color-primary)",
          color: "var(--theme-color-primaryForeground)",
          border: 0,
          borderRadius: "0.5rem",
          padding: "0.5rem 1rem",
        }}
      >
        Toggle theme
      </button>

      <section
        style={{
          background: "var(--theme-color-card)",
          border: "1px solid var(--theme-color-border)",
          borderRadius: "0.75rem",
          marginTop: "1.5rem",
          padding: "1rem",
        }}
      >
        <h2>Themed card</h2>
        <p style={{ color: "var(--theme-color-mutedForeground)" }}>
          Surface, border and text follow the theme.
        </p>
      </section>

      <WorkspaceCard />

      <HistoryScope />
    </main>
  );
}
