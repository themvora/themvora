/**
 * The shared preset-registration calculation.
 *
 * One function, two surfaces: the Studio's New Theme drawer and `Browse Presets`.
 * These assert the rules both inherit — the family join, the catalog-origin gate,
 * variant-level evidence, and the labels they must agree on.
 */
import { describe, expect, it } from "vitest";

import {
  isInProject,
  presetRegistration,
  type PresetEvidenceRow,
} from "../src/shared/presetRegistration";
import type { StudioTheme } from "../src/shared/studioProtocol";
import { presetRegistration as studioRegistration } from "../webview/studio/presetEvidence";

/** One project row, as either surface would map it. */
function row(
  overrides: Partial<PresetEvidenceRow> = {},
  omit: readonly (keyof PresetEvidenceRow)[] = [],
): PresetEvidenceRow {
  const built: PresetEvidenceRow = {
    family: "oat",
    name: "oat-light",
    mode: "light",
    evidence: "registered",
    usedBy: ["ThemeProvider"],
    source: "src/theme/theme.config.ts",
    catalogOrigin: true,
    ...overrides,
  };
  // `exactOptionalPropertyTypes`: a row that never recorded a family is not the
  // same thing as one that recorded `undefined`.
  for (const key of omit) delete (built as unknown as Record<string, unknown>)[key];
  return built;
}

/** The preset being asked about. */
const OAT = { family: "oat", label: "Oat", modes: ["light", "dark"] };

describe("catalog only", () => {
  it("is the answer when the project has no row for the family", () => {
    const result = presetRegistration(OAT, []);

    expect(result.status).toBe("catalog-only");
    expect(result.label).toBe("Catalog only");
    // Absence of static evidence is not a claim that it is unused.
    expect(result.detail).not.toContain("Unused");
    expect(isInProject(result)).toBe(false);
  });

  it("ignores a row the reader did not mark as catalog origin", () => {
    // The developer wrote their own "oat". Same family, same name, different
    // origin — it is theirs, and the catalog preset is still not in the project.
    const result = presetRegistration(OAT, [
      row({ catalogOrigin: false }),
      row({ name: "oat-dark", mode: "dark", catalogOrigin: false }),
    ]);

    expect(result.status).toBe("catalog-only");
    expect(result.rows).toEqual([]);
  });

  it("ignores a row in a different family", () => {
    const result = presetRegistration(OAT, [
      row({ family: "custom-oat" }),
      row({ name: "oat-dark", mode: "dark", family: "custom-oat" }),
    ]);

    expect(result.status).toBe("catalog-only");
  });

  it("falls back to the name suffix when a row recorded no family", () => {
    const result = presetRegistration(OAT, [
      row({}, ["family"]),
      row({ name: "oat-dark", mode: "dark" }, ["family"]),
    ]);

    expect(result.status).toBe("registered");
  });
});

describe("included", () => {
  it("is registered when every variant reaches a consumer", () => {
    const result = presetRegistration(OAT, [
      row(),
      row({ name: "oat-dark", mode: "dark" }),
    ]);

    expect(result.status).toBe("registered");
    expect(result.label).toBe("Registered in source");
    expect(result.consumers).toEqual(["ThemeProvider"]);
    expect(result.sources).toEqual(["src/theme/theme.config.ts"]);
    expect(result.detail).toContain("ThemeProvider");
  });

  it("is only in the project when no consumer was traced", () => {
    // A catalog call whose collection never reaches a provider is collection
    // evidence, not registration. Saying "registered" would be a false positive.
    const result = presetRegistration(OAT, [
      row({ evidence: "catalog-source", usedBy: [] }),
      row({ name: "oat-dark", mode: "dark", evidence: "catalog-source", usedBy: [] }),
    ]);

    expect(result.status).toBe("included");
    expect(result.label).toBe("In project");
    expect(result.detail).toContain("no verified consumer");
  });

  it("is unverified when the path could not be resolved", () => {
    const result = presetRegistration(OAT, [
      row({ evidence: "partially-resolved", usedBy: [] }),
      row({ name: "oat-dark", mode: "dark", evidence: "partially-resolved", usedBy: [] }),
    ]);

    expect(result.status).toBe("unverified");
    expect(result.label).toBe("Registration not verified");
    expect(result.detail).toContain("could not be resolved");
  });
});

describe("variant evidence", () => {
  it("is partial when only one variant was found", () => {
    const result = presetRegistration(OAT, [row()]);

    expect(result.status).toBe("partial");
    expect(result.label).toBe("Partially detected");
    expect(result.variants).toEqual([
      { mode: "light", found: true },
      { mode: "dark", found: false },
    ]);
    // The gap is named, not just flagged.
    expect(result.detail).toContain("dark");
    expect(result.detail).toContain("not found");
  });

  it("is partial when the variants disagree about registration", () => {
    const result = presetRegistration(OAT, [
      row(),
      row({ name: "oat-dark", mode: "dark", evidence: "catalog-source", usedBy: [] }),
    ]);

    expect(result.status).toBe("partial");
  });

  it("is registered for a single-mode preset whose mode is present", () => {
    const result = presetRegistration({ family: "oat", label: "Oat", modes: ["light"] }, [row()]);

    expect(result.status).toBe("registered");
  });
});

describe("workspace folders", () => {
  it("does not add up half a preset from two folders", () => {
    // `light` in one project and `dark` in another is not a registered pair.
    // Pooling the rows would report "Registered in source" for a family that
    // neither folder actually contains.
    const result = presetRegistration(OAT, [
      row({ source: "src/theme/theme.config.ts", root: "app" }),
      row({ name: "oat-dark", mode: "dark", source: "src/theme/theme.config.ts", root: "design-system" }),
    ]);

    expect(result.status).toBe("partial");
    expect(result.label).toBe("Partially detected");
    // Neither folder is named as the owner, because neither one is.
    expect(result.sources).not.toContain("design-system");
  });

  it("reports the folder that does hold the whole preset", () => {
    const result = presetRegistration(OAT, [
      row({ name: "oat-light", mode: "light", root: "design-system" }),
      row({ name: "oat-dark", mode: "dark", root: "design-system" }),
      row({ name: "berry-light", mode: "light", family: "berry", root: "app" }),
    ]);

    expect(result.status).toBe("registered");
    // A file path alone is ambiguous across folders, so the folder is named.
    expect(result.detail).toContain("(design-system)");
    expect(result.rows.every((entry) => entry.root === "design-system")).toBe(true);
  });

  it("takes the strongest folder rather than the first", () => {
    // The first folder only includes the family without tracing a consumer; the
    // second traces it. The better evidence is the one worth reporting.
    const result = presetRegistration(OAT, [
      row({ name: "oat-light", mode: "light", evidence: "catalog-source", usedBy: [], root: "app" }),
      row({ name: "oat-dark", mode: "dark", evidence: "catalog-source", usedBy: [], root: "app" }),
      row({ name: "oat-light", mode: "light", root: "design-system" }),
      row({ name: "oat-dark", mode: "dark", root: "design-system" }),
    ]);

    expect(result.status).toBe("registered");
    expect(result.consumers).toEqual(["ThemeProvider"]);
    expect(result.detail).toContain("(design-system)");
  });

  it("leaves the family calculation unchanged when no folder is recorded", () => {
    // The Studio builds its rows from a single inspection, so it passes no
    // folder — and must keep getting the same text the command used to produce.
    const result = presetRegistration(OAT, [row(), row({ name: "oat-dark", mode: "dark" })]);

    expect(result.status).toBe("registered");
    expect(result.detail).toBe(
      "Included in src/theme/theme.config.ts, passed to ThemeProvider.",
    );
  });
});

describe("labels", () => {
  it("uses one vocabulary for every status", () => {
    // The Studio chip and the command's picker read these strings, so a change
    // here is a change in both places or neither.
    const statuses = [
      presetRegistration(OAT, []).label,
      presetRegistration(OAT, [row(), row({ name: "oat-dark", mode: "dark" })]).label,
      presetRegistration(OAT, [row()]).label,
      presetRegistration(OAT, [
        row({ evidence: "partially-resolved" }),
        row({ name: "oat-dark", mode: "dark", evidence: "partially-resolved" }),
      ]).label,
    ];

    expect(statuses).toEqual([
      "Catalog only",
      "Registered in source",
      "Partially detected",
      "Registration not verified",
    ]);
  });
});

describe("the two surfaces", () => {
  /** A Studio theme row for the same scenario as {@link row}. */
  function studioTheme(overrides: Partial<StudioTheme> = {}): StudioTheme {
    return {
      name: "oat-light",
      source: "src/theme/theme.config.ts",
      mode: "light",
      family: "oat",
      valid: true,
      evidence: "registered",
      origin: "catalog",
      usedBy: ["ThemeProvider"],
      swatches: [],
      ...overrides,
    };
  }

  /** The same Studio rows, mapped the way the command maps catalog entries. */
  function asCommandRows(themes: readonly StudioTheme[]): PresetEvidenceRow[] {
    return themes.map((theme) => ({
      ...(theme.family === undefined ? {} : { family: theme.family }),
      name: theme.name,
      ...(theme.mode === undefined ? {} : { mode: theme.mode }),
      ...(theme.evidence === undefined ? {} : { evidence: theme.evidence }),
      usedBy: theme.usedBy,
      source: theme.source,
      catalogOrigin: theme.origin === "catalog" || theme.evidence === "catalog-source",
    }));
  }

  it("produce the same status and label for the same evidence", () => {
    const scenarios: readonly StudioTheme[][] = [
      // Both variants registered.
      [studioTheme(), studioTheme({ name: "oat-dark", mode: "dark" })],
      // Included, no consumer.
      [
        studioTheme({ evidence: "catalog-source", usedBy: [] }),
        studioTheme({ name: "oat-dark", mode: "dark", evidence: "catalog-source", usedBy: [] }),
      ],
      // One variant only.
      [studioTheme()],
      // Unresolved path.
      [
        studioTheme({ evidence: "partially-resolved", usedBy: [] }),
        studioTheme({ name: "oat-dark", mode: "dark", evidence: "partially-resolved", usedBy: [] }),
      ],
      // Nothing.
      [],
      // A local definition, which is not the preset.
      [studioTheme({ origin: "definition" }), studioTheme({ name: "oat-dark", mode: "dark", origin: "definition" })],
    ];

    for (const themes of scenarios) {
      const studio = studioRegistration({ id: "oat", label: "Oat", family: "oat", kind: "default", style: "soft", modes: ["light", "dark"], swatches: [] }, themes);
      const command = presetRegistration(OAT, asCommandRows(themes));

      expect(command.status).toBe(studio.status);
      expect(command.label).toBe(studio.label);
      expect(command.detail).toBe(studio.detail);
    }
  });
});
