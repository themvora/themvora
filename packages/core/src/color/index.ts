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
