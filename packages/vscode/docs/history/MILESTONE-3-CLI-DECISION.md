# Milestone 3 — CLI integration decision

> **Status:** decided. Core-backed client implemented; CLI transport deferred.
> **Evidence date:** 2026-10-20, against `@themvora/core` 1.4.0 and `@themvora/cli` 1.3.0.

## The question

Milestone 3 asks for a canonical client over Themvora's core/CLI APIs. The
milestone brief allows two outcomes: implement the integration, or — if the
public API cannot safely support it within the stated constraints — stop and
propose the missing API. This is the second.

## Evidence

### 1. The CLI cannot be imported under the bundle gate

`test/bundle.test.ts` asserts:

```ts
expect(externalImports(readFileSync(BUNDLE, "utf8"))).toEqual(["vscode"]);
expect(source).not.toContain("child_process");
```

That is a structural gate on the extension's runtime boundary, and the brief
forbids relaxing it. The CLI's import graph cannot satisfy it:

| Entry point | Pulls in | Source |
| --- | --- | --- |
| `run()` (public) | `cmdInit` → `init/runner.ts` | `commands/init.ts:22` |
| `init/runner.ts` | `node:child_process` | `init/runner.ts:10` |
| `cmdGenerate` | `node:fs/promises`, `node:fs` | `commands/generate.ts:8-9` |
| `cmdValidate` | `node:fs` (via `theme-shared.ts`) | `theme-shared.ts:2` |
| `cmdDoctor` | `node:fs`, `node:path` | `commands/doctor.ts:7-8` |
| `cmdExport`, `cmdMigrate` | `node:fs` | `commands/export.ts:2`, `commands/migrate.ts:18` |

Importing `run()` brings `child_process` into the bundle. Importing even one
command brings `node:fs`. Either fails the gate, and bundling the whole CLI also
means `init` would run `spawnSync` **inside the extension host**, freezing every
extension in it for the duration of a `pnpm install`.

### 2. The programmatic runner has no IO seam

`run(argv)` returns the exit code and never calls `process.exit` — genuinely
designed for embedding. But every command writes to `process.stdout` /
`process.stderr` directly (≈15 sites across `commands/*` and `output.ts`), and
there is no `cwd` parameter.

Capturing that output means monkey-patching `process.stdout.write` in the
extension host, which is process-global state shared with every other extension
and with VS Code's own logging. The brief forbids changing global process state,
and a project root cannot be honoured without either a `cwd` argument or absolute
paths everywhere.

### 3. What core does provide

`@themvora/core` has **185 exports**, **zero runtime dependencies** and **zero
`node:` imports** in `src`. Verified at runtime:

```text
generateTheme          function
validateTheme          function
validateThemeLevels    function
measureThemeContrast   function
getPresetCatalog       function
getPresetThemes        function
diffThemes             function
themeToCSSVariables    function
migrateTheme           function
isGeneratedTheme       function
GENERATION_STYLE_NAMES object
```

This is the whole of theme generation, validation, contrast measurement, the
preset/brand catalog, the semantic diff, CSS-variable export and migration. It
is the same surface the CLI itself calls; the CLI adds orchestration, file IO and
formatting on top.

## Decision

**Implement the client over `@themvora/core`, in-process. Defer every CLI-backed
operation, with the missing API specified below.**

Rejected alternatives:

| Option | Why rejected |
| --- | --- |
| Spawn `themvora` as a child process | Requires `child_process`; fails the bundle gate. Also needs a CLI on the user's machine, which the product explicitly avoids. |
| Import `@themvora/cli` and call `run()` in-process | Pulls `node:fs` and `child_process`; fails the gate. Blocks the extension host during `init`. No IO seam. |
| Bundle the CLI and strip `child_process` with an esbuild shim | Silently changes what `init` does; a shimmed runner that cannot spawn is a broken command, not an integration. |
| Dynamically `import()` the CLI from the project's `node_modules` | A hidden dependency on the project having the CLI installed; still executes `node:fs`. |

## What the client covers, and what it does not

Covered now, delegating to the public core API:

| Operation | Core call |
| --- | --- |
| `generate` | `generateTheme` |
| `validate` | `validateTheme` + `validateThemeLevels` + `measureThemeContrast` |
| `catalog` | `getPresetCatalog` + `GENERATION_STYLE_NAMES` |
| `diff` | `diffThemes` |
| `exportVariables` | `themeToCSSVariables` |
| `migrate` | `migrateTheme` |

Deferred, because they exist only as CLI commands:

| Operation | CLI command | Blocker |
| --- | --- | --- |
| `init` | `themvora init` | `node:fs` + `child_process`; mutates a project |
| `add` | `themvora add` | `node:fs`; mutates a project |
| `doctor` | `themvora doctor` | `node:fs`, `node:path` |
| `listFrameworks` | `themvora list frameworks` | CLI-only data, `node:fs` via the shared module graph |
| `exportCss` | `themvora export --format css` | CSS document formatting is the CLI's; core exposes only the variables |

## Proposed public API

The smallest change that would let the client adopt the CLI without changing the
extension's runtime boundary. Two parts, both additive.

### 1. `@themvora/cli` — an IO and cwd seam on the runner

```ts
export interface RunContext {
  /** Resolve relative paths against this instead of process.cwd(). */
  cwd?: string;
  /** Receive the payload stream. Defaults to process.stdout.write. */
  out?: (chunk: string) => void;
  /** Receive commentary. Defaults to process.stderr.write. */
  err?: (chunk: string) => void;
}

export function run(argv: string[], context?: RunContext): Promise<number>;
```

Implementation is mechanical: introduce `writeOut`/`writeErr` in `output.ts`,
replace the ≈15 direct `process.stdout.write` / `process.stderr.write` calls, and
have `run()` install a module-scoped sink for the duration of the call, restored
in `finally`. Default behaviour is unchanged, so the existing CLI test suite
stays green.

This closes the IO and cwd gaps. It does **not** close the `child_process` gap.

### 2. `@themvora/cli` — make `init`'s process runner async

`ApplyIo.run` is typed synchronous and implemented with `spawnSync`. Even with
the IO seam, an in-process `init` blocks the extension host for the length of an
install.

```ts
export interface ApplyIo {
  run(command: CommandStep, options: { cwd: string }): Promise<CommandResult>;
}
```

That is a larger change — it touches `apply.ts`, `runner.ts` and the `init` tests
— and it is why `init`/`add` are deferred rather than merely blocked on part 1.

### 3. Alternative worth considering instead

Split the CLI into a **pure command core** (argument resolution, plan building,
rendering — no `node:fs`) and a **host adapter** that performs IO. The extension
could then import the pure half, which would satisfy the bundle gate without any
seam. This is a bigger refactor but yields the better long-term boundary: the
extension would get `init --plan` semantics — plan building, conflict detection,
file operation lists — without ever performing the writes itself.

Until one of these lands, the extension keeps its own `inspectProject` reader and
performs no CLI-backed operation. Nothing is simulated: capabilities the client
cannot provide are reported as unavailable with a reason, not stubbed.

## Consequences accepted

- No project initialisation, `add`, `doctor` or framework list in the extension
  yet. The Explorer shows registry state, not project health.
- The extension's file writes remain its own, through `workspace.fs` — which is
  the correct layer for an editor integration anyway, and is already covered by
  the per-root write coordination added in this milestone.
