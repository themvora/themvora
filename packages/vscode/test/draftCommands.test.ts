/**
 * Unsaved drafts, from the commands' side.
 *
 * A generated pair used to exist only in the preview panel: `Compare`, `Copy`
 * and `Validate` could not reach it because nothing had a name for it. These
 * drive the real commands against the real registry and assert that the theme
 * the user just generated is selectable, and that selecting it writes nothing.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExtensionContext } from "vscode";

import manifest from "../package.json";
import { COMMAND_COMPARE_THEMES } from "../src/commands/compareThemes";
import { COMMAND_COPY_CSS_VARIABLES } from "../src/commands/copyCssVariables";
import { COMMAND_GENERATE_THEME } from "../src/commands/generateTheme";
import { COMMAND_PREVIEW_THEME } from "../src/commands/previewTheme";
import { COMMAND_REFRESH } from "../src/commands/refresh";
import { COMMAND_VALIDATE_THEME } from "../src/commands/validateTheme";
import { OPEN_STUDIO_COMMAND } from "../src/adapters/studioPanel";
import { activate } from "../src/index";
import { createTempProject, type TempProject } from "./helpers/tempProject";
import { __invoke, __reset, __state, Uri } from "./stubs/vscode";

/** The fake extension context. */
function context(): ExtensionContext {
  return {
    subscriptions: [],
    extensionUri: Uri.file("/extension"),
    extension: { packageJSON: manifest },
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

/**
 * Generate a pair, which registers a draft and opens the preview.
 *
 * The interactive path asks for a family and a style before generating, so both
 * answers are queued: an unanswered prompt is a cancellation, and a cancelled
 * generation registers nothing.
 *
 * @param seed - The hex seed.
 * @param family - The family name to answer with.
 */
async function generate(seed = "#10b981", family = "ocean"): Promise<void> {
  __state.inputBox = family;
  __state.quickPickQueue.push("Default");
  await __invoke(COMMAND_GENERATE_THEME, seed);
}

describe("a generated draft is reachable", () => {
  it("appears in the copy picker by its family name", async () => {
    await generate();

    __state.quickPickQueue = ["ocean · light"];
    await __invoke(COMMAND_COPY_CSS_VARIABLES);

    // The picker offered the draft and the command acted on it.
    expect(__state.clipboard).toHaveLength(1);
    expect(__state.clipboard[0]).toContain("--");
  });

  it("copies the same seed's canonical document", async () => {
    await generate("#10b981");

    __state.quickPickQueue = ["ocean · light"];
    await __invoke(COMMAND_COPY_CSS_VARIABLES);

    // The seed is the only input, so the copied document must equal what core
    // renders for that seed — the draft did not alter the theme on its way in.
    const { generateTheme, themeToCssDocument } = await import("@themvora/core");
    const expected = themeToCssDocument(generateTheme({ seed: "#10b981" }).light);
    expect(__state.clipboard[0]).toContain("--");
    expect(__state.clipboard[0]).toBe(expected);
  });

  it("is validated without touching a file", async () => {
    await generate();

    __state.quickPickQueue = ["ocean · dark"];
    await __invoke(COMMAND_VALIDATE_THEME);

    // The report names the draft and its origin, not a file path.
    const lines = __state.outputChannels[0]?.lines.join("\n") ?? "";
    expect(lines).toContain("ocean · dark");
    expect(lines).toContain("Unsaved draft");
    expect(__state.written).toEqual([]);
  });

  it("can be compared with a catalog preset", async () => {
    await generate();

    // The first picker is the draft; the second is any preset.
    __state.quickPickQueue = ["ocean · light", "Oat · light"];
    await __invoke(COMMAND_COMPARE_THEMES);

    // A real semantic diff ran and produced a report rather than an error.
    const lines = __state.outputChannels[0]?.lines.join("\n") ?? "";
    expect(lines.length).toBeGreaterThan(0);
    expect(__state.errors).toEqual([]);
    expect(__state.written).toEqual([]);
  });

  it("can be compared with another draft", async () => {
    // Two generations are two drafts, because each is a separate command
    // invocation with its own inputs.
    await generate("#10b981", "ocean");
    await generate("#4f46e5", "forest");

    __state.quickPickQueue = ["ocean · light", "forest · dark"];
    await __invoke(COMMAND_COMPARE_THEMES);

    const lines = __state.outputChannels[0]?.lines.join("\n") ?? "";
    expect(lines).toContain("ocean");
    expect(lines).toContain("forest");
    expect(__state.errors).toEqual([]);
  });

  it("can be previewed on its own", async () => {
    await generate();
    const panels = __state.webviewPanels.length;

    __state.quickPickQueue = ["ocean · dark"];
    await __invoke(COMMAND_PREVIEW_THEME);

    // The same panel is reused rather than stacking a second one.
    expect(__state.webviewPanels).toHaveLength(panels);
  });

  it("does not write a file at any point", async () => {
    await generate();
    __state.quickPickQueue = ["ocean · light"];
    await __invoke(COMMAND_COPY_CSS_VARIABLES);
    __state.quickPickQueue = ["ocean · light"];
    await __invoke(COMMAND_VALIDATE_THEME);

    expect(__state.written).toEqual([]);
  });
});

describe("cancellation", () => {
  it("is silent when the draft picker is dismissed", async () => {
    await generate();

    __state.quickPickSelection = undefined;
    await __invoke(COMMAND_COPY_CSS_VARIABLES);

    expect(__state.errors).toEqual([]);
    expect(__state.clipboard).toEqual([]);
    expect(__state.written).toEqual([]);
  });
});

/**
 * Scaffold a project the Studio will open in.
 *
 * The Studio refuses to open in a folder with no Themvora in it, so the
 * cross-surface tests need a manifest that declares the package.
 */
async function scaffold(): Promise<void> {
  project.write(
    "package.json",
    JSON.stringify({ name: "app", dependencies: { "@themvora/core": "^2.0.0" } }),
  );
  await __invoke(COMMAND_REFRESH);
}

/** Wait for an async panel handler to settle. */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** The open Studio panel. */
function studioPanel() {
  const panel = __state.webviewPanels.find((candidate) => candidate.title === "Themvora Studio");
  if (panel === undefined) throw new Error("the Studio is not open");
  return panel;
}

/** Send an intent to the Studio panel. */
async function toStudio(message: unknown): Promise<void> {
  for (const handler of studioPanel().messageHandlers) handler(message);
  for (let turn = 0; turn < 4; turn += 1) await flush();
}

/** What the Studio last rendered. */
function studioState(): {
  readonly drafts: readonly { readonly id: string; readonly name: string; readonly dirty: boolean }[];
  readonly selected?: { readonly origin: string; readonly draftId?: string; readonly name: string } | undefined;
} {
  const posted = [...studioPanel().posted]
    .reverse()
    .find((message) => (message as { type?: unknown }).type === "state");
  return (posted as { state: ReturnType<typeof studioState> }).state;
}

describe("one registry across surfaces", () => {
  it("offers a draft the Studio created to the commands", async () => {
    await scaffold();
    await __invoke(OPEN_STUDIO_COMMAND);

    // The Studio generates; the draft lands in the host registry.
    await toStudio({ type: "generate", seed: "#10b981", kind: "generate", family: "ocean" });

    __state.quickPickQueue = ["ocean · light"];
    await __invoke(COMMAND_COPY_CSS_VARIABLES);

    // A command that only knew about files and presets could not have done this.
    expect(__state.clipboard).toHaveLength(1);
    expect(__state.clipboard[0]).toContain("--");
  });

  it("stops offering a draft the Studio discarded", async () => {
    await scaffold();
    await __invoke(OPEN_STUDIO_COMMAND);
    await toStudio({ type: "generate", seed: "#10b981", kind: "generate", family: "ocean" });

    __state.modalAnswer = "Discard";
    await toStudio({ type: "discardDraft" });

    __state.quickPickQueue = ["ocean · light"];
    await __invoke(COMMAND_COPY_CSS_VARIABLES);

    // The picker no longer contains it, so the queued label matches nothing and
    // the command stops — with no clipboard write and no error.
    expect(__state.clipboard).toEqual([]);
    expect(__state.errors).toEqual([]);
    expect(__state.written).toEqual([]);
  });

  it("does not count a draft as a project theme", async () => {
    await scaffold();
    await __invoke(OPEN_STUDIO_COMMAND);
    await toStudio({ type: "generate", seed: "#10b981", kind: "generate", family: "ocean" });

    __state.quickPickQueue = ["ocean · light"];
    await __invoke(COMMAND_VALIDATE_THEME);

    const lines = __state.outputChannels[0]?.lines.join("\n") ?? "";
    // The origin is the draft's, not the project's.
    expect(lines).toContain("Unsaved draft");
    expect(lines).not.toContain("Project theme");
  });
});

describe("a Generate Theme draft in the Studio", () => {
  /** Generate one draft through the command, then open the Studio. */
  async function generatedThenStudio(): Promise<void> {
    await scaffold();
    __state.inputBox = "ocean";
    __state.quickPickQueue.push("Default");
    await __invoke(COMMAND_GENERATE_THEME, "#10b981");
    await __invoke(OPEN_STUDIO_COMMAND);
  }

  it("is listed by the library", async () => {
    await generatedThenStudio();

    const rows = studioState().drafts;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("ocean");
    expect(rows[0]?.dirty).toBe(true);
  });

  it("is adopted by id when selected, not copied", async () => {
    await generatedThenStudio();
    const listed = studioState().drafts[0]!;

    await toStudio({ type: "selectDraft", id: listed.id });

    const selected = studioState().selected;
    expect(selected?.origin).toBe("draft");
    // The same record the command created — a copy would have a new id.
    expect(selected?.draftId).toBe(listed.id);
    // Still one draft in the library.
    expect(studioState().drafts).toHaveLength(1);
  });

  it("can be discarded from the Studio", async () => {
    await generatedThenStudio();
    await toStudio({ type: "selectDraft", id: studioState().drafts[0]!.id });

    __state.modalAnswer = "Discard";
    await toStudio({ type: "discardDraft" });

    // Gone from the library and from the commands.
    expect(studioState().drafts).toEqual([]);
    __state.quickPickQueue = ["ocean · light"];
    await __invoke(COMMAND_COPY_CSS_VARIABLES);
    expect(__state.clipboard).toEqual([]);
    expect(__state.written).toEqual([]);
  });

  it("keeps the draft when the discard is cancelled", async () => {
    await generatedThenStudio();
    await toStudio({ type: "selectDraft", id: studioState().drafts[0]!.id });

    __state.modalAnswer = undefined;
    await toStudio({ type: "discardDraft" });

    expect(studioState().drafts).toHaveLength(1);
    // And the command still offers it.
    __state.quickPickQueue = ["ocean · light"];
    await __invoke(COMMAND_COPY_CSS_VARIABLES);
    expect(__state.clipboard).toHaveLength(1);
  });

  it("is never reported as a project theme", async () => {
    await generatedThenStudio();
    await toStudio({ type: "selectDraft", id: studioState().drafts[0]!.id });

    const selected = studioState().selected;
    expect(selected?.origin).toBe("draft");
    // The library lists it as a draft row, not as a project theme row.
    expect(studioState().drafts[0]?.name).toBe("ocean");
  });
});
