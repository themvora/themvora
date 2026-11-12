## @themvora/cli
Themvora CLI — programmatic entry points.

Exposes the same commands as the `themvora` binary (`generate`, `list`,
`validate`, `inspect`, `diff`, `explain`, `audit`, `doctor`, `init`,
`migrate`, `export`), the `run` dispatcher, and `parseArgs`, `UsageError`,
`CommandExit` and `ExitCodes` for embedding or scripting.

Everything else in this package — the command contract, the canonical
registry accessors, the framework registry, the `init` engine and the output
helpers — is internal. They are the implementation of the CLI, not an API for
consumers, and exporting them would freeze an internal shape into the
published surface.

> Generated from `packages/cli/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `cmdAdd(args): Promise<void>`
Run `themvora add`.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `args` | `ParsedArgs` | The parsed arguments. |

**Returns** `Promise<void>`

---


### `cmdAudit(args): Promise<void>`
Implements the `audit` command.

Audits a theme, or every shipped preset and brand, with the **canonical**
scorecard — `scoreTheme()`. That is the same quality model the repository's
`audit-presets.mjs` gate and the preset documentation use, so the CLI and the
release gate cannot disagree about whether a preset is healthy.

`audit` is deliberately stricter than `validate`: it gates on the full
scorecard rather than on the frozen structural contract alone.

Reads `presets` or `<file>`, plus `--json`, `--quiet` and `--strict`.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `args` | `ParsedArgs` | The parsed command-line arguments. |

**Returns** `Promise<void>`

---


### `cmdCompletion(args): Promise<void>`
Run `themvora completion`.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `args` | `ParsedArgs` | The parsed arguments. |

**Returns** `Promise<void>`

The script goes to **stdout** with nothing else, so the documented install is a
redirect:

```bash
themvora completion bash > /etc/bash_completion.d/themvora
```

A status line would break that, so there is none.

---


### `cmdDiff(args): Promise<void>`
Implements the `diff` command.

Compares two theme sources and reports the semantic differences. Every
comparison decision comes from `@themvora/core`; this command resolves
sources, renders the report, and maps failures to exit codes.

Sources are the two positionals, or `--preset` / `--brand` / `--seed` for a
side that has none. Explicit flags are assigned to the sides without a
positional, in order, so `diff mint --brand apple` compares preset `mint`
against brand `apple`.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `args` | `ParsedArgs` | The parsed command-line arguments. |

**Returns** `Promise<void>`

---


### `cmdDoctor(args): Promise<void>`
Implements the `doctor` command.

Reports the health of a Themvora project: its framework, package manager,
installed Themvora packages, theme configuration, and theme files. Only checks
the CLI can make reliably are performed, and every finding that has a concrete
correction carries it.

Warnings and errors are distinct: a project with warnings is still healthy
(exit `0`); an actionable failure is exit `3`.

Reads an optional `<dir>` (default: the current directory), plus `--json` and
`--quiet`.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `args` | `ParsedArgs` | The parsed command-line arguments. |

**Returns** `Promise<void>`

---


### `cmdExplain(args): Promise<void>`
Implements the `explain` command.

Explains how a theme came to be: its source, its recipe, the identity or brand
anchors behind it, the contrast contract it was solved against, the semantic
mapping of every role, and a validation summary.

Every value comes from an existing public API — the canonical catalog, the
generation metadata on the theme, the canonical scorecard. This command
derives nothing, and `@themvora/core` gained no API for it.

Reads `<file>` or `--preset`/`--brand`/`--seed`, plus `--json` and `--quiet`.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `args` | `ParsedArgs` | The parsed command-line arguments. |

**Returns** `Promise<void>`

---


### `cmdExport(args): Promise<void>`
Implements the `export` command: exports a theme file as CSS variables or
JSON.

Reads `--file`/`-f` (or the first positional), `--format`/`-F` (`css` or
`json`), and `--output`/`-o`. Prints the exported CSS or JSON to stdout, or
writes it to the output file when provided.

**See also:** `parseArgs`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `args` | `ParsedArgs` | The parsed command-line arguments. |

**Returns** `Promise<void>`

The CSS document is formatted by core's `themeToCssDocument()`, not here. The
extension's Copy CSS Variables command calls the same function, so the CSS a
user copies in the editor is byte-identical to the CSS this command writes.
What stays in the CLI is the file handling: `--output` and the status line.

---


### `cmdGenerate(args): Promise<void>`
Implements the `generate` command.

Generates a theme (or a light/dark pair) from one of three mutually exclusive
sources — a seed color, a canonical preset, or a brand-inspired recipe — and
prints it as JSON or writes it to a file.

Reads `--seed`/`-s`, `--preset`, `--brand`, `--family`/`-f`, `--mode`/`-m`,
`--style`, `--contrast`, `--code`/`--with-code`, `--output`/`-o` and
`--dry-run`. A bare positional argument is treated as a seed color, which is
the original spelling.

**See also:** `parseArgs`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `args` | `ParsedArgs` | The parsed command-line arguments. |

**Returns** `Promise<void>`

---


### `cmdInit(args, deps): Promise<void>`
Run `themvora init`.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `args` | `ParsedArgs` | The parsed arguments. |
| `deps` | `InitDependencies` | Test seams. Production passes none. |

**Returns** `Promise<void>`

---


### `cmdInspect(args): Promise<void>`
Implements the `inspect` command.

Prints a human-readable summary of a theme's provenance, semantic token
groups, resolved colors and accessibility. A theme that carries no generation
provenance is identified as such, and `migrate` is suggested when a registered
migration step actually applies to it.

Reads `--file`/`-f` (or the first positional) plus the `--tokens`, `--colors`,
`--generation` and `--accessibility` selectors. With no selector every section
is shown. `--json` emits the same data as a machine-readable document.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `args` | `ParsedArgs` | The parsed command-line arguments. |

**Returns** `Promise<void>`

---


### `cmdList(args): Promise<void>`
Implements the `list` command.

Prints the canonical registries — brand recipes, preset recipes, generation
styles, and the frameworks `init` supports. Every value comes from the
registry itself, so this command cannot advertise an identifier the generator
would reject.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `args` | `ParsedArgs` | The parsed command-line arguments. |

**Returns** `Promise<void>`

---


### `cmdMigrate(args): Promise<void>`
Run `themvora migrate`.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `args` | `ParsedArgs` | The parsed arguments. |

**Returns** `Promise<void>`

---


### `cmdValidate(args): Promise<void>`
Implements the `validate` command.

Validates a theme file and reports the outcome. The exit code is decided by
the frozen `validateTheme()` contract — a missing or malformed required token
fails — while the semantic, contrast and accessibility layers are reported as
diagnostics. Making those layers gate the exit code would turn previously
passing themes into failures, so it is deliberately left to `themvora audit`.

Reads `--file`/`-f` (or the first positional), `--json` and `--quiet`.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `args` | `ParsedArgs` | The parsed command-line arguments. |

**Returns** `Promise<void>`

---


### `parseArgs(argv): ParsedArgs`
Parses an array of command-line arguments into a ParsedArgs object.

Supports `--flag value`, `--flag` (boolean), `-f value`, and `-f` (boolean)
forms. Repeated flags accumulate into an array. Positional arguments are
collected under `_`.

**See also:** `UsageError`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `argv` | `string[]` | The raw argument array (for example `process.argv.slice(2)`). |

**Returns** `ParsedArgs` — The parsed arguments.

---


### `run(argv): Promise<number>`
Run one CLI invocation.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `argv` | `string[]` | The raw arguments, i.e. `process.argv.slice(2)`. |

**Returns** `Promise<number>` — The process exit code. Never throws.

---

## Classes

### `class CommandExit`

**Extends** `Error`
Thrown by a command to end the run with a specific exit code after it has
already reported the reason.

Commands do not call `process.exit` themselves: returning through the
dispatcher is what makes every command runnable in-process, which is how the
test suite asserts exit codes without spawning a child process.

**See also:** `ExitCodes`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `CommandExit` | — |
| `cause` (optional) | `unknown` | — |
| readonly `code` | `number` | The process exit code to end the run with. |
| `message` | `string` | — |
| `name` | `string` | — |
| `stack` (optional) | `string` | — |
| `stackTraceLimit` | `number` | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. |
| `captureStackTrace` | `void` | — |
| `prepareStackTrace` | `any` | — |

---


### `class UsageError`

**Extends** `Error`
Thrown by commands when the user passes invalid arguments. Reported by the
CLI runtime with exit code `Usage` (2) and a usage hint.

**See also:** `parseArgs`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `UsageError` | — |
| `cause` (optional) | `unknown` | — |
| `message` | `string` | — |
| `name` | `string` | — |
| `stack` (optional) | `string` | — |
| `stackTraceLimit` | `number` | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. |
| `captureStackTrace` | `void` | — |
| `prepareStackTrace` | `any` | — |

---

## Interfaces

### `ParsedArgs`
The result of parsing command-line arguments.

Positional arguments are collected in `_`; flags and their values are stored
under their key (with or without leading dashes).

| Member | Type | Description |
| ------ | ---- | ----------- |
| `_` | `string[]` | Positional (non-flag) arguments in order. |
| `__flags` | `ParsedFlag[]` | Every flag, in the order it appeared. |

---


### `ParsedFlag`
A flag exactly as it was written on the command line.

Recorded because a command may need the *order* the user typed flags in, and
an object keyed by flag name cannot express it — `--brand a --preset b` and
`--preset b --brand a` produce identical `ParsedArgs` keys but are different
requests.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `key` | `string` | The flag name, without leading dashes. |
| `value` | `string \| true` | The flag's value, or `true` for a boolean flag. |

---

## Variables

### `ExitCodes`
Stable process exit codes for the `themvora` CLI.

These are guaranteed by the command implementations and documented in the
CLI README and docs. Consumers (CI pipelines, editor integrations) can rely
on them without parsing stdout.

`Readonly<{ Cancelled: 130; Error: 1; OK: 0; Usage: 2; ValidationFailed: 3 }>`

---


### `VERSION`
The @themvora/cli package version, surfaced by `themvora --version`.

Must stay in sync with the `"version"` field in `packages/cli/package.json`;
`scripts/release/audit-packages.mjs` fails the release gate if they drift.

`"2.0.0"`

---

## Related docs

- [CLI](/cli) — The `themvora` command line: list, generate, validate, inspect, diff, explain, audit, doctor, init, add, migrate, export and completion — themes and token maps, plus project integration, in CI.
