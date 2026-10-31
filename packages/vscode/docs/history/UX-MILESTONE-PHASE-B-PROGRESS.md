# Studio UX and Preview Coherence — Phase B Progress

**Date**: 2026-10-23  
**Status**: ✅ Complete. Theme counts fixed and UI updated, preview scenario infrastructure added.

---

## Completed Work

### 1. Theme Count Semantics (Fixed ✅)

**Problem**: UI showed "24 themes" when there were 12 families with 2 variants each. Ambiguous terminology.

**Solution**: 
- Updated `themeCounts()` to return both variant and family counts
- Added `familyCount` and `catalogFamilyCount` to `StudioProject` protocol
- Updated `studioPanel.ts` to populate the new fields
- Updated tests to verify family counting logic
- **Updated UI to display family counts clearly** in three locations:
  - Top bar project counts
  - Status bar footer
  - Library panel heading

**Files Changed**:
- `src/shared/studioProtocol.ts` — Added `PreviewScenario` type, updated `StudioProject` interface
- `src/adapters/studioModel.ts` — Updated `themeCounts()` to calculate families
- `src/adapters/studioPanel.ts` — Populated new family count fields
- `webview/studio/StudioApp.tsx` — Updated top bar and status bar to show "X families (Y variants)"
- `webview/studio/LibraryPanel.tsx` — Updated library heading to show family counts
- `test/studioModel.test.ts` — Updated test expectations
- `test/bundle.test.ts` — Allow Node.js built-in imports (crypto)

**Result**: 
- All 769 tests pass
- Typecheck clean
- Build succeeds
- UI now displays "12 families (24 variants)" instead of ambiguous "24 themes"
- Clear distinction between theme families and theme variants throughout the interface

### 2. Preview Scenario Infrastructure (Added ✅)

**Problem**: No way to switch between component gallery and dashboard preview scenarios.

**Solution**:
- Added `PreviewScenario` type ("components" | "dashboard")
- Added `scenario` field to `StudioState` protocol
- Added `scenario` field to `StudioUiState`
- Added `set-scenario` action to UI reducer
- Default scenario: "components"
- **Added scenario selector UI** in preview toolbar
  - Segmented control with "Components" and "Dashboard" buttons
  - Matches mode-switch styling for consistency
  - Tooltips explain each scenario's purpose
  - aria-pressed indicates current selection

**Files Changed**:
- `src/shared/studioProtocol.ts` — Added `PreviewScenario` type, `scenario` field to `StudioState`
- `webview/studio/uiState.ts` — Added `scenario` to state, action, reducer, initial state
- `webview/studio/PreviewWorkspace.tsx` — Added scenario selector control
- `webview/studio.css` — Added `.scenario-switch` styling

**Result**: Infrastructure in place for scenario selector UI (to be added in Phase C).

### 3. Canonical Preview Data Model (Designed)

**Problem**: Two preview surfaces (Studio and standalone Preview) use different data models.

**Solution**:
- Designed `CanonicalPreviewData` interface in `src/domain/canonicalPreview.ts`
- Unified model includes: identity, tokens, CSS variables, roles, contrast, validation, provenance, draft metadata
- Both surfaces will consume this canonical model

**Status**: Interface designed, not yet integrated. Integration deferred to avoid scope creep in Phase B.

### 4. Dashboard Preview Component (Created ✅)

**Problem**: No dashboard scenario to complement the components scenario.

**Solution**:
- Created `DashboardPreview.tsx` component
- Renders application-scale sample with synthetic data
- Uses same tokens as Components scenario (consistency)
- Clearly labeled as "Sample dashboard" with "Synthetic data for preview"
- Includes: stats cards, chart, table, activity feed
- All data is fictional (Acme Analytics, Sam, synthetic orders)
- Responsive grid layout

**Files Changed**:
- `webview/studio/DashboardPreview.tsx` — New component (280 lines)
- `webview/studio/PreviewWorkspace.tsx` — Conditional rendering based on scenario
- `webview/studio.css` — Dashboard layout styles (grid, cards, chart, table, activity)

**Result**: Users can now switch between Components (semantic role gallery) and Dashboard (application-scale sample) scenarios. Both use the same theme tokens, ensuring consistency.

---

## Test Results

```
Test Files  59 passed (59)
Tests       769 passed (769)
Typecheck   ✅ Clean
Build       ✅ Success (445.21 KB)
```

---

## Next Steps

### Phase B Remaining Work

1. **Update UI to display family counts correctly**
   - Find where "24 themes" is displayed
   - Change to "12 families (24 variants)" or similar
   - Ensure catalog counts are also clear

2. **Add scenario selector UI**
   - Segmented control in preview toolbar
   - Switch between "Components" and "Dashboard" scenarios
   - Persist selection in UI state

3. **Create Dashboard preview component**
   - Larger business dashboard layout
   - Uses same tokens as Components scenario
   - Clearly labeled as synthetic sample

4. **Clarify preview surface purposes**
   - Studio: primary development environment
   - Standalone Preview: lightweight file preview
   - Both consume same canonical data

### Phase C (Next Phase)

- Layout and action clarity
- Consolidate save actions
- Improve comparison control
- Optimize preview canvas sizing

---

## Architecture Decisions

### Why Not Full Canonical Model Integration Now?

The `CanonicalPreviewData` interface is designed but not integrated because:
1. Integration requires changes to both Studio and Preview panel
2. Higher risk of breaking existing functionality
3. Theme count fix delivers immediate user value
4. Scenario infrastructure enables Phase C work
5. Full integration can be done incrementally in Phase C/D

### Why Allow Node.js Built-ins in Bundle Test?

The bundle test originally required only `vscode` as an external import. However:
1. Phase 2 (Increment 6) added caching with SHA-256 hashing
2. `crypto` is a Node.js built-in, not an npm package
3. VS Code extension host provides Node.js built-ins
4. The test's purpose is to prevent npm dependencies, not Node.js built-ins
5. Updated test to allow both `vscode` and Node.js built-ins

---

**Phase B is partially complete. Theme counts fixed, scenario infrastructure added. Continuing with UI updates.**
