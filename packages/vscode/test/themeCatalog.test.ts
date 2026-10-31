/**
 * The one list of selectable themes.
 *
 * The commands used to each find their own theme — three of them through a JSON
 * file dialog, one through the active editor, one through the catalog. These
 * assert the shared list that replaced them: what it contains, what it preserves
 * about each theme, and how it chooses when there is more than one candidate.
 */
import { generateTheme } from "@themvora/core";
import { describe, expect, it } from "vitest";

import type { ProjectInspection, RegistryEntry } from "../src/domain/registry";
import { createThemvoraClient } from "../src/services/coreClient";
import { detectCapabilities } from "../src/index";
import {
  collectThemeEntries,
  pickThemeEntry,
  resolveThemeEntry,
  themeSetFor,
  type CatalogRoot,
} from "../src/services/themeCatalog";
import { __reset, __state } from "./stubs/vscode";

const PAIR = generateTheme({ seed: "#4f46e5" });
const OTHER = generateTheme({ seed: "#10b981" });

/** A registry entry holding the given themes. */
function registry(themes: readonly unknown[], path = "src/theme/theme.config.ts"): RegistryEntry {
  return {
    kind: "theme-module",
    path,
    status: "supported",
    detail: path,
    themes: themes as never,
    themeSources: themes.map((theme, index) => {
      const mode = (theme as { meta?: { mode?: string } }).meta?.mode;
      return {
        name: (theme as { name: string }).name,
        ...(mode === undefined ? {} : { mode }),
        location: { line: 10 + index, column: 1 },
      };
    }),
  };
}

/** An inspection over the given registries. */
function inspection(overrides: Partial<ProjectInspection> = {}): ProjectInspection {
  return {
    root: "C:/app",
    status: "supported",
    packages: ["@themvora/core"],
    registries: [],
    notes: [],
    providers: [],
    relationships: [],
    ...overrides,
  };
}

/** A workspace root. */
function root(overrides: Partial<ProjectInspection> = {}): CatalogRoot {
  return { name: "app", inspection: inspection(overrides) };
}

/** The client the catalog reads its presets from. */
function client() {
  return createThemvoraClient();
}

describe("project themes", () => {
  it("becomes one entry per variant, with its file and position", async () => {
    const entries = await collectThemeEntries({
      client: client(),
      roots: () => [root({ registries: [registry([PAIR.light, PAIR.dark])] })],
    });

    const project = entries.filter((entry) => entry.origin === "project");
    expect(project.map((entry) => entry.label)).toEqual(["generated-light", "generated-dark"]);
    expect(project[0]?.source).toBe("src/theme/theme.config.ts");
    expect(project[0]?.location).toEqual({ line: 10, column: 1 });
    expect(project[0]?.family).toBe("generated");
    expect(project[0]?.modes).toEqual(["light", "dark"]);
  });

  it("carries the evidence and consumers the graph recorded", async () => {
    const entries = await collectThemeEntries({
      client: client(),
      roots: () => [
        root({
          registries: [registry([PAIR.light, PAIR.dark])],
          relationships: [
            {
              name: PAIR.light.name,
              definedIn: "src/theme/theme.config.ts",
              mode: "light",
              family: "generated",
              usedBy: ["src/main.tsx"],
              evidence: "registered",
            },
          ],
        }),
      ],
    });

    const light = entries.find((entry) => entry.label === "generated-light");
    expect(light?.evidence).toBe("registered");
    expect(light?.consumers).toEqual(["src/main.tsx"]);

    // A theme with no relationship is not assumed to be registered.
    const dark = entries.find((entry) => entry.label === "generated-dark");
    expect(dark?.evidence).toBeUndefined();
    expect(dark?.consumers).toEqual([]);
  });

  it("keeps a family's variants together as one set", async () => {
    const entries = await collectThemeEntries({
      client: client(),
      roots: () => [root({ registries: [registry([PAIR.light, PAIR.dark])] })],
    });

    const light = entries.find((entry) => entry.label === "generated-light");
    expect(light).toBeDefined();
    // `extends` resolution needs the sibling, so the set travels with the theme.
    expect(themeSetFor(light!).map((theme) => theme.name)).toEqual([
      "generated-light",
      "generated-dark",
    ]);
  });

  it("ignores a registry the reader could not read", async () => {
    const entries = await collectThemeEntries({
      client: client(),
      roots: () => [
        root({
          registries: [
            { kind: "theme-module", path: "broken.ts", status: "unsupported", detail: "dynamic" },
          ],
        }),
      ],
    });

    expect(entries.filter((entry) => entry.origin === "project")).toEqual([]);
  });
});

describe("multiple workspace folders", () => {
  /** A root named `folder` whose registry sits at the usual relative path. */
  function folder(name: string, themes: readonly unknown[]): CatalogRoot {
    return {
      name,
      inspection: inspection({ root: `C:/${name}`, registries: [registry(themes)] }),
    };
  }

  it("keeps each folder's themes, even when the paths and names match", async () => {
    // Two folders can each hold a `src/theme/theme.config.ts` defining
    // `generated-light`. Identity that stops at the relative path would drop the
    // second folder's theme as a duplicate, making it unreachable from every
    // command.
    const entries = await collectThemeEntries({
      client: client(),
      roots: () => [folder("app", [PAIR.light, PAIR.dark]), folder("design-system", [OTHER.light, OTHER.dark])],
    });

    const project = entries.filter((entry) => entry.origin === "project");
    expect(project).toHaveLength(4);
    expect(project.map((entry) => entry.root)).toEqual([
      "app",
      "app",
      "design-system",
      "design-system",
    ]);
    // Distinct identities, so a picker can offer both rather than one.
    expect(new Set(project.map((entry) => entry.id)).size).toBe(4);
  });
});

describe("catalog presets", () => {
  it("are entries even when the workspace has no Themvora", async () => {
    const entries = await collectThemeEntries({ client: client(), roots: () => [] });
    const presets = entries.filter((entry) => entry.origin === "preset");

    expect(presets.length).toBeGreaterThan(0);
    expect(presets[0]?.originLabel).toBe("Catalog preset");
    // The display name is the preset's; the theme name alone would read as a
    // duplicate of another preset's variant.
    expect(presets[0]?.label).toContain("·");
    expect(presets[0]?.set.length).toBeGreaterThan(0);
  });
});

describe("the open document", () => {
  it("comes before the catalog, so the user's own file wins", async () => {
    const entries = await collectThemeEntries({
      client: client(),
      roots: () => [],
      activeDocument: () => ({ path: "C:/tmp/theme.json", themes: [OTHER.light] }),
    });

    expect(entries[0]?.origin).toBe("document");
    expect(entries[0]?.label).toBe(OTHER.light.name);
  });
});

describe("choosing a theme", () => {
  it("takes the only theme in the open document without asking", async () => {
    __reset();
    const resolution = await resolveThemeEntry(
      {
        client: client(),
        roots: () => [],
        activeDocument: () => ({ path: "C:/tmp/theme.json", themes: [OTHER.light] }),
      },
      { title: "Pick" },
    );

    expect(resolution.ok).toBe(true);
    if (resolution.ok) expect(resolution.entry.origin).toBe("document");
    // No picker was shown: there was nothing to choose between.
    expect(__state.quickPickItems).toEqual([]);
  });

  it("asks when the document holds several themes", async () => {
    __reset();
    __state.quickPickSelection = OTHER.dark.name;

    const resolution = await resolveThemeEntry(
      {
        client: client(),
        roots: () => [],
        activeDocument: () => ({ path: "C:/tmp/theme.json", themes: [OTHER.light, OTHER.dark] }),
      },
      { title: "Pick" },
    );

    // The first of several is not guessed at.
    expect(__state.quickPickItems).toHaveLength(2);
    if (resolution.ok) expect(resolution.entry.label).toBe(OTHER.dark.name);
  });

  it("offers the catalog when there is no document", async () => {
    __reset();
    __state.quickPickSelection = undefined;

    const resolution = await resolveThemeEntry({ client: client(), roots: () => [] }, { title: "Pick" });

    expect(__state.quickPickItems.length).toBeGreaterThan(0);
    expect(resolution.ok).toBe(false);
    if (!resolution.ok) expect(resolution.failure.kind).toBe("cancelled");
  });

  it("reports an empty catalog as nothing to choose rather than a cancel", async () => {
    __reset();
    // A core without `getPresetCatalog`: the catalog cannot be read at all.
    const starved = createThemvoraClient({ capabilities: detectCapabilities({}) });

    // A folder is open, so the next step is "find a theme", not "open a folder".
    const resolution = await resolveThemeEntry(
      { client: starved, roots: () => [root()] },
      { title: "Pick" },
    );

    expect(resolution.ok).toBe(false);
    if (!resolution.ok) expect(resolution.failure.kind).toBe("no-themes");
  });
});

describe("picking", () => {
  it("shows the origin, family and mode, and the file behind it", async () => {
    __reset();
    const entries = await collectThemeEntries({
      client: client(),
      roots: () => [root({ registries: [registry([PAIR.light])] })],
    });

    await pickThemeEntry(entries, "Pick");

    const project = __state.quickPickItems.find((item) => item.label === "generated-light");
    expect(project?.description).toContain("Project theme");
    expect(project?.detail).toBe("src/theme/theme.config.ts");
  });
});
