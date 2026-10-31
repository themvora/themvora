/**
 * The source-region abstraction.
 *
 * The important properties are offset identity and exclusion: script text stays
 * at its original offsets, and template markup is blank in the mask the JS
 * readers see. A fake `defineTheme` in a template must never reach them.
 */
import { describe, expect, it } from "vitest";

import {
  readSourceDocument,
  regionAtLine,
  regionLabelOf,
  sourceFormatOf,
} from "../src/domain/sourceRegions";

describe("Vue SFC", () => {
  const SOURCE = [
    '<script setup lang="ts">',
    'import { defineTheme } from "@themvora/core";',
    'const example = "defineTheme({})";',
    'const theme = defineTheme({ name: "x" });',
    "</script>",
    "<template>",
    '  <div>defineTheme({})</div>',
    "</template>",
  ].join("\n");

  const document = readSourceDocument("src/MyTheme.vue", SOURCE);

  it("keeps script text at its original offsets", () => {
    expect(document.format).toBe("vue");
    expect(document.masked.length).toBe(SOURCE.length);
    expect(document.masked.indexOf("defineTheme")).toBe(SOURCE.indexOf("defineTheme"));
    expect(document.masked).toContain("const theme = defineTheme");
  });

  it("blanks the template", () => {
    const template = SOURCE.indexOf("<template>");
    const closing = SOURCE.indexOf("</template>");

    expect(document.masked.slice(template, closing).trim()).toBe("");
    // The script's own string is still in the mask; the JS readers mask strings
    // themselves. The template occurrence — the false positive — is gone.
    expect(document.masked.match(/defineTheme/gu)).toHaveLength(3);
  });

  it("labels the region and maps lines", () => {
    expect(regionLabelOf(document)).toBe("<script setup>");
    expect(regionAtLine(document, 2)).toBe("<script setup>");
    expect(regionAtLine(document, 4)).toBe("<script setup>");
    expect(regionAtLine(document, 7)).toBeUndefined();
  });
});

describe("Vue SFC with both script blocks", () => {
  const SOURCE = [
    "<script>",
    "export const name = 'options';",
    "</script>",
    "<script setup>",
    "const setup = true;",
    "</script>",
    "<template><div /></template>",
  ].join("\n");
  const document = readSourceDocument("src/Both.vue", SOURCE);

  it("keeps both script regions and labels them", () => {
    expect(regionLabelOf(document)).toBe("<script> + <script setup>");
    expect(regionAtLine(document, 2)).toBe("<script>");
    expect(regionAtLine(document, 5)).toBe("<script setup>");
  });
});

describe("Svelte", () => {
  const SOURCE = [
    '<script context="module" lang="ts">',
    "export const moduleValue = 1;",
    "</script>",
    '<script lang="ts">',
    'import { ThemeProvider } from "@themvora/svelte";',
    "const themes = [];",
    "</script>",
    "",
    "<ThemeProvider themes={themes} />",
  ].join("\n");
  const document = readSourceDocument("src/App.svelte", SOURCE);

  it("distinguishes the module script from the instance script", () => {
    expect(document.format).toBe("svelte");
    expect(regionLabelOf(document)).toBe("<script module> + <script>");
    expect(regionAtLine(document, 2)).toBe("<script module>");
    expect(regionAtLine(document, 6)).toBe("<script>");
    expect(regionAtLine(document, 9)).toBeUndefined();
  });

  it("blanks the markup", () => {
    expect(document.masked.slice(SOURCE.indexOf("<ThemeProvider")).trim()).toBe("");
  });
});

describe("Astro", () => {
  const SOURCE = [
    "---",
    'import Provider from "@themvora/astro/provider.astro";',
    "const themes = [];",
    "---",
    "",
    "<Provider themes={themes} />",
    '<script>const example = "defineTheme({})";</script>',
  ].join("\n");
  const document = readSourceDocument("src/layout.astro", SOURCE);

  it("keeps frontmatter and client scripts, blanks the template", () => {
    expect(document.format).toBe("astro");
    expect(regionLabelOf(document)).toBe("frontmatter + <script>");
    expect(regionAtLine(document, 2)).toBe("frontmatter");
    expect(regionAtLine(document, 6)).toBeUndefined();
    expect(regionAtLine(document, 7)).toBe("<script>");
    expect(document.masked).toContain('import Provider from "@themvora/astro/provider.astro"');
    expect(document.masked.slice(SOURCE.indexOf("<Provider"), SOURCE.indexOf("<script>")).trim()).toBe("");
  });
});

describe("HTML and plain JavaScript", () => {
  it("does not invent script regions for HTML", () => {
    const document = readSourceDocument(
      "index.html",
      '<themvora-provider themes="light dark"></themvora-provider>',
    );

    expect(document.format).toBe("html");
    expect(document.regions).toEqual([]);
    expect(regionLabelOf(document)).toBeUndefined();
  });

  it("treats a TypeScript module as one plain source", () => {
    const source = 'import { defineTheme } from "@themvora/core";';
    const document = readSourceDocument("src/theme.ts", source);

    expect(document.format).toBe("js");
    expect(document.masked).toBe(source);
    expect(document.regions).toEqual([]);
  });

  it("recognizes the supported extensions", () => {
    expect(sourceFormatOf("a.vue")).toBe("vue");
    expect(sourceFormatOf("a.svelte")).toBe("svelte");
    expect(sourceFormatOf("a.astro")).toBe("astro");
    expect(sourceFormatOf("a.html")).toBe("html");
    expect(sourceFormatOf("a.htm")).toBe("html");
    expect(sourceFormatOf("a.tsx")).toBe("js");
  });
});
