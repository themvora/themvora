/**
 * Saved-workspace analysis versus live editor state.
 *
 * These are the guarantees the event lifecycle exists to provide, asserted
 * through the real composition root: `activate()` runs, the real controller
 * registers its listeners on the fake host, the real `inspectProject` reads the
 * real temporary project, and the assertions count the filesystem calls that
 * analysis actually made. Nothing here calls a helper the extension does not call
 * itself, so a passing test means the wiring is right and not merely that a
 * function was invoked.
 *
 * The waits are real because the debounce is real. `settle()` is four times the
 * debounce, which is why an assertion can be about behaviour rather than about
 * scheduling luck: either an analysis was scheduled or it was not.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rmSync, renameSync } from "node:fs";
import type { ExtensionContext } from "vscode";

import { generateTheme, type ThemeDefinition } from "@themvora/core";

import manifest from "../package.json";
import { COMMAND_COPY_CSS_VARIABLES } from "../src/commands/copyCssVariables";
import { COMMAND_PREVIEW_THEME } from "../src/commands/previewTheme";
import { COMMAND_REFRESH } from "../src/commands/refresh";
import { activate, type ThemvoraApi } from "../src/index";
import type { ProjectInspection, RegistryEntry } from "../src/domain/registry";
import { createTempProject, type TempProject } from "./helpers/tempProject";
import { resolveWorkspaceView, type ResolvedWorkspaceView } from "./helpers/webview";
import {
  __changeDocument,
  __fireSave,
  __fireWatcher,
  __invoke,
  __openDocument,
  __reset,
  __setActiveEditor,
  __state,
  __wait,
  Uri,
} from "./stubs/vscode";

/** The fake extension context. */
function context(): ExtensionContext {
  return {
    subscriptions: [],
    extensionUri: Uri.file("/extension"),
    extension: { packageJSON: manifest },
  } as unknown as ExtensionContext;
}

/** Wait for the debounce to elapse and the analysis to finish. */
function settle(ms = 300): Promise<void> {
  return __wait(ms);
}

/** A generated light/dark pair, with the optional halves narrowed. */
function generatedPair(seed: string): { light: ThemeDefinition; dark: ThemeDefinition } {
  const generated = generateTheme({ seed });
  if (generated.light === undefined || generated.dark === undefined) {
    throw new Error("generateTheme did not return a light/dark pair");
  }
  return { light: generated.light, dark: generated.dark };
}

/**
 * A theme module holding one complete light theme.
 *
 * Built from `generateTheme` rather than hand-written: a theme missing one of the
 * twenty-one required colour keys is reported as *malformed*, which is a
 * different registry entry from a theme, and a fixture that is not a valid theme
 * would make every assertion below vacuous.
 */
function themeDocument(name: string, seed = "#4f46e5"): string {
  const theme = { ...generatedPair(seed).light, name };
  return `import { defineTheme } from "@themvora/core";

export const themes = [defineTheme(${JSON.stringify(theme, null, 2)})];
`;
}

/**
 * A theme JSON document: the shape the editor holds while it is being edited, and
 * the one the commands parse from a buffer.
 */
function themeJson(name: string, seed: string): string {
  const generated = generatedPair(seed);
  return JSON.stringify(
    {
      light: { ...generated.light, name },
      dark: { ...generated.dark, name },
    },
    null,
    2,
  );
}

/** The background colour a generated theme carries, for buffer assertions. */
function backgroundOf(seed: string): string {
  const colour = generatedPair(seed).light.tokens?.colors?.background;
  if (typeof colour !== "string") throw new Error("no background colour");
  return colour;
}

/** A workspace with a provider, a theme module and unrelated source. */
function seed(project: TempProject): void {
  project.write(
    "package.json",
    JSON.stringify({
      name: "saved-analysis",
      dependencies: { "@themvora/core": "^1.4.0", "@themvora/react": "^1.4.0" },
    }),
  );
  project.write("src/theme/theme.config.ts", themeDocument("first"));
  project.write(
    "src/main.tsx",
    `import { ThemeProvider } from "@themvora/react";
import { themes } from "./theme/theme.config";

export function App() {
  return <ThemeProvider themes={themes} />;
}
`,
  );
  project.write("src/components/Button.tsx", "export const Button = () => null;\n");
  project.write("assets/logo.css", ":root { color-scheme: light; }\n");
}

/** Every theme name the inspection reports, across all registries. */
function themeNames(inspection: ProjectInspection): string[] {
  return inspection.registries.flatMap((entry: RegistryEntry) =>
    (entry.themes ?? []).map((theme) => theme.name),
  );
}

/** The single root's inspection. */
function inspectionOf(current: ThemvoraApi): ProjectInspection {
  const root = current.projects[0];
  if (root === undefined) throw new Error("no root was inspected");
  return root.inspection;
}

/** A snapshot of the filesystem work done so far. */
function calls(): { readFile: number; readDirectory: number } {
  return { ...__state.fsCalls };
}

/** The filesystem work between two snapshots. */
function between(
  before: { readFile: number; readDirectory: number },
  after: { readFile: number; readDirectory: number },
): { readFile: number; readDirectory: number } {
  return {
    readFile: after.readFile - before.readFile,
    readDirectory: after.readDirectory - before.readDirectory,
  };
}

let project: TempProject;
let api: ThemvoraApi;
let view: ResolvedWorkspaceView;
let ctx: ExtensionContext;

/** Absolute path of a file the tests touch. */
function path(relative: string): string {
  return `${project.root}/${relative}`;
}

beforeEach(async () => {
  __reset();
  project = createTempProject();
  seed(project);
  __state.folders = [project.root];

  ctx = context();
  api = activate(ctx);
  await __invoke(COMMAND_REFRESH);
  view = resolveWorkspaceView({ ready: true });
  await settle(120);
});

afterEach(() => {
  project.cleanup();
});

describe("typing", () => {
  it("does not analyse the workspace while a document is edited", async () => {
    const config = path("src/theme/theme.config.ts");
    __openDocument(config, themeDocument("first"));

    const before = calls();
    const posts = view.ofType("state").length;

    for (let index = 0; index < 20; index += 1) {
      __changeDocument(config, themeDocument(`typing-${index}`));
      await __wait(40);
    }

    await settle(400);

    // Not "fewer": none. A keystroke is not a workspace event.
    expect(calls()).toEqual(before);
    expect(view.ofType("state")).toHaveLength(posts);
  }, 20_000);

  it("keeps the published graph on the saved contents, not the buffer", async () => {
    const config = path("src/theme/theme.config.ts");
    __openDocument(config, themeDocument("unsaved-name"));
    __changeDocument(config, themeDocument("unsaved-name"));

    await settle(400);

    // The buffer says "unsaved-name" and the workspace says "first". The
    // workspace answer is the saved one, and the extension does not pretend
    // otherwise.
    expect(themeNames(inspectionOf(api))).toEqual(["first"]);
  }, 20_000);
});

describe("saving", () => {
  it("analyses the saved contents of a theme file", async () => {
    const config = path("src/theme/theme.config.ts");
    project.write("src/theme/theme.config.ts", themeDocument("renamed"));

    __fireSave(config);
    await settle();

    expect(themeNames(inspectionOf(api))).toEqual(["renamed"]);
  }, 20_000);

  it("merges duplicate save and watcher notifications into one analysis", async () => {
    const config = path("src/theme/theme.config.ts");
    project.write("src/theme/theme.config.ts", themeDocument("merged"));

    // What one save costs, measured through the same path as the burst below and
    // sampled after it has settled, so both sides describe finished work.
    const singleBefore = calls();
    __fireSave(config);
    await settle();
    const single = between(singleBefore, calls());

    project.write("src/theme/theme.config.ts", themeDocument("merged-again"));
    const burstBefore = calls();
    const posts = view.ofType("state").length;

    // A save, the watcher's report of the same write, and a second save — the
    // shape a format-on-save produces.
    __fireSave(config);
    __fireWatcher("change", config);
    __fireSave(config);
    await settle();
    const burst = between(burstBefore, calls());

    expect(themeNames(inspectionOf(api))).toEqual(["merged-again"]);
    // One analysis' worth of work, not three.
    expect(single.readFile).toBeGreaterThan(0);
    expect(burst.readFile).toBeLessThanOrEqual(single.readFile);
    expect(burst.readDirectory).toBeLessThanOrEqual(single.readDirectory);
    // And one publish, not three.
    expect(view.ofType("state")).toHaveLength(posts + 1);
  }, 20_000);

  it("keeps the graph current when several files are saved quickly", async () => {
    const config = path("src/theme/theme.config.ts");
    const extra = path("src/theme/brand.ts");

    project.write("src/theme/theme.config.ts", themeDocument("alpha"));
    project.write("src/theme/brand.ts", themeDocument("beta"));

    __fireSave(config);
    __fireSave(extra);
    await settle();

    expect(themeNames(inspectionOf(api)).sort()).toEqual(["alpha", "beta"]);
  }, 20_000);

  it("ignores a save of a file the analysis never read", async () => {
    const before = calls();

    // `dist/` is not walked and `.css` is not a source the inspection parses, so
    // nothing that was analysed depends on either file.
    project.write("dist/bundle.js", "console.log('built');\n");
    __fireSave(path("dist/bundle.js"));
    __fireSave(path("assets/logo.css"));
    await settle();

    expect(calls()).toEqual(before);
  }, 20_000);
});

describe("inventory changes", () => {
  it("discovers a theme file that is created", async () => {
    const created = path("src/theme/extra.ts");
    project.write("src/theme/extra.ts", themeDocument("created"));

    __fireWatcher("create", created);
    await settle();

    expect(themeNames(inspectionOf(api)).sort()).toEqual(["created", "first"]);
  }, 20_000);

  it("forgets a theme file that is deleted", async () => {
    rmSync(path("src/theme/theme.config.ts"));

    __fireWatcher("delete", path("src/theme/theme.config.ts"));
    await settle();

    expect(themeNames(inspectionOf(api))).toEqual([]);
    expect(inspectionOf(api).registries).toHaveLength(0);
  }, 20_000);

  it("re-reads after a rename", async () => {
    renameSync(path("src/theme/theme.config.ts"), path("src/theme/theme.config.ts.bak"));

    __fireWatcher("delete", path("src/theme/theme.config.ts"));
    __fireWatcher("create", path("src/theme/theme.config.ts.bak"));
    await settle();

    // The file is gone from the inventory, so the theme it defined is gone too.
    expect(themeNames(inspectionOf(api))).toEqual([]);
  }, 20_000);
});

describe("freshness", () => {
  it("publishes the newest saved contents when saves overlap", async () => {
    const config = path("src/theme/theme.config.ts");

    project.write("src/theme/theme.config.ts", themeDocument("older"));
    __fireSave(config);

    // The second save lands while the first analysis is starting or running.
    project.write("src/theme/theme.config.ts", themeDocument("newer"));
    __fireSave(config);

    await settle(400);

    expect(themeNames(inspectionOf(api))).toEqual(["newer"]);
  }, 20_000);

  it("re-reads everything on an explicit refresh, and publishes before it resolves", async () => {
    const before = calls();

    // Written with no event at all: only a full refresh can find it. This is the
    // case the command exists for — a checkout or a generator run in a terminal.
    project.write("src/theme/late.ts", themeDocument("late"));
    await __invoke(COMMAND_REFRESH);

    // Read on the next line, with no settle: awaiting the command must mean the
    // new state is already published.
    expect(between(before, calls()).readFile).toBeGreaterThan(0);
    expect(themeNames(inspectionOf(api)).sort()).toEqual(["first", "late"]);
  }, 20_000);

  it("publishes once per save, not once per event", async () => {
    const config = path("src/theme/theme.config.ts");
    project.write("src/theme/theme.config.ts", themeDocument("posted"));

    const posts = view.ofType("state").length;
    __fireSave(config);
    __fireWatcher("change", config);
    await settle();

    expect(view.ofType("state")).toHaveLength(posts + 1);
  }, 20_000);
});

describe("live editor behaviour", () => {
  it("keeps the preview following the buffer while the workspace stays saved-only", async () => {
    const file = project.write("theme.json", themeJson("saved", "#4f46e5"));
    __openDocument(file, themeJson("saved", "#4f46e5"));

    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));
    const panel = __state.webviewPanels[0];
    if (panel === undefined) throw new Error("the preview panel was not created");
    const before = panel.posted.length;
    const reads = calls();

    // An edit to the document being previewed is the preview's own contract: it
    // shows the buffer, not the file.
    __changeDocument(file, themeJson("saved", "#b91c1c"));
    await __wait(400);

    expect(panel.posted.length).toBeGreaterThan(before);
    const last = panel.posted[panel.posted.length - 1] as {
      type?: string;
      model?: { themes?: { tokens?: { colors?: { background?: string } } }[] };
    };
    expect(last.type).toBe("preview");
    expect(JSON.stringify(last.model)).toContain(backgroundOf("#b91c1c"));

    // The workspace did not re-read anything to make that happen.
    expect(calls()).toEqual(reads);
  }, 20_000);

  it("copies from the unsaved buffer when no file is named", async () => {
    const file = project.write("theme.json", themeJson("disk-json", "#4f46e5"));
    const document = __openDocument(file, themeJson("buffer-only", "#b91c1c"));
    __setActiveEditor(document);

    // The picker lists the project theme, the open document and the presets;
    // choosing the document's own theme is what proves which bytes were read.
    __state.quickPickSelection = "buffer-only";
    await __invoke(COMMAND_COPY_CSS_VARIABLES);

    const copied = __state.clipboard.join("\n");
    expect(copied).toContain(backgroundOf("#b91c1c"));
    expect(copied).not.toContain(backgroundOf("#4f46e5"));
  }, 20_000);
});

describe("listeners", () => {
  it("registers one save listener, one watcher and one rename listener", () => {
    expect(__state.saveListeners).toHaveLength(1);
    expect(__state.fileWatchers).toHaveLength(1);
    expect(__state.fileWatchers[0]?.disposed).toBe(false);
    expect(__state.renameFilesListeners).toHaveLength(1);
  });

  it("leaves nothing subscribed when the extension is disposed", () => {
    for (const disposable of ctx.subscriptions) disposable.dispose();

    expect(__state.saveListeners).toHaveLength(0);
    expect(__state.changeListeners).toHaveLength(0);
    expect(__state.renameFilesListeners).toHaveLength(0);
    expect(__state.fileWatchers.every((watcher) => watcher.disposed)).toBe(true);
  });
});
