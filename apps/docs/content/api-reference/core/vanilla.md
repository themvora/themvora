## @themvora/core/vanilla
Themvora vanilla runtime — a thin imperative wrapper over the core
runtime for plain-JavaScript applications.

Imported from the `@themvora/core/vanilla` subpath. Avoids React
dependency entirely and exposes the same runtime, DOM, CSS-variable, and
transition machinery through a `Themvora` facade.

> Generated from `packages/core/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `generateTheme(options): GeneratedThemePair`
Generate a cohesive light/dark theme pair from a single seed color.

Light and dark are generated **independently** from the same identity — the
dark theme is not an inversion of the light one — so the brand hue survives
the mode change. Every semantic pair is solved to the contrast contract with a
safety margin before the theme is returned, and the seed is recorded in
`meta.generation` as provenance.

**See also:** `validateTheme`, `defineTheme`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `options` | `GenerateThemeOptions` | The seed color and generation options. |

**Returns** `GeneratedThemePair` — A `{ light, dark }` pair of theme definitions sharing one family.

```ts
const { light, dark } = generateTheme({ seed: "#d97706", family: "brand" });
```

---

## Classes

### `class Themvora`
Framework-free drop-in theming with `@themvora/core`.

```js
import { Themvora } from "@themvora/core/vanilla";

const kit = new Themvora();
kit.setMode("dark");
kit.setFamily("plum");
kit.on("themeChange", (theme) => console.log(theme.name));
```

| Member | Type | Description |
| ------ | ---- | ----------- |
| `constructor` | `Themvora` | — |
| `family` | `void` | — |
| `mode` | `void` | — |
| `providedThemes` | `void` | — |
| `registry` | `void` | — |
| `runtime` | `void` | — |
| `schedule` | `void` | — |
| `theme` | `void` | — |
| `themes` | `void` | — |
| `destroy` | `void` | — |
| `off` | `void` | — |
| `on` | `__type(): void` | — |
| `setFamily` | `void` | — |
| `setMode` | `void` | — |
| `setThemeOverride` | `void` | — |
| `toCSSVariables` | `Record<string, string>` | — |
| `toggleTheme` | `void` | — |
| `update` | `void` | — |
| `use` | `void` | — |
| `init` | `Themvora` | — |

---

## Interfaces

### `GeneratedThemePair`
The light and dark themes produced by generateTheme.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `dark` | `ThemeDefinition` | The generated dark theme. |
| `light` | `ThemeDefinition` | The generated light theme. |

---


### `GenerateThemeOptions`
Options for generateTheme.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `algorithm` (optional) | `string` | Generation algorithm to use. Omitted means the current algorithm. Present so a caller can pin a shipped theme to the algorithm that produced it. |
| `contrast` (optional) | `"AA"` | Contrast level to solve for. Only `"AA"` is implemented; it is also the default, so omitting this changes nothing. The type deliberately admits no other value rather than accepting one and quietly ignoring it. |
| `family` (optional) | `string` | Theme family name used for the generated themes' `meta.family` and names. |
| `seed` | `string` | Hex color seed (e.g. `"#d97706"`) that drives the generated palette. |
| `style` (optional) | `GenerationStyle` | Visual language to generate in. Omitted means `"balanced"`, which is the behavior existing callers already get. |
| `withCode` (optional) | `boolean` | Also generate a `tokens.code` block (syntax-highlighting colors) alongside the color tokens. Opt-in — most themes don't need code tokens. |

---


### `ProvidedThemeFamily<T extends ThemeDefinition>`
A discoverable theme family: every variant the provider was given for one
canonical family, in the order they were supplied.

**See also:** `normalizeProvidedThemes`, `createProvidedThemesSource`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `family` | `string` | The canonical family identifier used for selection. |
| `id` | `string` | Stable identifier for this family. Derived from the canonical family identity (`meta.family`, or `"default"`), so it survives a change of display label and is unique within one provider. |
| `meta` (optional) | `ThemeMeta` | Roll-up of the family's metadata, taken from its first variant that carries any. Per-variant values live on ProvidedThemeVariant.meta. |
| `name` | `string` | Display name for the family: the first variant's `meta.label`, else the family identifier. |
| `provenance` (optional) | `ProvidedThemeProvenance` | Provenance declared by the family's first variant that declares one. Absent when nothing in the input declares provenance — the API never guesses a source from a name. |
| `variants` | `readonly ProvidedThemeVariant<T>[]` | The family's variants, in supplied order. Never empty. |

```ts
const themes = useProvidedThemes();

return themes.map((family) => (
  <fieldset key={family.id}>
    <legend>{family.name}</legend>
    {family.variants.map((variant) => (
      <button key={variant.name} onClick={() => setTheme(variant.name)}>
        {variant.mode}
      </button>
    ))}
  </fieldset>
));
```

---


### `ProvidedThemeVariant<T extends ThemeDefinition>`
One variant of a theme family: a single registered theme definition.

**See also:** `ProvidedThemeFamily`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `meta` (optional) | `ThemeMeta` | The metadata supplied with this variant, exactly as the provider holds it. This is the authoritative per-variant metadata; the family-level `meta` is a documented roll-up of it. |
| `mode` | `ThemeMode` | The variant's resolved colour mode. |
| `name` | `string` | The theme's registered name, e.g. `"mint-dark"`. |
| `theme` | `T` | The definition the provider holds for this variant. Reading a field the grouped view does not model (a custom `extends`, an application-specific extension) is always possible from here. |
| `tokens` | `ThemeTokens` | The variant's semantic tokens, resolved. Token references, `auto()` / `contrast()` calls and expressions are already evaluated, so a consumer can read a value directly (`tokens.colors?.primary`) without re-running the resolver. |

---


### `ThemeDefinition<Name extends ThemeName>`
A theme definition: a name plus optional metadata and token values.

**See also:** `defineTheme`, `extendTheme`, `composeTheme`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `extends` (optional) | `Name \| readonly Name[]` | Names of themes this definition extends. Extending merges the base themes' tokens before applying this definition's own tokens. |
| `meta` (optional) | `ThemeMeta` | Metadata describing the theme family, mode, and presentation labels. |
| `name` | `Name` | Stable theme identifier used for selection and lookup. |
| `tokens` (optional) | `ThemeTokens` | Semantic token values consumed by the runtime. When omitted, the theme inherits tokens entirely from its extended bases. |

---


### `ThemeOverrideSelection`
A family/mode request. Either field may be omitted; the omitted one is taken
from the selection the provider would otherwise have used.

**See also:** `ThemeOverride`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `family` (optional) | `string` | Theme family to apply. Must be one the provider was given. |
| `mode` (optional) | `ThemeMode` | Mode to apply within the family. |

---


### `ThemeRegistry<T extends ThemeDefinition>`
A collection of registered theme definitions with deduplication,
inheritance-ready metadata stamps, and family queries.

The registry stores theme *definitions*; resolution of `extends` chains
and token references happens separately via resolveTheme.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `themes` | `void` | — |
| `batch` | `void` | — |
| `clear` | `void` | — |
| `destroy` | `void` | — |
| `get` | `T \| undefined` | — |
| `getFamilies` | `string[]` | — |
| `getThemesByFamily` | `T[]` | — |
| `has` | `boolean` | — |
| `list` | `readonly T[]` | — |
| `register` | `boolean` | — |
| `registerMany` | `number` | — |
| `replace` | `boolean` | — |
| `subscribe` | `__type(): void` | — |
| `unregister` | `boolean` | — |
| `use` | `void` | — |

---


### `ThemeTokens`
Semantic token values consumed by the runtime.

Top-level groups map to CSS variable namespaces (`--theme-color-*`,
`--theme-spacing-*`, …) when bound to the DOM by the runtime.

**See also:** `themeToCSSVariables`, `resolveTokens`

| Member | Type | Description |
| ------ | ---- | ----------- |
| `borderWidths` (optional) | `Record<string, string>` | Border width values. |
| `breakpoints` (optional) | `Record<string, string>` | Responsive breakpoint values. |
| `code` (optional) | `CodeTokens` | Opt-in semantic colors for code and syntax surfaces. |
| `colors` (optional) | `ThemeColors` | Semantic color values. |
| `radius` (optional) | `Record<string, string>` | Border radius scale values. |
| `shadows` (optional) | `Record<string, string>` | Shadow values (typically CSS box-shadow strings). |
| `spacing` (optional) | `Record<string, string>` | Spacing scale values (typically CSS lengths). |
| `typography` (optional) | `{ fontFamilies?: Record<string, string>; fontSizes?: Record<string, string>; lineHeights?: Record<string, string> }` | Typography scale values. |
| `zIndex` (optional) | `Record<string, string>` | Z-index values. |

---


### `ThemvoraOptions`
Options for creating a Themvora instance.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `defaultTheme` (optional) | `string` | Default theme name when no persisted selection exists. |
| `initialFamily` (optional) | `string` | Initial family. Ignored if a theme was previously persisted in localStorage. |
| `initialMode` (optional) | `ThemeMode` | Initial mode: `"light"`, `"dark"`, or `"system"`. Ignored if a theme was previously persisted in localStorage. |
| `scheduled` (optional) | `false \| ScheduledThemeOptions<ThemeDefinition<string>>` | Sunrise/sunset solar scheduling config. Automatically applies light/dark themes at sunrise/sunset. |
| `target` (optional) | `HTMLElement \| Document` | Target element for CSS custom properties and `data-theme` attributes. Defaults to `document.documentElement`. |
| `themeOverride` (optional) | `ThemeOverride<string>` | Explicit theme override applied over any persisted selection. |
| `themes` (optional) | `readonly ThemeDefinition<string>[]` | Custom set of themes. Defaults to all built-in themes. |
| `transition` (optional) | `boolean \| ThemeTransitionOptions` | Theme transition config. `false` disables transitions, `true` enables defaults, an object customizes the transition. |

---

## Type Aliases

### `ProvidedThemeProvenance`
Provenance a theme definition declares about itself.

Only markers the library itself writes are read — `meta.generation.kind` for
generator output and a `pack:<name>` tag for an installed theme pack. Nothing
is inferred from a theme's name, family or colours: a theme called
`mint-light` is not thereby a preset.

**See also:** `ProvidedThemeFamily.provenance`

`{ algorithm: string; kind: "generated" } | { kind: "pack"; pack: string }`

---


### `ThemeMode`
The color-mode dimension of a theme selection.

- `"light"` and `"dark"` are explicit modes.
- `"system"` follows the visitor's `prefers-color-scheme` preference and
  resolves to `"light"` or `"dark"` at selection time.

`"light" | "dark" | "system"`

---


### `ThemeOverride<Name extends string>`
An explicit theme override.

Three equivalent ways to name the same thing:

- a **variant** (`"mint-dark"`) applies exactly that definition,
- a **family** (`"mint"`) applies the variant the provider resolves for the
  mode already in effect,
- a **family/mode object** (`{ family: "mint", mode: "dark" }`) states both.

All three are resolved against the provider's own registry through
resolveThemeReference, so an override cannot name a theme the provider
does not have, and the family form cannot pick "whichever variant came first".

**See also:** `resolveThemeOverride`, `themeOverrideKey`

`Name | ThemeOverrideSelection`

```ts
// `themes` is the registry the provider was given.
const themes = getBuiltInThemes();

<ThemeProvider themes={themes} themeOverride="mint-dark">{children}</ThemeProvider>
<ThemeProvider themes={themes} themeOverride="mint">{children}</ThemeProvider>
<ThemeProvider themes={themes} themeOverride={{ family: "mint" }}>{children}</ThemeProvider>
```

---


### `ThemePack<T extends ThemeDefinition>`
A named collection of theme definitions installable as a group.

Themes installed through `use` receive a `pack:<name>` tag and replace
any existing theme with the same name.

`void`

---

## Related docs

- [Themes](/custom-themes) — A theme is a named, immutable definition of semantic tokens with light/dark variants that the runtime resolves and applies.
- [Theme Discovery & Overrides](/advanced-features) — A provider exposes exactly the themes it was given — grouped by family, with variants and resolved tokens — and accepts an explicit one-shot themeOverride that outranks a saved selection.
- [Runtime](/architecture) — One runtime per app owns the store, selection, registry, history, lifecycle and adapters; every framework binding is a thin view over it.
- [Theme generation](/theme-studio) — Generate a complete, accessible light/dark theme pair from a single seed color, ready to drop into the runtime.
