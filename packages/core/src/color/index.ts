/**
 * The Themvora color engine — internal, framework-neutral, pure.
 *
 * ```
 * types ──▶ convert ──▶ luminance ──▶ contrast
 *              │
 *              ├──▶ parse        (input boundary)
 *              ├──▶ adjust       (the only place colors are changed)
 *              ├──▶ ramps
 *              └──▶ compare      (perceptual distance)
 * ```
 *
 * This module is deliberately **not** re-exported from `@themvora/core`'s
 * public barrel. The plan keeps all color math internal so that presets,
 * adapters and the runtime cannot re-implement `lighten()`/`darken()`.
 *
 * @packageDocumentation
 */
export * from "./types";
export * from "./convert";
export * from "./parse";
export * from "./luminance";
export * from "./contrast";
export * from "./adjust";
export * from "./ramps";
export * from "./compare";

import { gamutMapOklch } from "./adjust";
import { oklchToHex, rgbToOklch } from "./convert";
import { parseColor } from "./parse";
import type { Oklch } from "./types";

/**
 * Parse a hex color string to OKLCH.
 *
 * @param hex - A hex color string.
 * @returns The color in OKLCH.
 * @throws {ColorError} When the string is not a valid color.
 */
export function hexToOklch(hex: string): Oklch {
  return rgbToOklch(parseColor(hex));
}

/**
 * Parse a color string to OKLCH and bring it into the sRGB gamut.
 *
 * @param hex - A color string.
 * @returns The gamut-mapped color in OKLCH.
 * @throws {ColorError} When the string is not a valid color.
 */
export function hexToOklchMapped(hex: string): Oklch {
  return gamutMapOklch(hexToOklch(hex));
}

/**
 * Convert OKLCH to `#rrggbb`, gamut-mapping first so the hex is faithful.
 *
 * @param lch - The color to convert.
 * @returns A `#rrggbb` string.
 */
export function oklchToHexMapped(lch: Oklch): string {
  return oklchToHex(gamutMapOklch(lch));
}

/**
 * Hue buckets for {@link colorName}, as `[upper bound in degrees, name]`.
 *
 * OKLCH hue angles, not HSL: the engine works in OKLCH, and the two spaces put
 * the same colour at very different angles (`#6366f1` is 239° in HSL and 277°
 * here). The bounds were placed from measured values of the standard Tailwind
 * ramp so each familiar name covers the colours people mean by it.
 */
const HUE_NAMES: readonly (readonly [number, string])[] = [
  [20, "rose"],
  [40, "red"],
  [65, "ember"],
  [82, "amber"],
  [105, "citron"],
  [140, "lime"],
  [160, "green"],
  [175, "emerald"],
  [200, "teal"],
  [228, "cyan"],
  [248, "azure"],
  [270, "blue"],
  [288, "indigo"],
  [300, "violet"],
  [315, "purple"],
  [345, "magenta"],
  [360, "rose"],
];

/**
 * A short, readable name for a colour, chosen by its hue and tone.
 *
 * Intended for naming a generated theme family after its seed: the result is
 * lowercase letters only — no separators, no digits — so it survives being used
 * as an identifier stem (`indigoLight`) and reads as a name in a UI.
 *
 * Names are `hue` on its own (`indigo`) or a camelCase tone plus hue
 * (`deepIndigo`, `paleAmber`). A seed with almost no chroma has no meaningful
 * hue, so it is named for its tone instead (`ash`, `slate`).
 *
 * @param hex - A hex colour string.
 * @returns The name, or `null` when the string is not a valid colour.
 *
 * @example
 * ```ts
 * colorName("#6366f1"); // "indigo"
 * colorName("#0b0b0f"); // "slate"
 * colorName("not a colour"); // null
 * ```
 */
export function colorName(hex: string): string | null {
  let lch: Oklch;
  try {
    lch = hexToOklch(hex);
  } catch {
    return null;
  }

  // Below this chroma there is no hue a reader would recognise; naming one
  // would be a guess dressed up as a fact.
  if (lch.c < 0.025) return lch.l < 0.5 ? "slate" : "ash";

  const hue = HUE_NAMES.find(([limit]) => lch.h <= limit)?.[1] ?? "indigo";
  const tone = lch.l < 0.42 ? "deep" : lch.l > 0.88 ? "pale" : "";
  return tone ? tone + hue.charAt(0).toUpperCase() + hue.slice(1) : hue;
}
