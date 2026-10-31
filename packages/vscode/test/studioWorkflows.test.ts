/**
 * Studio workflows through the host.
 *
 * These exercise the real message handler: Create/Define drafts, preset → draft,
 * save-then-rediscover, and the project metadata that must follow a mode switch.
 */
import { generateTheme } from "@themvora/core";
import { beforeEach, describe, expect, it } from "vitest";

import { createStudioPanel } from "../src/adapters/studioPanel";
import type { ProjectProfile } from "../src/domain/projectProfile";
import type { ProjectInspection } from "../src/domain/registry";
import { createThemvoraClient } from "../src/services/coreClient";
import { memoryAppearance } from "./stubs/studioAppearance";
import { createDraftRegistry } from "../src/services/draftRegistry";
import { __reset, __state, Uri } from "./stubs/vscode";

const PAIR = generateTheme({ seed: "#0ea5e9", family: "ocean" });
const REGISTRY = "src/theme.ts";
const CONSUMER = "src/main.tsx";

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
  };
}

interface PostedSelection {
  readonly name: string;
  readonly origin: string;
  readonly source?: string;
  readonly family?: string;
  readonly saved: boolean;
  readonly valid: boolean;
  readonly producingApi?: string;
  readonly draftKind?: string;
  readonly draftSource?: string;
  readonly draftInputs?: {
    readonly seed?: string;
    readonly family?: string;
    readonly style?: string;
    readonly withCode?: boolean;
  };
  readonly binding?: string;
  readonly evidence?: string;
  readonly location?: { readonly line: number };
  readonly usedBy?: readonly string[];
  readonly tokens?: readonly { readonly name: string; readonly value: string }[];
  readonly variants?: readonly {
    readonly mode: string;
    readonly tokens: readonly { readonly name: string; readonly value: string }[];
  }[];
  readonly editor?: {
    readonly editable: boolean;
    readonly customized: boolean;
    readonly changedTokens: number;
    readonly totalTokens: number;
    readonly groups: readonly {
      readonly id: string;
      readonly tokens: readonly {
        readonly path: readonly string[];
        readonly value?: string;
        readonly original?: string;
        readonly changed: boolean;
      }[];
    }[];
  };
}

interface PostedState {
  readonly project: {
    readonly name: string;
    readonly framework: string;
    readonly packageManager: string;
  };
  readonly selected: PostedSelection;
  readonly themes: readonly { readonly name: string }[];
  readonly sources: readonly { readonly path: string }[];
  readonly styles: readonly string[];
  readonly notice?: { readonly text: string };
}

async function studio(profileFor?: (root: string) => Promise<ProjectProfile>) {
  const saves: { names: string[]; format: string }[] = [];
  let refreshes = 0;

  const panel = createStudioPanel({
    extensionUri: Uri.file("/extension"),
    roots: () => [{ name: "app", inspection: project() }] as never,
    ...(profileFor === undefined ? {} : { profileFor }),
    client: createThemvoraClient(),
    save: async (themes, options) => {
      saves.push({ names: themes.map((theme) => theme.name), format: options.format });
      return { ok: true, path: "/app/new.ts" };
    },
    applyPatch: async () => ({ ok: true, path: "/app/patched.ts" }) as never,
    refresh: async () => {
      refreshes += 1;
    },
    preview: { openThemes: async () => undefined },
    studioAppearance: memoryAppearance(),
    drafts: createDraftRegistry(),
  });

  await panel.open();
  const webview = __state.webviewPanels[0]!;
  const send = (message: unknown): void => {
    for (const handler of webview.messageHandlers) handler(message);
  };
  const state = (): PostedState => {
    const posted = [...webview.posted]
      .reverse()
      .find((message) => (message as { type?: unknown }).type === "state");
    return (posted as { state: PostedState }).state;
  };
  const messages = (): unknown[] => webview.posted;

  return { panel, send, state, messages, saves, refreshes: () => refreshes };
}

/** One live-preview reply. */
interface PostedPreview {
  readonly type: "draftPreview";
  readonly requestId: number;
  readonly result:
    | {
        readonly ok: true;
        readonly preview: {
          readonly name: string;
          readonly modes: readonly string[];
          readonly valid: boolean;
          readonly tokens: readonly { readonly name: string }[];
          readonly variants: readonly { readonly mode: string }[];
        };
      }
    | { readonly ok: false; readonly message: string };
}

/**
 * The last draft-preview message.
 *
 * @param messages - Every posted message.
 * @returns The reply, or undefined.
 */
function lastPreview(messages: readonly unknown[]): PostedPreview | undefined {
  return [...messages].reverse().find(
    (message): message is PostedPreview =>
      typeof message === "object" &&
      message !== null &&
      (message as { type?: unknown }).type === "draftPreview",
  );
}

beforeEach(() => {
  __reset();
});

describe("Project context", () => {
  it("reports the detected framework and package manager", async () => {
    const { state } = await studio(async () => ({
      framework: "react",
      frameworkEvidence: "@themvora/react is declared",
      packageManager: "pnpm",
      packageManagerEvidence: "pnpm-lock.yaml is present",
      packages: [],
    }));

    expect(state().project).toMatchObject({
      name: "app",
      framework: "React",
      packageManager: "pnpm",
    });
  });

  it("says Unknown rather than guessing when no profile is available", async () => {
    const { state } = await studio();
    expect(state().project.framework).toBe("Unknown");
    expect(state().project.packageManager).toBe("unknown");
  });
});

describe("Live generation preview", () => {
  it("resolves and validates a pair without installing a draft", async () => {
    const { send, state, messages } = await studio();
    const before = state();

    send({
      type: "previewGenerate",
      requestId: 12,
      seed: "#0ea5e9",
      kind: "generate",
      family: "ocean",
    });
    await flush();
    await flush();

    const reply = lastPreview(messages());
    expect(reply?.requestId).toBe(12);
    if (reply?.result.ok !== true) throw new Error("expected a preview");
    expect(reply.result.preview.valid).toBe(true);
    expect(reply.result.preview.modes).toEqual(["light", "dark"]);
    expect(reply.result.preview.tokens.length).toBeGreaterThan(0);
    expect(reply.result.preview.variants.map((variant) => variant.mode)).toEqual([
      "light",
      "dark",
    ]);
    // Previewing is read-only: the current selection and draft did not change.
    expect(state()).toEqual(before);
  });

  it("returns a clear failure for an invalid seed", async () => {
    const { send, messages } = await studio();

    send({ type: "previewGenerate", requestId: 4, seed: "blue", kind: "define" });
    await flush();

    const reply = lastPreview(messages());
    expect(reply?.requestId).toBe(4);
    expect(reply?.result.ok).toBe(false);
    if (reply?.result.ok === false) expect(reply.result.message).toContain("seed");
  });
});

describe("Draft origins", () => {
  it("starts a define draft from a preset id", async () => {
    const { send, state } = await studio();
    const before = state();

    send({ type: "draftFromPresetId", id: "oat" });
    await flush();
    await flush();

    expect(state().selected).toMatchObject({
      origin: "draft",
      draftKind: "define",
      saved: false,
    });
    expect(state().selected.draftSource?.startsWith("Preset · ")).toBe(true);
    expect(state().themes).toEqual(before.themes);
  });

  it("starts a define draft from an existing project theme", async () => {
    const { send, state } = await studio();

    send({ type: "draftFromTheme", path: REGISTRY, name: PAIR.light.name });
    await flush();
    await flush();

    expect(state().selected).toMatchObject({
      origin: "draft",
      name: PAIR.light.name,
      draftKind: "define",
      draftSource: "Project · ocean",
      saved: false,
    });
    expect(state().selected.source).toBeUndefined();
    // The original theme and its registration are unchanged.
    expect(state().themes).toHaveLength(2);
  });
});

describe("Draft token editing", () => {
  /**
   * Generate a draft and return its before-state.
   *
   * @returns The harness and the original token values.
   */
  async function generatedDraft() {
    const harness = await studio();
    harness.send({ type: "generate", seed: "#0ea5e9", kind: "generate", family: "ocean" });
    await flush();
    await flush();

    const primary = harness.state().selected.tokens?.find((token) => token.name === "primary");
    const darkPrimary = harness
      .state()
      .selected.variants?.find((variant) => variant.mode === "dark")
      ?.tokens.find((token) => token.name === "primary");
    return { ...harness, primary: primary?.value, darkPrimary: darkPrimary?.value };
  }

  it("edits only the selected variant and reports the change", async () => {
    const { send, state, primary, darkPrimary } = await generatedDraft();

    send({ type: "editToken", path: ["colors", "primary"], value: "#112233" });
    await flush();
    await flush();

    const selected = state().selected;
    expect(selected.tokens?.find((token) => token.name === "primary")?.value).toBe("#112233");
    expect(selected.editor).toMatchObject({ editable: true, customized: true, changedTokens: 1 });
    expect(
      selected.variants?.find((variant) => variant.mode === "dark")?.tokens.find((token) => token.name === "primary")
        ?.value,
    ).toBe(darkPrimary);
    expect(primary).toBeDefined();
  });

  it("resets one token, one group and the whole draft to their baselines", async () => {
    const { send, state, primary } = await generatedDraft();

    send({ type: "editToken", path: ["colors", "primary"], value: "#112233" });
    await flush();
    send({ type: "editToken", path: ["colors", "secondary"], value: "#334455" });
    await flush();
    await flush();
    expect(state().selected.editor?.changedTokens).toBe(2);

    send({ type: "resetToken", path: ["colors", "primary"] });
    await flush();
    await flush();
    expect(state().selected.tokens?.find((token) => token.name === "primary")?.value).toBe(primary);
    expect(state().selected.editor?.changedTokens).toBe(1);

    send({ type: "resetGroup", group: "actions" });
    await flush();
    await flush();
    expect(state().selected.editor?.changedTokens).toBe(0);
    expect(state().selected.editor?.customized).toBe(false);

    send({ type: "editToken", path: ["colors", "primary"], value: "#112233" });
    await flush();
    await flush();
    send({ type: "resetDraft" });
    await flush();
    await flush();
    expect(state().selected.tokens?.find((token) => token.name === "primary")?.value).toBe(primary);
    expect(state().selected.editor).toMatchObject({ customized: false, changedTokens: 0 });
  });

  it("refuses a missing path and an empty value", async () => {
    const { send, state, primary } = await generatedDraft();

    send({ type: "editToken", path: ["colors", "notThere"], value: "#ffffff" });
    await flush();
    send({ type: "editToken", path: ["colors", "primary"], value: "" });
    await flush();
    await flush();
    expect(state().selected.editor?.changedTokens).toBe(0);
    expect(state().selected.tokens?.find((token) => token.name === "primary")?.value).toBe(primary);
  });

  it("does not edit a project selection", async () => {
    const { send, state } = await studio();
    send({ type: "selectProject", path: REGISTRY, name: PAIR.light.name });
    await flush();
    const before = state().selected.tokens?.find((token) => token.name === "primary")?.value;

    send({ type: "editToken", path: ["colors", "primary"], value: "#112233" });
    await flush();
    await flush();

    expect(state().selected.tokens?.find((token) => token.name === "primary")?.value).toBe(before);
    expect(state().selected.editor?.editable).toBe(false);
  });
});

describe("Create workflows", () => {
  it("generates a define draft with the requested inputs", async () => {
    const { panel, send, state } = await studio();
    const before = state();

    send({
      type: "generate",
      seed: "#0f172a",
      kind: "define",
      family: "brand",
      style: "vibrant",
      withCode: true,
    });
    await flush();

    const selected = state().selected;
    expect(selected).toMatchObject({
      origin: "draft",
      draftKind: "define",
      draftInputs: {
        seed: "#0f172a",
        family: "brand",
        style: "vibrant",
        withCode: true,
      },
      producingApi: "generated",
      saved: false,
      valid: true,
    });
    expect(selected.name.startsWith("brand-")).toBe(true);
    expect(state().styles).toContain("vibrant");
    // A draft is not a project theme.
    expect(state().themes).toEqual(before.themes);
    expect(state().sources).toEqual(before.sources);

    panel.dispose();
  });

  it("creates a define draft from a preset without adding it to the project", async () => {
    const { panel, send, state } = await studio();
    const before = state();

    send({ type: "selectPreset", id: "oat" });
    await flush();
    expect(state().selected.origin).toBe("preset");

    send({ type: "draftFromPreset" });
    await flush();

    expect(state().selected).toMatchObject({
      origin: "draft",
      draftKind: "define",
      draftSource: "Preset · oat",
      producingApi: "catalog",
      saved: false,
    });
    expect(state().selected.evidence).toBeUndefined();
    expect(state().selected.usedBy).toBeUndefined();
    expect(state().themes).toEqual(before.themes);
    expect(state().sources).toEqual(before.sources);

    panel.dispose();
  });

  it("saves a draft and re-runs discovery", async () => {
    const { panel, send, state, saves, refreshes } = await studio();

    send({ type: "generate", seed: "#0f172a", kind: "generate" });
    await flush();

    __state.saveDialog = Uri.file("/app/new.ts");
    send({ type: "save", format: "ts", fileName: "new.ts", destination: "choose" });
    await flush();

    expect(saves).toHaveLength(1);
    expect(saves[0]?.format).toBe("ts");
    expect(saves[0]?.names).toHaveLength(2);
    expect(refreshes()).toBe(1);
    expect(state().selected.saved).toBe(true);
    expect(state().notice?.text).toContain("re-scanned");

    panel.dispose();
  });
});

describe("Inspect workflows", () => {
  it("exposes an invalid theme's issues instead of a preview-ready theme", async () => {
    const broken = {
      name: "broken-light",
      meta: { mode: "light" },
      tokens: { colors: {} },
    };
    const inspection: ProjectInspection = {
      ...project(),
      registries: [
        {
          kind: "theme-module",
          path: "src/broken.ts",
          status: "supported",
          detail: "broken",
          themes: [broken as never],
          themeSources: [{ name: broken.name, mode: "light", binding: "broken" }],
        },
      ],
      relationships: [],
      providers: [],
    };

    const panel = createStudioPanel({
      extensionUri: Uri.file("/extension"),
      roots: () => [{ name: "app", inspection }] as never,
      client: createThemvoraClient(),
      save: async () => ({ ok: false, reason: "cancelled" }),
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

    send({ type: "selectProject", path: "src/broken.ts", name: "broken-light" });
    await flush();

    const selected = (webview.posted.at(-1) as { state: PostedState }).state.selected as {
      valid?: boolean;
      issues?: readonly { message: string }[];
    };
    expect(selected.valid).toBe(false);
    expect(selected.issues?.length).toBeGreaterThan(0);
    expect(selected.issues?.[0]?.message).toContain("Missing token");

    panel.dispose();
  });

  it("follows the selected mode's source binding", async () => {
    const { panel, send, state } = await studio();

    send({ type: "selectProject", path: REGISTRY, name: PAIR.light.name });
    await flush();
    expect(state().selected).toMatchObject({
      binding: "oceanLight",
      evidence: "registered",
      location: { line: 2 },
      usedBy: [CONSUMER],
    });

    send({ type: "setMode", mode: "dark" });
    await flush();

    expect(state().selected).toMatchObject({
      name: PAIR.dark.name,
      binding: "oceanDark",
      evidence: "registered",
      location: { line: 3 },
      usedBy: [CONSUMER],
    });

    panel.dispose();
  });
});
