/**
 * Interaction generator — `border`, `input`, `ring`.
 *
 * Borders are held to a different contract than text: they must be *visible*
 * against the canvas without becoming a visual competitor for it, so they are
 * solved to the UI threshold (3:1), not the text threshold.
 *
 * `ring` is a first-class role: a focus indicator that cannot be seen is an
 * accessibility failure, so it is generated from the brand hue (so focus looks
 * like the product) and then solved against both `background` and `card`.
 *
 * @packageDocumentation
 */
import { gamutMapOklch, type Oklch } from "../color";
import { neutral } from "./neutral";
import type { InteractionRoles, PaletteContext } from "./types";

/** Light-mode border step *below* the canvas lightness. */
const LIGHT_BORDER_STEP = 0.075;
/**
 * Dark-mode border step *above* the canvas lightness.
 *
 * Larger than the light-mode step because the dark surface stack is shallower:
 * the border must clear the *lightest* surface it separates (`popover`), not
 * just the canvas. `0.16` from a `0.16` canvas puts it at `0.32`, clear of a
 * `0.238` popover while staying inside the dominance band.
 */
const DARK_BORDER_STEP = 0.16;

/** Border chroma relative to the neutral baseline. */
const BORDER_TINT = 1.2;

/**
 * Generate the interaction roles for a mode.
 *
 * @param ctx - The generation context.
 * @param primary - The resolved primary, which the ring inherits its hue from.
 */
export function generateInteraction(ctx: PaletteContext, primary: Oklch): InteractionRoles {
  const isLight = ctx.mode === "light";
  const base = isLight ? ctx.style.lightSurfaceHeight : ctx.style.darkSurfaceDepth;
  const step = (isLight ? LIGHT_BORDER_STEP : DARK_BORDER_STEP) * ctx.style.borderStrength;
  const borderLightness = isLight ? base - step : base + step;

  return {
    border: neutral(ctx, borderLightness, BORDER_TINT),
    input: neutral(ctx, borderLightness, BORDER_TINT),
    ring: gamutMapOklch({ l: primary.l, c: primary.c, h: primary.h }),
  };
}
