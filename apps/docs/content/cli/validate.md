# `themvora validate`

## Prerequisites
- Node.js 22+
- Theme file(s) to validate
- Project with @themvora/cli installed or npx access

Check a theme file against the Themvora contract. It is a CI tool — run it
before commit and in a pipeline, and branch on the exit code.

<!-- cli-command:generated:start -->
## Synopsis — Validate a theme

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
<!-- cli-command:generated:end -->

## Examples

```bash
themvora validate theme.json
themvora validate themes/berry.json
themvora validate theme.json --json
```

The file may be a single theme or a `{ light, dark }` pair; both are validated.

## What it checks

`validate` reports the layers Themvora core actually provides. Each layer comes
from the shipped API — there is no second validator inside the CLI.

| Layer | Source | Decides the exit code? |
| ----- | ------ | ---------------------- |
| `required` | `validateTheme()` — the frozen contract | **Yes** |
| `structure` | `validateThemeLevels()` | No — reported |
| `semantic` | `validateThemeLevels()` (semantic + visual) | No — reported |
| `contrast` | `validateThemeLevels()` | No — reported |
| `accessibility` | `validateThemeLevels()` (CVD diagnostics) | No — reported |
| `measured` | `measureThemeContrast()` — the canonical ratio measurement | No — reported |

### Why only one layer decides the exit code

`required` is the contract that shipped first, and it is what existing pipelines
already branch on. The deeper layers are stricter: they flag, for example, an
`input` token that sits below the UI contrast floor, or a `card` and `popover`
that are not visually distinguishable.

Turning those into failures by default would make themes that pass today start
failing — a breaking change to a tool people run in CI. So they are **reported**
here, and *gating* on them belongs to `themvora audit`.

## Output

On success, the summary line is followed by the layer breakdown:

```
✓ Theme is valid: mint-light + mint-dark

mint-light
  structure     pass
  semantic      pass
  contrast      pass
  accessibility pass
  measured      16 pairs · text 12/12 · ui 4/4
```

A theme that is structurally valid but has deeper problems says so without
failing:

```
✓ Theme is valid: forest-light + forest-dark

forest-light
  structure     pass
  semantic      1 issue(s)
    · `card` and `popover` are not distinguishable (ΔL 0.000 < 0.005)
  contrast      2 issue(s)
    · input/background is 1.40:1, below 3:1
    · input/card is 1.45:1, below 3:1
  accessibility pass
  measured      16 pairs · text 9/9 · ui 5/7
```

On failure, every missing token is listed and the command exits `3`:

```
✗ Theme is invalid: x
  - Missing token: `colors.background`
  - Missing token: `colors.foreground`
(validation failed for 1 theme)
```

`--quiet` suppresses the success summary. It never suppresses errors.

## JSON output

`--json` emits one document on stdout, with nothing else mixed in — diagnostics
never contaminate a payload.

```bash
themvora validate theme.json --json
```

```json
{
  "valid": true,
  "themes": [
    {
      "name": "mint-light",
      "valid": true,
      "issues": [],
      "layers": [
        { "layer": "structure", "issues": [] },
        { "layer": "contrast", "issues": [] }
      ],
      "contrast": { "pairs": 16, "text": { "total": 12, "passing": 12 }, "ui": { "total": 4, "passing": 4 } }
    }
  ],
  "summary": { "themes": 2, "valid": 2, "invalid": 0 }
}
```

The shape is stable: `valid` mirrors the exit code, `themes` is in file order,
and `summary` is the aggregate. A failing run still emits the document *and*
exits `3`.

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | Theme is valid. |
| `1`  | File not found, unreadable, or not valid JSON. |
| `2`  | No theme file supplied (invalid arguments). |
| `3`  | Validation failed (issues are listed). |

Because failure is a real nonzero exit code, `validate` works in any build
tool:

```bash
themvora validate themes/ || exit 1
```

## Next Steps
- [Inspect validation output](./inspect)
- [Export as CSS or JSON](./export)
- [CLI reference](./reference)

## Related
- [Themvora Quick Start](../quickstart)
- [Custom Themes](../../custom-themes)
- [API Reference](../../api-reference)

Next: [inspect](/cli/inspect).
