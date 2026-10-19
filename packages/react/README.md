# @themvora/react

## Install

```bash
npm install @themvora/core @themvora/react
```

`@themvora/react` builds on `@themvora/core` and a framework integration, so those are installed explicitly rather than relied on transitively.

React 18/19 integration for Themvora. Provider + hooks over the framework-agnostic `@themvora/core` runtime.

## Set up

```tsx
import { ThemeProvider } from "@themvora/react";
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
import { useTheme } from "@themvora/react";

export function Page() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <main className="page">
      <h1>Themvora</h1>
      <p>
        {theme.name} · {mode}
      </p>
      <button onClick={toggleTheme}>Toggle theme</button>
      <section className="card">
        <h2>Themed card</h2>
        <p>Nothing is styled yet.</p>
      </section>
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
