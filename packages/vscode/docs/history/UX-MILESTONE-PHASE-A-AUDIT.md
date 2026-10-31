# Studio UX and Preview Coherence — Phase A Audit

**Date**: 2026-10-23  
**Status**: Audit complete. Proceeding to Phase B implementation.

---

## 1. Current Architecture Overview

### 1.1 Two Preview Surfaces

The extension ships **two separate preview systems** that render themes differently:

#### A. React Theme Studio (`StudioApp.tsx`)
- **Location**: Editor-area webview panel
- **Entry**: `Themvora: Open Studio` command
- **Component**: `ThemePreview.tsx` (reusable)
- **Layout**: Three-region (Library / Canvas / Inspector)
- **Content**: Compact component-focused sample
- **State**: Managed by `StudioApp` + `uiState` reducer
- **Protocol**: Typed `StudioState` / `StudioIntent` messages

#### B. Standalone Theme Preview (`previewPanel.ts`)
- **Location**: Separate editor panel
- **Entry**: `Themvora: Preview Theme` command
- **Component**: Inline HTML/CSS/JS (no React)
- **Layout**: Full-width business dashboard sample
- **Content**: Larger dashboard with metrics, charts, tables
- **State**: Managed by `PreviewController` in host
- **Protocol**: `HostToWebview` / `WebviewToHost` messages

### 1.2 State Ownership

**Studio (React webview)**:
- Selection state (`StudioSelection`)
- UI state (filters, tabs, drawer, save form)
- Draft preview requests
- Comparison mode

**Host (extension)**:
- Project inspection results
- Theme definitions and validation
- File system operations
- Canonical core operations
- Patch generation and application

**Preview Panel (standalone)**:
- Theme data (received from host)
- Mode (light/dark)
- Revision counter for stale detection

### 1.3 Theme Counting Logic

**Current implementation** (`studioModel.ts:279-292`):
```typescript
export function themeCounts(themes: readonly StudioThemeView[]): {
  readonly project: number;
  readonly catalog: number;
} {
  let project = 0;
  let catalog = 0;

  for (const theme of themes) {
    if (theme.origin === "catalog") catalog += 1;
    else project += 1;
  }

  return { project, catalog };
}
```

**Problem**: Counts individual theme variants (e.g., `custom-light` + `custom-dark` = 2), not families. UI shows "24 themes" when there are 12 families with 2 variants each.

---

## 2. Identified UX Problems

### 2.1 Critical: Two Inconsistent Preview Experiences

**Issue**: The same theme renders differently in Studio vs. standalone Preview.

**Evidence**:
- Studio: Compact component gallery
- Preview: Large business dashboard
- Different layouts, different content density, different visual hierarchy
- User sees "custom-light" in Studio, then opens Preview and sees a completely different interpretation

**Root Cause**: Two separate preview implementations with no shared model.

**Impact**: Confusing, inconsistent, undermines trust in the product.

### 2.2 Critical: Misleading Theme Counts

**Issue**: "24 themes" in header, "12 THEMES" in list — both wrong or unclear.

**Evidence**:
- `themeCounts()` counts variants, not families
- UI doesn't distinguish "theme families" from "theme variants"
- User sees 12 rows in the list (families with light/dark variants)
- Header says "24 themes" (counting each variant separately)

**Root Cause**: Ambiguous terminology and incorrect counting logic.

**Impact**: Users can't understand what they're looking at.

### 2.3 High: Duplicate Save Actions

**Issue**: Save button in Studio header AND save form below canvas.

**Evidence**:
- `StudioApp.tsx` header has a Save button
- `PreviewWorkspace.tsx` has a `SavePanel` component below the preview
- Both trigger save workflows
- Unclear which is authoritative

**Root Cause**: Save UX evolved incrementally without consolidation.

**Impact**: Confusing, redundant, error-prone.

### 2.4 High: Preview Scenario Purpose Unclear

**Issue**: Business dashboard in standalone Preview has no clear purpose.

**Evidence**:
- Dashboard shows metrics, charts, tables
- Content looks like real application data
- No indication it's a synthetic sample
- User might think it's connected to their project

**Root Cause**: Preview was built as a generic "show the theme" surface without defining its purpose.

**Impact**: Misleading, potentially confusing.

### 2.5 Medium: Comparison Control Ambiguous

**Issue**: "Single view" button doesn't explain current state.

**Evidence**:
- UI shows light/dark side-by-side
- Button says "Single view"
- Unclear if clicking it will show only light, only dark, or exit comparison
- No visual indication of current comparison state

**Root Cause**: Comparison mode UI is underspecified.

**Impact**: Users don't understand how to control comparison.

### 2.6 Medium: Features Hard to Discover

**Issue**: Existing capabilities are not obviously accessible.

**Evidence**:
- Create drawer has 4 entries (generate, define, preset, existing)
- Inspector has 4 tabs (tokens, validation, details, source)
- Library has 3 views (themes, sources, consumers)
- No clear workflow guidance

**Root Cause**: Feature-rich UI without information architecture.

**Impact**: Users don't know what's possible.

### 2.7 Low: Excessive Empty Space

**Issue**: Preview canvas doesn't use available vertical space well.

**Evidence**:
- Compact preview occupies ~40% of canvas height
- Large blank region below
- No clear reason for the wasted space

**Root Cause**: Conservative sizing without responsive adaptation.

**Impact**: Wasted screen real estate, unpolished feel.

---

## 3. Component Inventory

### 3.1 Studio Components (React)

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| `StudioApp` | `StudioApp.tsx` | Main shell, state management | ✅ Functional |
| `LibraryPanel` | `LibraryPanel.tsx` | Theme list, filters, search | ✅ Functional |
| `PreviewWorkspace` | `PreviewWorkspace.tsx` | Preview + save form | ⚠️ Duplicate save |
| `ThemePreview` | `ThemePreview.tsx` | Reusable preview surface | ✅ Functional |
| `Inspector` | `Inspector.tsx` | Token editor, validation, details | ✅ Functional |
| `CreateDrawer` | `CreateDrawer.tsx` | Theme creation workflow | ✅ Functional |
| `PatchPreviewDialog` | `PatchPreviewDialog.tsx` | Patch proposal review | ✅ Functional |
| `TokenEditor` | `TokenEditor.tsx` | Grouped token editing | ✅ Functional |

### 3.2 Preview Panel Components (Vanilla JS)

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| `createPreviewPanel` | `previewPanel.ts` | Panel lifecycle, CSP | ✅ Functional |
| Inline HTML/CSS/JS | `previewPanel.ts` | Dashboard rendering | ⚠️ Separate from Studio |

### 3.3 Host Services

| Service | File | Purpose | Status |
|---------|------|---------|--------|
| `StudioPanel` | `studioPanel.ts` | Studio host logic | ✅ Functional |
| `PreviewController` | `previewTheme.ts` | Preview host logic | ✅ Functional |
| `buildStudioThemes` | `studioModel.ts` | Theme library mapping | ✅ Functional |
| `themeCounts` | `studioModel.ts` | Count logic | ⚠️ Misleading |
| `buildPreviewModel` | `previewModel.ts` | Preview data model | ✅ Functional |

---

## 4. State Flow Analysis

### 4.1 Studio Selection Flow

```
User clicks theme in LibraryPanel
  → dispatch({ type: "select-theme", theme })
  → host.postMessage({ type: "select", ... })
  → StudioPanel.handle(select)
    → Build StudioSelection from theme
    → Validate theme
    → Post StudioState back to webview
  → StudioApp receives state
  → PreviewWorkspace renders ThemePreview with selection
  → Inspector renders with selection
```

### 4.2 Preview Panel Flow

```
User runs "Preview Theme" command
  → PreviewController.open(uri)
    → Read file
    → Parse theme document
    → buildPreviewModel(themes, mode, source)
    → Post { type: "preview", model } to webview
  → Inline JS applies model.variables to CSS
  → Dashboard renders with theme colors
```

### 4.3 Studio → Preview Flow (Missing)

```
User selects theme in Studio
  → ??? No synchronization to Preview panel ???
```

**Problem**: Studio and Preview are completely independent. Selecting a theme in Studio does not update the Preview panel.

---

## 5. Shared Preview Model Requirements

To unify the two preview surfaces, we need:

### 5.1 Canonical Theme Object

Both surfaces must consume the same resolved theme:
- Theme identity (name, family, mode)
- Source/provenance (file, origin, binding)
- Token values (colors, spacing, typography)
- Validation results (issues, contrast ratios)
- Draft state (baseline, changes)

### 5.2 Preview Scenario Abstraction

A scenario defines what to render:
- **Components**: Focused gallery demonstrating semantic roles
- **Dashboard**: Application-scale sample with synthetic data
- Both use the same theme, just different layouts

### 5.3 Synchronization Mechanism

When selection changes in Studio:
1. Host receives intent
2. Host updates canonical selection
3. Host posts new state to Studio webview
4. Host posts new state to Preview panel (if open)
5. Both surfaces re-render from same model

---

## 6. Proposed Refactoring Strategy

### 6.1 Smallest Refactor for Consistency

**Option A: Extract shared preview component**
- Create `SharedPreview.tsx` that both surfaces use
- Studio embeds it in `PreviewWorkspace`
- Preview panel loads it as a React component
- **Pros**: True code sharing
- **Cons**: Preview panel currently vanilla JS, requires React integration

**Option B: Unify data model, keep separate renderers**
- Both surfaces consume `StudioSelection` / `PreviewModel`
- Studio renders with `ThemePreview.tsx`
- Preview panel renders with inline JS
- **Pros**: Minimal changes, respects existing architecture
- **Cons**: Two renderers to maintain

**Option C: Make Preview panel a Studio view**
- Deprecate standalone Preview command
- Add "Dashboard" scenario to Studio
- **Pros**: Single surface, no synchronization needed
- **Cons**: Loses the lightweight preview use case

**Recommendation**: **Option B** — unify data model, keep separate renderers. This respects the existing architecture while ensuring both surfaces show the same theme interpretation.

### 6.2 Implementation Phases

**Phase B: Shared preview consistency**
1. Define canonical `PreviewData` interface
2. Update `buildPreviewModel` to produce `PreviewData`
3. Update `StudioSelection` to include `PreviewData`
4. Modify Preview panel to consume `PreviewData`
5. Add scenario selector (Components / Dashboard)
6. Ensure both surfaces render from same data

**Phase C: Layout and action clarity**
1. Fix `themeCounts` to distinguish families vs variants
2. Update UI labels ("12 theme families", "24 variants")
3. Consolidate save actions (one contextual menu)
4. Improve comparison control (segmented control with clear states)
5. Optimize preview canvas sizing

**Phase D: Feature discoverability**
1. Add workflow guidance (tooltips, empty states)
2. Organize actions by intent (Explore / Create / Inspect / Implement)
3. Make advanced features accessible but not overwhelming

**Phase E: Regression and visual verification**
1. Test at 420px, 700px, 1000px, 1400px
2. Verify light/dark/high-contrast appearance
3. Test all scenarios (Components, Dashboard)
4. Test all states (loading, empty, error, stale)
5. Run full test suite

---

## 7. Test Coverage Gaps

### 7.1 Existing Tests

- ✅ `studioPanel.test.ts` — host logic
- ✅ `previewPanel.test.ts` — panel lifecycle
- ✅ `previewModel.test.ts` — data model
- ✅ `themeGroups.test.ts` — family grouping
- ✅ `uiState.test.ts` — UI reducer

### 7.2 Missing Tests

- ❌ Shared preview data consistency
- ❌ Scenario switching
- ❌ Selection synchronization across panels
- ❌ Theme count semantics (families vs variants)
- ❌ Save action context (when to show which action)
- ❌ Comparison mode state transitions

---

## 8. Security and Trust Boundaries

### 8.1 Current Boundaries (Preserve)

**Host owns**:
- Workspace inspection
- File system access
- Canonical core operations
- Validation
- Patch generation/application

**Webview owns**:
- Layout and presentation
- UI-only state (filters, tabs, drawer)
- User intents (selection, save request)

**CSP requirements**:
- No external scripts/fonts/APIs
- Nonce-tagged inline scripts
- `default-src 'none'` for Preview panel
- `script-src` restricted for Studio

### 8.2 Proposed Changes (No Boundary Violations)

- Shared data model: host produces, webviews consume
- Scenario selector: UI-only state, no host round-trip
- Synchronization: host posts to both webviews, no direct communication

---

## 9. Performance Considerations

### 9.1 Current Performance

- Studio: React rendering, memoized selectors
- Preview: Vanilla JS, direct DOM manipulation
- Both: Debounced refresh (150-200ms)

### 9.2 Proposed Changes (No Regression)

- Shared data model: computed once in host, posted to both
- Scenario switching: client-side, no host round-trip
- Synchronization: batched posts, not per-change

---

## 10. Acceptance Criteria

### 10.1 Functional

- [ ] Studio and Preview show the same theme interpretation
- [ ] Selecting a theme in Studio updates Preview (if open)
- [ ] Scenario selector switches between Components and Dashboard
- [ ] Theme counts distinguish families from variants
- [ ] One contextual save action, not two
- [ ] Comparison control clearly indicates current state
- [ ] All existing tests pass
- [ ] New tests for shared data consistency

### 10.2 Visual

- [ ] No horizontal overflow at 420px, 700px, 1000px, 1400px
- [ ] Readable contrast in light/dark/high-contrast themes
- [ ] No clipped content
- [ ] Consistent spacing and typography
- [ ] Clear selected/hover/focus/disabled states
- [ ] Dashboard clearly labeled as synthetic sample

### 10.3 Quality Gates

- [ ] TypeScript typecheck passes
- [ ] Build succeeds
- [ ] All tests pass (unit + integration)
- [ ] VSIX packages successfully
- [ ] No CSP violations
- [ ] No console errors

---

## 11. Next Steps

**Phase A (Audit)**: ✅ Complete  
**Phase B (Shared preview consistency)**: Ready to start

Phase B will:
1. Define canonical `PreviewData` interface
2. Update host to produce unified model
3. Modify both surfaces to consume it
4. Add scenario selector
5. Implement synchronization
6. Write tests

Estimated effort: 2-3 days of focused work.

---

**Audit complete. Proceeding to Phase B implementation.**
