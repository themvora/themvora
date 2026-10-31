# Milestone 7 — JSONC support and editor UX validation (scope)

> **Status: implemented as the M6 follow-up** (2026-10-21). Not renumbered: the plan's Milestone 7
> (external-consumer hardening) and Milestone 8 keep their numbers, per the decision in §10.
> Implementation record: `MILESTONE-6-JSONC-REPORT.md`; the outstanding human pass is
> `MILESTONE-6-UX-CHECKLIST.md`.
>
> **This document is kept as the rationale, not as a plan.** One defect it did not anticipate is
> recorded in the report: `doctor` parsed theme files twice, with two different parsers, so a
> commented theme passed one check and failed the next.
> **Deferred by decision:** TypeScript registry support. See §8 for why it is a different problem.

## 1. Findings

Read from the source, not assumed.

| Fact | Where |
| --- | --- |
| The extension parses theme documents with `JSON.parse`. | `src/domain/themeDocument.ts:59` |
| The CLI parses them the same way. | `packages/cli/src/theme-shared.ts:38-42` |
| **No JSONC handling exists anywhere** — no strip/mask utility, no `strip-json-comments`. | `grep` across `packages/` |
| The extension registers for the `jsonc` language id (M6), so a commented `.jsonc` file **silently does nothing**: no diagnostics, no hover, no swatches. | `package.json`, `adapters/diagnosticCollection.ts` |
| The M6 locator is a hand-written scanner that **deliberately rejects** comments and trailing commas, with tests asserting it. | `src/domain/diagnosticLocator.ts`, `test/diagnosticLocator.test.ts` |
| `inspectProject` also uses `JSON.parse`, but for `package.json` — a manifest, not a theme. | `src/domain/inspectProject.ts` |

So the current state is not "JSONC is unsupported"; it is "JSONC is half-supported in a way that looks
broken". The editor claims to handle `.jsonc` and then quietly declines.

## 2. The decision that shapes this milestone

**Where does JSONC tolerance live?**

| Option | Consequence |
| --- | --- |
| **A. Extension only** | A commented theme validates in the editor and fails `themvora validate`. This contradicts the rule Milestone 6 was built on — *the editor must not contradict the CLI* — and is the same class of defect as the `extends` bug fixed in M4. |
| **B. Core owns it; CLI and extension both use it** | One behaviour everywhere. Costs a public core export, a CLI behaviour change, and regenerated API docs. **Recommended.** |
| **C. No JSONC; document the limitation** | Honest, zero risk, and leaves the `jsonc` registration misleading. Rejected given the goal. |

Option B is the only one that keeps acceptance consistent, and it matches the standing instruction
that the engine stays centralized.

## 3. Design: mask, do not strip

The naive implementation removes comments and trailing commas, then calls `JSON.parse`. That breaks
positions: every offset after the first removed character shifts, and the M6 locator would point at
the wrong text.

**Proposal:** replace the *characters* of each comment, and each trailing comma, with **spaces of the
same length**, then `JSON.parse` the masked text.

```ts
// core
export interface ParsedThemeJson {
  /** The parsed value. */
  readonly value: unknown;
  /** The input with comments and trailing commas blanked — same length, same offsets. */
  readonly source: string;
}
export function parseThemeJson(text: string): ParsedThemeJson;   // throws on genuinely invalid input
```

Three properties follow, and each is testable:

1. **Values cannot drift.** `JSON.parse` stays the value authority — escapes, numbers and duplicate
   keys behave exactly as they do today, because it is still `JSON.parse` doing the work.
2. **Positions survive.** Masking preserves length, so the locator scans `source` and every offset it
   produces addresses the original text. The locator does **not** need to learn comment syntax.
3. **Plain JSON is provably unchanged.** For input that is already valid JSON,
   `parseThemeJson(text).source === text`. That invariant is the strongest guarantee that the 338
   existing tests keep meaning what they meant.

The masker tracks string state, so `"// not a comment"` inside a value survives, and `\"` does not
end a string early. An unterminated block comment consumes to end-of-input and `JSON.parse` then
fails — a real error, reported as one.

### Consumers

| Consumer | Change |
| --- | --- |
| Extension `parseThemeDocument` | Calls `parseThemeJson` instead of `JSON.parse`. |
| Extension `indexThemeDocument` | Scans the masked `source` rather than the raw text. Ranges stay correct by construction. |
| CLI `readThemeJSON` | Calls `parseThemeJson`. A commented theme now loads instead of failing with "file is not valid JSON". |
| `inspectProject` | **Unchanged.** `package.json` is a manifest and stays strict JSON. |

## 4. What this changes for users

- A `.jsonc` theme file with comments and trailing commas now gets diagnostics, hovers and swatches —
  the features M6 registered for `jsonc` but could not deliver.
- `themvora validate commented.json` now succeeds where it previously failed. That is a **widening**
  of accepted input, not a breaking change; nothing that parsed before stops parsing.
- Plain `.json` behaviour is identical, by the invariant in §3.

## 5. Tests

| Layer | Cases |
| --- | --- |
| core (`parseThemeJson`) | Identity on plain JSON; line comments; block comments; both inside one document; `//` inside a string untouched; escaped quotes; trailing comma in an object and in an array; CRLF; unterminated block comment throws; masked text has the same length as the input; the parsed value equals `JSON.parse` of the equivalent comment-free text. |
| extension (`themeDocument`) | A commented pair and a commented single theme both parse; a commented document that is not a theme still reports the shape error. |
| extension (`diagnosticLocator`) | Ranges inside a commented document are **exact** — sliced text equals the token value; the two "refuses comments / trailing commas" tests are replaced by tolerance tests, since the scanner now receives masked text. |
| CLI | A commented theme file loads and validates; a genuinely malformed file still fails with the same message. |
| host | A commented theme file opened in a real editor produces diagnostics, a hover and 21 swatches. |
| Existing | All 338 tests must pass. The two locator assertions that change are named in the report, not silently dropped. |

## 6. Editor UX validation

The M6 report is explicit that three things were never verified: whether squiggles and hovers *read*
well, the colour-picker round-trip in the real UI, and Tab/Enter. None of them can be automated from
the extension host.

What this milestone can do is make the human pass **short and repeatable**:

1. **Fixtures** in `test/fixtures/manual/`, each with a stated expectation:
   - `healthy-pair.json` — 0 diagnostics, 42 swatches, hover explains `primary`.
   - `missing-tokens.json` — 20 errors, each on the right line.
   - `low-contrast.json` — 1 warning, 0 errors.
   - `commented.jsonc` — the same as healthy, with comments (depends on §3).
   - `malformed.json` — 0 Themvora diagnostics.
2. **`MILESTONE-7-UX-CHECKLIST.md`** — a tick list: squiggle placement, hover content and wrapping,
   swatch colour accuracy, picker round-trip (change a colour, confirm only that literal changed),
   Tab/Enter on the preview's mode buttons, panel resize, Problems-panel grouping.
3. Anything the pass finds becomes a focused regression test plus a fix in the responsible layer —
   the same rule the M5 host pass used, which found two real defects.

**Not automatable, and therefore not claimed until the checklist is ticked:** readability, keyboard
accessibility, and the picker's actual behaviour.

## 7. Constraints

- **All 338 existing tests pass.** Any assertion that must change is named and justified, as in M6.
- **The validation engine stays in core.** This milestone moves *parsing* into core; it does not add
  a validation rule anywhere.
- **No new runtime dependency.** The masker is ~60 lines, tested directly.
- **No telemetry, no network, no subprocess.**
- Bundle gate unchanged: `vscode` the only external import, no `child_process`.

## 8. Deferred: TypeScript registry support

Deliberately out of scope, and not a parser adjustment:

- The extension must **find** `themes.ts` (already done, M2), then decide whether to **execute**
  workspace TypeScript. That is a sandboxing and trust decision, not a syntax one.
- Core has no loader for it, so the work starts with a core API (`loadThemeModule`) that does not
  exist — the same gap M3 recorded.
- It needs its own discovery strategy (which files, which module system, what happens when the project
  has no build step), and its own security review.

It stays deferred until that API and that decision exist.

## 9. Risks

| Risk | Assessment |
| --- | --- |
| **The masker corrupts a value** | Mitigated by the identity invariant on plain JSON and by `JSON.parse` remaining the value authority — the masker only ever inserts spaces. |
| **CLI behaviour change** | Widening only. The risk is the opposite: a user writes comments, the CLI accepts, and a *different* tool rejects the file. Documented, not prevented. |
| **Core API growth** | Two new exports regenerate `api-manifest.json` and `api-reference/core.md`, and re-export through `nuxt` — the same cost `themeToCssDocument` had in M5. |
| **The UX pass finds defects in M6 code** | Likely, and the point of the exercise. Budget a fix round. |
| **Masking hides a real syntax error** | A comment inside a string is not masked; a comment where a value belongs still fails at `JSON.parse`. |

## 10. Decisions needing approval

1. **Option B — move JSONC tolerance into core, CLI included.** The alternative is extension-only
   (asymmetric) or no support at all.
2. **`parseThemeJson` returns `{ value, source }`**, where `source` is the masked text the locator
   scans. The alternative is teaching the locator comment syntax independently — two definitions of
   "comment", which this repository has consistently avoided.
3. **Numbering.** Insert this as Milestone 7 and shift the existing M7/M8 to M8/M9, or keep the
   existing numbering and call this a follow-up to M6.
4. **CLI acceptance widening.** Confirm that `themvora validate` accepting comments is wanted; if not,
   Option B collapses and only the extension changes — with the asymmetry documented.

## 11. Sequence

| # | Step | Reviewable because |
| --- | --- | --- |
| 1 | `parseThemeJson` + masker in core, with the identity invariant tested first | Pure, no consumers yet; the invariant proves existing behaviour is untouched |
| 2 | Locator scans masked text; tolerance tests replace the two refusal tests | Ranges re-proven against commented fixtures |
| 3 | Extension `parseThemeDocument` switched over | All commands inherit it at once |
| 4 | CLI `readThemeJSON` switched over + CLI test | The asymmetry closes |
| 5 | Host check for a commented theme | Real-editor proof |
| 6 | Manual fixtures + UX checklist | The human pass becomes a 10-minute job |
| 7 | API docs regeneration, README, CHANGELOG, gates | Same process as M5's core export |
