# `@themvora/app-web` — first-paint reference

A minimal Vite vanilla TypeScript application that proves the Web Components
zero-flash contract:

- plain HTML text, headings, paragraphs and buttons live outside custom
  elements;
- `theme.config.ts` is the only theme configuration;
- `themvoraVitePlugin()` injects the render-blocking CSS, the transported
  configuration and the classic boot script;
- the standalone `dist/cdn.js` is loaded as a **classic** script in `<head>`, so
  the toggle, selects and scoped region upgrade during parsing and are in the
  first painted frame;
- readouts use the plugin's `data-tv-readout` pre-paint contract, so their text
  is filled before paint rather than by `main.ts`;
- `index.html` contains no manual bootstrap script, no `predev` and no
  `prebuild`.

```bash
pnpm --filter @themvora/app-web dev      # http://localhost:5195
pnpm --filter @themvora/app-web build
pnpm --filter @themvora/app-web preview
```

## What to look for

1. Load the page with the OS in light mode: the first frame uses
   `harbor-light` with readable text.
2. Switch the OS to dark and reload: the first frame uses `harbor-dark`.
3. Choose the Plum family, then reload: the blocking script restores
   `plum-*` before the body is parsed.
4. Disable JavaScript: the generated CSS still provides the default light
   palette and the `prefers-color-scheme` dark pair. A saved non-default theme
   cannot be restored without JavaScript; that is the documented limitation.

The provider is attribute-free on purpose. Declaring `default-theme`,
`initial-mode` or `themes` in `index.html` would be a second configuration, and
the plugin fails the build when the two resolve differently.

## Why a classic script for the elements?

`import "@themvora/web"` is an ES module, and modules are deferred by
specification. The document's theme is still painted first by the generated CSS
and boot script, but the custom elements would only upgrade after the body was
parsed — the toggle/selects would pop in and the scoped region would repaint
from the page theme to `plum-dark`.

`vite.config.ts` therefore copies `@themvora/web/dist/cdn.js` to
`public/themvora-elements.js` on every dev start and build. `index.html` loads
it with a plain classic `<script src>` in `<head>`, so registration and the
component stylesheet happen while the parser is still in the head.
`src/main.ts` uses the API the bundle exposes on `window.ThemvoraWeb`; it does
not side-effect import the module as well, which would load a second copy of
core.

The readouts use `data-tv-readout` rather than a custom attribute. The plugin's
blocking head script installs a `MutationObserver` and fills each readout in the
same task it is parsed — before the first paint — and `main.ts` only keeps them
in step with later changes. `effective-mode` shows the applied light/dark;
`mode` shows the visitor's selection (which may be `system`).
