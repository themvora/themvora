# Themvora for VS Code — Milestone 0 Audit

> **Status:** audit complete, awaiting approval to begin Milestone 1
> **Date:** 2026-10-20
> **Scope:** read-only inspection of the monorepo, `@themvora/core`, `@themvora/cli`. No extension code written.
> **Method:** every claim below was resolved against source, the built `dist`, or a live invocation. Nothing is inferred from the plan document.

---

## 1. Repository structure

### Workspace

`pnpm-workspace.yaml` globs: `packages/*`, `packages/adapters/*`, `examples/*`, `examples/apps/*`, `apps/*`.

**24 publishable packages**, none `private`. Versions are independent:

| Group | Packages |
| --- | --- |
| Engine | `@themvora/core` 1.4.0, `@themvora/web` 1.4.0 |
| Tooling | `@themvora/cli` 1.3.0, `@themvora/devtools` 1.3.0, `@themvora/tailwind` 1.3.0 |
| Framework integrations | `react` 1.3.1, `next`/`vue`/`nuxt`/`svelte`/`solid`/`angular`/`astro`/`remix` 2.0.0 |
| Library adapters | `antd`, `chakra`, `mantine`, `mui`, `bootstrap`, `daisyui`, `open-props`, `shadcn`, `unocss`, `adapters` |

`.changeset/config.json` has one `fixed` group: `[["@themvora/core", "@themvora/web"]]`. The docs app and the example apps are `ignore`d. **A new package does not join a version group.**

`packages/vscode` does not exist. There is no editor integration of any kind in the repository.

### Build

- `tsup` per package → ESM + CJS, `target: es2022`, sourcemaps, no minify; declarations via `tsc -p tsconfig.build.json` (`emitDeclarationOnly`).
- Root `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `moduleResolution: "Bundler"`, `resolveJsonModule`.
- `pnpm -r build` is the CI build step, so a new package is picked up automatically once it has a `build` script.

### Test

- `vitest` per package, `environment: "node"`, `include: ["test/**/*.test.ts"]`. `pnpm -r test` runs every package that declares `test`.
- The CLI's harness (`packages/cli/test/helpers.ts`) drives `run()` in-process with `process.stdout.write` / `process.stderr.write` spied — proof that the command surface is designed for embedding.

### Lint

`eslint.config.mjs` is flat config scoped to `scripts/**/*.mjs` and `apps/docs/scripts/**/*.mjs`, and it **ignores `packages/**` outright**. There is no TypeScript lint gate in this repo. A new package inherits that: `pnpm lint` will neither cover nor block it.

### CI (`.github/workflows/ci.yml`)

`workspace` job: install → `pnpm -r build` → `pnpm -r test` → `pnpm lint` → preset audit → brand audit.
`docs-gate` job: install → build → `pnpm docs:release-gate`.

### Release gate constraint (affects Milestone 1)

`scripts/release/audit-packages.mjs` globs `packages/*` and checks **every** package, private or not:

```js
check(rel, "type:module", json.type === "module", json.type ?? "MISSING");   // unconditional
const publishable = !json.private;                                           // gates the rest
```

So a `packages/vscode/package.json` without `"type": "module"` fails `pnpm release:audit`. A VS Code extension manifest normally omits it. This is a **decision point** — see §10.

---

## 2. `@themvora/core` — verified public surface

`type: "module"`, **zero runtime dependencies**, and **zero `node:` imports** in `src` (`grep -c 'from "node:'` → 0). `dist/index.js` is 359 KB unminified ESM. It is safe to bundle into an extension host and, in principle, into a web extension later.

Exercised live against `dist`:

```text
generateTheme({ seed: '#4f46e5', family: 'brand' })
  → { light, dark }           name brand-light, 21 colors, primary #4f46e5 on #fbfbff
isGeneratedTheme(light)       → true
light.meta.generation         → {"kind":"generated","algorithm":"semantic-v2","seed":"#4f46e5",
                                 "contrast":{"text":4.5,"largeText":3,"ui":3}}
validateTheme(light)          → { valid: true, issues: [] }
measureThemeContrast(light)   → 16 MeasuredPair {foreground, background, requirement, ratio, floor, passes}
themeToCSSVariables(light)    → 22 entries
getPresetCatalog()            → 14 entries: 9 default + 5 brand
GENERATION_STYLE_NAMES        → balanced, soft, vibrant, editorial, minimal, brand
```

### Signatures the extension will consume

```ts
generateTheme(o: { seed: string; family?: string; withCode?: boolean;
                   style?: GenerationStyle; contrast?: "AA"; algorithm?: string })
  : { light: ThemeDefinition; dark: ThemeDefinition }

validateTheme(theme: ThemeDefinition, o?: { themes?: readonly ThemeDefinition[] })
  : { valid: boolean; issues: ValidationIssue[] }        // ValidationIssue: {code, type, path, message, context}

validateThemeLevels(theme, o?: { levels?: ValidationLevel[] }) : LevelIssue[]

measureThemeContrast(theme) : MeasuredPair[]             // canonical contrast — do not reimplement

getPresetCatalog() : PresetCatalogEntry[]                // memoized ~17 ms
getPresetThemes() : ThemeDefinition[]
defineTheme(def) : ThemeDefinition

isGeneratedTheme(theme) : boolean                        // provenance predicate
findGeneratedTheme(themes, active?) : { status: "found"|"missing"|"ambiguous"; theme; candidates }
resolveGeneratedTheme(themes, active?) : ThemeDefinition

diffThemes(a, b, o?) : ThemeDiffReport                   // semantic diff — NOT the animation diff
themeToCSSVariables(theme) : Record<string, string>
CORE_COLORS : readonly string[]                          // 21 roles
```

`@themvora/core/config` (Node-only subpath):

```ts
THEMVORA_CONFIG_FILES = ["theme.config.ts", "theme.config.tsx", "theme.config.mts",
                         "theme.config.mjs", "theme.config.js", "theme.config.cjs"]
loadThemvoraConfig<T>(root: string, configPath?: string): Promise<ThemvoraConfig<T> | null>
```

`loadThemvoraConfig` loads `theme.config.*` through **Vite's own `loadConfigFromFile`**, resolved from the project. It returns `{ themes, defaultTheme?, initialMode?, initialFamily?, ... }`.

---

## 3. `@themvora/cli` — verified public surface

```ts
export { cmdGenerate, cmdList, cmdValidate, cmdMigrate, cmdInspect, cmdExport,
         cmdDiff, cmdExplain, cmdAudit, cmdDoctor, cmdInit, cmdCompletion, cmdAdd }
export { run, ExitCodes, CommandExit, UsageError, parseArgs, VERSION }
```

`run(argv: string[]): Promise<number>` is explicitly designed for embedding:

- **returns** the exit code, never calls `process.exit` (`cli.ts` is a three-line bootstrap that does);
- **never throws** — `CommandExit`, `UsageError` and unknown errors are all converted to codes;
- **never calls `process.chdir`** (verified: zero occurrences in `src`).

Exit codes (`src/exit-codes.ts`): `0` OK · `1` Error · `2` Usage · `3` ValidationFailed.

### What it does *not* offer

1. **No IO context.** All output goes to `process.stdout` / `process.stderr` directly (≈15 call sites across commands plus `output.ts`). Capturing it requires monkey-patching the process-global streams.
2. **No `cwd` parameter.** Relative paths resolve against `process.cwd()`. Mitigable: every path-taking command accepts an absolute path.
3. **`init` blocks.** `createProcessRunner()` uses `spawnSync` for scaffold, install and verification, with stdio `["inherit", 2, 2]` (child output is redirected to the parent's stderr so stdout stays a pure payload). In-process, that stalls the entire extension host for the duration of a `pnpm install`.

### Command / machine-readable matrix (from `command-schema.json` v1)

| Command | Path argument | `--json` | Plan mode | Notes |
| --- | --- | --- | --- | --- |
| `init` | `<dir>` positional | ✅ | `--plan`, `--dry-run` | `--framework`, `--styling css\|tailwind`, `--package-manager`, `--no-install`, `--force` |
| `add` | `--dir` | ✅ | `--plan`, `--dry-run` | `add preset\|brand\|seed <value>` |
| `doctor` | `<dir>` positional | ✅ | — | project health; `{id,level,title,detail,fix}` findings |
| `validate` | `--file` | ✅ | — | JSON theme files only |
| `inspect` | `--file` | ✅ | — | JSON theme files only |
| `list` | — | ✅ | — | `presets\|brands\|styles\|frameworks`, `--ids` |
| `diff` | 2 positionals / flags | ✅ | — | semantic diff via `diffThemes` |
| `explain` | — | ✅ | — | how a theme was produced |
| `audit` | — | ✅ | — | quality gate over presets |
| `migrate` | `--file` | ✅ | `--dry-run` | theme **file**, not project |
| `generate` | `--output` | ❌ (`json:false`) | `--dry-run` | **always** emits JSON to stdout when `--output` is absent |
| `export` | `--file` | ❌ | — | `--format css\|json`, `--output` |
| `completion` | — | ❌ | — | shell completions |

Verified live: `list presets --json` → exit `0`, stdout is pure JSON (2342 bytes), stderr empty.

---

## 4. Theme schema and provenance

### `ThemeDefinition`

```ts
{
  name: string;
  meta?: { family?, mode?, label?, order?, version?, description?,
           generation?: { kind: "generated", algorithm, seed, style?, contrast, anchored? } };
  tokens: {
    colors: { /* 21 required roles */ };
    radius?: { lg?: string };
    code?: { /* opt-in via withCode */ };
  };
  extends?: unknown;
}
```

Required color roles (frozen in `validate-theme.ts`): `background`, `foreground`, `card`, `cardForeground`, `popover`, `popoverForeground`, `primary`, `primaryForeground`, `secondary`, `secondaryForeground`, `muted`, `mutedForeground`, `accent`, `accentForeground`, `destructive`, `destructiveForeground`, `success`, `successForeground`, `border`, `input`, `ring`.

`warning` / `info` / `error` are **optional capabilities and are deliberately not emitted** by `generateTheme`.

### Provenance — a real contract, not a convention

`meta.generation.kind === "generated"` is the discriminator, stamped by `generateTheme` and matched **only** by `isGeneratedTheme()`. The docstring is explicit that it must not be inferred from name, family, algorithm or colour values, and that it survives `JSON` round-trips and `ThemeRegistry` registration because both copy `meta` verbatim.

This satisfies the plan's §10 requirement directly — the extension uses `isGeneratedTheme()` and nothing else.

### `PresetCatalogEntry` (verified shape)

```text
keys: id, name, family, kind, seed, style, algorithm, temperature,
      character, tags, radius, modes, themes, quality
```

- `kind`: `"default"` (preset) | `"brand"`
- `modes`: `["light","dark"]`; `themes`: `{ light, dark }` — fully resolved `ThemeDefinition`s
- `quality`: `{ passed, total, warnings, failures, checks }`
- Presets: `oat, berry, mint, citrus, cocoa, plum, iris, sky, graphite`
- Brands: `apple, github, vercel, slack, discord`

The extension can therefore render a complete, canonical preview with **no generation call at all** for catalog entries.

---

## 5. Integration decision

### Core → import directly, bundle it

Evidence: zero runtime dependencies, zero `node:` imports in `src`, deterministic pure functions, `dist/index.js` 359 KB. Bundled and tree-shaken by esbuild this is well within extension budget.

This gives the extension in-memory generation, validation, contrast, catalog and diff **without any subprocess and without a second implementation**.

### CLI → spawn it as a child process, bundled into the extension

**Rejected: in-process `run()`.** It fails two of the plan's own four conditions (`explicit working directory`, `explicit IO context`) and fails a third practically:

1. IO is process-global — capturing output means patching `process.stdout.write` in the extension host, which is shared with every other extension and with VS Code's own logging.
2. `init` uses `spawnSync`, so an in-process `init` freezes the extension host for the whole install/verify. VS Code surfaces that as "extension host unresponsive".
3. Cancellation has nothing to kill.

**Chosen: subprocess.** The extension ships `@themvora/cli`'s built `dist/cli.cjs` as a bundled runtime asset and spawns:

```text
process.execPath  [cliCjs, ...argv]
env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
cwd: <absolute project root>
stdio: ["ignore", "pipe", "pipe"]
```

This yields honest stdout/stderr separation (the CLI already guarantees a pure payload on fd 1), real cancellation via `kill`, no extension-host blocking, no PATH dependency, and no `npx`. Arguments are always passed as an array; no shell.

**Pipe feasibility — measured, not assumed.** The repo's own notes and the CLI's runner comments document piped child stdio failing with `EBUSY` on this host, which is why `childCommandStdio()` uses `["inherit", 2, 2]`. I re-tested it here and **it worked in both modes**:

```text
spawnSync + encoding:utf8        → status 0, 2342 bytes on stdout
spawn + stdio:["ignore","pipe","pipe"] → code 0, 2342 bytes, pure JSON
fd-based (openSync → temp file)  → status 0, 2342 bytes, parsed
```

So the historical failure does not reproduce in this environment. The runner will nonetheless be written with an fd-based fallback behind one function, and Milestone 3 will re-verify on the packaged artifact rather than trusting this probe.

### Capability discovery

No `--capabilities` or schema-dump command exists, and `command-schema.json` is inlined into the bundle rather than shipped as a file. What is available:

- `themvora --version` → the version string;
- `list frameworks --json` → the **full** `FrameworkIntegration` objects (`id`, `displayName`, `dependency`, `detectionPriority`, `buildSystem`, `ssr`, `vite`, `supports`, `packages`, `initSupported`) — verified live;
- `ExitCodes` / `VERSION` from the bundled module if needed.

The extension will gate commands on the resolved CLI version plus a per-command smoke probe, not on parsing help text.

---

## 6. Gaps — what is missing, and what I propose

These are the honest blockers. None of them is fatal; each has a stated resolution.

### G1 — No public API to read a project's generated theme registry *(material)*

`themvora init` writes `src/themes/themes.ts` (Vite targets) or `themes/themes.ts` (Next). That module imports `defineTheme` / `getPresetThemes` from `@themvora/core` and exports `themes`, `defaultTheme`.

- `loadThemvoraConfig()` only discovers `theme.config.*`, and **`init` never writes that file** — verified across all five adapters (`react`, `vue`, `svelte`, `solid`, `next`); the adapters' own comments say "no Vite plugin and no `theme.config.ts`".
- `validate` / `inspect` / `export` / `migrate` read **JSON only** (`readThemeJSON` → `JSON.parse`).

**Consequence:** the extension cannot today show or validate *the project's own themes*.

**Resolution (MVP):** use the canonical **catalog** for browse/preview/validate/generate — 14 fully resolved entries plus `generateTheme` in memory. The project's own registry is **deferred** and shown as a status line, not as data.

**Resolution (post-MVP, proposed core API):** `loadThemeModule<T>(root, relPath): Promise<{ themes, defaultTheme } | null>` in `@themvora/core/config`, reusing the existing `resolveVite` + `loadConfigFromFile` path. This is the smallest change that closes the gap without a second loader, and it is a **core** change, not an extension one.

### G2 — `doctor` mis-reports a normal generated project *(accuracy, affects the sidebar)*

Measured on `examples/apps/react`, a real generated app:

```text
healthy: true   errors 0, warnings 2, info 4
  warning  theme-config   no theme.config.ts found
  info     theme-files    none found in the project root or themes/
```

Both findings are wrong for this project: it has `src/themes/themes.ts`. `findThemeFiles()` only looks for `theme.json`, `*.theme.json` and `themes/*.json`.

**Resolution:** the extension does **not** treat `doctor`'s warnings as project health for status purposes. Discovery uses `package.json` `@themvora/*` dependencies + the two registry paths, read-only. `doctor` output is shown verbatim when the user asks for it, with the caveat surfaced. A CLI fix (teach `findThemeFiles` about `themes.ts`, stop warning about a missing `theme.config.ts` when a registry exists) is the correct long-term fix and should be filed separately.

### G3 — No project-level migration

`migrate` operates on a theme **file** (`--file`), not a project. "Themvora: Migrate Project" as written in the plan has no backing operation.

**Resolution:** register `Themvora: Migrate Theme File` instead. Project migration is deferred with no placeholder command.

### G4 — `generate`'s JSON contract is inconsistent in the schema

`command-schema.json` declares `generate: json: false`, but the implementation always writes JSON to stdout when `--output` is absent. Consumers should not rely on the flag.

**Resolution:** the extension invokes `generate` without `--output` and parses stdout; the schema inconsistency is reported, not fixed, in this task.

### G5 — Framework detection is only public for `init`-supported frameworks

`list frameworks --json` returns `INIT_FRAMEWORKS` (5 of 9). Nuxt, Angular, Astro and Remix projects would be "recognised by package dependency, framework unknown".

**Resolution (MVP):** show the dependency evidence and leave the framework as "unsupported for init". **Proposed CLI change:** export `FRAMEWORK_INTEGRATIONS` or add `list integrations --json`. Small and additive.

### G6 — Release audit requires `type: "module"` on every package

See §1. Decision in §10.

### Not gaps (confirmed present, contrary to what the plan hedges on)

- Canonical semantic diff: `diffThemes()` in core + `themvora diff --json`. Usable.
- Provenance predicate: `isGeneratedTheme()`. Usable.
- Contrast: `measureThemeContrast()`. Usable — the extension must not compute its own.
- Preset/brand catalog: `getPresetCatalog()`. Usable, no hand-maintained list needed.

---

## 7. Proposed MVP file tree

Deliberately smaller than the plan's §5 sketch. No empty abstractions, no speculative DI.

```text
packages/vscode/
  package.json               # extension manifest + npm manifest in one file
  tsconfig.json
  esbuild.config.mjs
  .vscodeignore
  .vscode/launch.json        # Extension Development Host
  README.md
  CHANGELOG.md
  LICENSE
  media/
    icon.png                 # 128×128, from apps/docs/app/icon.svg
    themvora-file.png        # 32×32 file icon
  themes/
    themvora-icon-theme.json # iconThemes contribution
  src/
    extension.ts             # activation/composition root only
    domain/
      contracts.ts           # ProjectStatus, Capability, OperationResult
      projectStatus.ts       # pure: package.json evidence -> status
      commandArgs.ts         # pure: intent -> argv[] (unit-testable)
      resultParsing.ts       # pure: stdout JSON + exit code -> OperationResult
    services/
      projectDiscovery.ts    # read-only, vscode.workspace.fs
      cliRunner.ts           # spawn boundary; the only child_process site
      cliLocator.ts          # bundled -> workspace -> global resolution
      coreEngine.ts          # thin wrapper over @themvora/core (no logic)
      operationCoordinator.ts# per-root serialisation
    adapters/
      outputChannel.ts
      treeProvider.ts
      statusBar.ts
      quickPicks.ts
      previewPanel.ts        # Theme Preview (webview, CSP + nonce)
    commands/
      register.ts
      project.ts             # init, doctor, refresh
      theme.ts               # generate, browse, add, export, migrate-file
    test/
      unit/                  # vitest, no vscode import
      fixtures/
```

`vscode` imports stay in `adapters/`, `commands/` and `extension.ts`. `domain/` and `services/cliRunner.ts` are testable without starting VS Code — which is the only way the suite will run in CI.

---

## 8. Milestones, restated against what actually exists

| # | Scope | Gate | Change from the plan |
| --- | --- | --- | --- |
| 0 | Audit | ✅ this document | — |
| 1 | Package skeleton, ESM build, manifest, one command, VSIX | loads in EDH; `vsce package` produces a `.vsix`; `pnpm release:audit` still passes | must resolve G6 |
| 2 | Read-only discovery, tree view, status bar, multi-root | zero writes and zero CLI calls on activation | `doctor` not used as health signal (G2) |
| 3 | CLI client: locator, runner, JSON parsing, progress, cancel, per-root queue | representative real operations work; paths with spaces; pipe **and** fd modes | fd fallback built in |
| 4 | Commands: init, generate, list/browse, add, validate, inspect, export, diff, migrate-file | every registered command works end-to-end or is not registered | migrate is file-scoped (G3) |
| 5 | Theme Preview from catalog + generated themes | every token from the real theme; light/dark; unsaved vs saved labelled | project registry deferred (G1) |
| 6 | Diagnostics from `validate --json` + file icons | no fabricated ranges; icon theme packaged | icons folded in here |
| 7 | External consumer, Windows, VSIX hardening | `.vsix` works outside the monorepo | — |
| 8 | Docs, README, implementation report | build + tests + packaging verified; nothing published | — |

The "Additional Phase" (brand icon, `themes.ts` / `theme.config.ts` file icons) is folded into Milestone 6 so the manifest is edited once, not twice.

**Canonical artwork located:** `apps/docs/app/icon.svg` — 42×42 viewBox, rounded rect (`rx=10`) stroked in `#4f46e5`, three circles at opacity 1 / 0.65 / 0.35. The same mark is inlined in `apps/docs/components/ui/logo.tsx` (themed via `--theme-color-primary`). Exports will be derived from this, not redrawn.

---

## 9. Privacy and safety posture (unchanged from the plan, now confirmed feasible)

- No network calls anywhere in the design. Core is pure; the CLI is local; nothing leaves the machine.
- No telemetry.
- `.env*` is never read. Discovery touches `package.json` and two known registry paths.
- No writes on activation. Every mutation is `--plan` first where the CLI supports it (`init`, `add`), and the plan JSON is rendered before apply.
- Arguments are always an array, never a shell string. No `npx`, no implicit install.

---

## 10. Decisions I need from you

**D1 — Package module format (blocks Milestone 1).**
`pnpm release:audit` requires `"type": "module"` on every workspace package.

- **A (recommended):** ESM extension — `"type": "module"`, esbuild `format: "esm"`, `engines.vscode: "^1.94.0"` (first release with ESM extension support). No repo change, no audit exception.
- **B:** CJS extension + a documented exemption in `audit-packages.mjs`. Wider VS Code compatibility, one repo gate modified.

**D2 — CLI delivery (blocks Milestone 3).**
- **A (recommended):** bundle `@themvora/cli`'s `dist/cli.cjs` into the extension, spawn via `ELECTRON_RUN_AS_NODE`. Truly standalone: no global install, no PATH dependency.
- **B:** require a project-local or global `themvora` and resolve it. Smaller `.vsix`, but the interface is dead without a CLI.

**D3 — Project's own themes in the preview (blocks Milestone 5's scope).**
- **A (recommended):** MVP previews catalog + generated themes only; project registry deferred behind a proposed core API (G1).
- **B:** block Milestone 5 until `loadThemeModule()` exists in core, and ship preview later.
- **C:** evaluate `themes.ts` in the extension with esbuild — rejected by default; it is a second loader and duplicates build-tool behaviour.

**D4 — `init` UX given the blocking spawn.**
- **A (recommended):** default to `--no-install`, show the plan, then offer install as a separate, cancellable step.
- **B:** run `init` with install in one pass; the child process blocks only itself, so the host stays responsive — but the user waits with no progress granularity.

Confirm D1–D4 (or override) and I will begin Milestone 1 immediately.
