/**
 * Brand reference audit (theme-generation.md Phase 7.5 / Phase 8).
 *
 * Answers, per brand, the questions that decide what may be pinned and what must
 * be derived:
 *
 *   Brand · reference source · official colours? · design-token system?
 *   light/dark reference? · which colours are identity anchors?
 *   which are implementation-specific? · what does Themvora derive?
 *
 * and then prints the **anchor outcome** — whether each anchor survived the
 * contrast solve exactly, or was normalized to stay readable. That last column is
 * the honest answer to "is this the brand's colour?".
 *
 * ## Why it is a separate gate
 *
 * The preset audit checks that every shipped theme satisfies the contract. This
 * one checks something different and prior: that the *provenance* is sound — that
 * every brand value is classified, cited, and either preserved or explicitly
 * normalized. A preset can pass every contrast check while quietly shipping a
 * brand colour nobody chose.
 *
 * Usage:
 *   node scripts/audit-brand-references.mjs
 *   node scripts/audit-brand-references.mjs --json   # machine-readable
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = join(import.meta.dirname, "..");
const AS_JSON = process.argv.includes("--json");

const core = await import(
  pathToFileURL(join(REPO, "packages", "core", "dist", "index.js")).href
);

const { getPresetCatalog } = core;

if (typeof getPresetCatalog !== "function") {
  console.error(
    "packages/core/dist is missing the preset catalog — it is stale or unbuilt.\n" +
      "Rebuild before auditing:  pnpm --filter @themvora/core build",
  );
  process.exit(1);
}

const brands = getPresetCatalog("brand");

/** One row per brand, flattened for printing. */
const rows = brands.map((entry) => {
  const source = entry.brand?.source;
  const colors = source?.colors ?? [];
  const byClass = (value) => colors.filter((color) => color.classification === value);

  const anchors = entry.brand?.anchors ?? { light: [], dark: [] };
  const normalized = entry.brand?.normalized ?? { light: [], dark: [] };

  const pinned = [...anchors.light, ...anchors.dark];
  const moved = [...normalized.light, ...normalized.dark];

  return {
    id: entry.id,
    name: entry.name,
    referenceSource: source?.sourceUrl ?? "(none)",
    sourceKind: source?.kind ?? "(none)",
    hasOfficialColors: colors.some((color) => color.official),
    hasDesignSystem: source?.hasDesignSystem ?? false,
    hasLightDark: source?.hasLightDark ?? false,
    anchors: byClass("ANCHOR").map((color) => color.label),
    implementationSpecific: byClass("IMPLEMENTATION").map((color) => color.label),
    derived: byClass("DERIVED").map((color) => color.label),
    semantic: byClass("SEMANTIC").map((color) => color.label),
    pinnedRoles: pinned.map((anchor) => `${anchor.role}=${anchor.color}`),
    normalized: moved.map((item) => `${item.label} ${item.anchor}→${item.resolved}`),
    quality: `${entry.quality.passed}/${entry.quality.total}`,
    notes: source?.notes ?? [],
  };
});

if (AS_JSON) {
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

const yes = (value) => (value ? "yes" : "no");

console.log("\n=== BRAND REFERENCE AUDIT ===");
console.log(`${rows.length} brand preset(s)\n`);

for (const row of rows) {
  console.log(`${row.name}  (${row.id})`);
  console.log(`  reference source      ${row.referenceSource}`);
  console.log(`  source kind           ${row.sourceKind}`);
  console.log(`  official colours?     ${yes(row.hasOfficialColors)}`);
  console.log(`  design-token system?  ${yes(row.hasDesignSystem)}`);
  console.log(`  light/dark reference? ${yes(row.hasLightDark)}`);
  console.log(`  identity anchors      ${row.anchors.join(", ") || "—"}`);
  console.log(`  implementation-only   ${row.implementationSpecific.join(", ") || "—"}`);
  console.log(`  derived by Themvora  ${row.derived.join(", ") || "—"}`);
  console.log(`  seed-independent      ${row.semantic.join(", ") || "—"}`);
  console.log(`  pinned roles          ${row.pinnedRoles.join(", ") || "—"}`);
  console.log(
    `  anchor outcome        ${row.normalized.length === 0 ? "preserved exactly" : `normalized: ${row.normalized.join(", ")}`}`,
  );
  console.log(`  quality               ${row.quality}`);
  for (const note of row.notes) console.log(`  note: ${note}`);
  console.log("");
}

// -- invariants --------------------------------------------------------------

const failures = [];

for (const row of rows) {
  if (row.sourceKind === "(none)") failures.push(`${row.id}: no brand source declared`);
  if (!row.hasOfficialColors) failures.push(`${row.id}: no official colours recorded`);
  if (row.anchors.length === 0) failures.push(`${row.id}: no ANCHOR classified`);
  if (row.pinnedRoles.length === 0) failures.push(`${row.id}: no anchor is pinned to a role`);
}

const preserved = rows.filter((row) => row.normalized.length === 0).length;
console.log(
  `${rows.length} brands   ${preserved} preserved their anchor exactly   ` +
    `${rows.length - preserved} normalized   ${failures.length} provenance failure(s)`,
);

if (failures.length > 0) {
  console.log("\nEvery brand preset must cite its reference and classify its colours.");
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}

console.log("\nBrand reference audit passed.");
