# Themvora + Web Components

An HTML-first theme lab built on `@themvora/web` and `@themvora/core` — no
framework, **no `@themvora/app-shared`**, and its own palette instead of the
suite's fixtures. Vite is the only build step: `themvoraVitePlugin()` injects the
pre-paint script, and nothing else is generated.

```bash
pnpm --filter @themvora/app-web dev        # http://localhost:5195
pnpm --filter @themvora/app-web build
pnpm --filter @themvora/app-web typecheck
```

## What it demonstrates

The page is configured by **attributes**, not by an API call. `src/main.ts` only
reads the runtime the provider already created.

| Section | API under test |
| --- | --- |
| Top bar | `<themvora-toggle>`, `<themvora-select type="mode">`, `<themvora-select type="family">` |
| State panel | The DOM binding's `data-theme`, `data-theme-mode`, `data-theme-family`, `data-theme-selection-mode` |
| Scope gallery | `<themvora-scope>` with an exact name, a family, and a name that is not registered yet |
| Live configuration | `runtime.configure({ defaultTheme / themes / initialMode / initialFamily })`, `runtime.use(pack)`, `runtime.restore(snapshot)`, `runtime.selection.setMode/setFamily` |
| Event log | `theme-ready`, `themes-change`, `runtime.store.subscribe`, `runtime.selection.subscribe`, `runtime.registry.subscribe`, and the `TV_*` diagnostics |
| Footer chrome | `<themvora-inspector>`, `<themvora-scrollbar>` |

### The three scope cards are the point

- **`theme="citrus-dark"`** — an exact name pins both halves of the selection, so
  the card stays dark while the page switches to light.
- **`theme="cocoa"`** — a family follows the provider's mode.
- **`theme="solar"`** — `solar` is not in the initial catalog. Until the lab
  installs the pack, the card falls back to the catalog's first theme and the
  fallback is reported (`TV_CONFIG_OPTION_INVALID`). Press **Install the Solar
  pack** and it resolves to `solar-light`/`solar-dark` without a reload; press
  **Remove it again** and it falls back once more.

That last card is the regression this app exists to catch: a scope used to keep
rendering a theme the catalog no longer had, because a catalog change that
preserves the active theme emits no store change. Scopes follow
`runtime.registry.subscribe` for exactly that reason.

### Precedence, made visible

`defaultTheme` supplies the fallback theme's family **and** mode;
`initialFamily` / `initialMode` override the corresponding half. So
`defaultTheme="solar-dark"` with `initialMode="light"` resolves to
`solar-light`. The **Force dark mode** and **Switch to the Plum family** buttons
move the selection directly, the way the built-in controls do.

### Diagnostics are warnings, not crashes

**Send an invalid mode**, **Send an unknown family** and **Write an empty
`themes` attribute** each report a `TV_*` diagnostic. The runtime keeps the
previous setting and carries on; the log shows the code and the headline, and the
browser console keeps the full message with its docs link.

## Notes

- **The elements are registered by a blocking `<script>` in `<head>`, not by the
  app module.** `type="module"` is deferred by spec, so `import "@themvora/web"`
  runs after the first paint — the page appeared with the topbar controls
  missing and they popped in ~100 ms later. `index.html` loads the package's
  standalone build (`dist/cdn.js`, copied to `public/themvora-web.js` by
  `vite.config.ts`) as a classic script: the elements are defined and their
  stylesheet injected while the parser is still in `<head>`, so the controls are
  part of the first frame. `main.ts` reads `window.ThemvoraWeb` instead of
  importing the package again — one copy of the library.
- **The boot events are buffered in the same blocking pass.** Because the
  elements upgrade before any module runs, `src/log.ts` would miss
  `theme-ready` and the first diagnostic. A bridge in `<head>` queues them,
  forwards to the real console, and hands over to `log.ts` when it loads.
- **The readouts are filled by blocking scripts next to their markup.** They
  would otherwise show "—" for the frames between the parse and `main.ts`. Each
  script sits immediately after the elements it fills, because the page can
  paint mid-parse — a script at the end of `<body>` is too late.
- **The readouts sample the DOM on the next frame for later changes.** The
  provider commits its attributes inside a View Transition, so a subscription
  callback still sees the previous `data-theme`; `scheduleRender()` waits for
  the commit and coalesces a burst of changes into one render.
- **The runtime is exposed as `window.themeLab.runtime`** for console
  exploration (`themeLab.runtime.themes`, `.selection.getSelection()`,
  `.use(pack)`). The page itself never reads it.
- **Styling is plain CSS on the theme tokens** (`--theme-color-*`,
  `--theme-radius-*`, `--theme-shadow-*`). There is no `:root` fallback block:
  `themvoraVitePlugin()` in `vite.config.ts` injects the blocking pre-paint
  script from `theme.config.ts`, so the first painted frame already carries the
  resolved theme's variables. A fallback would be a second source of truth and
  would paint the wrong frame.
- **The stylesheet is a `<link>` in `index.html`, not an import in `main.ts`.**
  Both halves are required: the variables come from the pre-paint script, the
  rules come from the link. A CSS *import* is injected by the module graph, so
  in dev the first paint has no rules at all — raw HTML and blue links, then the
  themed page. A `<link>` in `<head>` is fetched before first paint in dev and
  extracted to a hashed asset by the build.
- **`themvoraVitePlugin({ scrollbar: true })` hides the native scrollbar before
  first paint.** `<themvora-scrollbar>` only adds `tv-scrollbar` to `<html>`
  when the element upgrades, which is after the first frame — so without the
  option the browser paints a native bar and swaps it for the overlay. The
  option makes the plugin inject that class in `<head>`; `scrollbar.css` then
  styles the overlay. Both halves, same as the theme.
- `src/themes.ts` defines the `solar` pack with `defineTheme`; it is deliberately
  absent from the initial catalog so the lab can install it at runtime.

## Verifying the documented setup

`scripts/consumer-check.mjs` is a real consumer test of the docs, not of this
app. It scaffolds a fresh Vite project with `npm create vite@latest`, installs
`@themvora/core` and `@themvora/web` **from the packed tarballs** (`npm publish`
artifacts, not workspace links), then writes the snippet files from
`apps/docs/lib/frameworks.tsx` exactly as the guide presents them — step by step,
rebuilding and reloading a real browser between stages.

```bash
node scripts/release/pack-verify.mjs          # fresh tarballs first
pnpm --filter @themvora/app-web verify:consumer
```

It asserts the properties a reader depends on: the stylesheet is render-blocking
in both the build and `vite dev`, the elements register from the bare import,
the theme and its variables reach the DOM, `#theme-name` is rendered, the toggle
and both selects work, the configured catalog resolves, a pinned scope survives
a mode change, and the pre-paint script themes the page with the module bundle
blocked. Add `--keep` to inspect the scaffolded project.

It reads the snippets from the docs rather than copying them here: a copy would
pass while the docs were wrong, which is the one failure this script exists to
catch.
