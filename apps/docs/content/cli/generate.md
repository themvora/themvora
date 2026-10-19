# `themvora generate`

## Prerequisites
- Node.js 22+
- Project with @themvora/cli installed or npx access

Generate a complete theme from one of three sources: a **seed color**, a
canonical **preset**, or a brand-inspired **brand** recipe. By default it
derives a light + dark pair; `--mode light|dark` writes a single theme.

<!-- cli-command:generated:start -->
## Synopsis — Generate a theme from a seed, preset, or brand

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
<!-- cli-command:generated:end -->

> The CLI requires a hex seed (`#rrggbb`), e.g. `#6366f1`. In bash, zsh, and
> PowerShell the leading `#` starts a comment, so always quote the seed in a
> terminal: `--seed "#6366f1"`. Package managers (npm, pnpm, yarn) also run
> `package.json` scripts through a shell, so keep the quotes there too — the
> quotes are a shell concern, not part of the flag itself.

## Three sources

Exactly one source may be given per invocation. They are mutually exclusive, and
supplying two is a usage error (`2`) rather than a silent winner.

| Source | Flag | What it does |
| ------ | ---- | ------------ |
| Seed | `--seed <color>` (or a bare positional) | Generates a new palette from one colour. |
| Preset | `--preset <id>` | Emits a curated preset, exactly as shipped. |
| Brand | `--brand <id>` | Emits a brand-inspired recipe, exactly as shipped. |

With no source at all, `generate` keeps its original behaviour: it derives from
the default seed `#6366f1`.

```bash
themvora generate --seed "#6366f1"
themvora generate --preset mint
themvora generate --brand apple
```

Run `themvora list presets` / `themvora list brands` to see the identifiers.

### Presets and brands are not re-derived

`--preset` and `--brand` read the **resolved** theme from the canonical catalog,
so the output is byte-for-byte the preset the documentation shows. The CLI never
re-runs a recipe, which is why a preset can never drift from its docs page.

```bash
themvora generate --preset mint --mode light
```

```json
{
  "name": "mint-light",
  "meta": {
    "family": "mint",
    "mode": "light",
    "label": "Mint Light",
    "generation": { "algorithm": "semantic-v2", "seed": "#059669", "style": "soft" }
  }
}
```

### Seed-only options

A recipe pins its own family, style and curated tokens. Combining `--preset` or
`--brand` with `--style`, `--code`, or `--family` is rejected with an
explanation rather than silently ignored — the options below apply to seed
generation only.

### Unknown values

An unknown id exits `2` and names the registry to consult. A near miss is
corrected:

```bash
$ themvora generate --brand appple
Usage: themvora generate [options]
unknown brand "appple" — did you mean "apple"? — run "themvora list brands" to see the available brands
```

## Writing to a file

`--output <file>` writes the JSON to a file. The confirmation line goes to
**stderr**, so stdout stays free for a payload and the command can be piped.

`--dry-run` performs no write at all: it reports what would happen on stderr and
still prints the payload to stdout, so the result is inspectable without
touching the filesystem.

```bash
themvora generate --preset mint --output theme.json --dry-run
# stderr: would write theme.json (2894 bytes, preset "mint" (style soft))
```
## What the generator derives

Given a seed, `generate` (via `generateTheme`) derives the full semantic color
set: `background`, `foreground`, `card`, `popover`, `primary`,
`primaryForeground`, `secondary`, `muted`, `accent`, destructive (with their
foregrounds), `border`, `input`, `ring`, plus a `radius.lg` scale. The same
model that builds the default presets is exposed here, so a generated family
fits the rest of Themvora.

## Light + dark pair (default)

```bash
themvora generate --seed "#6366f1" --family indigo --output theme.json
```

Writes:

```json title="theme.json"
{
  "light": {
    "name": "indigo-light",
    "meta": {
      "family": "indigo",
      "mode": "light",
      "label": "Indigo Light",
      "order": 10
    },
    "tokens": {
      "colors": {
        "background": "#f8fafc",
        "foreground": "#0f172a",
        "card": "#ffffff",
        "cardForeground": "#0f172a",
        "popover": "#ffffff",
        "popoverForeground": "#0f172a",
        "primary": "#6366f1",
        "primaryForeground": "#ffffff",
        "secondary": "#e4e4f1",
        "secondaryForeground": "#0f172a",
        "muted": "#efeff5",
        "mutedForeground": "#64748b",
        "accent": "#c6c6ec",
        "accentForeground": "#0f172a",
        "destructive": "#ef4444",
        "destructiveForeground": "#ffffff",
        "success": "#22c55e",
        "successForeground": "#ffffff",
        "border": "#d9d9e8",
        "input": "#d9d9e8",
        "ring": "#6366f1"
      },
      "radius": {
        "lg": "8px"
      }
    }
  },
  "dark": {
    "name": "indigo-dark",
    "meta": {
      "family": "indigo",
      "mode": "dark",
      "label": "Indigo Dark",
      "order": 20
    },
    "tokens": {
      "colors": {
        "background": "#020617",
        "foreground": "#f8fafc",
        "card": "#0f172a",
        "cardForeground": "#f8fafc",
        "popover": "#0f172a",
        "popoverForeground": "#f8fafc",
        "primary": "#9596ea",
        "primaryForeground": "#020617",
        "secondary": "#060846",
        "secondaryForeground": "#f8fafc",
        "muted": "#050638",
        "mutedForeground": "#94a3b8",
        "accent": "#151651",
        "accentForeground": "#f8fafc",
        "destructive": "#f87171",
        "destructiveForeground": "#020617",
        "success": "#4ade80",
        "successForeground": "#020617",
        "border": "#080a5e",
        "input": "#080a5e",
        "ring": "#9596ea"
      },
      "radius": {
        "lg": "8px"
      }
    }
  }
}
```

## A single mode

```bash
themvora generate --seed "#6366f1" --family indigo --mode light \
  --output indigo-light.json
```

## Code tokens (opt-in)

Not every theme needs a syntax-highlighting palette. Pass `--code` to also
generate a `tokens.code` block — a cohesive set of `--theme-code-*` variables
(keyword, string, number, function, type, comment, …) derived from the seed
hue, with distinguishable light/dark variants:

```bash
themvora generate --seed "#6366f1" --family indigo --code \
  --output indigo.json
```

The generated `light.tokens.code` (dark mirrors it with inverted colors):

```json
"code": {
  "background": "#ffffff",
  "foreground": "#0f172a",
  "keyword": "#1b1ebc",
  "string": "#1c7d33",
  "number": "#a04a00",
  "function": "#1641d0",
  "type": "#0e6f73",
  "comment": "#64748b"
}
```

Without `--code` no `code` block is emitted, so themes stay lean.

## Print to stdout

```bash
themvora generate --seed "#10b981" --family mint
```

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | Generated (file written or printed). |
| `1`  | A command or runtime error. |
| `2`  | Invalid source combination, unknown preset/brand, or invalid `--seed`/`--mode`/`--style`. |

## Next Steps
- [Validate generated themes](./validate)
- [Inspect theme output](./inspect)
- [Export as CSS or JSON](./export)
- [CLI reference](./reference)

## Related
- [Themvora Quick Start](../quickstart)
- [Custom Themes](../../custom-themes)
- [API Reference](../../api-reference)

Next: [validate](/cli/validate).
