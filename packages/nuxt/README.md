# @themvora/nuxt

## Install

```bash
npm install @themvora/core @themvora/nuxt nuxt
```

`@themvora/nuxt` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

Nuxt 4 module with SSR-first theming, zero-flash bootstrap, cookie + localStorage sync, config-driven transitions and scrollbar, and auto-imported composables/components.

## Set up

One module. It resolves the initial theme on the server from cookies, registers the client runtime once as a plugin, and auto-imports the composables and components.

```ts title="nuxt.config.ts"
export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  // Nuxt 4: the app lives in app/, so "~" resolves this to
  // app/assets/css/main.css (the file from the styling step).
  css: ["~/assets/css/main.css"],
  themvora: {
    defaultTheme: "light",
  },
});
```

## Run and choose a theme

`useTheme()` is auto-imported by the module, so the component needs no import line. Mount it with the card in `app/app.vue` — Nuxt auto-registers anything in `app/components/`. The markup carries only four classes — `page`, `primary`, `card` and `muted` — and no CSS.

```vue title="app/components/ThemeSwitcher.vue"
<script setup lang="ts">
// useTheme is auto-imported by the module — no import statement needed.
const { theme, mode, toggleTheme } = useTheme();
</script>

<template>
  <main class="page">
    <h1>Themvora</h1>
    <p>Current theme: {{ theme.name }} ({{ mode }})</p>

    <button class="primary" type="button" @click="toggleTheme">Toggle theme</button>

    <section class="card">
      <h2>Themed card</h2>
      <p class="muted">Surface, border and text follow the theme.</p>
    </section>
  </main>
</template>
```

```vue title="app/app.vue"
<template>
  <div>
    <ThemeSwitcher />
    <WorkspaceCard />
  </div>
</template>
```

Those four classes are plain CSS. The next step puts the document rule and those classes in a global stylesheet; nothing is inlined or scoped here.

## Add the global stylesheet

Put the document rule and the four classes from step 3 in `app/assets/css/main.css`. Themvora emits its design tokens as CSS custom properties on the root element, so this stylesheet only reads them.

```css title="app/assets/css/main.css"
/* Themvora emits its design tokens as CSS custom properties on the root
   element, so a stylesheet only has to read them. Nothing here is
   theme-specific. */
html,
body {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.page {
  min-height: 100vh;
  padding: 2rem;
}

.primary {
  background: var(--theme-color-primary);
  color: var(--theme-color-primaryForeground);
  border: 0;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
}

.card {
  background: var(--theme-color-card);
  border: 1px solid var(--theme-color-border);
  border-radius: 0.75rem;
  margin-top: 1.5rem;
  padding: 1rem;
}

.muted {
  color: var(--theme-color-mutedForeground);
}
```

Load it once from `nuxt.config.ts` with `css: ["~/assets/css/main.css"]`, so the classes from step 3 pick up the theme.

## Add a small UI

A status card with a heading, a description, a status label and a primary button.

```vue title="app/components/WorkspaceCard.vue"
<template>
  <div class="themvora-example-card">
    <div class="themvora-example-header">
      <h3 class="themvora-example-title">Design system</h3>
      <span class="themvora-example-status">Active</span>
    </div>
    <p class="themvora-example-description">
      Tokens resolve at runtime, so this card follows whichever theme is active.
    </p>
    <p class="themvora-example-meta">Updated 2 minutes ago</p>
    <button class="themvora-example-button" type="button">View themes</button>
  </div>
</template>
```

## Style it with Themvora tokens

Only the component rules live here — the document rule is in the global stylesheet from step 4, so it is not repeated below. Every colour is a required semantic token, so any theme that passes `validateTheme()` emits it; radius and shadow are optional and carry fallbacks, and no typography token is read.

```css title="app/assets/css/main.css"
.themvora-example-card {
  display: grid;
  gap: 10px;
  max-width: 22rem;
  padding: 16px;
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg, 12px);
  background: var(--theme-color-card);
  color: var(--theme-color-cardForeground);
  font-family: inherit;
  line-height: 1.5;
  box-shadow: var(--theme-shadow-sm, 0 1px 2px rgb(0 0 0 / 0.06));
}

.themvora-example-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.themvora-example-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.themvora-example-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--theme-color-success);
}

.themvora-example-status::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: currentColor;
}

.themvora-example-description {
  margin: 0;
  font-size: 13px;
  color: var(--theme-color-mutedForeground);
}

.themvora-example-meta {
  margin: 0;
  font-size: 12px;
  color: var(--theme-color-mutedForeground);
}

.themvora-example-button {
  justify-self: start;
  padding: 8px 14px;
  border: 0;
  /* Presets and generated themes emit --theme-radius-lg and nothing else on
     the radius scale, so the smaller step is derived from it rather than
     assumed — the same proportion the utility-class mapping uses. */
  border-radius: calc(var(--theme-radius-lg, 12px) * 0.8);
  background: var(--theme-color-primary);
  color: var(--theme-color-primaryForeground);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.themvora-example-button:hover {
  filter: brightness(1.08);
}

.themvora-example-button:focus-visible {
  outline: 2px solid var(--theme-color-ring);
  outline-offset: 2px;
}
```

`.themvora-example-card` and its children read Themvora tokens, so switching the active theme repaints them — no re-render, and no per-theme CSS.
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
