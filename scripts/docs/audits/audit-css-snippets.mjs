#!/usr/bin/env node
/**
 * Audit — CSS snippet correctness.
 *
 * Documentation code blocks are strings, so an invalid value such as
 * `gap: 10 px` ships to readers and to the Copy button without any compiler or
 * browser complaint. This audit extracts every CSS snippet from the docs
 * sources (TSX object literals and Markdown fences), then reports numeric
 * values separated from their unit by whitespace.
 *
 * It is intentionally limited to snippets that declare themselves as CSS.
 * Ordinary prose and non-CSS code blocks are never inspected, so a sentence
 * mentioning `10 px` is not a failure.
 *
 * Usage: node scripts/docs/audits/audit-css-snippets.mjs
 */

import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { walk } from "../lib/snippets.mjs";
import {
  extractCssSnippets,
  findInvalidUnitSpacing,
  lineAt,
} from "../lib/css-snippets.mjs";

const URL = fileURLToPath(import.meta.url);
const repoRoot = join(dirname(dirname(dirname(dirname(URL)))));

const SOURCE_DIRS = [
  "apps/docs/app",
  "apps/docs/components",
  "apps/docs/lib",
  "apps/docs/content",
  "packages",
];

const files = [];
for (const dir of SOURCE_DIRS) {
  files.push(...walk(join(repoRoot, dir), [".ts", ".tsx", ".md"]));
}
files.push(join(repoRoot, "README.md"));

const failures = [];
let snippets = 0;

for (const file of [...new Set(files)].sort()) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const snippet of extractCssSnippets(file, content)) {
    snippets += 1;
    for (const issue of findInvalidUnitSpacing(snippet.code)) {
      failures.push({
        file: relative(repoRoot, file),
        line: lineAt(content, snippet.index + issue.offset),
        property: issue.property,
        value: issue.value,
        title: snippet.title,
      });
    }
  }
}

console.log("\n=== AUDIT — CSS SNIPPET CORRECTNESS ===\n");
console.log(`Files scanned:    ${new Set(files).size}`);
console.log(`CSS snippets:     ${snippets}`);
console.log(`Invalid values:   ${failures.length}\n`);

for (const failure of failures) {
  const where = failure.title ? ` (${failure.title})` : "";
  console.log(`  ✗ ${failure.file}:${failure.line}${where}`);
  console.log(
    `      ${failure.property}: ${failure.value.replace(/\s+/g, " ")} — write the number and unit without a space`,
  );
}

if (failures.length) {
  console.log(
    "\nCSS values must not contain whitespace between a number and its unit.\n",
  );
  process.exitCode = 1;
} else {
  console.log("All CSS snippets use valid unit syntax.\n");
}
