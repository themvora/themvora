# `themvora diff`

## Prerequisites
- Node.js 22+
- Project with @themvora/cli installed or npx access

Compare two themes and see exactly what changed, role by role. Every comparison
decision comes from `@themvora/core`; the CLI resolves sources and renders the
report.

<!-- cli-command:generated:start -->
## Synopsis — Diff two themes semantically

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
<!-- cli-command:generated:end -->

## Examples

```bash
# Two presets
themvora diff mint iris

# A file against a preset
themvora diff theme.json --preset mint

# Two brand recipes
themvora diff --brand apple --brand github

# A seed against a preset
themvora diff --seed "#3366ff" --preset mint
```

## Sources

Each side takes exactly one source. A positional is resolved in a fixed order —
**an existing file, then a preset id, then a brand id** — and the label in the
output always states which branch was taken, so the precedence is never a
guess:

```
  a: file theme.json
  b: preset mint
```

A value that looks like a path (it contains a separator or ends in `.json`) is
always treated as a file, so a mistyped filename reports `cannot read file`
rather than being mistaken for an unknown id.

Use `--preset`, `--brand`, or `--seed` when a side has no positional. The flags
fill the sides without a positional, **in the order you type them**:

```bash
themvora diff mint --brand apple     # a = preset mint, b = brand apple
themvora diff --brand apple --preset mint   # a = brand apple, b = preset mint
themvora diff --seed "#111111" --seed "#222222"   # a and b are seeds
```

## Output

```
mint-light → iris-light
  a: preset mint
  b: preset iris

light
  Canvas
    background             #e9f3ee → #f1f1f6
    foreground             #131d18 → #191a1f
  Actions
    primary                #32936c → #5d5fea
    primaryForeground      #0a140f → #fbfbff
  radius
    lg                     18px → 16px
  20 changed · 0 added · 0 removed · 2 unchanged

dark
  ...
```

Sections are the canonical role groups — **Canvas**, **Surfaces**, **Actions**,
**States**, **Interaction** — for colours, and the token group name (`radius`,
`spacing`, …) for everything else. Only groups with changes are shown.

- Unchanged tokens are hidden by default. Pass `--all` to include them.
- `--quiet` prints only the per-mode counts.
- A mode only one side provides says so in words rather than listing every
  token as added.
- Identical themes print `… are identical (N tokens compared).`

### Provenance is reported separately

Themes generated from different seeds but with identical tokens are *the same
theme* for every rendering purpose, so they are not reported as changed.
Provenance differences appear as a trailing note instead:

```
  provenance differs: seed, style
```

## Modes

There are two visual modes, `light` and `dark`. `--mode` restricts the
comparison to one of them, and is rejected if a source does not have it:

```bash
themvora diff mint iris --mode light
```

`--mode system` is rejected: `"system"` is a **selector** over the concrete
light/dark pair, not a mode that can be compared.

## JSON output

`--json` emits the report on stdout, with nothing else mixed in.

```bash
themvora diff mint iris --json
```

```json
{
  "version": 1,
  "a": { "name": "mint-light", "family": "mint", "mode": "light" },
  "b": { "name": "iris-light", "family": "iris", "mode": "light" },
  "hasChanges": true,
  "modes": {
    "light": {
      "mode": "light",
      "present": "both",
      "changes": [
        {
          "path": "colors.primary",
          "group": "colors",
          "role": "primary",
          "roleGroup": "actions",
          "status": "changed",
          "before": "#32936c",
          "after": "#5d5fea"
        }
      ],
      "counts": { "added": 0, "removed": 0, "changed": 20, "unchanged": 2, "total": 22 },
      "byGroup": [{ "group": "colors", "added": 0, "removed": 0, "changed": 19, "unchanged": 2 }]
    }
  },
  "provenance": {
    "a": { "algorithm": "semantic-v2", "seed": "#059669", "style": "soft", "anchored": [] },
    "b": { "algorithm": "semantic-v2", "seed": "#6366f1", "style": "balanced", "anchored": [] },
    "changed": true,
    "differing": ["seed", "style"]
  },
  "summary": { "added": 0, "removed": 0, "changed": 20, "unchanged": 2, "total": 22 }
}
```

`version` is the **report schema** version, independent of the theme schema and
the package version. `counts` is always complete, whatever `--all` is set to;
only `changes` is filtered. Ordering is deterministic — groups follow the
canonical token-group order, colours follow the canonical role order, and
nothing in the report depends on the host's locale.

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | Compared successfully — **whether or not differences exist**. |
| `1`  | A source was accepted but could not be used (unreadable file, invalid JSON, an unresolvable `mode: "system"`). |
| `2`  | Usage error: an unresolvable source, two sources for one side, `--mode system`, or a mode a source does not have. |

> `diff` exits `0` when the themes differ. A `git diff --exit-code`-style
> "nonzero means different" would collide with `1` meaning *runtime error* in
> this CLI's exit-code contract, so it is deliberately not provided.

## Next Steps
- [Validate a theme](./validate)
- [Inspect a theme](./inspect)
- [CLI reference](./reference)

## Related
- [Themvora Quick Start](../quickstart)
- [Theme generation](../../theme-generation)
- [API Reference](../../api-reference)

Next: [migrate](/cli/migrate).
