/**
 * What the preset drawer says about a catalog entry.
 *
 * The distinctions here are the ones a developer acts on differently: already in
 * the project, included but not traced, only half established, or not there at
 * all. They are derived from the evidence the source graph already produced, so
 * these tests build theme rows rather than files.
 */
import { describe, expect, it } from "vitest";

import type { StudioPreset, StudioTheme } from "../src/shared/studioProtocol";
import { isInProject, presetRegistration } from "../webview/studio/presetEvidence";

/** A catalog entry, as the host sends it. */
function preset(overrides: Partial<StudioPreset> = {}): StudioPreset {
  return {
    id: "oat",
    label: "Oat",
    family: "oat",
    kind: "preset",
    style: "modern",
    modes: ["light", "dark"],
    swatches: ["#c2703a", "#faf7f2"],
    ...overrides,
  };
}

/**
 * One project theme row.
 *
 * `omit` is how a row is built without a field at all: the project's types use
 * `exactOptionalPropertyTypes`, so `{ family: undefined }` is not the same thing
 * as a row that never recorded a family.
 *
 * @param overrides - Fields to change.
 * @param omit - Fields to remove after merging.
 * @returns The row.
 */
function theme(overrides: Partial<StudioTheme> = {}, omit: readonly (keyof StudioTheme)[] = []): StudioTheme {
  const row: StudioTheme = {
    name: "oat-light",
    source: "src/theme/theme.config.ts",
    mode: "light",
    family: "oat",
    valid: true,
    evidence: "registered",
    origin: "catalog",
    usedBy: ["ThemeProvider"],
    swatches: ["#c2703a"],
    ...overrides,
  };
  for (const key of omit) delete (row as unknown as Record<string, unknown>)[key];
  return row;
}

describe("a preset with no project rows", () => {
  it("is catalog only", () => {
    const registration = presetRegistration(preset(), []);

    expect(registration.status).toBe("catalog-only");
    expect(registration.label).toBe("Catalog only");
    // Absence of static evidence is not a claim that it is unused.
    expect(registration.detail).toContain("no static project registration");
    expect(registration.detail).not.toContain("Unused");
    expect(isInProject(registration)).toBe(false);
  });
});

describe("a preset the project includes", () => {
  it("is registered when the collection reaches a consumer", () => {
    const registration = presetRegistration(preset(), [
      theme({ mode: "light" }),
      theme({ name: "oat-dark", mode: "dark", evidence: "registered" }),
    ]);

    expect(registration.status).toBe("registered");
    expect(registration.label).toBe("Registered in source");
    expect(registration.consumers).toEqual(["ThemeProvider"]);
    expect(registration.sources).toEqual(["src/theme/theme.config.ts"]);
    expect(registration.detail).toContain("src/theme/theme.config.ts");
    expect(registration.detail).toContain("ThemeProvider");
    expect(isInProject(registration)).toBe(true);
  });

  it("is only in the project when no consumer was traced", () => {
    // A catalog call whose collection never reaches a provider is collection
    // evidence, not registration. Saying "registered" would be a false positive.
    const registration = presetRegistration(preset(), [
      theme({ mode: "light", evidence: "catalog-source", usedBy: [] }),
      theme({ name: "oat-dark", mode: "dark", evidence: "catalog-source", usedBy: [] }),
    ]);

    expect(registration.status).toBe("included");
    expect(registration.label).toBe("In project");
    expect(registration.consumers).toEqual([]);
    expect(registration.detail).toContain("no verified consumer");
  });

  it("is partial when only one variant was found", () => {
    const registration = presetRegistration(preset(), [theme({ mode: "light" })]);

    expect(registration.status).toBe("partial");
    expect(registration.label).toBe("Partially detected");
    expect(registration.variants).toEqual([
      { mode: "light", found: true },
      { mode: "dark", found: false },
    ]);
    // The gap is named, not just flagged.
    expect(registration.detail).toContain("dark");
    expect(registration.detail).toContain("not found");
  });

  it("is partial when the variants disagree about registration", () => {
    const registration = presetRegistration(preset(), [
      theme({ mode: "light", evidence: "registered" }),
      theme({ name: "oat-dark", mode: "dark", evidence: "catalog-source", usedBy: [] }),
    ]);

    expect(registration.status).toBe("partial");
    expect(registration.detail).toContain("part of this preset");
  });

  it("is unverified when the path could not be resolved", () => {
    const registration = presetRegistration(preset(), [
      theme({ mode: "light", evidence: "partially-resolved", usedBy: [] }),
      theme({ name: "oat-dark", mode: "dark", evidence: "partially-resolved", usedBy: [] }),
    ]);

    expect(registration.status).toBe("unverified");
    expect(registration.label).toBe("Registration not verified");
    expect(registration.detail).toContain("could not be resolved");
  });
});

describe("identity", () => {
  it("does not treat a local definition with the same family as the preset", () => {
    // The developer wrote their own "oat". Same name, same family, different
    // origin — it is theirs, and the catalog preset is still not in the project.
    const registration = presetRegistration(preset(), [
      theme({ origin: "definition", evidence: "registered" }),
      theme({ name: "oat-dark", mode: "dark", origin: "definition", evidence: "registered" }),
    ]);

    expect(registration.status).toBe("catalog-only");
    expect(registration.themes).toEqual([]);
  });

  it("does not match a row whose family differs but whose name matches", () => {
    const registration = presetRegistration(preset(), [
      theme({ name: "oat-light", family: "custom-oat" }),
      theme({ name: "oat-dark", mode: "dark", family: "custom-oat" }),
    ]);

    expect(registration.status).toBe("catalog-only");
  });

  it("matches on the name's suffix when the row carries no family", () => {
    const registration = presetRegistration(preset(), [
      theme({ mode: "light" }, ["family"]),
      theme({ name: "oat-dark", mode: "dark" }, ["family"]),
    ]);

    expect(registration.status).toBe("registered");
  });

  it("counts catalog-source evidence as catalog origin", () => {
    // A generated registry records catalog-source evidence without an `origin`
    // field; it is still a catalog-derived row.
    const registration = presetRegistration(preset(), [
      theme({ evidence: "catalog-source", usedBy: [] }, ["origin"]),
      theme({ name: "oat-dark", mode: "dark", evidence: "catalog-source", usedBy: [] }, ["origin"]),
    ]);

    expect(registration.status).toBe("included");
  });
});

describe("a preset that ships one mode", () => {
  it("is registered when that one mode is registered", () => {
    const registration = presetRegistration(preset({ modes: ["light"] }), [theme({ mode: "light" })]);

    expect(registration.status).toBe("registered");
    expect(registration.variants).toEqual([{ mode: "light", found: true }]);
  });
});
