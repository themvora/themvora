import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateTheme, type ThemeDefinition } from "@themvora/core";
import { cli, tempDir, type TempDir } from "./helpers.js";

let dir: TempDir | null = null;

afterEach(() => {
  dir?.cleanup();
  dir = null;
});

describe("generate — backward compatibility", () => {
  it("with no source, reproduces the runtime default generation", async () => {
    const result = await cli("generate");
    expect(result.code).toBe(0);
    expect(result.json()).toEqual(generateTheme({ seed: "#6366f1", family: "default" }));
  });

  it("accepts --seed", async () => {
    const result = await cli("generate", "--seed", "#ea580c", "--mode", "both");
    expect(result.code).toBe(0);
    expect(result.json()).toEqual(generateTheme({ seed: "#ea580c", family: "default" }));
  });

  it("accepts a positional seed", async () => {
    const result = await cli("generate", "#ff0000", "--mode", "light");
    expect(result.code).toBe(0);
    expect(result.json()).toEqual(generateTheme({ seed: "#ff0000", family: "default" }).light);
  });

  it("accepts --family and --style", async () => {
    const result = await cli(
      "generate",
      "--seed",
      "#6366f1",
      "--family",
      "indigo",
      "--style",
      "editorial",
      "--mode",
      "light",
    );
    expect(result.code).toBe(0);
    expect(result.json()).toEqual(
      generateTheme({ seed: "#6366f1", family: "indigo", style: "editorial" }).light,
    );
  });

  it("accepts --code and emits the syntax palette", async () => {
    const result = await cli("generate", "--seed", "#d97706", "--mode", "light", "--code");
    expect(result.code).toBe(0);
    const theme = result.json<ThemeDefinition>();
    expect(theme.tokens?.code).toBeDefined();
  });

  it("accepts the `gen` alias", async () => {
    const result = await cli("gen", "--mode", "light");
    expect(result.code).toBe(0);
    expect(result.json<ThemeDefinition>().name).toBe("default-light");
  });
});

describe("generate — canonical sources", () => {
  it("generates the shipped preset, not a re-derived one", async () => {
    const result = await cli("generate", "--preset", "mint");
    expect(result.code).toBe(0);

    const pair = result.json<{ light: ThemeDefinition; dark: ThemeDefinition }>();
    expect(pair.light.name).toBe("mint-light");
    expect(pair.dark.name).toBe("mint-dark");
    expect(pair.light.meta?.family).toBe("mint");
    expect(pair.light.meta?.generation?.seed).toBe("#059669");
    expect(pair.light.meta?.generation?.style).toBe("soft");
  });

  it("generates a brand recipe with its provenance intact", async () => {
    const result = await cli("generate", "--brand", "apple", "--mode", "light");
    expect(result.code).toBe(0);

    const theme = result.json<ThemeDefinition>();
    expect(theme.name).toBe("apple-light");
    expect(theme.meta?.family).toBe("apple");
    expect(theme.meta?.generation?.style).toBe("brand");
    expect(theme.meta?.generation?.anchored).toContain("primary");
  });

  it("honours --mode for a registry source", async () => {
    const light = await cli("generate", "--preset", "iris", "--mode", "light");
    expect(light.json<ThemeDefinition>().meta?.mode).toBe("light");

    const dark = await cli("generate", "--preset", "iris", "--mode", "dark");
    expect(dark.json<ThemeDefinition>().meta?.mode).toBe("dark");
  });

  it("validates every preset and brand it can generate", async () => {
    const { listBrands, listPresets } = await import("../src/registry.js");
    const { validateTheme } = await import("@themvora/core");

    for (const entry of [...listPresets(), ...listBrands()]) {
      const kind = entry.kind === "brand" ? "--brand" : "--preset";
      const result = await cli("generate", kind, entry.id);
      expect(result.code, `${kind} ${entry.id}`).toBe(0);

      const pair = result.json<{ light: ThemeDefinition; dark: ThemeDefinition }>();
      expect(validateTheme(pair.light).valid, `${entry.id} light`).toBe(true);
      expect(validateTheme(pair.dark).valid, `${entry.id} dark`).toBe(true);
    }
  });
});

describe("generate — source exclusivity", () => {
  it("rejects --seed with --preset", async () => {
    const result = await cli("generate", "--seed", "#ff0000", "--preset", "mint");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("only one theme source");
  });

  it("rejects --preset with --brand", async () => {
    const result = await cli("generate", "--preset", "mint", "--brand", "apple");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("only one theme source");
  });

  it("rejects a positional seed with an explicit source", async () => {
    const result = await cli("generate", "#ff0000", "--preset", "mint");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("only one theme source");
  });
});

describe("generate — option conflicts with a registry source", () => {
  it("rejects --style with --preset", async () => {
    const result = await cli("generate", "--preset", "mint", "--style", "vibrant");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--style cannot be combined with --preset");
  });

  it("rejects --code with --brand", async () => {
    const result = await cli("generate", "--brand", "apple", "--code");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--code cannot be combined with --brand");
  });

  it("rejects --family with --preset", async () => {
    const result = await cli("generate", "--preset", "mint", "--family", "brand");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("--family cannot be combined with --preset");
  });
});

describe("generate — unknown registry values", () => {
  it("reports an unknown preset and points at the registry", async () => {
    const result = await cli("generate", "--preset", "nope");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('unknown preset "nope"');
    expect(result.stderr).toContain("themvora list presets");
  });

  it("suggests the closest brand on a typo", async () => {
    const result = await cli("generate", "--brand", "appple");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('did you mean "apple"?');
  });

  it("rejects an unknown style", async () => {
    const result = await cli("generate", "--style", "nope");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("invalid style");
  });

  it("rejects an unknown mode", async () => {
    const result = await cli("generate", "--mode", "banana");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("invalid mode");
  });

  it("rejects a non-hex seed", async () => {
    const result = await cli("generate", "--seed", "zzzzzz");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("seed must be a hex color");
  });

  it("rejects an unsupported contrast level", async () => {
    const result = await cli("generate", "--contrast", "AAA");
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("invalid contrast");
  });
});

describe("generate — file output", () => {
  it("writes the pair to --output and keeps stdout clean", async () => {
    dir = tempDir();
    const file = join(dir.path, "theme.json");

    const result = await cli("generate", "--preset", "mint", "--output", file);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Theme written to");
    expect(existsSync(file)).toBe(true);

    const written = JSON.parse(dir.read("theme.json")) as { light: ThemeDefinition };
    expect(written.light.name).toBe("mint-light");
  });

  it("--dry-run never writes", async () => {
    dir = tempDir();
    const file = join(dir.path, "theme.json");

    const result = await cli("generate", "--preset", "mint", "--output", file, "--dry-run");
    expect(result.code).toBe(0);
    expect(result.stderr).toContain("would write");
    expect(existsSync(file)).toBe(false);
    // The payload is still inspectable.
    expect(result.json<{ light: ThemeDefinition }>().light.name).toBe("mint-light");
  });

  it("--dry-run reports an overwrite without performing it", async () => {
    dir = tempDir();
    const file = dir.write("theme.json", "{}");

    const result = await cli("generate", "--preset", "mint", "--output", file, "--dry-run");
    expect(result.code).toBe(0);
    expect(result.stderr).toContain("would overwrite");
    expect(dir.read("theme.json")).toBe("{}");
  });
});
