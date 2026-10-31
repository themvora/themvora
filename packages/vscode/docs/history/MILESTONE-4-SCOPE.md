# Milestone 4 — Native Core-Backed Command Workflows

> **Status:** scope agreed, implementation in progress.
> **Constraint:** every command below is backed by an existing public API. Nothing is stubbed.

## Why the scope is narrower than the original plan

The roadmap's Milestone 4 assumed a CLI transport and listed Initialize, Add, Migrate, Export and
`--plan`/`--dry-run`. Milestone 3 established that the CLI cannot be loaded in the extension bundle
(`MILESTONE-3-CLI-DECISION.md`), so those operations have no implementation and are **deferred**,
not reimplemented. What remains is the set of workflows that `@themvora/core` already answers.

## Command-to-API matrix

| Command | Public API (via client) | Input & validation | Result mapping | Kind | Cancellation | Failure behaviour |
| --- | --- | --- | --- | --- | --- | --- |
| **Generate Theme** | `generateTheme` → `client.generate` | `InputBox` with a validator accepting `#rrggbb` or `rrggbb`; a non-seed is rejected before the call | `ok` → save dialog → write; `usage` → error message naming the seed; `error` → error message with core's diagnostic | **Mutating** — writes exactly one user-chosen file, through `RootSessions` | Prompt dismissal aborts; no signal is needed because generation is synchronous | Notification, no write |
| **Validate Theme** | `validateTheme` + `validateThemeLevels` + `measureThemeContrast` → `client.validate` | Open dialog restricted to `*.json`; the document must parse as a theme or a `{ light, dark }` pair | `ok` → information message + report; `validation-failed` → warning with counts + per-issue report; `usage`/`error` → error message | **Read-only** | None — the call is synchronous and completes immediately; documented, not simulated | Notification; nothing written |
| **Browse Presets** | `getPresetCatalog` → `client.catalog` | None — the catalog is canonical | `ok` → `QuickPick` of presets and brands with style and character; selecting shows the recipe and says adding is not available | **Read-only / preview-only** | `QuickPick` dismissal | Error message when the catalog is unavailable or empty |
| **Compare Themes** | `diffThemes` → `client.diff` | Two theme documents; each is passed as-is, so a pair is compared as a set across both modes | `ok` → per-mode report in the output channel; `hasChanges: false` reported as such | **Read-only** | Two dialogs, each dismissible | Error naming the file; no partial report |
| **Copy CSS Variables** | `themeToCssDocument` → `client.cssDocument` | One theme document; only themes that pass `client.validate` are offered | `ok` → canonical CSS on the clipboard; invalid themes are named and excluded; no file is written | **Read-only** (clipboard only) | Selection dismissal | Error message; no success notification when the copy fails |

### Boundaries that must not be blurred

- **Generate is not "save to project".** It writes one file the user chooses. It does not touch a
  project registry, and it must not claim to.
- **Browse is not "add a preset".** `add` mutates a project through the CLI and is deferred.
- **Theme migration is not project migration.** `client.migrate` migrates one theme object; there is
  no project migration operation anywhere in the extension.
- **CSS variables are not an export.** `exportVariables` returns a map. The CLI's `export` writes
  files with conflict handling; that is deferred.

## Implemented vs deferred

**Implemented (client, Milestone 3):** `generate`, `validate`, `catalog`, `diff`,
`exportVariables`, `migrate` — plus project *reading* (`inspectProject`) from Milestone 2.

**Deferred, with the blocking reason:**

| Capability | Blocked by | Small API could unblock? |
| --- | --- | --- |
| Project initialization (`init`) | CLI-only; `node:fs` + `node:child_process`; mutates | Yes — `RunContext` seam + async `ApplyIo.run` (see decision record) |
| Add preset/brand/seed (`add`) | CLI-only; `node:fs`; mutates | Yes — same seam |
| Complete project inspection and validation | Partly: registry files are TypeScript; no canonical loader | Yes — `loadThemeModule(root)` in `@themvora/core` |
| Project migration | No such operation exists anywhere | No — would need a new CLI/core operation |
| CLI-style export with filesystem and conflict semantics | CLI-only | **Formatting no longer blocks it** — `themeToCssDocument` now lives in core. Conflict handling and `--output` are still the CLI's |
| Pure command-core / host-adapter split | Architectural | Recorded as a future option; **not** Milestone 4 work |

## Missing APIs that block a useful workflow

1. **`loadThemeModule(root)` in `@themvora/core`** — the single biggest gap. Without it the extension
   cannot read a generated project's `src/themes/themes.ts`, so "validate the project's themes" is
   impossible and the Explorer shows `not readable yet` for the most common project shape.
2. ~~**`themeToCssDocument(theme)` in `@themvora/core`**~~ — **done.** Core now owns the `:root`
   document formatting, and the CLI's `export --format css` calls it (verified byte-identical).
3. **`RunContext { cwd, out, err }` on `@themvora/cli`'s `run()`** plus an async `ApplyIo.run` — the
   prerequisite for every deferred project operation.

## Implementation order

1. **Validate Theme** — done.
2. **Copy CSS Variables** — done.
3. **Browse Presets** — done.
4. **Compare Themes** — done.
3. **Browse Presets** — read-only `QuickPick` over the canonical catalog.
4. **Compare Themes** — read-only, but needs two inputs, so it comes last.

## Acceptance tests

| Command | Tests |
| --- | --- |
| Validate Theme | valid document → `ok` + report; invalid theme → `validation-failed` with issue lines; malformed JSON → error, no report; non-theme JSON → error; cancelled dialog → nothing happens; spaced path; unavailable capability → error; host check |
| Copy CSS Variables | variables copied and counted; no file written; unavailable capability → error |
| Browse Presets | 14 entries; dismissal writes nothing; unavailable capability → error |
| Compare Themes | identical themes → `hasChanges: false`; different seeds → `true`; second document invalid → error, no partial report |
| All | bundle gate unchanged; no writes during activation; `cliRoundTrip.test.ts` and `activate.test.ts` unmodified |
