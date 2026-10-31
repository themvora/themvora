# Increment 3 — Theme Studio: audit and current state

> **Status: Increment 3 complete as of Stage 7 (2026-10-23).** All phases are delivered. This file
> records what the audit established and what shipped; the Stage 7 interactive Studio is described in
> [`MILESTONE-8-SOURCE-DISCOVERY.md`](./MILESTONE-8-SOURCE-DISCOVERY.md).

## Phase A — what `defineTheme()` actually is

Read from `packages/core/src/model/define-theme.ts`:

```ts
export function defineTheme<Name extends ThemeName, T extends ThemeDefinition<Name>>(theme: T): T {
  return theme;
}
```

Its own doc comment says it: *"Currently returns the definition unchanged; it exists to give themes a
consistent shape and future validation."*

This settles the design question the brief asked to audit:

| Question | Answer |
| --- | --- |
| Does it apply defaults? | No. |
| Does it resolve light/dark variants? | No. |
| Does it derive metadata? | No. |
| Does it transform tokens? | No. |
| Does it validate? | No — `validateTheme()` is separate. |

**Consequence:** a readable object literal *is* the theme. A static reader needs no knowledge of
`defineTheme()` semantics, because there are none to reproduce. That is why `readThemeDefinitions()` can
be a literal reader and still be exact.

## Source-shape matrix

Every `defineTheme(` occurrence in the repository, excluding `node_modules` and `dist` — 447 total:

| Shape | Count | Readable | Notes |
| --- | --- | --- | --- |
| Object literal argument | **426** | yes | quoted *and* unquoted keys, nested objects, arrays, trailing commas, comments |
| Identifier or call argument | 8 | no | **all eight are prose** — doc text and this repo's own error messages, not code |
| Spread argument | 6 | no | also prose and one deliberate test fixture |
| Other | 7 | no | prose |

So in the actual repository, **every real call takes an object literal**. The unsupported shapes exist
only as documentation, which is why refusing them costs nothing real — but they are still refused
explicitly rather than skipped.

### The supported static subset

| Supported | Refused (reported, never executed) |
| --- | --- |
| `{ key: value }` with quoted or bare keys | `{ ...spread }` |
| Nested objects and arrays | `defineTheme(makeTheme())` |
| Strings, numbers, booleans, `null` | Template literals with `${}` |
| `//` and `/* */` comments anywhere | Identifiers as values |
| Trailing commas | Any operator or expression |

A `defineTheme(...)` inside a comment or a string is **ignored**, not read — it is documentation.

## What shipped

### Core — `readThemeDefinitions(source)`

Reads every `defineTheme({ … })` literal in a file, wherever it is, and returns
`{ definitions: [{ theme, location }], problems: [{ message, location }] }`. Positions are line and
column of the literal's `{`.

Unlike `loadThemeRegistry()`, it does not require the canonical `themvora` / `selection` /
`sourceThemes` exports, so a project that keeps themes in `src/theme/brand.ts` is as readable as one
that uses the generated registry.

Public export, tests, API reference regenerated, changeset (`core` + `web`, minor).

### Extension — discovery and validation

`inspectProject` gained a second pass: files whose path mentions "theme" (`.ts`/`.js` family) that the
registry loader has not already covered are read with `readThemeDefinitions`. Each definition is
validated with `validateTheme()` before being offered:

- all valid → registry entry `supported`, with the themes
- any invalid → `malformed`, naming the theme and the first issue
- nothing readable → the file is skipped silently (no definitions is not a failure)

The canonical registry is excluded from this pass, or its themes would appear twice.

## Evidence

| Check | Result |
| --- | --- |
| Core `readThemeDefinitions` tests | 6 (real fixture, positions, spread, call, comment, standalone file) |
| Core suite | **1001 passed / 83 files** |
| Extension `inspectProject` | 4 new cases: outside-registry, no double listing, no-definition file, invalid |
| Extension suite | **413 passed / 35 files** |
| Host — dev / packaged | **22/22** both |
| Host check | `PASS a defineTheme() definition outside the registry is read — generated-light · src/theme/brand.ts` |
| VSIX | 52 files, 121.8 KB, installed byte-identical |

Two defects were caught by these tests while implementing:

1. The reader matched `defineTheme({…})` **inside a comment** and reported a theme that does not exist.
   Fixed by scanning with comment and string awareness rather than a regex over raw text.
2. `isThemeSourceFile` checked only the base name, so `src/theme/brand.ts` — themes in a `theme/`
   directory — was missed. Fixed to check the whole path.

## Phase status

The phase audit, with the Stage 7 state:

| Phase | State |
| --- | --- |
| B — Studio surface, three origins | **built.** Project themes (with source file), generated drafts, and canonical presets all select in one Studio; origin, mode, saved state and validation are shown per selection. |
| C — generate → validate → preview → save | **built.** The Studio generates from a seed through `client.generate`, validates, previews, and writes with a **chosen format** (JSON / TypeScript with `defineTheme()` / CSS variables) to a **file name the user types** in the open project folder. "Preview file" shows the exact bytes before writing. The `Generate Theme` command is unchanged and shares the same write path. |
| D — source-defined inspection | **built.** Discovery, validation, and now selection → preview → tokens. |
| E — preview of a resolved theme | **built.** `preview.openThemes(themes, label)` on the existing controller; every origin uses that one panel. |
| F — token explorer | **built.** Every colour token with its exact value, per-token contrast result, copy value and copy CSS variable actions, updating with selection. Clicking a token highlights its uses in the preview. |
| G — presets in the Studio | **built.** The canonical catalog, one row per mode, search over name/label/family, real swatches, and selecting one opens it read-only in the Studio with a notice that a preset is not project registration. |

### A defect this pass fixed

The workspace reported **Solid** for a React project. Two causes, both in
`domain/projectProfile.ts`:

1. `vite.config` was listed as evidence for Solid. Vite is a **bundler**, not a
   framework, so every Vite React project matched the Solid rule first.
2. `@themvora/*` integration packages were never used as evidence, although
   `@themvora/react` names the framework outright.

Now an integration package is checked **first**, then the generic dependency and
config rules, and `vite.config` is no longer evidence of anything. Verified against the
reported project: `framework: react | @themvora/react is declared`.

The data spine these need is now in place: themes carry their source path, their origin is knowable
(registry, `defineTheme` file, generated, preset), and validation is canonical.

## Remaining unsupported source shapes

Spreads, calls, computed values and inline theme definitions in template markup. An identifier whose
import/collection is readable is traced; everything outside that static subset is reported with a
message and a position, never executed. `theme.config.*` is still not executed: it is build
configuration, not a registry.
