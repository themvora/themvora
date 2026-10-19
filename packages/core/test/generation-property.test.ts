import { describe, expect, it } from "vitest";
import { CORE_COLORS, generateTheme, getContrastRatio } from "../src";
import { floorFor, SEMANTIC_PAIRS } from "../src/generation";

/**
 * Phase 9 — property-based testing.
 *
 * A fixed-seed LCG generates the seed matrix, so the run is deterministic and a
 * failing case can be reproduced by index. Thousands of seeds across hue,
 * lightness, chroma, pastel, dark, light, near-neutral and high-saturation
 * regions are pushed through the full pipeline, and every output is checked
 * against the contract.
 */

/** Deterministic 32-bit LCG (Numerical Recipes constants). */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

/** A uniformly random color. */
function randomSeed(rng: () => number): string {
  const r = Math.floor(rng() * 256);
  const g = Math.floor(rng() * 256);
  const b = Math.floor(rng() * 256);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** A pastel: high lightness, low chroma. */
function pastelSeed(rng: () => number): string {
  const base = [200, 220, 240].map((v) => Math.min(255, Math.round(v + rng() * 15)));
  return `#${toHex(base[0] ?? 220)}${toHex(base[1] ?? 220)}${toHex(base[2] ?? 240)}`;
}

/** A near-neutral: all channels within a narrow band. */
function nearNeutralSeed(rng: () => number): string {
  const base = Math.floor(rng() * 256);
  const jitter = () => Math.max(0, Math.min(255, base + Math.round((rng() - 0.5) * 20)));
  return `#${toHex(jitter())}${toHex(jitter())}${toHex(jitter())}`;
}

/** A dark seed. */
function darkSeed(rng: () => number): string {
  return `#${toHex(Math.floor(rng() * 40))}${toHex(Math.floor(rng() * 40))}${toHex(Math.floor(rng() * 40))}`;
}

/** A light seed. */
function lightSeed(rng: () => number): string {
  const v = () => 215 + Math.floor(rng() * 40);
  return `#${toHex(v())}${toHex(v())}${toHex(v())}`;
}

/** A fully saturated primary-ish seed. */
function saturatedSeed(rng: () => number): string {
  const channels = [0, 0, 0];
  const on = Math.floor(rng() * 3);
  channels[on] = 255;
  channels[(on + 1) % 3] = rng() > 0.5 ? 255 : 0;
  channels[(on + 2) % 3] = rng() > 0.5 ? 255 : 0;
  return `#${toHex(channels[0] ?? 0)}${toHex(channels[1] ?? 0)}${toHex(channels[2] ?? 0)}`;
}

const GENERATORS = [randomSeed, pastelSeed, nearNeutralSeed, darkSeed, lightSeed, saturatedSeed];

const HEX_PATTERN = /^#[0-9a-f]{6}$/;

interface Failure {
  index: number;
  seed: string;
  style: string;
  mode: string;
  problem: string;
}

/**
 * Run the full property suite for a list of seeds and styles, returning the
 * failures found (and the worst contrast margin observed).
 */
function runProperties(
  seeds: string[],
  styles: Array<"balanced" | "soft" | "vibrant" | "editorial" | "minimal" | "brand">,
): { failures: Failure[]; minMargin: number } {
  const failures: Failure[] = [];
  let minMargin = Number.POSITIVE_INFINITY;

  seeds.forEach((seed, index) => {
    for (const style of styles) {
      let pair: ReturnType<typeof generateTheme>;
      try {
        pair = generateTheme({ seed, style, withCode: true });
      } catch (error) {
        failures.push({ index, seed, style, mode: "-", problem: `threw: ${String(error)}` });
        continue;
      }

      for (const mode of ["light", "dark"] as const) {
        const colors = pair[mode].tokens?.colors as Record<string, string> | undefined;
        if (!colors) {
          failures.push({ index, seed, style, mode, problem: "no colors" });
          continue;
        }

        // Every core role is present and a valid, finite, 6-digit hex.
        for (const role of CORE_COLORS) {
          const value = colors[role];
          if (typeof value !== "string" || !HEX_PATTERN.test(value)) {
            failures.push({ index, seed, style, mode, problem: `${role} = ${String(value)}` });
          }
        }

        // No optional roles were fabricated.
        for (const optional of ["warning", "info", "error"]) {
          if (colors[optional] !== undefined) {
            failures.push({ index, seed, style, mode, problem: `fabricated optional role ${optional}` });
          }
        }

        // Every contract pair meets its published floor.
        for (const semantic of SEMANTIC_PAIRS) {
          const fg = colors[semantic.foreground];
          const bg = colors[semantic.background];
          if (typeof fg !== "string" || typeof bg !== "string") continue;
          const ratio = getContrastRatio(fg, bg);
          const floor = floorFor(semantic.requirement);
          const margin = ratio - floor;
          if (margin < minMargin) minMargin = margin;
          if (ratio < floor) {
            failures.push({
              index,
              seed,
              style,
              mode,
              problem: `${semantic.foreground}/${semantic.background} ${ratio.toFixed(3)} < ${floor}`,
            });
          }
        }

        // Status colours stay in their families: destructive red-ish, success green-ish.
        const destructive = colors.destructive;
        const success = colors.success;
        if (destructive !== undefined && !isRedFamily(destructive)) {
          failures.push({ index, seed, style, mode, problem: `destructive ${destructive} left the red family` });
        }
        if (success !== undefined && !isGreenFamily(success)) {
          failures.push({ index, seed, style, mode, problem: `success ${success} left the green family` });
        }
      }
    }
  });

  return { failures, minMargin };
}

function isRedFamily(hex: string): boolean {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return r > g && r > b;
}

function isGreenFamily(hex: string): boolean {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return g > r && g > b;
}

describe("property tests — the generator contract holds for every seed", () => {
  it("holds for 1500 generated seeds in the default style, both modes", () => {
    const rng = makeRng(0xc0ffee);
    const seeds = Array.from({ length: 1500 }, (_, i) => GENERATORS[i % GENERATORS.length]!(rng));

    const { failures, minMargin } = runProperties(seeds, ["balanced"]);

    // Report the worst margin so a near-miss is visible even when it passes.
    expect(minMargin).toBeGreaterThan(0);
    expect(failures.slice(0, 10)).toEqual([]);
    expect(failures).toHaveLength(0);
  });

  it("holds for 200 seeds across all six styles, both modes", () => {
    const rng = makeRng(0xbadf00d);
    const seeds = Array.from({ length: 200 }, (_, i) => GENERATORS[i % GENERATORS.length]!(rng));

    const { failures } = runProperties(seeds, [
      "balanced",
      "soft",
      "vibrant",
      "editorial",
      "minimal",
      "brand",
    ]);

    expect(failures.slice(0, 10)).toEqual([]);
    expect(failures).toHaveLength(0);
  });

  it("is deterministic for the same seed", () => {
    const rng = makeRng(12345);
    for (let i = 0; i < 50; i += 1) {
      const seed = randomSeed(rng);
      expect(generateTheme({ seed, style: "vibrant" })).toEqual(generateTheme({ seed, style: "vibrant" }));
    }
  });
});
