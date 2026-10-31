# Milestone 8 — UI inventory and workspace plan

> **Status:** inventory complete (2026-10-21). Increment 2 is the shell described in §4.

## 1. What exists today

Read from `package.json` and `src/`, not from memory.

| Surface | Implementation | State |
| --- | --- | --- |
| Activity Bar container `themvora` | `contributes.viewsContainers.activitybar`, logo `media/themvora.svg` | works |
| Project view `themvora.projects` | **tree** (`adapters/projectTree.ts`) | works, host-verified |
| Theme preview | **webview panel** (`adapters/previewPanel.ts`), inline CSP + nonce, `localResourceRoots: []` | works |
| Editor-title button | `themvora.previewTheme` on theme files | works |
| Status bar | project status + contextual theme-file item | works |
| File badge | `TV` decoration, dependency-gated | works |
| Commands | 7: generate, validate, copy CSS, browse presets, compare, preview, refresh | works |

The tree renders `root → registry → theme`, plus `package` and `message` nodes. Since the registry
loader landed, a canonical project shows its themes; a project with no readable registry shows the
package names and a sentence explaining why.

## 2. What the product needs

Five sections, from the brief:

1. **Overview** — project, framework, package manager, integration status, theme count, source path, validation state.
2. **Theme Studio** — generate, inspect `defineTheme()`, live preview, token explorer.
3. **Presets** — canonical catalog, search, compare, preview, integration guidance.
4. **Packages and Setup** — declared vs installed vs missing, guided integration.
5. **Validation** — diagnostics, contrast, per-theme status.

## 3. Mapping each section to an API that exists

| Need | Source today | Gap |
| --- | --- | --- |
| Theme list per root | `inspectProject().registries[].themes` | none |
| Theme status | `RegistryStatus` + labels | none |
| Generation | `client.generate` (`generateTheme`) | none |
| Validation | `client.validate` | none |
| Preset catalog | `client.catalog` (`getPresetThemes`) | none |
| Diff / CSS | `client.diff`, `client.exportVariables` | none |
| **Framework detection** | — | **missing** |
| **Package manager** | — | **missing** |
| **Declared vs resolved versions** | `inspection.packages` (names only) | **missing** |
| **Integration guidance per framework** | — | **missing** |
| Diagnostics with ranges | `themeDiagnostics` (JSON documents only) | not for `themes.ts` |

Four contracts are missing, and all four are workspace facts rather than theme facts — so they belong
in the extension's domain layer, not in core.

## 4. The shell decision

**One container, two views.** The workspace becomes a **webview view** (`themvora.workspace`) at the
top of the existing `themvora` container; the tree stays below it as `themvora.projects`.

Why not replace the tree:

- The tree is host-verified and is the fastest path to a file. Deleting it would trade a working
  surface for an unproven one in the same increment.
- The webview view carries the polished overview; the tree remains the raw project list. They answer
  different questions and the container already has one icon.

Why a webview view rather than an editor tab for the shell:

- The brief asks for the Activity Bar to be the persistent companion. A view is reachable in one click
  and survives editor-tab churn.
- The **Studio** still opens as an editor tab when a large preview is wanted — a sidebar view cannot
  give a 900px preview the room it needs.

Both surfaces read the same `ProjectController` state; neither owns semantics.

## 5. Increment plan

| # | Scope | Gate |
| --- | --- | --- |
| 1 | This inventory | done |
| 2 | Workspace shell: webview view, Overview, package table, navigation, loading/empty/error states | host check on a real scaffold |
| 3 | Studio: generate → preview → save, `defineTheme()` inspection, token explorer | generated theme previewed in host |
| 4 | Presets: catalog, search, preview, integration guidance | catalog rendered from core |
| 5 | UX checks, packaging, M7 remainder | host 20+ checks, VSIX install |
| 6 | Docs and reconciliation | checklist matches reality |

## 6. Constraints carried into implementation

- No second `generateTheme`, no second catalog, no second registry reader.
- The webview is presentation only: it receives a view model, it does not compute theme semantics.
- No remote assets; inline style and script with a nonce, as `previewPanel` already does.
- Nothing is written on activation.
