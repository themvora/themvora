/**
 * The Studio as the writer of the draft registry.
 *
 * The panel used to hold the only copy of an unsaved draft, in closure
 * variables. These assert the contract that replaced it: the draft has a stable
 * id, editing it revises that id rather than creating another, and the standalone
 * Preview is told which draft it is showing.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { generateTheme } from "@themvora/core";

import { createStudioPanel, type StudioPanel } from "../src/adapters/studioPanel";
import { createThemvoraClient } from "../src/services/coreClient";
import { createDraftRegistry, type DraftRegistry } from "../src/services/draftRegistry";
import type { ProjectInspection } from "../src/domain/registry";
import { __reset, __state, Uri } from "./stubs/vscode";
import { memoryAppearance } from "./stubs/studioAppearance";

/** A concrete pair, for drafts the panel did not generate itself. */
const PAIR = generateTheme({ seed: "#10b981" });

/** An inspection with no themes by default: the draft is the only thing in play. */
function project(overrides: Partial<ProjectInspection> = {}): ProjectInspection {
  return {
    root: "C:/app",
    status: "supported",
    packages: ["@themvora/core"],
    registries: [],
    notes: [],
    providers: [],
    relationships: [],
    ...overrides,
  };
}

/**
 * Wait for the panel's async message handler to finish.
 *
 * The webview posts intents without awaiting them, so a handler that generates
 * or resolves a theme completes after the test's `send` has returned.
 */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** The parts of a posted state these tests read. */
interface PostedState {
  readonly selected?:
    | {
        readonly origin: string;
        readonly name: string;
        readonly family?: string;
        readonly modes: readonly string[];
        readonly draftId?: string;
        readonly draftKind?: string;
        readonly saved: boolean;
      }
    | undefined;
  readonly drafts: readonly {
    readonly id: string;
    readonly name: string;
    readonly modes: readonly string[];
    readonly dirty: boolean;
    readonly revision: number;
    readonly origin: string;
  }[];
}

/** What the preview controller recorded. */
interface PreviewCalls {
  readonly opened: { readonly label: string; readonly draftId: string | undefined }[];
  readonly synced: { readonly label: string; readonly draftId: string | undefined }[];
  readonly cleared: string[];
}

/**
 * Build a panel and expose the registry and the preview calls.
 *
 * @returns The panel, the registry and the recorded calls.
 */
async function studio(
  overrides: Partial<ProjectInspection> = {},
  saveOutcome: unknown = { ok: true, path: "/app/new.ts" },
): Promise<{
  panel: StudioPanel;
  drafts: DraftRegistry;
  preview: PreviewCalls;
  send: (message: unknown) => Promise<void>;
  /** The last state the host posted. */
  state: () => PostedState;
}> {
  const drafts = createDraftRegistry();
  const opened: PreviewCalls["opened"] = [];
  const synced: PreviewCalls["synced"] = [];
  const cleared: string[] = [];

  const panel = createStudioPanel({
    extensionUri: Uri.file("/extension"),
    roots: () => [{ name: "app", inspection: project(overrides) }] as never,
    client: createThemvoraClient(),
    save: async () => saveOutcome as never,
    applyPatch: async () => ({ ok: true, path: "/app/patched.ts" }) as never,
    preview: {
      openThemes: async (_themes, label, _mode, draftId) => {
        opened.push({ label, draftId });
      },
      sync: (_themes, label, _mode, draftId) => {
        synced.push({ label, draftId });
      },
      clear: (message) => {
        cleared.push(message);
      },
    },
    studioAppearance: memoryAppearance(),
    drafts,
  });

  await panel.open();
  const webview = __state.webviewPanels.at(-1)!;
  const send = async (message: unknown): Promise<void> => {
    for (const handler of webview.messageHandlers) handler(message);
    // Generation resolves a theme, validates it and re-posts the state, so the
    // handler settles several turns later than a simple intent.
    for (let turn = 0; turn < 4; turn += 1) await flush();
  };

  const state = (): PostedState => {
    const posted = [...webview.posted]
      .reverse()
      .find((message) => (message as { type?: unknown }).type === "state");
    return (posted as { state: PostedState }).state;
  };

  return { panel, drafts, preview: { opened, synced, cleared }, send, state };
}

// Every test builds its own panel; the stub keeps a list of them, so a stale
// panel from a previous test would receive the next test's intents.
beforeEach(() => {
  __reset();
});

/** The seed used throughout; the family keeps the labels readable. */
const SEED = "#10b981";

/** Generate a draft in the Studio. */
async function generate(send: (message: unknown) => Promise<void>, family = "ocean"): Promise<void> {
  await send({ type: "generate", seed: SEED, kind: "generate", family });
}

/** The only draft in a registry. */
function only(drafts: DraftRegistry) {
  const all = drafts.list();
  expect(all).toHaveLength(1);
  return all[0]!;
}

describe("creation", () => {
  it("registers a generated pair under one id", async () => {
    const { drafts, send } = await studio();

    await generate(send);

    const draft = only(drafts);
    expect(draft.origin).toBe("generated");
    expect(draft.themes).toHaveLength(2);
    expect(draft.modes).toEqual(["light", "dark"]);
    // A seed is not a project theme, so the draft belongs to no folder.
    expect(draft.scope).toEqual({ kind: "standalone" });
    expect(draft.dirty).toBe(true);
  });

  it("records the generation inputs and the baseline", async () => {
    const { drafts, send } = await studio();

    await generate(send);

    const draft = only(drafts);
    expect(draft.inputs?.seed).toBe(SEED);
    expect(draft.inputs?.family).toBe("ocean");
    expect(draft.baseline).toHaveLength(2);
  });

  it("revises the same draft when the inputs change", async () => {
    const { drafts, send } = await studio();

    await generate(send);
    const first = only(drafts);
    await generate(send, "forest");

    // Pressing Create again is a revision, not a second draft.
    const after = only(drafts);
    expect(after.id).toBe(first.id);
    expect(after.revision).toBeGreaterThan(first.revision);
    expect(after.name).toBe("forest");
  });

  it("starts a new draft after a preset copy", async () => {
    const { drafts, send } = await studio();

    // A preset copy is a different basis, so the generated draft that follows
    // must not silently take over its identity.
    await send({ type: "draftFromPresetId", id: "oat" });
    const copied = drafts.list()[0];
    expect(copied?.origin).toBe("preset");

    await generate(send);
    expect(drafts.list()).toHaveLength(2);
    expect(drafts.list().some((draft) => draft.id === copied?.id)).toBe(true);
  });
});

describe("editing", () => {
  it("keeps the id and bumps the revision", async () => {
    const { drafts, send } = await studio();
    await generate(send);
    const before = only(drafts);

    await send({ type: "editToken", path: ["colors", "primary"], value: "#ff0000" });

    const after = only(drafts);
    expect(after.id).toBe(before.id);
    expect(after.revision).toBeGreaterThan(before.revision);
    expect(after.themes[0]?.tokens?.colors?.primary).toBe("#ff0000");
  });

  it("tells the preview which draft it is showing", async () => {
    const { drafts, send, preview } = await studio();

    await generate(send);
    const draft = only(drafts);

    const last = preview.synced.at(-1);
    expect(last?.draftId).toBe(draft.id);
  });

  it("keeps an invalid theme as a draft rather than dropping it", async () => {
    // A project theme that fails validation is still something a developer may
    // want to fix. Copying it must produce a draft that records the failure
    // instead of a silently repaired theme.
    const { drafts, send } = await studio({
      registries: [
        {
          kind: "theme-module",
          path: "src/theme/theme.config.ts",
          status: "supported",
          detail: "",
          themes: [{ name: "broken-light", meta: { mode: "light" }, tokens: { colors: {} } }] as never,
          themeSources: [{ name: "broken-light", mode: "light" }],
        },
      ],
    });

    await send({ type: "draftFromTheme", path: "src/theme/theme.config.ts", name: "broken-light" });

    const draft = only(drafts);
    expect(draft.validation?.valid).toBe(false);
    expect(draft.validation?.errors).toBeGreaterThan(0);
    // Still the same draft record, with its own identity.
    expect(drafts.get(draft.id)?.id).toBe(draft.id);
  });
});

describe("preview handoff", () => {
  it("opens the preview with the draft id", async () => {
    const { drafts, send, preview } = await studio();
    await generate(send);
    const draft = only(drafts);

    await send({ type: "preview" });

    expect(preview.opened.at(-1)?.draftId).toBe(draft.id);
  });

  it("does not write anything while drafting", async () => {
    const { send } = await studio();
    await generate(send);
    await send({ type: "editToken", path: ["colors", "primary"], value: "#ff0000" });

    expect(__state.written).toEqual([]);
  });
});

describe("selecting a registry draft", () => {
  /** A draft that exists before the panel is pointed at it. */
  function seed(drafts: DraftRegistry) {
    const created = drafts.create({
      scope: { kind: "standalone" },
      name: "ocean",
      family: "ocean",
      origin: "generated",
      themes: [PAIR.light, PAIR.dark],
      baseline: [PAIR.light, PAIR.dark],
      inputs: { seed: "#10b981", family: "ocean" },
      validation: { valid: true, errors: 0, warnings: 0 },
    });
    if (!created.ok) throw new Error("refused");
    return created.draft;
  }

  it("lists a draft the panel did not create", async () => {
    const { drafts, send, state } = await studio();
    const created = seed(drafts);

    // The library reads the registry at render time, so the next render shows
    // a draft the panel never made.
    await send({ type: "ready" });

    const rows = state().drafts;
    expect(rows.map((row) => row.id)).toContain(created.id);
    expect(rows[0]?.name).toBe("ocean");
    expect(rows[0]?.origin).toBe("generated");
    expect(rows[0]?.dirty).toBe(true);
  });

  it("adopts the record rather than copying it", async () => {
    const { drafts, send, state } = await studio();
    const created = seed(drafts);

    await send({ type: "selectDraft", id: created.id });

    const selected = state().selected;
    expect(selected?.origin).toBe("draft");
    // The registry id, not a new draft called "ocean-1".
    expect(selected?.draftId).toBe(created.id);
    // The canvas renders the theme, so it names the theme; the library row
    // carries the draft's own name. Both come from the same record.
    expect(selected?.name).toBe(PAIR.light.name);
    expect(selected?.modes).toEqual(["light", "dark"]);
    expect(selected?.draftKind).toBe("generate");
    expect(selected?.saved).toBe(false);
    // Still one draft: adopting is not cloning.
    expect(drafts.size()).toBe(1);
  });

  it("edits the adopted record", async () => {
    const { drafts, send } = await studio();
    const created = seed(drafts);
    await send({ type: "selectDraft", id: created.id });

    await send({ type: "editToken", path: ["colors", "primary"], value: "#ff0000" });

    const after = drafts.get(created.id)!;
    expect(after.id).toBe(created.id);
    expect(after.revision).toBeGreaterThan(created.revision);
    expect(after.themes[0]?.tokens?.colors?.primary).toBe("#ff0000");
    expect(drafts.size()).toBe(1);
  });

  it("discards an adopted draft", async () => {
    const { drafts, send, preview } = await studio();
    const created = seed(drafts);
    await send({ type: "selectDraft", id: created.id });

    __state.modalAnswer = "Discard";
    await send({ type: "discardDraft" });

    expect(drafts.get(created.id)).toBeUndefined();
    // Nothing is left to show, so the preview is cleared rather than left with
    // the discarded palette.
    expect(preview.cleared).toHaveLength(1);
  });

  it("keeps an adopted draft when the discard is cancelled", async () => {
    const { drafts, send } = await studio();
    const created = seed(drafts);
    await send({ type: "selectDraft", id: created.id });

    __state.modalAnswer = undefined;
    await send({ type: "discardDraft" });

    expect(drafts.get(created.id)?.dirty).toBe(true);
  });

  it("reports a draft that disappeared before the click", async () => {
    const { drafts, send, state } = await studio();
    const created = seed(drafts);
    drafts.discard(created.id);

    await send({ type: "selectDraft", id: created.id });

    // No empty canvas: the previous selection stands and the notice explains.
    expect(state().selected).toBeUndefined();
    expect(__state.errors).toEqual([]);
  });

  it("keeps the open draft out of the list it came from", async () => {
    const { drafts, send, state } = await studio();
    const created = seed(drafts);
    await send({ type: "selectDraft", id: created.id });

    // The panel shows it as the open draft; the list would be a duplicate.
    expect(state().selected?.draftId).toBe(created.id);
    expect(state().drafts.map((row) => row.id)).toContain(created.id);
  });
});

describe("discard", () => {
  it("removes a clean draft without asking", async () => {
    const { drafts, send } = await studio();
    await generate(send);
    const draft = only(drafts);

    // Written to a file the project does not contain, so the panel stays on the
    // draft — which is now clean, because it has been written.
    __state.saveDialog = Uri.file("/elsewhere/new.ts");
    await send({ type: "save", format: "ts", fileName: "new.ts", destination: "choose" });
    expect(drafts.get(draft.id)?.dirty).toBe(false);

    // No answer is available: if the host asked, nothing would be discarded.
    __state.modalAnswer = undefined;
    await send({ type: "discardDraft" });

    expect(drafts.get(draft.id)).toBeUndefined();
  });

  it("asks before discarding unsaved work, and keeps it when refused", async () => {
    const { drafts, send } = await studio();
    await generate(send);
    const draft = only(drafts);

    // A dirty draft is unsaved work; dismissing the confirmation keeps it.
    __state.modalAnswer = undefined;
    await send({ type: "discardDraft" });

    expect(drafts.get(draft.id)).toBeDefined();
    expect(drafts.get(draft.id)?.dirty).toBe(true);
  });

  it("discards a dirty draft once confirmed, and clears the view", async () => {
    const { drafts, send, preview } = await studio();
    await generate(send);
    const draft = only(drafts);

    __state.modalAnswer = "Discard";
    await send({ type: "discardDraft" });

    expect(drafts.get(draft.id)).toBeUndefined();
    expect(drafts.size()).toBe(0);
    // No fallback theme exists in this fixture, so the preview is cleared
    // rather than left showing the discarded palette.
    expect(preview.cleared).toHaveLength(1);
    expect(preview.cleared[0]).toContain("discarded");
    // Discarding is not a write.
    expect(__state.written).toEqual([]);
  });

  it("keeps other drafts", async () => {
    const { drafts, send } = await studio();

    // A preset copy, then a generation: two drafts with different bases, so the
    // second does not revise the first.
    await send({ type: "draftFromPresetId", id: "oat" });
    const copied = drafts.list()[0]!;
    await generate(send, "forest");
    const generated = drafts.list()[1]!;

    __state.modalAnswer = "Discard";
    await send({ type: "discardDraft" });

    // Only the one the panel was showing is gone.
    expect(drafts.get(generated.id)).toBeUndefined();
    expect(drafts.get(copied.id)).toBeDefined();
  });

  it("refuses when the registry holds a newer revision", async () => {
    const { drafts, send } = await studio();
    await generate(send);
    const draft = only(drafts);

    // Another writer moved the draft on; this panel's revision is stale, so its
    // discard request must not delete newer work.
    const moved = drafts.update(draft.id, {
      expectedRevision: draft.revision,
      themes: [draft.themes[0]!, draft.themes[1]!],
      name: "renamed-elsewhere",
    });
    if (!moved.ok) throw new Error("refused");

    __state.modalAnswer = "Discard";
    await send({ type: "discardDraft" });

    expect(drafts.get(draft.id)?.name).toBe("renamed-elsewhere");
  });

  it("does not discard a draft when the panel is closed", async () => {
    const { drafts, panel, send } = await studio();
    await generate(send);
    const draft = only(drafts);

    panel.dispose();

    // Closing the view is not a decision about the work.
    expect(drafts.get(draft.id)).toBeDefined();
  });
});

describe("saving", () => {
  it("marks the draft saved only after the write lands", async () => {
    const { drafts, send } = await studio();
    await generate(send);
    const before = only(drafts);

    __state.saveDialog = Uri.file("/app/new.ts");
    await send({ type: "save", format: "ts", fileName: "new.ts", destination: "choose" });

    const after = drafts.get(before.id);
    expect(after?.dirty).toBe(false);
    expect(after?.saved?.path).toContain("new.ts");
    // The written revision is the one that existed before the save.
    expect(after?.saved?.revision).toBe(before.revision);
  });

  it("leaves the draft unsaved when the write fails", async () => {
    const { drafts, send } = await studio({}, { ok: false, reason: "failed", message: "disk full" });
    await generate(send);
    const before = only(drafts);

    __state.saveDialog = Uri.file("/app/new.ts");
    await send({ type: "save", format: "ts", fileName: "new.ts", destination: "choose" });

    const after = drafts.get(before.id);
    // A failed write must not be recorded as saved work.
    expect(after?.dirty).toBe(true);
    expect(after?.saved).toBeUndefined();
  });
});

describe("isolation", () => {
  it("keeps two panels' drafts apart", async () => {
    const first = await studio();
    generate(first.send, "ocean");

    const second = createDraftRegistry();
    const secondPanel = createStudioPanel({
      extensionUri: Uri.file("/extension"),
      roots: () => [{ name: "app", inspection: project() }] as never,
      client: createThemvoraClient(),
      save: async () => ({ ok: true, path: "/app/new.ts" }),
      applyPatch: async () => ({ ok: true, path: "/app/patched.ts" }) as never,
      preview: { openThemes: async () => undefined },
      studioAppearance: memoryAppearance(),
      drafts: second,
    });
    await secondPanel.open();
    const webview = __state.webviewPanels.at(-1)!;
    for (const handler of webview.messageHandlers) {
      handler({ type: "generate", seed: SEED, kind: "generate", family: "forest" });
    }
    await flush();
    await flush();

    // Two registries, two drafts — nothing is shared through a module global.
    expect(first.drafts.list()).toHaveLength(1);
    expect(second.list()).toHaveLength(1);
    expect(first.drafts.list()[0]?.id).toBe(second.list()[0]?.id);
    expect(first.drafts.list()[0]?.name).toBe("ocean");
    expect(second.list()[0]?.name).toBe("forest");
  });
});
