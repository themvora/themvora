/**
 * Quick Start's own copies of the run-and-style snippets.
 *
 * The framework entries in `lib/frameworks.tsx` still teach the same steps on
 * the framework guides, where the run snippet carries its own inline styles.
 * Quick Start now splits that CSS out into a global stylesheet, so its run
 * snippet is class-only and its styling snippet is the component half of
 * `CANONICAL_STYLES`. Keeping both here means the guide pages and
 * `content/framework-guides.md` do not change.
 */
import { CANONICAL_STYLES, type FrameworkSnippet } from "./frameworks";

/**
 * `CANONICAL_STYLES` is the document rule followed by the component rules.
 * Splitting on the first component selector gives Quick Start the two halves
 * without restating either one.
 */
const COMPONENT_STYLES_AT = CANONICAL_STYLES.indexOf(".themvora-example-card");

/** The document rule and its comment: `html, body { … }`. */
export const QUICK_START_DOCUMENT_STYLES = CANONICAL_STYLES.slice(
  0,
  COMPONENT_STYLES_AT,
).trimEnd();

/** The `.themvora-example-*` rules, without the document rule. */
export const QUICK_START_COMPONENT_STYLES =
  CANONICAL_STYLES.slice(COMPONENT_STYLES_AT);

/**
 * The global stylesheet for every framework except Tailwind.
 *
 * The document rule paints the page; the four classes are the ones the run
 * snippet uses. `.page` deliberately does not repeat `background` or `color`:
 * that rule is already on `html, body`, and repeating it here is the duplicate
 * this split exists to remove.
 */
export const QUICK_START_GLOBAL_STYLES = `${QUICK_START_DOCUMENT_STYLES}

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
}`;

/**
 * How each framework loads the stylesheet once.
 *
 * These are not all `import` statements: Angular's CLI owns the file through
 * `angular.json`, Web Components links it from `index.html`, Nuxt lists it in
 * `nuxt.config.ts`, and Remix imports it for its `links` export. The file name
 * comes from the framework entry's `styles.title`.
 */
export type QuickStartStylesheetLoader = { file: string; code: string };

export const QUICK_START_LOADERS: Record<
  string,
  QuickStartStylesheetLoader
> = {
  react: { file: "src/main.tsx", code: 'import "./index.css";' },
  next: { file: "app/layout.tsx", code: 'import "./globals.css";' },
  vue: { file: "src/main.ts", code: 'import "./index.css";' },
  svelte: { file: "src/main.ts", code: 'import "./index.css";' },
  solid: { file: "src/index.tsx", code: 'import "./index.css";' },
  angular: { file: "angular.json", code: '"styles": ["src/styles.css"]' },
  web: {
    file: "index.html",
    code: '<link rel="stylesheet" href="/src/style.css" />',
  },
  tailwind: { file: "your app entry", code: 'import "./globals.css";' },
  astro: {
    file: "src/layouts/BaseLayout.astro",
    code: 'import "../styles/global.css";',
  },
  nuxt: { file: "nuxt.config.ts", code: 'css: ["~/assets/css/main.css"]' },
  remix: {
    file: "app/root.tsx",
    code: 'import styles from "./styles.css?url";',
  },
};

/**
 * Run and choose a theme — markup only.
 *
 * Each snippet keeps the runtime hook, the toggle, the card and the four
 * classes. There is no CSS in any of them; the global stylesheet supplies the
 * document rule and the classes, and the styling step supplies the card.
 */
export const QUICK_START_SWITCHES: Record<string, FrameworkSnippet> = {
  react: {
    title: "src/ThemeSwitcher.tsx",
    lang: "tsx",
    code: `import { useTheme } from "@themvora/react";

export function ThemeSwitcher() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <main className="page">
      <h1>Themvora</h1>
      <p>Current theme: {theme.name} ({mode})</p>

      <button className="primary" type="button" onClick={toggleTheme}>
        Toggle theme
      </button>

      <section className="card">
        <h2>Themed card</h2>
        <p className="muted">Surface, border and text follow the theme.</p>
      </section>
    </main>
  );
}`,
  },
  next: {
    title: "app/theme-switcher.tsx",
    lang: "tsx",
    code: `"use client";
import { useTheme } from "@themvora/next/client";

export function ThemeSwitcher() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <main className="page">
      <h1>Themvora</h1>
      <p>Current theme: {theme.name} ({mode})</p>

      <button className="primary" type="button" onClick={toggleTheme}>
        Toggle theme
      </button>

      <section className="card">
        <h2>Themed card</h2>
        <p className="muted">Surface, border and text follow the theme.</p>
      </section>
    </main>
  );
}`,
  },
  vue: {
    title: "src/ThemeSwitcher.vue",
    lang: "vue",
    code: `<script setup lang="ts">
import { useTheme } from "@themvora/vue";

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
</template>`,
  },
  svelte: {
    title: "src/ThemeSwitcher.svelte",
    lang: "svelte",
    code: `<script lang="ts">
  import { useTheme } from "@themvora/svelte";

  const { theme, mode, toggleTheme } = useTheme();
</script>

<main class="page">
  <h1>Themvora</h1>
  <p>Current theme: {$theme.name} ({$mode})</p>

  <button class="primary" type="button" onclick={toggleTheme}>Toggle theme</button>

  <section class="card">
    <h2>Themed card</h2>
    <p class="muted">Surface, border and text follow the theme.</p>
  </section>
</main>`,
  },
  solid: {
    title: "src/App.tsx",
    lang: "tsx",
    code: `import { useTheme } from "@themvora/solid";

export function App() {
  // Signals: call them to read the current value.
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <main class="page">
      <h1>Themvora</h1>
      <p>Current theme: {theme().name} ({mode()})</p>

      <button class="primary" type="button" onClick={toggleTheme}>
        Toggle theme
      </button>

      <section class="card">
        <h2>Themed card</h2>
        <p class="muted">Surface, border and text follow the theme.</p>
      </section>
    </main>
  );
}`,
  },
  angular: {
    title: "src/app/theme-switcher.component.ts",
    lang: "ts",
    code: `import { Component } from "@angular/core";
import { injectTheme } from "@themvora/angular";

@Component({
  selector: "theme-switcher",
  standalone: true,
  template: \`
    <main class="page">
      <h1>Themvora</h1>
      <p>Current theme: {{ state().theme.name }} ({{ state().mode }})</p>

      <button class="primary" type="button" (click)="toggle()">Toggle theme</button>

      <section class="card">
        <h2>Themed card</h2>
        <p class="muted">Surface, border and text follow the theme.</p>
      </section>
    </main>
  \`,
})
export class ThemeSwitcherComponent {
  // Must be public — Angular templates cannot access private members.
  state = injectTheme();

  toggle() {
    this.state().toggleTheme();
  }
}`,
  },
  web: {
    title: "index.html",
    lang: "html",
    code: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Themvora</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <themvora-provider>
      <main class="page">
        <h1>Themvora</h1>
        <p>Current theme: <strong id="theme-name"></strong></p>

        <button id="theme-toggle" class="primary" type="button">Toggle theme</button>

        <section class="card">
          <h2>Themed card</h2>
          <p class="muted">Surface, border and text follow the theme.</p>
        </section>
      </main>
    </themvora-provider>

    <script type="module" src="/src/main.ts"></script>
    <script type="module">
      import { useThemeRuntime } from "@themvora/web";

      const runtime = useThemeRuntime();
      document
        .querySelector("#theme-toggle")
        ?.addEventListener("click", () => runtime.toggleTheme());
    </script>
  </body>
</html>`,
  },
  astro: {
    title: "src/components/ThemeIsland.tsx",
    lang: "tsx",
    code: `import { ThemeProviderClient, useTheme } from "@themvora/astro/client";

function Panel() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <main className="page">
      <h1>Themvora</h1>
      <p>Current theme: {theme.name} ({mode})</p>

      <button className="primary" type="button" onClick={toggleTheme}>
        Toggle theme
      </button>

      <section className="card">
        <h2>Themed card</h2>
        <p className="muted">Surface, border and text follow the theme.</p>
      </section>
    </main>
  );
}

// ThemeProviderClient renders nothing — it installs the runtime. Panel is a
// sibling that reads it, and both hydrate as one island.
export default function ThemeIsland() {
  return (
    <>
      <ThemeProviderClient />
      <Panel />
    </>
  );
}

// Mount it from a page:
//   <ThemeIsland client:load />`,
  },
  "astro-native": {
    title: "src/pages/index.astro",
    lang: "astro",
    code: `---
import BaseLayout from "../layouts/BaseLayout.astro";
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
---

<BaseLayout>
  <main class="page">
    <h1>Themvora</h1>

    <ThemeToggle class="primary" />

    <section class="card">
      <h2>Themed card</h2>
      <p class="muted">Surface, border and text follow the theme.</p>
    </section>
  </main>
</BaseLayout>`,
  },
  nuxt: {
    title: "app/components/ThemeSwitcher.vue",
    lang: "vue",
    code: `<script setup lang="ts">
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
</template>`,
  },
  remix: {
    title: "app/routes/_index.tsx",
    lang: "tsx",
    code: `// The provider in app/root.tsx supplies the runtime, so a route just reads it.
import { useTheme } from "@themvora/remix";

export default function Index() {
  const { theme, mode, toggleTheme } = useTheme();

  return (
    <main className="page">
      <h1>Themvora</h1>
      <p>Current theme: {theme.name} ({mode})</p>

      <button className="primary" type="button" onClick={toggleTheme}>
        Toggle theme
      </button>

      <section className="card">
        <h2>Themed card</h2>
        <p className="muted">Surface, border and text follow the theme.</p>
      </section>
    </main>
  );
}`,
  },
};
