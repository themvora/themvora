# @themvora/astro

## Install

```bash
npm install @themvora/core @themvora/astro astro
```

`@themvora/astro` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

Astro-native theming: an integration for the pre-paint bootstrap, a React-free
`<html>` layout, and opt-in client islands.

`@themvora/astro` imports no React. React lives behind the opt-in
`@themvora/astro/client` entry and is an **optional peer dependency** — install
it only if you choose a React island.

## Set up

Three files. `theme.config.ts` declares the themes and the starting mode, the integration registers `themvora()`, and the layout mounts the provider that server-renders the themed `<html>`.

```ts title="theme.config.ts"
import { defineTheme, defineThemvoraConfig } from "@themvora/core";

const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light", label: "Mint Light", order: 10 },
    tokens: { colors: { background: "#f8fafc", foreground: "#0f172a" } },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark", label: "Mint Dark", order: 20 },
    tokens: { colors: { background: "#0f172a", foreground: "#f8fafc" } },
  }),
];

export default defineThemvoraConfig({
  themes,
  defaultTheme: "mint-light",
  initialMode: "system",
  initialFamily: "mint",
});
```

```js title="astro.config.mjs"
import { defineConfig } from "astro/config";
import themvora from "@themvora/astro";

export default defineConfig({
  integrations: [themvora()],
});
```

```astro title="src/layouts/BaseLayout.astro"
---
// The one place the provider is mounted.
import Provider from "@themvora/astro/provider.astro";
import themeConfig from "../../theme.config";
import "../styles.css";
---

<Provider config={themeConfig} lang="en" bootstrap={false}>
  <slot />
</Provider>
```

## Run and choose a theme

`<ThemeToggle />` ships with the integration and needs no client runtime. The markup carries only four classes — `page`, `primary`, `card` and `muted` — and no CSS.

```astro title="src/pages/index.astro"
---
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
</BaseLayout>
```

Those four classes are plain CSS. The next step puts the document rule and those classes in a global stylesheet; nothing is inlined or scoped here.

## Add the global stylesheet

Put the document rule and the four classes from step 3 in `src/styles/global.css`. Themvora emits its design tokens as CSS custom properties on the root element, so this stylesheet only reads them.

```css title="src/styles/global.css"
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

Load it once from `src/layouts/BaseLayout.astro` with `import "../styles/global.css";`, so the classes from step 3 pick up the theme.

## Add a small UI

A status card with a heading, a description, a status label and a primary button.

```astro title="src/components/WorkspaceCard.astro"
---
// Nothing to run here: the classes read the variables the provider applies.
---

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
```

## Style it with Themvora tokens

Only the component rules live here — the document rule is in the global stylesheet from step 4, so it is not repeated below. Every colour is a required semantic token, so any theme that passes `validateTheme()` emits it; radius and shadow are optional and carry fallbacks, and no typography token is read.

```css title="src/styles/global.css"
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
## 1. Integration (build boundary)

```ts
// theme.config.ts — the single declaration
import { defineThemvoraConfig } from "@themvora/core";
import { themes } from "./src/themes";

export default defineThemvoraConfig({
  themes,
  defaultTheme: "mint-light",
  initialMode: "system",
});

// astro.config.ts — register the integration. No theme data.
import { defineConfig } from "astro/config";
import themvora from "@themvora/astro";

export default defineConfig({
  integrations: [themvora()],
});
```

The integration discovers `theme.config.ts` at the project root, injects the
pre-paint blocking bootstrap into every page's `<head>` via
`injectScript("head-inline")`, and transports the same configuration to the
runtime as `window.__THEMVORA_CONFIG__` — so the pages, the layout and the
islands all read one declaration instead of three that have to be kept in sync.

## 2. Astro component (SSR document)

```astro
---
// src/layouts/BaseLayout.astro — React-free.
import Provider from "@themvora/astro/provider.astro";
import { themes } from "../themes";
---

<Provider themes={themes} defaultTheme="mint-light" bootstrap={false}>
  <slot />
</Provider>
```

`provider.astro` resolves the selection from cookies on the server, paints the
themed `<html data-theme>` with inline CSS variables, and emits the blocking
bootstrap. Pass `bootstrap={false}` when the integration already injects it.

## 3. Client islands (opt-in)

```astro
---
import { getInitialThemeState } from "@themvora/astro";
import { ThemeProviderClient } from "@themvora/astro/client";
import { themes } from "../themes";

const initial = await getInitialThemeState(Astro.request, { themes });
---

<ThemeProviderClient client:load themes={themes} initial={initial} />
```

`@themvora/astro/client` is the only entry that depends on React. Install
`react`, `react-dom` and `@astrojs/react` yourself.

Use **`client:load`**, not `client:only`, and always pass `initial`. Astro
server-renders a `client:load` island, so the markup is in the first paint;
`client:only` renders nothing on the server, so the island would pop in once the
bundle executed. `initial` is what makes hydration match: without it the runtime
resolves the persisted selection on the client while the server rendered the
fallback, and React reports a mismatch and re-renders the island.

Every island that calls `useTheme()` must be rendered **inside the same island**
as `<ThemeProviderClient>`, which installs the runtime during its own render —
never as a sibling island, because Astro hydrates islands in an unspecified
order and a consumer that hydrates first throws "ThemeRuntime not initialized".

## Exports

| Entry | Contents | Client framework |
| ----- | -------- | ---------------- |
| `@themvora/astro` | `themvora()`, `getInitialThemeState()`, `createBlockingScript`, `buildThemeCssMap`, `darkModeCSSTemplate`, `createAstroThemePersistence`, `computeFingerprint`, `getGlobalRuntime` / `setGlobalRuntime` | none |
| `@themvora/astro/provider.astro` | The SSR document component | none |
| `@themvora/astro/client` | `ThemeProviderClient`, the `useTheme*` hooks, `ThemeScope` | React |
| `@themvora/astro/ThemeInspector.astro` | Dev inspector | none |

## Documentation

Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
