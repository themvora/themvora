import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getPresetCatalog } from "@themvora/core";
import { cli, tempDir, type TempDir } from "./helpers.js";

let dir: TempDir | null = null;

afterEach(() => {
  dir?.cleanup();
  dir = null;
});

/** A valid single light theme file. */
function writeLightTheme(target: TempDir, name: string): string {
  const theme = {
    name: "blue-light",
    meta: { family: "blue", mode: "light" },
    tokens: {
      colors: {
        background: "#ffffff",
        foreground: "#111111",
        primary: "#3366ff",
        primaryForeground: "#ffffff",
      },
    },
  };
  return target.write(name, JSON.stringify(theme, null, 2));
}

describe("explain — sources", () => {
  it("explains a canonical preset", async () => {
    const result = await cli("explain", "--preset", "mint");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("preset mint");
    expect(result.stdout).toContain("curated preset");
    expect(result.stdout).toContain("soft");
    expect(result.stdout).toContain("#059669");
    expect(result.stdout).toContain("semantic-v2");
  });

  it("explains a brand recipe including its anchors", async () => {
    const result = await cli("explain", "--brand", "apple");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("brand-inspired");
    expect(result.stdout).toContain("identity");
    expect(result.stdout).toContain("System Blue");
    expect(result.stdout).toContain("anchors");
    // The canonical disclaimer must appear verbatim.
    expect(result.stdout).toContain("not official brand themes");
  });

  it("explains a seed", async () => {
    const result = await cli("explain", "--seed", "#6366f1");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("generated");
    expect(result.stdout).toContain("#6366f1");
    // No brand identity for a seed.
    expect(result.stdout).not.toContain("identity");
  });

  it("explains a theme file", async () => {
    dir = tempDir();
    const file = writeLightTheme(dir, "theme.json");

    const result = await cli("explain", file);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("theme file");
    expect(result.stdout).toContain(`file ${file}`);
  });

  it("resolves a preset id passed positionally", async () => {
    const result = await cli("explain", "mint", "--quiet");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("preset mint");
  });

  it("accepts the `why` alias", async () => {
    const result = await cli("why", "--preset", "mint", "--quiet");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("preset mint");
  });
});

describe("explain — no re-derivation", () => {
  it("reports the canonical catalog's own character, tags and seed", async () => {
    const entry = getPresetCatalog().find((candidate) => candidate.id === "oat")!;
    const result = await cli("explain", "--preset", "oat", "--json");

    const report = result.json<{
      recipe: { character: string; tags: string[]; seed: string; style: string; radius: string };
    }>();

    expect(report.recipe.character).toBe(entry.character);
    expect(report.recipe.tags).toEqual([...entry.tags]);
    expect(report.recipe.seed).toBe(entry.seed);
    expect(report.recipe.style).toBe(entry.style);
    expect(report.recipe.radius).toBe(entry.radius);
  });

  it("reports the canonical brand anchors verbatim", async () => {
    const entry = getPresetCatalog("brand").find((candidate) => candidate.id === "vercel")!;
    const result = await cli("explain", "--brand", "vercel", "--json");

    const report = result.json<{
      identity: {
        reference: { name: string; sourceUrl: string };
        anchors: { mode: string; role: string; color: string }[];
        normalized: unknown[];
      };
    }>();

    expect(report.identity.reference.name).toBe(entry.brand!.source.name);
    expect(report.identity.reference.sourceUrl).toBe(entry.brand!.source.sourceUrl);
    expect(report.identity.anchors).toHaveLength(
      entry.brand!.anchors.light.length + entry.brand!.anchors.dark.length,
    );
    expect(report.identity.normalized).toHaveLength(0);
  });

  it("maps every core role, with the usage core declares", async () => {
    const result = await cli("explain", "--preset", "mint", "--json");
    const report = result.json<{
      modes: { light: { roles: { role: string; value: string; usage: string | null }[] } };
    }>();

    const roles = report.modes.light.roles;
    expect(roles).toHaveLength(21);

    const foreground = roles.find((row) => row.role === "foreground");
    expect(foreground?.usage).toBe("Body text on the page canvas");
    expect(foreground?.value).toMatch(/^#/);
  });
});

describe("explain — validation summary", () => {
  it("summarises the canonical scorecard", async () => {
    const result = await cli("explain", "--preset", "mint", "--json");
    const report = result.json<{
      modes: Record<string, { validation: { valid: boolean; score: { passed: number; total: number }; contrast: { text: { passing: number; total: number } } } }>;
    }>();

    expect(Object.keys(report.modes).sort()).toEqual(["dark", "light"]);
    for (const mode of Object.values(report.modes)) {
      expect(mode.validation.valid).toBe(true);
      expect(mode.validation.score.passed).toBe(mode.validation.score.total);
      expect(mode.validation.contrast.text.passing).toBe(mode.validation.contrast.text.total);
    }
  });

  it("reports the contrast contract the theme was solved against", async () => {
    const result = await cli("explain", "--preset", "mint", "--json");
    const report = result.json<{ contract: { text: number; largeText: number; ui: number } }>();
    expect(report.contract).toEqual({ text: 4.5, largeText: 3, ui: 3 });
  });
});

describe("explain — output", () => {
  it("emits a pure, parseable JSON explanation", async () => {
    const result = await cli("explain", "--preset", "mint", "--json");
    expect(result.code).toBe(0);

    const report = result.json<Record<string, unknown>>();
    expect(Object.keys(report).sort()).toEqual([
      "contract",
      "identity",
      "modes",
      "recipe",
      "source",
    ]);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it("omits the semantic mapping under --quiet but keeps the validation summary", async () => {
    const full = await cli("explain", "--preset", "mint");
    expect(full.stdout).toContain("semantic mapping");

    const quiet = await cli("explain", "--preset", "mint", "--quiet");
    expect(quiet.stdout).not.toContain("semantic mapping");
    expect(quiet.stdout).toContain("validation");
    expect(quiet.stdout).toContain("constraint contract");
  });
});

describe("explain — usage and runtime errors", () => {
  it("rejects two sources", async () => {
    const result = await cli("explain", "--preset", "mint", "--brand", "apple");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("only one source may be given");
  });

  it("rejects a positional plus a flag", async () => {
    const result = await cli("explain", "mint", "--preset", "iris");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("only one source may be given");
  });

  it("requires a source", async () => {
    const result = await cli("explain");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("explain needs a source");
  });

  it("suggests the closest id for a typo", async () => {
    const result = await cli("explain", "--preset", "mintt");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('did you mean "mint"?');
  });

  it("rejects an invalid seed", async () => {
    const result = await cli("explain", "--seed", "zzz");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("seed must be a hex color");
  });

  it("fails with exit 1 when a path-looking source does not exist", async () => {
    const result = await cli("explain", join(process.cwd(), "does-not-exist.json"));
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("cannot read file");
  });

  it("fails with exit 1 when a file is not valid JSON", async () => {
    dir = tempDir();
    const file = dir.write("bad.json", "{ not json");

    const result = await cli("explain", file);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("not valid JSON");
  });
});
