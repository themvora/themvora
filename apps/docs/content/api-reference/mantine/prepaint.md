## @themvora/mantine/prepaint
Pre-paint CSS for Mantine's own variables.

> Generated from `packages/mantine/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `createMantinePrePaintCss(source): string`
Builds the `:root` rule that defines Mantine's variables before first paint.

```tsx
// app/layout.tsx (a server component)
import { createMantinePrePaintCss } from "@themvora/mantine/prepaint";
import { getBuiltInThemes } from "@themvora/core";

const css = createMantinePrePaintCss({ themes: getBuiltInThemes(), defaultTheme: "plum-light" });
// <style dangerouslySetInnerHTML={{ __html: css }} />
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `source` | `AdapterSource \| MantinePrePaintOptions<ThemeDefinition<string>>` | A runtime, a store, a resolved theme, or a registry plus the selection to resolve. |

**Returns** `string` — A CSS string, or an empty string when the source cannot be resolved.

---

## Interfaces

### `MantinePrePaintOptions<T extends ThemeDefinition>`
A registry plus the selection to resolve, for callers without a runtime.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `defaultTheme` (optional) | `ThemeIdentifier<T>` | — |
| `initialMode` (optional) | `ThemeMode` | — |
| `themes` | `readonly T[]` | — |

---

## Related docs

- [Mantine](/libraries/mantine) — the adapter integration
