# Themvora + React (reference app)

The canonical reference implementation for the whole `examples/apps/` suite. Every
other app reproduces the sections and interactions described in
[`../feature-parity.md`](../feature-parity.md).

- **Stack:** Vite 6 + React 19 + Tailwind CSS v4 (`@tailwindcss/vite`).
- **Integration:** `@themvora/react` (`ThemeProvider`, `useTheme`, `ThemeScope`, `ThemeScrollbar`) + `@themvora/core` + `@themvora/tailwind`.
- **Shared fixtures:** `@themvora/app-shared` (brand themes + selected presets, UI class strings, copy).

## Layout

```
src/
  main.tsx                    # ThemeProvider + theme registry
  App.tsx                     # page shell + ThemeScrollbar over a 100-line overflow box
  components/ThemvoraDefault.tsx   # hero, controls, live preview, tokens, snippets, scope
  components/ThemeSwitcher.tsx     # toggle light/dark
  themes/themes.ts            # re-exports the shared brand/preset fixtures
  index.css                   # Tailwind + @themvora/tailwind + shared base
```

## Run

```bash
pnpm --filter @themvora/app-react dev        # http://localhost:5190
pnpm --filter @themvora/app-react build      # tsc --noEmit && vite build
pnpm --filter @themvora/app-react typecheck
pnpm --filter @themvora/app-react preview
```

Provider setup lives in `src/main.tsx`: `initialMode="light"`, a
`defaultTheme`, and a 250ms transition, wrapping `<App />` in `<ThemeProvider>`.
