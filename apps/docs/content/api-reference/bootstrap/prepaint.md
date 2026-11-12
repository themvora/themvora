## @themvora/bootstrap/prepaint
Pre-paint CSS for Bootstrap's variable layer.

> Generated from `packages/bootstrap/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `createBootstrapPrePaintCss<T extends ThemeDefinition<string>>(options): string`
Builds the stylesheet that defines Bootstrap's variables before first paint.

```tsx
// a server component
import { createBootstrapPrePaintCss } from "@themvora/bootstrap/prepaint";
const css = createBootstrapPrePaintCss();
// <style dangerouslySetInnerHTML={{ __html: css }} />
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `options` | `BootstrapPrePaintOptions<T>` | Registry and the theme to emit as `:root`. |

**Returns** `string` — CSS text, or an empty string when nothing could be generated.

---

## Interfaces

### `BootstrapPrePaintOptions<T extends ThemeDefinition>`
Options for createBootstrapPrePaintCss.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `defaultTheme` (optional) | `ThemeIdentifier<T>` | Theme whose block is emitted as the bare `:root` rule. |
| `themes` (optional) | `readonly T[]` | The theme registry. Defaults to the built-in themes. |

---

## Related docs

- [Bootstrap](/libraries/bootstrap) — the adapter integration
