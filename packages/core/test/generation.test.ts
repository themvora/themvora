import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CORE_COLORS } from "../src";
import { hueDistance, normalizeHue } from "../src/color";
import {
  buildPalette,
  deriveIdentity,
  FOREGROUND_ROLES,
  GENERATION_STYLES,
  resolveStyle,
  ROLE_REGISTRY,
  ROLE_SPECS,
  SEMANTIC_PAIRS,
  STATUS_HUES,
  temperatureOf,
  type GenerationStyle,
  type PaletteContext,
} from "../src/generation";

const SEEDS = ["#3b82f6", "#d97706", "#22c55e", "#7c3aed", "#ef4444", "#808080", "#000000", "#ffffff"];
const STYLES: GenerationStyle[] = ["balanced", "soft", "vibrant", "editorial", "minimal", "brand"];
const MODES = ["light", "dark"] as const;

function context(seed: string, mode: "light" | "dark", style: GenerationStyle): PaletteContext {
  return { mode, identity: deriveIdentity(seed), style: resolveStyle(style) };
}

describe("generation/roles", () => {
  it("describes every core role exactly once", () => {
    expect(ROLE_REGISTRY).toHaveLength(CORE_COLORS.length);
    expect(ROLE_REGISTRY).toHaveLength(21);
    expect(new Set(ROLE_REGISTRY.map((spec) => spec.role)).size).toBe(21);
  });

  it("marks every pair foreground as a foreground with a requirement", () => {
    for (const pair of SEMANTIC_PAIRS) {
      const spec = ROLE_SPECS[pair.foreground];
      expect(spec.readsOn, pair.foreground).toContain(pair.background);
      expect(spec.requirement, pair.foreground).toBeDefined();
    }
    expect(new Set(FOREGROUND_ROLES)).toEqual(new Set(SEMANTIC_PAIRS.map((p) => p.foreground)));
  });

  it("marks the background side of every pair as a surface", () => {
    for (const pair of SEMANTIC_PAIRS) {
      expect(ROLE_SPECS[pair.background].isSurface, pair.background).toBe(true);
    }
  });

  it("records `ring` as read on more than one surface", () => {
    expect(ROLE_SPECS.ring.readsOn).toContain("background");
    expect(ROLE_SPECS.ring.readsOn).toContain("card");
  });
});

describe("generation/identity", () => {
  it("classifies temperature by hue band", () => {
    expect(temperatureOf(20, 0.2)).toBe("warm");
    expect(temperatureOf(350, 0.2)).toBe("warm");
    expect(temperatureOf(264, 0.2)).toBe("cool");
    expect(temperatureOf(200, 0.2)).toBe("cool");
    expect(temperatureOf(120, 0.2)).toBe("neutral");
  });

  it("treats low-chroma seeds as neutral regardless of hue", () => {
    expect(temperatureOf(20, 0.001)).toBe("neutral");
    expect(deriveIdentity("#808080").temperature).toBe("neutral");
    expect(deriveIdentity("#808080").isChromatic).toBe(false);
  });

  it("keeps the seed verbatim as provenance", () => {
    expect(deriveIdentity("#3B82F6").seed).toBe("#3B82F6");
  });
});

describe("generation/palette", () => {
  it("emits every core role, in both modes, for every seed and style", () => {
    for (const seed of SEEDS) {
      for (const style of STYLES) {
        for (const mode of MODES) {
          const palette = buildPalette(context(seed, mode, style));
          for (const role of CORE_COLORS) {
            const value = palette[role];
            expect(value, `${seed}/${style}/${mode} → ${role}`).toBeDefined();
          }
        }
      }
    }
  });

  it("emits finite, canonical values", () => {
    for (const seed of SEEDS) {
      for (const style of STYLES) {
        for (const mode of MODES) {
          const palette = buildPalette(context(seed, mode, style));
          for (const role of CORE_COLORS) {
            const { l, c, h } = palette[role];
            expect(Number.isFinite(l), `${role}.l`).toBe(true);
            expect(Number.isFinite(c), `${role}.c`).toBe(true);
            expect(Number.isFinite(h), `${role}.h`).toBe(true);
            expect(l).toBeGreaterThanOrEqual(0);
            expect(l).toBeLessThanOrEqual(1);
            expect(c).toBeGreaterThanOrEqual(0);
            expect(h).toBeGreaterThanOrEqual(0);
            expect(h).toBeLessThan(360);
          }
        }
      }
    }
  });

  it("anchors the primary to the seed hue", () => {
    for (const seed of ["#3b82f6", "#d97706", "#22c55e", "#7c3aed"]) {
      const identity = deriveIdentity(seed);
      const palette = buildPalette(context(seed, "light", "balanced"));
      expect(hueDistance(palette.primary.h, identity.hue), seed).toBeLessThan(1);
    }
  });

  it("places the accent at the style's offset and never on the primary", () => {
    const identity = deriveIdentity("#3b82f6");
    for (const style of STYLES) {
      const params = GENERATION_STYLES[style];
      const palette = buildPalette(context("#3b82f6", "light", style));
      const expected = normalizeHue(identity.hue + params.accentOffset);
      expect(hueDistance(palette.accent.h, expected), style).toBeLessThan(1);
      expect(hueDistance(palette.accent.h, palette.primary.h), style).toBeGreaterThan(10);
    }
  });

  it("keeps status hues in their semantic families regardless of seed", () => {
    for (const seed of SEEDS) {
      for (const style of STYLES) {
        const palette = buildPalette(context(seed, "light", style));
        expect(hueDistance(palette.destructive.h, STATUS_HUES.destructive), seed).toBeLessThan(2);
        expect(hueDistance(palette.success.h, STATUS_HUES.success), seed).toBeLessThan(2);
      }
    }
  });

  it("tints the neutral surfaces with the seed hue, and leaves grays gray", () => {
    const blue = buildPalette(context("#3b82f6", "light", "balanced"));
    const gray = buildPalette(context("#808080", "light", "balanced"));

    expect(hueDistance(blue.background.h, deriveIdentity("#3b82f6").hue)).toBeLessThan(1);
    expect(blue.background.c).toBeGreaterThan(0);
    expect(gray.background.c).toBe(0);
  });

  it("separates the surfaces (background ≠ card ≠ popover)", () => {
    for (const mode of MODES) {
      const palette = buildPalette(context("#3b82f6", mode, "balanced"));
      expect(Math.abs(palette.card.l - palette.background.l), mode).toBeGreaterThan(0.008);
      expect(Math.abs(palette.popover.l - palette.card.l), mode).toBeGreaterThan(0.004);
      expect(Math.abs(palette.muted.l - palette.background.l), mode).toBeGreaterThan(0.008);
    }
  });

  it("orders the content hierarchy foreground > secondary > muted in emphasis", () => {
    for (const mode of MODES) {
      const palette = buildPalette(context("#3b82f6", mode, "balanced"));
      const isLight = mode === "light";
      // In light mode stronger text is darker; in dark mode stronger text is lighter.
      const strength = (l: number) => (isLight ? -l : l);
      expect(strength(palette.foreground.l)).toBeGreaterThan(strength(palette.secondaryForeground.l));
      expect(strength(palette.secondaryForeground.l)).toBeGreaterThan(strength(palette.mutedForeground.l));
    }
  });

  it("is deterministic", () => {
    const a = buildPalette(context("#3b82f6", "dark", "vibrant"));
    const b = buildPalette(context("#3b82f6", "dark", "vibrant"));
    expect(a).toEqual(b);
  });
});

describe("generation/styles", () => {
  it("defaults to balanced when no style is given", () => {
    expect(resolveStyle()).toEqual(GENERATION_STYLES.balanced);
    expect(resolveStyle(undefined)).toEqual(GENERATION_STYLES.balanced);
  });

  it("produces measurably different parameters between styles", () => {
    // The plan requires style differences to be real, not cosmetic.
    const chroma = STYLES.map((s) => GENERATION_STYLES[s].primaryChroma);
    expect(new Set(chroma).size).toBeGreaterThan(1);

    const darkDepth = STYLES.map((s) => GENERATION_STYLES[s].darkSurfaceDepth);
    expect(new Set(darkDepth).size).toBeGreaterThan(1);

    const minimal = buildPalette(context("#3b82f6", "light", "minimal"));
    const vibrant = buildPalette(context("#3b82f6", "light", "vibrant"));
    expect(vibrant.primary.c).toBeGreaterThan(minimal.primary.c);
    expect(minimal.background.c).toBe(0);
  });

  it("gives every style the identical role contract", () => {
    const rolesByStyle = STYLES.map((style) =>
      Object.keys(buildPalette(context("#3b82f6", "light", style))).sort().join(","),
    );
    expect(new Set(rolesByStyle).size).toBe(1);
  });
});

describe("generation boundary", () => {
  it("does not import from adapters, runtime, plugins, resolvers or the CLI", () => {
    const dirs = ["src/color", "src/generation"];
    const forbidden = /from\s+"(?:\.\.\/)+(adapters|runtime|plugin|resolver|registry|resolve|animation|scrollbar)/;
    const offenders: string[] = [];

    for (const dir of dirs) {
      for (const file of readdirSync(dir)) {
        if (!file.endsWith(".ts")) continue;
        const source = readFileSync(join(dir, file), "utf8");
        if (forbidden.test(source)) offenders.push(`${dir}/${file}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
