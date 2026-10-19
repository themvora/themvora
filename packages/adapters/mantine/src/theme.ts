import { createTheme, defaultVariantColorsResolver } from "@mantine/core";
import {
  resolveAdapterSource,
  type AdapterResolvedTheme,
  type AdapterSource,
  generateShades,
  readBreakpoints,
  readColor,
  readFontFamily,
  readFontSize,
  readRadiusNumber,
  readToken,
} from "@themvora/adapters";

const DEFAULT_SPACING: Record<string, string> = {
  xs: "0.625rem",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.25rem",
  xl: "2rem",
};

const DEFAULT_FONT_SIZES: Record<string, string> = {
  xs: "0.75rem",
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
};

const DEFAULT_LINE_HEIGHTS: Record<string, string> = {
  xs: "1.4",
  sm: "1.45",
  md: "1.55",
  lg: "1.6",
  xl: "1.65",
};

const DEFAULT_SHADOWS: Record<string, string> = {
  xs: "0 1px 2px rgba(0,0,0,0.05)",
  sm: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
  md: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)",
  lg: "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)",
  xl: "0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)",
};

function readMap(
  theme: AdapterResolvedTheme,
  category: "spacing" | "shadows",
  keys: string[],
  defaults: Record<string, string>,
): Record<string, string> {
  const section = theme.tokens[category] as Record<string, unknown> | undefined;
  const result: Record<string, string> = {};
  for (const key of keys) {
    const token = section?.[key];
    if (typeof token === "string") {
      result[key] = token;
    } else if (defaults[key]) {
      result[key] = defaults[key];
    }
  }
  return result;
}

/**
 * Maps Themvora semantic tokens onto a Mantine theme.
 *
 * ```ts
 * import { createMantineTheme } from "@themvora/mantine";
 * const mantineTheme = createMantineTheme(runtime);
 * ```
 *
 * @see {@link MantineThemeProvider}
 */
export function createMantineTheme(source: AdapterSource) {
  const theme = resolveAdapterSource(source);
  const c = (key: string, fallback?: string) => readColor(theme, key, fallback);

  const primary = c("primary", "#3b5bdb") ?? "#3b5bdb";
  const family = readFontFamily(theme.tokens);
  const monoFamily = readFontFamily(theme.tokens, "ui-monospace, monospace");
  const radius = readRadiusNumber(theme, "lg", 12);

  const spacing = readMap(theme, "spacing", ["xs", "sm", "md", "lg", "xl"], DEFAULT_SPACING);
  const shadows = readMap(theme, "shadows", ["xs", "sm", "md", "lg", "xl"], DEFAULT_SHADOWS);

  /**
   * Content colour for each palette name this adapter registers, taken from the
   * theme's declared `<role>Foreground`.
   *
   * Keyed by the same names passed to `createTheme({ colors })` below, because
   * that is what `variantColorResolver` receives back as `input.color`.
   */
  const CONTRAST_BY_COLOR: Record<string, string | undefined> = {
    primary: c("primaryForeground", "#ffffff"),
    secondary: c("secondaryForeground", c("foreground")),
    accent: c("accentForeground", c("foreground")),
    destructive: c("destructiveForeground", "#ffffff"),
  };

  return createTheme({
    primaryColor: "primary",
    // Both modes must read the shade that holds the theme's primary — index 6,
    // where `generateShades` places the base. `dark` used to point at 8, so a
    // filled button in dark mode rendered the base blended toward black rather
    // than the primary the theme declared. A dark-appropriate primary colour is
    // the theme's job (its dark theme already supplies a lighter one), not the
    // adapter's.
    primaryShade: { light: 6, dark: 6 },
    // Superseded by `variantColorResolver` below: Mantine's own auto-contrast
    // can only ever choose between `--mantine-color-black` and
    // `--mantine-color-white`, so leaving it on would imply Mantine is deciding
    // the content colour when Themvora is.
    autoContrast: false,
    // Themvora owns the content colour on a coloured surface.
    //
    // `defaultVariantColorsResolver` picks the filled variant's text colour from
    // luminance alone — `--mantine-color-black` or `--mantine-color-white` —
    // and it can never honour the contrast colour a theme actually declares.
    // `variantColorResolver` is Mantine's documented theme extension point, so
    // the declared `<role>Foreground` is substituted there rather than by
    // overriding component CSS. Components that resolve colours this way
    // (Button, Badge, ActionIcon, Alert, Avatar, …) all follow from the one
    // override.
    variantColorResolver: (input) => {
      const resolved = defaultVariantColorsResolver(input);
      // Only `filled` paints the role colour as the *background*. The other
      // variants use it as the content colour, where a contrast value does not
      // apply.
      if (input.variant !== "filled") return resolved;
      const contrast = input.color ? CONTRAST_BY_COLOR[input.color] : undefined;
      return contrast ? { ...resolved, color: contrast } : resolved;
    },
    colors: {
      primary: generateShades(primary, 10, 6) as [string, string, string, string, string, string, string, string, string, string],
      secondary: generateShades(c("secondary", primary) ?? primary, 10, 6) as [string, string, string, string, string, string, string, string, string, string],
      accent: generateShades(c("accent", primary) ?? primary, 10, 6) as [string, string, string, string, string, string, string, string, string, string],
      destructive: generateShades(c("destructive", "#fa5252") ?? "#fa5252", 10, 6) as [string, string, string, string, string, string, string, string, string, string],
    },
    fontFamily: family,
    fontFamilyMonospace: monoFamily,
    headings: {
      fontFamily: family,
      sizes: {
        h1: { fontSize: readFontSize(theme.tokens, "xl", "2.5rem") },
        h2: { fontSize: readFontSize(theme.tokens, "lg", "2rem") },
        h3: { fontSize: readFontSize(theme.tokens, "lg", "1.5rem") },
        h4: { fontSize: readFontSize(theme.tokens, "md", "1.25rem") },
        h5: { fontSize: readFontSize(theme.tokens, "sm", "1.125rem") },
        h6: { fontSize: readFontSize(theme.tokens, "sm", "1rem") },
      },
    },
    radius: {
      xs: `${Math.round(radius * 0.5)}px`,
      sm: `${Math.round(radius * 0.75)}px`,
      md: `${Math.round(radius * 0.9)}px`,
      lg: `${radius}px`,
      xl: `${Math.round(radius * 1.25)}px`,
    },
    defaultRadius: "lg",
    spacing,
    fontSizes: {
      xs: readFontSize(theme.tokens, "xs", DEFAULT_FONT_SIZES.xs),
      sm: readFontSize(theme.tokens, "sm", DEFAULT_FONT_SIZES.sm),
      md: readFontSize(theme.tokens, "md", DEFAULT_FONT_SIZES.md),
      lg: readFontSize(theme.tokens, "lg", DEFAULT_FONT_SIZES.lg),
      xl: readFontSize(theme.tokens, "xl", DEFAULT_FONT_SIZES.xl),
    },
    lineHeights: { ...DEFAULT_LINE_HEIGHTS },
    shadows,
    breakpoints: readBreakpoints(theme.tokens, {
      xs: "36em",
      sm: "48em",
      md: "62em",
      lg: "75em",
      xl: "88em",
    }),
  });
}