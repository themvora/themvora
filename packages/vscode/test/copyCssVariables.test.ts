/**
 * `Themvora: Copy CSS Variables` end-to-end.
 *
 * The command runs for real against the fake host: a real file on disk, the real
 * client, real core validation and real core formatting. Only the dialogs and the
 * clipboard are recorded.
 *
 * The central assertion is that the clipboard receives exactly
 * `themeToCssDocument(theme)` — not a re-implementation of it. If the command
 * ever grew its own formatting, this test would fail.
 */
import { generateTheme, themeToCssDocument } from "@themvora/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExtensionContext } from "vscode";

import manifest from "../package.json";
import { COMMAND_COPY_CSS_VARIABLES } from "../src/commands/copyCssVariables";
import { COMMAND_REFRESH } from "../src/commands/refresh";
import { activate } from "../src/index";
import { createTempProject, type TempProject } from "./helpers/tempProject";
import { __invoke, __reset, __state, Uri } from "./stubs/vscode";

const PAIR = generateTheme({ seed: "#4f46e5" });
const PAIR_JSON = JSON.stringify({ light: PAIR.light, dark: PAIR.dark }, null, 2);

/** A pair whose themes have no colour tokens, so both fail validation. */
const INVALID_JSON = JSON.stringify({
  light: { name: "broken-light", meta: { mode: "light" }, tokens: { colors: {} } },
  dark: { name: "broken-dark", meta: { mode: "dark" }, tokens: { colors: {} } },
});

/** The fake extension context. */
function context(): ExtensionContext {
  return {
    subscriptions: [],
    // A real context always has one; the preview tab icon is built from it.
    extensionUri: Uri.file("/extension"),
    extension: { packageJSON: manifest },
  } as unknown as ExtensionContext;
}

let project: TempProject;

beforeEach(async () => {
  __reset();
  project = createTempProject();
  activate(context());
  await __invoke(COMMAND_REFRESH);
});

afterEach(() => {
  project.cleanup();
});

describe("registration", () => {
  it("is contributed and registered", () => {
    expect(manifest.contributes.commands.map((entry) => entry.command)).toContain(
      COMMAND_COPY_CSS_VARIABLES,
    );
    expect(__state.commands.has(COMMAND_COPY_CSS_VARIABLES)).toBe(true);
  });

  it("is titled for the palette", () => {
    const entry = manifest.contributes.commands.find(
      (candidate) => candidate.command === COMMAND_COPY_CSS_VARIABLES,
    );
    expect(entry?.title).toBe("Copy CSS Variables");
    expect(entry?.category).toBe("Themvora");
  });
});

describe("themvora.copyCssVariables", () => {
  it("copies the canonical document for a single-theme file", async () => {
    const file = project.write("one.json", JSON.stringify(PAIR.light, null, 2));

    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    expect(__state.clipboard).toHaveLength(1);
    // Byte-for-byte core's output, not a lookalike.
    expect(__state.clipboard[0]).toBe(themeToCssDocument(PAIR.light));
    expect(__state.clipboard[0]!.startsWith(":root {")).toBe(true);

    expect(__state.info).toHaveLength(1);
    expect(__state.info[0]).toContain("copied generated-light (light)");
  });

  it("asks which theme to copy when a pair holds two", async () => {
    const file = project.write("pair.json", PAIR_JSON);
    __state.quickPickSelection = "generated-dark";

    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    expect(__state.clipboard).toHaveLength(1);
    expect(__state.clipboard[0]).toBe(themeToCssDocument(PAIR.dark));
    expect(__state.clipboard[0]).toContain(
      `--theme-color-background: ${PAIR.dark.tokens!.colors!["background"]};`,
    );
    expect(__state.info[0]).toContain("copied generated-dark (dark)");
  });

  it("does not silently pick the first theme when the pick is dismissed", async () => {
    const file = project.write("pair.json", PAIR_JSON);
    __state.quickPickSelection = undefined;

    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    // Nothing copied, nothing claimed, nothing reported as a failure.
    expect(__state.clipboard).toEqual([]);
    expect(__state.info).toEqual([]);
    expect(__state.errors).toEqual([]);
  });

  it("ignores a pick that matches no offered theme", async () => {
    const file = project.write("pair.json", PAIR_JSON);
    __state.quickPickSelection = "not-a-theme";

    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    expect(__state.clipboard).toEqual([]);
    expect(__state.info).toEqual([]);
  });

  it("reports malformed JSON and copies nothing", async () => {
    const file = project.write("garbage.json", "{ nope");

    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    expect(__state.clipboard).toEqual([]);
    expect(__state.errors).toHaveLength(1);
    expect(__state.errors[0]).toContain("is not valid JSON");
  });

  it("reports a document that holds no theme", async () => {
    const file = project.write("other.json", '{"hello":"world"}');

    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    expect(__state.clipboard).toEqual([]);
    expect(__state.errors[0]).toContain("neither a theme");
  });

  it("refuses to copy a theme that fails validation", async () => {
    const file = project.write("broken.json", INVALID_JSON);

    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    expect(__state.clipboard).toEqual([]);
    expect(__state.errors).toHaveLength(1);
    expect(__state.errors[0]).toContain("No theme");
    expect(__state.errors[0]).toContain("broken-light, broken-dark");
    // The user is pointed at the command that explains why.
    expect(__state.errors[0]).toContain("Validate Theme");
  });

  it("offers the valid theme when only one half validates", async () => {
    const file = project.write(
      "mixed.json",
      JSON.stringify({
        light: PAIR.light,
        dark: { name: "broken-dark", meta: { mode: "dark" }, tokens: { colors: {} } },
      }),
    );

    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    // One candidate is not a choice, so no prompt is shown and the valid theme is
    // copied.
    expect(__state.clipboard).toHaveLength(1);
    expect(__state.clipboard[0]).toBe(themeToCssDocument(PAIR.light));
    expect(__state.info[0]).toContain("copied generated-light");
  });

  it("reports an unreadable file", async () => {
    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(`${project.root}/missing.json`));

    expect(__state.clipboard).toEqual([]);
    expect(__state.errors[0]).toContain("could not read");
  });

  it("reports a clipboard failure without claiming success", async () => {
    const file = project.write("one.json", JSON.stringify(PAIR.light, null, 2));
    __state.clipboardError = new Error("clipboard is locked");

    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    expect(__state.errors).toHaveLength(1);
    expect(__state.errors[0]).toContain("clipboard is locked");
    // The important half: no success notification after a failed copy.
    expect(__state.info).toEqual([]);
  });

  it("does nothing when the open dialog is dismissed", async () => {
    __state.openDialog = undefined;

    await __invoke(COMMAND_COPY_CSS_VARIABLES);

    expect(__state.clipboard).toEqual([]);
    expect(__state.info).toEqual([]);
    expect(__state.errors).toEqual([]);
  });

  it("copies a theme chosen from the catalog", async () => {
    // No file dialog: a preset is a theme, and it is reachable in a workspace
    // with no Themvora at all.
    __state.quickPickSelection = "Oat · light";

    await __invoke(COMMAND_COPY_CSS_VARIABLES);

    expect(__state.clipboard).toHaveLength(1);
    expect(__state.clipboard[0]).toContain("--");
    expect(__state.info[0]).toContain("copied");
    expect(__state.written).toEqual([]);
  });

  it("handles a path containing spaces", async () => {
    const spaced = createTempProject("themvora css ");
    try {
      const file = spaced.write("my theme.json", JSON.stringify(PAIR.light, null, 2));
      await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

      expect(__state.clipboard[0]).toBe(themeToCssDocument(PAIR.light));
    } finally {
      spaced.cleanup();
    }
  });

  it("writes nothing to the workspace", async () => {
    const file = project.write("one.json", JSON.stringify(PAIR.light, null, 2));
    const before = project.files();

    await __invoke(COMMAND_COPY_CSS_VARIABLES, Uri.file(file));

    expect(project.files()).toEqual(before);
    expect(__state.written).toEqual([]);
  });
});
