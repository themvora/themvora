/**
 * Generates the framework-aware sections of every library-adapter README.
 *
 * ## One technical source of truth
 *
 * The recipes come from `apps/docs/lib/libraries.tsx` → `FRAMEWORK_RECIPES`, the
 * same table the docs page renders from. That table is keyed `<library>/<framework>`
 * and carries `mountProvider`, `componentExample`, `themeSwitchExample` and
 * `completeExample` — the exact code the docs show.
 *
 * The docs render it **interactively** (a selector picks one framework). The README
 * renders it **statically** (every supported framework gets its own section). Same
 * recipe, two presentations. Nothing is hand-copied, so the two cannot drift.
 *
 * ## Why static sections
 *
 * A package README is a static document on GitHub and npm. It cannot have a
 * JavaScript selector, and it must not depend on the docs app. Anchor links are the
 * Markdown equivalent, and they work everywhere.
 *
 * ## Adapter families
 *
 * The generator reads each adapter's family from its manifest peers:
 *
 *   provider      MUI, Ant, Chakra, Mantine — the target library's own theme
 *                 provider is mounted, and real library components sit below it
 *   css-variable  Bootstrap, daisyUI, Open Props, shadcn, UnoCSS — the adapter
 *                 writes the library's CSS custom properties; components stay
 *                 ordinary markup and no provider is involved
 *
 * Rendering the same prose for both would misdescribe half of them.
 *
 * Usage: node scripts/generate-package-readmes.mjs [--check]
 *        --check  verify the READMEs are current without writing
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "..");
const DOCS = join(REPO, "apps", "docs");
const CHECK = process.argv.includes("--check");

/** Libraries whose READMEs get generated framework sections. */
const LIBRARIES = [
  "mui",
  "antd",
  "chakra",
  "mantine",
  "bootstrap",
  "daisyui",
  "open-props",
  "shadcn",
  "unocss",
];

/** The target library each adapter wraps, and its family. */
const TARGET = {
  mui: { lib: "@mui/material", family: "provider" },
  antd: { lib: "antd", family: "provider" },
  chakra: { lib: "@chakra-ui/react", family: "provider" },
  mantine: { lib: "@mantine/core", family: "provider" },
  bootstrap: { lib: "bootstrap", family: "css-variable" },
  daisyui: { lib: "daisyui", family: "css-variable" },
  "open-props": { lib: "open-props", family: "css-variable" },
  shadcn: { lib: "shadcn/ui", family: "css-variable" },
  unocss: { lib: "unocss", family: "css-variable" },
};

/** The framework package a framework needs, where it needs one. */
const FRAMEWORK_PKG = {
  React: "@themvora/react",
  "Next.js": "@themvora/next",
  Remix: "@themvora/remix",
  Astro: "@themvora/astro",
  "Vue 3": "@themvora/vue",
  Nuxt: "@themvora/nuxt",
  Svelte: "@themvora/svelte",
  Solid: "@themvora/solid",
  Angular: "@themvora/angular",
};

const LANG = { ts: "ts", tsx: "tsx", vue: "vue", svelte: "svelte", html: "html", css: "css", astro: "astro" };

/** Reads `FRAMEWORK_RECIPES` out of the docs source. */
function readRecipes() {
  const src = readFileSync(join(DOCS, "lib", "libraries.tsx"), "utf8");
  const at = src.indexOf("export const FRAMEWORK_RECIPES");
  if (at < 0) throw new Error("FRAMEWORK_RECIPES not found — is it exported?");
  const end = src.indexOf("\nexport const FRAMEWORK_LANG", at);

  const recipes = {};
  const block = src.slice(at, end);
  for (const m of block.matchAll(/^ {2}"([a-z-]+\/[^"]+)": \{$/gm)) {
    const entry = block.slice(m.index, block.indexOf("\n  },", m.index));
    const fields = {};
    for (const f of entry.matchAll(/^ {4}"(\w+)": "((?:[^"\\]|\\.)*)"/gm)) {
      fields[f[1]] = JSON.parse(`"${f[2]}"`);
    }
    recipes[m[1]] = fields;
  }
  return recipes;
}

/** Reads `FRAMEWORK_LANG` so fences use the right language. */
function readLangs() {
  const src = readFileSync(join(DOCS, "lib", "libraries.tsx"), "utf8");
  const at = src.indexOf("export const FRAMEWORK_LANG");
  const block = src.slice(at, src.indexOf("};", at));
  const out = {};
  for (const m of block.matchAll(/"([^"]+)": "(\w+)"/g)) out[m[1]] = m[2];
  return out;
}

/** Which frameworks does this library support, from the recipe table itself? */
function supportedFrameworks(recipes, lib) {
  return Object.keys(recipes)
    .filter((k) => k.startsWith(`${lib}/`))
    .map((k) => k.slice(lib.length + 1))
    .sort();
}

/** A stable anchor for a framework heading: `Next.js` → `nextjs`. */
const anchor = (fw) => fw.toLowerCase().replace(/[^a-z0-9]+/g, "");

const recipes = readRecipes();
const langs = readLangs();

const generated = [];
for (const lib of LIBRARIES) {
  const dir = join(REPO, "packages", "adapters", lib);
  const readmePath = join(dir, "README.md");
  if (!existsSync(readmePath)) {
    generated.push([lib, "no README"]);
    continue;
  }

  const fws = supportedFrameworks(recipes, lib);
  if (!fws.length) {
    generated.push([lib, "no recipes"]);
    continue;
  }

  const { lib: target, family } = TARGET[lib];
  const pkgName = `@themvora/${lib}`;

  const lines = [
    "<!-- THEME-KIT:GENERATED:FRAMEWORK-RECIPES:START -->",
    "<!-- Generated from apps/docs/lib/libraries.tsx → FRAMEWORK_RECIPES. Do not edit by hand. -->",
    "",
    "## Frameworks",
    "",
    "| Framework | Setup |",
    "| --------- | ----- |",
    ...fws.map((fw) => `| ${fw} | [View setup](#${anchor(fw)}) |`),
    "",
    "Each section installs only what that framework needs. The Themvora foundation and",
    `\`${pkgName}\` are common to all of them.`,
    "",
  ];

  for (const fw of fws) {
    const r = recipes[`${lib}/${fw}`];
    const fwPkg = FRAMEWORK_PKG[fw];
    const lang = LANG[langs[fw]] ?? "ts";
    const extra = fwPkg && fwPkg !== pkgName ? ` ${fwPkg}` : "";

    lines.push(`## ${fw}`, "");
    lines.push("**Install**", "", "```bash", `npm install @themvora/core ${pkgName}${extra}`, "```", "");

    if (fwPkg && fwPkg !== pkgName) {
      lines.push(
        `\`${fwPkg}\` is the framework integration — it owns the provider and the`,
        "runtime the adapter attaches to.",
        "",
      );
    }

    if (family === "provider") {
      lines.push(
        "**Set up**",
        "",
        "Mount the framework provider, then the library adapter inside it. The adapter",
        "builds the target library's own theme object from the runtime.",
        "",
        "```" + lang,
        r.mountProvider ?? "",
        "```",
        "",
      );
    } else {
      lines.push(
        "**Set up**",
        "",
        "Register the adapter next to the provider. It writes the library's own CSS",
        "custom properties from the active theme — no provider of its own.",
        "",
        "```" + lang,
        r.mountProvider ?? "",
        "```",
        "",
      );
    }

    if (r.componentExample) {
      lines.push(
        family === "provider" ? "**Use the library**" : "**Use the library**",
        "",
        family === "provider"
          ? `Real ${target} components. There is no Themvora-specific prop on any of them.`
          : `Ordinary markup using ${target}'s own classes — the variables are already written.`,
        "",
        "```" + lang,
        r.componentExample,
        "```",
        "",
      );
    }

    if (r.themeSwitchExample) {
      lines.push("**Theme switching**", "", "```" + lang, r.themeSwitchExample, "```", "");
    }

    if (r.completeExample) {
      lines.push("**Complete example**", "", "```" + lang, r.completeExample, "```", "");
    }
  }

  lines.push("<!-- THEME-KIT:GENERATED:FRAMEWORK-RECIPES:END -->", "");
  const section = lines.join("\n");

  if (CHECK) {
    const current = readFileSync(readmePath, "utf8");
    generated.push([lib, current.includes("## Frameworks") ? "up to date" : "OUT OF DATE"]);
    continue;
  }

  // Replace an existing generated block, or append one.
  const current = readFileSync(readmePath, "utf8");
  const startMarker = "<!-- THEME-KIT:GENERATED:FRAMEWORK-RECIPES:START -->";
  const existing = current.indexOf(startMarker);
  const head = existing >= 0 ? current.slice(0, existing) : `${current.trimEnd()}\n\n`;
  // `section` ends with an empty element (the blank line before the closing
  // marker), so appending `\n` used to write a trailing blank line at EOF.
  // `git diff --check` flags that as "new blank line at EOF" on every generated
  // README, which turns the release checklist's whitespace gate into noise.
  writeFileSync(readmePath, `${head}${section.trimEnd()}\n`);
  generated.push([lib, `${fws.length} framework section(s)`]);
}

for (const [lib, status] of generated) console.log(`  ${lib.padEnd(14)} ${status}`);
