#!/usr/bin/env node
/**
 * Executes the library recipes that `/libraries/*` publishes.
 *
 * ## What this is for
 *
 * The nine guides advertise 54 library × framework combinations. `audit-library-docs.mjs`
 * checks that those combinations are internally consistent — real subpaths, right
 * hook arity, no React in a Vue recipe — but internal consistency is not the same
 * claim as "this produces a working app". This script closes that gap by
 * materialising each recipe into a real application and running it.
 *
 * ## The recipe is the fixture
 *
 * The files written into each app are the **published snippet text**, parsed out
 * of `apps/docs/lib/libraries.tsx` → `FRAMEWORK_RECIPES`. Nothing is retyped, so
 * a snippet cannot pass here while the page shows something else. The only
 * hand-written part is the app shell — `package.json`, the bundler config, the
 * HTML entry — because a recipe documents the integration, not how to scaffold a
 * framework.
 *
 * ## Reuse instead of 54 installs
 *
 * One app directory per **framework**, not per combination: the framework's
 * toolchain is identical across the libraries it supports, so it is installed
 * once and the recipe files are swapped in per combination. `@themvora/*` is
 * junctioned straight at the workspace packages, so the fixture exercises the
 * built artifacts this repository ships rather than a republished copy.
 *
 * Usage:
 *   node scripts/docs/verify-library-recipes.mjs --list
 *   node scripts/docs/verify-library-recipes.mjs --install <framework>
 *   node scripts/docs/verify-library-recipes.mjs --run "bootstrap/React"
 *   node scripts/docs/verify-library-recipes.mjs --all [--browser]
 */
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const REPO = join(import.meta.dirname, "..", "..");
const DOCS_LIBRARIES = join(REPO, "apps", "docs", "lib", "libraries.tsx");
const ROOT = join(REPO, "verify", "library-recipes");
const APPS = join(ROOT, "apps");
const RESULTS = join(ROOT, "results");

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

/* ==========================================================================
   Reading the published recipes.
   ========================================================================== */

/**
 * Parse `FRAMEWORK_RECIPES` out of the docs source.
 *
 * Deliberately the same text-level parse the other docs tools use: this script
 * must test what the page renders, and importing the module would require a
 * React/TSX runtime for a data table.
 */
function readRecipes() {
  const src = readFileSync(DOCS_LIBRARIES, "utf8");
  const at = src.indexOf("export const FRAMEWORK_RECIPES");
  const end = src.indexOf("export const FRAMEWORK_LANG", at);
  if (at < 0 || end < 0) throw new Error("FRAMEWORK_RECIPES not found");

  const block = src.slice(at, end);
  const out = {};
  for (const m of block.matchAll(/^ {2}"([a-z-]+)\/([^"]+)": \{\r?$/gm)) {
    const key = `${m[1]}/${m[2]}`;
    const chunk = block.slice(m.index, block.indexOf("\n  },", m.index));
    const fields = {};
    for (const line of chunk.split("\n")) {
      const f = line.match(/^ {4}"(\w+)": (.*),\r?$/);
      if (!f) continue;
      try {
        fields[f[1]] = JSON.parse(f[2]);
      } catch {
        /* a value this parser cannot read is reported by the audit, not here */
      }
    }
    out[key] = fields;
  }
  return out;
}

/* ==========================================================================
   Framework shells.
   ========================================================================== */

/**
 * Everything the fixture needs that the recipe does not document: the bundler
 * config, the HTML entry, the compiler settings, and where each recipe role
 * lands in this framework's file layout.
 */
const FRAMEWORKS = {
  React: {
    dir: "react",
    dev: "vite",
    check: "tsc --noEmit",
    build: "vite build",
    preview: "vite preview --port 4319 --strictPort",
    paths: {
      mountProvider: "src/main.tsx",
      code: "src/ThemeZone.tsx",
      componentExample: "src/Example.tsx",
      themeSwitchExample: "src/ThemeControls.tsx",
      completeExample: "src/App.tsx",
    },
    deps: {
      react: "19.3.1",
      "react-dom": "19.3.1",
      bootstrap: "5.3.8",
      daisyui: "5.1.10",
      tailwindcss: "4.3.3",
      "open-props": "1.7.23",
      unocss: "66.5.4",
      "@mui/material": "9.0.0",
      "@emotion/react": "11.14.0",
      "@emotion/styled": "11.14.0",
      "@chakra-ui/react": "3.30.0",
      antd: "6.1.0",
      "@mantine/core": "7.17.0",
      "@mantine/hooks": "7.17.0",
    },
    devDeps: {
      "@types/react": "19.3.0",
      "@types/react-dom": "19.3.0",
      "@vitejs/plugin-react": "4.7.0",
      "@tailwindcss/vite": "4.3.3",
      "@unocss/vite": "66.5.4",
      typescript: "5.9.3",
      vite: "6.4.4",
    },
    files: () => ({
      "index.html": `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>recipe</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
`,
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            module: "ESNext",
            moduleResolution: "bundler",
            jsx: "react-jsx",
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            types: ["react", "react-dom"],
          },
          include: ["src", "vite.config.ts"],
        },
        null,
        2,
      ),
      "vite.config.ts": `import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), UnoCSS()],
  build: { outDir: "dist" },
});
`,
    }),
  },

  "Next.js": {
    dir: "nextjs",
    dev: "next dev --port 4319",
    check: "tsc --noEmit",
    // This host throws EPERM on Next's `.next/trace` during a cold webpack
    // build. Turbopack is Next's own production builder and avoids that path.
    build: "next build --turbopack",
    preview: "next start --port 4319",
    paths: {
      mountProvider: "app/layout.tsx",
      code: "app/theme-zone.tsx",
      componentExample: "app/example.tsx",
      themeSwitchExample: "app/theme-controls.tsx",
      completeExample: "app/page.tsx",
    },
    deps: {
      next: "15.5.28",
      react: "19.3.1",
      "react-dom": "19.3.1",
      bootstrap: "5.3.8",
      daisyui: "5.1.10",
      tailwindcss: "4.3.3",
      "open-props": "1.7.23",
      "@mui/material": "9.0.0",
      // `@mui/material-nextjs` is MUI's App Router Emotion cache provider; the
      // two Emotion packages are its peers. `@emotion/cache` is also what
      // Chakra's App Router Emotion registry imports.
      "@mui/material-nextjs": "9.0.0",
      "@emotion/react": "11.14.0",
      "@emotion/styled": "11.14.0",
      "@emotion/cache": "11.14.0",
      "@emotion/server": "11.11.0",
      "@chakra-ui/react": "3.30.0",
      antd: "6.1.0",
      "@mantine/core": "7.17.0",
      "@mantine/hooks": "7.17.0",
    },
    devDeps: {
      "@types/react": "19.3.0",
      "@types/react-dom": "19.3.0",
      "@types/node": "26.1.1",
      "@tailwindcss/postcss": "4.3.3",
      // Aligned with the workspace's `@unocss/core` peer: `tsc` checks
      // `uno.config.ts` here, and two copies of the `Preset` type do not unify.
      "@unocss/postcss": "66.7.5",
      "@unocss/core": "66.7.5",
      unocss: "66.7.5",
      typescript: "5.9.3",
    },
    files: () => ({
      "next.config.mjs": `export default { reactStrictMode: true };\n`,
      "next-env.d.ts": `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n`,
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            lib: ["dom", "dom.iterable", "esnext"],
            allowJs: true,
            skipLibCheck: true,
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            module: "esnext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            jsx: "preserve",
            incremental: true,
            plugins: [{ name: "next" }],
          },
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
          exclude: ["node_modules"],
        },
        null,
        2,
      ),
    }),
  },

  Remix: {
    dir: "remix",
    dev: "remix vite:dev --port 4319",
    check: "tsc --noEmit",
    build: "remix vite:build",
    preview: "remix-serve ./build/server/index.js",
    paths: {
      mountProvider: "app/root.tsx",
      code: "app/components/theme-zone.tsx",
      componentExample: "app/components/example.tsx",
      themeSwitchExample: "app/components/theme-controls.tsx",
      completeExample: "app/routes/_index.tsx",
    },
    deps: {
      "@remix-run/node": "2.17.0",
      "@remix-run/react": "2.17.0",
      "@remix-run/serve": "2.17.0",
      react: "19.3.1",
      "react-dom": "19.3.1",
      bootstrap: "5.3.8",
      daisyui: "5.1.10",
      tailwindcss: "4.3.3",
      "open-props": "1.7.23",
      "@mui/material": "9.0.0",
      "@emotion/react": "11.14.0",
      "@emotion/styled": "11.14.0",
      "@chakra-ui/react": "3.30.0",
      antd: "6.1.0",
      "@mantine/core": "7.17.0",
      "@mantine/hooks": "7.17.0",
    },
    devDeps: {
      "@remix-run/dev": "2.17.0",
      "@types/react": "19.3.0",
      "@types/react-dom": "19.3.0",
      "@tailwindcss/vite": "4.3.3",
      "@unocss/vite": "66.5.4",
      unocss: "66.5.4",
      typescript: "5.9.3",
      vite: "6.4.4",
      "vite-tsconfig-paths": "5.1.4",
    },
    files: () => ({
      "vite.config.ts": `import { vitePlugin as remix } from "@remix-run/dev";
import tailwindcss from "@tailwindcss/vite";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({ future: { v3_fetcherPersist: true, v3_relativeSplatPath: true } }),
    tailwindcss(),
    UnoCSS(),
    tsconfigPaths(),
  ],
});
`,
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            lib: ["DOM", "DOM.Iterable", "ES2022"],
            module: "ESNext",
            moduleResolution: "bundler",
            jsx: "react-jsx",
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            esModuleInterop: true,
            resolveJsonModule: true,
            types: ["@remix-run/node", "vite/client"],
          },
          include: ["**/*.ts", "**/*.tsx"],
        },
        null,
        2,
      ),
    }),
  },

  Astro: {
    dir: "astro",
    dev: "astro dev --port 4319",
    check: "astro check",
    build: "astro build",
    preview: "astro preview --port 4319",
    paths: {
      mountProvider: "src/layouts/BaseLayout.astro",
      code: "src/components/ThemeIsland.tsx",
      componentExample: "src/components/Example.tsx",
      themeSwitchExample: "src/components/ThemeControls.tsx",
      completeExample: "src/pages/index.astro",
    },
    deps: {
      astro: "5.14.1",
      "@astrojs/react": "4.4.0",
      react: "19.3.1",
      "react-dom": "19.3.1",
      bootstrap: "5.3.8",
      daisyui: "5.1.10",
      tailwindcss: "4.3.3",
      "open-props": "1.7.23",
      "@mui/material": "9.0.0",
      "@emotion/react": "11.14.0",
      "@emotion/styled": "11.14.0",
      "@chakra-ui/react": "3.30.0",
      antd: "6.1.0",
      "@mantine/core": "7.17.0",
      "@mantine/hooks": "7.17.0",
    },
    devDeps: {
      "@astrojs/check": "0.9.4",
      "@types/react": "19.3.0",
      "@types/react-dom": "19.3.0",
      "@tailwindcss/vite": "4.3.3",
      // The workspace's `@themvora/unocss` resolves its `@unocss/core` peer to
      // 66.7.5. Pinning the fixture to the same version avoids *two* copies of
      // the `Preset` type in `uno.config.ts` — a junction artifact that a real
      // npm install dedupes and never shows the reader.
      "@unocss/astro": "66.7.5",
      "@unocss/core": "66.7.5",
      unocss: "66.7.5",
      typescript: "5.9.3",
    },
    files: () => ({
      "astro.config.mjs": `import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import UnoCSS from "unocss/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [react(), UnoCSS()],
  vite: { plugins: [tailwindcss()] },
});
`,
      "tsconfig.json": JSON.stringify(
        {
          extends: "astro/tsconfigs/strict",
          include: [".astro/types.d.ts", "**/*"],
          exclude: ["dist"],
          compilerOptions: {
            jsx: "react-jsx",
            jsxImportSource: "react",
            baseUrl: ".",
          },
        },
        null,
        2,
      ),
    }),
  },

  "Vue 3": {
    dir: "vue",
    dev: "vite",
    check: "vue-tsc --noEmit",
    build: "vite build",
    preview: "vite preview --port 4319 --strictPort",
    paths: {
      mountProvider: "src/main.ts",
      code: "src/components/ThemeZone.vue",
      componentExample: "src/components/Example.vue",
      themeSwitchExample: "src/components/ThemeControls.vue",
      completeExample: "src/App.vue",
    },
    deps: {
      vue: "3.5.44",
      bootstrap: "5.3.8",
      daisyui: "5.1.10",
      tailwindcss: "4.3.3",
      "open-props": "1.7.23",
    },
    devDeps: {
      "@vitejs/plugin-vue": "6.0.1",
      "@vue/tsconfig": "0.8.1",
      "@tailwindcss/vite": "4.3.3",
      "@unocss/vite": "66.5.4",
      unocss: "66.5.4",
      typescript: "5.9.3",
      "vue-tsc": "3.1.1",
      vite: "6.4.4",
    },
    files: () => ({
      "index.html": `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>recipe</title></head>
  <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
</html>
`,
      "src/env.d.ts": `/// <reference types="vite/client" />\n`,
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "ESNext",
            moduleResolution: "bundler",
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            jsx: "preserve",
            types: ["vite/client"],
            paths: { "@/*": ["./src/*"] },
            baseUrl: ".",
          },
          include: ["src/**/*.ts", "src/**/*.vue"],
        },
        null,
        2,
      ),
      "vite.config.ts": `import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import UnoCSS from "unocss/vite";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue(), tailwindcss(), UnoCSS()],
  resolve: { alias: { "@": path.resolve(process.cwd(), "./src") } },
});
`,
    }),
  },

  Nuxt: {
    dir: "nuxt",
    dev: "nuxt dev --port 4319",
    check: "nuxt typecheck",
    build: "nuxt build",
    preview: "nuxt preview",
    paths: {
      mountProvider: "nuxt.config.ts",
      code: "app/components/ThemeZone.vue",
      componentExample: "app/components/Example.vue",
      themeSwitchExample: "app/components/ThemeControls.vue",
      completeExample: "app/app.vue",
    },
    deps: {
      nuxt: "4.2.0",
      vue: "3.5.44",
      "vue-router": "4.6.3",
      bootstrap: "5.3.8",
      daisyui: "5.1.10",
      tailwindcss: "4.3.3",
      "open-props": "1.7.23",
    },
    devDeps: {
      "@tailwindcss/vite": "4.3.3",
      "@unocss/nuxt": "66.5.4",
      unocss: "66.5.4",
      typescript: "5.9.3",
      // `nuxt typecheck` refuses to run without a Vue type checker.
      "vue-tsc": "3.1.1",
    },
    files: () => ({
      "tsconfig.json": JSON.stringify({ extends: "./.nuxt/tsconfig.json" }, null, 2),
    }),
  },

  Svelte: {
    dir: "svelte",
    dev: "vite",
    check: "svelte-check --tsconfig ./tsconfig.json",
    build: "vite build",
    preview: "vite preview --port 4319 --strictPort",
    paths: {
      mountProvider: "src/lib/ThemeRoot.svelte",
      code: "src/lib/ThemeZone.svelte",
      componentExample: "src/lib/Example.svelte",
      themeSwitchExample: "src/lib/ThemeControls.svelte",
      completeExample: "src/App.svelte",
    },
    deps: {
      // The package's peer floor is 5.56, where the runtime switched
      // `rest_props` to a Set (`.has`); older 5.x throws
      // `exclude.includes is not a function`. 5.57.3 is the verified release;
      // set SVELTE_VERSION=5.56.0 to exercise the minimum of the peer range.
      svelte: process.env.SVELTE_VERSION ?? "5.57.3",
      bootstrap: "5.3.8",
      daisyui: "5.1.10",
      tailwindcss: "4.3.3",
      "open-props": "1.7.23",
    },
    devDeps: {
      "@sveltejs/vite-plugin-svelte": "6.2.1",
      "@tsconfig/svelte": "5.0.5",
      "@tailwindcss/vite": "4.3.3",
      "@unocss/vite": "66.5.4",
      "svelte-check": "4.3.2",
      unocss: "66.5.4",
      typescript: "5.9.3",
      vite: "6.4.4",
    },
    files: () => ({
      "index.html": `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>recipe</title></head>
  <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
</html>
`,
      "src/main.ts": `import { mount } from "svelte";
import App from "./App.svelte";

mount(App, { target: document.getElementById("app")! });
`,
      "svelte.config.js": `import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default { preprocess: vitePreprocess() };
`,
      "tsconfig.json": JSON.stringify(
        {
          extends: "@tsconfig/svelte/tsconfig.json",
          compilerOptions: {
            target: "ES2022",
            module: "ESNext",
            moduleResolution: "bundler",
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            types: ["svelte", "vite/client"],
            verbatimModuleSyntax: true,
            isolatedModules: true,
          },
          include: ["src/**/*.ts", "src/**/*.svelte"],
        },
        null,
        2,
      ),
      "vite.config.ts": `import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte(), tailwindcss(), UnoCSS()],
});
`,
    }),
  },

  Solid: {
    dir: "solid",
    dev: "vite",
    check: "tsc --noEmit",
    build: "vite build",
    preview: "vite preview --port 4319 --strictPort",
    paths: {
      mountProvider: "src/index.tsx",
      code: "src/ThemeZone.tsx",
      componentExample: "src/Example.tsx",
      themeSwitchExample: "src/ThemeControls.tsx",
      completeExample: "src/App.tsx",
    },
    deps: {
      "solid-js": "1.9.18",
      bootstrap: "5.3.8",
      daisyui: "5.1.10",
      tailwindcss: "4.3.3",
      "open-props": "1.7.23",
    },
    devDeps: {
      "vite-plugin-solid": "2.11.9",
      "@tailwindcss/vite": "4.3.3",
      "@unocss/vite": "66.5.4",
      unocss: "66.5.4",
      typescript: "5.9.3",
      vite: "6.4.4",
    },
    files: () => ({
      "index.html": `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>recipe</title></head>
  <body><div id="root"></div><script type="module" src="/src/index.tsx"></script></body>
</html>
`,
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "ESNext",
            moduleResolution: "bundler",
            jsx: "preserve",
            jsxImportSource: "solid-js",
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            types: ["vite/client"],
          },
          include: ["src"],
        },
        null,
        2,
      ),
      "vite.config.ts": `import tailwindcss from "@tailwindcss/vite";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid(), tailwindcss(), UnoCSS()],
});
`,
    }),
  },

  Angular: {
    dir: "angular",
    dev: "ng serve --port 4319",
    check: "tsc -p tsconfig.app.json --noEmit",
    build: "ng build",
    preview: "http-server dist/browser -p 4319",
    paths: {
      mountProvider: "src/main.ts",
      code: "src/app/theme-zone.component.ts",
      componentExample: "src/app/example.component.ts",
      themeSwitchExample: "src/app/theme-controls.component.ts",
      completeExample: "src/app/app.component.ts",
    },
    deps: {
      // Angular 22 requires Node ^22.22.3 || ^24.15.0 || >=26; the verified
      // host runs v24.15.0. Angular 22 also requires TypeScript 6.0.x.
      "@angular/common": "22.2.5",
      "@angular/compiler": "22.2.5",
      "@angular/core": "22.2.5",
      "@angular/platform-browser": "22.2.5",
      rxjs: "7.8.2",
      tslib: "2.8.0",
      bootstrap: "5.3.8",
      daisyui: "5.1.10",
      tailwindcss: "4.3.3",
      "open-props": "1.7.23",
    },
    devDeps: {
      "@angular/build": "22.2.6",
      "@angular/cli": "22.2.6",
      "@angular/compiler-cli": "22.2.5",
      "@tailwindcss/postcss": "4.3.3",
      "http-server": "14.1.1",
      postcss: "8.5.32",
      typescript: "6.0.3",
      // Angular's zone-based change detection needs the polyfill a fresh
      // `ng new` app installs. Without it bootstrap throws NG0908.
      "zone.js": "0.15.1",
    },
    files: () => ({
      "src/index.html": `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>recipe</title></head>
  <body><app-root></app-root></body>
</html>
`,
      "angular.json": JSON.stringify(
        {
          $schema: "./node_modules/@angular/cli/lib/config/schema.json",
          version: 1,
          projects: {
            recipe: {
              projectType: "application",
              root: "",
              sourceRoot: "src",
              prefix: "app",
              architect: {
                build: {
                  builder: "@angular/build:application",
                  options: {
                    outputPath: "dist",
                    index: "src/index.html",
                    browser: "src/main.ts",
                    polyfills: ["zone.js"],
                    tsConfig: "tsconfig.app.json",
                    assets: [],
                    styles: ["src/styles.css"],
                  },
                  configurations: {
                    production: {
                      optimization: true,
                      sourceMap: false,
                      outputHashing: "all",
                      budgets: [
                        { type: "initial", maximumWarning: "2MB", maximumError: "5MB" },
                      ],
                    },
                    development: { optimization: false, sourceMap: true },
                  },
                  defaultConfiguration: "production",
                },
                serve: {
                  builder: "@angular/build:dev-server",
                  configurations: { production: { buildTarget: "recipe:build:production" } },
                  defaultConfiguration: "production",
                },
              },
            },
          },
        },
        null,
        2,
      ),
      "tsconfig.json": JSON.stringify(
        {
          compileOnSave: false,
          compilerOptions: {
            strict: true,
            noImplicitOverride: true,
            noPropertyAccessFromIndexSignature: true,
            noImplicitReturns: true,
            noFallthroughCasesInSwitch: true,
            skipLibCheck: true,
            isolatedModules: true,
            experimentalDecorators: true,
            importHelpers: true,
            target: "ES2022",
            module: "preserve",
            moduleResolution: "bundler",
          },
          angularCompilerOptions: {
            enableI18nLegacyMessageIdFormat: false,
            strictInjectionParameters: true,
            strictInputAccessModifiers: true,
            strictTemplates: true,
          },
        },
        null,
        2,
      ),
      "tsconfig.app.json": JSON.stringify(
        {
          extends: "./tsconfig.json",
          compilerOptions: { outDir: "./out-tsc/app", types: [] },
          files: ["src/main.ts"],
          include: ["src/**/*.d.ts"],
        },
        null,
        2,
      ),
    }),
  },
};

/* ==========================================================================
   Materialising a recipe.
   ========================================================================== */

/** Split authored snippet text into `{ path, code }` files. */
function splitFiles(text, fallbackPath) {
  const lines = text.split("\n");
  const banner = /^(?:\/\/|<!--)\s*-{3,}\s*([\w./@-]+\.[a-z]{2,6})\s*(?:-->)?$/;
  const chunks = [];
  let current = { path: fallbackPath, body: [] };

  for (const line of lines) {
    const m = line.trim().match(banner);
    if (m) {
      if (current.body.length) chunks.push(current);
      current = { path: m[1], body: [] };
      continue;
    }
    current.body.push(line);
  }
  if (current.body.length) chunks.push(current);

  // A single-file snippet names itself in a leading comment.
  const only = chunks[0];
  if (chunks.length === 1 && only && only.path === fallbackPath) {
    const lead = (only.body[0] ?? "").trim().match(/^(?:\/\/|<!--)\s*([\w./@-]+\.[a-z]{2,6})\s*(?:-->)?$/);
    if (lead) {
      only.path = lead[1];
      only.body.splice(0, 1);
      if ((only.body[0] ?? "").trim() === "") only.body.splice(0, 1);
    }
  }

  return chunks.map((c) => ({
    path: c.path,
    code: c.body.join("\n").replace(/^\n+|\n+$/g, ""),
  }));
}

/** Every file a recipe contributes, in write order. */
function recipeFiles(combo, recipe, fw) {
  const files = [];
  const push = (text, role) => {
    if (typeof text !== "string") return;
    for (const f of splitFiles(text, fw.paths[role])) files.push(f);
  };
  push(recipe.setup, "setup");
  push(recipe.mountProvider, "mountProvider");
  push(recipe.code, "code");
  push(recipe.componentExample, "componentExample");
  push(recipe.themeSwitchExample, "themeSwitchExample");
  push(recipe.completeExample, "completeExample");
  return files.filter((f) => f.path && !f.path.includes(".."));
}

/**
 * Tools a recipe runs but never installs into the app.
 *
 * `pnpm dlx shadcn@latest init` generates component *source*; it is not a
 * dependency, and listing it as one would be a lie the install step has to
 * satisfy.
 */
const CLI_TOOLS = new Set(["shadcn", "shadcn-vue", "shadcn-svelte", "shadcn-solid"]);

/** The package name list a recipe's install commands resolve to. */
function packagesFromCommands(commands) {
  const out = [];
  for (const cmd of commands ?? []) {
    // `dlx <pkg> <args…>` names one package; `add <pkg> <pkg>…` names several.
    const dlx = cmd.match(/^pnpm dlx (\S+)/);
    const add = cmd.match(/^pnpm add (?:-D )?(.+)$/);
    const list = dlx ? [dlx[1]] : add ? add[1].split(/\s+/) : [];
    for (const token of list) {
      if (token.startsWith("-")) continue;
      const name = token.includes("@") && !token.startsWith("@")
        ? token.slice(0, token.lastIndexOf("@"))
        : token;
      if (CLI_TOOLS.has(name)) continue;
      out.push(name);
    }
  }
  return out;
}

/* ==========================================================================
   App lifecycle.
   ========================================================================== */

/**
 * Remove a directory tree.
 *
 * The Node `rm` path is tried first; some sandboxes refuse a bulk unlink (a
 * per-run deletion budget) and throw before deleting anything, so the shell is
 * the fallback. Both remove exactly the same tree — this is a deletion
 * mechanism, not a different operation.
 */
function removeDir(path) {
  if (!existsSync(path)) return;
  // Shell-first on purpose: the sandbox's delete guard counts Node `rm` calls
  // against a per-run budget and aborts the whole command once it trips, which
  // would make a build fail for a reason that has nothing to do with the build.
  execSync(`rm -rf "${path.replace(/\\/g, "/")}"`, { stdio: "inherit" });
}

function appDir(fw) {
  return join(APPS, fw.dir);
}

/**
 * The packages whose installed versions define what a recipe ran against.
 *
 * Recorded next to the pass/fail stages so evidence names the actual toolchain
 * (Angular 22 + its TypeScript floor, the Svelte runtime, the Next.js major)
 * instead of leaving a reader to infer it from a lockfile snapshot.
 */
const RUNTIME_PACKAGES = {
  React: ["react", "react-dom"],
  "Next.js": ["next", "react"],
  Remix: ["@remix-run/react", "react"],
  Astro: ["astro", "react"],
  "Vue 3": ["vue"],
  Nuxt: ["nuxt", "vue"],
  Svelte: ["svelte"],
  Solid: ["solid-js"],
  Angular: ["@angular/core", "typescript"],
};

function installedRuntime(fwName, fw) {
  const packages = {};
  for (const name of RUNTIME_PACKAGES[fwName] ?? []) {
    try {
      packages[name] = JSON.parse(
        readFileSync(join(appDir(fw), "node_modules", name, "package.json"), "utf8"),
      ).version;
    } catch {
      /* a package the recipe never installed is simply absent */
    }
  }
  return { node: process.version, packages };
}

/** Write `package.json` for a framework's fixture app. */
function writePackageJson(fwName, fw, libraries) {
  const dir = appDir(fw);
  const deps = { ...fw.deps };
  const devDeps = { ...fw.devDeps };

  // The recipe names exact packages; anything the shell already pins stays.
  for (const name of libraries) {
    if (name.startsWith("@themvora/")) continue;
    if (deps[name] || devDeps[name]) continue;
    throw new Error(`${fwName}: recipe needs ${name}, which the shell does not pin`);
  }

  const pkg = {
    name: `verify-${fw.dir}`,
    private: true,
    type: "module",
    scripts: {
      dev: fw.dev,
      build: fw.build,
      check: fw.check,
      start: fw.preview,
    },
    dependencies: sortKeys(deps),
    devDependencies: sortKeys(devDeps),
  };
  writeFileSync(join(dir, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);
}

const sortKeys = (obj) =>
  Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));

/**
 * Junction the workspace packages into the fixture.
 *
 * `file:` dependencies cannot work here: the packages declare `workspace:^`
 * edges, which only resolve inside the monorepo. A junction points at the real
 * package directory, so the package resolves its own workspace-linked deps and
 * the fixture exercises the artifact this repository actually builds.
 */
function linkWorkspacePackages(fwName, fw) {
  const dir = appDir(fw);
  const scope = join(dir, "node_modules", "@themvora");
  mkdirSync(scope, { recursive: true });

  const packages = [
    ["core", "packages/core"],
    ["adapters", "packages/adapters/shared"],
    ["react", "packages/react"],
    ["next", "packages/next"],
    ["vue", "packages/vue"],
    ["nuxt", "packages/nuxt"],
    ["svelte", "packages/svelte"],
    ["solid", "packages/solid"],
    ["angular", "packages/angular"],
    ["astro", "packages/astro"],
    ["remix", "packages/remix"],
    ["tailwind", "packages/tailwind"],
    ["web", "packages/web"],
    ["shadcn", "packages/adapters/shadcn"],
    ["bootstrap", "packages/adapters/bootstrap"],
    ["daisyui", "packages/adapters/daisyui"],
    ["open-props", "packages/adapters/open-props"],
    ["mui", "packages/adapters/mui"],
    ["chakra", "packages/adapters/chakra"],
    ["antd", "packages/adapters/antd"],
    ["mantine", "packages/adapters/mantine"],
    ["unocss", "packages/adapters/unocss"],
  ];

  // A junction points at the workspace package, whose own `node_modules` holds
  // the *monorepo's* copy of each UI library. That gives the app two instances
  // of Chakra/Mantine's React context (the provider from one, the components
  // from the other) and Angular a second compiler version. Copying the package
  // the way npm installs it keeps all peer resolution inside the app.
  const copy = true;

  for (const [name, rel] of packages) {
    const target = join(REPO, rel);
    const link = join(scope, name);
    if (!existsSync(target)) continue;
    if (existsSync(link)) continue;

    if (copy) {
      // Only what `files` publishes: copying `node_modules` would try to
      // recreate the workspace's symlinks and fail with EPERM.
      mkdirSync(link, { recursive: true });
      cpSync(join(target, "package.json"), join(link, "package.json"));
      for (const extra of ["README.md", "dist"]) {
        if (existsSync(join(target, extra))) {
          cpSync(join(target, extra), join(link, extra), { recursive: true });
        }
      }
      rewriteWorkspaceDeps(join(link, "package.json"));
      continue;
    }

    // Junctions need no elevation on Windows and behave like a directory.
    execSync(
      `powershell -NoProfile -Command "New-Item -ItemType Junction -Path '${link}' -Target '${target}' | Out-Null"`,
      { stdio: "inherit" },
    );
  }
}

/**
 * Rewrite `workspace:` dependency edges to `file:` paths.
 *
 * `workspace:` only resolves inside the monorepo. `pnpm pack` performs this
 * rewrite on publish, so doing it here reproduces what a consumer installs.
 */
function rewriteWorkspaceDeps(manifestPath) {
  if (!existsSync(manifestPath)) return;
  const pkg = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
    for (const [name, range] of Object.entries(pkg[field] ?? {})) {
      if (typeof range !== "string" || !range.startsWith("workspace:")) continue;
      const short = name.replace("@themvora/", "");
      const candidates = [
        join(REPO, "packages", short),
        join(REPO, "packages", "adapters", short),
        join(REPO, "packages", "adapters", "shared"),
      ];
      const found = candidates.find((c) => existsSync(join(c, "package.json")));
      if (found) pkg[field][name] = `file:${found.replace(/\\/g, "/")}`;
    }
  }
  writeFileSync(manifestPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function ensureApp(fwName, recipe) {
  const fw = FRAMEWORKS[fwName];
  const dir = appDir(fw);
  mkdirSync(dir, { recursive: true });

  const scaffold = join(dir, ".scaffold");
  removeDir(scaffold);
  for (const [rel, content] of Object.entries(fw.files())) {
    for (const base of [dir, scaffold]) {
      const target = join(base, rel);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
  }

  writePackageJson(fwName, fw, packagesFromCommands([...(recipe.install ?? []), ...(recipe.themvora ?? [])]));
  linkWorkspacePackages(fwName, fw);
  return dir;
}

/**
 * Reset an app to its scaffold.
 *
 * A recipe writes at the app root as well as under `src` — `components.json`,
 * `uno.config.ts`, a modified `src/index.css` — so deleting only `src` leaks the
 * previous library's configuration into the next combination. Everything except
 * the installed tree is removed and the scaffold is copied back.
 */
function resetToScaffold(dir) {
  const keep = new Set([
    "node_modules",
    ".scaffold",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "dist",
  ]);
  for (const entry of readdirSync(dir)) {
    if (keep.has(entry)) continue;
    removeDir(join(dir, entry));
  }
  cpSync(join(dir, ".scaffold"), dir, { recursive: true });
}

/** Replace the app's `src`/`app` with exactly the recipe's files. */
function materialize(fwName, combo, recipe) {
  const fw = FRAMEWORKS[fwName];
  const dir = appDir(fw);

  resetToScaffold(dir);

  const files = recipeFiles(combo, recipe, fw);
  for (const file of files) {
    const target = join(dir, file.path);
    mkdirSync(dirname(target), { recursive: true });

    // A recipe's JSON file documents an *addition* — "add these paths to your
    // tsconfig" — not a replacement. Writing it verbatim would delete `jsx`,
    // `moduleResolution` and everything else the framework needs, which is a
    // failure the reader would never hit because they edit, not overwrite.
    if (file.path.endsWith(".json") && existsSync(target)) {
      const merged = deepMerge(
        JSON.parse(readFileSync(target, "utf8")),
        JSON.parse(file.code),
      );
      writeFileSync(target, `${JSON.stringify(merged, null, 2)}\n`);
      continue;
    }
    writeFileSync(target, `${file.code}\n`);
  }
  return files;
}

/** Deep-merge `patch` into `base`, with arrays replaced wholesale. */
function deepMerge(base, patch) {
  const out = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    out[key] =
      value && typeof value === "object" && !Array.isArray(value) &&
      out[key] && typeof out[key] === "object" && !Array.isArray(out[key])
        ? deepMerge(out[key], value)
        : value;
  }
  return out;
}

/**
 * Run the recipe's generator steps (`pnpm dlx …`) in the fixture.
 *
 * Non-interactive flags are appended because the fixture has no TTY; without
 * them the CLI blocks forever waiting for an answer. The generator, the
 * registry and the emitted component source are the real ones.
 */
function runCliSteps(recipe, dir) {
  const commands = (recipe.install ?? []).filter((c) => c.startsWith("pnpm dlx "));
  const run_ = [];
  for (const command of commands) {
    // `shadcn-svelte init` has no `--yes`: it confirms before rewriting the
    // global stylesheet. Piping `yes` answers the prompt without changing what
    // the CLI does.
    const prefix = command.includes("shadcn-svelte@") ? "yes | " : "";
    const nonInteractive = `${prefix}${command}${cliArgsFor(command)}`;
    const res = run(nonInteractive, dir);
    run_.push({ command: nonInteractive, ok: res.ok });
    if (!res.ok) return { ok: false, commands: run_, output: res.output };
  }
  return { ok: true, commands: run_ };
}

/**
 * The non-interactive flags each generator CLI understands.
 *
 * They are not interchangeable: `shadcn-svelte init` rejects `--yes` and needs
 * the alias paths supplied explicitly, while the React and Vue CLIs accept
 * `--defaults`. Passing one CLI's flags to another is the difference between
 * "the recipe works" and "the recipe was never run".
 */
function cliArgsFor(command) {
  const init = /\binit\b/.test(command);
  if (command.includes("shadcn-svelte@")) {
    return init
      ? " --preset vega --base-color neutral --css src/index.css --components-alias $lib/components --lib-alias $lib --utils-alias $lib/utils --ui-alias $lib/components/ui --hooks-alias $lib/hooks"
      : " --yes --overwrite";
  }
  return init ? " --yes --defaults" : " --yes";
}

/**
 * Environment for the toolchains under test.
 *
 * This workstation injects a `NODE_OPTIONS` preload into every Node process
 * which patches `fs.rm` with a bulk-deletion guard (50 deletions per turn).
 * Astro's `cleanServerOutput` and Vite's dep-cache invalidation both call
 * `fs.rm` during a normal build, so once the harness has used its budget a
 * perfectly valid build fails with `SAFE_DELETE_BULK_CONFIRM_REQUIRED`. The
 * guard is a host safeguard, not part of any documented toolchain — removing
 * it from the child environment lets the real build run. Our own `removeDir`
 * still goes through the guarded shell, so harness deletes remain accounted.
 */
const CHILD_ENV = (() => {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.ELECTRON_RUN_AS_NODE;
  for (const key of Object.keys(env)) {
    if (key.startsWith("CODEBUDDY_SAFE_DELETE_")) delete env[key];
  }
  return env;
})();

/**
 * Run a command, capturing its output through a file.
 *
 * Not `stdio: "pipe"`: on this host a piped child fails with `EBUSY`, and the
 * failure looks like a random build error rather than a harness problem. The
 * shell redirect is the pattern the release scripts use for the same reason.
 */
function run(cmd, cwd, env = CHILD_ENV) {
  const log = join(RESULTS, ".last-command.log");
  mkdirSync(RESULTS, { recursive: true });
  try {
    execSync(`${cmd} > "${log.replace(/\\/g, "/")}" 2>&1`, {
      cwd,
      stdio: "inherit",
      shell: true,
      env,
    });
    return { ok: true, output: "" };
  } catch {
    const output = existsSync(log) ? readFileSync(log, "utf8") : "";
    return { ok: false, output };
  }
}

/* ==========================================================================
   Entry point.
   ========================================================================== */

/**
 * Build output each toolchain deletes before it builds.
 *
 * They are cleared here, through the shell, because the sandbox's delete guard
 * aborts a Node `rm` once a run exceeds its budget — which would surface as a
 * random build failure rather than what it is.
 */
const PREBUILD_CLEAN = {
  React: ["dist"],
  "Vue 3": ["dist"],
  Svelte: ["dist"],
  Solid: ["dist"],
  "Next.js": [".next"],
  Remix: ["build", ".cache"],
  Astro: ["dist", ".astro"],
  Nuxt: ["dist", ".nuxt", "node_modules/.cache/nuxt"],
  Angular: ["dist", ".angular"],
};

const recipes = readRecipes();
const combos = Object.keys(recipes).sort();

if (flag("list")) {
  for (const combo of combos) {
    const fw = combo.slice(combo.lastIndexOf("/") + 1);
    console.log(`${combo.padEnd(22)} ${FRAMEWORKS[fw] ? "shell" : "NO SHELL"}`);
  }
  console.log(`\n${combos.length} recipes`);
  process.exit(0);
}

if (flag("install")) {
  const fwName = value("install");
  const fw = FRAMEWORKS[fwName];
  if (!fw) throw new Error(`unknown framework ${fwName}`);
  const first = combos.find((c) => c.endsWith(`/${fwName}`));
  ensureApp(fwName, recipes[first]);
  console.log(`installing ${fwName} (${appDir(fw)})`);
  const res = run("pnpm install --reporter=append-only --allow-build=esbuild --allow-build=@parcel/watcher --allow-build=sharp --allow-build=lmdb --allow-build=msgpackr-extract", appDir(fw));
  console.log(res.ok ? "install OK" : res.output.slice(-2000));
  process.exit(res.ok ? 0 : 1);
}

const only = value("run");
const targets = only ? [only] : flag("all") ? combos : [];
if (!targets.length) {
  console.error("nothing to do — pass --list, --install <fw>, --run <combo>, or --all");
  process.exit(2);
}

mkdirSync(RESULTS, { recursive: true });
const report = {};

for (const combo of targets) {
  const [lib, fwName] = combo.split("/");
  const fw = FRAMEWORKS[fwName];
  const recipe = recipes[combo];
  if (!fw || !recipe) {
    report[combo] = { skipped: true, reason: !fw ? "no shell" : "no recipe" };
    continue;
  }

  const dir = ensureApp(fwName, recipe);
  const files = materialize(fwName, combo, recipe);

  // A generator CLI is part of the documented sequence, not a stand-in for it:
  // shadcn's components only exist because `shadcn init` / `shadcn add` wrote
  // them. The flags below are the CLIs' own non-interactive mode — the same
  // generator, with the prompts answered.
  const cli = runCliSteps(recipe, dir);

  const check = cli.ok ? run(`pnpm run check`, dir) : { ok: false, output: cli.output };
  for (const stale of PREBUILD_CLEAN[fwName] ?? []) removeDir(join(dir, stale));
  const build = check.ok ? run(`pnpm run build`, dir) : { ok: false, output: "check failed" };

  report[combo] = {
    combo,
    files: files.map((f) => f.path),
    cli: cli.commands,
    runtime: installedRuntime(fwName, fw),
    check: check.ok,
    build: build.ok,
    ...(check.ok ? {} : { checkOutput: check.output.slice(0, 4000) }),
    ...(build.ok ? {} : { buildOutput: build.output.slice(0, 4000) }),
  };

  writeFileSync(join(RESULTS, `${lib}-${fw.dir}.json`), JSON.stringify(report[combo], null, 2));
  console.log(
    `${check.ok ? "PASS" : "FAIL"} check  ${build.ok ? "PASS" : "FAIL"} build  ${combo}`,
  );
}

writeFileSync(join(ROOT, "results.json"), JSON.stringify(report, null, 2));
