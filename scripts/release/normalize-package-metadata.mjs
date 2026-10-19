#!/usr/bin/env node
/**
 * Normalize package metadata for the Themvora 1.0.0 release (checklist item 19/20).
 *
 * For every publishable workspace package:
 *  - fills in missing description / repository / homepage / bugs / keywords
 *  - copies the root LICENSE into the package
 *  - generates a concise README.md if missing
 *  - removes `private: true` from packages that must be published
 *  - adds engines for node-run packages
 *
 * Idempotent: existing values are preserved.
 *
 * Usage: node scripts/release/normalize-package-metadata.mjs
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(join(here, "..", ".."));

const REPO_URL = "https://github.com/themvora/themvora";
// Keep this in sync with apps/docs/lib/site.ts `SITE_URL` and the README —
// it becomes the `homepage` of every published package.
const DOCS_URL = "https://themvora-dev.vercel.app";

const DESCRIPTIONS = {
  "@themvora/core":
    "Framework-agnostic theming engine: theme store, runtime, transitions, scheduling, accessibility, and DOM adapters.",
  "@themvora/web": "Vanilla JS theme runtime and DOM bindings for Themvora.",
  "@themvora/react": "React bindings for Themvora: provider, hooks, and runtime access.",
  "@themvora/next": "Next.js integration for Themvora with SSR-first theming and zero-flash bootstrapping.",
  "@themvora/vue": "Vue 3 bindings for Themvora.",
  "@themvora/nuxt": "Nuxt module for Themvora: SSR, cookies, and zero-flash theming.",
  "@themvora/svelte": "Svelte 5 bindings for Themvora.",
  "@themvora/solid": "SolidJS bindings for Themvora.",
  "@themvora/angular": "Angular integration for Themvora.",
  "@themvora/astro": "Astro integration for Themvora.",
  "@themvora/remix": "Remix integration for Themvora.",
  "@themvora/tailwind": "Tailwind CSS v4 plugin that maps Themvora tokens to Tailwind theme variables.",
  "@themvora/cli": "Themvora CLI: generate, validate, inspect, and migrate themes.",
  "@themvora/devtools": "Development tools and runtime inspector for Themvora.",
  "@themvora/mantine": "Mantine adapter for Themvora.",
  "@themvora/adapters": "Shared adapter utilities for the Themvora adapter ecosystem.",
  "@themvora/mui": "MUI adapter for Themvora.",
  "@themvora/chakra": "Chakra UI adapter for Themvora.",
  "@themvora/antd": "Ant Design adapter for Themvora.",
  "@themvora/shadcn": "shadcn/ui adapter for Themvora.",
  "@themvora/bootstrap": "Bootstrap adapter for Themvora.",
  "@themvora/daisyui": "DaisyUI adapter for Themvora.",
  "@themvora/open-props": "Open Props adapter for Themvora.",
  "@themvora/unocss": "UnoCSS adapter for Themvora.",
};

const KEYWORDS = {
  "@themvora/core": ["theme", "theming", "dark-mode", "css-variables", "design-tokens"],
  "@themvora/web": ["theme", "theming", "vanilla-js", "dark-mode", "css-variables"],
  "@themvora/react": ["theme", "react", "theming", "dark-mode"],
  "@themvora/next": ["theme", "nextjs", "theming", "ssr", "dark-mode"],
  "@themvora/vue": ["theme", "vue", "theming", "dark-mode"],
  "@themvora/nuxt": ["theme", "nuxt", "theming", "ssr", "dark-mode"],
  "@themvora/svelte": ["theme", "svelte", "theming", "dark-mode"],
  "@themvora/solid": ["theme", "solidjs", "theming", "dark-mode"],
  "@themvora/angular": ["theme", "angular", "theming", "dark-mode"],
  "@themvora/astro": ["theme", "astro", "theming", "dark-mode"],
  "@themvora/remix": ["theme", "remix", "theming", "dark-mode"],
  "@themvora/tailwind": ["theme", "tailwindcss", "theming", "css-variables"],
  "@themvora/cli": ["theme", "cli", "generator", "theming"],
  "@themvora/devtools": ["theme", "devtools", "inspector", "theming"],
  "@themvora/mantine": ["theme", "mantine", "adapter", "theming"],
  "@themvora/adapters": ["theme", "adapter", "theming", "design-tokens"],
  "@themvora/mui": ["theme", "mui", "material-ui", "adapter", "theming"],
  "@themvora/chakra": ["theme", "chakra-ui", "adapter", "theming"],
  "@themvora/antd": ["theme", "ant-design", "antd", "adapter", "theming"],
  "@themvora/shadcn": ["theme", "shadcn", "adapter", "theming"],
  "@themvora/bootstrap": ["theme", "bootstrap", "adapter", "theming"],
  "@themvora/daisyui": ["theme", "daisyui", "adapter", "theming"],
  "@themvora/open-props": ["theme", "open-props", "adapter", "theming"],
  "@themvora/unocss": ["theme", "unocss", "adapter", "theming"],
};

// Packages that must become publishable (they are workspace:* dependencies of others)
const FORCE_PUBLISH = new Set(["@themvora/adapters"]);

// Packages that run on Node and should declare engines
const NODE_RUNTIME = new Set(["@themvora/core", "@themvora/cli", "@themvora/adapters"]);

const README_USAGE = {
  "@themvora/core": `## Quick start

\`\`\`js
import { createThemeStore, ThemeRuntime, createCSSVariablesBinding } from "@themvora/core";

const store = createThemeStore({
  themes: {
    light: { name: "light", tokens: { color: { background: "#ffffff" } } },
    dark: { name: "dark", tokens: { color: { background: "#0a0a0a" } } },
  },
});
const runtime = new ThemeRuntime({ store });
createCSSVariablesBinding(store);
\`\`\``,
  "@themvora/react": `## Quick start

\`\`\`tsx
import { ThemeProvider, useTheme } from "@themvora/react";

function App() {
  return (
    <ThemeProvider>
      <Content />
    </ThemeProvider>
  );
}

function Content() {
  const { theme, mode, setMode } = useTheme();
  return <button onClick={() => setMode(mode === "dark" ? "light" : "dark")}>Toggle</button>;
}
\`\`\``,
  "@themvora/next": `## Quick start

\`\`\`tsx
// app/layout.tsx
import { ThemeProvider } from "@themvora/next";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
\`\`\``,
  "@themvora/cli": `## Usage

\`\`\`bash
themvora --version
themvora generate --seed '#ea580c'
themvora validate theme.json
themvora inspect theme.json
themvora migrate theme.json
\`\`\``,
  "@themvora/tailwind": `## Usage

\`\`\`css
@import "tailwindcss";
@import "@themvora/tailwind";
\`\`\``,
};

function collectPackages() {
  const out = [];
  for (const base of ["packages", join("packages", "adapters")]) {
    const baseAbs = join(repoRoot, base);
    if (!existsSync(baseAbs)) continue;
    for (const entry of readdirSafe(baseAbs)) {
      const dir = join(baseAbs, entry);
      const pkgPath = join(dir, "package.json");
      if (!existsSync(pkgPath)) continue;
      out.push({ dir, pkgPath, json: JSON.parse(readFileSync(pkgPath, "utf8")) });
    }
  }
  return out;
}

function readdirSafe(p) {
  try {
    return readdirSync(p);
  } catch {
    return [];
  }
}

import { readdirSync } from "node:fs";

const packages = collectPackages();
const repoField = { type: "git", url: `git+https://github.com/themvora/themvora.git` };
const bugsField = { url: `${REPO_URL}/issues` };

const changed = [];

for (const { dir, pkgPath, json } of packages) {
  const name = json.name;
  const rel = relative(repoRoot, dir);
  const publishable = !json.private || FORCE_PUBLISH.has(name);
  let dirty = false;

  if (FORCE_PUBLISH.has(name) && json.private === true) {
    delete json.private;
    dirty = true;
    console.log(`[publish] ${name}: removed private: true`);
  }

  if (!publishable) continue; // private packages (apps, examples) untouched

  if (!json.description && DESCRIPTIONS[name]) {
    json.description = DESCRIPTIONS[name];
    dirty = true;
  }
  if (!json.repository) {
    json.repository = repoField;
    dirty = true;
  } else if (typeof json.repository === "object" && json.repository.url) {
    // org migration: rewrite any previous org in existing repository URLs.
    // `thememk` is the original org; `themekit-dev` replaced it until the
    // product rename moved the repository to `themvora`.
    const migrated = json.repository.url
      .replace("github.com/thememk/", "github.com/themvora/")
      .replace("github.com/themekit-dev/", "github.com/themvora/");
    if (migrated !== json.repository.url) {
      json.repository.url = migrated;
      dirty = true;
    } else if (!json.repository.url.startsWith("git+")) {
      json.repository.url = `git+${json.repository.url}`;
      dirty = true;
    }
  }
  if (!json.homepage) {
    json.homepage = DOCS_URL;
    dirty = true;
  } else if (
    json.homepage === "https://thememk.dev" ||
    json.homepage === "https://theme-kit-docs.vercel.app" ||
    json.homepage === "https://theme-kit-prods.vercel.app" ||
    json.homepage === "https://theme-kit-dev.vercel.app"
  ) {
    // old placeholder → replace with the current canonical docs URL
    json.homepage = DOCS_URL;
    dirty = true;
  }
  if (!json.bugs) {
    json.bugs = bugsField;
    dirty = true;
  } else if (
    typeof json.bugs === "object" &&
    json.bugs.url &&
    (json.bugs.url.includes("github.com/thememk/") ||
      json.bugs.url.includes("github.com/themekit-dev/"))
  ) {
    json.bugs.url = json.bugs.url
      .replace("github.com/thememk/", "github.com/themvora/")
      .replace("github.com/themekit-dev/", "github.com/themvora/");
    dirty = true;
  }
  if (!json.keywords?.length && KEYWORDS[name]) {
    json.keywords = KEYWORDS[name];
    dirty = true;
  }
  if (NODE_RUNTIME.has(name) && !json.engines) {
    json.engines = { node: ">=18" };
    dirty = true;
  }

  // Scoped packages must publish as public; the repo's .changeset config is
  // `access: "restricted"`, which would otherwise make 1.0.0 private on npm.
  if (name.startsWith("@") && json.publishConfig?.access !== "public") {
    json.publishConfig = { ...json.publishConfig, access: "public" };
    dirty = true;
  }

  if (dirty) {
    writeFileSync(pkgPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
    changed.push(rel);
  }

  // LICENSE copy
  const licensePath = join(dir, "LICENSE");
  if (!existsSync(licensePath)) {
    copyFileSync(join(repoRoot, "LICENSE"), licensePath);
    changed.push(`${rel}/LICENSE (copied)`);
  }

  // README generation
  const readmePath = join(dir, "README.md");
  if (!existsSync(readmePath)) {
    const usage = README_USAGE[name] ?? "";
    const subpaths = Object.keys(json.exports ?? {})
      .filter((s) => s !== ".")
      .join(", ");
    let subpathsSection = "";
    if (subpaths) {
      const formatted = subpaths
        .split(", ")
        .map((s) => "`" + s + "`")
        .join(", ");
      subpathsSection = "\n## Subpaths\n\n" + formatted + "\n";
    }
    const lines = [
      `# ${name}`,
      "",
      json.description ?? "",
      "",
      "## Install",
      "",
      "```bash",
      `npm install ${name}`,
      "```",
      usage,
      subpathsSection,
      "## Documentation",
      "",
      `Full API reference and guides: [Themvora docs](${DOCS_URL}).`,
      `All packages: [npm](https://www.npmjs.com/org/themvora).`,
      "",
      "## License",
      "",
      "MIT",
    ].filter((l) => l !== "");
    writeFileSync(readmePath, `${lines.join("\n")}\n`, "utf8");
    changed.push(`${rel}/README.md (generated)`);
  }
}

console.log(`\nChanged ${changed.length} files:`);
for (const c of changed) console.log(`  ${c}`);
console.log("\nDone.");
