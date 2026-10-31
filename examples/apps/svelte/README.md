# Themvora + Svelte

Runnable parity app for the `@themvora/svelte` integration.

- **Stack:** Vite 6 + Svelte 5 (runes) + Tailwind CSS v4.
- **Integration:** `@themvora/svelte` — `<ThemeProvider>`, `<ThemeScope>`, `<ThemeScrollbar>` (Svelte 5 components) and the readable-store `useTheme()`.
- **Shared fixtures:** `@themvora/app-shared`.

## Layout

```
src/
  main.ts                 # mount(App, { target })
  App.svelte              # <ThemeProvider> (children passed as the default snippet)
  components/ThemvoraDefault.svelte   # reference page
  components/ThemeSwitcher.svelte
  index.css
```

`useTheme()` returns `theme`, `mode`, `family` readable stores plus `setMode`,
`setFamily`, `toggleTheme`; the template reads them with the `$store` syntax
(`{$theme.meta?.label}`, `{$mode}`, `aria-pressed={$mode === item}`). Local copy
state uses runes (`$state`, `$derived`).

This app is a client-side Vite app. SvelteKit usage is documented in the Themvora
framework guide (`theme.config.ts` + `themvoraVitePlugin()` for the pre-paint
bootstrap).

## Run

```bash
pnpm --filter @themvora/app-svelte dev        # http://localhost:5192
pnpm --filter @themvora/app-svelte build      # svelte-check && vite build
pnpm --filter @themvora/app-svelte typecheck
pnpm --filter @themvora/app-svelte preview
```
