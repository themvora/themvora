/**
 * Framework template consumers.
 *
 * Each positive uses the component and prop form shipped in the repository
 * examples. The negatives are the important half: markup is not JavaScript, a
 * local component is not the package component, and a module-script import is
 * not in a Svelte template's scope.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  recognizeConsumers,
  recognizeHtmlConsumers,
  recognizeTemplateConsumers,
} from "../src/domain/consumers";
import { readSourceDocument, regionLabelOf } from "../src/domain/sourceRegions";

/** One real example app file from this repository. */
function example(path: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../examples/apps/${path}`, import.meta.url)),
    "utf8",
  );
}

function template(path: string, source: string) {
  return recognizeTemplateConsumers(readSourceDocument(path, source));
}

const VUE = [
  '<script setup lang="ts">',
  'import { ThemeProvider } from "@themvora/vue";',
  'import { themes } from "./theme";',
  "</script>",
  "<template>",
  '  <ThemeProvider :themes="themes" />',
  "</template>",
].join("\n");

describe("Vue templates", () => {
  it("recognizes an imported provider with a bound theme collection", () => {
    const [found] = template("src/App.vue", VUE);

    expect(found).toMatchObject({
      integration: "vue",
      api: "ThemeProvider",
      input: "static",
      names: ["themes"],
      region: "template",
      location: { line: 6, column: 4 },
    });
  });

  it("recognizes an aliased component", () => {
    const source = [
      '<script setup lang="ts">',
      'import { ThemeProvider as Provider } from "@themvora/vue";',
      "</script>",
      '<template><Provider :themes="[oceanLight, oceanDark]" /></template>',
    ].join("\n");
    const [found] = template("src/App.vue", source);

    expect(found?.names).toEqual(["oceanLight", "oceanDark"]);
  });

  it("reports a plain themes attribute as a string, not a collection", () => {
    const source = [
      '<script setup lang="ts">',
      'import { ThemeProvider } from "@themvora/vue";',
      "</script>",
      '<template><ThemeProvider themes="themes" /></template>',
    ].join("\n");
    const [found] = template("src/App.vue", source);

    expect(found?.input).toBe("dynamic");
    expect(found?.reason).toContain(":themes");
  });

  it("does not recognize a local component with the same name", () => {
    const source = [
      '<script setup lang="ts">',
      'import ThemeProvider from "./Provider.vue";',
      "</script>",
      '<template><ThemeProvider :themes="themes" /></template>',
    ].join("\n");

    expect(template("src/App.vue", source)).toEqual([]);
  });

  it("does not treat template text as a definition", () => {
    const source = [
      '<script setup lang="ts">',
      'import { defineTheme } from "@themvora/core";',
      "</script>",
      '<template><p>defineTheme({ name: "ghost" })</p></template>',
    ].join("\n");
    const document = readSourceDocument("src/App.vue", source);

    expect(document.masked).not.toContain('<p>defineTheme');
    expect(recognizeConsumers(document.masked, "src/App.vue")).toEqual([]);
  });
});

describe("Svelte templates", () => {
  it("recognizes an imported provider with a braced collection", () => {
    const source = [
      "<script lang=\"ts\">",
      'import { ThemeProvider } from "@themvora/svelte";',
      'import { themes } from "./theme";',
      "</script>",
      "",
      "<ThemeProvider themes={themes} />",
    ].join("\n");
    const [found] = template("src/App.svelte", source);

    expect(found).toMatchObject({
      integration: "svelte",
      names: ["themes"],
      region: "markup",
    });
  });

  it("does not use a module-script import in the template", () => {
    const source = [
      '<script context="module" lang="ts">',
      'import { ThemeProvider } from "@themvora/svelte";',
      "export const themes = [];",
      "</script>",
      "<ThemeProvider themes={themes} />",
    ].join("\n");

    expect(template("src/App.svelte", source)).toEqual([]);
  });

  it("reports a string themes attribute honestly", () => {
    const source = [
      '<script lang="ts">',
      'import { ThemeProvider } from "@themvora/svelte";',
      "</script>",
      '<ThemeProvider themes="{themes}" />',
    ].join("\n");
    const [found] = template("src/App.svelte", source);

    expect(found?.input).toBe("dynamic");
  });
});

describe("Astro frontmatter and template", () => {
  it("recognizes the provider's config prop", () => {
    const source = [
      "---",
      'import Provider from "@themvora/astro/provider.astro";',
      'import themeConfig from "../../theme.config";',
      "---",
      "",
      "<Provider config={themeConfig} lang=\"en\">",
      "  <slot />",
      "</Provider>",
    ].join("\n");
    const [found] = template("src/layout.astro", source);

    expect(found).toMatchObject({
      integration: "astro",
      api: "Provider",
      names: ["themeConfig"],
      region: "template",
    });
    expect(found?.reason).toContain("build-time theme config");
  });

  it("reads an inline config object", () => {
    const source = [
      "---",
      'import Provider from "@themvora/astro/provider.astro";',
      "---",
      "<Provider config={{ themes: [oceanLight] }} />",
    ].join("\n");
    const [found] = template("src/layout.astro", source);

    expect(found?.names).toEqual(["oceanLight"]);
  });

  it("does not use a client-script import in the template", () => {
    const source = [
      "---",
      "const provider = null;",
      "---",
      '<script>import Provider from "@themvora/astro/provider.astro";</script>',
      "<Provider config={themeConfig} />",
    ].join("\n");

    expect(template("src/layout.astro", source)).toEqual([]);
  });
});

describe("Web Components HTML", () => {
  function html(source: string) {
    return recognizeHtmlConsumers(readSourceDocument("index.html", source));
  }

  it("reads a static themes list", () => {
    const [found] = html(
      '<themvora-provider themes="light dark oat-light"></themvora-provider>',
    );

    expect(found).toMatchObject({
      integration: "web",
      api: "themvora-provider",
      input: "static",
      names: ["light", "dark", "oat-light"],
      region: "element",
      directNames: true,
    });
  });

  it("refuses a JSON array of names, which is not the element's attribute syntax", () => {
    const [found] = html(
      '<themvora-provider themes=\'["light", "dark"]\'></themvora-provider>',
    );

    expect(found?.input).toBe("dynamic");
    expect(found?.names).toEqual([]);
    expect(found?.reason).toContain("JSON name array");
  });

  it("does not interpret inline JSON theme definitions", () => {
    const [found] = html(
      '<themvora-provider themes=\'[{"name":"brand"}]\'></themvora-provider>',
    );

    expect(found?.input).toBe("dynamic");
    expect(found?.reason).toContain("inline JSON");
  });

  it("reports a template expression as dynamic", () => {
    const [found] = html(
      '<themvora-provider themes="{{ currentTheme }}"></themvora-provider>',
    );

    expect(found?.input).toBe("dynamic");
  });

  it("is registration-only without a themes attribute", () => {
    const [found] = html("<themvora-provider></themvora-provider>");

    expect(found).toMatchObject({ input: "absent", registrationOnly: true });
  });

  it("does not treat an invented attribute as theme supply", () => {
    const [found] = html('<themvora-provider theme="brand"></themvora-provider>');

    expect(found).toMatchObject({ input: "absent", names: [], registrationOnly: true });
  });

  it("ignores a commented-out element", () => {
    expect(html('<!-- <themvora-provider themes="ghost"> -->')).toEqual([]);
  });
});

describe("real repository examples", () => {
  it("recognizes the Vue example's template binding", () => {
    const document = readSourceDocument("vue/src/App.vue", example("vue/src/App.vue"));
    const [found] = recognizeTemplateConsumers(document);

    expect(regionLabelOf(document)).toBe("<script setup>");
    expect(found).toMatchObject({
      integration: "vue",
      names: ["themes"],
      region: "template",
    });
  });

  it("recognizes the Svelte example's markup binding", () => {
    const document = readSourceDocument("svelte/src/App.svelte", example("svelte/src/App.svelte"));
    const [found] = recognizeTemplateConsumers(document);

    expect(regionLabelOf(document)).toBe("<script>");
    expect(found).toMatchObject({
      integration: "svelte",
      names: ["themes"],
      region: "markup",
    });
  });

  it("recognizes the Astro example's provider config", () => {
    const document = readSourceDocument(
      "astro/src/layouts/BaseLayout.astro",
      example("astro/src/layouts/BaseLayout.astro"),
    );
    const [found] = recognizeTemplateConsumers(document);

    expect(regionLabelOf(document)).toBe("frontmatter");
    expect(found).toMatchObject({
      integration: "astro",
      names: ["themeConfig"],
      region: "template",
    });
    expect(found?.reason).toContain("build-time theme config");
  });

  it("recognizes the Web Components example's attribute-free provider", () => {
    const document = readSourceDocument("web/index.html", example("web/index.html"));
    const [found] = recognizeHtmlConsumers(document);

    // The element is deliberately attribute-free: the catalog, default theme
    // and initial mode come from `theme.config.ts` through the Vite plugin, and
    // declaring them here as well would be a second source of truth the plugin
    // fails the build over.
    expect(found).toMatchObject({
      integration: "web",
      input: "absent",
      region: "element",
    });
    expect(found?.names).toEqual([]);
    expect(found?.reason).toContain("no themes attribute");
  });
});

describe("Web Components in JSX", () => {
  it("reads a string attribute", () => {
    const [found] = recognizeConsumers(
      'export const App = () => <themvora-provider themes="light dark" />;',
      "src/App.tsx",
    );

    expect(found).toMatchObject({
      integration: "web",
      names: ["light", "dark"],
      directNames: true,
      region: "JSX",
    });
  });

  it("reads a string expression", () => {
    const [found] = recognizeConsumers(
      'export const App = () => <themvora-provider themes={"light dark"} />;',
      "src/App.tsx",
    );

    expect(found?.names).toEqual(["light", "dark"]);
  });

  it("keeps a dynamic identifier unresolved", () => {
    const [found] = recognizeConsumers(
      "export const App = () => <themvora-provider themes={currentTheme} />;",
      "src/App.tsx",
    );

    expect(found?.input).toBe("dynamic");
  });

  it("does not accept an array as the element's string attribute", () => {
    const [found] = recognizeConsumers(
      'export const App = () => <themvora-provider themes={["light"]} />;',
      "src/App.tsx",
    );

    expect(found?.input).toBe("dynamic");
  });

  it("does not recognize the invented tag name", () => {
    const found = recognizeConsumers(
      'export const App = () => <themvora-theme themes="brand" />;',
      "src/App.tsx",
    );

    expect(found).toEqual([]);
  });
});
