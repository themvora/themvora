# @themvora/react

## Install

```bash
npm install @themvora/core @themvora/react
```

`@themvora/react` builds on `@themvora/core` and a framework integration, so those are installed explicitly rather than relied on transitively.

React 18/19 integration for Themvora. Provider + hooks over the framework-agnostic `@themvora/core` runtime.

## Set up

`ThemeProvider` creates the runtime and provides it through context. It is mounted once at the entry point, so every component below it can call `useTheme()`. The `themes` prop is optional — omit it and the built-in neutral `light`/`dark` pair is used.

```tsx title="src/main.tsx"
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import "./index.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" initialMode="system">
    <App />
  </ThemeProvider>,
);
```

```tsx title="src/App.tsx"
// Application UI only; the provider lives in src/main.tsx.
import { ThemeSwitcher } from "./ThemeSwitcher";
import { WorkspaceCard } from "./components/WorkspaceCard";

export function App() {
  return (
    <main>
      <ThemeSwitcher />
      <WorkspaceCard />
    </main>
  );
}
```

## Run and choose a theme

`useTheme()` reads the runtime the provider installed and `toggleTheme()` writes to it. The markup carries only four classes — `page`, `primary`, `card` and `muted` — and no CSS.

```tsx title="src/ThemeSwitcher.tsx"
import { useTheme } from "@themvora/react";

export function ThemeSwitcher() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <main className="page">
      <h1>Themvora</h1>
      <p>Current theme: {theme.name} ({mode})</p>

      <button className="primary" type="button" onClick={toggleTheme}>
        Toggle theme
      </button>

      <section className="card">
        <h2>Themed card</h2>
        <p className="muted">Surface, border and text follow the theme.</p>
      </section>
    </main>
  );
}
```

Those four classes are plain CSS. The next step puts the document rule and those classes in a global stylesheet; nothing is inlined or scoped here.

## Add the global stylesheet

Put the document rule and the four classes from step 3 in `src/index.css`. Themvora emits its design tokens as CSS custom properties on the root element, so this stylesheet only reads them.

```css title="src/index.css"
/* Themvora emits its design tokens as CSS custom properties on the root
   element, so a stylesheet only has to read them. Nothing here is
   theme-specific. */
html,
body {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.page {
  min-height: 100vh;
  padding: 2rem;
}

.primary {
  background: var(--theme-color-primary);
  color: var(--theme-color-primaryForeground);
  border: 0;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
}

.card {
  background: var(--theme-color-card);
  border: 1px solid var(--theme-color-border);
  border-radius: 0.75rem;
  margin-top: 1.5rem;
  padding: 1rem;
}

.muted {
  color: var(--theme-color-mutedForeground);
}
```

Load it once from `src/main.tsx` with `import "./index.css";`, so the classes from step 3 pick up the theme.

## Add a small UI

A status card with a heading, a description, a status label and a primary button.

```tsx title="src/components/WorkspaceCard.tsx"
export function WorkspaceCard() {
  return (
    <div className="themvora-example-card">
      <div className="themvora-example-header">
        <h3 className="themvora-example-title">Design system</h3>
        <span className="themvora-example-status">Active</span>
      </div>
      <p className="themvora-example-description">
        Tokens resolve at runtime, so this card follows whichever theme is active.
      </p>
      <p className="themvora-example-meta">Updated 2 minutes ago</p>
      <button className="themvora-example-button" type="button">View themes</button>
    </div>
  );
}
```

## Style it with Themvora tokens

Only the component rules live here — the document rule is in the global stylesheet from step 4, so it is not repeated below. Every colour is a required semantic token, so any theme that passes `validateTheme()` emits it; radius and shadow are optional and carry fallbacks, and no typography token is read.

```css title="src/index.css"
.themvora-example-card {
  display: grid;
  gap: 10px;
  max-width: 22rem;
  padding: 16px;
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg, 12px);
  background: var(--theme-color-card);
  color: var(--theme-color-cardForeground);
  font-family: inherit;
  line-height: 1.5;
  box-shadow: var(--theme-shadow-sm, 0 1px 2px rgb(0 0 0 / 0.06));
}

.themvora-example-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.themvora-example-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.themvora-example-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--theme-color-success);
}

.themvora-example-status::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: currentColor;
}

.themvora-example-description {
  margin: 0;
  font-size: 13px;
  color: var(--theme-color-mutedForeground);
}

.themvora-example-meta {
  margin: 0;
  font-size: 12px;
  color: var(--theme-color-mutedForeground);
}

.themvora-example-button {
  justify-self: start;
  padding: 8px 14px;
  border: 0;
  /* Presets and generated themes emit --theme-radius-lg and nothing else on
     the radius scale, so the smaller step is derived from it rather than
     assumed — the same proportion the utility-class mapping uses. */
  border-radius: calc(var(--theme-radius-lg, 12px) * 0.8);
  background: var(--theme-color-primary);
  color: var(--theme-color-primaryForeground);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.themvora-example-button:hover {
  filter: brightness(1.08);
}

.themvora-example-button:focus-visible {
  outline: 2px solid var(--theme-color-ring);
  outline-offset: 2px;
}
```

`.themvora-example-card` and its children read Themvora tokens, so switching the active theme repaints them — no re-render, and no per-theme CSS.
## Define themes

A theme family is **one definition per mode**, grouped by `meta.family` — the
runtime resolves a `family` + `mode` selection to one of these names.

```ts
// theme/themes.ts
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

The `themes` prop is optional — omit it and the built-in neutral `light`/`dark`
pair is used, which is the quickest way to see it working.

## Reference snippet

```tsx
import { ThemeProvider, useTheme } from "@themvora/react";
import { themes } from "./theme/themes";

export function App() {
  return (
    <ThemeProvider themes={themes} transition={{ enabled: true }}>
      <ThemeSwitcher />
    </ThemeProvider>
  );
}

function ThemeSwitcher() {
  const { theme, family, setFamily, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme}>
      {theme.name} · {family}
    </button>
  );
}
```

## Entry point (CSR)

For a client-rendered Vite/SPA app, mount the provider at the app root:

```tsx
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import { themes } from "./theme/themes";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider themes={themes} defaultTheme="mint-light" initialMode="system">
    <App />
  </ThemeProvider>,
);
```

### Optional: `createThemeRoot` (flash-free initial commit)

React's concurrent root schedules the initial commit, so the browser can paint
an empty/partial frame before the themed tree is in the DOM — visible as a
brief flicker on reload in some applications. `createThemeRoot` is an opt-in
root helper that owns the root boundary and flushes **only the first** commit
synchronously, so the very first frame is already the themed UI:

```tsx
import { createThemeRoot } from "@themvora/react";
import { themes } from "./theme/themes";

const handle = createThemeRoot({
  container: document.getElementById("root")!,
  themes,
  defaultTheme: "mint-light",
  initialMode: "system",
  transition: { enabled: true },
  render: ({ runtime }) => <App />,
});
```

The `render({ runtime })` callback is the application's full composition —
arbitrary provider trees (MUI, Chakra, React Query, Redux, Router, …) stay
entirely under the application's control, and can derive their configuration
from the Themvora runtime:

```tsx
render: ({ runtime }) => (
  <MuiThemeProvider theme={createMuiTheme(runtime)}>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </MuiThemeProvider>
),
```

The handle exposes `root` (the underlying React root), `runtime` (the runtime
created for this root), and `unmount()`. Only the initial render is flushed;
subsequent renders keep React's normal concurrent scheduling.

Use it when you want Themvora to own the root initialization boundary —
reload-sensitive demos, blank-frame-sensitive apps, or apps whose providers
need the Themvora runtime at composition time. **SSR/SSG apps must not use
it** — server-rendered HTML is hydrated with `hydrateRoot()` or a framework
integration (`@themvora/next`, `@themvora/remix`), never replaced by a fresh
`createRoot`.

## Hooks

`useTheme`, `useThemeValue`, `useThemeTokens`, `useThemeMode`, `useThemeFamily`, `useSetThemeMode`, `useSetThemeFamily`, `useToggleTheme`, `useThemeRuntime`, `useThemeHistory`, `useThemeBatch`, `useThemeSnapshot`, `useThemeRestore`, `useThemeTimeTravel`, `useThemeLifecycle`, `useThemePacks`.

## Components

`ThemeProvider`, `ThemeScope`, `ThemeModeButton`, `ThemeInspector`, plus `useScopedTheme(ref, themeName)` for imperative scoping.

## Documentation

Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
