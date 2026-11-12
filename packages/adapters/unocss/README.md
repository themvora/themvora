<!--
  Generated file — do not edit by hand.

  Integration content comes from apps/docs/lib/libraries.tsx
  (FRAMEWORK_RECIPES); package prose from scripts/readme/library-notes.mjs.

  Regenerate:  pnpm docs:sync-library-readmes
  Verify:      pnpm docs:check-library-readmes
-->

# @themvora/unocss

Themvora adapter for UnoCSS.

Expose Theme semantic tokens as UnoCSS utilities (`bg-primary`, `rounded-lg`) that reference live CSS variables.

- **Package** — `@themvora/unocss`
- **Library** — UnoCSS
- **Bridge** — Build time
- **Frameworks** — React, Next.js, Astro, Vue 3, Svelte
- **Documentation** — [themvora-dev.vercel.app/libraries/unocss](https://themvora-dev.vercel.app/libraries/unocss)
- **License** — MIT

## How it works

`presetThemvora()` generates utilities — `bg-primary`, `text-muted-foreground`, `border-border`, `rounded-lg` — whose declarations reference `--theme-*` variables. The classes are produced at build time; the values resolve at runtime, so a theme change repaints without a rebuild and without a second utility set per theme.

## Features

`@themvora/unocss` ships 3 exports in 2 categories. Each one is documented, with a runnable example, on the [library page](https://themvora-dev.vercel.app/libraries/unocss/examples).

### Preset

- **`presetThemvora()`** — UnoCSS preset mapping semantic tokens to utilities:
  `bg-primary`, `text-foreground`, `border-border`, `rounded-lg`, `shadow-lg`.
  Values reference `--theme-*` variables and update at runtime.
- **`createUnoTheme(source)`** — Returns a static UnoCSS theme object (colors,
  radii, shadows) with concrete values for build-time generation.

### Types

- **`ThemeTokens`** — Re-exports the semantic token shape from `@themvora/core`.

## Supported frameworks

UnoCSS is documented for 5 frameworks here. Each combination below has its own recipe on the documentation page, and its own section in this README.

| Framework | Verified against | Setup |
| --- | --- | --- |
| React | 19.3.1 | [React setup](#react) |
| Next.js | 15.5.28 | [Next.js setup](#nextjs) |
| Astro | 5.14.1 | [Astro setup](#astro) |
| Vue 3 | 3.5.44 | [Vue 3 setup](#vue-3) |
| Svelte | 5.57.3 | [Svelte setup](#svelte) |

## Requirements

- **Node.js** — 22.22.2. This is the version the integration is verified
  against, not a hard floor.
- **UnoCSS** — 66.7.5.

The project each framework expects is listed per framework:

| Framework | Project |
| --- | --- |
| React | Vite + React project (`npm create vite@latest -- --template react-ts`). |
| Next.js | Next.js App Router project. The recipe edits `app/layout.tsx`. |
| Astro | Astro project with the React integration (`npx astro add react`). The adapter runs in a `client:only="react"` island. |
| Vue 3 | Vite + Vue 3 project (`npm create vite@latest -- --template vue-ts`). |
| Svelte | Svelte 5 + Vite project (`npm create vite@latest -- --template svelte-ts`). |

## Installation

Installing this integration is two commands: the library first, then Themvora.
The commands are **framework-specific** — the library's own toolchain differs
between Vite, Next.js, Nuxt, Angular and Astro, and shadcn/ui, daisyUI and
UnoCSS install through a CLI or a build plugin rather than a plain package.
There is therefore no single install line that is correct for every framework;
the exact commands for yours are in its section below.

The documentation page shows them behind package-manager tabs. A README cannot,
so every section repeats the same commands under all four headings. The verbs
each manager uses:

| Package manager | Add a dependency | Add a dev dependency | Run a package |
| --- | --- | --- | --- |
| pnpm | `pnpm add` | `pnpm add -D` | `pnpm dlx` |
| npm | `npm install` | `npm install -D` | `npx` |
| yarn | `yarn add` | `yarn add -D` | `yarn dlx` |
| bun | `bun add` | `bun add -d` | `bunx` |

`@themvora/core` is a normal dependency of `@themvora/unocss` and of the framework
integration, so it arrives with them. Naming it in the command pins the
runtime version in your own manifest.

## React

Verified against React 19.3.1 and Node.js 22.22.2.

### Install

Install UnoCSS first, then Themvora. Both commands are the ones the
documentation page shows for React.

#### pnpm

```bash
pnpm add -D unocss @unocss/vite
pnpm add @themvora/core @themvora/react @themvora/unocss
```

#### npm

```bash
npm install -D unocss @unocss/vite
npm install @themvora/core @themvora/react @themvora/unocss
```

#### yarn

```bash
yarn add -D unocss @unocss/vite
yarn add @themvora/core @themvora/react @themvora/unocss
```

#### bun

```bash
bun add -d unocss @unocss/vite
bun add @themvora/core @themvora/react @themvora/unocss
```

### Build configuration and global styles

`uno.config.ts` registers `presetThemvora()`; the framework's build
configuration hands UnoCSS to the compiler. The global stylesheet then reads the
variables the runtime writes.

**`uno.config.ts`**

```ts
import { defineConfig, presetWind3 } from "unocss";
import { presetThemvora } from "@themvora/unocss";
export default defineConfig({
  presets: [presetWind3(), presetThemvora()],
});
```

**`vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
export default defineConfig({ plugins: [react(), UnoCSS()] });
```

**`src/index.css`**

```css
html,
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}
```

### Mount the runtime

The entry file that mounts Themvora's provider and loads the stylesheet above.

**`src/main.tsx`**

```tsx
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import "./index.css";
import "virtual:uno.css";
import { App } from "./App";
createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="plum-light" initialMode="system">
    <App />
  </ThemeProvider>,
);
```

### Attach the adapter

UnoCSS has no adapter to attach: `presetThemvora()` already emits utilities that
read the live variables, so this file only mounts the runtime around the UI.

**`src/ThemeZone.tsx`**

```tsx
import type { ReactNode } from "react";
// UnoCSS needs no adapter: the preset emits utilities whose values are
// var(--theme-*), so the runtime's own writes are enough.
export function ThemeZone({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
```

### Use UnoCSS

UnoCSS's own utility classes. Each one resolves to a live theme variable, so a
theme change is a variable change, not a rebuild.

**`src/Example.tsx`**

```tsx
export function Example() {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg p-4 flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Themvora + UnoCSS</h2>
      <p className="text-sm text-muted-foreground">
        Every utility resolves to a live --theme-* variable.
      </p>
      <button className="bg-primary text-primary-foreground rounded px-4 py-2 self-start">
        Primary action
      </button>
    </div>
  );
}
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are UnoCSS's own
components, and they are the only code that changes when the mode does.

**`src/ThemeControls.tsx`**

```tsx
import { useTheme } from "@themvora/react";
export function ThemeControls() {
  const { mode, setMode, toggleTheme } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Mode: {mode}</span>
      <button className="bg-primary text-primary-foreground rounded px-3 py-1.5" onClick={toggleTheme}>
        Toggle
      </button>
      <button className="border border-border rounded px-3 py-1.5" onClick={() => setMode("light")}>
        Light
      </button>
      <button className="border border-border rounded px-3 py-1.5" onClick={() => setMode("dark")}>
        Dark
      </button>
    </div>
  );
}
```

### Theme family

A family is the second axis: the same mode, a different palette. The runtime
carries it beside the mode, so a family picker is one more control and needs no
re-mount.

```tsx
// The same hook carries the family and its setter.
const { family, setFamily } = useTheme();

// One control per family you ship. The literals are checked against your
// theme registry, so a family that does not exist is a compile error.
setFamily("mint"); // "plum" | "mint" | "berry" | "iris" | "citrus" | …
```

### Put it together

The last file composes what the steps above created: the runtime, the adapter
zone, the components and the controls.

**`src/App.tsx`**

```tsx
import { ThemeZone } from "./ThemeZone";
import { Example } from "./Example";
import { ThemeControls } from "./ThemeControls";
export function App() {
  return (
    <ThemeZone>
      <Example />
      <ThemeControls />
    </ThemeZone>
  );
}
```

## Next.js

Verified against Next.js 15.5.28 and Node.js 22.22.2.

### Install

Install UnoCSS first, then Themvora. Both commands are the ones the
documentation page shows for Next.js.

#### pnpm

```bash
pnpm add -D unocss @unocss/postcss
pnpm add @themvora/core @themvora/next @themvora/unocss
```

#### npm

```bash
npm install -D unocss @unocss/postcss
npm install @themvora/core @themvora/next @themvora/unocss
```

#### yarn

```bash
yarn add -D unocss @unocss/postcss
yarn add @themvora/core @themvora/next @themvora/unocss
```

#### bun

```bash
bun add -d unocss @unocss/postcss
bun add @themvora/core @themvora/next @themvora/unocss
```

### Build configuration and global styles

`uno.config.ts` registers `presetThemvora()`; the framework's build
configuration hands UnoCSS to the compiler. The global stylesheet then reads the
variables the runtime writes.

**`uno.config.ts`**

```ts
import { defineConfig, presetWind3 } from "unocss";
import { presetThemvora } from "@themvora/unocss";
export default defineConfig({
  presets: [presetWind3(), presetThemvora()],
});
```

**`postcss.config.mjs`**

```js
// The PostCSS plugin expands the @unocss at-rule in the global sheet.
export default { plugins: { "@unocss/postcss": {} } };
```

**`app/globals.css`**

```css
@unocss all;

html,
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}
```

### Mount the runtime

The entry file that mounts Themvora's provider and loads the stylesheet above.

**`app/layout.tsx`**

```tsx
import type { ReactNode } from "react";
import { ThemeProvider } from "@themvora/next";
import "./globals.css";
// ThemeProvider renders <html> and <body> itself — do not wrap it in them.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="plum-light">
      {children}
    </ThemeProvider>
  );
}
```

### Attach the adapter

UnoCSS has no adapter to attach: `presetThemvora()` already emits utilities that
read the live variables, so this file only mounts the runtime around the UI.

**`app/theme-zone.tsx`**

```tsx
"use client";
import type { ReactNode } from "react";
export function ThemeZone({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
```

### Use UnoCSS

UnoCSS's own utility classes. Each one resolves to a live theme variable, so a
theme change is a variable change, not a rebuild.

**`app/example.tsx`**

```tsx
export function Example() {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg p-4 flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Themvora + UnoCSS</h2>
      <p className="text-sm text-muted-foreground">
        Every utility resolves to a live --theme-* variable.
      </p>
      <button className="bg-primary text-primary-foreground rounded px-4 py-2 self-start">
        Primary action
      </button>
    </div>
  );
}
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are UnoCSS's own
components, and they are the only code that changes when the mode does.

**`app/theme-controls.tsx`**

```tsx
"use client";

import { useTheme } from "@themvora/next/client";
export function ThemeControls() {
  const { mode, setMode, toggleTheme } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Mode: {mode}</span>
      <button className="bg-primary text-primary-foreground rounded px-3 py-1.5" onClick={toggleTheme}>
        Toggle
      </button>
      <button className="border border-border rounded px-3 py-1.5" onClick={() => setMode("light")}>
        Light
      </button>
      <button className="border border-border rounded px-3 py-1.5" onClick={() => setMode("dark")}>
        Dark
      </button>
    </div>
  );
}
```

### Theme family

A family is the second axis: the same mode, a different palette. The runtime
carries it beside the mode, so a family picker is one more control and needs no
re-mount.

```tsx
// The same hook carries the family and its setter.
const { family, setFamily } = useTheme();

// One control per family you ship. The literals are checked against your
// theme registry, so a family that does not exist is a compile error.
setFamily("mint"); // "plum" | "mint" | "berry" | "iris" | "citrus" | …
```

### Put it together

The last file composes what the steps above created: the runtime, the adapter
zone, the components and the controls.

**`app/page.tsx`**

```tsx
import { ThemeZone } from "./theme-zone";
import { Example } from "./example";
import { ThemeControls } from "./theme-controls";
export default function Page() {
  return (
    <ThemeZone>
      <Example />
      <ThemeControls />
    </ThemeZone>
  );
}
```

## Astro

Verified against Astro 5.14.1 and Node.js 22.22.2.

### Install

Install UnoCSS first, then Themvora. Both commands are the ones the
documentation page shows for Astro.

#### pnpm

```bash
pnpm add -D unocss @unocss/astro
pnpm add @themvora/core @themvora/astro @themvora/unocss
```

#### npm

```bash
npm install -D unocss @unocss/astro
npm install @themvora/core @themvora/astro @themvora/unocss
```

#### yarn

```bash
yarn add -D unocss @unocss/astro
yarn add @themvora/core @themvora/astro @themvora/unocss
```

#### bun

```bash
bun add -d unocss @unocss/astro
bun add @themvora/core @themvora/astro @themvora/unocss
```

### Build configuration and global styles

`uno.config.ts` registers `presetThemvora()`; the framework's build
configuration hands UnoCSS to the compiler. The global stylesheet then reads the
variables the runtime writes.

**`uno.config.ts`**

```ts
import { defineConfig, presetWind3 } from "unocss";
import { presetThemvora } from "@themvora/unocss";
export default defineConfig({
  presets: [presetWind3(), presetThemvora()],
});
```

**`astro.config.mjs`**

```js
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import UnoCSS from "unocss/astro";
export default defineConfig({ integrations: [UnoCSS(), react()] });
```

**`src/styles/global.css`**

```css
html,
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}
```

### Mount the runtime

The entry file that mounts Themvora's provider and loads the stylesheet above.

**`src/layouts/BaseLayout.astro`**

```astro
---
// src/layouts/BaseLayout.astro
import ThemeIsland from "../components/ThemeIsland";
import "../styles/global.css";
---
<html lang="en">
  <body>
    <ThemeIsland client:only="react" />
    <slot />
  </body>
</html>
```

### Attach the adapter

UnoCSS has no adapter to attach: `presetThemvora()` already emits utilities that
read the live variables, so this file only mounts the runtime around the UI.

**`src/components/ThemeIsland.tsx`**

```tsx
import { ThemeProviderClient } from "@themvora/astro/client";
import { Example } from "./Example";
import { ThemeControls } from "./ThemeControls";
// No adapter to install — the preset's utilities already read the live
// variables, so the runtime alone is enough. The island renders the UI
// because Astro cannot pass React children to a client:only island.
export default function ThemeIsland() {
  return (
    <>
      <ThemeProviderClient defaultTheme="plum-light" initialMode="system" />
      <Example />
      <ThemeControls />
    </>
  );
}
```

### Use UnoCSS

UnoCSS's own utility classes. Each one resolves to a live theme variable, so a
theme change is a variable change, not a rebuild.

**`src/components/Example.tsx`**

```tsx
export function Example() {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg p-4 flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Themvora + UnoCSS</h2>
      <p className="text-sm text-muted-foreground">
        Every utility resolves to a live --theme-* variable.
      </p>
      <button className="bg-primary text-primary-foreground rounded px-4 py-2 self-start">
        Primary action
      </button>
    </div>
  );
}
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are UnoCSS's own
components, and they are the only code that changes when the mode does.

**`src/components/ThemeControls.tsx`**

```tsx
import { useTheme } from "@themvora/astro/client";
export function ThemeControls() {
  const { mode, setMode, toggleTheme } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Mode: {mode}</span>
      <button className="bg-primary text-primary-foreground rounded px-3 py-1.5" onClick={toggleTheme}>
        Toggle
      </button>
      <button className="border border-border rounded px-3 py-1.5" onClick={() => setMode("light")}>
        Light
      </button>
      <button className="border border-border rounded px-3 py-1.5" onClick={() => setMode("dark")}>
        Dark
      </button>
    </div>
  );
}
```

### Theme family

A family is the second axis: the same mode, a different palette. The runtime
carries it beside the mode, so a family picker is one more control and needs no
re-mount.

```tsx
// The same hook carries the family and its setter.
const { family, setFamily } = useTheme();

// One control per family you ship. The literals are checked against your
// theme registry, so a family that does not exist is a compile error.
setFamily("mint"); // "plum" | "mint" | "berry" | "iris" | "citrus" | …
```

### Put it together

The last file composes what the steps above created: the runtime, the adapter
zone, the components and the controls.

```tsx
---
import BaseLayout from "../layouts/BaseLayout.astro";
---
<BaseLayout>
  <h1>Themvora</h1>
  <p>Every colour on this page comes from the active theme.</p>
</BaseLayout>
```

## Vue 3

Verified against Vue 3.5.44 and Node.js 22.22.2.

### Install

Install UnoCSS first, then Themvora. Both commands are the ones the
documentation page shows for Vue 3.

#### pnpm

```bash
pnpm add -D unocss @unocss/vite
pnpm add @themvora/core @themvora/vue @themvora/unocss
```

#### npm

```bash
npm install -D unocss @unocss/vite
npm install @themvora/core @themvora/vue @themvora/unocss
```

#### yarn

```bash
yarn add -D unocss @unocss/vite
yarn add @themvora/core @themvora/vue @themvora/unocss
```

#### bun

```bash
bun add -d unocss @unocss/vite
bun add @themvora/core @themvora/vue @themvora/unocss
```

### Build configuration and global styles

`uno.config.ts` registers `presetThemvora()`; the framework's build
configuration hands UnoCSS to the compiler. The global stylesheet then reads the
variables the runtime writes.

**`uno.config.ts`**

```ts
import { defineConfig, presetWind3 } from "unocss";
import { presetThemvora } from "@themvora/unocss";
export default defineConfig({
  presets: [presetWind3(), presetThemvora()],
});
```

**`vite.config.ts`**

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
export default defineConfig({ plugins: [vue(), UnoCSS()] });
```

**`src/index.css`**

```css
html,
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}
```

### Mount the runtime

The entry file that mounts Themvora's provider and loads the stylesheet above.

**`src/main.ts`**

```ts
import { createApp, h } from "vue";
import { ThemeProvider } from "@themvora/vue";
import "./index.css";
import "virtual:uno.css";
import App from "./App.vue";
createApp({
  render: () =>
    h(
      ThemeProvider,
      { defaultTheme: "plum-light", initialMode: "system" },
      () => h(App),
    ),
}).mount("#app");
```

### Attach the adapter

UnoCSS has no adapter to attach: `presetThemvora()` already emits utilities that
read the live variables, so this file only mounts the runtime around the UI.

**`src/components/ThemeZone.vue`**

```vue
<script setup lang="ts">
// UnoCSS needs no adapter: the generated utilities reference var(--theme-*).
</script>
<template>
  <slot />
</template>
```

### Use UnoCSS

UnoCSS's own utility classes. Each one resolves to a live theme variable, so a
theme change is a variable change, not a rebuild.

**`src/components/Example.vue`**

```vue
<script setup lang="ts">
// Utility classes only — UnoCSS generates them from the preset.
</script>
<template>
  <div class="bg-card text-card-foreground border border-border rounded-lg p-4 flex flex-col gap-3">
    <h2 class="text-lg font-semibold">Themvora + UnoCSS</h2>
    <p class="text-sm text-muted-foreground">
      Every utility resolves to a live --theme-* variable.
    </p>
    <button class="bg-primary text-primary-foreground rounded px-4 py-2 self-start">
      Primary action
    </button>
  </div>
</template>
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are UnoCSS's own
components, and they are the only code that changes when the mode does.

**`src/components/ThemeControls.vue`**

```vue
<script setup lang="ts">
import { useTheme } from "@themvora/vue";
const { mode, setMode, toggleTheme } = useTheme();
</script>
<template>
  <div class="flex items-center gap-2">
    <span class="text-sm text-muted-foreground">Mode: {{ mode }}</span>
    <button class="bg-primary text-primary-foreground rounded px-3 py-1.5" @click="toggleTheme">Toggle</button>
    <button class="border border-border rounded px-3 py-1.5" @click="setMode('light')">Light</button>
    <button class="border border-border rounded px-3 py-1.5" @click="setMode('dark')">Dark</button>
  </div>
</template>
```

### Theme family

A family is the second axis: the same mode, a different palette. The runtime
carries it beside the mode, so a family picker is one more control and needs no
re-mount.

```ts
// The Vue 3 binding exposes the same capability through its own
// composable — see the Vue 3 framework guide for the exact call shape.
```

### Put it together

The last file composes what the steps above created: the runtime, the adapter
zone, the components and the controls.

**`src/App.vue`**

```vue
<script setup lang="ts">
import ThemeZone from "./components/ThemeZone.vue";
import Example from "./components/Example.vue";
import ThemeControls from "./components/ThemeControls.vue";
</script>
<template>
  <ThemeZone>
    <Example />
    <ThemeControls />
  </ThemeZone>
</template>
```

## Svelte

Verified against Svelte 5.57.3 and Node.js 22.22.2.

### Install

Install UnoCSS first, then Themvora. Both commands are the ones the
documentation page shows for Svelte.

#### pnpm

```bash
pnpm add -D unocss @unocss/vite
pnpm add @themvora/core @themvora/svelte @themvora/unocss
```

#### npm

```bash
npm install -D unocss @unocss/vite
npm install @themvora/core @themvora/svelte @themvora/unocss
```

#### yarn

```bash
yarn add -D unocss @unocss/vite
yarn add @themvora/core @themvora/svelte @themvora/unocss
```

#### bun

```bash
bun add -d unocss @unocss/vite
bun add @themvora/core @themvora/svelte @themvora/unocss
```

### Build configuration and global styles

`uno.config.ts` registers `presetThemvora()`; the framework's build
configuration hands UnoCSS to the compiler. The global stylesheet then reads the
variables the runtime writes.

**`uno.config.ts`**

```ts
import { defineConfig, presetWind3 } from "unocss";
import { presetThemvora } from "@themvora/unocss";
export default defineConfig({
  presets: [presetWind3(), presetThemvora()],
});
```

**`vite.config.ts`**

```ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import UnoCSS from "unocss/vite";
export default defineConfig({ plugins: [svelte(), UnoCSS()] });
```

**`src/index.css`**

```css
html,
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}
```

### Mount the runtime

The entry file that mounts Themvora's provider and loads the stylesheet above.

**`src/lib/ThemeRoot.svelte`**

```svelte
<!-- src/lib/ThemeRoot.svelte -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { ThemeProvider } from "@themvora/svelte";
  import "../index.css";
  let { children }: { children: Snippet } = $props();
</script>
<ThemeProvider defaultTheme="plum-light" initialMode="system">
  {@render children()}
</ThemeProvider>
```

**`src/main.ts`**

```ts
import { mount } from "svelte";
import App from "./App.svelte";
import "virtual:uno.css";
mount(App, { target: document.getElementById("app")! });
```

### Attach the adapter

UnoCSS has no adapter to attach: `presetThemvora()` already emits utilities that
read the live variables, so this file only mounts the runtime around the UI.

**`src/lib/ThemeZone.svelte`**

```svelte
<script lang="ts">
  import type { Snippet } from "svelte";
  let { children }: { children: Snippet } = $props();
</script>
{@render children()}
```

### Use UnoCSS

UnoCSS's own utility classes. Each one resolves to a live theme variable, so a
theme change is a variable change, not a rebuild.

**`src/lib/Example.svelte`**

```svelte
<script lang="ts">
  // Markup only — but a Svelte component without a script block emits no
  // module declaration, so importing it fails `svelte-check` under strict.
</script>
<div class="bg-card text-card-foreground border border-border rounded-lg p-4 flex flex-col gap-3">
  <h2 class="text-lg font-semibold">Themvora + UnoCSS</h2>
  <p class="text-sm text-muted-foreground">
    Every utility resolves to a live --theme-* variable.
  </p>
  <button class="bg-primary text-primary-foreground rounded px-4 py-2 self-start">
    Primary action
  </button>
</div>
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are UnoCSS's own
components, and they are the only code that changes when the mode does.

**`src/lib/ThemeControls.svelte`**

```svelte
<script lang="ts">
  import { useTheme } from "@themvora/svelte";
  const { mode, setMode, toggleTheme } = useTheme();
</script>
<div class="flex items-center gap-2">
  <span class="text-sm text-muted-foreground">Mode: {$mode}</span>
  <button class="bg-primary text-primary-foreground rounded px-3 py-1.5" onclick={toggleTheme}>Toggle</button>
  <button class="border border-border rounded px-3 py-1.5" onclick={() => setMode("light")}>Light</button>
  <button class="border border-border rounded px-3 py-1.5" onclick={() => setMode("dark")}>Dark</button>
</div>
```

### Theme family

A family is the second axis: the same mode, a different palette. The runtime
carries it beside the mode, so a family picker is one more control and needs no
re-mount.

```ts
// The Svelte binding exposes the same capability through its own
// composable — see the Svelte framework guide for the exact call shape.
```

### Put it together

The last file composes what the steps above created: the runtime, the adapter
zone, the components and the controls.

**`src/App.svelte`**

```svelte
<script lang="ts">
  import ThemeRoot from "./lib/ThemeRoot.svelte";
  import ThemeZone from "./lib/ThemeZone.svelte";
  import Example from "./lib/Example.svelte";
  import ThemeControls from "./lib/ThemeControls.svelte";
</script>
<ThemeRoot>
  <ThemeZone>
    <Example />
    <ThemeControls />
  </ThemeZone>
</ThemeRoot>
```

## Development and production commands

These are the scripts each framework's own scaffold creates; Themvora adds no
build step to them. The preset is a plugin in the existing UnoCSS pipeline, and
the utilities it generates reference runtime variables.

| Framework | Development | Production build | Preview |
| --- | --- | --- | --- |
| React | `pnpm dev` | `pnpm build` | `pnpm preview` |
| Next.js | `pnpm dev` | `pnpm build` | `pnpm start` |
| Astro | `pnpm dev` | `pnpm build` | `pnpm preview` |
| Vue 3 | `pnpm dev` | `pnpm build` | `pnpm preview` |
| Svelte | `pnpm dev` | `pnpm build` | `pnpm preview` |

With npm, yarn or bun the same scripts run as `npm run dev`, `yarn dev` and
`bun run dev`.

## Troubleshooting

- **The components are themed but the page background is not.** The global
  stylesheet is missing the `html, body` rule from *Build configuration and global
  styles*. Themvora writes `--theme-color-*` on the root element; something has to
  read them.
- **Nothing happens when you switch themes.** The adapter is attached to a
  different runtime than the one the provider created. Call the adapter *inside*
  the provider — that is what the *Attach the adapter* file does — rather than
  beside it.
- **The library's own colours win.** Its stylesheet has to load before the
  adapter's variable map. The import order in the global stylesheet is an
  instruction, not a preference.
- **No utilities are generated.** `presetThemvora()` is missing from
  `uno.config.ts`, or the UnoCSS integration is not in the framework's build
  config — `unocss/vite`, `unocss/astro` or `@unocss/postcss`, depending on the
  framework.
- **Next.js: utilities are missing from the global sheet.** Next.js uses the
  PostCSS plugin and needs the `@unocss all;` directive in the stylesheet; the
  Vite plugin does not apply there.
- **Astro: utilities are missing in `.astro` files.** The `unocss/astro`
  integration scans them; the Vite plugin alone does not.

## Documentation

- [UnoCSS integration](https://themvora-dev.vercel.app/libraries/unocss) — the page this README mirrors
- [Worked examples for every export](https://themvora-dev.vercel.app/libraries/unocss/examples)
- [UnoCSS installation guide](https://unocss.dev/integrations/vite)
- [Framework guides](https://themvora-dev.vercel.app/framework-guides)
- [All packages on npm](https://www.npmjs.com/org/themvora)
- [Changelog](https://github.com/themvora/themvora/blob/main/packages/adapters/unocss/CHANGELOG.md)

## License

MIT — see [LICENSE](https://github.com/themvora/themvora/blob/main/packages/adapters/unocss/LICENSE).
