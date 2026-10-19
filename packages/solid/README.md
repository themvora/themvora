# @themvora/solid

## Install

```bash
npm install @themvora/core @themvora/solid
```

`@themvora/solid` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

Signals-first theming for Solid with a context provider and scoped subtrees.

## Set up

```tsx
import { ThemeProvider } from "@themvora/solid";
import { themes } from "./theme/themes";

export function App() {
  return (
    <ThemeProvider themes={themes} defaultTheme="mint-light">
      <Page />
    </ThemeProvider>
  );
}
```

## Add a small UI

A heading, a card and a button. The button reads the current theme and changes
it — nothing is styled yet.

```tsx
import { useTheme } from "@themvora/solid";

export function Page() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <main class="page">
      <h1>Themvora</h1>
      <p>
        {theme().name} · {mode()}
      </p>
      <button onClick={() => toggleTheme()}>Toggle theme</button>
    </main>
  );
}
```

## Style it with Themvora tokens

Themvora emits one CSS variable per token, so your own classes read the active
theme without any per-theme CSS:

```css
.page {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.card {
  background: var(--theme-color-card);
  color: var(--theme-color-cardForeground);
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-md);
  padding: var(--theme-spacing-4);
}
```

Nothing is re-rendered on a switch — the variables change and the styles follow.

## Reference snippet

```ts
// theme/themes.ts — one definition per mode, grouped by meta.family
import { defineTheme } from "@themvora/core";

export const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light" },
    tokens: {
      colors: { background: "#ffffff", foreground: "#0f172a", primary: "#0d9488" },
    },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark" },
    tokens: {
      colors: { background: "#042f2e", foreground: "#ccfbf1", primary: "#5eead4" },
    },
  }),
] as const;
```

```tsx
import { ThemeProvider, useTheme } from "@themvora/solid";
import { themes } from "./theme/themes";

function ThemeSwitcher() {
  const { theme, mode, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme().name} · {mode()}</button>;
}

export function App() {
  return (
    <ThemeProvider themes={themes}>
      <ThemeSwitcher />
    </ThemeProvider>
  );
}
```

## Signals

`useTheme` — signals for `theme`, `mode`, `family` with getters and setters, plus `useThemeHistory`, `useThemeBatch`, `useThemeSnapshot`, `useThemeRestore`, `useThemeLifecycle`, `useThemePacks`.

## Components

`ThemeProvider` (context + bindings), `ThemeScope` — scoped theming.

## Documentation

Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
