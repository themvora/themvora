# Milestone 8 — Theme source discovery

**Status: Phase 0 complete; Stages 1–7 implemented.** This document records what actually
ships, what the current scan does, and why each earlier increment was not enough. Nothing
below is inferred from a name in a plan document — every row was read from the built
packages in this tree.

---

## 1. Verified public API surface

Read from `packages/*/dist/index.js` and each `package.json` `exports` map.

### `@themvora/core` (`.`, `./vanilla`, `./vite`, `./config`, `./scrollbar.css`)

| API | Exists | Shape | Notes |
| --- | --- | --- | --- |
| `defineTheme` | yes | `(definition) => ThemeDefinition` | **Identity function.** Adds no defaults, resolves no variants. The reader must not pretend otherwise. |
| `generateTheme` | yes | `(options) => { light, dark }` | One argument. Returns a real pair; `meta.family` comes from `options.family` or a default. |
| `getPresetThemes` | yes | `() => ThemeDefinition[]` | 18 entries, families `oat, berry, mint, citrus, cocoa, plum, iris, sky, graphite`. |
| `getBrandPresets` | yes | `() => ThemeDefinition[]` | 10 entries. |
| `getBuiltInThemes` | yes | `() => …` | Exists and is exported; **not** used by the extension today. |
| `getPresetTheme` | **no** | — | The singular form does not exist. Any plan or code assuming it is wrong. |
| `createThemeRuntime` | yes | `(…) => runtime` | Zero-arity signature; configuration is passed in an options object. |
| `ThemeRegistry` / `createThemeRegistry` | yes | class / factory | Canonical registry. |
| `Themvora` (class) | **yes, from the subpath** | `new Themvora()` | Exported by **`@themvora/core/vanilla`**, not by the root entry. This row was wrong in the first revision of this document: a probe of `.` alone reported it missing. `examples/apps/vanilla-js/src/main.ts` imports it and calls `new Themvora()` with no arguments. |

**`@themvora/core/vanilla` exports exactly two names: `Themvora` and `generateTheme`.** A
vanilla consumer is therefore recognised by the *subpath import* plus `new Themvora(…)`, not
by `createThemeRuntime` — which is a root export used for a different purpose.

### `@themvora/react`

`ThemeProvider`, `ThemeScope`, `ThemeInspector`, `ThemeModeButton`, `ThemeScrollbar`,
`createThemeRoot`, and hooks (`useTheme`, `useThemeMode`, `useThemeTokens`, …).

### `@themvora/web` (`.` only)

`defineCustomElements`, `ThemvoraProvider`, `ThemvoraRuntimeConsumer`, `ThemvoraScope`,
`ThemvoraInspector`, `ThemvoraScrollbar`, `ThemvoraSelect`, `ThemvoraToggle`,
`getProviderRuntime`, plus hooks. **The registration entry is `defineCustomElements`, not a
component tag.** A rule that looks for `themes={…}` on a custom element would be inventing
an API that does not exist.

### Framework packages present

`react`, `next`, `vue`, `nuxt`, `svelte`, `solid`, `angular`, `astro`, `remix`, plus
`tailwind` and adapters (`antd`, `bootstrap`, `chakra`, `daisyui`, `mantine`, `mui`,
`open-props`, `shadcn`, `unocss`). Each needs its own verified consumer rule — they do not
share a `themes` prop by default.

---

## 2. Real examples to use as fixtures

| Path | Why it matters |
| --- | --- |
| `examples/apps/react` | `ThemeProvider` with a theme collection. |
| `examples/apps/nextjs` | Provider in a server/client boundary. |
| `examples/apps/vue`, `nuxt`, `svelte`, `solid`, `angular`, `astro`, `remix` | One consumer shape each. |
| `examples/apps/vanilla-js` | `new Themvora()` from `@themvora/core/vanilla`, in `src/main.ts`. |
| `apps/docs/content/api-reference/*.md` | Documented signatures per package. |
| `packages/web` | `defineCustomElements` bootstrap. |

These are the fixtures Phase 7 should use. No invented snippets.

---

## 3. What the current implementation actually does

`readThemeDefinitions(source)` (core) is a **comment- and string-aware literal reader**. It
finds calls by *name*: `defineTheme`, `generateTheme`, `getPresetThemes`, `getBrandPresets`,
`getBuiltInThemes`. It returns definitions plus structured problems.

`inspectProject` (extension) walks bounded source paths, classifies each file, and — since
the fix in this session — carries reader problems onto the entry instead of discarding them
when a file only partly succeeded.

### The four defects that make it insufficient

1. **Identity is spelling, not binding.** A local `function generateTheme()` unrelated to
   Themvora is read as the canonical generator. `import { defineTheme as make }` is missed
   entirely, and `core.defineTheme(…)` (namespace import) likewise.
2. **No consumer trace.** A definition is listed whether or not anything registers it.
   `defined` is reported with the same confidence as `registered`, which is the false
   certainty this milestone exists to remove.
3. **No cross-file graph.** A theme exported from `theme.ts` and imported by `main.tsx` has
   no recorded relationship, so "is this used?" cannot be answered.
4. **Provider detection is a prop regex.** It matches `themes={…}` / `themes: […]`, which is
   right for React and the object form of Vue/Svelte/Angular, but it does not know which
   package the call belongs to, and it cannot see `defineCustomElements` or
   `new Themvora()` at all.

Defects 1–3 are addressed by the increments below: identity now resolves through import
bindings (with the two limits recorded §6), consumers are traced and flagged with a
resolution state, and the graph connects a definition to the file that imports it. Defect 4
was closed in Stage 5 and extended to template markup in Stage 7; no generic `themes`
pattern is accepted from an unverified API.

---

## 4. Plan, with acceptance criteria

Each increment is independently shippable and testable.

### Increment 1 — API contract test (done in this session)

Pin the surface the extension assumes, so a rename or a phantom API fails a test rather than
a user's project. Asserts the five real APIs exist and that `getPresetTheme` does not.

### Increment 2 — Import-binding resolution (Stages 1–2 done)

**Landed:** `readThemeDefinitions(source, { bindings })` takes a local-name → canonical-API
map. The scanner resolves the identifier at each candidate position through that map, so
`make(...)` is read as `defineTheme(...)`, and `kit.generateTheme(...)` is read through a
namespace binding mapped to `*` (the member decides; the object never does).

The source is **never rewritten** — only the name at the call site is interpreted — so every
offset the caller receives still points into the original text.

Also landed: a file is only a theme source if it imports from `@themvora/*`; a local
`generateTheme()` with no such import is reported as unsupported.

**Covered by tests:** aliased `defineTheme`, aliased `generateTheme` (real pair, real
family), namespace member call, a local object with a `generateTheme` method, a local
function of the same name, and a direct import.

### Stage 3 — CommonJS (done)

**Compatibility audited first:** `@themvora/core` declares
`exports["."].require = "./dist/index.cjs"` and that file ships. CommonJS is therefore a real
runtime path, not a syntax accommodation — the recognition is legitimate.

**Landed:** `themeApiBinding` also reads `const { defineTheme } = require("…")`,
`const { defineTheme: make } = require("…")` (renamed via `:`, not `as`), and
`const kit = require("…")` as a namespace. All three feed the same binding map the reader
already consumes, so there is one resolver for imports, aliases, namespaces and requires.

**Bounded:** a `require()` whose specifier is not a literal is its own state — reported as
`unsupported` with "non-literal specifier", not treated as "no Themvora here".

**Tests (6):** destructured, renamed destructured, namespace, a local object with the same
method name, a dynamic `require`, and an ESM/CJS agreement test asserting both forms yield
the same `name:family:mode` set.

**Delivered later:** consumer rules (Stage 5), evidence levels in the UI (Stage 6),
component formats (Stage 7).

### Increment 3 — Cross-file graph (done)

**Landed:** `src/domain/importGraph.ts`, a bounded module graph that never executes or
rewrites source. Comment and string bodies are masked (quotes and offsets preserved), and
imports/re-exports are read from the mask while specifiers are read from the original text.

- ESM forms: named, aliased, namespace, default, side-effect and type-only imports;
  `export { … } from` and `export * from`.
- CommonJS forms the package's `require` condition makes real: destructured,
  `const { defineTheme: make }`, and namespace `require`.
- Relative specifiers only, resolved against the walk with source extensions and directory
  `index` files. A bare package, a TypeScript alias, a declaration file or a missing file is
  reported unresolved — never guessed.
- One local collection (`const themes = [...themvora, ...presetThemes]`) and one re-export
  hop. A second hop is deliberately not followed.
- JSX prose is excluded by a statement-boundary check, so `<p>import …</p>` is not an edge.

**Model:** `@themvora/core`'s `readThemeDefinitions()` now reports the declaration a
definition is assigned to (`binding`, plus `variant` for a generated pair), so an export
symbol can be mapped to the themes it carries without re-parsing the file. Additive and
optional; the existing reader contract is unchanged.

`ProjectInspection.relationships` records one entry per discovered theme with `definedIn`,
`usedBy`, `mode` and `family`. `ProviderUsage` gains `importsFrom`, `unresolved` and
`resolution`:

- `resolved` — every name reached a theme definition;
- `partially-resolved` — some names did, some imported fine but named no theme, or the
  collection/consumer relationship is incomplete;
- `unresolved` — no name reached a theme definition (a bare specifier, a namespace used as
  the value, or no import at all).

A generated registry's aggregate `themes` export is attributed to every theme it carries.
`themvora` and `presetThemes` are **not** attributed from a registry, because the loader
does not retain per-export group metadata; importing them is reported
`partially-resolved`. A namespace import is likewise not read as "every theme".

**Studio:** the Sources rows show `used by N providers`, and a provider whose names were not
fully traced says so (`partially resolved` / `not traced to a theme file`).

**Tests:** 24 in `test/importGraph.test.ts`, 8 in the cross-file block of
`test/inspectProject.test.ts`, and 5 in core's `registry-loader.test.ts`. The acceptance
cases assert a theme defined in `theme.ts` and imported by `main.tsx` carries both paths;
an unresolved name yields `partially-resolved`; a first-hop re-export lands on the defining
file; a collection built from imports resolves; a namespace import and a bare package
specifier do not claim themes; and the real generated-registry fixture attributes its 10
themes through the aggregate `themes` export.

### Increment 4 — Verified runtime consumers (Stage 5, done)

**The generic `themes`-prop rule is gone.** `src/domain/consumers.ts` recognizes a consumer
only when the call site's **import binding** resolves to a verified public export; the rule
then reads that API's real configuration shape. A local `ThemeProvider`, an unrelated
`runtime.use()`, and an arbitrary `themes` prop are not consumers.

#### Verified API matrix

| Integration | Verified public API | Actual theme input | Rule status |
| --- | --- | --- | --- |
| React | `@themvora/react` `ThemeProvider` | `themes` prop (array or identifier) | Implemented |
| Next.js | `@themvora/next` `ThemeProvider`; `@themvora/next/client` `ClientThemeProvider` | `themes` prop | Implemented |
| Remix | `@themvora/remix` `ThemeProvider` | `themes` prop | Implemented |
| Solid | `@themvora/solid` `ThemeProvider` | `themes` prop | Implemented |
| Angular | `@themvora/angular` `provideTheme(options)` | `options.themes` | Implemented; `provideThemeRuntime(runtime)` is adoption only |
| Nuxt | `@themvora/nuxt` module (`configKey: "themvora"`) in `nuxt.config.ts` | `themvora.themes` | Implemented |
| Vanilla JS | `@themvora/core/vanilla` `Themvora`, `Themvora.init`, instance `.use(pack)` | constructor options `.themes`; pack's `.themes` | Implemented |
| Web Components | `@themvora/web` `defineCustomElements`, element classes, `getProviderRuntime`; verified runtime `.use`/`.configure` | Element `themes` attribute (space/comma-separated name list) / runtime methods | Implemented in Stage 7 |
| Vue | `@themvora/vue` `ThemeProvider` | `:themes` / `v-bind:themes` in a `.vue` template | Implemented in Stage 7 |
| Svelte | `@themvora/svelte` `ThemeProvider` | `themes={…}` / `{themes}` in a `.svelte` file | Implemented in Stage 7 |
| Astro | `@themvora/astro` `Provider` | `config={{ themes }}` / `config={themeConfig}` in `.astro` frontmatter scope | Implemented in Stage 7; `theme.config` not executed |

`defineCustomElements()` and importing `@themvora/web` are reported as **registration**
(`registration-only`), never as proof that a particular theme was supplied. A namespace
import is not read as "every theme". Runtime `.use()`/`.configure()` is recognized only on a
receiver traceable to `new Themvora(...)`, `Themvora.init(...)`, a Themvora
`useThemeRuntime()`, or `getProviderRuntime()`; `const runtime = { use() {} }` is not.

#### Rules and bindings

- **JSX providers** — React, Next, Next's client provider, Remix and Solid. The `themes`
  prop is read from the real JSX tag; an absent prop is `absent`, a runtime-only provider is
  `absent` with that reason, and a string/call/conditional value is `dynamic`.
- **Angular** — `provideTheme({ themes })`. A spread options object is dynamic; a call with
  no options is absent (the built-in/transported catalog).
- **Nuxt** — `defineNuxtConfig({ modules: ["@themvora/nuxt"], themvora: { themes } })` in
  `nuxt.config.*`. Identity is the config file role plus the verified module specifier and
  the module's own `configKey`; the block is read statically.
- **Vanilla** — `new Themvora({ themes })` and `Themvora.init({ themes })`. A bare
  `new Themvora()` is `absent` with the verified constructor default (built-in/transported
  catalog), not an invented registration. The constructor instance is then a verified
  receiver for `.use(pack)`.
- **Runtime methods** — `.use(pack)` and `.configure({ themes })` on a verified receiver,
  including `kit.runtime.use(pack)`. An imported `ThemePack` is resolved through a new
  `packs` fact (`{ name, themes: [a, b] }`), so the real `runtime.use(solarPack)` case
  attributes both themes.
- **API re-exports** — one hop is followed for API identity (`export { Themvora } from
  "@themvora/core/vanilla"`). A second hop is not.
- **CDN global** — the Web example declares `ThemvoraWeb?: typeof import("@themvora/web")`
  and destructures `getProviderRuntime` from it. That type-level binding is treated as an
  import, not as a guess from the global's name. An unrelated global is not bound.

#### Evidence semantics

Consumers carry `evidence`:

| Value | Meaning |
| --- | --- |
| `registered` | A verified consumer supplies a statically traced theme/collection. |
| `partially-resolved` | The import or collection is real, but not every name reaches a theme. |
| `dynamic-unverified` | The verified API is used, but its theme value is not statically readable. |
| `unresolved` | The API has no theme input, or no name reached a theme. |
| `registration-only` | The API proves elements were registered; theme supply is not established. |

Themes carry `evidence`: `registered` · `partially-resolved` · `catalog-source` ·
`defined-unregistered`. `catalog-source` comes from a definition whose canonical API was a
catalog call; it is not project-defined merely because the file names a preset. A dynamic
consumer does not mark themes as registered — the association is unknown, and the consumer
says so. `registered` never means "active in a running app"; it means source analysis
established the supply relationship.

#### Fixtures

Positive and lookalike-negative cases use the shipped APIs, and the recognizer is also run
against the real repository examples: `examples/apps/{react,nextjs,solid,remix,angular,
nuxt,vanilla-js,web}`. Examples the current source formats cannot read (`.vue`, `.svelte`,
`.astro`, HTML) are not used to claim a rule.

Stage 5 adds 42 tests in `test/consumers.test.ts` (7 against the real example files) and a
15-test `verified consumer evidence` block in `test/inspectProject.test.ts`. One old
assertion had to change rather than be preserved: it matched `provideTheme` with **no
import**, which is exactly the spelling-only behaviour Stage 5 removes. It is now an
imported-Angular positive plus a local-lookalike negative, so the spelling is still tested —
from the other side.

### Increment 5 — Evidence levels in the model (done; compact UI)

The consumer and theme evidence levels above are serializable fields on the inspection
model. The Studio shows, without a redesign:

- each theme family's evidence (`registered in source` / `not registered` / `catalog`);
- each runtime consumer's integration, API, names and evidence;
- a consumer's reason on hover, and its source location in the model;
- `used by N providers` on each source row.

No green "active" badge is shown for a defined-but-unused theme.

### Stage 6 — Catalog identity and evidence in the Studio (done)

#### Catalog identity is now binding-based

`readThemeDefinitions(source, options)` gained three options: `bindings` (local name →
canonical API), `namespaces` (local namespace → the canonical members it may expose) and
`strict`. In strict mode there are **no name defaults**: a name is canonical only when an
import binding says so. `canonicalAt` resolves both direct calls and namespace members, so
an aliased import and `import * as core; core.getPresetThemes()` work, while a local
function called `getPresetThemes` does not.

The extension's `themeApiBinding` now uses the same module-edge reader as the graph, and
accepts only names in `src/domain/themeApis.ts`:

| Specifier | Verified theme APIs |
| --- | --- |
| `@themvora/core` | `defineTheme`, `generateTheme`, `getPresetThemes`, `getBrandPresets`, `getBuiltInThemes` |
| `@themvora/core/vanilla` | `generateTheme` |
| `@themvora/nuxt` | the core list (`export * from "@themvora/core"`) |

`themeApis.test.ts` holds that table against the shipped modules and the Nuxt source.
Plain, aliased, namespace and CommonJS bindings all feed the same map, and one API
re-export hop is allowed for definitions as well as consumers.

Negative cases are tested: a local lookalike with no import, a lookalike in a file that
imports `@themvora/react`, a lookalike in a file that imports a different core API, and a
catalog name imported from `@themvora/web` (which does not export it) are all refused.

`loadThemeRegistry()` remains **shape-based by contract**: it requires the generated
`themvora` / `selection` / `sourceThemes` exports and resolves presets from `selection`
through the canonical catalog. It does not match a source call by spelling. It now returns
`origins` aligned with `themes`, so the Studio can tell a project definition from a preset
inside the same generated registry.

#### Evidence contract

Consumer evidence (on each verified use):

| Value | Precise meaning |
| --- | --- |
| `registered` | A verified consumer API statically receives a resolved theme/collection. |
| `partially-resolved` | The consumer and import are real, but not every name reaches a theme. |
| `dynamic-unverified` | The verified API is used, but its theme value is not statically readable. |
| `unresolved` | The API has no theme input, or no name reached a theme. |
| `registration-only` | Elements/integration are registered; theme supply is not established. |

Theme evidence (on each definition):

| Value | Precise meaning |
| --- | --- |
| `registered` | A verified consumer supplies this theme (traced). |
| `partially-resolved` | A consumer association exists, but the collection/consumer is incomplete. |
| `catalog-source` | The definition came from a canonical catalog call; consumption is separate. |
| `defined-unregistered` | The theme is defined and valid, with no verified consumer association. |

The nine facts remain distinct, and the UI uses the first honest one:

| Fact | Where it lives |
| --- | --- |
| 1. package declared | `ProjectProfile.packages` in the Workspace view |
| 2. package resolved | `ThemvoraPackage.status` (`installed` / `missing`) in the Workspace view |
| 3. definition found | `RegistryEntry.themes` / `themeSources` |
| 4. theme resolved and validated | `validateTheme()` verdict on the theme row |
| 5. collection assembled | `packs` / `exports` facts from the literal reader |
| 6. traced to a consumer | `ThemeRelationship.usedBy` |
| 7. configured/registered | consumer `evidence: "registered"` |
| 8. selected at runtime | **not established** by static analysis |
| 9. active at runtime | **never claimed** |

`registered` means fact 7. It does not mean fact 8 or 9. A `registration-only` use says
only fact 3–or-registration. `catalog-source` says fact 5, not consumption.

#### Theme Sources view

Each source row shows the path, status, theme count and distinct consumer count. Expanding
it shows the inspection's own sentence, then one line per definition with:

- theme name/mode;
- the export/declaration binding, when the reader recorded one;
- the producing API (`defineTheme()`, `generateTheme()` or catalog);
- validation (`valid` / `invalid`, with the issue);
- theme evidence and the provider files that import it;
- the exact source location when one is known.

The rows are `<details>` so the main list stays compact. Duplicate family+mode entries are
collapsed in the library, but both source rows remain, so a theme re-exported from two files
does not double the library yet retains both relationships.

An **Evidence** filter offers All, Registered in source, Not registered, Catalog,
Partial/dynamic and Invalid/unsupported. Each value maps to typed state; `partial` also
includes a source imported by a partial/dynamic consumer. Preset previews appear only under
All or Catalog, because a preset is never a project registration. The project header counts
project-defined themes separately from catalog-origin themes (`4 project · 6 catalog` for
the generated fixture), so canonical presets do not inflate the project count.

#### Navigation

A theme definition with a known line/column opens at that position through
`window.showTextDocument`. A registry theme with no recorded position opens the known file
and sends **no line**, so no position is invented. The host validates every requested path
against the inspection's own registry/consumer paths and rejects absolute paths, backslash
paths, `..` and empty segments before calling the editor. The webview cannot name an
arbitrary filesystem path.

#### Runtime consumers panel

Each row now states the integration and API, the identifiers at the call site, the theme
files they resolved to, any unresolved names, the source position, the evidence and the
specific reason. Examples of the actual sentences:

- “React ThemeProvider detected; theme collection resolved.”
- “React ThemeProvider detected; theme collection partially resolved.”
- “React ThemeProvider detected; supplied themes could not be determined.”
- “Web Components registration detected; theme configuration not established.”
- “Vanilla JavaScript new Themvora detected; no theme input.”

A local `ThemeProvider`, a local `provideTheme`, and `runtime.use()` on an unrelated object
are not listed at all. A registration-only Web Components import is listed, but never with a
theme association.

#### Details inspector

The existing Details tab now shows the source (clickable at its exact line when known), the
export binding, producing API, mode/variants, saved state, **registration evidence**, the
provider files that use it, and the line “Active now: not observed — this is static source
analysis.” Drafts and presets say “not applicable” rather than borrowing a project state.

#### Stage 6 tests

- Core: strict binding identity (direct, aliased, namespace, unlisted member, lookalike)
  and generated-registry origins.
- Extension: catalog identity (aliased, namespace, Nuxt re-export, four lookalikes, one
  re-export hop, source binding/origin/location).
- `themeApis.test.ts`: the verified table against `@themvora/core`,
  `@themvora/core/vanilla` and the Nuxt source re-export.
- `studioModel.test.ts`: binding/origin/location/evidence, dedupe with both sources,
  project-vs-catalog counts, consumer headlines, stale-result replacement, path safety.
- `studioFilters.test.ts`: every filter, catalog origin when registered, partial consumer
  paths, presets only under All/Catalog.
- `studioNavigation.test.ts`: exact position, no-position fallback, non-positive line,
  traversal/unknown-path refusal, consumer-file opening.
- `studioSelection.test.ts` still proves the selected theme's own family is previewed, and
  that selecting a catalog preset leaves the project's source/consumer facts untouched.
- Package declaration and resolution remain covered by `projectProfile.test.ts` (declared
  with nothing resolved → `missing`; a resolved manifest → `installed`). Runtime use is a
  separate consumer record and never changes those statuses.

### Stage 7 — Component source coverage and the interactive Studio (done)

#### One region abstraction, not four parsers

`src/domain/sourceRegions.ts` normalizes every supported file **once**:

```ts
readSourceDocument(path, text)
// { text, masked, format, regions }
```

`masked` has exactly the same length as `text`. Script and frontmatter content is kept;
everything else becomes spaces except newlines. Every existing analyzer (definitions,
imports, catalogs, consumers) is handed the mask, so every offset, line and column it
reports still points into the original file. There is no virtual `.ts` path, no temporary
file, no second parser and no second theme model. Template markup is never handed to a
JavaScript reader.

| Format | Analyzable regions | Markup recognition | Studio label |
| --- | --- | --- | --- |
| `.ts .tsx .js .jsx .cjs .mjs` | the whole file | JSX tags and imports, as Stage 5 | — |
| `.vue` | every `<script>`; `<script setup>` distinguished | `<ThemeProvider>` tags; component identity from **all** script imports | `<script setup>`, `<script>` |
| `.svelte` | `<script>` and `<script context="module">` | `<ThemeProvider>` tags; only the instance script is template scope | `<script module>`, `<script>` |
| `.astro` | frontmatter `---` plus `<script>` blocks | `<Provider>` tags; only frontmatter is template scope | `frontmatter` |
| `.html .htm` | none | only `<themvora-provider>` | `element` |

Two scope rules matter and are tested:

- **Svelte `context="module"`** bindings are `export`ed by the module, not visible to the
  markup, so the template recognizer resolves tags against the instance script only. The
  module script is still analyzed for definitions and imports.
- **Astro client `<script>`** blocks are analyzed like any script, but they are not template
  scope. A tag in the Astro body cannot see a binding declared in a client script.

Offsets are preserved end to end. A Vue definition on line 40, inside `<script setup>`,
opens at line 40 in the editor and is labelled `src/components/MyTheme.vue: <script setup>`.
`regionAtLine` maps a reported line back to the region that produced it, and `maskToRegions`
is the single masking primitive used by both the file reader and the template scope.

#### Verified template and markup syntax

| Integration | Verified import | Static theme input | Refused / dynamic |
| --- | --- | --- | --- |
| Vue | `@themvora/vue` (or Nuxt re-export) `ThemeProvider` | `:themes="[oceanLight, oatLight]"`, `v-bind:themes`, identifier traced through the script imports | a plain `themes="…"` is a **string** prop, so it is `dynamic`, not a collection; spread |
| Svelte | `@themvora/svelte` `ThemeProvider` | `themes={[oceanLight]}`, `{themes}` shorthand, identifier | a string attribute is not a theme collection; spread |
| Astro | `@themvora/astro/provider.astro` default `Provider` | `config={{ themes: [...] }}`, `config={themeConfig}` (identifier traced), `themes={...}` | a config imported from `theme.config` is reported as build-time configuration and **not executed**; a string attribute; spread |
| Web Components | `@themvora/web` `themvora-provider` element | `themes="ocean oat"` or `themes="ocean,oat"` | any JSON array (the element's array form takes full definitions, not names), `{…}` template expressions, object/array attributes on a JSX element |

The Web Components row was audited against the shipped `<themvora-provider>` element before
the rule was written. `themes` is an attribute that accepts a space/comma-separated list of
names resolved against the catalog, or a JSON array of full theme definitions; it is not a
`themes` prop accepting theme objects, and no `<themvora-theme>` element exists. The name
list is interpreted; the definition array is refused, because interpreting it would grow a
second theme model. A JSON array of names is not the element's syntax — the shipped element
reports it invalid and ignores it — so it is not counted as a theme supply either. An
element with no (or an empty) `themes` attribute is `registration-only` — it proves the
custom elements were defined, never that a theme was supplied.

HTML has no import scope. Its names are matched as **direct names**: a canonical catalog
name resolves to `registered` (the element reads the same catalog), a project-defined name
resolves to `partially-resolved` with `usedBy`, and an unknown name is `unresolved`. No
association is invented.

#### One interpretation, not one per format

The regions feed the same readers as plain JavaScript:

- theme definitions, catalog calls, aliases, namespaces, CommonJS and the one re-export hop;
- the relative import graph, collections and provider bindings;
- the Stage 5 consumer rules for Angular, Nuxt, vanilla and runtime methods;
- catalog identity from `themeApis.ts` (only the verified exports of `@themvora/core`,
  `@themvora/core/vanilla` and `@themvora/nuxt`).

A `.vue` file is therefore not a special case in the model; it is a file whose analyzable
text happens to be two script blocks. The same is true of `.svelte` and `.astro`.

#### The Studio is now an interactive surface

The panel keeps the host as the only authority: the webview sends typed intents, the host
performs every generation, validation, filesystem write, re-scan and editor navigation. It
has a nonce CSP with `default-src 'none'`, no external network and no webview-controlled
filesystem access.

**Explore.** The library groups project themes by family, shows each family's modes,
evidence and validation, lists presets and brands separately, and offers search, a family
filter and an evidence filter. Selecting any row drives every other surface: preview,
tokens, validation, source, provenance and consumers. The project tree is still the host's
host-verified inspection; the webview cannot inject entries.

**Preview as the main surface.** The canvas renders a real sample page (navigation, hero,
card, actions, status roles, input, code block, popover) from the selected theme's tokens.
There is no screenshot, and no preview is invented for an invalid theme: the canvas states
that the theme is invalid and lists the issues instead. Light/dark comparison appears only
when both variants exist, as a token comparison table and a side-by-side option. A token
name in the Tokens tab is a button; clicking it outlines every use of that token in the
preview. A validation or contrast issue is also a button: it selects the failing token,
switches to Tokens and highlights it. Source rows open the exact definition; consumer rows
open the exact use. The host validates every path against the inspection before calling
`window.showTextDocument`.

**Create.** The New Theme drawer offers two workflows:

- **Generate theme** — seed, optional family, style and code-highlighting tokens. The host
  calls the bundled core generator; the draft is shown immediately and is explicitly
  `Unsaved`.
- **Define theme** — the same generated baseline, but saving writes a `defineTheme({ … })`
  literal, the identity form of the shipped API.

A draft carries its workflow, its source (preset/brand, when copied) and its generation
inputs in Details. Saving offers JSON, TypeScript (define and generate forms) and CSS,
writes beside the source or to a picked location, and then re-scans the project. The notice distinguishes
"written" from "registered": a written file is not registered until a provider supplies it.

**Presets are first-class and read-only.** Selecting a preset previews it and says so;
nothing in the project is mutated by browsing. "Create draft" copies the preset into a new
define draft (labelled `Preset · oat` or `Brand · …`), so editing always starts a draft of
its own. A preset is never presented as a project registration, and its origin stays
`catalog`.

#### Responsive layout

At 1400 and 1000 the three columns (library, canvas, inspector) are visible together. At
≤900 the layout becomes three stacked, independently scrollable regions (library 30vh,
canvas 1fr, inspector 30vh) so the preview is not pushed below the fold. At 420 the toolbar,
family rows, preview, token rows and source details wrap without horizontal overflow. This
was measured in a real browser at 420, 700, 1000 and 1400 CSS pixels (CDP device metrics),
not inferred from the CSS: `documentElement.scrollWidth` equaled the viewport at every size.

#### Stage 7 tests

- `sourceRegions.test.ts` (10): Vue script/setup regions, Svelte module/instance labels,
  Astro frontmatter plus scripts, HTML, offset-preserving masks, region lookup, style ranges.
- `markup.test.ts` (9): quoted/braced/unquoted attributes, quotes containing `>`, comments,
  script/style skipping, shorthand, spread.
- `frameworkConsumers.test.ts` (27): real Vue/Svelte/Astro/Web forms, plain-string refusal,
  Svelte module scope, Astro client-script scope, theme.config reason, inline JSON refusal,
  registration-only, direct names.
- `inspectProject.test.ts` (89): all earlier stages plus framework regions (e.g. a Vue
  `<script setup>` definition at its real line), HTML direct names, dynamic values, and
  generation options on source-defined themes.
- `studioModel.test.ts` (14), `studioFilters.test.ts` (8), `studioNavigation.test.ts` (6),
  `studioWorkflows.test.ts` (5): region/generateOptions/evidence mapping, filters, exact
  navigation, define draft, preset→draft, save-and-refresh, mode metadata, invalid issues.
- `studioSelection.test.ts` (4): selection drives preview and leaves project facts intact.
- `themeApis.test.ts` (4): the verified API table against the shipped modules.
- Core `registry-loader.test.ts` (38): strict identities, namespaces, catalog origin,
  generated registry origins and `generateOptions`.

---

## 5. Constraints carried forward

No execution of workspace source, no `eval`, no module loading, no installation. Canonical
generation and catalogs come from the bundled core. A dynamic argument is refused, not
guessed. `defineTheme` remains an identity function in every rule and message.

## 6. Not done

The concrete limits of the completed stages, so a later pass does not mistake them for
omissions:

- **Template expressions are read, not evaluated.** A literal array, an identifier that
  traces through imports/collections, and a `config={{ themes: … }}` object are read.
  Computed expressions, conditionals, function calls, spreads and inline HTML/JSX theme
  objects are `dynamic-unverified`; no theme is guessed from them.
- **Inline Web Components definitions are refused.** The shipped `themes` attribute also
  accepts a JSON array of full theme definitions. This reader recognizes the name-list
  syntax and refuses the definition array as dynamic, because interpreting it would
  duplicate the theme model. The attribute's name list remains fully supported.
- **Vue's `h(ThemeProvider, …)` form is not implemented.** It has no real repository
  example; the verified template form is the supported one.
- **Astro `theme.config` is not executed.** `config={themeConfig}` is reported, with the
  reason that it is build-time configuration. The config module is read only if it is
  itself an analyzed source; nothing is imported or run.
- **The Define workflow starts from a generated baseline.** It saves a `defineTheme({ … })`
  literal, but the Studio is not a free-form token editor; tokens are inspected, not
  rewritten in place.
- **Generated registry groups.** `loadThemeRegistry()` now reports each theme's origin, but
  it still does not expose per-export groups. Importing `themvora` or `presetThemes` from a
  generated registry remains `partially-resolved`; only the aggregate `themes` export is
  attributed. The origin lets the UI label the themes correctly regardless.
- **Registry-loader identity is shape-based.** `loadThemeRegistry()` verifies the generated
  module's `themvora` / `selection` / `sourceThemes` exports and resolves presets from
  `selection` through the canonical catalog; it does not parse an import binding. That is
  its published contract, not the general source reader's identity rule.
- **Second hops.** One theme re-export and one API re-export are followed. A second hop is
  reported unresolved.
- **Local packs.** An imported `ThemePack` resolves through its literal `themes` array. A
  pack or collection declared in the consumer file resolves through that file's own facts
  when it is also read as a theme source; otherwise the name is
  `partially-resolved`/unresolved rather than guessed.
- **`createThemeRuntime({ themes })` and `provideThemeRuntime(runtime)`.** The former is not
  treated as a consumer by itself; the latter is adoption, not supply.
- **Dynamic consumption.** A dynamic value leaves the theme `defined-unregistered` and marks
  the consumer `dynamic-unverified`; no theme is guessed.
- **Package declared/resolved in the Studio.** Those two facts live in the Workspace view's
  project panel (`ProjectProfile`), not in the Studio header. The Studio does not duplicate
  them or merge them into theme evidence.
- **The rendered Studio was checked in a browser, not inside VS Code.** The real webview
  bundle and CSS were mounted with a mock `acquireVsCodeApi` and captured at 420, 700, 1000
  and 1400 CSS pixels; overflow was measured, not eyeballed. The extension-host suite still
  proves the command opens the panel, but the visual pass is not a substitute for a manual
  VS Code walkthrough.

**Fixed during this stage:** the definition-scan marker listed `getThemePreset` and
`getBrandPreset`, neither of which exists, and omitted `getPresetThemes`/`getBrandPresets`.
A file whose only theme source was a catalog call was therefore skipped. The marker now
matches the shipped names, and strict binding identity closes the remaining lookalike hole.

**Gate as of this change:** core 1022 tests (83 files); extension 658 tests (49 files);
`pnpm lint` exit 0; both extension typechecks exit 0; extension build exit 0 (host bundle
394.16 KB, webview 2 assets); VSIX `themvora-vscode-0.1.0.vsix` packaged (63 files,
267.35 KB) and `verify-vsix` passed 13/13 — self-contained; extension-host smoke suite
passed 23/23 in VS Code 1.143.0 (dev mode). `export-inventory` is OK (24 packages, source =
dist = manifest = docs); the generated API reference has no drift (56 files); the
breaking-contract audit is OK (128 checks, 93 removals pinned absent); the package audit is
OK; the JSDoc and snippet gates are OK. The dependency audit passes for `themvora-vscode`;
it still reports six **pre-existing** `@themvora/cli` init-adapter imports
(`@themvora/next`, `react`, `solid`, `svelte`, `tailwind`, `vue`) unrelated to this stage.
No release or version bump occurred.
