## @themvora/bootstrap/solid
Solid composable for the Bootstrap adapter (`@themvora/bootstrap/solid`).

`useBootstrapTheme(runtime, options?)` installs the Bootstrap adapter onto
an explicitly provided Themvora runtime and disposes it on cleanup.

> Generated from `packages/bootstrap/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `useBootstrapTheme<T extends ThemeDefinition<string>>(runtime, options): ThemeAdapter<T>`
Solid composable that installs the Bootstrap adapter onto the given Theme
Kit runtime. Maintains a tagged `:root` style element with concrete
`--bs-*` variables (including `-rgb` triplets), kept in sync as the active
theme changes.

Must be called within a Solid reactive root, passing the runtime from your
Themvora provider (e.g. `useThemeRuntime()` from `@themvora/solid`):

```tsx
import { useBootstrapTheme } from "@themvora/bootstrap/solid";

function App() {
  useBootstrapTheme(runtime);
  return <YourApp />;
}
```

**See also:** ``createBootstrapAdapter``

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<T>` | The active Themvora runtime to install the adapter on. |
| `options` | `UseAdapterOptions` | Adapter options. Defaults to `{}`. |

**Returns** `ThemeAdapter<T>` — The installed adapter instance.

---

## Interfaces

### `UseAdapterOptions`
Options accepted by the Solid adapter composables
(e.g. useBootstrapTheme).

| Member | Type | Description |
| ------ | ---- | ----------- |
| `strategy` (optional) | `AdapterStrategy` | The adapter strategy to use. When omitted, the adapter's default strategy applies. |

---

## Related docs

- [Bootstrap](/libraries/bootstrap) — the adapter integration
