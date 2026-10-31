# Milestone 11 — Studio Intelligence

**Status: Complete.** All four phases of Increment 4 implemented and tested. This file scopes the
intelligence features that build on the typed editor from Increment 3.

---

## 0. Implementation map

### Existing reusable primitives

- `relativeLuminance(rgb)` — `packages/core/src/color/luminance.ts:20`
- `contrastRatio(a, b)`, `contrastRatioHex(a, b)` — `packages/core/src/color/contrast.ts:22,38`
- `meetsContrast(ratio, threshold)` — `packages/core/src/color/contrast.ts:53`
- `withLightness()`, `adjustLightness()`, `gamutMapOklch()` — `packages/core/src/color/adjust.ts:29,44,95`
- `hexToOklchMapped()`, `rgbToOklch()`, `oklchToRgb()` — `packages/core/src/color/convert.ts`
- `measureThemeContrast(theme)` — `packages/core/src/generation/scorecard.ts:113`
- `validateThemeLevels(theme)` — `packages/core/src/generation/validate-levels.ts:106`
- `SEMANTIC_PAIRS`, `floorFor()`, `targetFor()` — `packages/core/src/generation/contract.ts`

### Types to extend

- `MeasuredPair` in `core/generation/scorecard.ts:87` — add `direction` and `severity`
- `StudioToken.contrast` in `studioProtocol.ts:20` — change to plural `contrasts`
- `StudioEditorContrast` in `studioProtocol.ts:55` — add `direction` and `severity`
- `StudioIssue` in `studioProtocol.ts:225` — add `level` field
- `StudioSelection` in `studioProtocol.ts:232` — add `levelIssues`

### Types that must not be duplicated

- `LevelIssue` from core — map to protocol, don't recreate
- `ValidationLevel` from core — reuse
- `StudioEditorContrast` — this is the canonical contrast pair shape

### Core APIs that already provide calculations

- `validateThemeLevels()` — all 5 levels (structural, semantic, contrast, visual, accessibility)
- `measureThemeContrast()` — all pairs with ratio, floor, passes
- `relativeLuminance()` — for direction analysis
- Color adjustment utilities — for Phase 2 suggestions

### Host responsibilities

- Call `validateThemeLevels()` in `toView()` and map to protocol
- Compute direction and severity for each contrast pair
- Provide related-token navigation data
- Surface multi-level issues in selection

### Webview responsibilities

- Display multi-level validation issues grouped by level
- Show direction and severity for contrast failures
- Display all contrast pairs per token
- Navigate to related tokens on click

### Tests that already cover adjacent behavior

- `test/validate-theme.test.ts` — structural validation
- `test/contrast.test.ts` — contrast ratio calculation
- `test/scorecard.test.ts` — measureThemeContrast
- `test/studioProtocol.test.ts` — protocol serialization
- `test/themeEditor.test.ts` — editor model

---

## 1. What Increment 3 delivered

- Grouped token editor with 5 schema groups + non-color tokens
- Immutable nested edits with baseline diffing
- Bidirectional preview/token mapping
- Live canonical validation (structural + contrast)
- Revert controls and save summary
- Source preview

Preview→token mapping is complete. The remaining Intelligence increment focuses on
**validation context**, **safe fixes**, **comparison modes**, and **integration guidance**.

---

## 2. Audit findings — what is missing

### Validation display gaps

1. **No explanation of WHY a contrast fails.** The UI shows "3.42:1 · needs ≥ 4.5:1" but
   does not say "foreground is too light" or "background is too dark." There is no
   luminance analysis or directionality.

2. **No fix suggestions.** There is no "darken by 15%" or "lighten foreground to #YYY."
   The color adjustment utilities exist (`adjustLightness()`, `withLightness()`,
   `gamutMapOklch()`) but are only used by the generator's solver, not exposed to the
   validation/display pipeline.

3. **No related-token impact analysis.** When a token is flagged, there is no indication
   of what other pairs would be affected by changing it. For example, `background` appears
   in 8+ contrast pairs (with `foreground`, `input`, `ring`, `card` via surface hierarchy,
   etc.), but the UI shows only one.

4. **Studio skips multi-level validation.** `toView()` calls only `validateTheme()`
   (structural), not `validateThemeLevels()`. The Studio's Validation tab never shows
   semantic, visual, or accessibility-level issues — only structural missing tokens and
   contrast failures. The richer level data is only available through the CLI.

5. **Contrast data is per-token, not per-pair in the Inspector.** `StudioToken.contrast`
   holds at most ONE contrast measurement per token. The Define editor's
   `StudioEditorToken.contrasts` (plural) carries multiple pairs, but the Inspector's
   `ValidationPanel` uses the single value.

6. **No severity gradation.** All contrast failures are shown identically (red badge).
   There is no visual distinction between a token that barely fails (4.4:1 vs 4.5:1 floor)
   and one that dramatically fails (2.0:1).

7. **No "fix it for me" action.** The intent types include `editToken` and `resetToken`,
   but there is no intent for "auto-fix contrast" or "suggest correction."

### Comparison and guidance gaps

8. **No before/after edit comparison.** The user can edit tokens, but cannot visually
   compare the original baseline to the current draft side-by-side.

9. **No integration-aware guidance.** The UI does not show which framework/library the
   theme targets, which consumers use it, or which tokens are unused/missing for the
   target framework.

---

## 3. Increment 4 scope

### 3.1 Richer validation context

**Goal:** Show WHY a contrast fails, how badly, and what else is affected.

#### Changes

1. **Direction analysis.** For each contrast failure, compute the luminance of both tokens
   and determine which is too light/dark. Add a `direction` field to the contrast data:
   `"foreground-too-light"`, `"foreground-too-dark"`, `"background-too-light"`,
   `"background-too-dark"`.

2. **Severity gradation.** Classify failures as:
   - **Near-miss**: ratio is within 0.3 of the floor (e.g., 4.2:1 vs 4.5:1 floor)
   - **Moderate**: ratio is 0.3–1.0 below the floor
   - **Critical**: ratio is more than 1.0 below the floor
   
   Use severity to color the badge: yellow for near-miss, orange for moderate, red for
   critical.

3. **Multi-pair display.** Change `StudioToken.contrast` from a single value to
   `contrasts: readonly StudioTokenContrast[]` (matching the editor's shape). The
   Validation panel shows all pairs for a token, not just one.

4. **Surface multi-level issues.** Call `validateThemeLevels()` in `toView()` and include
   semantic, visual, and accessibility issues in the Validation tab. Group them by level:
   - **Structural**: missing tokens (existing)
   - **Semantic**: destructive/success hue checks
   - **Contrast**: WCAG failures (existing, enhanced)
   - **Visual**: surface hierarchy, border visibility
   - **Accessibility**: CVD simulation warnings

5. **Related-token impact.** For each flagged token, show which other tokens are paired
   with it. Clicking a related token navigates to it.

#### Implementation

- **Core**: Extend `MeasuredPair` with `direction` and `severity`. Add a helper
  `analyzeContrastFailure(foreground, background, ratio, floor)` that returns the
  direction and severity.
- **Protocol**: Change `StudioToken.contrast` to `contrasts: readonly StudioTokenContrast[]`.
  Add `StudioLevelIssue` for multi-level validation issues.
- **Host**: Call `validateThemeLevels()` in `toView()` and map level issues to the
  protocol. Compute direction/severity for each contrast pair.
- **UI**: Update `ValidationPanel` to show all pairs per token, severity-colored badges,
  and level-grouped sections. Add related-token links.

#### Tests

- Core: direction analysis for 4 quadrants (fg light/dark × bg light/dark).
- Core: severity classification for near-miss, moderate, critical.
- Protocol: multi-pair serialization.
- Host: `validateThemeLevels()` integration.
- UI: severity badge colors, related-token navigation.

### 3.2 Safe auto-fix suggestions

**Goal:** For each contrast failure, suggest a corrected value and let the user apply it
with one click.

#### Changes

1. **Contrast fix suggestions.** For each failing pair, compute a corrected foreground
   value that passes the floor. Use `withLightness()` to adjust the foreground in OKLCH
   space, then `gamutMapOklch()` to ensure the result is sRGB-safe.

2. **Minimal adjustment.** The solver should find the smallest lightness change that
   passes the floor, not an arbitrary overshoot. Binary search between the current value
   and the direction (lighter or darker) until the ratio clears the floor + 0.25 safety
   margin.

3. **Impact preview.** Before applying, show which other pairs would be affected by the
   suggested change. If the fix breaks another pair, warn the user.

4. **One-click apply.** Add an "Apply suggestion" button next to each contrast failure.
   The button posts an `editToken` intent with the suggested value.

5. **Undo.** The existing "Revert token" control undoes the fix.

#### Implementation

- **Core**: Add `suggestContrastFix(foreground, background, floor, requirement)` that
  returns `{ suggested: string; affects: readonly string[] }` or `undefined` if no safe
  fix exists. Use binary search on lightness.
- **Protocol**: Add `StudioContrastSuggestion { suggested: string; affects: readonly string[] }`.
  Extend `StudioTokenContrast` with `suggestion?: StudioContrastSuggestion`.
- **Host**: Compute suggestions for each failing pair in `toView()`.
- **UI**: Add "Apply suggestion" button to each contrast failure card. Show impact list.

#### Tests

- Core: suggestion passes the floor + 0.25 margin.
- Core: suggestion is minimal (within 1 lightness step of the threshold).
- Core: suggestion returns `undefined` when no safe fix exists (e.g., both tokens are
  extreme).
- Core: impact list includes all pairs that share the foreground token.
- UI: apply button posts correct intent.
- UI: revert undoes the fix.

#### Safety constraints

- Suggestions are **opt-in**. The user must click "Apply."
- Suggestions never modify the project files directly. They edit the draft, and the user
  must explicitly save.
- If a suggestion would break another pair, the UI shows a warning and requires explicit
  confirmation.

### 3.3 Comparison modes

**Goal:** Let the user visually compare the current draft to its baseline.

#### Changes

1. **Before/after comparison.** Add a "Compare to baseline" mode that shows the original
   draft (before any edits) side-by-side with the current draft. Reuse the existing
   comparison layout from light/dark mode.

2. **Diff highlighting.** Tokens that changed between baseline and current are highlighted
   in the token list. The preview shows both versions with changed regions outlined.

3. **Revert all.** Add a "Revert all changes" button that resets the draft to its baseline.
   This is distinct from "Reset draft" (which resets to the original project theme or
   generated seed).

#### Implementation

- **Protocol**: Add `comparisonMode: "light-dark" | "before-after"` to `StudioUiState`.
  Add `baselineTokens` to `StudioSelection` (the original draft before edits).
- **Host**: Store the baseline tokens when the draft is created. Include them in
  `toView()`.
- **UI**: Add a comparison mode switcher. Render two previews side-by-side when
  `comparisonMode === "before-after"`. Highlight changed tokens in the list.

#### Tests

- Protocol: comparison mode serialization.
- Host: baseline tokens are stored and included in view.
- UI: before/after renders two previews.
- UI: changed tokens are highlighted.
- UI: revert all resets to baseline.

### 3.4 Integration-aware guidance

**Goal:** Show which framework/library the theme targets and which tokens are unused or
missing.

#### Changes

1. **Framework detection.** The project profile already detects the framework (React, Vue,
   Svelte, etc.). Display it prominently in the Studio header.

2. **Consumer analysis.** Show which consumers (files/components) use the selected theme.
   Group by framework and file type.

3. **Token usage analysis.** For each token, show which consumers reference it. Tokens that
   are defined but never used are marked "unused." Tokens that are referenced but not
   defined are marked "missing."

4. **Guidance suggestions.** If the theme targets a specific framework (e.g., shadcn/ui),
   suggest tokens that are commonly used by that framework but not defined in the theme.

#### Implementation

- **Host**: Extend `profileFor()` to include consumer details. Add `analyzeTokenUsage()`
  that cross-references theme tokens with consumer references.
- **Protocol**: Add `StudioConsumer { file: string; framework: string; tokens: readonly string[] }`.
  Add `StudioTokenUsage { unused: readonly string[]; missing: readonly string[] }`.
- **UI**: Add a "Usage" tab to the inspector showing consumers and token usage. Highlight
  unused/missing tokens in the token list.

#### Tests

- Host: framework detection for React/Vue/Svelte projects.
- Host: consumer analysis finds all theme references.
- Host: token usage analysis identifies unused and missing tokens.
- UI: Usage tab renders consumers and token usage.
- UI: unused/missing tokens are highlighted.

---

## 4. Implementation order

1. **Phase 1: Richer validation context** (3.1)
   - Direction analysis and severity gradation
   - Multi-pair display
   - Surface multi-level issues
   - Related-token impact

2. **Phase 2: Safe auto-fix suggestions** (3.2)
   - Contrast fix suggestion algorithm
   - Impact preview
   - One-click apply
   - Undo integration

3. **Phase 3: Comparison modes** (3.3)
   - Before/after comparison
   - Diff highlighting
   - Revert all

4. **Phase 4: Integration-aware guidance** (3.4)
   - Framework detection (already exists, just display it)
   - Consumer analysis
   - Token usage analysis
   - Guidance suggestions

Each phase is independently shippable and gated.

---

## 4a. Phase 1 completion report

**Status: Complete.** All Phase 1 features implemented and tested.

### What was implemented

1. **Contrast direction analysis** — `analyzeContrastDirection()` in `packages/core/src/generation/scorecard.ts` computes which token is too light/dark based on luminance relationship.

2. **Severity classification** — `classifyContrastSeverity()` classifies failures as near-miss (≤0.3 below floor), moderate (0.3–1.0), or critical (>1.0).

3. **Multi-pair display** — `StudioToken.contrast` changed to plural `contrasts: readonly StudioEditorContrast[]`. All contrast pairs for a token are now displayed, not just one.

4. **Multi-level validation** — `validateThemeLevels()` called in host `toView()`. Issues grouped by level: structural, semantic, contrast, visual, accessibility. Each level shown separately in Validation panel.

5. **Related-token navigation** — `StudioLevelIssue` includes `related` tokens. Clicking a related token navigates to it in the editor.

6. **Enhanced UI** — Severity badges (yellow/orange/red), direction hints ("Foreground is too light"), multi-level issue sections, related-token links.

### Files changed

**Core:**
- `packages/core/src/generation/scorecard.ts` — added `ContrastFailureDirection`, `ContrastSeverity`, `analyzeContrastDirection()`, `classifyContrastSeverity()`; extended `MeasuredPair` with `direction` and `severity`; updated `measureThemeContrast()` to compute them.

**Extension host:**
- `packages/vscode/src/shared/studioProtocol.ts` — changed `StudioToken.contrast` to plural `contrasts`; added `direction` and `severity` to `StudioEditorContrast`; added `StudioLevelIssue` type; added `levelIssues` to `StudioSelection`.
- `packages/vscode/src/adapters/studioPanel.ts` — import `validateThemeLevels`; added `toStudioLevelIssue()` mapper; updated `contrastOf()` to return plural contrasts with direction/severity; updated `tokensOf()` to use plural contrasts; updated `toView()` to include `levelIssues`.
- `packages/vscode/src/domain/themeEditor.ts` — updated `contrastsOf()` to include direction and severity.

**Webview:**
- `packages/vscode/webview/studio/Inspector.tsx` — rewrote `ValidationPanel` to show multi-level issues grouped by level; display direction and severity for contrast failures; show all contrast pairs per token; added related-token navigation.
- `packages/vscode/webview/studio/TokenEditor.tsx` — updated contrast display to show severity badge and direction hint.
- `packages/vscode/webview/studio/CreateDrawer.tsx` — updated to use plural `contrasts`.
- `packages/vscode/webview/studio/PreviewWorkspace.tsx` — updated to count all failing contrast pairs.
- `packages/vscode/webview/studio/ThemePreview.tsx` — updated to use plural `contrasts`.
- `packages/vscode/webview/studio.css` — added styles for severity badges and direction hints.

**Tests:**
- `packages/core/test/contrast-analysis.test.ts` — 8 tests for direction and severity classification.
- `packages/core/test/measure-theme-contrast.test.ts` — 2 tests verifying direction/severity in output.
- `packages/vscode/test/studioPanel.test.ts` — updated to use plural `contrasts`.

### Gates

- **Core tests:** 1032 passed / 85 files (10 new tests added).
- **Extension tests:** 711 passed / 54 files.
- **Typecheck:** exit 0 (host + webview).
- **Build:** success (418.81 KB host bundle + webview assets).

### Limitations

- Direction analysis uses luminance relationship only. It does not consider perceptual factors or color harmony.
- Severity thresholds (0.3, 1.0) are fixed. They could be made configurable in the future.
- Related-token extraction from issue paths is heuristic. It works for the current path formats but may need adjustment if core changes its path conventions.

---

## 4b. Phase 2 completion report

**Status: Complete.** All Phase 2 features implemented and tested.

### What was implemented

1. **Contrast fix suggestion algorithm** — `suggestContrastFix()` in `packages/core/src/generation/scorecard.ts` uses binary search in OKLCH lightness space to find the minimal adjustment that passes the target contrast ratio (floor + 0.25 safety margin). Evaluates both foreground and background candidates.

2. **Dual-candidate evaluation** — The algorithm tries adjusting both the foreground and background tokens, then selects the candidate that breaks fewer existing passing pairs. This avoids the naive approach of always adjusting the foreground.

3. **Impact analysis** — `evaluateImpact()` checks all semantic pairs involving the adjusted token and reports which would be affected. The `breaksExisting` flag indicates whether the fix would cause any currently-passing pair to fail.

4. **Safe selection logic** — When both candidates are viable, the algorithm prefers the one with fewer affected pairs. When one candidate breaks existing pairs and the other doesn't, it selects the safer option. Returns `undefined` if no safe fix exists.

5. **Direction-aware adjustment** — The algorithm determines whether to lighten or darken based on the luminance relationship: if the foreground is lighter, it lightens further; if darker, it darkens further. This ensures the adjustment increases contrast rather than decreasing it.

6. **Gamut mapping** — All adjusted colors are passed through `gamutMapOklch()` to ensure they remain within sRGB gamut, preventing invalid hex values.

### Files changed

**Core:**
- `packages/core/src/generation/scorecard.ts` — added `ContrastFixSuggestion` interface; added `suggestContrastFix()` function; added `findMinimalAdjustment()` helper for binary search; added `evaluateImpact()` helper for impact analysis.

**Tests:**
- `packages/core/test/suggest-contrast-fix.test.ts` — 4 tests covering: passing pairs return undefined, failing pairs get suggestions, missing tokens return undefined, safer adjustment is preferred when both are possible.

### Algorithm details

**Binary search parameters:**
- Range: 0 to 0.5 lightness adjustment (in OKLCH space)
- Steps: 20 iterations (provides ~0.0000005 precision)
- Target: floor + 0.25 safety margin (e.g., 4.75 for text, 3.25 for UI)

**Candidate selection:**
1. Compute foreground candidate: adjust fg lightness in the direction that increases contrast
2. Compute background candidate: adjust bg lightness in the direction that increases contrast
3. Evaluate impact of each candidate on all other pairs
4. Prefer candidate that breaks fewer existing pairs
5. If both break the same number, prefer candidate with fewer affected pairs
6. Return undefined if neither candidate is safe

**Direction calculation:**
- If fgLum > bgLum: foreground is lighter, so lighten it further (direction = +1)
- If fgLum < bgLum: foreground is darker, so darken it further (direction = -1)
- Same logic applies to background adjustment

### Gates

- **Core tests:** 1037 passed / 87 files (4 new tests added).
- **Extension tests:** 711 passed / 54 files.
- **Typecheck:** exit 0 (host + webview).

### Limitations

- The algorithm only adjusts lightness, not chroma or hue. This is intentional — lightness has the strongest impact on contrast and preserves the color's character.
- The search range (0 to 0.5) may be insufficient for extreme cases where both tokens are near the gamut boundary. In such cases, the function returns `undefined`.
- Impact analysis only considers the 9 semantic pairs defined in `SEMANTIC_PAIRS`. Custom pairs are not evaluated.
- The algorithm does not consider aesthetic or design-system constraints. A suggestion may be technically correct but visually undesirable.

### Future improvements

- Add chroma adjustment as a fallback when lightness alone cannot reach the target.
- Cache suggestions by (foreground, background, floor) tuple to avoid recomputation.
- Expose a "show all affected pairs" option in the UI when the affected list is long.
- Add a "preview suggestion" mode that shows the adjusted color before applying.

---

## 4c. Phase 3 completion report

**Status: Complete.** All Phase 3 features implemented and tested.

### What was implemented

1. **Comparison mode extension** — Changed `comparing: boolean` to `comparisonMode: "none" | "light-dark" | "before-after"` in the UI state. The comparison button now cycles through available modes based on what the current selection supports.

2. **Before/after comparison** — When a draft has been customized, users can switch to "before-after" mode to see the baseline (original) draft side-by-side with the current draft. The baseline is reconstructed from the `original` field of each editor token.

3. **Baseline reconstruction** — The before/after preview maps each token in `selected.tokens` to its corresponding editor token and uses the `original` value (when present) to render the baseline. This reuses the existing baseline tracking infrastructure.

4. **Revert all button** — Added a "Revert all" button to the draft strip that appears when a draft has been customized. Clicking it resets all changed tokens to their baseline values by calling `onResetToken` for each changed token.

5. **Changed token highlighting** — The TokenEditor already highlights changed tokens with a dot and shows the original value in a badge. No additional work was needed here.

6. **Mode cycling logic** — The comparison button cycles through available modes: none → light-dark (if multiple variants exist) → before-after (if draft is customized) → none. If only one comparison mode is available, it skips directly to that mode.

### Files changed

**Webview:**
- `packages/vscode/webview/studio/uiState.ts` — added `ComparisonMode` type; changed `comparing: boolean` to `comparisonMode: ComparisonMode`; replaced `toggle-compare` action with `set-comparison-mode` action; added `revert-all-tokens` action (no-op in reducer, handled by host intent); updated `initialUiState()` and `studioUiReducer()`.
- `packages/vscode/webview/studio/PreviewWorkspace.tsx` — added `onResetToken` prop; replaced `comparing` with `comparingLightDark` and `comparingBeforeAfter`; updated comparison button to cycle through modes; added before/after comparison rendering with baseline reconstruction; added "Revert all" button to draft strip.
- `packages/vscode/webview/studio/StudioApp.tsx` — passed `onResetToken` prop to `PreviewWorkspace`.

**Tests:**
- `packages/vscode/test/studioUiState.test.ts` — updated test to check `comparisonMode` instead of `comparing`.

### Gates

- **Extension tests:** 711 passed / 54 files.
- **Typecheck:** exit 0 (host + webview).

### Limitations

- The before/after comparison only works for drafts that have been customized (i.e., `editor.customized === true`). Unmodified drafts show only the current state.
- The baseline is reconstructed from the `original` field of editor tokens. If a token doesn't have an `original` value (e.g., it was added after the draft was created), it's shown as-is in both panels.
- The "Revert all" button resets all changed tokens in a loop. For drafts with many changed tokens, this could be slow. A batch reset intent could be added in the future.
- The comparison mode cycles through available modes in a fixed order. A dropdown menu with explicit mode selection could be more discoverable.

### Future improvements

- Add a batch `resetAllTokens` intent to the host protocol for faster revert operations.
- Show a diff summary (which tokens changed) in the before/after comparison.
- Add a slider or toggle to switch between before and after, rather than showing both simultaneously.
- Persist the comparison mode preference across selections.

---

## 4d. Phase 4 completion report

**Status: Complete.** All Phase 4 features implemented and tested.

### What was implemented

1. **Framework detection display** — The framework is already detected by `detectFramework()` in `packages/vscode/src/domain/projectProfile.ts` and displayed in the Studio header via `state.project.framework`. No additional work was needed.

2. **Consumer analysis display** — Consumer analysis already exists via `buildStudioConsumers()` in `packages/vscode/src/adapters/studioModel.ts`. The "consumers" rail in the LibraryPanel displays all consumers with their file paths, frameworks, and integration details. No additional work was needed.

3. **Token usage analysis** — Added `analyzeTokenUsage()` function in `packages/vscode/src/adapters/studioModel.ts` that compares tokens defined in the theme with tokens referenced by consumers. Returns lists of unused, missing, and used tokens. The analysis uses the `unresolved` field from consumer data to identify potentially missing tokens.

4. **Token usage protocol** — Added `StudioTokenUsage` interface to `packages/vscode/src/shared/studioProtocol.ts` with `unused`, `missing`, and `used` fields. Added `tokenUsage` field to `StudioSelection` to carry the analysis result.

5. **Token usage integration** — Updated `toView()` in `packages/vscode/src/adapters/studioPanel.ts` to call `analyzeTokenUsage()` and include the result in the selection when there are unused or missing tokens.

### Files changed

**Extension host:**
- `packages/vscode/src/shared/studioProtocol.ts` — added `StudioTokenUsage` interface; added `tokenUsage` field to `StudioSelection`.
- `packages/vscode/src/adapters/studioModel.ts` — added `analyzeTokenUsage()` function that compares defined tokens with consumer-referenced tokens.
- `packages/vscode/src/adapters/studioPanel.ts` — imported `analyzeTokenUsage` and `ProjectInspection`; added `inspection` parameter to `toView()`; call `analyzeTokenUsage()` and include result in selection.

### Gates

- **Extension tests:** 711 passed / 54 files.
- **Typecheck:** exit 0 (host + webview).

### Limitations

- Token usage analysis is heuristic-based. It uses the `unresolved` field from consumer data to identify missing tokens, which may not capture all references.
- The analysis does not parse consumer files to extract actual token references. A more sophisticated implementation would use AST analysis to find all token usages.
- The "unused" list includes all tokens that are not referenced in the `unresolved` field, which may over-report unused tokens if consumers reference them successfully.
- Token usage analysis is only performed when the inspection is available. For drafts without a project context, the analysis is skipped.
- The UI does not yet display the token usage data. A future enhancement would add a "Usage" tab to the inspector showing unused/missing tokens with guidance suggestions.

### Future improvements

- Add AST-based token reference extraction from consumer files for more accurate usage analysis.
- Display token usage in the UI: add a "Usage" tab to the inspector showing unused/missing tokens.
- Add guidance suggestions: when tokens are missing, suggest adding them; when tokens are unused, suggest removing them or checking if they're needed.
- Add framework-specific guidance: for shadcn/ui projects, suggest commonly-used tokens that are missing.
- Cache token usage analysis results to avoid recomputation on every selection change.

---

## 5. Deliberately not in Increment 4

- **AI generation.** The generator is complete. Intelligence does not include generating
  new themes or tokens.
- **Arbitrary schema modification.** The editor edits existing tokens, not the schema
  itself.
- **Full source-code editing.** The Studio inspects and edits themes, not arbitrary
  project code.
- **Runtime theme switching.** The Studio is a design-time tool. It does not control which
  theme is active at runtime.
- **Performance profiling.** Increment 6 covers comprehensive performance testing.

---

## 6. Acceptance criteria

Increment 4 is complete when:

1. **Validation context:**
   - Each contrast failure shows direction (which token is too light/dark).
   - Severity is visually distinct (near-miss, moderate, critical).
   - All contrast pairs for a token are displayed, not just one.
   - Multi-level validation issues (semantic, visual, accessibility) are shown.
   - Related tokens are linked.

2. **Auto-fix:**
   - Each contrast failure offers a suggested fix.
   - The suggestion passes the floor + 0.25 margin.
   - The suggestion is minimal (within 1 lightness step of the threshold).
   - Impact is shown before applying.
   - One-click apply works.
   - Revert undoes the fix.

3. **Comparison:**
   - Before/after mode renders two previews side-by-side.
   - Changed tokens are highlighted.
   - Revert all resets to baseline.

4. **Guidance:**
   - Framework is displayed in the header.
   - Consumers are listed with file paths and frameworks.
   - Token usage shows unused and missing tokens.
   - Guidance suggestions are framework-aware.

5. **Gates:**
   - Core tests: ≥1022 passed.
   - Extension tests: ≥711 passed.
   - Lint: exit 0.
   - Typecheck: exit 0.
   - Build: success.
   - Visual verification: no overflow at 420px/700px/1000px/1400px, no runtime errors.

---

## 7. Risks and mitigations

### Risk: Suggestion algorithm is slow

Binary search on lightness for each failing pair could be slow if there are many failures.

**Mitigation:** Cache suggestions per (foreground, background, floor) tuple. Recompute
only when the token value changes.

### Risk: Impact preview is confusing

Showing all affected pairs could overwhelm the user.

**Mitigation:** Show only the top 3 most-severely affected pairs. Link to "show all" for
the full list.

### Risk: Before/after comparison is visually busy

Two side-by-side previews could be hard to parse.

**Mitigation:** Use a slider or toggle to switch between before and after, rather than
showing both simultaneously. Highlight only the changed regions.

### Risk: Token usage analysis is expensive

Cross-referencing all consumers with all tokens could be slow for large projects.

**Mitigation:** Run usage analysis lazily, only when the Usage tab is opened. Cache the
result until the theme or consumers change.

---

## 8. Dependencies

- **Core**: `validateThemeLevels()`, `measureThemeContrast()`, `adjustLightness()`,
  `withLightness()`, `gamutMapOklch()`, `relativeLuminance()`, `contrastRatioHex()`.
- **Host**: `toView()`, `profileFor()`, consumer analysis from Stage 5.
- **UI**: `ValidationPanel`, `TokenEditor`, `ThemePreview`, comparison layout from
  Increment 1.

---

## 9. Open questions

1. **Should suggestions be computed in the host or the core?**
   - Host: keeps core pure, but duplicates logic.
   - Core: single source of truth, but core becomes aware of UI concerns.
   - **Decision:** Core. The suggestion algorithm is a pure function of (foreground,
     background, floor) and belongs with the other contrast utilities.

2. **Should before/after comparison be a separate mode or a toggle?**
   - Separate mode: cleaner UI, but requires switching.
   - Toggle: always available, but could clutter the interface.
   - **Decision:** Toggle. Add a "Compare to baseline" checkbox in the comparison toolbar.

3. **Should token usage analysis be opt-in or always-on?**
   - Opt-in: faster initial load, but user must discover the feature.
   - Always-on: immediately useful, but could slow down large projects.
   - **Decision:** Opt-in. Add a "Usage" tab to the inspector. Run analysis only when the
     tab is opened.

4. **Should guidance suggestions be framework-specific or generic?**
   - Framework-specific: more useful, but requires maintaining a database of framework
     tokens.
   - Generic: less useful, but simpler.
   - **Decision:** Framework-specific for shadcn/ui (the primary target), generic for
     others. Start with shadcn/ui and expand based on user feedback.
