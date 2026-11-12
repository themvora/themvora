# @themvora/next

## Install

```bash
npm install @themvora/core @themvora/next next
```

`@themvora/next` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

Next.js App Router theming with SSR-safe hydration, cookie persistence, and zero flash of incorrect theme.

## Set up

`ThemeProvider` in `@themvora/next` is a server component. It reads the theme cookies during the request and renders `<html data-theme>` — and `<body>` — itself, with the resolved variables already inline. Do not wrap it in `<html>` or `<body>`; the provider owns both elements, which is what makes the first byte correct.

```tsx title="app/layout.tsx"
import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@themvora/next";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    // ThemeProvider renders <html> and <body> itself — do not wrap it in them.
    <ThemeProvider
      defaultTheme="light"
      body={{ className: geist.className }}
    >
      <main>
        {children}
      </main>
    </ThemeProvider>
  );
}
```

## Run and choose a theme

The toggle is a client component: `useTheme()` from `@themvora/next/client` reads the runtime the server provider installed. The markup carries only four classes — `page`, `primary`, `card` and `muted` — and no CSS.

```tsx title="app/theme-switcher.tsx"
"use client";
import { useTheme } from "@themvora/next/client";

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

Put the document rule and the four classes from step 3 in `app/globals.css`. Themvora emits its design tokens as CSS custom properties on the root element, so this stylesheet only reads them.

```css title="app/globals.css"
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

Load it once from `app/layout.tsx` with `import "./globals.css";`, so the classes from step 3 pick up the theme.

## Add a small UI

A status card with a heading, a description, a status label and a primary button.

```tsx title="app/workspace-card.tsx"
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

```css title="app/globals.css"
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
## Reference snippet

```tsx
// app/layout.tsx
import { ThemeProvider } from "@themvora/next";

export default function RootLayout({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

// ThemeProvider accepts everything a plain <html> element does —
// className, style, dir, data-*, etc. — plus `body` for the <body> element.
export default function RootLayout({ children }) {
  return (
    <ThemeProvider
      className="antialiased"
      dir="ltr"
      data-custom="anything"
      body={{ className: "font-sans" }}
    >
      {children}
    </ThemeProvider>
  );
}

// components/ThemeSwitcher.tsx
"use client";
import { useTheme } from "@themvora/next/client";

export function ThemeSwitcher() {
  const { theme, mode, setMode, toggleTheme } = useTheme();
  return (
    <div>
      <span>{theme.name} | {mode}</span>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setMode("light")}>Light</button>
      <button onClick={() => setMode("dark")}>Dark</button>
      <button onClick={() => setMode("system")}>System</button>
    </div>
  );
}
```

## Server

`ThemeProvider` (Server Component) — reads `theme-mode`, `theme-family`, `theme-fingerprint` cookies, validates the fingerprint, resolves the initial theme, and renders `<html data-theme>` with inline CSS variables plus a blocking bootstrap script and dark-mode CSS fallback. It accepts every native `<html>` attribute (`lang`, `dir`, `className`, `style`, `data-*`, ...) and forwards them to the rendered element — user `className`/`style` are merged with the SSR theme output. Pass `body={{ className, ... }}` to forward attributes to the `<body>` element. `createNextThemePersistence()` mirrors selection to cookies.

## Client

`ClientThemeProvider` (cookie + localStorage, fingerprint, `.dark` class sync), `ThemeBootstrap`, and `@themvora/next/client` which re-exports every React hook plus `ThemeScope`, `ThemeInspector`, `ThemeModeButton`.

## Documentation

Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
