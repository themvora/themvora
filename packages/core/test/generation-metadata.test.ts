import { describe, expect, it } from "vitest";
import { generateTheme, validateTheme } from "../src";
import { GENERATION_ALGORITHM, resolveGenerationAlgorithm } from "../src/generation";

/**
 * Phase 6 — provenance, versioning and determinism.
 */
describe("generation provenance", () => {
  it("records the algorithm and seed in meta.generation", () => {
    const { light, dark } = generateTheme({ seed: "#0071e3", family: "brand" });

    expect(light.meta?.generation).toEqual({
      kind: "generated",
      algorithm: "semantic-v2",
      seed: "#0071e3",
      contrast: { text: 4.5, largeText: 3, ui: 3 },
    });
    expect(dark.meta?.generation?.seed).toBe("#0071e3");
    expect(dark.meta?.generation?.algorithm).toBe("semantic-v2");
  });

  it("keeps the seed as provenance, separate from the resolved primary", () => {
    const { light } = generateTheme({ seed: "#3b82f6" });

    // The seed is the input, verbatim; the primary is the result and may have
    // been repaired. They are different fields for a reason.
    expect(light.meta?.generation?.seed).toBe("#3b82f6");
    expect(typeof light.tokens?.colors?.primary).toBe("string");
  });

  it("records the style only when one was chosen", () => {
    expect(generateTheme({ seed: "#3b82f6", style: "editorial" }).light.meta?.generation?.style).toBe(
      "editorial",
    );
    expect(generateTheme({ seed: "#3b82f6" }).light.meta?.generation?.style).toBeUndefined();
  });

  it("distinguishes the algorithm version from the schema version", () => {
    const { light } = generateTheme({ seed: "#3b82f6" });

    // meta.generation.algorithm is the generator; meta.version is the token
    // schema. They are different axes and must not be conflated.
    expect(light.meta?.generation?.algorithm).toBe(GENERATION_ALGORITHM);
    expect(light.meta?.generation?.algorithm).not.toBe(light.meta?.version);
  });

  it("can pin a specific algorithm, and rejects an unknown one", () => {
    expect(resolveGenerationAlgorithm()).toBe(GENERATION_ALGORITHM);
    expect(resolveGenerationAlgorithm("semantic-v2")).toBe("semantic-v2");
    expect(() => generateTheme({ seed: "#3b82f6", algorithm: "semantic-v9" })).toThrow();
  });

  it("does not break schema validation", () => {
    const { light, dark } = generateTheme({ seed: "#3b82f6" });

    expect(validateTheme(light).valid).toBe(true);
    expect(validateTheme(dark).valid).toBe(true);
  });
});

describe("generation determinism", () => {
  it("produces byte-identical output across repeated calls", () => {
    const run = () =>
      generateTheme({ seed: "#8b5cf6", family: "x", style: "vibrant", withCode: true });

    const first = JSON.stringify(run());
    for (let i = 0; i < 4; i += 1) {
      expect(JSON.stringify(run())).toBe(first);
    }
  });

  it("is independent of the order in which seeds are generated", () => {
    const seeds = ["#3b82f6", "#d97706", "#22c55e", "#7c3aed"];

    const forward = new Map(seeds.map((seed) => [seed, generateTheme({ seed })]));
    const backward = new Map([...seeds].reverse().map((seed) => [seed, generateTheme({ seed })]));

    for (const seed of seeds) {
      expect(backward.get(seed)).toEqual(forward.get(seed));
    }
  });
});
