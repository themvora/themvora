/**
 * Studio evidence mapping.
 *
 * The webview only renders what these builders produce, so these tests cover
 * the facts a developer sees: which file and symbol a theme came from, what
 * evidence exists, which consumer proves it, and what the project count means.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { generateTheme, getPresetThemes } from "@themvora/core";
import { describe, expect, it } from "vitest";

import { inspectProject } from "../src/domain/inspectProject";
import type { ProjectInspection, ProjectReader } from "../src/domain/registry";
import {
  buildStudioConsumers,
  buildStudioSources,
  buildStudioThemes,
  isInspectionPath,
  themeCounts,
} from "../src/adapters/studioModel";

/** An in-memory project reader. */
function readerOf(files: Record<string, string>): ProjectReader {
  return {
    async read(relativePath: string): Promise<string | null> {
      return files[relativePath] ?? null;
    },
    async walk(): Promise<readonly string[]> {
      return Object.keys(files);
    },
    async list(relativeDir: string): Promise<readonly string[]> {
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

const OCEAN = generateTheme({ seed: "#0ea5e9", family: "ocean" });
const literal = (theme: typeof OCEAN.light): string => JSON.stringify(theme, null, 2);

const THEME_MODULE = [
  'import { defineTheme } from "@themvora/core";',
  `export const oceanLight = defineTheme(${literal(OCEAN.light)});`,
  `export const oceanDark = defineTheme(${literal(OCEAN.dark)});`,
].join("\n");

const MAIN = [
  'import { ThemeProvider } from "@themvora/react";',
  'import { oceanLight, oceanDark } from "./theme";',
  "export const App = () => <ThemeProvider themes={[oceanLight, oceanDark]} />;",
].join("\n");

/** A project with two definitions and one verified React consumer. */
async function project(): Promise<ProjectInspection> {
  return inspectProject(
    "/app",
    readerOf({
      "package.json": JSON.stringify({ dependencies: { "@themvora/core": "^1.0.0" } }),
      "src/theme.ts": THEME_MODULE,
      "src/main.tsx": MAIN,
    }),
  );
}

describe("buildStudioThemes", () => {
  it("carries the binding, origin, location and evidence", async () => {
    const themes = buildStudioThemes(await project());
    const light = themes.find((theme) => theme.name === OCEAN.light.name);

    expect(light).toMatchObject({
      source: "src/theme.ts",
      mode: "light",
      family: "ocean",
      valid: true,
      evidence: "registered",
      origin: "definition",
      binding: "oceanLight",
      usedBy: ["src/main.tsx"],
    });
    expect(light?.location?.line).toBe(2);
  });

  it("carries a generated theme's static inputs", async () => {
    const inspection = await inspectProject(
      "/app",
      readerOf({
        "src/theme.ts": [
          'import { generateTheme } from "@themvora/core";',
          'export const pair = generateTheme({ seed: "#0ea5e9", family: "ocean", style: "vibrant", withCode: true });',
        ].join("\n"),
      }),
    );
    const expected = { seed: "#0ea5e9", family: "ocean", style: "vibrant", withCode: true };

    expect(buildStudioThemes(inspection)[0]?.generateOptions).toEqual(expected);
    expect(buildStudioSources(inspection)[0]?.definitions[0]?.generateOptions).toEqual(expected);
  });

  it("carries a card swatch strip made from the theme's own colours", async () => {
    const themes = buildStudioThemes(await project());
    const light = themes.find((theme) => theme.name === OCEAN.light.name);

    expect(light?.swatches).toHaveLength(4);
    expect(light?.swatches[0]).toBe(OCEAN.light.tokens?.colors?.background);
    expect(light?.swatches.every((color) => color.startsWith("#"))).toBe(true);
  });

  it("does not upgrade a defined but unconsumed theme", async () => {
    const inspection = await inspectProject(
      "/app",
      readerOf({
        "package.json": JSON.stringify({ dependencies: { "@themvora/core": "^1.0.0" } }),
        "src/theme.ts": THEME_MODULE,
      }),
    );
    const themes = buildStudioThemes(inspection);

    expect(themes.every((theme) => theme.evidence === "defined-unregistered")).toBe(true);
    expect(themes.every((theme) => theme.usedBy.length === 0)).toBe(true);
  });

  it("deduplicates a family found in two files but keeps both sources", async () => {
    const inspection = await inspectProject(
      "/app",
      readerOf({
        "src/a.ts": THEME_MODULE,
        "src/b.ts": THEME_MODULE,
      }),
    );
    const themes = buildStudioThemes(inspection);
    const sources = buildStudioSources(inspection);

    expect(themes).toHaveLength(2);
    expect(new Set(themes.map((theme) => theme.source))).toEqual(new Set(["src/a.ts"]));
    expect(sources.map((source) => source.path)).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("carries framework source regions into the Studio rows", async () => {
    const source = [
      '<script setup lang="ts">',
      'import { defineTheme } from "@themvora/core";',
      'import { ThemeProvider } from "@themvora/vue";',
      `export const oceanLight = defineTheme(${literal(OCEAN.light)});`,
      "const themes = [oceanLight];",
      "</script>",
      "<template>",
      '  <ThemeProvider :themes="themes" />',
      "</template>",
    ].join("\n");
    const inspection = await inspectProject("/app", readerOf({ "src/MyTheme.vue": source }));

    const themes = buildStudioThemes(inspection);
    const sources = buildStudioSources(inspection);
    const consumers = buildStudioConsumers(inspection);

    expect(themes[0]?.region).toBe("<script setup>");
    expect(sources[0]?.region).toBe("<script setup>");
    expect(sources[0]?.definitions[0]?.region).toBe("<script setup>");
    expect(consumers[0]?.region).toBe("template");
  });

  it("recomputes rather than keeping a stale relationship", async () => {
    const withConsumer = buildStudioThemes(await project());
    const withoutConsumer = buildStudioThemes(
      await inspectProject("/app", readerOf({ "src/theme.ts": THEME_MODULE })),
    );

    expect(withConsumer.every((theme) => theme.evidence === "registered")).toBe(true);
    expect(withoutConsumer.every((theme) => theme.evidence === "defined-unregistered")).toBe(true);
  });
});

describe("buildStudioSources", () => {
  it("reports per-definition evidence, binding and usedBy", async () => {
    const sources = buildStudioSources(await project());
    const source = sources.find((entry) => entry.path === "src/theme.ts");
    const light = source?.definitions.find((definition) => definition.name === OCEAN.light.name);

    expect(source).toMatchObject({ kind: "theme-module", status: "supported", themes: 2, usedBy: 1 });
    expect(light).toMatchObject({
      binding: "oceanLight",
      origin: "definition",
      valid: true,
      evidence: "registered",
      usedBy: ["src/main.tsx"],
    });
  });

  it("keeps a malformed source's declaration names even though it has no themes", async () => {
    const inspection = await inspectProject(
      "/app",
      readerOf({
        "src/broken.ts": [
          'import { defineTheme } from "@themvora/core";',
          'export const broken = defineTheme({ name: "broken", meta: { mode: "light" }, tokens: { colors: {} } });',
        ].join("\n"),
      }),
    );
    const source = buildStudioSources(inspection).find((entry) => entry.path === "src/broken.ts");

    expect(source?.status).toBe("malformed");
    expect(source?.themes).toBe(0);
    expect(source?.definitions[0]).toMatchObject({ name: "broken", binding: "broken", valid: false });
  });

  it("does not invent a location for a generated registry theme", async () => {
    const registry = readFileSync(
      fileURLToPath(new URL("../../core/test/fixtures/registry/generated-themes.txt", import.meta.url)),
      "utf8",
    );
    const inspection = await inspectProject(
      "/app",
      readerOf({ "src/themes/themes.ts": registry }),
    );
    const source = buildStudioSources(inspection)[0];

    expect(source?.definitions.length).toBeGreaterThan(0);
    expect(source?.definitions.every((definition) => definition.location === undefined)).toBe(true);
    expect(buildStudioThemes(inspection).every((theme) => theme.location === undefined)).toBe(true);
  });
});

describe("themeCounts", () => {
  it("does not inflate the project count with catalog presets", async () => {
    const inspection = await inspectProject(
      "/app",
      readerOf({
        "src/presets.ts": [
          'import { getPresetThemes } from "@themvora/core";',
          "export const presets = getPresetThemes();",
        ].join("\n"),
      }),
    );
    const themes = buildStudioThemes(inspection);

    expect(themes).toHaveLength(18);
    expect(themeCounts(themes)).toEqual({ project: 0, projectFamilies: 0, catalog: 18, catalogFamilies: 9 });
  });

  it("separates a generated registry's custom themes from its presets", async () => {
    const registry = readFileSync(
      fileURLToPath(new URL("../../core/test/fixtures/registry/generated-themes.txt", import.meta.url)),
      "utf8",
    );
    const inspection = await inspectProject(
      "/app",
      readerOf({ "src/themes/themes.ts": registry }),
    );

    expect(themeCounts(buildStudioThemes(inspection))).toEqual({ project: 4, projectFamilies: 2, catalog: 6, catalogFamilies: 3 });
  });

  it("counts a curated catalog theme without a preview list as catalog-source", async () => {
    const themes = buildStudioThemes({
      root: "/app",
      status: "supported",
      packages: [],
      registries: [
        {
          kind: "theme-module",
          path: "src/presets.ts",
          status: "supported",
          detail: "18 themes",
          themes: getPresetThemes(),
          themeSources: getPresetThemes().map((theme) => ({
            name: theme.name,
            ...(theme.meta?.mode === undefined ? {} : { mode: theme.meta.mode }),
            origin: "catalog" as const,
          })),
        },
      ],
      notes: [],
      providers: [],
      relationships: [],
    });

    expect(themeCounts(themes)).toEqual({ project: 0, projectFamilies: 0, catalog: 18, catalogFamilies: 9 });
  });
});

describe("buildStudioConsumers", () => {
  it("states what each verified consumer proves", () => {
    const inspection: ProjectInspection = {
      root: "/app",
      status: "supported",
      packages: [],
      registries: [],
      notes: [],
      relationships: [],
      providers: [
        {
          path: "src/main.tsx",
          names: ["oceanLight"],
          integration: "react",
          api: "ThemeProvider",
          input: "static",
          evidence: "registered",
          resolution: "resolved",
        },
        {
          path: "src/partial.tsx",
          names: ["oceanLight", "ghost"],
          integration: "react",
          api: "ThemeProvider",
          input: "static",
          evidence: "partially-resolved",
          unresolved: ["ghost"],
        },
        {
          path: "src/dynamic.tsx",
          names: [],
          integration: "react",
          api: "ThemeProvider",
          input: "dynamic",
          evidence: "dynamic-unverified",
        },
        {
          path: "src/web.ts",
          names: [],
          integration: "web",
          api: "defineCustomElements",
          input: "absent",
          evidence: "registration-only",
          registrationOnly: true,
        },
        {
          path: "src/vanilla.ts",
          names: [],
          integration: "vanilla",
          api: "new Themvora",
          input: "absent",
          evidence: "unresolved",
        },
      ],
    };

    const consumers = buildStudioConsumers(inspection);

    expect(consumers.map((entry) => entry.headline)).toEqual([
      "React ThemeProvider detected; theme collection resolved.",
      "React ThemeProvider detected; theme collection partially resolved.",
      "React ThemeProvider detected; supplied themes could not be determined.",
      "Web Components registration detected; theme configuration not established.",
      "Vanilla JavaScript new Themvora detected; no theme input.",
    ]);
    expect(consumers[0]?.integrationLabel).toBe("React");
    expect(consumers[1]?.unresolved).toEqual(["ghost"]);
  });
});

describe("isInspectionPath", () => {
  it("accepts known inspection paths and refuses traversal", async () => {
    const inspection = await project();

    expect(isInspectionPath(inspection, "src/theme.ts")).toBe(true);
    expect(isInspectionPath(inspection, "src/main.tsx")).toBe(true);
    expect(isInspectionPath(inspection, "../secret.ts")).toBe(false);
    expect(isInspectionPath(inspection, "/etc/passwd")).toBe(false);
    expect(isInspectionPath(inspection, "src\\theme.ts")).toBe(false);
    expect(isInspectionPath(inspection, "src/unknown.ts")).toBe(false);
  });
});
