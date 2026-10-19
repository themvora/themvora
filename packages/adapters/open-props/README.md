# @themvora/open-props
Open Props adapter for Themvora.
## Install
```bash
npm install @themvora/core @themvora/open-props open-props
```

## Set up

The adapter writes the library's own CSS custom properties from the active
theme. Register it once, next to the provider:

```tsx
import { useOpenPropsTheme } from "@themvora/open-props/react";
import { useThemeRuntime } from "@themvora/react";

function ThemeZone() {
  useOpenPropsTheme(useThemeRuntime());
  return null;
}
```

Import the library's stylesheet so its components can read the variables:

```ts
import "@themvora/open-props/open-props.css";
```

## Add a small UI

A heading, a card and a button. Nothing is styled yet — the next step wires
the variables in.

```tsx
export function Page() {
  return (
    <main className="page">
      <h1>Themvora</h1>
      <section className="card">
        <h2>Themed card</h2>
        <p>Ordinary markup — no library component required.</p>
        <button className="primary">Primary action</button>
      </section>
    </main>
  );
}
```

## Style it with Themvora tokens

The adapter has already written the library's variables, so these classes read
the active theme:

```css
.page {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.card {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--theme-radius-md);
  padding: var(--theme-spacing-4);
}
```

Nothing is re-rendered on a switch — the variables change and the styles follow.

## Subpaths

`./factory`, `./open-props.css`

## Documentation
Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
## License
MIT

<!-- Generated from apps/docs/lib/libraries.tsx → FRAMEWORK_RECIPES. Do not edit by hand. -->

## Frameworks

| Framework | Setup |
| --------- | ----- |
| Angular | [View setup](#angular) |
| Astro | [View setup](#astro) |
| Next.js | [View setup](#nextjs) |
| Nuxt | [View setup](#nuxt) |
| React | [View setup](#react) |
| Remix | [View setup](#remix) |
| Solid | [View setup](#solid) |
| Svelte | [View setup](#svelte) |
| Vue 3 | [View setup](#vue3) |

Each section installs only what that framework needs. The Themvora foundation and
`@themvora/open-props` are common to all of them.

## Angular

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/angular
```

`@themvora/angular` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// src/main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { provideTheme } from "@themvora/angular";
import "@themvora/open-props/open-props.css";

import { AppComponent } from "./app/app.component";

bootstrapApplication(AppComponent, {
  providers: [
    provideTheme({ defaultTheme: "plum-light", initialMode: "system" }),
  ],
});
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
// src/app/example.component.ts
import { Component } from "@angular/core";

@Component({
  selector: "app-example",
  standalone: true,
  template: `
  <div class="surface">
    <h2>Themvora + Open Props</h2>
    <button class="primary">Primary action</button>
  </div>
  `,
  styles: `
.surface {
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    padding: var(--size-3);
  }
  .primary {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-radius: var(--radius-2);
    padding: var(--size-2) var(--size-3);
  }
  `,
})
export class ExampleComponent {}
```

**Theme switching**

```ts
// src/app/theme-controls.component.ts
import { Component } from "@angular/core";
import { injectTheme } from "@themvora/angular";

@Component({
  selector: "theme-controls",
  standalone: true,
  // injectTheme returns a signal, so it is read as state().
  template: `
    <button type="button" (click)="state().toggleTheme()">Toggle</button>
    <button type="button" (click)="state().setMode('light')">Light</button>
    <button type="button" (click)="state().setMode('dark')">Dark</button>
  `,
})
export class ThemeControlsComponent {
  state = injectTheme();
}
```

**Complete example**

```ts
// src/main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { provideTheme } from "@themvora/angular";
import "@themvora/open-props/open-props.css";

import { AppComponent } from "./app/app.component";

bootstrapApplication(AppComponent, {
  providers: [
    provideTheme({ defaultTheme: "plum-light", initialMode: "system" }),
  ],
});

// src/app/app.component.ts
import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { injectThemeRuntime } from "@themvora/angular";
import { injectOpenPropsTheme } from "@themvora/open-props/angular";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet],
  template: "<router-outlet />",
})
export class AppComponent {
  constructor() {
    // A constructor is an injection context — registers on provideTheme()'s runtime.
    injectOpenPropsTheme(injectThemeRuntime());
  }
}
```

## Astro

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/astro
```

`@themvora/astro` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
---
// src/layouts/BaseLayout.astro
import Provider from "@themvora/astro/provider.astro";
import themeConfig from "../../theme.config";
import "@themvora/open-props/open-props.css";
---

<Provider config={themeConfig} lang="en">
  <slot />
</Provider>
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
---
// src/components/Example.astro
import "@themvora/open-props/open-props.css";
---

  <div class="surface">
    <h2>Themvora + Open Props</h2>
    <button class="primary">Primary action</button>
  </div>

<style>
.surface {
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    padding: var(--size-3);
  }
  .primary {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-radius: var(--radius-2);
    padding: var(--size-2) var(--size-3);
  }
</style>

```

**Theme switching**

```ts
---
// src/pages/index.astro
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
---

<!-- Astro ships the toggle as a component — no hook, no script. -->
<ThemeToggle />
```

**Complete example**

```ts
---
// src/layouts/BaseLayout.astro
import Provider from "@themvora/astro/provider.astro";
import themeConfig from "../../theme.config";
import "@themvora/open-props/open-props.css";
---

<Provider config={themeConfig} lang="en">
  <slot />
</Provider>

// ---- src/pages/index.astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import { InstallAdapter } from "../components/InstallAdapter";
---

<BaseLayout>
  <InstallAdapter client:only="react" />
</BaseLayout>

// ---- src/components/InstallAdapter.tsx
"use client";

import { useThemeRuntime } from "@themvora/react";
import { useOpenPropsTheme } from "@themvora/open-props/react";

export function InstallAdapter() {
  useOpenPropsTheme(useThemeRuntime());
  return null;
}
```

## Next.js

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/next
```

`@themvora/next` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// app/layout.tsx
import { ThemeProvider } from "@themvora/next";
import "@themvora/open-props/open-props.css";

import { ThemeZone } from "./theme-zone";

// ThemeProvider renders <html> and <body> itself — do not wrap it in them.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider lang="en" defaultTheme="plum-light">
      <ThemeZone>{children}</ThemeZone>
    </ThemeProvider>
  );
}
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
// app/example.tsx
"use client";

import "@themvora/open-props/open-props.css";

export function Example() {
  return (
    <div className="surface">
      <h2>Themvora + Open Props</h2>
      <button className="primary">Primary action</button>
    </div>
  );
}
```

**Theme switching**

```ts
// app/theme-controls.tsx
"use client";

import { useTheme } from "@themvora/next/client";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button type="button" onClick={() => toggleTheme()}>Toggle</button>
      <button type="button" onClick={() => setMode("light")}>Light</button>
      <button type="button" onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}
```

**Complete example**

```ts
// app/theme-zone.tsx
"use client";

import { useThemeRuntime } from "@themvora/next/client";
import { useOpenPropsTheme } from "@themvora/open-props/react";

import { Example } from "./example";

export function ThemeZone() {
  useOpenPropsTheme(useThemeRuntime());

  return <Example />;
}

// ---------------------------------------------------------------- app/layout.tsx
import { ThemeProvider } from "@themvora/next";
import "@themvora/open-props/open-props.css";

import { ThemeZone } from "./theme-zone";

// ThemeProvider renders <html> and <body> itself — do not wrap it in them.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider lang="en" defaultTheme="plum-light">
      <ThemeZone />
      {children}
    </ThemeProvider>
  );
}
```

## Nuxt

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/nuxt
```

`@themvora/nuxt` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// nuxt.config.ts
import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  // The module owns the provider — there is no component to mount.
  modules: ["@themvora/nuxt"],
  css: ["@themvora/open-props/open-props.css"],
  themvora: {
    defaultTheme: "plum-light",
    initialMode: "system",
  },
});
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
<!-- components/Example.vue -->
<template>
  <div class="surface">
    <h2>Themvora + Open Props</h2>
    <button class="primary">Primary action</button>
  </div>
</template>

<style scoped>
.surface {
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    padding: var(--size-3);
  }
  .primary {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-radius: var(--radius-2);
    padding: var(--size-2) var(--size-3);
  }
</style>

```

**Theme switching**

```ts
<!-- components/ThemeControls.vue -->
<script setup lang="ts">
// Auto-imported by @themvora/nuxt — no import line needed.
const { setMode, toggleTheme } = useTheme();
</script>

<template>
  <button type="button" @click="toggleTheme()">Toggle</button>
  <button type="button" @click="setMode('light')">Light</button>
  <button type="button" @click="setMode('dark')">Dark</button>
</template>
```

**Complete example**

```ts
// nuxt.config.ts
import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  // The module owns the provider — there is no component to mount.
  modules: ["@themvora/nuxt"],
  css: ["@themvora/open-props/open-props.css"],
  themvora: {
    defaultTheme: "plum-light",
    initialMode: "system",
  },
});

// ------------------------------------------------- plugins/install-adapter.client.ts
import { useOpenPropsTheme } from "@themvora/open-props/vue";
import { useThemeRuntime } from "@themvora/vue";

// Runs once on the client, after the module has provided the runtime.
export default defineNuxtPlugin(() => {
  useOpenPropsTheme(useThemeRuntime());
});
```

## React

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/react
```

`@themvora/react` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// src/App.tsx
import { ThemeProvider } from "@themvora/react";
import "@themvora/open-props/open-props.css";

import { App as Page } from "./Page";
import { InstallAdapter } from "./components/InstallAdapter";

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <InstallAdapter />
      <Page />
    </ThemeProvider>
  );
}
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
// src/Example.tsx
import "@themvora/open-props/open-props.css";

export function Example() {
  return (
    <div className="surface">
      <h2>Themvora + Open Props</h2>
      <button className="primary">Primary action</button>
    </div>
  );
}
```

**Theme switching**

```ts
// src/ThemeControls.tsx
import { useTheme } from "@themvora/react";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button type="button" onClick={() => toggleTheme()}>Toggle</button>
      <button type="button" onClick={() => setMode("light")}>Light</button>
      <button type="button" onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}
```

**Complete example**

```ts
// src/App.tsx
import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { useOpenPropsTheme } from "@themvora/open-props/react";
import "@themvora/open-props/open-props.css";

import { Example } from "./Example";

// No provider to mount: the hook registers the adapter, which writes
// Open Props's own CSS variables. The stylesheet import above applies them.
function ThemeZone() {
  useOpenPropsTheme(useThemeRuntime());

  return <Example />;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <ThemeZone />
    </ThemeProvider>
  );
}
```

## Remix

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/remix
```

`@themvora/remix` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// app/root.tsx
import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { getBuiltInThemes } from "@themvora/core";
import { ThemeHead, ThemeProvider } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";
import "@themvora/open-props/open-props.css";

import { InstallAdapter } from "./components/InstallAdapter";

const themes = getBuiltInThemes();
const INITIAL_MODE = "system";

// Resolve the selection server-side so hydration matches exactly.
export async function loader({ request }: { request: Request }) {
  return {
    initial: await getInitialThemeState(request, {
      themes,
      defaultTheme: "light",
      mode: INITIAL_MODE,
    }),
  };
}

export function Layout({ children }: { children: ReactNode }) {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <html lang="en" data-theme={initial.theme.name} data-theme-ready="true">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        <ThemeHead themes={themes} defaultTheme="light" mode={INITIAL_MODE} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <ThemeProvider initial={initial} themes={themes} defaultTheme="light">
      <InstallAdapter />
      <Outlet />
    </ThemeProvider>
  );
}
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
// app/components/Example.tsx
import "@themvora/open-props/open-props.css";

export function Example() {
  return (
    <div className="surface">
      <h2>Themvora + Open Props</h2>
      <button className="primary">Primary action</button>
    </div>
  );
}
```

**Theme switching**

```ts
// app/components/ThemeControls.tsx
import { useTheme } from "@themvora/remix";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button type="button" onClick={() => toggleTheme()}>Toggle</button>
      <button type="button" onClick={() => setMode("light")}>Light</button>
      <button type="button" onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}
```

**Complete example**

```ts
// app/root.tsx
import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { getBuiltInThemes } from "@themvora/core";
import { ThemeHead, ThemeProvider, useThemeRuntime } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";
import { useOpenPropsTheme } from "@themvora/open-props/react";
import "@themvora/open-props/open-props.css";

const themes = getBuiltInThemes();
const INITIAL_MODE = "system";

// Resolve the selection server-side so hydration matches exactly.
export async function loader({ request }: { request: Request }) {
  return {
    initial: await getInitialThemeState(request, {
      themes,
      defaultTheme: "light",
      mode: INITIAL_MODE,
    }),
  };
}

export function Layout({ children }: { children: ReactNode }) {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <html lang="en" data-theme={initial.theme.name} data-theme-ready="true">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        <ThemeHead themes={themes} defaultTheme="light" mode={INITIAL_MODE} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function InstallAdapter() {
  useOpenPropsTheme(useThemeRuntime());
  return null;
}

export default function App() {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <ThemeProvider initial={initial} themes={themes} defaultTheme="light">
      <InstallAdapter />
      <Outlet />
    </ThemeProvider>
  );
}
```

## Solid

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/solid
```

`@themvora/solid` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// src/main.tsx
import { render } from "solid-js/web";
import { ThemeProvider } from "@themvora/solid";
import "@themvora/open-props/open-props.css";

import { App } from "./App";
import { InstallAdapter } from "./components/InstallAdapter";

render(
  () => (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <InstallAdapter />
      <App />
    </ThemeProvider>
  ),
  document.getElementById("root")!,
);
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
// src/components/Example.tsx
import "@themvora/open-props/open-props.css";

export function Example() {
  return (
    <div className="surface">
      <h2>Themvora + Open Props</h2>
      <button className="primary">Primary action</button>
    </div>
  );
}
```

**Theme switching**

```ts
// src/components/ThemeControls.tsx
import { useTheme } from "@themvora/solid";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button type="button" onClick={() => toggleTheme()}>Toggle</button>
      <button type="button" onClick={() => setMode("light")}>Light</button>
      <button type="button" onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}
```

**Complete example**

```ts
// src/main.tsx
import { render } from "solid-js/web";
import { ThemeProvider } from "@themvora/solid";
import "@themvora/open-props/open-props.css";

import { App } from "./App";
import { InstallAdapter } from "./components/InstallAdapter";

render(
  () => (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <InstallAdapter />
      <App />
    </ThemeProvider>
  ),
  document.getElementById("root")!,
);

// src/components/InstallAdapter.tsx
import { useThemeRuntime } from "@themvora/solid";
import { useOpenPropsTheme } from "@themvora/open-props/solid";

export function InstallAdapter() {
  useOpenPropsTheme(useThemeRuntime());
  return null;
}
```

## Svelte

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/svelte
```

`@themvora/svelte` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
<!-- src/App.svelte -->
<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
  import "@themvora/open-props/open-props.css";

  import ThemeZone from "./components/ThemeZone.svelte";
</script>

<ThemeProvider defaultTheme="plum-light" initialMode="system">
  <ThemeZone />
</ThemeProvider>
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
<!-- src/components/Example.svelte -->
  <div class="surface">
    <h2>Themvora + Open Props</h2>
    <button class="primary">Primary action</button>
  </div>

<style>
.surface {
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    padding: var(--size-3);
  }
  .primary {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-radius: var(--radius-2);
    padding: var(--size-2) var(--size-3);
  }
</style>

```

**Theme switching**

```ts
<!-- src/components/ThemeControls.svelte -->
<script lang="ts">
  import { useTheme } from "@themvora/svelte";

  const { setMode, toggleTheme } = useTheme();
</script>

<button type="button" onclick={() => toggleTheme()}>Toggle</button>
<button type="button" onclick={() => setMode("light")}>Light</button>
<button type="button" onclick={() => setMode("dark")}>Dark</button>
```

**Complete example**

```ts
<!-- src/App.svelte -->
<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
  import "@themvora/open-props/open-props.css";

  import ThemeZone from "./components/ThemeZone.svelte";
</script>

<ThemeProvider defaultTheme="plum-light" initialMode="system">
  <ThemeZone />
</ThemeProvider>

<!-- src/components/ThemeZone.svelte
     Mount inside <ThemeProvider> — the hook reads the runtime from context. -->
<script lang="ts">
  import { useOpenPropsTheme } from "@themvora/open-props/svelte";
import { useThemeRuntime } from "@themvora/svelte";

  useOpenPropsTheme(useThemeRuntime());
</script>

<Example />
```

## Vue 3

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/vue
```

`@themvora/vue` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
import "@themvora/open-props/open-props.css";

import ThemeZone from "./components/ThemeZone.vue";
</script>

<template>
  <ThemeProvider default-theme="plum-light" initial-mode="system">
    <ThemeZone />
  </ThemeProvider>
</template>
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```vue
<!-- src/components/Example.vue -->
<template>
  <div class="surface">
    <h2>Themvora + Open Props</h2>
    <button class="primary">Primary action</button>
  </div>
</template>

<style scoped>
.surface {
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    padding: var(--size-3);
  }
  .primary {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-radius: var(--radius-2);
    padding: var(--size-2) var(--size-3);
  }
</style>

```

**Theme switching**

```vue
<!-- src/components/ThemeControls.vue -->
<script setup lang="ts">
import { useTheme } from "@themvora/vue";

const { setMode, toggleTheme } = useTheme();
</script>

<template>
  <button type="button" @click="toggleTheme()">Toggle</button>
  <button type="button" @click="setMode('light')">Light</button>
  <button type="button" @click="setMode('dark')">Dark</button>
</template>
```

**Complete example**

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
import "@themvora/open-props/open-props.css";

import ThemeZone from "./components/ThemeZone.vue";
</script>

<template>
  <ThemeProvider default-theme="plum-light" initial-mode="system">
    <ThemeZone />
  </ThemeProvider>
</template>

<!-- src/components/ThemeZone.vue
     Mount inside <ThemeProvider> — the hook reads the runtime from context. -->
<script setup lang="ts">
import { useOpenPropsTheme } from "@themvora/open-props/vue";
import { useThemeRuntime } from "@themvora/vue";

useOpenPropsTheme(useThemeRuntime());
</script>

<template>
  <Example />
</template>
```

<!-- THEME-KIT:GENERATED:FRAMEWORK-RECIPES:START -->
<!-- Generated from apps/docs/lib/libraries.tsx → FRAMEWORK_RECIPES. Do not edit by hand. -->

## Frameworks

| Framework | Setup |
| --------- | ----- |
| Angular | [View setup](#angular) |
| Astro | [View setup](#astro) |
| Next.js | [View setup](#nextjs) |
| Nuxt | [View setup](#nuxt) |
| React | [View setup](#react) |
| Remix | [View setup](#remix) |
| Solid | [View setup](#solid) |
| Svelte | [View setup](#svelte) |
| Vue 3 | [View setup](#vue3) |

Each section installs only what that framework needs. The Themvora foundation and
`@themvora/open-props` are common to all of them.

## Angular

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/angular
```

`@themvora/angular` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// src/main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { provideTheme } from "@themvora/angular";
import "@themvora/open-props/open-props.css";

import { AppComponent } from "./app/app.component";

bootstrapApplication(AppComponent, {
  providers: [
    provideTheme({ defaultTheme: "plum-light", initialMode: "system" }),
  ],
});
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
// src/app/example.component.ts
import { Component } from "@angular/core";

@Component({
  selector: "app-example",
  standalone: true,
  template: `
  <div class="surface">
    <h2>Themvora + Open Props</h2>
    <button class="primary">Primary action</button>
  </div>
  `,
  styles: `
.surface {
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    padding: var(--size-3);
  }
  .primary {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-radius: var(--radius-2);
    padding: var(--size-2) var(--size-3);
  }
  `,
})
export class ExampleComponent {}
```

**Theme switching**

```ts
// src/app/theme-controls.component.ts
import { Component } from "@angular/core";
import { injectTheme } from "@themvora/angular";

@Component({
  selector: "theme-controls",
  standalone: true,
  // injectTheme returns a signal, so it is read as state().
  template: `
    <button type="button" (click)="state().toggleTheme()">Toggle</button>
    <button type="button" (click)="state().setMode('light')">Light</button>
    <button type="button" (click)="state().setMode('dark')">Dark</button>
  `,
})
export class ThemeControlsComponent {
  state = injectTheme();
}
```

**Complete example**

```ts
// src/main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { provideTheme } from "@themvora/angular";
import "@themvora/open-props/open-props.css";

import { AppComponent } from "./app/app.component";

bootstrapApplication(AppComponent, {
  providers: [
    provideTheme({ defaultTheme: "plum-light", initialMode: "system" }),
  ],
});

// src/app/app.component.ts
import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { injectThemeRuntime } from "@themvora/angular";
import { injectOpenPropsTheme } from "@themvora/open-props/angular";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet],
  template: "<router-outlet />",
})
export class AppComponent {
  constructor() {
    // A constructor is an injection context — registers on provideTheme()'s runtime.
    injectOpenPropsTheme(injectThemeRuntime());
  }
}
```

## Astro

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/astro
```

`@themvora/astro` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
---
// src/layouts/BaseLayout.astro
import Provider from "@themvora/astro/provider.astro";
import themeConfig from "../../theme.config";
import "@themvora/open-props/open-props.css";
---

<Provider config={themeConfig} lang="en">
  <slot />
</Provider>
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
---
// src/components/Example.astro
import "@themvora/open-props/open-props.css";
---

  <div class="surface">
    <h2>Themvora + Open Props</h2>
    <button class="primary">Primary action</button>
  </div>

<style>
.surface {
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    padding: var(--size-3);
  }
  .primary {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-radius: var(--radius-2);
    padding: var(--size-2) var(--size-3);
  }
</style>

```

**Theme switching**

```ts
---
// src/pages/index.astro
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
---

<!-- Astro ships the toggle as a component — no hook, no script. -->
<ThemeToggle />
```

**Complete example**

```ts
---
// src/layouts/BaseLayout.astro
import Provider from "@themvora/astro/provider.astro";
import themeConfig from "../../theme.config";
import "@themvora/open-props/open-props.css";
---

<Provider config={themeConfig} lang="en">
  <slot />
</Provider>

// ---- src/pages/index.astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import { InstallAdapter } from "../components/InstallAdapter";
---

<BaseLayout>
  <InstallAdapter client:only="react" />
</BaseLayout>

// ---- src/components/InstallAdapter.tsx
"use client";

import { useThemeRuntime } from "@themvora/react";
import { useOpenPropsTheme } from "@themvora/open-props/react";

export function InstallAdapter() {
  useOpenPropsTheme(useThemeRuntime());
  return null;
}
```

## Next.js

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/next
```

`@themvora/next` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// app/layout.tsx
import { ThemeProvider } from "@themvora/next";
import "@themvora/open-props/open-props.css";

import { ThemeZone } from "./theme-zone";

// ThemeProvider renders <html> and <body> itself — do not wrap it in them.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider lang="en" defaultTheme="plum-light">
      <ThemeZone>{children}</ThemeZone>
    </ThemeProvider>
  );
}
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
// app/example.tsx
"use client";

import "@themvora/open-props/open-props.css";

export function Example() {
  return (
    <div className="surface">
      <h2>Themvora + Open Props</h2>
      <button className="primary">Primary action</button>
    </div>
  );
}
```

**Theme switching**

```ts
// app/theme-controls.tsx
"use client";

import { useTheme } from "@themvora/next/client";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button type="button" onClick={() => toggleTheme()}>Toggle</button>
      <button type="button" onClick={() => setMode("light")}>Light</button>
      <button type="button" onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}
```

**Complete example**

```ts
// app/theme-zone.tsx
"use client";

import { useThemeRuntime } from "@themvora/next/client";
import { useOpenPropsTheme } from "@themvora/open-props/react";

import { Example } from "./example";

export function ThemeZone() {
  useOpenPropsTheme(useThemeRuntime());

  return <Example />;
}

// ---------------------------------------------------------------- app/layout.tsx
import { ThemeProvider } from "@themvora/next";
import "@themvora/open-props/open-props.css";

import { ThemeZone } from "./theme-zone";

// ThemeProvider renders <html> and <body> itself — do not wrap it in them.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider lang="en" defaultTheme="plum-light">
      <ThemeZone />
      {children}
    </ThemeProvider>
  );
}
```

## Nuxt

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/nuxt
```

`@themvora/nuxt` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// nuxt.config.ts
import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  // The module owns the provider — there is no component to mount.
  modules: ["@themvora/nuxt"],
  css: ["@themvora/open-props/open-props.css"],
  themvora: {
    defaultTheme: "plum-light",
    initialMode: "system",
  },
});
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
<!-- components/Example.vue -->
<template>
  <div class="surface">
    <h2>Themvora + Open Props</h2>
    <button class="primary">Primary action</button>
  </div>
</template>

<style scoped>
.surface {
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    padding: var(--size-3);
  }
  .primary {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-radius: var(--radius-2);
    padding: var(--size-2) var(--size-3);
  }
</style>

```

**Theme switching**

```ts
<!-- components/ThemeControls.vue -->
<script setup lang="ts">
// Auto-imported by @themvora/nuxt — no import line needed.
const { setMode, toggleTheme } = useTheme();
</script>

<template>
  <button type="button" @click="toggleTheme()">Toggle</button>
  <button type="button" @click="setMode('light')">Light</button>
  <button type="button" @click="setMode('dark')">Dark</button>
</template>
```

**Complete example**

```ts
// nuxt.config.ts
import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  // The module owns the provider — there is no component to mount.
  modules: ["@themvora/nuxt"],
  css: ["@themvora/open-props/open-props.css"],
  themvora: {
    defaultTheme: "plum-light",
    initialMode: "system",
  },
});

// ------------------------------------------------- plugins/install-adapter.client.ts
import { useOpenPropsTheme } from "@themvora/open-props/vue";
import { useThemeRuntime } from "@themvora/vue";

// Runs once on the client, after the module has provided the runtime.
export default defineNuxtPlugin(() => {
  useOpenPropsTheme(useThemeRuntime());
});
```

## React

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/react
```

`@themvora/react` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// src/App.tsx
import { ThemeProvider } from "@themvora/react";
import "@themvora/open-props/open-props.css";

import { App as Page } from "./Page";
import { InstallAdapter } from "./components/InstallAdapter";

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <InstallAdapter />
      <Page />
    </ThemeProvider>
  );
}
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
// src/Example.tsx
import "@themvora/open-props/open-props.css";

export function Example() {
  return (
    <div className="surface">
      <h2>Themvora + Open Props</h2>
      <button className="primary">Primary action</button>
    </div>
  );
}
```

**Theme switching**

```ts
// src/ThemeControls.tsx
import { useTheme } from "@themvora/react";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button type="button" onClick={() => toggleTheme()}>Toggle</button>
      <button type="button" onClick={() => setMode("light")}>Light</button>
      <button type="button" onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}
```

**Complete example**

```ts
// src/App.tsx
import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { useOpenPropsTheme } from "@themvora/open-props/react";
import "@themvora/open-props/open-props.css";

import { Example } from "./Example";

// No provider to mount: the hook registers the adapter, which writes
// Open Props's own CSS variables. The stylesheet import above applies them.
function ThemeZone() {
  useOpenPropsTheme(useThemeRuntime());

  return <Example />;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <ThemeZone />
    </ThemeProvider>
  );
}
```

## Remix

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/remix
```

`@themvora/remix` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// app/root.tsx
import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { getBuiltInThemes } from "@themvora/core";
import { ThemeHead, ThemeProvider } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";
import "@themvora/open-props/open-props.css";

import { InstallAdapter } from "./components/InstallAdapter";

const themes = getBuiltInThemes();
const INITIAL_MODE = "system";

// Resolve the selection server-side so hydration matches exactly.
export async function loader({ request }: { request: Request }) {
  return {
    initial: await getInitialThemeState(request, {
      themes,
      defaultTheme: "light",
      mode: INITIAL_MODE,
    }),
  };
}

export function Layout({ children }: { children: ReactNode }) {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <html lang="en" data-theme={initial.theme.name} data-theme-ready="true">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        <ThemeHead themes={themes} defaultTheme="light" mode={INITIAL_MODE} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <ThemeProvider initial={initial} themes={themes} defaultTheme="light">
      <InstallAdapter />
      <Outlet />
    </ThemeProvider>
  );
}
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
// app/components/Example.tsx
import "@themvora/open-props/open-props.css";

export function Example() {
  return (
    <div className="surface">
      <h2>Themvora + Open Props</h2>
      <button className="primary">Primary action</button>
    </div>
  );
}
```

**Theme switching**

```ts
// app/components/ThemeControls.tsx
import { useTheme } from "@themvora/remix";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button type="button" onClick={() => toggleTheme()}>Toggle</button>
      <button type="button" onClick={() => setMode("light")}>Light</button>
      <button type="button" onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}
```

**Complete example**

```ts
// app/root.tsx
import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { getBuiltInThemes } from "@themvora/core";
import { ThemeHead, ThemeProvider, useThemeRuntime } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";
import { useOpenPropsTheme } from "@themvora/open-props/react";
import "@themvora/open-props/open-props.css";

const themes = getBuiltInThemes();
const INITIAL_MODE = "system";

// Resolve the selection server-side so hydration matches exactly.
export async function loader({ request }: { request: Request }) {
  return {
    initial: await getInitialThemeState(request, {
      themes,
      defaultTheme: "light",
      mode: INITIAL_MODE,
    }),
  };
}

export function Layout({ children }: { children: ReactNode }) {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <html lang="en" data-theme={initial.theme.name} data-theme-ready="true">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        <ThemeHead themes={themes} defaultTheme="light" mode={INITIAL_MODE} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function InstallAdapter() {
  useOpenPropsTheme(useThemeRuntime());
  return null;
}

export default function App() {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <ThemeProvider initial={initial} themes={themes} defaultTheme="light">
      <InstallAdapter />
      <Outlet />
    </ThemeProvider>
  );
}
```

## Solid

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/solid
```

`@themvora/solid` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
// src/main.tsx
import { render } from "solid-js/web";
import { ThemeProvider } from "@themvora/solid";
import "@themvora/open-props/open-props.css";

import { App } from "./App";
import { InstallAdapter } from "./components/InstallAdapter";

render(
  () => (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <InstallAdapter />
      <App />
    </ThemeProvider>
  ),
  document.getElementById("root")!,
);
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
// src/components/Example.tsx
import "@themvora/open-props/open-props.css";

export function Example() {
  return (
    <div className="surface">
      <h2>Themvora + Open Props</h2>
      <button className="primary">Primary action</button>
    </div>
  );
}
```

**Theme switching**

```ts
// src/components/ThemeControls.tsx
import { useTheme } from "@themvora/solid";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <>
      <button type="button" onClick={() => toggleTheme()}>Toggle</button>
      <button type="button" onClick={() => setMode("light")}>Light</button>
      <button type="button" onClick={() => setMode("dark")}>Dark</button>
    </>
  );
}
```

**Complete example**

```ts
// src/main.tsx
import { render } from "solid-js/web";
import { ThemeProvider } from "@themvora/solid";
import "@themvora/open-props/open-props.css";

import { App } from "./App";
import { InstallAdapter } from "./components/InstallAdapter";

render(
  () => (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <InstallAdapter />
      <App />
    </ThemeProvider>
  ),
  document.getElementById("root")!,
);

// src/components/InstallAdapter.tsx
import { useThemeRuntime } from "@themvora/solid";
import { useOpenPropsTheme } from "@themvora/open-props/solid";

export function InstallAdapter() {
  useOpenPropsTheme(useThemeRuntime());
  return null;
}
```

## Svelte

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/svelte
```

`@themvora/svelte` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```ts
<!-- src/App.svelte -->
<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
  import "@themvora/open-props/open-props.css";

  import ThemeZone from "./components/ThemeZone.svelte";
</script>

<ThemeProvider defaultTheme="plum-light" initialMode="system">
  <ThemeZone />
</ThemeProvider>
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```ts
<!-- src/components/Example.svelte -->
  <div class="surface">
    <h2>Themvora + Open Props</h2>
    <button class="primary">Primary action</button>
  </div>

<style>
.surface {
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    padding: var(--size-3);
  }
  .primary {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-radius: var(--radius-2);
    padding: var(--size-2) var(--size-3);
  }
</style>

```

**Theme switching**

```ts
<!-- src/components/ThemeControls.svelte -->
<script lang="ts">
  import { useTheme } from "@themvora/svelte";

  const { setMode, toggleTheme } = useTheme();
</script>

<button type="button" onclick={() => toggleTheme()}>Toggle</button>
<button type="button" onclick={() => setMode("light")}>Light</button>
<button type="button" onclick={() => setMode("dark")}>Dark</button>
```

**Complete example**

```ts
<!-- src/App.svelte -->
<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
  import "@themvora/open-props/open-props.css";

  import ThemeZone from "./components/ThemeZone.svelte";
</script>

<ThemeProvider defaultTheme="plum-light" initialMode="system">
  <ThemeZone />
</ThemeProvider>

<!-- src/components/ThemeZone.svelte
     Mount inside <ThemeProvider> — the hook reads the runtime from context. -->
<script lang="ts">
  import { useOpenPropsTheme } from "@themvora/open-props/svelte";
import { useThemeRuntime } from "@themvora/svelte";

  useOpenPropsTheme(useThemeRuntime());
</script>

<Example />
```

## Vue 3

**Install**

```bash
npm install @themvora/core @themvora/open-props @themvora/vue
```

`@themvora/vue` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Register the adapter next to the provider. It writes the library's own CSS
custom properties from the active theme — no provider of its own.

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
import "@themvora/open-props/open-props.css";

import ThemeZone from "./components/ThemeZone.vue";
</script>

<template>
  <ThemeProvider default-theme="plum-light" initial-mode="system">
    <ThemeZone />
  </ThemeProvider>
</template>
```

**Use the library**

Ordinary markup using open-props's own classes — the variables are already written.

```vue
<!-- src/components/Example.vue -->
<template>
  <div class="surface">
    <h2>Themvora + Open Props</h2>
    <button class="primary">Primary action</button>
  </div>
</template>

<style scoped>
.surface {
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2);
    padding: var(--size-3);
  }
  .primary {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    border-radius: var(--radius-2);
    padding: var(--size-2) var(--size-3);
  }
</style>

```

**Theme switching**

```vue
<!-- src/components/ThemeControls.vue -->
<script setup lang="ts">
import { useTheme } from "@themvora/vue";

const { setMode, toggleTheme } = useTheme();
</script>

<template>
  <button type="button" @click="toggleTheme()">Toggle</button>
  <button type="button" @click="setMode('light')">Light</button>
  <button type="button" @click="setMode('dark')">Dark</button>
</template>
```

**Complete example**

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { ThemeProvider } from "@themvora/vue";
import "@themvora/open-props/open-props.css";

import ThemeZone from "./components/ThemeZone.vue";
</script>

<template>
  <ThemeProvider default-theme="plum-light" initial-mode="system">
    <ThemeZone />
  </ThemeProvider>
</template>

<!-- src/components/ThemeZone.vue
     Mount inside <ThemeProvider> — the hook reads the runtime from context. -->
<script setup lang="ts">
import { useOpenPropsTheme } from "@themvora/open-props/vue";
import { useThemeRuntime } from "@themvora/vue";

useOpenPropsTheme(useThemeRuntime());
</script>

<template>
  <Example />
</template>
```

<!-- THEME-KIT:GENERATED:FRAMEWORK-RECIPES:END -->
