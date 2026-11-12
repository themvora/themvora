#!/usr/bin/env node
/**
 * Generates the per-framework integration recipes rendered by `/libraries/*`.
 *
 * ## Why this is generated
 *
 * Nine libraries × up to nine frameworks × five files each is a matrix, not a
 * document. Written by hand it drifts: a framework gets a new snippet and the
 * other eight keep the old one, or a React import survives inside a Vue recipe.
 * Here every framework's recipe is produced from **one** description of that
 * library (its classes, its components, its install commands) crossed with
 * **one** description of that framework (its file layout, its runtime import,
 * its idiom). The two halves are independent, so a change to either reaches
 * every combination.
 *
 * The generated block is emitted into `apps/docs/lib/libraries.tsx` between
 * `export const FRAMEWORK_RECIPES` and `export const FRAMEWORK_LANG`, because
 * four other tools read that block as text:
 *
 *   - `scripts/audit-library-docs.mjs`         (public selector ↔ recipe parity)
 *   - `scripts/readme/canonical.mjs`           (parses it for the adapter READMEs)
 *   - `scripts/check-readme-drift.mjs`         (README ↔ recipe parity)
 *   - `scripts/docs/audits/audit-page-contracts.mjs`
 *
 * Keeping the block where it is means those keep working, and the recipes stay
 * in one reviewable place.
 *
 * ## What each recipe must prove
 *
 * A recipe is only correct if a reader can follow it from an empty app to a
 * themed one, so each entry carries the whole sequence — install the library,
 * install Themvora, configure the library's build, wire the adapter, render the
 * library's *own* components, switch themes with the library's *own* controls,
 * and run it. The checks in `audit-library-docs.mjs` then verify the parts that
 * are mechanically checkable (real subpaths, hook arity, no React in a Vue
 * recipe).
 *
 * Usage:
 *   node scripts/docs/generate-library-recipes.mjs           # write
 *   node scripts/docs/generate-library-recipes.mjs --check   # fail on drift
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "..", "..");
const TARGET = join(REPO, "apps", "docs", "lib", "libraries.tsx");
const CHECK = process.argv.includes("--check");

const START = "export const FRAMEWORK_RECIPES";
const END = "export const FRAMEWORK_LANG";

/* ==========================================================================
   Framework layer — file layout, runtime import, idiom.
   ========================================================================== */

/**
 * Where each framework keeps the five files a recipe creates.
 *
 * `client` marks the files that need Next.js's `"use client"` directive: the
 * adapter hook runs in an effect, and the theme controls read a store.
 */
const FRAMEWORKS = {
  React: {
    lang: "tsx",
    entry: "src/main.tsx",
    zone: "src/ThemeZone.tsx",
    example: "src/Example.tsx",
    controls: "src/ThemeControls.tsx",
    app: "src/App.tsx",
    runtime: "@themvora/react",
    zoneImport: "./ThemeZone",
    exampleImport: "./Example",
    controlsImport: "./ThemeControls",
  },
  "Next.js": {
    lang: "tsx",
    entry: "app/layout.tsx",
    zone: "app/theme-zone.tsx",
    example: "app/example.tsx",
    controls: "app/theme-controls.tsx",
    app: "app/page.tsx",
    runtime: "@themvora/next",
    zoneImport: "./theme-zone",
    exampleImport: "./example",
    controlsImport: "./theme-controls",
    client: true,
  },
  Remix: {
    lang: "tsx",
    entry: "app/root.tsx",
    zone: "app/components/theme-zone.tsx",
    example: "app/components/example.tsx",
    controls: "app/components/theme-controls.tsx",
    app: "app/routes/_index.tsx",
    runtime: "@themvora/remix",
    zoneImport: "../components/theme-zone",
    exampleImport: "../components/example",
    controlsImport: "../components/theme-controls",
  },
  Astro: {
    lang: "tsx",
    entry: "src/layouts/BaseLayout.astro",
    zone: "src/components/ThemeIsland.tsx",
    example: "src/components/Example.tsx",
    controls: "src/components/ThemeControls.tsx",
    app: "src/pages/index.astro",
    runtime: "@themvora/astro",
  },
  "Vue 3": {
    lang: "vue",
    entry: "src/main.ts",
    zone: "src/components/ThemeZone.vue",
    example: "src/components/Example.vue",
    controls: "src/components/ThemeControls.vue",
    app: "src/App.vue",
    runtime: "@themvora/vue",
    zoneImport: "./components/ThemeZone.vue",
    exampleImport: "./components/Example.vue",
    controlsImport: "./components/ThemeControls.vue",
  },
  Nuxt: {
    lang: "vue",
    entry: "nuxt.config.ts",
    zone: "app/components/ThemeZone.vue",
    example: "app/components/Example.vue",
    controls: "app/components/ThemeControls.vue",
    app: "app/app.vue",
    runtime: "@themvora/nuxt",
    zoneImport: "./components/ThemeZone.vue",
    exampleImport: "./components/Example.vue",
    controlsImport: "./components/ThemeControls.vue",
  },
  Svelte: {
    lang: "svelte",
    entry: "src/lib/ThemeRoot.svelte",
    zone: "src/lib/ThemeZone.svelte",
    example: "src/lib/Example.svelte",
    controls: "src/lib/ThemeControls.svelte",
    app: "src/App.svelte",
    runtime: "@themvora/svelte",
    zoneImport: "./lib/ThemeZone.svelte",
    exampleImport: "./lib/Example.svelte",
    controlsImport: "./lib/ThemeControls.svelte",
  },
  Solid: {
    lang: "tsx",
    entry: "src/index.tsx",
    zone: "src/ThemeZone.tsx",
    example: "src/Example.tsx",
    controls: "src/ThemeControls.tsx",
    app: "src/App.tsx",
    runtime: "@themvora/solid",
    zoneImport: "./ThemeZone",
    exampleImport: "./Example",
    controlsImport: "./ThemeControls",
  },
  Angular: {
    lang: "ts",
    entry: "src/main.ts",
    zone: "src/app/theme-zone.component.ts",
    example: "src/app/example.component.ts",
    controls: "src/app/theme-controls.component.ts",
    app: "src/app/app.component.ts",
    runtime: "@themvora/angular",
    zoneImport: "./theme-zone.component",
    exampleImport: "./example.component",
    controlsImport: "./theme-controls.component",
  },
};

/** The framework's package, for the install command. */
const runtimePkg = (fw) => FRAMEWORKS[fw].runtime;

/**
 * Versions the recipe was actually verified against.
 *
 * Every value here was read from the compatibility lab's working applications
 * (`themvora-library-lab/apps/*`), which is the same matrix the compatibility
 * report is generated from. Publishing a range without a verified floor is how
 * a reader ends up on a version the adapter has never been run against, so the
 * numbers are the tested ones rather than "latest".
 *
 * Update alongside the lab, not independently.
 */
const VERIFIED_NODE = "22.22.2";

const FRAMEWORK_VERSIONS = {
  React: "19.3.1",
  "Next.js": "15.5.28",
  Remix: "2.17.0",
  Astro: "5.14.1",
  "Vue 3": "3.5.44",
  Nuxt: "4.2.0",
  Svelte: "5.57.3",
  Solid: "1.9.18",
  Angular: "22.2.5",
};

/**
 * What the reader must already have before step 2 can succeed.
 *
 * These are the things a first-time reader otherwise discovers by failing: that
 * Nuxt needs `@themvora/vue` as well, that Astro's React island needs
 * `@astrojs/react`, that Angular has no global stylesheet import. Each entry is
 * a label/value pair rendered above the install commands.
 */
const FRAMEWORK_PREREQS = {
  React: ["Vite + React project (`npm create vite@latest -- --template react-ts`)."],
  "Next.js": ["Next.js App Router project. The recipe edits `app/layout.tsx`."],
  Remix: ["Remix (Vite) project. The recipe edits `app/root.tsx`."],
  Astro: [
    "Astro project with the React integration (`npx astro add react`). The adapter runs in a `client:only=\"react\"` island.",
  ],
  "Vue 3": ["Vite + Vue 3 project (`npm create vite@latest -- --template vue-ts`)."],
  Nuxt: ["Nuxt 4 project. Install `@themvora/vue` alongside `@themvora/nuxt`."],
  Svelte: ["Svelte 5 + Vite project (`npm create vite@latest -- --template svelte-ts`)."],
  Solid: ["Solid + Vite project (`npm create vite@latest -- --template solid-ts`)."],
  Angular: [
    "Angular 20+ standalone application. Global styles live in `src/styles.css`, referenced by `angular.json`.",
  ],
};

/**
 * Library versions and the dependencies that are not optional.
 *
 * A provider library needs its own styling engine (`@emotion/*` for MUI and
 * Chakra); a CSS-variable library needs the tool that consumes its variables
 * (`tailwindcss` for daisyUI and shadcn). Omitting them produces an app that
 * builds and renders unstyled, which reads as "Themvora does not work".
 */
const LIBRARY_PREREQS = {
  mui: {
    version: "9.0.0",
    peers: ["@emotion/react 11.14.0", "@emotion/styled 11.14.0"],
  },
  chakra: { version: "3.30.0", peers: ["@emotion/react 11.14.0"] },
  antd: { version: "6.1.0", peers: [] },
  mantine: { version: "7.17.0", peers: ["@mantine/hooks 7.17.0"] },
  bootstrap: { version: "5.3.8", peers: [] },
  daisyui: { version: "5.1.10", peers: ["tailwindcss 4.3.3"] },
  "open-props": { version: "1.7.23", peers: [] },
  shadcn: {
    version: "CLI-generated",
    peers: ["tailwindcss 4.3.3", "class-variance-authority 0.7.1", "tailwind-variants 3.3.1"],
  },
  unocss: { version: "66.7.5", peers: [] },
};

/** The prerequisites list rendered above a recipe's install commands. */
function prereqsFor(fw, slug) {
  const lib = LIBRARY_PREREQS[slug];
  const items = [
    { label: "Node.js", value: `${VERIFIED_NODE} (verified)` },
    { label: fw, value: `${FRAMEWORK_VERSIONS[fw]} (verified)` },
    {
      label: "Library",
      value: lib ? lib.version : "See the library's own installation guide",
    },
  ];
  if (lib && lib.peers.length > 0) {
    items.push({ label: "Peer dependencies", value: lib.peers.join(", ") });
  }
  const frameworkNotes = FRAMEWORK_PREREQS[fw] ?? [];
  if (frameworkNotes.length > 0) {
    items.push({ label: "Project", value: frameworkNotes.join(" ") });
  }
  return items;
}


/** Extra Themvora packages a framework needs beyond its binding. */
const EXTRA_THEMVORA = { Nuxt: ["@themvora/vue"] };

/**
 * The global stylesheet each framework's entry already loads.
 *
 * The library's CSS and the adapter's variable map both go **into this file**,
 * in that order, rather than being imported from JavaScript. Two reasons: CSS
 * `@import` order is the thing that decides whether the adapter's variables win
 * over the library's own defaults, and a reader looking for "where do the
 * colours come from" should find one file, not a chain of module imports.
 *
 * `null` means the framework loads no global stylesheet — Angular reads
 * `src/styles.css` from `angular.json`, so it is written but never imported.
 */
const STYLE_ENTRY = {
  React: "src/index.css",
  "Next.js": "app/globals.css",
  Remix: "app/styles.css",
  Astro: "src/styles/global.css",
  "Vue 3": "src/index.css",
  // Nuxt 4 uses `app/` as its source directory, so `~` resolves to `app/`.
  Nuxt: "app/assets/css/main.css",
  Svelte: "src/index.css",
  Solid: "src/index.css",
  Angular: "src/styles.css",
};

/** The import specifier the entry file uses for its global stylesheet. */
const STYLE_IMPORT = {
  React: "./index.css",
  "Next.js": "./globals.css",
  Remix: "./styles.css",
  Astro: "../styles/global.css",
  "Vue 3": "./index.css",
  Nuxt: "~/assets/css/main.css",
  Svelte: "./index.css",
  Solid: "./index.css",
  Angular: null,
};

/* ==========================================================================
   Small emitters.
   ========================================================================== */

/**
 * The document rule every recipe's global stylesheet carries.
 *
 * It is the whole point of the integration in one selector: Themvora writes
 * `--theme-color-*` on the root element, and the document reads them. Without
 * it a themed page still paints the browser's default canvas, which reads as
 * "the adapter does not work" even though every component is themed.
 */
/**
 * Each framework's own Vite plugin.
 *
 * The setup snippet is presented as a **complete** `vite.config.ts`, so it has
 * to include the plugin the framework needs. Omitting it — as an earlier
 * revision did for Vue and Svelte — produces a config that builds React and
 * then fails on the first `.vue` file with "Install @vitejs/plugin-vue", which
 * is a documentation defect, not a user error.
 */
const VITE_PLUGIN = {
  React: { imp: 'import react from "@vitejs/plugin-react";', use: "react()" },
  "Vue 3": { imp: 'import vue from "@vitejs/plugin-vue";', use: "vue()" },
  Svelte: {
    imp: 'import { svelte } from "@sveltejs/vite-plugin-svelte";',
    use: "svelte()",
  },
  Solid: { imp: 'import solid from "vite-plugin-solid";', use: "solid()" },
  Remix: { imp: 'import { vitePlugin as remix } from "@remix-run/dev";', use: "remix()" },
};

const DOCUMENT_RULE = [
  "html,",
  "body {",
  "  margin: 0;",
  "  background: var(--theme-color-background);",
  "  color: var(--theme-color-foreground);",
  "}",
].join("\n");

const lines = (...xs) => xs.filter((x) => x !== null && x !== undefined && x !== "").join("\n");

/**
 * Like `lines`, but keeps blank entries.
 *
 * A stylesheet is read in groups — imports, then the document rule — and
 * collapsing the blank line between them turns three blocks into one wall.
 * JS/TS snippets still use `lines`, where a stray blank line is just noise.
 */
const cssLines = (...xs) => xs.filter((x) => x !== null && x !== undefined).join("\n");

/** A file banner the docs renderer splits on. */
const file = (path) => `// ---- ${path}`;

/* ==========================================================================
   Library layer — the parts that differ per library.
   ========================================================================== */

/**
 * A `css-variable` library: the adapter writes the library's own custom
 * properties, so the example is the library's own classes on ordinary markup.
 */
function cssVariableLibrary(spec) {
  const { slug, hook, install, setup, styleImports, classes, controls, notes } = spec;

  /** The adapter's hook, per framework. */
  const wiring = {
    React: () => lines(
      `// ${FRAMEWORKS.React.zone}`,
      `import type { ReactNode } from "react";`,
      `import { useThemeRuntime } from "@themvora/react";`,
      `import { ${hook.react} } from "@themvora/${slug}/react";`,
      ``,
      `// Registers the adapter on the runtime from the provider above.`,
      `export function ThemeZone({ children }: { children: ReactNode }) {`,
      `  ${hook.react}(useThemeRuntime());`,
      `  return <>{children}</>;`,
      `}`,
    ),
    "Next.js": () => lines(
      `// ${FRAMEWORKS["Next.js"].zone}`,
      `"use client";`,
      ``,
      `import type { ReactNode } from "react";`,
      `import { useThemeRuntime } from "@themvora/next/client";`,
      `import { ${hook.react} } from "@themvora/${slug}/react";`,
      ``,
      `export function ThemeZone({ children }: { children: ReactNode }) {`,
      `  ${hook.react}(useThemeRuntime());`,
      `  return <>{children}</>;`,
      `}`,
    ),
    Remix: () => lines(
      `// ${FRAMEWORKS.Remix.zone}`,
      `import type { ReactNode } from "react";`,
      `import { useThemeRuntime } from "@themvora/remix";`,
      `import { ${hook.react} } from "@themvora/${slug}/react";`,
      ``,
      `export function ThemeZone({ children }: { children: ReactNode }) {`,
      `  ${hook.react}(useThemeRuntime());`,
      `  return <>{children}</>;`,
      `}`,
    ),
    Astro: () => lines(
      `// ${FRAMEWORKS.Astro.zone}`,
      `import { ThemeProviderClient, useThemeRuntime } from "@themvora/astro/client";`,
      `import { ${hook.react} } from "@themvora/${slug}/react";`,
      `import { Example } from "./Example";`,
      `import { ThemeControls } from "./ThemeControls";`,
      ``,
      `function InstallAdapter() {`,
      `  ${hook.react}(useThemeRuntime());`,
      `  return null;`,
      `}`,
      ``,
      `// One client island owns the runtime, the adapter and the UI. Astro cannot`,
      `// hand React children to a client:only island, so the island renders the`,
      `// example itself rather than receiving it from the page.`,
      `export default function ThemeIsland() {`,
      `  return (`,
      `    <>`,
      `      <ThemeProviderClient defaultTheme="plum-light" initialMode="system" />`,
      `      <InstallAdapter />`,
      `      <Example />`,
      `      <ThemeControls />`,
      `    </>`,
      `  );`,
      `}`,
    ),
    "Vue 3": () => lines(
      `<!-- ${FRAMEWORKS["Vue 3"].zone} -->`,
      `<script setup lang="ts">`,
      `import { useThemeRuntime } from "@themvora/vue";`,
      `import { ${hook.vue} } from "@themvora/${slug}/vue";`,
      ``,
      `// Installs on mount, disposes on unmount.`,
      `${hook.vue}(useThemeRuntime());`,
      `</script>`,
      ``,
      `<template>`,
      `  <slot />`,
      `</template>`,
    ),
    Nuxt: () => lines(
      `<!-- ${FRAMEWORKS.Nuxt.zone} -->`,
      `<script setup lang="ts">`,
      `// \`useThemeRuntime\` is auto-imported by @themvora/nuxt.`,
      `import { ${hook.vue} } from "@themvora/${slug}/vue";`,
      ``,
      `${hook.vue}(useThemeRuntime());`,
      `</script>`,
      ``,
      `<template>`,
      `  <slot />`,
      `</template>`,
    ),
    Svelte: () => lines(
      `<!-- ${FRAMEWORKS.Svelte.zone} -->`,
      `<script lang="ts">`,
      `  import type { Snippet } from "svelte";`,
      `  import { getThemeRuntime } from "@themvora/svelte";`,
      `  import { ${hook.svelte} } from "@themvora/${slug}/svelte";`,
      ``,
      `  let { children }: { children: Snippet } = $props();`,
      ``,
      `  // Runs during component initialisation, so the variables exist before paint.`,
      `  ${hook.svelte}(getThemeRuntime());`,
      `</script>`,
      ``,
      `{@render children()}`,
    ),
    Solid: () => lines(
      `// ${FRAMEWORKS.Solid.zone}`,
      `import type { JSX } from "solid-js";`,
      `import { useThemeRuntime } from "@themvora/solid";`,
      `import { ${hook.solid} } from "@themvora/${slug}/solid";`,
      ``,
      `export function ThemeZone(props: { children: JSX.Element }) {`,
      `  ${hook.solid}(useThemeRuntime());`,
      `  return <>{props.children}</>;`,
      `}`,
    ),
    Angular: () => lines(
      `// ${FRAMEWORKS.Angular.zone}`,
      `import { Component } from "@angular/core";`,
      `import { injectThemeRuntime } from "@themvora/angular";`,
      `import { ${hook.angular} } from "@themvora/${slug}/angular";`,
      ``,
      `@Component({`,
      `  selector: "app-theme-zone",`,
      `  standalone: true,`,
      `  template: "<ng-content />",`,
      `})`,
      `export class ThemeZoneComponent {`,
      `  constructor() {`,
      `    // A constructor is an injection context, so the adapter attaches to the`,
      `    // runtime \`provideTheme()\` created in src/main.ts.`,
      `    ${hook.angular}(injectThemeRuntime());`,
      `  }`,
      `}`,
    ),
  };

  return {
    slug,
    family: "css-variable",
    install,
    setup,
    styleImports,
    classes,
    controls,
    wiring,
    notes,
  };
}

/**
 * A `provider` library: the adapter builds the library's native theme object
 * and hands it to the library's own provider. Support stops at React and the
 * React-based frameworks, because the library itself is React.
 */
function providerLibrary(spec) {
  const { slug, provider, install, setup, styleImports, components, controls, notes, next } = spec;

  const zone = (runtimeImport) => () =>
    lines(
      `import type { ReactNode } from "react";`,
      `import { useThemeRuntime } from "${runtimeImport}";`,
      `import { ${provider} } from "@themvora/${slug}";`,
      ``,
      `// Rebuilds ${spec.name}'s own theme object on every selection change.`,
      `export function ThemeZone({ children }: { children: ReactNode }) {`,
      `  const runtime = useThemeRuntime();`,
      ``,
      `  return <${provider} runtime={runtime}>{children}</${provider}>;`,
      `}`,
    );

  const wiring = {
    React: () => lines(`// ${FRAMEWORKS.React.zone}`, zone("@themvora/react")()),
    "Next.js": () => lines(`// ${FRAMEWORKS["Next.js"].zone}`, `"use client";`, ``, zone("@themvora/next/client")()),
    Remix: () => lines(`// ${FRAMEWORKS.Remix.zone}`, zone("@themvora/remix")()),
    Astro: () => lines(
      `// ${FRAMEWORKS.Astro.zone}`,
      `import type { ReactNode } from "react";`,
      `import { ThemeProviderClient, useThemeRuntime } from "@themvora/astro/client";`,
      `import { ${provider} } from "@themvora/${slug}";`,
      `import { Example } from "./Example";`,
      `import { ThemeControls } from "./ThemeControls";`,
      ``,
      `function Bridged({ children }: { children: ReactNode }) {`,
      `  const runtime = useThemeRuntime();`,
      `  return <${provider} runtime={runtime}>{children}</${provider}>;`,
      `}`,
      ``,
      `// Astro cannot hand React children to a client:only island, so the island`,
      `// renders the example and the controls inside the provider itself.`,
      `export default function ThemeIsland() {`,
      `  return (`,
      `    <>`,
      `      <ThemeProviderClient defaultTheme="plum-light" initialMode="system" />`,
      `      <Bridged>`,
      `        <Example />`,
      `        <ThemeControls />`,
      `      </Bridged>`,
      `    </>`,
      `  );`,
      `}`,
    ),
  };

  return {
    slug,
    family: "provider",
    install,
    setup,
    styleImports,
    components,
    controls,
    wiring,
    notes,
    // Next.js-specific SSR wiring. The App Router streams the page, so an
    // Emotion-based library's server styles need a cache provider that flushes
    // them into <head>; each library documents its own provider, and they are
    // not interchangeable.
    next,
  };
}

/* ==========================================================================
   Shared per-framework files.
   ========================================================================== */

/**
 * The entry file: mounts the provider, imports the stylesheets.
 *
 * `css` is the ordered list of stylesheet imports this framework's entry owns.
 */
function entryFile(fw, { providerProps, extraImports = [] }) {
  const p = FRAMEWORKS[fw];
  const style = STYLE_IMPORT[fw];
  const styleImport = [
    ...(style ? [`import "${style}";`] : []),
    ...extraImports.map((i) => `import "${i}";`),
  ];

  switch (fw) {
    case "React":
      return lines(
        `// ${p.entry}`,
        `import { createRoot } from "react-dom/client";`,
        `import { ThemeProvider } from "@themvora/react";`,
        ...styleImport,
        ``,
        `import { App } from "./App";`,
        ``,
        `createRoot(document.getElementById("root")!).render(`,
        `  <ThemeProvider ${providerProps}>`,
        `    <App />`,
        `  </ThemeProvider>,`,
        `);`,
      );
    case "Next.js":
      return lines(
        `// ${p.entry}`,
        `import type { ReactNode } from "react";`,
        `import { ThemeProvider } from "@themvora/next";`,
        ...styleImport,
        ``,
        `// ThemeProvider renders <html> and <body> itself — do not wrap it in them.`,
        `export default function RootLayout({ children }: { children: ReactNode }) {`,
        `  return (`,
        `    <ThemeProvider ${providerProps}>`,
        `      {children}`,
        `    </ThemeProvider>`,
        `  );`,
        `}`,
      );
    case "Remix":
      // Remix owns the document, so the theme cannot render `<html>` itself.
      // `createThemeDocument()` keeps the loader, the pre-paint script, the
      // `<html>` shell and the runtime provider on one configuration, so those
      // four cannot disagree. The stylesheet is linked through `links` instead
      // of imported for side effects — the form Remix's Vite plugin expects.
      return lines(
        `// ${p.entry}`,
        `import type { ReactNode } from "react";`,
        `import type { LinksFunction } from "@remix-run/node";`,
        `import {`,
        `  Links,`,
        `  Meta,`,
        `  Outlet,`,
        `  Scripts,`,
        `  ScrollRestoration,`,
        `  useLoaderData,`,
        `} from "@remix-run/react";`,
        `import { getBuiltInThemes } from "@themvora/core";`,
        `import { createThemeDocument } from "@themvora/remix";`,
        `import styles from "${style}?url";`,
        ...extraImports.map((i) => `import "${i}";`),
        ``,
        `export const links: LinksFunction = () => [`,
        `  { rel: "stylesheet", href: styles },`,
        `];`,
        ``,
        `const themes = getBuiltInThemes();`,
        `const theming = createThemeDocument({`,
        `  themes,`,
        `  defaultTheme: "plum-light",`,
        `  mode: "system",`,
        `});`,
        ``,
        `// Resolve the selection on the server so hydration matches exactly.`,
        `export async function loader({ request }: { request: Request }) {`,
        `  return { theme: await theming.resolveInitial(request) };`,
        `}`,
        ``,
        `export function Layout({ children }: { children: ReactNode }) {`,
        `  const { theme } = useLoaderData<typeof loader>();`,
        ``,
        `  return (`,
        `    // Remix owns the document; Document supplies the theme-owned parts: the`,
        `    // blocking bootstrap, the matching <html> shell and the runtime provider.`,
        `    <theming.Document`,
        `      initial={theme}`,
        `      htmlProps={{ lang: "en" }}`,
        `      head={[`,
        `        <meta key="charset" charSet="utf-8" />,`,
        `        <Meta key="meta" />,`,
        `        <Links key="links" />,`,
        `      ]}`,
        `      afterContent={`,
        `        <>`,
        `          <ScrollRestoration />`,
        `          <Scripts />`,
        `        </>`,
        `      }`,
        `    >`,
        `      {children}`,
        `    </theming.Document>`,
        `  );`,
        `}`,
        ``,
        `export default function App() {`,
        `  return <Outlet />;`,
        `}`,
      );
    case "Vue 3":
      // `ThemeProvider` is a component with a default slot, so it wraps the app
      // in a render function rather than being installed as a plugin — its
      // `install()` only registers the component and takes no options.
      return lines(
        `// ${p.entry}`,
        `import { createApp, h } from "vue";`,
        `import { ThemeProvider } from "@themvora/vue";`,
        ...styleImport,
        ``,
        `import App from "./App.vue";`,
        ``,
        `createApp({`,
        `  render: () =>`,
        `    h(`,
        `      ThemeProvider,`,
        `      { defaultTheme: "plum-light", initialMode: "system" },`,
        `      () => h(App),`,
        `    ),`,
        `}).mount("#app");`,
      );
    case "Nuxt":
      return lines(
        `// ${p.entry}`,
        `export default defineNuxtConfig({`,
        `  modules: ["@themvora/nuxt"],`,
        `  // Nuxt loads this stylesheet globally; it is where the library's CSS and`,
        `  // the adapter's variable map are imported, in that order.`,
        `  css: ["~/assets/css/main.css"],`,
        `  themvora: {`,
        `    defaultTheme: "plum-light",`,
        `    initialMode: "system",`,
        `  },`,
        `});`,
      );
    case "Svelte":
      // Svelte 5 mounts a component, not a provider call, so the provider gets
      // its own root component. `src/main.ts` then mounts `App`, which uses it.
      return lines(
        `<!-- ${p.entry} -->`,
        `<script lang="ts">`,
        `  import type { Snippet } from "svelte";`,
        `  import { ThemeProvider } from "@themvora/svelte";`,
        `  import "../index.css";`,
        ``,
        `  let { children }: { children: Snippet } = $props();`,
        `</script>`,
        ``,
        `<ThemeProvider defaultTheme="plum-light" initialMode="system">`,
        `  {@render children()}`,
        `</ThemeProvider>`,
        `// ---- src/main.ts`,
        `import { mount } from "svelte";`,
        `import App from "./App.svelte";`,
        // Extra module imports (UnoCSS's `virtual:uno.css`) belong in the real
        // entry file. The provider component only imports its own stylesheet.
        ...extraImports.map((i) => `import "${i}";`),
        ``,
        `mount(App, { target: document.getElementById("app")! });`,
      );
    case "Solid":
      return lines(
        `// ${p.entry}`,
        `import { render } from "solid-js/web";`,
        `import { ThemeProvider } from "@themvora/solid";`,
        ...styleImport,
        ``,
        `import { App } from "./App";`,
        ``,
        `render(`,
        `  () => (`,
        `    <ThemeProvider ${providerProps}>`,
        `      <App />`,
        `    </ThemeProvider>`,
        `  ),`,
        `  document.getElementById("root")!,`,
        `);`,
      );
    case "Angular":
      return lines(
        `// ${p.entry}`,
        `import { bootstrapApplication } from "@angular/platform-browser";`,
        `import { provideTheme } from "@themvora/angular";`,
        ...styleImport,
        ``,
        `import { AppComponent } from "./app/app.component";`,
        ``,
        `bootstrapApplication(AppComponent, {`,
        `  providers: [provideTheme({ defaultTheme: "plum-light", initialMode: "system" })],`,
        `});`,
      );
    case "Astro":
      // Astro cannot pass React components as children of a `client:only`
      // island — the children become static HTML, not React elements. So the
      // island renders the example and the controls itself, and the layout only
      // mounts the island.
      return lines(
        `---`,
        `// ${p.entry}`,
        `import ThemeIsland from "../components/ThemeIsland";`,
        `import "../styles/global.css";`,
        `---`,
        ``,
        `<html lang="en">`,
        `  <body>`,
        `    <ThemeIsland client:only="react" />`,
        `    <slot />`,
        `  </body>`,
        `</html>`,
      );
    default:
      throw new Error(`no entry template for ${fw}`);
  }
}

/* ==========================================================================
   Libraries.
   ========================================================================== */

/* ---------------------------------------------------------------- Bootstrap */

const bootstrap = cssVariableLibrary({
  slug: "bootstrap",
  hook: {
    react: "useBootstrapTheme",
    vue: "useBootstrapTheme",
    svelte: "useBootstrapTheme",
    solid: "useBootstrapTheme",
    angular: "injectBootstrapTheme",
  },
  install: () => ["pnpm add bootstrap"],
  // Bootstrap's own stylesheet first; the adapter re-points its variables after.
  styleImports: [
    "bootstrap/dist/css/bootstrap.min.css",
    "@themvora/bootstrap/bootstrap.css",
  ],
  classes: {
    title: "Themvora + Bootstrap",
    body: "This card is a plain Bootstrap 5 card. Its colours come from the theme.",
  },
  controls: {
    primary: "btn btn-primary",
    secondary: "btn btn-outline-secondary",
  },
});

/* ------------------------------------------------------------------ daisyUI */

const daisyui = cssVariableLibrary({
  slug: "daisyui",
  hook: {
    react: "useDaisyTheme",
    vue: "useDaisyTheme",
    svelte: "useDaisyTheme",
    solid: "useDaisyTheme",
    angular: "injectDaisyTheme",
  },
  install: (fw) =>
    fw === "Next.js" || fw === "Angular"
      ? ["pnpm add daisyui", "pnpm add -D tailwindcss @tailwindcss/postcss"]
      : fw === "Nuxt"
        ? ["pnpm add daisyui", "pnpm add -D tailwindcss @tailwindcss/vite"]
        : ["pnpm add daisyui", "pnpm add -D tailwindcss @tailwindcss/vite"],
  setup: (fw) => {
    const css = cssLines(
      `@import "tailwindcss";`,
      `@import "@themvora/daisyui/daisyui.css";`,
      `@plugin "daisyui";`,
    );
    const sheet = lines(`// ---- ${STYLE_ENTRY[fw]}`, css, DOCUMENT_RULE);
    if (fw === "Next.js") {
      return lines(
        `// ---- postcss.config.mjs`,
        `export default {`,
        `  plugins: { "@tailwindcss/postcss": {} },`,
        `};`,
        sheet,
      );
    }
    if (fw === "Angular") {
      return lines(
        `// .postcssrc.json`,
        `// ---- .postcssrc.json`,
        `{ "plugins": { "@tailwindcss/postcss": {} } }`,
        sheet,
      );
    }
    if (fw === "Nuxt") {
      return lines(
        `// ---- nuxt.config.ts`,
        `import tailwindcss from "@tailwindcss/vite";`,
        ``,
        `export default defineNuxtConfig({`,
        `  css: ["~/assets/css/main.css"],`,
        `  vite: { plugins: [tailwindcss()] },`,
        `});`,
        sheet,
      );
    }
    if (fw === "Astro") {
      // Astro renders `ThemeIsland` through `@astrojs/react`. Installing the
      // Tailwind Vite plugin must not replace the integrations list — leaving
      // it out builds the CSS but fails with `NoMatchingRenderer` at prerender.
      return lines(
        `// ---- astro.config.mjs`,
        `import { defineConfig } from "astro/config";`,
        `import react from "@astrojs/react";`,
        `import tailwindcss from "@tailwindcss/vite";`,
        ``,
        `export default defineConfig({`,
        `  integrations: [react()],`,
        `  vite: { plugins: [tailwindcss()] },`,
        `});`,
        sheet,
      );
    }
    return lines(
      `// ---- vite.config.ts`,
      `import { defineConfig } from "vite";`,
      VITE_PLUGIN[fw].imp,
      `import tailwindcss from "@tailwindcss/vite";`,
      ``,
      `export default defineConfig({`,
      `  plugins: [${VITE_PLUGIN[fw].use}, tailwindcss()],`,
      `});`,
      sheet,
    );
  },
  classes: {
    title: "Themvora + daisyUI",
    body: "This card is a plain daisyUI card. Its colours come from the theme.",
  },
  controls: {
    primary: "btn btn-primary",
    secondary: "btn btn-ghost",
  },
});

/* --------------------------------------------------------------- Open Props */

const openProps = cssVariableLibrary({
  slug: "open-props",
  hook: {
    react: "useOpenPropsTheme",
    vue: "useOpenPropsTheme",
    svelte: "useOpenPropsTheme",
    solid: "useOpenPropsTheme",
    angular: "injectOpenPropsTheme",
  },
  install: () => ["pnpm add open-props"],
  // Open Props ships the primitives (sizes, radii, shadows, easing); the adapter
  // adds the semantic colour layer and derives the scales from the theme.
  styleImports: ["open-props/style", "@themvora/open-props/open-props.css"],
  classes: {
    title: "Themvora + Open Props",
    body: "Open Props ships design tokens, not components — this card is ordinary markup.",
  },
  controls: {
    primary: "btn-primary",
    secondary: "btn-secondary",
  },
});

/* ---------------------------------------------------------------- shadcn/ui */

const shadcn = {
  slug: "shadcn",
  family: "css-variable",
  /**
   * shadcn/ui is not a package: the CLI writes component source into the
   * project. Each framework therefore has its own CLI, and only the React
   * family shares one.
   */
  frameworks: ["React", "Next.js", "Remix", "Astro", "Vue 3", "Svelte"],
};

/* --------------------------------------------------------------- MUI family */

const mui = providerLibrary({
  slug: "mui",
  name: "Material UI",
  provider: "MuiThemeProvider",
  install: (fw) => [
    "pnpm add @mui/material @emotion/react @emotion/styled",
    // The App Router cache provider is a separate package. `@emotion/cache`
    // and `@emotion/server` are its peers, and pnpm does not install peers
    // automatically — leaving them out typechecks but fails the build.
    ...(fw === "Next.js"
      ? ["pnpm add @mui/material-nextjs @emotion/cache @emotion/server"]
      : []),
  ],
  setup: () => null,
  notes: null,
  next: {
    entry: () =>
      lines(
        `// ${FRAMEWORKS["Next.js"].entry}`,
        `import type { ReactNode } from "react";`,
        `import { ThemeProvider } from "@themvora/next";`,
        // The subpath tracks the Next.js major: v15-appRouter for Next 15,
        // v16-appRouter for Next 16.
        `// The subpath follows the Next.js major: v15-appRouter for Next 15,`,
        `// v16-appRouter for Next 16.`,
        `import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";`,
        `import "./globals.css";`,
        ``,
        `// ThemeProvider renders <html> and <body> itself — do not wrap it in them.`,
        `// AppRouterCacheProvider collects the Emotion styles MUI generates during`,
        `// streaming SSR and flushes them into <head>; without it they arrive in`,
        `// the streamed body chunk and hydration fails with React error #418.`,
        `export default function RootLayout({ children }: { children: ReactNode }) {`,
        `  return (`,
        `    <ThemeProvider defaultTheme="plum-light">`,
        `      <AppRouterCacheProvider options={{ key: "mui" }}>`,
        `        {children}`,
        `      </AppRouterCacheProvider>`,
        `    </ThemeProvider>`,
        `  );`,
        `}`,
      ),
  },
});

/** Chakra's documented Emotion registry for App Router streaming. */
const CHAKRA_EMOTION_REGISTRY = lines(
  `// ---- app/emotion-registry.tsx`,
  `"use client";`,
  ``,
  `import createCache from "@emotion/cache";`,
  `import { CacheProvider } from "@emotion/react";`,
  `import { useServerInsertedHTML } from "next/navigation";`,
  `import { useState, type ReactNode } from "react";`,
  ``,
  `// Chakra UI renders its Emotion styles inline while streaming. Flushing them`,
  `// into <head> is what lets the client hydrate without re-rendering the tree`,
  `// (React error #418). This is Chakra's registry, not MUI's cache provider.`,
  `export function EmotionRegistry({ children }: { children: ReactNode }) {`,
  `  const [{ cache, flush }] = useState(() => {`,
  `    const cache = createCache({ key: "css" });`,
  `    cache.compat = true;`,
  ``,
  `    const insert = cache.insert;`,
  `    let inserted: string[] = [];`,
  ``,
  `    cache.insert = (...args) => {`,
  `      const serialized = args[1];`,
  `      if (cache.inserted[serialized.name] === undefined) {`,
  `        inserted.push(serialized.name);`,
  `      }`,
  `      return insert(...args);`,
  `    };`,
  ``,
  `    const flush = () => {`,
  `      const names = inserted;`,
  `      inserted = [];`,
  `      return names;`,
  `    };`,
  ``,
  `    return { cache, flush };`,
  `  });`,
  ``,
  `  useServerInsertedHTML(() => {`,
  `    const names = flush();`,
  `    if (names.length === 0) return null;`,
  ``,
  `    return (`,
  `      <style`,
  `        data-emotion={\`\${cache.key} \${names.join(" ")}\`}`,
  `        dangerouslySetInnerHTML={{`,
  `          __html: names.map((name) => cache.inserted[name]).join(""),`,
  `        }}`,
  `      />`,
  `    );`,
  `  });`,
  ``,
  `  return <CacheProvider value={cache}>{children}</CacheProvider>;`,
  `}`,
);

const chakra = providerLibrary({
  slug: "chakra",
  name: "Chakra UI",
  provider: "ChakraThemeProvider",
  install: (fw) => [
    // The registry imports `@emotion/cache` directly; it is a peer of Chakra's
    // Emotion stack, not a transitive dependency a pnpm consumer can rely on.
    fw === "Next.js"
      ? "pnpm add @chakra-ui/react @emotion/react @emotion/cache"
      : "pnpm add @chakra-ui/react @emotion/react",
  ],
  setup: () => null,
  next: {
    // The registry is part of mounting the provider, so it is emitted as a
    // second file in that snippet rather than as build/CSS configuration.
    entry: () =>
      lines(
        CHAKRA_EMOTION_REGISTRY,
        `// ---- ${FRAMEWORKS["Next.js"].entry}`,
        `import type { ReactNode } from "react";`,
        `import { ThemeProvider } from "@themvora/next";`,
        `import { EmotionRegistry } from "./emotion-registry";`,
        `import "./globals.css";`,
        ``,
        `// ThemeProvider renders <html> and <body> itself — do not wrap it in them.`,
        `// Chakra needs its own Emotion registry around the streamed subtree so the`,
        `// styles it generates during SSR are emitted into <head>.`,
        `export default function RootLayout({ children }: { children: ReactNode }) {`,
        `  return (`,
        `    <ThemeProvider defaultTheme="plum-light">`,
        `      <EmotionRegistry>{children}</EmotionRegistry>`,
        `    </ThemeProvider>`,
        `  );`,
        `}`,
      ),
  },
});

const antd = providerLibrary({
  slug: "antd",
  name: "Ant Design",
  provider: "AntdThemeProvider",
  install: () => ["pnpm add antd"],
  setup: () => null,
});

const mantine = providerLibrary({
  slug: "mantine",
  name: "Mantine",
  provider: "MantineThemeProvider",
  install: () => ["pnpm add @mantine/core @mantine/hooks"],
  // Mantine ships its own stylesheet; the adapter builds a theme object on top
  // of it, so it stays. No banner: `styleChunk` adds the file path.
  styleImports: ["@mantine/core/styles.css"],
});

/* ==========================================================================
   Component markup per library × framework.
   ========================================================================== */

/**
 * Solid's JSX is React-shaped but its attribute is `class`, not `className`.
 * Reusing the React markup verbatim produces a type error on every element, so
 * the markup is translated once here rather than maintained twice.
 */
function solidMarkup(jsx) {
  return jsx.replace(/className=/g, "class=");
}

const UI = {
  bootstrap: (fw) => {
    const t = "Themvora + Bootstrap";
    const b = "This card is a plain Bootstrap 5 card. Its colours come from the theme.";
    switch (fw) {
      case "Vue 3":
      case "Nuxt":
        return lines(
          `<template>`,
          `  <div class="card">`,
          `    <div class="card-body">`,
          `      <h2 class="card-title h5">${t}</h2>`,
          `      <p class="card-text text-body-secondary">${b}</p>`,
          `      <button type="button" class="btn btn-primary">Primary action</button>`,
          `    </div>`,
          `  </div>`,
          `</template>`,
        );
      case "Svelte":
        return lines(
          `<script lang="ts">`,
          `  // Markup only — but a Svelte component without a script block emits no`,
          `  // module declaration, so importing it fails \`svelte-check\` under strict.`,
          `</script>`,
          ``,
          `<div class="card">`,
          `  <div class="card-body">`,
          `    <h2 class="card-title h5">${t}</h2>`,
          `    <p class="card-text text-body-secondary">${b}</p>`,
          `    <button type="button" class="btn btn-primary">Primary action</button>`,
          `  </div>`,
          `</div>`,
        );
      case "Angular":
        return lines(
          `import { Component } from "@angular/core";`,
          ``,
          `@Component({`,
          `  selector: "app-example",`,
          `  standalone: true,`,
          `  template: \``,
          `    <div class="card">`,
          `      <div class="card-body">`,
          `        <h2 class="card-title h5">${t}</h2>`,
          `        <p class="card-text text-body-secondary">${b}</p>`,
          `        <button type="button" class="btn btn-primary">Primary action</button>`,
          `      </div>`,
          `    </div>`,
          `  \`,`,
          `})`,
          `export class ExampleComponent {}`,
        );
      case "Solid":
        return solidMarkup(UI.bootstrap("React"));
      default:
        return lines(
          `export function Example() {`,
          `  return (`,
          `    <div className="card">`,
          `      <div className="card-body">`,
          `        <h2 className="card-title h5">${t}</h2>`,
          `        <p className="card-text text-body-secondary">${b}</p>`,
          `        <button type="button" className="btn btn-primary">`,
          `          Primary action`,
          `        </button>`,
          `      </div>`,
          `    </div>`,
          `  );`,
          `}`,
        );
    }
  },

  daisyui: (fw) => {
    const t = "Themvora + daisyUI";
    const b = "This card is a plain daisyUI card. Its colours come from the theme.";
    switch (fw) {
      case "Vue 3":
      case "Nuxt":
        return lines(
          `<template>`,
          `  <div class="card bg-base-100 shadow-sm">`,
          `    <div class="card-body">`,
          `      <h2 class="card-title">${t}</h2>`,
          `      <p class="text-base-content/70">${b}</p>`,
          `      <div class="card-actions justify-end">`,
          `        <button class="btn btn-primary">Primary action</button>`,
          `      </div>`,
          `    </div>`,
          `  </div>`,
          `</template>`,
        );
      case "Svelte":
        return lines(
          `<script lang="ts">`,
          `  // Markup only — but a Svelte component without a script block emits no`,
          `  // module declaration, so importing it fails \`svelte-check\` under strict.`,
          `</script>`,
          ``,
          `<div class="card bg-base-100 shadow-sm">`,
          `  <div class="card-body">`,
          `    <h2 class="card-title">${t}</h2>`,
          `    <p class="text-base-content/70">${b}</p>`,
          `    <div class="card-actions justify-end">`,
          `      <button class="btn btn-primary">Primary action</button>`,
          `    </div>`,
          `  </div>`,
          `</div>`,
        );
      case "Angular":
        return lines(
          `import { Component } from "@angular/core";`,
          ``,
          `@Component({`,
          `  selector: "app-example",`,
          `  standalone: true,`,
          `  template: \``,
          `    <div class="card bg-base-100 shadow-sm">`,
          `      <div class="card-body">`,
          `        <h2 class="card-title">${t}</h2>`,
          `        <p class="text-base-content/70">${b}</p>`,
          `        <div class="card-actions justify-end">`,
          `          <button class="btn btn-primary">Primary action</button>`,
          `        </div>`,
          `      </div>`,
          `    </div>`,
          `  \`,`,
          `})`,
          `export class ExampleComponent {}`,
        );
      case "Solid":
        return solidMarkup(UI.daisyui("React"));
      default:
        return lines(
          `export function Example() {`,
          `  return (`,
          `    <div className="card bg-base-100 shadow-sm">`,
          `      <div className="card-body">`,
          `        <h2 className="card-title">${t}</h2>`,
          `        <p className="text-base-content/70">${b}</p>`,
          `        <div className="card-actions justify-end">`,
          `          <button className="btn btn-primary">Primary action</button>`,
          `        </div>`,
          `      </div>`,
          `    </div>`,
          `  );`,
          `}`,
        );
    }
  },

  "open-props": (fw) => {
    // Open Props is variables only. The card is ordinary markup whose styles
    // read the adapter's semantic colour layer plus Open Props' own scales.
    const style = {
      card: "background: var(--color-canvas); color: var(--color-text); border: 1px solid var(--color-border); border-radius: var(--radius-3); padding: var(--size-5); display: grid; gap: var(--size-3); box-shadow: var(--shadow-2)",
      title: "margin: 0; font-size: var(--font-size-3); font-weight: 600",
      text: "margin: 0; color: var(--color-muted-foreground); font-size: var(--font-size-1)",
      button: "background: var(--color-primary); color: var(--color-primary-foreground); border: 0; border-radius: var(--radius-2); padding: var(--size-2) var(--size-4); font: inherit; cursor: pointer",
    };
    const decl = (css, camelCase = true) =>
      css
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const at = part.indexOf(":");
          const raw = part.slice(0, at).trim();
          const key = camelCase ? raw.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) : raw;
          return `${JSON.stringify(key)}: ${JSON.stringify(part.slice(at + 1).trim())}`;
        })
        .join(", ");

    const t = "Themvora + Open Props";
    const b = "Open Props ships design tokens, not components — this is ordinary markup.";

    if (fw === "Vue 3" || fw === "Nuxt") {
      return lines(
        `<template>`,
        `  <section class="op-card">`,
        `    <h2 class="op-title">${t}</h2>`,
        `    <p class="op-text">${b}</p>`,
        `    <button class="op-button" type="button">Primary action</button>`,
        `  </section>`,
        `</template>`,
        ``,
        `<style scoped>`,
        `.op-card { ${style.card}; }`,
        `.op-title { ${style.title}; }`,
        `.op-text { ${style.text}; }`,
        `.op-button { ${style.button}; }`,
        `</style>`,
      );
    }
    if (fw === "Svelte") {
      return lines(
        `<script lang="ts">`,
        `  // Markup only — but a Svelte component without a script block emits no`,
        `  // module declaration, so importing it fails \`svelte-check\` under strict.`,
        `</script>`,
        ``,
        `<section class="op-card">`,
        `  <h2 class="op-title">${t}</h2>`,
        `  <p class="op-text">${b}</p>`,
        `  <button class="op-button" type="button">Primary action</button>`,
        `</section>`,
        ``,
        `<style>`,
        `  .op-card { ${style.card}; }`,
        `  .op-title { ${style.title}; }`,
        `  .op-text { ${style.text}; }`,
        `  .op-button { ${style.button}; }`,
        `</style>`,
      );
    }
    if (fw === "Angular") {
      return lines(
        `import { Component } from "@angular/core";`,
        ``,
        `@Component({`,
        `  selector: "app-example",`,
        `  standalone: true,`,
        `  template: \``,
        `    <section class="op-card">`,
        `      <h2 class="op-title">${t}</h2>`,
        `      <p class="op-text">${b}</p>`,
        `      <button class="op-button" type="button">Primary action</button>`,
        `    </section>`,
        `  \`,`,
        `  styles: \``,
        `    .op-card { ${style.card}; }`,
        `    .op-title { ${style.title}; }`,
        `    .op-text { ${style.text}; }`,
        `    .op-button { ${style.button}; }`,
        `  \`,`,
        `})`,
        `export class ExampleComponent {}`,
      );
    }
    if (fw === "Solid") {
      // Same inline styles, typed by Solid and keyed the way Solid's
      // `CSSProperties` is: kebab-case property names.
      return lines(
        `import type { JSX } from "solid-js";`,
        ``,
        `const card: JSX.CSSProperties = { ${decl(style.card, false)} };`,
        `const title: JSX.CSSProperties = { ${decl(style.title, false)} };`,
        `const text: JSX.CSSProperties = { ${decl(style.text, false)} };`,
        `const button: JSX.CSSProperties = { ${decl(style.button, false)} };`,
        ``,
        `export function Example() {`,
        `  return (`,
        `    <section style={card}>`,
        `      <h2 style={title}>Themvora + Open Props</h2>`,
        `      <p style={text}>`,
        `        Open Props ships design tokens, not components — this is ordinary markup.`,
        `      </p>`,
        `      <button type="button" style={button}>`,
        `        Primary action`,
        `      </button>`,
        `    </section>`,
        `  );`,
        `}`,
      );
    }
    return lines(
      `import type { CSSProperties } from "react";`,
      ``,
      `// Open Props is a token set, so the styling is a stylesheet — inline here`,
      `// only to keep the example to one file.`,
      `const card: CSSProperties = { ${decl(style.card)} };`,
      `const title: CSSProperties = { ${decl(style.title)} };`,
      `const text: CSSProperties = { ${decl(style.text)} };`,
      `const button: CSSProperties = { ${decl(style.button)} };`,
      ``,
      `export function Example() {`,
      `  return (`,
      `    <section style={card}>`,
      `      <h2 style={title}>${t}</h2>`,
      `      <p style={text}>${b}</p>`,
      `      <button type="button" style={button}>`,
      `        Primary action`,
      `      </button>`,
      `    </section>`,
      `  );`,
      `}`,
    );
  },
};

/* ==========================================================================
   Theme controls per library × framework.
   ========================================================================== */

const CONTROLS = {
  bootstrap: {
    jsx: (p) => lines(
      `import { useTheme } from "${p}";`,
      ``,
      `export function ThemeControls() {`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      ``,
      `  return (`,
      `    <div className="d-flex gap-2 align-items-center">`,
      `      <span className="text-body-secondary small">Mode: {mode}</span>`,
      `      <button type="button" className="btn btn-primary" onClick={toggleTheme}>`,
      `        Toggle`,
      `      </button>`,
      `      <button type="button" className="btn btn-outline-secondary" onClick={() => setMode("light")}>`,
      `        Light`,
      `      </button>`,
      `      <button type="button" className="btn btn-outline-secondary" onClick={() => setMode("dark")}>`,
      `        Dark`,
      `      </button>`,
      `    </div>`,
      `  );`,
      `}`,
    ),
    vue: () => lines(
      `<script setup lang="ts">`,
      `import { useTheme } from "@themvora/vue";`,
      `const { mode, setMode, toggleTheme } = useTheme();`,
      `</script>`,
      ``,
      `<template>`,
      `  <div class="d-flex gap-2 align-items-center">`,
      `    <span class="text-body-secondary small">Mode: {{ mode }}</span>`,
      `    <button type="button" class="btn btn-primary" @click="toggleTheme">Toggle</button>`,
      `    <button type="button" class="btn btn-outline-secondary" @click="setMode('light')">Light</button>`,
      `    <button type="button" class="btn btn-outline-secondary" @click="setMode('dark')">Dark</button>`,
      `  </div>`,
      `</template>`,
    ),
    svelte: () => lines(
      `<script lang="ts">`,
      `  import { useTheme } from "@themvora/svelte";`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      `</script>`,
      ``,
      `<div class="d-flex gap-2 align-items-center">`,
      `  <span class="text-body-secondary small">Mode: {$mode}</span>`,
      `  <button type="button" class="btn btn-primary" onclick={toggleTheme}>Toggle</button>`,
      `  <button type="button" class="btn btn-outline-secondary" onclick={() => setMode("light")}>Light</button>`,
      `  <button type="button" class="btn btn-outline-secondary" onclick={() => setMode("dark")}>Dark</button>`,
      `</div>`,
    ),
    solid: () => lines(
      `import { useTheme } from "@themvora/solid";`,
      ``,
      `export function ThemeControls() {`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      ``,
      `  return (`,
      `    <div class="d-flex gap-2 align-items-center">`,
      `      <span class="text-body-secondary small">Mode: {mode()}</span>`,
      `      <button type="button" class="btn btn-primary" onClick={() => toggleTheme()}>Toggle</button>`,
      `      <button type="button" class="btn btn-outline-secondary" onClick={() => setMode("light")}>Light</button>`,
      `      <button type="button" class="btn btn-outline-secondary" onClick={() => setMode("dark")}>Dark</button>`,
      `    </div>`,
      `  );`,
      `}`,
    ),
    angular: () => lines(
      `import { Component } from "@angular/core";`,
      `import { injectTheme } from "@themvora/angular";`,
      ``,
      `@Component({`,
      `  selector: "app-theme-controls",`,
      `  standalone: true,`,
      `  // injectTheme returns a signal, so it is read as state().`,
      `  template: \``,
      `    <div class="d-flex gap-2 align-items-center">`,
      `      <span class="text-body-secondary small">Mode: {{ state().mode }}</span>`,
      `      <button type="button" class="btn btn-primary" (click)="state().toggleTheme()">Toggle</button>`,
      `      <button type="button" class="btn btn-outline-secondary" (click)="state().setMode('light')">Light</button>`,
      `      <button type="button" class="btn btn-outline-secondary" (click)="state().setMode('dark')">Dark</button>`,
      `    </div>`,
      `  \`,`,
      `})`,
      `export class ThemeControlsComponent {`,
      `  state = injectTheme();`,
      `}`,
    ),
    astro: (p) => lines(
      `import { useTheme } from "${p}";`,
      ``,
      `export function ThemeControls() {`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      ``,
      `  return (`,
      `    <div className="d-flex gap-2 align-items-center">`,
      `      <span className="text-body-secondary small">Mode: {mode}</span>`,
      `      <button type="button" className="btn btn-primary" onClick={toggleTheme}>`,
      `        Toggle`,
      `      </button>`,
      `      <button type="button" className="btn btn-outline-secondary" onClick={() => setMode("light")}>`,
      `        Light`,
      `      </button>`,
      `      <button type="button" className="btn btn-outline-secondary" onClick={() => setMode("dark")}>`,
      `        Dark`,
      `      </button>`,
      `    </div>`,
      `  );`,
      `}`,
    ),
  },

  daisyui: {
    jsx: (p) => lines(
      `import { useTheme } from "${p}";`,
      ``,
      `export function ThemeControls() {`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      ``,
      `  return (`,
      `    <div className="flex items-center gap-2">`,
      `      <span className="text-sm text-base-content/70">Mode: {mode}</span>`,
      `      <button className="btn btn-primary btn-sm" onClick={toggleTheme}>Toggle</button>`,
      `      <button className="btn btn-ghost btn-sm" onClick={() => setMode("light")}>Light</button>`,
      `      <button className="btn btn-ghost btn-sm" onClick={() => setMode("dark")}>Dark</button>`,
      `    </div>`,
      `  );`,
      `}`,
    ),
    vue: () => lines(
      `<script setup lang="ts">`,
      `import { useTheme } from "@themvora/vue";`,
      `const { mode, setMode, toggleTheme } = useTheme();`,
      `</script>`,
      ``,
      `<template>`,
      `  <div class="flex items-center gap-2">`,
      `    <span class="text-sm text-base-content/70">Mode: {{ mode }}</span>`,
      `    <button class="btn btn-primary btn-sm" @click="toggleTheme">Toggle</button>`,
      `    <button class="btn btn-ghost btn-sm" @click="setMode('light')">Light</button>`,
      `    <button class="btn btn-ghost btn-sm" @click="setMode('dark')">Dark</button>`,
      `  </div>`,
      `</template>`,
    ),
    svelte: () => lines(
      `<script lang="ts">`,
      `  import { useTheme } from "@themvora/svelte";`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      `</script>`,
      ``,
      `<div class="flex items-center gap-2">`,
      `  <span class="text-sm text-base-content/70">Mode: {$mode}</span>`,
      `  <button class="btn btn-primary btn-sm" onclick={toggleTheme}>Toggle</button>`,
      `  <button class="btn btn-ghost btn-sm" onclick={() => setMode("light")}>Light</button>`,
      `  <button class="btn btn-ghost btn-sm" onclick={() => setMode("dark")}>Dark</button>`,
      `</div>`,
    ),
    solid: () => lines(
      `import { useTheme } from "@themvora/solid";`,
      ``,
      `export function ThemeControls() {`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      ``,
      `  return (`,
      `    <div class="flex items-center gap-2">`,
      `      <span class="text-sm text-base-content/70">Mode: {mode()}</span>`,
      `      <button class="btn btn-primary btn-sm" onClick={() => toggleTheme()}>Toggle</button>`,
      `      <button class="btn btn-ghost btn-sm" onClick={() => setMode("light")}>Light</button>`,
      `      <button class="btn btn-ghost btn-sm" onClick={() => setMode("dark")}>Dark</button>`,
      `    </div>`,
      `  );`,
      `}`,
    ),
    angular: () => lines(
      `import { Component } from "@angular/core";`,
      `import { injectTheme } from "@themvora/angular";`,
      ``,
      `@Component({`,
      `  selector: "app-theme-controls",`,
      `  standalone: true,`,
      `  template: \``,
      `    <div class="flex items-center gap-2">`,
      `      <span class="text-sm text-base-content/70">Mode: {{ state().mode }}</span>`,
      `      <button class="btn btn-primary btn-sm" (click)="state().toggleTheme()">Toggle</button>`,
      `      <button class="btn btn-ghost btn-sm" (click)="state().setMode('light')">Light</button>`,
      `      <button class="btn btn-ghost btn-sm" (click)="state().setMode('dark')">Dark</button>`,
      `    </div>`,
      `  \`,`,
      `})`,
      `export class ThemeControlsComponent {`,
      `  state = injectTheme();`,
      `}`,
    ),
    astro: (p) => lines(
      `import { useTheme } from "${p}";`,
      ``,
      `export function ThemeControls() {`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      ``,
      `  return (`,
      `    <div className="flex items-center gap-2">`,
      `      <span className="text-sm text-base-content/70">Mode: {mode}</span>`,
      `      <button className="btn btn-primary btn-sm" onClick={toggleTheme}>Toggle</button>`,
      `      <button className="btn btn-ghost btn-sm" onClick={() => setMode("light")}>Light</button>`,
      `      <button className="btn btn-ghost btn-sm" onClick={() => setMode("dark")}>Dark</button>`,
      `    </div>`,
      `  );`,
      `}`,
    ),
  },

  "open-props": {
    jsx: (p) => lines(
      `import { useTheme } from "${p}";`,
      ``,
      `const bar: React.CSSProperties = {`,
      `  display: "flex",`,
      `  alignItems: "center",`,
      `  gap: "var(--size-2)",`,
      `  fontSize: "var(--font-size-0)",`,
      `};`,
      ``,
      `export function ThemeControls() {`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      ``,
      `  return (`,
      `    <div style={bar}>`,
      `      <span style={{ color: "var(--color-muted-foreground)" }}>Mode: {mode}</span>`,
      `      <button type="button" className="op-button" onClick={toggleTheme}>Toggle</button>`,
      `      <button type="button" className="op-button op-button-quiet" onClick={() => setMode("light")}>Light</button>`,
      `      <button type="button" className="op-button op-button-quiet" onClick={() => setMode("dark")}>Dark</button>`,
      `    </div>`,
      `  );`,
      `}`,
    ),
    vue: () => lines(
      `<script setup lang="ts">`,
      `import { useTheme } from "@themvora/vue";`,
      `const { mode, setMode, toggleTheme } = useTheme();`,
      `</script>`,
      ``,
      `<template>`,
      `  <div class="op-bar">`,
      `    <span class="op-muted">Mode: {{ mode }}</span>`,
      `    <button type="button" class="op-button" @click="toggleTheme">Toggle</button>`,
      `    <button type="button" class="op-button op-button-quiet" @click="setMode('light')">Light</button>`,
      `    <button type="button" class="op-button op-button-quiet" @click="setMode('dark')">Dark</button>`,
      `  </div>`,
      `</template>`,
      ``,
      `<style scoped>`,
      `.op-bar { display: flex; align-items: center; gap: var(--size-2); font-size: var(--font-size-0); }`,
      `.op-muted { color: var(--color-muted-foreground); }`,
      `.op-button { background: var(--color-primary); color: var(--color-primary-foreground); border: 0; border-radius: var(--radius-2); padding: var(--size-2) var(--size-3); font: inherit; cursor: pointer; }`,
      `.op-button-quiet { background: transparent; color: var(--color-text); border: 1px solid var(--color-border); }`,
      `</style>`,
    ),
    svelte: () => lines(
      `<script lang="ts">`,
      `  import { useTheme } from "@themvora/svelte";`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      `</script>`,
      ``,
      `<div class="op-bar">`,
      `  <span class="op-muted">Mode: {$mode}</span>`,
      `  <button type="button" class="op-button" onclick={toggleTheme}>Toggle</button>`,
      `  <button type="button" class="op-button op-button-quiet" onclick={() => setMode("light")}>Light</button>`,
      `  <button type="button" class="op-button op-button-quiet" onclick={() => setMode("dark")}>Dark</button>`,
      `</div>`,
      ``,
      `<style>`,
      `  .op-bar { display: flex; align-items: center; gap: var(--size-2); font-size: var(--font-size-0); }`,
      `  .op-muted { color: var(--color-muted-foreground); }`,
      `  .op-button { background: var(--color-primary); color: var(--color-primary-foreground); border: 0; border-radius: var(--radius-2); padding: var(--size-2) var(--size-3); font: inherit; cursor: pointer; }`,
      `  .op-button-quiet { background: transparent; color: var(--color-text); border: 1px solid var(--color-border); }`,
      `</style>`,
    ),
    solid: () => lines(
      `import { useTheme } from "@themvora/solid";`,
      ``,
      `export function ThemeControls() {`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      ``,
      `  return (`,
      `    <div class="op-bar">`,
      `      <span class="op-muted">Mode: {mode()}</span>`,
      `      <button type="button" class="op-button" onClick={() => toggleTheme()}>Toggle</button>`,
      `      <button type="button" class="op-button op-button-quiet" onClick={() => setMode("light")}>Light</button>`,
      `      <button type="button" class="op-button op-button-quiet" onClick={() => setMode("dark")}>Dark</button>`,
      `    </div>`,
      `  );`,
      `}`,
    ),
    angular: () => lines(
      `import { Component } from "@angular/core";`,
      `import { injectTheme } from "@themvora/angular";`,
      ``,
      `@Component({`,
      `  selector: "app-theme-controls",`,
      `  standalone: true,`,
      `  template: \``,
      `    <div class="op-bar">`,
      `      <span class="op-muted">Mode: {{ state().mode }}</span>`,
      `      <button type="button" class="op-button" (click)="state().toggleTheme()">Toggle</button>`,
      `      <button type="button" class="op-button op-button-quiet" (click)="state().setMode('light')">Light</button>`,
      `      <button type="button" class="op-button op-button-quiet" (click)="state().setMode('dark')">Dark</button>`,
      `    </div>`,
      `  \`,`,
      `  styles: \``,
      `    .op-bar { display: flex; align-items: center; gap: var(--size-2); font-size: var(--font-size-0); }`,
      `    .op-muted { color: var(--color-muted-foreground); }`,
      `    .op-button { background: var(--color-primary); color: var(--color-primary-foreground); border: 0; border-radius: var(--radius-2); padding: var(--size-2) var(--size-3); font: inherit; cursor: pointer; }`,
      `    .op-button-quiet { background: transparent; color: var(--color-text); border: 1px solid var(--color-border); }`,
      `  \`,`,
      `})`,
      `export class ThemeControlsComponent {`,
      `  state = injectTheme();`,
      `}`,
    ),
    astro: (p) => lines(
      `import { useTheme } from "${p}";`,
      ``,
      `export function ThemeControls() {`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      ``,
      `  return (`,
      `    <div className="op-bar">`,
      `      <span className="op-muted">Mode: {mode}</span>`,
      `      <button type="button" className="op-button" onClick={toggleTheme}>Toggle</button>`,
      `      <button type="button" className="op-button op-button-quiet" onClick={() => setMode("light")}>Light</button>`,
      `      <button type="button" className="op-button op-button-quiet" onClick={() => setMode("dark")}>Dark</button>`,
      `    </div>`,
      `  );`,
      `}`,
    ),
  },
};

/* ==========================================================================
   Assembly.
   ========================================================================== */

/**
 * The entry file for a library recipe.
 *
 * The adapter's own stylesheet is **not** imported here: it belongs in the
 * global stylesheet, after the library's CSS, so the adapter's variables win.
 * `setup` writes that file.
 */
function cssEntry(fw, extraImports = []) {
  // `@themvora/next` owns the whole document shell and resolves the initial
  // mode itself from cookies/scheduling; its `ThemeProviderProps` has no
  // `initialMode`. Every other binding does accept it.
  const providerProps =
    fw === "Next.js"
      ? `defaultTheme="plum-light"`
      : `defaultTheme="plum-light" initialMode="system"`;
  return entryFile(fw, { providerProps, extraImports });
}

/**
 * The global stylesheet chunk: the library's CSS, then the adapter's map.
 *
 * Order is the whole point. The library declares its own palette; the adapter
 * re-points the same variables at `--theme-*`. Loading them the other way round
 * leaves the library's hardcoded defaults in force and the page looks themed
 * until the first theme switch — which is exactly the bug this ordering
 * prevents.
 */
function styleChunk(fw, imports = [], tail = []) {
  const path = STYLE_ENTRY[fw];
  return cssLines(
    `// ---- ${path}`,
    ...imports.map((i) => `@import "${i}";`),
    ...tail,
    ...(imports.length || tail.length ? [""] : []),
    DOCUMENT_RULE,
  );
}

/** The composition file — the last thing the reader writes. */
function appFile(fw) {
  const p = FRAMEWORKS[fw];
  switch (fw) {
    case "React":
    case "Solid":
      return lines(
        `import { ThemeZone } from "${p.zoneImport}";`,
        `import { Example } from "${p.exampleImport}";`,
        `import { ThemeControls } from "${p.controlsImport}";`,
        ``,
        `export function App() {`,
        `  return (`,
        `    <ThemeZone>`,
        `      <Example />`,
        `      <ThemeControls />`,
        `    </ThemeZone>`,
        `  );`,
        `}`,
      );
    // Next.js App Router and Remix routes are module contracts, not plain
    // components: the route file must **default-export** the page and must not
    // export anything else (Next's generated `.next/types` check rejects extra
    // named exports). A named `App` export typechecks but fails `next build`
    // and renders an empty Remix route.
    case "Next.js":
    case "Remix":
      return lines(
        `import { ThemeZone } from "${p.zoneImport}";`,
        `import { Example } from "${p.exampleImport}";`,
        `import { ThemeControls } from "${p.controlsImport}";`,
        ``,
        `export default function Page() {`,
        `  return (`,
        `    <ThemeZone>`,
        `      <Example />`,
        `      <ThemeControls />`,
        `    </ThemeZone>`,
        `  );`,
        `}`,
      );
    case "Astro":
      // The island already renders Example and ThemeControls; the page only has
      // to use the layout, which is where the runtime and the stylesheets live.
      return lines(
        `---`,
        `import BaseLayout from "../layouts/BaseLayout.astro";`,
        `---`,
        ``,
        `<BaseLayout>`,
        `  <h1>Themvora</h1>`,
        `  <p>Every colour on this page comes from the active theme.</p>`,
        `</BaseLayout>`,
      );
    case "Vue 3":
    case "Nuxt":
      return lines(
        `<script setup lang="ts">`,
        `import ThemeZone from "${p.zoneImport}";`,
        `import Example from "${p.exampleImport}";`,
        `import ThemeControls from "${p.controlsImport}";`,
        `</script>`,
        ``,
        `<template>`,
        `  <ThemeZone>`,
        `    <Example />`,
        `    <ThemeControls />`,
        `  </ThemeZone>`,
        `</template>`,
      );
    case "Svelte":
      return lines(
        `<script lang="ts">`,
        `  import ThemeRoot from "./lib/ThemeRoot.svelte";`,
        `  import ThemeZone from "${p.zoneImport}";`,
        `  import Example from "${p.exampleImport}";`,
        `  import ThemeControls from "${p.controlsImport}";`,
        `</script>`,
        ``,
        `<ThemeRoot>`,
        `  <ThemeZone>`,
        `    <Example />`,
        `    <ThemeControls />`,
        `  </ThemeZone>`,
        `</ThemeRoot>`,
      );
    case "Angular":
      return lines(
        `import { Component } from "@angular/core";`,
        `import { ThemeZoneComponent } from "${p.zoneImport}";`,
        `import { ExampleComponent } from "${p.exampleImport}";`,
        `import { ThemeControlsComponent } from "${p.controlsImport}";`,
        ``,
        `@Component({`,
        `  selector: "app-root",`,
        `  standalone: true,`,
        `  imports: [ThemeZoneComponent, ExampleComponent, ThemeControlsComponent],`,
        `  template: \``,
        `    <app-theme-zone>`,
        `      <app-example />`,
        `      <app-theme-controls />`,
        `    </app-theme-zone>`,
        `  \`,`,
        `})`,
        `export class AppComponent {}`,
      );
    default:
      throw new Error(`no app template for ${fw}`);
  }
}



/* ==========================================================================
   Emit.
   ========================================================================== */

const recipes = {};

/* --- shadcn/ui ------------------------------------------------------------ */

{
  const slug = "shadcn";

  const cli = (fw) => {
    switch (fw) {
      case "Vue 3":
        return ["pnpm dlx shadcn-vue@latest init", "pnpm dlx shadcn-vue@latest add button card"];
      case "Svelte":
        return ["pnpm dlx shadcn-svelte@latest init", "pnpm dlx shadcn-svelte@latest add button card"];
      default:
        return ["pnpm dlx shadcn@latest init", "pnpm dlx shadcn@latest add button card"];
    }
  };

  /** Tailwind is a prerequisite, and its build integration is not universal. */
  const tailwind = (fw) => {
    if (fw === "Next.js") return ["pnpm add -D tailwindcss @tailwindcss/postcss"];
    if (fw === "Angular") return ["pnpm add -D tailwindcss @tailwindcss/postcss"];
    return ["pnpm add -D tailwindcss @tailwindcss/vite"];
  };

  const setup = (fw) => {
    const css = cssLines(
      `@import "tailwindcss";`,
      `@import "@themvora/shadcn/shadcn.css";`,
      `@import "@themvora/tailwind";`,
      ``,
      DOCUMENT_RULE,
    );

    const alias = lines(
      `{`,
      `  "compilerOptions": {`,
      `    "baseUrl": ".",`,
      `    "paths": { "@/*": ["./src/*"] }`,
      `  }`,
      `}`,
    );

    if (fw === "Next.js") {
      // `shadcn init` validates the `@/*` alias in `tsconfig.json` before it
      // will generate anything, and Next resolves that alias natively. Without
      // this block the CLI stops at "Could not find valid path aliases".
      return lines(
        `// ---- postcss.config.mjs`,
        `export default { plugins: { "@tailwindcss/postcss": {} } };`,
        `// ---- tsconfig.json`,
        `{`,
        `  "compilerOptions": {`,
        `    "baseUrl": ".",`,
        `    "paths": { "@/*": ["./*"] }`,
        `  }`,
        `}`,
        file(STYLE_ENTRY["Next.js"]),
        css,
      );
    }
    if (fw === "Vue 3" || fw === "Svelte") {
      // shadcn-svelte writes imports as `$lib/components/ui/…`, and refuses to
      // run at all when that alias is missing from `tsconfig.json`. A SvelteKit
      // project has it out of the box; a Vite + Svelte one does not, so the
      // guide has to add it.
      const aliasBlock =
        fw === "Svelte"
          ? lines(
              `{`,
              `  "compilerOptions": {`,
              `    "baseUrl": ".",`,
              `    "paths": {`,
              `      "$lib": ["./src/lib"],`,
              `      "$lib/*": ["./src/lib/*"]`,
              `    }`,
              `  }`,
              `}`,
            )
          : alias;
      const resolve =
        fw === "Svelte"
          ? `  resolve: { alias: { $lib: path.resolve(__dirname, "./src/lib") } },`
          : `  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },`;

      return lines(
        `// ---- vite.config.ts`,
        `import { defineConfig } from "vite";`,
        VITE_PLUGIN[fw].imp,
        `import tailwindcss from "@tailwindcss/vite";`,
        `import path from "node:path";`,
        ``,
        `export default defineConfig({`,
        `  plugins: [${VITE_PLUGIN[fw].use}, tailwindcss()],`,
        resolve,
        `});`,
        `// ---- tsconfig.json`,
        aliasBlock,
        file(STYLE_ENTRY[fw]),
        css,
      );
    }
    if (fw === "Astro") {
      // `shadcn init` refuses to run without a path alias in `tsconfig.json`,
      // and the generated `@/components/ui/*` imports also have to resolve in
      // Vite. Both are required, and Astro's ESM config has no `__dirname`.
      return lines(
        `// ---- astro.config.mjs`,
        `import { defineConfig } from "astro/config";`,
        `import { fileURLToPath } from "node:url";`,
        `import react from "@astrojs/react";`,
        `import tailwindcss from "@tailwindcss/vite";`,
        ``,
        `export default defineConfig({`,
        `  integrations: [react()],`,
        `  vite: {`,
        `    plugins: [tailwindcss()],`,
        `    resolve: {`,
        `      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },`,
        `    },`,
        `  },`,
        `});`,
        `// ---- tsconfig.json`,
        `{`,
        `  "extends": "astro/tsconfigs/strict",`,
        `  "compilerOptions": {`,
        `    "baseUrl": ".",`,
        `    "paths": { "@/*": ["./src/*"] }`,
        `  }`,
        `}`,
        file(STYLE_ENTRY.Astro),
        css,
      );
    }
    // React and Remix: Vite.
    return lines(
      `// ---- vite.config.ts`,
      `import { defineConfig } from "vite";`,
      VITE_PLUGIN[fw].imp,
      `import tailwindcss from "@tailwindcss/vite";`,
      `import path from "node:path";`,
      ``,
      `export default defineConfig({`,
      `  plugins: [${VITE_PLUGIN[fw].use}, tailwindcss()],`,
      `  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },`,
      `});`,
      `// ---- tsconfig.json`,
      alias,
      file(STYLE_ENTRY[fw]),
      css,
    );
  };

  const components = (fw) => {
    switch (fw) {
      case "Vue 3":
        return lines(
          `<script setup lang="ts">`,
          `import { Button } from "@/components/ui/button";`,
          `import {`,
          `  Card,`,
          `  CardContent,`,
          `  CardDescription,`,
          `  CardHeader,`,
          `  CardTitle,`,
          `} from "@/components/ui/card";`,
          `</script>`,
          ``,
          `<template>`,
          `  <Card>`,
          `    <CardHeader>`,
          `      <CardTitle>Themvora + shadcn/ui</CardTitle>`,
          `      <CardDescription>`,
          `        These are the components the CLI generated into your project.`,
          `      </CardDescription>`,
          `    </CardHeader>`,
          `    <CardContent>`,
          `      <Button>Primary action</Button>`,
          `    </CardContent>`,
          `  </Card>`,
          `</template>`,
        );
      case "Svelte":
        return lines(
          `<script lang="ts">`,
          `  import * as Card from "$lib/components/ui/card/index.js";`,
          `  import { Button } from "$lib/components/ui/button/index.js";`,
          `</script>`,
          ``,
          `<Card.Root>`,
          `  <Card.Header>`,
          `    <Card.Title>Themvora + shadcn/ui</Card.Title>`,
          `    <Card.Description>`,
          `      These are the components the CLI generated into your project.`,
          `    </Card.Description>`,
          `  </Card.Header>`,
          `  <Card.Content>`,
          `    <Button>Primary action</Button>`,
          `  </Card.Content>`,
          `</Card.Root>`,
        );
      default:
        return lines(
          `import { Button } from "@/components/ui/button";`,
          `import {`,
          `  Card,`,
          `  CardContent,`,
          `  CardDescription,`,
          `  CardHeader,`,
          `  CardTitle,`,
          `} from "@/components/ui/card";`,
          ``,
          `export function Example() {`,
          `  return (`,
          `    <Card>`,
          `      <CardHeader>`,
          `        <CardTitle>Themvora + shadcn/ui</CardTitle>`,
          `        <CardDescription>`,
          `          These are the components the CLI generated into your project.`,
          `        </CardDescription>`,
          `      </CardHeader>`,
          `      <CardContent>`,
          `        <Button>Primary action</Button>`,
          `      </CardContent>`,
          `    </Card>`,
          `  );`,
          `}`,
        );
    }
  };

  const controls = (fw) => {
    switch (fw) {
      case "Vue 3":
        return lines(
          `<script setup lang="ts">`,
          `import { useTheme } from "@themvora/vue";`,
          `import { Button } from "@/components/ui/button";`,
          ``,
          `const { mode, setMode, toggleTheme } = useTheme();`,
          `</script>`,
          ``,
          `<template>`,
          `  <div class="flex items-center gap-2">`,
          `    <span class="text-sm text-muted-foreground">Mode: {{ mode }}</span>`,
          `    <Button @click="toggleTheme">Toggle</Button>`,
          `    <Button variant="outline" @click="setMode('light')">Light</Button>`,
          `    <Button variant="outline" @click="setMode('dark')">Dark</Button>`,
          `  </div>`,
          `</template>`,
        );
      case "Svelte":
        return lines(
          `<script lang="ts">`,
          `  import { useTheme } from "@themvora/svelte";`,
          `  import { Button } from "$lib/components/ui/button/index.js";`,
          ``,
          `  const { mode, setMode, toggleTheme } = useTheme();`,
          `</script>`,
          ``,
          `<div class="flex items-center gap-2">`,
          `  <span class="text-sm text-muted-foreground">Mode: {$mode}</span>`,
          `  <Button onclick={toggleTheme}>Toggle</Button>`,
          `  <Button variant="outline" onclick={() => setMode("light")}>Light</Button>`,
          `  <Button variant="outline" onclick={() => setMode("dark")}>Dark</Button>`,
          `</div>`,
        );
      default:
        return lines(
          `import { useTheme } from "${fw === "Astro" ? "@themvora/astro/client" : fw === "Next.js" ? "@themvora/next/client" : fw === "Remix" ? "@themvora/remix" : "@themvora/react"}";`,
          `import { Button } from "@/components/ui/button";`,
          ``,
          `export function ThemeControls() {`,
          `  const { mode, setMode, toggleTheme } = useTheme();`,
          ``,
          `  return (`,
          `    <div className="flex items-center gap-2">`,
          `      <span className="text-sm text-muted-foreground">Mode: {mode}</span>`,
          `      <Button onClick={toggleTheme}>Toggle</Button>`,
          `      <Button variant="outline" onClick={() => setMode("light")}>`,
          `        Light`,
          `      </Button>`,
          `      <Button variant="outline" onClick={() => setMode("dark")}>`,
          `        Dark`,
          `      </Button>`,
          `    </div>`,
          `  );`,
          `}`,
        );
    }
  };

  const wiring = {
    React: () => lines(
      `import type { ReactNode } from "react";`,
      `import { useThemeRuntime } from "@themvora/react";`,
      `import { useShadcnTheme } from "@themvora/shadcn/react";`,
      ``,
      `// Registers the adapter on the runtime from the provider above.`,
      `export function ThemeZone({ children }: { children: ReactNode }) {`,
      `  useShadcnTheme(useThemeRuntime());`,
      `  return <>{children}</>;`,
      `}`,
    ),
    "Next.js": () => lines(
      `"use client";`,
      ``,
      `import type { ReactNode } from "react";`,
      `import { useThemeRuntime } from "@themvora/next/client";`,
      `import { useShadcnTheme } from "@themvora/shadcn/react";`,
      ``,
      `export function ThemeZone({ children }: { children: ReactNode }) {`,
      `  useShadcnTheme(useThemeRuntime());`,
      `  return <>{children}</>;`,
      `}`,
    ),
    Remix: () => lines(
      `import type { ReactNode } from "react";`,
      `import { useThemeRuntime } from "@themvora/remix";`,
      `import { useShadcnTheme } from "@themvora/shadcn/react";`,
      ``,
      `export function ThemeZone({ children }: { children: ReactNode }) {`,
      `  useShadcnTheme(useThemeRuntime());`,
      `  return <>{children}</>;`,
      `}`,
    ),
    Astro: () => lines(
      `import { ThemeProviderClient, useThemeRuntime } from "@themvora/astro/client";`,
      `import { useShadcnTheme } from "@themvora/shadcn/react";`,
      `import { Example } from "./Example";`,
      `import { ThemeControls } from "./ThemeControls";`,
      ``,
      `function InstallAdapter() {`,
      `  useShadcnTheme(useThemeRuntime());`,
      `  return null;`,
      `}`,
      ``,
      `// Astro cannot pass React children to a client:only island — the children`,
      `// become static HTML. The island therefore renders the example and the`,
      `// controls itself, inside the same client tree as the runtime.`,
      `export default function ThemeIsland() {`,
      `  return (`,
      `    <>`,
      `      <ThemeProviderClient defaultTheme="plum-light" initialMode="system" />`,
      `      <InstallAdapter />`,
      `      <Example />`,
      `      <ThemeControls />`,
      `    </>`,
      `  );`,
      `}`,
    ),
    "Vue 3": () => lines(
      `<script setup lang="ts">`,
      `import { useThemeRuntime } from "@themvora/vue";`,
      `import { useShadcnTheme } from "@themvora/shadcn/vue";`,
      ``,
      `// Installs on mount, disposes on unmount.`,
      `useShadcnTheme(useThemeRuntime());`,
      `</script>`,
      ``,
      `<template>`,
      `  <slot />`,
      `</template>`,
    ),
    Svelte: () => lines(
      `<script lang="ts">`,
      `  import type { Snippet } from "svelte";`,
      `  import { getThemeRuntime } from "@themvora/svelte";`,
      `  import { useShadcnTheme } from "@themvora/shadcn/svelte";`,
      ``,
      `  let { children }: { children: Snippet } = $props();`,
      ``,
      `  // Runs during component initialisation, so the variables exist before paint.`,
      `  useShadcnTheme(getThemeRuntime());`,
      `</script>`,
      ``,
      `{@render children()}`,
    ),
  };

  for (const fw of shadcn.frameworks) {
    const p = FRAMEWORKS[fw];
    recipes[`${slug}/${fw}`] = {
      lang: p.lang,
      install: [...tailwind(fw), ...cli(fw)],
      // `@themvora/tailwind` is what turns shadcn's variables into Tailwind
      // utilities; without it the generated components compile to no classes.
      themvora: [
        `pnpm add @themvora/core ${runtimePkg(fw)} @themvora/shadcn @themvora/tailwind`,
      ],
      setup: setup(fw),
      mountProvider: cssEntry(fw),
      code: wiring[fw](),
      componentExample: components(fw),
      themeSwitchExample: controls(fw),
      completeExample: appFile(fw),
      prereqs: prereqsFor(fw, slug),
    };
  }
}

/* --- CSS-variable libraries ---------------------------------------------- */

for (const lib of [bootstrap, daisyui, openProps]) {
  for (const fw of Object.keys(FRAMEWORKS)) {
    const p = FRAMEWORKS[fw];
    const extra = EXTRA_THEMVORA[fw] ?? [];
    const themvora = [
      `pnpm add @themvora/core ${runtimePkg(fw)} @themvora/${lib.slug}${extra.length ? " " + extra.join(" ") : ""}`,
    ];

    recipes[`${lib.slug}/${fw}`] = {
      lang: p.lang,
      install: lib.install(fw),
      themvora,
      setup: lines(
        lib.setup?.(fw) ?? "",
        lib.styleImports ? styleChunk(fw, lib.styleImports) : "",
      ),
      mountProvider: cssEntry(fw),
      code: lib.wiring[fw](),
      componentExample: UI[lib.slug](fw),
      themeSwitchExample:
        fw === "Astro"
          ? CONTROLS[lib.slug].astro("@themvora/astro/client")
          : fw === "Next.js"
            ? CONTROLS[lib.slug].jsx("@themvora/next/client")
            : fw === "Remix"
              ? CONTROLS[lib.slug].jsx("@themvora/remix")
              : fw === "React"
                ? CONTROLS[lib.slug].jsx("@themvora/react")
                : fw === "Vue 3" || fw === "Nuxt"
                  ? CONTROLS[lib.slug].vue()
                  : fw === "Svelte"
                    ? CONTROLS[lib.slug].svelte()
                    : fw === "Solid"
                      ? CONTROLS[lib.slug].solid()
                      : CONTROLS[lib.slug].angular(),
      completeExample: appFile(fw),
      prereqs: prereqsFor(fw, lib.slug),
    };
  }
}

/* --- Provider libraries --------------------------------------------------- */

const PROVIDER_UI = {
  mui: {
    components: () => lines(
      `import { Button, Card, CardContent, Stack, Typography } from "@mui/material";`,
      ``,
      `export function Example() {`,
      `  return (`,
      `    <Card variant="outlined">`,
      `      <CardContent>`,
      `        <Stack spacing={1.5}>`,
      `          <Typography variant="h6">Themvora + Material UI</Typography>`,
      `          <Typography variant="body2" color="text.secondary">`,
      `            These are MUI's own components — the palette comes from the theme.`,
      `          </Typography>`,
      `          <Button variant="contained">Primary action</Button>`,
      `        </Stack>`,
      `      </CardContent>`,
      `    </Card>`,
      `  );`,
      `}`,
    ),
    controls: (runtime) => lines(
      `import { useTheme } from "${runtime}";`,
      `import { Button, Stack, Typography } from "@mui/material";`,
      ``,
      `export function ThemeControls() {`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      ``,
      `  return (`,
      `    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>`,
      `      <Typography variant="body2" color="text.secondary">`,
      `        Mode: {mode}`,
      `      </Typography>`,
      `      <Button variant="contained" onClick={toggleTheme}>Toggle</Button>`,
      `      <Button variant="outlined" onClick={() => setMode("light")}>Light</Button>`,
      `      <Button variant="outlined" onClick={() => setMode("dark")}>Dark</Button>`,
      `    </Stack>`,
      `  );`,
      `}`,
    ),
  },
  chakra: {
    components: () => lines(
      `import { Box, Button, Card, Heading, Stack, Text } from "@chakra-ui/react";`,
      ``,
      `export function Example() {`,
      `  return (`,
      `    <Card.Root variant="outline">`,
      `      <Card.Body>`,
      `        <Stack gap="3">`,
      `          <Heading size="md">Themvora + Chakra UI</Heading>`,
      `          <Text color="fg.muted">`,
      `            These are Chakra's own components — the system comes from the theme.`,
      `          </Text>`,
      `          <Box>`,
      `            <Button colorPalette="primary">Primary action</Button>`,
      `          </Box>`,
      `        </Stack>`,
      `      </Card.Body>`,
      `    </Card.Root>`,
      `  );`,
      `}`,
    ),
    controls: (runtime) => lines(
      `import { useTheme } from "${runtime}";`,
      `import { Button, HStack, Text } from "@chakra-ui/react";`,
      ``,
      `export function ThemeControls() {`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      ``,
      `  return (`,
      `    <HStack gap="2">`,
      `      <Text color="fg.muted" fontSize="sm">`,
      `        Mode: {mode}`,
      `      </Text>`,
      `      <Button colorPalette="primary" onClick={toggleTheme}>Toggle</Button>`,
      `      <Button variant="outline" onClick={() => setMode("light")}>Light</Button>`,
      `      <Button variant="outline" onClick={() => setMode("dark")}>Dark</Button>`,
      `    </HStack>`,
      `  );`,
      `}`,
    ),
  },
  antd: {
    components: () => lines(
      `import { Button, Card, Space, Typography } from "antd";`,
      ``,
      `export function Example() {`,
      `  return (`,
      `    <Card>`,
      `      <Space direction="vertical" size="middle">`,
      `        <Typography.Title level={5} style={{ margin: 0 }}>`,
      `          Themvora + Ant Design`,
      `        </Typography.Title>`,
      `        <Typography.Text type="secondary">`,
      `          These are Ant Design's own components — the tokens come from the theme.`,
      `        </Typography.Text>`,
      `        <Button type="primary">Primary action</Button>`,
      `      </Space>`,
      `    </Card>`,
      `  );`,
      `}`,
    ),
    controls: (runtime) => lines(
      `import { useTheme } from "${runtime}";`,
      `import { Button, Space, Typography } from "antd";`,
      ``,
      `export function ThemeControls() {`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      ``,
      `  return (`,
      `    <Space size="small" align="center">`,
      `      <Typography.Text type="secondary">Mode: {mode}</Typography.Text>`,
      `      <Button type="primary" onClick={toggleTheme}>Toggle</Button>`,
      `      <Button onClick={() => setMode("light")}>Light</Button>`,
      `      <Button onClick={() => setMode("dark")}>Dark</Button>`,
      `    </Space>`,
      `  );`,
      `}`,
    ),
  },
  mantine: {
    components: () => lines(
      `import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";`,
      ``,
      `export function Example() {`,
      `  return (`,
      `    <Card withBorder padding="lg" radius="md">`,
      `      <Stack gap="sm">`,
      `        <Title order={5}>Themvora + Mantine</Title>`,
      `        <Text c="dimmed" size="sm">`,
      `          These are Mantine's own components — the theme comes from Themvora.`,
      `        </Text>`,
      `        <Group>`,
      `          <Button>Primary action</Button>`,
      `        </Group>`,
      `      </Stack>`,
      `    </Card>`,
      `  );`,
      `}`,
    ),
    controls: (runtime) => lines(
      `import { useTheme } from "${runtime}";`,
      `import { Button, Group, Text } from "@mantine/core";`,
      ``,
      `export function ThemeControls() {`,
      `  const { mode, setMode, toggleTheme } = useTheme();`,
      ``,
      `  return (`,
      `    <Group gap="xs">`,
      `      <Text size="sm" c="dimmed">Mode: {mode}</Text>`,
      `      <Button onClick={toggleTheme}>Toggle</Button>`,
      `      <Button variant="light" onClick={() => setMode("light")}>Light</Button>`,
      `      <Button variant="light" onClick={() => setMode("dark")}>Dark</Button>`,
      `    </Group>`,
      `  );`,
      `}`,
    ),
  },
};

for (const lib of [mui, chakra, antd, mantine]) {
  for (const fw of ["React", "Next.js", "Remix", "Astro"]) {
    const p = FRAMEWORKS[fw];
    const runtime =
      fw === "React"
        ? "@themvora/react"
        : fw === "Next.js"
          ? "@themvora/next/client"
          : fw === "Remix"
            ? "@themvora/remix"
            : "@themvora/astro/client";

    // Next.js is the only framework here that streams SSR. An Emotion-based
    // library therefore contributes an extra file to the provider-mounting
    // snippet; the provider is library-specific and must not be swapped.
    recipes[`${lib.slug}/${fw}`] = {
      lang: p.lang,
      install: lib.install(fw),
      themvora: [
        `pnpm add @themvora/core ${runtimePkg(fw)} @themvora/${lib.slug}`,
      ],
      setup: styleChunk(fw, lib.styleImports),
      mountProvider:
        fw === "Next.js" && lib.next?.entry ? lib.next.entry() : cssEntry(fw),
      code: lib.wiring[fw](),
      componentExample: PROVIDER_UI[lib.slug].components(),
      themeSwitchExample: PROVIDER_UI[lib.slug].controls(runtime),
      completeExample: appFile(fw),
      prereqs: prereqsFor(fw, lib.slug),
    };
  }
}

/* --- UnoCSS --------------------------------------------------------------- */

{
  const unoConfig = lines(
    `// ---- uno.config.ts`,
    `import { defineConfig, presetWind3 } from "unocss";`,
    `import { presetThemvora } from "@themvora/unocss";`,
    ``,
    `export default defineConfig({`,
    `  presets: [presetWind3(), presetThemvora()],`,
    `});`,
  );

  const unoFramework = {
    React: {
      install: ["pnpm add -D unocss @unocss/vite"],
      setup: lines(
        unoConfig,
        `// ---- vite.config.ts`,
        `import { defineConfig } from "vite";`,
        `import react from "@vitejs/plugin-react";`,
        `import UnoCSS from "unocss/vite";`,
        ``,
        `export default defineConfig({ plugins: [react(), UnoCSS()] });`,
      ),
    },
    "Next.js": {
      install: ["pnpm add -D unocss @unocss/postcss"],
      setup: lines(
        unoConfig,
        `// ---- postcss.config.mjs`,
        `// The PostCSS plugin expands the @unocss at-rule in the global sheet.`,
        `export default { plugins: { "@unocss/postcss": {} } };`,
      ),
    },
    "Vue 3": {
      install: ["pnpm add -D unocss @unocss/vite"],
      setup: lines(
        unoConfig,
        `// ---- vite.config.ts`,
        `import { defineConfig } from "vite";`,
        `import vue from "@vitejs/plugin-vue";`,
        `import UnoCSS from "unocss/vite";`,
        ``,
        `export default defineConfig({ plugins: [vue(), UnoCSS()] });`,
      ),
    },
    Svelte: {
      install: ["pnpm add -D unocss @unocss/vite"],
      setup: lines(
        unoConfig,
        `// ---- vite.config.ts`,
        `import { defineConfig } from "vite";`,
        `import { svelte } from "@sveltejs/vite-plugin-svelte";`,
        `import UnoCSS from "unocss/vite";`,
        ``,
        `export default defineConfig({ plugins: [svelte(), UnoCSS()] });`,
      ),
    },
    Astro: {
      install: ["pnpm add -D unocss @unocss/astro"],
      setup: lines(
        unoConfig,
        `// ---- astro.config.mjs`,
        `import { defineConfig } from "astro/config";`,
        `import react from "@astrojs/react";`,
        `import UnoCSS from "unocss/astro";`,
        ``,
        `export default defineConfig({ integrations: [UnoCSS(), react()] });`,
      ),
    },
  };

  const unoComponents = (fw) => {
    switch (fw) {
      case "Vue 3":
        return lines(
          `<script setup lang="ts">`,
          `// Utility classes only — UnoCSS generates them from the preset.`,
          `</script>`,
          ``,
          `<template>`,
          `  <div class="bg-card text-card-foreground border border-border rounded-lg p-4 flex flex-col gap-3">`,
          `    <h2 class="text-lg font-semibold">Themvora + UnoCSS</h2>`,
          `    <p class="text-sm text-muted-foreground">`,
          `      Every utility resolves to a live --theme-* variable.`,
          `    </p>`,
          `    <button class="bg-primary text-primary-foreground rounded px-4 py-2 self-start">`,
          `      Primary action`,
          `    </button>`,
          `  </div>`,
          `</template>`,
        );
      case "Svelte":
        return lines(
          `<script lang="ts">`,
          `  // Markup only — but a Svelte component without a script block emits no`,
          `  // module declaration, so importing it fails \`svelte-check\` under strict.`,
          `</script>`,
          ``,
          `<div class="bg-card text-card-foreground border border-border rounded-lg p-4 flex flex-col gap-3">`,
          `  <h2 class="text-lg font-semibold">Themvora + UnoCSS</h2>`,
          `  <p class="text-sm text-muted-foreground">`,
          `    Every utility resolves to a live --theme-* variable.`,
          `  </p>`,
          `  <button class="bg-primary text-primary-foreground rounded px-4 py-2 self-start">`,
          `    Primary action`,
          `  </button>`,
          `</div>`,
        );
      // Astro's example is a React island (`Example.tsx`), so it falls through
      // to the React default below: `className`, not `class`.
      case "Solid":
        return solidMarkup(unoComponents("React"));
      default:
        return lines(
          `export function Example() {`,
          `  return (`,
          `    <div className="bg-card text-card-foreground border border-border rounded-lg p-4 flex flex-col gap-3">`,
          `      <h2 className="text-lg font-semibold">Themvora + UnoCSS</h2>`,
          `      <p className="text-sm text-muted-foreground">`,
          `        Every utility resolves to a live --theme-* variable.`,
          `      </p>`,
          `      <button className="bg-primary text-primary-foreground rounded px-4 py-2 self-start">`,
          `        Primary action`,
          `      </button>`,
          `    </div>`,
          `  );`,
          `}`,
        );
    }
  };

  const unoControls = (fw, runtime) => {
    switch (fw) {
      case "Vue 3":
        return lines(
          `<script setup lang="ts">`,
          `import { useTheme } from "@themvora/vue";`,
          `const { mode, setMode, toggleTheme } = useTheme();`,
          `</script>`,
          ``,
          `<template>`,
          `  <div class="flex items-center gap-2">`,
          `    <span class="text-sm text-muted-foreground">Mode: {{ mode }}</span>`,
          `    <button class="bg-primary text-primary-foreground rounded px-3 py-1.5" @click="toggleTheme">Toggle</button>`,
          `    <button class="border border-border rounded px-3 py-1.5" @click="setMode('light')">Light</button>`,
          `    <button class="border border-border rounded px-3 py-1.5" @click="setMode('dark')">Dark</button>`,
          `  </div>`,
          `</template>`,
        );
      case "Svelte":
        return lines(
          `<script lang="ts">`,
          `  import { useTheme } from "@themvora/svelte";`,
          `  const { mode, setMode, toggleTheme } = useTheme();`,
          `</script>`,
          ``,
          `<div class="flex items-center gap-2">`,
          `  <span class="text-sm text-muted-foreground">Mode: {$mode}</span>`,
          `  <button class="bg-primary text-primary-foreground rounded px-3 py-1.5" onclick={toggleTheme}>Toggle</button>`,
          `  <button class="border border-border rounded px-3 py-1.5" onclick={() => setMode("light")}>Light</button>`,
          `  <button class="border border-border rounded px-3 py-1.5" onclick={() => setMode("dark")}>Dark</button>`,
          `</div>`,
        );
      default:
        return lines(
          `import { useTheme } from "${runtime}";`,
          ``,
          `export function ThemeControls() {`,
          `  const { mode, setMode, toggleTheme } = useTheme();`,
          ``,
          `  return (`,
          `    <div className="flex items-center gap-2">`,
          `      <span className="text-sm text-muted-foreground">Mode: {mode}</span>`,
          `      <button className="bg-primary text-primary-foreground rounded px-3 py-1.5" onClick={toggleTheme}>`,
          `        Toggle`,
          `      </button>`,
          `      <button className="border border-border rounded px-3 py-1.5" onClick={() => setMode("light")}>`,
          `        Light`,
          `      </button>`,
          `      <button className="border border-border rounded px-3 py-1.5" onClick={() => setMode("dark")}>`,
          `        Dark`,
          `      </button>`,
          `    </div>`,
          `  );`,
          `}`,
        );
    }
  };

  const unoWiring = {
    React: () => lines(
      `import type { ReactNode } from "react";`,
      ``,
      `// UnoCSS needs no adapter: the preset emits utilities whose values are`,
      `// var(--theme-*), so the runtime's own writes are enough.`,
      `export function ThemeZone({ children }: { children: ReactNode }) {`,
      `  return <>{children}</>;`,
      `}`,
    ),
    "Next.js": () => lines(
      `"use client";`,
      ``,
      `import type { ReactNode } from "react";`,
      ``,
      `export function ThemeZone({ children }: { children: ReactNode }) {`,
      `  return <>{children}</>;`,
      `}`,
    ),
    "Vue 3": () => lines(
      `<script setup lang="ts">`,
      `// UnoCSS needs no adapter: the generated utilities reference var(--theme-*).`,
      `</script>`,
      ``,
      `<template>`,
      `  <slot />`,
      `</template>`,
    ),
    Svelte: () => lines(
      `<script lang="ts">`,
      `  import type { Snippet } from "svelte";`,
      `  let { children }: { children: Snippet } = $props();`,
      `</script>`,
      ``,
      `{@render children()}`,
    ),
    Astro: () => lines(
      `import { ThemeProviderClient } from "@themvora/astro/client";`,
      `import { Example } from "./Example";`,
      `import { ThemeControls } from "./ThemeControls";`,
      ``,
      `// No adapter to install — the preset's utilities already read the live`,
      `// variables, so the runtime alone is enough. The island renders the UI`,
      `// because Astro cannot pass React children to a client:only island.`,
      `export default function ThemeIsland() {`,
      `  return (`,
      `    <>`,
      `      <ThemeProviderClient defaultTheme="plum-light" initialMode="system" />`,
      `      <Example />`,
      `      <ThemeControls />`,
      `    </>`,
      `  );`,
      `}`,
    ),
  };

  for (const fw of ["React", "Next.js", "Vue 3", "Svelte", "Astro"]) {
    const p = FRAMEWORKS[fw];
    const spec = unoFramework[fw];
    const runtime =
      fw === "React"
        ? "@themvora/react"
        : fw === "Next.js"
          ? "@themvora/next/client"
          : fw === "Vue 3"
            ? "@themvora/vue"
            : fw === "Svelte"
              ? "@themvora/svelte"
              : "@themvora/astro/client";

    recipes[`unocss/${fw}`] = {
      lang: p.lang,
      install: spec.install,
      themvora: [
        `pnpm add @themvora/core ${runtimePkg(fw)} @themvora/unocss`,
      ],
      // Vite-based frameworks import the virtual module from their entry file.
      // Putting it in a *second* `src/main.tsx` snippet would be ambiguous —
      // the reader has one main.tsx, and the docs must show one complete file.
      // Next.js uses the PostCSS `@unocss all;` directive instead; the Astro
      // integration injects `uno.css` itself.
      setup: lines(
        spec.setup,
        styleChunk(fw, [], fw === "Next.js" ? ["@unocss all;"] : []),
      ),
      mountProvider: cssEntry(
        fw,
        fw === "Next.js" || fw === "Astro" ? [] : ["virtual:uno.css"],
      ),
      code: unoWiring[fw](),
      componentExample: unoComponents(fw),
      themeSwitchExample: unoControls(fw, runtime),
      completeExample: appFile(fw),
      prereqs: prereqsFor(fw, "unocss"),
    };
  }
}

/* ==========================================================================
   Write.
   ========================================================================== */

/**
 * Fields whose first line must name the file the reader is pasting into.
 *
 * The docs renderer lifts a leading path comment into the code block's toolbar
 * — but only when it is the **first** line, and only for comment syntaxes each
 * framework actually accepts. A `.vue`/`.svelte` file takes an HTML comment; an
 * `.astro` page starts with frontmatter, so it is left alone and the section
 * copy names it instead.
 */
const BANNERED = new Set(["code", "componentExample", "themeSwitchExample", "completeExample"]);

/** The file each bannered field belongs to, for a given framework. */
const BANNER_PATH = {
  code: "zone",
  componentExample: "example",
  themeSwitchExample: "controls",
  completeExample: "app",
};

function withBanner(fw, field, code) {
  const first = (code.split("\n")[0] ?? "").trim();
  // Already labelled, or frontmatter-first (an `.astro` page) — leave it.
  if (/^(?:\/\/|<!--)/.test(first)) return code;
  if (first === "---") return code;

  const path = FRAMEWORKS[fw][BANNER_PATH[field]];
  const comment = fw === "Vue 3" || fw === "Nuxt" || fw === "Svelte"
    ? `<!-- ${path} -->`
    : `// ${path}`;
  return `${comment}\n${code}`;
}

/**
 * Next.js App Router files that call hooks or render client-only UI libraries
 * need `"use client"` at the top. The layout stays a server component (it owns
 * the document shell) and `app/page.tsx` stays a server component that composes
 * client children — adding the directive to either would be wrong.
 *
 * Most zone files already declare it, so this is idempotent: it only inserts
 * the directive where it is absent.
 */
const NEXT_CLIENT_FIELDS = new Set(["code", "themeSwitchExample"]);
const NEXT_CLIENT_COMPONENT_LIBS = new Set(["mui", "chakra", "antd", "mantine"]);

function withClientBoundary(key, field, code) {
  const slash = key.indexOf("/");
  const lib = key.slice(0, slash);
  const fw = key.slice(slash + 1);
  if (fw !== "Next.js") return code;
  if (!NEXT_CLIENT_FIELDS.has(field) &&
      !(field === "componentExample" && NEXT_CLIENT_COMPONENT_LIBS.has(lib))) {
    return code;
  }
  const rows = code.split("\n");
  if (rows.slice(0, 4).some((line) => line.trim() === '"use client";')) return code;
  const at = /^(?:\/\/|<!--)/.test((rows[0] ?? "").trim()) ? 1 : 0;
  rows.splice(at, 0, `"use client";`, "");
  return rows.join("\n");
}

const out = [];
out.push(
  "export const FRAMEWORK_RECIPES: Record<string, Record<string, string | string[] | RecipePrerequisite[]>> = {",
);
for (const key of Object.keys(recipes).sort()) {
  const r = recipes[key];
  out.push(`  ${JSON.stringify(key)}: {`);
  for (const field of [
    "lang",
    "prereqs",
    "install",
    "themvora",
    "setup",
    "mountProvider",
    "code",
    "componentExample",
    "themeSwitchExample",
    "completeExample",
  ]) {
    let value = r[field];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && BANNERED.has(field)) {
      value = withBanner(key.slice(key.indexOf("/") + 1), field, value);
      value = withClientBoundary(key, field, value);
    }
    out.push(`    ${JSON.stringify(field)}: ${JSON.stringify(value)},`);
  }
  out.push("  },");
}
out.push("};");
out.push("");
out.push(
  "/** Syntax-highlighting language for a framework's snippets. */",
);

const generated = out.join("\n");

const source = readFileSync(TARGET, "utf8");
const startAt = source.indexOf(START);
const endAt = source.indexOf(END);
if (startAt < 0 || endAt < 0) throw new Error("recipe block markers not found in libraries.tsx");

const before = source.slice(0, startAt);
const after = source.slice(endAt);
const next = `${before}${generated}\n\n${after}`;

if (CHECK) {
  if (next !== source) {
    console.error("FRAMEWORK_RECIPES is out of date — run node scripts/docs/generate-library-recipes.mjs");
    process.exit(1);
  }
  console.log(`FRAMEWORK_RECIPES up to date (${Object.keys(recipes).length} recipes).`);
} else {
  writeFileSync(TARGET, next);
  console.log(`Wrote ${Object.keys(recipes).length} recipes to apps/docs/lib/libraries.tsx`);
}
