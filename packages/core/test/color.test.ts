import { describe, expect, it } from "vitest";
import {
  adjustChroma,
  adjustLightness,
  buildRamp,
  CHROMA_EPSILON,
  chromaRamp,
  clampLightness,
  ColorError,
  contrastRatio,
  contrastRatioHex,
  deltaEOk,
  deltaEOklch,
  gamutMapOklch,
  hexToOklch,
  hexToOklchMapped,
  hslToRgb,
  hueDistance,
  isAchromatic,
  isHexColor,
  isInGamut,
  lightnessRamp,
  linearRgbToOklab,
  linearRgbToRgb,
  linearToSrgb,
  meetsContrast,
  mixOklch,
  normalizeHue,
  normalizeOklch,
  oklabToLinearRgb,
  oklabToOklch,
  oklchToCss,
  oklchToHex,
  oklchToHexMapped,
  oklchToOklab,
  oklchToRgb,
  parseColor,
  relativeLuminance,
  rgbToCss,
  rgbToHex,
  rgbToHsl,
  rgbToLinearRgb,
  rgbToOklch,
  roleDistance,
  roleSimilarity,
  rotateHue,
  shortestHueDelta,
  srgbToLinear,
  tryParseColor,
  withChroma,
  withHue,
  withLightness,
} from "../src/color";

/** A spread of in-gamut colors: primaries, grays, pastels, dark and light. */
const ROUND_TRIP_COLORS = [
  "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff",
  "#ffff00", "#00ffff", "#ff00ff", "#808080", "#7c3aed",
  "#0ea5e9", "#16a34a", "#d97706", "#fde68a", "#1e3a8a",
  "#831843", "#a1a1aa", "#f5f5f5", "#0a0a0a", "#3b82f6",
];

function channelDistance(a: string, b: string): number {
  const pa = parseColor(a);
  const pb = parseColor(b);
  return Math.max(Math.abs(pa.r - pb.r), Math.abs(pa.g - pb.g), Math.abs(pa.b - pb.b));
}

describe("color/parse", () => {
  it("parses 3/4/6/8-digit hex", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor("#f00f")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor("#7c3aed")).toEqual({ r: 124, g: 58, b: 237 });
    expect(parseColor("#7c3aedff")).toEqual({ r: 124, g: 58, b: 237 });
  });

  it("parses rgb()/rgba() in comma and space syntax, with percentages", () => {
    expect(parseColor("rgb(124, 58, 237)")).toEqual({ r: 124, g: 58, b: 237 });
    expect(parseColor("rgb(124 58 237)")).toEqual({ r: 124, g: 58, b: 237 });
    expect(parseColor("rgba(124, 58, 237, 0.5)")).toEqual({ r: 124, g: 58, b: 237 });
    expect(parseColor("rgb(100%, 0%, 0%)")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses hsl()/hsla() in comma and space syntax", () => {
    const red = parseColor("hsl(0, 100%, 50%)");
    expect(red).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor("hsl(0 100% 50%)")).toEqual(red);
    expect(parseColor("hsl(0deg, 100%, 50%)")).toEqual(red);
    expect(parseColor("hsla(0, 100%, 50%, 0.3)")).toEqual(red);
  });

  it("trims surrounding whitespace and accepts uppercase", () => {
    expect(parseColor("  #FF0000  ")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("rejects invalid input with a typed ColorError", () => {
    for (const bad of ["", "   ", "not-a-color", "#12", "#12345", "#gggggg", "rgb(1,2)", "hsl(1)"]) {
      expect(() => parseColor(bad), bad).toThrow(ColorError);
    }
  });

  it("exposes the offending input on the error", () => {
    try {
      parseColor("nope");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ColorError);
      expect((error as ColorError).input).toBe("nope");
    }
  });

  it("tryParseColor returns null instead of throwing", () => {
    expect(tryParseColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(tryParseColor("nope")).toBeNull();
  });
});

describe("color/convert", () => {
  it("round-trips HEX → OKLCH → HEX within one channel unit", () => {
    for (const hex of ROUND_TRIP_COLORS) {
      const back = oklchToHex(hexToOklch(hex));
      expect(channelDistance(hex, back), `${hex} → ${back}`).toBeLessThanOrEqual(1);
    }
  });

  it("maps white and black to the ends of the lightness axis with no chroma", () => {
    const white = hexToOklch("#ffffff");
    const black = hexToOklch("#000000");
    expect(white.l).toBeCloseTo(1, 3);
    expect(white.c).toBeLessThan(1e-3);
    expect(black.l).toBeCloseTo(0, 3);
    expect(black.c).toBeLessThan(1e-3);
  });

  it("reports h = 0 for achromatic colors (no NaN hue)", () => {
    for (const gray of ["#000000", "#808080", "#ffffff", "#f5f5f5"]) {
      const lch = hexToOklch(gray);
      expect(Number.isNaN(lch.h)).toBe(false);
      expect(lch.h).toBe(0);
      expect(isAchromatic(lch)).toBe(true);
    }
  });

  it("never produces NaN/Infinity for extreme but finite OKLCH input", () => {
    const extremes = [
      { l: 0, c: 0.4, h: 200 },
      { l: 1, c: 0.4, h: 200 },
      { l: 0.5, c: 0, h: 0 },
      { l: 0.5, c: 0.9, h: 359.9 },
      { l: -0.5, c: 0.5, h: 10 },
      { l: 1.5, c: 0.5, h: 10 },
    ];
    for (const lch of extremes) {
      const rgb = oklchToRgb(lch);
      for (const channel of [rgb.r, rgb.g, rgb.b]) {
        expect(Number.isFinite(channel)).toBe(true);
      }
    }
  });

  it("normalises hue around the wheel", () => {
    expect(normalizeHue(370)).toBeCloseTo(10, 10);
    expect(normalizeHue(-10)).toBeCloseTo(350, 10);
    expect(normalizeHue(360)).toBeCloseTo(0, 10);
  });

  it("round-trips RGB → HSL → RGB within one channel unit", () => {
    for (const hex of ROUND_TRIP_COLORS) {
      const back = rgbToHex(hslToRgb(rgbToHsl(parseColor(hex))));
      expect(channelDistance(hex, back), `${hex} → ${back}`).toBeLessThanOrEqual(1);
    }
  });

  it("reports gamut membership", () => {
    expect(isInGamut({ r: 0, g: 128, b: 255 })).toBe(true);
    expect(isInGamut({ r: -40, g: 128, b: 255 })).toBe(false);
    expect(isInGamut({ r: 300, g: 128, b: 255 })).toBe(false);
  });
});

describe("color/luminance & contrast", () => {
  it("matches WCAG reference luminances", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 6);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 6);
  });

  it("black on white is 21:1 and identical colors are 1:1", () => {
    expect(contrastRatioHex("#000000", "#ffffff")).toBeCloseTo(21, 4);
    expect(contrastRatioHex("#ffffff", "#000000")).toBeCloseTo(21, 4);
    expect(contrastRatioHex("#3b82f6", "#3b82f6")).toBeCloseTo(1, 10);
  });

  it("is symmetric", () => {
    expect(contrastRatioHex("#123456", "#abcdef")).toBeCloseTo(
      contrastRatioHex("#abcdef", "#123456"),
      10,
    );
  });

  it("does not round thresholds upward", () => {
    // 4.499 must not pass 4.5; 4.5 must.
    expect(meetsContrast(4.499, 4.5)).toBe(false);
    expect(meetsContrast(4.5, 4.5)).toBe(true);
    expect(meetsContrast(4.5000001, 4.5)).toBe(true);
  });

  it("measures the known-failing generator pair honestly", () => {
    // White on #3b82f6 is below AA; near-black is above. This is the pair that
    // Phase 0 recorded as a stale assertion.
    expect(contrastRatioHex("#ffffff", "#3b82f6")).toBeLessThan(4.5);
    expect(contrastRatioHex("#0f172a", "#3b82f6")).toBeGreaterThanOrEqual(4.5);
  });

  it("contrastRatio accepts Rgb objects", () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 4);
  });
});

describe("color/adjust", () => {
  it("sets lightness with clamping and preserves hue/chroma", () => {
    const base = hexToOklch("#3b82f6");
    const darker = withLightness(base, base.l - 0.2);
    expect(darker.l).toBeCloseTo(base.l - 0.2, 10);
    expect(darker.c).toBe(base.c);
    expect(darker.h).toBe(base.h);
    expect(withLightness(base, -1).l).toBe(0);
    expect(withLightness(base, 2).l).toBe(1);
  });

  it("sets chroma with a floor at zero and sets hue with wraparound", () => {
    const base = hexToOklch("#3b82f6");
    expect(withChroma(base, -5).c).toBe(0);
    expect(withHue(base, 370).h).toBeCloseTo(10, 10);
    expect(rotateHue(base, 90).h).toBeCloseTo(normalizeHue(base.h + 90), 10);
  });

  it("gamut-maps by reducing chroma while preserving lightness and hue", () => {
    // A saturated green at high chroma is outside sRGB.
    const outOfGamut = { l: 0.7, c: 0.4, h: 142 };
    expect(isInGamut(oklchToRgb(outOfGamut))).toBe(false);

    const mapped = gamutMapOklch(outOfGamut);
    expect(isInGamut(oklchToRgb(mapped))).toBe(true);
    expect(mapped.l).toBeCloseTo(outOfGamut.l, 10);
    expect(mapped.h).toBeCloseTo(outOfGamut.h, 10);
    expect(mapped.c).toBeLessThan(outOfGamut.c);
  });

  it("leaves in-gamut colors untouched", () => {
    const inGamut = hexToOklch("#3b82f6");
    expect(gamutMapOklch(inGamut)).toEqual(inGamut);
  });

  it("collapses achromatic colors to chroma 0", () => {
    const mapped = gamutMapOklch({ l: 0.5, c: 1e-6, h: 123 });
    expect(mapped.c).toBe(0);
  });

  it("normalizeOklch canonicalises ranges without gamut searching", () => {
    expect(normalizeOklch({ l: 2, c: -1, h: 400 })).toEqual({ l: 1, c: 0, h: 0 });
    expect(normalizeOklch({ l: -1, c: 0.2, h: -30 })).toEqual({ l: 0, c: 0.2, h: 330 });
    // Out-of-gamut but in-range chroma is preserved — no gamut search here.
    expect(normalizeOklch({ l: 0.7, c: 0.4, h: 142 }).c).toBe(0.4);
  });

  it("mixOklch takes the shortest hue arc", () => {
    const a = { l: 0.6, c: 0.2, h: 350 };
    const b = { l: 0.6, c: 0.2, h: 10 };
    const mid = mixOklch(a, b, 0.5);
    // Halfway across the 20° arc through 0°, i.e. hue 0 — not through 180.
    expect(hueDistance(mid.h, 0)).toBeLessThan(1);
    expect(mixOklch(a, b, 0)).toEqual(a);
    expect(mixOklch(a, b, 1)).toEqual(b);
  });

  it("shortestHueDelta is signed and wrapped", () => {
    expect(shortestHueDelta(350, 10)).toBeCloseTo(20, 10);
    expect(shortestHueDelta(10, 350)).toBeCloseTo(-20, 10);
    expect(shortestHueDelta(0, 180)).toBeCloseTo(180, 10);
  });
});

describe("color/ramps", () => {
  it("produces inclusive endpoints", () => {
    expect(lightnessRamp(0, 1, 3)).toEqual([0, 0.5, 1]);
    expect(lightnessRamp(0.2, 0.8, 1)).toEqual([0.2]);
    expect(chromaRamp(0, 0.4, 5)).toEqual([0, 0.1, 0.2, 0.30000000000000004, 0.4]);
  });

  it("is deterministic", () => {
    expect(lightnessRamp(0.1, 0.9, 7)).toEqual(lightnessRamp(0.1, 0.9, 7));
  });

  it("buildRamp gamut-maps every step", () => {
    const ramp = buildRamp({ l: 0.5, c: 0.2, h: 142 }, {
      lightness: [0.2, 0.9],
      chroma: [0.3, 0.05],
      steps: 6,
    });
    expect(ramp).toHaveLength(6);
    for (const step of ramp) {
      expect(isInGamut(oklchToRgb(step))).toBe(true);
      expect(step.h).toBeCloseTo(142, 6);
    }
  });
});

describe("color/compare", () => {
  it("deltaEOk is zero for identical colors and symmetric", () => {
    const a = hexToOklch("#3b82f6");
    const b = hexToOklch("#ef4444");
    expect(deltaEOklch(a, a)).toBe(0);
    expect(deltaEOklch(a, b)).toBeCloseTo(deltaEOklch(b, a), 12);
    expect(deltaEOklch(a, b)).toBeGreaterThan(0);
  });

  it("hueDistance handles wraparound", () => {
    expect(hueDistance(350, 10)).toBeCloseTo(20, 10);
    expect(hueDistance(10, 350)).toBeCloseTo(20, 10);
    expect(hueDistance(0, 180)).toBeCloseTo(180, 10);
    expect(hueDistance(90, 90)).toBe(0);
  });

  it("roleSimilarity is 1 for identical and decays with distance", () => {
    const a = hexToOklch("#7c3aed");
    const near = { l: a.l, c: a.c, h: normalizeHue(a.h + 2) };
    const far = hexToOklch("#22c55e");
    expect(roleSimilarity(a, a)).toBe(1);
    expect(roleSimilarity(a, near)).toBeGreaterThan(roleSimilarity(a, far));
    expect(roleDistance(a, far)).toBeGreaterThan(roleDistance(a, near));
  });

  it("oklabToOklch marks achromatic input with hue 0", () => {
    expect(oklabToOklch({ l: 0.5, a: 0, b: 0 })).toEqual({ l: 0.5, c: 0, h: 0 });
  });

  it("deltaEOk accepts raw OKLab", () => {
    expect(deltaEOk({ l: 0, a: 0, b: 0 }, { l: 1, a: 0, b: 0 })).toBeCloseTo(1, 10);
  });
});

describe("color convenience helpers", () => {
  it("hexToOklchMapped and oklchToHexMapped stay in gamut", () => {
    expect(isInGamut(oklchToRgb(hexToOklchMapped("#3b82f6")))).toBe(true);
    const hex = oklchToHexMapped({ l: 0.7, c: 0.4, h: 142 });
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("color/convert low-level layers", () => {
  it("srgbToLinear / linearToSrgb are inverses", () => {
    for (const c of [0, 0.02, 0.04045, 0.5, 0.9, 1]) {
      // The transfer function is piecewise; the two branches agree to ~1e-8.
      expect(linearToSrgb(srgbToLinear(c))).toBeCloseTo(c, 6);
    }
  });

  it("rgbToLinearRgb / linearRgbToRgb round-trip", () => {
    const rgb = parseColor("#7c3aed");
    const back = linearRgbToRgb(rgbToLinearRgb(rgb));
    expect(Math.abs(back.r - rgb.r)).toBeLessThan(1e-9);
    expect(Math.abs(back.g - rgb.g)).toBeLessThan(1e-9);
    expect(Math.abs(back.b - rgb.b)).toBeLessThan(1e-9);
  });

  it("linearRgbToOklab / oklabToLinearRgb round-trip", () => {
    const linear = rgbToLinearRgb(parseColor("#0ea5e9"));
    const back = oklabToLinearRgb(linearRgbToOklab(linear));
    // The published matrix constants are rounded to 10 decimals, so the
    // round-trip is exact to ~1e-7, not to machine epsilon.
    expect(Math.abs(back[0] - linear[0])).toBeLessThan(1e-6);
    expect(Math.abs(back[1] - linear[1])).toBeLessThan(1e-6);
    expect(Math.abs(back[2] - linear[2])).toBeLessThan(1e-6);
  });

  it("oklchToOklab / oklabToOklch round-trip for chromatic colors", () => {
    const lch = hexToOklch("#ef4444");
    const back = oklabToOklch(oklchToOklab(lch));
    expect(back.l).toBeCloseTo(lch.l, 10);
    expect(back.c).toBeCloseTo(lch.c, 10);
    expect(back.h).toBeCloseTo(lch.h, 8);
  });

  it("rgbToOklch agrees with hexToOklch", () => {
    expect(rgbToOklch(parseColor("#22c55e"))).toEqual(hexToOklch("#22c55e"));
  });

  it("emits CSS for rgb and oklch", () => {
    expect(rgbToCss({ r: 124, g: 58, b: 237 })).toBe("rgb(124, 58, 237)");
    expect(rgbToCss({ r: 124, g: 58, b: 237 }, 0.5)).toBe("rgba(124, 58, 237, 0.5)");
    expect(rgbToCss({ r: 300, g: -10, b: 12.6 })).toBe("rgb(255, 0, 13)");
    expect(oklchToCss({ l: 0.6279, c: 0.2577, h: 29.23 })).toBe("oklch(62.79% 0.2577 29.23)");
  });

  it("isHexColor recognises hex lengths only", () => {
    expect(isHexColor("#fff")).toBe(true);
    expect(isHexColor("#7c3aed")).toBe(true);
    expect(isHexColor("7c3aed")).toBe(false);
    expect(isHexColor("#7c3ae")).toBe(false);
    expect(isHexColor("rgb(1,2,3)")).toBe(false);
  });

  it("exposes a small chroma epsilon", () => {
    expect(CHROMA_EPSILON).toBeGreaterThan(0);
    expect(CHROMA_EPSILON).toBeLessThan(0.001);
  });

  it("clampLightness and adjustLightness/adjustChroma behave", () => {
    expect(clampLightness(-1)).toBe(0);
    expect(clampLightness(2)).toBe(1);
    expect(clampLightness(0.4)).toBe(0.4);

    const base = hexToOklch("#3b82f6");
    expect(adjustLightness(base, 0.1).l).toBeCloseTo(base.l + 0.1, 10);
    expect(adjustChroma(base, -1).c).toBe(0);
    expect(adjustChroma(base, 0.05).c).toBeCloseTo(base.c + 0.05, 10);
  });
});
