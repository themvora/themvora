# `themvora list`

## Prerequisites
- Node.js 22+
- Project with @themvora/cli installed or npx access

List the canonical registries the CLI works from: brand recipes, preset
recipes, generation styles, and the frameworks `init` can scaffold.

Nothing here is a hard-coded list. Every value is read from
`@themvora/core`, so `list` cannot advertise an identifier that `generate` would
reject — and a new recipe in the core registry shows up here with no CLI change.

<!-- cli-command:generated:start -->
## Synopsis — List brands, presets, styles, and frameworks

```text
Usage:
  themvora list [brands|presets|styles|frameworks]
```

| Argument | Description |
| -------- | ----------- |
| `<selector>` | One of: brands, presets, styles, frameworks. Omit to list every registry. (optional) |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `--ids` | Print only the identifiers, one per line. Needs a registry selector. | — |
| `--json` | Emit structured registry data instead of a human-readable list. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | success |
| `2` | unknown selector |
| `1` | command/runtime error |

### Examples

```bash
themvora list
themvora list presets
themvora list brands --json
themvora list presets --ids
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.
<!-- cli-command:generated:end -->

## What each registry is

| Registry | What it is | Where it is defined |
| -------- | ---------- | ------------------- |
| `brands` | Brand-*inspired* recipes. Not official brand themes, and not affiliated. | `@themvora/core` brand recipes |
| `presets` | The curated default recipes shipped with Themvora. | `@themvora/core` preset recipes |
| `styles` | The visual languages `generate --style` accepts. | `@themvora/core` generation styles |
| `frameworks` | The frameworks `themvora init` supports. | The CLI's init framework registry |

## Examples

```bash
# Everything
themvora list

# One registry
themvora list presets
themvora list brands
themvora list styles
themvora list frameworks
```

## Machine-readable output

`--json` emits the registry data instead of the formatted table. A single
selector yields that registry's array; no selector yields an object keyed by
registry.

```bash
themvora list presets --json
```

```json
[
  {
    "id": "mint",
    "name": "Mint",
    "family": "mint",
    "kind": "preset",
    "seed": "#059669",
    "style": "soft",
    "description": "Cool · Soft · Restrained",
    "tags": ["cool", "soft", "restrained"],
    "aliases": []
  }
]
```

```bash
# Every preset id, one per line
themvora list presets --json | node -e \
  "process.stdin.on('data',d=>JSON.parse(d).forEach(p=>console.log(p.id)))"
```

## Using a value

```bash
themvora generate --preset mint
themvora generate --brand apple
themvora generate --seed "#6366f1" --style editorial
```

> `list frameworks` reports the frameworks the **CLI scaffolder** supports,
> which is deliberately narrower than the frameworks Themvora publishes packages
> for. Angular, Astro, Nuxt, Remix and Web Components remain fully supported by
> their packages and docs — they are simply not `init` targets yet.

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | Listed. |
| `2`  | Unknown registry selector. |

## Next Steps
- [Generate a theme](./generate)
- [Validate a theme](./validate)
- [CLI reference](./reference)

## Related
- [Presets](../presets)
- [Brand presets](../brands)
- [CLI reference](./reference)

Next: [validate](/cli/validate).
