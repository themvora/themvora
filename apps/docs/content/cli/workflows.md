# Theme workflows

## Prerequisites
- Node.js 18+
- @themvora/cli installed (globally, locally, or via npx)
- A Themvora project or JSON theme files to work with

The CLI is a small, composable toolkit. The commands chain into real workflows
you can run in a terminal or a pipeline — one for authoring a theme, and one for
standing a project up on one.

## The theme authoring loop

```text
1. Generate ── seed · preset · brand → theme.json
2. Edit ── tweak tokens by hand
3. Validate ── `themvora validate themes/`
4. Inspect ── review what changed
5. Compare ── `themvora diff before.json after.json`
6. Audit ── gate on the quality scorecard
7. Commit ── git
8. CI validates ── on every push / PR
9. Ship ── merge, deploy
10. Migrate later ── when the schema changes
```

```bash
themvora generate --preset mint --output themes/mint.json
themvora validate themes/
themvora inspect themes/mint-light.json
themvora diff themes/mint.json themes/iris.json
```

```text
Git ─→ PR ─→ CI validate ─→ merge
```

## The project setup loop

The other half of the CLI works on a *project* rather than a file.

```text
init ──→ scaffold or integrate
  ↓
theme.config.ts ──→ the single theme declaration
  ↓
add ──→ extend the registry with another source
  ↓
doctor ──→ is the project still healthy?
```

```bash
themvora init my-app --framework react --preset mint
themvora add brand apple --dir my-app
themvora doctor my-app
```

`init` and `add` are idempotent: running either again changes nothing, and both
refuse to rewrite a file they do not own. `doctor` is the check to run when
something looks wrong.

## Generate then validate

Always validate right after a generate or an edit. A theme can be complete
yet fail contrast; catch it before it reaches an app.

```bash
themvora generate --seed "#6366f1" --family indigo --output theme.json
themvora validate theme.json || echo "fix before commit"
```

## Light / dark pairs

`--mode both` (default) writes a pair. Many apps want only one mode; generate
a single theme with `--mode light|dark` when you prefer.

## Migrate legacy themes

Schemas change. Keep `migrate` in your maintenance runbook:

```bash
themvora migrate themes/legacy.json --output themes/current.json
```

`migrate` reports by default and writes nothing: use `--dry-run` to see what
would change, `--output` to write elsewhere, or `--write` to migrate the file in
place. There is no path that overwrites the input without `--write`.

```bash
themvora migrate themes/legacy.json --dry-run
themvora migrate themes/legacy.json --write
```

## Export for another system

`export` is where the CLI becomes a bridge:

```text
Themvora theme ─→ export ─→ CSS variables / JSON map
```

```bash
themvora export theme.json --format css --output theme.css
```

The CSS variables apply with **no runtime** — Tailwind, shadcn/ui, daisyUI,
and any hand-written stylesheet consume them directly.

## The CLI + your framework

```text
                 THEMVORA
                     │
      Runtime        CLI        Documentation
         │            │
         │   ┌────────┼───────────────┐
         │   │        │               │
         │  themes  registries     projects
         │   │        │               │
         │  generate  list          init
         │  validate  completion    add
         │  inspect                 doctor
         │  diff
         │  explain
         │  audit
         │  migrate
         │  export
         │            │
         └────────────┼──────────────────────
                      │
          theme.json · theme.config.ts
```

A theme generated in the terminal is the same object a provider consumes:

```tsx
import { ThemeProvider } from "@themvora/react";
const themes = [light, dark];
```

## Next Steps

- [Run in CI](/cli/ci) — wire validate into your build pipeline.
- [CLI reference](/cli/reference) — all options and exit codes.
- [Presets](/cli/presets) · [brands](/cli/brands) · [styles](/cli/styles) — what the registries contain.
- [Custom Themes](/custom-themes) — author a theme by hand.
- [Adapters](/adapters) — map runtime tokens to MUI, shadcn, Bootstrap.