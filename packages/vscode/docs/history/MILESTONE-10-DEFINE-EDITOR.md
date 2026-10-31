# Milestone 10 — Define Theme token editor

**Status: implemented.** Increment 3 of the Studio UX milestone. This file records the
shipped-schema audit the editor is built on and the increment's implementation/gate.

---

## 1. Schema audit

Read from `packages/core/src/model/` and the docs/examples named in the brief.

### `defineTheme()` is identity

`defineTheme(theme)` returns its argument unchanged. It is a type-level helper, not a
transformation or validator. The editor edits the literal definition, not a derived format.

### The theme definition

```ts
ThemeDefinition {
  name: string
  extends?: string | readonly string[]
  meta?: {
    label?, description?, group?, version?, created?, updated?,
    family?, mode?: "light" | "dark" | "system", order?, tags?, generation?
  }
  tokens?: ThemeTokens
}
```

`tokens` is optional. A definition can inherit everything through `extends`. The editor does
not create or remove definitions, `extends` chains or metadata; it edits token values that
already exist.

### Token structure actually shipped

| Group | Shape | Contract |
| --- | --- | --- |
| `colors` | `ThemeColors`: arbitrary nested `{ [key]: string \| ThemeColors \| undefined }` | 21 **core** colour roles are required by `validateTheme`; any other key is legal and outside the core contract. |
| `code` | `CodeTokens`: 18 optional string fields | Opt-in syntax-highlighting colours; absent by default. |
| `spacing` | `Record<string, string>` | CSS length scale. |
| `radius` | `Record<string, string>` | CSS length scale. |
| `shadows` | `Record<string, string>` | Box-shadow strings. |
| `borderWidths` | `Record<string, string>` | CSS lengths. |
| `zIndex` | `Record<string, string>` | Numeric strings. |
| `breakpoints` | `Record<string, string>` | CSS lengths / query values. |
| `typography` | `{ fontFamilies?, fontSizes?, lineHeights? }`, each `Record<string, string>` | Three nested scales. |

### Semantic colour groups are shipped data

`SEMANTIC_ROLE_GROUPS` (public) defines five groups:

| Group | Core roles | Optional roles |
| --- | --- | --- |
| Canvas | `background`, `foreground`, `muted`, `mutedForeground` | — |
| Surfaces | `card`, `cardForeground`, `popover`, `popoverForeground` | — |
| Actions | `primary`, `primaryForeground`, `secondary`, `secondaryForeground`, `accent`, `accentForeground`, `destructive`, `destructiveForeground` | — |
| States | `success`, `successForeground` | `warning`, `warningForeground`, `info`, `infoForeground`, `error`, `errorForeground` |
| Interaction | `border`, `input`, `ring` | — |

The editor uses these exact groups. Optional roles are shown only when the theme already
defines them; the editor does not add arbitrary tokens or missing capabilities.

### Validation and contrast are separate, canonical facts

- `validateTheme()` checks that `tokens` exists and that the 21 core colours are present.
  It does **not** validate CSS colour syntax, and it does not run contrast.
- `measureThemeContrast()` is the canonical pair measurement: 4.5:1 for text pairs, 3:1 for
  input/ring pairs. `input` is measured on canvas and card; `ring` on five surfaces;
  `border` is a relationship, not a contrast pair.
- Therefore the editor:
  - re-runs `validateTheme()` on every host edit;
  - displays the measured ratio/floor when a pair exists, and `—` otherwise;
  - does not invent a second colour-syntax validator or contrast rule;
  - treats optional state roles as optional, not defects.

### Real examples audited

- `apps/docs/app/custom-themes/CustomThemesGuide.tsx` — `colors` + `radius`.
- `apps/docs/app/tokens/page.tsx` — `code`, `spacing`, `borderWidths`, `zIndex`, `breakpoints`,
  `typography` alongside colours.
- `apps/docs/app/tokens/code/page.tsx`, `apps/docs/app/token-resolution/page.tsx`.
- Generated themes from `generateTheme()` — 21 core colours, no non-colour groups.
- Vanilla/React/Web Components examples consume the same `ThemeDefinition`; no second model.

### Consequences for Increment 3

1. Colors are the primary editor surface, but nested colours must be flattened for display and
   written back without losing their nesting.
2. Non-colour groups are real and must not be coerced into colour editors.
3. Only existing values are editable. Missing optional roles are not added by the editor.
4. The preview consumes colour roles only. Non-colour tokens have no meaningful preview
   mapping and the UI says so rather than faking one.
5. The 21 core roles and 5 group names come from core exports, not from this document.

---

## 2. Implementation

### Host-side editor model

`src/domain/themeEditor.ts` builds a serialized editor view from the selected theme and its
family:

- every string leaf in `tokens`, with an array path (nested keys preserved);
- schema group, label, token type and optional flag;
- current value, baseline/original value, changed flag and presence per mode;
- measured contrast pairs and CSS custom property (verified against core's projection);
- canonical validation issue for the token, when one exists;
- group/total token counts and changed counts.

`editThemeToken()` writes one value through an immutable path update and refuses a path that
does not already exist. `themeEditorGroups` is used for group resets, so a group means the
same thing to the host and the UI.

### Draft lifecycle

- Starting a Generate/Define/preset/existing draft stores a baseline family on the host.
- Edits replace only the current selected variant; the other variant and the project
  inspection are untouched.
- Revert token/group and Reset draft return to the baseline. Reset does not save or touch files.
- A changed generated draft is labelled **customized** and can no longer be saved as a
  reproducible `generateTheme()` call; its default save format becomes `defineTheme()`.
- Save formats are filtered accordingly, and Save is disabled while the draft is invalid.

### Editor UI

`webview/studio/TokenEditor.tsx` replaces the flat token list for drafts:

- collapsible schema groups with token count, validation count, changed count and colour
  summary;
- compact rows that expand into the editor;
- colour rows with swatch, hex/CSS input, native picker for opaque hex values and CSS-value
  text for alpha or other formats;
- non-colour rows with text or number controls according to their schema group;
- contrast ratio/floor, variant-presence badge, original value, revert, copy value and copy CSS;
- search over token path, label and group;
- mode switch that never edits one variant into the other;
- token selection highlights the preview regions that use it; selecting a preview region shows
  the tokens that influence it.

All edits post typed intents. The webview never calls core, never writes a file and never
mutates the inspected project.

---

## 3. Gate

As of 2026-10-23:

### Unit tests

- **Core**: 1022 passed / 83 files.
- **Extension**: 711 passed / 54 files.
  - `test/themeEditor.test.ts` — flattening, schema group IDs, optional roles, contrast pairs, CSS variable names, immutable nested writes, missing-path rejection.
  - `test/tokenEditorModel.test.ts` — search, nested path keys, opaque hex picker, presence labels, swatch summary.
  - `test/studioProtocol.test.ts` — edit/reset intents, malformed path rejection.
  - `test/studioWorkflows.test.ts` — edit selected variant only, reset token/group/draft, missing path refusal, project selection read-only, Increment 2 live preview retained.
  - `test/workspaceView.test.ts` — multi-family registry previews only clicked family.

### Lint and typecheck

- **Lint**: exit 0.
- **Typecheck** (host + webview): exit 0.

### Build

- Host bundle: 416.83 KB.
- Webview assets: `studio.js`, `studio.css`.

### Visual verification (CDP probe at 1400px and 420px)

- 22 tokens across 6 groups (5 schema color groups + 1 radius non-color group).
- Draft strip shows "Customized draft" with "Generate theme", "1 changed", "seed #0ea5e9 · ocean", "View source", "Save draft…".
- 3 save formats: JSON, TypeScript defineTheme, CSS variables. Customized drafts correctly exclude `ts-generate` and `ts-preset`.
- Source generation: 816 bytes of TypeScript.
- Save summary: "1 values changed", "0 issues", "light + dark", "new file", "customized".
- Preview usage: clicking "Primary button" region maps to `primary` and `primaryForeground` tokens.
- Token editing: hex input accepts `#112233`, live preview updates to `rgb(17, 34, 51)`.
- Changed dots: 1 token marked changed.
- Reset draft button present.
- Highlighted regions: 9 preview regions respond to token selection.
- No horizontal overflow at 420px (inspector width = document width = 420px).
- No runtime errors in console.

### End-to-end flows verified

- **Generate → edit → preview → save**: seed `#0ea5e9` / family `ocean` generates a draft; editing `primary` to `#112233` updates the preview immediately; save summary shows 1 changed value; format falls back from `ts-generate` to `ts` (defineTheme) because the draft is now customized.
- **Define → edit → preview → save**: starting from a project theme, editing a token updates the draft; save summary shows the target file and changed count; source tab generates exact TypeScript bytes.
- **Reset draft**: restores the baseline and emits an honest notice; no file is written.
- **Non-color tokens**: `radius.lg` expands with a text control, not a color picker.
- **Light/dark independence**: editing the light variant does not mutate the dark variant.

### Explicit unsupported boundaries

Increment 3 does not include:

- AI generation or arbitrary token creation.
- Arbitrary schema modification or new parser rules.
- Full source-code editing or automatic source rewriting.
- A second preview implementation or second incompatible theme model.
- `theme.config` support or dynamic runtime evaluation.
- Claims that a theme is "active" or "currently used" unless static evidence proves it.
- Webview-initiated filesystem writes. The host remains authoritative for all file operations.
- Cross-variant mutation. Editing light does not affect dark.
- Fabricated contrast values when no valid pair exists.
- Value coercion. Non-color tokens (lengths, shadows, font families) are not forced into color pickers.

### Evidence model preservation

All Stage 1–7 evidence semantics are preserved:

- Theme evidence: `registered`, `partially-resolved`, `catalog-source`, `defined-unregistered`.
- Consumer evidence: `registered`, `partially-resolved`, `dynamic-unverified`, `unresolved`, `registration-only`.
- Static analysis never claims a runtime-active theme.
- Precise labels: `Registered`, `Defined but not registered`, `Catalog`, `Partially resolved`, `Dynamic / unresolved`, `Registration-only`, `Active: not observed`.
- The webview is untrusted. It may request preview/inspect/save/open/reset; the host validates and performs filesystem access, source resolution, generator execution, canonical validation, save operations, and source navigation.
- Project authority has not moved into React. The host remains authoritative for all privileged operations.

