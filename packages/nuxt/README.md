# @themvora/nuxt

## Install

```bash
npm install @themvora/core @themvora/nuxt nuxt
```

`@themvora/nuxt` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

Nuxt 4 module with SSR-first theming, zero-flash bootstrap, cookie + localStorage sync, config-driven transitions and scrollbar, and auto-imported composables/components.

## Set up

```ts
// nuxt.config.ts
import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  // The module owns the provider — there is no component to mount.
  modules: ["@themvora/nuxt"],
  themvora: {
    defaultTheme: "plum-light",
    initialMode: "system",
  },
});
```

`@themvora/nuxt` is a Nuxt **module**. Import the composables from
`@themvora/vue` in app code — Nuxt's import-protection rejects importing a
module's entry-point from an application file.

## Add a small UI

A heading, a card and a button. The button reads the current theme and changes
it — nothing is styled yet.

```vue
<script setup lang="ts">
import { useTheme } from "@themvora/vue";

const { theme, mode, toggleTheme } = useTheme();
</script>

<template>
  <main class="page">
    <h1>Themvora</h1>
    <p>{{ theme.name }} · {{ mode }}</p>
    <button type="button" @click="toggleTheme()">Toggle theme</button>
  </main>
</template>
```

## Style it with Themvora tokens

Themvora emits the active theme's tokens as CSS custom properties, so the
document itself is themed and your own classes read the same variables without
any per-theme CSS. The rules use only required semantic colours — spacing,
typography and layout stay ordinary CSS:

```css
html,
body {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.page {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.card {
  background: var(--theme-color-card);
  color: var(--theme-color-cardForeground);
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg, 12px);
  padding: 1rem;
}
```

Nothing is re-rendered on a switch — the variables change and the styles follow.

## Reference snippet

```ts
// nuxt.config.ts
import { themes } from "./themes";

export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    themes,
    defaultTheme: "mint-light",
    initialMode: "system",
    initialFamily: "mint",
    transition: { enabled: true, duration: 360, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
    scrollbar: true,
  },
});
```

```vue
<script setup>
// useTheme, useThemeRuntime, useThemeHistory, ThemeScope, ThemeScrollbar …
// are auto-imported by the module — no manual imports needed.
const { theme, mode, setMode, toggleTheme } = useTheme();
</script>

<template>
  <div>
    <span>{{ theme.name }} | {{ mode }}</span>
    <button @click="toggleTheme">Toggle</button>
    <button @click="setMode('light')">Light</button>
    <button @click="setMode('dark')">Dark</button>
    <button @click="setMode('system')">System</button>

    <ThemeScope theme="forest-light">
      <p>Scoped to forest-light</p>
    </ThemeScope>

    <ThemeScrollbar auto-hide />
  </div>
</template>
```

## Server

The module's runtime plugin resolves the initial theme on the server from the `theme-name`, `theme-mode`, `theme-family` and `theme-fingerprint` cookies, rejects stale selections via a config fingerprint, and renders a themed `<html data-theme data-theme-mode data-theme-family>` with inline CSS variables, a blocking bootstrap `<script>` in `<head>`, and a `@media (prefers-color-scheme: dark)` fallback when the persisted mode is `system`. The browser paints already themed — no flash of the incorrect theme.

## Client

After hydration, the plugin installs one app-wide runtime (provided to `useTheme()` and every auto-imported composable, plus `nuxtApp.$themvora` / `$themvoraRuntime`). Selection changes are mirrored back to cookies via `createNuxtThemePersistence()` so the server renders the same theme on the next request, and localStorage + `storage` events keep tabs in sync.

## Config

`configKey: "themvora"` accepts:

- `themes`, `defaultTheme`, `initialMode`, `initialFamily`
- `transition` — `false`, or `{ enabled, duration, easing }` for config-driven CSS transitions on theme changes
- `scrollbar` — `true`, or overlay options (thickness, radius, colors, auto-hide, …) for the theme-aware custom scrollbar
- `storageKey` — localStorage key (default `theme-selection`)

## Module

- Nuxt 4 module (`configKey: "themvora"`) with `themes`, `defaultTheme`, `initialMode`, `initialFamily`, `transition`, `scrollbar` and `storageKey` options.
- Auto-imports composables, registers `ThemeProvider`, `ThemeScope` and `ThemeScrollbar`, and installs the runtime plugin.
- Re-exports the Vue integration plus the full `@themvora/core` surface, and the SSR helpers (`resolveThemeFromCookies`, `computeFingerprint`, `parseCookieHeader`, `themvoraCookieNames`, `createNuxtThemeBootstrapScript`).

## Documentation

Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
