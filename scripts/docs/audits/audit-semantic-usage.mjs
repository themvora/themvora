/**
 * Audit — semantic usage in the docs' shared primitives.
 *
 * ## What this adds over `audit-token-contexts.mjs`
 *
 * The two audits answer different questions and both are needed:
 *
 * - `audit-token-contexts.mjs` looks at **call sites** — is a non-reading role
 *   painted onto a reading element anywhere in the app? Ratcheted, because there
 *   is real debt to burn down.
 * - this looks at the **shared primitives** — does each one use only the roles its
 *   declared intent allows? Not ratcheted, because there should be nothing to
 *   burn down: these are 25 files that every page depends on.
 *
 * The distinction matters because a primitive is where a mistake multiplies. A
 * wrong role in `hero.tsx` is one bad heading; the same role in `badge.tsx` is
 * every badge on the site.
 *
 * ## The default is strict
 *
 * A component with no declared intent is treated as `reading` — no brand or
 * status role at all. That way a new primitive is safe until someone deliberately
 * declares otherwise, rather than unsafe until someone notices.
 *
 * Usage:
 *   node scripts/docs/audits/audit-semantic-usage.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "..", "..", "..");
const UI_DIR = join(REPO, "apps", "docs", "components", "ui");

/** What kind of thing a primitive is. Unlisted components default to `reading`. */
const INTENT = {
  // Controls: a surface the user acts on.
  "button.tsx": "control",
  "scroll-to-top.tsx": "control",
  "select.tsx": "control",
  "copy-button.tsx": "control",
  "use-click-outside.ts": "decoration",
  "use-focus-trap.ts": "decoration",
  "use-scroll-to-on-change.ts": "decoration",
  // Brand: the mark may carry the identity colour.
  "logo.tsx": "brand",
  // Status: these communicate a state, so status roles are the point.
  "support-badge.tsx": "status",
  "version-badge.tsx": "status",
  "callout.tsx": "status",
  "compatibility-table.tsx": "status",
  "token-reference.tsx": "status",
  "api-symbol.tsx": "status",
  // Everything else is reading text, or chrome around it.
};

/**
 * Roles that carry **meaning**.
 *
 * Only these are checked. Surface and structure roles — `muted`, `card`,
 * `popover`, `border`, `input`, `ring`, `background` — are neutral chrome and
 * legitimate almost anywhere; checking them produces noise, not findings. (The
 * first version of this audit allowed a `reading` component *no* roles at all,
 * and reported 59 violations that were all `border` and `muted`.)
 */
const CONTENT_ROLES = [
  "primary", "primaryForeground",
  "secondary", "secondaryForeground",
  "accent", "accentForeground",
  "success", "successForeground",
  "destructive", "destructiveForeground",
  "foreground", "mutedForeground", "cardForeground", "popoverForeground",
];

/** The content roles each intent may use. `null` means "anything". */
const ALLOWED = {
  // Reading text: the reading colours, and nothing that carries brand or status.
  reading: ["foreground", "mutedForeground", "cardForeground", "popoverForeground"],
  // A surface the user acts on: everything is fair game.
  control: CONTENT_ROLES,
  // The mark may carry the identity colour; the text beside it may not.
  brand: ["primary", "primaryForeground", "foreground", "mutedForeground"],
  // These exist to communicate a state.
  status: [
    "success", "successForeground", "destructive", "destructiveForeground",
    "foreground", "mutedForeground",
  ],
  decoration: null,
};

/** Every semantic role a utility class can name. */
const ROLES = [
  ...CONTENT_ROLES,
  "muted", "card", "popover", "border", "input", "ring", "background",
];

const UTILITY = new RegExp(
  `\\b(?:text|bg|border|ring|fill|stroke|from|to|via|decoration|shadow|outline|divide|placeholder)-(${ROLES.join("|")})\\b`,
  "g",
);

const files = readdirSync(UI_DIR).filter((name) => /\.tsx?$/.test(name));
const findings = [];

for (const name of files) {
  const intent = INTENT[name] ?? "reading";
  const allowed = ALLOWED[intent];
  if (allowed === null) continue;

  const source = readFileSync(join(UI_DIR, name), "utf8");
  const lines = source.split("\n");

  lines.forEach((line, index) => {
    // Comments explain the rule; they do not violate it.
    const trimmed = line.trim();
    if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) return;

    for (const match of line.matchAll(UTILITY)) {
      const role = match[1];
      // Neutral chrome is not a semantic statement; only content roles are.
      if (!CONTENT_ROLES.includes(role)) continue;
      if (allowed.includes(role)) continue;
      findings.push({
        file: `components/ui/${name}`,
        line: index + 1,
        intent,
        role,
        text: trimmed.slice(0, 96),
      });
    }
  });
}

// -- a specific regression guard ---------------------------------------------
// The wordmark used to be a `primary` gradient clipped to the glyphs. In Slack
// dark that put the product's own name on the canvas at 1.42:1. It is text;
// text is `foreground`.
const logo = readFileSync(join(UI_DIR, "logo.tsx"), "utf8");
const wordmarkIsBrand = /WebkitTextFillColor:\s*"transparent"/.test(logo) ||
  /color:\s*"var\(--theme-color-primary\)"/.test(logo);

console.log("\n=== SEMANTIC USAGE AUDIT (shared primitives) ===");
console.log(`${files.length} primitive(s) checked\n`);

if (findings.length === 0 && !wordmarkIsBrand) {
  console.log("  ✓ every primitive uses only the roles its intent allows");
  console.log("  ✓ the logo wordmark is a reading colour, not the brand fill");
  console.log("\nOK — no semantic misuse in the shared primitives.\n");
  process.exit(0);
}

for (const finding of findings) {
  console.log(`  ✗ ${finding.file}:${finding.line}  [${finding.intent}]  ${finding.role}`);
  console.log(`      ${finding.text}`);
}

if (wordmarkIsBrand) {
  console.log("  ✗ components/ui/logo.tsx — the wordmark is brand-filled");
  console.log("      A wordmark is text. Use `foreground`; keep the brand in the mark.");
}

console.log(`\nFAIL — ${findings.length + (wordmarkIsBrand ? 1 : 0)} finding(s).\n`);
process.exit(1);
