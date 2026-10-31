/**
 * JSONC acceptance in the CLI.
 *
 * The extension and the CLI share one parser, so a commented theme file must
 * behave the same in both. These cover the CLI half; the editor half is in
 * `packages/vscode/test/jsonc.test.ts`.
 */
import { generateTheme } from "@themvora/core";
import { afterEach, describe, expect, it } from "vitest";

import { cli, tempDir, type TempDir } from "./helpers.js";

let dir: TempDir | null = null;

afterEach(() => {
  dir?.cleanup();
  dir = null;
});

/** A valid pair, pretty-printed. */
function pairJSON(): string {
  return JSON.stringify(generateTheme({ seed: "#059669", family: "mint" }), null, 2);
}

/** Insert a line comment after the opening brace. */
function withComment(json: string): string {
  return json.replace("{", "{\n  // hand-authored, keep the comments\n");
}

/** Turn the final closing brace's predecessor into a trailing comma. */
function withTrailingComma(json: string): string {
  return json.replace(/\n}$/, ",\n}");
}

describe("validate accepts JSONC", () => {
  it("accepts a commented theme", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", withComment(pairJSON()));

    const result = await cli("validate", file);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Theme is valid");
    expect(result.stdout).toContain("mint-light");
  });

  it("accepts a trailing comma", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", withTrailingComma(pairJSON()));

    const result = await cli("validate", file);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Theme is valid");
  });

  it("accepts both at once", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", withTrailingComma(withComment(pairJSON())));

    const result = await cli("validate", file);

    expect(result.code).toBe(0);
  });

  it("does not treat comment-like text inside a string as a comment", async () => {
    dir = tempDir();
    const theme = generateTheme({ seed: "#059669", family: "mint" });
    theme.light.meta = { ...theme.light.meta, description: "https://example.com // not a comment" };
    const file = dir.write("theme.json", JSON.stringify(theme, null, 2));

    const result = await cli("validate", file);

    // If the `//` were treated as a comment, the rest of the line — including the
    // closing quote and brace — would be blanked and the file would fail to parse.
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Theme is valid");
  });

  it("inspects a commented theme", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", withComment(pairJSON()));

    const result = await cli("inspect", file, "--json");

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).themes).toHaveLength(2);
  });
});

describe("malformed input still fails", () => {
  it("rejects an unterminated block comment", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", '{ "light": { /* unterminated');

    const result = await cli("validate", file);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("not valid JSON");
  });

  it("rejects a document that is only a comment", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", "// nothing but a comment");

    const result = await cli("validate", file);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("not valid JSON");
  });

  it("names the parser's complaint", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", '{ "light": }');

    const result = await cli("validate", file);

    expect(result.code).toBe(1);
    // The message carries more than "invalid": it says where parsing stopped.
    expect(result.stderr.length).toBeGreaterThan("file is not valid JSON".length);
  });
});
