# Themvora — Vanilla JS (Vite)

The imperative runtime with no framework, built by Vite so the plugin can inject
the pre-paint assets.

```bash
pnpm --filter @themvora/app-vanilla-js dev      # http://localhost:5196
pnpm --filter @themvora/app-vanilla-js build
```

## What to look at

| File | Why it matters |
| --- | --- |
| `theme.config.ts` | The catalog, the fallback theme and the initial mode — declared once. |
| `vite.config.ts` | One plugin call. It injects the theme stylesheet, the configuration, the blocking script and the scrollbar pre-paint. |
| `index.html` | No pre-paint tags at all: the plugin adds them at build time. |
| `src/main.ts` | `new Themvora()` with no configuration, plus the controls. |
| `src/styles.css` | Reads `--theme-*` variables. No light/dark block, no per-family rule. |

## Why the runtime takes no configuration

`themvoraVitePlugin()` reads `theme.config.ts` and injects three things into the
document before any application code runs:

1. a render-blocking `<style>` carrying every declared theme's variables;
2. `window.__THEMVORA_CONFIG__`, the serializable projection of the config;
3. a classic blocking script that restores the saved selection.

`new Themvora()` reads that global, so it registers the same catalog, the same
fallback theme and the same storage key the first frame used. There is no second
copy of `defaultTheme` or `initialMode` anywhere in the application.

## The scrollbar

`themvoraVitePlugin({ scrollbar: true })` hides the native scrollbar in the same
pre-paint pass, and `createOverlayScrollbar(kit.runtime.store)` draws the
replacement. The pair matters: with only the overlay, the browser paints the
platform bar first and swaps it a moment later; with only the option, the page
has no scrollbar at all. `destroy()` on the handle releases the hiding claim, so
the native bar comes back.

## The one ordering rule

`themeChange`, `modeChange` and `familyChange` fire **after** the new theme is on
the document. That matters because the runtime commits a change inside a View
Transition, whose update callback runs in a later task than the store update: a
handler that rendered during the store notification would paint a label or a
scoped region one frame ahead of the page. Rapid toggles turn that into visible
flicker, which is why the events are published from the commit instead.

Two consequences worth knowing:

- `kit.theme`, `kit.mode` and `kit.family` are always consistent with
  `data-theme` when a handler runs.
- `createScopedThemeBinding().update()` is called from the handler, so the
  scoped subtree changes in the same frame as the page.

## Related

The framework-free version of the same application, with no bundler at all, is
[`../vanilla`](../vanilla).
