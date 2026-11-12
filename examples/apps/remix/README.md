# Themvora + Remix

Runnable parity app for the `@themvora/remix` integration (Remix v2 + Vite, SSR).

- **Stack:** Remix v2 + React 19 + Vite, plain CSS.
- **Integration:** `createThemeDocument()` from `@themvora/remix` derives the
  loader helper and the document component from one configuration. `Document`
  renders the blocking head script, the matching `<html>` shell and the
  provider; `ThemeScrollbar` and the `useTheme` / `useThemeHistory` /
  `ThemeScope` hooks are re-exported through the adapter.
- **Scaffold:** official Remix v2 template, updated to the current
  Remix 2.17 / React 19 versions. Remix v2 is in maintenance mode upstream.

## Layout

```
vite.config.ts                 # remix() + tsconfig paths, port 5200
app/
  root.tsx                     # createThemeDocument -> loader + <theming.Document>;
                               # <ThemeScrollbar>; themed <html> and provider
  routes/_index.tsx            # mode buttons, toggle, themed card
  components/
    workspace-card.tsx         # the shared quick-start card
    history-scope.tsx          # ThemeScope + history controls
  themes.ts                    # custom-theme example
  styles.css                   # the canonical token-driven stylesheet
```

## Run

```bash
pnpm --filter @themvora/app-remix dev        # http://localhost:5200
pnpm --filter @themvora/app-remix build      # remix vite:build
pnpm --filter @themvora/app-remix typecheck  # tsc --noEmit
pnpm --filter @themvora/app-remix preview    # remix-serve (PORT=5200)
```
