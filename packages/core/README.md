# @themvora/core
Framework-agnostic theming engine: theme store, runtime, transitions, scheduling, accessibility, and DOM adapters.
## Install
```bash
npm install @themvora/core
```
## Set up

Core is framework-neutral — there is no provider component. Create a runtime and
it owns the active theme for the whole document:

```ts
import { createThemeRuntime, getBuiltInThemes } from "@themvora/core";

const runtime = createThemeRuntime({
  themes: getBuiltInThemes(),
  defaultTheme: "plum-light",
  initialMode: "system",
});
```

Every framework integration wraps this runtime rather than replacing it, so a
selection made through `@themvora/react` is the same selection core resolved.

## Add a small UI

A heading, a card and a button, in plain DOM. The button reads the current theme
and changes it — nothing is styled yet.

```ts
runtime.store.subscribe((theme) => {
  document.documentElement.dataset.theme = theme.name;
});

document.body.innerHTML = `
  <main class="page">
    <h1>Themvora</h1>
    <p id="readout"></p>
    <button id="toggle">Toggle theme</button>
  </main>
`;

const readout = document.getElementById("readout")!;
runtime.store.subscribe((theme) => {
  readout.textContent = `${theme.name} · ${runtime.selection.getMode()}`;
});

document.getElementById("toggle")!.addEventListener("click", () => {
  runtime.selection.toggleTheme();
});
```

## Style it with Themvora tokens

Core emits one CSS variable per token, so your own classes read the active theme
without any per-theme CSS:

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

## Quick start

```js
import { createThemeStore, ThemeRuntime, createCSSVariablesBinding } from "@themvora/core";

const store = createThemeStore({
  themes: {
    light: { name: "light", tokens: { color: { background: "#ffffff" } } },
    dark: { name: "dark", tokens: { color: { background: "#0a0a0a" } } },
  },
});
const runtime = new ThemeRuntime({ store });
createCSSVariablesBinding(store);
```

## Subpaths

`./vanilla`, `./vite`, `./scrollbar.css`

## Documentation
Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
## License
MIT
