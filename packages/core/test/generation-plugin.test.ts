import { describe, expect, it } from "vitest";
import {
  createGenerationPlugin,
  generateTheme,
  ThemeError,
  type GenerateThemeOptions,
  type ThemeDefinition,
  type ThemeTokens,
} from "../src";

/**
 * Phase 8: the generation plugin is a thin wrapper over `generateTheme`.
 *
 * Phase 0 captured it as inert (its `onGenerate` was never called and it had no
 * generate entry point). These assertions lock the replacement behaviour: the
 * plugin delegates, so it cannot drift from the runtime.
 */
describe("createGenerationPlugin", () => {
  it("declares the theme-generation plugin identity", () => {
    const plugin = createGenerationPlugin();

    expect(plugin.name).toBe("theme-generation");
    expect(plugin.version).toBe("1.0.0");
    expect(plugin.priority).toBe(30);
  });

  it("transformTokens is the identity function", () => {
    const plugin = createGenerationPlugin();
    const tokens: ThemeTokens = { colors: { primary: "#123456" } };

    const out = plugin.transformTokens?.(tokens, { theme: {} as ThemeDefinition });

    expect(out).toBe(tokens);
  });

  it("generate() delegates to generateTheme", () => {
    const plugin = createGenerationPlugin({ seed: "#6366f1" });

    expect(plugin.generate()).toEqual(generateTheme({ seed: "#6366f1" }));
  });

  it("passes per-call options through unchanged", () => {
    const plugin = createGenerationPlugin();

    const pair = plugin.generate({ seed: "#d97706", family: "oat", style: "vibrant" });

    expect(pair).toEqual(generateTheme({ seed: "#d97706", family: "oat", style: "vibrant" }));
  });

  it("invokes onGenerate with the resolved options", () => {
    const seen: GenerateThemeOptions[] = [];
    const plugin = createGenerationPlugin({ seed: "#6366f1", onGenerate: (o) => seen.push(o) });

    plugin.generate({ family: "brand" });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({ seed: "#6366f1", family: "brand" });
  });

  it("throws a typed error when no seed is available", () => {
    const plugin = createGenerationPlugin();

    expect(() => plugin.generate()).toThrow(ThemeError);
  });
});
