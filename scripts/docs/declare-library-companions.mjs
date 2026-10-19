/**
 * Declare the companion component file in each `libraries.tsx` bundle.
 *
 * `check-examples.mjs` check A requires that a `./X` import resolves to a file the
 * same bundle declares — via the snippet's `title:` or a leading `// file.ext`
 * comment. The library bundles have a `quickStart` that imports `./Example` (or
 * `./App`) and a `componentExample` that *is* that file, but the componentExample
 * carried a human caption as its title and no file comment, so the import looked
 * like it reached for a file the reader had to invent.
 *
 * Adding the comment rather than changing the title keeps the caption the docs
 * show while giving the checker the identity it needs.
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "apps/docs/lib/libraries.tsx";
const src = readFileSync(FILE, "utf8");
const lines = src.split("\n");

// Each bundle: find its `quickStart`'s `./X` import, then the `componentExample`
// that follows it, and insert the declaring comment there.
const bundles = [];
lines.forEach((line, index) => {
  const m = line.match(/import \{[^}]*\} from "\.\/([A-Za-z0-9_]+)"/);
  if (m) bundles.push({ name: m[1], at: index });
});

let inserted = 0;
// Work bottom-up so earlier insertions do not shift later indices.
for (const bundle of [...bundles].reverse()) {
  // The componentExample belonging to this bundle is the next one after it.
  const ceIndex = lines.findIndex(
    (line, index) => index > bundle.at && /^\s+componentExample: \{/.test(line),
  );
  if (ceIndex === -1) continue;

  // The `code:` backtick lives within the next few lines.
  let codeIndex = -1;
  for (let i = ceIndex; i < ceIndex + 6 && i < lines.length; i += 1) {
    if (/code: `/.test(lines[i] ?? "")) {
      codeIndex = i;
      break;
    }
  }
  if (codeIndex === -1) continue;

  const line = lines[codeIndex];
  if (/code: `\/\/ /.test(line)) continue; // already declared

  lines[codeIndex] = line.replace("code: `", `code: \`// src/${bundle.name}.tsx\n`);
  inserted += 1;
  console.log(`declared src/${bundle.name}.tsx  (bundle at line ${bundle.at + 1})`);
}

writeFileSync(FILE, lines.join("\n"), "utf8");
console.log(`\n${inserted} declaration(s) inserted.`);
