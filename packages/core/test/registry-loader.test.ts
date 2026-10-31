/**
 * The registry loader.
 *
 * The fixture is the **real** output of `renderThemesModule`, captured from the
 * CLI's own generator rather than hand-written — the point of the loader is to
 * read what `themvora init` writes, so a hand-written fixture would test the
 * wrong thing.
 *
 * The failure cases matter as much as the success: this loader must refuse
 * anything it cannot read statically, because the alternative is guessing at a
 * user's theme colours.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { loadThemeRegistry, readThemeDefinitions } from "../src/registry-loader";

/** The generated module, exactly as `themvora init` writes it. */
const GENERATED = readFileSync("test/fixtures/registry/generated-themes.txt", "utf8");

describe("loadThemeRegistry — the generated module", () => {
  it("reads every theme the module registers", () => {
    const result = loadThemeRegistry(GENERATED);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Two hand-written defaults, three preset families (two modes each), and the
    // generated pair: 2 + 6 + 2.
    expect(result.themes).toHaveLength(10);
    expect(result.themes.map((theme) => theme.name)).toEqual([
      "themvora-default-light",
      "themvora-default-dark",
      "berry-light",
      "berry-dark",
      "citrus-light",
      "citrus-dark",
      "cocoa-light",
      "cocoa-dark",
      "generated-light",
      "generated-dark",
    ]);
  });

  it("reads the selection and the default theme", () => {
    const result = loadThemeRegistry(GENERATED);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.selection).toEqual(["generated", "themvora", "citrus", "cocoa", "berry"]);
    expect(result.defaultTheme).toBe("generated-light");
  });

  it("resolves presets from the catalog rather than copying them", () => {
    const result = loadThemeRegistry(GENERATED);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // `presetThemes` is `getPresetThemes().filter(...)`; the loader must produce
    // the same objects, not a lookalike.
    const berry = result.themes.find((theme) => theme.name === "berry-light");
    expect(berry?.meta?.family).toBe("berry");
    expect(berry?.tokens?.colors?.primary).toBeTruthy();
  });

  it("produces themes the schema accepts", () => {
    const result = loadThemeRegistry(GENERATED);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const theme of result.themes) {
      expect(typeof theme.name).toBe("string");
      expect(theme.tokens?.colors?.background).toBeTruthy();
    }
  });

  it("is deterministic", () => {
    const first = loadThemeRegistry(GENERATED);
    const second = loadThemeRegistry(GENERATED);

    expect(first).toEqual(second);
  });
});

describe("loadThemeRegistry — what it refuses", () => {
  it("refuses a module that is not a generated registry", () => {
    const result = loadThemeRegistry(
      'import { defineTheme } from "@themvora/core";\nexport const myTheme = defineTheme({ name: "x" });\n',
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not-a-registry");
    expect(result.message).toContain("themvora");
  });

  it("refuses a computed defineTheme argument, and says where", () => {
    const source = [
      "export const themvora = [defineTheme(makeTheme())];",
      'export const selection = ["x"];',
      "export const sourceThemes = [];",
    ].join("\n");

    const result = loadThemeRegistry(source);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unsupported-construct");
    expect(result.location?.line).toBe(1);
  });

  it("refuses a spread inside a theme literal", () => {
    // A spread is how a hand-edited registry would try to extend a preset; it
    // cannot be resolved without evaluating the module.
    const source = [
      "export const themvora = [defineTheme({ ...base, name: \"x\" })];",
      'export const selection = [];',
      "export const sourceThemes = [];",
    ].join("\n");

    const result = loadThemeRegistry(source);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unsupported-construct");
  });

  it("refuses a selection that is not a literal array of names", () => {
    const source = [
      "export const themvora = [];",
      "export const selection = FAMILIES;",
      "export const sourceThemes = [];",
    ].join("\n");

    const result = loadThemeRegistry(source);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unsupported-construct");
    expect(result.message).toContain("selection");
  });

  it("refuses a theme that does not satisfy the schema", () => {
    const source = [
      'export const themvora = [defineTheme({ name: "broken", meta: { mode: "light" }, tokens: { colors: {} } })];',
      'export const selection = ["themvora"];',
      "export const sourceThemes = [];",
    ].join("\n");

    const result = loadThemeRegistry(source);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("invalid-theme");
    expect(result.message).toContain("broken");
  });

  it("does not treat a defineTheme mentioned in a comment as a theme", () => {
    // The generated file's own header mentions `defineTheme`; so can a user's.
    const source = [
      "// defineTheme({ name: \"ghost\" }) in a comment",
      "export const themvora = [];",
      'export const selection = [];',
      "export const sourceThemes = [];",
    ].join("\n");

    const result = loadThemeRegistry(source);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.themes).toEqual([]);
  });
});

describe("readThemeDefinitions — any file, not just the registry", () => {
  it("finds the definitions inside the generated registry", () => {
    // The generated module is the common case, and its four literals are all
    // readable: two hand-written defaults and two inlined source themes.
    const result = readThemeDefinitions(GENERATED);

    expect(result.definitions).toHaveLength(4);
    expect(result.problems).toEqual([]);
    expect(result.definitions.map((entry) => entry.theme.name)).toEqual([
      "themvora-default-light",
      "themvora-default-dark",
      "generated-light",
      "generated-dark",
    ]);
  });

  it("records where each definition starts", () => {
    const source = 'const a = 1;\nconst t = defineTheme({\n  name: "x",\n});\n';
    const result = readThemeDefinitions(source);

    // Line 2, at the `{` of the literal — the position a caller would jump to.
    expect(result.definitions[0]?.location).toEqual({ line: 2, column: 23 });
  });

  it("reads a definition outside any registry export", () => {
    const source = 'export const brand = defineTheme({ name: "brand", meta: { mode: "light" }, tokens: { colors: {} } });';
    const result = readThemeDefinitions(source);

    expect(result.definitions).toHaveLength(1);
    expect(result.definitions[0]?.theme.name).toBe("brand");
  });

  it("records the declaration a definition is assigned to", () => {
    // The exported symbol is what another module imports; without it a
    // cross-file reader cannot say which theme that import carries.
    const source = 'export const ocean = defineTheme({ name: "ocean", meta: { mode: "light" }, tokens: { colors: {} } });';
    const result = readThemeDefinitions(source);

    expect(result.definitions[0]?.binding).toBe("ocean");
    expect(result.definitions[0]?.variant).toBeUndefined();
  });

  it("records no binding for a literal inside an array", () => {
    // `export const themvora = [defineTheme(…)]` exports a collection, not a
    // single theme, so no one name stands for this definition.
    const source =
      'export const themvora = [defineTheme({ name: "a", meta: { mode: "light" }, tokens: { colors: {} } })];';
    const result = readThemeDefinitions(source);

    expect(result.definitions).toHaveLength(1);
    expect(result.definitions[0]?.binding).toBeUndefined();
  });

  it("refuses a spread and says why", () => {
    const result = readThemeDefinitions("defineTheme({ ...base, name: \"x\" })");

    expect(result.definitions).toEqual([]);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.message).toContain("not a static object literal");
  });

  it("refuses a call argument rather than executing it", () => {
    const result = readThemeDefinitions("defineTheme(makeTheme())");

    expect(result.definitions).toEqual([]);
    expect(result.problems[0]?.message).toContain("Expected a literal value");
  });

  it("ignores a defineTheme mentioned in a comment", () => {
    const result = readThemeDefinitions('// defineTheme({ name: "ghost" })\nconst x = 1;');

    expect(result.definitions).toEqual([]);
    expect(result.problems).toEqual([]);
  });
});

describe("readThemeDefinitions — generateTheme calls", () => {
  it("evaluates a generateTheme call with literal options", () => {
    // The user's own pattern: a file that generates a pair instead of listing it.
    const source = [
      'import { generateTheme } from "@themvora/core";',
      "export const { light, dark } = generateTheme({ seed: \"#6366f1\", family: \"indigo\" });",
    ].join("\n");

    const result = readThemeDefinitions(source);

    expect(result.problems).toEqual([]);
    expect(result.definitions).toHaveLength(2);
    expect(result.definitions[0]?.theme.meta?.mode).toBe("light");
    expect(result.definitions[1]?.theme.meta?.mode).toBe("dark");
    // Real generator output, not a placeholder.
    expect(result.definitions[0]?.theme.tokens.colors.primary).toBeTruthy();
  });

  it("records the destructured names of a generated pair", () => {
    const source = [
      'import { generateTheme } from "@themvora/core";',
      'export const { light: lightTheme, dark } = generateTheme({ seed: "#6366f1", family: "indigo" });',
    ].join("\n");

    const result = readThemeDefinitions(source);

    expect(result.definitions.map((entry) => [entry.binding, entry.variant])).toEqual([
      ["lightTheme", "light"],
      ["dark", "dark"],
    ]);
  });

  it("records the static generation inputs", () => {
    const result = readThemeDefinitions(
      'export const pair = generateTheme({ seed: "#6366f1", family: "indigo", style: "vibrant", withCode: true });',
    );

    expect(result.definitions.map((entry) => entry.generateOptions)).toEqual([
      { seed: "#6366f1", family: "indigo", style: "vibrant", withCode: true },
      { seed: "#6366f1", family: "indigo", style: "vibrant", withCode: true },
    ]);
  });

  it("records a single name bound to both halves of a pair", () => {
    const source = 'export const pair = generateTheme({ seed: "#6366f1", family: "indigo" });';
    const result = readThemeDefinitions(source);

    expect(result.definitions.map((entry) => entry.binding)).toEqual(["pair", "pair"]);
    expect(result.definitions.map((entry) => entry.variant)).toEqual(["light", "dark"]);
  });

  it("refuses a generateTheme call without a literal seed", () => {
    const result = readThemeDefinitions("generateTheme({ seed: process.env.SEED })");

    expect(result.definitions).toEqual([]);
    expect(result.problems[0]?.message).toContain("not a static options object");
  });

  it("reports an invalid seed instead of throwing", () => {
    const result = readThemeDefinitions('generateTheme({ seed: "not-a-colour" })');

    expect(result.definitions).toEqual([]);
    expect(result.problems[0]?.message).toContain("could not be generated");
  });
});

describe("readThemeDefinitions — strict binding identity", () => {
  it("resolves an imported catalog name when the binding says so", () => {
    const result = readThemeDefinitions(
      'import { getPresetThemes } from "@themvora/core";\nexport const presets = getPresetThemes();\n',
      { bindings: { getPresetThemes: "getPresetThemes" }, strict: true },
    );

    expect(result.definitions).toHaveLength(18);
    expect(result.definitions.every((entry) => entry.origin === "catalog")).toBe(true);
  });

  it("refuses a local function with the catalog's name in strict mode", () => {
    // The spelling is not the API. Without a verified binding, nothing resolves.
    const result = readThemeDefinitions(
      "function getPresetThemes() { return []; }\nexport const presets = getPresetThemes();",
      { strict: true },
    );

    expect(result.definitions).toEqual([]);
    expect(result.problems).toEqual([]);
  });

  it("reads an aliased catalog binding", () => {
    const result = readThemeDefinitions("export const presets = catalogue();", {
      bindings: { catalogue: "getPresetThemes" },
      strict: true,
    });

    expect(result.definitions).toHaveLength(18);
  });

  it("reads a catalog member through a namespace binding in non-strict mode", () => {
    const result = readThemeDefinitions(
      'import * as kit from "@themvora/core";\nexport const presets = kit.getPresetThemes();',
      { bindings: { kit: "*" } },
    );

    expect(result.definitions).toHaveLength(18);
  });

  it("reads a catalog member through a verified namespace", () => {
    const result = readThemeDefinitions(
      'import * as core from "@themvora/core";\nexport const presets = core.getPresetThemes();',
      { namespaces: { core: ["getPresetThemes"] }, strict: true },
    );

    expect(result.definitions).toHaveLength(18);
  });

  it("refuses a namespace member outside the verified exports", () => {
    const result = readThemeDefinitions(
      'import * as core from "@themvora/core";\nexport const presets = core.getPresetThemes();',
      { namespaces: { core: ["defineTheme"] }, strict: true },
    );

    expect(result.definitions).toEqual([]);
  });

  it("still reads defineTheme through a strict binding", () => {
    const result = readThemeDefinitions(
      'export const theme = make({ name: "x", meta: { mode: "light" }, tokens: { colors: {} } });',
      { bindings: { make: "defineTheme" }, strict: true },
    );

    expect(result.definitions).toHaveLength(1);
    expect(result.definitions[0]?.origin).toBe("definition");
  });
});

describe("readThemeDefinitions — catalog calls", () => {
  it("resolves getPresetThemes() to the curated catalog", () => {
    const result = readThemeDefinitions('import { getPresetThemes } from "@themvora/core";\nexport const presets = getPresetThemes();\n');

    expect(result.problems).toEqual([]);
    expect(result.definitions).toHaveLength(18);
    expect(result.definitions[0]?.theme.meta?.family).toBe("oat");
  });

  it("distinguishes registry preset provenance from project definitions", () => {
    const result = loadThemeRegistry(GENERATED);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.origins).toHaveLength(result.themes.length);
    expect(result.origins.filter((origin) => origin === "definition")).toHaveLength(4);
    expect(result.origins.filter((origin) => origin === "catalog").length).toBeGreaterThan(0);
  });

  it("records the array a catalog call is assigned to", () => {
    const result = readThemeDefinitions(
      'import { getPresetThemes } from "@themvora/core";\nexport const presets = getPresetThemes();\n',
    );

    expect(result.definitions.every((entry) => entry.binding === "presets")).toBe(true);
  });

  it("distinguishes catalog provenance from a project definition", () => {
    const source = [
      'import { defineTheme, getPresetThemes } from "@themvora/core";',
      'export const own = defineTheme({ name: "own", meta: { mode: "light" }, tokens: { colors: {} } });',
      "export const presets = getPresetThemes();",
    ].join("\n");

    const result = readThemeDefinitions(source);

    expect(result.definitions.find((entry) => entry.binding === "own")?.origin).toBe("definition");
    expect(result.definitions.filter((entry) => entry.origin === "catalog")).toHaveLength(18);
  });

  it("resolves getBrandPresets() to the brand catalog", () => {
    const result = readThemeDefinitions("export const brands = getBrandPresets();");
    const families = new Set(result.definitions.map((entry) => entry.theme.meta?.family));

    expect(result.definitions).toHaveLength(10);
    expect(families.has("slack")).toBe(true);
  });

  it("refuses a catalog call with arguments it cannot evaluate", () => {
    const result = readThemeDefinitions("getPresetThemes({ oat: {} })");

    expect(result.definitions).toEqual([]);
    expect(result.problems[0]?.message).toContain("takes no arguments");
  });
});
