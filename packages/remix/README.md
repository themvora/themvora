# @themvora/remix

## Install

```bash
npm install @themvora/core @themvora/remix @remix-run/react
```

`@themvora/remix` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

Remix owns the server/client boundary: loader SSR resolution, a blocking head
script, and React hydration.

```
GET request
    ↓
root loader → getInitialThemeState(request, { themes })
    ↓
HTML document (themed <html> + <ThemeHead> bootstrap)
    ↓
browser hydration → <ThemeProvider initial> → React theme runtime
```

## Set up

```tsx
// app/root.tsx
import { ThemeProvider } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";

export async function loader({ request }: { request: Request }) {
  return {
    initial: await getInitialThemeState(request, {
      themes,
      defaultTheme: "plum-light",
      mode: "system",
    }),
  };
}
```

Resolving the theme in the `loader` is what removes the flash — the first byte
is already correct, so nothing swaps on hydration.

## Add a small UI

A heading, a card and a button. The button reads the current theme and changes
it — nothing is styled yet.

```tsx
// app/routes/_index.tsx
"use client";

import { useTheme } from "@themvora/remix";

export default function Index() {
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
// app/root.tsx
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { ThemeHead, ThemeProvider } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";
import { themes } from "./themes";

export async function loader({ request }: { request: Request }) {
  return { initial: await getInitialThemeState(request, { themes }) };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { initial } = useLoaderData<typeof loader>();
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
        <ThemeHead themes={themes} />
      </head>
      <body>
        <ThemeProvider initial={initial} themes={themes}>
          {children}
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

## Server

`getInitialThemeState` (from `@themvora/remix/server`) reads the `theme-mode` /
`theme-family` cookies off the request and resolves the initial state;
`ThemeHead` emits the pre-paint blocking bootstrap plus the
`prefers-color-scheme` dark fallback; `createRemixThemePersistence()` and
`computeFingerprint()` handle persistence and stale-cookie rejection.

## Client

`ThemeProvider` hydrates against the loader-resolved `initial` state and mirrors
the selection back to cookies. The full React hook set and `ThemeScope` are
re-exported from `@themvora/react`.

> `createThemeRoot()` is a React-SPA-only bootstrap — don't use it in Remix.
> Remix owns the application/document lifecycle.

## Documentation

Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
