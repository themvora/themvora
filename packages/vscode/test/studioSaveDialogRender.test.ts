/**
 * What the save dialog actually renders.
 *
 * The host-side tests prove the *write* — the folder, the file name, the
 * notification. They cannot prove the form shows the user where the file is
 * going, which is the other half of the same bug: a dialog that wrote to one
 * place while displaying another.
 *
 * These render `PreviewWorkspace` to static markup. There is no DOM in this
 * test environment, so this is markup coverage, not click coverage: what the
 * button does is covered where the intent is handled.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { StudioSelection } from "../src/shared/studioProtocol";
import { PreviewWorkspace } from "../webview/studio/PreviewWorkspace";
import { initialUiState, studioUiReducer, type StudioUiState } from "../webview/studio/uiState";

/** A generated draft: valid, unsaved, and with no source to sit beside. */
const DRAFT: StudioSelection = {
  origin: "draft",
  name: "generated-light",
  mode: "light",
  modes: ["light", "dark"],
  valid: true,
  saved: false,
  tokens: [],
  variants: [],
  draftKind: "generate",
};

/**
 * Render the preview workspace with its save dialog open.
 *
 * @param ui - The save form's state.
 * @returns The markup.
 */
function render(ui: StudioUiState): string {
  return renderToStaticMarkup(
    createElement(PreviewWorkspace, {
      selected: DRAFT,
      notice: undefined,
      projectThemeCount: 1,
      ui,
      dispatch: (() => undefined) as never,
      onDraftFromPreset: () => undefined,
      onMode: () => undefined,
      onRegion: () => undefined,
      onSave: () => undefined,
      onSerialize: () => undefined,
      onChooseLocation: () => undefined,
      onResetToken: () => undefined,
      onDiscardDraft: () => undefined,
      onUseInProject: () => undefined,
    }),
  );
}

describe("the save dialog", () => {
  it("asks for a location before it can save a draft", () => {
    const html = render(studioUiReducer(initialUiState(), { type: "open-save" }));

    expect(html).toContain("Choose a location to continue");
    // Nothing to write beside, so the destination cannot claim otherwise.
    expect(html).toContain('<option value="source" disabled="">');
    expect(html).toContain("Browse…");
  });

  it("shows the exact path the write will use, and offers to change it", () => {
    const ui = studioUiReducer(
      studioUiReducer(initialUiState(), { type: "open-save" }),
      { type: "set-save-location", directory: "d:\\test", fileName: "themvora-theme.ts" },
    );
    const html = render(ui);

    expect(html).toContain('title="d:\\test\\themvora-theme.ts"');
    expect(html).toContain("d:\\test\\themvora-theme.ts");
    // The select cannot re-fire on the option it already shows, so changing the
    // folder needs a control of its own.
    expect(html).toContain("Change…");
    expect(html).not.toContain("Choose a location to continue");
  });

  it("follows the file name into the folder that was picked", () => {
    const picked = studioUiReducer(
      studioUiReducer(initialUiState(), { type: "open-save" }),
      { type: "set-save-location", directory: "d:\\test", fileName: "themvora-theme.ts" },
    );
    const renamed = studioUiReducer(picked, {
      type: "set-file-name",
      fileName: "brand.ts",
    });

    expect(render(renamed)).toContain("d:\\test\\brand.ts");
  });
});
