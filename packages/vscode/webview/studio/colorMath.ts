/**
 * WCAG contrast math for the Studio's live seed preview.
 *
 * The host computes the authoritative contrast pairs through core; this module
 * only powers the Create drawer's instant HUD, so a seed can be rated against
 * the two reference surfaces (`#ffffff` and `#0e1117`) before any theme exists.
 * The formulas match WCAG 2.1 exactly so the badge never disagrees with the
 * validation the host will run.
 */

/** A colour, channels 0–255. */
export interface Rgb {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Parse a hex colour to channels.
 *
 * @param value - `#rgb` or `#rrggbb`.
 * @returns The channels, or `null` when the value is not a plain hex colour.
 */
export function parseHexColor(value: string): Rgb | null {
  const match = HEX.exec(value.trim());
  if (match === null) return null;
  const digits = match[1] as string;
  if (digits.length === 3) {
    return {
      red: Number.parseInt(digits.charAt(0) + digits.charAt(0), 16),
      green: Number.parseInt(digits.charAt(1) + digits.charAt(1), 16),
      blue: Number.parseInt(digits.charAt(2) + digits.charAt(2), 16),
    };
  }
  return {
    red: Number.parseInt(digits.slice(0, 2), 16),
    green: Number.parseInt(digits.slice(2, 4), 16),
    blue: Number.parseInt(digits.slice(4, 6), 16),
  };
}

/**
 * The WCAG 2.1 relative luminance of a colour.
 *
 * @param colour - Channels 0–255.
 * @returns Luminance in `[0, 1]`.
 */
export function relativeLuminance(colour: Rgb): number {
  const channel = (value: number): number => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(colour.red) + 0.7152 * channel(colour.green) + 0.0722 * channel(colour.blue);
}

/**
 * The contrast ratio between two hex colours.
 *
 * @param a - The first colour.
 * @param b - The second colour.
 * @returns The ratio (≥ 1), or `null` when either colour is unparseable.
 */
export function contrastRatio(a: string, b: string): number | null {
  const first = parseHexColor(a);
  const second = parseHexColor(b);
  if (first === null || second === null) return null;
  const la = relativeLuminance(first);
  const lb = relativeLuminance(second);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** The WCAG compliance tier for a ratio. */
export type WcagLevel = "AAA" | "AA" | "AA Large" | "Fail";

/**
 * Rate a contrast ratio against WCAG 2.1 thresholds.
 *
 * @param ratio - The measured ratio.
 * @returns The strongest tier the ratio meets.
 */
export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

/**
 * The strongest ratio a colour reaches against the two reference surfaces the
 * generator guarantees — near-white `#ffffff` and near-black `#0e1117`.
 *
 * @param seed - A hex colour.
 * @returns The ratio, or `null` when the seed is not a plain hex colour.
 */
export function seedContrast(seed: string): number | null {
  const white = contrastRatio(seed, "#ffffff");
  const dark = contrastRatio(seed, "#0e1117");
  if (white === null && dark === null) return null;
  return Math.max(white ?? 1, dark ?? 1);
}
