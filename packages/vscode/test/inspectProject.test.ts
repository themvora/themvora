/**
 * Inspection tests.
 *
 * The reader here is in-memory, which is the point of the `ProjectReader`
 * interface: the rules of classification are tested without touching a disk, and
 * the filesystem adapter is tested separately against real files.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { generateTheme } from "@themvora/core";
import { describe, expect, it } from "vitest";

import { inspectProject } from "../src/domain/inspectProject";
import type { ProjectReader } from "../src/domain/registry";

/** A valid light/dark pair, produced by the real generator rather than hand-written. */
const PAIR = generateTheme({ seed: "#4f46e5" });
const PAIR_JSON = JSON.stringify({ light: PAIR.light, dark: PAIR.dark }, null, 2);

/** An in-memory reader that records every path it is asked for. */
function readerOf(files: Record<string, string>): ProjectReader & { reads: string[] } {
  const reads: string[] = [];

  return {
    reads,
    async read(relativePath: string): Promise<string | null> {
      reads.push(relativePath);
      return files[relativePath] ?? null;
    },
    async walk(): Promise<readonly string[]> {
      return Object.keys(files);
    },
    async list(relativeDir: string): Promise<readonly string[]> {
      reads.push(`list:${relativeDir}`);
      const prefix = relativeDir === "." ? "" : `${relativeDir}/`;
      const names = new Set<string>();

      for (const key of Object.keys(files)) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        if (rest.length > 0 && !rest.includes("/")) names.add(rest);
      }

      return [...names];
    },
  };
}

/** The manifest a Themvora project would have. */
const MANIFEST = JSON.stringify({
  name: "app",
  dependencies: { "@themvora/core": "^1.4.0", react: "^19.0.0" },
  devDependencies: { "@themvora/react": "^1.3.1" },
});

describe("inspectProject", () => {
  it("reports a folder with nothing in it as missing, not as an error", async () => {
    const result = await inspectProject("/empty", readerOf({}));

    expect(result.status).toBe("missing");
    expect(result.registries).toEqual([]);
    expect(result.packages).toEqual([]);
    expect(result.notes).toEqual(["No package.json found."]);
  });

  it("reads a light/dark pair and calls it supported", async () => {
    const result = await inspectProject("/app", readerOf({ "theme.json": PAIR_JSON }));

    expect(result.status).toBe("supported");
    expect(result.registries).toHaveLength(1);

    const entry = result.registries[0]!;
    expect(entry.kind).toBe("theme-json");
    expect(entry.path).toBe("theme.json");
    expect(entry.themes?.map((theme) => theme.name)).toEqual(["generated-light", "generated-dark"]);
  });

  it("reads a single theme definition", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({ "theme.json": JSON.stringify(PAIR.light) }),
    );

    expect(result.status).toBe("supported");
    expect(result.registries[0]?.themes).toHaveLength(1);
  });

  it("reports invalid JSON as malformed", async () => {
    const result = await inspectProject("/app", readerOf({ "theme.json": "{ not json" }));

    expect(result.status).toBe("malformed");
    expect(result.registries[0]?.detail).toContain("not valid JSON");
    expect(result.registries[0]?.themes).toBeUndefined();
  });

  it("reports a document that is neither shape as malformed", async () => {
    const result = await inspectProject("/app", readerOf({ "theme.json": '{"hello":"world"}' }));

    expect(result.status).toBe("malformed");
    expect(result.registries[0]?.detail).toContain("neither a theme");
  });

  it("reports a theme missing required tokens as malformed", async () => {
    // A single theme definition — it has `tokens`, so it is recognised as a
    // theme, and `validateTheme()` is what rejects the empty colour block.
    const crippled = JSON.stringify({ name: "broken", tokens: { colors: {} } });
    const result = await inspectProject("/app", readerOf({ "theme.json": crippled }));

    expect(result.status).toBe("malformed");
    expect(result.registries[0]?.detail).toContain("missing required tokens");
  });

  it("reads a generated registry module and reports its themes", async () => {
    // The fixture is the real output of the CLI's own renderer, captured rather
    // than hand-written: the point is to read what `themvora init` writes.
    const source = readFileSync(
      fileURLToPath(new URL("../../core/test/fixtures/registry/generated-themes.txt", import.meta.url)),
      "utf8",
    );
    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/themes/themes.ts": source }),
    );

    expect(result.status).toBe("supported");
    expect(result.registries).toHaveLength(1);

    const entry = result.registries[0]!;
    expect(entry.kind).toBe("theme-module");
    expect(entry.path).toBe("src/themes/themes.ts");
    expect(entry.themes).toHaveLength(10);
    expect(entry.themes?.map((theme) => theme.name)).toContain("generated-light");
    expect(entry.detail).toContain("10 themes");
  });

  it("reports a module that is not a generated registry as unsupported", async () => {
    // A hand-written module is not ours to interpret; saying so is the honest
    // outcome, and it must not be described as the user's file being wrong.
    const source = 'import { defineTheme } from "@themvora/core";\nexport const themes = [];\n';
    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/themes/themes.ts": source }),
    );

    expect(result.status).toBe("unsupported");
    const entry = result.registries[0]!;
    expect(entry.themes).toBeUndefined();
    expect(entry.detail).toContain("not a generated Themvora registry");
  });

  it("reports a registry holding an invalid theme as malformed", async () => {
    // Parsed, but the data is wrong — that is the user's file, not our limit.
    const source = [
      'export const themvora = [defineTheme({ name: "broken", meta: { mode: "light" }, tokens: { colors: {} } })];',
      'export const selection = ["themvora"];',
      "export const sourceThemes = [];",
    ].join("\n");
    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/themes/themes.ts": source }),
    );

    expect(result.status).toBe("malformed");
    expect(result.registries[0]?.detail).toContain("broken");
  });

  it("reads themes defined with defineTheme() outside the canonical registry", async () => {
    // `defineTheme()` returns its argument, so a literal is the theme. The literal
    // here is a real generated theme, which is what a project would paste in — a
    // hand-written four-colour stub would fail the schema, correctly.
    const theme = generateTheme({ seed: "#4f46e5" }).light;
    const source = [
      'import { defineTheme } from "@themvora/core";',
      `export const brand = defineTheme(${JSON.stringify(theme, null, 2)});`,
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme/brand.ts": source }),
    );

    expect(result.status).toBe("supported");
    const entry = result.registries.find((candidate) => candidate.path === "src/theme/brand.ts");
    expect(entry?.themes?.map((entryTheme) => entryTheme.name)).toEqual([theme.name]);
    expect(entry?.detail).toContain("defined in this file");
  });

  it("marks a definition that fails validation as malformed", async () => {
    // Readable, but the data is wrong — the user's file, not our limitation.
    const source = [
      'import { defineTheme } from "@themvora/core";',
      "export const broken = defineTheme({",
      '  name: "broken",',
      '  meta: { mode: "light" },',
      "  tokens: { colors: {} },",
      "});",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme/broken.ts": source }),
    );

    const entry = result.registries.find((candidate) => candidate.path === "src/theme/broken.ts");
    expect(entry?.status).toBe("malformed");
    expect(entry?.detail).toContain("broken");
    expect(result.status).toBe("malformed");
  });

  it("does not list the canonical registry twice", async () => {
    // `src/themes/themes.ts` is read by the registry loader; the broader scan must
    // skip it, or every theme would appear twice in the tree.
    const source = readFileSync(
      fileURLToPath(new URL("../../core/test/fixtures/registry/generated-themes.txt", import.meta.url)),
      "utf8",
    );
    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/themes/themes.ts": source }),
    );

    expect(result.registries).toHaveLength(1);
    expect(result.registries[0]?.path).toBe("src/themes/themes.ts");
    expect(result.registries[0]?.themes).toHaveLength(10);
  });

  it("ignores a theme-named file with no definitions", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme/helpers.ts": "export const x = 1;" }),
    );

    expect(result.registries).toEqual([]);
  });

  it("reports a theme.config module as unsupported", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({ "theme.config.ts": "export default {};" }),
    );

    expect(result.status).toBe("unsupported");
    expect(result.registries[0]?.kind).toBe("config");
    expect(result.registries[0]?.detail).toContain("executing workspace TypeScript");
  });

  it("finds a theme config wherever the project keeps it", async () => {
    // The requirement: a project may keep its configuration in `src/theme/`, and
    // the editor must not impose a layout the build tools do not.
    const result = await inspectProject(
      "/app",
      readerOf({
        "package.json": MANIFEST,
        "src/theme/theme.config.ts": "export const themes = [];",
      }),
    );

    expect(result.registries.map((entry) => entry.path)).toEqual(["src/theme/theme.config.ts"]);
    expect(result.registries[0]?.kind).toBe("config");
    expect(result.status).toBe("unsupported");
  });

  it("finds a themes module outside the canonical directories", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "app/lib/themes.ts": "export const themes = [];" }),
    );

    expect(result.registries.map((entry) => entry.path)).toEqual(["app/lib/themes.ts"]);
    expect(result.registries[0]?.kind).toBe("theme-module");
  });

  it("lists the canonical registry path before other theme modules", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({
        "package.json": MANIFEST,
        "src/themes/themes.ts": "export const themes = [];",
        "app/lib/themes.ts": "export const themes = [];",
      }),
    );

    expect(result.registries.map((entry) => entry.path)).toEqual([
      "src/themes/themes.ts",
      "app/lib/themes.ts",
    ]);
  });

  it("prefers a supported registry over an unsupported one", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({ "theme.json": PAIR_JSON, "src/themes/themes.ts": "export const themes = [];" }),
    );

    expect(result.status).toBe("supported");
    expect(result.registries.map((entry) => entry.status)).toEqual(["unsupported", "supported"]);
  });

  it("prefers malformed over unsupported", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({ "theme.json": "{", "src/themes/themes.ts": "export const themes = [];" }),
    );

    expect(result.status).toBe("malformed");
  });

  it("scans the themes directory and the .theme.json suffix", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({
        "theme.json": PAIR_JSON,
        "brand.theme.json": PAIR_JSON,
        "themes/extra.json": PAIR_JSON,
        "themes/notes.txt": "ignored",
      }),
    );

    expect(result.registries.map((entry) => entry.path)).toEqual([
      "theme.json",
      "brand.theme.json",
      "themes/extra.json",
    ]);
  });

  it("collects Themvora packages from every dependency block", async () => {
    const result = await inspectProject("/app", readerOf({ "package.json": MANIFEST }));

    expect(result.packages).toEqual(["@themvora/core", "@themvora/react"]);
    expect(result.status).toBe("missing");
  });

  it("notes a broken manifest without failing the inspection", async () => {
    const result = await inspectProject("/app", readerOf({ "package.json": "{" }));

    expect(result.notes).toContain("package.json is not valid JSON.");
    expect(result.status).toBe("missing");
  });

  it("preserves a root path containing spaces", async () => {
    const root = "C:/Users/some one/My Projects/the app";
    const result = await inspectProject(root, readerOf({ "theme.json": PAIR_JSON }));

    expect(result.root).toBe(root);
  });

  it("only ever reads — the reader has no write surface", async () => {
    const reader = readerOf({ "theme.json": PAIR_JSON, "package.json": MANIFEST });
    await inspectProject("/app", reader);

    // Every interaction is a read, a list or a walk; there is no other method to
    // call. `walk` joined the surface when discovery stopped assuming a layout,
    // and it is still read-only — the point of this assertion.
    expect(Object.keys(reader).sort()).toEqual(["list", "read", "reads", "walk"]);
    expect(Object.keys(reader).filter((key) => /write|save|delete|remove|mkdir/i.test(key))).toEqual([]);
  });
});

describe("a theme file that only partly reads", () => {
  // A real generated theme, so the valid half is valid for the right reasons.
  const VALID = generateTheme({ seed: "#0ea5e9" }).light;
  const DEFINITION = JSON.stringify(
    { name: "ocean-light", meta: { family: "ocean", mode: "light" }, tokens: VALID.tokens },
    null,
    2,
  );

  /** One good definition, one call whose seed cannot be generated. */
  const PARTIAL = [
    'import { defineTheme, generateTheme } from "@themvora/core";',
    `export const ocean = defineTheme(${DEFINITION});`,
    'export const { light, dark } = generateTheme({ seed: "#E789C", family: "custom" });',
  ].join("\n");

  it("reports the call it could not read instead of dropping it", async () => {
    const result = await inspectProject("/app", readerOf({ "src/theme.config.ts": PARTIAL }));
    const entry = result.registries.find((registry) => registry.path === "src/theme.config.ts");

    // The theme that did read is still listed...
    expect(entry?.themes?.map((theme) => theme.name)).toEqual(["ocean-light"]);
    // ...and the one that did not is named, with the reason.
    expect(entry?.problems).toHaveLength(1);
    expect(entry?.problems?.[0]).toContain("#E789C");
    expect(entry?.detail).toContain("could not be read");
  });
});

describe("provider usage", () => {
  it("finds the themes a JSX provider is given", async () => {
    const main = [
      'import { ThemeProvider } from "@themvora/react";',
      'import { oceanLight, oceanDark } from "./theme/theme.config";',
      "export const App = () => <ThemeProvider themes={[oceanLight, oceanDark]} />;",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/main.tsx": main }));
    const usage = result.providers.find((entry) => entry.path === "src/main.tsx");

    expect(usage?.names).toEqual(["oceanLight", "oceanDark"]);
  });

  it("finds the options a verified Angular provider is given", async () => {
    const main = [
      'import { provideTheme } from "@themvora/angular";',
      "provideTheme({ themes: [oceanLight, oceanDark] });",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/main.ts": main }));
    const usage = result.providers.find((entry) => entry.path === "src/main.ts");

    expect(usage?.names).toEqual(["oceanLight", "oceanDark"]);
    expect(usage?.integration).toBe("angular");
    expect(usage?.api).toBe("provideTheme");
  });

  it("does not recognize a local provideTheme that was never imported", async () => {
    // The identifier is not proof: this is an unrelated local function.
    const main = [
      "function provideTheme(options: { themes: string[] }) {",
      "  return options;",
      "}",
      "provideTheme({ themes: [oceanLight, oceanDark] });",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/main.ts": main }));

    expect(result.providers).toEqual([]);
  });

  it("does not report a file that never passes themes", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({ "src/util.ts": "export const themeCount = (themes: string[]) => themes.length;" }),
    );

    expect(result.providers).toEqual([]);
  });
});

describe("API identity comes from the import, not the spelling", () => {
  it("ignores a local function that happens to be called generateTheme", async () => {
    const local = [
      "function generateTheme(options: { seed: string }) {",
      "  return options;",
      "}",
      'export const pair = generateTheme({ seed: "#4f46e5" });',
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/local.ts": local }));
    const entry = result.registries.find((registry) => registry.path === "src/local.ts");

    expect(entry?.status).toBe("unsupported");
    expect(entry?.themes ?? []).toEqual([]);
    expect(entry?.detail).toContain("does not import");
  });

  it("reads an aliased defineTheme as the canonical API", async () => {
    const VALID = generateTheme({ seed: "#0ea5e9" }).light;
    const definition = JSON.stringify({ name: "ocean-light", meta: { family: "ocean", mode: "light" }, tokens: VALID.tokens }, null, 2);
    const aliased = [
      'import { defineTheme as make } from "@themvora/core";',
      `export const ocean = make(${definition});`,
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/theme.ts": aliased }));
    const entry = result.registries.find((registry) => registry.path === "src/theme.ts");

    expect(entry?.status).toBe("supported");
    expect(entry?.themes?.map((theme) => theme.name)).toEqual(["ocean-light"]);
  });

  it("reads an aliased generateTheme and returns its real pair", async () => {
    const aliased = [
      'import { generateTheme as makePair } from "@themvora/core";',
      'export const pair = makePair({ seed: "#0ea5e9", family: "sky" });',
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/theme.ts": aliased }));
    const entry = result.registries.find((registry) => registry.path === "src/theme.ts");

    expect(entry?.themes?.map((theme) => theme.meta?.mode)).toEqual(["light", "dark"]);
    expect(entry?.themes?.every((theme) => theme.meta?.family === "sky")).toBe(true);
  });

  it("reads a namespace member call", async () => {
    const namespaced = [
      'import * as kit from "@themvora/core";',
      'export const pair = kit.generateTheme({ seed: "#0ea5e9", family: "sky" });',
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/theme.ts": namespaced }));
    const entry = result.registries.find((registry) => registry.path === "src/theme.ts");

    expect(entry?.themes?.map((theme) => theme.meta?.mode)).toEqual(["light", "dark"]);
  });

  it("does not treat a local object's method as a Themvora API", async () => {
    const local = [
      "const kit = { generateTheme: (options: unknown) => options };",
      'export const pair = kit.generateTheme({ seed: "#0ea5e9" });',
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/local.ts": local }));
    const entry = result.registries.find((registry) => registry.path === "src/local.ts");

    expect(entry?.themes ?? []).toEqual([]);
  });

  it("still reads a file that imports the API it calls", async () => {
    const VALID = generateTheme({ seed: "#0ea5e9" }).light;
    const definition = JSON.stringify({ name: "ocean-light", meta: { family: "ocean", mode: "light" }, tokens: VALID.tokens }, null, 2);
    const source = [
      'import { defineTheme } from "@themvora/core";',
      `export const ocean = defineTheme(${definition});`,
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/theme.ts": source }));
    const entry = result.registries.find((registry) => registry.path === "src/theme.ts");

    expect(entry?.status).toBe("supported");
    expect(entry?.themes?.map((theme) => theme.name)).toEqual(["ocean-light"]);
  });
});

describe("cross-file relationships", () => {
  const OCEAN = generateTheme({ seed: "#0ea5e9", family: "ocean" });

  /** A real theme literal, as a project would paste one in. */
  const definition = (theme: typeof OCEAN.light): string => JSON.stringify(theme, null, 2);

  /** A theme module defining both halves of the ocean pair. */
  const THEME_MODULE = [
    'import { defineTheme } from "@themvora/core";',
    `export const oceanLight = defineTheme(${definition(OCEAN.light)});`,
    `export const oceanDark = defineTheme(${definition(OCEAN.dark)});`,
  ].join("\n");

  /** A React entry point that imports and supplies both themes. */
  const MAIN = [
    'import { ThemeProvider } from "@themvora/react";',
    'import { oceanLight, oceanDark } from "./theme";',
    "export const App = () => <ThemeProvider themes={[oceanLight, oceanDark]} />;",
  ].join("\n");

  it("records definedIn and usedBy for a theme imported by a provider", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme.ts": THEME_MODULE, "src/main.tsx": MAIN }),
    );

    const oceanLight = result.relationships.find((entry) => entry.name === "ocean-light");
    const oceanDark = result.relationships.find((entry) => entry.name === "ocean-dark");

    // The two paths the milestone asks for, per theme.
    expect(oceanLight).toMatchObject({ definedIn: "src/theme.ts", usedBy: ["src/main.tsx"] });
    expect(oceanDark).toMatchObject({ definedIn: "src/theme.ts", usedBy: ["src/main.tsx"] });

    const usage = result.providers.find((entry) => entry.path === "src/main.tsx");
    expect(usage?.resolution).toBe("resolved");
    expect(usage?.importsFrom).toEqual(["src/theme.ts"]);
    expect(usage?.unresolved).toBeUndefined();
  });

  it("leaves a defined theme's usedBy empty when nothing imports it", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme.ts": THEME_MODULE }),
    );

    expect(result.relationships.map((entry) => entry.usedBy)).toEqual([[], []]);
  });

  it("follows one re-export to the file that defines the theme", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({
        "package.json": MANIFEST,
        "src/theme/ocean.ts": THEME_MODULE,
        "src/theme/index.ts": 'export { oceanLight, oceanDark } from "./ocean";',
        "src/main.tsx": MAIN,
      }),
    );

    const oceanLight = result.relationships.find((entry) => entry.name === "ocean-light");
    expect(oceanLight?.definedIn).toBe("src/theme/ocean.ts");
    expect(oceanLight?.usedBy).toEqual(["src/main.tsx"]);
  });

  it("reports an unresolved name as partially-resolved", async () => {
    const partialTheme = [
      'import { defineTheme } from "@themvora/core";',
      `export const oceanLight = defineTheme(${definition(OCEAN.light)});`,
    ].join("\n");
    const main = [
      'import { ThemeProvider } from "@themvora/react";',
      'import { oceanLight, missingTheme } from "./theme";',
      "export const App = () => <ThemeProvider themes={[oceanLight, missingTheme]} />;",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme.ts": partialTheme, "src/main.tsx": main }),
    );

    const usage = result.providers.find((entry) => entry.path === "src/main.tsx");
    expect(usage?.resolution).toBe("partially-resolved");
    expect(usage?.unresolved).toEqual(["missingTheme"]);

    // The name that did resolve still carries its consumer.
    expect(result.relationships[0]?.usedBy).toEqual(["src/main.tsx"]);
  });

  it("does not attach themes to a bare package specifier", async () => {
    const main = [
      'import { ThemeProvider } from "@themvora/react";',
      'import { themes } from "@themvora/app-shared/themes";',
      "export const App = () => <ThemeProvider themes={themes} />;",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/main.tsx": main }),
    );

    const usage = result.providers.find((entry) => entry.path === "src/main.tsx");
    expect(usage?.resolution).toBe("unresolved");
    expect(usage?.unresolved).toEqual(["themes"]);
    expect(usage?.importsFrom).toBeUndefined();
  });

  it("expands a local collection built from imports", async () => {
    const main = [
      'import { ThemeProvider } from "@themvora/react";',
      'import { oceanLight, oceanDark } from "./theme";',
      "const themes = [oceanLight, oceanDark];",
      "export const App = () => <ThemeProvider themes={themes} />;",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme.ts": THEME_MODULE, "src/main.tsx": main }),
    );

    const usage = result.providers.find((entry) => entry.path === "src/main.tsx");
    expect(usage?.resolution).toBe("resolved");
    expect(result.relationships.map((entry) => entry.usedBy)).toEqual([
      ["src/main.tsx"],
      ["src/main.tsx"],
    ]);
  });

  it("does not claim a namespace import supplies every theme", async () => {
    const main = [
      'import { ThemeProvider } from "@themvora/react";',
      'import * as kit from "./theme";',
      "export const App = () => <ThemeProvider themes={kit} />;",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme.ts": THEME_MODULE, "src/main.tsx": main }),
    );

    expect(result.relationships.map((entry) => entry.usedBy)).toEqual([[], []]);
    expect(result.providers.find((entry) => entry.path === "src/main.tsx")?.resolution).toBe(
      "unresolved",
    );
  });

  it("attributes a generated registry's aggregate export to every theme", async () => {
    const registry = readFileSync(
      fileURLToPath(new URL("../../core/test/fixtures/registry/generated-themes.txt", import.meta.url)),
      "utf8",
    );
    const main = [
      'import { ThemeProvider } from "@themvora/react";',
      'import { themes } from "./themes/themes";',
      "export const App = () => <ThemeProvider themes={themes} />;",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/themes/themes.ts": registry, "src/main.tsx": main }),
    );

    const usage = result.providers.find((entry) => entry.path === "src/main.tsx");
    expect(usage?.resolution).toBe("resolved");
    expect(usage?.importsFrom).toEqual(["src/themes/themes.ts"]);
    expect(result.relationships).toHaveLength(10);
    expect(result.relationships.every((entry) => entry.usedBy.includes("src/main.tsx"))).toBe(true);
  });
});

describe("verified consumer evidence", () => {
  const OCEAN = generateTheme({ seed: "#0ea5e9", family: "ocean" });
  const literal = (theme: typeof OCEAN.light): string => JSON.stringify(theme, null, 2);

  const THEME_MODULE = [
    'import { defineTheme } from "@themvora/core";',
    `export const oceanLight = defineTheme(${literal(OCEAN.light)});`,
    `export const oceanDark = defineTheme(${literal(OCEAN.dark)});`,
  ].join("\n");

  const REACT_MAIN = [
    'import { ThemeProvider } from "@themvora/react";',
    'import { oceanLight, oceanDark } from "./theme";',
    "export const App = () => <ThemeProvider themes={[oceanLight, oceanDark]} />;",
  ].join("\n");

  it("marks a theme supplied through React as registered", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme.ts": THEME_MODULE, "src/main.tsx": REACT_MAIN }),
    );

    expect(result.relationships.map((entry) => entry.evidence)).toEqual([
      "registered",
      "registered",
    ]);

    const usage = result.providers.find((entry) => entry.path === "src/main.tsx");
    expect(usage).toMatchObject({
      integration: "react",
      api: "ThemeProvider",
      input: "static",
      evidence: "registered",
    });
  });

  it("leaves a defined theme defined-unregistered when nothing consumes it", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme.ts": THEME_MODULE }),
    );

    expect(result.relationships.map((entry) => entry.evidence)).toEqual([
      "defined-unregistered",
      "defined-unregistered",
    ]);
  });

  it("recognizes an Angular provideTheme call", async () => {
    const main = [
      'import { provideTheme } from "@themvora/angular";',
      'import { oceanLight, oceanDark } from "./theme";',
      "provideTheme({ themes: [oceanLight, oceanDark], defaultTheme: \"ocean-light\" });",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme.ts": THEME_MODULE, "src/main.ts": main }),
    );

    expect(result.providers[0]).toMatchObject({
      integration: "angular",
      api: "provideTheme",
      evidence: "registered",
    });
    expect(result.relationships.every((entry) => entry.evidence === "registered")).toBe(true);
  });

  it("recognizes the Nuxt module configuration", async () => {
    const themeModule = [
      THEME_MODULE,
      "export const themes = [oceanLight, oceanDark];",
    ].join("\n");
    const config = [
      'import { themes } from "./theme";',
      "export default defineNuxtConfig({",
      '  modules: ["@themvora/nuxt"],',
      '  themvora: { themes },',
      "});",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "theme.ts": themeModule, "nuxt.config.ts": config }),
    );

    expect(result.providers[0]).toMatchObject({
      integration: "nuxt",
      api: "defineNuxtConfig",
      evidence: "registered",
    });
    expect(result.relationships.every((entry) => entry.evidence === "registered")).toBe(true);
  });

  it("recognizes new Themvora with themes", async () => {
    const main = [
      'import { Themvora } from "@themvora/core/vanilla";',
      'import { oceanLight, oceanDark } from "./theme";',
      "const kit = new Themvora({ themes: [oceanLight, oceanDark] });",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme.ts": THEME_MODULE, "src/main.ts": main }),
    );

    expect(result.providers[0]).toMatchObject({
      integration: "vanilla",
      api: "new Themvora",
      evidence: "registered",
    });
  });

  it("does not invent a registration for a bare new Themvora()", async () => {
    const main = [
      'import { Themvora } from "@themvora/core/vanilla";',
      "const kit = new Themvora();",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme.ts": THEME_MODULE, "src/main.ts": main }),
    );

    expect(result.providers[0]).toMatchObject({
      integration: "vanilla",
      input: "absent",
      evidence: "unresolved",
    });
    expect(result.providers[0]?.reason).toContain("built-in catalog");
    expect(result.relationships.every((entry) => entry.usedBy.length === 0)).toBe(true);
  });

  it("reports a dynamic provider value as dynamic-unverified", async () => {
    const main = [
      'import { ThemeProvider } from "@themvora/react";',
      "export const App = () => <ThemeProvider themes={selectThemes(mode)} />;",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme.ts": THEME_MODULE, "src/main.tsx": main }),
    );

    expect(result.providers[0]).toMatchObject({
      integration: "react",
      input: "dynamic",
      evidence: "dynamic-unverified",
    });
    expect(result.relationships.every((entry) => entry.usedBy.length === 0)).toBe(true);
    expect(result.relationships.every((entry) => entry.evidence === "defined-unregistered")).toBe(
      true,
    );
  });

  it("reports Web Components registration without claiming a theme", async () => {
    const main = [
      'import { defineCustomElements } from "@themvora/web";',
      "defineCustomElements();",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/main.ts": main }),
    );

    expect(result.providers[0]).toMatchObject({
      integration: "web",
      api: "defineCustomElements",
      registrationOnly: true,
      evidence: "registration-only",
    });
  });

  it("traces runtime.use(pack) through an imported pack", async () => {
    const packModule = [
      THEME_MODULE,
      "export const solarPack = {",
      '  name: "solar",',
      "  themes: [oceanLight, oceanDark],",
      "};",
    ].join("\n");
    const main = [
      'import { getProviderRuntime } from "@themvora/web";',
      'import { solarPack } from "./theme";',
      "const runtime = getProviderRuntime(provider);",
      "runtime.use(solarPack);",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme.ts": packModule, "src/main.ts": main }),
    );

    const use = result.providers.find((entry) => entry.api === "runtime.use");
    expect(use).toMatchObject({
      integration: "web",
      input: "static",
      names: ["solarPack"],
      evidence: "registered",
    });
    expect(result.relationships.every((entry) => entry.evidence === "registered")).toBe(true);
  });

  it("does not treat an unrelated themes prop as a consumer", async () => {
    const main = [
      'import { Chart } from "./chart";',
      "export const App = () => <Chart themes={[oceanLight]} />;",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/main.tsx": main }));

    expect(result.providers).toEqual([]);
  });

  it("marks an unused catalog call as catalog-source", async () => {
    const source = [
      'import { getPresetThemes } from "@themvora/core";',
      "export const presets = getPresetThemes();",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/presets.ts": source }));

    expect(result.relationships.length).toBeGreaterThan(0);
    expect(result.relationships.every((entry) => entry.evidence === "catalog-source")).toBe(true);
  });

  it("resolves an API through one project re-export", async () => {
    const main = [
      'import { Themvora } from "./runtime";',
      'import { oceanLight, oceanDark } from "./theme";',
      "const kit = new Themvora({ themes: [oceanLight, oceanDark] });",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({
        "package.json": MANIFEST,
        "src/theme.ts": THEME_MODULE,
        "src/runtime.ts": 'export { Themvora } from "@themvora/core/vanilla";',
        "src/main.ts": main,
      }),
    );

    expect(result.providers[0]).toMatchObject({
      integration: "vanilla",
      api: "new Themvora",
      evidence: "registered",
    });
  });

  it("reports an imported collection that names no theme as partial", async () => {
    const main = [
      'import { ThemeProvider } from "@themvora/react";',
      'import { themes } from "./theme";',
      "export const App = () => <ThemeProvider themes={themes} />;",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({
        "package.json": MANIFEST,
        "src/theme.ts": "export const themes = [];",
        "src/main.tsx": main,
      }),
    );

    expect(result.providers[0]).toMatchObject({
      input: "static",
      resolution: "unresolved",
      evidence: "partially-resolved",
      importsFrom: ["src/theme.ts"],
    });
    expect(result.relationships).toEqual([]);
  });

  it("resolves a collection defined in the provider file itself", async () => {
    const main = [
      'import { defineTheme } from "@themvora/core";',
      'import { ThemeProvider } from "@themvora/react";',
      `export const oceanLight = defineTheme(${literal(OCEAN.light)});`,
      "const themes = [oceanLight];",
      "export const App = () => <ThemeProvider themes={themes} />;",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/main.tsx": main }),
    );

    expect(result.providers[0]).toMatchObject({
      integration: "react",
      input: "static",
      evidence: "registered",
    });
    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0]).toMatchObject({
      definedIn: "src/main.tsx",
      usedBy: ["src/main.tsx"],
      evidence: "registered",
    });
  });

  it("records the source position of the consumer API", async () => {
    const main = [
      'import { ThemeProvider } from "@themvora/react";',
      'import { oceanLight } from "./theme";',
      "export const App = () => (",
      "  <ThemeProvider themes={[oceanLight]} />",
      ");",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({ "package.json": MANIFEST, "src/theme.ts": THEME_MODULE, "src/main.tsx": main }),
    );

    expect(result.providers[0]?.location).toEqual({ line: 4, column: 4 });
  });
});

describe("catalog identity", () => {
  const OCEAN = generateTheme({ seed: "#0ea5e9", family: "ocean" });
  const LITERAL = JSON.stringify(OCEAN.light, null, 2);

  it("reads an aliased catalog import", async () => {
    const source = [
      'import { getPresetThemes as presets } from "@themvora/core";',
      "export const list = presets();",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/presets.ts": source }));
    const entry = result.registries[0]!;

    expect(entry.themes).toHaveLength(18);
    expect(entry.themeSources?.every((theme) => theme.origin === "catalog")).toBe(true);
  });

  it("reads a catalog member through a namespace import", async () => {
    const source = [
      'import * as core from "@themvora/core";',
      "export const presets = core.getPresetThemes();",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/presets.ts": source }));

    expect(result.registries[0]?.themes).toHaveLength(18);
  });

  it("reads the catalog through the Nuxt core re-export", async () => {
    const source = [
      'import { getPresetThemes } from "@themvora/nuxt";',
      "export const presets = getPresetThemes();",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/presets.ts": source }));

    expect(result.registries[0]?.themes).toHaveLength(18);
    expect(result.registries[0]?.themeSources?.[0]?.origin).toBe("catalog");
  });

  it("does not read a local function with the catalog's name", async () => {
    const source = [
      "function getPresetThemes() { return []; }",
      "export const presets = getPresetThemes();",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/local.ts": source }));
    const entry = result.registries[0];

    expect(entry?.themes).toBeUndefined();
    expect(entry?.detail).toContain("does not import");
  });

  it("does not read a lookalike even when another Themvora package is imported", async () => {
    const source = [
      'import { ThemeProvider } from "@themvora/react";',
      "function getPresetThemes() { return []; }",
      "export const presets = getPresetThemes();",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/local.ts": source }));
    const entry = result.registries[0];

    expect(entry?.themes).toBeUndefined();
    expect(entry?.detail).toContain("does not import it from @themvora/core");
  });

  it("does not treat a side-effect core import as a theme-API binding", async () => {
    const source = [
      'import "@themvora/core";',
      "function getPresetThemes() { return []; }",
      "export const presets = getPresetThemes();",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/local.ts": source }));
    const entry = result.registries[0];

    expect(entry?.themes).toBeUndefined();
    expect(entry?.detail).toContain("not imported from a verified Themvora package");
  });

  it("does not read a lookalike when core is imported for a different API", async () => {
    const source = [
      'import { createThemeRuntime } from "@themvora/core";',
      "function getPresetThemes() { return []; }",
      "export const presets = getPresetThemes();",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/local.ts": source }));
    const entry = result.registries[0];

    expect(entry?.themes).toBeUndefined();
    expect(entry?.detail).toContain("not imported from a verified Themvora package");
  });

  it("does not read a catalog name imported from a package that does not export it", async () => {
    const source = [
      'import { getPresetThemes } from "@themvora/web";',
      "export const presets = getPresetThemes();",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/local.ts": source }));
    const entry = result.registries[0];

    expect(entry?.themes).toBeUndefined();
    expect(entry?.detail).toContain("does not import it from @themvora/core");
  });

  it("resolves theme APIs through one project re-export", async () => {
    const source = [
      'import { defineTheme, getPresetThemes } from "./api";',
      `export const ocean = defineTheme(${LITERAL});`,
      "export const presets = getPresetThemes();",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({
        "src/api.ts": 'export { defineTheme, getPresetThemes } from "@themvora/core";',
        "src/theme.ts": source,
      }),
    );

    const entry = result.registries.find((registry) => registry.path === "src/theme.ts");
    expect(entry?.themes).toHaveLength(19);
    expect(entry?.themeSources?.find((theme) => theme.name === OCEAN.light.name)?.origin).toBe(
      "definition",
    );
  });

  it("records the binding, origin and location a theme came from", async () => {
    const source = [
      'import { defineTheme } from "@themvora/core";',
      `export const oceanLight = defineTheme(${LITERAL});`,
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/theme.ts": source }));
    const entry = result.registries[0]!;

    expect(entry.themeSources?.[0]).toMatchObject({
      name: OCEAN.light.name,
      mode: "light",
      binding: "oceanLight",
      origin: "definition",
      location: { line: 2 },
    });
  });
});

describe("framework source regions", () => {
  const OCEAN = generateTheme({ seed: "#0ea5e9", family: "ocean" });
  const LIGHT = JSON.stringify(OCEAN.light, null, 2);
  const DARK = JSON.stringify(OCEAN.dark, null, 2);

  it("analyzes a Vue <script setup> and its template consumer", async () => {
    const source = [
      '<script setup lang="ts">',
      'import { defineTheme } from "@themvora/core";',
      'import { ThemeProvider } from "@themvora/vue";',
      `export const oceanLight = defineTheme(${LIGHT});`,
      `export const oceanDark = defineTheme(${DARK});`,
      "const themes = [oceanLight, oceanDark];",
      "</script>",
      "<template>",
      '  <ThemeProvider :themes="themes" />',
      "</template>",
    ].join("\n");

    const providerLine = source.split("\n").findIndex((line) => line.includes("<ThemeProvider")) + 1;
    const result = await inspectProject("/app", readerOf({ "src/MyTheme.vue": source }));
    const entry = result.registries[0]!;

    expect(result.status).toBe("supported");
    expect(entry.path).toBe("src/MyTheme.vue");
    expect(entry.region).toBe("<script setup>");
    expect(entry.themes).toHaveLength(2);
    expect(entry.themeSources?.[0]).toMatchObject({
      binding: "oceanLight",
      origin: "definition",
      region: "<script setup>",
      location: { line: 4 },
    });

    const usage = result.providers[0]!;
    expect(usage).toMatchObject({
      path: "src/MyTheme.vue",
      integration: "vue",
      api: "ThemeProvider",
      input: "static",
      names: ["themes"],
      region: "template",
      evidence: "registered",
      location: { line: providerLine },
    });
    expect(result.relationships.every((theme) => theme.evidence === "registered")).toBe(true);
    expect(result.relationships.every((theme) => theme.usedBy.includes("src/MyTheme.vue"))).toBe(
      true,
    );
  });

  it("does not read a Vue template as JavaScript", async () => {
    const source = [
      '<script setup lang="ts">',
      'import { defineTheme } from "@themvora/core";',
      "</script>",
      "<template>",
      '  <p>defineTheme({ name: "ghost" })</p>',
      "</template>",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/App.vue": source }));

    expect(result.registries).toEqual([]);
    expect(result.providers).toEqual([]);
  });

  it("reports a dynamic generateTheme argument with its reason", async () => {
    const source = [
      'import { generateTheme } from "@themvora/core";',
      "export const pair = generateTheme(config);",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/theme.ts": source }));
    const entry = result.registries[0];

    expect(entry?.status).toBe("unsupported");
    expect(entry?.problems?.[0]).toContain("not a static options object");
  });

  it("analyzes a Svelte instance script and markup", async () => {
    const source = [
      '<script lang="ts">',
      'import { defineTheme } from "@themvora/core";',
      'import { ThemeProvider } from "@themvora/svelte";',
      `export const oceanLight = defineTheme(${LIGHT});`,
      "const themes = [oceanLight];",
      "</script>",
      "",
      "<ThemeProvider themes={themes} />",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/App.svelte": source }));
    const entry = result.registries[0]!;

    expect(entry.region).toBe("<script>");
    expect(entry.themeSources?.[0]).toMatchObject({
      binding: "oceanLight",
      region: "<script>",
      location: { line: 4 },
    });
    expect(result.providers[0]).toMatchObject({
      integration: "svelte",
      names: ["themes"],
      region: "markup",
      evidence: "registered",
    });
  });

  it("keeps a Svelte module-script theme defined but out of template scope", async () => {
    const source = [
      '<script context="module" lang="ts">',
      'import { defineTheme } from "@themvora/core";',
      `export const oceanLight = defineTheme(${LIGHT});`,
      "export const themes = [oceanLight];",
      "</script>",
      "<ThemeProvider themes={themes} />",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/App.svelte": source }));

    expect(result.registries[0]?.region).toBe("<script module>");
    expect(result.registries[0]?.themes).toHaveLength(1);
    expect(result.providers).toEqual([]);
  });

  it("analyzes Astro frontmatter and an inline provider config", async () => {
    const source = [
      "---",
      'import { defineTheme } from "@themvora/core";',
      'import Provider from "@themvora/astro/provider.astro";',
      `export const oceanLight = defineTheme(${LIGHT});`,
      "---",
      "",
      "<Provider config={{ themes: [oceanLight] }} />",
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "src/layout.astro": source }));
    const entry = result.registries[0]!;

    expect(entry.region).toBe("frontmatter");
    expect(entry.themes).toHaveLength(1);
    expect(result.providers[0]).toMatchObject({
      integration: "astro",
      names: ["oceanLight"],
      region: "template",
      evidence: "registered",
    });
  });

  it("keeps an Astro build-config provider partial", async () => {
    const source = [
      "---",
      'import Provider from "@themvora/astro/provider.astro";',
      'import themeConfig from "./theme.config";',
      "---",
      "<Provider config={themeConfig} />",
    ].join("\n");

    const result = await inspectProject(
      "/app",
      readerOf({
        "src/layout.astro": source,
        "src/theme.config.ts": "export default {};",
      }),
    );

    expect(result.providers[0]).toMatchObject({
      integration: "astro",
      input: "static",
      evidence: "partially-resolved",
    });
    expect(result.providers[0]?.reason).toContain("build-time theme config");
  });

  it("recognizes catalog identifiers in a Web Components attribute", async () => {
    const html = [
      '<themvora-provider themes="light dark oat-light"></themvora-provider>',
    ].join("\n");

    const result = await inspectProject("/app", readerOf({ "index.html": html }));

    expect(result.providers[0]).toMatchObject({
      integration: "web",
      api: "themvora-provider",
      input: "static",
      names: ["light", "dark", "oat-light"],
      evidence: "registered",
      region: "element",
    });
  });

  it("keeps a project theme named in HTML partially resolved", async () => {
    const theme = [
      'import { defineTheme } from "@themvora/core";',
      `export const oceanLight = defineTheme(${LIGHT});`,
    ].join("\n");
    const html = '<themvora-provider themes="ocean-light"></themvora-provider>';

    const result = await inspectProject(
      "/app",
      readerOf({ "src/theme.ts": theme, "index.html": html }),
    );

    expect(result.providers[0]).toMatchObject({
      integration: "web",
      names: ["ocean-light"],
      evidence: "partially-resolved",
    });
    expect(result.providers[0]?.reason).toContain("runtime catalog");
    expect(result.relationships[0]?.usedBy).toEqual(["index.html"]);
    expect(result.relationships[0]?.evidence).toBe("partially-resolved");
  });

  it("associates a catalog-origin project theme named in HTML", async () => {
    const source = [
      'import { getPresetThemes } from "@themvora/core";',
      "export const presets = getPresetThemes();",
    ].join("\n");
    const html = '<themvora-provider themes="oat-light"></themvora-provider>';

    const result = await inspectProject(
      "/app",
      readerOf({ "src/presets.ts": source, "index.html": html }),
    );

    expect(result.providers[0]).toMatchObject({
      integration: "web",
      input: "static",
      names: ["oat-light"],
      evidence: "registered",
    });

    const relationship = result.relationships.find((entry) => entry.name === "oat-light");
    expect(relationship?.usedBy).toEqual(["index.html"]);
    expect(relationship?.evidence).toBe("registered");
  });

  it("reports an HTML identifier that names nothing known", async () => {
    const html = '<themvora-provider themes="ghost-theme"></themvora-provider>';
    const result = await inspectProject("/app", readerOf({ "index.html": html }));

    expect(result.providers[0]).toMatchObject({
      input: "static",
      evidence: "unresolved",
      unresolved: ["ghost-theme"],
    });
  });

  it("keeps an HTML provider with no themes registration-only", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({ "index.html": "<themvora-provider></themvora-provider>" }),
    );

    expect(result.providers[0]).toMatchObject({
      input: "absent",
      names: [],
      evidence: "registration-only",
    });
  });

  it("does not treat an invented HTML attribute as theme supply", async () => {
    const result = await inspectProject(
      "/app",
      readerOf({ "index.html": '<themvora-provider theme="brand"></themvora-provider>' }),
    );

    expect(result.providers[0]).toMatchObject({
      input: "absent",
      names: [],
      evidence: "registration-only",
    });
  });

  it("reads the Web Components custom element in JSX", async () => {
    const source =
      'export const App = () => <themvora-provider themes="light dark" />;';
    const result = await inspectProject("/app", readerOf({ "src/App.tsx": source }));

    expect(result.providers[0]).toMatchObject({
      integration: "web",
      names: ["light", "dark"],
      evidence: "registered",
      region: "JSX",
    });
  });

  it("keeps a dynamic JSX Web Components value dynamic", async () => {
    const source =
      "export const App = () => <themvora-provider themes={currentTheme} />;";
    const result = await inspectProject("/app", readerOf({ "src/App.tsx": source }));

    expect(result.providers[0]).toMatchObject({
      integration: "web",
      input: "dynamic",
      evidence: "dynamic-unverified",
    });
  });
});

describe("CommonJS bindings", () => {
  /** A registry written as CommonJS, as the package's `require` condition allows. */
  function entryFor(source: string) {
    return inspectProject("/app", readerOf({ "theme.cjs": source })).then((result) =>
      result.registries.find((registry) => registry.path === "theme.cjs"),
    );
  }

  it("reads a destructured require", async () => {
    const source = [
      'const { generateTheme } = require("@themvora/core");',
      'module.exports = generateTheme({ seed: "#0ea5e9", family: "sky" });',
    ].join("\n");

    const entry = await entryFor(source);
    expect(entry?.themes?.map((theme) => theme.meta?.mode)).toEqual(["light", "dark"]);
    expect(entry?.themes?.every((theme) => theme.meta?.family === "sky")).toBe(true);
  });

  it("reads a renamed destructured require", async () => {
    const VALID = generateTheme({ seed: "#0ea5e9" }).light;
    const definition = JSON.stringify({ name: "ocean-light", meta: { family: "ocean", mode: "light" }, tokens: VALID.tokens }, null, 2);
    const source = [
      'const { defineTheme: make } = require("@themvora/core");',
      `module.exports = make(${definition});`,
    ].join("\n");

    const entry = await entryFor(source);
    expect(entry?.themes?.map((theme) => theme.name)).toEqual(["ocean-light"]);
  });

  it("reads a namespace require", async () => {
    const source = [
      'const kit = require("@themvora/core");',
      'module.exports = kit.generateTheme({ seed: "#0ea5e9", family: "sky" });',
    ].join("\n");

    const entry = await entryFor(source);
    expect(entry?.themes?.map((theme) => theme.meta?.mode)).toEqual(["light", "dark"]);
  });

  it("rejects a local object with the same method name", async () => {
    const source = [
      "const kit = { generateTheme: (options) => options };",
      'module.exports = kit.generateTheme({ seed: "#0ea5e9" });',
    ].join("\n");

    const entry = await entryFor(source);
    expect(entry?.themes ?? []).toEqual([]);
  });

  it("reports a require with a non-literal specifier", async () => {
    const source = [
      "const name = '@themvora/core';",
      "const { generateTheme } = require(name);",
      'module.exports = generateTheme({ seed: "#0ea5e9" });',
    ].join("\n");

    const entry = await entryFor(source);
    expect(entry?.status).toBe("unsupported");
    expect(entry?.detail).toContain("non-literal specifier");
  });

  it("agrees with the equivalent ESM source", async () => {
    const esm = [
      'import { generateTheme } from "@themvora/core";',
      'export const pair = generateTheme({ seed: "#0ea5e9", family: "sky" });',
    ].join("\n");
    const cjs = [
      'const { generateTheme } = require("@themvora/core");',
      'const pair = generateTheme({ seed: "#0ea5e9", family: "sky" });',
    ].join("\n");

    const fromEsm = await inspectProject("/app", readerOf({ "a.ts": esm }));
    const fromCjs = await inspectProject("/app", readerOf({ "a.cjs": cjs }));

    const names = (result: typeof fromEsm) =>
      (result.registries.find((registry) => registry.themes !== undefined)?.themes ?? []).map(
        (theme) => `${theme.name}:${theme.meta?.family}:${theme.meta?.mode}`,
      );

    expect(names(fromCjs)).toEqual(names(fromEsm));
  });
});
