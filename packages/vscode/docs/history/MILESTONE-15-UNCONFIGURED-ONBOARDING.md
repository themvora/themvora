# Themvora for VS Code — Unconfigured Workspace Onboarding and Capability-Aware UI

## 1. The problem the screenshot showed

A C++ project with no Themvora anywhere opened the sidebar onto a `not found` badge, an
`Unknown · unknown · 0 themes` header, and nothing else. Three things were wrong with that:

1. It did not say **what** was not found, or what to do about it.
2. The **Studio** tab looked functional and opened an editor with an empty library and a canvas
   nothing could drive.
3. `Themvora: Preview Theme` with nothing selected did nothing at all.

The extension was not broken — the workspace simply did not use Themvora. The UI had no way to
say so.

---

## 2. Audit before implementation

The audit covered discovery (`projectController`, `projectProfile`, `inspectionCache`), declared
vs installed package detection, import/theme-source evidence, status calculation, the five
navigation sections, both commands, the empty/unsupported/error states, the message protocol and
the existing setup actions. Two findings shaped the design:

- **Capability was inferred from one signal.** Everything downstream read "did we find a theme
  file?", which conflates a C++ project, a React app with `@themvora/core` declared but not
  installed, and a React app with the package installed but no theme of its own. All three need
  different words.
- **The catalog is not project state.** `Themvora: Browse Presets` reads `client.catalog()` from
  the bundled core. It has never needed a project, so nothing about an unconfigured folder should
  be able to take it away.

---

## 3. The workspace-state model

`src/domain/workspaceSetup.ts` is new and imports nothing but two types. It reads the evidence the
inspector already produced — declared and installed `@themvora/*` packages, registry files and
their themes, provider usage — and returns a verdict plus the evidence behind it.

| Kind | Meaning | `studioEnabled` |
| --- | --- | --- |
| `not-configured` | No convincing evidence of Themvora at all | **false** |
| `dependency-unresolved` | Source or project evidence says Themvora is used; the package is missing, malformed or not installed | true |
| `unsupported` | Theme source exists but this build cannot read it | true |
| `no-project-themes` | The integration is real; the project defines no theme of its own | true |
| `configured` | A recognized integration with readable theme source | true |

`catalogAvailable` is always `true`, stated rather than assumed so a caller cannot disable the
bundled catalog by accident.

Three rules keep the verdict honest:

- **Never one signal.** `not-configured` requires the absence of declared packages, installed
  packages, readable themes *and* provider usage. A missing `theme.config.*` file alone decides
  nothing.
- **Every field is optional.** An inspection assembled by a caller that does not fill in
  `registries` or `packages` is still a valid "nothing found" answer, not an exception. This is
  what keeps an unconfigured workspace out of the error path.
- **Source evidence survives an unresolved dependency.** A provider that passes themes to a
  Themvora runtime with no package declared is `dependency-unresolved`, not `not-configured` —
  the user already wrote the code; telling them to install something is right, telling them
  nothing was found is not.

`WorkspaceSetup` is derived, never stored: `workspaceSetup(inspection, profile)` is called by the
view and by both commands, so there is no state to fall out of date.

---

## 4. The onboarding state

`renderOverview` returns `renderOnboarding(root)` when the verdict is `not-configured`. It carries:

- **`Get started with Themvora`** as the heading.
- What Themvora does — generates, previews and validates accessible light and dark theme pairs —
  and that no integration or recognized theme configuration was found in **`<folder name>`**, so
  the workspace is identified rather than implied.
- The evidence list, one line per thing that was looked for and not found.
- Three links, each a button that posts `{ type: "openExternal", target }` where `target` is one of
  three ids. The URL is resolved in the host.
- A closing note that the preset catalog ships with the extension, so the Presets tab still works.

### The links are ids, not URLs

`SETUP_LINKS` is the only place a destination exists:

| Id | URL |
| --- | --- |
| `framework-guides` | `https://themvora-dev.vercel.app/framework-guides` |
| `npm` | `https://www.npmjs.com/org/themvora` |
| `github` | `https://github.com/themvora/themvora` |

`setupLink(value)` narrows an untrusted value to one of the three ids and returns `undefined`
otherwise; the handler drops anything that is not a known id. The webview therefore cannot open an
arbitrary destination even if it were compromised, and no remote script, image or font is loaded —
verified in the rendered DOM: the page contains **zero** `http(s)` URLs outside the SVG namespace.

Framework guides and npm are styled `primary`; GitHub is secondary, for source, issues and
contribution.

### There is no Initialize Project button

The extension has no approved path to run Themvora's CLI, so a working-looking `Initialize
Project` button would be a lie. The onboarding links to the documentation route instead.

---

## 5. Capability-aware navigation

| Section | Unconfigured | Why |
| --- | --- | --- |
| **Project** | Onboarding | Replaces the empty summary |
| **Studio** | **Disabled**, `aria-disabled="true"`, `disabled`, `title="The Studio needs Themvora in this project. See the Project tab for setup."` | It edits *this project's* themes; there are none |
| **Presets** | Enabled, labelled **catalog-only** | The catalog ships with the extension |
| **Packages** | Enabled | Naming the missing dependency is the useful answer |
| **Health** | Enabled, "unavailable" | An honest unknown beats a false pass |

The disabled tab is a real `disabled` button with `aria-disabled`, so it is announced and skipped by
keyboard and screen readers rather than being a styled lie. Its `title` is the explanation. The view
also falls back to `overview` if a folder loses its setup while the Studio section is showing, so a
stale render cannot leave the user on a locked tab.

Presets gain a catalog-only note — *"these presets ship with the extension and are not read from
this project"* — and the footer says selecting one opens it read-only. Catalog items are never
classified as project themes, and the project-mutating actions stay unavailable.

Health says validation is unavailable and why, instead of reporting a project it never examined.

---

## 6. Guarded commands

### `Themvora: Open Theme Studio`

`studioPanel.open()` checks before creating a panel. A bare open in a folder with no Themvora calls
`onUnconfigured(setup)` and returns — no editor, no webview, nothing to dispose. The host answers
with a warning naming the verdict and offering **Framework Guides** and **Explore npm Packages**,
each opening its fixed URL.

**A preset-scoped open still works.** `open(presetId)` is a standalone workflow: the preset ships
with the extension, so it needs nothing from the project. Only the bare open is guarded.

**Multi-root is any-root.** The Studio shows every folder, so it is enough for one of them to use
Themvora. Blocking because the first folder is unrelated would hide a configured project sitting in
the second one.

### `Themvora: Preview Theme`

The controller gains `onNothingToPreview`, called when there is no argument, no theme in the active
editor and the picker was dismissed. The host then picks the wording from the verdict:

- **Unconfigured** — a warning that no theme is selected *and* no setup was detected, offering the
  setup links.
- **Otherwise** — an information message offering **Browse Presets**, which runs the existing
  catalog command.

A canonical preset or a generated draft is never rejected for not being registered in the project:
`openThemes` takes resolved themes and a label, and that path is untouched.

Neither command throws for an expected state, and neither reports success when nothing happened.

---

## 7. Tests

`test/workspaceSetup.test.ts` — every state transition:

- unrelated project, no evidence → `not-configured`, Studio locked, catalog available
- package declared but not installed, with themes → `dependency-unresolved`, source kept
- source imports a Themvora API, package missing → `dependency-unresolved` (not "not configured")
- package installed, no readable themes → `no-project-themes`, Studio still enabled
- valid registry with themes → `configured`
- provider usage with no package → `dependency-unresolved` with the provider evidence intact
- `SETUP_LINKS` are exactly the three approved URLs; `setupLink` rejects anything else

`test/workspaceView.test.ts` — a folder with no Themvora is `not-configured` with the Studio
locked and the catalog available; a configured project keeps its Studio; the document carries the
onboarding copy, the `openExternal` message and the host-driven `studioEnabled` check.

`test/studioOnboarding.test.ts` — a bare open in an unconfigured folder explains instead of
creating a panel (and creates nothing); a named catalog preset still opens; a multi-root workspace
with one configured folder opens normally.

`test/previewTheme.test.ts` — dismissing the picker in an unconfigured folder warns with the setup
links; the same dismissal in a configured project offers Browse Presets; neither opens a panel.

`test/browsePresets.test.ts` — the full 14-entry catalog is offered in a folder that uses no
Themvora, with no errors.

**927 tests / 72 files** in the extension, **1036 / 86** in core.

---

## 8. Visual verification

Rendered from the real `workspaceHtml` + `buildWorkspaceState` — the actual view document, not a
mock-up — through the existing harness server and headless Chrome.

| Shot | What it shows |
| --- | --- |
| `onboard/light-380.png` | Onboarding, light, narrow (sidebar width) |
| `onboard/dark-380.png` | Onboarding, dark, narrow |
| `onboard/light-1440.png` | Onboarding, light, wide |
| `onboard/dark-1440.png` | Onboarding, dark, wide |
| `onboard/presets-full.png` | Presets, catalog-only note + rows |
| `onboard/section-validation.png` | Health, unavailable state |
| `onboard/dom.html` | The rendered DOM the assertions below were read from |

Read from the rendered DOM, not from the components existing:

- 5 tabs; `tab-studio` carries `disabled`, `aria-disabled="true"` and the explanatory `title`.
- Heading, three evidence bullets, three link buttons with accessible labels.
- `type: "openExternal"` present; **no URL anywhere in the document**.
- Health reads *"Project health is unavailable: no Themvora integration was found in this
  workspace."*
- Presets reads *"Catalog only — these presets ship with the extension and are not read from this
  project."*

The disabled-state behaviour and the links were **not** verified merely because they render: the
tab's disabled state is asserted in the DOM dump, and the link destinations are asserted as ids
resolved host-side, with the absence of URLs in the page asserted directly.

---

## 9. Quality gates

| Gate | Result |
| --- | --- |
| `tsc` (host) | pass |
| `tsc` (webview) | pass |
| `vitest` (extension) | 927 / 72 files pass |
| `vitest` (core) | 1036 / 86 files pass |
| `npm run lint` | **pass** — 13 pre-existing errors fixed (see §11) |
| `tsup` + `tsc -p tsconfig.build.json` + `build-webview` | pass |
| `npm run package` | 97 files, 513.8 KB |
| `verify-vsix` | self-contained |
| `release:audit:packages` | 615 checks, 0 failures |
| `release:audit:contract` | the 2.0.0 public-API contract holds |
| `release:export-inventory` | 24 packages in sync |
| `release:jsdoc-audit` | pass |
| `release:snippet-audit` | 0 failures |
| `release:audit:deps` | **16 pre-existing false positives** (see §11) |

Installed into `~/.vscode/extensions/themvora.themvora-vscode-0.1.0` and the installed copy
verified to contain the setup model, the onboarding copy, all three URLs, both guards and the
catalog-only note.

---

## 10. Unconfigured vs installed-with-no-themes

The distinction the whole change turns on:

| | Unconfigured | Installed, no custom themes |
| --- | --- | --- |
| Evidence | Nothing: no declared package, no installed package, no themes, no provider | `@themvora/*` installed (or declared and resolved) |
| Verdict | `not-configured` | `no-project-themes` |
| Project view | Onboarding with setup links | The normal project summary |
| Studio tab | Disabled with an explanation | Enabled — catalog-based preview and creation |
| Studio command | Warning + setup links | Opens |
| Presets | Catalog-only | Catalog + project presets |
| Health | Unavailable | Runs against the catalog theme |

The second column is a recognised Themvora project that has not written a theme yet. It keeps every
capability and falls back to the catalog; only the first column is locked, and it is locked because
there is genuinely nothing project-specific to open.

---

## 11. Pre-existing gate failures found and fixed

`npm run lint` was red on the extension package before this change. All 13 errors were fixed:

- `studioPanel.ts` — 7 × `require-atomic-updates`. Every one is the same shape: controller state
  written after an `await` in a message handler, with no stale read behind it. The Studio is one
  panel per window and handles one message at a time, so last-write-wins is the design, not a lost
  update. A file-scope directive with that rationale replaces the rule for this controller; the rule
  stays on everywhere else. Two already-redundant per-line directives were removed.
- `partialAnalysisReport.ts` — unused `analysisType` parameter, dropped from the function and its
  call site.
- `inspectionCache.ts` — unused `RegistryEntry` import and a dead `InspectionCacheKey` interface.
- `applyPatchSafety.test.ts` — unused `Uri` import.
- `Inspector.tsx` — unused `contrastIssues` local.
- `SurfaceHost.tsx` — an `eslint-disable` naming `react-hooks/exhaustive-deps`, a rule this repo
  does not load, which ESLint reports as an unknown-rule error. Replaced with the prose that
  explains the dependency list.

`release:audit:deps` still reports **16 source-import violations** and is left failing. All 16 are
the same false positive: the scanner matches the *string literals* in
`src/domain/patchProposal.ts` that generate `import { ThemeProvider } from '@themvora/react'` for
the user's own project. They are not imports of this package. `patchProposal.ts` has not been
touched by this change, and changing a release gate's scanner is outside a UX task's scope — so it
is recorded here rather than papered over.

---

## 12. Public API, package and release impact

None. No version bump, no publish, no package metadata change. The extension's exported
`ThemvoraApi` is untouched; `workspaceSetup` and `SETUP_LINKS` are internal to the extension. The
`@themvora/*` package surface, the preset catalog and the Studio's theme-generation semantics are
unchanged.

---

## 13. Limitations

1. **The onboarding copy is English only.** The extension does not localise, and this follows it.
2. **The Studio tab is disabled, not explained in place.** Its `title` is the explanation; a
   tooltip on a disabled button is not reliably announced by every screen reader. The onboarding
   panel is the accessible path to the same information.
3. **The catalog-only Presets note is prose, not a lock.** Project-mutating actions are already
   unavailable in that state, but the note itself is a label rather than an enforcement point.
4. **Multi-root uses an any-root policy.** The Studio opens when *any* folder is configured; it
   does not ask which folder the user meant. The sidebar's per-root tabs are where a specific
   folder is chosen.
5. **`release:audit:deps` remains red** for the pre-existing reason in §11.
6. **The dependency-audit false positive will recur** on any future file that emits framework
   import statements as strings.
