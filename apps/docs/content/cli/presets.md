# Presets

## Prerequisites
- Node.js 18+
- @themvora/cli installed (globally, locally, or via npx)

A **preset** is a curated recipe: a seed colour, a generation style, and a
character, pinned together so the result is reproducible. Presets are the
shortest path from "I need a theme" to a complete light/dark pair.

```bash
themvora list presets
themvora generate --preset mint
```

## The nine presets

| Preset | Character | Style | Seed |
| ------ | --------- | ----- | ---- |
| `oat` | Warm · Soft · Neutral | `soft` | `#b45309` |
| `berry` | Warm · Vibrant | `vibrant` | `#db2777` |
| `mint` | Cool · Soft · Restrained | `soft` | `#059669` |
| `citrus` | Warm · Vibrant · Bright | `vibrant` | `#d97706` |
| `cocoa` | Warm · Deep · Editorial | `editorial` | `#92400e` |
| `plum` | Violet · Editorial | `editorial` | `#7c3aed` |
| `iris` | Cool · Balanced | `balanced` | `#6366f1` |
| `sky` | Cool · Soft · Airy | `soft` | `#0ea5e9` |
| `graphite` | Neutral · Minimal | `minimal` | `#52525b` |

Every preset produces a `<id>-light` and `<id>-dark` theme. Browse them with the
colours applied on the [preset gallery](/presets).

## Using a preset

**Generate a file** — the theme is written out, nothing else changes:

```bash
themvora generate --preset mint --output theme.json
```

**Start a project** — `init` registers the preset with the framework provider:

```bash
themvora init my-app --framework react --preset mint
```

**Extend a project** — `add` appends it to the project's existing registry, so
both presets become selectable:

```bash
themvora add preset iris
```

## Discovering the ids

```bash
themvora list presets            # a table, with character, style and seed
themvora list presets --json     # the full registry entries
themvora list presets --ids      # just the identifiers, one per line
```

Every identifier comes from the same registry `generate`, `init` and `add`
resolve against, so `list` cannot print a preset the generator would reject. A
preset id is also the value `--preset` accepts everywhere:

```bash
themvora generate --preset mint
themvora init my-app --framework vue --preset mint
themvora add preset mint
```

## Where the values come from

A preset is a **recipe**, not a snapshot. `generateTheme` derives the full token
set from the seed using the pinned style, which is why two runs of the same
preset produce byte-identical output and why a preset never carries hand-tuned
colours that could drift from the generator.

`--style` overrides the style a preset pins:

```bash
themvora generate --preset mint --style editorial
```

## Presets vs. brands vs. seeds

| | What it is | When to use it |
| --- | ---------- | -------------- |
| **Preset** | A curated seed + style + character | You want a considered theme, fast |
| **[Brand](/cli/brands)** | A brand-inspired recipe with documented anchors | You want something recognisable |
| **Seed** | Just a colour | You have a brand colour of your own |

All three resolve to the same thing — a pair of `ThemeDefinition` objects — so
they are interchangeable in every command that accepts a theme source.

## Next Steps

- [Brand recipes](/cli/brands) — the five brand-inspired presets.
- [Generation styles](/cli/styles) — what `--style` changes.
- [Generate a theme](/cli/generate) — the full command.
- [Set up a project](/cli/init) — wire a preset into a framework.
