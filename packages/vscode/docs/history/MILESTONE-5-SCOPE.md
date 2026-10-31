# Milestone 5 — Theme Preview MVP (scope)

> **Status: implemented** (2026-10-20), except the visual verification recorded in §14.  
> **Target:** VS Code `^1.94.0` (verified against 1.142.0).

## 1. Repository findings

Everything below was read from the repository, not assumed.

### What exists

| Area               | State                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Webview code       | **None.** No `createWebviewPanel`, `registerWebviewViewProvider` or `asWebviewUri` anywhere in `packages/`. This milestone introduces the first one.                                                                                                   |
| Commands           | Six registered and working: `generateTheme`, `validateTheme`, `copyCssVariables`, `browsePresets`, `compareThemes`, `refresh`.                                                                                                                         |
| Command convention | Each command module exports a `COMMAND_*` id, a `register*Command(deps)` returning a `Disposable`, and a `run*(argument, deps)` that takes an optional `Uri` so it is scriptable. Dependencies arrive as a `deps` object — no module-level singletons. |
| Adapter convention | `src/adapters/` holds host-facing seams (`projectTree`, `statusBar`, `clipboard`). Domain code never imports `vscode`.                                                                                                                                 |
| Parsing            | `domain/themeDocument.ts` → `parseThemeDocument(text)` returns `{ shape: "themes", themes } \| "invalid-json" \| "unknown"`, and `shapeMessage()` words the failure. Used by all three document commands.                                              |
| Output             | One shared `OutputChannel` named "Themvora", created at activation.                                                                                                                                                                                    |
| Tests              | 177 unit tests (18 files) against a fake `vscode` module; `scripts/test-host.mjs` runs 10 checks in a real extension host, in dev mode and against the unpacked VSIX.                                                                                  |
| Bundle gate        | `test/bundle.test.ts` asserts the built bundle's only external import is `vscode` and that it contains no `child_process`.                                                                                                                             |

### Core APIs the preview can use

Verified against `@themvora/core` at runtime:

- **`parseThemeDocument`** (extension) — shape only; validity is separate.
- **`validateTheme(theme, options?)`** — `options.themes` supplies a registry for `extends`.
- **`resolveTheme(themes, themeName)`** — resolves the `extends` chain *and* token references, returning a concrete `ThemeDefinition`.
- **`getThemeMode(theme)`** — the canonical mode resolver: `meta.mode`, else inferred from the name, else `"light"`. Can return `"system"`.
- **`themeToCSSVariables(theme)`** — the 21 colour roles plus spacing, radius, shadows, border widths, z-index, breakpoints and typography, as `--theme-*` custom properties.
- **`measureThemeContrast(theme)`** — canonical contrast pairs.

The 21 colour roles, which is exactly the surface budget for the preview:

```text
background  foreground  muted  mutedForeground
card  cardForeground    popover  popoverForeground
primary  primaryForeground  secondary  secondaryForeground
accent  accentForeground    destructive  destructiveForeground
success  successForeground  border  input  ring
```

## 2. Finding: inheritance is not resolved today

This is the most important thing this inspection produced, and it affects Milestone 4 as well as  
Milestone 5.

`themeToCSSVariables()` calls `resolveTokens()`, which resolves **token references** but not  
**`extends`**. `validateTheme()` only resolves `extends` when handed `options.themes`.

Measured, on a theme that extends a generated one:

| Call                                                            | Result                                         |
| --------------------------------------------------------------- | ---------------------------------------------- |
| `themeToCSSVariables(derived)`                                  | **1** variable (only the overridden `primary`) |
| `themeToCSSVariables(resolveTheme([base, derived], "derived"))` | **22** variables                               |
| `validateTheme(derived)`                                        | **invalid**                                    |
| `validateTheme(derived, { themes: [base, derived] })`           | **valid**                                      |

Consequence: `Themvora: Validate Theme…` reports a derived theme as invalid, and  
`Themvora: Copy CSS Variables` would copy a one-line stylesheet. Both commands have the sibling  
themes in hand — they parse the whole document — and simply do not pass them on.

**Handling.** The preview must not repeat this: it resolves with `resolveTheme(themes, name)` and  
validates with `{ themes }`. Fixing the two Milestone 4 commands was a **separate, reviewable change**  
(§12, subtask 0) — **done**: both commands now pass the document registry, and a derived theme resolves to 22 variables with 16 measured contrast pairs.

## 3. User workflow

**Command:** `Themvora: Preview Theme` (`themvora.previewTheme`). One command, not two.

**Source selection**, in order:

1. If the **active editor** is a file whose text parses as a theme document (`parseThemeDocument`  
   returns `"themes"`), preview it. No dialog.
2. Otherwise open the same `showOpenDialog` used by Validate and Copy CSS, restricted to `*.json`.
3. Dismissing the dialog does nothing and reports nothing.

No second command for "preview the active file" — the command already prefers it.

**When the source is not a theme:** the panel opens and shows an error state naming the problem  
(`shapeMessage`) and the file. It does **not** render a fallback palette: a plausible-looking preview  
of a theme that was never read is the one failure mode worth designing against.

## 4. Preview surfaces

One scrollable column, ~720 px, rendered from the resolved variables. Every colour comes from a  
`--theme-*` property; the stylesheet contains **no literal colours** apart from a transparent  
fallback for `var()` when a token is missing.

| Section     | Roles exercised                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| Header      | `background`, `foreground`, `mutedForeground`, `border` — theme name, family, mode badge, source label, contrast summary |
| Page        | `background`, `foreground`, `muted`, `mutedForeground` — heading, body copy, muted paragraph                             |
| Card        | `card`, `cardForeground`, `border` — title, body, a primary and a secondary button                                       |
| Popover     | `popover`, `popoverForeground`, `border` — a raised panel with a list                                                    |
| Form        | `input`, `border`, `foreground`, `ring` — a text input with a focus ring                                                 |
| Actions     | `destructive`, `destructiveForeground`, `success`, `successForeground`                                                   |
| Token table | all 21 roles — swatch, role name, raw value                                                                              |

The token table is the part that makes **semantic** problems visible rather than merely  
aesthetic: if `mutedForeground` equals `foreground`, or `primary` equals `background`, the swatch  
column says so in one glance, and the value column makes a missing role obvious.

**No second palette.** There is no hardcoded colour anywhere in the webview. If a role is absent,  
`var()` falls back to `transparent` and the row reads `(missing)` — visible, not disguised.

**Mode is always visible** in the header, and the two mode buttons carry `aria-pressed`.

## 5. Mode selection and refresh

### Mode

- Available modes come from the parsed document: `getThemeMode()` per theme, deduplicated. A pair  
  gives `{ light, dark }`; a single theme gives one.
- Default: `light` when present, else the only available mode.
- A theme whose mode resolves to `"system"` is **rendered as a concrete mode** — `light` unless the  
  document also supplies a dark variant. The preview never follows the OS theme; the host's dark  
  mode must not silently change what the user is previewing. The header says `system → light` when  
  this substitution happens.
- Switching is in the MVP: both variants are already in memory, so it is one message and one  
  `setProperty` pass. Deferring it would mean shipping a preview that cannot show half of a pair.

### Refresh

| Event                       | Behaviour                                                                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source document edited      | `onDidChangeTextDocument` filtered to the source URI, debounced 200 ms. Valid → push a new model. Invalid → push an error, keep the last valid render marked **stale**. |
| Source document saved       | Same path (the change listener already covers it); the dirty marker clears.                                                                                             |
| Different document selected | Command runs again; the existing panel is revealed and updated, not recreated.                                                                                          |
| Mode switched               | Host resolves the other variant and pushes a new model.                                                                                                                 |
| Panel closed                | `onDidDispose` clears the panel reference and disposes the document listener.                                                                                           |
| Panel hidden then re-shown  | `retainContextWhenHidden: false`, so the webview is destroyed. It re-sends `ready`, and the host re-pushes the current model.                                           |
| Extension deactivated       | Everything is in `context.subscriptions`.                                                                                                                               |

**Ordering.** Every host→webview message carries a monotonic `revision`. The webview keeps the last  
one it accepted and ignores anything `<=` it. In practice the host builds each model synchronously  
and `postMessage` is ordered, but a debounced refresh racing a mode switch is exactly the case worth  
making impossible rather than unlikely.

**Unsaved state.** The header shows `• unsaved` when the source `TextDocument.isDirty`. That is the  
whole of the saved/unsaved requirement — the preview never writes, so there is no other state to  
distinguish.

## 6. Architecture

Host owns state; the webview owns pixels. No theme logic crosses the boundary.

```text
commands/previewTheme.ts     source selection (active editor → dialog), command registration
domain/previewModel.ts       pure: themes[] + mode → PreviewModel | PreviewError   (no vscode)
adapters/previewPanel.ts     panel lifecycle, HTML + CSP, message plumbing
adapters/previewDocument.ts  host→webview message shapes + runtime validators
```

`previewModel.ts` is the piece worth testing hardest: given a parsed document and a requested mode  
it resolves inheritance, picks the variant, projects variables, and produces the contrast summary.  
It imports core only.

The host never sends a theme definition to the webview — only the flat `--theme-*` map, the names,  
and the mode. The webview cannot resolve `extends`, cannot read a file, and has no code path that  
interprets theme source.

### Payload

```ts
interface PreviewModel {
  readonly source: string;            // file name, plus "• unsaved" when dirty
  readonly themeName: string;
  readonly family: string;
  readonly mode: "light" | "dark";    // concrete, never "system"
  readonly systemMode: boolean;       // true when "system" was resolved to `mode`
  readonly modes: readonly ("light" | "dark")[];
  readonly variables: Readonly<Record<string, string>>;
  readonly contrast: string;          // core's summary, e.g. "16 pairs · text 9/9 · ui 7/7"
}
```

Roughly 22 entries in `variables`, a few hundred bytes. No source text, no theme objects, no  
absolute paths beyond the file name.

## 7. Message protocol

Four messages. Two each way. No generic dispatch, no `any`.

### Host → webview

```ts
{ type: "preview"; revision: number; model: PreviewModel }
{ type: "error";   revision: number; message: string; stale: boolean }
```


`stale: true` means a previous valid model is still on screen and the current source is broken.

### Webview → host

```ts
{ type: "ready" }
{ type: "setMode"; mode: "light" | "dark" }
```

`ready` is sent on script start and again whenever the webview is re-created. The host answers with  
the current model (or error). `setMode` is accepted only for a mode present in `model.modes`.

### Validation rules

Every inbound message passes `parseWebviewMessage(value): WebviewMessage | null`:

1. Must be a non-null object.
2. `type` must be a string in the known set — **unknown types are ignored and logged**, never  
   dispatched and never thrown.
3. `setMode.mode` must be exactly `"light"` or `"dark"`.
4. Anything else — missing fields, wrong types, arrays, prototypes — returns `null` and is dropped.

The handler is `try/catch`-wrapped: a malformed message must not take down the extension host.

### Rendering rules

The webview never assigns user-controlled strings to `innerHTML`. Text goes through `textContent`;  
variables are applied with `style.setProperty(name, value)` on `documentElement`, which cannot escape  
a declaration. The static structure is in the HTML template, not built from data.

## 8. CSP and security

```text
default-src 'none';
style-src 'nonce-${nonce}';
script-src 'nonce-${nonce}';
```

That is the whole policy. Each line earns its place:

- `default-src 'none'` — no remote script, style, font, image, frame or connection of any kind.
- `style-src 'nonce-…'` — one `<style>` block, generated by the host. No `'unsafe-inline'`, because  
  token values are applied through CSSOM (`setProperty`), which CSP does not govern; the stylesheet  
  itself never contains user data.
- `script-src 'nonce-…'` — one inline `<script>`, also generated by the host.

Deliberately absent:

- **No `webview.asWebviewUri`.** The MVP ships no external asset: the stylesheet and script are  
  inline. `localResourceRoots: []` states that, so a future asset cannot be loaded by accident  
  without changing the policy on purpose.
- **No `'unsafe-eval'`, no CDN, no remote fonts.** The preview is CSS on system fonts; adding a  
  webfont would mean a network request the preview does not need.
- **`img-src` is not granted.** If a token value were `url(https://…)`, it would be blocked by  
  `default-src 'none'` — which is the reason to keep that line rather than list sources one by one.

A nonce is generated per panel with `crypto.randomUUID()`, and the panel is `enableScripts: true`  
with `retainContextWhenHidden: false`.

## 9. Test plan

### Unit (vitest, no host)

| File                           | Covers                                                                                                                                                                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `test/previewModel.test.ts`    | valid pair → both modes; single theme → one mode; `extends` resolved (a derived theme yields 22 variables, not 1); `"system"` resolved to `light` with `systemMode: true`; contrast string is core's; missing role appears as absent rather than invented; invalid shapes produce the error branch.                |
| `test/previewMessages.test.ts` | each accepted shape; unknown `type` → `null`; wrong `mode` → `null`; `null`/array/string/number → `null`; extra fields tolerated; a hostile string in `mode` cannot pass.                                                                                                                                          |
| `test/previewPanel.test.ts`    | panel created once and reused on a second invocation; `postMessage` receives a `preview` with an increasing `revision`; `ready` re-pushes; `setMode` switches the variant; `onDidDispose` disposes the document listener; a document edit produces an update; an invalid edit produces `error` with `stale: true`. |

The fake host gains: `createWebviewPanel` (recording `postMessage` calls and exposing  
`onDidReceiveMessage`/`onDidDispose`), `webview.cspSource`, and `onDidChangeTextDocument`.

### Extension host

One new check in `test/host/smoke.cjs`: `themvora.previewTheme` executes against a generated file  
without throwing. **Execution-only** — the panel's DOM is not reachable from the extension host, and  
this check will be labelled as such rather than described as proof that anything rendered.

### Gates that must not move

- `test/bundle.test.ts`: `vscode` the only external import, no `child_process`.
- All 177 existing tests keep passing, unmodified.
- `audit-packages` (615 checks), `export-inventory` (24 packages), `audit-dependencies`.

### Acceptance criteria

1. `pnpm typecheck` clean.
2. `pnpm test` passes, ≥ 210 tests, with the three new files present.
3. Host: 11/11 checks in dev mode and against the unpacked VSIX.
4. Bundle: single external import `vscode`, zero `child_process`.
5. `previewModel` returns exactly 22 variables for a generated pair variant, and 22 for a derived  
   theme (proving inheritance resolution).
6. No literal colour outside the token fallback in the webview template — asserted by a test that  
   scans the generated HTML for `#[0-9a-f]{3,8}` outside `var()`.
7. The mode control is a real `<button>` with `aria-pressed`, and the panel is reachable by keyboard.

## 10. In scope

- `Themvora: Preview Theme` with active-editor preference and dialog fallback.
- Rendering the seven surface groups above from resolved `--theme-*` variables.
- Explicit light/dark selection, with the mode always visible.
- Clear error state for unreadable, malformed and non-theme sources; stale marking on later failures.
- Live refresh on document edits, debounced, revision-guarded.
- Unsaved marker and the canonical contrast summary in the header.
- The CSP, message validators and tests above.
- README, CHANGELOG, checklist.

## 11. Out of scope

- Editing token values, or any visual theme editor.
- Saving or writing theme files from the preview.
- Side-by-side multi-theme comparison — `Compare Themes…` remains the canonical answer.
- A component library, or a fake application shell.
- Remote assets, webfonts, `asWebviewUri`, or any `localResourceRoots` entry.
- Any new generation or validation algorithm; core remains the only source.
- ~~Fixing the `extends` defect in the Milestone 4 commands (§12, subtask 0)~~ — **done**, as its own change.
- Milestone 6 diagnostics (Problems panel, hovers, swatches in the editor).

## 12. Implementation sequence

Each step is independently reviewable and leaves the tree green.

| # | Step                                                                                                      | Reviewable because                                                           |
| - | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 0 | *(separate change)* Pass the sibling theme registry to `validate` and `cssDocument` so `extends` resolves | Fixes a real defect in shipped commands; its own tests; no webview involved  |
| 1 | `domain/previewModel.ts` + tests                                                                          | Pure, no host, no UI — the whole theme→model decision is testable on its own |
| 2 | `adapters/previewDocument.ts` (message validators) + tests                                                | Pure validation; proves hostile input is rejected before any UI exists       |
| 3 | `adapters/previewPanel.ts` (HTML, CSP, lifecycle) + fake-host support + tests                             | First UI code, still host-side-testable                                      |
| 4 | `commands/previewTheme.ts`, registration, manifest contribution                                           | The command becomes reachable; host check added                              |
| 5 | Live refresh, stale handling, unsaved marker                                                              | Behaviour added on top of a working panel                                    |
| 6 | README, CHANGELOG, checklist, package, audits                                                             | Documentation and gates                                                      |

## 13. Risks and open decisions

| Risk                                                       | Assessment                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The `extends` defect ships unnoticed**                   | It did ship, and subtask 0 fixed it. Resolution is now a test assertion (§9.5), so a regression fails the suite.                                                                                                                                         |
| Webview lifecycle churn (`retainContextWhenHidden: false`) | Re-`ready` on every reveal; the host must be able to rebuild state at any time. Designed for, but it is the most likely source of a "blank panel" bug.                                                                                                     |
| CSP blocks something legitimate                            | Only if a future step adds an external asset. `localResourceRoots: []` makes that a deliberate change.                                                                                                                                                     |
| Fake-host fidelity for webviews                            | `postMessage`/`onDidReceiveMessage` are easy to fake and easy to fake *wrongly*. The host check is execution-only, so a rendering bug would not be caught by it. Accepted; the alternative is a Playwright-driven VS Code, which is a much larger harness. |
| Token values are untrusted strings                         | Applied via `setProperty` only, under `default-src 'none'`. A malformed value degrades one property; it cannot inject a rule.                                                                                                                              |

**Open decisions** (deliberately not resolved here):

1. **Subtask 0 — now or after?** Recommended before M5 so the preview and the two commands agree.  
   It touches shipped behaviour, so it wants its own review.
2. **Should the preview show all token groups or only colours?** The MVP shows colours plus radius  
   and spacing in the surfaces; the token table lists colours only. Non-colour groups are available  
   in `variables` either way.
3. **Does the panel belong in the editor area or the panel area?** Editor area (a normal tab) for the  
   MVP — it is a document-like view and gets a tab title for free.

---

## 14. Verification record (2026-10-20)

Machine-verified: 259 unit tests (66 new), typecheck, bundle gate (`vscode` the only external import,
zero `child_process`), 11 extension-host checks in both dev and packaged modes, package audit,
export inventory, dependency audit.

**Not machine-verified:** how the preview actually paints, and keyboard activation inside a real
VS Code window. The extension host cannot read a webview's DOM, and the panel test's fake DOM
executes the emitted script but does not lay anything out. The host check asserts a
`Theme Preview` tab exists — proof the command ran and a panel opened, not that it rendered.

**Render pass completed** (`MILESTONE-5-HOST-PASS.md`): the built bundle's own HTML was rendered in
Chromium in light, dark and stale states. It found two defects — `input` used as a field background
instead of a border, and a stale banner that did not say the render was stale — both fixed with
regression tests.

Still outstanding: keyboard activation in a real VS Code window (Tab + Enter), and the editor chrome
around the webview.
