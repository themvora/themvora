# @themvora/cli

## 1.3.1

### Patch Changes

- Fix three path and parsing defects: `init` could write outside the project, `export` produced CSS that
  disagreed with the editor, and `theme.json` comments were rejected.

  **`init` refuses a plan that escapes the project root.** The containment check caught `../` traversal
  but not the two other ways out: an **absolute** path (`D:\evil\f.ts` against a `C:\proj` root, or
  `/etc/passwd`) and the **root itself** (an empty relative path, which would have the caller writing to
  the project directory). An absolute path is now rejected outright rather than reinterpreted —
  `resolve()` would either return it unchanged, on a different drive, or silently re-anchor it under the
  root, and both are worse than refusing a plan that was never supposed to carry one.

  The check is also no longer a `startsWith("..")` prefix test. `..foo/a.ts` is a legitimate in-project
  path whose first segment merely begins with two dots, and the prefix test rejected it; containment is
  now decided on the first path segment. The Windows rules are testable on any host, because the path
  implementation is injected rather than imported.

  **`export` emits the same CSS the editor copies.** The CSS document is now produced by core's
  `themeToCssDocument()` instead of a local `cssBlock()` helper, so `themvora export --format css` and the
  VS Code extension's Copy CSS Variables command produce byte-identical output. The local helper had its
  own copy of the two selectors and its own idea of trailing newlines; the values happen to agree today,
  which is exactly the kind of agreement that stops holding the first time one side is edited.

  **`theme.json` may contain comments and trailing commas.** A hand-maintained theme file is JSONC in
  practice, and `JSON.parse` rejected it. The CLI now reads it through core's `parseThemeJson()`, the same
  reader the editor uses, and a genuinely broken file still reports the position the parser gave up at
  rather than a bare "not valid JSON".

  That change also fixed a `doctor` inconsistency it did not set out to fix: `doctor` accepted a commented
  theme file in one check and rejected it in the next, because only one of the two called `JSON.parse`.
  The two now agree with each other and with `validate`.

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @themvora/core@1.5.0

## 1.3.0

### Minor Changes

- React: add `createThemeRoot()` — an optional client-only root bootstrap that lets Theme Kit own the initial React root commit (synchronous first commit via the framework-documented `flushSync` boundary) for CSR applications with a measured first-render scheduling gap. Composition stays in the app: the `render({ runtime })` callback owns the whole provider tree. `ThemeProvider` remains the normal React integration and never calls `flushSync` itself.

  Core: add a `scrollbar` option to the Vite plugin to inject the pre-paint scrollbar bootstrap (`createPrePaintScrollbarScript`) head-prepend, so the custom overlay is the only scrollbar from the first frame.

  React/Vue/Solid/Svelte/Angular: wire scrollbar pre-paint on the `ThemeScrollbar` mount (idempotent — no-ops when the plugin/SSR adapter already emitted it).

  Vue: fix the selected theme not persisting to localStorage.

  Docs: add "Which React setup should I use?", an "Optimized CSR bootstrap" section with architecture diagrams and multi-provider composition, and regenerate the API reference (now including `createThemeRoot`).

### Patch Changes

- Updated dependencies
  - @theme-kit/core@1.3.0

## 1.2.2

### Patch Changes

- Updated dependencies
  - @theme-kit/core@1.2.2

## 1.0.0

### Major Changes

- Release Theme Kit 1.0.0 — the first stable release of the framework-agnostic
  theming runtime. Semantic tokens, theme families, SSR-safe hydration with zero
  flash, smooth transitions, scoped themes, persistence and history,
  multi-window sync, scheduling, a custom scrollbar, a CLI, and adapters for
  React, Next.js, Vue, Nuxt, Svelte, Solid, Angular, Astro, Remix, Tailwind, and
  the major UI libraries (shadcn/ui, Bootstrap, daisyUI, Open Props, Material UI,
  Chakra UI, Ant Design, Mantine, UnoCSS).

### Minor Changes

- Add a stable, documented exit-code scheme to the `theme-kit` CLI — `0` success,
  `1` runtime/command error, `2` invalid arguments, `3` validation failure — via a
  public `UsageError` and `ExitCodes` from the library API. Commands report bad
  arguments as `UsageError` (exit `2`), `validate` exits `3` on failure, and
  `theme-kit --version` prints a clean semver. The transaction also ships a
  package `README.md` and `LICENSE` (added to `files`), a `prepublishOnly`
  build-before-publish guard, and a first-run help screen with per-command
  `--help` output. The docs site now treats the CLI as a full-class product area:
  overview, installation, quick start, one page per command, workflows, and a
  CI & automation page with exit codes and GitHub Actions.

### Patch Changes

- Make the CLI work end-to-end. `validate` now checks `validateTheme`'s returned
  `valid` flag and lists the exact missing token paths instead of always reporting
  success. `generate` accepts `--mode light|dark|both` (default `both`) so it can
  write a single `ThemeDefinition` as well as a `{ light, dark }` pair. The
  `validate`, `inspect`, `export`, and `migrate` commands now transparently accept
  both the single-theme and pair shapes, so the full pipeline (generate → validate
  → inspect → export → migrate) works on its own output — previously `export`
  emitted empty CSS and `inspect` showed "unnamed" for a generated pair. `export`
  of a pair emits `:root` for light and `.dark, [data-theme="dark"]` for dark.
  Also build the `@theme-kit/cli` library entry (`dist/index`), add the `banner`
  shebang, point the `theme-kit` bin at the CJS build for cross-shell
  compatibility, and add a `require` export so CJS consumers resolve the package.
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @theme-kit/core@1.0.0
