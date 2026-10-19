/**
 * Tests for `themvora migrate`.
 *
 * The command's contract is mostly about *not* writing: the migrated theme goes
 * to stdout by default, `--dry-run` reports and stops, and the input file is only
 * overwritten under `--write`. Those are the assertions that matter — a
 * migration tool that overwrites a file it was asked to inspect is worse than one
 * that does nothing.
 */
import { registerMigration, clearMigrations } from "@themvora/core";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cli, tempDir, type TempDir } from "./helpers.js";

let dir: TempDir | null = null;

afterEach(() => {
  dir?.cleanup();
  dir = null;
  clearMigrations();
});

beforeEach(() => {
  clearMigrations();
});

/** A legacy theme file with the given declared version. */
function legacyFile(version: string | null): TempDir {
  dir = tempDir();
  const theme = {
    name: "legacy-light",
    meta: {
      family: "legacy",
      mode: "light",
      ...(version !== null ? { version } : {}),
    },
    tokens: { colors: { background: "#ffffff" } },
  };
  dir.write("legacy.json", JSON.stringify(theme, null, 2));
  return dir;
}

describe("migrate default behaviour", () => {
  it("prints the migrated theme to stdout and writes nothing", async () => {
    const d = legacyFile("0.1");

    const result = await cli("migrate", join(d.path, "legacy.json"));

    expect(result.code).toBe(0);
    expect(result.json<{ name: string }>().name).toBe("legacy-light");
    expect(existsSync(join(d.path, "out.json"))).toBe(false);
  });

  it("writes to --output and says so on stderr", async () => {
    const d = legacyFile("0.1");

    const result = await cli("migrate", join(d.path, "legacy.json"), "--output", join(d.path, "out.json"));

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Migrated theme written to");
    expect(existsSync(join(d.path, "out.json"))).toBe(true);
  });

  it("leaves the input untouched when writing elsewhere", async () => {
    const d = legacyFile("0.1");
    const before = d.read("legacy.json");

    await cli("migrate", join(d.path, "legacy.json"), "--output", join(d.path, "out.json"));

    expect(d.read("legacy.json")).toBe(before);
  });
});

describe("migrate --dry-run", () => {
  it("never writes, even with a destination", async () => {
    const d = legacyFile("0.1");
    const before = d.read("legacy.json");

    const result = await cli("migrate", join(d.path, "legacy.json"), "--dry-run");

    expect(result.code).toBe(0);
    expect(d.read("legacy.json")).toBe(before);
    expect(result.stdout).toContain("themvora migrate — plan");
  });

  it("reports that nothing would change when the theme is current", async () => {
    const d = legacyFile("0.1");

    const result = await cli("migrate", join(d.path, "legacy.json"), "--dry-run");

    expect(result.stdout).toContain("Already current");
  });

  it("reports the version transition when a migration applies", async () => {
    registerMigration({
      from: "0.0",
      to: "0.1",
      migrate: (theme) => ({ ...theme, meta: { ...theme.meta, version: "0.1" } }),
    });
    const d = legacyFile("0.0");

    const result = await cli("migrate", join(d.path, "legacy.json"), "--dry-run");

    expect(result.stdout).toContain("version 0.0 → 0.1");
    expect(result.stdout).toContain("would change");
    // Still nothing written.
    expect(JSON.parse(d.read("legacy.json")).meta.version).toBe("0.0");
  });

  it("emits the plan as JSON", async () => {
    const d = legacyFile("0.1");

    const result = await cli("migrate", join(d.path, "legacy.json"), "--dry-run", "--json");
    const report = result.json<{ dryRun: boolean; written: null; themes: unknown[] }>();

    expect(report.dryRun).toBe(true);
    expect(report.written).toBeNull();
    expect(report.themes).toHaveLength(1);
  });
});

describe("migrate --write", () => {
  it("migrates the file in place", async () => {
    registerMigration({
      from: "0.0",
      to: "0.1",
      migrate: (theme) => ({ ...theme, meta: { ...theme.meta, version: "0.1" } }),
    });
    const d = legacyFile("0.0");

    const result = await cli("migrate", join(d.path, "legacy.json"), "--write");

    expect(result.code).toBe(0);
    expect(result.stderr).toContain("Migrated theme written to");
    expect(JSON.parse(d.read("legacy.json")).meta.version).toBe("0.1");
  });

  it("does not add a trailing newline, matching the other writers", async () => {
    const d = legacyFile("0.1");

    await cli("migrate", join(d.path, "legacy.json"), "--write");

    expect(d.read("legacy.json").endsWith("}")).toBe(true);
  });
});

describe("migrate flag conflicts", () => {
  it("rejects --write together with --output", async () => {
    const d = legacyFile("0.1");

    const result = await cli(
      "migrate",
      join(d.path, "legacy.json"),
      "--write",
      "--output",
      join(d.path, "out.json"),
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("cannot be combined with --output");
  });

  it("rejects --dry-run together with --write", async () => {
    const d = legacyFile("0.1");

    const result = await cli("migrate", join(d.path, "legacy.json"), "--dry-run", "--write");

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--dry-run never writes");
  });

  it("rejects --dry-run together with --output", async () => {
    const d = legacyFile("0.1");

    const result = await cli(
      "migrate",
      join(d.path, "legacy.json"),
      "--dry-run",
      "--output",
      join(d.path, "out.json"),
    );

    expect(result.code).toBe(2);
  });

  it("requires a file", async () => {
    const result = await cli("migrate");

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--file <path> is required");
  });
});

describe("migrate --json", () => {
  it("emits a report and notes that the theme was not persisted", async () => {
    const d = legacyFile("0.1");

    const result = await cli("migrate", join(d.path, "legacy.json"), "--json");

    expect(result.code).toBe(0);
    // The report is the stdout payload, so the theme had nowhere to go.
    expect(result.stderr).toContain("add --write or --output");
    expect(result.json<{ version: number }>().version).toBe(1);
  });

  it("reports where the result was written", async () => {
    const d = legacyFile("0.1");

    const result = await cli(
      "migrate",
      join(d.path, "legacy.json"),
      "--output",
      join(d.path, "out.json"),
      "--json",
    );
    const report = result.json<{ written: string; changed: boolean }>();

    expect(report.written).toContain("out.json");
    expect(report.changed).toBe(false);
  });

  it("reports a pair as two themes", async () => {
    dir = tempDir();
    const pair = {
      light: { name: "pair-light", meta: { family: "pair", mode: "light", version: "0.1" }, tokens: {} },
      dark: { name: "pair-dark", meta: { family: "pair", mode: "dark", version: "0.1" }, tokens: {} },
    };
    dir.write("pair.json", JSON.stringify(pair, null, 2));

    const result = await cli("migrate", join(dir.path, "pair.json"), "--dry-run", "--json");
    const report = result.json<{ themes: { name: string }[] }>();

    expect(report.themes.map((theme) => theme.name)).toEqual(["pair-light", "pair-dark"]);
  });
});
