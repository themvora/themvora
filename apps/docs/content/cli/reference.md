# CLI reference

## Prerequisites
- Node.js 18+
- @themvora/cli installed or available via npx

A compact reference for `themvora`. The command set has two halves: the **theme**
commands (`generate`, `validate`, `inspect`, `diff`, `explain`, `audit`,
`migrate`, `export`) are file-oriented — they read a theme, print, and exit — and
the **project** commands (`init`, `add`, `doctor`) read a project directory.
`list` and `completion` read the canonical registries. No daemon, and no command
prompts.

## Global options

```text
themvora <command> [options]

Options:
  -h, --help     Show help.
  -v, --version  Show the installed version.
```

Run `themvora <command> --help` for a command's own options — the output is
rendered from the same contract as the tables below.

<!-- cli-reference:generated:start -->
> Generated from `packages/cli/src/command-schema.json` and `packages/cli/src/exit-codes.ts` by `apps/docs/scripts/generate-cli-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs cli:generate`.

## Commands

| Command | Aliases | Usage | Options |
| ------- | ------- | ----- | ------- |
| `generate` | `gen` | `themvora generate [options]` | `--seed`, `--preset`, `--brand`, `--family`, `--mode`, `--style`, `--contrast`, `--code`, `--output`, `--dry-run` |
| `list` | `ls` | `themvora list [brands\|presets\|styles\|frameworks]` | `--ids`, `--json` |
| `validate` | `check` | `themvora validate <file> [options]` | `--file`, `--json`, `--quiet` |
| `inspect` | `info` | `themvora inspect <file> [options]` | `--file`, `--tokens`, `--colors`, `--generation`, `--accessibility`, `--json` |
| `diff` | `compare` | `themvora diff <a> <b> [options]` | `--preset`, `--brand`, `--seed`, `--mode`, `--all`, `--json`, `--quiet` |
| `explain` | `why` | `themvora explain <file> [options]` | `--preset`, `--brand`, `--seed`, `--json`, `--quiet` |
| `audit` | — | `themvora audit <file\|presets> [options]` | `--strict`, `--json`, `--quiet` |
| `doctor` | — | `themvora doctor [dir] [options]` | `--json`, `--quiet` |
| `init` | — | `themvora init [dir] [options]` | `--framework`, `--preset`, `--brand`, `--seed`, `--styling`, `--tool`, `--example`, `--plan`, `--dry-run`, `--no-install`, `--force`, `--json`, `--quiet` |
| `add` | — | `themvora add <preset\|brand\|seed> <value> [options]` | `--dir`, `--family`, `--style`, `--plan`, `--dry-run`, `--force`, `--json`, `--quiet` |
| `migrate` | — | `themvora migrate <file> [options]` | `--file`, `--output`, `--write`, `--dry-run`, `--json` |
| `export` | — | `themvora export <file> [options]` | `--file`, `--format`, `--output` |
| `completion` | — | `themvora completion <shell>` | `--shell` |

The theme-reading commands (`validate`, `inspect`, `migrate`, `export`) accept the theme as a positional path instead of `--file`, and accept either a single theme or a `{ light, dark }` pair.

### Options per command

Each block below is generated from the command contract — the same definitions that drive `themvora <command> --help` and shell completion.

#### `themvora generate`

Generate a theme from a seed, preset, or brand

```text
Usage:
  themvora generate [options]
```

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `-s, --seed <color>` | Source hex color (#rrggbb). | `#6366f1` |
| `--preset <id>` | Generate from a canonical preset. Run `themvora list presets` for the available values. | — |
| `--brand <id>` | Generate from a brand-inspired recipe. Run `themvora list brands` for the available values. | — |
| `-f, --family <name>` | Family name for the theme name. | `default` |
| `-m, --mode <mode>` | Which mode(s) to emit. One of: `light`, `dark`, `both`. | `both` |
| `--style <name>` | Visual language. Seed generation only. Run `themvora list styles` for the available values. | — |
| `--contrast <level>` | Contrast contract to solve for. One of: `AA`. | `AA` |
| `--code` | Also generate a tokens.code syntax palette. Seed generation only. | — |
| `-o, --output <file>` | Write JSON to a file instead of stdout. | — |
| `--dry-run` | Print what would be written without writing it. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | success |
| `2` | usage/argument error |
| `1` | command/runtime error |

### Examples

```bash
themvora generate --seed "#6366f1"
themvora generate --preset mint
themvora generate --brand apple --output theme.json
themvora generate --seed "#6366f1" --style editorial --mode light
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.

#### `themvora list`

List brands, presets, styles, and frameworks

```text
Usage:
  themvora list [brands|presets|styles|frameworks]
```

| Argument | Description |
| -------- | ----------- |
| `<selector>` | One of: brands, presets, styles, frameworks. Omit to list every registry. (optional) |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `--ids` | Print only the identifiers, one per line. Needs a registry selector. | — |
| `--json` | Emit structured registry data instead of a human-readable list. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | success |
| `2` | unknown selector |
| `1` | command/runtime error |

### Examples

```bash
themvora list
themvora list presets
themvora list brands --json
themvora list presets --ids
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.

#### `themvora validate`

Validate a theme

```text
Usage:
  themvora validate <file> [options]
```

| Argument | Description |
| -------- | ----------- |
| `<file>` | Theme file to validate. |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `-f, --file <path>` | Theme file to validate (or pass it positionally). | — |
| `--json` | Emit a machine-readable report on stdout. | — |
| `--quiet` | Suppress the success summary. Errors are still printed. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | theme is valid |
| `3` | validation failed (issues are listed) |
| `1` | command/runtime error |
| `2` | usage/argument error |

### Examples

```bash
themvora validate theme.json
themvora validate theme.json --json
themvora check theme.json
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.

#### `themvora inspect`

Inspect a theme

```text
Usage:
  themvora inspect <file> [options]
```

| Argument | Description |
| -------- | ----------- |
| `<file>` | Theme file to inspect. |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `-f, --file <path>` | Theme file to inspect (or pass it positionally). | — |
| `--tokens` | Show semantic token groups only. | — |
| `--colors` | Show resolved color tokens only. | — |
| `--generation` | Show generation provenance only. | — |
| `--accessibility` | Show contrast and relationship diagnostics only. | — |
| `--json` | Emit the summary as JSON on stdout. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | success |
| `1` | command/runtime error |
| `2` | usage/argument error |

### Examples

```bash
themvora inspect theme.json
themvora inspect theme.json --generation
themvora inspect theme.json --accessibility --json
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.

#### `themvora diff`

Diff two themes semantically

```text
Usage:
  themvora diff <a> <b> [options]
```

| Argument | Description |
| -------- | ----------- |
| `<a>` | First source: a theme file, a preset id, or a brand id. Resolved as file, then preset, then brand. Omit to use a flag instead. (optional) |
| `<b>` | Second source, resolved the same way. Omit to use a flag instead. (optional) |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `--preset <id>` | Use a canonical preset as a source, filling the first side without a positional. Run `themvora list presets` for the available values. | — |
| `--brand <id>` | Use a brand recipe as a source. Repeat for the other side. Run `themvora list brands` for the available values. | — |
| `--seed <color>` | Use a theme generated from this seed as a source. Repeat for the other side. | — |
| `--mode <mode>` | Compare only this visual mode. One of: `light`, `dark`. | — |
| `--all` | Include unchanged tokens in the report. | — |
| `--json` | Emit the diff report as JSON on stdout. | — |
| `--quiet` | Print per-mode counts without the per-token rows. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | compared (whether or not differences exist) |
| `1` | command/runtime error |
| `2` | usage/argument error |

### Examples

```bash
themvora diff mint iris
themvora diff theme.json --preset mint
themvora diff --brand apple --preset mint --mode light
themvora diff mint iris --json
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.

#### `themvora explain`

Explain how a theme was produced

```text
Usage:
  themvora explain <file> [options]
```

| Argument | Description |
| -------- | ----------- |
| `<file>` | Theme file to explain. A preset id or brand id is also accepted. (optional) |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `--preset <id>` | Explain a canonical preset. Run `themvora list presets` for the available values. | — |
| `--brand <id>` | Explain a brand recipe, including its pinned anchors. Run `themvora list brands` for the available values. | — |
| `--seed <color>` | Explain a theme generated from this seed. | — |
| `--json` | Emit the explanation as JSON on stdout. | — |
| `--quiet` | Omit the semantic mapping, keeping the recipe and validation. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | success |
| `1` | command/runtime error |
| `2` | usage/argument error |

### Examples

```bash
themvora explain --preset mint
themvora explain --brand apple
themvora explain --seed "#6366f1"
themvora explain theme.json
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.

#### `themvora audit`

Audit a theme or the shipped presets

```text
Usage:
  themvora audit <file|presets> [options]
```

| Argument | Description |
| -------- | ----------- |
| `<scope>` | A theme file to audit, or `presets` to audit every shipped preset and brand. |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `--strict` | Treat warnings as failures, as the repository's preset gate does. | — |
| `--json` | Emit the audit report as JSON on stdout. | — |
| `--quiet` | Print only themes that fail or warn, plus the summary. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | audit passed |
| `3` | audit failed (checks are listed) |
| `1` | command/runtime error |
| `2` | usage/argument error |

### Examples

```bash
themvora audit presets
themvora audit theme.json
themvora audit presets --strict --json
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.

#### `themvora doctor`

Check a Themvora project's health

```text
Usage:
  themvora doctor [dir] [options]
```

| Argument | Description |
| -------- | ----------- |
| `<dir>` | Project directory to check. Defaults to the current directory. (optional) |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `--json` | Emit the health report as JSON on stdout. | — |
| `--quiet` | Show only warnings and errors. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | healthy (warnings alone do not fail) |
| `3` | an actionable health failure |
| `1` | command/runtime error |
| `2` | usage/argument error |

### Examples

```bash
themvora doctor
themvora doctor ./my-app
themvora doctor --json
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.

#### `themvora init`

Integrate Themvora into a project, or create one

```text
Usage:
  themvora init [dir] [options]
```

| Argument | Description |
| -------- | ----------- |
| `<dir>` | Project directory. Created when it does not exist. Defaults to the current directory. (optional) |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `--framework <id>` | Target framework. Required for a new project; overrides detection in an existing one. Run `themvora list frameworks` for the available values. | — |
| `--preset <id>` | Generate the theme from a canonical preset. Run `themvora list presets` for the available values. | — |
| `--brand <id>` | Generate the theme from a brand-inspired recipe. Run `themvora list brands` for the available values. | — |
| `--seed <color>` | Generate the theme from a seed colour. | — |
| `--styling <engine>` | Styling engine for the generated app: `css` (plain semantic stylesheet, no extra dependency) or `tailwind` (Tailwind v4 via @themvora/tailwind). Plain CSS is the default in both modes: the wizard asks this as "Would you like to use Tailwind CSS with Themvora?" and preselects `css`, and a run without a terminal resolves to the same value. Supplying the flag skips the question. In an existing project it only rewrites the stylesheets `init` generated — one you wrote yourself needs --force. | `css` |
| `--tool <name>` | Package manager to drive the framework generator and install dependencies: `npm`, `pnpm`, `yarn` or `bun`. When omitted, detection decides: the corepack `packageManager` field, then the lockfile, then npm. The interactive wizard preselects the manager you invoked the CLI with. `--package-manager` is accepted as a compatibility alias. One of: `npm`, `pnpm`, `yarn`, `bun`. | — |
| `--example` | Accepted and ignored. The showcase is always generated; kept so older scripts do not break. | — |
| `--plan` | Print what would happen and exit. Never writes or installs. | — |
| `--dry-run` | Print the file operations and exit. Never writes, installs or scaffolds. | — |
| `--no-install` | Skip dependency installation. Build/typecheck verification is then skipped and reported as skipped, not failed, because it needs those dependencies. | — |
| `--force` | Replace files that exist and were not generated by themvora init. | — |
| `--json` | Emit the plan or the report as JSON on stdout. | — |
| `--quiet` | Suppress progress output. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | the project was created or integrated and verified |
| `3` | the project was written but a verification step failed |
| `1` | command/runtime error, or existing files block the run |
| `2` | usage/argument error |
| `130` | the interactive wizard was cancelled (Ctrl+C); nothing was written |

### Examples

```bash
themvora init
themvora init my-app --tool pnpm --framework react
themvora init my-app --tool pnpm --framework react --styling tailwind
themvora init my-app --tool npm --framework next --styling css
themvora init my-app --tool npm --framework next
themvora init my-app --package-manager pnpm --framework react
themvora init my-app --framework next --preset mint
themvora init my-app --framework react --plan
themvora init my-app --framework react --no-install
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.

#### `themvora add`

Add a theme source to an existing project

```text
Usage:
  themvora add <preset|brand|seed> <value> [options]
```

| Argument | Description |
| -------- | ----------- |
| `<kind>` | The source kind to add. |
| `<value>` | The preset id, brand id, or seed colour. |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `--dir <path>` | Project directory. Defaults to the current directory. | — |
| `--family <name>` | Theme family name, for a seed source. | — |
| `--style <name>` | Generation style, for a seed source. Run `themvora list styles` for the available values. | — |
| `--plan` | Print what would happen and exit. Never writes. | — |
| `--dry-run` | Print the plan and exit. Never writes. | — |
| `--force` | Replace the registry even when it was not generated by Themvora. | — |
| `--json` | Emit the plan or the report as JSON on stdout. | — |
| `--quiet` | Suppress progress output. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | the registry was updated, or already had the source |
| `1` | command/runtime error, or a registry that cannot be extended |
| `2` | usage/argument error, or no Themvora registry |

### Examples

```bash
themvora add preset mint
themvora add brand apple
themvora add seed "#6366f1" --family indigo
themvora add preset iris --dir ./my-app
themvora add preset iris --plan
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.

#### `themvora migrate`

Migrate a theme to the latest format

```text
Usage:
  themvora migrate <file> [options]
```

| Argument | Description |
| -------- | ----------- |
| `<file>` | Legacy theme file to migrate. |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `-f, --file <path>` | Legacy theme file to migrate (or pass it positionally). | — |
| `-o, --output <file>` | Write the migrated theme to a file. | — |
| `--write` | Migrate the file in place. This flag is the confirmation; without it the input is never overwritten. | — |
| `--dry-run` | Report what would change and write nothing. | — |
| `--json` | Emit the migration report as JSON on stdout. Add --write or --output to persist the result. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | success |
| `1` | command/runtime error |
| `2` | usage/argument error |

### Examples

```bash
themvora migrate legacy.json
themvora migrate legacy.json --dry-run
themvora migrate legacy.json --write
themvora migrate legacy.json --output theme.json
themvora migrate legacy.json --dry-run --json
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.

#### `themvora export`

Export a theme to CSS or JSON

```text
Usage:
  themvora export <file> [options]
```

| Argument | Description |
| -------- | ----------- |
| `<file>` | Theme file to export. |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `-f, --file <path>` | Theme file to export (or pass it positionally). | — |
| `-F, --format <fmt>` | Output format. One of: `css`, `json`. | `css` |
| `-o, --output <file>` | Write the export to a file instead of stdout. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | success |
| `1` | command/runtime error |
| `2` | usage/argument error |

### Examples

```bash
themvora export theme.json --format css
themvora export theme.json --format json --output tokens.json
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.

#### `themvora completion`

Emit a shell completion script

```text
Usage:
  themvora completion <shell>
```

| Argument | Description |
| -------- | ----------- |
| `<shell>` | One of: bash, zsh, fish, powershell. |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `--shell <name>` | The shell to generate for (or pass it positionally). One of: `bash`, `zsh`, `fish`, `powershell`. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | success |
| `2` | usage/argument error |
| `1` | command/runtime error |

### Examples

```bash
themvora completion bash
themvora completion zsh
themvora completion fish
themvora completion powershell
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.

## Exit codes

| Code | Constant | Meaning |
| ---- | -------- | ------- |
| `0` | `ExitCodes.OK` | Command completed successfully. |
| `1` | `ExitCodes.Error` | A runtime or command error occurred. |
| `2` | `ExitCodes.Usage` | Invalid arguments / usage error. |
| `3` | `ExitCodes.ValidationFailed` | A theme failed validation (the `validate` command). |
| `130` | `ExitCodes.Cancelled` | The user cancelled an interactive prompt (Ctrl+C). `128 + SIGINT`, the conventional shell value, so a wrapper script can tell "the user changed their mind" from "the command failed". Nothing is written before the prompt is answered, so a cancellation leaves no partial project. |

CI and editors can switch on these without parsing stdout. The per-command exit codes listed above are the subset each command can actually return.
<!-- cli-reference:generated:end -->

## Output formats

- **`export --format css`** — `--theme-*` custom properties. A pair emits
  `:root` for light and `.dark, [data-theme="dark"]` for dark.
- **`export --format json`** — the flat `--theme-*` variable map as JSON.
- **`generate`** — pretty-printed theme JSON (a pair by default).

## Environment & non-interactive mode

Every command except `init` is non-interactive by construction. `init` has a
guided wizard, and it runs only when a terminal is attached and the invocation
is not `--json`, `--quiet`, `--plan` or `--dry-run`; in every other context it
reports a missing value as a usage error that names the flag supplying it.

Otherwise the CLI always respects `--output` for file writes, never overwrites
without being told to, and prints plain text when colour or animation is
unavailable. Colour follows `NO_COLOR` and `FORCE_COLOR`; animation and prompts
are disabled in CI, on `TERM=dumb`, and whenever stdout or stdin is not a TTY.

## Troubleshooting

### `themvora: command not found`

The global npm/pnpm `bin` directory isn't on your PATH, or the package is not
installed globally.

```bash
# npm: confirm the install (`-g` is npm's global flag)
npm list -g @themvora/cli
npm prefix -g

# or just use npx (no global install)
npx --yes @themvora/cli --help
```

Alternatively, install it per project (see [Installation](/cli/installation)).

### Cannot find theme file

```text
Error: cannot read file path
```

Pass a readable path, or as a positional value after the command:
`themvora inspect themes/mint.json`.

### Invalid theme

When `validate` reports missing tokens, add the required semantic token set
(e.g. `colors.background`) and re-run. A theme tree whose structure is wrong
(token groups under `tokens`) is reported the same way.

### Unknown command

```text
Unknown command: <name>
```

Run `themvora --help` for the list, or `themvora <command> --help`.

### Node version

The CLI declares **Node.js 18+** in its published `engines.node` field. The repository build tooling requires Node.js 22.23.4, but the published CLI runs on Node.js 18 and newer.

## Next Steps

- [Run the CLI in CI](/cli/ci) — exit codes as a gate.
- [View individual command options](/cli/generate) — every command has its own page.
- [Explore workflow patterns](/cli/workflows) — authoring loop, project setup.
- [Registries](/cli/presets) — presets, brands and styles, from the CLI.

## Related

- [CLI API reference](/api-reference/cli)
- [Theme files & ThemeDefinition](/core-concepts)