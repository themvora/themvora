# Themvora + Vanilla JavaScript

The imperative runtime with no framework, no Tailwind, and **no
`@themvora/app-shared`**: this app is standalone by design, so it declares its
own palette, markup and styles instead of borrowing the suite's fixtures.

```bash
pnpm --filter @themvora/app-vanilla-js dev        # http://localhost:5196
pnpm --filter @themvora/app-vanilla-js build
pnpm --filter @themvora/app-vanilla-js typecheck
```

## What it demonstrates

Everything visible is in `index.html`. `src/main.ts` only wires controls to the
runtime and keeps the readouts in step — there is no DOM template in the script.

| Section | API under test |
| --- | --- |
| Top bar | `kit.setFamily()`, `kit.setMode()`, `kit.toggleTheme()` |
| Readouts | The DOM binding's `data-theme`, `data-theme-mode`, `data-theme-family`, `data-theme-selection-mode` |
| Tokens | Plain CSS reading `--theme-color-*` — no per-theme rules |
| Scoped region | `createScopedThemeBinding()` — follows the page until pinned |
| Scrollbar | `createOverlayScrollbar()` bound to `kit.runtime.store` |

`theme.config.ts` holds the catalog: a neutral pair, the app's own `custard`
brand pair, and two preset families from `getPresetThemes()`.

Unlike [`web/`](../web), this app deliberately avoids the custom elements — it
demonstrates the imperative runtime the elements are built on.

## Notes

- **The catalog is declared once.** `themvoraVitePlugin()` discovers
  `theme.config.ts`, embeds it in the blocking pre-paint script, and transports
  it to the page — so `new Themvora()` takes no theme data of its own. The
  runtime and the first painted frame cannot disagree about the catalog.
- **The stylesheet is a `<link>` in `index.html`, not an import in `main.ts`.**
  A CSS import is injected by the module graph, so in dev the first paint has no
  rules at all. A `<link>` is fetched before first paint and extracted to a
  hashed asset by the build.
- **The readouts and selects are filled by a blocking script next to their
  markup.** The pre-paint script in `<head>` already wrote the attributes, so the
  first frame shows values rather than "—", and the controls start on the real
  selection instead of the first `<option>`. The script sits immediately after
  the markup it fills: the page can paint mid-parse, so a script at the end of
  `<body>` is too late.
- **The toggle ships all three icons and CSS picks one** from
  `data-theme-selection-mode`. No JavaScript runs before the first frame, so the
  button never shows the wrong state.
- **`themvoraVitePlugin({ scrollbar: true })` hides the native scrollbar before
  first paint.** `createOverlayScrollbar()` only runs once the module does;
  without the pre-paint class the browser would paint a native bar first.
- **The scoped region follows the page until you pin it**, so it never starts on
  a different theme and then swaps — the only change is the one you asked for.
