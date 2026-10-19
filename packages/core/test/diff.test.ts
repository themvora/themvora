import { describe, expect, it } from "vitest";
import {
  CORE_COLORS,
  GENERATION_STYLE_NAMES,
  TOKEN_GROUPS,
  defineTheme,
  diffThemes,
  generateTheme,
  getPresetCatalog,
  type ThemeDefinition,
} from "../src";
import { createThemeSnapshot, resolveConcreteTheme } from "../src/diff/snapshot";
import { ThemeError } from "../src/errors";

/** A minimal light theme with just the tokens a test needs. */
function light(name: string, colors: Record<string, string>, family = name): ThemeDefinition {
  return defineTheme({ name, meta: { family, mode: "light" }, tokens: { colors } });
}

/** A minimal dark theme. */
function dark(name: string, colors: Record<string, string>, family = name): ThemeDefinition {
  return defineTheme({ name, meta: { family, mode: "dark" }, tokens: { colors } });
}

describe("diffThemes — identity", () => {
  it("finds no changes between a theme and itself, for every shipped preset and brand", () => {
    for (const entry of getPresetCatalog()) {
      const report = diffThemes(entry.themes, entry.themes);

      expect(report.hasChanges, entry.id).toBe(false);
      expect(report.summary, entry.id).toEqual({
        added: 0,
        removed: 0,
        changed: 0,
        unchanged: report.summary.unchanged,
        total: report.summary.total,
      });
      expect(report.summary.unchanged, entry.id).toBeGreaterThan(0);
    }
  });

  it("produces byte-identical JSON for two independently built identical inputs", () => {
    const build = () =>
      defineTheme({
        name: "same",
        meta: { family: "same", mode: "light" },
        tokens: { colors: { background: "#ffffff", foreground: "#111111" } },
      });

    const first = JSON.stringify(diffThemes(build(), build()));
    const second = JSON.stringify(diffThemes(build(), build()));
    expect(first).toBe(second);

    // And repeated calls on the same inputs agree.
    const a = build();
    const b = build();
    expect(JSON.stringify(diffThemes(a, b))).toBe(JSON.stringify(diffThemes(a, b)));
  });
});

describe("diffThemes — statuses", () => {
  const a = light("a", {
    background: "#ffffff",
    foreground: "#111111",
    accent: "#0000ff",
  });
  const b = light("b", {
    background: "#f5f5f5",
    foreground: "#111111",
    success: "#00ff00",
  });

  it("classifies added, removed, changed and unchanged", () => {
    const report = diffThemes(a, b, { includeUnchanged: true });
    const byPath = new Map(report.modes.light!.changes.map((change) => [change.path, change]));

    expect(byPath.get("colors.background")?.status).toBe("changed");
    expect(byPath.get("colors.background")?.before).toBe("#ffffff");
    expect(byPath.get("colors.background")?.after).toBe("#f5f5f5");

    expect(byPath.get("colors.foreground")?.status).toBe("unchanged");
    expect(byPath.get("colors.accent")?.status).toBe("removed");
    expect(byPath.get("colors.accent")?.after).toBeUndefined();
    expect(byPath.get("colors.success")?.status).toBe("added");
    expect(byPath.get("colors.success")?.before).toBeUndefined();
  });

  it("counts every path while filtering unchanged out of `changes`", () => {
    const filtered = diffThemes(a, b);
    const all = diffThemes(a, b, { includeUnchanged: true });

    expect(filtered.modes.light!.counts).toEqual({
      added: 1,
      removed: 1,
      changed: 1,
      unchanged: 1,
      total: 4,
    });
    // Counts are identical; only `changes` differs.
    expect(all.modes.light!.counts).toEqual(filtered.modes.light!.counts);
    expect(filtered.modes.light!.changes).toHaveLength(3);
    expect(all.modes.light!.changes).toHaveLength(4);
  });

  it("summarises across modes", () => {
    const report = diffThemes(a, b);
    expect(report.summary).toEqual(report.modes.light!.counts);
  });
});

describe("diffThemes — resolved values", () => {
  it("treats a derived value and its literal equivalent as unchanged", () => {
    const derived = light("derived", { primary: "#3366ff", primaryForeground: "auto()" });
    const literal = light("literal", { primary: "#3366ff", primaryForeground: "#ffffff" });

    const report = diffThemes(derived, literal, { includeUnchanged: true });
    const change = report.modes.light!.changes.find(
      (entry) => entry.path === "colors.primaryForeground",
    );

    expect(change?.status).toBe("unchanged");
    expect(change?.before).toBe("#ffffff");
    expect(change?.after).toBe("#ffffff");
  });

  it("reports a change when a reference's target changes", () => {
    const a = light("a", { primary: "#3366ff", primaryForeground: "auto()" });
    const b = light("b", { primary: "#ffcc00", primaryForeground: "auto()" });

    const report = diffThemes(a, b);
    const foreground = report.modes.light!.changes.find(
      (entry) => entry.path === "colors.primaryForeground",
    );

    expect(foreground?.status).toBe("changed");
    expect(foreground?.before).toBe("#ffffff");
    expect(foreground?.after).toBe("#000000");
  });
});

describe("diffThemes — modes", () => {
  const lightTheme = light("pair-light", { background: "#ffffff" }, "pair");
  const darkTheme = dark("pair-dark", { background: "#000000" }, "pair");

  it("keys the report by concrete visual mode only", () => {
    const report = diffThemes({ light: lightTheme, dark: darkTheme }, lightTheme);
    expect(Object.keys(report.modes).sort()).toEqual(["dark", "light"]);
    for (const mode of Object.values(report.modes)) {
      expect(["light", "dark"]).toContain(mode.mode);
    }
  });

  it("reports which sides provide a mode, and treats the missing side as empty", () => {
    const report = diffThemes({ light: lightTheme, dark: darkTheme }, lightTheme);

    expect(report.modes.light!.present).toBe("both");
    expect(report.modes.dark!.present).toBe("a");
    // `b` has no dark theme, so every dark token reads as removed.
    expect(report.modes.dark!.counts.removed).toBe(1);
    expect(report.modes.dark!.counts.added).toBe(0);
  });

  it("omits modes excluded by `modes`", () => {
    const report = diffThemes(
      { light: lightTheme, dark: darkTheme },
      { light: lightTheme, dark: darkTheme },
      { modes: ["light"] },
    );

    expect(Object.keys(report.modes)).toEqual(["light"]);
  });
});

describe("diffThemes — provenance", () => {
  it("reports a provenance-only difference without claiming a token change", () => {
    const a = generateTheme({ seed: "#3366ff", family: "brand" }).light;
    const b = generateTheme({ seed: "#ffcc00", family: "brand" }).light;

    const report = diffThemes(a, b);
    expect(report.hasChanges).toBe(true);

    // Two themes with the same tokens but different seeds:
    const same = generateTheme({ seed: "#3366ff", family: "brand" }).light;
    const reSeeded = {
      ...same,
      meta: {
        ...same.meta,
        generation: { ...same.meta!.generation!, seed: "#ffcc00" },
      },
    };

    const provenanceOnly = diffThemes(same, reSeeded);
    expect(provenanceOnly.hasChanges).toBe(false);
    expect(provenanceOnly.provenance.changed).toBe(true);
    expect(provenanceOnly.provenance.differing).toEqual(["seed"]);
  });

  it("reports no provenance change when neither side has any", () => {
    const report = diffThemes(light("a", { background: "#ffffff" }), light("b", { background: "#000000" }));
    expect(report.provenance).toEqual({ a: null, b: null, changed: false, differing: [] });
  });
});

describe("diffThemes — inheritance", () => {
  const base = light("base", { background: "#ffffff" });
  const child = defineTheme({
    name: "child",
    extends: "base",
    meta: { family: "child", mode: "light" },
    tokens: { colors: { foreground: "#111111" } },
  });

  it("throws when `extends` cannot be resolved", () => {
    expect(() => diffThemes(child, base)).toThrow(ThemeError);
    try {
      diffThemes(child, base);
    } catch (error) {
      expect((error as ThemeError).code).toBe("TV_DIFF_UNRESOLVED_EXTENDS");
    }
  });

  it("resolves `extends` through the supplied registry", () => {
    const report = diffThemes(child, base, { themes: [base, child], includeUnchanged: true });
    const paths = report.modes.light!.changes.map((change) => change.path);

    // The child inherits `background` and adds `foreground`.
    expect(paths).toContain("colors.background");
    expect(paths).toContain("colors.foreground");
    expect(report.a.name).toBe("child");
  });
});

describe("diffThemes — the system selector", () => {
  const family = "fam";
  const lightTheme = light("fam-light", { background: "#ffffff" }, family);
  const darkTheme = dark("fam-dark", { background: "#000000" }, family);
  const systemTheme = defineTheme({
    name: "fam-system",
    meta: { family, mode: "system" },
    tokens: { colors: { background: "#808080" } },
  });
  const registry = [lightTheme, darkTheme, systemTheme];

  it("resolves a `system` theme to a concrete mode instead of treating it as a third mode", () => {
    const { mode } = resolveConcreteTheme(systemTheme, { themes: registry, prefersDark: false });
    expect(mode).toBe("light");
  });

  it("selects a different concrete theme when the visitor prefers dark", () => {
    const asLight = diffThemes(systemTheme, lightTheme, { themes: registry });
    const asDark = diffThemes(systemTheme, lightTheme, { themes: registry, prefersDark: true });

    expect(asLight.a.mode).toBe("light");
    expect(asLight.a.name).toBe("fam-light");

    expect(asDark.a.mode).toBe("dark");
    expect(asDark.a.name).toBe("fam-dark");
  });

  it("never emits a `system` key in `modes`", () => {
    for (const prefersDark of [false, true]) {
      const report = diffThemes(systemTheme, lightTheme, { themes: registry, prefersDark });
      expect(Object.keys(report.modes).every((mode) => mode === "light" || mode === "dark")).toBe(
        true,
      );
    }
  });

  it("throws when the selector has no registry to select from", () => {
    try {
      diffThemes(systemTheme, lightTheme);
      throw new Error("expected a throw");
    } catch (error) {
      expect((error as ThemeError).code).toBe("TV_DIFF_UNRESOLVED_SYSTEM");
    }
  });
});

describe("createThemeSnapshot — canonical order and classification", () => {
  const snapshot = createThemeSnapshot(
    defineTheme({
      name: "ordered",
      meta: { family: "ordered", mode: "light" },
      tokens: {
        colors: { primary: "#3366ff", background: "#ffffff", warning: "#ffaa00" },
        radius: { lg: "8px" },
      },
    }),
    "light",
  );

  it("orders groups by TOKEN_GROUPS and colours by the canonical role order", () => {
    const groups = snapshot.entries.map((entry) => entry.group);
    const groupRanks = groups.map((group) => TOKEN_GROUPS.indexOf(group));
    expect(groupRanks).toEqual([...groupRanks].sort((a, b) => a - b));

    const colorPaths = snapshot.entries
      .filter((entry) => entry.group === "colors")
      .map((entry) => entry.path);
    expect(colorPaths).toEqual([
      "colors.background", // CORE_COLORS[0]
      "colors.primary", // CORE_COLORS[6]
      "colors.warning", // OPTIONAL_SEMANTICS[0]
    ]);
    expect(CORE_COLORS.indexOf("background")).toBeLessThan(CORE_COLORS.indexOf("primary"));
  });

  it("attributes roles and their role groups", () => {
    const primary = snapshot.entries.find((entry) => entry.path === "colors.primary");
    expect(primary?.role).toBe("primary");
    expect(primary?.roleGroup).toBe("actions");

    const radius = snapshot.entries.find((entry) => entry.path === "radius.lg");
    expect(radius?.role).toBeNull();
    expect(radius?.roleGroup).toBeNull();
  });

  it("carries a concrete mode", () => {
    expect(snapshot.mode).toBe("light");
  });
});

describe("diff module — exported surface", () => {
  it("exposes diffThemes and does not leak the internal snapshot", async () => {
    const publicApi = await import("../src");
    expect(typeof publicApi.diffThemes).toBe("function");
    expect("createThemeSnapshot" in publicApi).toBe(false);
    expect("diffSnapshots" in publicApi).toBe(false);
  });

  it("keeps TOKEN_GROUPS in step with the styles registry it sits beside", () => {
    expect(TOKEN_GROUPS).toContain("colors");
    expect(TOKEN_GROUPS).toContain("code");
    expect(GENERATION_STYLE_NAMES.length).toBeGreaterThan(0);
  });
});
