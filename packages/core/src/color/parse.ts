/**
 * Color parsing — the engine's input boundary.
 *
 * Accepts the formats the public API already accepted (hex, `rgb()`, `hsl()`)
 * and rejects everything else with a typed {@link ColorError}, which the
 * generator surfaces as `TV_GENERATION_INVALID_SEED`.
 *
 * Alpha is parsed but **dropped**: theme tokens are opaque colors. A 4- or
 * 8-digit hex, or an `rgba()`/`hsla()` alpha component, is accepted for
 * compatibility and ignored, which is the behaviour the legacy generator had.
 *
 * @packageDocumentation
 */
import { clamp, hslToRgb } from "./convert";
import { ColorError, type Rgb } from "./types";

const HEX_PATTERN = /^#[0-9a-fA-F]+$/;
const RGB_PATTERN = /^rgba?\(([^)]*)\)$/i;
const HSL_PATTERN = /^hsla?\(([^)]*)\)$/i;

/**
 * Parse a CSS color string into sRGB.
 *
 * @param input - `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()` or
 *   `hsl()`/`hsla()` (comma- or space-separated, percentages allowed).
 * @returns The color as sRGB with channels in `0…255`.
 * @throws {ColorError} When the input is empty or not a supported format.
 *
 * @example
 * ```ts
 * parseColor("#7c3aed");        // { r: 124, g: 58, b: 237 }
 * parseColor("rgb(124 58 237)");
 * parseColor("hsl(262 83% 58%)");
 * ```
 */
export function parseColor(input: string): Rgb {
  if (typeof input !== "string") {
    throw new ColorError(`Color must be a string, received ${typeof input}`, String(input));
  }

  const value = input.trim();
  if (value === "") throw new ColorError("Color string is empty", input);

  if (value.startsWith("#")) return parseHex(value, input);
  if (RGB_PATTERN.test(value)) return parseRgbFunction(value, input);
  if (HSL_PATTERN.test(value)) return parseHslFunction(value, input);

  throw new ColorError(`Unsupported color format: "${input}"`, input);
}

/**
 * Parse a color, returning `null` instead of throwing.
 *
 * @param input - Any candidate color string.
 * @returns The color, or `null` when it cannot be parsed.
 */
export function tryParseColor(input: string): Rgb | null {
  try {
    return parseColor(input);
  } catch {
    return null;
  }
}

function parseHex(value: string, original: string): Rgb {
  if (!HEX_PATTERN.test(value)) {
    throw new ColorError(`Invalid hex color: "${original}"`, original);
  }

  const hex = value.slice(1);
  const expand = (at: number) => {
    const digit = hex.charAt(at);
    return Number.parseInt(`${digit}${digit}`, 16);
  };

  if (hex.length === 3 || hex.length === 4) {
    return { r: expand(0), g: expand(1), b: expand(2) };
  }

  if (hex.length === 6 || hex.length === 8) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }

  throw new ColorError(`Invalid hex color length: "${original}"`, original);
}

function splitFunctionArgs(body: string): string[] {
  return body
    .split(/[\s,/]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function parseRgbFunction(value: string, original: string): Rgb {
  const match = value.match(RGB_PATTERN);
  if (!match) throw new ColorError(`Invalid rgb() color: "${original}"`, original);

  const [rPart, gPart, bPart] = splitFunctionArgs(match[1] ?? "");
  if (rPart === undefined || gPart === undefined || bPart === undefined) {
    throw new ColorError(`rgb() needs three channels: "${original}"`, original);
  }

  return {
    r: parseRgbChannel(rPart, original),
    g: parseRgbChannel(gPart, original),
    b: parseRgbChannel(bPart, original),
  };
}

function parseRgbChannel(part: string, original: string): number {
  const percent = part.endsWith("%");
  const numeric = Number.parseFloat(percent ? part.slice(0, -1) : part);
  if (!Number.isFinite(numeric)) {
    throw new ColorError(`Invalid rgb() channel "${part}" in "${original}"`, original);
  }
  const value = percent ? (numeric / 100) * 255 : numeric;
  return clamp(value, 0, 255);
}

function parseHslFunction(value: string, original: string): Rgb {
  const match = value.match(HSL_PATTERN);
  if (!match) throw new ColorError(`Invalid hsl() color: "${original}"`, original);

  const [hPart, sPart, lPart] = splitFunctionArgs(match[1] ?? "");
  if (hPart === undefined || sPart === undefined || lPart === undefined) {
    throw new ColorError(`hsl() needs hue, saturation and lightness: "${original}"`, original);
  }

  // `parseFloat` stops at the unit, so "210deg" → 210 and "50%" → 50.
  const hue = Number.parseFloat(hPart);
  if (!Number.isFinite(hue)) {
    throw new ColorError(`Invalid hsl() hue "${hPart}" in "${original}"`, original);
  }

  return hslToRgb({
    h: hue,
    s: parseUnitInterval(sPart, original),
    l: parseUnitInterval(lPart, original),
  });
}

/** Parse a saturation/lightness component: `"50%"` → 0.5, `"0.5"` → 0.5. */
function parseUnitInterval(part: string, original: string): number {
  const percent = part.endsWith("%");
  const numeric = Number.parseFloat(percent ? part.slice(0, -1) : part);
  if (!Number.isFinite(numeric)) {
    throw new ColorError(`Invalid hsl() component "${part}" in "${original}"`, original);
  }
  return clamp(percent ? numeric / 100 : numeric, 0, 1);
}
