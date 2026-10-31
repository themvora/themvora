/**
 * Tests for generation input completeness and reactivity.
 *
 * Verifies that:
 * 1. All generation options (seed, family, style, contrast, algorithm, withCode) are captured
 * 2. Generation inputs are reactive to inspection changes
 * 3. Inputs read from source match the generation contract
 */
import { describe, expect, it } from "vitest";

import { generateTheme, GENERATION_STYLE_NAMES } from "@themvora/core";

import { parseStudioIntent } from "../src/shared/studioProtocol.js";

describe("Generation input protocol", () => {
  it("parses generate intent with all inputs", () => {
    const message = {
      type: "generate",
      seed: "#0066cc",
      kind: "generate",
      family: "my-theme",
      style: "vibrant",
      contrast: "AA",
      algorithm: "semantic-v2",
      withCode: true,
    };

    const intent = parseStudioIntent(message);
    expect(intent).not.toBeNull();
    expect(intent?.type).toBe("generate");
    if (intent?.type === "generate") {
      expect(intent.seed).toBe("#0066cc");
      expect(intent.family).toBe("my-theme");
      expect(intent.style).toBe("vibrant");
      expect(intent.contrast).toBe("AA");
      expect(intent.algorithm).toBe("semantic-v2");
      expect(intent.withCode).toBe(true);
    }
  });

  it("parses generate intent with minimal inputs", () => {
    const message = {
      type: "generate",
      seed: "#0066cc",
      kind: "generate",
    };

    const intent = parseStudioIntent(message);
    expect(intent).not.toBeNull();
    expect(intent?.type).toBe("generate");
    if (intent?.type === "generate") {
      expect(intent.seed).toBe("#0066cc");
      expect(intent.family).toBeUndefined();
      expect(intent.style).toBeUndefined();
      expect(intent.contrast).toBeUndefined();
      expect(intent.algorithm).toBeUndefined();
      expect(intent.withCode).toBeUndefined();
    }
  });

  it("parses previewGenerate intent with all inputs", () => {
    const message = {
      type: "previewGenerate",
      requestId: 42,
      seed: "#cc0066",
      kind: "define",
      family: "test-family",
      style: "soft",
      contrast: "AA",
      algorithm: "semantic-v2",
      withCode: true,
    };

    const intent = parseStudioIntent(message);
    expect(intent).not.toBeNull();
    expect(intent?.type).toBe("previewGenerate");
    if (intent?.type === "previewGenerate") {
      expect(intent.requestId).toBe(42);
      expect(intent.seed).toBe("#cc0066");
      expect(intent.family).toBe("test-family");
      expect(intent.style).toBe("soft");
      expect(intent.contrast).toBe("AA");
      expect(intent.algorithm).toBe("semantic-v2");
      expect(intent.withCode).toBe(true);
    }
  });

  it("rejects generate intent without seed", () => {
    const message = {
      type: "generate",
      kind: "generate",
    };

    const intent = parseStudioIntent(message);
    expect(intent).toBeNull();
  });

  it("rejects previewGenerate intent without requestId", () => {
    const message = {
      type: "previewGenerate",
      seed: "#0066cc",
      kind: "generate",
    };

    const intent = parseStudioIntent(message);
    expect(intent).toBeNull();
  });
});

describe("Generation input completeness", () => {
  it("captures all supported styles", () => {
    const styles = [...GENERATION_STYLE_NAMES];
    expect(styles).toContain("balanced");
    expect(styles).toContain("soft");
    expect(styles).toContain("vibrant");
    expect(styles).toContain("editorial");
    expect(styles).toContain("minimal");
    expect(styles).toContain("brand");
  });

  it("generated theme includes generation metadata", () => {
    const pair = generateTheme({
      seed: "#0066cc",
      family: "test-family",
      style: "vibrant",
      withCode: true,
    });

    expect(pair.light.meta?.generation).toBeDefined();
    expect(pair.light.meta?.generation?.seed).toBe("#0066cc");
    expect(pair.light.meta?.generation?.style).toBe("vibrant");
    expect(pair.light.meta?.family).toBe("test-family");
    expect(pair.light.tokens?.code).toBeDefined();
  });

  it("generated theme records algorithm", () => {
    const pair = generateTheme({
      seed: "#0066cc",
      algorithm: "semantic-v2",
    });

    expect(pair.light.meta?.generation?.algorithm).toBe("semantic-v2");
  });

  it("generated theme records contrast contract", () => {
    const pair = generateTheme({
      seed: "#0066cc",
      contrast: "AA",
    });

    expect(pair.light.meta?.generation?.contrast).toBeDefined();
    expect(pair.light.meta?.generation?.contrast?.text).toBe(4.5);
    expect(pair.light.meta?.generation?.contrast?.largeText).toBe(3);
    expect(pair.light.meta?.generation?.contrast?.ui).toBe(3);
  });
});

describe("Generation input reactivity", () => {
  it("preserves inputs across light/dark pair", () => {
    const pair = generateTheme({
      seed: "#0066cc",
      family: "reactive-test",
      style: "editorial",
    });

    // Both themes should have the same generation metadata
    expect(pair.light.meta?.generation?.seed).toBe(pair.dark.meta?.generation?.seed);
    expect(pair.light.meta?.generation?.style).toBe(pair.dark.meta?.generation?.style);
    expect(pair.light.meta?.family).toBe(pair.dark.meta?.family);
  });

  it("different seeds produce different themes", () => {
    const pair1 = generateTheme({ seed: "#0066cc" });
    const pair2 = generateTheme({ seed: "#cc0066" });

    expect(pair1.light.tokens?.colors?.primary).not.toBe(
      pair2.light.tokens?.colors?.primary,
    );
  });

  it("same seed produces identical themes (deterministic)", () => {
    const pair1 = generateTheme({ seed: "#0066cc", family: "test" });
    const pair2 = generateTheme({ seed: "#0066cc", family: "test" });

    expect(pair1.light.tokens?.colors?.primary).toBe(
      pair2.light.tokens?.colors?.primary,
    );
    expect(pair1.light.name).toBe(pair2.light.name);
  });
});
