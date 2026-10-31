# Themvora for VS Code — Canvas Toolbar, Focus Ring and Panel Flicker

Four defects reported from the running extension. Each was reproduced before it was changed, and
each fix is verified by measurement rather than by inspection.

---

## 1. The validity badge read "vali"

**Symptom.** In the canvas toolbar the badge next to the theme name was cut mid-glyph — `✓ vali` —
and the origin pill lost its left edge.

**Cause.** The identity row could not shrink and could not wrap:

```css
.canvas-identity { flex: 1 1 180px; min-width: 0; }
.canvas-identity > * { flex: none; }   /* nothing may shrink */
```

Every child was `flex: none`, so when the canvas was narrower than the sum of the title, the origin
pill and the badge, the children simply overflowed the 180px basis. `.canvas-identity` kept its
small width, the controls stayed on the same line, and the overflow was clipped by the canvas.

**Fix.** The identity is now a wrapping row with a basis that matches what it actually holds, and
the title is the only thing that shrinks:

```css
.canvas-identity { flex-wrap: wrap; gap: var(--sp-1) var(--sp-2); flex: 1 1 340px; min-width: 0; }
.canvas-identity > .canvas-title { flex: 0 1 auto; min-width: 64px; }
```

340px is the width the title, the origin pill and the badge need together. Below that the controls
move to their own row instead of the identity being squeezed, and if the identity itself is still
too narrow the pills wrap inside it rather than being cut.

The title stays shrink-only on purpose: a growing title pushed the origin and validity pills to the
far edge of the row, which looked like a different bug.

---

## 2. The toolbar was not responsive to its own width

**Symptom.** At a 1300px window with the library and inspector open, the canvas was ~585px and the
toolbar still used its wide layout. The row in the report was `rose-li… | Project theme | ✓ vali |
Tokens | Light | Dark | Components | Dashboard | Single | Light ↔ Dark`, all on one line.

**Cause.** The stacking rule was a **viewport** media query:

```css
@media (max-width: 1099px) { .canvas-toolbar { flex-direction: column; … } }
```

The canvas is a panel beside the library and the inspector, so a wide window can leave the canvas at
585px. The media query never fired, and the wide layout clipped.

**Fix.** The rule is now a **container** query on `.canvas`, which already declares
`container: canvas / inline-size`:

```css
@container canvas (max-width: 820px) { .canvas-toolbar { flex-direction: column; … } }
@container canvas (max-width: 980px) { .canvas-identity .hide-compact { display: none; } }
```

The compact-only pills (family, "define draft") now drop at 980px of canvas rather than 900px of
viewport, which is the width at which they actually start competing with the badge.

### Measured

A probe reads `scrollWidth - clientWidth` on the identity, the status text's right edge against the
canvas's, and the toolbar height, at eight window widths:

| Window | Canvas | Identity overflow | Status text | Toolbar |
| --- | --- | --- | --- | --- |
| 1920 | 1205 | 0 | `valid` | 56px, one row |
| 1600 | 885 | 0 | `valid` | 79px |
| 1440 | 725 | 0 | `valid` | 83px |
| 1300 | 585 | 0 | `valid` | 83px |
| 1100 | 733 | 0 | `valid` | 83px |
| 900 | 825 | 0 | `valid` | 79px |
| 760 | 685 | 0 | `valid` | 83px |
| 680 | 605 | 0 | `valid` | 83px |

Overflow is 0 everywhere — the identity never scrolls its own content — and the status text is the
whole word at every width. The status text's right edge is 350–923px inside the canvas edge, so
nothing is near the clip boundary.

---

## 3. The New theme cards' ring was cut off at the top

**Symptom.** The selected method card (`Generate`) showed its 3px focus ring on the left, right and
bottom, but the top edge was flat.

**Cause.** `.drawer-body` is a scroll container:

```css
.drawer-body { overflow-y: auto; padding: 0 var(--sp-6) var(--sp-6); }
```

`overflow-y: auto` makes it clip at its **padding box**, and the top padding was zero. The card row
is the first child, so the ring's top 3px sat outside the clip region and was discarded. The ring is
`box-shadow: 0 0 0 3px` from `--ring-soft`.

**Fix.** One step of padding — the ring's own width — on both scroll bodies:

```css
.drawer-body { padding: var(--sp-1) var(--sp-6) var(--sp-6); }
.modal-body  { padding: var(--sp-1) var(--sp-6); }
```

Verified by pixel sampling down a column through the card's top edge, before and after:

| y | Before | After |
| --- | --- | --- |
| 92 | `255 255 255` (white) | `235 226 252` (ring) |
| 93 | `255 255 255` (white) | `235 226 252` (ring) |
| 94 | `124 58 237` (border) | `124 58 237` (border) |

The ring now occupies the two rows above the border that were white.

---

## 4. The dark frame when switching panels

**Symptom.** Switching from the Studio to the Theme Preview showed one frame of dark editor
background before the preview appeared. Extracted at 30fps from the recording: frame 9 is
`(25,26,37)` across the whole editor area, between two light frames.

**Cause.** The preview panel was created with `retainContextWhenHidden: false`:

```ts
// Re-created on reveal instead of kept alive: the webview re-sends `ready`,
// and the host can rebuild state at any time, so a hidden panel costs nothing.
retainContextWhenHidden: false,
```

That reasoning was wrong about the cost. Every reveal destroyed the document and built a new one,
and a new document paints its body **before** the model arrives. `body { background: var(--bg-0) }`
resolves through the workbench variables; for that one frame the panel shows the host backdrop
instead of the preview.

**Fix.** Two changes:

1. **Retain the context**, matching the Studio:

   ```ts
   retainContextWhenHidden: true,
   ```

   There is no first frame to flash because there is no new document. The cost is one static
   document held in memory while another tab is in front — the same trade the Studio already makes,
   and it also keeps the scroll position and the selected mode across a tab switch.

2. **Paint the background first**, so even the first open has the right colour:

   ```html
   <style nonce="…">html, body { background: var(--vscode-editor-background, #1f1f1f); }</style>
   ```

   It is the first style in the head, ahead of the font faces and the panel stylesheet. The later
   `body { background: var(--bg-0) }` still wins once the stylesheet applies, so the visible design
   is unchanged; this rule only owns the frame before it.

The Studio already used `retainContextWhenHidden: true`, and its stylesheet is an external
render-blocking `<link>`, so it has neither problem. The sidebar view keeps `false`: it is a view,
not a panel, and re-creating it on every reveal is cheap.

---

## 5. Tests

| Test | File |
| --- | --- |
| `paints the editor background before anything else can` — the rule precedes the font faces and the stylesheet | `test/previewPanel.test.ts` |
| `keeps its document alive while another tab is in front` — `retainContextWhenHidden: true` on the created panel | `test/previewTheme.test.ts` |

**929 tests / 72 files**, both typechecks, lint clean.

The three CSS fixes are not unit-testable in this repo — there is no CSS assertion harness — so they
are verified by the measurements in §2 and §3 and by the screenshots below.

---

## 6. Visual verification

Rendered from the real Studio bundle through the existing harness.

| Shot | Shows |
| --- | --- |
| `shots/issue/tb2-1440.png` | Canvas 725px: identity on row 1, controls on row 2, `✓ valid` complete |
| `shots/issue/tb2-1100.png` | Canvas 733px, stacked layout |
| `shots/issue/tb3-760.png` | Canvas 685px, narrowest tested, nothing clipped |
| `shots/issue/tb2-1300-crop.png` | `oat-light · Catalog preset · ✓ valid` at 2× |
| `shots/issue/after-ring.png` | The Generate card's ring, complete on all four sides |
| `shots/issue/after-871.png` | The same at the two-column breakpoint |

---

## 7. Files changed

| File | Change |
| --- | --- |
| `webview/studio.css` | identity wraps with a 340px basis; title shrink-only; container queries at 820/980; `--sp-1` top padding on `.drawer-body` and `.modal-body` |
| `src/adapters/previewPanel.ts` | `retainContextWhenHidden: true`; first-paint background rule |
| `test/previewPanel.test.ts` | first-paint assertion |
| `test/previewTheme.test.ts` | retained-context assertion |

---

## 8. Limitations

1. **The first open still has one frame.** Retaining removes the flash on every *switch*; the very
   first time the panel is created there is still a document to build. The first-paint rule makes
   that frame the editor background rather than the host backdrop, but it is a frame.
2. **The fallback colour is dark.** If `--vscode-editor-background` were undefined at first paint,
   the rule falls back to `#1f1f1f`. It is defined in every real webview, so this is a guard, not a
   path.
3. **The measured widths are the harness's.** The numbers in §2 come from the harness at eight
   window widths, not from a running VS Code window with the user's panel layout.
4. **Memory.** The preview document is now held while hidden. It is a static page with no timers
   beyond the 200ms transition, so the cost is bounded, but it is not zero.
