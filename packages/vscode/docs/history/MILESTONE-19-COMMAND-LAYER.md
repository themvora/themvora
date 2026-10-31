# Themvora for VS Code — Command Layer Reliability

Eight commands, one resolution contract. This is the audit first, then what changed, then what
did not.

---

## 1. The audit

Read from the working tree, not from the milestone reports.

| Command | Input | Theme sources it could reach | Core calls | Side effects | Failure behaviour | Tests before |
| --- | --- | --- | --- | --- | --- | --- |
| `browsePresets` | none | catalog only | `catalog()` | none | error if the catalog is unreadable | 9 |
| `compareThemes` | two **file dialogs**, JSON only | JSON files | `diff()` (semantic) | none | error if a file is unreadable | 12 |
| `copyCssVariables` | **file dialog**, JSON only + variant pick | JSON files | `validate()`, `cssDocument()` | clipboard | error if every theme is invalid | 15 |
| `generateTheme` | seed only | none | `generate()` | **wrote a file, always** | silent on cancel | 7 |
| `openStudio` | none | inspection | — | none | onboarding in an unconfigured folder | 3 |
| `previewTheme` | active editor, else **file dialog**, JSON only | JSON documents | — | none | message when nothing is selected | 22 |
| `refresh` | none | inspection | — | none | — | 6 |
| `validateTheme` | **file dialog**, JSON only | JSON files | `validate()` | none | error if unreadable | 12 |

Four gaps fell out of that table.

1. **No shared resolution.** Five commands had five different ways of finding a theme, and three of
   them could only see a JSON file the user had already located. A project theme the sidebar was
   showing was invisible to `Compare`, `Copy` and `Validate`.
2. **Generation ended in a file.** `generateTheme` opened a save dialog before showing anything, and
   collected only a seed — `family` and `style` were supported by core and unreachable.
3. **`Browse Presets` was a dead end.** It listed the catalog and then said "browsing only".
4. **`Preview Theme` could not reach the formats the extension understands.** The inspector reads
   TS, JS, CSS and component regions; the command read JSON.

---

## 2. The shared contract

`src/services/themeCatalog.ts` — one list, one picker, one policy.

```
collectThemeEntries(deps) → ThemeEntry[]
pickThemeEntry(entries, title) → ThemeEntry | undefined
resolveThemeEntry(deps, { title, autoSelectSingle }) → ok | no-workspace | no-themes | cancelled
themeSetFor(entry) → the light/dark group
```

A `ThemeEntry` keeps what the commands need and nothing they have to re-derive: stable id, label,
family, mode, every mode in the group, origin and its label, source path, 1-based location, the
`ThemeDefinition` itself, its sibling set, the registration evidence and consumers the graph
recorded, swatches, and a one-line detail.

**Where the entries come from.** Project themes from `inspection.registries` (only `supported`
ones), decorated with `inspection.relationships` — the evidence is the graph's, never inferred from
a name. Presets from the bundled catalog, one entry per variant. The active editor, parsed once in
the composition root and passed in, so no command carries its own document reader.

**Selection policy.** The active editor when it holds themes (one theme: used without asking;
several: a picker, because picking the first of several is a guess). Otherwise the catalog, with a
picker unless `autoSelectSingle` is set and there is exactly one candidate. A dismissal is
cancellation, not failure.

**Why one entry per variant, not per family.** Copy and validate need a mode; "the family" does not
have one. The family still travels with the entry as `set`, which is what `ThemeRequest.themes` and
`diff` want for `extends` resolution.

---

## 3. What each command does now

| Command | Before | Now |
| --- | --- | --- |
| `browsePresets` | list, then "browsing only" | list, then **Preview / Copy CSS variables / Validate** |
| `compareThemes` | two JSON dialogs | any two entries from the catalog; the same theme cannot be chosen twice |
| `copyCssVariables` | JSON dialog | any entry; validates before copying; one shared render-and-copy tail for both paths |
| `generateTheme` | seed → save dialog | seed → **family** → **style** (core's own list) → preview as an **unsaved draft**; a named destination still writes |
| `previewTheme` | JSON only | active editor → catalog picker → a named file resolved through the inspector, so `.ts` and CSS registries preview too |
| `validateTheme` | JSON dialog | any entry; one `reportThemes` for both paths |
| `openStudio` | — | unchanged (see §5) |
| `refresh` | — | unchanged (see §5) |

**Generation does not save.** The interactive path opens the pair in the preview labelled
"generated draft" and says so: *"Save from the Studio when you want a file."* A caller that passes a
target URI still gets the file, and — deliberately — no prompts: a prompt in the middle of a script
is a hang.

**The style list is core's.** `askStyle` reads `catalog().styles`, so the six styles core ships
(balanced, soft, vibrant, editorial, minimal, brand) are the six offered, plus "Default". A style
core does not have cannot be offered.

**A JSON file keeps the document path** and its watcher; only non-JSON files go through the catalog,
so live refresh on a JSON theme is unchanged.

---

## 4. Tests

New: `test/themeCatalog.test.ts` (11) — entries per variant, file and position preserved, evidence
and consumers carried, a family travelling as one set, unreadable registries ignored, presets
present with no workspace, the open document ordered first, and the four resolution outcomes.

Rewritten for the new contract (the old ones asserted the dialog flow that is gone):

| File | Was | Is |
| --- | --- | --- |
| `compareThemes.test.ts` | two file dialogs | two catalog picks; the same theme never offered twice |
| `copyCssVariables.test.ts` | file dialog | catalog pick, clipboard, no writes |
| `validateTheme.test.ts` | file dialog | catalog pick, report names the origin |
| `generateTheme` (in `activate.test.ts`) | seed → save | seed → family → style → preview, nothing written; the style list is core's; a cancelled style prompt writes nothing |
| `previewTheme.test.ts` | "explains when the dialog is dismissed" | dismissal is silent; a preset previews; **a `.ts` registry previews** |
| `browsePresets.test.ts` | "browsing only" | action menu; preview; copy; no writes |

**955 extension tests / 73 files. 1036 core tests / 86 files.** Both typechecks. `npm run lint`
clean. VSIX 98 files / 522.07 KB, self-contained, installed.

Two stub additions were needed to test the new flows honestly: `quickPickQueue` and `inputBoxQueue`,
because a command that prompts twice cannot use one shared answer.

---

## 5. What was deliberately not changed

- **`openStudio`.** It already focuses the singleton panel, restores the persisted selection, and
  shows the onboarding state in an unconfigured folder (Milestone 15). Nothing in this task's
  contract was missing.
- **`refresh`.** It already re-inspects through the cache, keeps unsaved drafts, and publishes to
  every surface. No gap was found.
- **The Studio's in-memory draft is not in the catalog.** A draft lives in the Studio's own state
  and is not exposed to the commands; `Compare`/`Copy` therefore see project themes, the open
  document and presets, but not an unsaved Studio draft. Closing this needs a host-side draft
  registry, which is a larger change than this pass.
- **No CSS *file* preview.** A CSS theme is reachable when the inspector resolved it into the
  catalog; pointing the command at a bare stylesheet the inspector did not resolve still reports
  that it could not be read. Parsing arbitrary CSS into a theme is the thing the contract forbids.
- **No variant-mismatch prompt in `Compare`.** It compares the two chosen themes and labels each
  side with its mode; comparing a light against a dark is allowed and visible in the report rather
  than blocked.
- **No Problems-panel change in `Validate`.** Source positions are already reported where the
  reader recorded them; nothing new was added.

---

## 6. Limitations

1. **Path matching for a non-JSON file is a suffix match** on normalised separators. A project with
   two files ending in the same relative path would match both; the first is used.
2. **`generateTheme` cannot name a family when scripting.** The scripted path keeps core's defaults,
   because adding prompts to it would break automation. Customising a generated theme is the
   Studio's job.
3. **The catalog is rebuilt per invocation.** Nine presets × two variants plus project themes is
   cheap; a project with hundreds of themes would want a cache keyed on the inspection identity.
4. **`In project` evidence is not shown in `Browse Presets`.** The picker shows the origin
   (`Catalog preset`) and the family; the registration chip lives in the Studio drawer, which has
   the theme rows. Adding it to the command needs the family join in the host, which is the next
   increment.

---

# Follow-up — Preset Registration Evidence in the Command

The previous increment left one gap, named in §6: `Browse Presets` showed the canonical catalog and
said nothing about the project. The Studio's New Theme drawer already answered that question, so the
fix was not to answer it twice.

## The calculation, reused

The drawer's logic moved to **`src/shared/presetRegistration.ts`** — `src/shared` is the directory
the host and the webview are both allowed to import from, which is what makes one calculation
possible at all.

```
presetRegistration({ family, label, modes }, rows) → { status, label, detail, rows, sources, consumers, variants }
```

It is generic over a row shape both surfaces can produce in a few lines:

| Field | Studio (`StudioTheme`) | Command (`ThemeEntry`) |
| --- | --- | --- |
| `family` | `theme.family` | `entry.family` |
| `name` | `theme.name` | `entry.label` |
| `mode` | `theme.mode` | `entry.mode` |
| `evidence` | `theme.evidence` | `entry.evidence` |
| `usedBy` | `theme.usedBy` | `entry.consumers` |
| `source` | `theme.source` | `entry.source` |
| `catalogOrigin` | `origin === "catalog" \|\| evidence === "catalog-source"` | new `entry.catalogOrigin` |

`webview/studio/presetEvidence.ts` is now a ~90-line adapter that maps `StudioTheme` onto that shape
and re-attaches the themes under the name the drawer already used. The drawer, its tests and its
rendered output are unchanged.

`ThemeEntry` gained **`catalogOrigin`**, taken from the reader's `themeSources[].origin` (falling
back to `evidence === "catalog-source"`, which is what a generated registry records). It is a
different question from `origin`: a theme produced by `defineTheme()` and one produced by
`getPresetThemes()` are both `origin: "project"`, and only the second is the catalog preset.

## Identity rules, unchanged

The family is the join key; catalog origin is the gate. A project that hand-writes
`defineTheme({ family: "berry" })` has `origin: "definition"` and is **not** the Berry preset — there
is a test for exactly that on both surfaces. A row in a different family with a matching name is
ignored. A row that recorded no family falls back to its name with the mode suffix removed.

## Variant-level evidence

`preset.modes` is compared against `row.mode`. A missing variant is the strongest statement: the
family is only partly present, whatever the rows that *were* found say about registration. So
"light found, dark not" is `Partially detected` even when light is fully registered.

## The picker

```
Oat         Default · soft · Registered in source      >
            Warm, low-chroma earth tones — Included in src/theme/theme.config.ts, passed to src/main.tsx.
Cocoa       Default · soft · Catalog only              >
            Deep brown with a cream ground.
```

- The status is appended to the existing `description` line, so one row says kind, style and
  standing.
- The sentence behind the status appears in `detail` **only when there is something to explain**.
  Nine rows of explanation is noise; three is information.
- `Catalog only` is shown, not hidden — it is the normal state of most of the catalog and the point
  is that the developer can tell.

A fourth action, **Open in Studio**, was added. It hands off to the existing
`themvora.openStudio` command with the preset id, because the Studio already owns the draft
workflow — including the notice that a draft from an existing preset is a separate copy. When the
preset is in the project, the action's description says so before the click:

> Start a draft from this preset — it is already in the project, so the draft is a separate copy

## Tests

| File | Covers |
| --- | --- |
| `test/presetRegistration.test.ts` (12) | catalog-only; the catalog-origin gate (a same-family custom theme is not the preset); a different family ignored; the name-suffix fallback; registered with consumers; included without a consumer; unverified; one variant missing; variants disagreeing; a single-mode preset; the label vocabulary; **and both surfaces producing the same status, label and detail across six scenarios** |
| `test/browsePresets.test.ts` (17, +5) | a preset the project includes is marked with the consumer named; an unrelated preset stays catalog-only; a custom `berry` is not the Berry preset; one variant reads as partial and names the missing mode; the Studio hand-off runs and writes nothing |

**972 extension tests / 74 files. 1036 core tests.** Both typechecks. Lint clean. VSIX 99 files /
525.65 KB, self-contained, installed.

Two test-infrastructure additions: `executeCommand` on the stub (recorded *and* dispatched, so a
hand-off is proven to reach a registered handler rather than only to have been attempted), and a
`globalState` on the browse fixture, because the hand-off genuinely opens the Studio.

## Not done, deliberately

- **No project mutation.** There is still no "add this preset to my project". Registering is a
  project write the extension has no supported operation for; the draft path is the supported one.
- **The host-side registry for unsaved Studio drafts remains a separate increment.** The command
  sees project themes, the open document and presets — not a draft living in the Studio's memory.
- **`Compare` still does not offer preset evidence.** It compares two themes; whether one is
  registered is not part of that question.

---

# Follow-up 2 — Multi-root isolation of preset evidence

The increment above closed the preset-awareness gap for a single folder. Re-auditing the multi-root
case — the one §7 of that task called out and nothing yet tested — found two defects, both of which
made evidence from one workspace folder stand in for another.

## Defect 1 — rows from two folders were pooled

`presetRegistration` received one flat row list built from every root, with no folder recorded. Two
projects that each included half of a family therefore summed to a whole:

| Folder | Contains | Pooled verdict (before) | Per-folder verdict (now) |
| --- | --- | --- | --- |
| `app` | `oat-light`, registered | `Registered in source` | `Partially detected` |
| `design-system` | `oat-dark`, registered | — | `Partially detected` |

Neither project contains the Oat family, but the picker claimed both did. This is the same class of
error as a name-based false positive: a claim the evidence does not support.

**Fix.** `PresetEvidenceRow` gained an optional `root`. When rows carry one, `presetRegistration`
groups by folder, judges each group with the unchanged family calculation, and reports the strongest
answer. Rows are never pooled. Ranking follows completeness by construction — `partial` always has a
missing variant, `registered` and `included` never do — so the order is
`registered > included > partial > unverified > catalog-only`.

With more than one folder in play a bare relative path is ambiguous, so the folder is named:
`Included in src/theme/theme.config.ts (design-system), passed to src/main.tsx.`

When no row carries a folder the calculation is byte-identical to before — which is what keeps the
Studio drawer, which builds from a single inspection, producing exactly the same text.

## Defect 2 — the catalog identity collided across folders

`ThemeEntry.id` was `origin:source:name`, with `source` workspace-relative. Two folders each holding
`src/theme/theme.config.ts` and a `generated-light` produced the same id, and
`collectThemeEntries` deduplicates by id — so the second folder's themes were silently dropped. In
a multi-root workspace one project's themes were unreachable from `Preview`, `Copy`, `Compare` and
`Validate`.

**Fix.** The folder is part of the identity: `origin:root:source:name`. Presets and the open
document carry no folder and keep the `-` placeholder, so their ids are unchanged.

## Tests added

| File | Case |
| --- | --- |
| `test/presetRegistration.test.ts` (+4) | half a preset in each of two folders is not a registered pair; the folder that holds the whole preset is the one reported and named; the strongest folder wins over the first; the no-folder text is unchanged |
| `test/browsePresets.test.ts` (+4) | each folder's evidence stays separate and the unrelated folder is not cited; split variants read as `Partially detected`; a dynamically filtered collection reads as `Registration not verified`; browsing in a multi-root workspace writes and previews nothing |
| `test/themeCatalog.test.ts` (+1) | two folders with identical relative paths and theme names both survive, with distinct ids and their own `root` |

The `browsePresets` fixture gained a folder-name parameter so a root can be built per test.

## Results — current run

| Gate | Result |
| --- | --- |
| Extension unit tests | **981 passed / 75 files** |
| Core tests | **1036 passed / 86 files** |
| Both typechecks | clean |
| `npm run lint` | clean |
| Build (host + webview) | OK |
| VSIX | 99 files / 526.51 KB, self-contained |
| Extension-host checks | 23 passed |

## Remaining limitations

1. **The Studio drawer is single-folder.** It builds from `roots()[0]`, so in a multi-root workspace
   it reports the first folder's evidence. It cannot disagree with itself, and for a single folder it
   agrees with the command exactly; making it multi-root is a protocol change, not a command fix.
2. **The strongest folder is reported, not all of them.** A preset included in two folders shows the
   better evidence and names that folder; the other is not listed. A per-folder breakdown would be
   the next refinement if the need appears.
3. **`Browse Presets` still has no "add to project".** Unchanged and intentional.
4. **The host-side draft registry remains a separate increment.**
