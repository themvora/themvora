/**
 * WCAG contrast ratio.
 *
 * @packageDocumentation
 */
import { relativeLuminance } from "./luminance";
import { parseColor } from "./parse";
import type { Rgb } from "./types";

/**
 * The WCAG 2.x contrast ratio between two colors.
 *
 * `(L_lighter + 0.05) / (L_darker + 0.05)`, giving `1` (identical) to `21`
 * (black on white). The value is **not** rounded: the plan requires that
 * `4.499` must not pass a `4.5` threshold, so callers compare the raw number
 * ({@link meetsContrast}).
 *
 * @param a - One color.
 * @param b - The other color.
 * @returns The contrast ratio, `1…21`.
 */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = la > lb ? la : lb;
  const darker = la > lb ? lb : la;
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Contrast ratio between two color strings.
 *
 * @param a - A CSS color string.
 * @param b - A CSS color string.
 * @returns The contrast ratio, `1…21`.
 * @throws {ColorError} When either string cannot be parsed.
 */
export function contrastRatioHex(a: string, b: string): number {
  return contrastRatio(parseColor(a), parseColor(b));
}

/**
 * Whether a ratio satisfies a threshold, with no rounding up.
 *
 * This exists as a function — rather than an inline `>=` — so the rule lives in
 * exactly one place: `4.499` does not pass `4.5`, and a future reader cannot
 * accidentally reintroduce a `toFixed`/`Math.round` before the comparison.
 *
 * @param ratio - The measured contrast ratio.
 * @param threshold - The required minimum.
 * @returns `true` when `ratio >= threshold`.
 */
export function meetsContrast(ratio: number, threshold: number): boolean {
  return ratio >= threshold;
}
