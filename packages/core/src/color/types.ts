/**
 * Types for the internal color engine.
 *
 * The engine is framework-neutral and pure. It is deliberately **not** part of
 * the public `@themvora/core` barrel: the plan (theme-generation.md §1) keeps
 * all color math in one internal module so that no preset, adapter or runtime
 * file re-implements `lighten()`/`darken()`/`rotateHue()`.
 *
 * ## Canonical representation
 *
 * `Oklch` is the primary generation space — perceptual lightness and chroma,
 * with hue as a polar angle. `Rgb` is the interchange format at the boundary
 * (CSS, theme tokens). Everything else (`Hsl`, hex strings) is compatibility.
 *
 * @packageDocumentation
 */

/**
 * A gamma-encoded sRGB color.
 *
 * Channels are in `0…255`. Internally they may be **fractional** and, briefly,
 * outside the nominal range — gamut mapping is what brings them back. Only
 * {@link ../convert.rgbToHex} rounds, and it clamps.
 */
export interface Rgb {
  /** Red channel, `0…255`. */
  r: number;
  /** Green channel, `0…255`. */
  g: number;
  /** Blue channel, `0…255`. */
  b: number;
}

/**
 * A color in the OKLab perceptual color space (Björn Ottosson, 2020).
 *
 * `l` is lightness (`0…1`), `a` is the green↔red axis, `b` is the blue↔yellow
 * axis. OKLab is used for perceptual distance ({@link ../compare.deltaEOk}).
 */
export interface Oklab {
  /** Perceptual lightness, nominally `0…1`. */
  l: number;
  /** Green (negative) ↔ red (positive) axis. */
  a: number;
  /** Blue (negative) ↔ yellow (positive) axis. */
  b: number;
}

/**
 * A color in OKLCH — the cylindrical form of {@link Oklab}.
 *
 * This is the engine's primary space: lightness is perceptual, chroma is
 * independent of lightness, and hue is a stable polar angle, which is what
 * makes "preserve the brand hue, change the lightness" a well-defined operation.
 */
export interface Oklch {
  /** Perceptual lightness, `0…1`. */
  l: number;
  /** Chroma (colorfulness), `≥ 0`. `0` is achromatic. */
  c: number;
  /** Hue angle in degrees, `0…360`. Normalised; `0` when achromatic. */
  h: number;
}

/**
 * An HSL color, retained only for input compatibility and CSS output.
 *
 * HSL is **not** used for generation: equal HSL lightness steps are not equal
 * perceptual steps, which is why the legacy generator produced palettes that
 * looked uneven and failed contrast unpredictably.
 */
export interface Hsl {
  /** Hue in degrees, `0…360`. */
  h: number;
  /** Saturation, `0…1`. */
  s: number;
  /** Lightness, `0…1`. */
  l: number;
}

/**
 * Thrown when a color string cannot be parsed.
 *
 * The generator maps this to the `TV_GENERATION_INVALID_SEED` diagnostic, so the
 * message is for developers while the typed error is for control flow.
 */
export class ColorError extends Error {
  /** The offending input, preserved verbatim for the diagnostic context. */
  readonly input: string;

  constructor(message: string, input: string) {
    super(message);
    this.name = "ColorError";
    this.input = input;
  }
}
