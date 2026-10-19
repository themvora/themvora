## @themvora/shadcn/react
React hook for the shadcn/ui adapter (`@themvora/shadcn/react`).

`useShadcnTheme(runtime, options?)` installs the shadcn adapter onto an
explicitly provided Themvora runtime and disposes it on unmount.

> Generated from `packages/shadcn/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `useShadcnTheme<T extends ThemeDefinition<string>>(runtime, options?): void`
React hook that installs the shadcn adapter onto the given Themvora
runtime. The adapter maintains a tagged `:root` style element containing
concrete `--*` variables in sync as the theme changes.

Call once in your app root, passing the runtime from your Themvora
provider (e.g. the `useThemeRuntime()` hook from `@themvora/react`):

```tsx
import { useShadcnTheme } from "@themvora/shadcn/react";

function App() {
  useShadcnTheme(runtime);
  return <YourApp />;
}
```

**See also:** `createShadcnAdapter`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<T>` | The active Themvora runtime to install the adapter on. |
| `options` | `{ strategy?: AdapterStrategy }` (optional) | Adapter options. Defaults to `{}`. |

**Returns** `void`

---

## Related docs

- [shadcn/ui](/libraries/shadcn) — the adapter integration
