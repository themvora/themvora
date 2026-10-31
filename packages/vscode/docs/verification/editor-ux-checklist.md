# Editor UX checklist — human verification

> **Status: not yet performed.** Everything in this file requires a person at a
> keyboard. Until the boxes are ticked, the features below are *implemented and
> machine-verified*, but their **usability is unverified** and must not be
> described as validated.

## Why this exists

The automated suite proves behaviour that is observable from the extension host:
diagnostic counts, severities, ranges, hover text, swatch ranges. It cannot see
whether a squiggle is on the right word in a real window, whether a hover reads
well, or whether Tab reaches a button.

Milestone 5 learned this the useful way: a render pass found two real defects
(the `input` token used as a fill, and a stale banner that did not say it was
stale) that no unit test would have caught.

## How to run it

`code --install-extension` does not work on this host — it launches the full
application and never returns — so the extension is installed by hand:

```bash
pnpm --filter themvora-vscode build
cd packages/vscode && pnpm package             # themvora-vscode-<version>.vsix

# unpack into the user extensions directory and register it in extensions.json
unzip -q themvora-vscode-0.1.0.vsix -d /tmp/tv
cp -r /tmp/tv/extension/. \
  "$USERPROFILE/.vscode/extensions/themvora.themvora-vscode-0.1.0/"
```

Then **`Ctrl+Shift+P` → "Developer: Reload Window"**. A hand-installed extension
is only scanned on startup, so without a reload nothing appears and it looks like
a broken build.

**Them** look for the **Themvora** icon in the Activity Bar — it is the last icon
in the bar and opens the Projects panel. The panel was previously a section inside
the Explorer and had no icon at all, so "I can't find the UI" was a real defect,
fixed on 2026-10-21 (`MILESTONE-7-REPORT.md`).

Then open the five files in `test/fixtures/manual/` and work down the list below.

## The Themvora mark

- [ ] Open a `theme.config.ts`: the Themvora droplet appears at the **top right** of
      the editor, and clicking it opens the Projects panel.
- [ ] The same file shows a **Themvora** item in the status bar; clicking it focuses
      the panel, and its tooltip names the file.
- [ ] Open a `theme.json`: the editor-title button and the status bar item open the
      **preview** instead.
- [ ] The preview's **tab** shows the droplet, in both light and dark themes.
- [ ] `vite.config.ts` shows **no** editor-title button and **no** status bar item.
- [ ] Switch to a non-theme file: both the button and the status bar item disappear.

## The theme-file badge

In a project that declares `@themvora/*`:

- [ ] `theme.config.ts` (anywhere in the tree) carries a **TV** badge in the Explorer.
- [ ] The same badge appears in the file's tab and in Quick Open.
- [ ] Hovering the badge reads "Themvora theme configuration".
- [ ] `vite.config.ts` and `main.tsx` have **no** badge.
- [ ] In a project **without** `@themvora/*`, a file named `theme.config.ts` has no badge.

The badge is a decoration, not an icon. A true file *icon* is chosen by the user's
file icon theme and cannot be added by an extension — see the README.

## Expected behaviour per fixture

| Fixture | Expected |
| --- | --- |
| `healthy-pair.json` | 0 diagnostics. 42 colour swatches. Hovering `primary` explains the role. |
| `low-contrast.json` | 1 **warning** (contrast), 0 errors. `validateTheme` calls it valid, so it must not be red. |
| `missing-tokens.json` | 20 **errors** — 19 missing roles + 1 invalid value. The invalid value `"nope"` is underlined itself. |
| `malformed.json` | **No** Themvora diagnostics. VS Code's own JSON validator may complain; ours must not add noise. |
| `commented.jsonc` | Same as `healthy-pair`: comments and trailing commas are accepted, and every range still lands on the right token. |

## The checklist

### Diagnostics

- [ ] `missing-tokens.json`: exactly 20 squiggles, none duplicated on the same token.
- [ ] The squiggle on `"nope"` covers the value, not the key and not the whole line.
- [ ] Missing-token squiggles sit on the `colors` object, and the message names the missing path.
- [ ] `low-contrast.json`: the squiggle is a **warning** colour, not an error.
- [ ] `malformed.json`: no Themvora squiggles; the Problems panel does not fill with noise.
- [ ] Typing a character and undoing it leaves the same diagnostics — no flicker, no duplicates.
- [ ] The Problems panel groups by file and the source reads `Themvora`.

### Hover

- [ ] Hovering a role name shows the role, its group, its current value and its usage notes.
- [ ] The markdown renders — no raw asterisks, no broken backticks.
- [ ] Hovering `primary` in an unrelated JSON file shows **nothing** from Themvora.
- [ ] The hover does not cover the token it is describing.
- [ ] Contrast lines appear on a valid theme and are absent on an invalid one.

### Colour swatches

- [ ] Every colour token shows a swatch of the right colour.
- [ ] No swatch appears on `"nope"` or on hex-like text outside `tokens.colors`.
- [ ] Opening the picker and **cancelling** changes nothing.
- [ ] Opening the picker, choosing a colour and confirming changes **only** that literal — the key, the quotes and the other half of the pair are untouched.
- [ ] A `#rgb` value becomes `#rrggbb` after an edit (documented behaviour), and the swatch still resolves.
- [ ] Undo restores the original text exactly.

### Preview panel (carried over from M5, still unverified)

- [ ] Tab reaches the Light/Dark buttons; Enter and Space activate them.
- [ ] The focused button shows a visible focus ring.
- [ ] Resizing the panel does not clip the token table or the buttons.
- [ ] An invalid edit leaves the last good render on screen with the stale banner.

### JSONC

- [ ] `commented.jsonc` behaves exactly like `healthy-pair.json` in every check above.
- [ ] A trailing comma does not produce a parse error.
- [ ] Breaking a commented file (delete a brace) clears the diagnostics rather than reporting a parse error on every keystroke.

## When something fails

1. Note the fixture, the action and what happened.
2. Add a focused regression test at the layer responsible — locator, mapping,
   adapter, or panel — not a broad assertion.
3. Fix only that layer, then re-run the full suite and this checklist.

## Appendix — what is already proven, and what only a person can confirm

The checks above mix two kinds of claim. The first kind is a statement about data the extension
computes; those are asserted by tests and do **not** need a human. The second kind is about how it
looks on screen; those do.

| Claim in this checklist | Proven by |
| --- | --- |
| 42 colour swatches on a healthy pair | `test/colorSwatches.test.ts` |
| 20 errors on `missing-tokens.json`, no duplicates | `test/themeDiagnostics.test.ts` ("does not duplicate the 19 paths both sources report") |
| The `"nope"` finding is kept though `validateTheme` omits it | `test/themeDiagnostics.test.ts` |
| A low-contrast theme is a **warning**, and core still calls it valid | `test/themeDiagnostics.test.ts` ("is a warning, and core still calls the theme valid") |
| `malformed.json` produces no Themvora diagnostics | `test/diagnosticCollection.test.ts` ("ignores JSON that is not a theme") |
| A jsonc document with comments still maps every range | `test/diagnosticCollection.test.ts` ("accepts a jsonc document") |
| The squiggle covers the value, not the key or the line | `test/diagnosticLocator.test.ts` (`textAt(range)` assertions) |
| Missing-token squiggles sit on the `colors` object | `test/diagnosticCollection.test.ts` ("points a missing token at the object that should hold it") |
| Typing and undoing leaves the same diagnostics, no flicker | `test/diagnosticCollection.test.ts` ("collapses a burst into one publish": five edits, one publish) |
| Hover content, role group, value and usage notes | `test/roleHover.test.ts` |
| An unrelated JSON file shows nothing from Themvora | `test/roleHover.test.ts` |

**What remains human, and why:** whether the squiggle *visually* covers the right characters, whether
the hover covers the token it describes, whether the badge renders at 12px in both themes, whether the
status bar item is legible, and whether the preview panel resizes sensibly. Those are judgements about
pixels in a real editor window; no assertion in this repository can make them.

**Status: still open.** The automated half is complete and green; the visual half has not been
performed.
