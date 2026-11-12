# `themvora explain`

## Prerequisites
- Node.js 18+
- Project with @themvora/cli installed or npx access

Explain how a theme came to be: its source, its recipe, the identity or brand
anchors behind it, the contrast contract it was solved against, the semantic
mapping of every role, and a validation summary.

It explains the **result**, not the solver. There is no iteration log here, and
nothing is re-derived — every value comes from an existing public API, so the
numbers cannot disagree with the preset audit or the docs.

<!-- cli-command:generated:start -->
## Synopsis — Explain how a theme was produced

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
<!-- cli-command:generated:end -->

## Examples

```bash
themvora explain --preset mint
themvora explain --brand apple
themvora explain --seed "#6366f1"
themvora explain theme.json
```

A preset or brand id is also accepted positionally, resolved the same way
[`diff`](./diff) resolves its sources: an existing file, then a preset id, then a
brand id.

## Output

```
source
  resolved      preset mint
  kind          curated preset
  family        mint
  style         soft
  character     Cool · Soft · Restrained
  tags          cool, soft, restrained
  radius        18px
  temperature   neutral
  seed          #059669
  algorithm     semantic-v2

constraint contract
  text          4.5:1
  large text    3:1
  ui            3:1

semantic mapping
  mint-light
    Canvas
      background             #e9f3ee
      foreground             #131d18  Body text on the page canvas
      muted                  #dfe9e4
      mutedForeground        #5e6662  Supporting text on the canvas
    Actions
      primary                #32936c
      primaryForeground      #0a140f  The label on a primary action
      ...

validation
  light valid · 9/9 checks · text 9/9 · ui 7/7
  dark  valid · 9/9 checks · text 9/9 · ui 7/7
```

Each section answers one of the plan's questions:

| Section | Answers |
| ------- | ------- |
| `source` | Where this theme came from, and how it was resolved |
| `identity` | For a brand recipe: the reference material, the pinned anchors, and any normalization |
| `constraint contract` | The contrast floors the theme was solved against |
| `semantic mapping` | Every role, its resolved value, and the usage core promises for it |
| `validation` | The canonical scorecard, per mode |

## Brand recipes

A brand source adds an `identity` block, drawn from the recipe's own reference
data:

```
identity
  reference     Apple · official-guidelines
                https://developer.apple.com/design/human-interface-guidelines/color
                design system: yes · light/dark: yes
  anchors       2 pinned
    light primary         #007aff  System Blue
    dark  primary         #007aff  System Blue
  normalized    every anchor survived exactly
```

- **`anchors`** are the brand values the generator pins exactly rather than
  generating around.
- **`normalized`** lists anchors the solver had to move to keep the theme
  readable. When nothing moved it says so. (No shipped brand currently reports a
  moved anchor — the channel is reported honestly and is empty.)
- The canonical brand disclaimer is printed verbatim, so a page that shows a
  brand preset states the same thing everywhere.

## What it does not explain

Two things the CLI deliberately does not report, because core does not expose
them:

- **Derived seed identity** (hue, chroma, temperature) for a `--seed` source.
  The identity layer is internal to the generation engine, which keeps all colour
  math in one module. `explain --seed` reports the seed, the style and the
  contract instead.
- **Solver repairs** for non-brand sources. The generator exposes no repair data
  for a seed, and its internal report returns empty adjustment lists.

## JSON output

`--json` emits the same explanation as a document:

```json
{
  "source": { "kind": "preset", "id": "mint", "label": "preset mint" },
  "recipe": {
    "name": "Mint",
    "family": "mint",
    "kind": "curated preset",
    "style": "soft",
    "character": "Cool · Soft · Restrained",
    "tags": ["cool", "soft", "restrained"],
    "radius": "18px",
    "temperature": "neutral",
    "seed": "#059669",
    "algorithm": "semantic-v2",
    "provenance": null,
    "brandColor": null,
    "disclaimer": null
  },
  "identity": null,
  "contract": { "text": 4.5, "largeText": 3, "ui": 3 },
  "modes": {
    "light": {
      "name": "mint-light",
      "roles": [
        {
          "path": "colors.foreground",
          "role": "foreground",
          "roleGroup": "Canvas",
          "value": "#131d18",
          "usage": "Body text on the page canvas"
        }
      ],
      "validation": {
        "valid": true,
        "issues": [],
        "score": { "passed": 9, "total": 9, "checks": [] },
        "contrast": { "pairs": 16, "text": { "total": 9, "passing": 9 }, "ui": { "total": 7, "passing": 7 } }
      }
    }
  }
}
```

`identity` is `null` for a preset, a seed, and a theme file — only a brand
recipe has one.

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | Explained successfully. |
| `1`  | A source was accepted but could not be used (unreadable file, invalid JSON or JSONC). |
| `2`  | Usage error: no source, more than one source, an unresolvable id, or an invalid seed. |

## Next Steps
- [Diff two themes](./diff)
- [Inspect a theme](./inspect)
- [CLI reference](./reference)

## Related
- [Theme generation](../../theme-generation)
- [Presets](../presets)
- [API Reference](../../api-reference)

Next: [migrate](/cli/migrate).
