/**
 * Family grouping is what turns two registry rows into one visual card.
 */
import { describe, expect, it } from "vitest";

import type { StudioTheme } from "../src/shared/studioProtocol";
import {
  groupFamilies,
  isCatalogFamily,
  partitionFamilies,
  themeGroupKey,
} from "../webview/studio/themeGroups";

/**
 * A minimal theme row.
 *
 * @param name - Theme name.
 * @param family - Recorded family, when any.
 * @param swatches - Card colours.
 * @returns The row.
 */
function theme(name: string, family?: string, swatches: readonly string[] = []): StudioTheme {
  return {
    name,
    source: "src/themes.ts",
    ...(family === undefined ? {} : { family }),
    valid: true,
    evidence: "defined-unregistered",
    usedBy: [],
    swatches,
  };
}

describe("groupFamilies", () => {
  it("groups recorded families and keeps first-seen order", () => {
    const groups = groupFamilies([
      theme("ocean-light", "ocean", ["#fff"]),
      theme("oat-light", "oat", ["#000"]),
      theme("ocean-dark", "ocean", ["#111"]),
    ]);

    expect(groups.map((group) => group.name)).toEqual(["ocean", "oat"]);
    expect(groups[0]?.themes.map((entry) => entry.name)).toEqual(["ocean-light", "ocean-dark"]);
  });

  it("falls back to the suffix-free name when no family is recorded", () => {
    expect(themeGroupKey(theme("berry-dark"))).toBe("berry");
    const groups = groupFamilies([theme("berry-light"), theme("berry-dark")]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.name).toBe("berry");
  });

  it("takes a deduplicated swatch strip from the family", () => {
    const groups = groupFamilies([
      theme("ocean-light", "ocean", ["#fff", "#123"]),
      theme("ocean-dark", "ocean", ["#123", "#000"]),
    ]);
    expect(groups[0]?.swatches).toEqual(["#fff", "#123", "#000"]);
  });

  it("separates catalog-origin families from the project's own", () => {
    const project = theme("ocean-light", "ocean");
    const catalog = {
      ...theme("oat-light", "oat"),
      origin: "catalog" as const,
      evidence: "catalog-source",
    };
    const split = partitionFamilies([project, catalog]);

    expect(split.project.map((family) => family.name)).toEqual(["ocean"]);
    expect(split.catalog.map((family) => family.name)).toEqual(["oat"]);
    expect(isCatalogFamily(split.catalog[0]!)).toBe(true);
  });

  it("keeps a mixed family with the project", () => {
    const split = partitionFamilies([
      theme("ocean-light", "ocean"),
      { ...theme("ocean-dark", "ocean"), origin: "catalog" as const, evidence: "catalog-source" },
    ]);
    expect(split.project).toHaveLength(1);
    expect(split.catalog).toHaveLength(0);
  });
});
