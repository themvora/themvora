# @themvora/web

Framework-free theming for any HTML page, through custom elements and CSS
variables.

## Install

```bash
npm install @themvora/core @themvora/web
```

`@themvora/web` builds on `@themvora/core`, so it is installed explicitly rather
than relied on transitively.

## Load it once

```ts
// src/main.ts
import "@themvora/web";
```

That single import registers `<themvora-provider>`, `<themvora-scope>`,
`<themvora-toggle>`, `<themvora-select>`, `<themvora-scrollbar>` and
`<themvora-inspector>`, and injects their stylesheet once. There is no
`defineCustomElements()` call to remember, no CSS file to import and no icon
package to add.

It is safe to import during a server render (Next.js, Remix, Nuxt, Astro,
SvelteKit): registration is skipped when `customElements` is unavailable.

## Write HTML

```html
<themvora-provider
  themes="light dark plum-light plum-dark"
  default-theme="light"
  initial-mode="system"
>
  <themvora-toggle></themvora-toggle>
  <themvora-select type="family"></themvora-select>

  <themvora-scope theme="plum-dark">
    <section class="card">
      <h2>Scoped to plum-dark</h2>
      <p>Variables inherit from the scope.</p>
    </section>
  </themvora-scope>
</themvora-provider>
```

Nothing is re-rendered on a switch: the variables change and the styles follow.
The document itself is themed too — it takes the active theme's `background`
and `foreground`, and the scoped card reads the same tokens:

```css
html,
body {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.card {
  background: var(--theme-color-card);
  color: var(--theme-color-cardForeground);
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg, 12px);
  padding: 1.5rem;
}
```

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
<script src="https://cdn.jsdelivr.net/npm/@themvora/web@1.4.0/dist/cdn.js"></script>

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
