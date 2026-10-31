# Milestone 9 — Themvora Studio UX and theme intelligence

**Status: Increments 1–3 implemented.** This is the Stage 8 plan: productize the
source-discovery engine as the primary extension surface. It records the pre-change audit, the
proposed architecture, and each increment boundary. The evidence model from Stages 1–7 is
preserved unchanged.

---

## 1. Audit before implementation

### 1.1 Current webview architecture

| Piece | Current implementation |
| --- | --- |
| Studio entry | `webview/studio.tsx` → esbuild IIFE bundle, React 19, no runtime imports |
| Studio host | `src/adapters/studioPanel.ts` (`WebviewPanel`, CSP, host state, all intents) |
| Document | Packaged `dist/webview/studio.js` + `studio.css`; strict CSP with `localResourceRoots` limited to `dist/webview` |
| Standalone preview | `src/adapters/previewPanel.ts` — generated HTML with a plain-JavaScript script, driven by `src/domain/previewModel.ts` |
| Workspace sidebar | `src/adapters/workspaceView.ts` — a hand-written document and script, not React |
| Charts/images | None; every colour is a token from the selected theme |

### 1.2 Current React/non-React structure

- The Studio is React but **one 1,758-line component file** with one `Studio` component owning
  every panel. Presentational pieces (`Preview`, `TokenList`, `PresetRow`, `Swatch`,
  `TokenComparison`) are local functions in the same file.
- The Workspace view and the standalone Preview panel are **not** React. They are generated
  documents with inline scripts. The Workspace view is a launcher and list; the Preview panel
  is the full-window theme preview used by the command and the Workspace click.
- Three renderers exist for theme colours: Studio's `Preview`, the Preview panel's script, and
  swatch strips in the Workspace/Sources lists.

### 1.3 Current message protocol

The host accepts a raw `unknown` message and branches on `type`, casting each payload inline.
The webview posts untyped object literals. `model()` returns `unknown`. View interfaces are
declared twice — once in `studioPanel.ts`, once in `studio.tsx` — so a field can drift on one
side without a compile error. Intents currently in use:

`ready`, `selectProject`, `generate`, `draftFromPreset`, `presets`, `selectPreset`, `setMode`,
`preview`, `open`, `openSource`, `copy`, `save`, `serialize`; host → webview `state`,
`fileText`.

### 1.4 Current state model

- **Host-owned:** the selected theme family, selected mode, draft origin/inputs, selected
  preset source, catalog cache, notice, and every source/consumer fact.
- **Webview-owned:** search, origin/evidence filters, inspector tab, token highlight,
  comparison toggle, create drawer fields, save fields, file preview.
- All webview state lives in fifteen `useState` calls inside the single `Studio` component.
- There is no shared selection context; selection is a prop and actions are closures.

### 1.5 Existing preview architecture

- `src/domain/previewModel.ts` builds a canonical `PreviewModel` (variables, roles, contrast,
  readable foregrounds, modes) from resolved themes. The standalone Preview panel consumes it.
- The Studio does **not** use `PreviewModel`. The host sends tokens and variants; the Studio's
  `Preview` component renders directly from those tokens.
- The two surfaces can therefore disagree about which variant is shown and how a theme is
  presented. The Workspace bug in §1.10 is a concrete example: it passes every theme in the
  registry to the standalone panel instead of the clicked family.

### 1.6 What can be reused

- Host authority, the inspection/view-model builders (`studioModel.ts`), the intent names,
  the evidence labels and filters, and the state shape are sound.
- `buildPreviewModel` is the right canonical theme→screen primitive; the Studio needs a
  reusable React surface that consumes the same resolved data.
- `variantViews`, `tokensOf`, `familyOf` and the source/consumer mapping already do the hard
  resolution work in the host.
- The existing CSS already uses VS Code variables for chrome; the *information architecture*,
  not the variable usage, is what reads as a webpage.

### 1.7 What should be refactored

- Split `studio.tsx` into a shell and named panels with explicit responsibilities.
- Replace the duplicated view interfaces with one shared, serialized protocol.
- Replace inline casts with a strict intent parser at the host boundary.
- Extract one `ThemePreview` React surface used by single view and comparison.
- Replace fifteen independent `useState`s with one UI reducer, leaving host state authoritative.
- Move Sources and Consumers out of the theme list into an explicit sidebar view so the theme
  library is primarily visual.
- Make theme rows visual cards with token swatches, family/mode controls, origin, evidence,
  validity and source.

### 1.8 What needs to be introduced

- `src/shared/studioProtocol.ts`: serialized state, host messages, intents and a strict parser.
- Per-theme swatches and per-token contrast floor/requirement in the serialized model.
- A reusable `ThemePreview` component with one dashboard layout for project, draft, preset and
  both comparison variants.
- A VS Code-native application shell: command bar, activity rail, library, canvas, inspector.
- Loading, empty, unsupported and error states with honest next actions.
- A UI reducer (pure, tested) for filters, inspector, drawer, save and highlight state.
- A fixed Workspace `selectProject` path that opens only the clicked theme family.

### 1.9 Proposed component hierarchy

```text
webview/studio.tsx                  mount only
└─ StudioApp                        host state + UI reducer
   ├─ StudioTopbar                  brand, project context, primary actions
   ├─ StudioNotice                  info/error banner
   ├─ StudioBody
   │  ├─ StudioRail                 Themes | Sources | Consumers
   │  ├─ LibraryPanel
   │  │  ├─ ThemeFilters            search, origin, evidence
   │  │  ├─ ThemeFamilyCard         family, modes, swatches, evidence, source
   │  │  └─ PresetCard              catalog identity, swatches, modes
   │  ├─ PreviewWorkspace
   │  │  ├─ PreviewToolbar          selection, mode, compare, validity
   │  │  ├─ ThemePreview            one reusable dashboard surface
   │  │  └─ TokenComparison
   │  └─ Inspector
   │     ├─ TokenPanel
   │     ├─ ValidationPanel
   │     └─ DetailsPanel
   ├─ CreateDrawer                  Generate / Define (foundation only)
   └─ SavePanel                     format, file, destination, exact bytes
```

### 1.10 Preview family bug found during the audit

`workspaceView.ts` receives a clicked theme, finds its registry entry, then assigns
`selectedThemes = entry.themes` and calls `openThemes(selectedThemes, path)`. A registry holds
several families. `buildPreviewModel` chooses the first matching light theme in that array, so
the panel can show a different family than the row the user clicked. The fix is to derive the
clicked theme's family (`meta.family`, or the name without its `-light`/`-dark` suffix) and
pass only those themes. The test fixture needs more than one family to prove it.

### 1.11 Proposed state/store architecture

- **Host state** remains the only authority for selection, drafts, catalog, saving, source,
  evidence and validation. The webview cannot promote a theme or write a file.
- **One reducer** in the webview owns UI-only state:
  `{ query, origin, evidence, rail, inspector, highlight, comparing, create, save, format,
  fileName, destination, fileText }`.
- Selection is read from `StudioState.selected`; every panel derives from it. A small
  selection context avoids prop drilling but does not duplicate the selected theme.
- Effects that need the host (save preview, focus management, escape handling) remain in the
  shell; the reducer stays pure and testable in Node.

### 1.12 Milestone breakdown

1. **Increment 1 — Studio foundation (this change).** Shared typed protocol; application
   shell; VS Code-native chrome; rail-based library; visual theme/preset cards; reusable
   preview surface; source/consumer views preserved; loading/empty/error states; Workspace
   family fix. No full token editor or live generator yet.
2. **Increment 2 — Create.** Four entry points (Generate, Define, Start from preset, Start
   from existing), a proper draft inspector, and live generate → resolve → validate → preview.
3. **Increment 3 — Define editor.** Grouped token editing with immediate canonical validation
   and preview, connected to the source representation.
4. **Increment 4 — Intelligence.** Preview→token mapping, richer validation context and safe
   fixes, comparison modes (current/preset/generated/before), integration-aware guidance.
5. **Increment 5 — Implementation handoff.** Generated patch proposals for “Use in my
   project”, review/apply through the host, and post-apply rescan.
6. **Increment 6 — Full gates and documentation.**

---

## 2. What Increment 1 shipped

### Typed contract

`src/shared/studioProtocol.ts` now owns the serialized state, host messages and intents.
`parseStudioIntent()` is the only entry point for webview messages; it accepts only known
shapes and drops malformed payloads before a handler sees them. The host's `model()` returns
`StudioState`, not `unknown`, and the webview imports the same types. The duplicated view
interfaces are gone.

The project profile is now part of the header: the Studio receives the detected framework and
package manager through `profileFor`, and says `Unknown`/`unknown` when no profile is
available. It never guesses.

### Application shell

`webview/studio.tsx` is now a mount. The UI is split into:

| File | Responsibility |
| --- | --- |
| `studio/StudioApp.tsx` | host bridge, UI reducer, topbar, notice, status bar, empty/loading states |
| `studio/LibraryPanel.tsx` | activity rail; project/catalog/preset cards; sources; consumers |
| `studio/PreviewWorkspace.tsx` | selection toolbar, modes, comparison, save panel |
| `studio/ThemePreview.tsx` | the one reusable dashboard surface |
| `studio/Inspector.tsx` | tokens, validation and provenance |
| `studio/CreateDrawer.tsx` | Generate/Define draft entry points |
| `studio/labels.ts`, `themeGroups.ts`, `uiState.ts`, `host.ts` | pure presentation helpers, grouping and reducer |

The shell uses VS Code variables throughout: activity bar, side bar, buttons, inputs, lists,
badges, status bar, focus rings and scrollbars. The preview is the only place a theme's own
colours appear.

### Library

- Project themes are visual cards: token swatch strip, family, modes as selectable chips,
  origin, evidence, validity, source and consumer count.
- Catalog-origin themes in the registry are a separate **Catalog themes** section, not
  "Project". Presets remain a third, read-only section. The header and status bar use the
  host's project/catalog counts.
- Sources and Consumers moved behind the rail, so the theme list is the primary content while
  every Stage 1–7 fact remains available.
- Selecting a mode chip or card posts the same host-owned `selectProject` intent as before.

### Preview

- One `ThemePreview` component renders the single view and both halves of comparison.
- It is a dashboard with navigation, summary cards, chart, activity, table, form, status roles
  and a side card — all built from the selected tokens, no screenshots.
- Token highlighting outlines each region influenced by that token.
- Light/dark comparison still requires two valid variants; the comparison table marks values
  that differ.
- Container queries adapt the dashboard to the canvas width; the shell adapts at 1180, 980,
  640 and 430 pixels.

### Inspector and states

- Token rows show value, contrast ratio, the measured floor in the tooltip, copy value and
  copy CSS. Selecting a row highlights its preview regions.
- Validation is visual and actionable: schema issues and contrast failures are cards with the
  affected token, current value, measured ratio and required floor; selecting one moves to the
  token. The banner distinguishes valid, valid-with-warnings and invalid.
- Details is grouped into Identity, Source, Generation and Registration; `Active now` remains
  “not observed”.
- Added a skeleton loading shell, no-folder state, no-project-theme state, no-match state,
  no-source/no-consumer states, invalid-theme canvas and error notices.

### Fixed during the audit

Clicking a theme in the Workspace sidebar passed **every theme in the registry** to the
standalone preview. `buildPreviewModel` then picked the first light theme, which could belong
to another family. `workspaceView.ts` now resolves the clicked theme's family with the shared
`familyOf()` helper and passes only that family. A multi-family registry test covers it.

### Verification for this increment

- Core: 1022 tests (83 files).
- Extension: 681 tests (52 files), including the new protocol, reducer, grouping and
  multi-family preview tests.
- Visual harness: the real webview bundle and CSS were mounted with a mock `acquireVsCodeApi`
  and measured through CDP at 1400, 1000, 700 and 420 CSS px. `documentElement.scrollWidth`
  equalled the viewport at every size; no runtime errors.
- Interaction probe: token selection produced 4 highlighted preview regions; comparison
  rendered 2 panels and 22 table rows; Sources showed 3 files; Consumers showed 4 uses; the
  Create drawer, Save panel and exact-file preview opened; preset and mode selection posted
  typed intents.
- State probe: no-folder, empty-library, empty-canvas and loading-skeleton states rendered,
  and no errors were recorded.
- Full build, VSIX verification and host suite are recorded in §4 after the final package.

### Deliberately not in Increment 1

The free-form token editor, live generator controls, Start from Existing, the four comparison
modes, runtime integration guidance and generated patch proposals are the next increments. The
source-discovery evidence model is unchanged.

---

## 3. Increment 1 acceptance

- Existing Studio behaviour and evidence semantics are preserved.
- Host ↔ webview messages are typed and webview intents are validated before use.
- The Studio shell uses VS Code theme variables and keyboard conventions; it is visibly
  distinct from the previous flat inspector.
- Project themes are primary visual objects with family, modes, swatches, origin, evidence,
  validity, source and consumer count.
- Presets remain read-only catalog objects and are not presented as project registrations.
- One `ThemePreview` surface drives single and comparison rendering.
- Sources and Consumers remain reachable from the new rail.
- Loading, no-project, no-theme, invalid and unsupported states are explicit.
- Clicking a project theme in the Workspace previews that family, not the registry's first.
- Unit, typecheck, lint, build, VSIX and host suites remain green.

### Not in Increment 1

- Token editing and live generator controls.
- New mutation paths or integration patch application.
- A second theme model, project execution, network access or runtime-active claims.

---

## 4. Increment 1 gate

- Core: **1022 tests / 83 files**.
- Extension: **681 tests / 52 files** (including protocol, reducer, grouping, profile and
  multi-family preview tests).
- `pnpm lint`: exit 0.
- Both extension typechecks: exit 0.
- Build: host bundle **396.89 KB** (406,412 bytes); webview `studio.js` 279,598 bytes and
  `studio.css` 33,040 bytes.
- VSIX: **65 files, 279.16 KB**; `verify-vsix` **13/13** self-contained.
- Extension-host suite: **23/23**.
- Package audit, export inventory (24 packages), generated API reference (56 files, no drift),
  breaking-contract, JSDoc and snippet audits pass.
- Dependency audit: extension clean; the same six **pre-existing** `@themvora/cli`
  init-adapter violations remain, unrelated to Increment 1.
- Visual: no horizontal overflow at 1400/1000/700/420 CSS px; no webview runtime errors.
- No release, publish or version bump occurred.

---

## 5. Increment 2 — Create and live generation

### Four entry points

The New Theme drawer now offers all four paths:

| Entry | Behaviour |
| --- | --- |
| **Generate theme** | Seed, family, style and code-token inputs; creates a generated draft. |
| **Define theme** | The same palette, installed as a `defineTheme()` draft. |
| **Start from preset** | Lists the canonical catalog with swatches; copies a family into a define draft in one action. |
| **Start from existing** | Lists the project-defined families; copies one into a define draft without touching the source or its registration. |

Presets and existing themes are copied by the **host**: the webview sends an id or
`path`/`name`, the host resolves it through the inspection or catalog, installs the family and
posts the new state. The webview cannot invent a theme or read a file.

### Live generation

`previewGenerate` is a read-only host intent. The drawer debounces input changes by 250 ms,
sends a sequence number, and the host:

1. validates the seed and normalizes family/style;
2. calls the bundled `generateTheme()` once, through the same helper as Create;
3. resolves both variants and their tokens/contrast;
4. validates every generated variant;
5. replies with `draftPreview { requestId, result }`.

The webview ignores stale replies. No draft, selection, file or project state changes until
the user chooses Create; the preview is explicitly labelled **Live preview · not saved**. A
bad seed returns a sentence instead of a broken canvas, and Create stays disabled until the
preview is valid. The drawer renders the real `ThemePreview` surface with a Light/Dark switch.

### Draft inspector and save safety

- The canvas shows a persistent **Unsaved draft** strip with the workflow, the source it was
  copied from, and the generation inputs. A valid draft can open Save directly from the strip.
- Draft provenance is preserved: `Project · ocean` for a copied project family,
  `Preset · oat` / `Brand · …` for a catalog copy. A copied draft has no source file, because
  it is not that file's definition.
- Save formats follow the draft's origin: a define draft copied from a preset/project offers
  JSON, `defineTheme()` and CSS — not a `generateTheme()` file it cannot reproduce.
- The original theme, registration evidence, source and consumers are unchanged by copying.

### Verification

- New host tests: live preview resolves a valid pair without installing a draft; invalid seed
  fails clearly; preset-id and existing-theme drafts have the right origin/workflow/source and
  leave the project themes unchanged.
- New protocol/reducer tests: the three new intents and the four Create entries/mode state.
- Visual harness: 4 entry cards, 6 preset choices, 1 existing family; live preview valid,
  21 roles, 11/11 contrast pairs. Drawer 620×708 at 1400, 404×826 at 420, no horizontal
  overflow, no runtime errors.
- Short 504×490 viewport: the workspace keeps a 640 px minimum and scrolls instead of
  collapsing the canvas.

### Increment 2 gate

- Core: **1022 tests / 83 files**.
- Extension: **688 tests / 52 files**.
- Lint and both typechecks: exit 0.
- Build: host **401.24 KB** (410,883 bytes); webview `studio.js` 286,624 bytes and
  `studio.css` 35,246 bytes.
- VSIX: **65 files, 282.35 KB**; `verify-vsix` **13/13**; host suite **23/23**.
- Package/export/docs/contract/JSDoc/snippet audits pass; dependency audit keeps the six
  pre-existing `@themvora/cli` violations.
- No release, publish or version bump.

Increment 3 (the grouped token editor for Define drafts) is the next scope and has not been
started.
