<!--
  Generated file — do not edit by hand.

  Integration content comes from apps/docs/lib/libraries.tsx
  (FRAMEWORK_RECIPES); package prose from scripts/readme/library-notes.mjs.

  Regenerate:  pnpm docs:sync-library-readmes
  Verify:      pnpm docs:check-library-readmes
-->

# @themvora/daisyui

Themvora adapter for daisyUI.

Wire daisyUI components to Themvora semantic tokens with a CSS-variable adapter that stays in sync as themes and modes change.

- **Package** — `@themvora/daisyui`
- **Library** — daisyUI
- **Bridge** — CSS variables
- **Frameworks** — React, Next.js, Remix, Astro, Vue 3, Nuxt, Svelte, Solid, Angular
- **Documentation** — [themvora-dev.vercel.app/libraries/daisyui](https://themvora-dev.vercel.app/libraries/daisyui)
- **License** — MIT

## How it works

daisyUI 5 is a Tailwind plugin whose components read `--color-*` variables. `@themvora/daisyui` maps them onto the live theme (`--color-primary`, `--color-base-100`, `--color-base-content`, …) and `@themvora/daisyui/daisyui.css` carries the aliases, so `btn btn-primary` and `card bg-base-100` follow a theme change with no markup of their own.

The adapter maps these Themvora roles onto the library's own vocabulary:

| Themvora role | daisyUI target |
| --- | --- |
| `background` | `--color-base-100` |
| `secondary` | `--color-base-200` |
| `border` | `--color-base-300` |
| `foreground` | `--color-base-content` |
| `primary` | `--color-primary` |
| `primaryForeground` | `--color-primary-content` |
| `secondary` | `--color-secondary` |
| `secondaryForeground` | `--color-secondary-content` |
| `accent` | `--color-accent` |
| `muted` | `--color-neutral` |
| `mutedForeground` | `--color-neutral-content` |
| `destructive` | `--color-error` |
| `destructiveForeground` | `--color-error-content` |

## Features

`@themvora/daisyui` ships 6 exports in 2 categories. Each one is documented, with a runnable example, on the [library page](https://themvora-dev.vercel.app/libraries/daisyui/examples).

### Adapter

- **`createDaisyAdapter(options)`** — Installs a tagged `:root` style element
  with concrete daisyUI variables (background, foreground, base-100/200/300,
  primary, etc.).
- **`createDaisyVariables(tokens)`** — Generates the daisyUI CSS custom-property
  map from a token set (`theme.tokens`). A theme definition collapses the output
  to radius tokens only.
- **`useDaisyTheme(runtime, options?)`** — React hook (from
  `@themvora/daisyui/react`) that installs the daisyUI adapter onto an explicit
  runtime.
- **`injectDaisyCSS()`** — Idempotent, SSR-safe helper to inject daisyUI
  compatibility CSS.

### Options

- **`CreateDaisyAdapterOptions`** — Accepts `strategy` to map semantic tokens to
  daisyUI variables.
- **`DaisyAdapterOptions`** — Options controlling daisyUI variable derivation
  and defaults.

## Supported frameworks

daisyUI is documented for 9 frameworks here. Each combination below has its own recipe on the documentation page, and its own section in this README.

| Framework | Verified against | Setup |
| --- | --- | --- |
| React | 19.3.1 | [React setup](#react) |
| Next.js | 15.5.28 | [Next.js setup](#nextjs) |
| Remix | 2.17.0 | [Remix setup](#remix) |
| Astro | 5.14.1 | [Astro setup](#astro) |
| Vue 3 | 3.5.44 | [Vue 3 setup](#vue-3) |
| Nuxt | 4.2.0 | [Nuxt setup](#nuxt) |
| Svelte | 5.57.3 | [Svelte setup](#svelte) |
| Solid | 1.9.18 | [Solid setup](#solid) |
| Angular | 22.2.5 | [Angular setup](#angular) |

## Requirements

- **Node.js** — 22.22.2. This is the version the integration is verified
  against, not a hard floor.
- **daisyUI** — 5.1.10.
- **Peer dependencies** — `tailwindcss` 4.3.3.

The project each framework expects is listed per framework:

| Framework | Project |
| --- | --- |
| React | Vite + React project (`npm create vite@latest -- --template react-ts`). |
| Next.js | Next.js App Router project. The recipe edits `app/layout.tsx`. |
| Remix | Remix (Vite) project. The recipe edits `app/root.tsx`. |
| Astro | Astro project with the React integration (`npx astro add react`). The adapter runs in a `client:only="react"` island. |
| Vue 3 | Vite + Vue 3 project (`npm create vite@latest -- --template vue-ts`). |
| Nuxt | Nuxt 4 project. Install `@themvora/vue` alongside `@themvora/nuxt`. |
| Svelte | Svelte 5 + Vite project (`npm create vite@latest -- --template svelte-ts`). |
| Solid | Solid + Vite project (`npm create vite@latest -- --template solid-ts`). |
| Angular | Angular 20+ standalone application. Global styles live in `src/styles.css`, referenced by `angular.json`. |

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

`@themvora/core` is a normal dependency of `@themvora/daisyui` and of the framework
integration, so it arrives with them. Naming it in the command pins the
runtime version in your own manifest.

## React

Verified against React 19.3.1 and Node.js 22.22.2.

### Install

Install daisyUI first, then Themvora. Both commands are the ones the
documentation page shows for React.

#### pnpm

```bash
pnpm add daisyui
pnpm add -D tailwindcss @tailwindcss/vite
pnpm add @themvora/core @themvora/react @themvora/daisyui
```

#### npm

```bash
npm install daisyui
npm install -D tailwindcss @tailwindcss/vite
npm install @themvora/core @themvora/react @themvora/daisyui
```

#### yarn

```bash
yarn add daisyui
yarn add -D tailwindcss @tailwindcss/vite
yarn add @themvora/core @themvora/react @themvora/daisyui
```

#### bun

```bash
bun add daisyui
bun add -d tailwindcss @tailwindcss/vite
bun add @themvora/core @themvora/react @themvora/daisyui
```

### Build configuration and global styles

The library's own stylesheet is imported first, the adapter's variable map
second. That order is what lets the adapter's values win over daisyUI's defaults
— reversing it leaves the library looking themed until the first switch.

**`vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

**`src/index.css`**

```css
@import "tailwindcss";
@import "@themvora/daisyui/daisyui.css";
@plugin "daisyui";
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
import { App } from "./App";
createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="plum-light" initialMode="system">
    <App />
  </ThemeProvider>,
);
```

### Attach the adapter

This is where the adapter is registered on the runtime. It writes daisyUI's own
CSS custom properties from the active theme, and disposes them on unmount.

**`src/ThemeZone.tsx`**

```tsx
import type { ReactNode } from "react";
import { useThemeRuntime } from "@themvora/react";
import { useDaisyTheme } from "@themvora/daisyui/react";
// Registers the adapter on the runtime from the provider above.
export function ThemeZone({ children }: { children: ReactNode }) {
  useDaisyTheme(useThemeRuntime());
  return <>{children}</>;
}
```

### Use daisyUI

daisyUI's own classes and components. Nothing here is Themvora-specific markup —
the variables are already written.

**`src/Example.tsx`**

```tsx
export function Example() {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">Themvora + daisyUI</h2>
        <p className="text-base-content/70">This card is a plain daisyUI card. Its colours come from the theme.</p>
        <div className="card-actions justify-end">
          <button className="btn btn-primary">Primary action</button>
        </div>
      </div>
    </div>
  );
}
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are daisyUI's own
components, and they are the only code that changes when the mode does.

**`src/ThemeControls.tsx`**

```tsx
import { useTheme } from "@themvora/react";
export function ThemeControls() {
  const { mode, setMode, toggleTheme } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-base-content/70">Mode: {mode}</span>
      <button className="btn btn-primary btn-sm" onClick={toggleTheme}>Toggle</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setMode("light")}>Light</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setMode("dark")}>Dark</button>
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

Install daisyUI first, then Themvora. Both commands are the ones the
documentation page shows for Next.js.

#### pnpm

```bash
pnpm add daisyui
pnpm add -D tailwindcss @tailwindcss/postcss
pnpm add @themvora/core @themvora/next @themvora/daisyui
```

#### npm

```bash
npm install daisyui
npm install -D tailwindcss @tailwindcss/postcss
npm install @themvora/core @themvora/next @themvora/daisyui
```

#### yarn

```bash
yarn add daisyui
yarn add -D tailwindcss @tailwindcss/postcss
yarn add @themvora/core @themvora/next @themvora/daisyui
```

#### bun

```bash
bun add daisyui
bun add -d tailwindcss @tailwindcss/postcss
bun add @themvora/core @themvora/next @themvora/daisyui
```

### Build configuration and global styles

The library's own stylesheet is imported first, the adapter's variable map
second. That order is what lets the adapter's values win over daisyUI's defaults
— reversing it leaves the library looking themed until the first switch.

**`postcss.config.mjs`**

```js
export default {
  plugins: { "@tailwindcss/postcss": {} },
};
```

**`app/globals.css`**

```css
@import "tailwindcss";
@import "@themvora/daisyui/daisyui.css";
@plugin "daisyui";
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

This is where the adapter is registered on the runtime. It writes daisyUI's own
CSS custom properties from the active theme, and disposes them on unmount.

**`app/theme-zone.tsx`**

```tsx
"use client";
import type { ReactNode } from "react";
import { useThemeRuntime } from "@themvora/next/client";
import { useDaisyTheme } from "@themvora/daisyui/react";
export function ThemeZone({ children }: { children: ReactNode }) {
  useDaisyTheme(useThemeRuntime());
  return <>{children}</>;
}
```

### Use daisyUI

daisyUI's own classes and components. Nothing here is Themvora-specific markup —
the variables are already written.

**`app/example.tsx`**

```tsx
export function Example() {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">Themvora + daisyUI</h2>
        <p className="text-base-content/70">This card is a plain daisyUI card. Its colours come from the theme.</p>
        <div className="card-actions justify-end">
          <button className="btn btn-primary">Primary action</button>
        </div>
      </div>
    </div>
  );
}
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are daisyUI's own
components, and they are the only code that changes when the mode does.

**`app/theme-controls.tsx`**

```tsx
"use client";

import { useTheme } from "@themvora/next/client";
export function ThemeControls() {
  const { mode, setMode, toggleTheme } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-base-content/70">Mode: {mode}</span>
      <button className="btn btn-primary btn-sm" onClick={toggleTheme}>Toggle</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setMode("light")}>Light</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setMode("dark")}>Dark</button>
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

## Remix

Verified against Remix 2.17.0 and Node.js 22.22.2.

### Install

Install daisyUI first, then Themvora. Both commands are the ones the
documentation page shows for Remix.

#### pnpm

```bash
pnpm add daisyui
pnpm add -D tailwindcss @tailwindcss/vite
pnpm add @themvora/core @themvora/remix @themvora/daisyui
```

#### npm

```bash
npm install daisyui
npm install -D tailwindcss @tailwindcss/vite
npm install @themvora/core @themvora/remix @themvora/daisyui
```

#### yarn

```bash
yarn add daisyui
yarn add -D tailwindcss @tailwindcss/vite
yarn add @themvora/core @themvora/remix @themvora/daisyui
```

#### bun

```bash
bun add daisyui
bun add -d tailwindcss @tailwindcss/vite
bun add @themvora/core @themvora/remix @themvora/daisyui
```

### Build configuration and global styles

The library's own stylesheet is imported first, the adapter's variable map
second. That order is what lets the adapter's values win over daisyUI's defaults
— reversing it leaves the library looking themed until the first switch.

**`vite.config.ts`**

```ts
import { defineConfig } from "vite";
import { vitePlugin as remix } from "@remix-run/dev";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [remix(), tailwindcss()],
});
```

**`app/styles.css`**

```css
@import "tailwindcss";
@import "@themvora/daisyui/daisyui.css";
@plugin "daisyui";
html,
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}
```

### Mount the runtime

Remix owns the document, so this file does more than mount a provider.
`createThemeDocument()` declares the configuration once; the loader resolves the
request's selection from it, and `<theming.Document>` renders the pre-paint
script, the matching `<html>` shell and the runtime provider from that same
configuration. The stylesheet is linked through `links` rather than imported for
side effects.

**`app/root.tsx`**

```tsx
import type { ReactNode } from "react";
import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { getBuiltInThemes } from "@themvora/core";
import { createThemeDocument } from "@themvora/remix";
import styles from "./styles.css?url";
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
];
const themes = getBuiltInThemes();
const theming = createThemeDocument({
  themes,
  defaultTheme: "plum-light",
  mode: "system",
});
// Resolve the selection on the server so hydration matches exactly.
export async function loader({ request }: { request: Request }) {
  return { theme: await theming.resolveInitial(request) };
}
export function Layout({ children }: { children: ReactNode }) {
  const { theme } = useLoaderData<typeof loader>();
  return (
    // Remix owns the document; Document supplies the theme-owned parts: the
    // blocking bootstrap, the matching <html> shell and the runtime provider.
    <theming.Document
      initial={theme}
      htmlProps={{ lang: "en" }}
      head={[
        <meta key="charset" charSet="utf-8" />,
        <Meta key="meta" />,
        <Links key="links" />,
      ]}
      afterContent={
        <>
          <ScrollRestoration />
          <Scripts />
        </>
      }
    >
      {children}
    </theming.Document>
  );
}
export default function App() {
  return <Outlet />;
}
```

### Attach the adapter

This is where the adapter is registered on the runtime. It writes daisyUI's own
CSS custom properties from the active theme, and disposes them on unmount.

**`app/components/theme-zone.tsx`**

```tsx
import type { ReactNode } from "react";
import { useThemeRuntime } from "@themvora/remix";
import { useDaisyTheme } from "@themvora/daisyui/react";
export function ThemeZone({ children }: { children: ReactNode }) {
  useDaisyTheme(useThemeRuntime());
  return <>{children}</>;
}
```

### Use daisyUI

daisyUI's own classes and components. Nothing here is Themvora-specific markup —
the variables are already written.

**`app/components/example.tsx`**

```tsx
export function Example() {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">Themvora + daisyUI</h2>
        <p className="text-base-content/70">This card is a plain daisyUI card. Its colours come from the theme.</p>
        <div className="card-actions justify-end">
          <button className="btn btn-primary">Primary action</button>
        </div>
      </div>
    </div>
  );
}
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are daisyUI's own
components, and they are the only code that changes when the mode does.

**`app/components/theme-controls.tsx`**

```tsx
import { useTheme } from "@themvora/remix";
export function ThemeControls() {
  const { mode, setMode, toggleTheme } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-base-content/70">Mode: {mode}</span>
      <button className="btn btn-primary btn-sm" onClick={toggleTheme}>Toggle</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setMode("light")}>Light</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setMode("dark")}>Dark</button>
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

**`app/routes/_index.tsx`**

```tsx
import { ThemeZone } from "../components/theme-zone";
import { Example } from "../components/example";
import { ThemeControls } from "../components/theme-controls";
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

Install daisyUI first, then Themvora. Both commands are the ones the
documentation page shows for Astro.

#### pnpm

```bash
pnpm add daisyui
pnpm add -D tailwindcss @tailwindcss/vite
pnpm add @themvora/core @themvora/astro @themvora/daisyui
```

#### npm

```bash
npm install daisyui
npm install -D tailwindcss @tailwindcss/vite
npm install @themvora/core @themvora/astro @themvora/daisyui
```

#### yarn

```bash
yarn add daisyui
yarn add -D tailwindcss @tailwindcss/vite
yarn add @themvora/core @themvora/astro @themvora/daisyui
```

#### bun

```bash
bun add daisyui
bun add -d tailwindcss @tailwindcss/vite
bun add @themvora/core @themvora/astro @themvora/daisyui
```

### Build configuration and global styles

The library's own stylesheet is imported first, the adapter's variable map
second. That order is what lets the adapter's values win over daisyUI's defaults
— reversing it leaves the library looking themed until the first switch.

**`astro.config.mjs`**

```js
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
```

**`src/styles/global.css`**

```css
@import "tailwindcss";
@import "@themvora/daisyui/daisyui.css";
@plugin "daisyui";
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

This is where the adapter is registered on the runtime. It writes daisyUI's own
CSS custom properties from the active theme, and disposes them on unmount.

**`src/components/ThemeIsland.tsx`**

```tsx
import { ThemeProviderClient, useThemeRuntime } from "@themvora/astro/client";
import { useDaisyTheme } from "@themvora/daisyui/react";
import { Example } from "./Example";
import { ThemeControls } from "./ThemeControls";
function InstallAdapter() {
  useDaisyTheme(useThemeRuntime());
  return null;
}
// One client island owns the runtime, the adapter and the UI. Astro cannot
// hand React children to a client:only island, so the island renders the
// example itself rather than receiving it from the page.
export default function ThemeIsland() {
  return (
    <>
      <ThemeProviderClient defaultTheme="plum-light" initialMode="system" />
      <InstallAdapter />
      <Example />
      <ThemeControls />
    </>
  );
}
```

### Use daisyUI

daisyUI's own classes and components. Nothing here is Themvora-specific markup —
the variables are already written.

**`src/components/Example.tsx`**

```tsx
export function Example() {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">Themvora + daisyUI</h2>
        <p className="text-base-content/70">This card is a plain daisyUI card. Its colours come from the theme.</p>
        <div className="card-actions justify-end">
          <button className="btn btn-primary">Primary action</button>
        </div>
      </div>
    </div>
  );
}
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are daisyUI's own
components, and they are the only code that changes when the mode does.

**`src/components/ThemeControls.tsx`**

```tsx
import { useTheme } from "@themvora/astro/client";
export function ThemeControls() {
  const { mode, setMode, toggleTheme } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-base-content/70">Mode: {mode}</span>
      <button className="btn btn-primary btn-sm" onClick={toggleTheme}>Toggle</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setMode("light")}>Light</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setMode("dark")}>Dark</button>
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

Install daisyUI first, then Themvora. Both commands are the ones the
documentation page shows for Vue 3.

#### pnpm

```bash
pnpm add daisyui
pnpm add -D tailwindcss @tailwindcss/vite
pnpm add @themvora/core @themvora/vue @themvora/daisyui
```

#### npm

```bash
npm install daisyui
npm install -D tailwindcss @tailwindcss/vite
npm install @themvora/core @themvora/vue @themvora/daisyui
```

#### yarn

```bash
yarn add daisyui
yarn add -D tailwindcss @tailwindcss/vite
yarn add @themvora/core @themvora/vue @themvora/daisyui
```

#### bun

```bash
bun add daisyui
bun add -d tailwindcss @tailwindcss/vite
bun add @themvora/core @themvora/vue @themvora/daisyui
```

### Build configuration and global styles

The library's own stylesheet is imported first, the adapter's variable map
second. That order is what lets the adapter's values win over daisyUI's defaults
— reversing it leaves the library looking themed until the first switch.

**`vite.config.ts`**

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [vue(), tailwindcss()],
});
```

**`src/index.css`**

```css
@import "tailwindcss";
@import "@themvora/daisyui/daisyui.css";
@plugin "daisyui";
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

This is where the adapter is registered on the runtime. It writes daisyUI's own
CSS custom properties from the active theme, and disposes them on unmount.

**`src/components/ThemeZone.vue`**

```vue
<script setup lang="ts">
import { useThemeRuntime } from "@themvora/vue";
import { useDaisyTheme } from "@themvora/daisyui/vue";
// Installs on mount, disposes on unmount.
useDaisyTheme(useThemeRuntime());
</script>
<template>
  <slot />
</template>
```

### Use daisyUI

daisyUI's own classes and components. Nothing here is Themvora-specific markup —
the variables are already written.

**`src/components/Example.vue`**

```vue
<template>
  <div class="card bg-base-100 shadow-sm">
    <div class="card-body">
      <h2 class="card-title">Themvora + daisyUI</h2>
      <p class="text-base-content/70">This card is a plain daisyUI card. Its colours come from the theme.</p>
      <div class="card-actions justify-end">
        <button class="btn btn-primary">Primary action</button>
      </div>
    </div>
  </div>
</template>
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are daisyUI's own
components, and they are the only code that changes when the mode does.

**`src/components/ThemeControls.vue`**

```vue
<script setup lang="ts">
import { useTheme } from "@themvora/vue";
const { mode, setMode, toggleTheme } = useTheme();
</script>
<template>
  <div class="flex items-center gap-2">
    <span class="text-sm text-base-content/70">Mode: {{ mode }}</span>
    <button class="btn btn-primary btn-sm" @click="toggleTheme">Toggle</button>
    <button class="btn btn-ghost btn-sm" @click="setMode('light')">Light</button>
    <button class="btn btn-ghost btn-sm" @click="setMode('dark')">Dark</button>
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

## Nuxt

Verified against Nuxt 4.2.0 and Node.js 22.22.2.

### Install

Install daisyUI first, then Themvora. Both commands are the ones the
documentation page shows for Nuxt.

#### pnpm

```bash
pnpm add daisyui
pnpm add -D tailwindcss @tailwindcss/vite
pnpm add @themvora/core @themvora/nuxt @themvora/daisyui @themvora/vue
```

#### npm

```bash
npm install daisyui
npm install -D tailwindcss @tailwindcss/vite
npm install @themvora/core @themvora/nuxt @themvora/daisyui @themvora/vue
```

#### yarn

```bash
yarn add daisyui
yarn add -D tailwindcss @tailwindcss/vite
yarn add @themvora/core @themvora/nuxt @themvora/daisyui @themvora/vue
```

#### bun

```bash
bun add daisyui
bun add -d tailwindcss @tailwindcss/vite
bun add @themvora/core @themvora/nuxt @themvora/daisyui @themvora/vue
```

### Build configuration and global styles

The library's own stylesheet is imported first, the adapter's variable map
second. That order is what lets the adapter's values win over daisyUI's defaults
— reversing it leaves the library looking themed until the first switch.

**`nuxt.config.ts`**

```ts
import tailwindcss from "@tailwindcss/vite";
export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  vite: { plugins: [tailwindcss()] },
});
```

**`app/assets/css/main.css`**

```css
@import "tailwindcss";
@import "@themvora/daisyui/daisyui.css";
@plugin "daisyui";
html,
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}
```

### Mount the runtime

The entry file that mounts Themvora's provider and loads the stylesheet above.

**`nuxt.config.ts`**

```ts
export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  // Nuxt loads this stylesheet globally; it is where the library's CSS and
  // the adapter's variable map are imported, in that order.
  css: ["~/assets/css/main.css"],
  themvora: {
    defaultTheme: "plum-light",
    initialMode: "system",
  },
});
```

### Attach the adapter

This is where the adapter is registered on the runtime. It writes daisyUI's own
CSS custom properties from the active theme, and disposes them on unmount.

**`app/components/ThemeZone.vue`**

```vue
<script setup lang="ts">
// `useThemeRuntime` is auto-imported by @themvora/nuxt.
import { useDaisyTheme } from "@themvora/daisyui/vue";
useDaisyTheme(useThemeRuntime());
</script>
<template>
  <slot />
</template>
```

### Use daisyUI

daisyUI's own classes and components. Nothing here is Themvora-specific markup —
the variables are already written.

**`app/components/Example.vue`**

```vue
<template>
  <div class="card bg-base-100 shadow-sm">
    <div class="card-body">
      <h2 class="card-title">Themvora + daisyUI</h2>
      <p class="text-base-content/70">This card is a plain daisyUI card. Its colours come from the theme.</p>
      <div class="card-actions justify-end">
        <button class="btn btn-primary">Primary action</button>
      </div>
    </div>
  </div>
</template>
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are daisyUI's own
components, and they are the only code that changes when the mode does.

**`app/components/ThemeControls.vue`**

```vue
<script setup lang="ts">
import { useTheme } from "@themvora/vue";
const { mode, setMode, toggleTheme } = useTheme();
</script>
<template>
  <div class="flex items-center gap-2">
    <span class="text-sm text-base-content/70">Mode: {{ mode }}</span>
    <button class="btn btn-primary btn-sm" @click="toggleTheme">Toggle</button>
    <button class="btn btn-ghost btn-sm" @click="setMode('light')">Light</button>
    <button class="btn btn-ghost btn-sm" @click="setMode('dark')">Dark</button>
  </div>
</template>
```

### Theme family

A family is the second axis: the same mode, a different palette. The runtime
carries it beside the mode, so a family picker is one more control and needs no
re-mount.

```ts
// The Nuxt binding exposes the same capability through its own
// composable — see the Nuxt framework guide for the exact call shape.
```

### Put it together

The last file composes what the steps above created: the runtime, the adapter
zone, the components and the controls.

**`app/app.vue`**

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

Install daisyUI first, then Themvora. Both commands are the ones the
documentation page shows for Svelte.

#### pnpm

```bash
pnpm add daisyui
pnpm add -D tailwindcss @tailwindcss/vite
pnpm add @themvora/core @themvora/svelte @themvora/daisyui
```

#### npm

```bash
npm install daisyui
npm install -D tailwindcss @tailwindcss/vite
npm install @themvora/core @themvora/svelte @themvora/daisyui
```

#### yarn

```bash
yarn add daisyui
yarn add -D tailwindcss @tailwindcss/vite
yarn add @themvora/core @themvora/svelte @themvora/daisyui
```

#### bun

```bash
bun add daisyui
bun add -d tailwindcss @tailwindcss/vite
bun add @themvora/core @themvora/svelte @themvora/daisyui
```

### Build configuration and global styles

The library's own stylesheet is imported first, the adapter's variable map
second. That order is what lets the adapter's values win over daisyUI's defaults
— reversing it leaves the library looking themed until the first switch.

**`vite.config.ts`**

```ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [svelte(), tailwindcss()],
});
```

**`src/index.css`**

```css
@import "tailwindcss";
@import "@themvora/daisyui/daisyui.css";
@plugin "daisyui";
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
mount(App, { target: document.getElementById("app")! });
```

### Attach the adapter

This is where the adapter is registered on the runtime. It writes daisyUI's own
CSS custom properties from the active theme, and disposes them on unmount.

**`src/lib/ThemeZone.svelte`**

```svelte
<script lang="ts">
  import type { Snippet } from "svelte";
  import { getThemeRuntime } from "@themvora/svelte";
  import { useDaisyTheme } from "@themvora/daisyui/svelte";
  let { children }: { children: Snippet } = $props();
  // Runs during component initialisation, so the variables exist before paint.
  useDaisyTheme(getThemeRuntime());
</script>
{@render children()}
```

### Use daisyUI

daisyUI's own classes and components. Nothing here is Themvora-specific markup —
the variables are already written.

**`src/lib/Example.svelte`**

```svelte
<script lang="ts">
  // Markup only — but a Svelte component without a script block emits no
  // module declaration, so importing it fails `svelte-check` under strict.
</script>
<div class="card bg-base-100 shadow-sm">
  <div class="card-body">
    <h2 class="card-title">Themvora + daisyUI</h2>
    <p class="text-base-content/70">This card is a plain daisyUI card. Its colours come from the theme.</p>
    <div class="card-actions justify-end">
      <button class="btn btn-primary">Primary action</button>
    </div>
  </div>
</div>
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are daisyUI's own
components, and they are the only code that changes when the mode does.

**`src/lib/ThemeControls.svelte`**

```svelte
<script lang="ts">
  import { useTheme } from "@themvora/svelte";
  const { mode, setMode, toggleTheme } = useTheme();
</script>
<div class="flex items-center gap-2">
  <span class="text-sm text-base-content/70">Mode: {$mode}</span>
  <button class="btn btn-primary btn-sm" onclick={toggleTheme}>Toggle</button>
  <button class="btn btn-ghost btn-sm" onclick={() => setMode("light")}>Light</button>
  <button class="btn btn-ghost btn-sm" onclick={() => setMode("dark")}>Dark</button>
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

## Solid

Verified against Solid 1.9.18 and Node.js 22.22.2.

### Install

Install daisyUI first, then Themvora. Both commands are the ones the
documentation page shows for Solid.

#### pnpm

```bash
pnpm add daisyui
pnpm add -D tailwindcss @tailwindcss/vite
pnpm add @themvora/core @themvora/solid @themvora/daisyui
```

#### npm

```bash
npm install daisyui
npm install -D tailwindcss @tailwindcss/vite
npm install @themvora/core @themvora/solid @themvora/daisyui
```

#### yarn

```bash
yarn add daisyui
yarn add -D tailwindcss @tailwindcss/vite
yarn add @themvora/core @themvora/solid @themvora/daisyui
```

#### bun

```bash
bun add daisyui
bun add -d tailwindcss @tailwindcss/vite
bun add @themvora/core @themvora/solid @themvora/daisyui
```

### Build configuration and global styles

The library's own stylesheet is imported first, the adapter's variable map
second. That order is what lets the adapter's values win over daisyUI's defaults
— reversing it leaves the library looking themed until the first switch.

**`vite.config.ts`**

```ts
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [solid(), tailwindcss()],
});
```

**`src/index.css`**

```css
@import "tailwindcss";
@import "@themvora/daisyui/daisyui.css";
@plugin "daisyui";
html,
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}
```

### Mount the runtime

The entry file that mounts Themvora's provider and loads the stylesheet above.

**`src/index.tsx`**

```tsx
import { render } from "solid-js/web";
import { ThemeProvider } from "@themvora/solid";
import "./index.css";
import { App } from "./App";
render(
  () => (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <App />
    </ThemeProvider>
  ),
  document.getElementById("root")!,
);
```

### Attach the adapter

This is where the adapter is registered on the runtime. It writes daisyUI's own
CSS custom properties from the active theme, and disposes them on unmount.

**`src/ThemeZone.tsx`**

```tsx
import type { JSX } from "solid-js";
import { useThemeRuntime } from "@themvora/solid";
import { useDaisyTheme } from "@themvora/daisyui/solid";
export function ThemeZone(props: { children: JSX.Element }) {
  useDaisyTheme(useThemeRuntime());
  return <>{props.children}</>;
}
```

### Use daisyUI

daisyUI's own classes and components. Nothing here is Themvora-specific markup —
the variables are already written.

**`src/Example.tsx`**

```tsx
export function Example() {
  return (
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <h2 class="card-title">Themvora + daisyUI</h2>
        <p class="text-base-content/70">This card is a plain daisyUI card. Its colours come from the theme.</p>
        <div class="card-actions justify-end">
          <button class="btn btn-primary">Primary action</button>
        </div>
      </div>
    </div>
  );
}
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are daisyUI's own
components, and they are the only code that changes when the mode does.

**`src/ThemeControls.tsx`**

```tsx
import { useTheme } from "@themvora/solid";
export function ThemeControls() {
  const { mode, setMode, toggleTheme } = useTheme();
  return (
    <div class="flex items-center gap-2">
      <span class="text-sm text-base-content/70">Mode: {mode()}</span>
      <button class="btn btn-primary btn-sm" onClick={() => toggleTheme()}>Toggle</button>
      <button class="btn btn-ghost btn-sm" onClick={() => setMode("light")}>Light</button>
      <button class="btn btn-ghost btn-sm" onClick={() => setMode("dark")}>Dark</button>
    </div>
  );
}
```

### Theme family

A family is the second axis: the same mode, a different palette. The runtime
carries it beside the mode, so a family picker is one more control and needs no
re-mount.

```ts
// The Solid binding exposes the same capability through its own
// composable — see the Solid framework guide for the exact call shape.
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

## Angular

Verified against Angular 22.2.5 and Node.js 22.22.2.

### Install

Install daisyUI first, then Themvora. Both commands are the ones the
documentation page shows for Angular.

#### pnpm

```bash
pnpm add daisyui
pnpm add -D tailwindcss @tailwindcss/postcss
pnpm add @themvora/core @themvora/angular @themvora/daisyui
```

#### npm

```bash
npm install daisyui
npm install -D tailwindcss @tailwindcss/postcss
npm install @themvora/core @themvora/angular @themvora/daisyui
```

#### yarn

```bash
yarn add daisyui
yarn add -D tailwindcss @tailwindcss/postcss
yarn add @themvora/core @themvora/angular @themvora/daisyui
```

#### bun

```bash
bun add daisyui
bun add -d tailwindcss @tailwindcss/postcss
bun add @themvora/core @themvora/angular @themvora/daisyui
```

### Build configuration and global styles

The library's own stylesheet is imported first, the adapter's variable map
second. That order is what lets the adapter's values win over daisyUI's defaults
— reversing it leaves the library looking themed until the first switch.

**`.postcssrc.json`**

```json
{ "plugins": { "@tailwindcss/postcss": {} } }
```

**`src/styles.css`**

```css
@import "tailwindcss";
@import "@themvora/daisyui/daisyui.css";
@plugin "daisyui";
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
import { bootstrapApplication } from "@angular/platform-browser";
import { provideTheme } from "@themvora/angular";
import { AppComponent } from "./app/app.component";
bootstrapApplication(AppComponent, {
  providers: [provideTheme({ defaultTheme: "plum-light", initialMode: "system" })],
});
```

### Attach the adapter

This is where the adapter is registered on the runtime. It writes daisyUI's own
CSS custom properties from the active theme, and disposes them on unmount.

**`src/app/theme-zone.component.ts`**

```ts
import { Component } from "@angular/core";
import { injectThemeRuntime } from "@themvora/angular";
import { injectDaisyTheme } from "@themvora/daisyui/angular";
@Component({
  selector: "app-theme-zone",
  standalone: true,
  template: "<ng-content />",
})
export class ThemeZoneComponent {
  constructor() {
    // A constructor is an injection context, so the adapter attaches to the
    // runtime `provideTheme()` created in src/main.ts.
    injectDaisyTheme(injectThemeRuntime());
  }
}
```

### Use daisyUI

daisyUI's own classes and components. Nothing here is Themvora-specific markup —
the variables are already written.

**`src/app/example.component.ts`**

```ts
import { Component } from "@angular/core";
@Component({
  selector: "app-example",
  standalone: true,
  template: `
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body">
        <h2 class="card-title">Themvora + daisyUI</h2>
        <p class="text-base-content/70">This card is a plain daisyUI card. Its colours come from the theme.</p>
        <div class="card-actions justify-end">
          <button class="btn btn-primary">Primary action</button>
        </div>
      </div>
    </div>
  `,
})
export class ExampleComponent {}
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are daisyUI's own
components, and they are the only code that changes when the mode does.

**`src/app/theme-controls.component.ts`**

```ts
import { Component } from "@angular/core";
import { injectTheme } from "@themvora/angular";
@Component({
  selector: "app-theme-controls",
  standalone: true,
  template: `
    <div class="flex items-center gap-2">
      <span class="text-sm text-base-content/70">Mode: {{ state().mode }}</span>
      <button class="btn btn-primary btn-sm" (click)="state().toggleTheme()">Toggle</button>
      <button class="btn btn-ghost btn-sm" (click)="state().setMode('light')">Light</button>
      <button class="btn btn-ghost btn-sm" (click)="state().setMode('dark')">Dark</button>
    </div>
  `,
})
export class ThemeControlsComponent {
  state = injectTheme();
}
```

### Theme family

A family is the second axis: the same mode, a different palette. The runtime
carries it beside the mode, so a family picker is one more control and needs no
re-mount.

```ts
// The Angular binding exposes the same capability through its own
// composable — see the Angular framework guide for the exact call shape.
```

### Put it together

The last file composes what the steps above created: the runtime, the adapter
zone, the components and the controls.

**`src/app/app.component.ts`**

```ts
import { Component } from "@angular/core";
import { ThemeZoneComponent } from "./theme-zone.component";
import { ExampleComponent } from "./example.component";
import { ThemeControlsComponent } from "./theme-controls.component";
@Component({
  selector: "app-root",
  standalone: true,
  imports: [ThemeZoneComponent, ExampleComponent, ThemeControlsComponent],
  template: `
    <app-theme-zone>
      <app-example />
      <app-theme-controls />
    </app-theme-zone>
  `,
})
export class AppComponent {}
```

## Development and production commands

These are the scripts each framework's own scaffold creates; Themvora adds no
build step to them. The adapter writes CSS custom properties at runtime, and its
stylesheet is a plain CSS import.

| Framework | Development | Production build | Preview |
| --- | --- | --- | --- |
| React | `pnpm dev` | `pnpm build` | `pnpm preview` |
| Next.js | `pnpm dev` | `pnpm build` | `pnpm start` |
| Remix | `pnpm dev` | `pnpm build` | `pnpm start` |
| Astro | `pnpm dev` | `pnpm build` | `pnpm preview` |
| Vue 3 | `pnpm dev` | `pnpm build` | `pnpm preview` |
| Nuxt | `pnpm dev` | `pnpm build` | `pnpm preview` |
| Svelte | `pnpm dev` | `pnpm build` | `pnpm preview` |
| Solid | `pnpm dev` | `pnpm build` | `pnpm preview` |
| Angular | `pnpm start` | `pnpm build` | — |

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
- **Components render unstyled.** `@plugin "daisyui";` is missing from the
  stylesheet, or Tailwind is not wired into the build at all. Which plugin you
  need depends on the framework — `@tailwindcss/vite` for Vite-based ones,
  `@tailwindcss/postcss` for Next.js and Angular.
- **`bg-base-100` stays grey.** `@themvora/daisyui/daisyui.css` has to be
  imported after `@import "tailwindcss"`, so its aliases resolve against the theme
  rather than Tailwind's defaults.

## Documentation

- [daisyUI integration](https://themvora-dev.vercel.app/libraries/daisyui) — the page this README mirrors
- [Worked examples for every export](https://themvora-dev.vercel.app/libraries/daisyui/examples)
- [daisyUI installation guide](https://daisyui.com/docs/install/)
- [Framework guides](https://themvora-dev.vercel.app/framework-guides)
- [All packages on npm](https://www.npmjs.com/org/themvora)
- [Changelog](https://github.com/themvora/themvora/blob/main/packages/adapters/daisyui/CHANGELOG.md)

## License

MIT — see [LICENSE](https://github.com/themvora/themvora/blob/main/packages/adapters/daisyui/LICENSE).
