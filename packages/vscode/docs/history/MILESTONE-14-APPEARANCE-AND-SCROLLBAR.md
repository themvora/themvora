# Milestone 14 — Independent Studio appearance, native theme picker, native scrollbars

**Status: implemented and verified.** Focused UX changes to the existing extension, with no new
dependencies, no theme-generation change, no source-analysis change, and no release.

| Change | Surface |
| --- | --- |
| Studio appearance switcher (`auto` / `light` / `dark`) | Studio topbar |
| **Change VS Code color theme…** action | Studio topbar |
| Official overlay scrollbar — integrated, then removed in favour of VS Code's own | Studio scroll surfaces |
| Single-stroke focus ring on form controls | preview surface, both hosts |
| Inter/JetBrains Mono parity between the two preview hosts | Theme Preview panel |
| Files list groups variants into one family row | Workspace sidebar |

---

## 1. The platform boundary

VS Code's colour theme controls the **workbench** — every editor tab, the panel, the status bar,
the tree. It is not scoped to an extension's tab, and no extension can paint one webview with a
theme that differs from the workbench by changing `workbench.colorTheme`; that setting is global
to the window.

So the two features are deliberately separate:

| Question | Answer |
| --- | --- |
| Can Themvora make *its own* interface light while VS Code stays dark? | Yes. The Studio owns its DOM and its stylesheet. This is `studioAppearance`. |
| Can Themvora change the workbench theme for one tab? | No. The supported action is opening VS Code's own picker: `workbench.action.selectTheme`. |
| Does the appearance control write `workbench.colorTheme`? | Never. It writes one key in the extension's global state. |

The user-facing wording follows that boundary: the segmented control is labelled **Studio
appearance**, and the palette button is **Change VS Code color theme…** with the tooltip "opens
the native VS Code picker". Neither claims to do the other's job.

---

## 2. Audit before implementation

### 2.1 Which colours belong to which layer

| Layer | Source | Where it appears |
| --- | --- | --- |
| Studio chrome | `src/shared/designTokens.ts` semantic variables (`--bg-0`, `--surface-1`, `--border`, `--text`, `--ring`, …), mapped from `--vscode-*` in Auto | topbar, rail, library, toolbar, inspector, status bar |
| Application-theme preview | the selected theme's own tokens, resolved by the host | the canvas only |
| Preview controls | Studio chrome | mode chips, comparison, scenario, inspect |

The audit confirmed the shell already used VS Code variables throughout and that the preview was
the only place a theme's own colours appeared — which is exactly the split the appearance
preference needs. No component had to be restyled; only the variable values changed.

### 2.2 What already existed

- `body.vscode-light` / `vscode-dark` / `vscode-high-contrast` classes and the `--vscode-*`
  palette were already consumed, so **Auto needed no new code**.
- The Studio already had a *preview* mode selector (`Light` / `Dark` chips in the toolbar) for the
  theme under the canvas. That is a different axis and was left untouched.
- Webview state (`host.getState()` / `setState()`) was in use but not for anything persistent.

### 2.3 The persistence question

`getState()`/`setState()` survives the panel being hidden and shown again, and is discarded when
the webview is disposed — which is precisely what closing the Studio tab does. The requirement is
that the preference survives **closing and reopening**, so webview state alone is not sufficient.

---

## 3. Studio appearance

### 3.1 Modes

| Mode | Behaviour |
| --- | --- |
| **Auto** (default) | No `data-studio-appearance` override. The stylesheet's `--vscode-*` mappings apply, so the Studio follows the workbench and re-renders when the user changes the real theme. |
| **Light** | `html[data-studio-appearance="light"]` pins a light semantic palette. |
| **Dark** | `html[data-studio-appearance="dark"]` pins the dark palette (the same declarations as `:root`, so it wins under a light workbench). |

The control is a compact three-segment switch in the topbar — monitor / sun / moon — with
`aria-label` and `title` per segment, and it stays visible at the narrowest breakpoint (430 px).

### 3.2 CSS structure

All forced values live in `designTokens.ts`, not in components:

```css
html[data-studio-appearance="light"], html[data-studio-appearance="light"] body { … }
html[data-studio-appearance="dark"],  html[data-studio-appearance="dark"]  body { … }

/* high contrast wins over a forced mode */
body.vscode-high-contrast, body.vscode-high-contrast-light {
  --border: var(--vscode-contrastBorder) !important;
  --border-ctl: var(--vscode-contrastBorder) !important;
  --border-strong: var(--vscode-contrastBorder) !important;
  --accent-border: var(--vscode-contrastActiveBorder, var(--vscode-focusBorder)) !important;
}
```

Forced palettes cover background, panels, elevated surfaces, primary/secondary/muted text,
borders, inputs, hover/selected states, error/warning/success, focus ring and shadows. Brand
identity is unchanged: the mark, the CTA gradient and the accent are the same in every mode.

### 3.3 Independence from the preview

The appearance is one field in the UI reducer (`studioAppearance`) and nothing else reads it. It is
not derived from the previewed theme, and switching the preview between Light and Dark does not
touch it. The screenshots in §8 show a forced-dark Studio rendering a **light** application theme,
and a forced-light Studio rendering the same light theme — the two axes move independently.

### 3.4 Accessibility

- High contrast: `!important` border overrides above, so forcing Light or Dark cannot remove the
  contrast outlines that make focus and boundaries visible.
- Focus: `--ring` is defined in both forced palettes; no rule sets `outline: none`.
- Keyboard: the segments are real `<button>`s in a labelled group; Escape still closes the drawer,
  the save panel or the narrow overlay.
- Reduced motion: the appearance adds no transition and no animation.

---

## 4. Persistence

**Canonical behaviour: one key in the extension's global state, `themvora.studioAppearance`.**

| Option | Why not |
| --- | --- |
| Webview state | Lost when the panel is disposed — closing the tab would forget the choice. |
| Workspace state | The appearance is not a property of a folder; it would reset on every project switch. |
| VS Code settings | Explicitly out of scope: the extension must not write `workbench.colorTheme` or add settings for its own chrome. |
| **Global state** | Survives close/reopen, follows the developer between folders, and is invisible to the workbench. |

Flow:

1. **Activation** — `context.globalState.get(STUDIO_APPEARANCE_KEY)` is passed to the panel as a
   port (`read` / `write`).
2. **Document** — the panel writes the value into the HTML:
   `<html lang="en" data-studio-appearance="dark">`. The attribute is present before the bundle
   runs, so the first paint is already in the persisted mode instead of flashing the workbench
   default. This is the "apply before rendering where practical" requirement.
3. **Change** — the webview applies the attribute to its own `<html>` immediately (no round trip
   for feedback) and posts `{ type: "setStudioAppearance", appearance }`. The host validates it,
   then writes global state.
4. **Invalid values** — `parseStudioAppearance()` maps anything that is not `auto`/`light`/`dark`
   to `auto`. Persisted state outlives the code that wrote it, so a removed mode or a corrupted
   key must never leave the Studio unstyled.

The webview does not post on mount: if the attribute already matches the reducer's initial value,
there is nothing to persist, and the effect returns early.

---

## 5. Native VS Code theme picker

- One intent, `openColorThemePicker`, whose payload is empty by construction: the parser returns
  `{ type }` and drops any extra fields. The webview cannot name a command.
- The host runs exactly `workbench.action.selectTheme`. There is no command whitelist to widen and
  no string from the webview reaches `executeCommand`.
- Nothing is posted back on success. Opening a picker is not a theme change, and cancelling is a
  normal outcome; a "theme changed" toast would be a lie.
- If the command is unavailable, the host shows an error notice instead of rejecting silently —
  `handle()` is invoked detached from the message listener, so an unhandled rejection would only
  reach the console.

After a real theme change: Auto follows the new workbench colours (the `--vscode-*` mappings are
live); Light and Dark stay exactly as chosen; the canvas keeps rendering its selected Themvora
theme.

---

## 6. Official scrollbar — integrated, then removed

### 6.1 What was tried

The first pass mounted `createOverlayScrollbar` from `@themvora/core` on six Studio scroll
surfaces, with per-appearance thumb colours and `var(--vscode-scrollbarSlider-*)` in Auto. It
worked, and it was removed on request: the Studio should scroll exactly like the rest of VS Code,
not like a Themvora application. The record stays here because the reasoning is reusable.

| | |
| --- | --- |
| Import (removed) | `createOverlayScrollbar` from `@themvora/core` |
| Why not `ThemeScrollbar` | The React component requires `ThemeProvider` / `useThemeRuntime`; the Studio webview is extension chrome, not a Themvora app. The engine is the same code path the component wraps. |
| Surfaces (removed) | `.library-scroll`, `.canvas-scroll`, `.inspector-scroll`, `.drawer-body`, `.modal`, `.preview-lightbox-scroll` |

### 6.2 What ships now

The overlay engine is gone: `StudioScrollbar.tsx` deleted, its mount removed, and the
`@themvora/core/scrollbar.css` import dropped. The webview no longer imports `@themvora/core` at
all, and `studio.js` went from **428,496** to **395,728 bytes**.

What remains is a *colour* declaration for the browser's own scrollbar, not a scrollbar
implementation. The browser still performs every scroll — wheel, keyboard, track click, drag — and
nothing is drawn over the content:

```css
.studio ::-webkit-scrollbar { width: 10px; height: 10px; }
.studio ::-webkit-scrollbar-thumb { background-color: var(--scrollbar-thumb); border-radius: 999px; }
.studio ::-webkit-scrollbar-button { display: none; }
```

`--scrollbar-thumb` is set per appearance:

| Mode | Thumb |
| --- | --- |
| Auto | `var(--vscode-scrollbarSlider-background)` — the workbench's own colour, so Auto is indistinguishable from native |
| Light | `rgba(0, 0, 0, 0.28)` |
| Dark | `rgba(255, 255, 255, 0.24)` |

### 6.3 Why colour had to be set at all

Chromium paints its default bar from the *native* theme, not from the page. A forced-light Studio
under a dark workbench therefore showed a **dark, 15 px, arrow-buttoned rail** down a light canvas —
the same shape in the Theme Preview panel. Removing our stylesheet had handed the bar to the UA,
and the UA was dark.

`color-scheme` was the first attempt (§13). It fixed the harness but not the installed build, so
the colours are now explicit. The bar is still the browser's; only its colour is ours.

---

## 7. Why the other webviews were not changed

The preference is host-owned, so sharing it is a one-line read for any surface. The decision was
to keep it on the Studio, for reasons that are about the surfaces rather than the plumbing:

| Surface | Decision | Reason |
| --- | --- | --- |
| Studio panel | Shares the preference | It is the application. |
| Activity Bar workspace view | Not forced | It is a native VS Code tree/launcher; its chrome belongs to the workbench, and the tree must stay under VS Code's control. Forcing a light panel inside a dark workbench would read as a rendering fault, not a preference. |
| Standalone Theme Preview panel | Not forced | Its whole surface *is* the application theme. A Studio appearance there would compete with the thing it is showing, which the requirement forbids. |
| Color swatch / hover / diagnostics | Not applicable | Rendered by VS Code, not by a Themvora webview. |

No second appearance store was created; if either surface is later given chrome of its own, it
reads the same `themvora.studioAppearance` key through the same port.

---

## 8. Verification

### 8.1 Automated

- Extension: **906 tests / 70 files** — 9 new.
  - `test/studioAppearance.test.ts` (6): default is auto; the stored mode is written into the
    document before the bundle runs; the reported mode is persisted; an unknown mode is ignored
    rather than stored; the mode is restored after `dispose()` + `open()`; changing the appearance
    leaves the selected theme and its mode untouched.
  - `test/studioProtocol.test.ts` (3): the three modes are accepted and everything else is
    dropped; `parseStudioAppearance` keeps known values and falls back to `auto` for
    `undefined`/`null`/`""`/`"Dark"`/`"sepia"`/`0`/`{}`/`[]`.
- Both typechecks: exit 0.
- Build: host **602,805 bytes** (588.66 KB); webview `studio.js` **428,496 bytes**,
  `studio.css` **107,068 bytes**.
- VSIX: **96 files, 518.85 KB**; `verify-vsix` **14/14** self-contained; extension-host suite
  **23/23**.
- Lint: every file changed here passes. The repository gate still reports **13 pre-existing
  errors** in files this change does not touch (`require-atomic-updates` in `studioPanel.ts`
  lines 510/1002/1003/1006/1527/1566/1577, unused imports in `inspectionCache.ts`,
  `partialAnalysisReport.ts`, `applyPatchSafety.test.ts`, `Inspector.tsx`, and a missing
  `react-hooks/exhaustive-deps` rule definition in `SurfaceHost.tsx`). They predate this work and
  were left alone rather than bundled into it.

### 8.2 Visual and DOM

Rendered from the real `dist/webview` bundle and stylesheet with a mock `acquireVsCodeApi`, at
1440, 1000, 700 and 430 CSS px.

- **No horizontal overflow** at any width: `scrollWidth === clientWidth` in every case.
- **Auto** under a light workbench renders light; under a dark workbench renders dark.
- **Forced light** under a dark workbench renders light chrome while the canvas still shows the
  light application theme.
- **Forced dark** under a light workbench renders dark chrome while the canvas still shows the
  same light application theme — the two axes are visibly independent.
- **High contrast** + forced light, and high contrast + forced dark: contrast outlines remain on
  cards, inputs, chips and the rail in both.
- **Narrow (430 px)**: the appearance switch stays visible and operable.
- Scrollbar DOM probe after removal: **0** `tv-scrollbar` nodes and **0**
  `data-themvora-scrollbar` attributes, in all three appearance modes.
- Focus probe: the focused select reports `border-top-color` = ring and
  `outline: 1px solid <ring>` at `offset: 0`; the focused input and select both render as one
  continuous stroke at 3× zoom, with no inner hairline and no gap.
- Interaction probe: clicking **Dark** posts `setStudioAppearance: dark` and switches the
  document attribute under a light workbench; clicking **Light** posts `setStudioAppearance:
  light`; clicking the palette button posts `openColorThemePicker`. No appearance intent is posted
  on mount.

---

## 9. Files changed

| File | Change |
| --- | --- |
| `src/shared/studioProtocol.ts` | `StudioAppearance`, `STUDIO_APPEARANCES`, `STUDIO_APPEARANCE_KEY`, `parseStudioAppearance`, `setStudioAppearance` intent + validation |
| `src/shared/designTokens.ts` | forced light/dark palettes; `color-scheme` per mode; high-contrast `!important` overrides |
| `src/adapters/studioPanel.ts` | `studioAppearance` port; attribute in the document; intent handler; picker error notice |
| `src/extension.ts` | wires the port to `context.globalState` |
| `webview/studio.tsx` | reads the bootstrap attribute; imports the scrollbar stylesheet |
| `webview/studio/StudioApp.tsx` | segmented control, palette action, DOM sync + intent, scrollbar mount |
| `webview/studio/uiState.ts` | `studioAppearance` field, action and initial value; re-exports the shared type |
| `webview/studio/ui.tsx` | `monitor`, `sun`, `moon`, `palette` icons |
| `src/adapters/previewPanel.ts` | bundled faces in the panel document, `font-src`, `localResourceRoots` |
| `src/shared/previewSurface.ts` | mono stack via `var(--font-mono, …)`; single-stroke focus ring |
| `src/shared/dashboardSurface.ts` | single-stroke focus ring on the dashboard search |
| `webview/studio.css` | scrollbar colours per appearance, arrow buttons removed |
| `src/adapters/workspaceView.ts` | `families` on each file; Files list renders one row per family |
| `test/workspaceView.test.ts` | grouping by `meta.family` and by name suffix |
| `scripts/render-preview.mjs` | passes the faces, reports the font probe, waits for animations |
| `test/studioAppearance.test.ts`, `test/stubs/studioAppearance.ts` | new host tests and port stub |
| `test/studioProtocol.test.ts`, `test/studioUiState.test.ts` | appearance parser and reducer coverage |

---

## 10. Font parity between the two preview surfaces

A defect found by using the installed build: the dashboard inside the Studio canvas and the same
dashboard in the Theme Preview panel rendered in **different typefaces**.

### Root cause

The shared surface already pins one stack and one rasterisation mode for both hosts:

```css
.tvp {
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  font-feature-settings: "cv11", "ss01";
}
```

The Studio bundles `Inter` as an `@font-face` in `studio.css`, so the canvas got the real face. The
preview panel had **no `@font-face` and no way to load one** — `localResourceRoots` was empty and
the CSP had no `font-src` — so `"Inter"` matched nothing and the stack fell through to
`system-ui`, i.e. Segoe UI on Windows. Same markup, same CSS, two typefaces.

### Fix

| Change | Effect |
| --- | --- |
| `previewHtml(nonce, assets)` now takes the two face URIs and the webview's `cspSource` | The document can serve the bundled faces |
| `fontFaceCss(inter, mono)` prepended to the panel's inline stylesheet | The panel declares the same `@font-face` rules as the Studio |
| CSP gains `font-src ${cspSource}` | Only the webview origin may serve a font |
| `localResourceRoots` lists `dist/webview/fonts` | The two `.woff2` files, and nothing else, are readable |
| `previewSurface.ts` mono rules use `var(--font-mono, …)` | One variable drives the mono stack in both hosts instead of a literal |

The panel is no longer asset-free; that is a deliberate trade. The alternative — teaching the
Studio preview to use the workbench font — would have made the product preview look like the
editor rather than like an application.

### Evidence

- `document.fonts.check("13px Inter")` and `…("11.5px 'JetBrains Mono'")` are both `true` in the
  panel document.
- The same heading, measured in both hosts: `w=296.45px, fs=24px, ff=Inter`. Two different
  typefaces do not produce identical advance widths for a seventeen-glyph string at the same size.
- `scripts/render-preview.mjs` now passes the faces through `file:` URLs, reports the font probe in
  the document title, and waits for entrance animations before screenshotting — without the wait
  the capture caught the dashboard mid-fade and looked like a render failure.

---

## 11. Focus ring: one stroke, not two

A second defect found by using the build: focusing a text field, select or search box drew **two**
concentric rings.

### Root cause

The rule changed two properties at once and separated them:

```css
.tvp .tvc-input:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;      /* a gap between the two */
  border-color: var(--ring); /* the border is the second ring */
}
```

The 1 px border and the 2 px outline are both the ring colour, with a 2 px transparent gap between
them, so the control reads as a double outline. The dashboard search and the select had the same
shape — the select only looked worse because the browser had not finished its 160 ms
`border-color` transition when the screenshot was taken, so its inner line still read as grey.

### Fix

One stroke: the outline sits flush on the border box and both are the ring colour, giving a single
2 px edge with no gap.

```css
outline: 1px solid var(--ring);
outline-offset: 0;
border-color: var(--ring);
```

Applied to `.tvc-input`, `.tvc-searchwrap`, the checkbox box, the switch, and `.tvd-search`. The
ring colour still comes from the theme's `ring` role, so the focus indicator remains a theme
statement rather than a hardcoded accent, and 2 px total keeps it a real focus indicator.

### 11.2 A second ring inside the search field

The components search is a wrapper `<span class="tvc-searchwrap">` around a bare `<input>`. The
wrapper was fixed as above, but the inner input still matched the base rule
`.tvp :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }` and painted **its
own** ring inside the wrapper — two focus indicators on one field. The dashboard search had always
guarded against this; the components one had not:

```css
.tvp .tvc-searchwrap input:focus-visible { outline: none; }
```

The wrapper owns the focus ring for any field whose border it draws.

### Evidence

Rendered in Chromium from the real stylesheet, focused programmatically, then measured:

- select: `border-top-color` = ring, `outline` = `1px solid` ring, `offset=0`, `active=true`
- screenshot of the focused input and the focused select: one continuous stroke at 3× zoom, with
  no inner hairline and no gap

---

## 12. Select: the value sat at the top

`all: unset` on `select` resets `appearance` to `auto`, so Chrome kept painting the native control:
the selected value hugged the top of a 36 px box and the native arrow competed with the chevron the
surface already draws.

```css
.tvp .tvc-select { appearance: none; line-height: 34px; }
```

`appearance: none` makes the box plain so `line-height` (34 px = 36 px height minus the 1 px
borders) centres the value, and it removes the duplicate arrow. The dropdown still opens natively.

---

## 13. Native scrollbar gutter followed the workbench, not the Studio

After the custom scrollbar was removed, a forced-light Studio under a dark VS Code still showed a
**dark strip** down the side of a light canvas, and the Theme Preview panel showed the same around a
light theme.

### Root cause

Chromium paints the scrollbar track, corner and native widgets from the document's **used colour
scheme**. Neither surface declared one:

- the Studio inherited the platform/webview scheme, which follows the workbench — dark;
- the panel declared `:root { color-scheme: light dark }`, which resolves through
  `prefers-color-scheme` — also dark under a dark workbench.

The track is transparent in VS Code's injected rules, so what was visible was the UA's dark
scrollbar chrome, not an extension colour.

### Fix

Declare the scheme the surface actually is:

```css
html[data-studio-appearance="light"] { color-scheme: light; }
html[data-studio-appearance="dark"]  { color-scheme: dark;  }
```

Auto is untouched — the host's scheme applies. The panel sets it per model instead, because its
whole surface is the previewed theme:

```js
document.documentElement.style.colorScheme = model.mode === "dark" ? "dark" : "light";
```

### Evidence

Rendering with `--force-dark-mode` (which otherwise paints dark scrollbars) and `appearance=light`:
the canvas gutter is light with a grey thumb. Setting `scheme=dark` on the same page reproduces the
dark strip, which is what isolated the cause.

`color-scheme` alone was not enough in the installed build, so the thumb colour is now explicit
(§6.2). Both together are what make the bar deterministic.

---

## 14. Workspace Files: one row per family

The workspace sidebar's **Files** tab listed every variant as its own theme — `rose-light` with a
`light` badge, `rose-dark` with a `dark` badge — while the **Presets** tab showed one row per family
with `light / dark`. Two tabs describing the same project disagreed.

`WorkspaceFile` now carries `families`, built once in the host from `themeFamilyName()`:

```ts
{ name: "rose", primary: "rose-light", modes: ["light", "dark"], color: "#…", valid: true }
```

- The family key is `meta.family` when present, otherwise the name without its `-light`/`-dark`
  suffix — the same rule the Studio uses, so a file's grouping cannot drift from its selection.
- Modes are sorted light → dark regardless of file order.
- `primary` is the light variant when the family has one, so clicking the row opens the mode a
  reader expects first; `selectProject` still receives a real theme name, not a family id.
- `valid` is the AND of the family's variants: a family with one broken mode shows as broken.

The flat `themes` array is still on the model — the Studio's own library and the source-discovery
evidence use it — but the Files list renders `families`.

Tests: a file with `brand-light` + `brand-dark` groups to one family with both modes and opens the
light variant; a file with no `meta.family` groups by suffix, keeps `ocean` and `rose` apart, and
sorts light before dark even when the file lists dark first.

---

## 15. Limitations

1. **The preference is Studio-only.** The workspace view and the preview panel keep VS Code's
   native chrome; see §7 for the reasoning.
2. **Auto cannot be previewed inside the Studio.** The webview's `--vscode-*` variables are
   supplied by the host; a forced mode is the only way to see the other appearance without
   changing the workbench theme. That is the intended trade-off, not a defect.
3. **The scrollbar is coloured, not owned.** Width, thumb colour and the absence of arrow buttons
   are set for the Studio's own containers; the browser still does every scroll. The preview
   surface keeps its own themed bar.
4. **The focus ring is 2 px total.** It is a real indicator, but it is thinner than the 3 px
   outline-plus-border some systems use; that is the point of the change.
5. **No release.** Version, packages and the public API are unchanged.
