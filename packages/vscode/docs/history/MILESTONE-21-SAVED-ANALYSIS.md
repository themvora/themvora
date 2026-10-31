# Themvora for VS Code — Saved-Workspace Analysis

The extension used to re-inspect the whole workspace while you were typing. It now re-inspects when
saved bytes change. This is the audit that found the cost, the lifecycle that replaced it, and the
measurements either side of the change.

---

## 1. The audit

Read from the working tree, before any edit. Every registration of a file, document or editor event
in `packages/vscode/src`:

| Registration | File | What it did |
| --- | --- | --- |
| `onDidChangeTextDocument` | `services/projectController.ts` | Invalidated the changed file's cache entry, then scheduled `refresh()` on a **300 ms** debounce. |
| `onDidSaveTextDocument` | `services/projectController.ts` | Same invalidation, then `refresh()` on a **150 ms** debounce. |
| `createFileSystemWatcher` → `onDidCreate`, `onDidDelete` | `services/projectController.ts` | `refresh()` on a 150 ms debounce. No `onDidChange` listener. |
| `onDidChangeWorkspaceFolders` | `services/projectController.ts` | `refresh()` immediately. |
| `onDidChangeWorkspaceFolders` | `extension.ts` | Detached the removed folder's drafts. Unrelated to analysis. |
| `onDidChangeTextDocument` | `commands/previewTheme.ts` | Rebuilt the preview from the **buffer**, 200 ms debounce, only for the previewed file. |
| `onDidOpenTextDocument`, `onDidChangeTextDocument`, `onDidCloseTextDocument` | `adapters/diagnosticCollection.ts` | Re-diagnosed the **buffer**, 200 ms debounce, JSON/JSONC only. |
| `onDidChangeActiveTextEditor` | `adapters/configStatusBar.ts` | Updated a status-bar badge. |
| `onDidChangeTextDocument`, `onDidSaveTextDocument`, `onDidOpenTextDocument`, `onDidCloseTextDocument`, `createFileSystemWatcher` | `services/reactiveFileWatcher.ts` | **Never imported.** A second, unreferenced watcher with its own `openDocuments` map. |

### What one refresh actually did

`ProjectController.refresh()` chained `runOnce()`, which per workspace folder:

1. Built a `documentProvider` from every **dirty** document and passed it to `createWorkspaceReader`,
   so the inspection read unsaved buffers.
2. Called `cache.getInspection(root, new Map())` — with an **empty** hash map.
3. Ran `inspectProject` and stored the result.

Step 2 is the finding that mattered most. `getInspection` validates by comparing the supplied hashes
against the recorded ones and then checks that no recorded file is missing from the supplied map.
Given an empty map, the first loop does nothing and the second loop finds every recorded file
"deleted" on its first iteration — so it deleted the entry and returned `undefined`. **The inspection
cache never hit.** Every refresh was a full scan, and the entry was thrown away immediately after
each one.

The `CachingProjectReader` in front of the reader had the mirror-image problem: it looked content up
with `getSourceAnalysis(path, null)`, and the cache hashes what it is given, so `null` never matched
a stored hash. Every lookup deleted the entry the previous read had stored and returned a miss. It
cost one SHA-256 per read and retained a copy of every file's contents for an hour, and saved
nothing.

`runOnce` also wrote the result through `onChange`, and `extension.ts` subscribed both surfaces to
it:

| Surface | Work per publish |
| --- | --- |
| Sidebar (`workspaceView.refresh`) | `readProfileFor()` per root → **a full directory walk** plus `node_modules` manifest probes, then a full state render. Ran even when the view had never been resolved. |
| Studio (`studioPanel.panel.refresh`) | The same profile walk again, then `post()`. Ran even when the panel was closed. |

So one keystroke (after the debounce) cost one full inspection, two full directory walks, and two
renders.

### Event-to-work table

Which operations ran on every edit, and which of them actually need the latest **saved** contents:

| Operation | Triggered by an edit? | Needs saved contents? | Verdict |
| --- | --- | --- | --- |
| Theme/source discovery scan (`inspectProject`) | Yes | Yes | Move to save/inventory events |
| Source graph and relationship reconstruction | Yes (inside the scan) | Yes | Move with the scan |
| Theme registry recomputation | Yes (derived from the scan) | Yes | Move with the scan |
| Workspace tree update | Yes (via `onChange`) | Yes | Publish only when roots change |
| Studio/Preview message | Yes (via `onChange`) | Yes | Publish only when roots change |
| Problems panel (diagnostics) | Yes | **No** — the buffer | Keep live; per document, JSON only |
| Preview rebuild for the open theme | Yes | **No** — the buffer | Keep live; one file |
| Draft edits, generation preview | Yes | **No** — in memory | Keep live; no disk |
| Status-bar badge | Active editor only | No | Keep live |

The expensive paths were the first five. The last four are per-document costs with a contract that
says "the buffer you are looking at", and they were left alone.

---

## 2. The lifecycle

`src/services/projectController.ts` was rewritten around one queue.

```
save / create / delete / rename / folders / explicit
        │
        ▼
   merge into `pending`  ──►  75 ms window (0 ms for explicit)
        │
        ▼
   drain: one batch at a time
        ├─ invalidate the cache for what the batch names
        ├─ analyse folders that are not cached
        ├─ if a newer batch arrived: cancel, carry the work and the waiters forward
        └─ publish, then resolve the waiters
```

| Rule | How |
| --- | --- |
| No analysis per keystroke | The controller no longer subscribes to `onDidChangeTextDocument` at all. |
| Saves analyse saved bytes | `onDidSaveTextDocument` → invalidate the file → re-inspect. |
| Duplicate notifications coalesce | Requests merge while `pending` is set; the debounce timer is reset, not duplicated. |
| No overlapping scans | `running` guards `drain`; a request during a run becomes exactly one follow-up. |
| Obsolete results are discarded | A request during a run cancels its token; `inspectProject` checks between files. |
| A late result cannot overwrite newer state | A run whose batch has been superseded is not published, and its waiters move to the batch that replaces it. |
| `await refresh()` means "published" | Waiters resolve after `publish()`, not before. |
| No arbitrary delay | 75 ms merges a burst; a save feels immediate. Explicit refresh uses 0 ms. |

### Invalidation, not revalidation

`InspectionCacheService` gained `getCachedInspection(root)` (trusting the entry), `tracks(path)` (did
any cached inspection read this file?) and `invalidateFile(path): boolean`. Trust is earned by the
event stream rather than reconstructed after the fact:

| Event | Invalidation |
| --- | --- |
| Save of a file an inspection read | Drop the inspections that recorded it |
| Save of a file no inspection read | Nothing — no analysis, no publish |
| External change (`watcher.onDidChange`) | Treated as a save, filtered the same way |
| Create, delete, rename | Drop the folder: the walk would now list a different set of files |
| Workspace folders changed | Drop everything |
| `Themvora: Refresh Project` | Drop everything, ignore the cache |

`cachePath()` normalises separators on the way in and out. A recorded path used to be
`C:\app/src/theme.ts` (folder `fsPath` + `/`-separated relative path) while an event path was
`C:\app\src\theme.ts`, so on Windows `invalidateFile` matched nothing — a second reason the old cache
could not work.

### The reader cannot see a buffer

`createWorkspaceReader(root)` lost its `documentProvider` parameter. Project-wide discovery is
defined as reading the workspace, and a workspace is files. Editor-buffer behaviour stayed where it
is promised:

| Surface | Source | Unchanged? |
| --- | --- | --- |
| `ThemeCatalog.activeDocument` | `window.activeTextEditor` buffer | Yes |
| `PreviewController.readText` | open document, else disk; labels a dirty source `… • unsaved` | Yes |
| `copyCssVariables` (no file argument) | the catalog, i.e. the active buffer | Yes |
| Diagnostics | the buffer being edited | Yes |

No new UI was added. The Preview already labels a dirty source `… • unsaved`, which is the one place
where "you are looking at the buffer" needs saying; a status-bar note would repeat it on every save
and say nothing on every keystroke, which is the opposite of the point. The model is documented in
`README.md` and `architecture.md` instead.

### One profile read per publish

`createProfileCache()` in `services/projectProfileReader.ts` keeps one promise per root, shared by
both surfaces and invalidated by the controller's publish — and only when the publish says the
profile could have moved (`create`, `delete`, `rename`, `folders`, an explicit refresh, or a save of
a `package.json`). A theme save no longer re-walks the project. Both surfaces also skip their render
entirely when they have nothing to render.

### Freshness

| State | Owner | Basis |
| --- | --- | --- |
| Editor buffer | VS Code | What is on screen |
| Saved file | disk | What a save wrote |
| Workspace graph | `controller.roots` | Last analysis of **saved** bytes |
| Studio draft | `DraftRegistry` | In memory, never on disk |

The graph is not relabelled to claim it saw an unsaved edit. `README.md` and `architecture.md` now
say so in the product's own words.

---

## 3. Measurements

Same representative workspace for both runs: a React app with `package.json`, `src/theme/theme.config.ts`,
`src/themes/themes.ts`, `src/main.tsx` (a `ThemeProvider`), forty component files, and the sidebar
webview resolved. Counters are calls the extension made through `workspace.fs` on the fake host,
recorded by the stub — real work, not a mock's opinion of a helper.

**Twenty keystrokes** in `src/theme/theme.config.ts`, 400 ms apart, with the document open:

| Metric | Before | After |
| --- | --- | --- |
| `readFile` | 1000 | 0 |
| `readDirectory` | 340 | 0 |
| Sidebar state posts | 20 | 0 |
| Analyses (full scans) | 20 | 0 |

Per keystroke before: 50 file reads, 17 directory listings, one repaint — the same cost as a save.

**One save** of the same file:

| Metric | Before | After |
| --- | --- | --- |
| `readFile` | 50 | 44 |
| `readDirectory` | 17 | 7 |
| Sidebar state posts | 1 | 1 |

The difference decomposes exactly: 44 inspection reads + 6 profile reads (the manifest and two
`node_modules` manifests, twice) before; 44 inspection reads and no profile walk after. The 17
directory listings were 7 for the inspection walk and 10 for two profile walks; the 7 that remain are
the inspection.

No CPU percentages are claimed. These are counts, and the only timing recorded is the run duration
the controller reports (`stats.lastDurationMs`), which was not compared across machines.

---

## 4. Tests

`test/savedAnalysis.test.ts` — sixteen tests through the real composition root (`activate()`, the
real controller, the real `inspectProject`, a real temporary project):

| # | Test | Asserts |
| --- | --- | --- |
| 1 | does not analyse the workspace while a document is edited | Twenty edits: zero filesystem calls, zero publishes |
| 2 | keeps the published graph on the saved contents, not the buffer | A dirty buffer naming `unsaved-name` leaves the graph reporting `first` |
| 3 | analyses the saved contents of a theme file | The saved rewrite is what the graph reports |
| 4 | merges duplicate save and watcher notifications into one analysis | Save + watcher + save costs one analysis' worth of reads and one publish |
| 5 | keeps the graph current when several files are saved quickly | Two files, one analysis, both themes present |
| 6 | ignores a save of a file the analysis never read | `dist/bundle.js`, `assets/logo.css`: no reads |
| 7 | discovers a theme file that is created | Inventory follows `create` |
| 8 | forgets a theme file that is deleted | Inventory follows `delete` |
| 9 | re-reads after a rename | Delete + create of the moved file |
| 10 | publishes the newest saved contents when saves overlap | Two saves in one tick: the second content wins |
| 11 | re-reads everything on an explicit refresh, and publishes before it resolves | A file written with no event is found, and is visible on the line after `await` |
| 12 | publishes once per save, not once per event | One state message for save + watcher |
| 13 | keeps the preview following the buffer while the workspace stays saved-only | A new preview model for the edited buffer, zero filesystem calls |
| 14 | copies from the unsaved buffer when no file is named | The clipboard holds the buffer's colours, not the file's |
| 15 | registers one save listener and one watcher | No duplicate registrations |
| 16 | leaves nothing subscribed when the extension is disposed | Listeners and watcher released |

Test 11 exists because the extension-host test caught a real defect during verification: the drain
loop resolved a batch's waiters before publishing, so `await refresh()` could return the previous
inspection. It was found by `test/host/smoke.cjs`, not by the unit tests — which is the argument for
keeping the host test.

Supporting changes: the fake host gained `fsCalls` counters, a `createFileSystemWatcher` double with
`__fireWatcher`, `onDidCreateFiles`/`onDidDeleteFiles`/`onDidRenameFiles`, and `__changeDocument` now
marks the buffer dirty the way a real edit does (a test that could not express "unsaved" could not
have caught the old behaviour). `test/helpers/webview.ts` resolves the sidebar the way the host does.

---

## 5. Verification

Run from `packages/vscode`, in this order:

| Command | Result |
| --- | --- |
| `npx vitest run test/savedAnalysis.test.ts` | 16 passed |
| `npx vitest run` | 83 files, 1090 tests passed |
| `npx tsc -p tsconfig.json --noEmit` | 0 errors |
| `npx tsc -p tsconfig.webview.json --noEmit` | 0 errors |
| `npx eslint src test --max-warnings 0` | 0 problems |
| `npx tsup && npx tsc -p tsconfig.build.json && node scripts/build-webview.mjs` | built, 4 webview assets |
| `npx @vscode/vsce@3.6.2 package --no-dependencies` | `themvora-vscode-0.1.0.vsix` |
| `node scripts/verify-vsix.mjs` | self-contained |
| `node scripts/test-host.mjs` (dev) | 23 checks passed |
| `node scripts/test-host.mjs --vsix` (packaged) | 23 checks passed |

Command ids, the draft registry, the command layer and the theme-discovery rules are untouched.

---

## 6. Limitations

- **The suite waits in real time.** The debounce is real, so `settle()` waits four times its length.
  A slower machine lengthens the tests rather than changing the verdict; they do not assert on
  intermediate states.
- **Invalidation is per file, not per fact.** Saving any file the last analysis read re-inspects the
  whole folder, including a component that merely mentions `@themvora`. Narrowing that would require
  the inspection to record which output each file contributed, which is a larger change than this
  correction.
- **A cancelled run finishes its current file.** The token is checked between files, not inside a
  `workspace.fs` call.
- **The watcher is extension-based.** It covers `ts, tsx, mts, cts, js, jsx, mjs, cjs, vue, svelte,
  astro, json, jsonc, html` — the extensions an inspection reads. A directory rename is seen as the
  delete and create events of its files.
- **`copyCssVariables` with an explicit file argument still reads the file from disk**, even when the
  file is open and dirty. `previewTheme.readText` prefers the open document. The inconsistency
  predates this work and was left alone; the no-argument path, which is the one that promises to use
  the active editor, was verified.
- **No end-to-end CPU profile.** The counts above are filesystem work and publishes. A profiler run
  on a large real workspace would be a separate measurement, and was not attempted here.
- **`reactiveFileWatcher.ts` was deleted.** It was unreferenced — no import in `src`, `test`,
  `webview` or the build scripts — so nothing lost a capability; the history documents that mention
  it describe a state that no longer exists.
