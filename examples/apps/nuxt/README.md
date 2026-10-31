# Themvora + Nuxt

Runnable parity app for the `@themvora/nuxt` module.

- **Stack:** Nuxt 4 + Vue 3 + Tailwind CSS v4 (`@tailwindcss/vite`).
- **Integration:** the `@themvora/nuxt` module (auto-imports + runtime plugin +
  cookie SSR). The module owns the provider — there is no provider component to
  mount.
- **Shared fixtures:** `@themvora/app-shared`.

## Layout

```
nuxt.config.ts            # modules: ["@themvora/nuxt"], themvora: { themes, defaultTheme, initialMode, transition }
app/
  app.vue                 # reference page; `useTheme`, `<ThemeScope>`, `<ThemeScrollbar>` are auto-imported
  assets/css/main.css
```

The module auto-registers `ThemeProvider`, `ThemeScope`, `ThemeScrollbar`
(prefix `""`) and auto-imports the `@themvora/vue` composables. The runtime
plugin resolves the cookie selection on the server, writes the `data-theme*`
attributes and zero-flash style/script into `<head>`, and builds the client
runtime with cookie + localStorage persistence.

### Framework-specific behaviour

`nuxt.config.ts` casts the Tailwind Vite plugin (`as never`) only to silence a
Vite-copy type clash with Nuxt's own Vite in type-check; the production build is
unaffected.

The overlay scrollbar is split the way the module requires:

- `themvora.scrollbar: true` makes the server emit the native-hiding CSS and the
  `tv-scrollbar` class on `<html>`, so the native bar is never painted — no
  flash on reload.
- `css: ["@themvora/core/scrollbar.css"]` ships the overlay styles (the scrollbar
  styles live in core, not the module).
- `<ThemeScrollbar>` in `app/app.vue` draws the overlay after hydration.

## Run

```bash
pnpm --filter @themvora/app-nuxt dev        # http://localhost:5199
pnpm --filter @themvora/app-nuxt build      # nuxt build
pnpm --filter @themvora/app-nuxt typecheck  # nuxt typecheck
pnpm --filter @themvora/app-nuxt preview
```
