# M7 — TypeScript registry reading

> **Status: implemented (2026-10-21).** Core loader, extension consumption, tests and a host check.
> Supersedes the "not readable yet" state for canonical registries only.

## Why this exists

`themvora init` writes `src/themes/themes.ts`, and for React, Vue, Solid and Svelte it writes
**no `theme.config.ts`**. So the only theme file a scaffolded project has is TypeScript — and the
extension does not execute project code. Before this change, every canonically initialized project
therefore showed "not readable yet". The limitation was the default path, not an edge case.

## The matrix (required before designing the parser)

Read from the CLI's own generator, not assumed. `packages/cli/src/init/registry-file.ts` declares the
registry files and a single renderer; `adapters/themes-module.ts` is that renderer.

| Framework | Registry path | Source shape | Same loader? |
| --- | --- | --- | --- |
| React | `src/themes/themes.ts` | `renderThemesModule` output | **yes** |
| Vue | `src/themes/themes.ts` | identical | **yes** |
| Solid | `src/themes/themes.ts` | identical | **yes** |
| Svelte | `src/themes/themes.ts` | identical | **yes** |
| Next | `themes/themes.ts` | identical — path only differs | **yes** |

There is exactly one renderer (`renderThemesModule`) for both declared paths, so the four Vite
frameworks cannot diverge, and Next differs only in where the file lives. **One loader, no framework
branches** — which is why discovery is by file name rather than by framework.

## The shape the loader reads

Verified by rendering the module through the real function (`renderThemesModule`) and capturing the
output as `packages/core/test/fixtures/registry/generated-themes.txt`:

```ts
export const themvora = [ defineTheme({ … }), defineTheme({ … }) ];   // hand-written literals
export const selection = ["generated", "themvora", "citrus", "cocoa", "berry"];
export const presetThemes = getPresetThemes().filter(…);
export const sourceThemes = [ defineTheme({ … }), … ];                // JSON.stringify output
export const themes = [...themvora, ...presetThemes, ...sourceThemes];
export const defaultTheme: … = "generated-light";
```

Two literal dialects appear in one file, which is what the first implementation got wrong: the default
pair is a **hand-written object literal with unquoted keys**, while inlined themes are **JSON**. A
reader that assumed JSON rejected the file at line 20. The loader therefore contains a small literal
reader rather than calling `JSON.parse`.

## What `loadThemeRegistry(source)` does

| Step | How |
| --- | --- |
| Find the exports | `themvora`, `selection`, `sourceThemes` by name |
| Read themes | every `defineTheme({ … })` literal in the two arrays, via the literal reader |
| Read selection | the string array literal |
| Resolve presets | `getPresetThemes().filter(family ∈ selection)` — the same call the module makes at runtime |
| Validate | `validateTheme()` on every theme; a failure is `invalid-theme` |
| Order | `themvora` + presets + `sourceThemes`, the module's own order |

It does **not** execute, import, transpile or `eval` the module, and it does not interpret expressions.

### What it refuses

| Construct | Reason | Status in the view |
| --- | --- | --- |
| Not a generated registry (missing the three exports) | `not-a-registry` | `unsupported` |
| `defineTheme(someExpression)` | `unsupported-construct` | `unsupported` |
| `{ ...spread }` inside a theme | `unsupported-construct` | `unsupported` |
| `selection = FAMILIES` | `unsupported-construct` | `unsupported` |
| A theme that fails the schema | `invalid-theme` | `malformed` |

The `unsupported` / `malformed` split is deliberate: the first is our limitation, the second is the
user's file.

## Evidence

| Check | Result |
| --- | --- |
| Core loader tests | **11 passed** — 6 on the real fixture, 5 refusals |
| Extension `inspectProject` | 3 cases: generated → `supported` (10 themes), hand-written → `unsupported`, invalid → `malformed` |
| Extension suite | **388 passed / 33 files** |
| Core suite | **995 passed / 83 files** |
| Host check | `PASS a scaffolded project's themes are read — supported · 10 themes` |
| Host suite | **20/20** dev and packaged |

The fixture's ten themes are 2 defaults + 6 presets (3 selected families × 2 modes) + the generated
pair, which is what the module registers at runtime.

## What this does not do

- **`theme.config.*` is still not read.** It is loaded by the build tool, and reading it means
  executing workspace TypeScript. A project using that file instead of a registry module still reports
  `unsupported`.
- **Hand-written registry modules** that compute their themes stay `unsupported`.
- The CLI does not use the loader yet. It writes these files and reads a header line to extend them;
  routing `add` through the loader is a separate change, and the point of putting the loader in core is
  that it *can* be shared later.
