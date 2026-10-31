/**
 * Reader-adapter tests against real files.
 *
 * The fake `vscode` module's `workspace.fs` talks to the real filesystem, so
 * these exercise the adapter's path handling and its error swallowing for real —
 * including a root whose path contains spaces, which is where segment handling
 * usually breaks.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { inspectProject } from "../src/domain/inspectProject";
import { createWorkspaceReader } from "../src/services/workspaceReader";
import { createTempProject, type TempProject } from "./helpers/tempProject";
import { Uri } from "./stubs/vscode";

let project: TempProject;

beforeEach(() => {
  project = createTempProject();
});

afterEach(() => {
  project.cleanup();
});

describe("createWorkspaceReader", () => {
  it("reads a file relative to the root", async () => {
    project.write("theme.config.ts", "export default {};");
    const reader = createWorkspaceReader(Uri.file(project.root));

    await expect(reader.read("theme.config.ts")).resolves.toBe("export default {};");
  });

  it("reads a nested file", async () => {
    project.write("src/themes/themes.ts", "export const themes = [];");
    const reader = createWorkspaceReader(Uri.file(project.root));

    await expect(reader.read("src/themes/themes.ts")).resolves.toBe("export const themes = [];");
  });

  it("returns null for a missing file instead of throwing", async () => {
    const reader = createWorkspaceReader(Uri.file(project.root));

    await expect(reader.read("nope.json")).resolves.toBeNull();
    await expect(reader.read("deep/nested/nope.json")).resolves.toBeNull();
  });

  it("lists files but not directories", async () => {
    project.write("theme.json", "{}");
    project.write("themes/one.json", "{}");
    const reader = createWorkspaceReader(Uri.file(project.root));

    // Directories are filtered out because every caller scans a known directory
    // by name; a directory in the list would be read as a file and fail.
    await expect(reader.list(".")).resolves.toEqual(["theme.json"]);
  });

  it("lists a nested directory", async () => {
    project.write("themes/a.json", "{}");
    project.write("themes/b.json", "{}");
    project.write("themes/themes.ts", "");
    const reader = createWorkspaceReader(Uri.file(project.root));

    await expect(reader.list("themes")).resolves.toEqual(["a.json", "b.json", "themes.ts"]);
  });

  it("returns an empty list for a missing directory", async () => {
    const reader = createWorkspaceReader(Uri.file(project.root));

    await expect(reader.list("themes")).resolves.toEqual([]);
  });

  it("handles a root path containing spaces", async () => {
    const spaced = createTempProject("themvora with spaces ");
    try {
      spaced.write("theme.json", "{}");
      const reader = createWorkspaceReader(Uri.file(spaced.root));

      await expect(reader.read("theme.json")).resolves.toBe("{}");
      await expect(reader.list(".")).resolves.toEqual(["theme.json"]);
    } finally {
      spaced.cleanup();
    }
  });
});

describe("inspection against a real directory", () => {
  it("does not write anything", async () => {
    project.write("package.json", JSON.stringify({ dependencies: { "@themvora/core": "^1.4.0" } }));
    project.write("theme.json", "{}");
    project.write("src/themes/themes.ts", "export const themes = [];");

    const before = project.files();
    await inspectProject(project.root, createWorkspaceReader(Uri.file(project.root)));
    const after = project.files();

    expect(after).toEqual(before);
  });

  it("inspects a project outside the monorepo", async () => {
    project.write(
      "package.json",
      JSON.stringify({ dependencies: { "@themvora/core": "^1.4.0" } }),
    );
    project.write("src/themes/themes.ts", "export const themes = [];");

    const result = await inspectProject(project.root, createWorkspaceReader(Uri.file(project.root)));

    expect(result.status).toBe("unsupported");
    expect(result.packages).toEqual(["@themvora/core"]);
    expect(result.root).toBe(project.root);
  });
});
