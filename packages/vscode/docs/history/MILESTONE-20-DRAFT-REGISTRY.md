# Themvora for VS Code — Host-Owned Theme Draft Registry

A draft used to be a set of closure variables inside the Studio panel. This gives it an identity, an
owner and a revision, so the Preview and the commands can address the same unsaved theme the Studio
is showing.

---

## 1. The audit

Read from the working tree.

**The model, before.** There was no draft model. `createStudioPanel` held:

| Variable | What it held |
| --- | --- |
| `selected` | the concrete `ThemeDefinition[]` the panel was rendering |
| `selection` | the serialisable view, carrying `draftKind`, `draftSource`, `draftInputs` |
| `draftSeed` / `draftKind` / `draftInputs` | how the draft was produced |
| `draftBaseline` | the untouched family, for diff and reset |
| `presetSource` | the catalog entry a copy came from |
| `persistedSelection` | a **project** theme identifier, persisted across sessions |

Nothing had an id. Identity was "whatever the panel currently holds", which is why:

1. **No other surface could name a draft.** `Compare`, `Copy`, `Validate` and `Preview` resolved
   themes through `collectThemeEntries` — project themes, the open document, catalog presets. A draft
   existed only inside the panel that made it.
2. **The Preview held its own copy.** The Studio pushed a resolved `ThemeDefinition[]` into
   `preview.openThemes`/`sync`; the panel rebuilt a model from it. Two arrays, no shared identity, and
   no way to ask "is the panel still showing what I computed?"
3. **A draft died with its view.** The panel is a `WebviewPanel`; disposing it dropped `selected` and
   `draftBaseline`. Nothing survived to be saved, compared or reopened.
4. **Two panels meant two unrelated drafts** with no way to tell them apart.

**How commands selected themes.** `resolveThemeEntry` → `collectThemeEntries`: project themes from
`inspection.registries`, the active editor parsed once in the composition root, then the catalog.
The policy is active editor → single candidate (opt-in) → picker; dismissal is `cancelled`.

**Multi-root.** `controller.roots` is an array; the Studio reads `roots()[0]`; the catalog reads all
of them with root-aware ids (the previous increment).

---

## 2. The registry

`src/services/draftRegistry.ts` — in memory, host-owned, one per window.

```
create(input) → ok | failure        get(id) → ThemeDraft | undefined
update(id, { expectedRevision, … }) list(scope?) → ThemeDraft[]
revert(id, expectedRevision)        markSaved(id, expectedRevision, path)
discard(id) → boolean               detachRoot(root) → number        size()
```

### The record

| Field | Why |
| --- | --- |
| `id` | `draft-<n>`, allocated by the registry. Not the name, family, file, variant or position. |
| `scope` | `{kind:"root", root}` or `{kind:"standalone"}` — never "the first folder". |
| `name` | family-level display name; editable, and renaming does not change the id. |
| `origin` | `generated` / `defined` / `preset` / `project`. |
| `basis` | what it was copied from: `preset` (with the catalog family) or `project-theme` (with the file). |
| `themes` | the concrete `ThemeDefinition[]` — the canonical type, not a second theme model. |
| `modes`, `mode` | every variant it carries, and the one the editor shows. |
| `inputs` | `seed`, `family`, `style`, `contrast`, `algorithm` for a generated draft. |
| `baseline` | the untouched family, for revert and diff. |
| `revision` | monotonic; every accepted mutation increments it. |
| `dirty` | unsaved changes relative to the last successful write. |
| `validation` | `{valid, errors, warnings}` from the canonical validators. |
| `saved` | `{path, revision}` — present only after a successful write. |

Nothing derived is stored twice: token groups, contrasts and preview data are rebuilt from `themes`
by the existing code paths.

### Revision semantics

`revision` is the answer to "is this result still current?". A caller that computed something from
revision *n* passes `expectedRevision: n` back; if the draft has moved, the mutation is **refused**
with `{kind:"stale-revision", expected, actual}` rather than applied. `markSaved` uses the same
guard, which is what stops a stale save proposal from marking newer content as written.

### Lifetime, stated plainly

| Event | What happens |
| --- | --- |
| A webview closes | The draft survives. The panel is a view; the draft is not. |
| The Studio reopens | It resolves the active draft from the registry. |
| The extension host restarts | **Every draft is gone.** Nothing is written to disk or to VS Code storage, and the UI must not imply otherwise. |
| A workspace folder is removed | `detachRoot` turns its drafts into standalone work. The work survives; the association does not. |
| The user discards | `discard` — the only early end, and only an explicit act. |
| A save succeeds | `markSaved` records the path and revision; `dirty` becomes false. The record stays. |

Capacity is 50. On overflow only a **clean, saved** draft may be evicted; if none is, the new draft
is refused with `at-capacity`. A dirty draft is never silently dropped to save memory.

---

## 3. Integration

### Studio (the only writer)

`StudioPanelOptions` gained `drafts`. The panel keeps `draftId` and `draftRevision` and three helpers
— `registerDraft`, `syncDraft`, `draftValidationOf` — and every existing flow now goes through them:

| Flow | Behaviour |
| --- | --- |
| `generate` | Creates a draft (`origin: "generated"`, `standalone`, baseline = the pair, inputs recorded). Pressing Create again **revises the same id**; doing it after a preset copy starts a new one. |
| `draftFromPreset` / `draftFromPresetId` | New draft, `origin: "preset"`, basis records the catalog family, `standalone` scope. |
| `draftFromTheme` | New draft, `origin: "project"`, basis records the source file, `root` scope. |
| `editToken` / `resetToken` / `resetGroup` / `resetDraft` | `syncDraft` — one edit, one revision. |
| `save` | `markSaved` only in the success branch, before `adoptSavedTheme` clears `draftId`. |

### Preview

`openThemes` and `sync` gained an optional `draftId`, and the controller records it
(`currentDraftId()`). The Studio passes it on every sync and on the toolbar preview; a document-backed
preview clears it. Switching light/dark keeps it — same draft, different variant.

### Commands

`ThemeCatalogDeps` gained an opt-in `drafts: () => readonly ThemeDraft[]`. `collectThemeEntries`
appends `draftEntries(...)` after the open document and before the catalog, so a command that falls
back to "the only candidate" still prefers the user's own file.

`ThemeEntryOrigin` gained `"draft"`, with `ORIGIN_LABEL.draft = "Unsaved draft"`; entries carry
`draftId`. The entry id is `draft:<draftId>:<mode>` — the registry id, not the display name, so a
rename does not move the entry.

`Generate Theme` registers the pair before showing it and opens the preview with the id.

**What drafts do not touch.** `projectEntries` is unchanged, so project counts, the library, the
drawer's preset evidence and `Browse Presets` never see a draft. A draft is not a project theme
merely because it has a folder.

---

## 4. What changed in the manifest

Nothing. Eight commands, same ids, same menus. No new contributed surface.

---

## 5. Tests

New:

| File | Count | Covers |
| --- | --- | --- |
| `test/draftRegistry.test.ts` | 18 | stable id across rename and edit; two drafts with the same family and name; two roots with identical paths; standalone vs rooted scope; create/read/update/revert/discard; stale-revision refusal; saved only at the written revision; dirty again after a later edit; detach on folder removal; no dirty eviction at capacity; saved draft evicted before refusing; empty draft refused |
| `test/draftCatalog.test.ts` | 12 | drafts only when asked for; project entries unchanged; presets and drafts distinct; document before draft; no id collision with project themes; two roots kept apart; standalone has no folder; rename keeps the id; pair labelled with modes, single variant without; siblings offered as one set; no silent pick between a draft and a project theme |
| `test/studioDrafts.test.ts` | 12 | generated pair registered once; inputs and baseline recorded; re-generation revises the id; preset copy then generate = two drafts; edit keeps id and bumps revision; preview told the draft id; invalid theme kept as a draft; saved only after the write; failed write leaves it dirty; two panels' registries isolated; no writes while drafting |
| `test/draftCommands.test.ts` | 8 | the draft appears in the copy picker; copies the seed's canonical document; validated with its origin named; compared with a preset; compared with another draft; previewed without stacking a panel; nothing written; dismissal silent |
| `test/previewDraftIdentity.test.ts` | 3 | draft id recorded; forgotten on a non-draft sync; kept across a variant switch |

Existing suites unchanged: `draftRegistry` is additive, and the only edits to existing test files were
the `drafts` option in five panel fixtures.

### Results — current run

| Gate | Result |
| --- | --- |
| Extension unit tests | **1034 passed / 80 files** (was 981 / 75) |
| Core tests | **1036 passed / 86 files** |
| Both typechecks | clean |
| `npm run lint` | clean |
| Build (host + webview) | OK |
| VSIX | 100 files / 533.12 KB, self-contained |
| Extension-host checks (dev) | 23 passed |
| Extension-host checks (packaged VSIX) | 23 passed |

The VSIX gained one file: `dist/services/draftRegistry.d.ts`.

---

## 6. Limitations

1. ~~**Discard has no UI affordance.**~~ **Superseded by the follow-up below:** the Studio now has a
   *Discard draft* action, and `discard` is reached from it.
2. **Drafts do not survive a host restart, and nothing says they do.** That is the honest contract
   for an in-memory registry; persistence would need a user-visible lifecycle this increment does not
   define.
3. **The Studio shows one draft at a time.** Drafts created earlier stay in the registry and stay
   selectable from `Compare`, `Copy`, `Validate` and `Preview`, but the panel does not list them.
4. **The Studio is still single-folder** (`roots()[0]`). The registry is multi-root safe — scope is
   recorded, ids cannot collide, folder removal detaches — but the panel's browsing is not. That
   remains the separately tracked follow-up.
5. **`Preview` identity is host-side only.** The preview model carries the label; the draft id lives
   in the controller. A webview cannot read it, which is fine today because no webview renders it.
6. **A saved draft is not a registered theme.** `markSaved` records a path. Whether the file is later
   discovered, and whether a provider supplies it, is the inspector's answer — unchanged.

---

## 7. Package, API, version impact

- **No publication, no version bump, no changeset.** `themvora-vscode` stays `0.1.0` and private.
- **No new dependency.** Ids are a monotonic counter, unique for the lifetime of the process that
  owns the drafts — which is the lifetime of the drafts themselves.
- **No core change.** `generateTheme`, `validateTheme`, `validateThemeLevels`, `themeToCssDocument`
  and the diff API are used as they ship.
- **No public extension API change.** `createDraftRegistry`, `DraftRegistry` and `ThemeDraft` are
  exported from the module for the host and tests; the extension's `activate()` return is untouched.

---

# Follow-up — Command access and Discard Draft

The registry existed and was gated, but two things were unproven: that the commands actually reached
it, and that a user could end a draft deliberately.

## 1. Which commands include drafts, and how

Every command receives the same `catalog` object built in `extension.ts`, and that object carries
`drafts: () => drafts.list()` — the registry itself, read at call time.

| Command | Resolves through | Includes drafts | Why |
| --- | --- | --- | --- |
| `compareThemes` | `collectThemeEntries(deps.catalog)` + `pickThemeEntry` | **yes**, both operands | the list is the candidate set |
| `copyCssVariables` | `resolveThemeEntry(deps.catalog)` | **yes** | a draft is a copyable theme |
| `validateTheme` | `resolveThemeEntry(deps.catalog)` | **yes** | a draft is a validatable theme |
| `previewTheme` | `resolveThemeEntry(deps.catalog)` | **yes** | a draft is a previewable theme |
| `browsePresets` | `projectEntries(...)` for evidence, `client.catalog()` for the list | **no, deliberately** | a draft is not a catalog entry and must not reach preset-registration evidence |
| `generateTheme` | none — it writes to the registry | creates one | generation produces a draft, not a selection |

`collectThemeEntries` appends drafts after the open document and before the presets, so the
"single candidate" fallback still prefers the user's own file over a preset.

### Revision resolution

`ThemeEntry` gained `draftRevision`, taken from the registry when the entry was built. Three
operations act on the **latest** revision rather than the one they were handed, through
`latestEntry(deps, entry)`:

- **Copy** — re-resolves, then validates and serialises. A draft edited after the picker opened is
  copied as it is now.
- **Validate** — re-resolves, then reports. The report names the revision that was validated.
- **Preview** — re-resolves, then opens. A discarded draft is reported as nothing to preview instead
  of opening its last colours.

`Compare` cannot re-resolve between two picks and an async diff, so it uses `isStaleEntry(deps,
entry)` **after** the diff: if either operand's draft moved, the report is dropped and the user is
told to run it again. Presenting it would describe a theme that is no longer selected.

Both helpers are in `themeCatalog.ts`; a non-draft entry is never stale and resolves to itself.

## 2. Discard Draft

**Protocol.** A new intent, `{ type: "discardDraft" }`, parsed alongside `resetDraft` and kept
separate from it: resetting restores the baseline and keeps the draft, discarding ends it.

**UI.** A *Discard draft* link in the canvas action strip, next to *Save draft…*, shown only when the
selection is a draft. It is styled with `--destructive` and titled *"Remove this unsaved draft.
Reverting keeps the draft; this does not."* — the distinction from *Revert all* and the inspector's
*Reset draft* is stated where the click happens, not only in a doc.

**Host.** `discardCurrentDraft()`, in this order:

| Check | Result |
| --- | --- |
| No draft selected | "There is no draft to discard." — a notice, not an error |
| The registry no longer has it | Clear the selection and re-select; nothing is deleted |
| `draft.revision !== draftRevision` | **Refuse.** Drop the stale link, keep the record, tell the user |
| `draft.dirty` | Modal confirmation; dismissing it leaves the draft untouched and silent |
| Otherwise | `registry.discard(id)`, then clear every reference |

A **clean** draft is discarded without asking: it has been written, so the record is a convenience
rather than the only copy. A dirty one always asks, because nothing else holds those tokens.

**After discarding.** `clearDiscardedDraft()` resets `draftId`, the draft provenance, `selected` and
`selection`, then calls `applyDefaultSelection(true)` — the existing policy: persisted project theme,
strongest evidence, any valid project theme. If it finds one, the preview syncs to it. If it finds
none, the preview is **cleared** rather than left showing the discarded palette under a new name.

**Multi-view.** The Preview gained `clear(message)`, which drops `lastValidThemes`, the label and the
draft id and posts `{ type: "error", stale: false }`. `stale: false` is what stops the panel painting
the previous palette behind the message. The Studio and the Preview therefore cannot disagree about
whether the draft still exists: both read the one registry, and the host is the only writer.

**Closing the panel is not discarding.** `panel.dispose()` touches no registry state; there is a test
for it.

## 3. Tests

| File | Added | Covers |
| --- | --- | --- |
| `test/draftCatalog.test.ts` | +3 | a project entry is never stale and resolves to itself; an edited draft resolves to its newer revision under the same id; a discarded draft resolves to nothing |
| `test/studioDrafts.test.ts` | +6 | clean draft discarded without asking; dirty draft kept when the confirmation is dismissed; confirmed discard removes it and clears the preview; other drafts survive; a newer revision is refused; closing the panel does not discard |
| `test/draftCommands.test.ts` | +3 | a draft the **Studio** created is offered to the commands; a draft the Studio discarded stops being offered; a draft is reported as `Unsaved draft`, never as a project theme |
| `test/previewDraftIdentity.test.ts` | +1 | `clear` drops the draft id and posts a non-stale empty state |
| `test/studioProtocol.test.ts` | +1 | `discardDraft` parses as its own intent |

The cross-surface tests are the ones that matter: they open the real Studio, generate through it,
and then drive a real command, so "one registry" is proven rather than asserted.

Two stub additions were needed: `modalAnswer` (a warning with action items is a question, and its
answer is the chosen item) and `showWarningMessage(message, options, ...items)` returning it.

### Results — current run

| Gate | Result |
| --- | --- |
| Extension unit tests | **1047 passed / 80 files** (was 1034) |
| Core tests | **1036 passed / 86 files** |
| Both typechecks | `tsc -p tsconfig.json` and `tsc -p tsconfig.webview.json` — clean |
| `npm run lint` | clean |
| `npm run build` | host bundle + 4 webview assets |
| `npm run package` / `verify:vsix` | 100 files / 534.70 KB, self-contained |
| `npm run test:host` | 23 checks passed |
| `npm run test:host:vsix` | 23 checks passed |

## 4. Remaining limitations

1. ~~**The Studio can only discard the draft it is editing.**~~ **Superseded by the second follow-up
   below:** the library lists registry drafts and selecting one adopts it, so a `Generate Theme`
   draft is editable and discardable in the Studio.
2. ~~**The compare staleness guard is unit-tested, not interleaved.**~~ **Superseded by the second
   follow-up below:** the guard is now exercised at the command level through dependency injection.
3. **Drafts still do not survive a host restart**, and nothing says they do.
4. **The Studio is still single-folder** (`roots()[0]`). The registry records scope and cannot
   collide, but the panel's browsing is unchanged — a separate follow-up, as before.

No publication, no version bump, no new dependency, no core change, and the extension's `activate()`
return is untouched.

---

# Follow-up 2 — Registry drafts in the Studio, and stale results at command level

Two gaps remained: a draft the *command* created could not be reached from the Studio, and the
staleness guards were proven only by unit tests.

## 1. Discovering and selecting a registry draft

**The mechanism.** The host already posts a `StudioState` on every render. It gained one field:

```
drafts: buildStudioDrafts(options.drafts.list(), root?.inspection.root)
```

`buildStudioDrafts` (`src/adapters/studioModel.ts`) maps registry records to `StudioDraftRow` —
`id`, `name`, `family`, `modes`, `origin`, `valid`, `dirty`, `revision`, `saved`, `swatches`. It is
read at render time, not cached, so a draft a command creates while the Studio is open appears on the
next render without a refresh.

**The UI.** The library's themes rail already had a *Draft* section for the open draft. A second
section, **Unsaved drafts**, lists the rest, using the existing `theme-row` markup and a new
`RegistryDraftRow`. Each row states its origin and `unsaved draft` / `saved draft` in the aside — the
same place a project row names its file — so a draft is distinguishable from a project theme, a
catalog theme and a preset without a second visual language. The open draft is filtered out of the
list, because the *Draft* section above already shows it.

**The intent.** `{ type: "selectDraft", id }`. Only the id travels; the host reads the record. A
malformed or empty id is rejected by `parseStudioIntent` like every other intent.

**Selection is adoption, not cloning.** `selectRegistryDraft(id)` reads `options.drafts.get(id)` and
sets `draftId`, `draftRevision`, `draftBaseline`, `draftSeed`, `draftKind`, `draftInputs`,
`presetSource` and `selected` from that record, then rebuilds the view through the existing
`toView`. Nothing is created: the id, the revision and the theme data stay the registry's, so
editing, saving, reverting and discarding all keep addressing the same draft the commands see. A
test asserts `drafts.size()` is still 1 after selecting.

**Scope.** `buildStudioDrafts` filters to `scope.kind === "standalone"` or a root equal to
`roots()[0].inspection.root`. The Studio is single-folder; a draft belonging to another folder is not
offered, because silently adopting it would claim a relationship the registry does not record.

**Missing drafts.** If the record is gone by the time the click arrives, the host keeps the current
selection and posts a notice — no empty canvas, no fabricated theme.

**Status is read, never inferred.** `valid` comes from `draft.validation?.valid === true`, so an
unvalidated draft reads as not-yet-valid rather than valid by default. `saved` comes from
`draft.saved !== undefined`. No name, family or colour is consulted.

## 2. Discard, for both origins

The discard path is unchanged and now applies to both: `discardCurrentDraft()` reads `draftId`,
checks `options.drafts.get(draftId)`, refuses on a revision mismatch, asks only when `dirty`, then
`options.drafts.discard(id)` and `clearDiscardedDraft(...)`.

Because selection adopts the record, a draft created by `themvora.generateTheme` is discarded by the
same code path as one created in the Studio. `test/draftCommands.test.ts` drives exactly that: the
command generates, the Studio lists it, selects it by id, discards it, and the command's picker no
longer offers it.

**Host → view synchronisation after discard.** One path, no per-webview state:

1. `registry.discard(id)` — the registry is the only source of truth.
2. `clearDiscardedDraft` resets `draftId`, `draftRevision`, the draft provenance, `selected` and
   `selection`.
3. `applyDefaultSelection(true)` re-selects through the established policy.
4. A fallback found → `syncPreview()`. No fallback → `preview.clear(message)`, which drops
   `lastValidThemes`, the label and the draft id and posts `{ type: "error", stale: false }`.
5. `post()` re-renders the Studio, whose `drafts` list no longer contains the record.

## 3. Stale results — which commands check what

| Command | Before the operation | After the operation | Why |
| --- | --- | --- | --- |
| `copyCssVariables` | `latestEntry()` | **`isStaleEntry()`** | two awaits (validate, serialise) separate the resolve from the clipboard; a stale copy is silently wrong, so the warning names the revision it holds |
| `validateTheme` | `latestEntry()` | **`isStaleEntry()`** | the report is read as a verdict; when the draft moved, a note is appended to the output and a warning asks for a re-run |
| `compareThemes` | — (two picks, no single entry to re-resolve) | **`isStaleEntry()`** on both operands | the diff is the only await; a stale report is dropped entirely and the user is told to run it again |
| `previewTheme` | `latestEntry()` | none | nothing durable is produced. The panel is re-synced by the Studio on the next edit, and a discarded draft resolves to nothing before the panel is opened |
| `browsePresets` | — | — | reads no draft |

`isStaleEntry` returns false for any non-draft entry, so a project theme, a preset and an open
document are unaffected.

## 4. Tests

| File | Added | Covers |
| --- | --- | --- |
| `test/studioDrafts.test.ts` | +7 | a draft the panel did not create is listed; selecting adopts the id, modes, kind and saved state without cloning; editing the adopted record; discarding an adopted draft; cancelling keeps it; a draft that vanished before the click is reported; the open draft is not duplicated in the list |
| `test/draftCommands.test.ts` | +5 | a `Generate Theme` draft is listed by the Studio; selected by id; discarded from the Studio and then absent from the command picker; kept when the discard is cancelled (and still copyable); never reported as a project theme |
| `test/draftStaleResults.test.ts` | +7 (new file) | compare drops a stale report and keeps a fresh one; copy warns that the clipboard holds an earlier revision, and stays silent when nothing moved; validate annotates a stale report, and stays clean otherwise; preview does not open a draft discarded before it could be shown |

**The staleness tests are proven load-bearing.** Each guard was temporarily disabled and the suite
re-run: compare's test fails without its guard, and copy's and validate's both fail without theirs.
Restored afterwards; the full suite is green.

The interleaving uses the commands' own dependency injection — a `ThemvoraClient` whose `diff`,
`validate` or `catalog` advances or discards the draft before delegating to the real client. No
timers, no sleeps, no race.

### Results — current run

| Gate | Command | Result |
| --- | --- | --- |
| Extension unit tests | `npx vitest run` | **1066 passed / 81 files** (was 1047 / 80) |
| Core tests | `npx vitest run` (packages/core) | 1036 passed / 86 files |
| Typechecks | `npm run typecheck` | `tsc -p tsconfig.json` and `tsc -p tsconfig.webview.json` clean |
| Lint | `npm run lint` (repo root) | clean |
| Build | `npm run build` | host bundle + 4 webview assets |
| Package | `npm run package` | 100 files / 536.39 KB |
| VSIX | `npm run verify:vsix` | all 14 checks pass, self-contained |
| Host (dev) | `npm run test:host` | 23 checks passed |
| Host (packaged) | `npm run test:host:vsix` | 23 checks passed |

## 5. What is covered by test, and what is not

**Tested:** the draft rows the host posts (id, name, origin, dirty, modes, revision), the adoption of
a record by id, edits and discards against that record, the command pickers before and after a
discard, and every staleness guard.

~~**Verified by inspection and typecheck only:** the rendered markup of `RegistryDraftRow` and the
*Unsaved drafts* section.~~ **Superseded by the third follow-up below:** the library now has a
render harness, and the markup is asserted.

## 6. Remaining limitations

1. **Drafts are in memory.** They survive a webview closing and a folder being removed (which
   detaches them), and nothing else. A host restart ends them, and the UI does not claim otherwise.
2. **The Studio is single-folder.** It reads `roots()[0]`, and the library offers only drafts in
   that scope or in none. The multi-root Studio is a separate, deferred redesign.
3. **The Studio shows one draft at a time.** Other drafts are listed and selectable, but there is no
   multi-draft editing surface.
4. **Preview needs no post-check by design.** A draft edited while the panel is opening leaves the
   panel one sync behind until the next edit pushes a new model. That is a visible, self-correcting
   state rather than a durable artifact, which is why copy and validate carry the guard and preview
   does not.
5. **Discarding is not undoable.** The confirmation is the only protection; there is no restore.

No publication, no version bump, no new dependency, no core change, and the extension's `activate()`
return is untouched.

---

# Follow-up 3 — A render harness for the Studio library

The previous increment closed with an honest caveat: the *data* behind the draft rows was tested, the
*markup* was not. There was no component-render harness in the repository, so the webview was covered
by typecheck and the built bundle only. This closes that gap — and immediately found a defect.

## 1. The harness

`test/studioLibraryRender.test.ts` renders `LibraryPanel` with `renderToStaticMarkup` from
`react-dom/server` and asserts the HTML. Three small pieces make it work, none of which adds a
dependency:

| Piece | Why |
| --- | --- |
| `esbuild: { jsx: "automatic" }` in `vitest.config.ts` | the test transformer has to handle `.tsx` the way the webview build does |
| `createElement(LibraryPanel, props)` | a component called directly has no React dispatcher, so every hook throws — this was the first failure |
| `tsconfig.json` excludes the test; `tsconfig.webview.json` includes it | the host config deliberately drops the DOM lib, and this test needs JSX and the DOM. It is typechecked with the webview it exercises, not with the host |

That last point is verified, not assumed: a deliberate type error in the test file produces exactly
one `tsc` error, so the file is not orphaned from both configs.

`ui.tsx` touches `document` only inside `useEffect`, and effects do not run during server rendering,
so no DOM shim is needed.

## 2. The defect it found

The two states were labelled `unsaved draft` and `saved draft` — and **`"unsaved draft"` contains
`"saved draft"`**. A reader skimming the aside column sees the same words in both rows; the only
difference is a two-letter prefix at the start of a right-aligned cell.

The assertion `expect(unsaved).not.toContain("saved draft")` failed, which is how it surfaced.

Two changes:

- The aside is now **`not written`** / **`written`** — the fact that actually distinguishes them, and
  not a substring of one another.
- The section heading was **`Unsaved drafts`**, which was wrong for the written drafts it also lists
  (a written draft stays in the registry until discarded). It is now **`Drafts`**.

The row's `title` still carries the full sentence (`Draft · not written yet` / `Draft · written, not
registered`), so nothing is lost by the shorter cell.

## 3. What the tests assert

| Test | Assertion |
| --- | --- |
| renders a section listing them | `Drafts · 1` heading, the name, the origin, the mode list |
| distinguishes written from not written | exact cells `>not written</span>` and `>written</span>` — not substrings |
| offers each draft as a button | the row contains `<button class="theme-row-main">`, so it is a control rather than a label |
| does not list the draft that is already open | `Draft · 1` present, `Drafts ·` absent |
| lists the others while one is open | each name appears exactly once; a duplicate would count 2 |
| renders no section when the registry holds none | no `Drafts ·` heading, project themes still rendered |
| filters drafts by the search query | a non-matching draft disappears and `Nothing matches` appears |
| renders a draft and a project theme as separate rows | both names appear once each; the draft sits under the drafts heading |

**Load-bearing, checked the same way as the staleness guards:** disabling the drafts section makes
5 of the 8 fail. The 3 that still pass are the negative ones — empty registry, open draft excluded,
search filter — which is the correct behaviour for a test of absence.

**What this is not:** DOM interaction coverage. There is no `jsdom`, so a click cannot be dispatched;
the tests prove the row is a button, and what the button *does* is covered where the `selectDraft`
intent is handled (`test/studioDrafts.test.ts`, `test/draftCommands.test.ts`). Adding a DOM
environment would be a new dependency, which this work does not take on.

## 4. Results — current run

| Gate | Command | Result |
| --- | --- | --- |
| Extension unit tests | `npx vitest run` | **1074 passed / 82 files** (was 1066 / 81) |
| Core tests | `npx vitest run` (packages/core) | 1036 passed / 86 files |
| Typechecks | `npm run typecheck` | both configs clean |
| Lint | `npm run lint` (repo root) | clean |
| Build | `npm run build` | host bundle + 4 webview assets |
| Package | `npm run package` | 100 files / 536.39 KB |
| VSIX | `npm run verify:vsix` | self-contained |
| Host (dev) | `npm run test:host` | 23 checks passed |
| Host (packaged) | `npm run test:host:vsix` | 23 checks passed |

One note on running the suite: `test/bundle.test.ts` is `skipIf(!built)`, so a run against a tree
with no `dist/` reports 81 files / 1072 tests with 2 skipped. The numbers above are from a run with
the build in place.

## 5. Remaining limitations

1. **No DOM interaction tests.** Clicks, focus and keyboard behaviour in the webview are still
   uncovered; the harness renders markup only.
2. **One component is rendered.** `LibraryPanel` is the surface this work changed. `PreviewWorkspace`,
   `Inspector` and the Create drawer have the same lack of coverage they had before.
3. **Drafts remain in memory**, the Studio remains single-folder, and discarding remains
   non-undoable — all unchanged and out of scope for this increment.

No publication, no version bump, no new dependency, no core change.

---

# Follow-up 4 — Closing the compare race verification

The open question was narrow: does the *real* `themvora.compareThemes` command have a deterministic
test that changes a draft's revision after selection but before the comparison result is accepted?
It does — `test/draftStaleResults.test.ts`, added in follow-up 2 — and this section records the
verification rather than restating the claim.

## What the test actually does

`compare > drops a report whose draft moved while the diff ran` calls `runCompareThemes` — the same
function the registered command invokes — with:

- `catalog.drafts` pointing at a registry holding one draft (`ocean`, revision 1);
- `quickPickQueue = ["ocean · light", "Oat · light"]`, so both operands are chosen through the real
  picker path;
- a client whose **`diff`** advances the draft to revision 2 *before* delegating to the real diff.

The mutation therefore lands exactly between selection and result acceptance: after both picks,
inside the only await in the operation. The assertions are that the retry guidance is shown and the
report channel is empty — the stale comparison is not presented.

The control case (`presents the report when nothing moved`) uses the unwrapped client and asserts the
opposite, so the guard cannot pass by always firing.

## Re-verified in this run

| Check | Result |
| --- | --- |
| `npx vitest run test/draftStaleResults.test.ts --reporter=verbose` | **7 passed** |
| compare guard disabled, same file re-run | `drops a report whose draft moved…` **fails** (1 failed / 6 passed), then restored |
| `grep -rn "drafts\.(create\|update\|markSaved\|discard\|detachRoot\|revert)" src/commands/` | one hit: `generateTheme` calls `create`. No command calls `update`, `markSaved`, `discard`, `revert` or `detachRoot` |

The last line is the answer to the second half of the question — "cannot overwrite newer state".
Copy, validate, preview and compare only read the registry; `generateTheme` only *creates* a record
with a fresh id, so it cannot touch an existing draft's revision. The revision-guarded mutations live
in the Studio panel and the save path, which are covered separately
(`test/draftRegistry.test.ts`, `test/studioDrafts.test.ts`).

The disabling step asserts the replacement actually matched before writing, so a silent no-op edit
cannot manufacture a "proven load-bearing" result.

## Gates — current run

| Gate | Command | Result |
| --- | --- | --- |
| Extension unit tests | `npx vitest run` | 1074 passed / 82 files |
| Core tests | `npx vitest run` (packages/core) | 1036 passed / 86 files |
| Typechecks | `npm run typecheck` | both configs clean |
| Lint | `npm run lint` (repo root) | clean |
| Build | `npm run build` | host bundle + 4 webview assets |
| Package | `npm run package` | 100 files / 536.39 KB |
| VSIX | `npm run verify:vsix` | 14 checks, self-contained |
| Host (dev) | `npm run test:host` | 23 checks passed |
| Host (packaged) | `npm run test:host:vsix` | 23 checks passed |

No code changed in this follow-up: it verifies work that already existed. The only repository edit is
this section.
