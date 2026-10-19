// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ThemvoraInspector,
  ThemvoraProvider,
  ThemvoraScope,
  ThemvoraScrollbar,
  ThemvoraSelect,
  ThemvoraToggle,
} from "../src";

/**
 * The VS Code HTML custom-data file is documentation, and documentation that
 * drifts is worse than none: a stale attribute list offers completions the
 * element does not implement, and a missing one hides a real attribute.
 *
 * These assertions make the JSON fail loudly against the implementation, so a
 * new observed attribute cannot ship undocumented.
 */

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, "..");

interface AttributeEntry {
  name: string;
  description?: string;
  values?: Array<{ name: string }>;
}
interface TagEntry {
  name: string;
  description?: string;
  attributes?: AttributeEntry[];
  references?: Array<{ name: string; url: string }>;
}
interface CustomData {
  version: number;
  tags: TagEntry[];
}

const data = JSON.parse(
  readFileSync(join(pkgRoot, "html-data.json"), "utf8"),
) as CustomData;

const elements = {
  "themvora-provider": ThemvoraProvider,
  "themvora-select": ThemvoraSelect,
  "themvora-toggle": ThemvoraToggle,
  "themvora-scope": ThemvoraScope,
  "themvora-scrollbar": ThemvoraScrollbar,
  "themvora-inspector": ThemvoraInspector,
} as const;

describe("html-data.json", () => {
  it("declares the VS Code custom-data format version", () => {
    expect(data.version).toBe(1.1);
  });

  it("documents every element the package registers", () => {
    for (const tag of Object.keys(elements)) {
      expect(data.tags.map((entry) => entry.name), tag).toContain(tag);
    }
    // …and nothing else: a tag nobody registers is a completion that fails.
    expect(data.tags).toHaveLength(Object.keys(elements).length);
  });

  it("documents every observed attribute, and invents none", () => {
    for (const [tag, ctor] of Object.entries(elements)) {
      const entry = data.tags.find((candidate) => candidate.name === tag);
      const documented = (entry?.attributes ?? []).map((attribute) => attribute.name);
      const observed = (ctor as unknown as { observedAttributes?: string[] })
        .observedAttributes ?? [];

      // Every real attribute is offered…
      for (const attribute of observed) {
        expect(documented, `${tag} → ${attribute}`).toContain(attribute);
      }
      // …and every offered attribute is real.
      for (const attribute of documented) {
        expect(observed, `${tag} → ${attribute}`).toContain(attribute);
      }
    }
  });

  it("describes every tag and attribute", () => {
    for (const tag of data.tags) {
      expect(tag.description?.trim().length, tag.name).toBeGreaterThan(20);
      for (const attribute of tag.attributes ?? []) {
        expect(attribute.description?.trim().length, `${tag.name} ${attribute.name}`)
          .toBeGreaterThan(10);
      }
    }
  });

  it("only offers values for attributes with a closed set", () => {
    const withValues = data.tags.flatMap((tag) =>
      (tag.attributes ?? [])
        .filter((attribute) => attribute.values !== undefined)
        .map((attribute) => `${tag.name}:${attribute.name}`),
    );

    expect(withValues.sort()).toEqual(
      [
        "themvora-provider:initial-mode",
        "themvora-scrollbar:arrows",
        "themvora-scrollbar:auto-hide",
        "themvora-scrollbar:click-to-jump",
        "themvora-scrollbar:draggable",
        "themvora-scrollbar:dir",
        "themvora-scrollbar:hover-expand",
        "themvora-scrollbar:overscroll",
        "themvora-scrollbar:smooth",
        "themvora-scrollbar:touch",
        "themvora-select:type",
      ].sort(),
    );
  });

  it("suggests the values the implementation actually accepts", () => {
    const valuesOf = (tag: string, attribute: string) =>
      data.tags
        .find((entry) => entry.name === tag)
        ?.attributes?.find((entry) => entry.name === attribute)
        ?.values?.map((value) => value.name);

    expect(valuesOf("themvora-provider", "initial-mode")).toEqual([
      "light",
      "dark",
      "system",
    ]);
    expect(valuesOf("themvora-select", "type")).toEqual(["mode", "family"]);
    expect(valuesOf("themvora-scrollbar", "dir")).toEqual(["ltr", "rtl", "auto"]);
    // Booleans are presence-based: any value except `false` enables them.
    expect(valuesOf("themvora-scrollbar", "auto-hide")).toEqual(["true", "false"]);
  });

  it("points references at the published documentation", () => {
    for (const tag of data.tags) {
      for (const reference of tag.references ?? []) {
        expect(reference.url).toMatch(/^https:\/\/themvora-dev\.vercel\.app\//);
      }
    }
  });
});
