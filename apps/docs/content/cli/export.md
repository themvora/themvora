# `themvora export`

## Prerequisites
- Node.js 22+
- Theme JSON file(s) to export
- Project with @themvora/cli installed or npx access

Export theme tokens to **CSS variables** or a **flat JSON map** for another
system. Every token becomes a `--theme-*` custom property, so the exported CSS
needs no runtime and no framework — Tailwind, shadcn/ui, daisyUI, and
hand-written CSS can all consume the variables.

<!-- cli-command:generated:start -->
## Synopsis — Export a theme to CSS or JSON

```text
Usage:
  themvora export <file> [options]
```

| Argument | Description |
| -------- | ----------- |
| `<file>` | Theme file to export. |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `-f, --file <path>` | Theme file to export (or pass it positionally). | — |
| `-F, --format <fmt>` | Output format. One of: `css`, `json`. | `css` |
| `-o, --output <file>` | Write the export to a file instead of stdout. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | success |
| `1` | command/runtime error |
| `2` | usage/argument error |

### Examples

```bash
themvora export theme.json --format css
themvora export theme.json --format json --output tokens.json
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.
<!-- cli-command:generated:end -->
## CSS variables

A single theme:

```bash
themvora export theme.json --format css --output theme.css
```

```css
:root {
  --theme-color-background: #f8fafc;
  --theme-color-primary: #6366f1;
}
```

A light + dark pair exports both blocks:

```css
:root {
  /* light */
}

.dark, [data-theme="dark"] {
  /* dark */
}
```

```css
@import "./theme.css"; /* :root plus the .dark block */
```

## JSON

```bash
themvora export theme.json --format json
```

Emits the flat `--theme-*` key/value map as JSON — useful for editors, scripts,
or configuration systems that consume token maps.

## Default output

Omit `--output` to print the CSS (or JSON) to stdout.

## Exit codes

| Code    | Meaning |
| ------- | ------- |
| `0`     | Exported successfully. |
| `2`     | Invalid arguments (missing file or unknown format). |

## Next Steps
- [Validate the exported theme](./validate)
- [Inspect what was exported](./inspect)
- [CLI reference](./reference)

## Related
- [Themvora Quick Start](../quickstart)
- [Tailwind Framework Guide](../../framework-guides/tailwind)
- [API Reference](../../api-reference)
