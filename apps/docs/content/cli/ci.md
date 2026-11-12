# CI & Automation

## Prerequisites
- Node.js 18+
- Project-local `@themvora/cli` install (or `npx @themvora/cli`)
- CI runner with access to git and node

The CLI is deterministic and non-blocking: it reads a theme or a project,
prints, exits, and waits for nothing. That makes it a natural build step.

`init` is the one command with an interactive mode, and it never reaches for it
here. With `CI` set, with a redirected stdin, or under `--json`, `--quiet`,
`--plan` or `--dry-run`, it behaves exactly like every other command: a missing
value is a usage error naming the flag that supplies it.

```bash
# Non-interactive by construction: every value a prompt would ask for is given.
themvora init my-app --tool pnpm --framework react
```

`--styling` defaults to plain CSS, which is also what the wizard preselects — so
a pipeline that names no styling produces the same project a person would get by
pressing Enter. Say which one you want and the question never comes up:

```bash
themvora init my-app --tool pnpm --framework react --styling tailwind
themvora init my-app --tool pnpm --framework react --styling css
```

## Run everywhere

`themvora` (installed) or `npx --yes @themvora/cli` behaves the same on npm,
pnpm, yarn, bun, cmd, PowerShell, bash, and zsh. Prefer a **project-local
install** in CI so the version is locked and reviewed:

```json
{
  "scripts": {
    "theme:validate": "themvora validate themes/"
  }
}
```

## Exit codes make it a gate

Every command uses the same four codes, so a pipeline can switch on them without
parsing output:

| Code | Meaning | Raised by |
| ---- | ------- | --------- |
| `0` | Success | all |
| `1` | Command/runtime error, or a blocked write | all |
| `2` | Invalid arguments, or a missing precondition | all |
| `3` | Validation, audit, verification or health failure | `validate`, `audit`, `init`, `doctor` |

The distinction that matters for a gate: `1` and `2` mean the command could not
do its job, while `3` means it did the job and the *subject* failed.

```bash
themvora validate themes/
if [ $? -ne 0 ]; then
  echo "theme invalid — rejecting"
  exit 1
fi
```

## Three levels of theme check

Pick the one that matches what you want to block on:

```bash
themvora validate theme.json   # structural: schema, required tokens, references, contrast
themvora audit theme.json      # the full quality scorecard — stricter than validate
themvora audit presets         # the same scorecard over every shipped preset
```

`validate` answers "is this a well-formed theme". `audit` answers "is this a
*good* theme", and gates on the scorecard. A theme can pass `validate` and fail
`audit`, which is the point of having both.

## Machine-readable output

Every command that reports supports `--json`, and the payload goes to stdout
alone — progress and diagnostics go to stderr, so a JSON payload is never
polluted. JSON output never contains terminal escape sequences, and colour is
off automatically when stdout is not a TTY.

```bash
themvora validate theme.json --json | jq '.valid'
themvora diff before.json after.json --json | jq '.summary'
themvora doctor . --json
```

## Project checks

If the repository *consumes* Themvora rather than just holding theme files, check
the project too:

```bash
themvora doctor .          # framework, package manager, packages, config, theme files
themvora doctor . --json   # the same, as data
```

`doctor` exits `3` on an actionable health failure — a missing integration, an
invalid theme file, an unreadable config — and `0` when the only findings are
warnings.

## Writes are explicit, and previewable

Nothing in the CLI writes as a side effect of a read:

- **Theme commands** write only to a destination you name (`--output`, or
  `--write` for `migrate` in place). The default is stdout.
- **`init` and `add`** edit files, but every one of them can be previewed with
  `--plan` or `--dry-run`, which render the same plan object `apply` consumes and
  write nothing at all.
- **`init` never replaces a file it did not generate** without `--force`, and
  `add` refuses a registry it does not own.

That makes a "check, then apply" pipeline straightforward:

```bash
themvora init . --framework react --plan     # review in the log
themvora init . --framework react --no-install
```

## GitHub Actions

```yaml
name: Validate Themes

on:
  pull_request:
  push:
    branches: [main]

jobs:
  themes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec themvora validate themes/
      - run: pnpm exec themvora audit themes/
      - run: pnpm exec themvora doctor .
```

## Automation-friendly behaviours

- **No prompts, ever.** A missing required value is a usage error with an
  actionable message; no run can block waiting for input.
- **`--json` is stable and documented**, so scripts do not parse human output.
- **Deterministic per project.** A script in `package.json` fixes the version, so
  machines agree.
- **Offline by default.** The theme commands never touch the network. Only `init`
  on a *new* project invokes a scaffolder, and `--plan`/`--dry-run` never do.
- **Pre-build step.** Run `theme:generate` before `next build`, `vite build`, or
  a Tailwind pass so `theme.json` / `theme.css` exist first.

## For contributors, not CI

Shell completion is a developer convenience rather than a pipeline step, but it
is worth mentioning in a setup script:

```bash
themvora completion bash > /etc/bash_completion.d/themvora
```

Registry values (presets, brands, styles, frameworks) are resolved by the script
at completion time, so it never goes stale when Themvora is upgraded.

## Next Steps
- [Validate your themes](./validate)
- [Audit against the scorecard](./audit)
- [Export to JSON or CSS](./export)
- [View CLI reference](./reference)

## Related
- [Themvora Quick Start](../quickstart)
- [Framework Guides](../../framework-guides)
- [API Reference](../../api-reference)

Next: [Reference](/cli/reference).
