## @themvora/daisyui/vue
Vue composable for the daisyUI adapter (`@themvora/daisyui/vue`).

`useDaisyTheme(runtime, options?)` installs the daisyUI adapter onto an
explicitly provided Themvora runtime and disposes it on unmount.

> Generated from `packages/daisyui/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `useDaisyTheme<T extends ThemeDefinition<string>>(runtime, options): ThemeAdapter<T>`
Vue composable that installs the daisyUI adapter onto the given Themvora
runtime. Maintains a tagged `:root` style element with concrete `--color-*`
variables, kept in sync as the active theme changes.

Must be called in a component's `setup` scope, passing the runtime from your
Themvora provider (e.g. `useThemeRuntime()` from `@themvora/vue`):

```ts
import { useDaisyTheme } from "@themvora/daisyui/vue";

useDaisyTheme(runtime);
```

**See also:** ``createDaisyAdapter``

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<T>` | The active Themvora runtime to install the adapter on. |
| `options` | `UseAdapterOptions` | Adapter options. Defaults to `{}`. |

**Returns** `ThemeAdapter<T>` — The installed adapter instance.

---

## Interfaces

### `UseAdapterOptions`
Options accepted by the adapter composables (e.g. useDaisyTheme).

| Member | Type | Description |
| ------ | ---- | ----------- |
| `strategy` (optional) | `AdapterStrategy` | The adapter strategy to use. When omitted, the adapter's default strategy applies. |

---

## Related docs

- [daisyUI](/libraries/daisyui) — the adapter integration
