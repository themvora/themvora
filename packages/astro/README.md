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

```astro
---
// src/layouts/BaseLayout.astro
import Provider from "@themvora/astro/provider.astro";
import themeConfig from "../theme.config";
---

<Provider config={themeConfig} lang="en">
  <slot />
</Provider>
```

The integration owns the pre-paint bootstrap; this layout owns the
server-rendered `<html>`.

## Add a small UI

A heading, a card and a button. The button reads the current theme and changes
it — nothing is styled yet.

```astro
---
// src/pages/index.astro
import BaseLayout from "../layouts/BaseLayout.astro";
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
---

<BaseLayout>
  <main class="page">
    <h1>Themvora</h1>
    <ThemeToggle />
  </main>
</BaseLayout>
```

`ThemeToggle.astro` works with no client runtime. React hooks do **not** work
directly inside `.astro` files — for those, mount a React island with
`client:only="react"` and put the provider and its consumers in the same tree.

## Style it with Themvora tokens

Themvora emits one CSS variable per token, so your own classes read the active
theme without any per-theme CSS:

```css
.page {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.card {
  background: var(--theme-color-card);
  color: var(--theme-color-cardForeground);
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-md);
  padding: var(--theme-spacing-4);
}
```

Nothing is re-rendered on a switch — the variables change and the styles follow.

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
