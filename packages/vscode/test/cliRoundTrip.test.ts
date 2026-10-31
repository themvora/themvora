/**
 * The artefact contract: what the extension writes, the CLI must read.
 *
 * This is not a fixture test. The file under test is produced by running the
 * real command handler through the fake host, then handed to the real CLI
 * binary, which is the only way to catch a drift between the two — a change to
 * the emitted shape or to the CLI's accepted shapes fails here rather than in a
 * user's terminal.
 *
 * The project directory contains spaces on purpose: arguments are passed as an
 * array, and this proves nothing downstream re-joins them into a shell string.
 *
 * @packageDocumentation
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ExtensionContext } from "vscode";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import manifest from "../package.json";
import { COMMAND_GENERATE_THEME } from "../src/commands/generateTheme";
import { activate } from "../src/index";
import { createTempProject, type TempProject } from "./helpers/tempProject";
import { __invoke, __reset, Uri } from "./stubs/vscode";

/** The built CLI. `pnpm -r build` produces it; CI builds before testing. */
const CLI = fileURLToPath(new URL("../../cli/dist/cli.cjs", import.meta.url));

/** Whether the CLI has been built in this checkout. */
const cliBuilt = existsSync(CLI);

/** One CLI invocation's outcome. */
interface CliRun {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Run the real CLI.
 *
 * @param argv - Arguments after the binary name.
 * @returns The exit code and both streams.
 */
function cli(...argv: string[]): CliRun {
  const result = spawnSync(process.execPath, [CLI, ...argv], { encoding: "utf8" });
  return { code: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

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

beforeEach(() => {
  __reset();
  // A directory name with spaces, so the whole path exercises argument handling.
  project = createTempProject("themvora round trip ");
  activate(context());
});

afterEach(() => {
  project.cleanup();
});

describe.skipIf(!cliBuilt)("extension artefact → CLI", () => {
  /** Generate a theme with the real handler and return the file it wrote. */
  async function generate(): Promise<string> {
    const target = `${project.root}/theme-output.json`;
    await __invoke(COMMAND_GENERATE_THEME, "#4f46e5", Uri.file(target));

    expect(existsSync(target)).toBe(true);
    return target;
  }

  it("validates the file the command produced", async () => {
    const file = await generate();
    const run = cli("validate", file, "--json");

    expect(run.code).toBe(0);
    const report = JSON.parse(run.stdout) as { valid: boolean; summary: { themes: number } };
    expect(report.valid).toBe(true);
    expect(report.summary.themes).toBe(2);
  });

  it("inspects the file the command produced", async () => {
    const file = await generate();
    const run = cli("inspect", file, "--json");

    expect(run.code).toBe(0);

    // A pair is reported as `{ themes: [...] }`; a single theme is reported
    // directly. This file is a pair, but the test accepts either shape so a
    // change of mode does not silently pass by matching nothing.
    type Summary = {
      name: string;
      mode: string;
      generation: { seed: string; algorithm: string } | null;
    };
    const parsed = JSON.parse(run.stdout) as Summary | { themes: Summary[] };
    const first = "themes" in parsed ? parsed.themes[0]! : parsed;

    expect(first.name).toBe("generated-light");
    expect(first.mode).toBe("light");
    // Provenance survives the trip through the extension and back into the CLI.
    expect(first.generation?.seed).toBe("#4f46e5");
    expect(first.generation?.algorithm).toBe("semantic-v2");
  });

  it("exports the file the command produced as CSS", async () => {
    const file = await generate();
    const run = cli("export", file, "--format", "css");

    expect(run.code).toBe(0);
    expect(run.stdout).toContain("--theme-color-background");
    expect(run.stdout).toContain("--theme-color-primary");
    // Both modes are exported, so the file carries a dark block too.
    expect(run.stdout).toContain('.dark, [data-theme="dark"]');
  });

  it("reports a validation failure for a file the CLI rejects", async () => {
    // The complement of the contract: the CLI's exit code is meaningful, not
    // always zero. Exit 3 is the documented "validation failed" code, and it
    // applies to a document that parses as a pair but fails validation.
    const broken = project.write(
      "broken.json",
      JSON.stringify({
        light: { name: "broken-light", tokens: { colors: {} } },
        dark: { name: "broken-dark", tokens: { colors: {} } },
      }),
    );
    const run = cli("validate", broken, "--json");

    expect(run.code).toBe(3);
    expect((JSON.parse(run.stdout) as { valid: boolean }).valid).toBe(false);
  });
});
