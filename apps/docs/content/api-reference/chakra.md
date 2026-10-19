## @themvora/chakra
Themvora Chakra UI adapter.

Bridges a Themvora runtime to Chakra UI's theme: `ChakraThemeProvider`,
`buildChakraTheme`, and the runtime adapter (`createChakraAdapter` /
`useChakraTheme`).

> Generated from `packages/chakra/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `buildChakraConfig(theme): { breakpoints: Record<string, string>; semanticTokens: { colors: { accentForeground: TokenValue; background: TokenValue; border: TokenValue; card: TokenValue; cardForeground: TokenValue; destructiveForeground: TokenValue; foreground: TokenValue; input: TokenValue; muted: TokenValue; mutedForeground: TokenValue; popover: TokenValue; popoverForeground: TokenValue; primaryContrast: TokenValue; ring: TokenValue; secondary: TokenValue; secondaryForeground: TokenValue } }; tokens: { colors: { accent: Record<string, TokenValue>; destructive: Record<string, TokenValue>; primary: Record<string, TokenValue>; secondary: Record<string, TokenValue> }; fonts: { body: TokenValue; heading: TokenValue; mono: TokenValue }; radii: { 2xl: TokenValue; lg: TokenValue; md: TokenValue; sm: TokenValue; xl: TokenValue; xs: TokenValue } } }`
Builds the Chakra UI (v3) theme config from Themvora semantic tokens.

**See also:** `ChakraThemeProvider`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `theme` | `AdapterResolvedTheme` | — |

**Returns** `{ breakpoints: Record<string, string>; semanticTokens: { colors: { accentForeground: TokenValue; background: TokenValue; border: TokenValue; card: TokenValue; cardForeground: TokenValue; destructiveForeground: TokenValue; foreground: TokenValue; input: TokenValue; muted: TokenValue; mutedForeground: TokenValue; popover: TokenValue; popoverForeground: TokenValue; primaryContrast: TokenValue; ring: TokenValue; secondary: TokenValue; secondaryForeground: TokenValue } }; tokens: { colors: { accent: Record<string, TokenValue>; destructive: Record<string, TokenValue>; primary: Record<string, TokenValue>; secondary: Record<string, TokenValue> }; fonts: { body: TokenValue; heading: TokenValue; mono: TokenValue }; radii: { 2xl: TokenValue; lg: TokenValue; md: TokenValue; sm: TokenValue; xl: TokenValue; xs: TokenValue } } }`

---


### `ChakraThemeProvider<T extends ThemeDefinition<string>>(__namedParameters): Element`
`<ChakraThemeProvider runtime={runtime}>` — wraps Chakra's own `ChakraProvider`
with a system derived from Themvora's semantic tokens.

The provider owns the derived Chakra system: it subscribes to the runtime and
rebuilds the system whenever the active theme changes, so the wrapped subtree
always renders with the current theme selection.

**See also:** `useChakraTheme`

**Returns** `Element`

```ts
import { ChakraThemeProvider } from "@themvora/chakra";

<ChakraThemeProvider runtime={runtime}>
  <App />
</ChakraThemeProvider>
```

---


### `createChakraAdapter<T extends ThemeDefinition<string>>(_options): ChakraThemeAdapter<T>`
Runtime-owned Chakra UI adapter. On install it subscribes to the Themvora
store and rebuilds the Chakra system whenever the active theme changes. The
generated system is available through `getSnapshot` for React consumption.

**See also:** `createChakraAdapter`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `_options` | `CreateChakraAdapterOptions` | — |

**Returns** `ChakraThemeAdapter<T>`

---


### `createChakraTheme(source): SystemContext`
Creates a Chakra UI system from a Themvora source.

```ts
import { createChakraTheme } from "@themvora/chakra";
const system = createChakraTheme(runtime);
```

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `source` | `AdapterSource` | — |

**Returns** `SystemContext`

---


### `useChakraTheme<T extends ThemeDefinition<string>>(runtime): SystemContext`
Subscribes to a Themvora runtime and returns a Chakra UI system that is
rebuilt automatically whenever the active theme changes.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<T>` | — |

**Returns** `SystemContext`

---

## Interfaces

### `ChakraAdapterOptions`
Options for the Chakra UI adapter.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `strategy` (optional) | `AdapterStrategy` | How faithfully the adapter reproduces Chakra UI's native feel. |

---


### `ChakraThemeAdapter<T extends ThemeDefinition>`

**Extends** `ThemeAdapter<T>`
A Chakra UI adapter that exposes its generated system synchronously via
`getSnapshot` / `subscribe`, so both the runtime-owned registry and React
(`useSyncExternalStore`) can consume it.

| Member | Type | Description |
| ------ | ---- | ----------- |
| readonly `id` | `string` | Stable identifier used for reference counting and deduplication. |
| readonly `optional` (optional) | `{ colors?: readonly string[] }` | Roles the adapter *can* use but does not require. These are capabilities: `warning` and `info` are genuine semantic roles that many libraries have no slot for. An adapter lists them here and degrades gracefully when the theme omits them — by deriving a value, or by omitting the library token entirely. **Never by fabricating one**, which would look like support while nothing consumed it. |
| readonly `requires` (optional) | `{ colors?: readonly string[]; tokens?: readonly string[] }` | The semantic roles this adapter cannot function without. Declaring requirements turns a silent, per-library failure into a checkable contract. Without it, an adapter that needs `primaryForeground` and finds nothing simply emits a variable with an empty value, and the component renders unreadable content — which is exactly the class of defect the integration laboratory kept finding. A role listed here must resolve; an adapter may assume it is present. |
| `getSnapshot` | `SystemContext \| null` | — |
| `install` | `void` | — |
| `subscribe` | `__type(): void` | — |
| `supports` | `boolean` | — |
| `uninstall` | `void` | — |

---


### `ChakraThemeProviderProps<T extends ThemeDefinition>`
Props for ChakraThemeProvider.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `children` | `ReactNode` | The React subtree rendered inside Chakra's `ChakraProvider`. |
| `runtime` | `ThemeRuntime<T>` | The Themvora runtime whose active theme drives the Chakra system. |

---


### `CreateChakraAdapterOptions`

**Extends** `ChakraAdapterOptions`
Options for createChakraAdapter.

**See also:** `createChakraAdapter`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `strategy` (optional) | `AdapterStrategy` | How faithfully the adapter reproduces Chakra UI's native feel. |

---

## Variables

### `CHAKRA_ADAPTER_ID`
The adapter id registered by the Chakra UI adapter.

**See also:** `createChakraAdapter`

`"chakra"`

---


### `DEFAULT_CHAKRA_OPTIONS`
Defaults for ChakraAdapterOptions.

`Required<ChakraAdapterOptions>`

---

## Related docs

- [Chakra UI](/libraries/chakra) — the adapter integration
