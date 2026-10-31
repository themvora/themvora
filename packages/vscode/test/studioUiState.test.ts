/**
 * The Studio's UI-only state.
 *
 * Host state owns the theme; this reducer owns where the user is looking. The
 * tests keep the two from drifting — especially the format/highlight reset that
 * must happen when a different theme is selected.
 */
import { describe, expect, it } from "vitest";

import {
  initialUiState,
  studioUiReducer,
  withFormatExtension,
} from "../webview/studio/uiState";

describe("studioUiReducer", () => {
  it("starts on the theme rail with no highlight", () => {
    const state = initialUiState();
    expect(state.rail).toBe("themes");
    expect(state.inspector).toBe("tokens");
    expect(state.highlight).toBeUndefined();
    expect(state.fileName).toBe("themvora-theme.json");
  });

  it("switches between the four Create entry points and preview modes", () => {
    const existing = studioUiReducer(initialUiState(), {
      type: "set-create-entry",
      entry: "existing",
    });
    const dark = studioUiReducer(existing, { type: "set-draft-mode", mode: "dark" });
    expect(dark.createEntry).toBe("existing");
    expect(dark.draftMode).toBe("dark");
  });

  it("moves between rails and inspector tabs", () => {
    const sources = studioUiReducer(initialUiState(), { type: "set-rail", rail: "sources" });
    const details = studioUiReducer(sources, { type: "set-inspector", inspector: "details" });
    expect(details.rail).toBe("sources");
    expect(details.inspector).toBe("details");
  });

  it("sets and clears a token highlight", () => {
    const highlighted = studioUiReducer(initialUiState(), {
      type: "set-highlight",
      highlight: "primary",
    });
    expect(highlighted.highlight).toBe("primary");
    expect(studioUiReducer(highlighted, { type: "set-highlight" }).highlight).toBeUndefined();
  });

  it("derives the save format from the selected origin", () => {
    const preset = studioUiReducer(initialUiState(), {
      type: "selection-changed",
      selection: { origin: "preset" },
    });
    expect(preset.format).toBe("ts-preset");
    expect(preset.fileName).toBe("themvora-presets.ts");

    const defineDraft = studioUiReducer(preset, {
      type: "selection-changed",
      selection: { origin: "draft", draftKind: "define" },
    });
    expect(defineDraft.format).toBe("ts");
    expect(defineDraft.fileName).toBe("themvora-theme.ts");
  });

  it("drops a highlight, comparison, save form and file preview on a new selection", () => {
    const dirty = {
      ...initialUiState(),
      highlight: "ring",
      comparing: true,
      saving: true,
      fileText: "previous",
    };
    const next = studioUiReducer(dirty, {
      type: "selection-changed",
      selection: { origin: "project" },
    });

    expect(next.highlight).toBeUndefined();
    expect(next.comparisonMode).toBe("none");
    expect(next.saving).toBe(false);
    expect(next.fileText).toBeUndefined();
  });

  it("replaces the extension when the format changes", () => {
    const state = studioUiReducer(initialUiState(), { type: "set-format", format: "css" });
    expect(state.format).toBe("css");
    expect(state.fileName).toBe("themvora-theme.css");
    expect(withFormatExtension("custom.json", "ts")).toBe("custom.ts");
  });

  it("keeps a custom file name when only its extension changes", () => {
    const state = studioUiReducer(initialUiState(), {
      type: "set-file-name",
      fileName: "brand.json",
    });
    expect(state.fileName).toBe("brand.json");
    expect(withFormatExtension(state.fileName, "css")).toBe("brand.css");
  });

  it("defaults appearance to auto", () => {
    expect(initialUiState().studioAppearance).toBe("auto");
    expect(initialUiState("light").studioAppearance).toBe("light");
    expect(initialUiState("dark").studioAppearance).toBe("dark");
  });

  it("switches appearance without touching theme selection or preview mode", () => {
    const state = initialUiState();
    const light = studioUiReducer(state, { type: "set-studio-appearance", appearance: "light" });
    expect(light.studioAppearance).toBe("light");
    expect(light.comparisonMode).toBe(state.comparisonMode);
    expect(light.scenario).toBe(state.scenario);

    const dark = studioUiReducer(light, { type: "set-studio-appearance", appearance: "dark" });
    expect(dark.studioAppearance).toBe("dark");

    const auto = studioUiReducer(dark, { type: "set-studio-appearance", appearance: "auto" });
    expect(auto.studioAppearance).toBe("auto");
  });
});
