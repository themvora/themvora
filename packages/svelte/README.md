# @themvora/svelte

## Install

```bash
npm install @themvora/core @themvora/svelte
```

`@themvora/svelte` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

Svelte 5 context-based provider with reactive readable stores.

Requires Svelte `^5.56.0`. The compiled components use the runtime's Set-based `rest_props` argument, which Svelte introduced in 5.56; earlier 5.x releases throw `exclude.includes is not a function` when the provider mounts.

## Set up

`ThemeProvider` publishes the runtime through Svelte context, so it has to sit above every component that reads it.

```svelte title="src/App.svelte"
<!-- No theme definition needed -->
<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
</script>

<!-- No `themes` prop → built-in neutral theme.
     defaultTheme picks the theme; initialMode="system" is the opt-in for
     following the OS. The provider hands that mode to BOTH the pre-paint
     script it injects and the runtime, so the two cannot disagree. -->
<ThemeProvider defaultTheme="light" initialMode="system">
  <h1>Hello, themed world</h1>
</ThemeProvider>
```

```ts title="src/main.ts"
// The Vite entry: mount the app and load the stylesheet once.
import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";

mount(App, { target: document.getElementById("app")! });
```

## Run and choose a theme

`useTheme()` returns stores, so the template reads `$theme` and `$mode`. The markup carries only four classes — `page`, `primary`, `card` and `muted` — and no CSS.

```svelte title="src/ThemeSwitcher.svelte"
<script lang="ts">
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
</main>
```

Those four classes are plain CSS. The next step puts the document rule and those classes in a global stylesheet; nothing is inlined or scoped here.

## Add the global stylesheet

Put the document rule and the four classes from step 3 in `src/index.css`. Themvora emits its design tokens as CSS custom properties on the root element, so this stylesheet only reads them.

```css title="src/index.css"
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

Load it once from `src/main.ts` with `import "./index.css";`, so the classes from step 3 pick up the theme.

## Add a small UI

A status card with a heading, a description, a status label and a primary button.

```svelte title="src/lib/WorkspaceCard.svelte"
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

```css title="src/index.css"
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

```svelte
<script>
  import { useTheme } from "@themvora/svelte";
  const { theme, mode, toggleTheme } = useTheme();
</script>

<button onclick={toggleTheme}>
  {$theme.name} · {$mode}
</button>
```

## Provider

`ThemeProvider` (context, DOM + CSS variable bindings); `getThemeRuntime()` / `setThemeRuntime()` context helpers.

## Stores

`useTheme` — reactive readable stores for `theme`, `mode`, `family` plus `useThemeHistory`, `useThemeBatch`, `useThemeSnapshot`, `useThemeRestore`, `useThemeLifecycle`, `useThemePacks`.

## Components

`ThemeScope` — scoped theming.

## Documentation

Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
