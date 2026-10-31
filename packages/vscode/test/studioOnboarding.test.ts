/**
 * The Studio command in a folder that has no Themvora in it.
 *
 * Opening a panel there shows an empty library and a canvas nothing can drive,
 * which reads as a broken extension. The command must explain instead — but a
 * catalog preset is a standalone workflow and must still open.
 */
import { describe, expect, it } from "vitest";

import { createStudioPanel } from "../src/adapters/studioPanel";
import { createThemvoraClient } from "../src/services/coreClient";
import { memoryAppearance } from "./stubs/studioAppearance";
import { createDraftRegistry } from "../src/services/draftRegistry";
import { __reset, __state, Uri } from "./stubs/vscode";

/** A folder with no Themvora evidence at all. */
const EMPTY = {
  root: "/cpp",
  status: "missing",
  packages: [],
  registries: [],
  notes: [],
  providers: [],
  relationships: [],
} as never;

/** A folder with a real, readable Themvora theme in it. */
const CONFIGURED = {
  root: "/app",
  status: "configured",
  packages: [{ name: "@themvora/core", status: "installed", range: "^1.0.0" }],
  registries: [
    {
      kind: "theme-module",
      path: "src/theme/theme.ts",
      status: "supported",
      detail: "src/theme/theme.ts",
      themes: [{ name: "brand-light", meta: { mode: "light", family: "brand" }, tokens: { colors: {} } }],
    },
  ],
  notes: [],
  providers: [],
  relationships: [],
} as never;

/** A panel over the empty folder. */
function panel(onUnconfigured: () => void) {
  return createStudioPanel({
    extensionUri: Uri.file("/extension"),
    roots: () => [{ name: "cpp", inspection: EMPTY }] as never,
    client: createThemvoraClient(),
    save: async () => ({ ok: false, reason: "cancelled" }) as never,
    applyPatch: async () => ({ ok: false, reason: "cancelled" }) as never,
    preview: { openThemes: async () => undefined },
    studioAppearance: memoryAppearance(),
    drafts: createDraftRegistry(),
    onUnconfigured,
  });
}

describe("opening the Studio without a project setup", () => {
  it("explains instead of creating a panel", async () => {
    __reset();
    let explained = 0;

    await panel(() => {
      explained += 1;
    }).open();

    expect(explained).toBe(1);
    // Nothing was created: no empty editor, no webview to dispose.
    expect(__state.webviewPanels).toHaveLength(0);
  });

  it("still opens a named catalog preset", async () => {
    __reset();
    let explained = 0;

    // A preset ships with the extension, so it is a valid standalone workflow
    // even when the folder uses nothing.
    await panel(() => {
      explained += 1;
    }).open("oat");

    expect(explained).toBe(0);
    expect(__state.webviewPanels).toHaveLength(1);
  });
});

describe("opening the Studio in a multi-root workspace", () => {
  it("opens when any folder uses Themvora", async () => {
    __reset();
    let explained = 0;

    // The Studio shows every folder, so an unrelated first folder must not hide
    // a configured second one.
    await createStudioPanel({
      extensionUri: Uri.file("/extension"),
      roots: () => [
        { name: "cpp", inspection: EMPTY },
        { name: "app", inspection: CONFIGURED },
      ] as never,
      client: createThemvoraClient(),
      save: async () => ({ ok: false, reason: "cancelled" }) as never,
      applyPatch: async () => ({ ok: false, reason: "cancelled" }) as never,
      preview: { openThemes: async () => undefined },
      studioAppearance: memoryAppearance(),
      drafts: createDraftRegistry(),
      onUnconfigured: () => {
        explained += 1;
      },
    }).open();

    expect(explained).toBe(0);
    expect(__state.webviewPanels).toHaveLength(1);
  });
});
