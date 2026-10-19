## @themvora/mui
Themvora MUI adapter.

Bridges a Themvora runtime to MUI's theme: `MuiThemeProvider`,
`buildMuiThemeOptions`, and the runtime adapter (`createMuiAdapter` /
`useMuiTheme`).

> Generated from `packages/mui/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `buildMuiThemeOptions(theme): ThemeOptions`
Builds a Material UI `ThemeOptions` from a resolved Themvora theme.

Maps Themvora semantic tokens (colors, radius, typography, shadows,
breakpoints) onto MUI's palette, shape, typography, shadows and breakpoints.
The palette mode follows the resolved theme mode.

**See also:** `MuiThemeProvider`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `theme` | `AdapterResolvedTheme` | The resolved theme to map from. |

**Returns** `ThemeOptions` — A Material UI `ThemeOptions` object.

---


### `createMuiAdapter<T extends ThemeDefinition<string>>(_options): MuiThemeAdapter<T>`
Runtime-owned Material UI adapter. On install it subscribes to the Themvora
store and rebuilds a MUI `Theme` whenever the active theme changes. The
generated theme is available through `getSnapshot` for React consumption.

**See also:** `createMuiAdapter`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `_options` | `CreateMuiAdapterOptions` | — |

**Returns** `MuiThemeAdapter<T>`

---


### `createMuiTheme(source): Theme`
Maps Themvora semantic tokens onto a Material UI theme.

```ts
import { createMuiTheme } from "@themvora/mui";
const muiTheme = createMuiTheme(runtime);
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `source` | `AdapterSource` | — |

**Returns** `Theme`

---


### `MuiThemeProvider<T extends ThemeDefinition<string>>(__namedParameters): Element`
`<MuiThemeProvider runtime={runtime}>` — wraps MUI's own `ThemeProvider` with
a theme derived from Themvora's semantic tokens.

The provider owns the derived MUI theme: it subscribes to the runtime and
rebuilds the theme whenever the active theme changes, so the wrapped subtree
always renders with the current theme selection.

**See also:** `useMuiTheme`

**Returns** `Element`

```ts
import { MuiThemeProvider } from "@themvora/mui";

<MuiThemeProvider runtime={runtime}>
  <App />
</MuiThemeProvider>
```

---


### `useMuiTheme<T extends ThemeDefinition<string>>(runtime): Theme`
Subscribes to a Themvora runtime and returns a Material UI theme that is
rebuilt automatically whenever the active theme changes.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<T>` | — |

**Returns** `Theme`

---

## Interfaces

### `CreateMuiAdapterOptions`

**Extends** `MuiAdapterOptions`
Options for createMuiAdapter.

**See also:** `createMuiAdapter`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `strategy` (optional) | `AdapterStrategy` | How faithfully the adapter reproduces Material UI's native feel. |

---


### `MuiAdapterOptions`
Options for the Material UI adapter.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `strategy` (optional) | `AdapterStrategy` | How faithfully the adapter reproduces Material UI's native feel. |

---


### `MuiThemeAdapter<T extends ThemeDefinition>`

**Extends** `ThemeAdapter<T>`
A Material UI adapter that exposes its generated theme synchronously via
`getSnapshot` / `subscribe`, so both the runtime-owned registry and React
(`useSyncExternalStore`) can consume it.

| Member | Type | Description |
| ------ | ---- | ----------- |
| readonly `id` | `string` | Stable identifier used for reference counting and deduplication. |
| readonly `optional` (optional) | `{ colors?: readonly string[] }` | Roles the adapter *can* use but does not require. These are capabilities: `warning` and `info` are genuine semantic roles that many libraries have no slot for. An adapter lists them here and degrades gracefully when the theme omits them — by deriving a value, or by omitting the library token entirely. **Never by fabricating one**, which would look like support while nothing consumed it. |
| readonly `requires` (optional) | `{ colors?: readonly string[]; tokens?: readonly string[] }` | The semantic roles this adapter cannot function without. Declaring requirements turns a silent, per-library failure into a checkable contract. Without it, an adapter that needs `primaryForeground` and finds nothing simply emits a variable with an empty value, and the component renders unreadable content — which is exactly the class of defect the integration laboratory kept finding. A role listed here must resolve; an adapter may assume it is present. |
| `getSnapshot` | `Theme \| null` | — |
| `install` | `void` | — |
| `subscribe` | `__type(): void` | — |
| `supports` | `boolean` | — |
| `uninstall` | `void` | — |

---


### `MuiThemeProviderProps<T extends ThemeDefinition>`
Props for MuiThemeProvider.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `children` | `ReactNode` | The React subtree rendered inside MUI's `ThemeProvider`. |
| `runtime` | `ThemeRuntime<T>` | The Themvora runtime whose active theme drives the MUI theme. |

---

## Variables

### `DEFAULT_MUI_OPTIONS`
Defaults for MuiAdapterOptions.

`Required<MuiAdapterOptions>`

---


### `MUI_ADAPTER_ID`
The adapter id registered by the Material UI adapter.

**See also:** `createMuiAdapter`

`"mui"`

---

## Related docs

- [Material UI](/libraries/mui) — the adapter integration
