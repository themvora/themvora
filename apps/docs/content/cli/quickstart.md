# CLI Quick Start

## Prerequisites
- Node.js 18+
- npm, pnpm, yarn, or bun installed
- No Themvora project setup required to start

A complete five-minute workflow: generate a theme from a seed, validate it,
inspect it, and export CSS variables — then wire the JSON into a Themvora
provider.

## Two ways to start

This page follows the **file** path: produce a theme, check it, and hand it to
your app. If you would rather the CLI set the project up for you — scaffold it,
wire the provider, and verify it builds — start with [`init`](/cli/init) instead:

```bash
# Guided: asks for the project name, package manager, framework and styling
themvora init

# Or say what you want and skip the questions
themvora init my-app --tool pnpm --framework react --preset mint

# Same project, with Tailwind CSS instead of the default plain CSS
themvora init my-app --tool pnpm --framework react --styling tailwind
```

Either way it scaffolds with the framework's own generator, installs the
dependencies once, and runs the project's build and typecheck before it reports
success. Plain CSS is the default; the styling choice changes how the starter is
written, not what it contains: same page, same components, same theme tokens.

Both paths end in the same place: the same `ThemeDefinition` objects, consumed
by the same provider.

## 1. Install

```bash
npm install -g @themvora/cli
# or, without installing:
npx --yes @themvora/cli ...
```

## 2. Generate

Not sure what to generate? List the canonical registries first — the identifiers
they print are exactly the ones the generator accepts:

```bash
themvora list presets
themvora list brands
```

Derive a complete **light + dark pair** from one seed color:

```bash
themvora generate \
  --seed "#6366f1" \
  --family indigo \
  --output theme.json
```

`--family` becomes the theme name and label prefix (`indigo-light`,
`indigo-dark`). The generator also derives the secondary, muted, accent,
border, ring, destructive, and background/foreground colors from the seed.

Or start from a curated recipe instead of a raw colour:

```bash
themvora generate --preset mint --output theme.json
themvora generate --brand apple --output theme.json
```

Omit `--output` to print the JSON to stdout, or ask for one mode only:

```bash
themvora generate --seed "#6366f1" --mode light --output light.json
themvora generate --seed "#6366f1" --mode dark  --output dark.json
```

The default `--mode both` writes a `{ light, dark }` pair — one definition per
mode, each carrying its own `meta` (family + mode) and token set:

```json title="theme.json"
{
  "light": {
    "name": "indigo-light",
    "meta": { "family": "indigo", "mode": "light", "label": "Indigo Light", "order": 10 },
    "tokens": {
      "colors": {
        "background": "#f8fafc",
        "foreground": "#0f172a",
        "primary": "#6366f1",
        "border": "#d9d9e8",
        "ring": "#6366f1"
      },
      "radius": { "lg": "8px" }
    }
  },
  "dark": {
    "name": "indigo-dark",
    "meta": { "family": "indigo", "mode": "dark", "label": "Indigo Dark", "order": 20 },
    "tokens": {
      "colors": {
        "background": "#020617",
        "foreground": "#f8fafc",
        "primary": "#9596ea",
        "border": "#080a5e",
        "ring": "#9596ea"
      },
      "radius": { "lg": "8px" }
    }
  }
}
```

## 3. Validate

```bash
themvora validate theme.json
# ✓ Theme is valid: indigo-light + indigo-dark
```

`validate` checks the schema, required semantic tokens, inheritance,
references, and contrast. It returns exit code `3` when validation fails:

```bash
themvora validate theme.json
# ✗ Theme is invalid: indigo-dark
#   - Missing token: `colors.primary`
```

## 4. Inspect

```bash
themvora inspect theme.json
# Theme 1: indigo-light
# Mode: light
# Family: indigo
# Tokens:
#   colors: 21 items
```

## 5. Export for another system

```bash
themvora export theme.json --format css --output theme.css
```

```css
:root {
  --theme-color-background: #f8fafc;
  --theme-color-primary: #6366f1;
}
```

## 6. Bring the theme into your app

The JSON the CLI writes is exactly what a provider consumes:

```tsx
// React / Next.js
import { ThemeProvider } from "@themvora/react";
import raw from "./theme.json";

const themes = raw.light ? [raw.light, raw.dark] : [raw];

export function App() {
  return <ThemeProvider themes={themes} defaultTheme="light">{/* UI */}</ThemeProvider>;
}
```

If you would rather not wire this by hand, [`init`](/cli/init) writes that
provider, a `theme.config.ts`, and the zero-flash bootstrap for you — and then
runs your project's own build to prove it works.

## Where to go next

The five steps above are the file workflow. From here:

| You want to | Use |
| ----------- | --- |
| Compare two themes before choosing | [`diff`](/cli/diff) |
| Understand where a theme came from | [`explain`](/cli/explain) |
| Gate a theme on the quality scorecard | [`audit`](/cli/audit) |
| Set a project up | [`init`](/cli/init) |
| Add a second theme to a project | [`add`](/cli/add) |
| Check a project's health | [`doctor`](/cli/doctor) |
| Complete commands in your shell | [`completion`](/cli/completion) |

## Next Steps
- [Run in CI](./ci)
- [View full CLI reference](./reference)
- [Migrate legacy themes](./migrate)

## Related
- [Themvora Quick Start](../quickstart)
- [Custom Themes](../../custom-themes)
- [Adapters Guide](../../adapters)