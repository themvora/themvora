/**
 * Audit — token usage against the semantic context contract.
 *
 * ## The question
 *
 * `contexts.ts` declares which roles Themvora promises to make readable in which
 * places. This asks the complementary question of the *consumer*: **does the docs
 * site use each role only where it is supported?**
 *
 * The specific case that motivated it: the docs paint `text-primary` onto the
 * canvas in ~130 places. In 11 of 28 shipped theme/mode pairs that text is below
 * AA — worst case 1.42:1 in Slack dark — because `primary` is an action and
 * identity colour, not a reading colour. The contract says so; nothing checked
 * that the consumer agreed.
 *
 * ## Classification, not search-and-replace
 *
 * A blind `text-primary` → `text-foreground` rewrite would be wrong: some uses
 * are legitimately action or identity. Every occurrence is classified by the
 * markup around it:
 *
 * | Class | Meaning | Action |
 * | ----- | ------- | ------ |
 * | `action` | a button, a selected or active control | keep — Class B |
 * | `identity` | a logo, wordmark, icon or gradient | keep, but verify — Class C |
 * | `code` | syntax highlighting on a code surface | keep — not the canvas |
 * | `reading` | text someone reads | **migrate to `foreground`/`mutedForeground`** |
 *
 * The `reading` count is ratcheted against a frozen baseline, so the migration
 * can be burned down without the gate being permanently red — the same pattern
 * `check-examples.mjs` uses.
 *
 * Usage:
 *   node scripts/docs/audits/audit-token-contexts.mjs
 *   node scripts/docs/audits/audit-token-contexts.mjs --update
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REPO = join(import.meta.dirname, "..", "..", "..");
const ROOTS = [join(REPO, "apps", "docs", "app"), join(REPO, "apps", "docs", "components")];
const BASELINE = join(REPO, "docs", "reference", "baselines", "token-context-baseline.json");

const update = process.argv.includes("--update");

/** Roles that are not reading colours, and what they are for. */
const NON_READING = {
  "text-primary": { role: "primary", instead: "foreground" },
  "text-accent": { role: "accent", instead: "foreground" },
  "text-success": { role: "success", instead: "foreground" },
  "text-destructive": { role: "destructive", instead: "foreground" },
};

/**
 * Elements that *are* the control, and so may carry a non-reading role.
 *
 * Classification is by the element that owns the class, not by incidental
 * neighbours. The first version of this used "is `onClick` within six lines?",
 * which classified every `<Link>` sitting inside a component that also had a
 * handler as an action — a link is text someone reads, however it is wired up.
 */
const ACTION_TAGS = new Set(["button", "summary"]);

/**
 * Class-name signals that make an element a control regardless of its tag: a
 * filled or outlined action surface, or an explicitly selected state.
 */
const ACTION_HINTS = [
  /\bbg-primary\b/,
  /\bborder-primary\b/,
  /aria-pressed/,
  /aria-selected/,
  /role="(?:button|tab|option)"/,
  /chip-active/,
  /\bdata-state=/,
  /\bbtn\b/,
];

/** A branch of a ternary is a state, not prose. */
const TERNARY_BRANCH = /^\s*[?:]/m;

/** Syntax highlighting inside a code block sits on a code surface, not the canvas. */
const CODE_HINTS = [/highlightCode/, /<code\b/, /<pre\b/, /CodeBlock/, /syntax/i, /mono\b.*text-primary/];

/**
 * Identity — a logo, wordmark, icon or gradient.
 *
 * Also covers single-glyph status indicators. A `✗` marking "not intended" is an
 * error *indicator*, which `CONTEXT_RESTRICTIONS` names as exactly what
 * `destructive` is for — it is not reading text, and flagging it would push the
 * docs toward a literal palette colour instead of the semantic role.
 */
const IDENTITY_HINTS = [
  /logo/i,
  /wordmark/i,
  /brand/i,
  /gradient/i,
  /<Icon/,
  /icon=/i,
  /hero-orb/,
  />[✓✗!•←→↗]<\/span>/,
  /aria-hidden/,
];

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Classify one occurrence.
 *
 * JSX is multi-line, so the deciding markup is rarely on the same line as the
 * class name — a `<button` opening tag and its `className` are typically several
 * lines apart. The check therefore looks at a window: the line itself, plus the
 * few lines above it, which is where an opening tag lives.
 */
/**
 * The element that owns this class name.
 *
 * JSX is multi-line, so the opening tag is usually a few lines above the
 * `className`. The nearest `<Tag` before the line is the owner.
 */
function ownerTag(window, line) {
  const combined = `${window}\n${line}`;
  const matches = [...combined.matchAll(/<([A-Za-z][\w.-]*)/g)];
  const last = matches[matches.length - 1];
  return last ? last[1] : null;
}

function classify(line, file, window) {
  const context = `${window}\n${line}`;
  const tag = ownerTag(window, line);

  // A button is a control. A link is reading text, whatever handlers it has.
  if (tag && ACTION_TAGS.has(tag)) return "action";
  if (ACTION_HINTS.some((re) => re.test(line))) return "action";
  if (TERNARY_BRANCH.test(line)) return "action";

  if (IDENTITY_HINTS.some((re) => re.test(context)) || IDENTITY_HINTS.some((re) => re.test(file))) {
    return "identity";
  }
  if (CODE_HINTS.some((re) => re.test(context))) return "code";
  return "reading";
}

const occurrences = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");
    const lines = source.split("\n");
    lines.forEach((line, index) => {
      for (const token of Object.keys(NON_READING)) {
        // Match the utility as a whole class, not as a prefix of a longer one.
        if (!new RegExp(`\\b${token}\\b`).test(line)) continue;
        const window = lines.slice(Math.max(0, index - 6), index).join("\n");
        occurrences.push({
          file: relative(REPO, file).replace(/\\/g, "/"),
          line: index + 1,
          token,
          className: classify(line, file, window),
          text: line.trim().slice(0, 110),
        });
      }
    });
  }
}

const byClass = { action: 0, identity: 0, code: 0, reading: 0 };
for (const occurrence of occurrences) byClass[occurrence.className] += 1;

const reading = occurrences.filter((occurrence) => occurrence.className === "reading");
const filesWithReading = new Set(reading.map((occurrence) => occurrence.file)).size;

console.log("\n=== TOKEN CONTEXT AUDIT ===");
console.log(`${occurrences.length} non-reading token use(s) across ${new Set(occurrences.map((o) => o.file)).size} file(s)\n`);
console.log(`  action   ${String(byClass.action).padStart(4)}   kept — a button or selected control`);
console.log(`  identity ${String(byClass.identity).padStart(4)}   kept — logo, icon or gradient`);
console.log(`  code     ${String(byClass.code).padStart(4)}   kept — syntax highlighting on a code surface`);
console.log(`  reading  ${String(byClass.reading).padStart(4)}   migrate — this is text someone reads\n`);

const byToken = {};
for (const occurrence of reading) {
  byToken[occurrence.token] = (byToken[occurrence.token] ?? 0) + 1;
}
for (const [token, count] of Object.entries(byToken).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${token.padEnd(20)} ${String(count).padStart(4)}  ->  ${NON_READING[token].instead}`);
}

console.log(`\n  reading uses span ${filesWithReading} file(s).`);
console.log("  `primary` is an action and identity role; `foreground` is the reading role.");
console.log("  See generation/contexts.ts — CONTEXT_RESTRICTIONS.");

if (update) {
  mkdirSync(join(BASELINE, ".."), { recursive: true });
  writeFileSync(BASELINE, `${JSON.stringify({ reading: byClass.reading, files: filesWithReading }, null, 2)}\n`, "utf8");
  console.log(`\nRe-froze baseline: ${relative(REPO, BASELINE)} — ${byClass.reading} reading use(s).`);
  process.exit(0);
}

const previous = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : null;

if (!previous) {
  console.log(`\nNo baseline yet. Freeze the current debt with --update.`);
  process.exit(0);
}

const delta = byClass.reading - previous.reading;
console.log(`\nbaseline ${previous.reading}  ->  now ${byClass.reading}  (${delta === 0 ? "unchanged" : delta > 0 ? `+${delta}` : delta})`);

if (delta > 0) {
  console.log("\nFAIL — reading-context usage went up. `primary` on the canvas is not a supported context.");
  process.exit(1);
}

console.log(delta < 0 ? "\nOK — reading-context debt is going down." : "\nOK — no new reading-context usage.");
