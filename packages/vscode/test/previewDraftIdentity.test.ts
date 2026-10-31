/**
 * The Preview's half of the draft identity contract.
 *
 * The Studio renders a theme into the preview; the preview has to be able to say
 * *which* draft it is showing, or a later revision cannot be told apart from a
 * different theme that happens to look similar.
 */
import { generateTheme } from "@themvora/core";
import { describe, expect, it } from "vitest";
import { window, Uri } from "vscode";

import { createPreviewController } from "../src/commands/previewTheme";
import { createThemvoraClient } from "../src/services/coreClient";
import { __state } from "./stubs/vscode";

const PAIR = generateTheme({ seed: "#10b981" });

/** A controller over the stub host. */
function controller() {
  const client = createThemvoraClient();
  return createPreviewController({
    output: window.createOutputChannel("Themvora"),
    extensionUri: Uri.file("/extension"),
    catalog: { client, roots: () => [] },
  });
}

describe("draft identity", () => {
  it("records the draft it is asked to show", async () => {
    const preview = controller();

    await preview.openThemes([PAIR.light, PAIR.dark], "draft · ocean", "light", "draft-7");

    expect(preview.currentDraftId()).toBe("draft-7");
    // The panel was actually created, not just the state set.
    expect(__state.webviewPanels).toHaveLength(1);
  });

  it("forgets the draft when a non-draft theme is synced", async () => {
    const preview = controller();
    await preview.openThemes([PAIR.light, PAIR.dark], "draft · ocean", "light", "draft-7");

    // A preset preview has no draft behind it.
    preview.sync([PAIR.light, PAIR.dark], "preset · oat", "light");

    expect(preview.currentDraftId()).toBeUndefined();
  });

  it("clears the panel so a discarded draft's palette cannot survive", async () => {
    const preview = controller();
    await preview.openThemes([PAIR.light, PAIR.dark], "draft · ocean", "light", "draft-7");

    preview.clear("Draft \"ocean\" discarded.");

    expect(preview.currentDraftId()).toBeUndefined();
    const posted = __state.webviewPanels.at(-1)!.posted;
    const last = posted.at(-1) as { type: string; stale?: boolean; message?: string };
    // `stale: false` is what stops the panel painting the old palette behind
    // the message.
    expect(last.type).toBe("error");
    expect(last.stale).toBe(false);
    expect(last.message).toContain("discarded");
  });

  it("keeps the id across a variant switch", async () => {
    const preview = controller();
    await preview.openThemes([PAIR.light, PAIR.dark], "draft · ocean", "light", "draft-7");

    preview.sync([PAIR.light, PAIR.dark], "draft · ocean", "dark", "draft-7");

    // Switching light/dark is the same draft, not a different one.
    expect(preview.currentDraftId()).toBe("draft-7");
  });
});
