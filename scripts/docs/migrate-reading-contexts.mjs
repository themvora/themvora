/**
 * One-off migration: reading-context token uses → `foreground`.
 *
 * Uses the *same* classifier as `audit-token-contexts.mjs`, so it only rewrites
 * sites the audit calls `reading`. Action, identity and code sites are left
 * exactly as they are.
 *
 * The rule it applies:
 *
 *   text-primary  →  text-foreground
 *
 * and, where the element relied on colour alone to look interactive (it has
 * `hover:underline` but not `underline`), it adds a permanent underline so the
 * affordance survives without depending on a colour that is not guaranteed to be
 * readable on the canvas.
 *
 * Run with `--write` to apply. Without it, prints the plan.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// This script lives at scripts/docs/, so the repo root is two levels up.
const REPO = join(import.meta.dirname, "..", "..");
const ROOTS = [join(REPO, "apps", "docs", "app"), join(REPO, "apps", "docs", "components")];
const WRITE = process.argv.includes("--write");

// Kept in step with `audit-token-contexts.mjs`. Classification is by the element
// that *owns* the class name: a `<button>` is a control, a `<Link>` is text
// someone reads however it is wired up. An earlier version asked "is `onClick`
// within six lines?", which counted every link inside a component that happened
// to have a handler as an action.
const ACTION_TAGS = new Set(["button", "summary"]);
const ACTION_HINTS = [
  /\bbg-primary\b/, /\bborder-primary\b/, /aria-pressed/, /aria-selected/,
  /role="(?:button|tab|option)"/, /chip-active/, /\bdata-state=/, /\bbtn\b/,
];
const TERNARY_BRANCH = /^\s*[?:]/m;
const CODE_HINTS = [/highlightCode/, /<code\b/, /<pre\b/, /CodeBlock/, /syntax/i, /mono\b.*text-primary/];
const IDENTITY_HINTS = [
  /logo/i, /wordmark/i, /brand/i, /gradient/i, /<Icon/, /icon=/i, /hero-orb/,
  />[✓✗!•←→↗]<\/span>/, /aria-hidden/,
];

const READING_TOKENS = { "text-primary": "text-foreground", "text-success": "text-foreground", "text-destructive": "text-foreground" };

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function ownerTag(window, line) {
  const matches = [...`${window}\n${line}`.matchAll(/<([A-Za-z][\w.-]*)/g)];
  const last = matches[matches.length - 1];
  return last ? last[1] : null;
}

function classify(line, file, window) {
  const context = `${window}\n${line}`;
  const tag = ownerTag(window, line);

  if (tag && ACTION_TAGS.has(tag)) return "action";
  if (ACTION_HINTS.some((re) => re.test(line))) return "action";
  if (TERNARY_BRANCH.test(line)) return "action";

  if (IDENTITY_HINTS.some((re) => re.test(context)) || IDENTITY_HINTS.some((re) => re.test(file))) return "identity";
  if (CODE_HINTS.some((re) => re.test(context))) return "code";
  return "reading";
}

let changedFiles = 0;
let changedLines = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const lines = readFileSync(file, "utf8").split("\n");
    let dirty = false;

    const next = lines.map((line, index) => {
      if (!/text-(primary|success|destructive)\b/.test(line)) return line;
      const window = lines.slice(Math.max(0, index - 6), index).join("\n");
      if (classify(line, file, window) !== "reading") return line;

      let out = line;
      for (const [from, to] of Object.entries(READING_TOKENS)) {
        out = out.replace(new RegExp(`\\b${from}\\b`, "g"), to);
      }

      // Colour was doing the affordance work. Keep a link looking like a link
      // once the colour is gone.
      if (/hover:underline/.test(out) && !/(?:^|[\s"'])underline(?:[\s"']|$)/.test(out)) {
        out = out.replace(/hover:underline/, "underline hover:decoration-foreground");
      }

      if (out !== line) {
        dirty = true;
        changedLines += 1;
      }
      return out;
    });

    if (dirty) {
      changedFiles += 1;
      if (WRITE) writeFileSync(file, next.join("\n"), "utf8");
      console.log(`${WRITE ? "wrote" : "would write"} ${relative(REPO, file).replace(/\\/g, "/")}`);
    }
  }
}

console.log(`\n${changedLines} line(s) across ${changedFiles} file(s)${WRITE ? "" : " (dry run — pass --write)"}`);
