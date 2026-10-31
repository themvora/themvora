/**
 * `Themvora: Validate Theme…` end-to-end.
 *
 * The command runs for real against the fake host: a real file on disk, the real
 * client, the real core validation. Only the dialogs and the output channel are
 * recorded, because there is no headless equivalent of either.
 */
import { generateTheme } from "@themvora/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExtensionContext } from "vscode";

import manifest from "../package.json";
import { COMMAND_REFRESH } from "../src/commands/refresh";
import { COMMAND_VALIDATE_THEME } from "../src/commands/validateTheme";
import { activate } from "../src/index";
import { createTempProject, type TempProject } from "./helpers/tempProject";
import { __invoke, __reset, __state, Uri } from "./stubs/vscode";

const PAIR = generateTheme({ seed: "#4f46e5" });
const VALID = JSON.stringify({ light: PAIR.light, dark: PAIR.dark }, null, 2);

/** A pair whose themes have no colour tokens at all. */
const INVALID = JSON.stringify({
  light: { name: "broken-light", meta: { mode: "light" }, tokens: { colors: {} } },
  dark: { name: "broken-dark", meta: { mode: "dark" }, tokens: { colors: {} } },
});

/** The fake extension context. */
function context(): ExtensionContext {
  return {
    subscriptions: [],
    extension: { packageJSON: manifest },
  } as unknown as ExtensionContext;
}

/** The channel the command writes its report to. */
function channel(): { lines: string[]; shown: boolean; cleared: boolean } {
  const found = __state.outputChannels[0];
  if (!found) throw new Error("no output channel was created");
  return found;
}

let project: TempProject;

beforeEach(async () => {
  __reset();
  project = createTempProject();
  activate(context());
  // Settle the inspection activation started, so nothing leaks between tests.
  await __invoke(COMMAND_REFRESH);
});

afterEach(() => {
  project.cleanup();
});

describe("registration", () => {
  it("is contributed and registered", () => {
    expect(manifest.contributes.commands.map((entry) => entry.command)).toContain(
      COMMAND_VALIDATE_THEME,
    );
    expect(__state.commands.has(COMMAND_VALIDATE_THEME)).toBe(true);
  });
});

describe("themvora.validateTheme", () => {
  it("reports a valid pair as a pass", async () => {
    const file = project.write("theme.json", VALID);

    await __invoke(COMMAND_VALIDATE_THEME, Uri.file(file));

    expect(__state.info).toHaveLength(1);
    expect(__state.info[0]).toContain("2 themes valid");
    expect(__state.warnings).toEqual([]);

    const lines = channel().lines;
    expect(lines[0]).toBe("Themvora — validate");
    expect(lines.some((line) => line.includes("generated-light (light)"))).toBe(true);
    expect(lines.filter((line) => line.includes("PASS"))).toHaveLength(2);
    expect(lines.some((line) => line.includes("16 pairs · text 9/9 · ui 7/7"))).toBe(true);
  });

  it("reports an invalid pair as a warning, not an error", async () => {
    const file = project.write("broken.json", INVALID);

    await __invoke(COMMAND_VALIDATE_THEME, Uri.file(file));

    // An invalid theme is a normal state while editing; a red error would
    // misrepresent a correct answer.
    expect(__state.errors).toEqual([]);
    expect(__state.warnings).toHaveLength(1);
    expect(__state.warnings[0]).toContain("2 of 2 themes invalid");

    const lines = channel().lines;
    expect(lines.filter((line) => line.includes("FAIL"))).toHaveLength(2);
    expect(lines.some((line) => line.includes("colors.background"))).toBe(true);
  });

  it("reports a single-theme document", async () => {
    const file = project.write("one.json", JSON.stringify(PAIR.light, null, 2));

    await __invoke(COMMAND_VALIDATE_THEME, Uri.file(file));

    expect(__state.info[0]).toContain("1 theme valid");
  });

  it("rejects a document that is not valid JSON without opening a report", async () => {
    const file = project.write("garbage.json", "{ nope");

    await __invoke(COMMAND_VALIDATE_THEME, Uri.file(file));

    expect(__state.errors).toHaveLength(1);
    expect(__state.errors[0]).toContain("is not valid JSON");
    expect(channel().lines).toEqual([]);
  });

  it("rejects a JSON document that is not a theme", async () => {
    const file = project.write("other.json", '{"hello":"world"}');

    await __invoke(COMMAND_VALIDATE_THEME, Uri.file(file));

    expect(__state.errors).toHaveLength(1);
    expect(__state.errors[0]).toContain("neither a theme");
    expect(channel().lines).toEqual([]);
  });

  it("reports an unreadable file instead of throwing", async () => {
    await __invoke(COMMAND_VALIDATE_THEME, Uri.file(`${project.root}/missing.json`));

    expect(__state.errors).toHaveLength(1);
    expect(__state.errors[0]).toContain("could not read");
  });

  it("does nothing when the open dialog is dismissed", async () => {
    __state.openDialog = undefined;

    await __invoke(COMMAND_VALIDATE_THEME);

    expect(__state.info).toEqual([]);
    expect(__state.warnings).toEqual([]);
    expect(__state.errors).toEqual([]);
    expect(channel().lines).toEqual([]);
  });

  it("validates a theme chosen from the catalog", async () => {
    // A preset is a real theme; validating it needs no project and no file.
    __state.quickPickSelection = "Oat · light";

    await __invoke(COMMAND_VALIDATE_THEME);

    expect(__state.info[0]).toContain("1 theme valid");
    expect(__state.outputChannels[0]?.lines.join("\n")).toContain("Catalog preset");
  });

  it("handles a path containing spaces", async () => {
    const spaced = createTempProject("themvora validate ");
    try {
      const file = spaced.write("my theme.json", VALID);
      await __invoke(COMMAND_VALIDATE_THEME, Uri.file(file));

      expect(__state.info[0]).toContain("2 themes valid");
      expect(channel().lines.some((line) => line.includes("my theme.json"))).toBe(true);
    } finally {
      spaced.cleanup();
    }
  });

  it("writes nothing to the workspace", async () => {
    const file = project.write("theme.json", VALID);
    const before = project.files();

    await __invoke(COMMAND_VALIDATE_THEME, Uri.file(file));

    // The command is read-only by contract; this is the assertion of it.
    expect(project.files()).toEqual(before);
    expect(__state.written).toEqual([]);
  });

  it("shows the report channel", async () => {
    const file = project.write("theme.json", VALID);

    await __invoke(COMMAND_VALIDATE_THEME, Uri.file(file));

    expect(channel().shown).toBe(true);
    expect(channel().cleared).toBe(true);
    expect(channel().lines.length).toBeGreaterThan(3);
  });
});
