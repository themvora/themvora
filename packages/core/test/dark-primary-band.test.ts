import { describe, expect, it } from "vitest";
import { contrastRatioHex, hexToOklchMapped, oklchToHexMapped } from "../src/color";
import { auditActionProminence, getPresetCatalog } from "../src";

/**
 * Why dark-mode action fills are light, and why that is correct.
 *
 * ## The question
 *
 * Every generated family flips ink between modes: light ink on the fill in light
 * mode, dark ink in dark mode. The dark bands sit ~0.20 above the light bands
 * (`balanced`: 0.45-0.62 light, 0.68-0.80 dark). Is semantic-v2 making dark action
 * fills *unnecessarily* light?
 *
 * ## The answer, measured
 *
 * No — and the arithmetic says the alternative does not exist.
 *
 * A dark canvas sits at luminance **0.0041** (`#0d0d10`). For light ink to clear
 * the internal target on a fill, the fill's luminance must be <= 0.17105. For the
 * fill to still read as a *control* it must clear 3:1 against that canvas. Solving
 * both at once leaves a band **0.04 wide** — `L 0.50-0.54`:
 *
 * ```
 *   L 0.48   white 6.69   vs-canvas 2.90   x fill barely separates from the page
 *   L 0.50   white 6.13   vs-canvas 3.17   ok
 *   L 0.54   white 5.17   vs-canvas 3.76   ok
 *   L 0.56   white 4.75   vs-canvas 4.09   x white just fails
 * ```
 *
 * Every family would be forced into that band, and the style parameters that
 * distinguish `soft` from `vibrant` from `editorial` are largely *lightness* — so
 * the styles would collapse into one another.
 *
 * And the trade is bad in its own terms: the shipped fills stand **5-8:1** off the
 * canvas. Moving to the white-ink band would drop that to 3.2-3.8:1 — *less*
 * prominent than the light-mode fills they would be matching.
 *
 * So `primaryLightnessDark` stays where it is. What was missing is not a change
 * but an **invariant**: nothing asserted that a dark fill is prominent enough to
 * read as an action. That is what this test adds.
 */

const WHITE = "#ffffff";
const BLACK = "#000000";

/** Relative luminance, recovered from the contrast against black. */
function luminance(hex: string): number {
  return contrastRatioHex(hex, BLACK) * 0.05 - 0.05;
}

/** Contrast between two colours, by luminance. */
function against(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const DARK_CANVAS = "#0d0d10";

describe("dark action fills — the band argument", () => {
  it("shows the white-ink band is only 0.04 wide", () => {
    const usable: number[] = [];
    for (let l = 0.3; l <= 0.9; l += 0.01) {
      const hex = oklchToHexMapped({ l, c: 0.15, h: 265 });
      if (contrastRatioHex(hex, WHITE) >= 4.75 && against(hex, DARK_CANVAS) >= 3) usable.push(l);
    }

    const low = usable[0] ?? 0;
    const high = usable[usable.length - 1] ?? 0;
    expect(high - low).toBeLessThan(0.08);
    // Documented so a future change to the target fails loudly here rather than
    // silently widening a band that is already too narrow to vary within.
    expect(low).toBeGreaterThan(0.48);
    expect(high).toBeLessThan(0.56);
  });

  it("keeps every generated dark action fill prominent against the canvas", () => {
    // The invariant that was missing, read from the formal contract rather than
    // re-derived here. A fill that does not separate from the canvas has stopped
    // reading as a control, whatever its ink contrast says.
    const failures: string[] = [];

    for (const entry of getPresetCatalog().filter((item) => item.kind === "default")) {
      const prominence = auditActionProminence(entry.themes.dark);
      expect(prominence.anchored, entry.id).toBe(false);
      if (!prominence.passes) failures.push(entry.id + " " + prominence.ratio.toFixed(2));
    }

    expect(failures).toEqual([]);
  });

  it("reports anchored brand fills instead of failing them", () => {
    // The distinction the contract exists to make. An anchored fill is the
    // brand's published colour; some brands are too dark to stand off a
    // near-black page, and that is fidelity working as designed. The audit
    // *reports* it — `anchored: true, passes: false` — so a future contributor
    // cannot read Slack's 1.42:1 as a generator failure and "fix" it by
    // replacing the brand colour.
    const brands = getPresetCatalog().filter((entry) => entry.kind === "brand");

    for (const entry of brands) {
      expect(auditActionProminence(entry.themes.dark).anchored, entry.id).toBe(true);
    }

    const belowFloor = brands
      .map((entry) => ({ id: entry.id, p: auditActionProminence(entry.themes.dark) }))
      .filter((item) => !item.p.passes)
      .map((item) => item.id);

    expect(belowFloor).toEqual(["slack"]);
  });

  it("keeps the styles distinguishable in dark mode", () => {
    // The reason the band cannot simply be moved: style identity in dark mode is
    // carried by the fill's lightness. Forced into the white-ink band, these
    // would collapse together.
    const lightness = getPresetCatalog()
      .filter((entry) => entry.kind === "default")
      .map((entry) => {
        const colors = entry.themes.dark.tokens?.colors as Record<string, string>;
        return hexToOklchMapped(colors.primary).l;
      });

    const spread = Math.max(...lightness) - Math.min(...lightness);
    // Comfortably wider than the 0.04 band a white-ink constraint would allow.
    expect(spread).toBeGreaterThan(0.08);
  });

  it("records the ink each generated dark family ships", () => {
    // A snapshot of the decision, so a future change has to be deliberate.
    const shipped = getPresetCatalog()
      .filter((entry) => entry.kind === "default")
      .map((entry) => {
        const colors = entry.themes.dark.tokens?.colors as Record<string, string>;
        return contrastRatioHex(colors.primaryForeground, BLACK) > 12 ? "light" : "dark";
      });

    // Every generated family uses dark ink on its dark fill — because every one of
    // them sits above the white-ink band, by design.
    expect(shipped.every((ink) => ink === "dark")).toBe(true);
  });
});
