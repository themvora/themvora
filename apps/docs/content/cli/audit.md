# `themvora audit`

## Prerequisites
- Node.js 22+
- Project with @themvora/cli installed or npx access

Audit a theme — or every shipped preset and brand — with the **canonical**
scorecard.

`audit` is deliberately **stricter than [`validate`](./validate)**: `validate`
gates on the frozen structural contract, while `audit` gates on the full quality
model. A theme can pass `validate` and fail `audit`, and that difference is the
point.

<!-- cli-command:generated:start -->
## Synopsis — Audit a theme or the shipped presets

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
<!-- cli-command:generated:end -->

## Examples

```bash
# Every shipped preset and brand
themvora audit presets

# One theme file
themvora audit theme.json

# Warnings are failures too
themvora audit presets --strict
```

## The scorecard

Both scopes use `scoreTheme()` — the same quality model the repository's
`audit-presets.mjs` release gate and the preset documentation use. There is one
audit system, so the CLI and the release gate cannot disagree about whether a
preset is healthy.

| Check | What it asserts |
| ----- | --------------- |
| `structural` | Every core role is present and a valid colour |
| `semantic` | `destructive` / `success` are still in their colour families |
| `text-contrast` | Every text pair meets its floor |
| `ui-contrast` | Every non-text UI pair meets its floor |
| `surface-hierarchy` | `background` / `card` / `popover` / `border` are distinguishable |
| `muted-hierarchy` | The muted scale is ordered and separated |
| `accent-collision` | `accent` and `primary` do not collide |
| `cvd` | Status roles stay distinguishable under colour-vision deficiency |
| `contexts` | Every semantic usage the components promise is satisfied |

## Output

```
Shipped presets and brands

  oat-light                9/9  PASS
  oat-dark                 9/9  PASS
  ...
  discord-dark             9/9  PASS

28 theme(s)   28 pass   0 with warnings   0 fail

Audit passed.
```

A failing theme names the checks that failed and their measured values:

```
  forest-light             6/9  FAIL  ui-contrast: input/background 1.40; input/card 1.45; surface-hierarchy: card/popover ΔL 0.000
```

`--quiet` prints only the themes that fail or warn, plus the summary.

## Strict mode

`--strict` treats warnings as failures, mirroring the repository's
`audit-presets.mjs --strict-ui`. A preset that only warns is reported but does
not fail the audit by default.

## Scope

`audit presets` audits every entry in the canonical catalog — the 9 default
presets and the 5 brand recipes, both modes: **28 themes**.

The repository's own `audit-presets.mjs` additionally covers the neutral baseline
and the accessibility profiles (which are exempt by design, since they exist *to*
deviate), and checks snapshot drift against a frozen test fixture. Those are
repository concerns; `audit presets` is the user-facing equivalent, on the same
scorecard.

## JSON output

```bash
themvora audit presets --json
```

```json
{
  "scope": "presets",
  "strict": false,
  "subjects": [
    {
      "id": "mint",
      "label": "Mint",
      "themes": [
        {
          "name": "mint-light",
          "valid": true,
          "issues": [],
          "checks": [{ "id": "structural", "label": "Structural", "status": "pass" }],
          "passed": 9,
          "total": 9,
          "failed": false,
          "warned": false
        }
      ]
    }
  ],
  "summary": { "subjects": 14, "themes": 28, "passed": 28, "warned": 0, "failed": 0 }
}
```

A failing run still emits the report **and** exits `3`.

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | Audit passed. |
| `3`  | Audit failed — a theme failed a check, or a warning under `--strict`. |
| `1`  | A source was accepted but could not be used (unreadable file, invalid JSON). |
| `2`  | Usage error: no scope, or an unknown scope. |

## Next Steps
- [Validate a theme](./validate)
- [Explain a theme](./explain)
- [CLI reference](./reference)

## Related
- [Theme generation](../../theme-generation)
- [Accessibility](../../accessibility)
- [API Reference](../../api-reference)

Next: [migrate](/cli/migrate).
