## @themvora/bootstrap/react
React hook for the Bootstrap adapter (`@themvora/bootstrap/react`).

`useBootstrapTheme(runtime, options?)` installs the Bootstrap adapter onto
an explicitly provided Themvora runtime and disposes it on unmount.

> Generated from `packages/bootstrap/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `useBootstrapTheme<T extends ThemeDefinition<string>>(runtime, options?): void`
React hook that installs the Bootstrap adapter onto the given Themvora
runtime. The adapter maintains a tagged `:root` style element containing
concrete `--bs-*` variables (including `-rgb` triplets) and keeps them in
sync as the theme changes.

Call once in your app root, passing the runtime from your Themvora
provider (e.g. the `useThemeRuntime()` hook from `@themvora/react`):

```tsx
import { useBootstrapTheme } from "@themvora/bootstrap/react";

function App() {
  useBootstrapTheme(runtime);
  return <YourApp />;
}
```

**See also:** `createBootstrapAdapter`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<T>` | The active Themvora runtime to install the adapter on. |
| `options` | `{ strategy?: AdapterStrategy }` (optional) | Adapter options. Defaults to `{}`. |

**Returns** `void`

---

## Related docs

- [Bootstrap](/libraries/bootstrap) — the adapter integration
