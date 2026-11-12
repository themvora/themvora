#!/usr/bin/env node
/**
 * Generate the search index as a static JSON asset.
 *
 * This script builds the search index by reading the same source data as
 * buildSearchIndex(), then writes it to public/search-index.json.
 * The client fetches this asset on demand when search opens, instead of
 * receiving the full index through RSC props on every page load.
 *
 * Usage:
 *   pnpm search:generate
 *
 * Output:
 *   apps/docs/public/search-index.json
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const docsDir = join(here, "..");
const contentDir = join(docsDir, "content");
const outPath = join(docsDir, "public", "search-index.json");

// --- Data extraction (mirrors lib/search.ts without importing TSX modules) ---

/**
 * Extract DOCS_ROUTES from lib/docs-routes.ts
 */
function extractDocsRoutes() {
  const file = readFileSync(join(docsDir, "lib", "docs-routes.ts"), "utf8");
  const match = file.match(/export const DOCS_ROUTES:\s*DocsRoute\[\]\s*=\s*(\[[\s\S]*?\n\]);/);
  if (!match) throw new Error("Could not find DOCS_ROUTES");

  // Parse the array literal
  const arrayStr = match[1];
  const routes = [];
  const entryRegex = /\{\s*href:\s*"([^"]+)",\s*label:\s*"([^"]+)"(?:,\s*hint:\s*"([^"]*)")?\s*\}/g;
  let m;
  while ((m = entryRegex.exec(arrayStr)) !== null) {
    routes.push({ href: m[1], label: m[2], hint: m[3] });
  }
  return routes;
}

/**
 * Extract frameworks data from lib/frameworks.tsx (slug, tagline, pkg, groups only)
 */
function extractFrameworks() {
  const file = readFileSync(join(docsDir, "lib", "frameworks.tsx"), "utf8");
  const frameworks = [];

  const start = file.indexOf("export const rawFrameworks");
  const open = file.indexOf("[", file.indexOf("=", start));
  if (start === -1 || open === -1) return frameworks;

  // Slice the literal to its matching closing bracket without evaluating TSX.
  let depth = 0;
  let quote = null;
  let end = open;
  for (let i = open; i < file.length; i++) {
    const c = file[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  const arrayStr = file.slice(open, end);
  const entries = [...arrayStr.matchAll(/(?:^|\n)    slug: "([^"]+)"/g)];

  for (let i = 0; i < entries.length; i++) {
    const chunk = arrayStr.slice(
      entries[i].index,
      entries[i + 1]?.index ?? arrayStr.length,
    );
    const name = chunk.match(/\n    name: "([^"]+)"/)?.[1];
    const pkg = chunk.match(/\n    pkg: "([^"]+)"/)?.[1];
    const tagline = chunk.match(
      /\n    tagline:\s*\n?\s*"((?:[^"\\]|\\.)*)"/,
    )?.[1];
    const path = chunk.match(/\n    path: "([^"]+)"/)?.[1] ?? null;
    const nested = /\n    nested: true/.test(chunk);
    const groupsBlock =
      chunk.match(/\n    groups: \[([\s\S]*?)\n    \],\n/)?.[1] ?? "";
    const groups = [
      ...groupsBlock.matchAll(/\n        label: "([^"]+)"/g),
    ].map((match) => ({ label: match[1] }));

    if (!name || !pkg) continue;
    frameworks.push({
      slug: entries[i][1],
      name,
      pkg,
      tagline: tagline ?? "",
      groups,
      path,
      nested,
    });
  }

  return frameworks;
}

/**
 * Extract libraries data from lib/libraries.tsx
 */
function extractLibraries() {
  const file = readFileSync(join(docsDir, "lib", "libraries.tsx"), "utf8");
  const libraries = [];

  const arrayMatch = file.match(/export const libraries:\s*Library\[\]\s*=\s*(\[[\s\S]*?\n\]);/);
  if (!arrayMatch) return libraries;

  const arrayStr = arrayMatch[1];
  const entryRegex = /\{\s*slug:\s*"([^"]+)",[\s\S]*?tagline:\s*"([^"]+)"/g;
  let m;
  while ((m = entryRegex.exec(arrayStr)) !== null) {
    libraries.push({ slug: m[1], tagline: m[2] });
  }
  return libraries;
}

/**
 * Extract packages data from lib/packages.tsx
 */
function extractPackages() {
  const file = readFileSync(join(docsDir, "lib", "packages.tsx"), "utf8");
  const packages = [];

  const arrayMatch = file.match(/export const packages:\s*Package\[\]\s*=\s*(\[[\s\S]*?\n\]);/);
  if (!arrayMatch) return packages;

  const arrayStr = arrayMatch[1];
  const entryRegex = /\{\s*slug:\s*"([^"]+)",[\s\S]*?tagline:\s*"([^"]+)"/g;
  let m;
  while ((m = entryRegex.exec(arrayStr)) !== null) {
    packages.push({ slug: m[1], tagline: m[2] });
  }
  return packages;
}

/**
 * Extract PAGE_SECTIONS from lib/search-sections.ts
 */
function extractPageSections() {
  const file = readFileSync(join(docsDir, "lib", "search-sections.ts"), "utf8");
  const sections = [];

  const arrayMatch = file.match(/export const PAGE_SECTIONS:\s*PageSectionEntry\[\]\s*=\s*(\[[\s\S]*?\n\]);/);
  if (!arrayMatch) return sections;

  const arrayStr = arrayMatch[1];

  // Match each page entry
  const entryRegex = /\{\s*route:\s*"([^"]+)",(?:\s*intro:\s*"([^"]*)",)?\s*sections:\s*(\[[\s\S]*?\])\s*\}/g;
  let m;
  while ((m = entryRegex.exec(arrayStr)) !== null) {
    const pageSections = [];
    const sectionRegex = /\{\s*title:\s*"([^"]+)"(?:,\s*desc:\s*"([^"]*)")?\s*\}/g;
    let sm;
    while ((sm = sectionRegex.exec(m[3])) !== null) {
      pageSections.push({ title: sm[1], desc: sm[2] });
    }
    sections.push({
      route: m[1],
      intro: m[2],
      sections: pageSections,
    });
  }
  return sections;
}

// --- Search index builder (mirrors lib/search.ts logic) ---

const DOCS_ROUTES = extractDocsRoutes();
const frameworks = extractFrameworks();
const libraries = extractLibraries();
const packages = extractPackages();
const PAGE_SECTIONS = extractPageSections();

/**
 * Framework headings in the generated mirror and the guide page they describe.
 *
 * Longest-first so `React Router` wins over `React` when both appear in the
 * same heading. Kept as a literal because this script deliberately does not
 * evaluate the TSX framework array (see `extractFrameworks`).
 */
const FRAMEWORK_HEADING_ROUTES = [
  { name: "React Router", route: "/framework-guides/remix/react-router" },
  { name: "Web Components", route: "/framework-guides/web" },
  { name: "Tailwind CSS", route: "/framework-guides/tailwind" },
  { name: "Next.js", route: "/framework-guides/next" },
  { name: "Svelte 5", route: "/framework-guides/svelte" },
  { name: "Vue 3", route: "/framework-guides/vue" },
  { name: "Nuxt", route: "/framework-guides/nuxt" },
  { name: "React", route: "/framework-guides/react" },
  { name: "Remix", route: "/framework-guides/remix" },
  { name: "Solid", route: "/framework-guides/solid" },
  { name: "Angular", route: "/framework-guides/angular" },
  { name: "Astro", route: "/framework-guides/astro" },
].sort((a, b) => b.name.length - a.name.length);

function frameworkRouteForHeading(heading) {
  return FRAMEWORK_HEADING_ROUTES.find((framework) =>
    heading.includes(framework.name),
  )?.route;
}

function isGeneratedSnippetHeading(heading) {
  return /^(?:snippet\d*|quickStart(?:Extra)?|buildConfig|themeConfig|noTheme|setupExtra|uiExample|styles|appFile|switchSnippet|reactSetup)$/i.test(
    heading,
  );
}

const ROUTES = {
  "core-concepts": "/core-concepts",
  architecture: "/architecture",
  packages: "/packages",
  "framework-guides": "/framework-guides",
  "advanced-features": "/advanced-features",
  adapters: "/adapters",
  "api-reference": "/api-reference",
  cli: "/cli",
  "cli/overview": "/cli",
  devtools: "/devtools",
  roadmap: "/roadmap",
  "custom-scrollbar": "/custom-scrollbar",
  libraries: "/libraries",
};

const STATIC_ENTRIES = [
  {
    title: "Quick Start",
    route: "/quick-start",
    text: "The shortest path to a themed app with no token definitions. Install @themvora/core plus your framework adapter, wrap your app in the provider with no themes prop, and get the built-in neutral light/dark theme with a toggle, persistence and history.",
  },
  {
    title: "CLI",
    route: "/cli",
    text: "The @themvora/cli command-line toolkit: generate, list, validate, inspect, diff, explain, audit, doctor, init, add, migrate, export and completion. Theme files from any shell or build pipeline, projects scaffolded and extended in place, exit codes for CI. Global install, npx, or project-local.",
  },
  {
    title: "Theme Studio",
    route: "/theme-studio",
    text: "Generate a complete light and dark theme pair from a seed color with generateTheme(). Pick a seed, preview the derived palette, apply it to the live site. Theme generation studio.",
  },
  {
    title: "Playground",
    route: "/playground",
    text: "Interactive playground: switch families and modes live, explore the token tree, time-travel through theme history, multi-window sync demo, scheduled solar-time demo.",
  },
  {
    title: "Showcase",
    route: "/showcase",
    text: "Gallery of apps and projects built with Themvora: the official docs, the interactive playground, and example apps for every supported framework.",
  },
  {
    title: "Blog",
    route: "/blog",
    text: "Themvora blog — release notes, deep dives, and guides on theming architecture, multi-window sync, scheduling, accessibility and more.",
  },
  {
    title: "Custom Themes",
    route: "/custom-themes",
    text: "Define your own themes with defineTheme, extendTheme and composeTheme. Register them with the runtime, generate from a seed color, and compose on top of built-in presets and brand palettes.",
  },
  {
    title: "Default Presets",
    route: "/presets/default",
    text: "The nine signature default preset families that ship with Themvora (oat, berry, mint, citrus, cocoa, plum, iris, sky, graphite) — each with light and dark. Click any preset to apply it live, plus the getPresetThemes code.",
  },
  {
    title: "Brand Presets",
    route: "/presets/brand",
    text: "Real-world brand preset palettes that ship with Themvora (Apple, GitHub, Vercel, Slack, Discord) — each with light and dark. Click any preset to apply it live, plus the getBrandPresets code.",
  },
  {
    title: "Animation & Transition",
    route: "/animation",
    text: "How Themvora animates theme changes — a live, interactive lab with duration / easing / preset / View Transitions / reduced-motion controls driving the real createThemeDiff → createTransitionPlan → runThemeAnimation pipeline, plus the diff → plan → scan → coordinate pipeline, transition presets (smooth / subtle / instant), the View Transitions cross-fade (useViewTransition), best practices, and the full transition API reference.",
  },
  {
    title: "Accessibility Lab",
    route: "/accessibility",
    text: "Live WCAG contrast checks with getContrastRatio and validateThemeContrast, color vision deficiency simulation with simulateCVD and simulateThemeForCVD, accessibility profiles (high contrast, large text), and a live demo of createAccessibilityPlugin reacting to a violating theme via onViolation with a one-click fix.",
  },
  {
    title: "Custom Scrollbar",
    route: "/custom-scrollbar",
    text: "Replace the browser's default scrollbar with a theme-aware overlay that matches your design system. Quick start, ThemeScrollbar setup per framework (React, Next.js, Vue, Svelte, Solid, Web Components, Angular, Nuxt, Remix), grouped options (behavior / appearance / icons), thumb colors and CSS custom properties, container-scoped scrollbars, and how the flash-free pre-paint engine works.",
  },
  {
    title: "Scoped Theme",
    route: "/scoped-theme",
    text: "Apply a whole theme to a subtree — a sandboxed island inside the app. Live ThemeScope demo, per-framework integration snippets (React, Next.js, Vue, Svelte, Solid, Angular, Web Components, Vanilla), imperative scoping with useScopedTheme and createScopedThemeBinding, scoped CSS variables, Tailwind aliases, and nesting.",
  },
  {
    title: "Zero Flash",
    route: "/zero-flash",
    text: "How Themvora prevents a flash of the wrong theme on reload and SSR. The problem (flash of incorrect theme), the full pipeline (persist → resolve → generate → render → blocking bootstrap → paint → hydrate), the core primitives (createThemeBootstrapScript, buildThemeCssMap, darkModeCSSTemplate), and per-framework integration for React, Next.js, Vue/Nuxt, SvelteKit, Solid, Angular, Astro, Remix and Web Components.",
  },
  {
    title: "Tokens & Typography",
    route: "/tokens",
    text: "Themvora's token system goes far beyond colors: typography (font family, font size, line height), spacing, radius, shadows, border widths, z-index and breakpoints are all semantic theme tokens. Live interactive demos per token group, how tokens map to CSS variables (--theme-color-*, --theme-typography-*, --theme-spacing-*, --theme-radius-*, --theme-shadow-*, --theme-border-width-*), and defining every group in one defineTheme call.",
  },
  {
    title: "Libraries",
    route: "/libraries",
    text: "Adapters bridge Themvora semantic tokens to the libraries you already use. CSS-variable adapters inject live variables; generated adapters rebuild a library theme on every theme change; build-time integrations expose tokens as utilities.",
  },
];

function classify(route) {
  if (route.startsWith("/api-reference")) return "api";
  if (route.startsWith("/cli")) return "cli";
  if (route.startsWith("/blog")) return "blog";
  if (route.startsWith("/framework-guides") || route.startsWith("/libraries")) {
    return "guides";
  }
  return "docs";
}

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

function walk(dir, base = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(abs, join(base, entry.name)));
    } else if (entry.name.endsWith(".md")) {
      out.push({ file: abs, rel: join(base, entry.name) });
    }
  }
  return out;
}

function buildSearchIndex() {
  const index = new Map();
  const sectionEntries = [];

  const add = (entry) => {
    index.set(entry.route, entry);
  };

  // 1. Base coverage: every docs-navigation route
  for (const route of DOCS_ROUTES) {
    add({
      title: route.label,
      route: route.href,
      text: route.hint ?? route.label,
      type: classify(route.href),
    });
  }

  // 2. Taglines for dynamic [slug] pages
  for (const fw of frameworks) {
    const route = fw.path ?? `/framework-guides/${fw.slug}`;
    if (index.has(route)) {
      add({ ...index.get(route), text: `${fw.tagline} Install ${fw.pkg}.` });
    }
    const examplesRoute = `${route}/examples`;
    if (index.has(examplesRoute)) {
      add({
        ...index.get(examplesRoute),
        text:
          `Runnable ${fw.name} examples and use cases for every export in ${fw.pkg}: ` +
          `${fw.groups.map((g) => g.label).join(", ")}. ` +
          `Each API shows what it does, when to use it, what changes on screen, and copy-ready code.`,
      });
    }
  }
  for (const lib of libraries) {
    const route = `/libraries/${lib.slug}`;
    if (index.has(route)) {
      add({ ...index.get(route), text: lib.tagline });
    }
  }
  for (const pkg of packages) {
    const route = `/packages/${pkg.slug}`;
    if (index.has(route)) {
      add({ ...index.get(route), text: pkg.tagline });
    }
  }

  // 3. Rich hand-written descriptions
  for (const entry of STATIC_ENTRIES) {
    const existing = index.get(entry.route);
    if (!existing || existing.text.length <= entry.text.length) {
      add({ ...entry, type: classify(entry.route) });
    }
  }

  // 4. Section-level data for JSX-only pages
  for (const page of PAGE_SECTIONS) {
    const existing = index.get(page.route);
    if (existing && page.intro && page.intro.length > existing.text.length) {
      add({ ...existing, text: page.intro });
    }
    for (const section of page.sections) {
      const text = [section.title, section.desc].filter(Boolean).join(" — ").trim();
      if (!text) continue;
      sectionEntries.push({
        title: section.title,
        route: page.route,
        text,
        type: classify(page.route),
      });
    }
  }

  // 5. Section-level entries from every markdown file
  const seenSections = new Set();

  for (const { file, rel } of walk(contentDir)) {
    const slug = rel.replace(/\.md$/, "").replace(/\\/g, "/");
    const route = ROUTES[slug] ?? `/${slug}`;
    const isFrameworkMirror = slug === "framework-guides";

    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");

    let title = slug
      .split("/")
      .pop()
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    let sectionRoute = route;
    let parentRoute;
    let buffer = [];

    const flush = () => {
      const text = normalize(buffer.join(" "));
      const routeForSection = sectionRoute;
      const duplicateOfBase =
        index.get(routeForSection)?.title.toLowerCase() === title.toLowerCase();
      const generatedLabel = isGeneratedSnippetHeading(title);
      const emptyFrameworkSection =
        isFrameworkMirror && text.toLowerCase() === title.toLowerCase();
      const key = `${routeForSection}\u0000${title}\u0000${text}`;

      if (
        text &&
        !duplicateOfBase &&
        !generatedLabel &&
        !emptyFrameworkSection &&
        !seenSections.has(key)
      ) {
        seenSections.add(key);
        sectionEntries.push({
          title,
          route: routeForSection,
          text,
          type: classify(routeForSection),
        });
      }
      buffer = [];
    };

    for (const line of lines) {
      const heading = /^(#{2,4})\s+(.+)$/.exec(line);
      if (heading) {
        flush();
        const level = heading[1].length;
        const headingText = normalize(heading[2].replace(/[`*_]/g, ""));

        if (isFrameworkMirror && level === 2) {
          parentRoute = frameworkRouteForHeading(headingText);
        }

        sectionRoute = parentRoute ?? route;
        title = headingText;
        buffer.push(title);
      } else {
        buffer.push(line);
      }
    }
    flush();
  }

  return [...index.values(), ...sectionEntries];
}

// --- Main ---

console.log("Building search index...");
const entries = buildSearchIndex();

console.log(`Generated ${entries.length} search entries`);

// Write the index as deterministic JSON
const json = JSON.stringify(entries, null, 2);
writeFileSync(outPath, json, "utf8");

const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
console.log(`Wrote ${outPath} (${sizeKB} KB)`);
