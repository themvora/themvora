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

Core emits the active theme's tokens as CSS custom properties, so the document
itself is themed and your own classes read the same variables without any
per-theme CSS. The rules use only required semantic colours — spacing,
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

## Editor integration

Themes you author with core can be inspected, previewed and validated inside
VS Code with **[Themvora Theme Studio for VS Code](https://marketplace.visualstudio.com/items?itemName=themvora.themvora-for-vscode)** — a
companion extension that reads `defineTheme()` definitions and theme JSON
statically, shows each token's measured contrast, and writes new themes in a
format this package reads back. It is published on the Visual Studio
Marketplace as `themvora.themvora-for-vscode`; it is an editor extension, not an
npm package.

Install it from the Extensions view (`Ctrl+Shift+X`) by searching for
**Themvora Theme Studio**, or run
`code --install-extension themvora.themvora-for-vscode`.

- [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=themvora.themvora-for-vscode)
- [Extension documentation](https://themvora-dev.vercel.app/vscode)
- [Extension source](https://github.com/themvora/themvora/tree/main/packages/vscode)

## Documentation
Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
## License
MIT
