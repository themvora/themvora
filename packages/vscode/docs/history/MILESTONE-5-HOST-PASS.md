# Milestone 5 — host pass

> **Date:** 2026-10-20. **Outcome:** two defects found and fixed; everything else rendered as
> specified.

## Why a separate pass

The extension-host smoke test proves a `Theme Preview` tab opens and the command executes. It
cannot prove the preview *renders*: a webview's DOM lives in another process and no extension API
reaches it. Those are different claims and this document keeps them apart.

## Method

`scripts/render-preview.mjs` (dev-only; `scripts/**` is excluded from the .vsix):

1. Loads the **built** `dist/index.js` with a stub `vscode` module, so the code being rendered is the
   code that ships — not a copy.
2. Calls the exported `previewHtml()` for the exact HTML the panel assigns to `webview.html`, and
   `buildPreviewModel()` for real models from a generated pair.
3. Wraps that HTML with a stub `acquireVsCodeApi` and a driver that dispatches real `message` events,
   so the panel's own inline script applies the model exactly as it would in the panel.
4. Screenshots each scenario in headless Chromium.

Chromium is the engine VS Code's webviews use (Electron), so this is a close proxy. It is **not** the
VS Code webview: `--vscode-*` CSS variables are absent (the stylesheet falls back to `system-ui`), and
the editor chrome is not around the content.

```bash
node scripts/render-preview.mjs --out <dir>   # writes light.png, dark.png, stale.png
```

## What was checked, and what it showed

| Scenario | Result |
| --- | --- |
| Light pair, light mode | Header, page/card/popover/form sections, all four button kinds, badges, and the 21-role table all render with the theme's own values. Mode controls show Light pressed. |
| Dark pair, dark mode | Same structure on the dark tokens; Dark pressed, Light available. |
| Stale: valid render, then a broken edit | The previous theme stays on screen with a banner above it. |

## Defects found

### 1. `input` was used as a field background

Core groups `input` with `border` and `ring` under **"Structural and focus affordances"**
(`packages/core/src/model/semantic-roles.ts`), so it is a border colour. The stylesheet used it as
`background`, which painted a mid-grey field (`#86878c` in light, `#696a6e` in dark) and misreported
what the role means — the exact failure the milestone's "use the actual token for the intended slot"
rule exists to prevent.

**Fixed** in `adapters/previewPanel.ts`: the field's surface is now `--theme-color-background` and its
border is `--theme-color-input`.

**Regression test:** `previewPanel.test.ts` › *puts each token in the slot core defines it for* —
extracts the emitted `input { … }` rule and asserts which variable lands in which slot.

### 2. The stale banner did not say the render was stale

With a full theme still on screen, the banner read only `… is not valid JSON.`, which invites reading
the render below as the current state. The banner now reads
`Showing the last valid preview — … is not valid JSON.` when `stale` is true, and is unchanged when
nothing valid was ever shown.

**Fixed** in `adapters/previewPanel.ts` (the `applyError` path of the webview script).

**Regression tests:** *says the render is stale, not only that the file is broken* and *does not claim
staleness when nothing valid was ever shown*.

Both fixes are presentation-layer only. The model, the protocol, the CSP and the command flow are
unchanged.

## What this pass still does not prove

- **Keyboard activation in a real window.** The controls are real `<button>` elements with
  `aria-pressed`, reachable in tab order, and a click posts `setMode` — but Tab and Enter were not
  pressed in VS Code. That needs a human at a keyboard.
- **VS Code's own chrome around the webview.** Fonts, zoom and the editor's dark/light frame are not
  reproduced here.
- **Scroll and resize behaviour** inside a panel narrower than 900 px.

## Results after the fixes

| Gate | Result |
| --- | --- |
| Unit tests | **262 passed / 23 files** (3 new regression tests) |
| Typecheck | clean |
| Bundle | `vscode` the only external import, `child_process` **0** |
| Extension host — dev / packaged | **11/11** both |
| `audit-packages` | 615 checks, 0 failures |
| `export-inventory` | 24 packages in sync |
| `audit-dependencies` | `themvora-vscode` PASS; 6 pre-existing CLI violations unchanged |
