# CLI Overview

**Themvora CLI** is the command-line toolkit for creating, validating,
migrating, inspecting, and exporting Themvora themes — and for wiring Themvora
into a project. It wraps the same **Themvora core** design system that every
`@themvora/*` framework package consumes, so a theme built in the terminal is
literally the same JSON shape a React, Vue, Svelte, Angular, Next, Nuxt, Astro,
Remix, Tailwind, or plain HTML app reads at runtime.

```bash
# npm — `-g` is npm's global-install flag (pnpm: `pnpm add --global`, yarn: `yarn global add`)
npm install -g @themvora/cli
themvora --help
```

## Why a CLI?

Themvora has two audiences, and they need different interfaces:

- **Applications** depend on the runtime packages — `@themvora/core`,
  `@themvora/react`, `@themvora/next`, the adapters — at build time and run.
- **Developers and build pipelines** work on the theme *files* and on the
  *project* that consumes them — create, check, compare, inspect, migrate and
  export themes; scaffold a project; add a theme to one — without opening an
  editor.

The CLI is a standalone developer tool for that second audience. It doesn't run
in your app; you run it when you author a theme or set a project up.

## The two halves

The command set has a file half and a project half, and the difference matters
for what each command is allowed to touch.

| | Commands | Reads | Writes |
| --- | -------- | ----- | ------ |
| **Themes** | `generate` `validate` `inspect` `diff` `explain` `audit` `migrate` `export` | a theme file | only where you name a destination |
| **Registries** | `list` `completion` | the canonical catalogs | nothing |
| **Projects** | `init` `add` `doctor` | a project directory | targeted edits, and only with your consent |

The theme commands are pure: a theme in, text out. The project commands are the
ones that edit files, and they are built to refuse rather than guess.

## How a theme moves through the CLI

```text
list ──→ which brands, presets, styles and frameworks exist?
  ↓
seed color · preset · brand
  ↓
generateTheme ──→ theme.json
  ↓
validateTheme ──→ schema + tokens + contrast
  ↓
inspect ──→ what is inside this theme?
  ↓
diff ──→ how does it differ from another?
  ↓
explain ──→ where did it come from?
  ↓
audit ──→ does it pass the quality scorecard?
  ↓
use in the runtime ── @themvora/core provider
  ↓
migrate ── when the theme schema changes
  ↓
export ── CSS variables / JSON for another system
```

`list` is the discovery half: it reads the same canonical registries `generate`
resolves against, so the identifiers it prints are exactly the ones the
generator accepts.

## Or let the CLI set the project up

```text
init ──→ scaffold or integrate a project
  ↓
theme.config.ts ──→ the single theme declaration
  ↓
add ──→ extend that registry with another source
  ↓
doctor ──→ is the project still healthy?
```

`init` scaffolds with the framework's **own** generator and then integrates into
the result, and it verifies the outcome by running the project's own build and
typecheck. A project it created is verified end to end — the generated app
builds, and the theme is applied on first paint.

Run it with no arguments in a terminal and it becomes a short guided wizard:

```bash
themvora init
```

It asks for the project name, the package manager, the framework, and whether to
use Tailwind CSS, then does everything else itself — scaffold, integration, one
dependency install, build and typecheck. Nothing is mandatory about the prompts:
supply the values as flags and it runs straight through, which is how it behaves
in CI either way.

```bash
themvora init my-app --tool pnpm --framework react
```

## Every command at a glance

Each command has its own page — the table links straight to it.

| Command | What it does |
| ------- | ------------ |
| [`themvora generate`](/cli/generate) | Derive a theme from a seed color, preset, or brand |
| [`themvora list`](/cli/list) | List brands, presets, styles, and init frameworks |
| [`themvora validate`](/cli/validate) | Check a theme against the schema and contrast |
| [`themvora inspect`](/cli/inspect) | Print a theme's provenance, structure, and tokens |
| [`themvora diff`](/cli/diff) | Compare two themes semantically |
| [`themvora explain`](/cli/explain) | Explain how a theme was produced |
| [`themvora audit`](/cli/audit) | Audit a theme, or the shipped presets, against the quality scorecard |
| [`themvora doctor`](/cli/doctor) | Check a Themvora project's health |
| [`themvora init`](/cli/init) | Integrate Themvora into a project, or create one |
| [`themvora add`](/cli/add) | Add a theme source to an existing project |
| [`themvora migrate`](/cli/migrate) | Migrate a legacy theme to the current format |
| [`themvora export`](/cli/export) | Export theme tokens to CSS variables or JSON |
| [`themvora completion`](/cli/completion) | Emit a shell completion script |

The identifiers those commands accept are catalogued too:
[presets](/cli/presets), [brand recipes](/cli/brands), and
[generation styles](/cli/styles).

## Package vs. command

| npm package         | terminal command   |
| ------------------- | ------------------ |
| `@themvora/cli` | `themvora`   |

The package is installed globally, and the packager links the `themvora`
executable into your shell's bin directory. You type `themvora`, not
`@themvora/cli`.

## Prerequisites

- **Node.js 18+** (any modern release). No browser package is needed.
- For the theme commands, a plain JSON theme file. A file is either a **pair**
  (`{ "light": …, "dark": … }`, generated by `--mode both`) or a **single**
  theme (`{ "name", "meta", "tokens" }`, from `--mode light|dark`).
- For `init` and `add`, a project directory.

## What the CLI does not do

It is not a build tool, a daemon, or an editor. Specifically:

- **It never scaffolds a project by hand.** `init` delegates to `create-vite` or
  `create-next-app` and integrates into the output, because a copy of someone
  else's starter template is stale the moment they change it.
- **It never publishes or versions anything.** It does not bump your
  `package.json` versions and does not run a release.
- **It never rewrites a file it does not own.** A generated artifact is
  regenerated; a file you maintain is left alone, or reported as a conflict.
- **It never writes without being asked.** `--plan` and `--dry-run` are inert,
  and the theme commands write only to a destination you name.
- **It only prompts where a person is.** `init` opens a guided wizard when it
  has questions and a terminal to ask them in. Every other command, and `init`
  itself under `--json`, `--quiet`, `--plan`, `--dry-run`, in CI, or with a
  redirected stdin, reports a missing required value as a usage error with an
  actionable message instead. Scripts and pipelines never wait for input.

## Next Steps

- [Install the CLI](/cli/installation) — global, npx, or project-local.
- [Run a 5-minute Quick Start](/cli/quickstart) — generate, validate, inspect, export.
- [Set up a project](/cli/init) — or extend one with [`add`](/cli/add).
- [Use in CI](/cli/ci) — exit codes as a gate.
- [Explore workflows](/cli/workflows) — the authoring loop, light/dark pairs.

## Related

- [Themvora Quick Start](/quick-start)
- [Built-in presets](/presets)
- [Custom Themes](/custom-themes)
- [API Reference](/api-reference)

Next: [Installation](/cli/installation), or jump straight to a
[Quick Start](/cli/quickstart) workflow.
