# @themvora/web

Framework-free theming for any HTML page, through custom elements and CSS
variables.

## Install

```bash
npm install @themvora/core @themvora/web
```

`@themvora/web` builds on `@themvora/core`, so it is installed explicitly rather
than relied on transitively.

## Set up

Four files. The Vite plugin injects the render-blocking theme CSS, the transported configuration and the blocking boot script; `theme.config.ts` declares the catalog once; `<themvora-provider>` owns the runtime; and the module import registers the custom elements.

```ts title="vite.config.ts"
import { defineConfig } from "vite";
import { themvoraVitePlugin } from "@themvora/web/vite";

export default defineConfig({
  plugins: [themvoraVitePlugin()],
});
```

```ts title="theme.config.ts"
import { defineThemvoraConfig, getBuiltInThemes } from "@themvora/core";

export default defineThemvoraConfig({
  themes: getBuiltInThemes(),
  defaultTheme: "light",
  initialMode: "system",
});
```

```html title="index.html"
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Themvora</title>
    <!-- Render-blocking on purpose: a CSS file imported from main.ts is
         injected by JavaScript, so in dev the first paint happens before it
         exists and the page flashes unstyled. -->
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <!-- No controls, no script beyond the module import: the provider applies
         the theme and ordinary HTML reads the variables. -->
    <themvora-provider default-theme="light" initial-mode="system">
      <h1>Hello, themed world</h1>
      <p>Current theme: <strong id="theme-name"></strong></p>
    </themvora-provider>

    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```ts title="src/main.ts"
// The whole setup. This one import registers the elements and injects their
// stylesheet, so the markup in index.html upgrades on its own. The page's own
// stylesheet is a <link> in index.html, not an import here — see the comment
// in that file.
import "@themvora/web";

// Optional: read the current theme in application code. The runtime's helpers
// are getters, so subscribe and re-read.
import { useThemeRuntime } from "@themvora/web";

const runtime = useThemeRuntime();
const readout = document.querySelector<HTMLElement>("#theme-name");

if (!readout) {
  throw new Error("index.html must contain a #theme-name element.");
}

const render = () => {
  readout.textContent = runtime.store.get().name;
};

runtime.store.subscribe(render);
render();
```

## Run and choose a theme

`<themvora-provider>` owns the runtime, and the toggle writes to it through the element API. The markup carries only four classes — `page`, `primary`, `card` and `muted` — and no CSS.

```html title="index.html"
<!doctype html>
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
</html>
```

Those four classes are plain CSS. The next step puts the document rule and those classes in a global stylesheet; nothing is inlined or scoped here.

## Add the global stylesheet

Put the document rule and the four classes from step 3 in `src/styles.css`. Themvora emits its design tokens as CSS custom properties on the root element, so this stylesheet only reads them.

```css title="src/styles.css"
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

Load it once from `index.html` with `<link rel="stylesheet" href="/src/styles.css" />`, so the classes from step 3 pick up the theme.

## Add a small UI

The same card in ordinary HTML. It needs no JavaScript, because it only reads CSS variables.

```html title="index.html"
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

```css title="src/styles.css"
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
## Configuration

Every provider option is an attribute, and every attribute is live — changing
one reconciles the running runtime, so the controls, scopes, variables and any
displayed text update without a reload.

| Attribute | Values | Notes |
| --- | --- | --- |
| `themes` | `"light dark plum-dark"` or a JSON array of theme definitions | Names are resolved against the registered catalog; an unknown name is reported and skipped. |
| `default-theme` | a theme name | Changing it re-resolves the selection. |
| `initial-mode` | `light` \| `dark` \| `system` | Case-insensitive; anything else is reported and ignored. |
| `initial-family` | a family name | An unregistered family is reported and normalised. |
| `transition` | JSON `true` / `false` / options | Removing it returns to no configured transition. |
| `scheduled` | JSON sunrise/sunset options | Removing it tears the schedule down. |

Removing `themes`, `default-theme`, `initial-mode` or `initial-family` stops
that attribute contributing; it does not reset the live selection. Invalid
values are reported once through the standard diagnostic pipeline and ignored —
never thrown.

## JavaScript, when you need it

```ts
import { getProviderRuntime, useThemeRuntime } from "@themvora/web";

// Page-level: the first initialized provider.
const runtime = useThemeRuntime();
runtime.selection.setMode("dark");
runtime.selection.setFamily("plum");

// Specific provider (multi-provider pages).
const provider = document.querySelector("themvora-provider");
const scoped = getProviderRuntime(provider);
```

The `useTheme*` helpers are getters, not subscriptions:

```ts
const render = () => {
  label.textContent = runtime.store.get().name;
};
runtime.store.subscribe(render);
render();
```

## Events

`<themvora-provider>` dispatches two bubbling, composed events:

- `theme-ready` — once, after the runtime exists and the first theme is applied.
- `themes-change` — after an attribute change replaced the theme catalog;
  `detail.themes` names the new catalog.

## Plain HTML

Load the standalone bundle — it inlines `@themvora/core`, so there is no import
map and no bare specifier to resolve:

```html
<script src="https://cdn.jsdelivr.net/npm/@themvora/web@1.6.0/dist/cdn.js"></script>

<themvora-provider default-theme="light">
  <themvora-toggle></themvora-toggle>
</themvora-provider>
```

The bundle registers the elements, injects the stylesheet, and exposes the API
on `window.ThemvoraWeb`.

## Zero flash

The element lifecycle cannot guarantee first paint, because a module script is
evaluated asynchronously. The theme has to be on `<html>` before the browser
paints, which means a **blocking** script in `<head>`.

With Vite, `themvoraVitePlugin()` does it for you — it reads `theme.config.ts`
and injects the script (and the pre-paint scrollbar CSS) into every page:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { themvoraVitePlugin } from "@themvora/core/vite";

export default defineConfig({ plugins: [themvoraVitePlugin()] });
```

```ts
// theme.config.ts
import { defineTheme, defineThemvoraConfig } from "@themvora/core";

export default defineThemvoraConfig({
  themes: [/* the same catalog the provider is given */],
  defaultTheme: "light",
  initialMode: "system",
});
```

Without Vite, generate the same script with `createThemeBootstrapScript()` from
`@themvora/core`, inline it in `<head>` before the module, and the provider
adopts the state it painted (`data-theme-ready`).

The catalog in `theme.config.ts` must match the provider's `themes`; the script
and the runtime have to resolve the same themes, or the runtime corrects what
the script painted and the visitor sees the flash the script exists to prevent.

## Explicit registration (advanced)

`defineCustomElements()` remains available, and a single element can be
registered under your own tag:

```ts
import { ThemvoraProvider, defineCustomElements } from "@themvora/web";

defineCustomElements(); // idempotent
ThemvoraProvider.define("my-provider");
```

## VS Code IntelliSense

The package ships `html-data.json`, a
[VS Code HTML custom data](https://code.visualstudio.com/docs/languages/html#_custom-data)
file describing every `<themvora-*>` element, its attributes, their valid
values and the documentation for each.

VS Code does not load it automatically — point the editor at the copy inside
the installed package. In your workspace `.vscode/settings.json`:

```json
{
  "html.customData": ["./node_modules/@themvora/web/html-data.json"]
}
```

The path is resolved from the workspace folder, so a pnpm or monorepo layout
needs the real location of the package (for example
`./node_modules/@themvora/web/html-data.json` at the workspace root, or the
app's own `node_modules` when the package is installed per-app).

With that in place, typing `<themvora-` suggests the elements, `<themvora-provider `
suggests its attributes, hovering a tag or an attribute shows its description,
and closed value sets (`initial-mode`, `select[type]`, the scrollbar booleans
and `dir`) are offered as completions.

## Documentation

Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
