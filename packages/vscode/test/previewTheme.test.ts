/**
 * `Themvora: Preview Theme` end-to-end, against the fake host.
 *
 * The panel is recorded rather than rendered: these assert what the host sends
 * and when, which is the half the extension owns. The webview's own behaviour is
 * covered by `previewPanel.test.ts`, which runs the emitted script.
 */
import { generateTheme } from "@themvora/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionContext } from "vscode";

import manifest from "../package.json";
import { COMMAND_PREVIEW_THEME } from "../src/commands/previewTheme";
import { COMMAND_REFRESH } from "../src/commands/refresh";
import { activate } from "../src/index";
import { createTempProject, type TempProject } from "./helpers/tempProject";
import { __fireDocumentChange, __invoke, __reset, __sendWebviewMessage, __state, Uri } from "./stubs/vscode";

const BASE = generateTheme({ seed: "#4f46e5" }).light;
const DARK = generateTheme({ seed: "#4f46e5" }).dark;

const DOCUMENT = JSON.stringify({ light: BASE, dark: DARK }, null, 2);

/** The fake extension context. */
function context(): ExtensionContext {
  return {
    subscriptions: [],
    // A real context always has one; the preview tab icon is built from it.
    extensionUri: Uri.file("/extension"),
    extension: { packageJSON: manifest },
  } as unknown as ExtensionContext;
}

/** Let pending promises settle, without waiting on a clock. */
function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/** The panel the command created. */
function panel(index = 0) {
  const found = __state.webviewPanels[index];
  if (!found) throw new Error(`no webview panel at ${index}`);
  return found;
}

/** The last message posted to the panel. */
function lastMessage(index = 0): Record<string, unknown> {
  const posted = panel(index).posted;
  const message = posted[posted.length - 1];
  if (typeof message !== "object" || message === null) throw new Error("no message posted");
  return message as Record<string, unknown>;
}

let project: TempProject;

beforeEach(async () => {
  __reset();
  project = createTempProject();
  activate(context());
  await __invoke(COMMAND_REFRESH);
});

afterEach(() => {
  vi.useRealTimers();
  project.cleanup();
});

describe("registration", () => {
  it("is contributed and registered", () => {
    expect(manifest.contributes.commands.map((entry) => entry.command)).toContain(
      COMMAND_PREVIEW_THEME,
    );
    expect(__state.commands.has(COMMAND_PREVIEW_THEME)).toBe(true);
  });

  it("is titled for the palette", () => {
    const entry = manifest.contributes.commands.find(
      (candidate) => candidate.command === COMMAND_PREVIEW_THEME,
    );
    expect(entry?.title).toBe("Preview Theme");
  });
});

describe("opening", () => {
  it("keeps its document alive while another tab is in front", async () => {
    // Re-creating the webview on every reveal is what produced the flash: a
    // fresh document paints its default background for a frame before the model
    // arrives. Retaining the context means there is no first frame to flash.
    const file = project.write("theme.json", DOCUMENT);
    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));

    expect(panel().options).toMatchObject({ retainContextWhenHidden: true });
  });

  it("gives the panel the Themvora logo as its tab icon", async () => {
    // The tab icon comes from `panel.iconPath`, not from the file icon theme, so
    // the preview tab is the one place the Themvora mark always appears.
    const file = project.write("theme.json", DOCUMENT);
    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));

    const icon = panel().iconPath as { fsPath: string };
    expect(icon.fsPath).toContain("themvora.svg");
  });

  it("creates the panel and posts a preview", async () => {
    const file = project.write("theme.json", DOCUMENT);

    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));

    expect(__state.webviewPanels).toHaveLength(1);
    expect(panel().viewType).toBe("themvora.preview");
    expect(panel().html).toContain("default-src 'none'");

    const message = lastMessage();
    expect(message["type"]).toBe("preview");
    expect((message["model"] as { themeName: string }).themeName).toBe("generated-light");
  });

  it("reuses the panel instead of opening a second one", async () => {
    const first = project.write("one.json", DOCUMENT);
    const second = project.write("two.json", DOCUMENT);

    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(first));
    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(second));

    expect(__state.webviewPanels).toHaveLength(1);
    expect(panel().revealed).toBe(true);
  });

  it("prefers the active editor when it holds a theme", async () => {
    const file = project.write("theme.json", DOCUMENT);
    __state.activeTextEditor = {
      document: { uri: Uri.file(file), getText: () => DOCUMENT, isDirty: false },
    };

    // No dialog is configured, so a panel proves the editor path was taken.
    await __invoke(COMMAND_PREVIEW_THEME);

    expect(__state.webviewPanels).toHaveLength(1);
  });

  it("ends quietly when the theme picker is dismissed", async () => {
    __state.folders = [project.root];
    await __invoke(COMMAND_REFRESH);
    __state.quickPickSelection = undefined;

    await __invoke(COMMAND_PREVIEW_THEME);
    await flush();

    // A dismissed picker is not a failure: no panel, and nothing to read.
    expect(__state.webviewPanels).toEqual([]);
    expect(__state.warnings).toEqual([]);
    expect(__state.info).toEqual([]);
    expect(__state.errors).toEqual([]);
  });

  it("previews a TypeScript registry the inspector resolved", async () => {
    // Not a JSON document, so the document parser cannot read it. The inspector
    // can, and the catalog carries what it found — the editor-title action has
    // to reach that path or it fails on the format most projects actually use.
    project.write(
      "src/theme/brand.ts",
      [
        'import { defineTheme } from "@themvora/core";',
        `export const brand = defineTheme(${JSON.stringify(BASE, null, 2)});`,
      ].join("\n"),
    );
    project.write("package.json", JSON.stringify({ dependencies: { "@themvora/core": "^1.0.0" } }));
    __state.folders = [project.root];
    await __invoke(COMMAND_REFRESH);

    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(`${project.root}/src/theme/brand.ts`));
    await flush();

    expect(__state.webviewPanels).toHaveLength(1);
    expect(__state.errors).toEqual([]);
    expect(lastMessage().type).toBe("preview");
  });

  it("previews a catalog preset chosen from the picker", async () => {
    __state.folders = [project.root];
    await __invoke(COMMAND_REFRESH);
    __state.quickPickSelection = "Oat · light";

    await __invoke(COMMAND_PREVIEW_THEME);
    await flush();

    // A preset is a theme; the workspace needs no Themvora for it.
    expect(__state.webviewPanels).toHaveLength(1);
    expect(lastMessage().type).toBe("preview");
  });

  it("shows a non-theme document as an error in the panel", async () => {
    const file = project.write("other.json", '{"hello":"world"}');

    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));

    const message = lastMessage();
    expect(message["type"]).toBe("error");
    expect(String(message["message"])).toContain("neither a theme");
    // Nothing valid has been shown, so this is not a stale render.
    expect(message["stale"]).toBe(false);
  });

  it("shows an unreadable file as an error", async () => {
    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(`${project.root}/missing.json`));

    expect(lastMessage()["type"]).toBe("error");
    expect(String(lastMessage()["message"])).toContain("Could not read");
  });
});

describe("messages from the webview", () => {
  it("re-sends the current state when the webview says it is ready", async () => {
    const file = project.write("theme.json", DOCUMENT);
    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));
    const before = panel().posted.length;

    __sendWebviewMessage(0, { type: "ready" });
    await flush();

    expect(panel().posted.length).toBeGreaterThan(before);
    expect(lastMessage()["type"]).toBe("preview");
  });

  it("switches mode on request", async () => {
    const file = project.write("theme.json", DOCUMENT);
    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));

    __sendWebviewMessage(0, { type: "setMode", mode: "dark" });
    await flush();

    const model = lastMessage()["model"] as { mode: string; variables: Record<string, string> };
    expect(model.mode).toBe("dark");
    expect(model.variables["--theme-color-background"]).toBe(DARK.tokens!.colors!["background"]);
  });

  it("ignores an unrecognised message", async () => {
    const file = project.write("theme.json", DOCUMENT);
    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));
    const before = panel().posted.length;

    __sendWebviewMessage(0, { type: "execute", command: "rm -rf /" });
    __sendWebviewMessage(0, "not even an object");
    await flush();

    expect(panel().posted.length).toBe(before);
    // The ignored message is logged rather than silently swallowed.
    const log = __state.outputChannels[0]!.lines.join("\n");
    expect(log).toContain("unrecognised message");
  });

  it("ignores a mode request before any valid preview exists", async () => {
    const file = project.write("other.json", '{"hello":"world"}');
    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));
    const before = panel().posted.length;

    __sendWebviewMessage(0, { type: "setMode", mode: "dark" });
    await flush();

    expect(panel().posted.length).toBe(before);
  });
});

describe("live refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("rebuilds after an edit, using the unsaved text", async () => {
    const file = project.write("theme.json", DOCUMENT);
    let text = DOCUMENT;
    const document = { uri: Uri.file(file), getText: () => text, isDirty: false };
    __state.textDocuments.push(document);

    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));
    expect(lastMessage()["type"]).toBe("preview");

    // Edit without saving: the open document is the source of truth.
    const edited = generateTheme({ seed: "#10b981" }).light;
    text = JSON.stringify({ light: edited, dark: DARK }, null, 2);
    document.isDirty = true;
    __fireDocumentChange(file);
    await vi.advanceTimersByTimeAsync(250);

    const model = lastMessage()["model"] as {
      variables: Record<string, string>;
      source: string;
    };
    // The unsaved text was read, not the file on disk.
    expect(model.variables["--theme-color-background"]).toBe(
      edited.tokens!.colors!["background"],
    );
    expect(model.source).toContain("• unsaved");
  });

  it("keeps the last good preview and marks it stale", async () => {
    const file = project.write("theme.json", DOCUMENT);
    let text = DOCUMENT;
    const document = { uri: Uri.file(file), getText: () => text, isDirty: false };
    __state.textDocuments.push(document);

    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));

    text = "{ not json";
    __fireDocumentChange(file);
    await vi.advanceTimersByTimeAsync(250);

    const message = lastMessage();
    expect(message["type"]).toBe("error");
    expect(message["stale"]).toBe(true);
    expect(String(message["message"])).toContain("not valid JSON");
  });

  it("debounces a burst of edits into one rebuild", async () => {
    const file = project.write("theme.json", DOCUMENT);
    const document = { uri: Uri.file(file), getText: () => DOCUMENT, isDirty: false };
    __state.textDocuments.push(document);

    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));
    const before = panel().posted.length;

    for (let index = 0; index < 5; index += 1) __fireDocumentChange(file);
    await vi.advanceTimersByTimeAsync(250);

    expect(panel().posted.length).toBe(before + 1);
  });

  it("ignores edits to a different file", async () => {
    const file = project.write("theme.json", DOCUMENT);
    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));
    const before = panel().posted.length;

    __fireDocumentChange(`${project.root}/elsewhere.json`);
    await vi.advanceTimersByTimeAsync(250);

    expect(panel().posted.length).toBe(before);
  });
});

describe("disposal", () => {
  it("stops watching when the panel closes", async () => {
    const file = project.write("theme.json", DOCUMENT);
    const baseline = __state.changeListeners.length;
    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));
    expect(__state.changeListeners.length).toBe(baseline + 1);

    panel().close();

    expect(__state.changeListeners.length).toBe(baseline);
    expect(panel().disposed).toBe(true);
  });

  it("does not accumulate listeners across opens", async () => {
    const first = project.write("one.json", DOCUMENT);
    const second = project.write("two.json", DOCUMENT);

    const baseline = __state.changeListeners.length;
    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(first));
    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(second));

    // Two opens, one watcher.
    expect(__state.changeListeners.length).toBe(baseline + 1);
  });

  it("stops posting once disposed", async () => {
    const file = project.write("theme.json", DOCUMENT);
    await __invoke(COMMAND_PREVIEW_THEME, Uri.file(file));

    panel().close();
    const before = panel().posted.length;

    __sendWebviewMessage(0, { type: "setMode", mode: "dark" });
    await flush();

    expect(panel().posted.length).toBe(before);
  });
});
