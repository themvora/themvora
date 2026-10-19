## @themvora/antd
Themvora Ant Design adapter.

Bridges a Themvora runtime to Ant Design's theme: `AntdThemeProvider`,
`buildAntdConfig`, and the runtime adapter (`createAntdAdapter` /
`useAntdTheme`).

> Generated from `packages/antd/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `AntdThemeProvider<T extends ThemeDefinition<string>>(__namedParameters): Element`
`<AntdThemeProvider runtime={runtime}>` — wraps Ant Design's own
`ConfigProvider` with a theme derived from Themvora's semantic tokens.

The provider owns the derived Ant Design theme: it subscribes to the runtime
and rebuilds the theme whenever the active theme changes, so the wrapped
subtree always renders with the current theme selection.

**See also:** `useAntdTheme`

**Returns** `Element`

```ts
import { AntdThemeProvider } from "@themvora/antd";

<AntdThemeProvider runtime={runtime}>
  <App />
</AntdThemeProvider>
```

---


### `buildAntdConfig(theme): ThemeConfig`
Builds an Ant Design `ThemeConfig` from a resolved Themvora theme.

Maps Themvora semantic tokens (colors, radius, typography) onto Ant Design's
design tokens and component overrides. The algorithm is Ant's default
algorithm; the palette follows the resolved theme mode.

**See also:** `AntdThemeProvider`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `theme` | `AdapterResolvedTheme` | The resolved theme to map from. |

**Returns** `ThemeConfig` — An Ant Design `ThemeConfig` object.

---


### `createAntdAdapter<T extends ThemeDefinition<string>>(_options): AntdThemeAdapter<T>`
Runtime-owned Ant Design adapter. On install it subscribes to the Themvora
store and rebuilds the `ThemeConfig` whenever the active theme changes. The
generated config is available through `getSnapshot` for React consumption.

**See also:** `createAntdAdapter`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `_options` | `CreateAntdAdapterOptions` | — |

**Returns** `AntdThemeAdapter<T>`

---


### `createAntdTheme(source): ThemeConfig`
Maps Themvora semantic tokens onto an Ant Design theme config.

```ts
import { createAntdTheme } from "@themvora/antd";
const antdTheme = createAntdTheme(runtime);
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `source` | `AdapterSource` | — |

**Returns** `ThemeConfig`

---


### `useAntdTheme<T extends ThemeDefinition<string>>(runtime): ThemeConfig`
Subscribes to a Themvora runtime and returns an Ant Design theme config that
is rebuilt automatically whenever the active theme changes.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<T>` | — |

**Returns** `ThemeConfig`

---

## Interfaces

### `AntdAdapterOptions`
Options for the Ant Design adapter.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `strategy` (optional) | `AdapterStrategy` | How faithfully the adapter reproduces Ant Design's native feel. |

---


### `AntdThemeAdapter<T extends ThemeDefinition>`

**Extends** `ThemeAdapter<T>`
An Ant Design adapter that exposes its generated theme config synchronously
via `getSnapshot` / `subscribe`, so both the runtime-owned registry and React
(`useSyncExternalStore`) can consume it.

| Member | Type | Description |
| ------ | ---- | ----------- |
| readonly `id` | `string` | Stable identifier used for reference counting and deduplication. |
| readonly `optional` (optional) | `{ colors?: readonly string[] }` | Roles the adapter *can* use but does not require. These are capabilities: `warning` and `info` are genuine semantic roles that many libraries have no slot for. An adapter lists them here and degrades gracefully when the theme omits them — by deriving a value, or by omitting the library token entirely. **Never by fabricating one**, which would look like support while nothing consumed it. |
| readonly `requires` (optional) | `{ colors?: readonly string[]; tokens?: readonly string[] }` | The semantic roles this adapter cannot function without. Declaring requirements turns a silent, per-library failure into a checkable contract. Without it, an adapter that needs `primaryForeground` and finds nothing simply emits a variable with an empty value, and the component renders unreadable content — which is exactly the class of defect the integration laboratory kept finding. A role listed here must resolve; an adapter may assume it is present. |
| `getSnapshot` | `ThemeConfig \| null` | — |
| `install` | `void` | — |
| `subscribe` | `__type(): void` | — |
| `supports` | `boolean` | — |
| `uninstall` | `void` | — |

---


### `AntdThemeProviderProps<T extends ThemeDefinition>`
Props for AntdThemeProvider.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `children` | `ReactNode` | The React subtree rendered inside Ant Design's `ConfigProvider`. |
| `runtime` | `ThemeRuntime<T>` | The Themvora runtime whose active theme drives the Ant Design theme. |

---


### `CreateAntdAdapterOptions`

**Extends** `AntdAdapterOptions`
Options for createAntdAdapter.

**See also:** `createAntdAdapter`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `strategy` (optional) | `AdapterStrategy` | How faithfully the adapter reproduces Ant Design's native feel. |

---

## Variables

### `ANTD_ADAPTER_ID`
The adapter id registered by the Ant Design adapter.

**See also:** `createAntdAdapter`

`"antd"`

---


### `DEFAULT_ANTD_OPTIONS`
Defaults for AntdAdapterOptions.

`Required<AntdAdapterOptions>`

---

## Related docs

- [Ant Design](/libraries/antd) — the adapter integration
