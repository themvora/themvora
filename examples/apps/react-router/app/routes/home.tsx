import { Link } from "react-router";
import {
  useProvidedThemes,
  useSetThemeFamily,
  useTheme,
} from "@themvora/remix";
import type { Route } from "./+types/home";

const modes = ["system", "light", "dark"] as const;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Themvora + React Router" },
    {
      name: "description",
      content: "React Router Framework Mode integration for Themvora.",
    },
  ];
}

export default function Home() {
  const { theme, mode, effectiveMode, setMode, toggleTheme } = useTheme();
  const families = useProvidedThemes();
  const setFamily = useSetThemeFamily();

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">React Router Framework Mode</p>
          <h1>Themvora</h1>
        </div>
        <nav>
          <Link to="/about">About this setup</Link>
        </nav>
      </header>

      <p className="readout">
        Theme <strong>{theme.name}</strong> · requested <strong>{mode}</strong> ·
        showing <strong>{effectiveMode}</strong>
      </p>

      <section className="controls" aria-label="Theme controls">
        <div role="group" aria-label="Theme mode" className="segmented">
          {modes.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              className={mode === option ? "chip chip-active" : "chip"}
              onClick={() => setMode(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <label className="field">
          <span>Family</span>
          <select
            value={theme.meta?.family ?? ""}
            onChange={(event) => setFamily(event.target.value)}
          >
            {families.map((family) => (
              <option key={family.id} value={family.family}>
                {family.name}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="primary" onClick={toggleTheme}>
          Toggle light/dark
        </button>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Design system</h2>
          <span className="status">Active</span>
        </div>
        <p>
          Tokens resolve at runtime, so every surface on this page follows the
          active theme without a re-render.
        </p>
        <p className="muted">
          Reload the page or navigate to another route — the selection is
          resolved by the root loader and mirrored back to cookies.
        </p>
        <button type="button" className="secondary">
          View themes
        </button>
      </section>
    </main>
  );
}
