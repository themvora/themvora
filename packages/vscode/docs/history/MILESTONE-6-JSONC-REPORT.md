# Milestone 6 follow-up — JSONC consistency

> **Date:** 2026-10-21. **Scope:** `MILESTONE-7-SCOPE.md`, approved with the numbering kept at M6.
> **Status:** implemented and machine-verified. The editor UX pass is **not** done — see
> `MILESTONE-6-UX-CHECKLIST.md`.

## What changed

| File | Change |
| --- | --- |
| `packages/core/src/parse-theme-json.ts` | **New.** `parseThemeJson(text)` → `{ value, source }`, masking comments and trailing commas. |
| `packages/core/src/index.ts` | Exports it. |
| `packages/core/test/parse-theme-json.test.ts` | **New.** 32 tests. |
| `packages/vscode/src/domain/themeDocument.ts` | Uses the shared parser; the `themes` result now carries the masked `source`. |
| `packages/vscode/src/domain/diagnosticLocator.ts` | Scans the masked source; documented as such. |
| `packages/vscode/src/adapters/{diagnosticCollection,roleHover,colorSwatches}.ts` | Index `parsed.source` instead of the raw text. |
| `packages/cli/src/theme-shared.ts` | `readThemeJSON` uses the shared parser; the error now includes the parser's own message. |
| `packages/cli/src/commands/doctor.ts` | `recordedAlgorithms` uses the shared parser. |
| `packages/cli/test/jsonc.test.ts` | **New.** 8 tests. |
| `packages/vscode/test/jsonc.test.ts` | **New.** 10 tests. |
| `packages/vscode/test/diagnosticLocator.test.ts` | Two "rejects comments / trailing commas" tests replaced by offset-accuracy tests. |
| `packages/vscode/test/host/smoke.cjs` | One new real-host check. |
| `packages/vscode/test/fixtures/manual/` | **New.** Five fixtures for the human pass. |

## The design: mask, don't strip

Comments and trailing commas are replaced with **spaces of the same length**, then `JSON.parse` runs
on the masked text.

- **Values cannot drift**, because `JSON.parse` is still doing the parsing. The masker only writes
  spaces over characters that already exist.
- **Positions survive**, so the locator scans `source` and every offset still addresses the original
  file. The locator never learned comment syntax; there is exactly one definition of "comment" in the
  repository, and it lives in core.
- **Line terminators are preserved inside block comments**, so a CRLF document keeps its line and
  column numbers.

The load-bearing invariant, tested first and before any consumer changed:

```ts
parseThemeJson(validJson).source === validJson
```

For input that is already valid JSON, masking is a no-op. That is what makes JSONC purely additive.

## Behaviour change

`themvora validate` (and `inspect`, `diff`, `explain`, `doctor`) now accept comments and trailing
commas in theme files. This **widens** accepted input; nothing that parsed before stops parsing.
`package.json` and other manifests still go through strict `JSON.parse` — `inspectProject` and the
CLI's manifest reads were deliberately left alone.

## A defect this change exposed: `doctor` read theme files twice

`themvora doctor` parses a theme file in two places — once to read the recorded
generation algorithm, once to check the tokens. Only the first was switched to
`parseThemeJson()`; the second kept `JSON.parse`, and its `catch` reported the
file as **"unreadable"**.

The result was a command disagreeing with itself:

| Command | Same commented theme | Before | After |
| --- | --- | --- | --- |
| `themvora validate` | `✓ Theme is valid` | exit `0` | exit `0` |
| `themvora doctor` | theme-files check | **exit `3`**, `— unreadable` | exit `0`, `1 valid` |

Fixed at the second site; the `catch` message is now `could not be read or
parsed`, because "unreadable" described a file that read perfectly well. A
regression test asserts `validate` and `doctor` agree on the same commented file,
and it was confirmed to fail with the old parser restored.

Worth noting as a pattern: switching *a* parser is not switching *the* parser.
A `grep` for `JSON.parse` across the command would have found it; I checked the
theme-document entry point instead and missed the second call site in the same
file.

## Verification

| Gate | Result |
| --- | --- |
| Core tests | **984 passed / 82 files** (+32) |
| CLI tests | **343 passed / 17 files** (+9) |
| Extension tests | **351 passed / 29 files** (+13) |
| Typecheck | clean, all three packages |
| Bundle | **196.76 KB**, `vscode` the only external import, `child_process` 0 |
| Extension host — dev | **18/18** |
| Extension host — packaged VSIX | **18/18** |

The new host check, verbatim: *20 diagnostics, underline at "nope", 1 swatch (the invalid value gets
none)* — proving that a commented file is diagnosed and swatched, and that the underline still lands
on the right characters after masking.

## The one existing test file touched

`test/diagnosticLocator.test.ts` had two tests asserting the locator **rejects** comments and trailing
commas. Those are now impossible by design — the locator is handed masked text — so they were
replaced by four offset-accuracy tests: exact slices through a commented document, a CRLF document,
and a document with a trailing comma, plus one asserting that a token mentioned only inside a comment
is genuinely absent. No assertion was weakened; the subject changed with the design.

## Limitations

1. **JSONC support is comments and trailing commas only.** Unquoted keys, single-quoted strings and
   other JSON5 extensions are still rejected, because `JSON.parse` is still the parser.
2. **The editor UX pass is not done.** Squiggle readability, hover rendering, the picker round-trip,
   Tab/Enter and panel resize are unverified — see the checklist.
3. **No diagnostics for TypeScript registries.** Unchanged from M6, and deliberately deferred: it
   needs a core loader and a decision about executing workspace TypeScript.
