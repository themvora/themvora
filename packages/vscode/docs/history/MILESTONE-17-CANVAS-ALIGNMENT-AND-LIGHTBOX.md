# Themvora for VS Code — Canvas Toolbar Alignment and the Preview Lightbox

Three defects, one theme: things that were positioned for a wide row and then behaved badly when
that row was not available.

---

## 1. The wrapped toolbar was ragged

**Symptom.** As soon as the canvas controls wrapped onto their own line they sat against the right
edge, under an identity row that starts at the left. With three rows of controls the alignment
alternated: right, left, right. It read as an accident rather than a layout.

**Cause.** The group was pinned right:

```css
.canvas-controls { justify-content: flex-end; margin-left: auto; }
```

`margin-left: auto` is correct while the group shares a row with the identity — it pushes the group
to the far edge. It is wrong the moment the group wraps, because then it is the only item on its
line and `auto` still pushes it right. `justify-content: flex-end` did the same inside the group
when the group itself wrapped onto two lines.

**Fix.** The group is left-aligned and unpinned:

```css
.canvas-controls { justify-content: flex-start; }   /* margin-left: auto removed */
```

The identity already grows (`flex: 1 1 340px`), and a growing item absorbs the free space on its
line — which is what pushes the group to the right edge when both fit. So the wide layout is
unchanged, and the wrapped layout now follows the row instead of fighting it:

| Canvas | Layout |
| --- | --- |
| 1205px (1920 window) | one row: identity left, controls right — unchanged |
| 725px (1440 window) | two rows: identity, then controls from the left edge |
| 585px (1300 window) | three rows, every row from the left edge |
| 390px (1100 window) | stacked by the container query, every row from the left edge |

Verified at 1920, 1440, 1300, 1100 and 760.

---

## 2. The full-preview lightbox had no theme toggle

**Symptom.** "Open full preview" in the New theme drawer showed the generated theme, its name and
its mode as **static text** (`generated-light light`). Seeing the other half of the pair meant
closing the lightbox, toggling in the drawer, and opening it again.

**Fix.** The static mode label is now the same `Segmented` control the drawer and the topbar use,
bound to the same `ui.draftMode` state:

```tsx
<Segmented
  label="Preview mode"
  size="sm"
  className="caps"
  value={variant.mode}
  options={live.modes.map((mode) => ({ value: mode, label: mode }))}
  onChange={(mode) => dispatch({ type: "set-draft-mode", mode })}
/>
```

Switching in the lightbox switches the drawer behind it, and vice versa, because there is one piece
of state rather than two. A single-variant theme keeps the plain label — a control with one option
is not a control.

**Verified by clicking it**, not by reading the code: the harness opens the drawer, opens the
lightbox, clicks `Dark`, and the screenshot shows the dark dashboard with `Dark` active in the head.

---

## 3. The lightbox scrollbar was the platform bar

**Symptom.** In forced light appearance the preview lightbox had a dark scrollbar down its right
edge, while the rest of the Studio was light.

**Cause.** The scrollbar rules were scoped to the Studio root:

```css
.studio { scrollbar-color: auto; scrollbar-width: auto; }
.studio ::-webkit-scrollbar { width: 10px; … }
```

The lightbox is rendered through `createPortal(…, document.body)` — it is **outside** `.studio`, so
none of those rules matched it. It therefore inherited the workbench's non-auto `scrollbar-color`
from `html`, which is exactly the condition that makes Chromium ignore `::-webkit-scrollbar` and
paint the platform bar: 15px, arrow buttons, a track filled from `--vscode-editor-background`.

**Fix.** Both the reset and the rules moved to the document:

```css
html { scrollbar-color: auto; scrollbar-width: auto; }   /* unlayered: beats the host's @layer */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background-color: var(--scrollbar-thumb); … }
```

The document is the Studio and nothing else, so a document-wide rule has no host content to affect.
The reset must stay on `html` rather than on a descendant, because `scrollbar-color` is inherited —
a portal on `body` picks up whatever `html` says.

Verified by pixel sampling across the bar at y=300: the thumb is `(175,176,177)`, which is
`rgba(0,0,0,0.28)` — the light appearance's own thumb — over the panel background, and the bar is
10px wide with no arrow buttons. Before the change it was the 15px platform bar.

---

## 4. Quality gates

| Gate | Result |
| --- | --- |
| `tsc` (host + webview) | pass |
| `vitest` (extension) | 929 / 72 files pass |
| `npm run lint` | pass |
| `tsup` + `build-webview` | pass |
| `npm run package` | 97 files, 513.94 KB |
| `verify-vsix` | self-contained |

Installed into `~/.vscode/extensions/themvora.themvora-vscode-0.1.0`, and the installed assets
checked directly: `.canvas-controls` carries `justify-content: flex-start` with no
`margin-left: auto`; zero `.studio ::-webkit-scrollbar` rules remain and the selectors are
unscoped; `html` carries `scrollbar-color: auto`; `Preview mode` and `set-draft-mode` are in the
webview bundle.

---

## 5. Visual verification

| Shot | Shows |
| --- | --- |
| `shots/issue/al-1920.png` | 1205px canvas — single row, controls right, unchanged |
| `shots/issue/al-1440-crop.png` | 725px canvas — two rows, both from the left edge |
| `shots/issue/al-1100.png` | 390px canvas — three rows, all left-aligned |
| `shots/issue/al-760.png` | 685px canvas — narrowest tested |
| `shots/issue/lightbox.png` | The lightbox with the `Light / Dark` control in the head |
| `shots/issue/lightbox-toggled.png` | After clicking `Dark`: the dark variant, `Dark` active |
| `shots/issue/lightbox-edge2.png` | The lightbox scrollbar at 4×: 10px, light thumb |

---

## 6. Files changed

| File | Change |
| --- | --- |
| `webview/studio.css` | `.canvas-controls` left-aligned and unpinned; scrollbar reset moved to `html`, `::-webkit-scrollbar` rules unscoped |
| `webview/studio/CreateDrawer.tsx` | lightbox head gains the `Preview mode` segmented, bound to `ui.draftMode` |

---

## 7. Limitations

1. **The controls still take two or three rows at narrow canvas widths.** Four groups — Tokens,
   mode, surface, comparison — do not fit in 390px however they are aligned. Collapsing them into
   an overflow menu is a different design decision and was not part of this fix.
2. **The toggle appears only when the theme has more than one mode.** A single-variant theme shows
   the plain label, which is correct but means the control is absent rather than disabled.
3. **The scrollbar fix is document-wide by necessity.** Any future overlay that renders outside
   `.studio` now inherits the styled bar, which is the intent, but it also means a future embedded
   surface that *wants* the platform bar would need an explicit opt-out.
