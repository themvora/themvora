/**
 * The Studio appearance preference, end to end through the host.
 *
 * The webview only applies the mode to its own DOM; the host is what makes the
 * choice outlive the panel. These tests cover the two halves that matter: the
 * mode written into the next document, and the mode persisted when the webview
 * reports a change. They also pin the separation the feature promises — changing
 * how the Studio looks must not touch which theme is selected.
 */
import { generateTheme } from "@themvora/core";
import { beforeEach, describe, expect, it } from "vitest";

import { createStudioPanel } from "../src/adapters/studioPanel";
import type { ProjectInspection } from "../src/domain/registry";
import { createThemvoraClient } from "../src/services/coreClient";
import { memoryAppearance, type MemoryAppearance } from "./stubs/studioAppearance";
import { createDraftRegistry } from "../src/services/draftRegistry";
import { __reset, __state, Uri } from "./stubs/vscode";

const PAIR = generateTheme({ seed: "#0ea5e9", family: "ocean" });
const REGISTRY = "src/theme.ts";

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** A project with one registered pair. */
function project(): ProjectInspection {
  return {
    root: "/app",
    status: "supported",
    packages: [],
    notes: [],
    registries: [
      {
        kind: "theme-module",
        path: REGISTRY,
        status: "supported",
        detail: `${REGISTRY} — 2 themes.`,
        themes: [PAIR.light, PAIR.dark],
        themeSources: [
          { name: PAIR.light.name, mode: "light", binding: "oceanLight" },
          { name: PAIR.dark.name, mode: "dark", binding: "oceanDark" },
        ],
      },
    ],
    relationships: [],
    providers: [],
  } as never;
}

/** Open a Studio over the fixture project with a given stored appearance. */
async function studio(initial?: Parameters<typeof memoryAppearance>[0]) {
  const appearance: MemoryAppearance = memoryAppearance(initial);
  const panel = createStudioPanel({
    extensionUri: Uri.file("/extension"),
    roots: () => [{ name: "app", inspection: project() }] as never,
    client: createThemvoraClient(),
    save: async () => ({ ok: false, reason: "cancelled" }) as never,
    applyPatch: async () => ({ ok: true, path: "/app/patched.ts" }) as never,
    preview: { openThemes: async () => undefined },
    studioAppearance: appearance,
    drafts: createDraftRegistry(),
  });

  await panel.open();
  const webview = __state.webviewPanels.at(-1)!;
  const send = (message: unknown): void => {
    for (const handler of webview.messageHandlers) handler(message);
  };

  return { panel, webview, send, appearance };
}

describe("Studio appearance persistence", () => {
  beforeEach(() => {
    __reset();
  });

  it("defaults to auto", async () => {
    const { webview, appearance } = await studio();
    expect(appearance.current()).toBe("auto");
    expect(webview.html).toContain('data-studio-appearance="auto"');
  });

  it("writes the stored mode into the document before the bundle runs", async () => {
    // This is what prevents a light flash when the Studio is forced dark under
    // a light workbench: the attribute is in the HTML, not set after mount.
    const dark = await studio("dark");
    expect(dark.webview.html).toContain('data-studio-appearance="dark"');

    __reset();
    const light = await studio("light");
    expect(light.webview.html).toContain('data-studio-appearance="light"');
  });

  it("persists the mode the webview reports", async () => {
    const { send, appearance } = await studio();
    send({ type: "setStudioAppearance", appearance: "dark" });
    await flush();
    expect(appearance.current()).toBe("dark");
  });

  it("ignores an unknown mode instead of storing it", async () => {
    const { send, appearance } = await studio("light");
    send({ type: "setStudioAppearance", appearance: "sepia" });
    send({ type: "setStudioAppearance" });
    await flush();
    expect(appearance.current()).toBe("light");
  });

  it("restores the mode after the panel is disposed and reopened", async () => {
    const { panel, send, appearance } = await studio();
    send({ type: "setStudioAppearance", appearance: "dark" });
    await flush();

    // Closing the Studio disposes the webview, which discards webview state.
    // Global state is why the preference survives this.
    panel.dispose();
    expect(appearance.current()).toBe("dark");

    await panel.open();
    const reopened = __state.webviewPanels.at(-1)!;
    expect(reopened).not.toBe(undefined);
    expect(reopened.html).toContain('data-studio-appearance="dark"');
  });

  it("does not change the selected theme or its mode", async () => {
    const { send, webview } = await studio();
    send({ type: "selectProject", path: REGISTRY, name: PAIR.dark.name });
    await flush();
    const before = (webview.posted.at(-1) as { state: { selected: { name: string; mode: string } } })
      .state.selected;

    send({ type: "setStudioAppearance", appearance: "light" });
    await flush();

    // The appearance intent posts nothing back: it is not a selection change,
    // so the last state is still the selected dark variant.
    const after = (webview.posted.at(-1) as { state: { selected: { name: string; mode: string } } })
      .state.selected;
    expect(after.name).toBe(before.name);
    expect(after.mode).toBe(before.mode);
    expect(after.mode).toBe("dark");
  });
});
