/**
 * Activation, view registration and command tests.
 *
 * These run the real `activate()`, the real tree provider and the real command
 * handlers against the fake host. Filesystem calls are real, so what is asserted
 * is what actually happened: which commands were registered, which view was
 * created, and which bytes landed on disk.
 *
 * `activateAndSettle` awaits the refresh command after activating. Activation
 * deliberately does not await its own inspection, and awaiting it here keeps a
 * pending scan from leaking into the next test.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExtensionContext } from "vscode";

import manifest from "../package.json";
import { COMMAND_GENERATE_THEME } from "../src/commands/generateTheme";
import { COMMAND_REFRESH } from "../src/commands/refresh";
import { activate, type ThemvoraApi } from "../src/index";
import { WORKSPACE_VIEW_ID } from "../src/adapters/workspaceView";
import { createTempProject, type TempProject } from "./helpers/tempProject";
import { __invoke, __reset, __state, Uri } from "./stubs/vscode";

/** The fake context VS Code would supply. */
function context(): ExtensionContext {
  return {
    subscriptions: [],
    // A real context always has one; the preview tab icon is built from it.
    extensionUri: Uri.file("/extension"),
    extension: { packageJSON: manifest },
  } as unknown as ExtensionContext;
}

/** Activate, then wait for the inspection activation started. */
async function activateAndSettle(): Promise<ThemvoraApi> {
  const api = activate(context());
  await __invoke(COMMAND_REFRESH);
  return api;
}

let project: TempProject;

beforeEach(() => {
  __reset();
  project = createTempProject();
});

afterEach(() => {
  project.cleanup();
});

describe("activate", () => {
  it("registers exactly the commands the manifest contributes", async () => {
    const api = await activateAndSettle();

    const contributed = manifest.contributes.commands.map((entry) => entry.command).sort();
    expect([...__state.commands.keys()].sort()).toEqual(contributed);
    expect(api.version).toBe(manifest.version);
  });

  it("keeps the command id constants and the manifest in agreement", () => {
    // A command in the palette that resolves to a different id does nothing when
    // invoked, which is the failure these constants exist to prevent.
    const contributed = manifest.contributes.commands.map((entry) => entry.command);
    expect(contributed).toContain(COMMAND_GENERATE_THEME);
    expect(contributed).toContain(COMMAND_REFRESH);
  });

  it("registers one sidebar webview and no native tree", async () => {
    await activateAndSettle();

    // The Project tree is gone: files, themes and packages all live in the one
    // webview, so the sidebar cannot show two different pictures of the folder.
    expect(__state.treeViews).toHaveLength(0);
    expect(__state.webviewViewProviders.map((entry) => entry.id)).toContain(WORKSPACE_VIEW_ID);

    // The view lives in its own Activity Bar container, not as a section inside
    // the built-in Explorer. `views` is keyed by container id, so this asserts
    // the key the view was moved under — a view under a container that does not
    // exist is contributed but never shown.
    const containers = manifest.contributes.viewsContainers.activitybar.map((entry) => entry.id);
    expect(containers).toContain("themvora");
    expect(manifest.contributes.views.themvora.map((view) => view.id)).toEqual([WORKSPACE_VIEW_ID]);
  });

  it("registers its disposables on the context", () => {
    const ctx = context();
    activate(ctx);
    expect(ctx.subscriptions.length).toBeGreaterThan(0);
  });

  it("hides the project status bar item when no folder is open", async () => {
    await activateAndSettle();

    // Two items exist now: the project status, and the contextual item that
    // appears only while a theme file is focused. This asserts the project one,
    // which is the one that must not claim anything about an empty window.
    const projectItem = __state.statusBarItems.find((item) => item.name === "Themvora");
    expect(projectItem).toBeDefined();
    expect(projectItem!.visible).toBe(false);
  });

  it("shows the status bar when a folder is open", async () => {
    __state.folders = [project.root];
    await activateAndSettle();

    const item = __state.statusBarItems[0]!;
    expect(item.visible).toBe(true);
    expect(item.text).toContain("Themvora");
    expect(item.command).toBe("themvora.workspace.focus");
  });

  it("performs no writes on activation", async () => {
    project.write("package.json", JSON.stringify({ dependencies: { "@themvora/core": "^1.4.0" } }));
    project.write("src/themes/themes.ts", "export const themes = [];");
    const before = project.files();

    __state.folders = [project.root];
    await activateAndSettle();

    // The Milestone 2 gate, asserted directly: inspecting a project changes
    // nothing in it, and nothing is written anywhere else either.
    expect(project.files()).toEqual(before);
    expect(__state.written).toEqual([]);
  });
});

describe("themvora.generateTheme", () => {
  it("writes a light/dark pair that the CLI can read back", async () => {
    await activateAndSettle();
    const target = `${project.root}/theme.json`;

    await __invoke(COMMAND_GENERATE_THEME, "4F46E5", Uri.file(target));

    expect(__state.written).toHaveLength(1);

    const parsed = JSON.parse(__state.written[0]!.contents) as {
      light: { name: string; tokens: { colors: Record<string, string> } };
      dark: { name: string; tokens: { colors: Record<string, string> } };
    };

    expect(Object.keys(parsed)).toEqual(["light", "dark"]);
    expect(parsed.light.name).toBe("generated-light");
    expect(parsed.dark.name).toBe("generated-dark");
    expect(Object.keys(parsed.light.tokens.colors)).toHaveLength(21);
    expect(parsed.light.tokens.colors["primary"]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("preserves generation provenance through the file", async () => {
    await activateAndSettle();

    await __invoke(COMMAND_GENERATE_THEME, "#4f46e5", Uri.file(`${project.root}/theme.json`));

    const parsed = JSON.parse(__state.written[0]!.contents) as {
      light: { meta: { generation: { kind: string; seed: string; algorithm: string } } };
    };

    // Provenance is what `isGeneratedTheme()` reads; if JSON dropped it, a
    // re-read theme would be indistinguishable from a hand-authored one.
    expect(parsed.light.meta.generation.kind).toBe("generated");
    expect(parsed.light.meta.generation.seed).toBe("#4f46e5");
    expect(parsed.light.meta.generation.algorithm).toBe("semantic-v2");
  });

  it("prompts for a seed, then previews the pair without writing", async () => {
    await activateAndSettle();
    // Seed, then the optional family — left empty so core's default is used.
    __state.inputBoxQueue = ["#4f46e5", ""];
    __state.quickPickSelection = "Default";

    await __invoke(COMMAND_GENERATE_THEME);

    // Generating is not saving: the pair goes to the preview, and the disk is
    // untouched until the user asks for a file.
    expect(__state.written).toEqual([]);
    expect(__state.webviewPanels).toHaveLength(1);
    expect(__state.info[0]).toContain("unsaved draft");
  });

  it("offers the styles core actually ships", async () => {
    await activateAndSettle();
    __state.inputBoxQueue = ["#4f46e5", ""];

    await __invoke(COMMAND_GENERATE_THEME);

    // The list is core's, not a hardcoded one: every style it ships, plus the
    // default. A style core does not have can never be offered.
    expect(__state.quickPickItems.map((item) => item.label)).toEqual([
      "Default",
      "balanced",
      "soft",
      "vibrant",
      "editorial",
      "minimal",
      "brand",
    ]);
  });

  it("reports the canonical contrast summary", async () => {
    await activateAndSettle();

    await __invoke(COMMAND_GENERATE_THEME, "#4f46e5", Uri.file(`${project.root}/theme.json`));

    expect(__state.info).toHaveLength(1);
    // The exact figures core reports for a generated pair: 16 measured pairs,
    // 9 held to the text floor and 7 to the UI floor, all passing.
    expect(__state.info[0]).toContain("light 16 pairs · text 9/9 · ui 7/7");
    expect(__state.info[0]).toContain("dark 16 pairs · text 9/9 · ui 7/7");
  });

  it("writes nothing when the seed prompt is cancelled", async () => {
    await activateAndSettle();
    __state.inputBox = undefined;
    __state.saveDialog = Uri.file(`${project.root}/theme.json`);

    await __invoke(COMMAND_GENERATE_THEME);

    expect(__state.written).toHaveLength(0);
    expect(__state.info).toHaveLength(0);
    expect(__state.errors).toHaveLength(0);
  });

  it("writes nothing when the style prompt is cancelled", async () => {
    await activateAndSettle();
    __state.inputBoxQueue = ["#4f46e5", ""];
    __state.quickPickSelection = undefined;

    await __invoke(COMMAND_GENERATE_THEME);

    expect(__state.written).toEqual([]);
    expect(__state.webviewPanels).toEqual([]);
    expect(__state.errors).toEqual([]);
  });

  it("rejects a seed that is not a hex colour", async () => {
    await activateAndSettle();

    await __invoke(COMMAND_GENERATE_THEME, "rebeccapurple", Uri.file(`${project.root}/theme.json`));

    expect(__state.written).toHaveLength(0);
    expect(__state.errors).toHaveLength(1);
    expect(__state.errors[0]).toContain("6-digit hex");
  });
});
