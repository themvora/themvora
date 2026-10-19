import { describe, expect, it } from "vitest";
import {
  contrast,
  hexToRgb,
  pickThumbColor,
  pickThumbFromCandidates,
  SCROLLBAR_THUMB_CANDIDATES,
  THUMB_CONTRAST_FLOOR,
} from "../src/scrollbar/thumb-color";
import { getPresetCatalog } from "../src";

/**
 * The `scrollbar-thumb-on-canvas` guarantee.
 *
 * A scrollbar thumb is the only thing telling a reader where they are in a
 * document, so it has to be visible. The old rule took the first of
 * `primary → accent → foreground → text` that existed, with no visibility check
 * — which in Slack dark produced a purple thumb on a near-black canvas at
 * **1.42:1**. `primary` is now a candidate, not a promise.
 */

describe("scrollbar thumb colour", () => {
  it("clears the non-text floor in every shipped theme, both modes", () => {
    const failures: string[] = [];

    for (const entry of getPresetCatalog()) {
      for (const mode of ["light", "dark"] as const) {
        const colors = entry.themes[mode].tokens?.colors as Record<string, unknown>;
        const thumb = pickThumbColor(colors);
        const canvas = hexToRgb(colors.background as string);

        expect(thumb, `${entry.id}/${mode} produced no thumb`).not.toBeNull();
        const ratio = contrast(thumb as [number, number, number], canvas as [number, number, number]);
        if (ratio < THUMB_CONTRAST_FLOOR) {
          failures.push(`${entry.id}/${mode} ${ratio.toFixed(2)}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it("keeps the brand when the brand is visible", () => {
    // Discord light: blurple clears the floor on the light canvas, so the thumb
    // should still be the brand colour rather than the neutral fallback.
    const entry = getPresetCatalog().find((item) => item.id === "discord");
    expect(entry).toBeDefined();
    const colors = entry?.themes.light.tokens?.colors as Record<string, unknown>;
    const thumb = pickThumbColor(colors);
    expect(thumb).toEqual(hexToRgb(colors.primary as string));
  });

  it("falls through to a visible role when the brand is not", () => {
    // Slack dark is the case from the report: the brand aubergine is far too
    // close to the canvas, so the thumb must not be the brand colour.
    const entry = getPresetCatalog().find((item) => item.id === "slack");
    expect(entry).toBeDefined();
    const colors = entry?.themes.dark.tokens?.colors as Record<string, unknown>;

    const primary = hexToRgb(colors.primary as string) as [number, number, number];
    const canvas = hexToRgb(colors.background as string) as [number, number, number];
    expect(contrast(primary, canvas)).toBeLessThan(THUMB_CONTRAST_FLOOR);

    const thumb = pickThumbColor(colors);
    expect(thumb).not.toEqual(primary);
    expect(contrast(thumb as [number, number, number], canvas)).toBeGreaterThanOrEqual(
      THUMB_CONTRAST_FLOOR,
    );
  });

  it("never depends on a `text` role, which Themvora does not define", () => {
    // `--theme-color-text` used to be in the lookup chain and has never existed.
    const colors = {
      background: "#0b0b0d",
      primary: "#101014",
      accent: "#0f0f13",
      foreground: "#f5f5f7",
      text: "#ffffff",
    };
    // The `text` entry must be ignored entirely: it is not a Themvora role.
    const thumb = pickThumbColor(colors);
    expect(thumb).toEqual(hexToRgb("#f5f5f7"));

    // And with no `foreground` at all, there is nothing semantic to fall back to.
    expect(pickThumbColor({ background: "#0b0b0d", text: "#ffffff" })).toBeNull();
  });

  it("returns the semantic floor when the canvas cannot be read", () => {
    const candidates = [hexToRgb("#5865f2"), hexToRgb("#9e65dc"), hexToRgb("#fbfcfd")];
    expect(pickThumbFromCandidates(candidates, null)).toEqual(hexToRgb("#fbfcfd"));
  });

  it("never modifies the theme to solve its own visibility problem", () => {
    // The integration owns this fix. Repainting `primary` so the scrollbar can
    // use it would be backwards — the theme is correct and the consumer chose a
    // colour its context does not support.
    const entry = getPresetCatalog().find((item) => item.id === "slack");
    const colors = entry?.themes.dark.tokens?.colors as Record<string, unknown>;
    const before = JSON.stringify(colors);

    pickThumbColor(colors);

    expect(JSON.stringify(colors)).toBe(before);
    expect(SCROLLBAR_THUMB_CANDIDATES[0]).toBe("primary");
    expect(SCROLLBAR_THUMB_CANDIDATES[SCROLLBAR_THUMB_CANDIDATES.length - 1]).toBe("foreground");
  });

  it("prefers identity order among equally visible candidates", () => {
    const candidates = [hexToRgb("#5865f2"), hexToRgb("#fbfcfd")];
    const canvas = hexToRgb("#ffffff");
    // Both clear the floor on white; the brand wins because it is tried first.
    const thumb = pickThumbFromCandidates(candidates, canvas);
    expect(thumb).toEqual(hexToRgb("#5865f2"));
  });
});
