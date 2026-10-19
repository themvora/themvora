# Generation styles

## Prerequisites
- Node.js 22+
- @themvora/cli installed (globally, locally, or via npx)

A **generation style** is the visual language the generator works in. It decides
how much chroma the surfaces carry, how the secondary and accent roles relate to
the primary hue, how strong borders are, and how deep the dark mode goes.

```bash
themvora list styles
themvora generate --seed "#6366f1" --style editorial
```

## The six styles

`balanced` is the default and the reference point. The others each move a small
number of parameters in one direction, so the difference between any two is
legible rather than arbitrary.

| Style | Character | Secondary | Accent | Borders |
| ----- | --------- | --------- | ------ | ------- |
| `balanced` | The reference. Even surfaces, restrained accents | neutral | analogous | medium |
| `soft` | Warmer surfaces, gentler primaries, tinted secondary | tinted | analogous | light |
| `vibrant` | Higher chroma, wider accent split | tinted | split-complementary | strong |
| `editorial` | Deeper primaries, very low surface chroma, strong rules | neutral | complementary | strong |
| `minimal` | No surface chroma at all, muted primary, hairline borders | neutral | analogous | very light |
| `brand` | The seed is the anchor; the widest lightness band of the six | neutral | analogous | light |

The last column is a summary. Concretely, the parameters that move are the
surface chroma, the primary chroma multiplier, the secondary and accent hue
relationships, the neutral temperature, the border strength, the dark surface
depth, and the band the primary's lightness is clamped into.

## `brand` is different on purpose

The other five styles *interpret* the seed. `brand` treats it as an anchor: the
primary is allowed to stay as dark as `#000000` or as light as `#ffffff`, which
is why its lightness band is the widest of the six. A near-black brand stays
near-black instead of being lifted into a mid-tone.

Contrast repair still applies — it moves the ink first and the surface only as
far as it must — so a `brand` theme remains accessible.

That is why four of the five [brand recipes](/cli/brands) use it, and `vercel`
does not: a monochrome identity reads better through `minimal`.

## Using a style

```bash
# On a seed
themvora generate --seed "#6366f1" --style editorial

# On a seed added to a project
themvora add seed "#6366f1" --family indigo --style soft

# Overriding the style a preset pins
themvora generate --preset mint --style vibrant
```

`--style` is accepted wherever a seed is generated. A preset or brand already
pins a style, and passing `--style` overrides it.

## Discovering the values

```bash
themvora list styles            # the six names
themvora list styles --ids      # just the identifiers, one per line
themvora list styles --json     # the registry
```

The names come from the generator's own `GENERATION_STYLE_NAMES`, so the CLI
cannot accept a style the engine does not implement.

## Styles are not themes

A style does not produce a theme on its own — it is a parameter of generation:

```text
seed colour  +  style  ──→  generateTheme  ──→  theme.json
```

Two runs with the same seed and style produce byte-identical output. That is what
makes a [preset](/cli/presets) reproducible: a preset is exactly a seed, a style
and a character, pinned together.

## Next Steps

- [Presets](/cli/presets) — nine curated seed + style combinations.
- [Brand recipes](/cli/brands) — the recipes that use `brand`.
- [Generate a theme](/cli/generate) — the full command.
- [Diff two themes](/cli/diff) — see what a style change actually moves.
