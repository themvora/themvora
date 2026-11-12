# Web Components First Paint — Implementation Report

Date: 2026-11-05
Scope: `@themvora/core`, `@themvora/web`, `examples/apps/web`, Web Components
guide and compatibility matrix.

## A. Root cause

The Web Components runtime had exactly one pre-paint mechanism: an inline
blocking **script** that wrote `--theme-*` variables and `data-theme*`
attributes onto `<html>`. That script only existed when the app used
`themvoraVitePlugin()` (or manually inlined `createThemeBootstrapScript()`).

Two consequences explained the reported flash:

1. **No render-blocking CSS existed.** The document's only copy of the theme
   variables was applied by JavaScript. With JavaScript disabled, blocked, or
   slower than the first paint, `html, body { background: var(--theme-color-background) }`
   resolved to nothing and the page painted unthemed. The quick start also led
   with `import "@themvora/web"`, not with the plugin, so a reader following the
   simplest path had no blocking script at all.
2. **The provider upgrades with a deferred module.** `import "@themvora/web"`
   registers the custom elements after parsing. Ordinary text inside
   `<themvora-provider>` is light DOM and is painted immediately; the provider's
   runtime (and its inline variables) arrives later. Custom-element content
   appears only after upgrade, which hid the timing problem: the controls
   looked correct once they existed, while the document around them had already
   been painted without a theme.

The old plugin's inline script did fix the JS-enabled saved-selection case. It
did not provide a CSS fallback, did not validate the provider's declared
configuration, and did not report a runtime that started after a paint.

## B. Final architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Generated CSS | `packages/core/src/prepaint.ts` (`createThemePrePaintCss`) | Emits `:root` fallback, `@media (prefers-color-scheme: dark)` for `system`, and one `:root[data-theme="…"]` rule per declared theme. |
| Static boot asset | `packages/web/src/boot.ts` → `dist/boot.js` | Classic, synchronous `boot.js` for non-Vite pages. Reads `window.__THEMVORA_CONFIG__` or a JSON config block, builds the canonical plan and applies it. |
| Vite plugin | `packages/core/src/vite-plugin.ts`, re-exported by `packages/web/src/vite.ts` | Discovers `theme.config.ts`, validates the provider in `index.html`, injects CSS → config → boot script in that order, in dev and build. |
| Runtime | `packages/core/src/runtime.ts` | Adopts `data-theme-ready` state, then reports `TV_PREPAINT_MISSING` / `TV_PREPAINT_MISMATCH` once through the existing diagnostic pipeline. |
| Manual path | `createThemePrePaintCss()` + `createThemeBootstrapScript()` (or `boot.js`) | Same core plan and same DOM contract as the plugin; remains fully supported. |

The plugin uses the same `buildBootstrapPlan` for the CSS, the boot script and
the runtime's fallback resolution. `applyThemeBootstrap()` and the generated
inline script are asserted byte-for-byte equivalent at the DOM level in
`packages/core/test/prepaint.test.ts`.

## C. Configuration source (one source of truth)

`theme.config.ts` is the only declaration. The plugin:

1. loads it (or accepts `config` / the deprecated inline options);
2. serializes the same object into `window.__THEMVORA_CONFIG__` with
   `toBootstrapConfig()`;
3. derives CSS and the boot script from it;
4. parses `<themvora-provider>` in `index.html` and fails the build when its
   `themes`, `default-theme` or `initial-mode` resolve differently.

The provider takes no theme attributes with the plugin; it reads
`window.__THEMVORA_CONFIG__` through `resolveRuntimeOptions()`. A provider
naming a family and a config naming that family's light variant are considered
equivalent because both are normalized through `resolveInitialTheme()`.

## D. Vite integration

`examples/apps/web/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { themvoraVitePlugin } from "@themvora/web/vite";

export default defineConfig({
  plugins: [themvoraVitePlugin()],
});
```

`examples/apps/web/index.html` has ordinary HTML, a `<link>` to the app
stylesheet, an attribute-free `<themvora-provider>`, and:

```html
<script type="module" src="/src/main.ts"></script>
```

There is no manual bootstrap script, no `predev`, and no `prebuild`.

The plugin injects, in this order (verified in the built HTML):

```html
<style id="themvora-pre-paint-css" data-themvora="pre-paint">…</style>
<script id="themvora-config">window.__THEMVORA_CONFIG__ = …;</script>
<script id="themvora-bootstrap">…</script>
```

The stylesheet is inline rather than an emitted asset because it must be
identical in Vite development and production, needs no base-path rewrite, and
is render-blocking by definition. It is proportional to the declared catalog.

## E. Manual setup

Non-Vite pages generate both artifacts from one config:

```js
import {
  createThemeBootstrapScript,
  createThemePrePaintCss,
} from "@themvora/core";

const config = { themes, defaultTheme: "light", initialMode: "system" };
writeFileSync("public/theme-pre-paint.css", createThemePrePaintCss(config));
writeFileSync("public/theme-bootstrap.js", createThemeBootstrapScript(config));
```

```html
<link rel="stylesheet" href="/theme-pre-paint.css" />
<script src="/theme-bootstrap.js"></script>
```

The static `@themvora/web/boot.js` asset is the alternative: load it
synchronously in `<head>`, with the same config supplied as
`window.__THEMVORA_CONFIG__` or a `<script type="application/json"
id="themvora-config">` block. It is idempotent and uses `buildBootstrapPlan` +
`applyThemeBootstrap`, the same pair the plugin uses.

`createThemeBootstrapScript()` is unchanged and remains tested.

## F. First-paint evidence

Command: `node scripts/web/first-paint-check.mjs`
(Playwright Chromium; records the computed state at the first animation frame
after the body exists, then compares it with the final state after load.)

Last captured run (` .badges/web-first-paint/last-run.txt`):

| Scenario | Mode | First theme | First computed state | first-paint / FCP | Final = first |
| --- | --- | --- | --- | --- | --- |
| production system-light | light | `harbor-light` | 55.3 ms | 172 / 172 ms | yes |
| production system-dark | dark | `harbor-dark` | 15.3 ms | 48 / 48 ms | yes |
| production saved plum dark | saved dark | `plum-dark` | 14.8 ms | 40 / 40 ms | yes |
| production click → reload | saved light | `plum-light` | recorded | — | yes |
| dev system-light | light | `harbor-light` | 42.2 ms | 72 / 72 ms | yes |
| dev system-dark | dark | `harbor-dark` | 32.8 ms | 60 / 60 ms | yes |
| dev saved plum dark | saved dark | `plum-dark` | 27.1 ms | 60 / 60 ms | yes |
| manual system-dark | dark | `dark` | 27.9 ms | 44 / 44 ms | yes |
| manual saved plum dark | saved dark | `plum-dark` | 25.7 ms | 36 / 36 ms | yes |

No-JavaScript checks use CDP `CSS.getComputedStyleForNode` (JavaScript is
disabled, so the DOM cannot be queried from the page):

| Scenario | Background | Text |
| --- | --- | --- |
| production, OS dark | `rgb(17, 24, 20)` | `rgb(232, 241, 236)` |
| dev, OS dark | `rgb(17, 24, 20)` | `rgb(232, 241, 236)` |
| manual, OS dark | `rgb(9, 9, 10)` | `rgb(238, 238, 240)` |

Screenshots are in `.badges/web-first-paint/` (`system-light.png`,
`system-dark.png`, `saved-plum-dark.png`, `no-js-dark.png`, manual variants).

## G. Diagnostics

| Code | Level | Trigger |
| --- | --- | --- |
| `TV_PREPAINT_MISSING` | warning | `data-theme-ready` is absent, a browser paint entry exists, and no blocking setup is present. Message: “Theme applied after first paint. Use themvoraVitePlugin() or the manual bootstrap setup to prevent a flash.” |
| `TV_PREPAINT_MISMATCH` | warning | `data-theme-ready` is present but the painted theme is not in the runtime registry, or the adopted theme differs from the resolved theme. |

Both are deduplicated process-wide by `emitDiagnostic()`. They are not emitted
before a real paint (`performance.getEntriesByType("paint")` is empty), which
also keeps them out of jsdom tests. Intentional `themeOverride` changes are
excluded from the mismatch check. The no-pre-paint browser fixture reports
`TV_PREPAINT_MISSING` exactly once.

## H. Tests

| Command | Result |
| --- | --- |
| `npx vitest run` in `packages/core` | **1235 passed**, 103 files |
| `npx vitest run` in `packages/web` | **109 passed**, 17 files |
| `npx tsc -p tsconfig.json --noEmit` in both packages | passed |
| `npm run typecheck` in `examples/apps/web` | passed |
| `npm run build` in `examples/apps/web` | passed (`dist/index.html` 58.52 kB, gzip 9.11 kB) |
| `npx tsc --noEmit` in `apps/docs` | passed |
| `node apps/docs/scripts/check-quickstart-snippets.mjs` | 9 web + 4 vanilla snippets OK |
| `node scripts/web/first-paint-check.mjs` | all scenarios passed (dev, build, manual, no-JS, reload, diagnostic) |
| `node scripts/web/browser-check.mjs` | all 5 existing CDN/lifecycle scenarios passed |

New tests:

- `packages/core/test/prepaint.test.ts` — CSS layers, per-theme rules,
  `</style>` transport escaping, persisted/system storage, blocked storage,
  idempotence, and DOM equality with `createThemeBootstrapScript()`.
- `packages/core/test/vite-plugin-prepaint.test.ts` — injection order, provider
  validation errors/warnings, family/variant equivalence, provider JSON
  definitions, `css`/`boot` toggles.
- `packages/core/test/prepaint-diagnostics.test.ts` — missing/mismatch
  diagnostics, paint-entry gating, one-shot deduplication.
- `packages/web/test/boot.test.ts` — global config, JSON config block, no
  config, and idempotence.

## I. Packaging

- `@themvora/web` exports: `.`, `./vite`, `./boot.js`.
- `npm pack --dry-run` includes `dist/boot.js`, `dist/vite.js`,
  `dist/vite.cjs`, their declarations and maps (47 files; 219,979 bytes
  packed).
- `dist/boot.js` has no bare `@themvora/*` imports (IIFE, core inlined).
- Existing `dist/cdn.js`, `html-data.json` and the manual bootstrap API are
  unchanged.

## J. Documentation

- `apps/docs/lib/frameworks.tsx` — Web Components guide now starts with
  `vite.config.ts` + `theme.config.ts`, then the attribute-free provider; the
  manual path generates CSS + script.
- `apps/docs/lib/framework-examples/web.ts` — Vite integration entry uses
  `@themvora/web/vite` and documents the three injected resources.
- `apps/docs/lib/compatibility-data.ts` — Web Components zero-flash moves from
  `Manual` to `Auto`, with the non-Vite and runtime-only caveats.
- `apps/docs/app/reference/diagnostics/page.tsx` — `TV_PREPAINT_MISSING`,
  `TV_PREPAINT_MISMATCH`.
- `apps/docs/app/vite-plugin/page.tsx` — CSS + validation described; option
  table gains `css` and `boot`.
- `apps/docs/app/zero-flash/page.tsx` — Web Components example shows automatic
  injection; mode wiring is one source.
- `apps/docs/content/framework-guides.md` regenerated from the guide source.
- `packages/web/README.md` — Vite path, manual CSS + boot, runtime-only theme
  limitation.

## K. Files and working-tree integrity

Added:

- `packages/core/src/prepaint.ts`
- `packages/core/test/prepaint.test.ts`
- `packages/core/test/prepaint-diagnostics.test.ts`
- `packages/core/test/vite-plugin-prepaint.test.ts`
- `packages/web/src/boot.ts`
- `packages/web/src/vite.ts`
- `packages/web/test/boot.test.ts`
- `scripts/web/first-paint-check.mjs`
- `.changeset/web-pre-paint-css.md`
- `.badges/web-first-paint/*` (screenshots + last-run log)

Replaced (explicitly requested): `examples/apps/web/` — the old lab and its
`public/themvora-web.js`, `scripts/consumer-check.mjs`, `src/log.ts` and
`src/themes.ts` are gone; the new app is a first-paint reference.

Modified: `packages/core/src/{diagnostics,index,runtime,vite-plugin}.ts`,
`packages/core/test/sync-first-root.test.ts`,
`packages/web/{README.md,package.json,tsup.config.ts}`, the Web Components
docs listed in J, and the docs generation/check scripts that read them.

No package version, peer range or unrelated framework package was changed. No
file was staged, committed, tagged, pushed or published. The working tree
already contained many unrelated modifications before this task; they were read
around, not reverted or staged. `examples/apps/web` had no local modifications
before it was replaced.

## Follow-up: first-frame controls and readouts

The first-paint document theme was correct, but the example app still settled
visibly: `import "@themvora/web"` is a deferred module, so the toggle, selects
and `<themvora-scope>` upgraded after the body was parsed, and `main.ts` filled
the `—` readouts after the module ran.

Fixed in the example by:

- loading `@themvora/web/dist/cdn.js` as a **classic** `<script>` in `<head>`
  (`vite.config.ts` copies it to `public/themvora-web.js` on every dev start and
  build), so registration and the component stylesheet happen during parsing;
- using the classic bundle's `window.ThemvoraWeb` API instead of a second
  side-effect import, so core is loaded once;
- switching the readouts to `data-tv-readout` — the blocking head script's
  `MutationObserver` fills each one in the task it is parsed;
- adding `data-tv-readout="effective-mode"` to core's readout contract, so
  "Applied mode" (`light`/`dark`) and "Selection" (`light`/`dark`/`system`) can
  both be correct before paint.

The browser verifier now records one DOM snapshot per animation frame and
selects the frame just before `first-paint`. It asserts, at that frame, the
readout texts, both select values, toggle `data-mode`/`aria-pressed`, and the
scoped region's dark background — in dev and production. All scenarios pass.

## Final guarantees

- Vite + verified plugin: automatic pre-paint CSS and blocking boot script;
  plain HTML never paints unthemed, system light/dark is correct, and a saved
  non-default selection is restored before the body is parsed.
- Non-Vite without a bootstrap: CSS fallback only (default + system pair).
- Manual bootstrap: pre-paint behavior when correctly installed.
- Runtime-only themes: applied after registration; not in the generated CSS;
  a stale or unavailable painted theme is reported as `TV_PREPAINT_MISMATCH`.
- No page-hiding safety net was added. The page is readable at all times.
