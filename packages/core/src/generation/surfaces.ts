/**
 * Surface generator — `background`, `card`, `popover`, `muted`, `secondary`.
 *
 * Light and dark use **separate strategies** (theme-generation.md Phase 4): light
 * starts from a light tinted canvas and steps *up* to white surfaces; dark starts
 * from a deep tinted canvas and steps up through elevated surfaces. Neither is
 * derived by inverting the other.
 *
 * The separations are deliberate: `background ≠ card ≠ popover` must be visible,
 * not nominal, or the elevation model collapses.
 *
 * @packageDocumentation
 */
import { clamp } from "../color";
import { neutral } from "./neutral";
import type { PaletteContext, SurfaceRoles } from "./types";

/** Light-mode surface steps above the canvas. */
const LIGHT_CARD_STEP = 0.028;
const LIGHT_POPOVER_STEP = 0.014;
const LIGHT_MUTED_STEP = 0.03;
const LIGHT_SECONDARY_STEP = 0.042;

/** Dark-mode surface steps above the canvas. */
const DARK_CARD_STEP = 0.06;
const DARK_POPOVER_STEP = 0.078;
const DARK_MUTED_STEP = 0.1;
const DARK_SECONDARY_STEP = 0.115;

/**
 * Generate the surface roles for a mode.
 *
 * `secondary` is emitted here rather than with the actions because it *is* a
 * surface: its job is to sit under `secondaryForeground`. The style's
 * `secondaryRelationship` decides whether it stays neutral or picks up the brand
 * hue.
 */
export function generateSurfaces(ctx: PaletteContext): SurfaceRoles {
  const tintedSecondary =
    ctx.style.secondaryRelationship === "tinted" ? 2.5 : 1.6;

  if (ctx.mode === "light") {
    const base = ctx.style.lightSurfaceHeight;
    return {
      background: neutral(ctx, base),
      card: neutral(ctx, clamp(base + LIGHT_CARD_STEP, 0, 1)),
      popover: neutral(ctx, clamp(base + LIGHT_POPOVER_STEP, 0, 1)),
      muted: neutral(ctx, clamp(base - LIGHT_MUTED_STEP, 0, 1)),
      secondary: neutral(ctx, clamp(base - LIGHT_SECONDARY_STEP, 0, 1), tintedSecondary),
    };
  }

  const base = ctx.style.darkSurfaceDepth;
  return {
    background: neutral(ctx, base),
    card: neutral(ctx, base + DARK_CARD_STEP),
    popover: neutral(ctx, base + DARK_POPOVER_STEP),
    muted: neutral(ctx, base + DARK_MUTED_STEP),
    secondary: neutral(ctx, base + DARK_SECONDARY_STEP, tintedSecondary),
  };
}
