# themvora-vscode

## 0.1.0 — First release

The first published build of Themvora for VS Code. It contains everything
described below: the Theme Studio, theme discovery and inspection, diagnostics
and editor features, draft creation and editing, and the command layer.

The sections below were written as the work landed, so each is still headed
“Unreleased”. They are kept as-is because they record what changed and why, in
the order it changed.

## Unreleased — Saved-workspace analysis

### Changed

- **Project analysis follows saved files, not keystrokes.** Typing in a source
  file used to invalidate the inspection cache and schedule a full workspace
  re-inspection on a 300 ms debounce. In a measured run, twenty keystrokes cost
  twenty whole-workspace analyses (1000 file reads, 340 directory listings, 20
  sidebar repaints); they now cost none. Saves, creates, deletes, renames, folder
  changes and `Themvora: Refresh Project` are what re-read the workspace.
- **The inspection cache is actually consulted.** Its hash check was called with
  an empty map, which failed on the first recorded file and dropped the entry it
  was about to return — so every refresh was a full scan. Invalidation is now
  event-driven: a save drops the cached inspections that read that file, and
  create/delete/rename drop the folders whose inventory moved.
- **Recorded paths are normalised.** A cached path was `C:\app/src/theme.ts`
  (folder `fsPath` plus a `/`-separated relative path) while an event path was
  `C:\app\src\theme.ts`, so invalidation never matched on Windows.
- **One analysis at a time.** Requests that arrive while one is waiting merge
  into it; a request that arrives while one is running cancels it and becomes the
  next run. Duplicate save/watcher notifications for the same write cost one
  analysis and one publish, and a superseded result is never published.
- **`await`ing a refresh means the state is published.** The command's promise
  used to resolve after the work but before the new roots were published, so a
  caller that read `projects` on the next line saw the previous inspection.
- **The profile is read once per publish, and only when it can have moved.** The
  sidebar and the Studio each walked the project for the same profile on every
  change; a theme save no longer re-walks at all.
- **A closed surface does no work.** The Studio panel and the sidebar skip their
  render (and the profile walk behind it) when they have nothing to render.

### Removed

- **`src/services/reactiveFileWatcher.ts`.** Unreferenced since the controller
  took over watching; it registered a second `onDidChangeTextDocument` listener
  and a second file watcher that nothing consumed.

### Fixed

- **`ProjectReader` can no longer read an unsaved buffer.** The controller passed
  dirty documents into the inspection, so "what the workspace contains" depended
  on what happened to be open and half-typed. Editor-buffer behaviour is
  unchanged where it is promised: the Preview follows the buffer it is showing,
  diagnostics follow the buffer being edited, and commands that act on the active
  editor still read it.

## Unreleased — Define Theme token editor

### Added

- **Grouped token editor for Define drafts.** Collapsible schema groups (Canvas, Surfaces,
  Actions, States, Interaction) with token count, validation count, changed count and colour
  summary. Compact rows expand into editors: colour swatch + hex/CSS input + native picker
  for opaque hex, or text/number controls for non-color tokens.
- **Immutable nested token edits.** Editing a token replaces only the current selected
  variant; the other variant and the project inspection are untouched. Missing or new paths
  are rejected.
- **Baseline diffing.** Changed tokens are computed against the draft's original basis
  (generated seed, preset, or project theme). Edited generated drafts become "customized"
  and fall back from `ts-generate` to `ts` save format.
- **Bidirectional preview/token mapping.** Selecting a token highlights the preview regions
  that use it; clicking a preview region shows the tokens that influence it.
- **Live canonical validation.** `validateTheme()` checks presence; `measureThemeContrast()`
  supplies contrast pairs. No fabricated contrast values. Optional state roles
  (warning/info/error) are shown only when present.
- **Revert controls.** Per-token, per-group, and full draft reset. Reset returns to the
  original baseline, not to an arbitrary state. No file is written.
- **Save summary.** Shows changed count, issue count, modes, target file, customized badge.
  Save is disabled when the draft is invalid.
- **Source preview.** Drafts can serialize to exact TypeScript bytes; edits clear stale file
  text.
- **Responsive layout.** Desktop columns, ≤980px stacked independently scrollable regions,
  ≤640px/≤430px refinements, container queries inside the preview.

## Unreleased — Create workflows and live generation

### Added

- **Four ways to start a theme:** Generate, Define, Start from preset and Start from
  existing. Presets and existing project families are copied by the host into unsaved
  `defineTheme()` drafts; neither the source nor its registration changes.
- **Live generation preview.** The Create drawer debounces seed/family/style changes, asks
  the host to generate → resolve → validate, and renders the real preview surface with a
  Light/Dark switch. Sequence numbers discard stale replies. Nothing is installed until
  Create is chosen, and the preview is labelled “not saved”.
- **A draft inspector strip** on the canvas showing the draft workflow, its preset/project
  basis and its generation inputs, with a direct Save action for a valid draft.
- **Draft-aware save formats.** A define draft copied from a preset or project theme no
  longer offers a `generateTheme()` file it cannot reproduce.

### Changed

- Draft provenance now distinguishes `Project · ocean`, `Preset · oat` and `Brand · …`, and
  a copied project draft keeps the producing API when the source recorded one.

## Unreleased — Studio foundation and redesigned theme workspace

### Added

- **A typed Studio contract.** State, host messages and all 13 webview intents now live in
  one shared protocol. The host parses every incoming intent and rejects malformed payloads
  instead of casting `unknown`.
- **A VS Code-native application shell.** Activity rail, project context, theme library,
  preview workspace, inspector and status bar are separate components. Project themes are
  visual cards with token swatches, family, modes, origin, evidence, validity, source and
  consumer count; catalog-origin themes and presets are clearly separated.
- **A reusable dashboard preview.** The same component renders a project theme, draft,
  preset and both comparison halves. It includes navigation, summary cards, chart, activity,
  table, form and status surfaces built only from the selected tokens.
- **Actionable validation.** Contrast cards show the current value, measured ratio and the
  published floor; selecting an issue jumps to the token. Token rows expose copy-value and
  copy-CSS actions.
- **Honest states.** Skeleton loading, no-folder, no-theme, no-match, no-source/no-consumer,
  invalid-theme and error states replace blank panels.
- **Real project context.** The header shows the detected framework and package manager, or
  `Unknown`, from the same profile the Workspace view uses.

### Fixed

- Clicking a project theme in the Workspace sidebar previewed the whole registry, so the
  panel could show another family's first light theme. It now previews only the clicked
  theme's family.

## Unreleased — component source coverage and an interactive Studio

### Added

- **Vue, Svelte and Astro sources are analyzed through their script regions only.** One
  offset-preserving region mask (`sourceRegions.ts`) feeds the existing readers, so
  `<script setup>`, Svelte instance/module scripts and Astro frontmatter contribute
  definitions, imports, catalogs and consumers while template markup is never parsed as
  JavaScript. The Studio labels each definition with its region, e.g.
  `src/components/MyTheme.vue: <script setup>`.
- **Verified template consumers.** Vue `:themes` / `v-bind:themes`, Svelte
  `themes={…}` / `{themes}`, and Astro `config={{ themes }}` / `config={themeConfig}` are
  read through the component import. Svelte's module script and Astro client scripts are
  excluded from template scope; a plain string `themes` attribute is not a collection.
- **Web Components theme attributes.** `<themvora-provider themes="ocean oat">` and
  comma-separated names are recognized in HTML and JSX; absent or empty attributes remain
  `registration-only`. The element's JSON array form takes full theme definitions, so it is
  refused as dynamic rather than interpreted as a name list.
- **Source generation inputs.** A theme produced by `generateTheme()` in project source now
  reports its `generateOptions` (seed, family, style, contrast, algorithm, with-code), not
  just its resulting tokens.
- **Explore / Create / Inspect workflows in the Studio.** Selection drives preview, tokens,
  validation, source, provenance and consumers. The preview is the main surface and shows
  token highlights; validation issues jump to the failing token. Presets stay read-only and
  can be copied into a draft. Generate and Define drafts are explicitly `Unsaved`, save
  beside the source or to a chosen path, and re-scan the project.
- Light/dark comparison appears only when both variants exist, as a side-by-side view and a
  token comparison table.
- Responsive three-region layout: columns at wide widths, independent stacked regions at
  ≤900px, and a wrapping single column at ~420px.

### Fixed

- A definition inside a Vue/Svelte/Astro script region used to be invisible to the scanner;
  it now carries the original file offset and region label.
- An HTML `<themvora-provider>` is no longer read with a JavaScript `themes` prop rule; only
  its real attribute syntax is recognized.

## Unreleased — evidence in the Studio and verified catalog identity

### Added

- **Catalog calls are recognized only through verified import bindings.**
  `readThemeDefinitions()` now accepts `strict`, `bindings` and `namespaces`, and the
  extension passes the verified exports of `@themvora/core`, `@themvora/core/vanilla` and
  `@themvora/nuxt`. A local function called `getPresetThemes` is no longer mistaken for the
  catalog. Aliased, namespace, CommonJS and one-hop re-exported imports all work.
- **Theme Sources** rows expand into per-definition facts: exported symbol, producing API,
  family/mode, validation, registration evidence, importing providers and exact source
  position. An Evidence filter covers registered, unregistered, catalog, partial/dynamic
  and invalid/unsupported.
- **Runtime consumers** now show a sentence stating what was detected and what could be
  traced, the identifiers, resolved files, unresolved names, source position and reason.
- **Details** shows the selected theme's source at its exact line, export binding, producing
  API, registration evidence and consumers, plus “Active now: not observed”.
- **Project counts** separate project-defined themes from catalog-origin presets, using the
  new per-theme `origins` from `loadThemeRegistry()`.
- Navigating to a definition opens the exact position when one is known; the host rejects
  unknown or traversing paths before calling the editor.

## Unreleased — verified runtime consumers

### Added

- **Consumer detection now starts from the import binding.** The generic `themes`-prop
  scan is gone. `ThemeProvider` (React, Next, Next client, Remix, Solid),
  `provideTheme({ themes })` (Angular), the `@themvora/nuxt` module block,
  `new Themvora({ themes })` / `Themvora.init` (vanilla), Web Components registration, and
  verified runtime `.use(pack)` / `.configure({ themes })` calls are recognized only when
  their API resolves to a shipped public export.
- **Evidence levels** on every consumer (`registered`, `partially-resolved`,
  `dynamic-unverified`, `unresolved`, `registration-only`) and on every theme
  (`registered`, `partially-resolved`, `catalog-source`, `defined-unregistered`).
- **One API re-export hop** is followed, and a documented CDN global declared as
  `typeof import("@themvora/web")` is treated as an import binding.
- **Imported theme packs** (`{ name, themes: [a, b] }`) resolve, so `runtime.use(solarPack)`
  attributes the pack's themes.
- The Studio's theme list shows whether a family is registered in source, and the runtime
  consumers section shows the integration, API, names and evidence. No "active" claim is
  made for a defined-but-unused theme.

### Fixed

- The definition-scan marker used the non-existent `getThemePreset` / `getBrandPreset`
  names and missed the real `getPresetThemes` / `getBrandPresets`, so a file whose only
  theme source was a catalog call was skipped.

## Unreleased — cross-file theme relationships

### Added

- **A theme's definition site and its consumers are recorded together.** A provider that
  imports `oceanLight` from `./theme` now attributes that theme to the importing file, so
  the inspection can distinguish "defined" from "supplied to the app". Each theme carries
  `definedIn`, `usedBy`, mode and family.
- **Relative imports are followed across project files**, including one local collection
  (`const themes = [...themvora, ...presetThemes]`) and one re-export hop. CommonJS
  `require` bindings use the same resolver. Bare packages, TypeScript aliases and second-hop
  re-exports are reported unresolved rather than guessed.
- **Providers report how far their names were traced** — `resolved`, `partially-resolved`
  or `unresolved` — with the files they resolved to and the names they did not.
- `readThemeDefinitions()` (core) now reports the declaration a definition is assigned to
  (`binding`, plus `variant` for a generated pair), so an export symbol maps to its themes
  without re-parsing the file.

### Changed

- The Theme Studio's Sources rows show `used by N providers`, and a provider that was not
  fully traced says so.

## Unreleased — CommonJS theme registries are recognised

### Added

- **`require()` bindings resolve through the same model as imports.** Destructured
  (`const { defineTheme } = require("@themvora/core")`), renamed
  (`{ defineTheme: make }`) and namespace (`const kit = require(…)`; `kit.generateTheme(…)`)
  all feed the binding map the reader already takes, so there is one resolver, not a second
  name-matching path.
- A `require()` with a **non-literal specifier** is reported as such, rather than being read
  as "this file does not use Themvora".

### Verified

- `@themvora/core` declares `exports["."].require = "./dist/index.cjs"` and ships that file,
  so CommonJS recognition reflects a real runtime path.
- An agreement test asserts the CJS and ESM forms produce the same `name:family:mode` set.

## Unreleased — aliased and namespaced theme calls are read

### Added

- **`readThemeDefinitions(source, { bindings })`** (core) accepts a local-name → canonical-API
  map. The scanner resolves the identifier at each call site through it, so
  `import { defineTheme as make }` makes `make(...)` a real definition, and
  `import * as kit` makes `kit.generateTheme(...)` a real pair. The source is not rewritten,
  so every reported offset still points into the original text.
- **Namespace bindings** are mapped to `*`: the member name decides, never the object. A
  local `const kit = { generateTheme }` is therefore not a Themvora call.

### Changed

- A file is only treated as a theme source when it imports from `@themvora/*`. Aliased and
  namespaced files are now read rather than reported as unsupported.

## Unreleased — theme API identity comes from the import

### Fixed

- **A local function named `generateTheme` is no longer read as the canonical generator.** A
  file must import from `@themvora/*` before it is treated as a theme source; otherwise it
  is reported as unsupported, with that reason.
- **An aliased import is reported instead of silently missed.** `import { defineTheme as
  make }` calls `make(...)`, which the name-based reader never sees — the file now says so
  rather than appearing to contain no themes.

### Added

- `MILESTONE-8-SOURCE-DISCOVERY.md` — the verified API surface (`@themvora/core` and its
  subpaths, react, web, and the framework packages), the real example paths used as
  fixtures, the four defects in the current scan, and the increments that follow.
- `test/publicApi.test.ts` pins the surface the recognition rules depend on, including that
  `getPresetTheme` does not exist.

### Corrected

- The audit's first revision claimed there was no `Themvora` class. There is: it is exported
  by `@themvora/core/vanilla` (with `generateTheme`) and used as `new Themvora()` in
  `examples/apps/vanilla-js/src/main.ts`. The root entry does not export it, which is what
  the first probe checked.

## Unreleased — discovery that reports what it could not read

### Fixed

- **A theme that failed to generate disappeared without a word.** `readThemeDefinitions`
  reported the failure, and `inspectProject` threw the report away whenever the file also
  yielded themes. A file with two `generateTheme()` calls and one bad seed looked like a
  project with one theme — which is exactly how it was read. Reader problems now travel on
  the registry entry (`problems`) and the Studio lists them per file, with the reason.
- **The same family discovered in two files was counted twice.** A presets module and the
  theme module that re-exports it both resolve `oat-light`/`oat-dark`; the library and the
  project count now see one family, one entry per mode.

### Added

- **The Studio lists its sources**: each file, how many themes it contributed, and any call
  it could not read. Clicking a path opens the file.
- **Provider usage is detected, framework-independently.** `themes={…}` (JSX) and
  `themes: […]` (the object Vue, Svelte and Angular pass to `provideTheme`) are matched as
  a *prop*, not an API, and the names inside are reported under "Provided to the app". The
  extension reports the identifiers rather than pretending to resolve a spread.

## Unreleased — the packaged artifact is verified, not assumed

### Added

- **`pnpm verify:vsix`** (`scripts/verify-vsix.mjs`) asserts the archive is self-contained: `main`
  resolves inside it, no `node_modules` ships, the host bundle has no bare `@themvora/` import, the
  webview assets are present, the manifest still contributes the Studio command and the Activity Bar
  view, and source/tests/config are absent. `test:host:vsix` runs it before the host pass.
- The import check is line-anchored on purpose: the bundle contains
  `import { … } from "@themvora/core"` as a **string literal** it writes into saved theme files, and
  a naive regex reported that as a dependency leak.

## Unreleased — a top bar that holds together when narrow

### Fixed

- **The breadcrumb collided with the search field at narrower widths.** `.crumb` could not
  shrink below its content, so the two groups met with no gap. It now shrinks, the controls
  take the remaining row, and when they no longer fit they wrap to a row of their own.
- **The wrapped row left an empty gap.** The controls group now spans the row and the search
  grows into the free space, instead of being pinned right against a blank half-row.

## Unreleased — readable badges, dark included

### Fixed

- **The "Live" badge was hard to read on dark themes.** It was still a filled success pill,
  so its label sat on a mid-tone green at 0.68em. It now uses the same tinted treatment as
  the table badges — an 18% success wash over the card, a border in the success hue, and the
  label in `card-foreground` — which reads the same in both modes.

## Unreleased — readable status badges

### Fixed

- **The "Pending" badge was hard to read.** A filled pill puts its label on a mid-tone
  colour; when a theme's `accent` is a pastel, dark text lands at roughly 4.5:1 and looks
  washed at 0.76em. Badges are now **tinted**: an 18% wash of the status hue over the card,
  a border in the status hue, and the label in `card-foreground` — body-text contrast, with
  the colour carried by the tint and border instead of the fill.

## Unreleased — selecting a project theme selects that theme

### Fixed

- **Clicking a project theme previewed a different one.** `selectProject` treated *every*
  theme in the registry file as the selection's family. A file that defines `oat` and
  `berry` therefore resolved to whichever light theme came first, so the Studio, the
  variants and the preview all showed `oat` while `berry` was highlighted. The family is
  now matched on `meta.family` — falling back to the name without its `-light`/`-dark`
  suffix — so only the clicked theme's own variants travel with it.
- The fake host gained `asWebviewUri`, without which the Studio panel could not be driven
  in a test at all.

## Unreleased — preview polish

### Changed

- **"Theme Kit" is gone.** The product is Themvora; the sub-brand tag in the sidebar and the
  footer wording are removed, and a test now fails if the name creeps back.
- The **semantic roles** panel has space above it instead of butting against the table.
- The **mode buttons** carry a border and a card surface, so they read as controls rather
  than as flat text.
- The **count beside a nav item** is a pill badge rather than loose digits.

## Unreleased — the preview, finished

### Fixed

- **Badges and buttons could be unreadable.** A theme's `successForeground` is chosen for
  `success` as the generator sees it, but a brand theme can pair a light green with
  near-white text — which is what made the status pills invisible. The model now carries a
  `readable` map: for every filled surface, the best of the theme's **own** foreground
  candidates (`*Foreground`, `foreground`, `background`, `cardForeground`) by measured
  contrast. No colour is invented, and a surface is never worse than the theme's declared
  pairing. The document receives them as `--on-*` properties.
- **The chart collapsed to `min-height`.** The bar heights live in classes because the CSP
  drops inline `style` attributes; a stylesheet rewrite had dropped the classes. Restored,
  with a note at the rule.

### Changed

- **The preview is a branded product page**: a hero band tinted from the theme's primary,
  stat tiles with an accent spine, gradient bars with a highlighted peak, a hoverable table,
  a restyled semantic-roles list, and a Themvora Theme Kit footer. All colour comes from
  tokens, including the shadows and gradients (via `color-mix` on token values).

## Unreleased — lint coverage and the Studio keyboard pass

### Added

- **TypeScript lint coverage.** `eslint.config.mjs` now lints `packages/vscode` — extension host,
  webview and tests — with `@typescript-eslint/parser` and the plugin's recommended rules.
  The blanket `packages/**` ignore was the reason the extension was never linted; it is
  replaced by explicit `files` scoping, and `apps/**` stays ignored because its output is
  generated. Verified by introducing a deliberate unused binding in `src/` and watching
  `pnpm lint` fail, then pass once removed.
- **Keyboard and focus behaviour in the Studio.** Escape closes the generation drawer and the
  save row; focus moves into the seed field when the drawer opens and returns to the
  "New theme" button when it closes; both tablists use roving `tabIndex` with Left/Right
  arrows; the selected theme carries `aria-current`; the drawer is labelled
  `aria-modal="false"` because it does not block the page.

### Fixed

Lint found eight dead bindings left behind by earlier refactors — unused imports in
`workspaceView` and `generateTheme`, an unused `projectRootOf` helper, an unused `Uri` import
in a test — and one genuine `require-atomic-updates` in the mode switch, which now captures
the current selection before the `await`.

## Unreleased — the preview becomes a dashboard showcase

### Changed

- **`Themvora: Preview Theme` now renders an application dashboard**, not a list of
  sections: a sidebar with an active item, a top bar with breadcrumb, search, range
  segments and actions, four theme-fact tiles, a revenue chart, an activity feed and a
  customer table with status pills. Every colour comes from the selected theme's tokens;
  the chrome is still VS Code theme-aware.
- **The mode toggle moved into the top bar with sun and moon icons**, alongside the theme's
  name, family, contrast and mode in the breadcrumb.
- The four tiles report **theme facts** — colour roles, family, mode, contrast — rather
  than invented revenue figures, and are filled from the same model as everything else.

### Fixed

- **Inline `style` attributes were silently dropped.** The preview's CSP allows only
  nonced `<style>` blocks, so a bar chart written with `style="height: …"` collapsed to its
  `min-height`. The heights are classes now. Any future markup styling must follow the same
  rule.

## Unreleased — real light/dark comparison

### Added

- **"Compare modes" in the preview toolbar** renders both variants side by side, each bound
  to its own theme: the light panel uses the light theme's tokens, the dark panel the dark
  one, with identical components so the differences are the theme's. Panels stack below
  1100px rather than squeezing.
- The selection now carries **`variants`** — every mode resolved by the host. A theme with
  one mode yields one variant, so comparison is disabled with an explanation instead of
  inventing a counterpart. The webview cannot resolve a theme, so a toggle could never be a
  comparison.
- `variantViews()` is exported and tested against a real generated pair: each side's
  `background` is asserted equal to its own source theme's value, and different from the
  other's.

### Verified

- Rendered the built bundle and toggled comparison: `light · generated-light` beside
  `dark · generated-dark`, with the light page and the near-black page each drawn from their
  own tokens.

## Unreleased — the Studio redesign

### Fixed

- **"Catalog reference" wrote JSON.** The host still mapped every unknown format to `json`,
  so a preset saved as a catalog reference produced a JSON document. It now uses the format
  reader that understands all five.
- **The file name appended the raw format** (`themvora-theme.ts-preset`). It takes the
  extension from the format's own default name.
- **A generated draft offered "catalog reference"**, which cannot describe it — the catalog
  does not contain a draft. That option is filtered out for drafts.

### Changed

- **The Studio is a three-region workspace**: a searchable library (project themes by
  family, presets), a preview canvas with its own toolbar (name, origin, variants,
  validation, unsaved), and an inspector with Tokens / Validation / Details tabs.
- **Generation moved into a drawer** behind "New theme", so the preview is no longer pushed
  down the page by a permanent form.
- **Saving is a compact row** revealed by the toolbar's Save action.
- **Tokens are grouped by role** (surfaces, actions, status, borders) with swatches,
  ellipsised values, contrast only where a pair exists, and icon buttons for copy and
  copy-as-CSS.
- The header carries the project and the actions: New theme, Save, Open source, Preview —
  each disabled with a reason when its precondition is not met.

## Unreleased — the blank Studio, and why it shipped

### Fixed

- **The Theme Studio rendered a blank panel.** `FORMATS`, `DEFAULT_FORMAT` and
  `fileNameFor` were referenced but never declared — the app threw
  `ReferenceError: FORMATS is not defined` before React could mount.
- **The sidebar's Validation tab still asked for a selection** the sidebar no longer
  owns. There were two `renderValidation` functions and the stale one won; the project-level
  one is now the only one.
- **The Studio tab's theme list ran together** into one unreadable line. It is a list of
  families with their modes.
- **Token names broke mid-word** in the explorer. The table now sizes naturally and the
  pane scrolls, instead of forcing fixed columns.

### Added

- **`tsconfig.webview.json`**, and `pnpm typecheck` now runs it. The React app was outside
  every typecheck, which is exactly how an undeclared identifier reached a shipped bundle.
  Turning it on immediately found three real type errors.

## Unreleased — families, not variants

### Fixed

- **The save formats were never actually in the UI.** The earlier patch did not apply, so the
  only TypeScript option was `defineTheme` — which is why a preset was written as a
  100-line literal. The Studio now offers: JSON, **generateTheme (minimal)**,
  **defineTheme (custom theme)**, **catalog reference**, and CSS.
- **The format now defaults by origin**: a preset opens on *catalog reference*, a generated
  draft on *generateTheme*, a project theme on *defineTheme*. A preset is never written as
  an inlined copy.
- **Themes were listed per variant.** Light and dark are two halves of one theme, so the
  sidebar and the Studio now list one entry per **family** with its modes.
- **The presets page was one undifferentiated grid.** It now has **Default presets** and
  **Brand presets** sections, and the saved file calls `getPresetThemes()` or
  `getBrandPresets()` according to which one the theme came from.

### Note

- The sidebar's script-parse guard caught a TypeScript annotation I put inside the
  document's plain JavaScript. That guard exists for exactly this.

## Unreleased — save formats that match how themes are really written

### Fixed

- **Sources never opened.** The `Uri` fix had not actually applied — the handler still
  passed a string to `vscode.open`, which resolves to nothing. Now a real `Uri`.

### Added

- **Three TypeScript save formats**, because a theme can be written three ways:
  - **defineTheme (inline)** — the values, wrapped in `defineTheme({ … })`.
  - **generateTheme (from seed)** — `generateTheme({ seed, family })`, re-deriving the
    palette instead of copying it.
  - **getPresetThemes / getBrandPresets / getBuiltInThemes** — the catalog reference,
    chosen by which catalog the preset came from, with a `.filter(family)` line.
  A preset written as a literal is hundreds of lines the package already ships.
- **The sidebar's preset list has a "studio" action**, opening that preset in the Studio.
- **Core reads catalog calls**: `getPresetThemes()`, `getBrandPresets()` and
  `getBuiltInThemes()` resolve to their themes, so a file that references the catalog
  instead of listing themes is now a theme source. A **chained** call
  (`getPresetThemes().filter(…)`) is skipped rather than resolving the whole catalog: the
  subset cannot be evaluated, and reporting 18 themes the file does not use would be wrong.

### Notes

- `getPresetThemes()` returns 18 curated themes, `getBrandPresets()` 10 brand ones, and
  `getBuiltInThemes()` 34 — different catalogs, which is why the saved file must name the
  one the theme came from.

## Unreleased — dashboard preview and the narrow-layout fix

### Fixed

- **The stacked layout painted panes over each other.** Below 900px the grid rows were
  squeezed into the fixed-height container and the panes did not clip, so the token pane
  drew on top of the preview. At that width the page now scrolls as a page
  (`height: auto`, `overflow: visible`, `align-content: start`). Measured, not guessed:
  a diagnostic harness reports `scrollWidth == clientWidth == 420` with no overflowing
  element.
- **The form input sat flush against its buttons** in both previews. The panel's field is
  a group with its own spacing, and the Studio's preview wraps its input and actions in
  one.

### Added

- **A branded dashboard shell for the preview.** The Themvora mark, a "Theme Kit" tag, and
  four stat tiles — colour roles, family, mode, contrast — filled from the same model the
  sections below render, so they cannot disagree. The mark is inline SVG because the
  preview's CSP forbids remote assets.

### Still open

- **Studio polish is partial.** Spacing, column widths and empty states improved; there
  has been no design pass.
- **Lint coverage** for the TypeScript packages is not configured.
- M6's human UX pass and M7's non-Windows gate remain as before.

## Unreleased — Studio fixes

### Fixed

- **"Open Theme Studio" did nothing.** The sidebar's allow-listed commands omitted it, so
  the message was dropped. Both it and `generateTheme` are accepted now.
- **Clicking a source did not open the file.** `vscode.open` was handed a string instead of
  a `Uri`, so nothing happened.
- **The Studio went stale after a source edit.** Only the sidebar subscribed to inspection
  changes; the panel now refreshes from the same notification.
- **`rose-dark` opened as light.** The preview opened the whole family and defaulted to
  light; `openThemes` now takes the selection's own mode.
- **Preset picks stayed on the grid.** Selecting a preset now switches to the Studio tab.
- **Saving always landed in the project root.** The save has two explicit destinations:
  beside the theme source the selection came from, or wherever the user picks.

### Changed

- **Discovery is by API call, not by filename.** Any `.ts`/`.js` file calling
  `defineTheme`, `generateTheme`, `getThemePreset`, `getBrandPreset` or `getBuiltInThemes`
  is a theme source — including `theme.config.ts`, which is no longer reported as build
  configuration when it defines themes. A file using an API this reader cannot interpret is
  listed as `unsupported` rather than omitted. The scan is capped at 400 files.
- The Studio's form group has its own spacing, so the input no longer butts against the
  buttons; the token table's columns were widened so names stop wrapping mid-word.

### Still open

- **The preview panel has not been redesigned into a branded dashboard.** It still renders
  the section list it had.
- **The narrow-width overlap is unexplained.** At ~420px the token pane paints over the
  preview. `minmax(0, 1fr)`, `min-width: 0` and input constraints did not change the render.

## Unreleased — one Studio, one selection

### Changed

- **The sidebar's Studio tab is now a launcher.** It lists project themes (clicking one
  previews it) and hands off to the editor panel. The duplicate selection state — save
  controls, mode switch, token table — is gone, so the two surfaces can no longer
  disagree about what is selected.

### Added

- **Per-token "copy CSS"** in the Studio, using the custom property core projects
  (`exportVariables`), not a naming convention guessed in the extension.
- **Preset filters** for `kind` and `style` alongside search, both from real catalog
  fields.

### Notes

- **The narrow layout overflows and is not fixed.** At 420px the page is wider than the
  viewport, clipping the select and the preview. Switching the grid to `minmax(0, 1fr)`
  and constraining inputs did not change the rendered result, so the cause is still
  unidentified — this is the one known visual defect.
- Verified by rendering the built bundle in headless Chrome at 1280 and 420 px, in light
  and dark variable sets. That caught a missing stylesheet link in the harness and the
  overflow above; it is not a substitute for a real window.

## Unreleased — a React Theme Studio panel

### Added

- **`Themvora: Open Theme Studio`** — a dedicated editor-area panel, reused rather than
  stacked, built with **React**. Header, theme list, rendered application preview, token
  explorer with per-token contrast, generate-from-seed, and save in JSON / TypeScript
  (`defineTheme()`) / CSS variables with a filename you type.
- **A separate browser bundle.** React and React DOM are bundled by `scripts/build-webview.mjs`
  into `dist/webview/studio.js` + `studio.css`. They are **not** in the extension-host
  bundle: the `vscode`-only external gate is unchanged, and the assets ship in the VSIX.
- The Studio document loads only packaged assets, so its CSP needs **no nonce and no
  `unsafe-inline`** — `script-src`/`style-src` are the webview origin, `default-src 'none'`.
- `api.studio.isOpen()`, so a test can assert the panel opened and that a second
  invocation reused it (`tabGroups` does not report webview tabs in the host runner).
- A host check that opens the Studio twice and asserts one reusable panel.

### Notes

- **The sidebar is unchanged.** It is still the compact webview with Overview, Studio,
  Presets, Packages and Validation; the Studio panel is the new large surface. Collapsing
  the sidebar's Studio tab into a launcher is the next step, and the two currently share
  the client, the save path and the preview but not the selection state.
- `react`, `react-dom` and `esbuild` are **devDependencies**: they are bundled into the
  browser asset and never resolved at runtime.

## Unreleased — Studio fixes and generated-pair reading

### Fixed

- **"Save to project" did nothing for two of the three origins.** It required a
  generated draft, so a project theme or a preset left the button inert. Any selection
  can now be written.
- **The file name did not follow the format.** Choosing TypeScript left `.json` on the
  name; the extension now follows the format.
- **A `theme.config.ts` that defines themes was reported as unreadable.** It is read for
  definitions first, and only reported as build configuration when it holds none.
- Presets were listed as separate light and dark rows. One row per **family** now, with
  both modes and a mode switch in the Studio.

### Added

- **`generateTheme({ … })` calls with literal options are read**, in core. That is not
  executing project code: it calls Themvora's own generator with data from the file, so
  a project that generates its pair instead of listing it is now readable. A call with a
  non-literal seed is refused with a reason.
- **Per-token contrast**, measured by core and shown against the paired background.
- **Clicking a preset opens the preview immediately**, with both variants available.

### Notes

- Per-token "copy CSS variables" is still not built; CSS is available as a whole file.
- Preset **filtering** is still search-only — `kind` and `style` are shown as a column,
  not as filters.

## Unreleased — Theme Studio, end to end

### Added

- **The Studio works from all three origins**: a theme in the project, a theme generated
  in memory, and a canonical preset. One selection drives the token list, the validation
  verdict and the preview.
- **Generation with a save you control**: a seed, a format (**JSON**, **TypeScript using
  `defineTheme()`**, or **CSS variables**), a **file name you type**, written into the
  open project folder. "Preview file" shows the exact bytes first.
- **Presets from the canonical catalog**: one row per mode, search over name/label/family,
  real colour swatches, and "open in Studio" — read-only, and the UI says so.
- **Token explorer** with the exact value of every colour token and a copy action.

### Changed

- `Generate Theme` and the Studio now share one write path (`services/saveTheme.ts`), so
  they cannot produce different files.
- A Studio write says plainly that the file is **not** registered in the application.

### Notes

- Per-token contrast results and a per-token "copy CSS variables" action are not built;
  CSS is available as a whole-file format instead.

## Unreleased — the Studio inspects real themes

### Fixed

- **A React project was reported as Solid.** `vite.config` was listed as evidence for
  Solid — Vite is a bundler, not a framework — so every Vite project matched it first.
  `@themvora/*` integration packages are now the strongest evidence and are checked
  first; `vite.config` is evidence of nothing.

### Added

- **A working Studio section** in the workspace view: the project's themes, each with
  its source file, mode, validation verdict and its exact colour tokens.
- **`preview.openThemes(themes, label)`** on the existing preview controller, so a
  theme read from source or generated in memory can use the same panel as a document.
  The Studio's "Open in Theme Preview" sends the selected theme there.
- A "Generate a theme…" action that runs the existing command rather than a second
  generation path.

### Notes

- Generated drafts are not yet listed in the Studio, so generate → Studio-preview is
  not connected; the result appears after it is saved and re-discovered.
- Presets are still not available in the Studio.

## Unreleased — `defineTheme()` definitions are read

### Added

- **Themes defined with `defineTheme()` are read wherever they live**, not only in the
  generated registry. `defineTheme()` returns its argument unchanged, so a literal *is*
  the theme — no evaluation, and nothing to reproduce from its semantics.
- **Core `readThemeDefinitions(source)`**: every `defineTheme({ … })` literal in a file,
  with a line and column, plus the candidates it refused and why.
- Discovered definitions are validated with `validateTheme()` before being offered: an
  invalid one is `malformed` and names the theme and issue, rather than being shown as
  usable.

### Notes

- A `defineTheme(...)` inside a comment or a string is ignored — it is documentation.
  The first implementation matched it and reported a theme that did not exist.
- Files are only considered when their path mentions "theme", and the canonical registry
  is excluded from this pass so its themes are not listed twice.

## Unreleased — the workspace view

### Added

- **A `Workspace` webview view** at the top of the existing Activity Bar container,
  above the project tree. Overview and Packages are built; Studio, Presets and
  Validation are named in the navigation and state that they are not in this build.
- **Framework and package-manager detection** (`domain/projectProfile.ts`): framework
  from declared dependencies then config files, most specific first, with the evidence
  recorded; package manager from the `packageManager` field, then the lockfile.
- **Declared versus installed** for every `@themvora/*` package, resolved from each
  package's own `node_modules` manifest. A declared package that resolves to nothing
  reads "not resolved".
- `ProjectController.onChange`, so a second surface cannot render a stale inspection.

### Notes

- The tree view stays. It is the fastest path to a file, and replacing a host-verified
  surface in the same increment as adding an unproven one would trade a working thing
  for a guess. Both read the same controller state.
- The view's document is inline with a nonce and `default-src 'none'`, as the preview
  panel is; no remote font, script or stylesheet.

## Unreleased — generated registries are read

### Added

- **`themes.ts` is read.** A canonically generated registry now shows its themes in the
  panel instead of "not readable yet", through core's new `loadThemeRegistry()` — a
  static reader, not an execution. The status label for a readable project reads
  **"themes detected"**.
- Failure states are distinguished: a module that is not a generated registry, or that
  computes its themes, is `unsupported`; one that parses but holds an invalid theme is
  `malformed` — the first is our limitation, the second is the user's file.

### Changed

- The scaffold host check now asserts the **themes**, not the absence of them:
  `supported · 10 themes` (2 defaults + 3 preset families × 2 modes + the generated pair).
- `MODULE_REASON` is gone: it said there was no canonical loader, and there is one.

## Unreleased — project state is observable, and a scaffold is verified

### Added

- **`api.projects`** — the extension's own view of each workspace folder, live and
  read-only. A tree view has no read API, so without this neither a test nor another
  extension could ask what the panel actually decided. It is how the host check below
  asserts its result.
- A host check for a **scaffolded project**: it writes the exact file `themvora init`
  produces (`src/themes/themes.ts`, from an `init --dry-run`) and asserts the extension
  finds it, detects the dependency, and reports it as unreadable rather than missing.

### Found

- **A canonically initialized project has no readable theme file.** `init` writes
  `src/themes/themes.ts` and, for React/Vue/Solid/Svelte, no `theme.config.ts` — so the
  TypeScript limitation is the default path, not a corner case. Recorded in the README's
  limitations with the command that shows it.

## Unreleased — the Themvora mark around the file

VS Code owns file icons through one active icon theme, and an extension cannot add
an icon to a single file. These put the mark everywhere around it instead.

### Added

- **An editor-title button** on theme files: the Themvora logo, opening the
  preview. Gated by `resourceFilename =~ /^(theme\.config|themes)\.[cm]?[jt]sx?$/`,
  so it does not appear on `vite.config.ts` or any other file.
- **A contextual status bar item** that appears only while a theme file is focused.
  It offers the preview for a `theme.json` and the Projects panel for a TypeScript
  configuration — the panel, because that file cannot be read.
- **The logo as the preview tab icon** (`panel.iconPath`), which is the one tab in the
  editor whose icon does not come from the icon theme.
- **`media/themvora.svg`** — the mark traced from `media/icon.png`, replacing the
  placeholder droplet. The Activity Bar container, the editor-title button and the
  preview tab all use it, so there is one definition of the logo in the extension.
  It is a trace, not a redraw: the source artwork is a single indigo at three alphas,
  so the geometry was measured (ring 3–124 with a 7px stroke, discs at r18/r15/r11.5)
  and reproduced exactly.
- `themes.*` now covers `.js`, `.mjs` and `.cjs` as well as `.ts`, in discovery, the
  badge and the status bar — matching the editor-title gate.

### Not implemented

- **`contributes.icons`** (a logo glyph in an icon font) needs a designed `.woff`;
  the extension ships SVG and uses codicons. Half-implementing it would put a blank
  glyph in the status bar.

## Unreleased — discovery by name, and theme-file badges

### Changed

- **Theme configuration is found by file name, not by location.** `theme.config.*`
  and `themes.ts` are discovered anywhere in the workspace, so a project that keeps
  them under `src/theme/` is read the same as one with them at the root. Previously
  only the root and two fixed registry paths were probed, and a perfectly wired
  project reported "nothing found".
- The walk is bounded: dependency and build directories are skipped, dot-directories
  are skipped, and depth (6) and file count (5000) are capped, so discovery stays a
  scan of source rather than of the disk.

### Added

- **A `TV` badge on Themvora theme files**, in the Explorer, tabs and Quick Open,
  shown only in a project whose `package.json` declares `@themvora/*`.
  A badge rather than an icon: VS Code provides no API for an extension to add a
  file *icon* — that comes from the user's file icon theme.

## Unreleased — Activity Bar container

### Fixed

- **An empty project said "not found" even when Themvora was installed.** The
  panel showed "No Themvora configuration or theme registry found" for a project
  whose `package.json` declares `@themvora/*` — indistinguishable from "this is
  not a Themvora project". The placeholder now names the packages it found and
  says the registry may be a TypeScript module it cannot read yet, and the
  detected packages are listed beneath it as evidence.

### Added

- **A Themvora panel in the Activity Bar**, with an icon that opens and closes it.
  Previously the project tree was a section inside the built-in Explorer and there
  was no container at all, so there was no icon to click and no way to open the
  view except by finding it in the Explorer.

### Changed

- The project tree moved from `views.explorer` to its own `themvora` container
  (`viewsContainers.activitybar`). The view id is unchanged, so the status bar
  item and `themvora.projects.focus` still work.
- `onView:themvora.projects` added to `activationEvents`, so the extension
  activates when the panel is opened rather than only on a JSON file.

## Unreleased — M6 follow-up: JSONC consistency

### Added

- **`parseThemeJson()` in `@themvora/core`** — the one parser for theme documents, shared by the CLI
  and the editor. Comments and trailing commas are accepted; `JSON.parse` remains the value authority.
- **Masking rather than stripping**: comment and trailing-comma characters are replaced with spaces of
  the same length, line terminators included, so every offset still addresses the original file. For
  valid JSON the masked source is byte-identical to the input.
- Five manual fixtures and `MILESTONE-6-UX-CHECKLIST.md` for the editor pass.
- Documentation: the CLI pages state that JSONC is accepted, and the exit-code rows no longer claim
  `1` means "not valid JSON".

### Fixed

- **The archive shipped `.vscode/launch.json` and `.vscode/tasks.json`.** `.vscodeignore` excluded the
  source, tests and build configuration but not `.vscode/`, so every install carried an F5 launch
  configuration referencing `pnpm` scripts and a `preLaunchTask` that do not exist on a user's machine.
  Now excluded: the archive is 46 files / 103.91 KB instead of 48 / 104.61 KB.
- **`themvora doctor` reported a commented theme file as "unreadable".** It parsed theme files twice —
  once for the generation algorithm, once for the tokens — and only the first used the shared parser.
  The second kept `JSON.parse`, so a valid commented theme passed one check and failed the next, exiting
  `3` while `themvora validate` accepted the same file. Both sites now share the parser, and the failure
  message reads `could not be read or parsed`, since "unreadable" described a file that read fine.

### Changed

- `themvora validate`, `inspect`, `diff`, `explain`, `export`, `migrate` and `doctor` accept commented
  theme files. Widening only — nothing that parsed before stops parsing. `package.json` and other
  manifests stay strict.
- The editor's document parser, locator, diagnostics, hovers and swatches all work from the masked
  source, so a commented `.jsonc` file behaves like its plain counterpart.
- Two locator tests that asserted comments and trailing commas are **rejected** were replaced by four
  offset-accuracy tests, since the locator now receives masked text by design.

### Verified

Core 984 tests (+32), CLI 343 (+9), extension 351 (+13), 18 host checks in dev and packaged modes.
See `MILESTONE-6-JSONC-REPORT.md`. The **editor UX pass is not done** — see the checklist.


## Unreleased — Milestone 6: diagnostics and editor enhancements

### Added

- **Inline diagnostics** for theme documents, from core's own validation. Missing or unusable tokens
  are errors; contrast and quality findings are warnings, because `validateTheme()` still calls those
  themes valid. Each missing token produces exactly one diagnostic.
- **`domain/diagnosticLocator.ts`** — a scanner that maps core's dot-paths to source ranges without a
  JSON-parser dependency, scoped to one theme of a pair.
- **`domain/themeDiagnostics.ts`** — severity and deduplication, measured against the 19-of-20
  overlap between `validateTheme` and `validateThemeLevels`.
- **Role hovers** for `json`/`jsonc`: group, description, current value, intended and restricted uses,
  and contrast pairs when the theme is valid.
- **Colour swatches** for `#rgb`, `#rrggbb` and `#rrggbbaa` reached through `tokens.colors`, with
  write-back that touches only the literal's characters.
- **`activationEvents: ["onLanguage:json", "onLanguage:jsonc"]`** so diagnostics appear on open.

### Changed

- Two assertions in `test/previewTheme.test.ts` now measure the preview's document listener as a
  **delta** rather than an absolute count, because the diagnostic collection also subscribes. The
  property tested is unchanged.

### Verified

338 unit tests (76 new), 17 extension-host checks in dev and packaged modes, bundle gate intact
(`vscode` the only external import, `child_process` 0). See `MILESTONE-6-REPORT.md`.


## Unreleased — Milestone 5: Theme Preview

### Added

- **`Themvora: Preview Theme`** (`themvora.previewTheme`) — opens a webview that
  renders a theme's semantic roles in real UI contexts: page, card, popover, form,
  buttons, accent, success and destructive states, plus a table of all 21 roles
  with their raw values.
  - Source selection prefers the active editor when it already parses as a theme
    document, and falls back to the same dialog the other commands use.
  - Light/dark switching, with the mode always visible and both controls
    keyboard-reachable `<button>`s.
  - Live refresh on edits — including **unsaved** ones — debounced, with a
    revision guard so a slow update cannot overwrite a newer mode switch.
  - An invalid edit keeps the last good render and marks it stale rather than
    blanking the panel or showing a fallback palette.
- **`domain/previewModel.ts`** — the pure theme→screen decision: resolve, select
  the variant, refuse invalid themes, project variables, summarise contrast.
- **`adapters/previewPanel.ts`** — the HTML, the CSP, and the panel lifecycle.
- **`adapters/previewDocument.ts`** — the four-message protocol and its validator.
- **`domain/themeResolution.ts`** — the inheritance helper, shared with the client.
- 69 tests across four files, including one that executes the **emitted webview
  script** against a small fake DOM.

### Fixed (found by the render pass)

- **The form field used `input` as a background.** Core groups `input` with `border` and `ring`
  under "structural and focus affordances", so it is a border colour; the field now uses
  `background` for its surface and `input` for its border. Regression test asserts which token
  lands in which slot.
- **The stale banner did not say the render was stale.** With a full theme still on screen, the
  banner read only the parse error. It now reads `Showing the last valid preview — …` when the
  panel is showing a previous render.

See `MILESTONE-5-HOST-PASS.md` for how the render was produced and what it still does not prove.

### Security

The webview runs under `default-src 'none'; style-src 'nonce-…'; script-src
'nonce-…'` with no `'unsafe-inline'`, no external assets and
`localResourceRoots: []`. Token values are applied through CSSOM, so the
stylesheet never contains user data.

### Changed

- The extension-host check count is 11; the preview check asserts a
  **"Theme Preview" tab exists** via `tabGroups`, which is stronger than "the
  command did not throw" — but still says nothing about how the preview looks.


## Unreleased — inheritance fix

A defect in two shipped commands, found while scoping Milestone 5.

### Fixed

- **`Validate Theme…` reported a theme that uses `extends` as invalid.** The
  document's other themes are now passed to `validateTheme()` via its
  `options.themes`, so a derived theme is validated against its actual base
  rather than in isolation.
- **`Copy CSS Variables` copied only the overrides.** A derived theme is now
  resolved with core's `resolveTheme(themes, name)` before formatting, so the
  clipboard gets the full stylesheet — inherited properties plus the overrides.
- **Contrast for a derived theme read as `0 pairs`.** It is now measured on the
  resolved theme, because `measureThemeContrast()` does not follow `extends`.

Inheritance still lives entirely in `@themvora/core`; the extension only decides
when to call it.

### Added

- Failure modes now surface core's own messages instead of a misleading
  "missing tokens": a missing base reports `Theme "x" is not registered`, a
  circular chain reports `Circular theme inheritance detected`, and two themes
  sharing a name report `ambiguous` rather than letting `resolveTheme()` silently
  pick the first.
- 16 regression tests (`test/inheritance.test.ts`).


## Unreleased — Milestone 4 complete

Milestone 4's remaining two workflows, and the gate.

### Added

- **`Themvora: Browse Presets`** (`themvora.browsePresets`) — read-only. Lists the
  canonical catalog: curated presets first, then brand recipes, each with style
  and character. Selecting one shows its seed, style and modes, and says adding a
  preset to a project is not available yet. Core's `"default"` kind is presented
  as "preset", which is the word the product uses.
- **`Themvora: Compare Themes…`** (`themvora.compareThemes`) — read-only. Reads two
  theme documents and reports semantic differences per mode through core's
  `diffThemes()`. Each document is passed as-is, so a pair is compared as a set
  across both modes rather than being collapsed to one half.
- A tenth extension-host check that runs the comparison against two real files.

### Changed

- `DiffRequest` now accepts `ThemeDefinition | ThemeSet`, because core compares a
  set mode by mode and narrowing to a single theme first would answer a smaller
  question than the user asked.
- The fake host's `showOpenDialog` accepts a **queue**, so a command that prompts
  twice can be tested with two distinct answers. It also records the items and
  placeholder offered to `showQuickPick`, so the catalog list itself is assertable.

### Milestone 4 gate

Every registered command works end-to-end: `Generate Theme…`, `Validate Theme…`,
`Copy CSS Variables`, `Browse Presets`, `Compare Themes…`, `Refresh Project`.
No placeholder is registered. `Validate Project`, `Initialize`, `Add`,
`Migrate` and `Export` remain absent by design.

## Unreleased — Milestone 4, workflow 2

### Added

- **`Themvora: Copy CSS Variables`** (`themvora.copyCssVariables`) — read-only.
  Reads a JSON theme document, validates every theme, and copies the selected
  theme's canonical CSS to the clipboard.
  - Only themes that pass `validateTheme` are offered; the rest are named in the
    error rather than handed over as broken CSS.
  - More than one selectable theme means a quick pick. The first theme is never
    picked silently; dismissing the pick does nothing and reports nothing.
  - No success notification unless the clipboard write actually succeeded.
- **`client.cssDocument()`** and a `cssDocument` capability, delegating to core's
  new `themeToCssDocument()`.
- **`adapters/clipboard.ts`** — the clipboard behind a one-method interface, so
  the command has no direct host global and a test can make the write fail.
- An extension-host check that reads the clipboard back and asserts it holds a
  `:root` block with theme variables. The host can read the clipboard, so this
  proves the copy rather than only that the command ran.

### Changed

- The `CliOperation` name `exportCss` is now `exportFiles`: with the CSS document
  formatter in core, what remains CLI-only about `themvora export` is writing
  files with conflict handling, not formatting CSS.

### Deferred (unchanged)

Initialize, Add Preset/Brand/Seed, project Inspect, project Migrate and
CLI-style Export remain unavailable. Browse Presets and Compare Themes are next.

## Unreleased — Milestone 4 (in progress)

### Added

- **`Themvora: Validate Theme…`** (`themvora.validateTheme`) — read-only. Opens a
  JSON theme document, validates every theme in it through `client.validate`, and
  writes a per-theme report to the **Themvora** output channel: pass/fail, every
  missing token with its path, core's layered diagnostics, and the canonical
  contrast figures.
- A document that is not a theme is an **error**; a theme that fails validation is
  a **warning with a report**, because an invalid theme is a normal state while
  editing.
- The command accepts a file `Uri` argument, so it is scriptable and testable in
  a real extension host.

### Changed

- `parseThemeDocument` / `shapeMessage` extracted into `domain/themeDocument.ts`
  and shared by the project reader and the validate command, so a file is
  described the same way wherever it is encountered. `isRecord` moved to
  `domain/json.ts`; `asUri` moved to `commands/commandArgs.ts` and is shared by
  both commands.
- The extension-host smoke test now derives the expected command list from
  `contributes.commands` instead of a hardcoded list, so a contributed command
  with no registration fails there.

### Deferred (unchanged)

Initialize, Add Preset/Brand/Seed, project Inspect, project Migrate and
CLI-style Export remain unavailable. See `MILESTONE-3-CLI-DECISION.md` and
`MILESTONE-4-SCOPE.md`.

## Unreleased — Milestone 3

The canonical client. The version is unchanged because the package is unreleased
and private; the next changeset decides the number.

### Added

- **`ThemvoraClient`** over `@themvora/core`: `generate`, `validate`, `catalog`,
  `diff`, `exportVariables` and `migrate`. Every operation delegates; nothing
  re-derives a palette, a preset, a validation rule or a migration.
- **`OperationResult`** — one envelope for every call, with `outcome`, `ok`,
  `value`, `warnings`, `errors`, `reason`, `skipped`, `exitCode` and
  `durationMs`. `validation-failed` keeps its value, because a failed validation
  is exactly when the report is useful.
- **Exit-code parity** with the CLI's documented codes (`0`/`1`/`2`/`3`), guarded
  by a test that reads `packages/cli/src/exit-codes.ts` and fails if the two
  drift. `cancelled` and `unavailable` map to `null`: one was killed, the other
  never ran.
- **Capability detection** from the real public exports, per operation, naming
  the missing export when one is absent. The CLI is reported unavailable with a
  reason, not silently omitted.
- **Pre-flight cancellation**: an aborted signal returns `cancelled` before any
  work happens, never a validation failure.
- **`RootSessions`**, per-project serialisation. Two writes into one project
  queue; writes into different projects do not wait for each other.
- `activate()` now exposes the client on `ThemvoraApi`.
- A seventh extension-host check, and `test/host/smoke.cjs` now exercises a real
  client call inside VS Code.

### Changed

- `Themvora: Generate Theme…` generates through the client and writes through
  `RootSessions`. User-visible behaviour is unchanged; the CLI round-trip test
  and the host tests pass unmodified.
- The write path refreshes the project view only after a successful write.

### Deferred

`init`, `add`, `doctor`, `list frameworks` and `export --format css` remain
CLI-only and are unavailable. The evidence and the proposed public API are in
`MILESTONE-3-CLI-DECISION.md`.

## Unreleased — Milestone 2

Read-only project discovery. The version is unchanged because the package is
unreleased and private; the next changeset decides the number.

### Added

- **`ProjectReader`**, a two-method read-only filesystem interface, and
  `inspectProject()`, which classifies every Themvora file in a folder as
  `supported`, `malformed`, `unsupported` or `missing`. The domain has no
  `vscode` import, so the rules are tested against an in-memory fixture and the
  adapter against real directories.
- **The `Themvora` Explorer view**, with one node per workspace folder when
  several are open and the folder's contents inline when one is.
- **A status bar item** reporting the least healthy folder, hidden when no folder
  is open.
- **`Themvora: Refresh Project`**, plus automatic refresh on a relevant save and
  on workspace folder changes. Refreshes are serialised, not coalesced, so a save
  that lands mid-scan is not dropped.
- **`Themvora: Generate Theme…` accepts a seed and a target URI** as arguments, so
  the command is scriptable and testable in a real host without a dialog.
- **Extension-host tests** (`pnpm test:host`, `pnpm test:host:vsix`) that run
  inside a real VS Code against the development path and against the unpacked
  `.vsix`, and **a CLI round-trip test** that feeds a file produced by the real
  command handler to the real CLI.
- A committed `.vscode/launch.json` and `tasks.json`, so F5 works from a fresh
  clone.

### Changed

- Notifications are fire-and-forget. Awaiting `showInformationMessage` blocked the
  command until the user dismissed it — which never happens in a headless host,
  where it looked like a hang.

### Known limitations

- A project's own theme registry (`src/themes/themes.ts`) is found and reported as
  unreadable, not read: there is no canonical loader for it in core.
- `theme.config.*` is not evaluated, because doing so executes workspace
  TypeScript.
- Preset browsing, the preview panel, diagnostics, file icons and every
  CLI-backed operation are still unimplemented.

## 0.1.0

Milestone 1: package skeleton, ESM build, extension manifest, one working
command, and a packaged `.vsix`. Nothing is published.

### Added

- The extension package itself: `"type": "module"`, `engines.vscode: ^1.94.0`,
  a tsup ESM bundle with `@themvora/core` inlined and `vscode` external, and
  declaration output at `dist/index.d.ts`.
- `Themvora: Generate Theme…` (`themvora.generateTheme`) — prompts for a hex
  seed, generates a light/dark pair through core's `generateTheme()`, saves it as
  a `{ light, dark }` document the CLI can read, and reports the canonical
  contrast figures.
- `activate()` returns a typed `ThemvoraApi`; the version is read from the
  manifest at activation rather than duplicated as a constant.
- Unit tests running the real `activate()` and the real command handler against a
  fake `vscode` module, including a drift test that the registered commands match
  the manifest's `contributes.commands`.
- `media/icon.png`, rasterised from the canonical mark by a committed script.

### Known limitations

- A project's own theme registry (`src/themes/themes.ts`) cannot be read yet:
  there is no canonical loader for it in core. Preset and generated themes are
  supported; project themes are not.
- Preset browsing, the theme tree, the preview panel, diagnostics and file icons
  are not implemented.
- CLI-backed operations are not wired yet, so there is no validation,
  inspection, initialisation or export command.
