/**
 * Source navigation from the Studio.
 *
 * The webview may name a file and a position; the host must open only paths the
 * inspection actually produced, and must never turn a missing position into a
 * guessed line. The stub records `showTextDocument`, so these assertions cover
 * the real message handler rather than a re-implementation.
 */
import { generateTheme } from "@themvora/core";
import { beforeEach, describe, expect, it } from "vitest";

import { createStudioPanel } from "../src/adapters/studioPanel";
import { createThemvoraClient } from "../src/services/coreClient";
import { memoryAppearance } from "./stubs/studioAppearance";
import { createDraftRegistry } from "../src/services/draftRegistry";
import { __reset, __state, Uri } from "./stubs/vscode";

const PAIR = generateTheme({ seed: "#0ea5e9", family: "ocean" });
const REGISTRY = "src/theme.ts";
const CONSUMER = "src/main.tsx";

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** The Studio over a project with one registered theme pair. */
async function studio() {
  const panel = createStudioPanel({
    extensionUri: Uri.file("/extension"),
    roots: () => [
      {
        name: "app",
        inspection: {
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
                {
                  name: PAIR.light.name,
                  mode: "light",
                  binding: "oceanLight",
                  origin: "definition",
                  location: { line: 2, column: 23 },
                },
                {
                  name: PAIR.dark.name,
                  mode: "dark",
                  binding: "oceanDark",
                  origin: "definition",
                  location: { line: 3, column: 22 },
                },
              ],
            },
          ],
          providers: [
            {
              path: CONSUMER,
              names: ["oceanLight", "oceanDark"],
              integration: "react",
              api: "ThemeProvider",
              input: "static",
              evidence: "registered",
              resolution: "resolved",
              location: { line: 4, column: 4 },
            },
          ],
          relationships: [
            {
              name: PAIR.light.name,
              definedIn: REGISTRY,
              mode: "light",
              family: "ocean",
              usedBy: [CONSUMER],
              evidence: "registered",
            },
            {
              name: PAIR.dark.name,
              definedIn: REGISTRY,
              mode: "dark",
              family: "ocean",
              usedBy: [CONSUMER],
              evidence: "registered",
            },
          ],
        },
      },
    ] as never,
    client: createThemvoraClient(),
    save: async () => ({ ok: false, reason: "cancelled" }) as never,
    applyPatch: async () => ({ ok: true, path: "/app/patched.ts" }) as never,
    preview: { openThemes: async () => undefined },
    studioAppearance: memoryAppearance(),
    drafts: createDraftRegistry(),
  });

  await panel.open();
  const webview = __state.webviewPanels[0]!;
  const send = (message: unknown): void => {
    for (const handler of webview.messageHandlers) handler(message);
  };

  return { panel, send, webview };
}

/** The last state the panel posted. */
function lastState(webview: { posted: unknown[] }): {
  state: {
    selected: {
      evidence?: string;
      binding?: string;
      location?: { line: number; column: number };
      usedBy?: readonly string[];
      source?: string;
    };
  };
} {
  return webview.posted.at(-1) as never;
}

beforeEach(() => {
  __reset();
});

describe("selecting a source theme", () => {
  it("sends the binding, location and evidence to the Details inspector", async () => {
    const { panel, send, webview } = await studio();

    send({ type: "selectProject", path: REGISTRY, name: PAIR.light.name });
    await flush();

    const selected = lastState(webview).state.selected;
    expect(selected).toMatchObject({
      source: REGISTRY,
      evidence: "registered",
      binding: "oceanLight",
      location: { line: 2, column: 23 },
      usedBy: [CONSUMER],
    });

    panel.dispose();
  });
});

describe("opening a source", () => {
  it("opens the file at the reported position", async () => {
    const { panel, send } = await studio();

    send({ type: "open", path: REGISTRY, line: 2, column: 23 });
    await flush();

    expect(__state.openedDocuments).toHaveLength(1);
    expect(__state.openedDocuments[0]?.path.endsWith("src/theme.ts")).toBe(true);
    // The editor API is 0-based; the inspection is 1-based.
    expect(__state.openedDocuments[0]).toMatchObject({ line: 1, column: 22 });

    panel.dispose();
  });

  it("opens the file with no selection when no position is known", async () => {
    const { panel, send } = await studio();

    send({ type: "open", path: REGISTRY });
    await flush();

    expect(__state.openedDocuments).toHaveLength(1);
    expect(__state.openedDocuments[0]?.line).toBeUndefined();
    expect(__state.openedDocuments[0]?.column).toBeUndefined();

    panel.dispose();
  });

  it("does not turn a non-positive line into a selection", async () => {
    const { panel, send } = await studio();

    send({ type: "open", path: REGISTRY, line: 0, column: 5 });
    await flush();

    expect(__state.openedDocuments[0]?.line).toBeUndefined();

    panel.dispose();
  });

  it("refuses traversal and unknown paths", async () => {
    const { panel, send } = await studio();

    send({ type: "open", path: "../secret.ts", line: 1 });
    send({ type: "open", path: "/etc/passwd" });
    send({ type: "open", path: "src/unknown.ts" });
    send({ type: "open", path: "src\\theme.ts" });
    await flush();

    expect(__state.openedDocuments).toEqual([]);

    panel.dispose();
  });

  it("opens a consumer file, which the inspection also produced", async () => {
    const { panel, send } = await studio();

    send({ type: "open", path: CONSUMER, line: 4, column: 4 });
    await flush();

    expect(__state.openedDocuments).toHaveLength(1);
    expect(__state.openedDocuments[0]?.path.endsWith("src/main.tsx")).toBe(true);

    panel.dispose();
  });
});
