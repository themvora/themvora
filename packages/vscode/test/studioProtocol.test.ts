/**
 * The host boundary for Studio intents.
 *
 * The webview is untrusted: every message is parsed before a handler sees it.
 * These tests pin the accepted shapes and the rejection of malformed ones.
 */
import { describe, expect, it } from "vitest";

import { parseStudioAppearance, parseStudioIntent } from "../src/shared/studioProtocol";

describe("parseStudioIntent", () => {
  it("accepts the argument-free intents", () => {
    for (const type of ["ready", "draftFromPreset", "presets", "preview", "openSource", "openColorThemePicker"] as const) {
      expect(parseStudioIntent({ type })).toEqual({ type });
    }
  });

  it("accepts a project selection", () => {
    expect(parseStudioIntent({ type: "selectProject", path: "src/theme.ts", name: "ocean-light" })).toEqual({
      type: "selectProject",
      path: "src/theme.ts",
      name: "ocean-light",
    });
  });

  it("normalizes a generate request and drops non-boolean flags", () => {
    expect(
      parseStudioIntent({
        type: "generate",
        seed: "#4f46e5",
        kind: "define",
        family: "brand",
        style: "vibrant",
        withCode: "yes",
      }),
    ).toEqual({
      type: "generate",
      seed: "#4f46e5",
      kind: "define",
      family: "brand",
      style: "vibrant",
    });
  });

  it("defaults an unknown generate kind to generate", () => {
    expect(parseStudioIntent({ type: "generate", seed: "#000000", kind: "other" })).toMatchObject({
      kind: "generate",
    });
  });

  it("accepts a live preview request with its sequence number", () => {
    expect(
      parseStudioIntent({
        type: "previewGenerate",
        requestId: 7,
        seed: "#4f46e5",
        kind: "define",
        family: "brand",
      }),
    ).toEqual({
      type: "previewGenerate",
      requestId: 7,
      seed: "#4f46e5",
      kind: "define",
      family: "brand",
    });
  });

  it("accepts starting from a preset or an existing theme", () => {
    expect(parseStudioIntent({ type: "draftFromPresetId", id: "oat" })).toEqual({
      type: "draftFromPresetId",
      id: "oat",
    });
    expect(
      parseStudioIntent({ type: "draftFromTheme", path: "src/theme.ts", name: "ocean-light" }),
    ).toEqual({
      type: "draftFromTheme",
      path: "src/theme.ts",
      name: "ocean-light",
    });
  });

  it("accepts a source position only when it is numeric", () => {
    expect(parseStudioIntent({ type: "open", path: "a.ts", line: 4, column: 2 })).toEqual({
      type: "open",
      path: "a.ts",
      line: 4,
      column: 2,
    });

    expect(parseStudioIntent({ type: "open", path: "a.ts", line: "4" })).toEqual({
      type: "open",
      path: "a.ts",
    });
  });

  it("accepts draft edit and reset intents", () => {
    expect(
      parseStudioIntent({ type: "editToken", path: ["colors", "primary"], value: "#112233" }),
    ).toEqual({ type: "editToken", path: ["colors", "primary"], value: "#112233" });
    expect(parseStudioIntent({ type: "resetToken", path: ["colors", "primary"] })).toEqual({
      type: "resetToken",
      path: ["colors", "primary"],
    });
    expect(parseStudioIntent({ type: "resetGroup", group: "actions" })).toEqual({
      type: "resetGroup",
      group: "actions",
    });
    expect(parseStudioIntent({ type: "resetDraft" })).toEqual({ type: "resetDraft" });
    // Discarding is a distinct intent: resetting keeps the draft.
    expect(parseStudioIntent({ type: "discardDraft" })).toEqual({ type: "discardDraft" });
  });

  it("rejects malformed token paths and missing reset groups", () => {
    expect(parseStudioIntent({ type: "editToken", path: [], value: "#fff" })).toBeNull();
    expect(parseStudioIntent({ type: "editToken", path: ["colors", 1], value: "#fff" })).toBeNull();
    expect(parseStudioIntent({ type: "editToken", path: ["colors", "primary"] })).toBeNull();
    expect(parseStudioIntent({ type: "resetToken", path: "colors.primary" })).toBeNull();
    expect(parseStudioIntent({ type: "resetGroup" })).toBeNull();
  });

  it("accepts save and serialize payloads", () => {
    expect(
      parseStudioIntent({
        type: "save",
        format: "ts",
        fileName: "theme.ts",
        destination: "source",
      }),
    ).toEqual({
      type: "save",
      format: "ts",
      fileName: "theme.ts",
      destination: "source",
    });
    expect(parseStudioIntent({ type: "serialize", format: "css" })).toEqual({
      type: "serialize",
      format: "css",
    });
  });

  it("rejects unknown types, primitives, arrays and missing required fields", () => {
    expect(parseStudioIntent(null)).toBeNull();
    expect(parseStudioIntent("ready")).toBeNull();
    expect(parseStudioIntent([])).toBeNull();
    expect(parseStudioIntent({ type: "unknown" })).toBeNull();
    expect(parseStudioIntent({ type: "selectProject", path: "a.ts" })).toBeNull();
    expect(parseStudioIntent({ type: "selectPreset" })).toBeNull();
    expect(parseStudioIntent({ type: "copy" })).toBeNull();
    expect(parseStudioIntent({ type: "save", format: "ts", fileName: "a.ts" })).toBeNull();
    expect(parseStudioIntent({ type: "generate" })).toBeNull();
    expect(parseStudioIntent({ type: "previewGenerate", seed: "#000000" })).toBeNull();
    expect(parseStudioIntent({ type: "previewGenerate", requestId: 1, seed: "#000000" })).toEqual({
      type: "previewGenerate",
      requestId: 1,
      seed: "#000000",
      kind: "generate",
    });
    expect(parseStudioIntent({ type: "draftFromPresetId" })).toBeNull();
    expect(parseStudioIntent({ type: "draftFromTheme", path: "a.ts" })).toBeNull();
  });

  it("parses patch intents", () => {
    const patch = {
      path: "src/theme.ts",
      action: "create" as const,
      original: "",
      updated: "export const theme = {};",
      description: "Create theme file",
      generatedCode: {
        imports: ["import { ThemeProvider } from '@themvora/react';"],
      },
    };

    expect(parseStudioIntent({ type: "openPatchPreview", patch })).toEqual({
      type: "openPatchPreview",
      patch,
    });
    expect(parseStudioIntent({ type: "applyPatch", patch })).toEqual({
      type: "applyPatch",
      patch,
    });
    expect(parseStudioIntent({ type: "cancelPatch" })).toEqual({ type: "cancelPatch" });
  });

  it("rejects invalid patch intents", () => {
    expect(parseStudioIntent({ type: "openPatchPreview" })).toBeNull();
    expect(parseStudioIntent({ type: "openPatchPreview", patch: null })).toBeNull();
    expect(parseStudioIntent({ type: "openPatchPreview", patch: { path: 123 } })).toBeNull();
    expect(
      parseStudioIntent({
        type: "openPatchPreview",
        patch: {
          path: "src/theme.ts",
          action: "invalid",
          original: "",
          updated: "",
          description: "",
          generatedCode: { imports: [] },
        },
      }),
    ).toBeNull();
  });

  it("accepts only the three Studio appearance modes", () => {
    for (const appearance of ["auto", "light", "dark"] as const) {
      expect(parseStudioIntent({ type: "setStudioAppearance", appearance })).toEqual({
        type: "setStudioAppearance",
        appearance,
      });
    }
    // A webview must not be able to write an arbitrary value into global state.
    expect(parseStudioIntent({ type: "setStudioAppearance", appearance: "sepia" })).toBeNull();
    expect(parseStudioIntent({ type: "setStudioAppearance" })).toBeNull();
    expect(parseStudioIntent({ type: "setStudioAppearance", appearance: 1 })).toBeNull();
  });
});

describe("parseStudioAppearance", () => {
  it("keeps a known mode", () => {
    expect(parseStudioAppearance("auto")).toBe("auto");
    expect(parseStudioAppearance("light")).toBe("light");
    expect(parseStudioAppearance("dark")).toBe("dark");
  });

  it("falls back to auto for anything else", () => {
    // Persisted state outlives the code that wrote it: a removed mode, a
    // corrupted value or a missing key must never leave the Studio unstyled.
    for (const value of [undefined, null, "", "Dark", "sepia", 0, {}, []]) {
      expect(parseStudioAppearance(value)).toBe("auto");
    }
  });
});
