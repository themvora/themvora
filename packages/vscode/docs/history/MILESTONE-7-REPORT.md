# Milestone 7 — external-consumer, cross-platform, and package hardening (report)

> **Status: partially verified (2026-10-21).** Three of the five tasks are machine-verified, one is
> partial, one is blocked. The gate is **not** claimed.
> **Scope source:** `themvora-vscode-plan-checklist.md`, Milestone 7.
> **Related:** `MILESTONE-6-UX-CHECKLIST.md` — the human editor pass, still outstanding.

## Task-by-task

| # | Task | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Test the packed extension outside the workspace | **Done** | `--vsix` host mode unpacks the archive into `%TEMP%` and runs it against a workspace in `%TEMP%`, outside the monorepo. **18/18** checks pass. |
| 2 | Validate runtime dependency inclusion and host compatibility | **Done** | The bundle has exactly **one** module specifier, `'vscode'`. No `node_modules/` and no `.ts` sources in the archive. Runs on VS Code **1.142.0** against `engines.vscode: ^1.94.0`. |
| 3 | Windows paths with spaces, and one non-Windows environment | **Partial** | Dev mode runs from `D:\Code\NPM Packages\themvora` — a path with a space — **18/18**. No macOS or Linux host is available here, so the non-Windows half is **not done**. |
| 4 | Representative generated projects and both styles | **Done** | All six styles generate a light/dark pair where both halves validate, 22 CSS variables each. The scaffold shape was taken from `themvora init --framework react --dry-run`, which writes `src/themes/themes.ts` and **no `theme.config.ts`**, and reproduced in the host: the extension finds it, detects `@themvora/core`, and reports `unsupported` — found, not readable. See below. |
| 5 | Manifest, icon, README, LICENSE, ignore rules | **Done** | Icon declared (`media/icon.png`) and present; `LICENSE.txt`, `readme.md`, `changelog.md` present; no `src/`, `test/`, `scripts/`, `MILESTONE-*.md`. **One defect found — see below.** |

## The defect: development configs shipped to users

`.vscodeignore` excluded the source, the tests, the build configuration and the milestone documents,
but **not `.vscode/`**. Every install therefore carried `launch.json` and `tasks.json` — an F5
configuration referencing `pnpm` scripts and a `preLaunchTask` that do not exist in a user's machine.

Harmless to run, but wrong: it is editor configuration for developing *this* extension, and it was in
the published artifact.

Fixed by adding `.vscode/**` to `.vscodeignore`. The archive went from **48 files / 104.61 KB** to
**46 files / 103.91 KB**, and the two files are confirmed absent. The host suite was re-run afterwards:
**18/18** in both modes.

## The defect the install exposed: nothing to open

Installing the extension revealed a second problem, reported as "I can't see any UI
and there's no sidebar icon to open it". It was accurate.

`contributes` declared `views` but **no `viewsContainers`**. The tree was therefore
keyed under `explorer` — a collapsible section inside the built-in Explorer — and
there was no Activity Bar container, no icon, and no view to open or close. Nothing
failed at runtime: a view contributed under a container that does not exist is
simply never rendered, which is indistinguishable from "the extension does nothing".

Fixed by contributing an Activity Bar container:

| Before | After |
| --- | --- |
| `views.explorer` → `themvora.projects` | `viewsContainers.activitybar` → `themvora`, and `views.themvora` → `themvora.projects` |
| No icon | `media/activity-icon.svg` (24×24, single solid shape, fixed light-grey fill) |
| Activation only on `json`/`jsonc` | Plus `onView:themvora.projects` |

Two guards now exist so this cannot silently recur:

1. `test/manifest.test.ts` — asserts a container is contributed, that every `views`
   key names a declared or built-in container, that every container icon exists on
   disk and is an SVG, and that the project tree sits in the `themvora` container.
   Confirmed to fail with the container removed: two named failures.
2. A host check — asserts `workbench.view.extension.themvora` and
   `themvora.projects.focus` are registered in a real VS Code, which is the runtime
   proof that the container exists rather than merely being declared.

The icon uses a fixed light grey rather than `currentColor`: the Activity Bar is
dark in VS Code's default **light** theme as well as its dark one, so a
`currentColor` glyph would resolve to black and disappear.

## Installation record

`Code.exe --install-extension` is not usable on this host — it starts the full application instead of
running CLI-only and never returns. The extension was therefore installed the way VS Code itself lays
one down:

| Item | Value |
| --- | --- |
| Target | `C:\Users\sauga\.vscode\extensions\themvora.themvora-vscode-0.1.0\` |
| Source | `unzip` of `themvora-vscode-0.1.0.vsix`, `extension/` contents only |
| Registry | one entry appended to `C:\Users\sauga\.vscode\extensions\extensions.json` |
| Backup | `extensions.json.themvora-backup` (17 094 bytes, taken before the edit) |
| Integrity | `dist/index.js` sha256 **identical** to the build output |
| Host | VS Code **1.142.0**, user install |

The registry already contained an entry for `themvora.themvora-vscode` whose folder was absent, so
the entry was replaced rather than duplicated — registry and disk are now consistent.

To remove it: delete that folder and its entry, or run
`code --uninstall-extension themvora.themvora-vscode`.

## Bundle and dependency evidence

```
$ grep -oE "(from|require\()\s*['\"][^'\"]+['\"]" dist/index.js | sort -u
'vscode'                                  ← the only module specifier

$ grep -c child_process dist/index.js
0

dist/index.js  201 494 bytes
```

No runtime dependency is bundled because there is none to bundle: the extension imports `vscode` and
its own modules, and `@themvora/core` is compiled in.

## The scaffold finding

`themvora init` was dry-run rather than executed, because it installs dependencies:

```
1. Files
   create   src/themes/themes.ts        the custom theme pair and the selected presets
   create   src/index.css
   create   src/components/ThemvoraDefault.tsx
   create   src/components/ThemeSwitcher.tsx
   create   vite.config.ts
```

There is no `theme.config.ts` — React, Vue, Solid and Svelte all use the registry module.
So the **only** theme file a freshly initialized project has is `src/themes/themes.ts`,
and that is TypeScript. The TypeScript limitation is therefore the default path, not an
edge case: the panel says "not readable yet" for every scaffold, correctly, and will keep
doing so until the extension can read a registry module.

This is what the new host check asserts, through `api.projects` — added for exactly this
reason, since a tree view has no read API.

> **Resolved (2026-10-21).** `@themvora/core` now exports `loadThemeRegistry()`, a static reader
> for the generated module, and the extension uses it: the same scaffold reports `supported · 10
> themes` in the host. See `MILESTONE-7-REGISTRY-LOADER.md`. The paragraph above is kept as the
> record of why the work was needed.

## Not verified, and not claimed

1. **Any non-Windows platform.** No such host was available. Path handling, `unzip` availability and
   the executable search in `scripts/test-host.mjs` are all written to be portable, but untested
   there.
2. **A full `themvora init` run.** The scaffold's *file shape* is verified in the host, but the
   installer itself was not run (it installs dependencies).
3. **That the installed copy runs in the user's real editor.** Installation is verified structurally
   — folder, registry entry, byte identity — not behaviourally. The editor pass will show it, since
   every check in `MILESTONE-6-UX-CHECKLIST.md` exercises the installed copy.

## Gate

> installable VSIX works independently of the development monorepo

The automatable half holds: the packaged bytes load and pass 18 checks in a workspace and extensions
directory outside the monorepo, with no runtime dependency and no development files inside the
archive. **The gate is left unticked** because "works" also means the installed copy behaving in a
real editor, which is the outstanding human pass.

## Update — the packaging invariant is now a gate

The "no runtime dependency, no development files" claim above was checked by eye and by `unzip -l`.
It is now a script, `scripts/verify-vsix.mjs`, run by `pnpm verify:vsix` and by
`pnpm test:host:vsix` before the host pass. It asserts, against the archive rather than the build
tree:

1. `main` in the packaged manifest resolves to a member that exists.
2. No `node_modules/` is shipped.
3. The host bundle has no bare `@themvora/` import. The check is anchored to the start of a line:
   the bundle legitimately *contains* `import { … } from "@themvora/core"` as a **string literal**
   it writes into saved theme files, and an unanchored regex reported that as a leak.
4. The webview script and stylesheet ship, and the manifest still contributes the Studio command
   and the Activity Bar view.
5. Source, tests, webview source and build config are absent.

Proven by injecting `import { validateTheme } from "@themvora/core";` into a copy of the archive:
the gate fails with that line quoted, and passes once removed. All 13 checks pass on the current
artifact.

**Still open, unchanged:** the non-Windows host, and the human pass in
`MILESTONE-6-UX-CHECKLIST.md`. The gate stays unticked until both are done — a structural check of
the archive is not the same as an installed copy behaving in a real editor.
