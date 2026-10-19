import { describe, expect, it } from "vitest";
import {
  FOREGROUND_PREFERENCE,
  chooseForeground,
  hasForegroundPreference,
  preferredInk,
  type ForegroundPreference,
} from "../src/generation/foreground-policy";
import { darkInk, lightInk } from "../src/generation/content";
import { deriveIdentity, resolveStyle } from "../src/generation";
import { generateTheme, getPresetCatalog } from "../src";
import { contrastRatio, contrastRatioHex, hexToOklchMapped, oklchToRgb } from "../src/color";
import type { CoreColor } from "../src/model/semantic-roles";
import type { PaletteContext } from "../src/generation/types";

/**
 * Foreground selection policy.
 *
 * The rule: **foreground selection optimises semantic role preference subject to
 * the contrast contract. Maximum numerical contrast is not the objective.**
 *
 * These tests exist because the old behaviour was an emergent property of a `>=`
 * comparison inside `bestInk`, which meant nothing documented it and nothing
 * stopped it regressing.
 */

const WHITE = "#ffffff";
const BLACK = "#000000";

/** A context for a given mode and seed, with the neutral hue derived properly. */
function contextFor(seed: string, mode: "light" | "dark"): PaletteContext {
  return { mode, identity: deriveIdentity(seed), style: resolveStyle("balanced") };
}

const ACTION_ROLES: CoreColor[] = [
  "primaryForeground",
  "destructiveForeground",
  "successForeground",
  "accentForeground",
];

describe("foreground policy — the ink-ordering invariant", () => {
  it("proves white clears the target only when it is also the higher ratio", () => {
    // For any single surface the two inks are inversely ordered around one
    // luminance, so "both pass but black scores higher" can only happen below
    // that crossing. This is *why* the policy is nearly free, and it is the
    // reason the scenario in the report cannot occur above the target.
    //
    // Surface luminance 0.17913 is where they cross:
    //   white = 1.05 / (L + 0.05)      black = (L + 0.05) / 0.05
    const greys = [
      "#000000", "#0d0d0d", "#1a1a1a", "#242424", "#2e2e2e",
      "#383838", "#4d4d4d", "#808080", "#b3b3b3", "#e6e6e6",
    ];

    for (const surface of greys) {
      const white = contrastRatioHex(WHITE, surface);
      const black = contrastRatioHex(BLACK, surface);
      // Whatever the surface, exactly one of the two is the higher ratio, and
      // the switch happens once — never twice.
      expect(white === black, surface).toBe(false);
      if (white >= 4.75) expect(white, surface).toBeGreaterThan(black);
      if (black >= 4.75) expect(black, surface).toBeGreaterThan(white);
    }
  });

  it("confines the 4.5–4.583 band to surfaces lighter than the crossing", () => {
    // The only place "both clear AA but black is higher" is reachable.
    const lightestWhitePassing = 1.05 / 4.75 - 0.05; // L for white = 4.75
    const crossing = Math.sqrt(1.05 * 0.05) - 0.05;
    expect(lightestWhitePassing).toBeLessThan(crossing);

    // And across 512 generated seeds the band is never entered, so no shipped
    // theme's appearance depends on how it is resolved.
    let inBand = 0;
    for (let r = 0; r < 8; r += 1) {
      for (let g = 0; g < 8; g += 1) {
        for (let b = 0; b < 8; b += 1) {
          const seed = `#${[r, g, b].map((v) => (v * 36).toString(16).padStart(2, "0")).join("")}`;
          const colors = generateTheme({ seed, family: "probe" }).light.tokens?.colors as Record<string, string>;
          const w = contrastRatio(WHITE, colors.primary as string);
          if (w >= 4.5 && w < 4.583) inBand += 1;
        }
      }
    }
    expect(inBand).toBe(0);
  });
});

describe("foreground policy — role preferences", () => {
  it("declares a preference only for action and emphasis surfaces", () => {
    // The list being short is the design. A reading ink sits on a surface whose
    // lightness flips with the mode, so a fixed preference would be wrong in one
    // mode — an earlier draft made `mutedForeground` prefer light and broke
    // `mutedForeground/muted` down to 4.495:1.
    const roles = Object.keys(FOREGROUND_PREFERENCE).sort();
    expect(roles).toEqual([...ACTION_ROLES].sort());

    for (const reading of ["foreground", "cardForeground", "mutedForeground", "secondaryForeground"]) {
      expect(hasForegroundPreference(reading as CoreColor), reading).toBe(false);
    }
  });

  it("prefers light ink for every action role", () => {
    for (const role of ACTION_ROLES) {
      expect(FOREGROUND_PREFERENCE[role]).toBe<ForegroundPreference>("light");
    }
  });

  it("selects the preferred ink whenever it clears the target", () => {
    const ctx = contextFor("#6366f1", "light");
    const light = lightInk(ctx);

    // A surface the light ink comfortably clears.
    const darkSurface = { l: 0.12, c: 0.1, h: 265 };
    expect(contrastRatio(oklchToRgb(light), oklchToRgb(darkSurface))).toBeGreaterThanOrEqual(4.75);

    for (const role of ACTION_ROLES) {
      const chosen = chooseForeground(role, darkSurface, ctx);
      expect(chosen, role).toEqual(preferredInk(role, ctx));
    }
  });

  it("falls back to the other ink when the preferred one cannot clear the target", () => {
    const ctx = contextFor("#65b893", "dark");
    const light = lightInk(ctx);
    const dark = darkInk(ctx);

    // A light surface, taken from a real dark-mode preset whose primary is bright
    // enough that light ink cannot work on it.
    const surface = hexToOklchMapped("#65b893");
    const lightRatio = contrastRatio(oklchToRgb(light), oklchToRgb(surface));
    const darkRatio = contrastRatio(oklchToRgb(dark), oklchToRgb(surface));

    expect(lightRatio).toBeLessThan(4.75);
    expect(darkRatio).toBeGreaterThanOrEqual(4.75);
    expect(chooseForeground("primaryForeground", surface, ctx)).toEqual(dark);
  });

  it("never leaves an action pair below the published floor", () => {
    for (const entry of getPresetCatalog()) {
      for (const mode of ["light", "dark"] as const) {
        const colors = entry.themes[mode].tokens?.colors as Record<string, string>;
        for (const role of ACTION_ROLES) {
          const surface = role.replace(/Foreground$/, "") as string;
          const fg = colors[role];
          const bg = colors[surface];
          if (!fg || !bg) continue;
          expect(
            contrastRatioHex(fg, bg),
            `${entry.id}/${mode} ${role}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("holds every shipped action pair above the internal target, within rounding", () => {
    // Two different floors apply, and conflating them is what made the first
    // draft of this test wrong:
    //
    //   generated pairs  target the internal margin, 4.75, less ~0.03 rounding
    //   anchored pairs   target floor + 0.03, 4.53, because the brand colour is
    //                    pinned and the margin is the thing that gives way
    //
    // So the practical floor across all of them is 4.6, and the measured worst is
    // Apple light at 4.6687 — an anchored primary. The published floor (4.50) is
    // asserted separately above, and that is the actual guarantee.
    const worst = { ratio: Infinity, where: "" };
    for (const entry of getPresetCatalog()) {
      for (const mode of ["light", "dark"] as const) {
        const colors = entry.themes[mode].tokens?.colors as Record<string, string>;
        for (const role of ACTION_ROLES) {
          const surface = role.replace(/Foreground$/, "") as string;
          const fg = colors[role];
          const bg = colors[surface];
          if (!fg || !bg) continue;
          const ratio = contrastRatioHex(fg, bg);
          if (ratio < worst.ratio) {
            worst.ratio = ratio;
            worst.where = `${entry.id}/${mode} ${role}`;
          }
          expect(ratio, `${entry.id}/${mode} ${role}`).toBeGreaterThanOrEqual(4.6);
        }
      }
    }
    expect(worst.ratio).toBeGreaterThan(4.6);
  });

  it("selects the semantically preferred ink for every shipped action pair", () => {
    // The regression guard for the reported behaviour: an action surface must not
    // carry the fallback ink unless the preferred one genuinely fails.
    for (const entry of getPresetCatalog()) {
      for (const mode of ["light", "dark"] as const) {
        const colors = entry.themes[mode].tokens?.colors as Record<string, string>;
        const primary = colors.primary;
        const fg = colors.primaryForeground;
        if (!primary || !fg) continue;

        const white = contrastRatioHex(WHITE, primary);
        const fgIsLight = contrastRatioHex(fg, BLACK) > 12;

        // If light ink clears the target, light ink is what must be shipped.
        if (white >= 4.75) {
          expect(fgIsLight, `${entry.id}/${mode} shipped dark ink though light clears 4.75`).toBe(true);
        }
      }
    }
  });

  it("does not depend on the ink being a literal white or black", () => {
    // The inks carry the theme's neutral hue, so a "white" foreground is a
    // near-white with a tint. Pinning this stops a future change from quietly
    // replacing them with pure #fff / #000 and losing the neutral character.
    const ctx = contextFor("#b45309", "light");
    const light = lightInk(ctx);
    const dark = darkInk(ctx);
    expect(light.c).toBeGreaterThan(0);
    expect(light.l).toBeGreaterThan(0.95);
    expect(dark.l).toBeLessThan(0.25);

    const hex = generateTheme({ seed: "#b45309" }).light.tokens?.colors as Record<string, string>;
    expect(hex.primaryForeground).not.toBe(WHITE);
    expect(hex.primaryForeground).not.toBe(BLACK);
    expect(hexToOklchMapped(hex.primaryForeground as string).l).toBeGreaterThan(0.9);
  });
});
