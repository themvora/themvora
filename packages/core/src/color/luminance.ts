/**
 * WCAG relative luminance.
 *
 * @packageDocumentation
 */
import { rgbToLinearRgb } from "./convert";
import type { Rgb } from "./types";

/**
 * The WCAG 2.x relative luminance of a color.
 *
 * Channels are linearised with the sRGB transfer function and weighted
 * `0.2126 / 0.7152 / 0.0722`. Returns `0…1`, where `0` is black and `1` is
 * white. This is the quantity the contrast ratio is built from — not perceptual
 * lightness, and not HSL `l`.
 *
 * @param rgb - The color, sRGB with channels in `0…255`.
 * @returns Relative luminance in `0…1`.
 */
export function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgbToLinearRgb(rgb);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
