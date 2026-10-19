# @themvora/next

## Install

```bash
npm install @themvora/core @themvora/next next
```

`@themvora/next` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

Next.js App Router theming with SSR-safe hydration, cookie persistence, and zero flash of incorrect theme.

## Set up

```tsx
// app/layout.tsx
import { ThemeProvider } from "@themvora/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider lang="en" defaultTheme="plum-light">{children}</ThemeProvider>;
}
```

`ThemeProvider` renders `<html>` and `<body>` itself — do not wrap it in them.

### With Cache Components (Next 16)

Nothing extra is needed. `ThemeProvider` renders a **request-independent document
shell**, so a route that hosts it is prerenderable and no route-segment export is
required — in particular, **no `export const instant = false`**.

Cache Components rejects a route that reads request data (`cookies()`,
`headers()`) outside a `<Suspense>` boundary. `ThemeProvider` keeps that read
*inside* a boundary: the `<html>`/`<head>`/`<body>` shell resolves from your
configured `themes`/`defaultTheme` alone, and the persisted selection is resolved
in a nested server component beneath `<Suspense>`. The route therefore prerenders
as a static shell with a dynamic, request-aware hole.

The persisted theme reaches the first paint through two mechanisms that agree
with each other:

- the blocking bootstrap script in `<head>` reads the theme cookies in the
  browser and writes the resolved theme onto `<html>` before the first visible
  frame — so the shell's default never flashes; and
- the Suspense-gated server component resolves the same cookies and hands the
  selection to the client runtime, so the streamed, server-rendered subtree and
  the hydrated provider both carry the visitor's theme.

The shell itself names the default theme; the script and the resolved subtree
carry the persisted selection. React's hydration attribute check is suppressed on
`<html>` — the one element the script owns — never on the application subtree.

Because the persisted selection is resolved server-side, a crawler or a client
that runs the bootstrap still resolves a valid selection; the static shell is the
request-independent fallback, not the final state.

## Add a small UI

A heading, a card and a button. The button reads the current theme and changes
it — nothing is styled yet.

```tsx
// app/page.tsx
"use client";

import { useTheme } from "@themvora/next/client";

export default function Page() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <main className="page">
      <h1>Themvora</h1>
      <p>
        {theme.name} · {mode}
      </p>
      <button onClick={toggleTheme}>Toggle theme</button>
    </main>
  );
}
```

`useTheme` lives on `@themvora/next/client`, not the package root — the root export is the server-side provider.

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
