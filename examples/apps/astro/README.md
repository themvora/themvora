# Themvora + Astro

Runnable parity app for the `@themvora/astro` integration — React-free, no client
island.

- **Stack:** Astro 7 + Tailwind CSS v4 (`@tailwindcss/vite`).
- **Integration:** the `themvora()` integration, `provider.astro` (server-rendered
  `<html>` + pre-paint bootstrap), `ThemeToggle.astro`, `ThemeScrollbar.astro`,
  and the browser controller `getThemeController()` from `@themvora/astro/runtime`.
- **Shared fixtures:** `@themvora/app-shared`, surfaced through `src/themes.ts`
  so `theme.config.ts` stays the single declaration the integration discovers.

## Layout

```
astro.config.mjs            # integrations: [themvora()], @tailwindcss/vite
theme.config.ts             # defineThemvoraConfig({ themes, defaultTheme, initialMode })
src/
  themes.ts                 # re-exports @themvora/app-shared/themes
  layouts/BaseLayout.astro  # <Provider config={themeConfig} scrollbar bootstrap={false}>
  pages/index.astro         # reference page + <ThemeToggle /> + <ThemeScrollbar />
  styles/global.css
```

Server-rendered content comes from `provider.astro`; interaction comes from the
Astro-native `<ThemeToggle>` and a bundled `<script>` that calls
`getThemeController()` to drive `<themvora-select>`-free buttons and the token
readouts.

### Framework-specific behaviour

`@themvora/astro`'s `<ThemeScope>` component is React-only, so the framework-free
app scopes the region with the core `createScopedThemeBinding()` (the same
binding every adapter uses) instead of mounting a React island.

## Run

```bash
pnpm --filter @themvora/app-astro dev        # http://localhost:5197
pnpm --filter @themvora/app-astro build      # astro build
pnpm --filter @themvora/app-astro typecheck  # astro check
pnpm --filter @themvora/app-astro preview
```
