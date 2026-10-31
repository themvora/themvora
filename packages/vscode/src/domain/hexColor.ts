/**
 * Hex colour parsing and formatting.
 *
 * Pure, so the swatch adapter stays about VS Code and this stays about colour.
 * The accepted forms are exactly what the Themvora schema stores — `#rgb`,
 * `#rrggbb` and `#rrggbbaa`. Anything else returns `null` rather than a guess:
 * a swatch on a value the theme cannot mean is worse than no swatch.
 *
 * @packageDocumentation
 */

/** A colour, channels 0–255. */
export interface Rgba {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  /** 0–255. */
  readonly alpha: number;
}

/** The accepted hex forms. */
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Parse a hex colour.
 *
 * @param value - e.g. `#fff`, `#4f46e5`, `#4f46e580`.
 * @returns The channels, or `null` when the value is not an accepted form.
 */
export function parseHex(value: string): Rgba | null {
  const match = HEX.exec(value.trim());
  if (match === null) return null;

  const digits = match[1] as string;

  if (digits.length === 3) {
    return {
      red: Number.parseInt(digits.charAt(0) + digits.charAt(0), 16),
      green: Number.parseInt(digits.charAt(1) + digits.charAt(1), 16),
      blue: Number.parseInt(digits.charAt(2) + digits.charAt(2), 16),
      alpha: 255,
    };
  }

  return {
    red: Number.parseInt(digits.slice(0, 2), 16),
    green: Number.parseInt(digits.slice(2, 4), 16),
    blue: Number.parseInt(digits.slice(4, 6), 16),
    alpha: digits.length === 8 ? Number.parseInt(digits.slice(6, 8), 16) : 255,
  };
}

/**
 * Format a colour as hex.
 *
 * Alpha is preserved only when it is not opaque: a theme token that was written
 * `#rrggbb` stays `#rrggbb`, so an edit that changes a channel cannot silently
 * add an alpha channel.
 *
 * @param colour - The channels.
 * @returns `#rrggbb`, or `#rrggbbaa` when not fully opaque.
 */
export function formatHex(colour: Rgba): string {
  const channel = (value: number): string =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");

  const base = `#${channel(colour.red)}${channel(colour.green)}${channel(colour.blue)}`;
  return colour.alpha >= 255 ? base : `${base}${channel(colour.alpha)}`;
}
