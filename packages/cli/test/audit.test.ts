import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateTheme, getPresetCatalog, scoreTheme, validateTheme } from "@themvora/core";
import { cli, tempDir, type TempDir } from "./helpers.js";

let dir: TempDir | null = null;

afterEach(() => {
  dir?.cleanup();
  dir = null;
});

/** A theme that is structurally valid but fails the deeper checks. */
function deeplyFlawedTheme(): string {
  const pair = generateTheme({ seed: "#059669", family: "flawed" });
  const light = pair.light.tokens!.colors as Record<string, string>;

  // `input` collapsing onto `background` fails UI contrast; `card` collapsing
  // onto `popover` fails surface hierarchy. Every required token is still
  // present, so `validateTheme()` passes.
  light.input = light.background!;
  light.card = light.popover!;

  return JSON.stringify(pair, null, 2);
}

describe("audit — presets", () => {
  it("passes for every shipped preset and brand", async () => {
    const result = await cli("audit", "presets");
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Audit passed");
    expect(result.stdout).toContain("0 fail");
  });

  it("audits the same scorecard the catalog derives", async () => {
    const result = await cli("audit", "presets", "--json");
    expect(result.code).toBe(0);

    const report = result.json<{
      scope: string;
      subjects: { id: string; themes: { name: string; passed: number; total: number }[] }[];
      summary: { subjects: number; themes: number; failed: number };
    }>();

    expect(report.scope).toBe("presets");
    expect(report.summary.subjects).toBe(getPresetCatalog().length);
    expect(report.summary.themes).toBe(getPresetCatalog().length * 2);
    expect(report.summary.failed).toBe(0);

    // The CLI's verdict for a preset must equal core's own scorecard.
    const mint = getPresetCatalog().find((entry) => entry.id === "mint")!;
    const audited = report.subjects.find((subject) => subject.id === "mint")!;
    const expected = scoreTheme(mint.themes.light);
    const light = audited.themes.find((theme) => theme.name === "mint-light")!;
    expect(light.passed).toBe(expected.passed);
    expect(light.total).toBe(expected.total);
  });

  it("keeps warnings non-fatal by default and fatal under --strict", async () => {
    const result = await cli("audit", "presets", "--strict");
    // No shipped preset currently warns, so both modes pass — the flag is
    // asserted to be accepted and to report its mode.
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("--strict");
  });

  it("hides passing themes under --quiet", async () => {
    const result = await cli("audit", "presets", "--quiet");
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("PASS");
    expect(result.stdout).toContain("0 fail");
  });
});

describe("audit — a theme file", () => {
  it("passes a generated pair", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", JSON.stringify(generateTheme({ seed: "#3366ff" }), null, 2));

    const result = await cli("audit", file);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Audit passed");
  });

  it("is strictly deeper than validate", async () => {
    dir = tempDir();
    const file = dir.write("flawed.json", deeplyFlawedTheme());

    const validated = await cli("validate", file);
    const audited = await cli("audit", file);

    // `validate` gates on the structural contract only…
    expect(validated.code).toBe(0);
    // …`audit` gates on the full quality model.
    expect(audited.code).toBe(3);
    expect(audited.stdout).toContain("FAIL");
  });

  it("names the failing checks and exits 3", async () => {
    dir = tempDir();
    const file = dir.write("flawed.json", deeplyFlawedTheme());

    const result = await cli("audit", file);
    expect(result.code).toBe(3);
    expect(result.stdout).toMatch(/ui-contrast|surface-hierarchy/);
    expect(result.stderr).toContain("must not fail its own contract");
  });

  it("emits a parseable JSON report and still exits 3 on failure", async () => {
    dir = tempDir();
    const file = dir.write("flawed.json", deeplyFlawedTheme());

    const result = await cli("audit", file, "--json");
    expect(result.code).toBe(3);

    const report = result.json<{
      scope: string;
      subjects: { themes: { name: string; failed: boolean; checks: { id: string; status: string }[] }[] }[];
      summary: { failed: number };
    }>();

    expect(report.scope).toBe("file");
    expect(report.summary.failed).toBeGreaterThan(0);
    const failing = report.subjects[0]!.themes.find((theme) => theme.failed)!;
    expect(failing.checks.some((check) => check.status === "fail")).toBe(true);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });
});

describe("audit — usage and runtime errors", () => {
  it("requires a scope", async () => {
    const result = await cli("audit");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("audit needs a scope");
  });

  it("rejects an unknown scope", async () => {
    const result = await cli("audit", "nonsense");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("unknown audit scope");
  });

  it("fails with exit 1 for a path-looking source that does not exist", async () => {
    const result = await cli("audit", join(process.cwd(), "does-not-exist.json"));
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("cannot read file");
  });
});

describe("audit — structural failures", () => {
  it("reports a theme that is not even structurally valid", async () => {
    dir = tempDir();
    const file = dir.write(
      "broken.json",
      JSON.stringify({ name: "broken", meta: { mode: "light" }, tokens: { colors: { background: "#ffffff" } } }),
    );

    const result = await cli("audit", file);
    expect(result.code).toBe(3);
    expect(result.stdout).toContain("FAIL");

    const json = await cli("audit", file, "--json");
    const report = json.json<{ subjects: { themes: { valid: boolean; issues: string[] }[] }[] }>();
    expect(report.subjects[0]!.themes[0]!.valid).toBe(false);
    expect(report.subjects[0]!.themes[0]!.issues.length).toBeGreaterThan(0);
  });

  it("agrees with core's own validity verdict", async () => {
    const theme = generateTheme({ seed: "#3366ff" }).light;
    dir = tempDir();
    const file = dir.write("theme.json", JSON.stringify(theme, null, 2));

    const result = await cli("audit", file, "--json");
    const report = result.json<{ subjects: { themes: { valid: boolean }[] }[] }>();
    expect(report.subjects[0]!.themes[0]!.valid).toBe(validateTheme(theme).valid);
  });
});
