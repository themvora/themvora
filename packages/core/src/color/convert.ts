/**
 * Color-space conversions — the lowest layer of the color engine.
 *
 * Pipeline: sRGB (gamma) ↔ linear sRGB ↔ OKLab ↔ OKLCH. Every function here is
 * pure, total and dependency-free (it imports only types), which is what lets
 * the higher layers (`parse`, `adjust`, `compare`, `ramps`) depend on it without
 * any import cycle.
 *
 * Functions never throw and never return `NaN`/`Infinity` for finite input.
 * Out-of-gamut results are returned as-is; gamut mapping is the caller's
 * decision ({@link ./adjust.gamutMapOklch}).
 *
 * @packageDocumentation
 */
import type { Hsl, Oklab, Oklch, Rgb } from "./types";

/**
 * Chroma below which a color is treated as achromatic.
 *
 * At or below this value the hue angle is numerically meaningless (it is the
 * `atan2` of two near-zero numbers), so the engine reports `h = 0` instead of
 * propagating a garbage angle. `0.0001` is well under the chroma difference the
 * eye can resolve at any lightness.
 */
export const CHROMA_EPSILON = 1e-4;

/** Clamp a number into `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Normalise a hue angle into `[0, 360)`. */
export function normalizeHue(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** sRGB gamma-encoded channel (`0…1`) → linear-light channel. */
export function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/** Linear-light channel → sRGB gamma-encoded channel (`0…1`). */
export function linearToSrgb(channel: number): number {
  return channel <= 0.0031308 ? 12.92 * channel : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
}

/** sRGB (0…255) → linear sRGB (0…1). */
export function rgbToLinearRgb(rgb: Rgb): [number, number, number] {
  return [srgbToLinear(rgb.r / 255), srgbToLinear(rgb.g / 255), srgbToLinear(rgb.b / 255)];
}

/** Linear sRGB (0…1) → sRGB (0…255). Channels are **not** clamped. */
export function linearRgbToRgb(linear: readonly [number, number, number]): Rgb {
  return {
    r: linearToSrgb(linear[0]) * 255,
    g: linearToSrgb(linear[1]) * 255,
    b: linearToSrgb(linear[2]) * 255,
  };
}

/** Linear sRGB → OKLab. */
export function linearRgbToOklab(linear: readonly [number, number, number]): Oklab {
  const [r, g, b] = linear;

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  // `Math.cbrt` is defined for negative inputs, so out-of-gamut values stay finite.
  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return {
    l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  };
}

/** OKLab → linear sRGB. Channels may fall outside `0…1` (out of gamut). */
export function oklabToLinearRgb(lab: Oklab): [number, number, number] {
  const { l, a, b } = lab;

  const lRoot = l + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = l - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = lRoot * lRoot * lRoot;
  const m3 = mRoot * mRoot * mRoot;
  const s3 = sRoot * sRoot * sRoot;

  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
}

/**
 * OKLab → OKLCH.
 *
 * An achromatic color (chroma at or below {@link CHROMA_EPSILON}) reports
 * `h = 0`, because its hue angle carries no information and letting `atan2`
 * produce an arbitrary angle would make otherwise-identical grays compare as
 * different hues.
 */
export function oklabToOklch(lab: Oklab): Oklch {
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  if (c < CHROMA_EPSILON) return { l: lab.l, c, h: 0 };
  return { l: lab.l, c, h: normalizeHue((Math.atan2(lab.b, lab.a) * 180) / Math.PI) };
}

/** OKLCH → OKLab. */
export function oklchToOklab(lch: Oklch): Oklab {
  const radians = (lch.h * Math.PI) / 180;
  return { l: lch.l, a: lch.c * Math.cos(radians), b: lch.c * Math.sin(radians) };
}

/** sRGB (0…255) → OKLCH. */
export function rgbToOklch(rgb: Rgb): Oklch {
  return oklabToOklch(linearRgbToOklab(rgbToLinearRgb(rgb)));
}

/** OKLCH → sRGB (0…255), unclamped. */
export function oklchToRgb(lch: Oklch): Rgb {
  return linearRgbToRgb(oklabToLinearRgb(oklchToOklab(lch)));
}

/** sRGB (0…255) → `#rrggbb`, clamped and rounded. */
export function rgbToHex(rgb: Rgb): string {
  const toHex = (channel: number) =>
    clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/** OKLCH → `#rrggbb`. */
export function oklchToHex(lch: Oklch): string {
  return rgbToHex(oklchToRgb(lch));
}

/** sRGB (0…255) → HSL (`h` degrees, `s`/`l` in `0…1`). */
export function rgbToHsl(rgb: Rgb): Hsl {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s, l };
}

/** HSL → sRGB (0…255). */
export function hslToRgb(hsl: Hsl): Rgb {
  const h = normalizeHue(hsl.h);
  const s = clamp(hsl.s, 0, 1);
  const l = clamp(hsl.l, 0, 1);

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g] = [c, x];
  else if (h < 120) [r, g] = [x, c];
  else if (h < 180) [g, b] = [c, x];
  else if (h < 240) [g, b] = [x, c];
  else if (h < 300) [r, b] = [x, c];
  else [r, b] = [c, x];

  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/**
 * Whether a color is inside the sRGB gamut.
 *
 * `epsilon` is in `0…255` channel units. The default is half a channel unit,
 * matching the engine's round-trip tolerance: a value that would round to a
 * valid channel is treated as in gamut rather than being chroma-reduced for a
 * sub-unit overshoot.
 */
export function isInGamut(rgb: Rgb, epsilon = 0.5): boolean {
  return (
    rgb.r >= -epsilon &&
    rgb.r <= 255 + epsilon &&
    rgb.g >= -epsilon &&
    rgb.g <= 255 + epsilon &&
    rgb.b >= -epsilon &&
    rgb.b <= 255 + epsilon
  );
}

/** Whether a color string is a 3/4/6/8-digit hex color. */
export function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

/** sRGB → `rgb(r, g, b)` / `rgba(r, g, b, a)` CSS string. */
export function rgbToCss(rgb: Rgb, alpha?: number): string {
  const r = Math.round(clamp(rgb.r, 0, 255));
  const g = Math.round(clamp(rgb.g, 0, 255));
  const b = Math.round(clamp(rgb.b, 0, 255));
  if (alpha === undefined) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** OKLCH → `oklch(L% C H)` CSS string. */
export function oklchToCss(lch: Oklch): string {
  const l = (clamp(lch.l, 0, 1) * 100).toFixed(2);
  const c = Math.max(0, lch.c).toFixed(4);
  const h = normalizeHue(lch.h).toFixed(2);
  return `oklch(${l}% ${c} ${h})`;
}
