# Themvora + Remix

Runnable parity app for the `@themvora/remix` integration (Remix v2 + Vite, SSR).

- **Stack:** Remix v2 + React 19 + Tailwind CSS v4 (`@tailwindcss/vite`).
- **Integration:** `ThemeHead` + `getThemeShellProps` + `ThemeProvider` from
  `@themvora/remix`, the server resolver `getInitialThemeState` from
  `@themvora/remix/server`, and the `useTheme` / `ThemeScope` / `ThemeScrollbar`
  re-exports.
- **Shared fixtures:** `@themvora/app-shared`.

## Layout

```
vite.config.ts            # remix() + @tailwindcss/vite
app/
  root.tsx                # loader -> getInitialThemeState; <html {...getThemeShellProps(initial)}>;
                          # <ThemeHead> in <head>; <ThemeProvider> in <body>
  components/
    scrollbar-icons.tsx   # the overlay's arrow glyphs as JSX (React, not markup strings)
  routes/_index.tsx       # reference page
  styles.css
  env.d.ts
```

The root loader resolves the persisted selection from the request
(`getInitialThemeState(request, { themes, defaultTheme, mode })`) and hands it to
`getThemeShellProps` for the document element and to `<ThemeProvider initial>`.
`<ThemeHead>` emits the blocking bootstrap and the `prefers-color-scheme` dark
CSS. Persistence is cookie + localStorage via `createRemixThemePersistence`
(wired by the provider).

### Framework-specific behaviour

Remix owns the document (`<html>`/`<body>` are written in `root.tsx`); the
Themvora provider renders only its children, unlike the Next.js provider which
renders the shell itself.

Because the blocking script rewrites `<html>` before first paint, the layout has
to render the same attributes — `getThemeShellProps` does that, including the
`suppressHydrationWarning` that covers the resolved mode the server cannot know
(`"system"` against a dark OS). It also renders the `tv-scrollbar` class, which
is what lets `ThemeHead`'s `scrollbar` CSS hide the native bar from the first
frame. Rendering a bare `<html lang="en">` instead produces a React hydration
mismatch on every load; `scripts/release/verify-remix-startup.mjs` is the gate
that catches it.

## Run

```bash
pnpm --filter @themvora/app-remix dev        # http://localhost:5200
pnpm --filter @themvora/app-remix build      # remix vite:build
pnpm --filter @themvora/app-remix typecheck  # tsc --noEmit
pnpm --filter @themvora/app-remix preview    # remix-serve (PORT=5200)
```
