/**
 * `Themvora: Browse Presets` end-to-end.
 *
 * The catalog is core's, so these assert the command's own job: presenting it in
 * a stable order, describing each recipe, and never implying that a selection
 * installed anything.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExtensionContext } from "vscode";

import manifest from "../package.json";
import {
  COMMAND_BROWSE_PRESETS,
  runBrowsePresets,
  type BrowsePresetsDeps,
} from "../src/commands/browsePresets";
import { COMMAND_REFRESH } from "../src/commands/refresh";
import { activate, createThemvoraClient, detectCapabilities } from "../src/index";
import type { CatalogRoot } from "../src/services/themeCatalog";
import { __invoke, __reset, __state, Uri } from "./stubs/vscode";
import { createTempProject, type TempProject } from "./helpers/tempProject";

/** The fake extension context. */
function context(): ExtensionContext {
  return {
    subscriptions: [],
    // A real context always has one; the preview tab icon is built from it.
    extensionUri: Uri.file("/extension"),
    extension: { packageJSON: manifest },
    // The Studio reads its persisted appearance from here when it opens, and
    // `Open in Studio` genuinely opens it.
    globalState: { get: () => undefined, update: async () => undefined, keys: () => [] },
  } as unknown as ExtensionContext;
}

let project: TempProject;

beforeEach(async () => {
  __reset();
  project = createTempProject();
  activate(context());
  await __invoke(COMMAND_REFRESH);
});

afterEach(() => {
  project.cleanup();
});

describe("registration", () => {
  it("is contributed and registered", () => {
    expect(manifest.contributes.commands.map((entry) => entry.command)).toContain(
      COMMAND_BROWSE_PRESETS,
    );
    expect(__state.commands.has(COMMAND_BROWSE_PRESETS)).toBe(true);
  });

  it("is titled for the palette", () => {
    const entry = manifest.contributes.commands.find(
      (candidate) => candidate.command === COMMAND_BROWSE_PRESETS,
    );
    expect(entry?.title).toBe("Browse Presets");
  });
});

describe("themvora.browsePresets", () => {
  it("offers the whole catalog", async () => {
    await __invoke(COMMAND_BROWSE_PRESETS);

    // 9 curated presets and 5 brand recipes, straight from core.
    expect(__state.quickPickItems).toHaveLength(14);
    expect(__state.quickPickItems.filter((item) => item.description?.startsWith("preset ·"))).toHaveLength(9);
    expect(__state.quickPickItems.filter((item) => item.description?.startsWith("brand ·"))).toHaveLength(5);
  });

  it("lists presets before brands", async () => {
    await __invoke(COMMAND_BROWSE_PRESETS);

    const kinds = __state.quickPickItems.map((item) => item.description?.split(" ·")[0]);
    const lastPreset = kinds.lastIndexOf("preset");
    const firstBrand = kinds.indexOf("brand");

    expect(lastPreset).toBeGreaterThanOrEqual(0);
    expect(firstBrand).toBeGreaterThan(lastPreset);
  });

  it("is stable across invocations", async () => {
    await __invoke(COMMAND_BROWSE_PRESETS);
    const first = __state.quickPickItems.map((item) => item.label);

    __reset();
    activate(context());
    await __invoke(COMMAND_BROWSE_PRESETS);

    expect(__state.quickPickItems.map((item) => item.label)).toEqual(first);
  });

  it("describes each recipe with its style and character", async () => {
    await __invoke(COMMAND_BROWSE_PRESETS);

    for (const item of __state.quickPickItems) {
      expect(item.description).toMatch(/^(preset|brand) · /);
      expect(item.detail?.length).toBeGreaterThan(0);
    }
  });

  it("offers an action instead of a dead end", async () => {
    __state.quickPickQueue = ["Oat", "Preview"];

    await __invoke(COMMAND_BROWSE_PRESETS);

    // The second picker is the action menu for the chosen preset.
    expect(__state.quickPickItems.map((item) => item.label)).toEqual([
      "Preview",
      "Open in Studio",
      "Copy CSS variables",
      "Validate",
    ]);
  });

  it("works in a folder that uses no Themvora", async () => {
    // The catalog ships with the extension. It is not read from the project, so
    // an unrelated folder must not take it away.
    __state.folders = [project.root];
    await __invoke(COMMAND_REFRESH);

    await __invoke(COMMAND_BROWSE_PRESETS);

    expect(__state.quickPickItems).toHaveLength(14);
    expect(__state.errors).toEqual([]);
  });

  it("previews the selected preset without writing anything", async () => {
    __state.quickPickQueue = ["Oat", "Preview"];

    await __invoke(COMMAND_BROWSE_PRESETS);

    expect(__state.webviewPanels).toHaveLength(1);
    // A browser must not touch the workspace.
    expect(__state.written).toEqual([]);
  });

  it("copies a preset's variables when asked", async () => {
    __state.quickPickQueue = ["Oat", "Copy CSS variables"];

    await __invoke(COMMAND_BROWSE_PRESETS);

    expect(__state.clipboard).toHaveLength(1);
    expect(__state.clipboard[0]).toContain("--");
    expect(__state.written).toEqual([]);
  });

  it("does nothing when dismissed", async () => {
    __state.quickPickSelection = undefined;

    await __invoke(COMMAND_BROWSE_PRESETS);

    expect(__state.info).toEqual([]);
    expect(__state.errors).toEqual([]);
  });

  it("reports an unavailable catalog instead of showing an empty list", async () => {
    const starved = createThemvoraClient({ capabilities: detectCapabilities({}) });

    await runBrowsePresets({
      client: starved,
      preview: { openThemes: async () => undefined },
      clipboard: { writeText: async () => undefined },
      catalog: { client: starved, roots: () => [] },
    });

    expect(__state.quickPickItems).toEqual([]);
    expect(__state.errors).toHaveLength(1);
    expect(__state.errors[0]).toContain("preset catalog");
    expect(__state.errors[0]).toContain("getPresetCatalog");
  });
});

/**
 * A project whose inspection resolved the given catalog-origin themes.
 *
 * Built by hand rather than by writing files: what is under test is the join
 * between the catalog and the graph's output, not the reader that produced it —
 * that one has its own suite.
 */
function projectRoot(
  themes: readonly { name: string; family: string; mode: string; evidence: string; usedBy?: readonly string[] }[],
  declaredOrigin: "catalog" | "definition" = "catalog",
  folder = "app",
): CatalogRoot {
  return {
    name: folder,
    inspection: {
      root: `C:/${folder}`,
      status: "supported",
      packages: ["@themvora/core"],
      registries: [
        {
          kind: "theme-module",
          path: "src/theme/theme.config.ts",
          status: "supported",
          detail: "",
          themes: themes.map((theme) => ({
            name: theme.name,
            meta: { family: theme.family, mode: theme.mode },
            tokens: { colors: { primary: "#4f46e5" } },
          })) as never,
          themeSources: themes.map((theme) => ({
            name: theme.name,
            mode: theme.mode,
            origin: declaredOrigin,
          })),
        },
      ],
      notes: [],
      providers: [],
      relationships: themes.map((theme) => ({
        name: theme.name,
        definedIn: "src/theme/theme.config.ts",
        mode: theme.mode,
        family: theme.family,
        usedBy: theme.usedBy ?? [],
        evidence: theme.evidence as never,
      })),
    },
  };
}

/** The deps `runBrowsePresets` needs, with a given project. */
function depsWith(catalog: CatalogRoot[]): BrowsePresetsDeps {
  const client = createThemvoraClient();
  return {
    client,
    preview: { openThemes: async () => undefined },
    clipboard: { writeText: async () => undefined },
    catalog: { client, roots: () => catalog },
  };
}

describe("project evidence", () => {
  it("marks a preset the project already includes, and says what proved it", async () => {
    await runBrowsePresets(
      depsWith([
        projectRoot([
          { name: "oat-light", family: "oat", mode: "light", evidence: "registered", usedBy: ["src/main.tsx"] },
          { name: "oat-dark", family: "oat", mode: "dark", evidence: "registered", usedBy: ["src/main.tsx"] },
        ]),
      ]),
    );

    const oat = __state.quickPickItems.find((item) => item.label === "Oat");
    expect(oat?.description).toContain("Registered in source");
    expect(oat?.detail).toContain("src/main.tsx");
  });

  it("leaves a preset the project does not include at catalog only", async () => {
    await runBrowsePresets(
      depsWith([
        projectRoot([
          { name: "oat-light", family: "oat", mode: "light", evidence: "registered" },
          { name: "oat-dark", family: "oat", mode: "dark", evidence: "registered" },
        ]),
      ]),
    );

    const cocoa = __state.quickPickItems.find((item) => item.label === "Cocoa");
    expect(cocoa?.description).toContain("Catalog only");
  });

  it("does not mistake a custom theme for the preset it is named after", async () => {
    // The project defines its own "berry". Same family, different origin: it is
    // the developer's theme, and the canonical Berry preset is not in the project.
    await runBrowsePresets(
      depsWith([
        projectRoot(
          [
            { name: "berry-light", family: "berry", mode: "light", evidence: "registered" },
            { name: "berry-dark", family: "berry", mode: "dark", evidence: "registered" },
          ],
          "definition",
        ),
      ]),
    );

    const berry = __state.quickPickItems.find((item) => item.label === "Berry");
    expect(berry?.description).toContain("Catalog only");
  });

  it("reports one variant as partial rather than registered", async () => {
    await runBrowsePresets(
      depsWith([
        projectRoot([{ name: "oat-light", family: "oat", mode: "light", evidence: "registered" }]),
      ]),
    );

    const oat = __state.quickPickItems.find((item) => item.label === "Oat");
    expect(oat?.description).toContain("Partially detected");
    expect(oat?.detail).toContain("dark");
  });

  it("reports a collection it could not resolve as unverified", async () => {
    // A catalog call whose filter is dynamic: the collection is real, the
    // membership is not statically knowable. That is not "in the project" and it
    // is not "catalog only" either.
    await runBrowsePresets(
      depsWith([
        projectRoot([
          { name: "oat-light", family: "oat", mode: "light", evidence: "partially-resolved" },
          { name: "oat-dark", family: "oat", mode: "dark", evidence: "partially-resolved" },
        ]),
      ]),
    );

    const oat = __state.quickPickItems.find((item) => item.label === "Oat");
    expect(oat?.description).toContain("Registration not verified");
    expect(oat?.detail).toContain("could not be resolved");
  });

  it("says a draft from an included preset is a separate copy", async () => {
    __state.quickPickQueue = ["Oat", "Open in Studio"];

    await runBrowsePresets(
      depsWith([
        projectRoot([
          { name: "oat-light", family: "oat", mode: "light", evidence: "registered" },
          { name: "oat-dark", family: "oat", mode: "dark", evidence: "registered" },
        ]),
      ]),
    );

    const studio = __state.quickPickItems.find((item) => item.label === "Open in Studio");
    expect(studio?.description).toContain("separate copy");
    // The Studio owns the draft workflow; the command hands off, it does not
    // re-implement it.
    expect(__state.executed.at(-1)?.id).toBe("themvora.openStudio");
    expect(__state.written).toEqual([]);
  });
});

describe("multi-root workspaces", () => {
  it("keeps each folder's evidence separate", async () => {
    // One folder includes the family; the other has an unrelated catalog theme.
    // The preset must read as registered from the folder that holds it, and the
    // other folder's file must not be cited as evidence.
    await runBrowsePresets(
      depsWith([
        projectRoot([{ name: "cocoa-light", family: "cocoa", mode: "light", evidence: "registered" }], "catalog", "app"),
        projectRoot(
          [
            { name: "oat-light", family: "oat", mode: "light", evidence: "registered", usedBy: ["src/main.tsx"] },
            { name: "oat-dark", family: "oat", mode: "dark", evidence: "registered", usedBy: ["src/main.tsx"] },
          ],
          "catalog",
          "design-system",
        ),
      ]),
    );

    const oat = __state.quickPickItems.find((item) => item.label === "Oat");
    expect(oat?.description).toContain("Registered in source");
    expect(oat?.detail).toContain("design-system");
    expect(oat?.detail).not.toContain("(app)");
  });

  it("does not let half a preset in each folder read as registered", async () => {
    // Light in one project, dark in another. Neither project has the family, so
    // neither may be reported as holding it.
    await runBrowsePresets(
      depsWith([
        projectRoot([{ name: "oat-light", family: "oat", mode: "light", evidence: "registered" }], "catalog", "app"),
        projectRoot([{ name: "oat-dark", family: "oat", mode: "dark", evidence: "registered" }], "catalog", "design-system"),
      ]),
    );

    const oat = __state.quickPickItems.find((item) => item.label === "Oat");
    expect(oat?.description).toContain("Partially detected");
    expect(oat?.description).not.toContain("Registered in source");
  });

  it("writes nothing and previews nothing while browsing", async () => {
    await runBrowsePresets(
      depsWith([
        projectRoot([{ name: "oat-light", family: "oat", mode: "light", evidence: "registered" }], "catalog", "app"),
        projectRoot([{ name: "cocoa-light", family: "cocoa", mode: "light", evidence: "registered" }], "catalog", "design-system"),
      ]),
    );

    expect(__state.written).toEqual([]);
    expect(__state.webviewPanels).toEqual([]);
  });
});
