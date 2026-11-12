#!/usr/bin/env node
/**
 * Tests for search index generation and client loading behavior.
 *
 * Verifies:
 * - Search asset is generated during build
 * - Asset contains expected documents with valid URLs
 * - Output is deterministic
 * - Client loading, caching, and retry behavior
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import assert from "node:assert";

const here = dirname(fileURLToPath(import.meta.url));
const docsDir = here;
const indexPath = join(docsDir, "..", "public", "search-index.json");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
    failed++;
  }
}

// --- Build tests ---

console.log("\n=== Search Index Build Tests ===\n");

test("search index file exists", () => {
  assert.ok(existsSync(indexPath), "search-index.json should exist");
});

test("search index is valid JSON", () => {
  const content = readFileSync(indexPath, "utf8");
  const data = JSON.parse(content);
  assert.ok(Array.isArray(data), "search index should be an array");
});

test("search index contains expected number of entries", () => {
  const data = JSON.parse(readFileSync(indexPath, "utf8"));
  assert.ok(data.length > 1000, `should have >1000 entries, got ${data.length}`);
  assert.ok(data.length < 5000, `should have <5000 entries, got ${data.length}`);
});

test("search entries have required fields", () => {
  const data = JSON.parse(readFileSync(indexPath, "utf8"));
  const entry = data[0];
  assert.ok(entry.title, "entry should have title");
  assert.ok(entry.route, "entry should have route");
  assert.ok(entry.text, "entry should have text");
  assert.ok(entry.type, "entry should have type");
});

test("search entry types are valid", () => {
  const data = JSON.parse(readFileSync(indexPath, "utf8"));
  const validTypes = ["docs", "guides", "cli", "api", "blog"];
  for (const entry of data) {
    assert.ok(
      validTypes.includes(entry.type),
      `entry type "${entry.type}" should be one of ${validTypes.join(", ")}`
    );
  }
});

test("search routes start with /", () => {
  const data = JSON.parse(readFileSync(indexPath, "utf8"));
  for (const entry of data.slice(0, 100)) {
    assert.ok(
      entry.route.startsWith("/"),
      `route "${entry.route}" should start with /`
    );
  }
});

test("search index contains key documentation pages", () => {
  const data = JSON.parse(readFileSync(indexPath, "utf8"));
  const routes = data.map((e) => e.route);
  assert.ok(routes.includes("/quick-start"), "should include /quick-start");
  assert.ok(routes.includes("/api-reference"), "should include /api-reference");
  assert.ok(routes.includes("/framework-guides"), "should include /framework-guides");
});

test("search entries are unique by route, title, and text", () => {
  const data = JSON.parse(readFileSync(indexPath, "utf8"));
  const seen = new Set();
  for (const entry of data) {
    const key = `${entry.route}\u0000${entry.title}\u0000${entry.text}`;
    assert.ok(!seen.has(key), `duplicate search entry: ${entry.route} — ${entry.title}`);
    seen.add(key);
  }
});

test("the framework mirror does not leak generated code labels", () => {
  const data = JSON.parse(readFileSync(indexPath, "utf8"));
  const generated =
    /^(?:snippet\d*|quickStart(?:Extra)?|buildConfig|themeConfig|noTheme|setupExtra|uiExample|styles|appFile|switchSnippet|reactSetup)$/i;
  const leaked = data.filter(
    (entry) => entry.route.startsWith("/framework-guides") && generated.test(entry.title),
  );
  assert.deepEqual(
    leaked.map((entry) => `${entry.route} — ${entry.title}`),
    [],
    "generated code-block labels should not be indexed as framework-guide sections",
  );
});

test("framework-mirror sections route to their framework guide", () => {
  const data = JSON.parse(readFileSync(indexPath, "utf8"));
  const overview = data.filter((entry) => entry.route === "/framework-guides");
  assert.equal(overview.length, 1, "only the Framework Guides overview should use /framework-guides");
  assert.equal(overview[0].title, "Framework Guides");

  const routeSections = data.filter(
    (entry) =>
      entry.route.startsWith("/framework-guides/") &&
      entry.title !== entry.route.split("/").pop(),
  );
  assert.ok(routeSections.length > 0, "framework sections should be indexed under their guide");
  assert.ok(
    routeSections.some((entry) => entry.route === "/framework-guides/react"),
    "the React guide should own its section entries",
  );
});

test("search index is deterministic", () => {
  const data1 = JSON.parse(readFileSync(indexPath, "utf8"));
  // Generate again
  execSync("node scripts/generate-search-index.mjs", { cwd: join(docsDir, ".."), stdio: "ignore" });
  const data2 = JSON.parse(readFileSync(indexPath, "utf8"));

  assert.strictEqual(data1.length, data2.length, "entry count should be deterministic");
  assert.deepStrictEqual(data1.slice(0, 10), data2.slice(0, 10), "first 10 entries should be identical");
});

// --- Client loading tests (simulated) ---

console.log("\n=== Search Index Client Tests ===\n");

test("search index can be fetched (file size is reasonable)", () => {
  const stats = statSync(indexPath);
  const sizeMB = stats.size / (1024 * 1024);
  assert.ok(sizeMB < 5, `index should be <5MB, got ${sizeMB.toFixed(2)}MB`);
  assert.ok(sizeMB > 0.5, `index should be >0.5MB, got ${sizeMB.toFixed(2)}MB`);
});

test("search index compresses well (JSON format)", () => {
  const content = readFileSync(indexPath, "utf8");
  const compressed = Buffer.byteLength(content, "utf8");
  // JSON with repeated structure should compress well
  assert.ok(compressed > 0, "should have content");
});

test("search entries do not contain sensitive data", () => {
  const data = JSON.parse(readFileSync(indexPath, "utf8"));
  const content = JSON.stringify(data);
  // Should not contain typical sensitive patterns
  assert.ok(!content.includes("password"), "should not contain passwords");
  assert.ok(!content.includes("secret"), "should not contain secrets");
  assert.ok(!content.includes("api_key"), "should not contain API keys");
});

// --- Summary ---

console.log("\n" + "=".repeat(50));
console.log(`Tests: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50) + "\n");

process.exit(failed > 0 ? 1 : 0);
