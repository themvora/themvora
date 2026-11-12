# Themvora — Vanilla example

A framework-free application: plain HTML, CSS and JavaScript on a static file
server. No Vite, no bundler, no framework, no build step.

```bash
pnpm --filter @themvora/app-vanilla dev     # http://127.0.0.1:5205
```

`dev` runs `node server.mjs`, a ~60-line static server with no dependencies. Any
static server works — it just has to serve the project root, so that
`/node_modules/@themvora/core/dist/*` is reachable (see *Production* below).

## What to look at

| File | Why it matters |
| --- | --- |
| `index.html` | The whole integration: four tags in `<head>`, one script at the end of `<body>`. |
| `src/app.js` | The only application script — it wires controls to `Themvora` and renders state. |
| `src/styles.css` | Reads `--theme-*` variables. There is no light/dark block and no per-family rule. |
| `server.mjs` | The development server. Not part of the integration. |

## The four head tags

```html
<link rel="stylesheet" href="/src/styles.css" />

<script type="application/json" id="themvora-config">
  { "defaultTheme": "light", "initialMode": "system" }
</script>

<script src="/node_modules/@themvora/core/dist/prepaint.js"></script>

<script type="importmap">
  {
    "imports": {
      "@themvora/core/vanilla": "/node_modules/@themvora/core/dist/vanilla.js"
    }
  }
</script>
```

1. The stylesheet is render-blocking, so the page never paints unstyled.
2. The JSON element is the **only** declaration of the theme configuration. The
   pre-paint script reads it, and it publishes the resolved configuration for the
   runtime, which is why `src/app.js` calls `new Themvora()` with no arguments.
3. `prepaint.js` is the package's pre-paint asset. It is a classic script in the
   head, so it is parser-blocking and runs before the body is parsed: it restores
   the saved mode and family and writes the theme's variables and root
   attributes onto `<html>`.
4. The import map is what lets a browser resolve the bare specifier
   `@themvora/core/vanilla`. Without it (or a bundler) the module cannot load.

## Optional keys in the element

The element carries the same serializable options `theme.config.ts` does in a
Vite app, so a runtime option declared here is honoured without a second
declaration in JavaScript:

```json
{
  "defaultTheme": "light",
  "initialMode": "system",
  "transition": { "enabled": false },
  "scrollbar": true
}
```

`transition` accepts `false`/`true` or the options object (`enabled`, `duration`,
`easing`, `useViewTransition`, `preset`, `properties`). `scrollbar: true` hides
the native scrollbar before the first paint, for a page that draws
`createOverlayScrollbar()`; it leaves coarse-pointer devices alone unless you
pass `{ "touch": true }`.

JSON has no comments, which is why these are documented here rather than shown
inline in `index.html`.

## Production

A deployed site does not serve `node_modules`. Copy the two package files into
your static output and point the same two tags at them:

```bash
cp node_modules/@themvora/core/dist/prepaint.js   public/
cp node_modules/@themvora/core/dist/vanilla.js    public/vendor/themvora-vanilla.js
```

```html
<script src="/prepaint.js"></script>
<script type="importmap">
  { "imports": { "@themvora/core/vanilla": "/vendor/themvora-vanilla.js" } }
</script>
```

`prepaint.js` is the same file for every application that uses the built-in
catalog — it carries the catalog itself — so it is served once and cached across
pages. Only the JSON element changes per app.

If your deployment sets a Content-Security-Policy, the configuration element
needs `script-src` to allow inline `<script type="application/json">` only when
you use a strict `script-src` without `'unsafe-inline'`: the element is data, not
code, but it is still a script element. An external `themvora.config.json` cannot
replace it, because the bootstrap must read the configuration synchronously
before the first paint.

## What is not here

No `theme.config.ts`, no plugin, no bundler, no framework runtime. The catalog is
the package's built-in set; a custom one is declared under `themes` in the JSON
element, using the same `defineTheme` objects `new Themvora({ themes })` takes.
