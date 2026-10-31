# Themvora + Vue

Runnable parity app for the `@themvora/vue` integration.

- **Stack:** Vite 6 + Vue 3 + Tailwind CSS v4.
- **Integration:** `@themvora/vue` — `<ThemeProvider>`, `<ThemeScope>`, `<ThemeScrollbar>` components and the `useTheme()` composable.
- **Shared fixtures:** `@themvora/app-shared`.

## Layout

```
src/
  main.ts                 # createApp(App).mount("#app")
  App.vue                 # <ThemeProvider> wrapper + page shell + <ThemeScrollbar>
  components/ThemvoraDefault.vue   # the reference page, using refs from useTheme()
  components/ThemeSwitcher.vue
  index.css
```

`useTheme()` returns `theme`, `mode`, `family` as refs plus `setMode`,
`setFamily`, `toggleTheme`. Components are used directly (they can also be
registered globally with `app.use(...)`).

## Run

```bash
pnpm --filter @themvora/app-vue dev        # http://localhost:5191
pnpm --filter @themvora/app-vue build      # vue-tsc --noEmit && vite build
pnpm --filter @themvora/app-vue typecheck
pnpm --filter @themvora/app-vue preview
```
