# Milestone 6 — implementation report

> **Date:** 2026-10-20. **Scope:** `MILESTONE-6-SCOPE.md`. **Status:** implemented and verified.

## What was built

| File | Kind | Responsibility |
| --- | --- | --- |
| `src/domain/diagnosticLocator.ts` | new, pure | Scan the text once; map a dot-path to a character span inside one theme. |
| `src/domain/themeDiagnostics.ts` | new, pure | Core issues → severity, dedup, theme half. |
| `src/domain/hexColor.ts` | new, pure | Parse and format `#rgb` / `#rrggbb` / `#rrggbbaa`. |
| `src/adapters/diagnosticCollection.ts` | new, adapter | Collection, document lifecycle, debounce, disposal. |
| `src/adapters/roleHover.ts` | new, adapter | Hover content from core's role metadata. |
| `src/adapters/colorSwatches.ts` | new, adapter | Swatches and safe write-back. |
| `src/extension.ts` | changed | Registers the three editor features at activation. |
| `package.json` | changed | `activationEvents: ["onLanguage:json", "onLanguage:jsonc"]`. |
| `test/stubs/vscode.ts` | changed | Documents, `DiagnosticCollection`, `Range`/`Position`/`Diagnostic`, hover and colour types. |
| `test/host/smoke.cjs` | changed | Six new real-host checks. |

No new runtime dependency. `vscode` remains the bundle's only external import.

## Ranges, and what happens when there is none

Core reports **dot-paths relative to `theme.tokens`** — `colors.primary`, not `tokens.colors.primary`.
The adapter prefixes the first segment when it is one of core's `TOKEN_GROUPS`; anything else is used
as written.

| Situation | Range |
| --- | --- |
| Token present | The **value's** characters, excluding quotes. A swatch edits exactly these. |
| Token missing | The deepest ancestor that exists — `colors`, else `tokens`, else the theme object. The message names the missing path. |
| Scalar where an object belongs | The scalar itself: it is the problem, and dropping the diagnostic would be worse. |
| Theme half not found, or text unscannable | **No diagnostic**, and a line in the Themvora output. Never an unrelated property. |

The locator is a scanner over text `JSON.parse` already accepted. It matches the parser on duplicate
keys (last wins), rejects trailing commas, and refuses JSONC comments — see below.

## Severity

| Severity | Source | Codes |
| --- | --- | --- |
| Error | `validateTheme(theme, { themes })` | `TV_THEME_TOKEN_MISSING` |
| Error | structural level, minus missing-token duplicates | `TV_THEME_TOKEN_INVALID` |
| Warning | `semantic`, `contrast`, `visual`, `accessibility` levels | `TV_A11Y_CONTRAST_VIOLATION` and friends |

`TV_MODE_INVALID` is mapped to error, but **core never emits it for a theme definition** — it belongs
to the runtime `setMode` API. The adapter does not invent a mode validator to make the mapping fire.

The split follows core's verdict: a contrast problem is a warning because `validateTheme()` still
returns `valid: true`. An error there would make the extension contradict the CLI.

## Deduplication

Measured, not assumed. A theme with two colours and `primary: "not-a-color"`:

| Source | Issues |
| --- | --- |
| `validateTheme` | 19 (`TV_THEME_TOKEN_MISSING`) |
| `validateThemeLevels` | 20 (all structural) |
| Overlap | **19 of 20** |

Structural `TV_THEME_TOKEN_MISSING` from the levels pass is dropped — `validateTheme` owns those. The
survivor is `TV_THEME_TOKEN_INVALID`, which only the levels pass finds. Remaining issues dedup on
`(half, code, path)`; the half is part of the key so the same path wrong in both halves stays two
diagnostics.

Net result for that fixture: **20 diagnostics, one per path, no duplicates** — asserted in the unit
suite and in the real host.

## Parsing support — the honest version

`parseThemeDocument` uses `JSON.parse`. Therefore:

- **Supported:** JSON, both accepted shapes (single theme, `{ light, dark }` pair).
- **Not supported:** JSONC **comments** and trailing commas. A `.jsonc` file containing them fails to
  parse, so it gets **no diagnostics, no hover and no swatches** — deliberately, rather than a parse
  error squiggle on every keystroke.

Both `json` and `jsonc` language ids are registered, so a comment-free `.jsonc` document works. This
report does not claim JSONC comment support, because the parser does not have it.

## Hover

Registered for `json` and `jsonc`. Content: role name, the half it belongs to, its
`SEMANTIC_ROLE_GROUPS` label and description, the current value, `describeRoleUsage()`'s intended and
restricted uses, and — **only when `validateTheme()` says the theme is valid** — the contrast pairs
the role takes part in. A second contrast validator was not written.

The half is chosen by which theme's span contains the cursor, so hovering `primary` in the dark theme
shows the dark value. A `primary` key in an unrelated JSON file produces no Themvora hover.

## Colour swatches

| Aspect | Behaviour |
| --- | --- |
| Accepted values | `#rgb`, `#rrggbb`, `#rrggbbaa` — whatever the schema stores |
| Rejected | Named colours, `rgb()`, malformed values: **no swatch**, not a guess |
| Scope | Only values reached through `tokens.colors.<role>`; a hex string elsewhere gets nothing |
| Edit range | Exactly the literal's characters |
| Shorthand | Normalised to `#rrggbb` on edit (documented) |
| Alpha | Preserved when not opaque, as `#rrggbbaa` |

## Activation

`onLanguage:json` and `onLanguage:jsonc`. The extension now wakes for every JSON file, so the first
thing each handler does is a cheap rejection (`"tokens":` or both `"light":` and `"dark":`) before any
parse. No workspace scanning; only documents the editor has open are considered.

## Verification

| Gate | Result |
| --- | --- |
| Unit tests | **338 passed / 28 files** — 262 existing + 76 new |
| New test files | locator 25, diagnostics 11, collection 18, hover 10, swatches 12 |
| Typecheck | clean |
| Bundle | **194.41 KB**, `vscode` the only external import, `child_process` 0 |
| Extension host — dev | **17/17** |
| Extension host — packaged VSIX | **17/17** |
| `audit-packages` | 615 checks, 0 failures |
| `export-inventory` | 24 packages in sync |
| `.vsix` | 48 files, 101.94 KB |

Real-host results, quoted from the run:

- `diagnostics: one error per missing token, at real ranges` — **20 errors; invalid value underlined at "nope"**
- `diagnostics: contrast is a warning, and core still says valid` — **1 warning (contrast), 0 errors**
- `diagnostics: a malformed edit clears them` — **cleared after a malformed edit**
- `hover: explains a role in a theme document` — **13 lines of hover content**
- `hover: stays out of unrelated JSON` — **no Themvora hover**
- `swatches: one exact range per colour token` — **21 swatches, every range a hex literal**

## Changed existing tests

Two assertions in `test/previewTheme.test.ts` counted `__state.changeListeners` absolutely. The
diagnostic collection now also subscribes to document changes, so that counter no longer isolates the
preview's own watcher. They now assert a **delta** — one listener added while the panel is open, none
left after it closes. The property tested is unchanged; only the measurement is.

Everything else in the existing suite is untouched.

## Limitations

1. **Closing a document is not verified in the host.** The extension host has no public API to close
   a document, and `workbench.action.closeAllEditors` does not drop one opened with
   `openTextDocument` — it stays in `workspace.textDocuments`, so `onDidCloseTextDocument` never
   fires. Covered by the adapter test, which raises the event directly.
2. **No colour-presentation round-trip in the host.** There is no `executeColorPresentationProvider`
   command. The round-trip is asserted in the unit suite by applying the returned edit to the text.
3. ~~**JSONC comments are unsupported**, per the parser.~~ **Superseded** by the M6 follow-up:/n   `parseThemeJson()` in core is now shared by the CLI and the extension. See
   `MILESTONE-6-JSONC-REPORT.md`.
4. **TypeScript registries** (`themes.ts`) remain unreadable, so no diagnostics there.
5. **Not claimed:** whether squiggles and hovers read well in a real window, and Tab/Enter
   accessibility of anything. Those need a human; this milestone does not assert them.
