import { useTheme } from "@themvora/react";

function Switcher() {
  const { theme, mode, toggleTheme } = useTheme();
  return (
    <section>
      <p>
        {theme.name} · {mode}
      </p>
      <button type="button" onClick={toggleTheme}>
        Toggle mode
      </button>
    </section>
  );
}

export default function App() {
  return (
    <main className="page">
      <h1>Persisted theme example</h1>
      <Switcher />
    </main>
  );
}
