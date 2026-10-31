/**
 * Variant resolution for side-by-side comparison.
 *
 * The point of the test is that each panel is bound to a *different* theme's
 * tokens. Two headings and two swatch strips would pass while showing the same
 * colours twice, so the assertions compare actual token values against the
 * source themes.
 */

import { generateTheme } from "@themvora/core";
import { describe, expect, it } from "vitest";

import { variantViews } from "../src/adapters/studioPanel";
import { createThemvoraClient } from "../src/services/coreClient";

const client = createThemvoraClient();
const PAIR = generateTheme({ seed: "#4f46e5" });

/** The value of one token in a variant. */
function token(variant: { tokens: readonly { name: string; value: string }[] }, name: string): string {
  return variant.tokens.find((entry) => entry.name === name)?.value ?? "";
}

describe("variantViews", () => {
  it("resolves both halves of a generated pair, bound to their own tokens", async () => {
    const variants = await variantViews([PAIR.light, PAIR.dark], client);

    expect(variants.map((variant) => variant.mode)).toEqual(["light", "dark"]);
    expect(variants.map((variant) => variant.name)).toEqual([PAIR.light.name, PAIR.dark.name]);

    // Each side is the real theme, not the other one's colours twice.
    expect(token(variants[0]!, "background")).toBe(PAIR.light.tokens?.colors?.background);
    expect(token(variants[1]!, "background")).toBe(PAIR.dark.tokens?.colors?.background);
    expect(token(variants[0]!, "background")).not.toBe(token(variants[1]!, "background"));
  });

  it("gives a single-mode theme one variant, not an invented counterpart", async () => {
    const variants = await variantViews([PAIR.light], client);

    expect(variants).toHaveLength(1);
    expect(variants[0]?.mode).toBe("light");
  });

  it("does not repeat a mode when a family lists it twice", async () => {
    const variants = await variantViews([PAIR.light, PAIR.light, PAIR.dark], client);

    expect(variants.map((variant) => variant.mode)).toEqual(["light", "dark"]);
  });

  it("carries the Theme Preview panel's own model for each variant", async () => {
    const variants = await variantViews([PAIR.light, PAIR.dark], client);

    for (const [index, theme] of [PAIR.light, PAIR.dark].entries()) {
      const surface = variants[index]?.surface;
      expect(surface?.themeName).toBe(theme.name);
      expect(surface?.mode).toBe(theme.meta?.mode);
      expect(surface?.modes).toEqual(["light", "dark"]);
      expect(surface?.variables["--theme-color-background"]).toBe(theme.tokens?.colors?.background);
      expect(surface?.readable.primary).toBeDefined();
    }
  });

  it("carries contrast for the tokens that have a measured pair", async () => {
    const variants = await variantViews([PAIR.light, PAIR.dark], client);
    const measured = variants[0]?.tokens.filter((entry) => entry.contrasts !== undefined && entry.contrasts.length > 0) ?? [];

    expect(measured.length).toBeGreaterThan(0);
    for (const entry of measured) {
      for (const contrast of entry.contrasts ?? []) {
        expect(contrast.ratio).toBeGreaterThan(0);
      }
    }
  });
});
