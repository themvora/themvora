import {
  createTheme,
  defaultVariantColorsResolver,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from "@mantine/core";
import {
  mixColors,
  resolveAdapterSource,
  type AdapterResolvedTheme,
  type AdapterSource,
  generateShades,
  readBreakpoints,
  readColor,
  readFontFamily,
  readFontSize,
  readRadiusNumber,
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

/** Builds a ten-shade Mantine tuple from ten explicit stops. */
function tuple(stops: string[]): MantineColorsTuple {
  return stops as unknown as MantineColorsTuple;
}

/**
 * Maps Themvora's neutral roles onto Mantine's two neutral ramps.
 *
 * Mantine does not read the page, card or popover surface from the brand
 * palette — it reads them from `--mantine-color-body`, `--mantine-color-default`
 * and the `dark`/`gray` ramps, all of which are Mantine's *own* greys unless the
 * theme replaces them. That is why a dark Themvora theme still rendered light
 * grey cards: the brand colours changed, the surfaces did not.
 *
 * The ramps below are built from the theme's own neutrals, in Mantine's shade
 * order (`0` lightest → `9` darkest), so every component that addresses
 * `dark-4`, `dark-6` or `gray-3` lands on the corresponding Themvora role.
 */
function neutralRamps(theme: AdapterResolvedTheme) {
  const c = (key: string, fallback: string) => readColor(theme, key, fallback) ?? fallback;
  const page = c("background", "#ffffff");
  const surface = c("card", page);
  const muted = c("muted", mixColors(surface, page, 0.5));
  const border = c("border", muted);
  const foreground = c("foreground", "#000000");
  const mutedForeground = c("mutedForeground", mixColors(foreground, page, 0.4));

  // `gray` follows Mantine's fixed convention: `0` is the lightest step and `9`
  // the darkest, in **both** schemes. It is not a "page → text" ramp.
  //
  // The distinction matters because Mantine reads fixed indices out of it. The
  // `light` variant paints `alpha(colors[color][4], 0.15)` and sets its text to
  // `colors[color][1]`, so a ramp built page-first is inverted for a dark theme:
  // `gray-1` becomes the page colour and the initials render near-black on a
  // dark tint (measured `#1d1d1e` on `rgba(90,90,92,0.15)` over `#141415`).
  // Building the ramp lightest-first and reversing it for dark themes keeps the
  // index meanings intact.
  const ascending = [
    page,
    muted,
    mixColors(muted, border, 0.5),
    border,
    mixColors(border, foreground, 0.2),
    mixColors(border, foreground, 0.35),
    mutedForeground,
    mixColors(mutedForeground, foreground, 0.4),
    mixColors(mutedForeground, foreground, 0.7),
    foreground,
  ];
  const gray = tuple(theme.mode === "dark" ? [...ascending].reverse() : ascending);

  // Dark ramp, Mantine's dark convention: `6` is the card surface, `7` the page.
  const dark = tuple([
    mixColors(border, surface, 0.2),
    mixColors(border, surface, 0.4),
    mixColors(border, surface, 0.6),
    mixColors(border, surface, 0.8),
    border,
    muted,
    surface,
    page,
    mixColors(page, "#000000", 0.25),
    mixColors(page, "#000000", 0.5),
  ]);

  return { gray, dark };
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
  const neutrals = neutralRamps(theme);

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
    success: c("successForeground", "#ffffff"),
    warning: c("warningForeground", "#ffffff"),
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
      primary: generateShades(primary, 10, 6) as unknown as MantineColorsTuple,
      secondary: generateShades(c("secondary", primary) ?? primary, 10, 6) as unknown as MantineColorsTuple,
      accent: generateShades(c("accent", primary) ?? primary, 10, 6) as unknown as MantineColorsTuple,
      destructive: generateShades(c("destructive", "#fa5252") ?? "#fa5252", 10, 6) as unknown as MantineColorsTuple,
      // The semantic ramps Mantine components address by name (`color="green"`,
      // `color="red"`, Alert, Progress, notification icons). Without them a
      // themed alert falls back to Mantine's stock green/red instead of the
      // theme's success/destructive.
      success: generateShades(c("success", "#40c057") ?? "#40c057", 10, 6) as unknown as MantineColorsTuple,
      warning: generateShades(c("warning", "#fab005") ?? "#fab005", 10, 6) as unknown as MantineColorsTuple,
      gray: neutrals.gray,
      dark: neutrals.dark,
    },
    // `defaultColor` is not a theme key in Mantine 7 — the neutral ramp a
    // component reads is chosen by the component and the active scheme. Both
    // ramps above are therefore built from the theme's own neutrals, so either
    // choice lands on Themvora's surfaces.
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
    /**
     * Surfaces that Mantine cannot express through its own variables.
     *
     * Mantine resolves the page *and* `Paper`/`Card` backgrounds from the single
     * `--mantine-color-body` variable, so a theme with distinct `background` and
     * `card` roles has nowhere to put the difference: cards end up the same
     * colour as the page, which is exactly what "surfaces look identical in dark
     * mode" reports.
     *
     * `Paper` is Mantine's surface primitive — `Card` is built on it — so the
     * role is restored once, here, by pointing the component at Themvora's own
     * tokens. The values are `var(--theme-*)` rather than literals so a theme
     * family change repaints without rebuilding the Mantine theme.
     */
    components: {
      Paper: {
        styles: {
          root: {
            backgroundColor: "var(--theme-color-card, var(--theme-color-background))",
            borderColor: "var(--theme-color-border)",
          },
        },
      },
      Card: {
        styles: {
          root: {
            backgroundColor: "var(--theme-color-card, var(--theme-color-background))",
            borderColor: "var(--theme-color-border)",
          },
        },
      },
      Modal: {
        styles: {
          content: { backgroundColor: "var(--theme-color-popover, var(--theme-color-card))" },
          header: { backgroundColor: "transparent" },
        },
      },
      Menu: {
        styles: {
          dropdown: { backgroundColor: "var(--theme-color-popover, var(--theme-color-card))" },
        },
      },
    },
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

/**
 * Builds the CSS-variable overrides Mantine's provider applies on top of its
 * generated variables.
 *
 * Mantine resolves component colours through a fixed set of variables —
 * `--mantine-color-body`, `--mantine-color-default`, `--mantine-color-default-border`,
 * `--mantine-color-text`, `--mantine-color-dimmed`, `--mantine-color-anchor` —
 * and only lets a theme replace them through `cssVariablesResolver`. Mapping the
 * palette without mapping these left Card, Paper, inputs, borders and dimmed
 * text on Mantine's stock greys: the brand colours were themed, the surfaces
 * were not.
 *
 * The same map is returned for both schemes because the resolved theme already
 * *is* the active mode; whichever scheme Mantine applies, the values are the
 * ones Themvora resolved.
 *
 * @param source A runtime, a store, or a resolved theme.
 * @returns A Mantine `CSSVariablesResolver`.
 *
 * @see {@link MantineThemeProvider}
 */
export function createMantineCssVariables(source: AdapterSource): CSSVariablesResolver {
  const theme = resolveAdapterSource(source);
  const c = (key: string, fallback: string) => readColor(theme, key, fallback) ?? fallback;

  const page = c("background", theme.mode === "dark" ? "#141517" : "#ffffff");
  const surface = c("card", page);
  const muted = c("muted", mixColors(surface, page, 0.5));
  const border = c("border", muted);
  const foreground = c("foreground", theme.mode === "dark" ? "#e9ecef" : "#000000");
  const mutedForeground = c("mutedForeground", mixColors(foreground, page, 0.4));
  const primary = c("primary", "#3b5bdb");
  const destructive = c("destructive", "#fa5252");

  const variables = {
    "--mantine-color-body": page,
    "--mantine-color-text": foreground,
    "--mantine-color-dimmed": mutedForeground,
    "--mantine-color-bright": foreground,
    "--mantine-color-placeholder": mutedForeground,
    "--mantine-color-anchor": primary,
    "--mantine-color-error": destructive,
    "--mantine-color-default": surface,
    "--mantine-color-default-hover": muted,
    "--mantine-color-default-color": foreground,
    "--mantine-color-default-border": border,
  };

  return () => ({ variables: {}, light: variables, dark: variables });
}
