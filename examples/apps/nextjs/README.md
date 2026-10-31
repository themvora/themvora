# Themvora + Next.js

Runnable parity app for the `@themvora/next` integration (App Router, SSR).

- **Stack:** Next.js 15 (App Router) + React 19 + Tailwind CSS v4 (`@tailwindcss/postcss`).
- **Integration:** server `ThemeProvider` from `@themvora/next` (renders
  `<html>`/`<body>` + the blocking cookie bootstrap), client hooks from
  `@themvora/next/client`, and `ThemeScope`/`ThemeScrollbar` from `@themvora/react`.
- **Shared fixtures:** `@themvora/app-shared`.

## Layout

```
next.config.ts
postcss.config.mjs
app/
  layout.tsx                 # <ThemeProvider lang themes defaultTheme transition scrollbar>
  page.tsx                   # server component -> <ThemvoraDefault />
  globals.css
  components/ThemvoraDefault.tsx   # "use client" reference page
  components/ThemeSwitcher.tsx     # "use client"
```

The root `ThemeProvider` renders the document shell itself (do **not** wrap it in
your own `<html>`); the persisted selection is resolved from cookies inside a
nested server component under `<Suspense>` and applied pre-paint by the blocking
bootstrap. `useTheme` lives on `@themvora/next/client`, not the package root.
Persistence is cookie-backed (`theme-mode`, `theme-family`, `theme-fingerprint`).

## Run

```bash
pnpm --filter @themvora/app-nextjs dev        # http://localhost:5198
pnpm --filter @themvora/app-nextjs build      # next build (type-checks too)
pnpm --filter @themvora/app-nextjs typecheck  # tsc --noEmit
pnpm --filter @themvora/app-nextjs preview    # next start
```
