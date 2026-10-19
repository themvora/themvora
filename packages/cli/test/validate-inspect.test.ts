import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateTheme, type ThemeDefinition } from "@themvora/core";
import { cli, tempDir, type TempDir } from "./helpers.js";

let dir: TempDir | null = null;

afterEach(() => {
  dir?.cleanup();
  dir = null;
});

/** A valid light/dark pair as JSON. */
function validPairJSON(): string {
  return JSON.stringify(generateTheme({ seed: "#059669", family: "mint" }), null, 2);
}

/** A theme missing required colour tokens. */
function brokenThemeJSON(): string {
  return JSON.stringify({
    name: "broken",
    meta: { mode: "light", family: "broken" },
    tokens: { colors: { background: "#ffffff" } },
  });
}

describe("validate", () => {
  it("accepts a valid theme file and keeps the documented summary", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", validPairJSON());

    const result = await cli("validate", file);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Theme is valid");
    expect(result.stdout).toContain("mint-light");
  });

  it("reports the layers core provides", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", validPairJSON());

    const result = await cli("validate", file);
    for (const layer of ["structure", "semantic", "contrast", "accessibility", "measured"]) {
      expect(result.stdout, layer).toContain(layer);
    }
  });

  it("fails with exit 3 when required tokens are missing", async () => {
    dir = tempDir();
    const file = dir.write("broken.json", brokenThemeJSON());

    const result = await cli("validate", file);
    expect(result.code).toBe(3);
    expect(result.stderr).toContain("Theme is invalid");
    expect(result.stderr).toContain("Missing token");
  });

  it("fails with exit 1 when the file cannot be read", async () => {
    const result = await cli("validate", join(process.cwd(), "does-not-exist.json"));
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("cannot read file");
  });

  it("fails with exit 1 when the file is not JSON", async () => {
    dir = tempDir();
    const file = dir.write("bad.json", "{ not json");

    const result = await cli("validate", file);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("not valid JSON");
  });

  it("fails with exit 2 when no file is given", async () => {
    const result = await cli("validate");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--file <path> is required");
  });

  it("emits a parseable JSON report", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", validPairJSON());

    const result = await cli("validate", file, "--json");
    expect(result.code).toBe(0);

    const report = result.json<{
      valid: boolean;
      themes: { name: string; valid: boolean; layers: unknown[]; contrast: { pairs: number } }[];
      summary: { themes: number; valid: number; invalid: number };
    }>();

    expect(report.valid).toBe(true);
    expect(report.summary).toEqual({ themes: 2, valid: 2, invalid: 0 });
    expect(report.themes[0]!.name).toBe("mint-light");
    expect(report.themes[0]!.contrast.pairs).toBeGreaterThan(0);
    // Nothing but JSON on stdout.
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it("emits a JSON report for an invalid theme and still exits 3", async () => {
    dir = tempDir();
    const file = dir.write("broken.json", brokenThemeJSON());

    const result = await cli("validate", file, "--json");
    expect(result.code).toBe(3);
    expect(result.json<{ valid: boolean }>().valid).toBe(false);
  });

  it("suppresses the success summary under --quiet but keeps errors", async () => {
    dir = tempDir();
    const valid = dir.write("theme.json", validPairJSON());
    const quiet = await cli("validate", valid, "--quiet");
    expect(quiet.code).toBe(0);
    expect(quiet.stdout).toBe("");

    const broken = dir.write("broken.json", brokenThemeJSON());
    const loud = await cli("validate", broken, "--quiet");
    expect(loud.code).toBe(3);
    expect(loud.stderr).toContain("Theme is invalid");
  });
});

describe("inspect", () => {
  it("summarises a theme and its provenance", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", validPairJSON());

    const result = await cli("inspect", file);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("mint-light");
    expect(result.stdout).toContain("Provenance:");
    expect(result.stdout).toContain("semantic-v2");
    expect(result.stdout).toContain("Tokens:");
    expect(result.stdout).toContain("Accessibility:");
  });

  it("identifies a theme with no generation provenance", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", brokenThemeJSON());

    const result = await cli("inspect", file);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("not recorded");
  });

  it("narrows to the requested sections", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", validPairJSON());

    const result = await cli("inspect", file, "--generation");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Provenance:");
    expect(result.stdout).not.toContain("Accessibility:");
  });

  it("emits a parseable JSON summary", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", validPairJSON());

    const result = await cli("inspect", file, "--json");
    expect(result.code).toBe(0);

    const summary = result.json<{
      themes: { name: string; generation: { algorithm: string; seed: string } | null }[];
    }>();
    expect(summary.themes[0]!.name).toBe("mint-light");
    expect(summary.themes[0]!.generation?.algorithm).toBe("semantic-v2");
    expect(summary.themes[0]!.generation?.seed).toBe("#059669");
  });

  it("fails with exit 2 when no file is given", async () => {
    const result = await cli("inspect");
    expect(result.code).toBe(2);
  });
});

describe("existing commands remain intact", () => {
  it("export still emits CSS and flat JSON", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", validPairJSON());

    const css = await cli("export", file, "--format", "css");
    expect(css.code).toBe(0);
    expect(css.stdout).toContain("--theme-color-background");

    const json = await cli("export", file, "--format", "json");
    expect(json.code).toBe(0);
    expect(json.json<{ light: Record<string, string> }>().light["--theme-color-background"]).toBeDefined();
  });

  it("export rejects an unknown format with exit 2", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", validPairJSON());

    const result = await cli("export", file, "--format", "yaml");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("unknown format");
  });

  it("migrate round-trips a theme", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", validPairJSON());

    const result = await cli("migrate", file);
    expect(result.code).toBe(0);
    const migrated = result.json<{ light: ThemeDefinition }>();
    expect(migrated.light.name).toBe("mint-light");
  });
});
