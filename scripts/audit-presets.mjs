/**
 * Preset quality gate (theme-generation.md Phase 7.8 / 9).
 *
 * Prints an 8-check scorecard per shipped theme. A single `valid` boolean tells
 * you a preset is broken but not *how*; this tells you which axis moved.
 *
 * ```
 * Default presets
 *   Oat Light            9/9  PASS
 *   ...
 * ```
 *
 * ## What is gated, and what is exempt
 *
 * **Gated:** the default presets, the brand presets, and the neutral baseline.
 * These are all generated from recipes and must satisfy the full contract.
 *
 * **Exempt:** the accessibility profiles. They exist *to* deviate — a
 * high-contrast theme has maximum contrast and zero surface separation by
 * design, and a large-text profile solves text to 3:1 rather than 4.5:1. Auditing
 * them against the normal contract would report the feature as a defect. They are
 * printed for visibility and excluded from the exit code.
 *
 * ## Exit codes
 *
 * - Any `fail` in a gated group → exit 1. This is the normal gate.
 * - `--strict-ui` → warnings are failures too, in gated groups
 *   (theme-generation.md Phase 7.10).
 *
 * Usage:
 *   node scripts/audit-presets.mjs
 *   node scripts/audit-presets.mjs --strict-ui
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = join(import.meta.dirname, "..");
const STRICT = process.argv.includes("--strict-ui") || process.argv.includes("--strict");

const core = await import(
  pathToFileURL(join(REPO, "packages", "core", "dist", "index.js")).href
);

const { getBuiltInThemes, scoreTheme } = core;

if (typeof scoreTheme !== "function" || typeof getBuiltInThemes !== "function") {
  console.error(
    "packages/core/dist is missing the preset scorecard — it is stale or unbuilt.\n" +
      "Rebuild before auditing:  pnpm --filter @themvora/core build",
  );
  process.exit(1);
}

const SNAPSHOT = JSON.parse(
  readFileSync(
    join(REPO, "packages", "core", "test", "__baseline__", "presets.generated.json"),
    "utf8",
  ),
);

const DEFAULT_FAMILIES = new Set(["oat", "berry", "mint", "citrus", "cocoa", "plum", "iris", "sky", "graphite"]);
const BRAND_FAMILIES = new Set(["apple", "github", "vercel", "slack", "discord"]);
/** Deliberately outside the normal contract — see the module docs. */
const EXEMPT_FAMILIES = new Set(["high-contrast", "large-text"]);

function familyOf(name) {
  return name.replace(/-(light|dark)$/, "");
}

/** Compare a shipped theme's tokens against the frozen snapshot. */
function snapshotDrift(theme) {
  const entry = SNAPSHOT.shippedThemes.find((t) => t.name === theme.name);
  if (!entry) return null;
  const colors = theme.tokens?.colors ?? {};
  const drifted = Object.entries(entry.colors).filter(([key, value]) => colors[key] !== value);
  return drifted.length === 0 ? null : drifted.map(([key]) => key);
}

function auditGroup(title, themes, { gated }) {
  console.log(`\n${title}${gated ? "" : "   (exempt from the normal contract)"}`);
  let failed = 0;
  let warned = 0;

  for (const theme of themes) {
    const score = scoreTheme(theme);
    const label = `${theme.meta?.label ?? theme.name}`.padEnd(22);
    const failures = score.checks.filter((check) => check.status === "fail");
    const warnings = score.checks.filter((check) => check.status === "warn");
    const drift = gated ? snapshotDrift(theme) : null;

    const suffix = warnings.length > 0 ? `  warn: ${warnings.map((w) => w.id).join(", ")}` : "";

    if (failures.length === 0 && drift === null) {
      if (warnings.length > 0) warned += 1;
      console.log(`  ${label}${score.passed}/${score.total}  PASS${suffix}`);
      continue;
    }

    const detail = [
      ...failures.map((check) => `${check.id}: ${check.detail ?? "failed"}`),
      ...(drift ? [`snapshot drift: ${drift.join(", ")}`] : []),
    ];

    if (gated) {
      failed += 1;
      console.log(`  ${label}${score.passed}/${score.total}  FAIL  ${detail.slice(0, 2).join("; ")}`);
    } else {
      console.log(`  ${label}${score.passed}/${score.total}  n/a   ${detail.slice(0, 2).join("; ")}`);
    }
  }

  return { failed, warned, total: themes.length };
}

const shipped = getBuiltInThemes();
const familyIn = (set) => (theme) => set.has(familyOf(theme.name));

const gated = [
  auditGroup("Default presets", shipped.filter(familyIn(DEFAULT_FAMILIES)), { gated: true }),
  auditGroup("Brand presets", shipped.filter(familyIn(BRAND_FAMILIES)), { gated: true }),
  auditGroup(
    "Neutral baseline",
    shipped.filter((t) => !DEFAULT_FAMILIES.has(familyOf(t.name)) && !BRAND_FAMILIES.has(familyOf(t.name)) && !EXEMPT_FAMILIES.has(familyOf(t.name))),
    { gated: true },
  ),
];
const exempt = auditGroup("Accessibility profiles", shipped.filter(familyIn(EXEMPT_FAMILIES)), { gated: false });

const failed = gated.reduce((sum, group) => sum + group.failed, 0);
const warned = gated.reduce((sum, group) => sum + group.warned, 0);
const total = gated.reduce((sum, group) => sum + group.total, 0);

console.log(
  `\n${total} gated themes   ${total - failed} pass   ${failed} fail   ${warned} with warnings` +
    `   (+${exempt.total} exempt accessibility profiles)`,
);

if (failed > 0) {
  console.log("\nA shipped theme must not fail its own contract.");
  process.exit(1);
}

if (STRICT && warned > 0) {
  console.log("\n--strict-ui was set: warnings are treated as failures.");
  process.exit(1);
}

console.log("\nPreset audit passed.");
