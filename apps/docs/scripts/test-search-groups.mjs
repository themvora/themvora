#!/usr/bin/env node
/**
 * Tests for the search presentation layer.
 *
 * These are pure grouping/breadcrumb/kind assertions over the real generated
 * index plus small synthetic entries. They deliberately do not touch the
 * search index or the ranking code: the dialog receives already-ranked results
 * and only reorganizes them for display.
 *
 * Usage:
 *   node --experimental-strip-types scripts/test-search-groups.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  apiKind,
  apiSymbol,
  buildSearchPresentation,
  routeContext,
  searchExcerpt,
} from "../lib/search-groups.ts";

const here = dirname(fileURLToPath(import.meta.url));
const index = JSON.parse(
  readFileSync(join(here, "..", "public", "search-index.json"), "utf8"),
);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    failed++;
  }
}

console.log("\n=== Search grouping tests ===\n");

test("apiSymbol keeps the identity across framework signatures", () => {
  assert.equal(
    apiSymbol(
      "useProvidedThemes<T extends ThemeDefinition<string>>(): readonly ProvidedThemeFamily<T>[]",
    ),
    "useProvidedThemes",
  );
  assert.equal(apiSymbol("ThemeProvider<T extends ThemeDefinition>(props): Element"), "ThemeProvider");
  assert.equal(apiSymbol("ThemeProviderOptions<T extends ThemeDefinition>"), "ThemeProviderOptions");
  assert.equal(apiSymbol("class ThemvoraInspector"), "ThemvoraInspector");
});

test("apiKind labels hooks, functions, components, types, and classes", () => {
  assert.equal(apiKind("useProvidedThemes<T>(): readonly ProvidedThemeFamily<T>[]"), "Hook");
  assert.equal(apiKind("createThemeRuntime(options): ThemeRuntime"), "Function");
  assert.equal(apiKind("ThemeProvider<T>(props): Element"), "Component");
  assert.equal(apiKind("ThemeProviderClient<T>(props): null"), "Component");
  assert.equal(apiKind("ThemeProvider"), "Component");
  assert.equal(apiKind("ThemeScope"), "Component");
  assert.equal(apiKind("ThemeProviderOptions<T>"), "Type");
  assert.equal(apiKind("class ThemvoraInspector"), "Class");
});

test("breadcrumbs come from canonical route metadata", () => {
  assert.deepEqual(routeContext("/api-reference/web").breadcrumb, [
    "API Reference",
    "Web Components",
  ]);
  assert.deepEqual(routeContext("/api-reference/astro/client").breadcrumb, [
    "API Reference",
    "Astro",
    "Client",
  ]);
  assert.deepEqual(
    routeContext("/api-reference/remix/react-router").breadcrumb,
    ["API Reference", "Remix", "React Router"],
  );
  assert.deepEqual(routeContext("/framework-guides/react/examples").breadcrumb, [
    "Framework Guides",
    "React",
    "Examples",
  ]);
  assert.deepEqual(
    routeContext("/framework-guides/remix/react-router/examples").breadcrumb,
    ["Framework Guides", "Remix", "React Router", "Examples"],
  );
  assert.deepEqual(routeContext("/packages/core").breadcrumb, [
    "Packages",
    "@themvora/core",
  ]);
  assert.deepEqual(routeContext("/cli/installation").breadcrumb, [
    "CLI",
    "Installation",
  ]);
  assert.deepEqual(routeContext("/presets/default").breadcrumb, [
    "Themes",
    "Default Presets",
  ]);
});

test("framework and package identity is attached to API routes", () => {
  const web = routeContext("/api-reference/web");
  assert.equal(web.framework, "Web Components");
  assert.equal(web.package, "@themvora/web");

  const router = routeContext("/api-reference/remix/react-router");
  assert.equal(router.framework, "React Router");
  assert.equal(router.package, "@themvora/remix");
});

test("excerpts do not repeat the title or signature", () => {
  const api = {
    title: "useProvidedThemes<T>(): readonly ProvidedThemeFamily<T>[]",
    route: "/api-reference/web",
    text: "useProvidedThemes<T>(): readonly ProvidedThemeFamily<T>[] Returns registered theme families.",
    type: "api",
  };
  const excerpt = searchExcerpt(api);
  assert.ok(excerpt.startsWith("Returns registered theme families"));
  assert.ok(!excerpt.includes("useProvidedThemes<T>"));

  const section = {
    title: "Setup",
    route: "/quick-start",
    text: "Setup — One block, no per-framework engine.",
    type: "docs",
  };
  assert.equal(searchExcerpt(section), "One block, no per-framework engine.");

  const titleOnly = {
    title: "Use Cases",
    route: "/framework-guides/react",
    text: "Use Cases",
    type: "guides",
  };
  assert.equal(searchExcerpt(titleOnly), "");

  const blog = {
    title: "Theme Families",
    route: "/blog/theme-families",
    text: 'title: "Theme Families" date: 2026-08-15 description: "Families let users switch colors independently."',
    type: "blog",
  };
  assert.equal(searchExcerpt(blog), "Families let users switch colors independently.");

  const blogFrontmatter = {
    title: "Theme Families",
    route: "/blog/theme-families",
    text: '--- title: "Beyond light and dark" date: 2026-08-15 description: "Families let users switch colors independently." tags: families, modes --- A single toggle is enough for many apps.',
    type: "blog",
  };
  assert.equal(
    searchExcerpt(blogFrontmatter),
    "Families let users switch colors independently.",
  );

  const table = {
    title: "ThemeSet",
    route: "/api-reference/core",
    text: "ThemeSet A light/dark theme set. | Member | Type | Description | ------ |",
    type: "api",
  };
  assert.equal(searchExcerpt(table), "A light/dark theme set.");
});

test("useProvidedThemes groups every framework variant under one symbol", () => {
  const results = index
    .filter((entry) => apiSymbol(entry.title) === "useProvidedThemes")
    .slice(0, 10);
  const presentation = buildSearchPresentation(results);

  assert.equal(presentation.categories.length, 1);
  assert.equal(presentation.categories[0].id, "api");
  assert.equal(presentation.categories[0].label, "API Reference");
  assert.equal(presentation.categories[0].count, results.length);
  assert.equal(presentation.total, results.length);
  assert.equal(presentation.leaves.length, results.length);

  const group = presentation.categories[0].symbols.find(
    (candidate) => candidate.symbol === "useProvidedThemes",
  );
  assert.ok(group, "useProvidedThemes symbol group should exist");
  assert.equal(group.kind, "Hook");
  assert.equal(group.variants.length, results.length);
  assert.deepEqual(
    group.variants.map((variant) => variant.resultIndex),
    results.map((_, index) => index),
    "variants must keep the incoming relevance order",
  );

  const routes = new Set(group.variants.map((variant) => variant.entry.route));
  assert.equal(routes.size, results.length, "every variant keeps its own route");
  assert.ok(routes.has("/api-reference/web"));
  assert.ok(routes.has("/api-reference/vue"));
  assert.ok(routes.has("/api-reference/astro/client"));

  for (const variant of group.variants) {
    assert.equal(variant.grouped, true);
    assert.ok(variant.framework, `${variant.entry.route} should name a framework`);
    assert.ok(variant.package, `${variant.entry.route} should name a package`);
    assert.ok(variant.position >= 0);
  }

  assert.equal(
    new Set(presentation.leaves.map((leaf) => leaf.id)).size,
    presentation.leaves.length,
    "leaf ids must be unique",
  );
  assert.equal(
    new Set(presentation.leaves.map((leaf) => leaf.position)).size,
    presentation.leaves.length,
    "leaf positions must be unique",
  );
});

test("unrelated API symbols are never merged", () => {
  const entries = [
    {
      title: "ThemeProvider<T>(props): Element",
      route: "/api-reference/react",
      text: "ThemeProvider wraps the app.",
      type: "api",
    },
    {
      title: "ThemeProviderOptions<T>",
      route: "/api-reference/react",
      text: "Options for ThemeProvider.",
      type: "api",
    },
    {
      title: "ThemeProviderClient<T>(props): null",
      route: "/api-reference/astro/client",
      text: "Client island provider.",
      type: "api",
    },
    {
      title: "ThemeProviderProps<T>",
      route: "/api-reference/next",
      text: "Props for ThemeProvider.",
      type: "api",
    },
  ];

  const presentation = buildSearchPresentation(entries);
  const symbols = presentation.categories[0].symbols.map((group) => group.symbol);
  assert.deepEqual(symbols.sort(), [
    "ThemeProvider",
    "ThemeProviderClient",
    "ThemeProviderOptions",
    "ThemeProviderProps",
  ]);
});

test("a symbol documented as a type and a class stays two groups", () => {
  const presentation = buildSearchPresentation([
    {
      title: "ThemeRegistry",
      route: "/api-reference/core",
      text: "ThemeRegistry A registry of themes.",
      type: "api",
    },
    {
      title: "class ThemeRegistry",
      route: "/api-reference/web",
      text: "class ThemeRegistry The Web Components registry.",
      type: "api",
    },
  ]);

  const groups = presentation.categories[0].symbols;
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((group) => group.kind).sort(),
    ["Class", "Type"],
  );
});

test("a single API result is a leaf, not a synthetic group", () => {
  const presentation = buildSearchPresentation([
    {
      title: "useProvidedThemes<T>(): readonly ProvidedThemeFamily<T>[]",
      route: "/api-reference/web",
      text: "useProvidedThemes Returns the registered families.",
      type: "api",
    },
  ]);

  assert.equal(presentation.categories[0].count, 1);
  assert.equal(presentation.categories[0].symbols[0].variants.length, 1);
  assert.equal(presentation.categories[0].symbols[0].variants[0].grouped, false);
  assert.equal(presentation.leaves.length, 1);
});

test("categories are ordered by their best-ranked result", () => {
  const entries = [
    {
      title: "Quick Start",
      route: "/quick-start",
      text: "Quick Start docs",
      type: "docs",
    },
    {
      title: "@themvora/core",
      route: "/packages/core",
      text: "The core package.",
      type: "docs",
    },
    {
      title: "ThemeProvider<T>(props): Element",
      route: "/api-reference/react",
      text: "ThemeProvider wraps the app.",
      type: "api",
    },
  ];

  const presentation = buildSearchPresentation(entries);
  assert.deepEqual(
    presentation.categories.map((category) => category.id),
    ["docs", "packages", "api"],
  );
  assert.equal(
    presentation.categories.reduce((sum, category) => sum + category.count, 0),
    presentation.total,
  );
});

test("non-API results keep their relevance order inside a category", () => {
  const entries = [
    { title: "Persistence", route: "/persistence", text: "Survive reloads", type: "docs" },
    { title: "Quick Start", route: "/quick-start", text: "Shortest path", type: "docs" },
    { title: "Core Concepts", route: "/core-concepts", text: "Families and tokens", type: "docs" },
  ];

  const presentation = buildSearchPresentation(entries);
  assert.deepEqual(
    presentation.categories[0].leaves.map((leaf) => leaf.title),
    ["Persistence", "Quick Start", "Core Concepts"],
  );
});

test("every category maps to the expected documentation area", () => {
  assert.equal(routeContext("/api-reference/web").category, "api");
  assert.equal(routeContext("/framework-guides/react").category, "guides");
  assert.equal(routeContext("/framework-guides/react/examples").category, "examples");
  assert.equal(routeContext("/packages/core").category, "packages");
  assert.equal(routeContext("/libraries/shadcn").category, "adapters");
  assert.equal(routeContext("/custom-themes").category, "docs");
  assert.equal(routeContext("/cli/installation").category, "cli");
  assert.equal(routeContext("/presets/default").category, "presets");
  assert.equal(routeContext("/troubleshooting").category, "reference");
});

console.log("\n" + "=".repeat(50));
console.log(`Tests: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

process.exit(failed > 0 ? 1 : 0);
