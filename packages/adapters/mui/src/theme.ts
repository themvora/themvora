import { createTheme, type Theme, type ThemeOptions } from "@mui/material/styles";
import {
  resolveAdapterSource,
  type AdapterResolvedTheme,
  type AdapterSource,
  readBreakpoints,
  readColor,
  readFontFamily,
  readFontSize,
  readRadiusNumber,
  readToken,
  rgbTriplet,
} from "@themvora/adapters";

/**
 * Integration options for {@link createMuiTheme}.
 *
 * @see {@link createMuiTheme}
 * @see {@link buildMuiThemeOptions}
 */
export interface MuiThemeIntegrationOptions {
  /**
   * Font family to apply to MUI's typography.
   *
   * Use this when the application loads its font outside the theme (a Google
   * font imported in global CSS) **and** renders `CssBaseline`, whose `body`
   * rule would otherwise inherit from `<html>` instead of the application's
   * `body`. When omitted, the theme's own `typography.fontFamilies` token wins;
   * when the theme defines none, MUI is told to inherit the document font
   * rather than being forced onto `system-ui`.
   */
  fontFamily?: string;
  /**
   * Theme-change duration in milliseconds, mapped onto MUI's own `transitions`
   * scale so MUI-owned animations match Themvora's.
   *
   * Pass the same value as the runtime's `transition.duration` to keep the two
   * engines in step. Defaults to MUI's own scale when omitted.
   */
  transitionDuration?: number;
  /**
   * Theme-change easing, mapped onto MUI's `transitions.easing.easeInOut`.
   * Pass the runtime's `transition.easing` to keep the two in step.
   */
  transitionEasing?: string;
}

/**
 * Maps Themvora semantic tokens onto a Material UI theme.
 *
 * ```ts
 * import { createMuiTheme } from "@themvora/mui";
 * const muiTheme = createMuiTheme(runtime);
 * ```
 *
 * @param source - A runtime, store, theme definition or token object.
 * @param options - Integration options (font family, transition timing).
 * @returns A MUI `Theme`.
 */
export function createMuiTheme(
  source: AdapterSource,
  options: MuiThemeIntegrationOptions = {},
): Theme {
  const resolved = resolveAdapterSource(source);
  return createTheme(buildMuiThemeOptions(resolved, options));
}

interface ResolvedColor {
  main: string;
  contrastText?: string;
}

/**
 * A colour at a given alpha, used for MUI's `action.*` overlay tokens.
 *
 * Falls back to the colour unchanged when it is not a parseable hex — MUI
 * accepts any CSS colour string, and an unparseable one should still be passed
 * through rather than dropped.
 */
function withAlpha(color: string, alpha: number): string {
  const triplet = rgbTriplet(color);
  return triplet ? `rgba(${triplet}, ${alpha})` : color;
}

function color(
  main: string | undefined,
  contrast?: string | undefined,
  fallback = "#1976d2",
): ResolvedColor {
  const result: ResolvedColor = { main: main ?? fallback };
  if (contrast) result.contrastText = contrast;
  return result;
}

function buildShadows(theme: AdapterResolvedTheme): ThemeOptions["shadows"] {
  const byIndex = [
    "xs",
    "sm",
    "sm",
    "md",
    "md",
    "md",
    "lg",
    "lg",
    "lg",
    "lg",
    "lg",
    "xl",
    "xl",
    "xl",
    "xl",
    "xl",
    "2xl",
    "2xl",
    "2xl",
    "2xl",
    "2xl",
    "2xl",
    "2xl",
  ];
  const result: string[] = ["none"];
  for (let i = 1; i < 25; i++) {
    const key = byIndex[i - 1] ?? "lg";
    result.push(readToken(theme, "shadows", key) ?? "none");
  }
  return result as ThemeOptions["shadows"];
}

function ensure(value: string | undefined, fallback: string): string {
  return value ?? fallback;
}

/**
 * Builds a Material UI `ThemeOptions` from a resolved Themvora theme.
 *
 * Maps Themvora semantic tokens (colors, radius, typography, shadows,
 * breakpoints) onto MUI's palette, shape, typography, shadows and breakpoints.
 * The palette mode follows the resolved theme mode.
 *
 * @param theme The resolved theme to map from.
 * @returns A Material UI `ThemeOptions` object.
 *
 * @see {@link MuiThemeProvider}
 */
export function buildMuiThemeOptions(
  theme: AdapterResolvedTheme,
  integration: MuiThemeIntegrationOptions = {},
): ThemeOptions {
  const c = (key: string, fallback?: string) => readColor(theme, key, fallback);
  const background = ensure(
    c("background", theme.mode === "dark" ? "#121212" : "#ffffff"),
    theme.mode === "dark" ? "#121212" : "#ffffff",
  );
  const foreground = ensure(
    c("foreground", theme.mode === "dark" ? "#ffffff" : "#000000"),
    theme.mode === "dark" ? "#ffffff" : "#000000",
  );
  const isDark = theme.mode === "dark";
  const resolvedTransitions = buildMuiTransitions(integration);

  const options: ThemeOptions = {
    palette: {
      mode: isDark ? "dark" : "light",
      primary: color(c("primary"), c("primaryForeground")),
      secondary: color(
        c("secondary"),
        c("secondaryForeground"),
        isDark ? "#b0bec5" : "#455a64",
      ),
      error: color(c("destructive"), c("destructiveForeground"), "#f44336"),
      warning: color(c("accent"), c("accentForeground"), "#ff9800"),
      info: color(c("info", c("accent")), c("infoForeground")),
      success: color(c("success", c("accent")), c("successForeground")),
      background: {
        default: background,
        paper: ensure(c("card", background), background),
      },
      text: {
        primary: foreground,
        secondary: ensure(c("mutedForeground", foreground), foreground),
      },
      divider: ensure(c("border", isDark ? "#424242" : "#e0e0e0"), isDark ? "#424242" : "#e0e0e0"),
      action: {
        // MUI hardcodes these as black/white alphas (`rgba(0,0,0,.04)` and
        // friends), which assumes a neutral grey palette. Deriving them from the
        // theme's *foreground* keeps hover/selected/focus overlays the same hue
        // as the palette — a tinted theme such as plum otherwise gets a grey
        // wash on its interactive surfaces.
        hover: withAlpha(foreground, isDark ? 0.08 : 0.04),
        selected: withAlpha(foreground, isDark ? 0.16 : 0.08),
        focus: withAlpha(foreground, 0.12),
        // MUI ships defaults for these, but they are its own neutral alphas
        // rather than anything the theme chose.
        disabled: withAlpha(foreground, 0.38),
        disabledBackground: withAlpha(foreground, 0.12),
        disabledOpacity: 0.38,
      },
    },
    shape: {
      borderRadius: readRadiusNumber(theme, "lg", 8),
    },
    typography: {
      // A theme that declares no font family must not impose one. MUI's own
      // default is Roboto, and this adapter used to fall back to
      // `system-ui, sans-serif`; either way MUI's typography rule is a *class*
      // rule with its own family, so an application that loads its font through
      // global CSS (a Google font on `body`) styled everything except MUI.
      // `"inherit"` makes MUI follow the document font instead — the behaviour a
      // consumer expects — without Themvora hardcoding or downloading a font.
      fontFamily: integration.fontFamily ?? (readFontFamily(theme.tokens, "") || "inherit"),
      fontSize: toFontSizePx(readFontSize(theme.tokens)),
    },
    shadows: buildShadows(theme),
    breakpoints: {
      values: toBreakpointValues(theme),
    },
    // MUI's own animations (ripples, hover fades) are the only transitions it
    // runs on a palette change, and they use this scale. Mapping Themvora's
    // configured duration/easing onto it keeps the two engines from using
    // visibly different timings for the same theme change.
    ...(resolvedTransitions
      ? { transitions: resolvedTransitions }
      : {}),
  };

  return options;
}

/**
 * Map Themvora's transition timing onto MUI's `transitions` scale.
 *
 * @internal
 */
function buildMuiTransitions(
  options: MuiThemeIntegrationOptions,
): ThemeOptions["transitions"] | undefined {
  const duration = options.transitionDuration;
  const easing = options.transitionEasing;
  if (duration === undefined && easing === undefined) return undefined;

  const result: NonNullable<ThemeOptions["transitions"]> = {};

  if (duration !== undefined) {
    // MUI's scale is a set of named durations; a theme change should be one
    // length, so every entry gets it. `complex`/`enteringScreen` are the ones
    // MUI's own overlays use and were the visible mismatch.
    result.duration = {
      shortest: Math.round(duration * 0.5),
      shorter: Math.round(duration * 0.75),
      short: Math.round(duration * 0.9),
      standard: duration,
      complex: duration,
      enteringScreen: duration,
      leavingScreen: Math.round(duration * 0.75),
    };
  }

  if (easing !== undefined) {
    result.easing = {
      easeInOut: easing,
      easeOut: easing,
      easeIn: easing,
      sharp: easing,
    };
  }

  return result;
}

function toBreakpointValues(theme: AdapterResolvedTheme): Record<"xs" | "sm" | "md" | "lg" | "xl", number> {
  const raw = readBreakpoints(theme.tokens, {});
  return {
    xs: 0,
    sm: toPxNumber(raw.sm ?? "600px"),
    md: toPxNumber(raw.md ?? "900px"),
    lg: toPxNumber(raw.lg ?? "1200px"),
    xl: toPxNumber(raw.xl ?? "1536px"),
  };
}

function toPxNumber(value: string): number {
  const px = /^([\d.]+)px$/.exec(value.trim());
  if (px) return Number(px[1]);
  const rem = /^([\d.]+)rem$/.exec(value.trim());
  if (rem) return Number(rem[1]) * 16;
  const number = Number(value.trim());
  return Number.isFinite(number) ? number : 600;
}

function toFontSizePx(value: string): number {
  const px = /^([\d.]+)px$/.exec(value.trim());
  if (px) return Number(px[1]);
  const rem = /^([\d.]+)rem$/.exec(value.trim());
  if (rem) return Number(rem[1]) * 16;
  const em = /^([\d.]+)em$/.exec(value.trim());
  if (em) return Number(em[1]) * 16;
  const number = Number(value.trim());
  return Number.isFinite(number) ? number : 14;
}