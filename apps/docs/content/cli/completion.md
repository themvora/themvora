# `themvora completion`

## Prerequisites
- Node.js 22+
- A shell: bash, zsh, fish or PowerShell

Emit a shell completion script for the `themvora` CLI.

```bash
themvora completion bash
themvora completion zsh
themvora completion fish
themvora completion powershell
```

The script goes to stdout with nothing else, so the documented install is a
redirect:

```bash
# bash
themvora completion bash > /etc/bash_completion.d/themvora

# zsh — either on your $fpath, or sourced
themvora completion zsh > "${fpath[1]}/_themvora"

# fish
themvora completion fish > ~/.config/fish/completions/themvora.fish

# PowerShell
themvora completion powershell | Out-String | Invoke-Expression
```

<!-- cli-command:generated:start -->
## Synopsis — Emit a shell completion script

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
<!-- cli-command:generated:end -->

## What completes

- **Command names**, including aliases (`gen`, `ls`), with descriptions where the
  shell renders them.
- **Flags**, scoped to the command you are typing.
- **Closed value sets** — `--mode light|dark|both`, the `list` selectors, the
  shell names.
- **Registry values** — presets, brands, styles and `init` frameworks.

## Registry values are resolved, not embedded

The script does not contain a copy of any value list. It asks the installed CLI:

```bash
themvora list presets --ids
```

That matters for two reasons. A preset added to Themvora shows up in your
completions without regenerating anything, and a completion can never offer an
identifier the installed CLI would reject — the list *is* the CLI's own registry.

The result is cached in a shell variable for the session, so a Tab press costs at
most one process, once.

`list --ids` is the machine-readable mode this relies on: it prints the
identifiers, one per line, and nothing else.

```bash
themvora list presets --ids
themvora list frameworks --ids
```

## Coverage is structural

Commands, aliases and flags come from the same command contract that renders
`themvora --help` and the generated reference, so a flag cannot be completable
without also being documented and parseable — or the other way round.
