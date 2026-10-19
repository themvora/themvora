/**
 * Deterministic ramps.
 *
 * A ramp is a fixed-step interpolation of lightness (and optionally chroma) at a
 * constant hue. Because the steps are computed from the endpoints and the count
 * — never from accumulated floating-point drift — two calls with the same
 * arguments produce byte-identical output.
 *
 * @packageDocumentation
 */
import { gamutMapOklch } from "./adjust";
import { clamp } from "./convert";
import type { Oklch } from "./types";

/**
 * `steps` evenly spaced lightness values from `from` to `to`, inclusive.
 *
 * @param from - Lightness at the first step.
 * @param to - Lightness at the last step.
 * @param steps - Number of steps; at least 1.
 * @returns The lightness values, each clamped to `0…1`.
 */
export function lightnessRamp(from: number, to: number, steps: number): number[] {
  const count = Math.max(1, Math.floor(steps));
  if (count === 1) return [clamp(from, 0, 1)];

  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(clamp(from + ((to - from) * i) / (count - 1), 0, 1));
  }
  return out;
}

/**
 * `steps` evenly spaced chroma values from `from` to `to`, inclusive.
 *
 * @param from - Chroma at the first step.
 * @param to - Chroma at the last step.
 * @param steps - Number of steps; at least 1.
 * @returns The chroma values, each floored at 0.
 */
export function chromaRamp(from: number, to: number, steps: number): number[] {
  const count = Math.max(1, Math.floor(steps));
  if (count === 1) return [Math.max(0, from)];

  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(Math.max(0, from + ((to - from) * i) / (count - 1)));
  }
  return out;
}

/**
 * Options for {@link buildRamp}.
 */
export interface RampOptions {
  /** Lightness at the first and last step. */
  lightness: readonly [number, number];
  /** Optional chroma at the first and last step; defaults to the base chroma. */
  chroma?: readonly [number, number];
  /** Number of steps. */
  steps: number;
}

/**
 * Build a ramp at a constant hue, gamut-mapped step by step.
 *
 * @param base - The hue (and default chroma) to ramp around.
 * @param options - Endpoints and step count.
 * @returns The ramp, in ascending step order.
 */
export function buildRamp(base: Oklch, options: RampOptions): Oklch[] {
  const lightnesses = lightnessRamp(options.lightness[0], options.lightness[1], options.steps);
  const chromas = options.chroma
    ? chromaRamp(options.chroma[0], options.chroma[1], options.steps)
    : null;

  return lightnesses.map((l, index) =>
    gamutMapOklch({ l, c: chromas ? (chromas[index] ?? base.c) : base.c, h: base.h }),
  );
}
