## @themvora/mantine
Themvora Mantine integration.

Provides `MantineThemeProvider` (bridges a Themvora runtime to Mantine's
theme) and the `buildMantineTheme` helper.

> Generated from `packages/mantine/src` by `apps/docs/scripts/generate-api-reference.mjs`. Do not edit by hand — run `pnpm --filter @themvora/docs api:generate`.

## Functions

### `createMantineCssVariables(source): CSSVariablesResolver`
Builds the CSS-variable overrides Mantine's provider applies on top of its
generated variables.

Mantine resolves component colours through a fixed set of variables —
`--mantine-color-body`, `--mantine-color-default`, `--mantine-color-default-border`,
`--mantine-color-text`, `--mantine-color-dimmed`, `--mantine-color-anchor` —
and only lets a theme replace them through `cssVariablesResolver`. Mapping the
palette without mapping these left Card, Paper, inputs, borders and dimmed
text on Mantine's stock greys: the brand colours were themed, the surfaces
were not.

The same map is returned for both schemes because the resolved theme already
*is* the active mode; whichever scheme Mantine applies, the values are the
ones Themvora resolved.

**See also:** `MantineThemeProvider`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `source` | `AdapterSource` | A runtime, a store, or a resolved theme. |

**Returns** `CSSVariablesResolver` — A Mantine `CSSVariablesResolver`.

---


### `createMantineTheme(source): { activeClassName?: string; autoContrast?: boolean; black?: string; breakpoints?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; colors?: { blue?: MantineColorsTuple; cyan?: MantineColorsTuple; dark?: MantineColorsTuple; grape?: MantineColorsTuple; gray?: MantineColorsTuple; green?: MantineColorsTuple; indigo?: MantineColorsTuple; lime?: MantineColorsTuple; orange?: MantineColorsTuple; pink?: MantineColorsTuple; red?: MantineColorsTuple; teal?: MantineColorsTuple; violet?: MantineColorsTuple; yellow?: MantineColorsTuple } { [key: string & object]: MantineColorsTuple | undefined }; components?: { [key: string]: { classNames?: any; defaultProps?: any; styles?: any; vars?: any } | undefined }; cursorType?: "default" | "pointer"; defaultGradient?: { deg?: number; from?: string; to?: string }; defaultRadius?: MantineRadius; focusClassName?: string; focusRing?: "auto" | "always" | "never"; fontFamily?: string; fontFamilyMonospace?: string; fontSizes?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; fontSmoothing?: boolean; headings?: { fontFamily?: string; fontWeight?: string; sizes?: { h1?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h2?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h3?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h4?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h5?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h6?: { fontSize?: string; fontWeight?: string; lineHeight?: string } }; textWrap?: "wrap" | "nowrap" | "balance" | "pretty" | "stable" }; lineHeights?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; luminanceThreshold?: number; other?: { [key: string]: any }; primaryColor?: string; primaryShade?: MantineColorShade | { dark?: MantineColorShade | undefined; light?: MantineColorShade | undefined }; radius?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; respectReducedMotion?: boolean; scale?: number; shadows?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; spacing?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: number]: string | undefined } { [key: string & object]: string | undefined }; variantColorResolver?: VariantColorsResolver; white?: string }`
Maps Themvora semantic tokens onto a Mantine theme.

```ts
import { createMantineTheme } from "@themvora/mantine";
const mantineTheme = createMantineTheme(runtime);
```

**See also:** `MantineThemeProvider`

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `source` | `AdapterSource` | — |

**Returns** `{ activeClassName?: string; autoContrast?: boolean; black?: string; breakpoints?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; colors?: { blue?: MantineColorsTuple; cyan?: MantineColorsTuple; dark?: MantineColorsTuple; grape?: MantineColorsTuple; gray?: MantineColorsTuple; green?: MantineColorsTuple; indigo?: MantineColorsTuple; lime?: MantineColorsTuple; orange?: MantineColorsTuple; pink?: MantineColorsTuple; red?: MantineColorsTuple; teal?: MantineColorsTuple; violet?: MantineColorsTuple; yellow?: MantineColorsTuple } { [key: string & object]: MantineColorsTuple | undefined }; components?: { [key: string]: { classNames?: any; defaultProps?: any; styles?: any; vars?: any } | undefined }; cursorType?: "default" | "pointer"; defaultGradient?: { deg?: number; from?: string; to?: string }; defaultRadius?: MantineRadius; focusClassName?: string; focusRing?: "auto" | "always" | "never"; fontFamily?: string; fontFamilyMonospace?: string; fontSizes?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; fontSmoothing?: boolean; headings?: { fontFamily?: string; fontWeight?: string; sizes?: { h1?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h2?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h3?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h4?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h5?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h6?: { fontSize?: string; fontWeight?: string; lineHeight?: string } }; textWrap?: "wrap" | "nowrap" | "balance" | "pretty" | "stable" }; lineHeights?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; luminanceThreshold?: number; other?: { [key: string]: any }; primaryColor?: string; primaryShade?: MantineColorShade | { dark?: MantineColorShade | undefined; light?: MantineColorShade | undefined }; radius?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; respectReducedMotion?: boolean; scale?: number; shadows?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; spacing?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: number]: string | undefined } { [key: string & object]: string | undefined }; variantColorResolver?: VariantColorsResolver; white?: string }`

---


### `MantineThemeProvider<T extends ThemeDefinition<string>>(__namedParameters): Element`
`<MantineThemeProvider runtime={runtime}>` — wraps Mantine's own
`MantineProvider` with a theme derived from Themvora's semantic tokens.
The Mantine color scheme is forced to match the active Themvora mode so
Mantine's built-in dark styles stay in sync.

The provider owns the derived Mantine theme: it subscribes to the runtime
and rebuilds the theme whenever the active theme changes, so the wrapped
subtree always renders with the current theme selection.

It also supplies the `cssVariablesResolver`. Mantine paints cards, inputs and
borders from its own variables (`--mantine-color-body`,
`--mantine-color-default`, `--mantine-color-default-border`, …); without the
resolver those stay on Mantine's stock greys no matter what the palette says,
which is what made dark-mode surfaces indistinguishable from each other.

**See also:** `createMantineTheme`

**Returns** `Element`

```ts
import { MantineThemeProvider } from "@themvora/mantine";

<MantineThemeProvider runtime={runtime}>
  <App />
</MantineThemeProvider>
```

---


### `useMantineCssVariables<T extends ThemeDefinition<string>>(runtime): CSSVariablesResolver`
Subscribes to a Themvora runtime and returns the CSS-variable resolver that
puts the theme's surfaces, text and border roles on Mantine's own variables.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<T>` | — |

**Returns** `CSSVariablesResolver`

---


### `useMantineTheme<T extends ThemeDefinition<string>>(runtime): { activeClassName?: string; autoContrast?: boolean; black?: string; breakpoints?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; colors?: { blue?: MantineColorsTuple; cyan?: MantineColorsTuple; dark?: MantineColorsTuple; grape?: MantineColorsTuple; gray?: MantineColorsTuple; green?: MantineColorsTuple; indigo?: MantineColorsTuple; lime?: MantineColorsTuple; orange?: MantineColorsTuple; pink?: MantineColorsTuple; red?: MantineColorsTuple; teal?: MantineColorsTuple; violet?: MantineColorsTuple; yellow?: MantineColorsTuple } { [key: string & object]: MantineColorsTuple | undefined }; components?: { [key: string]: { classNames?: any; defaultProps?: any; styles?: any; vars?: any } | undefined }; cursorType?: "default" | "pointer"; defaultGradient?: { deg?: number; from?: string; to?: string }; defaultRadius?: MantineRadius; focusClassName?: string; focusRing?: "auto" | "always" | "never"; fontFamily?: string; fontFamilyMonospace?: string; fontSizes?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; fontSmoothing?: boolean; headings?: { fontFamily?: string; fontWeight?: string; sizes?: { h1?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h2?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h3?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h4?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h5?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h6?: { fontSize?: string; fontWeight?: string; lineHeight?: string } }; textWrap?: "wrap" | "nowrap" | "balance" | "pretty" | "stable" }; lineHeights?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; luminanceThreshold?: number; other?: { [key: string]: any }; primaryColor?: string; primaryShade?: MantineColorShade | { dark?: MantineColorShade | undefined; light?: MantineColorShade | undefined }; radius?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; respectReducedMotion?: boolean; scale?: number; shadows?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; spacing?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: number]: string | undefined } { [key: string & object]: string | undefined }; variantColorResolver?: VariantColorsResolver; white?: string }`
Subscribes to a Themvora runtime and returns a Mantine theme that is rebuilt
automatically whenever the active theme changes.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `runtime` | `ThemeRuntime<T>` | — |

**Returns** `{ activeClassName?: string; autoContrast?: boolean; black?: string; breakpoints?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; colors?: { blue?: MantineColorsTuple; cyan?: MantineColorsTuple; dark?: MantineColorsTuple; grape?: MantineColorsTuple; gray?: MantineColorsTuple; green?: MantineColorsTuple; indigo?: MantineColorsTuple; lime?: MantineColorsTuple; orange?: MantineColorsTuple; pink?: MantineColorsTuple; red?: MantineColorsTuple; teal?: MantineColorsTuple; violet?: MantineColorsTuple; yellow?: MantineColorsTuple } { [key: string & object]: MantineColorsTuple | undefined }; components?: { [key: string]: { classNames?: any; defaultProps?: any; styles?: any; vars?: any } | undefined }; cursorType?: "default" | "pointer"; defaultGradient?: { deg?: number; from?: string; to?: string }; defaultRadius?: MantineRadius; focusClassName?: string; focusRing?: "auto" | "always" | "never"; fontFamily?: string; fontFamilyMonospace?: string; fontSizes?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; fontSmoothing?: boolean; headings?: { fontFamily?: string; fontWeight?: string; sizes?: { h1?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h2?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h3?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h4?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h5?: { fontSize?: string; fontWeight?: string; lineHeight?: string }; h6?: { fontSize?: string; fontWeight?: string; lineHeight?: string } }; textWrap?: "wrap" | "nowrap" | "balance" | "pretty" | "stable" }; lineHeights?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; luminanceThreshold?: number; other?: { [key: string]: any }; primaryColor?: string; primaryShade?: MantineColorShade | { dark?: MantineColorShade | undefined; light?: MantineColorShade | undefined }; radius?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; respectReducedMotion?: boolean; scale?: number; shadows?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: string & object]: string | undefined }; spacing?: { lg?: string; md?: string; sm?: string; xl?: string; xs?: string } { [key: number]: string | undefined } { [key: string & object]: string | undefined }; variantColorResolver?: VariantColorsResolver; white?: string }`

---

## Interfaces

### `MantineThemeProviderProps<T extends ThemeDefinition>`
Props for MantineThemeProvider.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `children` | `ReactNode` | The React subtree rendered inside Mantine's `MantineProvider`. |
| `runtime` | `ThemeRuntime<T>` | The Themvora runtime whose active theme drives the Mantine theme. |

---

## Related docs

- [Mantine](/libraries/mantine) — the adapter integration
