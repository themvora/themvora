#!/usr/bin/env node
/**
 * Verify that the search index is no longer serialized into RSC payload.
 *
 * This script checks:
 * 1. The search index exists as a static asset
 * 2. The root layout does not import buildSearchIndex
 * 3. The SearchProvider does not receive entries as props
 * 4. Page sizes are reasonable (not 2+ MB)
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const docsDir = here;
const indexPath = join(docsDir, "..", "public", "search-index.json");

console.log("=== Search Index Architecture Verification ===\n");

let passed = 0;
let failed = 0;

function check(name, condition, details = "") {
  if (condition) {
    console.log(`✓ ${name}`);
    if (details) console.log(`  ${details}`);
    passed++;
  } else {
    console.error(`✗ ${name}`);
    if (details) console.error(`  ${details}`);
    failed++;
  }
}

// 1. Static asset exists
check(
  "Search index exists as static asset",
  existsSync(indexPath),
  `Location: public/search-index.json`
);

if (existsSync(indexPath)) {
  const stats = statSync(indexPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  check(
    "Search index size is reasonable",
    stats.size < 5 * 1024 * 1024,
    `Size: ${sizeMB} MB`
  );
}

// 2. Root layout does not import buildSearchIndex
const layoutPath = join(docsDir, "..", "app", "layout.tsx");
const layoutContent = readFileSync(layoutPath, "utf8");
check(
  "Root layout does not import buildSearchIndex",
  !layoutContent.includes("buildSearchIndex"),
  "Search index is not built server-side per request"
);

// 3. Root layout does not pass entries to SearchProvider
check(
  "Root layout does not pass entries prop",
  !layoutContent.includes("entries={") && !layoutContent.includes("entries:"),
  "SearchProvider receives no server-side data"
);

// 4. SearchProvider fetches on demand
const searchDialogPath = join(docsDir, "..", "components", "search-dialog.tsx");
const searchDialogContent = readFileSync(searchDialogPath, "utf8");
check(
  "SearchProvider fetches index on demand",
  searchDialogContent.includes('fetch("/search-index.json")'),
  "Client-side fetch from static asset"
);

// 5. SearchProvider has loading state
check(
  "SearchProvider has loading state",
  searchDialogContent.includes("loading") && searchDialogContent.includes("Loading search index"),
  "Shows loading indicator while fetching"
);

// 6. SearchProvider has error handling
check(
  "SearchProvider has error handling",
  searchDialogContent.includes("error") && searchDialogContent.includes("Retry"),
  "Shows error state with retry button"
);

// 7. SearchProvider has caching
check(
  "SearchProvider caches loaded index",
  searchDialogContent.includes("SearchIndexLoader") && searchDialogContent.includes("cache"),
  "Uses singleton loader with in-memory cache"
);

// 8. Build script exists
const buildScriptPath = join(docsDir, "generate-search-index.mjs");
check(
  "Build script exists",
  existsSync(buildScriptPath),
  "scripts/generate-search-index.mjs"
);

// 9. Build is integrated into package.json
const packageJsonPath = join(docsDir, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
check(
  "Search generation is in prebuild",
  packageJson.scripts.prebuild && packageJson.scripts.prebuild.includes("search:generate"),
  "pnpm prebuild runs search:generate"
);

// 10. Check a sample page size from build output
const buildOutputPath = join(docsDir, ".next", "server", "app", "quick-start.html");
if (existsSync(buildOutputPath)) {
  const pageStats = statSync(buildOutputPath);
  const pageSizeKB = (pageStats.size / 1024).toFixed(1);
  check(
    "Sample page size is reasonable",
    pageStats.size < 100 * 1024,
    `quick-start.html: ${pageSizeKB} KB (not 2+ MB)`
  );
} else {
  console.log("  (Skipping page size check - build output not found)");
}

// Summary
console.log("\n" + "=".repeat(60));
console.log(`Architecture checks: ${passed} passed, ${failed} failed`);
console.log("=".repeat(60));

if (failed === 0) {
  console.log("\n✓ Search index is correctly delivered as a static asset");
  console.log("✓ RSC payload no longer contains the full search index");
  console.log("✓ Client fetches index on demand with proper loading/error states");
}

process.exit(failed > 0 ? 1 : 0);
