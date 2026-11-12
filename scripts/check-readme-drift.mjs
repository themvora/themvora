#!/usr/bin/env node
/**
 * Verifies that every UI-library adapter README still says what the
 * documentation says.
 *
 * ## What this checks
 *
 *   1. **Staleness** — the README is byte-identical to what the renderer
 *      produces from the canonical data. Catches a hand edit, a recipe change
 *      that was not regenerated, and a stale checkout.
 *   2. **Framework coverage** — the set of `## <framework>` sections equals the
 *      set of recipes the documentation page offers. A framework the page
 *      documents but the README omits fails here, and so does the reverse.
 *   3. **Install command parity** — under every `#### pnpm|npm|yarn|bun`
 *      heading, the commands equal `forManager()` applied to the recipe's own
 *      `install` and `themvora` arrays, in order. This is the check that makes
 *      "the README installs the same thing as the page" a fact rather than an
 *      intention.
 *   4. **Snippet parity** — the code blocks under each framework are, as a
 *      multiset, exactly the canonical files for that framework plus the family
 *      snippet. A dropped block, an invented block, or a block from another
 *      framework all fail.
 *   5. **Links** — every in-page anchor resolves to a heading, every relative
 *      link resolves to a file that exists, and every external link is https.
 *   6. **Hygiene** — no generator markers, no `workspace:*`, no placeholder
 *      text left in a published README.
 *
 * Read-only: it never writes a README. `--fix` regenerates instead.
 *
 * Usage: node scripts/check-readme-drift.mjs
 *        node scripts/check-readme-drift.mjs --fix
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PACKAGE_MANAGERS, forManager } from "../apps/docs/lib/install-commands.ts";
import { familySnippet } from "../apps/docs/lib/family-snippet.ts";
import {
  FRAMEWORK_ORDER,
  REPO,
  canonicalSnippets,
  frameworksOf,
  readLibraries,
  readRecipes,
} from "./readme/canonical.mjs";
import { SLUGS, renderReadme } from "./readme/render.mjs";

if (process.argv.includes("--fix")) {
  execFileSync(process.execPath, [join(REPO, "scripts", "generate-package-readmes.mjs")], {
    cwd: REPO,
    stdio: "inherit",
  });
  process.exit(0);
}

const recipes = readRecipes();
const libraries = readLibraries();

const problems = [];
const fail = (slug, detail) => problems.push(`${slug}: ${detail}`);

/* ==========================================================================
   Parsing.
   ========================================================================== */

/**
 * Reads a README into one entry per framework section: the commands under each
 * package-manager heading, and every non-`bash` code block in order.
 *
 * Fences are tracked with their language so a `bash` block is never mistaken
 * for a snippet — the two are checked against different sources.
 */
function parseReadme(text) {
  const sections = new Map();
  let current = null;
  let manager = null;
  let fence = null;
  let buffer = [];

  for (const line of text.split("\n")) {
    const open = line.match(/^```(\w*)\s*$/);
    if (open) {
      if (fence === null) {
        fence = open[1];
        buffer = [];
        continue;
      }
      if (current) {
        if (fence === "bash") {
          if (manager) {
            current.commands.get(manager).push(...buffer.filter((l) => l.trim()));
          }
        } else {
          current.snippets.push(buffer.join("\n"));
        }
      }
      fence = null;
      buffer = [];
      manager = null;
      continue;
    }

    if (fence !== null) {
      buffer.push(line);
      continue;
    }

    const h2 = line.match(/^## (.+?)\s*$/);
    if (h2) {
      const name = h2[1].trim();
      current = FRAMEWORK_ORDER.includes(name)
        ? { name, commands: new Map(PACKAGE_MANAGERS.map((m) => [m, []])), snippets: [] }
        : null;
      if (current) sections.set(name, current);
      manager = null;
      continue;
    }

    const h4 = line.match(/^#### (pnpm|npm|yarn|bun)\s*$/);
    if (h4) manager = h4[1];
  }

  return sections;
}

/** GitHub's heading anchor, for in-page link checking. */
const anchorOf = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

/** A multiset as a sorted array, so two collections compare directly. */
const multiset = (values) => [...values].sort();

/* ==========================================================================
   Import resolution.
   ========================================================================== */

/** Every `@themvora/*` specifier a README's code blocks import. */
function themvoraImports(text) {
  const found = new Set();
  const patterns = [
    /from\s+"(@themvora\/[^"]+)"/g,
    /from\s+'(@themvora\/[^']+)'/g,
    /import\s+"(@themvora\/[^"]+)"/g,
    /@import\s+"(@themvora\/[^"]+)"/g,
    /require\(\s*"(@themvora\/[^"]+)"\s*\)/g,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) found.add(m[1]);
  }
  return found;
}

/**
 * Whether a specifier names an entry point some published package actually
 * declares in its `exports` map.
 *
 * This is the check that keeps a README from documenting a subpath that was
 * renamed or never shipped: the snippet still reads correctly, so nothing else
 * would notice. A CSS entry (`@themvora/x/x.css`) resolves the same way.
 */
function resolvesToPackageEntry(specifier) {
  const [, name, ...rest] = specifier.split("/");
  const subpath = rest.length ? `./${rest.join("/")}` : ".";

  for (const base of ["packages", join("packages", "adapters")]) {
    const dir = join(REPO, base, name);
    const manifest = join(dir, "package.json");
    if (!existsSync(manifest)) continue;

    const json = JSON.parse(readFileSync(manifest, "utf8"));
    if (json.name !== `@themvora/${name}`) continue;

    const exports = json.exports ?? {};
    return Object.keys(exports).includes(subpath);
  }
  return false;
}

/* ==========================================================================
   Checks.
   ========================================================================== */

const rows = [];

for (const slug of SLUGS) {
  const lib = libraries[slug];
  const dir = join(REPO, "packages", "adapters", slug);
  const readmePath = join(dir, "README.md");
  const expectedFrameworks = frameworksOf(recipes, slug);

  if (!existsSync(readmePath)) {
    fail(slug, "no README");
    continue;
  }

  const text = readFileSync(readmePath, "utf8");

  /* -- 1. staleness ------------------------------------------------------ */

  if (text !== renderReadme(slug)) {
    fail(slug, "out of date — regenerating changes it (run `pnpm docs:sync-library-readmes`)");
  }

  /* -- 6. hygiene -------------------------------------------------------- */

  if (/THEME-KIT:GENERATED/.test(text)) fail(slug, "contains a leftover generator marker");
  if (text.includes("workspace:*")) fail(slug, "contains `workspace:*` in public install copy");
  if (/\bTODO\b|\bFIXME\b|\bLorem ipsum\b/.test(text)) fail(slug, "contains placeholder text");
  if (!text.endsWith("\n")) fail(slug, "does not end with a newline");
  if (/\r\n/.test(text)) fail(slug, "contains CRLF line endings (pinned to LF in .gitattributes)");

  /* -- 2. framework coverage --------------------------------------------- */

  const sections = parseReadme(text);
  const present = [...sections.keys()];

  for (const fw of expectedFrameworks) {
    if (!sections.has(fw)) fail(slug, `no section for ${fw}`);
  }
  for (const fw of present) {
    if (!expectedFrameworks.includes(fw)) {
      fail(slug, `documents ${fw}, which has no recipe on the documentation page`);
    }
  }

  /* -- 3./4. parity per framework ---------------------------------------- */

  let commands = 0;
  let snippets = 0;

  for (const fw of expectedFrameworks) {
    const section = sections.get(fw);
    if (!section) continue;

    const recipe = recipes[`${slug}/${fw}`];
    const canonicalCommands = [...(recipe.install ?? []), ...(recipe.themvora ?? [])];

    for (const manager of PACKAGE_MANAGERS) {
      const expected = canonicalCommands.map((c) => forManager(c, manager));
      const actual = section.commands.get(manager);
      commands += actual.length;
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        fail(
          slug,
          `${fw} / ${manager}: commands differ from the canonical recipe\n` +
            `      expected: ${JSON.stringify(expected)}\n` +
            `      actual:   ${JSON.stringify(actual)}`,
        );
      }
    }

    const expectedSnippets = [
      ...canonicalSnippets(recipes, slug, fw).map((file) => file.code),
      familySnippet(fw),
    ];
    snippets += section.snippets.length;

    if (
      JSON.stringify(multiset(section.snippets)) !==
      JSON.stringify(multiset(expectedSnippets))
    ) {
      const missing = multiset(expectedSnippets);
      for (const code of section.snippets) {
        const at = missing.indexOf(code);
        if (at >= 0) missing.splice(at, 1);
        else {
          fail(slug, `${fw}: a code block is not in the canonical recipe\n      ${code.split("\n")[0]}`);
        }
      }
      for (const code of missing) {
        fail(slug, `${fw}: missing canonical snippet\n      ${code.split("\n")[0]}`);
      }
    }
  }

  /* -- 5. links ---------------------------------------------------------- */

  const headings = new Set(
    [...text.matchAll(/^#{1,6} (.+?)\s*$/gm)].map((m) => anchorOf(m[1])),
  );

  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const href = m[1];

    if (href.startsWith("#")) {
      if (!headings.has(href.slice(1))) fail(slug, `in-page link ${href} has no heading`);
      continue;
    }
    if (/^https:\/\//.test(href)) continue;
    if (/^http:\/\//.test(href)) {
      fail(slug, `insecure external link ${href}`);
      continue;
    }
    const target = join(dir, href.replace(/^\.\//, ""));
    if (!existsSync(target)) {
      fail(slug, `relative link ${href} does not resolve to a packaged file`);
    }
  }

  /* -- 7. imports name real package entries ------------------------------ */

  for (const specifier of themvoraImports(text)) {
    if (!resolvesToPackageEntry(specifier)) {
      fail(slug, `imports ${specifier}, which no published package exports`);
    }
  }

  rows.push({
    slug,
    name: lib.name,
    frameworks: expectedFrameworks.length,
    commands,
    snippets,
    bytes: text.length,
  });
}

/* ==========================================================================
   Report.
   ========================================================================== */

console.log("library          frameworks  install lines  code blocks  size");
console.log("-".repeat(64));
for (const r of rows) {
  console.log(
    r.slug.padEnd(17) +
      String(r.frameworks).padEnd(12) +
      String(r.commands).padEnd(15) +
      String(r.snippets).padEnd(13) +
      `${Math.round(r.bytes / 1024)} KB`,
  );
}

const totalFrameworks = rows.reduce((n, r) => n + r.frameworks, 0);
console.log("");
console.log(
  `${rows.length} READMEs, ${totalFrameworks} library/framework sections, ` +
    `${rows.reduce((n, r) => n + r.commands, 0)} install lines, ` +
    `${rows.reduce((n, r) => n + r.snippets, 0)} code blocks.`,
);

if (problems.length) {
  console.log(`\nFAIL  ${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  console.log("\nrun with --fix to regenerate");
  process.exit(1);
}

console.log(
  `\nPASS  every README matches the canonical recipe source ` +
    `(apps/docs/lib/libraries.tsx → FRAMEWORK_RECIPES).`,
);
process.exit(0);
