/**
 * `Themvora: Compare Themes` end-to-end.
 *
 * Core does the comparison; these assert what the command adds — reading two
 * documents, keeping their shape (a pair stays a set so both modes are compared),
 * rendering the report, and naming the file when one cannot be read.
 */
import { generateTheme } from "@themvora/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExtensionContext } from "vscode";

import manifest from "../package.json";
import { COMMAND_COMPARE_THEMES } from "../src/commands/compareThemes";
import { COMMAND_REFRESH } from "../src/commands/refresh";
import { activate } from "../src/index";
import { createTempProject, type TempProject } from "./helpers/tempProject";
import { __invoke, __reset, __state, Uri } from "./stubs/vscode";

const PAIR = generateTheme({ seed: "#4f46e5" });
const OTHER = generateTheme({ seed: "#10b981" });

const PAIR_JSON = JSON.stringify({ light: PAIR.light, dark: PAIR.dark }, null, 2);
const OTHER_PAIR_JSON = JSON.stringify({ light: OTHER.light, dark: OTHER.dark }, null, 2);

/** The fake extension context. */
function context(): ExtensionContext {
  return {
    subscriptions: [],
    // A real context always has one; the preview tab icon is built from it.
    extensionUri: Uri.file("/extension"),
    extension: { packageJSON: manifest },
  } as unknown as ExtensionContext;
}

/** The channel the report is written to. */
function lines(): string[] {
  const channel = __state.outputChannels[0];
  if (!channel) throw new Error("no output channel was created");
  return channel.lines;
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
      COMMAND_COMPARE_THEMES,
    );
    expect(__state.commands.has(COMMAND_COMPARE_THEMES)).toBe(true);
  });

  it("is titled for the palette", () => {
    const entry = manifest.contributes.commands.find(
      (candidate) => candidate.command === COMMAND_COMPARE_THEMES,
    );
    expect(entry?.title).toBe("Compare Themes…");
  });
});

describe("themvora.compareThemes", () => {
  it("reports identical themes as having no differences", async () => {
    const a = project.write("a.json", JSON.stringify(PAIR.light, null, 2));
    const b = project.write("b.json", JSON.stringify(PAIR.light, null, 2));

    await __invoke(COMMAND_COMPARE_THEMES, Uri.file(a), Uri.file(b));

    expect(__state.info).toHaveLength(1);
    expect(__state.info[0]).toContain("no token differences");
    expect(lines().join("\n")).toContain("No token differences.");
  });

  it("reports the differences between two single themes", async () => {
    const a = project.write("a.json", JSON.stringify(PAIR.light, null, 2));
    const b = project.write("b.json", JSON.stringify(OTHER.light, null, 2));

    await __invoke(COMMAND_COMPARE_THEMES, Uri.file(a), Uri.file(b));

    expect(__state.info[0]).toMatch(/token differences? between/);

    const report = lines().join("\n");
    expect(report).toContain("light (both)");
    expect(report).toContain("changed");
    // A real changed path, with both values.
    expect(report).toMatch(/colors\.\w+: #\w+ → #\w+/);
  });

  it("compares both modes when both documents are pairs", async () => {
    const a = project.write("a.json", PAIR_JSON);
    const b = project.write("b.json", OTHER_PAIR_JSON);

    await __invoke(COMMAND_COMPARE_THEMES, Uri.file(a), Uri.file(b));

    const report = lines().join("\n");
    // A pair is passed as a set, so core reports each mode rather than the
    // command collapsing it to one half.
    expect(report).toContain("light (both)");
    expect(report).toContain("dark (both)");
  });

  it("names the file when the first document is malformed", async () => {
    const a = project.write("broken.json", "{ nope");
    const b = project.write("b.json", JSON.stringify(PAIR.light, null, 2));

    await __invoke(COMMAND_COMPARE_THEMES, Uri.file(a), Uri.file(b));

    expect(__state.errors).toHaveLength(1);
    expect(__state.errors[0]).toContain("broken.json");
    expect(__state.errors[0]).toContain("not valid JSON");
    // No partial report.
    expect(lines()).toEqual([]);
    expect(__state.info).toEqual([]);
  });

  it("names the file when the second document is not a theme", async () => {
    const a = project.write("a.json", JSON.stringify(PAIR.light, null, 2));
    const b = project.write("other.json", '{"hello":"world"}');

    await __invoke(COMMAND_COMPARE_THEMES, Uri.file(a), Uri.file(b));

    expect(__state.errors).toHaveLength(1);
    expect(__state.errors[0]).toContain("other.json");
    expect(__state.errors[0]).toContain("neither a theme");
    expect(lines()).toEqual([]);
  });

  it("reports an unreadable file", async () => {
    const a = project.write("a.json", JSON.stringify(PAIR.light, null, 2));

    await __invoke(COMMAND_COMPARE_THEMES, Uri.file(a), Uri.file(`${project.root}/gone.json`));

    expect(__state.errors[0]).toContain("could not read");
    expect(lines()).toEqual([]);
  });

  it("does nothing when the first dialog is dismissed", async () => {
    __state.openDialog = undefined;

    await __invoke(COMMAND_COMPARE_THEMES);

    expect(__state.info).toEqual([]);
    expect(__state.errors).toEqual([]);
    expect(lines()).toEqual([]);
  });

  it("does nothing when the second dialog is dismissed", async () => {
    const a = project.write("a.json", JSON.stringify(PAIR.light, null, 2));
    __state.openDialog = undefined;

    // The first side is supplied, so the cancelled dialog is the second one.
    await __invoke(COMMAND_COMPARE_THEMES, Uri.file(a));

    expect(__state.info).toEqual([]);
    expect(__state.errors).toEqual([]);
    expect(lines()).toEqual([]);
  });

  it("compares two themes chosen from the catalog", async () => {
    // No file dialogs: a catalog preset is a theme, and exporting it to JSON to
    // compare it would be asking the user to do the extension's job.
    __state.quickPickQueue = ["Oat · light", "Berry · light"];

    await __invoke(COMMAND_COMPARE_THEMES);

    const report = lines().join("\n");
    expect(report).toContain("Oat");
    expect(report).toContain("Berry");
    expect(report).toContain("Catalog preset");
    expect(__state.info[0]).toMatch(/token differences? between/);
  });

  it("offers the whole catalog and never the same theme twice", async () => {
    __state.quickPickQueue = ["Oat · light", "Oat · light"];

    await __invoke(COMMAND_COMPARE_THEMES);

    // The second picker excludes what the first one chose, so its queue entry
    // finds no match and the command ends quietly.
    expect(__state.quickPickItems.some((item) => item.label === "Oat · light")).toBe(false);
    expect(__state.info).toEqual([]);
    expect(__state.errors).toEqual([]);
  });

  it("writes nothing to the workspace", async () => {
    const a = project.write("a.json", JSON.stringify(PAIR.light, null, 2));
    const b = project.write("b.json", JSON.stringify(OTHER.light, null, 2));
    const before = project.files();

    await __invoke(COMMAND_COMPARE_THEMES, Uri.file(a), Uri.file(b));

    expect(project.files()).toEqual(before);
    expect(__state.written).toEqual([]);
  });
});
