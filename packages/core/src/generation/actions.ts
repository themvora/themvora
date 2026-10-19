/**
 * Action generator — `primary`, `accent` and their foregrounds.
 *
 * `primary` is brand-anchored: its hue is the seed's, its lightness is the seed's
 * clamped into the style's band, and its chroma is the seed's scaled by the
 * style. The seed is intent, so the primary should look like the seed *belongs to
 * this style*, not like the seed verbatim.
 *
 * `accent` is placed relative to `primary` by the style — analogous,
 * split-complementary or complementary — and is guaranteed a non-trivial hue
 * offset so it can never collapse into the primary.
 *
 * @packageDocumentation
 */
import { gamutMapOklch, hueDistance, normalizeHue, type Oklch } from "../color";
import { chooseForeground } from "./foreground-policy";
import { clampToBand } from "./styles";
import type { ActionRoles, PaletteContext } from "./types";

/** Light/dark lightness for the accent. */
const ACCENT_LIGHTNESS_LIGHT = 0.62;
const ACCENT_LIGHTNESS_DARK = 0.68;

/**
 * Chroma floor for the accent.
 *
 * An achromatic seed has no chroma to rotate, so without a floor its accent
 * would be the same gray as its primary — a real defect, caught by the Phase 5
 * relationship checks. `0.06` is enough to read as a colour at any lightness.
 */
const ACCENT_CHROMA_FLOOR = 0.06;
/** Accent chroma relative to the primary. */
const ACCENT_CHROMA_RATIO = 0.85;

/**
 * The minimum hue distance between `primary` and `accent`, in degrees.
 *
 * Below this the two roles read as the same colour and the accent stops doing
 * its job — the "primary ≈ accent" collision theme-generation.md Phase 5 calls
 * out. The guard exists so a future style with a small offset cannot reintroduce
 * it silently.
 */
const MIN_ACCENT_HUE_DISTANCE = 18;

/** Fallback offsets, tried in order, when the style's own offset collides. */
const ACCENT_FALLBACK_OFFSETS = [32, 150, 180] as const;

/**
 * Resolve the accent hue, relocating it if the style's offset would place it on
 * top of the primary.
 */
function resolveAccentHue(primaryHue: number, styleOffset: number): number {
  const preferred = normalizeHue(primaryHue + styleOffset);
  if (hueDistance(preferred, primaryHue) >= MIN_ACCENT_HUE_DISTANCE) return preferred;

  for (const offset of ACCENT_FALLBACK_OFFSETS) {
    const candidate = normalizeHue(primaryHue + offset);
    if (hueDistance(candidate, primaryHue) >= MIN_ACCENT_HUE_DISTANCE) return candidate;
  }
  return preferred;
}

/**
 * Generate the action roles for a mode.
 */
export function generateActions(ctx: PaletteContext): ActionRoles {
  const { identity, style, mode } = ctx;
  const isLight = mode === "light";

  const band = isLight ? style.primaryLightnessLight : style.primaryLightnessDark;
  const primary = gamutMapOklch({
    l: clampToBand(identity.lightness, band),
    c: Math.max(
      identity.chroma * style.primaryChroma * (isLight ? 1 : 0.92),
      identity.isChromatic ? 0.05 : 0,
    ),
    h: identity.hue,
  });

  const accent = gamutMapOklch({
    l: isLight ? ACCENT_LIGHTNESS_LIGHT : ACCENT_LIGHTNESS_DARK,
    c: Math.max(primary.c * ACCENT_CHROMA_RATIO, ACCENT_CHROMA_FLOOR),
    h: resolveAccentHue(primary.h, style.accentOffset),
  });

  return {
    primary,
    primaryForeground: chooseForeground("primaryForeground", primary, ctx),
    accent,
    accentForeground: chooseForeground("accentForeground", accent, ctx),
  };
}

/** The accent hue for a context, exposed for the relationship checks. */
export function accentHueFor(ctx: PaletteContext): number {
  return resolveAccentHue(ctx.identity.hue, ctx.style.accentOffset);
}

/** Convenience: the resolved primary for a context, without the other roles. */
export function primaryFor(ctx: PaletteContext): Oklch {
  return generateActions(ctx).primary;
}
