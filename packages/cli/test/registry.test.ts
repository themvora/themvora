import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GENERATION_STYLE_NAMES, getPresetCatalog } from "@themvora/core";
import { listBrands, listPresets, listStyles } from "../src/registry.js";
import { INIT_FRAMEWORKS } from "../src/frameworks.js";
import { cli } from "./helpers.js";

const SRC = join(import.meta.dirname, "..", "src");

/** Every `.ts`/`.json` file under `src`, recursively. */
function sourceFiles(dir: string = SRC): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|json)$/.test(entry.name) ? [full] : [];
  });
}

describe("registry — canonical source of truth", () => {
  it("exposes exactly the styles the generation registry ships", () => {
    expect(listStyles()).toEqual(GENERATION_STYLE_NAMES);
  });

  it("exposes exactly the presets and brands the catalog ships", () => {
    const catalog = getPresetCatalog();
    const expectedPresets = catalog.filter((entry) => entry.kind === "default").map((e) => e.id);
    const expectedBrands = catalog.filter((entry) => entry.kind === "brand").map((e) => e.id);

    expect(listPresets().map((entry) => entry.id)).toEqual(expectedPresets);
    expect(listBrands().map((entry) => entry.id)).toEqual(expectedBrands);
  });

  it("keeps `list styles` in step with the registry", async () => {
    const result = await cli("list", "styles", "--json");
    expect(result.code).toBe(0);
    expect(result.json<string[]>()).toEqual([...GENERATION_STYLE_NAMES]);
  });

  it("keeps `list frameworks` in step with the init registry", async () => {
    const result = await cli("list", "frameworks", "--json");
    expect(result.code).toBe(0);
    expect(result.json<{ id: string }[]>().map((f) => f.id)).toEqual(
      INIT_FRAMEWORKS.map((f) => f.id),
    );
  });
});

describe("registry — CLI accepts every registry value", () => {
  it("accepts every canonical style", async () => {
    for (const style of listStyles()) {
      const result = await cli("generate", "--seed", "#6366f1", "--style", style, "--mode", "light");
      expect(result.code, style).toBe(0);
    }
  });

  it("accepts every canonical preset and brand id", async () => {
    for (const entry of listPresets()) {
      const result = await cli("generate", "--preset", entry.id, "--mode", "light");
      expect(result.code, `preset ${entry.id}`).toBe(0);
    }
    for (const entry of listBrands()) {
      const result = await cli("generate", "--brand", entry.id, "--mode", "light");
      expect(result.code, `brand ${entry.id}`).toBe(0);
    }
  });
});

describe("registry — no duplicated registry data in the CLI", () => {
  /**
   * `"brand"` is excluded on purpose: it is both a style name and the name of
   * the brand *registry kind* (`valuesFrom: "brand"`, `kind: "brand"`), so a
   * quoted occurrence is legitimate and cannot be told apart from a duplicated
   * style list by a text scan.
   */
  const SCAN_EXCLUSIONS = new Set(["brand"]);

  /**
   * `themes-module.ts` is excluded because the identifiers it contains are not
   * CLI data — they are the **contents of a generated file**.
   *
   * The `selection` array it emits is a filter applied to `getPresetThemes()` at
   * runtime *inside the generated application*, so a family the catalog does not
   * ship is simply not offered. That is the opposite of the drift this scan
   * guards against, where a duplicated list could disagree with the catalog and
   * render the wrong colours. The blueprint's demo families are named here
   * deliberately, so the showcase's preset controls are stable rather than
   * changing with the catalog's ordering.
   */
  const SCAN_FILE_EXCLUSIONS = new Set(["themes-module.ts"]);

  it("hardcodes no preset, brand, or style identifier in the CLI source", () => {
    const ids = [
      ...listPresets().map((entry) => entry.id),
      ...listBrands().map((entry) => entry.id),
      ...listStyles(),
    ].filter((id) => !SCAN_EXCLUSIONS.has(id));

    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      if ([...SCAN_FILE_EXCLUSIONS].some((name) => file.endsWith(name))) continue;
      // Comments legitimately mention example ids; only live code counts.
      const contents = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");

      for (const id of ids) {
        if (contents.includes(`"${id}"`) || contents.includes(`'${id}'`)) {
          offenders.push(`${file}: ${id}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("registry — suggestions", () => {
  it("suggests the closest value and declines when nothing is close", async () => {
    const { suggest } = await import("../src/suggest.js");

    expect(suggest("mintt", ["mint", "iris", "sky"])).toBe("mint");
    expect(suggest("githb", ["github", "slack", "discord"])).toBe("github");
    expect(suggest("banana", ["mint", "iris", "sky"])).toBeUndefined();
  });
});
