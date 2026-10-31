# @themvora/vue

## Install

```bash
npm install @themvora/core @themvora/vue
```

`@themvora/vue` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

Vue 3 composables-first theming with a provider component and scoped theming.

## Set up

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
import { themes } from "./theme/themes";
</script>

<template>
  <ThemeProvider :themes="themes" default-theme="mint-light">
    <Page />
  </ThemeProvider>
</template>
```

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

```vue
<script setup>
import { useTheme } from "@themvora/vue";
const { theme, mode, toggleTheme } = useTheme();
</script>

<template>
  <button @click="toggleTheme">{{ theme.name }} · {{ mode }}</button>
</template>
```

## Setup

`ThemeProvider` auto-registered via `app.use` (`.install`); `provideThemeRuntime()` / `useThemeRuntime()` for explicit provide/inject.

## Composables

`useTheme`, `useThemeHistory`, `useThemeBatch`, `useThemeSnapshot`, `useThemeRestore`, `useThemeLifecycle`, `useThemePacks`.

## Components

`ThemeScope` — scoped theming component for subtrees.

## Documentation

Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
