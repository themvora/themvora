import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateTheme } from "@themvora/core";
import { cli, tempDir, type TempDir } from "./helpers.js";

let dir: TempDir | null = null;

afterEach(() => {
  dir?.cleanup();
  dir = null;
});

/** A valid single light theme file. */
function writeLightTheme(target: TempDir, name: string): string {
  const theme = generateTheme({ seed: "#3366ff", family: "blue" }).light;
  return target.write(name, JSON.stringify(theme, null, 2));
}

/** A valid light/dark pair file. */
function writePair(target: TempDir, name: string): string {
  const pair = generateTheme({ seed: "#3366ff", family: "blue" });
  return target.write(name, JSON.stringify(pair, null, 2));
}

describe("diff — source resolution", () => {
  it("resolves two preset ids", async () => {
    const result = await cli("diff", "mint", "iris");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("a: preset mint");
    expect(result.stdout).toContain("b: preset iris");
  });

  it("resolves a brand id", async () => {
    const result = await cli("diff", "mint", "apple");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("b: brand apple");
  });

  it("resolves a theme file and labels it as a file", async () => {
    dir = tempDir();
    const file = writePair(dir, "theme.json");

    const result = await cli("diff", file, "mint");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`a: file ${file}`);
    expect(result.stdout).toContain("b: preset mint");
  });

  it("resolves a file against a file", async () => {
    dir = tempDir();
    const first = writeLightTheme(dir, "a.json");
    const second = writeLightTheme(dir, "b.json");

    const result = await cli("diff", first, second);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("are identical");
  });

  it("takes a file for a positional and a flag for the other side", async () => {
    dir = tempDir();
    const file = writeLightTheme(dir, "a.json");

    const result = await cli("diff", file, "--preset", "mint");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`a: file ${file}`);
    expect(result.stdout).toContain("b: preset mint");
  });

  it("accepts --seed as a source", async () => {
    const result = await cli("diff", "--seed", "#3366ff", "--preset", "mint", "--quiet");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("a: seed #3366ff");
    expect(result.stdout).toContain("b: preset mint");
  });

  it("assigns explicit flags in the order they were typed", async () => {
    const brandFirst = await cli("diff", "--brand", "apple", "--preset", "mint", "--quiet");
    expect(brandFirst.stdout).toContain("a: brand apple");
    expect(brandFirst.stdout).toContain("b: preset mint");

    const presetFirst = await cli("diff", "--preset", "mint", "--brand", "apple", "--quiet");
    expect(presetFirst.stdout).toContain("a: preset mint");
    expect(presetFirst.stdout).toContain("b: brand apple");
  });

  it("accepts a repeated flag for the two sides", async () => {
    const result = await cli("diff", "--seed", "#111111", "--seed", "#222222", "--quiet");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("a: seed #111111");
    expect(result.stdout).toContain("b: seed #222222");
  });

  it("prefers an existing file over a preset id of the same name", async () => {
    dir = tempDir();
    const file = join(dir.path, "mint");
    const theme = generateTheme({ seed: "#3366ff", family: "blue" }).light;
    dir.write("mint", JSON.stringify(theme, null, 2));

    const cwd = process.cwd();
    try {
      process.chdir(dir.path);
    } catch {
      return; // `process.chdir` is unavailable in a worker thread — skip.
    }

    try {
      const result = await cli("diff", "mint", "--preset", "iris", "--quiet");
      expect(result.code).toBe(0);
      expect(result.stdout).toContain("a: file mint");
    } finally {
      process.chdir(cwd);
    }

    expect(existsSync(file)).toBe(true);
  });
});

describe("diff — usage errors", () => {
  it("rejects an unresolvable source with exit 2", async () => {
    const result = await cli("diff", "nonexistent", "mint");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("cannot resolve");
  });

  it("suggests the closest id for a typo", async () => {
    const result = await cli("diff", "--preset", "mintt", "--preset", "iris");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('did you mean "mint"?');
  });

  it("rejects a missing side with exit 2", async () => {
    const result = await cli("diff", "mint");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('side "b" needs a source');
  });

  it("rejects a source for a side that already has one", async () => {
    const result = await cli("diff", "mint", "iris", "--preset", "oat");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("a side takes one source");
  });

  it("rejects --mode system", async () => {
    const result = await cli("diff", "mint", "iris", "--mode", "system");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("selector over the light and dark themes");
  });

  it("rejects an invalid mode", async () => {
    const result = await cli("diff", "mint", "iris", "--mode", "banana");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("invalid mode");
  });

  it("rejects a mode a source does not have", async () => {
    dir = tempDir();
    const file = writeLightTheme(dir, "light.json");

    const result = await cli("diff", file, "mint", "--mode", "dark");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('side "a" has no dark theme');
  });
});

describe("diff — runtime errors", () => {
  it("fails with exit 1 when a path-looking source does not exist", async () => {
    const result = await cli("diff", join(process.cwd(), "does-not-exist.json"), "mint");
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("cannot read file");
  });

  it("fails with exit 1 when a file is not valid JSON", async () => {
    dir = tempDir();
    const file = dir.write("bad.json", "{ not json");

    const result = await cli("diff", file, "mint");
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("not valid JSON");
  });

  it("fails with exit 1 when a theme declares mode system", async () => {
    dir = tempDir();
    const file = dir.write(
      "sys.json",
      JSON.stringify({
        name: "sys",
        meta: { family: "sys", mode: "system" },
        tokens: { colors: { background: "#808080" } },
      }),
    );

    const result = await cli("diff", file, "mint");
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('mode "system"');
  });
});

describe("diff — output", () => {
  it("reports identical themes without claiming a change", async () => {
    const result = await cli("diff", "mint", "mint");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("are identical");
    expect(result.stdout).toContain("tokens compared");
  });

  it("hides unchanged tokens by default and shows them with --all", async () => {
    const withoutAll = await cli("diff", "mint", "iris");
    expect(withoutAll.stdout).not.toContain("(unchanged)");

    const withAll = await cli("diff", "mint", "iris", "--all");
    expect(withAll.stdout).toContain("(unchanged)");
  });

  it("prints only counts under --quiet", async () => {
    const result = await cli("diff", "mint", "iris", "--quiet");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("changed ·");
    // No section headers and no per-token rows.
    expect(result.stdout).not.toContain("Canvas");
    expect(result.stdout).not.toContain("Actions");
  });

  it("restricts the comparison under --mode", async () => {
    const result = await cli("diff", "mint", "iris", "--mode", "dark");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("dark");
    expect(result.stdout).not.toMatch(/^light$/m);
  });

  it("emits a pure, parseable JSON report", async () => {
    const result = await cli("diff", "mint", "iris", "--json");
    expect(result.code).toBe(0);

    const report = result.json<{
      version: number;
      hasChanges: boolean;
      modes: Record<string, { mode: string; counts: { total: number } }>;
      a: { mode: string };
      provenance: { changed: boolean; differing: string[] };
    }>();

    expect(report.version).toBe(1);
    expect(report.hasChanges).toBe(true);
    expect(Object.keys(report.modes).sort()).toEqual(["dark", "light"]);
    expect(["light", "dark"]).toContain(report.a.mode);
    // Nothing but JSON on stdout.
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it("never emits a system mode key in JSON", async () => {
    const result = await cli("diff", "mint", "iris", "--json");
    const report = result.json<{ modes: Record<string, { mode: string }> }>();

    for (const [key, value] of Object.entries(report.modes)) {
      expect(key).not.toBe("system");
      expect(value.mode).not.toBe("system");
    }
  });

  it("accepts the `compare` alias", async () => {
    const result = await cli("compare", "mint", "iris", "--quiet");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("changed ·");
  });
});
