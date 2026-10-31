# Milestone 6 — Diagnostics and Editor Enhancements (scope)

> **Status: implemented** (2026-10-20). See `MILESTONE-6-REPORT.md` for what was built, what was
> verified, and what remains unverified.
> **Target:** VS Code `^1.94.0` (verified against 1.142.0).

## 1. Repository findings

Everything below was read from the source, not inferred from names.

### What already exists

| Concern | Reality | Where |
| --- | --- | --- |
| Theme parsing | `parseThemeDocument(text)` accepts exactly two shapes — a `{ light, dark }` pair or a single theme — and returns `{ shape: "themes", themes } \| "invalid-json" \| "unknown"`. **It discards positions entirely.** | `src/domain/themeDocument.ts` |
| Validation | `validateTheme(theme, options)` → `{ valid, issues }`; `issues[]` carry `code`, `type: "missing"`, `path` (a **dot-path**, e.g. `colors.primary`), `message`, `context`. No line, column or offset. | `packages/core/src/validate-theme.ts:8-22` |
| Layered validation | `validateThemeLevels(theme, options)` → `LevelIssue[]` with `level` (`structural`/`semantic`/`contrast`/`visual`/`accessibility`), `code`, optional `path`, `message`, optional `context`. Also position-free. | `packages/core/src/generation/validate-levels.ts:45-59` |
| Diagnostic codes | 16 `ThemeDiagnosticCode` values exist; the document-relevant ones are `TV_THEME_TOKEN_MISSING`, `TV_THEME_TOKEN_INVALID`, `TV_A11Y_CONTRAST_VIOLATION`, `TV_MODE_INVALID`, `TV_DIFF_UNRESOLVED_EXTENDS`. | `packages/core/src/diagnostics.ts:31-` |
| Role metadata | `SEMANTIC_ROLE_GROUPS` (canvas 4, surfaces 4, actions 8, states 2, interaction 3) and `describeRoleUsage(role)` → `{ supported, restricted, advisory }` are **public**. | `packages/core/src/model/semantic-roles.ts`, `generation/contexts.ts:514` |
| Document access | Two paths: `workspace.fs.readFile` behind `ProjectReader` (`src/services/workspaceReader.ts`), and `workspace.textDocuments` for open buffers (`src/commands/previewTheme.ts`). | |
| Change events | `onDidSaveTextDocument` (project controller), `onDidChangeTextDocument` (preview controller), `onDidChangeWorkspaceFolders`. **No `onDidOpenTextDocument` / `onDidCloseTextDocument` anywhere.** | `src/services/projectController.ts`, `src/commands/previewTheme.ts` |
| Failure taxonomy | `Outcome` (`ok`/`validation-failed`/`usage`/`error`/`cancelled`/`unavailable`) + `OperationResult<T>` envelope; `Diagnostic { severity, code, message, path?, hint? }`. | `src/domain/outcome.ts` |
| Logging | One `OutputChannel` named "Themvora", written by the preview controller for ignored messages. No logger abstraction, no telemetry, no network. | `src/extension.ts` |
| Configuration | **None.** No `contributes.configuration`, and `workspace.getConfiguration` is never called. | `package.json` |
| Activation | `activationEvents: []` — implicit activation via the six contributed commands and the one contributed view. | `package.json` |
| Language contributions | **None.** No `contributes.languages`; the extension targets built-in `json`. | `package.json` |
| Tests | 262 unit tests across 23 files against a hand-written `vscode` fake (26 exports). 11 extension-host checks in dev and packaged modes. | `test/`, `scripts/test-host.mjs` |
| Packaging | `scripts/**` and `test/**` excluded from the .vsix; `dist/index.js` is the only runtime file. | `.vscodeignore` |

### What does not exist

No `DiagnosticCollection`, no hover provider, no color provider, no `Range`/`Position`/`Diagnostic`/
`Hover`/`Color` in the fake host, and no code that reads editor state beyond the active editor's text.

## 2. The four verified constraints

These were measured, and they decide most of the design.

### C1 — Core reports paths, not positions

Every issue is `{ code, path: "colors.primary", message }`. There is no offset. To underline the
right token the adapter must locate the path in the text itself.

**No position-aware JSON parser is available**: `jsonc-parser` and `vscode-json-languageservice` are
not resolvable from this package, and adding a runtime dependency is out of bounds.

### C2 — `validateTheme` and `validateThemeLevels` overlap heavily

Measured on a theme with `primary: "not-a-color"` and two colours:

| Source | Count | Notes |
| --- | --- | --- |
| `validateTheme().issues` | **19** | all `TV_THEME_TOKEN_MISSING` |
| `validateThemeLevels()` | **20** | all `structural` |
| Overlap | **19 of 20** | same `path` in both |

The single issue levels adds is `TV_THEME_TOKEN_INVALID` on `colors.primary` — a value that is not a
colour, which `validateTheme` does not check.

Conversely, contrast is **only** in levels: forcing `primaryForeground = primary` gives
`validateTheme` 0 issues and `validateThemeLevels` one `contrast / TV_A11Y_CONTRAST_VIOLATION`.

So neither source is sufficient alone, and emitting both naively produces 19 duplicate squiggles.

### C3 — Activation does not fire on document open

`activationEvents: []` means the extension wakes on a command or the view. A diagnostic collection
that populates "when a theme file is opened" therefore needs an activation event it does not have
today. Options are in §6 Q9.

### C4 — Editor features *are* observable from the host

Unlike the webview, these are reachable through public APIs from the extension host:

- `vscode.languages.getDiagnostics(uri)` — the collection's actual contents.
- `vscode.commands.executeCommand("vscode.executeHoverProvider", uri, position)` — real hover results.
- `vscode.commands.executeCommand("vscode.executeDocumentColorProvider", uri)` — real colour ranges.

M6 can therefore be **host-verified for behaviour**, not just execution. That is a materially
stronger position than Milestone 5's preview.

## 3. Feature boundaries

### A. Diagnostics

**Source of truth:** core, in two tiers.

| Severity | Source | Rationale |
| --- | --- | --- |
| **Error** | `validateTheme().issues` (`TV_THEME_TOKEN_MISSING`) | The theme is invalid; `themvora validate` exits 3 on this. Same verdict in both places. |
| **Error** | structural `TV_THEME_TOKEN_INVALID` from levels | A value that is not a colour is not a warning. |
| **Error** | `TV_MODE_INVALID` | `meta.mode` outside `light`/`dark`/`system`. |
| **Warning** | levels: `contrast`, `accessibility`, `visual`, `semantic` | The theme is valid but has a quality problem. `validateTheme` calls it valid, so erroring would contradict it. |
| **Info** | — | None in M6. Nothing core reports is purely informational for a document. |

**Dedup rule (from C2):** drop every `structural` level issue whose code is `TV_THEME_TOKEN_MISSING`
— `validateTheme` owns those. Keep structural issues with any other code. Key: `(code, path)`.

**Ownership:** core decides *what* is wrong and *how wrong*; the adapter decides *where* and *how to
show it*. No validation rule is re-implemented — the adapter never inspects a colour value itself.

**Lifecycle:** `onDidOpenTextDocument`, `onDidChangeTextDocument` (debounced 200 ms, matching the
preview), `onDidCloseTextDocument` → `collection.delete(uri)`, `onDidChangeConfiguration` →
re-evaluate everything open, `onDidSaveTextDocument` → no-op (the change event already fired).
Disposal on deactivate via `context.subscriptions`.

**Scope of a document:** diagnostics are computed per *document*, never per workspace — no scanning
of unopened files.

### B. Hover

**Content, all from core:** the role's group (`SEMANTIC_ROLE_GROUPS`: label + description), and
`describeRoleUsage(role)` → what it is supported for, what it is restricted from, advisory uses.
Plus the current value from the document and, when the theme is otherwise valid, the contrast pairs
that role participates in.

**Range:** the word under the cursor, via `document.getWordRangeAtPosition` — **no locator needed**,
because the role name is the word. Guarded by "is this document a theme at all", so hovering
`"primary"` in an unrelated JSON file does nothing.

**Languages:** `json` and `jsonc` only. No custom language, no language server.

### C. Color swatches

**What can work:** a `DocumentColorProvider` registered for `json`/`jsonc` that returns colours only
for documents that parse as a theme. VS Code calls it for *every* JSON file, so the first step is a
cheap rejection (does the text contain `"tokens"`?) before any real work.

**Range:** the exact span of the hex literal — which needs the same locator as diagnostics (C1).

**Write-back:** `provideColorPresentations` returns a `TextEdit` covering **only the hex digits**, so
a picker change cannot touch surrounding content. The round-trip is tested by applying the edit and
asserting the document differs in exactly that range.

**What will not work / is not promised:** TypeScript registries (`themes.ts`) — still unreadable;
named colours, `rgb()`, `hsl()` — core stores hex, and the provider will only offer swatches for
values matching `#rgb`/`#rrggbb`/`#rrggbbaa`; malformed values get no swatch rather than a guess.

### D. Interaction with VS Code

| Situation | Behaviour |
| --- | --- |
| Unsaved document | Diagnostics and hovers use the **buffer**, not the file. |
| Invalid intermediate edit (e.g. half-typed JSON) | `parseThemeDocument` returns `invalid-json`; clear diagnostics for that document rather than reporting a parse error. A red squiggle on every keystroke while typing is noise; the theme is not yet a theme. |
| Large file | Parse only documents whose text is a theme (cheap substring check first); debounce; no full re-scan on every keystroke. |
| Many open documents | One collection keyed by URI; recompute only the changed document. |
| Configuration change | Re-evaluate every open theme document. |
| Deactivation | `collection.dispose()`, providers disposed via `context.subscriptions`. |
| Stale async | Diagnostics are computed **synchronously** (core validation is sub-millisecond), so there is no in-flight result to overwrite. The debounce is the only asynchrony; it re-reads the document at fire time and compares `document.version` before publishing. |

## 4. Data flow

```text
onDidOpenTextDocument / onDidChangeTextDocument (debounced)
        │
        ├─ cheap reject: not json/jsonc, or no "tokens" in text ──▶ delete(uri); return
        │
        ▼
parseThemeDocument(text)  ──▶ not a theme ──▶ delete(uri); return
        │
        ▼
for each theme in document.themes:
    validateTheme(theme, { themes })        → errors
    validateThemeLevels(theme)              → warnings (minus structural missing-token dupes)
        │
        ▼
domain/diagnosticLocator.ts: (text, path) → { start, end } | null
        │
        ▼
vscode.Diagnostic(range, message, severity)  ──▶ collection.set(uri, diagnostics)
```

Everything above `collection.set` is pure or adapter-local; nothing outside `adapters/` imports
`vscode`.

## 5. Proposed files

| File | Kind | Purpose |
| --- | --- | --- |
| `src/domain/diagnosticLocator.ts` | pure | Map a dot-path to a character range inside the two accepted shapes. |
| `src/domain/themeDiagnostics.ts` | pure | Core issues → severity + dedup + message, with no `vscode` import. |
| `src/adapters/diagnosticCollection.ts` | adapter | The collection, its lifecycle subscriptions, debounce and disposal. |
| `src/adapters/roleHover.ts` | adapter | `registerHoverProvider` over core's role metadata. |
| `src/adapters/colorSwatches.ts` | adapter | `registerColorProvider` + presentations. |
| `test/*` | tests | See §7. |

## 6. The nine questions

**Q1 — Source of truth per diagnostic.** Core, always: `validateTheme` for errors,
`validateThemeLevels` for quality warnings. The adapter adds only position and severity. No rule is
re-implemented (see §3A).

**Q2 — Errors vs warnings.** Errors: missing required tokens, non-colour values, invalid mode —
these make the file unusable and match the CLI's exit-3 verdict. Warnings: contrast and the
semantic/visual/accessibility levels — core still calls the theme valid. The split follows core's own
verdict rather than an opinion invented here.

**Q3 — Core paths → VS Code ranges.** The open problem. Core gives `colors.primary`; VS Code wants a
`Range`. Two options:

- **(a) A small structural locator** in `domain/`: walk the JSON text once, tracking string literals
  and nesting, and record the offset of each key at a given path. ~80 lines, no dependency, testable
  without a host. Handles the pair shape by resolving which half a theme came from. *Recommended.*
- **(b) Coarse ranges**: report every issue at the theme object's opening brace. Cheap and honest,
  but the Problems panel becomes unhelpful and colour swatches become impossible.

This needs approval before implementation, because (a) is the single largest piece of new code in M6
and is the one most likely to be subtly wrong.

**Q4 — Preventing stale results.** Core validation is synchronous; the debounce re-reads the document
at fire time and compares `document.version`, dropping the update if it changed again. There is no
long-running computation to cancel.

**Q5 — Can colour swatches work reliably?** Yes for the hex-literal path, **conditional on Q3(a)**.
Without a locator there is no range, and without a range there is no swatch and no safe write-back.
TypeScript registries and non-hex colour syntax are out.

**Q6 — Languages and formats.** `json` and `jsonc`, for the two document shapes
`parseThemeDocument` already accepts. Not TypeScript, not `theme.config.*`, not other extensions'
formats.

**Q7 — Command, diagnostic, hover or provider?**

| Capability | Mechanism | Why |
| --- | --- | --- |
| Missing/invalid tokens | Diagnostic (error) | Ambient; no command needed. |
| Contrast problems | Diagnostic (warning) | Same. |
| Role explanation | Hover | Passive, on demand. |
| Colour picker | `DocumentColorProvider` | Native; re-implementing it in a command would be worse. |
| Full report | Existing `Validate Theme…` command | Already built; diagnostics must not duplicate its output surface. |

**Q8 — What can be tested headlessly.** Core unit tests and the locator are pure vitest. Adapter
behaviour is testable with an extended fake host. **And** — unlike M5 — diagnostics, hovers and colour
ranges are observable in the real host via `getDiagnostics`, `executeHoverProvider` and
`executeDocumentColorProvider`, so behaviour can be asserted there too. What still needs a human:
the colour picker UI, and whether squiggles are *readable* in a real theme.

**Q9 — Activation.** To diagnose on open, the extension must be awake. Options:

- `onLanguage:json` + `onLanguage:jsonc` — activates for every JSON file. Cost: loading a ~175 KB
  bundle once per session, plus a cheap rejection per document.
- Keep `activationEvents: []` — diagnostics appear only after a Themvora command or the view runs.
  No cost, poor discoverability.
- `workspaceContains:**/themvora.config.*` — narrow, but only fires when the workspace opens.

**Recommendation:** `onLanguage:json` + `onLanguage:jsonc`, with the cheap rejection first. This
needs approval because it changes what the extension does on every JSON file in the user's workspace.

## 7. Test strategy

| Layer | Tool | Covers |
| --- | --- | --- |
| Core | existing vitest | Unchanged — M6 adds no core code. |
| `domain/diagnosticLocator` | vitest, no host | Pair and single shapes; nested `tokens`; whitespace and indentation; a path that does not exist; the *second* theme of a pair (the disambiguation case); a key appearing in both halves. |
| `domain/themeDiagnostics` | vitest | Severity mapping; the measured 19/20 dedup; contrast-only warnings; messages carry the role path. |
| Adapters | vitest + extended fake host | Collection populated on open/change, cleared on close, cleared when the document stops being a theme; debounce collapses a burst; `document.version` guard drops a stale recompute; hover returns content for a role and `undefined` elsewhere; colour ranges are exact; a presentation edit changes only the hex digits. |
| Host | `scripts/test-host.mjs` | `getDiagnostics` after opening a theme with a missing token; `executeHoverProvider` on `primary`; `executeDocumentColorProvider` returns 21 ranges; all still 0 diagnostics after closing. |
| Manual | human | Colour picker round-trip in the real UI; whether squiggles and hovers read well; Tab/Enter accessibility is **not** claimed by M6. |

Regression cases the brief asks for, mapped: stale results → version guard test; duplicates → the
19/20 dedup test; accurate ranges → locator table tests; invalid intermediate edits → cleared
diagnostics; unsaved changes → buffer-based test; document close → deletion test; colour round-trip →
presentation edit test.

## 8. Phased plan

| # | Step | Gate |
| --- | --- | --- |
| 1 | `diagnosticLocator` + tests | Pure, no host; the risky foundation lands first and alone. |
| 2 | `themeDiagnostics` (severity + dedup) + tests | Pure; proves the mapping before any editor API is touched. |
| 3 | `diagnosticCollection` adapter + fake-host support + tests | Diagnostics live; lifecycle and debounce proven. |
| 4 | Host checks for diagnostics | Behaviour asserted in a real host, not just execution. |
| 5 | `roleHover` + tests + host check | Smallest remaining feature. |
| 6 | `colorSwatches` + round-trip tests + host check | Depends on step 1. |
| 7 | Activation events, docs, gates | Manifest change reviewed on its own. |

## 9. Risks

| Risk | Assessment |
| --- | --- |
| **The locator is subtly wrong** | Highest risk. Mitigated by landing it alone in step 1 with table-driven tests over both shapes, and by falling back to "no range → no diagnostic" rather than a wrong range. |
| **Duplicate diagnostics** | Measured, not hypothetical: 19/20 overlap. The dedup rule is explicit and tested. |
| **Activation cost** | `onLanguage:json` wakes the extension for every JSON file. Reversible in one manifest line; the cheap rejection keeps the per-document cost near zero. |
| **Colour write-back corrupting a document** | The edit range is the hex literal only, and the round-trip test applies it. Refuses values it cannot parse rather than guessing. |
| **Diagnostics fighting the user mid-edit** | Half-typed JSON produces no diagnostics at all; only a complete theme is judged. |
| **Two validators drifting** | None: the adapter calls core and never re-derives a rule. If core changes, diagnostics change with it. |

## 10. Non-goals

- A language server, or a custom language contribution.
- Diagnostics for unopened files or for TypeScript registries (`themes.ts` stays unreadable).
- Colour swatches for non-hex syntax, or for `.ts` files.
- Code actions / quick fixes (a natural M7 candidate, not M6).
- Any claim about Tab/Enter accessibility or editor-resize behaviour — untested, so unclaimed.
- Settings beyond a single on/off toggle, and even that only if step 7 needs it.

## 11. Completion criteria

1. A theme with a missing token shows **exactly one** error per missing role, at the role's own range.
2. A theme with a contrast failure shows a **warning**, and `validateTheme` still reports it valid —
   the two must not contradict each other.
3. A half-typed document shows **no** diagnostics; a closed document leaves **none** behind.
4. Hovering `primary` in a theme explains the role from core's metadata; hovering it in an unrelated
   JSON file does nothing.
5. A colour swatch's edit changes **only** the hex digits of that token.
6. All existing 262 tests pass unmodified; new tests cover every row in §7.
7. Bundle gate holds: `vscode` the only external import, no `child_process`.
8. The host suite asserts real `getDiagnostics`, hover and colour results — not just that commands run.

## 12. Decisions needing approval before implementation

1. **Range mapping: locator (a) or coarse ranges (b)?** — §6 Q3. This is the largest piece of new code
   and the one most likely to be subtly wrong. Recommendation: (a), landed alone in step 1.
2. **Activation: `onLanguage:json` (+`jsonc`), or command-only?** — §6 Q9. Changes what the extension
   does for every JSON file. Recommendation: `onLanguage:json`.
3. **Contrast as warning, not error** — §3A. It contradicts nothing today, but a user may expect a
   red squiggle for a failing pair. Recommendation: warning, matching core's `valid: true`.
4. **Colour write-back scope** — hex only, and only for documents that parse as themes. Anything wider
   needs a parser this repository does not have.
