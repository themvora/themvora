# @themvora/svelte

## Install

```bash
npm install @themvora/core @themvora/svelte
```

`@themvora/svelte` builds on `@themvora/core`, so those are installed explicitly rather than relied on transitively.

Svelte 5 context-based provider with reactive readable stores.

## Set up

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import { ThemeProvider } from "@themvora/svelte";
  import { themes } from "./theme/themes";
</script>

<ThemeProvider {themes} defaultTheme="mint-light">
  <Page />
</ThemeProvider>
```

## Add a small UI

A heading, a card and a button. The button reads the current theme and changes
it — nothing is styled yet.

```svelte
<script lang="ts">
  import { useTheme } from "@themvora/svelte";

  const { theme, mode, toggleTheme } = useTheme();
</script>

<main class="page">
  <h1>Themvora</h1>
  <p>{$theme.name} · {$mode}</p>
  <button type="button" onclick={() => toggleTheme()}>Toggle theme</button>
</main>
```

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
