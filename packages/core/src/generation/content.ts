/**
 * Content generator — the text hierarchy.
 *
 * `foreground` is the strongest text, then `secondaryForeground`, then
 * `mutedForeground`. The ordering is enforced here so that a later contrast
 * repair cannot accidentally invert the hierarchy while fixing a ratio.
 *
 * @packageDocumentation
 */
import { contrastRatio, oklchToRgb, type Oklch } from "../color";
import { neutral, neutralChroma, neutralHue } from "./neutral";
import type { ContentRoles, PaletteContext } from "./types";

/** Light-mode content lightnesses: dark text on a light canvas. */
const LIGHT_FOREGROUND = 0.22;
const LIGHT_SECONDARY_FOREGROUND = 0.26;
const LIGHT_MUTED_FOREGROUND = 0.52;

/** Dark-mode content lightnesses: light text on a dark canvas. */
const DARK_FOREGROUND = 0.95;
const DARK_SECONDARY_FOREGROUND = 0.93;
const DARK_MUTED_FOREGROUND = 0.72;

/**
 * Generate the content (text) roles for a mode.
 */
export function generateContent(ctx: PaletteContext): ContentRoles {
  if (ctx.mode === "light") {
    return {
      foreground: neutral(ctx, LIGHT_FOREGROUND, 1.5),
      cardForeground: neutral(ctx, LIGHT_FOREGROUND, 1.5),
      popoverForeground: neutral(ctx, LIGHT_FOREGROUND, 1.5),
      secondaryForeground: neutral(ctx, LIGHT_SECONDARY_FOREGROUND, 1.2),
      mutedForeground: neutral(ctx, LIGHT_MUTED_FOREGROUND, 1),
    };
  }

  return {
    foreground: neutral(ctx, DARK_FOREGROUND, 1),
    cardForeground: neutral(ctx, DARK_FOREGROUND, 1),
    popoverForeground: neutral(ctx, DARK_FOREGROUND, 1),
    secondaryForeground: neutral(ctx, DARK_SECONDARY_FOREGROUND, 1),
    mutedForeground: neutral(ctx, DARK_MUTED_FOREGROUND, 1),
  };
}

/**
 * The light ink candidate — near-white, carrying the neutral hue.
 *
 * Exported so the solver scores the *same* two inks the generator used, rather
 * than inventing its own. If these diverged, the generator would pick one ink
 * and the solver would "fix" it to another.
 */
export function lightInk(ctx: PaletteContext): Oklch {
  return { l: 0.99, c: neutralChroma(ctx, 1), h: neutralHue(ctx.identity) };
}

/** The dark ink candidate — near-black, carrying the neutral hue. */
export function darkInk(ctx: PaletteContext): Oklch {
  return { l: 0.18, c: neutralChroma(ctx, 1.5), h: neutralHue(ctx.identity) };
}

/**
 * Pick the ink (near-white or near-black) that reads best on a surface.
 *
 * Used by the action and status generators to seed their `*Foreground` roles.
 * The solver then refines the choice, but starting from the better of the two
 * means the solver usually has nothing to do — and when it does, it is nudging
 * rather than jumping.
 *
 * @param background - The surface the ink sits on.
 * @param ctx - The generation context (for the neutral hue/chroma).
 * @returns The better-contrasting ink.
 */
export function bestInk(background: Oklch, ctx: PaletteContext): Oklch {
  const surface = oklchToRgb(background);
  const lightRatio = contrastRatio(oklchToRgb(lightInk(ctx)), surface);
  const darkRatio = contrastRatio(oklchToRgb(darkInk(ctx)), surface);

  return lightRatio >= darkRatio ? lightInk(ctx) : darkInk(ctx);
}
