# Phase 1 — Contract Matrix: Source, Generation, and Save

**Date:** 2026-10-23  
**Status:** Complete

This document captures the actual contracts discovered during the audit. No invented option names, styles, algorithms, or serialization formats.

---

## 1. Generation Options That Affect the Resulting Theme

### `generateTheme(options: GenerateThemeOptions): GeneratedThemePair`

**Options that change the actual theme tokens:**

| Option | Type | Default | Effect on Theme |
|--------|------|---------|-----------------|
| `seed` | `string` | **required** | Drives entire palette: hue, chroma, lightness, temperature. Invalid seed throws `TV_GENERATION_INVALID_SEED`. |
| `family` | `string` | `"generated"` | Sets `meta.family` and theme names. Does not affect token values. |
| `style` | `GenerationStyle` | `"balanced"` | Modulates surface chroma, primary chroma, secondary/accent relationships, neutral temperature, border strength, surface depth, primary lightness bands, accent offset. |
| `contrast` | `"AA"` | `"AA"` | Contrast contract: text 4.5:1, largeText 3:1, ui 3:1. Only `"AA"` is implemented. |
| `algorithm` | `string` | `"semantic-v2"` | Generation algorithm version. Only `"semantic-v2"` is supported. |

**What is NOT generated:**
- Spacing tokens (only `radius.lg` is generated)
- Shadows, typography, borderWidths, zIndex, breakpoints
- Optional semantic roles (warning, info, error)
- Token references (all values are concrete)

**Output shape:**
```typescript
interface GeneratedThemePair {
  light: ThemeDefinition;
  dark: ThemeDefinition;
}

interface ThemeDefinition {
  name: string;
  meta?: {
    family?: string;
    mode?: "light" | "dark";
    generation?: {
      kind: "generated";
      algorithm: string;
      seed: string;
      style?: string;
      contrast?: { text: number; largeText: number; ui: number };
    };
  };
  tokens?: {
    colors?: {
      // 21 core roles + radius.lg
      background: string;
      foreground: string;
      card: string;
      cardForeground: string;
      popover: string;
      popoverForeground: string;
      primary: string;
      primaryForeground: string;
      secondary: string;
      secondaryForeground: string;
      muted: string;
      mutedForeground: string;
      accent: string;
      accentForeground: string;
      destructive: string;
      destructiveForeground: string;
      success: string;
      successForeground: string;
      border: string;
      input: string;
      ring: string;
    };
    radius?: {
      lg: string;
    };
    code?: CodeTokens; // only if withCode: true
  };
}
```

---

## 2. Options That Affect Only Returned Code or Presentation

| Option | Type | Default | Effect |
|--------|------|---------|--------|
| `withCode` | `boolean` | `false` | When `true`, includes `tokens.code` with 19 syntax-highlighting properties. Does not affect color tokens. |

**Code tokens (when `withCode: true`):**
- background, foreground, border, comment, keyword, string, number, function, variable, type, property, operator, punctuation, tag, attribute, lineNumber, selection, highlight, gutter

---

## 3. Supported Style/Algorithm Values

### GenerationStyle

**Type:** `"balanced" | "soft" | "vibrant" | "editorial" | "minimal" | "brand"`

**Exported as:** `GENERATION_STYLE_NAMES` from `@themvora/core`

**What each style modulates:**

1. **balanced** (default) — Neutral secondary, analogous accent, moderate chroma
2. **soft** — Tinted secondary, lower primary chroma, warmer neutrals
3. **vibrant** — Tinted secondary, split-complementary accent, higher chroma
4. **editorial** — Neutral secondary, complementary accent, lower chroma, stronger borders
5. **minimal** — Zero surface chroma, low primary chroma, true gray neutrals
6. **brand** — Wide primary lightness band (preserves seed lightness), neutral secondary

### GenerationAlgorithm

**Type:** `"semantic-v2"` (only one supported)

**Exported as:** `GENERATION_ALGORITHM` constant

**Supported list:** `SUPPORTED_GENERATION_ALGORITHMS = ["semantic-v2"]`

---

## 4. Actual Generator Output Shape

**Light and dark themes are generated independently from the same seed identity.**

**Identity derived from seed:**
- Hue (0-360)
- Chroma (0-0.37)
- Lightness (0-100)
- Temperature (-1 to 1)

**Pipeline:**
1. Validate seed color
2. Resolve algorithm
3. Derive identity from seed
4. Generate light palette (background ~98 lightness, foreground ~10 lightness)
5. Generate dark palette (background ~10 lightness, foreground ~98 lightness)
6. For each palette: role generators → relationship enforcement → contrast solving
7. Stamp `meta.generation` with provenance
8. Return frozen pair

**Guarantees:**
- WCAG AA contrast for all semantic pairs
- Deterministic output (same seed + options → identical themes)
- 21 core color roles always present
- `radius.lg` always present
- Code tokens only when `withCode: true`

---

## 5. Actual Serialization Formats and Current Limitations

### Format IDs

**Type:** `"json" | "ts" | "ts-generate" | "ts-preset" | "css"`

### Format Capabilities

| Format | Preserves Tokens | Preserves Metadata | Preserves Provenance | Preserves Light/Dark Pair | Limitations |
|--------|------------------|-------------------|---------------------|--------------------------|-------------|
| `json` | ✅ All | ✅ All | ✅ All | ✅ `{ light, dark }` or single | Cannot represent TypeScript-specific features (extends, references) |
| `ts` | ✅ All | ✅ All | ✅ All | ✅ Multiple exports | Cannot represent dynamic values (only object literals) |
| `ts-generate` | ✅ All (as recipe) | ✅ Seed + options | ✅ Generation meta | ✅ Light + dark exports | Requires seed to reproduce; not a concrete representation |
| `ts-preset` | ✅ All (as reference) | ✅ Family filter | ✅ Catalog source | ✅ Filtered presets | Only works for catalog themes; not for custom themes |
| `css` | ✅ Resolved values | ❌ None | ❌ None | ✅ `:root` + `.dark` | Loses all metadata, provenance, token structure |

### Format Details

**JSON:**
- Single theme: `{ name, meta, tokens }`
- Pair: `{ light: {...}, dark: {...} }`
- Standard `JSON.stringify()` (no special serializer)
- Preserves all token values and metadata

**TypeScript (defineTheme):**
- Imports `defineTheme` from `@themvora/core`
- Exports each theme as a named constant
- Exports array of all themes
- Preserves object literal structure
- Cannot represent computed values

**TypeScript (generateTheme):**
- Imports `generateTheme` from `@themvora/core`
- Exports `generateTheme({ seed, family, style, ... })`
- Requires seed to reproduce
- Not a concrete representation of generated tokens
- Falls back to `ts` format if no seed available

**TypeScript (preset catalog reference):**
- Imports `getPresetThemes()`, `getBrandPresets()`, or `getBuiltInThemes()`
- Exports filtered result: `.filter(theme => theme.meta?.family === "oat")`
- Only works for catalog themes
- Uses actual public APIs

**CSS:**
- `themeToCSSVariables()`: flat map of `--theme-{group}-{name}` → value
- `themeToCssDocument()`: complete CSS document
- Single theme: emitted under `:root`
- Pair: light under `:root`, dark under `.dark, [data-theme="dark"]`
- Resolves token references before emission
- Loses all metadata and provenance

---

## 6. What Data Each Format Can Preserve

### Token Groups

| Group | JSON | TS | TS-Generate | TS-Preset | CSS |
|-------|------|----|-------------|-----------|-----|
| colors (21 core) | ✅ | ✅ | ✅ (recipe) | ✅ (reference) | ✅ (resolved) |
| colors (optional 6) | ✅ | ✅ | ✅ (recipe) | ✅ (reference) | ✅ (resolved) |
| radius | ✅ | ✅ | ✅ (recipe) | ✅ (reference) | ✅ (resolved) |
| spacing | ✅ | ✅ | ❌ (not generated) | ❌ (not generated) | ✅ (resolved) |
| shadows | ✅ | ✅ | ❌ (not generated) | ❌ (not generated) | ✅ (resolved) |
| borderWidths | ✅ | ✅ | ❌ (not generated) | ❌ (not generated) | ✅ (resolved) |
| zIndex | ✅ | ✅ | ❌ (not generated) | ❌ (not generated) | ✅ (resolved) |
| breakpoints | ✅ | ✅ | ❌ (not generated) | ❌ (not generated) | ✅ (resolved) |
| typography | ✅ | ✅ | ❌ (not generated) | ❌ (not generated) | ✅ (resolved) |
| code (19 props) | ✅ | ✅ | ✅ (if withCode) | ✅ (if withCode) | ✅ (resolved) |

### Metadata

| Field | JSON | TS | TS-Generate | TS-Preset | CSS |
|-------|------|----|-------------|-----------|-----|
| name | ✅ | ✅ | ✅ | ✅ | ❌ |
| meta.label | ✅ | ✅ | ✅ | ✅ | ❌ |
| meta.description | ✅ | ✅ | ✅ | ✅ | ❌ |
| meta.family | ✅ | ✅ | ✅ | ✅ (filter) | ❌ |
| meta.mode | ✅ | ✅ | ✅ | ✅ | ❌ (selector) |
| meta.version | ✅ | ✅ | ✅ | ✅ | ❌ |
| meta.created | ✅ | ✅ | ✅ | ✅ | ❌ |
| meta.updated | ✅ | ✅ | ✅ | ✅ | ❌ |
| meta.tags | ✅ | ✅ | ✅ | ✅ | ❌ |
| meta.generation | ✅ | ✅ | ✅ (as options) | ✅ (provenance) | ❌ |
| extends | ✅ | ✅ | ❌ | ❌ | ❌ |

### Provenance

| Field | JSON | TS | TS-Generate | TS-Preset | CSS |
|-------|------|----|-------------|-----------|-----|
| origin (definition/generated/catalog) | ✅ | ✅ | ✅ | ✅ | ❌ |
| seed color | ✅ | ✅ | ✅ (as option) | ✅ (in catalog) | ❌ |
| algorithm | ✅ | ✅ | ✅ (as option) | ✅ (in catalog) | ❌ |
| style | ✅ | ✅ | ✅ (as option) | ✅ (in catalog) | ❌ |
| contrast contract | ✅ | ✅ | ✅ (in meta) | ✅ (in catalog) | ❌ |

---

## 7. Current Source-Change Refresh Behavior and Gaps

### Current Behavior

**File save detection:**
- ✅ `workspace.onDidSaveTextDocument()` in projectController
- ✅ Filters to project files via `isProjectFile()`
- ✅ Invalidates cache for changed file
- ✅ Debounces refresh by 150ms
- ✅ Serializes refreshes via promise chain
- ✅ Cancels in-flight inspection before starting new one

**What triggers refresh:**
1. Manual `refresh()` call from extension
2. File save (150ms debounce)
3. Workspace folder changes
4. After successful save in Studio
5. After successful patch application

**What does NOT trigger refresh:**
- ❌ Unsaved document edits (only saves)
- ❌ External file changes (file watcher not implemented)
- ❌ File creation/deletion/rename (no file system watcher)
- ❌ Package.json changes (not monitored)

### Gaps for Reactive Synchronization

1. **No unsaved document observation**
   - User edits theme file but doesn't save → Studio shows stale state
   - Need: `workspace.onDidChangeTextDocument()` listener

2. **No external file watching**
   - User edits theme file in another editor → Studio doesn't update
   - Need: `workspace.createFileSystemWatcher()` for theme files

3. **No file creation/deletion detection**
   - User adds/removes theme file → Studio inventory doesn't update
   - Need: File system watcher for create/delete events

4. **No reactive push to Studio panel**
   - Studio panel doesn't subscribe to file change events
   - Need: Event subscription in studioPanel that triggers state update

5. **All-or-nothing inspection cache**
   - Any file change invalidates entire inspection
   - Need: Delta invalidation (re-process only changed file and dependents)

6. **No dependency tracking**
   - Cannot answer "if file X changes, which themes are affected?"
   - Need: Persist import graph from inspection

7. **Single-pass inspection design**
   - `inspectProject()` is one complete pass
   - Need: Decompose into independently re-runnable stages

---

## 8. Current Default-Theme Selection Behavior and Gaps

### Current Behavior

**On Studio open:**
1. Load or reuse current inspection
2. **No automatic selection** — central canvas is empty
3. User must click a theme in the library to populate preview

**Selection state:**
- `selected: readonly ThemeDefinition[]` — current theme family
- `selection: SelectionView | undefined` — current view with metadata
- No persistence across panel reopens
- No fallback logic

### Gaps for Deterministic Default Selection

1. **No first-open selection**
   - User sees empty canvas on first open
   - Need: Automatic selection of a valid theme

2. **No selection priority**
   - No logic to choose "best" theme
   - Need: Priority: last selected → valid project theme → catalog preset → empty state

3. **No selection persistence**
   - Selection resets on panel reopen
   - Need: Store last selected theme identifier

4. **No validation against current inspection**
   - Persisted selection might reference deleted theme
   - Need: Validate selection exists and is valid before restoring

5. **No fallback to catalog**
   - If project has no themes, no fallback
   - Need: Fall back to canonical preset when no project themes

6. **No empty state with actions**
   - Empty canvas doesn't guide user
   - Need: "Create Theme" and "Browse Presets" actions

---

## 9. Additional Findings

### Import Graph Limitations

- **One level only** for collections and re-exports
- **Relative specifiers only** — TypeScript path aliases not resolved
- **No module resolution** for `node_modules`
- **Collection detection limited** to `const x = [a, b]` and `const x = other`

### Source Region Limitations

- Script region detection is regex-based (pathological `</script>` in strings breaks it)
- No `<script lang="ts">` differentiation
- Masking is character-level (expensive for large files)

### Consumer Recognition Limitations

- Heuristic token usage analysis (unresolved names matching token pattern)
- No deep data flow analysis
- Framework-specific patterns may be missed

### Studio Panel Limitations

- No reactive file watching
- Caches invalidated only on inspection change, not on file save
- `carryMetadata()` preserves provenance but not editor state across mode switches
- Save dialog shown even when destination is "source" if source is undefined

### Save Handler Limitations

- No format validation at save time
- CSS format requires pre-generated CSS string
- No backup of existing files
- Cancellation is not treated as failure (silent return)

---

## 10. Contract Summary

### What the extension CAN do today

1. ✅ Discover themes from source files (up to 400 files scanned)
2. ✅ Recognize `defineTheme()`, `generateTheme()`, catalog calls
3. ✅ Resolve import aliases and namespaces (one level)
4. ✅ Generate themes from seed with 6 styles
5. ✅ Validate themes (21 core color roles)
6. ✅ Serialize to JSON, TypeScript, CSS
7. ✅ Save themes with format selection
8. ✅ Refresh on file save (150ms debounce)
9. ✅ Cache inspections (content-hash validated)
10. ✅ Cancel in-flight inspections

### What the extension CANNOT do today

1. ❌ Observe unsaved document edits
2. ❌ Watch for external file changes
3. ❌ Detect file creation/deletion/rename
4. ❌ Push updates to Studio panel reactively
5. ❌ Delta-invalidate inspection cache
6. ❌ Track dependencies between files
7. ❌ Auto-select theme on first open
8. ❌ Persist selection across reopens
9. ❌ Validate format matches content at save time
10. ❌ Resolve TypeScript path aliases

### What needs to be built

1. **Reactive file watching** — document changes + file system watcher
2. **Delta invalidation** — re-process only changed file and dependents
3. **Dependency tracking** — persist import graph from inspection
4. **Auto-selection** — deterministic first-open theme selection
5. **Selection persistence** — store and validate last selected theme
6. **Origin-aware save defaults** — smart format selection by theme origin
7. **Exact save preview** — show what will be written before writing
8. **Control styling** — visible borders, focus states, spacing

---

## Next Steps

Proceed to Phase 2: Make theme source discovery genuinely reactive.

Key implementation areas:
1. Add `workspace.onDidChangeTextDocument()` listener for unsaved edits
2. Add `workspace.createFileSystemWatcher()` for external changes
3. Add file creation/deletion/rename detection
4. Implement delta invalidation in inspection cache
5. Persist import graph for dependency tracking
6. Push updates to Studio panel on changes
7. Maintain coherent live state across refreshes
