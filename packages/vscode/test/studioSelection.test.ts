/**
 * Selecting a project theme must select *that* theme.
 *
 * A registry file routinely holds several families. Treating the whole file as
 * the selection made the preview render whichever light theme came first, so
 * clicking `berry-light` in a file that also defines `rose` showed rose.
 */

import { getPresetThemes } from "@themvora/core";
import { beforeEach, describe, expect, it } from "vitest";

import { createStudioPanel } from "../src/adapters/studioPanel";
import { createThemvoraClient } from "../src/services/coreClient";
import { memoryAppearance } from "./stubs/studioAppearance";
import { createDraftRegistry } from "../src/services/draftRegistry";
import { __reset, __state, Uri } from "./stubs/vscode";

// Two real families with real names, as a registry file would hold them.
const PRESETS = getPresetThemes();
const ROSE = PRESETS.filter((theme) => theme.meta?.family === "oat");
const BERRY = PRESETS.filter((theme) => theme.meta?.family === "berry");

const REGISTRY = "src/theme/theme.config.ts";

/** Every `openThemes` call the panel made. */
const opened: { names: string[]; label: string }[] = [];

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** The Studio over a project whose single registry holds two families. */
async function studio() {
  const panel = createStudioPanel({
    extensionUri: Uri.file("/extension"),
    roots: () =>
      [
        {
          name: "app",
          inspection: {
            root: "/app",
            status: "themes detected",
            registries: [
              {
                kind: "theme-module",
                path: REGISTRY,
                status: "ok",
                themes: [...ROSE, ...BERRY],
              },
            ],
          },
        },
      ] as never,
    client: createThemvoraClient(),
    save: async () => ({ ok: false, reason: "cancelled" }) as never,
    applyPatch: async () => ({ ok: true, path: "/app/patched.ts" }) as never,
    preview: {
      openThemes: async (themes, label) => {
        opened.push({ names: themes.map((theme) => theme.name), label });
      },
    },
    studioAppearance: memoryAppearance(),
    drafts: createDraftRegistry(),
  });

  await panel.open();
  const webview = __state.webviewPanels[0]!;
  const send = (message: unknown): void => {
    for (const handler of webview.messageHandlers) handler(message);
  };

  return { panel, send };
}

describe("selecting a project theme", () => {
  beforeEach(() => {
    __reset();
    opened.length = 0;
  });

  it("selects only the clicked theme's family, not the whole file", async () => {
    const { panel, send } = await studio();

    send({ type: "selectProject", path: REGISTRY, name: "berry-light" });
    await flush();

    const state = __state.webviewPanels[0]!.posted.at(-1) as {
      state: { selected: { name: string; variants: { name: string }[] } };
    };

    expect(state.state.selected.name).toBe("berry-light");
    // Both variants come from berry, not from rose.
    expect(state.state.selected.variants.map((variant) => variant.name)).toEqual(
      BERRY.map((theme) => theme.name),
    );

    panel.dispose();
  });

  it("counts a family discovered in two files once", async () => {
    // A presets module and the theme module that re-exports it both resolve the
    // same family; listing both would double the library and the count.
    const panel = createStudioPanel({
      extensionUri: Uri.file("/extension"),
      roots: () =>
        [
          {
            name: "app",
            inspection: {
              root: "/app",
              status: "themes detected",
              registries: [
                { kind: "theme-module", path: "src/theme/theme.config.ts", status: "ok", themes: [...BERRY] },
                { kind: "theme-module", path: "src/theme/presets.ts", status: "ok", themes: [...BERRY] },
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
    const state = __state.webviewPanels[0]!.posted.at(-1) as {
      state: { themes: { name: string }[]; project: { themeCount: number } };
    };

    expect(state.state.themes.map((theme) => theme.name)).toEqual(BERRY.map((theme) => theme.name));
    expect(state.state.project.themeCount).toBe(BERRY.length);

    panel.dispose();
  });

  it("selecting a preset does not change project registration evidence", async () => {
    const { panel, send } = await studio();
    const webview = __state.webviewPanels[0]!;
    const before = (webview.posted.at(-1) as {
      state: { sources: unknown; themes: unknown };
    }).state;

    send({ type: "selectPreset", id: "oat" });
    await flush();

    const after = (webview.posted.at(-1) as {
      state: {
        selected: { origin?: string; evidence?: string; usedBy?: readonly string[] };
        sources: unknown;
        themes: unknown;
      };
    }).state;

    expect(after.selected.origin).toBe("preset");
    expect(after.selected.evidence).toBeUndefined();
    expect(after.selected.usedBy).toBeUndefined();
    // A catalog preview does not rewrite the project's source/consumer facts.
    expect(after.sources).toEqual(before.sources);
    expect(after.themes).toEqual(before.themes);

    panel.dispose();
  });

  it("previews the clicked theme rather than the first in the file", async () => {
    const { panel, send } = await studio();

    send({ type: "selectProject", path: REGISTRY, name: "berry-dark" });
    await flush();
    send({ type: "preview" });
    await flush();

    expect(opened.at(-1)?.names).toEqual(BERRY.map((theme) => theme.name));

    panel.dispose();
  });
});
