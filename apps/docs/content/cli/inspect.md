# `themvora inspect`

## Prerequisites
- Node.js 22+
- Theme JSON file(s) to inspect
- Project with @themvora/cli installed or npx access

Print a human-readable summary of what is inside a theme: its provenance,
semantic token groups, resolved colours, and accessibility. Useful for
documentation, review, and explaining a theme to a teammate.

<!-- cli-command:generated:start -->
## Synopsis — Inspect a theme

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
<!-- cli-command:generated:end -->

## Examples

```bash
themvora inspect themes/plum-dark.json
themvora inspect theme.json    # a light + dark pair

# One section at a time
themvora inspect theme.json --generation
themvora inspect theme.json --tokens
themvora inspect theme.json --colors
themvora inspect theme.json --accessibility

# Machine-readable
themvora inspect theme.json --json
```

With no selector, every section is shown.

## Output

For a single theme:

```
Theme: mint-light
Mode: light
Family: mint
Label: Mint Light
Version: N/A

Provenance:
Algorithm     semantic-v2
Seed          #059669
Style         soft

Tokens:
  colors: 21 items
  radius: 1 items

Colors:
  background          #f8fbf9
  foreground          #12211a
  primary             #0a8f5f
  ...

Accessibility:
  contrast      9/9 text · 7/7 ui pairs meet the floor
  relationships no issues
```

For a `{ light, dark }` pair, each theme is printed with its own index:

```text
Theme 1: mint-light
...
Theme 2: mint-dark
```

## Provenance

`Provenance` reports the generation metadata the theme carries — the algorithm,
the seed it was generated from, the style, and any roles pinned to a brand
anchor. It is read straight from `meta.generation`; nothing is inferred.

A theme with no provenance is labelled as such, and `inspect` only suggests
`migrate` when a registered migration step actually applies to the file:

```
Provenance:
  not recorded — this theme was not produced by the generator.
```

## Accessibility

The `Accessibility` section reuses core's own checks: the canonical
`measureThemeContrast()` measurement for the ratio counts, and
`validateThemeLevels()` for the relationship and CVD diagnostics. `inspect`
never re-derives a ratio.

Note that this section is diagnostic. A hand-authored theme can report issues
here and still be perfectly valid — see [validate](./validate) for why the two
commands draw that line where they do.

## JSON output

`--json` emits the same data as a document. For a single theme the theme object
is the root; for a pair it is `{ "themes": [ … ] }`.

```bash
themvora inspect theme.json --json
```

```json
{
  "themes": [
    {
      "name": "mint-light",
      "mode": "light",
      "family": "mint",
      "generation": { "algorithm": "semantic-v2", "seed": "#059669", "style": "soft", "anchored": [] },
      "tokens": { "groups": [{ "name": "colors", "count": 21 }] },
      "colors": { "background": "#f8fbf9" },
      "accessibility": {
        "pairs": 16,
        "text": { "total": 9, "passing": 9 },
        "ui": { "total": 7, "passing": 7 },
        "diagnostics": []
      }
    }
  ]
}
```

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | Inspected successfully. |
| `1`  | File not found, unreadable, or not valid JSON. |
| `2`  | No theme file supplied. |

## Next Steps
- [Migrate themes to new schema](./migrate)
- [Export current tokens](./export)
- [Validate theme structure](./validate)
- [CLI reference](./reference)

## Related
- [Themvora Quick Start](../quickstart)
- [Custom Themes](../../custom-themes)
- [API Reference](../../api-reference)

Next: [migrate](/cli/migrate).
