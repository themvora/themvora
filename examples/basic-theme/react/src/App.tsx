import { useTheme } from "@themvora/react";

function Switcher() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      Current theme: {theme.name} — toggle
    </button>
  );
}

export default function App() {
  return (
    <main className="page">
      <h1>Basic Themvora example</h1>
      <Switcher />
    </main>
  );
}
