/**
 * Wording for a project with nothing to show.
 *
 * The distinction under test is the one a user cannot make for themselves: "this
 * is not a Themvora project" and "this is a Themvora project whose themes this
 * extension cannot read" produce the same empty panel, and only one of them means
 * the extension is working as designed.
 */

import { describe, expect, it } from "vitest";

import { describeEmptyProject, describeProjectStatus } from "../src/domain/statusLabels";

describe("describeEmptyProject", () => {
  it("keeps the plain message when nothing was found and nothing is installed", () => {
    expect(describeEmptyProject("missing", [])).toBe(describeProjectStatus("missing"));
  });

  it("names the packages when they are installed but no files were found", () => {
    const message = describeEmptyProject("missing", ["@themvora/core", "@themvora/tailwind"]);

    expect(message).toContain("@themvora/core");
    expect(message).toContain("@themvora/tailwind");
    expect(message).toContain("project root");
    // The limitation is stated rather than implied, because a TypeScript registry
    // is the most likely reason a wired-up project still shows nothing.
    expect(message).toContain("TypeScript theme modules cannot be read yet");
  });

  it("does not claim nothing was found when a registry was found but is unreadable", () => {
    const message = describeEmptyProject("unsupported", ["@themvora/core"]);

    // `unsupported` has its own sentence, and it must not be replaced by the
    // "no configuration found" wording — that would contradict the tree.
    expect(message).toBe(describeProjectStatus("unsupported"));
    expect(message).not.toContain("no theme.config");
  });
});
