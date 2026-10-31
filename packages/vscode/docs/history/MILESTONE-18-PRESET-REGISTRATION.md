# Themvora for VS Code — Preset Registration Awareness

A developer opening **New theme → Preset** saw nine canonical presets and no way to tell which of
them their project already contains. Copying one was one click away from a duplicate. This makes the
relationship visible, without a second parser and without a second catalog.

Two smaller defects reported in the same pass are covered in §6.

---

## 1. What already existed, and what was missing

The source graph already answered the hard part. Every project theme row carries:

- `origin` — which canonical API produced it (`definition`, `generated`, `catalog`).
- `evidence` — how far the relationship was traced (`registered`, `catalog-source`,
  `partially-resolved`, `defined-unregistered`).
- `usedBy` — the consumers that import it.
- `family` — the grouping key the registry records.

The **missing** piece was the join. The drawer listed catalog entries (`id`, `label`, `kind`,
`style`, `modes`, `swatches`) which carried no family, and the catalog said nothing about the
project. So the drawer could not answer "is Oat already in here?".

No new scanning was needed: the Studio already receives both lists in one `StudioState`, and both
are rebuilt on every inspection. The join is a pure function over data that is already on the wire.

---

## 2. The evidence model

`webview/studio/presetEvidence.ts` — one function, `presetRegistration(preset, themes)`.

| Status | Label | Established by |
| --- | --- | --- |
| `registered` | **Registered in source** | Every variant is a catalog-origin row with `evidence: "registered"` |
| `included` | **In project** | Catalog-origin rows exist, but none is traced to a consumer |
| `partial` | **Partially detected** | A variant is missing, or the variants disagree about registration |
| `unverified` | **Registration not verified** | Rows exist with `partially-resolved` evidence |
| `catalog-only` | **Catalog only** | No catalog-origin row for this family |

Each verdict carries the sentence behind it — which file, which consumer, which variant is missing
— and that sentence is the row's tooltip.

### Identity rules

1. **Family is the key.** A catalog entry's `family` is the same string its themes record.
2. **Origin is the gate.** Only rows with `origin: "catalog"` (or `evidence: "catalog-source"`,
   which generated registries use instead) are candidates. A project that hand-writes
   `defineTheme({ family: "oat" })` has `origin: "definition"`; it is the developer's own theme and
   is deliberately **not** counted as the preset.
3. **Name suffix is the fallback** when a row records no family — the same rule `themeGroupKey`
   already uses for the sidebar.
4. **Never the label alone.** A row named `oat-light` with `family: "custom-oat"` does not match.

### Variant correlation

`preset.modes` is compared against `theme.mode`. A preset that ships light and dark with only light
found is `partial`, and the tooltip names the missing mode. A single-mode preset with that mode
present is complete.

### What is deliberately *not* claimed

- `included` is not called "registered": a collection that never reaches a provider is collection
  evidence, not registration.
- `catalog-only` is never called "unused". The tooltip says "no static project registration", and a
  test asserts the word "Unused" does not appear.
- No status implies the theme is active at runtime. The existing "no active theme reported" footer
  still owns that claim.

---

## 3. The drawer

Each preset row gains a chip and, when the preset is in the project, the file it was found in:

```
[◐◑]  Oat                                  [Registered in source]  >
      default · light / dark · src/theme/theme.config.ts
```

Colour is the strength of the evidence: green traced to a consumer, violet included in a
collection, amber partial, neutral otherwise. `Catalog only` uses a quiet pill — it is the normal
state of most of the catalog and must not compete with the rows that are actually registered.

The footer says what copying does, before the click:

> Presets are read-only; this copies one into a `defineTheme` draft. A preset already in your
> project is copied, not re-registered.

And after the click, the host's notice distinguishes the two cases — `installDefineDraft` checks the
same family against the cached theme rows:

> Draft created from preset · Oat. This preset is already in the project's theme collection — the
> draft is a separate copy and does not change its registration.

Starting a draft from an in-project preset stays enabled. A developer who wants a variation of a
preset they already use should not have to fork it by hand.

---

## 4. Reactivity

There is nothing to invalidate. The registration is recomputed from `state.themes` and
`state.presets` on every render, and the host already rebuilds `StudioState` when the inspection
changes — file watchers, document changes and the request sequence are unchanged. Removing the
collection from source flips the chip back to `Catalog only` on the next state post, with no stale
value to clear.

---

## 5. Tests

`test/presetEvidence.test.ts` — 11 tests:

- no project rows → `catalog-only`, label `Catalog only`, and the detail never says "Unused"
- both variants registered with a consumer → `registered`, with source and consumer named
- both variants present, no consumer → `included`, detail says "no verified consumer"
- only light found → `partial`, variants list the missing dark, detail names it
- variants disagree (one registered, one catalog-source) → `partial`
- `partially-resolved` evidence → `unverified`
- **a local definition with the same family is not the preset** → `catalog-only`
- a row with a matching name but a different family → `catalog-only`
- a row with no family matches on the name suffix
- `catalog-source` evidence counts as catalog origin when `origin` is absent
- a single-mode preset with that mode present → `registered`

**941 tests / 73 files**, both typechecks, lint clean, VSIX 97 files / 515.98 KB.

The visual check used the real bundle: the harness fixture was extended with catalog-origin rows so
all five statuses render at once — Oat (registered), Berry (in project), Mint (partial), Citrus
(unverified), the rest catalog-only.

---

## 6. Two defects fixed in the same pass

**The evidence filter looked like text, and clipped.** `.evidence-select select` had
`border-color: transparent; background-color: transparent` and its chevron at `right 2px` with a
12px glyph, so half the chevron fell outside the padding box. The control read as a label, and its
focus ring was cut off at the panel edge. It now keeps the standard control chrome at 22px, and the
option labels are one word each — a `<select>` sizes itself to its widest option, and
"partial / dynamic" made the row wider than the panel. The heading wraps if the two still do not
fit, so the filter is never pushed past the edge.

**The logo was an approximation.** The Studio header and the sidebar drew a gradient tile with three
white discs, which is not the icon the Activity Bar shows (`media/themvora.svg`: a rounded-square
ring plus three discs at three alphas). Both now draw that geometry in `currentColor`, with a
`--brand-mark` token — `#4f46e5` in light, `#8b8cf8` in dark (the brand indigo is a 2.4:1 shape on
`#0e0f13`), and the workbench foreground in high contrast.

---

## 7. Limitations

1. **The join is family-level.** A project could include `oat-light` from the catalog and define
   `oat-dark` itself; the family would read as registered while half of it is the developer's own.
   The variant rows keep the distinction visible in the tooltip, but the chip is one word.
2. **`In project` does not name the collection.** The evidence records the file, not the variable
   that holds the array; the tooltip names the file.
3. **No "add this preset to my project" action.** Registering a preset is a project mutation that
   the extension has no supported operation for; the drawer copies into a draft instead, and the
   footer says so. This is the existing CLI-dependent limitation, unchanged.
4. **The harness fixture is not the real inspection.** The visual check used hand-written rows with
   the same shape the host emits; the statuses were also asserted directly in the unit tests.
