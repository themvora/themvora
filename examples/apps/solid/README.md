# Themvora + Solid

Runnable parity app for the `@themvora/solid` integration.

- **Stack:** Vite 6 + SolidJS + Tailwind CSS v4.
- **Integration:** `@themvora/solid` — `<ThemeProvider>`, `<ThemeScope>`, `<ThemeScrollbar>` and the signal-based `useTheme()`.
- **Shared fixtures:** `@themvora/app-shared`.

## Layout

```
src/
  index.tsx               # render(() => <App />, root)
  App.tsx                 # <ThemeProvider> + <ThemeScrollbar>>(behavior.autoHide=false)
  components/ThemvoraDefault.tsx   # reference page; theme/mode/family are accessors
  components/ThemeSwitcher.tsx
  index.css
```

Solid is reactive through signals: `useTheme()` returns `theme()`, `mode()`,
`family()` accessors plus `setMode`, `setFamily`, `toggleTheme`. No React hooks
are used anywhere — the implementation is native Solid.

## Run

```bash
pnpm --filter @themvora/app-solid dev        # http://localhost:5193
pnpm --filter @themvora/app-solid build      # tsc --noEmit && vite build
pnpm --filter @themvora/app-solid typecheck
pnpm --filter @themvora/app-solid preview
```
