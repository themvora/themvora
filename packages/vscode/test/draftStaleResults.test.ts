/**
 * Stale draft results, at the command level.
 *
 * `isStaleEntry` has direct coverage; this drives the real command functions
 * with a client that advances the draft *during* the operation, so the guard is
 * proven where it actually runs. The interleaving is arranged through the
 * command's own dependency injection — no timers, no races.
 */
import { generateTheme, themeToCssDocument } from "@themvora/core";
import { describe, expect, it } from "vitest";
import { window } from "vscode";

import { runCompareThemes } from "../src/commands/compareThemes";
import { runCopyCssVariables } from "../src/commands/copyCssVariables";
import { runValidateTheme } from "../src/commands/validateTheme";
import { createThemvoraClient, type ThemvoraClient } from "../src/services/coreClient";
import { createDraftRegistry, type DraftRegistry, type ThemeDraft } from "../src/services/draftRegistry";
import type { ThemeCatalogDeps } from "../src/services/themeCatalog";
import { __reset, __state } from "./stubs/vscode";

const PAIR = generateTheme({ seed: "#10b981" });
const OTHER = generateTheme({ seed: "#4f46e5" });

/** A registry holding one draft, as the Studio would leave it. */
function seeded(): { drafts: DraftRegistry; draft: ThemeDraft } {
  const drafts = createDraftRegistry();
  const created = drafts.create({
    scope: { kind: "standalone" },
    name: "ocean",
    origin: "generated",
    themes: [PAIR.light, PAIR.dark],
    baseline: [PAIR.light, PAIR.dark],
    validation: { valid: true, errors: 0, warnings: 0 },
  });
  if (!created.ok) throw new Error("refused");
  return { drafts, draft: created.draft };
}

/**
 * Advance a draft to a different theme.
 *
 * @param drafts - The registry.
 * @param draft - The record to move on.
 */
function advance(drafts: DraftRegistry, draft: ThemeDraft): void {
  const moved = drafts.update(draft.id, {
    expectedRevision: draft.revision,
    themes: [OTHER.light, OTHER.dark],
  });
  if (!moved.ok) throw new Error(`could not advance: ${moved.failure.kind}`);
}

/**
 * A client whose named method runs a side effect first.
 *
 * This is the whole test harness for the interleaving: the command's own
 * dependency injection decides when the client is called, so the draft moves at
 * exactly the moment a real edit would.
 *
 * @param method - The client method to wrap.
 * @param effect - What to do before delegating.
 * @returns The wrapped client.
 */
function clientThat(method: "diff" | "validate" | "catalog", effect: () => void): ThemvoraClient {
  const real = createThemvoraClient();
  return {
    ...real,
    [method]: async (...args: unknown[]) => {
      effect();
      return (real[method] as (...inner: unknown[]) => unknown)(...args);
    },
  } as ThemvoraClient;
}

/** Catalog dependencies over one registry. */
function catalogFor(client: ThemvoraClient, drafts: DraftRegistry): ThemeCatalogDeps {
  return { client, roots: () => [], drafts: () => drafts.list() };
}

/** The output channel the commands write to. */
function output() {
  return window.createOutputChannel("Themvora");
}

/** Everything the output channel received. */
function report(): string {
  return __state.outputChannels[0]?.lines.join("\n") ?? "";
}

describe("compare", () => {
  it("drops a report whose draft moved while the diff ran", async () => {
    __reset();
    const { drafts, draft } = seeded();

    __state.quickPickQueue = ["ocean · light", "Oat · light"];
    await runCompareThemes(undefined, undefined, {
      client: clientThat("diff", () => advance(drafts, draft)),
      output: output(),
      catalog: catalogFor(createThemvoraClient(), drafts),
    });

    // The comparison completed, but it described the previous revision.
    expect(__state.warnings.join(" ")).toContain("changed while the comparison was running");
    expect(report()).toBe("");
  });

  it("presents the report when nothing moved", async () => {
    __reset();
    const { drafts } = seeded();

    __state.quickPickQueue = ["ocean · light", "Oat · light"];
    await runCompareThemes(undefined, undefined, {
      client: createThemvoraClient(),
      output: output(),
      catalog: catalogFor(createThemvoraClient(), drafts),
    });

    // The control: the guard is not simply always firing.
    expect(__state.warnings).toEqual([]);
    expect(report()).toContain("ocean");
  });
});

describe("copy", () => {
  it("says the clipboard holds an earlier revision when the draft moved mid-copy", async () => {
    __reset();
    const { drafts, draft } = seeded();

    __state.quickPickQueue = ["ocean · light"];
    await runCopyCssVariables(undefined, {
      client: clientThat("validate", () => advance(drafts, draft)),
      catalog: catalogFor(createThemvoraClient(), drafts),
      clipboard: { writeText: async (value) => void __state.clipboard.push(value) },
    });

    // What was copied is the revision the command resolved, which is now old.
    expect(__state.clipboard).toHaveLength(1);
    expect(__state.clipboard[0]).toBe(themeToCssDocument(PAIR.light));
    expect(__state.warnings.join(" ")).toContain("earlier revision");
  });

  it("copies silently when nothing moved", async () => {
    __reset();
    const { drafts } = seeded();

    __state.quickPickQueue = ["ocean · light"];
    await runCopyCssVariables(undefined, {
      client: createThemvoraClient(),
      catalog: catalogFor(createThemvoraClient(), drafts),
      clipboard: { writeText: async (value) => void __state.clipboard.push(value) },
    });

    expect(__state.clipboard[0]).toBe(themeToCssDocument(PAIR.light));
    expect(__state.warnings).toEqual([]);
  });
});

describe("validate", () => {
  it("marks a report that describes an earlier revision", async () => {
    __reset();
    const { drafts, draft } = seeded();

    __state.quickPickQueue = ["ocean · light"];
    await runValidateTheme(undefined, {
      client: clientThat("validate", () => advance(drafts, draft)),
      catalog: catalogFor(createThemvoraClient(), drafts),
      output: output(),
    });

    // The report still exists — the user asked for it — but it says which
    // revision it describes.
    expect(report()).toContain("ocean");
    expect(report()).toContain("changed while it was being validated");
    expect(__state.warnings.join(" ")).toContain("Run the validation again");
  });

  it("reports a clean verdict when nothing moved", async () => {
    __reset();
    const { drafts } = seeded();

    __state.quickPickQueue = ["ocean · light"];
    await runValidateTheme(undefined, {
      client: createThemvoraClient(),
      catalog: catalogFor(createThemvoraClient(), drafts),
      output: output(),
    });

    expect(report()).toContain("ocean");
    expect(report()).not.toContain("changed while");
    expect(__state.warnings).toEqual([]);
  });
});

describe("preview", () => {
  it("does not open a draft that was discarded before it could be shown", async () => {
    __reset();
    const { drafts, draft } = seeded();
    // The catalog read is the last await before the draft is resolved, so
    // discarding here is exactly "another view removed it first".
    const client = clientThat("catalog", () => void drafts.discard(draft.id));
    const controller = await import("../src/commands/previewTheme").then((module) =>
      module.createPreviewController({
        output: output(),
        extensionUri: { fsPath: "/extension" } as never,
        catalog: catalogFor(client, drafts),
        onNothingToPreview: () => void __state.info.push("nothing to preview"),
      }),
    );

    __state.quickPickQueue = ["ocean · light"];
    await controller.open();

    // Nothing is previewed, and no panel is left showing the discarded theme.
    expect(__state.info).toContain("nothing to preview");
    expect(__state.webviewPanels).toEqual([]);
  });
});
