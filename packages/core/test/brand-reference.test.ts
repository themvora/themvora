import { describe, expect, it } from "vitest";
import { getContrastRatio, getPresetCatalog } from "../src";
// The recipe layer is internal by design; tests reach it directly.
import { BRAND_PRESET_RECIPES } from "../src/preset-recipes";

/**
 * The brand-reference invariants.
 *
 * A brand preset makes a specific claim — "the identity comes from the brand's
 * published palette; the rest is a Themvora semantic interpretation". These
 * tests are what keep that claim true: every value classified, every anchor
 * cited, and every anchor either preserved exactly or explicitly reported as
 * normalized.
 */

const brands = getPresetCatalog("brand");

describe("brand reference data", () => {
  it("every brand recipe declares a cited reference source", () => {
    for (const recipe of BRAND_PRESET_RECIPES) {
      expect(recipe.brand, `${recipe.id} has no brand source`).toBeDefined();
      expect(recipe.brand?.sourceUrl, recipe.id).toMatch(/^https:/);
      expect(recipe.brand?.kind, recipe.id).toMatch(
        /^(official-guidelines|official-design-system|web-reference)$/,
      );
      expect(recipe.brand?.name, recipe.id).toBeTruthy();
    }
  });

  it("every reference colour is classified and cited", () => {
    for (const recipe of BRAND_PRESET_RECIPES) {
      for (const color of recipe.brand?.colors ?? []) {
        expect(["ANCHOR", "DERIVED", "SEMANTIC", "IMPLEMENTATION"], `${recipe.id} ${color.label}`).toContain(
          color.classification,
        );
        expect(color.source, `${recipe.id} ${color.label}`).toBeTruthy();
        expect(color.color, `${recipe.id} ${color.label}`).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it("every ANCHOR is an official value", () => {
    // Only published values may be pinned. A "brand" colour nobody can cite is
    // an invention, and pinning it would dress the invention up as provenance.
    for (const recipe of BRAND_PRESET_RECIPES) {
      for (const color of recipe.brand?.colors ?? []) {
        if (color.classification !== "ANCHOR") continue;
        expect(color.official, `${recipe.id} ${color.label} is an ANCHOR but not official`).toBe(true);
      }
    }
  });

  it("every brand pins at least one anchor to a Themvora role", () => {
    for (const entry of brands) {
      const pinned = [...(entry.brand?.anchors.light ?? []), ...(entry.brand?.anchors.dark ?? [])];
      expect(pinned.length, `${entry.id} pins nothing`).toBeGreaterThan(0);
      for (const anchor of pinned) {
        expect(anchor.color, entry.id).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it("records the source URL and provenance on the catalog entry", () => {
    for (const entry of brands) {
      expect(entry.brand?.source.sourceUrl, entry.id).toMatch(/^https:/);
      expect(entry.provenance, entry.id).toBe("approximate");
    }
  });
});

describe("anchor outcome", () => {
  it("preserves every pinned anchor exactly, or reports the normalization", () => {
    // The invariant that matters: an anchor is either the brand's published value
    // or an explicitly reported adjustment. It can never silently become
    // something else.
    for (const entry of brands) {
      for (const mode of ["light", "dark"] as const) {
        const colors = (entry.themes[mode].tokens?.colors ?? {}) as Record<string, string>;
        const pinned = entry.brand?.anchors[mode] ?? [];
        const normalized = entry.brand?.normalized[mode] ?? [];

        for (const anchor of pinned) {
          const shipped = colors[anchor.role];
          expect(shipped, `${entry.id}/${mode} ${anchor.role}`).toBeTruthy();

          const wasNormalized = normalized.some((item) => item.role === anchor.role);
          if (shipped === anchor.color) {
            expect(wasNormalized, `${entry.id}/${mode} ${anchor.role} is exact but reported as normalized`).toBe(false);
          } else {
            expect(wasNormalized, `${entry.id}/${mode} ${anchor.role} moved silently`).toBe(true);
            const record = normalized.find((item) => item.role === anchor.role);
            expect(record?.anchor).toBe(anchor.color);
            expect(record?.resolved).toBe(shipped);
          }
        }
      }
    }
  });

  it("does not report a normalization for an unchanged value", () => {
    for (const entry of brands) {
      for (const mode of ["light", "dark"] as const) {
        for (const item of entry.brand?.normalized[mode] ?? []) {
          expect(item.anchor, `${entry.id}/${mode} ${item.role}`).not.toBe(item.resolved);
        }
      }
    }
  });

  it("holds anchored pairs to the published floor", () => {
    // An anchor that already clears AA must not be moved for the internal margin.
    for (const entry of brands) {
      for (const mode of ["light", "dark"] as const) {
        const colors = (entry.themes[mode].tokens?.colors ?? {}) as Record<string, string>;
        for (const anchor of entry.brand?.anchors[mode] ?? []) {
          const foreground = colors[`${anchor.role}Foreground`];
          if (!foreground) continue;
          expect(getContrastRatio(foreground, colors[anchor.role]), `${entry.id}/${mode}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("preserves all five brand anchors today", () => {
    // A snapshot of the current outcome, so a generator change that starts
    // nudging anchors has to be a deliberate decision rather than a surprise.
    const normalized = brands.flatMap((entry) => [
      ...(entry.brand?.normalized.light ?? []),
      ...(entry.brand?.normalized.dark ?? []),
    ]);
    expect(normalized).toEqual([]);
  });
});
