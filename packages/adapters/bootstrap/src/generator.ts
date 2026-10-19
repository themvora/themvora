import type {
  AdapterPlugin,
  AdapterPluginContext,
  ThemeTokens,
} from "@themvora/core";
import { resolveTokens } from "@themvora/core";
import type { AdapterResolvedTheme } from "@themvora/adapters";
import {
  mixColors,
  readColor,
  readFontFamily,
  readToken,
  rgbTriplet,
} from "@themvora/adapters";
import { resolveBootstrapTheme, deriveBootstrapColors } from "./tokens";
import { createBootstrapRefineContext } from "./refine";

import type { BootstrapColorState } from "./tokens";

export interface BootstrapVariableOptions {
  strategy?: "exact" | "native" | "aggressive";
  plugins?: AdapterPlugin[];
}

function colorKey(theme: AdapterResolvedTheme) {
  return (key: string, fallback?: string) => readColor(theme, key, fallback) ?? "";
}

/** The six Bootstrap "theme colour" roles, in Bootstrap's own order. */
const ROLES = ["primary", "secondary", "success", "danger", "warning", "info"] as const;
type Role = (typeof ROLES)[number];

/** `rgba(r, g, b, a)` from a hex colour, or `undefined` when unparseable. */
function rgba(color: string | undefined, alpha: number): string | undefined {
  if (!color) return undefined;
  const triplet = rgbTriplet(color);
  return triplet ? `rgba(${triplet}, ${alpha})` : undefined;
}

/**
 * Bootstrap's per-role `-text-emphasis` / `-bg-subtle` / `-border-subtle` triad.
 *
 * Derived by mixing the role colour toward the theme's **foreground** (for
 * emphasis) and toward its **background** (for subtle fills). That is what makes
 * the triad mode-correct without branching on `mode`: on a light theme the
 * emphasis lands dark and the subtle fill lands pale, and on a dark theme both
 * invert — exactly what Bootstrap's own dark theme does with hand-picked
 * literals.
 *
 * These triads are load-bearing, not decorative: `.accordion-button:not(.collapsed)`
 * reads `--bs-primary-bg-subtle` / `--bs-primary-text-emphasis` directly, and
 * `.text-primary-emphasis` / `.bg-primary-subtle` / `.border-primary-subtle` are
 * the public utilities.
 */
function triad(color: string | undefined, background: string, foreground: string) {
  if (!color) return undefined;
  return {
    textEmphasis: mixColors(color, foreground, 0.72),
    bgSubtle: mixColors(color, background, 0.86),
    borderSubtle: mixColors(color, background, 0.62),
  };
}

export function generateBootstrapVariables(
  input: ThemeTokens | AdapterResolvedTheme,
  options: BootstrapVariableOptions = {},
): Record<string, string> {
  const theme: AdapterResolvedTheme = resolveBootstrapTheme(input as never);
  const rc = colorKey(theme);
  const present = (value: string | undefined): value is string =>
    typeof value === "string" && value.length > 0;

  const colors = deriveBootstrapColors(theme, rc);

  const state: Record<string, unknown> = { colors };
  const ctx: AdapterPluginContext = createBootstrapRefineContext(
    theme.mode,
    options.strategy ?? "native",
  );

  for (const plugin of options.plugins ?? []) {
    const next = plugin.refine?.(state, ctx);
    if (next) Object.assign(state, next);
  }

  const refinedColors = (state.colors as BootstrapColorState | undefined) ?? colors;

  const background = rc("background");
  const foreground = rc("foreground");
  const border = rc("border");
  const muted = rc("muted");
  const ring = rc("ring");

  const vars: Record<string, string> = {
    /* ---------------------------------------------------------- body -- */
    "--bs-body-bg": background,
    "--bs-body-color": foreground,
    "--bs-body-font-family": readFontFamily(theme.tokens),
    "--bs-body-bg-rgb": rgbTriplet(background) ?? "",
    "--bs-body-color-rgb": rgbTriplet(foreground) ?? "",

    /* ------------------------------------------------- emphasis tiers -- */
    // Bootstrap's three text tiers. `secondary` is dimmed body text,
    // `tertiary` is the faintest — both derived from foreground so they stay
    // legible in either mode.
    "--bs-emphasis-color": foreground,
    "--bs-emphasis-color-rgb": rgbTriplet(foreground) ?? "",
    "--bs-heading-color": foreground,
    "--bs-secondary-color": mixColors(foreground, background, 0.35),
    "--bs-secondary-color-rgb": rgbTriplet(mixColors(foreground, background, 0.35)) ?? "",
    "--bs-tertiary-color": mixColors(foreground, background, 0.5),
    "--bs-tertiary-color-rgb": rgbTriplet(mixColors(foreground, background, 0.5)) ?? "",
    // Surface tiers: `secondary-bg` is the muted surface (dropdown headers,
    // `.list-group-item-action:hover` in some builds), `tertiary-bg` the faintest.
    "--bs-secondary-bg": muted || mixColors(background, foreground, 0.06),
    "--bs-secondary-bg-rgb": rgbTriplet(muted || mixColors(background, foreground, 0.06)) ?? "",
    "--bs-tertiary-bg": mixColors(background, foreground, 0.03),
    "--bs-tertiary-bg-rgb": rgbTriplet(mixColors(background, foreground, 0.03)) ?? "",

    /* -------------------------------------------------------- borders -- */
    "--bs-border-color": border,
    "--bs-border-color-translucent": border
      ? `color-mix(in srgb, ${border} 50%, transparent)`
      : "",
    "--bs-border-width": readToken(theme, "borderWidths", "thin", "1px") ?? "1px",
    "--bs-border-radius":
      readToken(theme, "radius", "md", "0.375rem") ?? "0.375rem",
    "--bs-border-radius-sm":
      readToken(theme, "radius", "sm", "0.25rem") ?? "0.25rem",
    "--bs-border-radius-lg":
      readToken(theme, "radius", "lg", "0.5rem") ?? "0.5rem",
    "--bs-border-radius-xl":
      readToken(theme, "radius", "xl", "1rem") ?? "1rem",

    /* ---------------------------------------------------------- links -- */
    "--bs-link-color": refinedColors.primary ?? rc("primary"),
    "--bs-link-color-rgb": rgbTriplet(refinedColors.primary ?? rc("primary")) ?? "",
    "--bs-link-hover-color": ring || refinedColors.primary || rc("primary"),
    "--bs-link-hover-color-rgb":
      rgbTriplet(ring || refinedColors.primary || rc("primary")) ?? "",

    /* ------------------------------------------------------ focus ring -- */
    // Bootstrap's default is a literal `rgba(13, 110, 253, .25)` at `:root`, so
    // every focus ring stayed Bootstrap blue. Derived from the theme instead.
    "--bs-focus-ring-color":
      rgba(refinedColors.primary ?? rc("primary"), 0.25) ?? "",
    "--bs-focus-ring-width": "0.25rem",
    "--bs-focus-ring-opacity": "0.25",

    /* ------------------------------------------------------- highlight -- */
    "--bs-highlight-color": foreground,
    "--bs-highlight-bg": mixColors(rc("accent") || rc("primary"), background, 0.7),

    /* ------------------------------------------------------------ code -- */
    // Bootstrap hardcodes `#d63384`; that is a *danger-ish* magenta in its own
    // palette, so the semantic equivalent is the theme's destructive role.
    "--bs-code-color": rc("destructive") || foreground,

    /* ------------------------------------------------- form validation -- */
    "--bs-form-valid-color": refinedColors.success ?? "",
    "--bs-form-valid-border-color": refinedColors.success ?? "",
    "--bs-form-invalid-color": refinedColors.danger ?? "",
    "--bs-form-invalid-border-color": refinedColors.danger ?? "",

    /* --------------------------------------------------- light / dark -- */
    // `.btn-dark` / `.btn-light` / `.text-bg-dark` read these. Mapped to the
    // theme's foreground and muted surfaces so they stay coherent in both modes
    // instead of pinning Bootstrap's own near-black / near-white.
    "--bs-dark": foreground,
    "--bs-dark-rgb": rgbTriplet(foreground) ?? "",
    "--bs-light": muted || background,
    "--bs-light-rgb": rgbTriplet(muted || background) ?? "",
  };

  const colorMap: Record<Role, string | undefined> = {
    primary: refinedColors.primary,
    secondary: refinedColors.secondary,
    success: refinedColors.success,
    danger: refinedColors.danger,
    warning: refinedColors.warning,
    info: refinedColors.info,
  };

  /**
   * Contrast colour per role.
   *
   * Themvora names these `<role>Foreground`; Bootstrap has no equivalent
   * concept at all (it hardcodes `#fff` / `#000` per variant), which is the
   * root of the unreadable-content failures. Emitting them lets `bootstrap.css`
   * point every `.btn-*`, `.list-group-item.active`, `.text-bg-*` and
   * `.progress-bar` at the semantic contrast instead of a literal.
   */
  const contrastMap: Record<Role, string | undefined> = {
    primary: rc("primaryForeground") || undefined,
    secondary: rc("secondaryForeground") || undefined,
    success: rc("successForeground") || undefined,
    danger: rc("destructiveForeground") || undefined,
    warning: rc("warningForeground") || rc("accentForeground") || undefined,
    info: rc("accentForeground") || rc("accent") || undefined,
  };

  for (const role of ROLES) {
    const color = colorMap[role];
    if (!present(color)) continue;

    vars[`--bs-${role}`] = color;
    const triplet = rgbTriplet(color);
    if (triplet) vars[`--bs-${role}-rgb`] = triplet;

    const contrast = contrastMap[role];
    if (present(contrast)) vars[`--bs-${role}-foreground`] = contrast;

    const shades = triad(color, background, foreground);
    if (shades) {
      vars[`--bs-${role}-text-emphasis`] = shades.textEmphasis;
      vars[`--bs-${role}-bg-subtle`] = shades.bgSubtle;
      vars[`--bs-${role}-border-subtle`] = shades.borderSubtle;
    }
  }

  let result = vars;
  for (const plugin of options.plugins ?? []) {
    result = plugin.transform?.(result, ctx) ?? result;
  }
  return result;
}

/**
 * Programmatic alternative to `bootstrap.css`. Returns concrete Bootstrap 5
 * CSS variable values — including `-rgb` companion variables that plain CSS
 * cannot derive.
 *
 * @deprecated prefer `generateBootstrapVariables` or `createBootstrapAdapter`.
 */
export function createBootstrapVariables(tokens: ThemeTokens): Record<string, string> {
  const theme: AdapterResolvedTheme = {
    name: "__bootstrap__",
    mode: undefined,
    tokens: resolveTokens(tokens),
  };
  return generateBootstrapVariables(theme);
}
