/**
 * Regression coverage for Audit C's rules (`scripts/docs/lib/example-audit.mjs`).
 *
 * The audit went green while the entire example inventory was missing: the
 * structural rules are vacuously true with nothing to check, and the coverage
 * rule only reported a symptom per capability. So these tests are written from
 * the failure modes that let that happen, not from the happy path:
 *
 *   - a valid inventory passes (the rules are not simply always-red),
 *   - each real violation fails, and fails with a detail that names it,
 *   - an empty inventory and a missing inventory both fail, and fail *once*
 *     with a message about the inventory rather than once per capability,
 *   - the inventory depends on nothing but `example.meta.json` plus the files it
 *     declares — no package.json, no README, no tsconfig, no legacy sidecar,
 *   - deleting the metadata (the 2.0.0 state) cannot read as clean.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { auditExamples, CONTRACT } from "../lib/example-audit.mjs";

/**
 * A minimal classification: one package, one entrypoint, two public symbols and
 * one that is deliberately internal.
 */
const CLASSIFICATION = {
  $meta: { skippedEntrypoints: [] },
  "@themvora/core": {
    ".": { defineTheme: "CORE_PUBLIC", resolveThemeName: "CORE_PUBLIC", helper: "INTERNAL" },
    "./vite": { themvoraVitePlugin: "CORE_PUBLIC" },
  },
};

const SLUGS = ["themes"];

/** Write one example tree. `meta` is written verbatim; `files` are created empty. */
function writeExample(root, dir, meta, files = ["src/example.ts"]) {
  const abs = join(root, dir);
  mkdirSync(join(abs, "src"), { recursive: true });
  for (const f of files) {
    const p = join(abs, f);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, "// fixture\n", "utf8");
  }
  writeFileSync(join(abs, "example.meta.json"), JSON.stringify(meta, null, 2), "utf8");
  return abs;
}

/** The meta a well-formed example would carry. */
function validMeta(overrides = {}) {
  return {
    feature: "themes",
    framework: "core",
    packages: ["@themvora/core"],
    files: ["src/example.ts"],
    entry: "src/example.ts",
    expectedExportsUsed: ["defineTheme"],
    ...overrides,
  };
}

/** Run the audit against a tree. */
function audit(examplesRoot, capabilitySlugs = SLUGS) {
  return auditExamples({ examplesRoot, classification: CLASSIFICATION, capabilitySlugs });
}

let scratch;
before(() => {
  scratch = mkdtempSync(join(tmpdir(), "themvora-audit-c-"));
});
after(() => {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
});

/** A fresh, empty inventory root per test. */
let counter = 0;
function freshRoot() {
  const root = join(scratch, `inv-${++counter}`);
  mkdirSync(root, { recursive: true });
  return root;
}

describe("a valid inventory", () => {
  it("passes, and reports full coverage", () => {
    const root = freshRoot();
    writeExample(root, "themes/core", validMeta());

    const result = audit(root);

    assert.equal(result.metas.length, 1);
    assert.deepEqual(result.failures, []);
    assert.deepEqual(result.coverage, { total: 1, covered: 1, uncovered: [] });
  });

  it("accepts a subpath entrypoint such as @themvora/core/vite", () => {
    const root = freshRoot();
    writeExample(
      root,
      "themes/core",
      validMeta({ packages: ["@themvora/core/vite"], expectedExportsUsed: ["themvoraVitePlugin"] }),
    );

    assert.deepEqual(audit(root).failures, []);
  });

  it("accepts extra examples that are not themselves capabilities", () => {
    const root = freshRoot();
    writeExample(root, "themes/core", validMeta());
    writeExample(root, "basic-theme/react", validMeta({ feature: "basic-theme", framework: "react" }));

    const result = audit(root);
    assert.deepEqual(result.failures, []);
    assert.equal(result.coverage.covered, 1);
  });
});

describe("a real violation fails", () => {
  it("when `entry` is not listed in `files`", () => {
    const root = freshRoot();
    writeExample(root, "themes/core", validMeta({ entry: "src/other.ts" }));

    const [failure] = audit(root).failures;
    assert.ok(failure, "expected a failure");
    assert.equal(failure.symbol, "src/other.ts");
    assert.match(failure.detail, /`entry` not listed in `files`/);
  });

  it("when a declared file does not exist", () => {
    const root = freshRoot();
    writeExample(root, "themes/core", validMeta({ files: ["src/example.ts", "src/missing.ts"] }));

    const failure = audit(root).failures.find((f) => f.symbol === "src/missing.ts");
    assert.ok(failure, "expected a failure for the missing file");
    assert.match(failure.detail, /declared file does not exist/);
  });

  it("when a declared package is not shipped", () => {
    const root = freshRoot();
    writeExample(root, "themes/core", validMeta({ packages: ["@themvora/nope"] }));

    const failure = audit(root).failures.find((f) => f.symbol === "@themvora/nope");
    assert.ok(failure, "expected a failure for the unknown package");
    assert.match(failure.detail, /not a shipped entrypoint/);
  });

  it("when `expectedExportsUsed` names a symbol the package does not export", () => {
    const root = freshRoot();
    writeExample(root, "themes/core", validMeta({ expectedExportsUsed: ["defineTheme", "inventedApi"] }));

    const failure = audit(root).failures.find((f) => f.symbol === "inventedApi");
    assert.ok(failure, "expected a failure for the invented symbol");
    assert.match(failure.detail, /is exported by none of/);
  });

  it("when `expectedExportsUsed` names an INTERNAL symbol", () => {
    const root = freshRoot();
    writeExample(root, "themes/core", validMeta({ expectedExportsUsed: ["helper"] }));

    const failure = audit(root).failures.find((f) => f.symbol === "helper");
    assert.ok(failure, "an INTERNAL symbol is not a public surface");
    assert.match(failure.detail, /is exported by none of/);
  });

  it("when the meta is not valid JSON", () => {
    const root = freshRoot();
    const abs = writeExample(root, "themes/core", validMeta());
    writeFileSync(join(abs, "example.meta.json"), "{ not json", "utf8");

    const failure = audit(root).failures.find((f) => f.symbol === "(meta)");
    assert.ok(failure, "expected a parse failure");
    assert.match(failure.detail, /unparsable JSON/);
  });

  it("when a capability has no example (§13 coverage)", () => {
    const root = freshRoot();
    writeExample(root, "themes/core", validMeta());

    const result = audit(root, ["themes", "persistence"]);
    const failure = result.failures.find((f) => f.symbol === "persistence");
    assert.ok(failure, "expected a coverage failure");
    assert.equal(failure.file, "(coverage)");
    assert.match(failure.detail, /has no example under examples\/\*\*/);
    assert.deepEqual(result.coverage.uncovered, ["persistence"]);
  });
});

describe("an empty or missing inventory cannot mislead", () => {
  it("fails once when the directory exists but holds no metadata", () => {
    const root = freshRoot();
    // An `examples/` tree that exists, has content, but carries no metadata.
    mkdirSync(join(root, "themes", "core", "src"), { recursive: true });
    writeFileSync(join(root, "themes", "core", "src", "example.ts"), "// no meta\n", "utf8");

    const result = audit(root, ["themes", "persistence"]);

    assert.equal(result.metas.length, 0);
    assert.equal(result.failures.length, 1, "the cause must not be buried under a per-capability cascade");
    assert.equal(result.failures[0].symbol, "(inventory)");
    assert.match(result.failures[0].detail, /empty inventory cannot be distinguished from a broken collector/);
    assert.equal(result.coverage, null, "coverage is meaningless without an inventory");
  });

  it("fails when examples/ does not exist at all", () => {
    const root = join(scratch, "does-not-exist");

    const result = audit(root, ["themes"]);

    assert.equal(result.metas.length, 0);
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].symbol, "(inventory)");
    assert.match(result.failures[0].detail, /examples\/ does not exist/);
    assert.equal(result.coverage, null);
  });

  it("does not pass when the metadata is deleted but the sources remain", () => {
    // The 2.0.0 state: real example sources on disk, no example.meta.json.
    const root = freshRoot();
    mkdirSync(join(root, "themes", "core", "src"), { recursive: true });
    writeFileSync(join(root, "themes", "core", "src", "example.ts"), "// real source\n", "utf8");

    const result = audit(root, ["themes"]);
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].symbol, "(inventory)");
  });
});

describe("the inventory has no hidden dependencies", () => {
  it("passes with only example.meta.json and the files it declares", () => {
    const root = freshRoot();
    const abs = writeExample(root, "themes/core", validMeta());

    // Deliberately no package.json, no tsconfig.json, no README, no index.html.
    assert.deepEqual(readdirSync(abs).sort(), ["example.meta.json", "src"]);

    assert.deepEqual(audit(root).failures, []);
  });

  it("does not require a sidecar the 2.0.0 rename removed", () => {
    // A tree that only has the metadata contract must behave identically to one
    // that also carries unrelated files: nothing outside `example.meta.json` is
    // consulted, so a removed convention cannot silently become a dependency.
    const bare = freshRoot();
    writeExample(bare, "themes/core", validMeta());

    const decorated = freshRoot();
    const abs = writeExample(decorated, "themes/core", validMeta());
    writeFileSync(join(abs, "package.json"), JSON.stringify({ name: "@themvora/example-themes" }), "utf8");
    writeFileSync(join(abs, "README.md"), "# example\n", "utf8");

    assert.deepEqual(audit(bare).failures, audit(decorated).failures);
  });
});

describe("an inventory version control cannot see", () => {
  it("fails when the metadata is git-ignored", () => {
    const root = freshRoot();
    writeExample(root, "themes/core", validMeta());

    const result = auditExamples({
      examplesRoot: root,
      classification: CLASSIFICATION,
      capabilitySlugs: SLUGS,
      isIgnored: () => true,
    });

    const failure = result.failures.find((f) => f.symbol === "(git)");
    assert.ok(failure, "an ignored inventory is invisible to a fresh clone");
    assert.match(failure.detail, /git-ignored/);
  });

  it("passes when the metadata is tracked, and when the caller cannot tell", () => {
    const root = freshRoot();
    writeExample(root, "themes/core", validMeta());

    const tracked = auditExamples({
      examplesRoot: root,
      classification: CLASSIFICATION,
      capabilitySlugs: SLUGS,
      isIgnored: () => false,
    });
    assert.deepEqual(tracked.failures, []);

    // No `isIgnored` at all: a host without git must not fail the audit.
    assert.deepEqual(audit(root).failures, []);
  });
});

describe("failures are explained", () => {
  it("every failure carries the contract and a detail that names the problem", () => {
    const root = freshRoot();
    writeExample(
      root,
      "themes/core",
      validMeta({
        entry: "src/other.ts",
        files: ["src/example.ts", "src/missing.ts"],
        packages: ["@themvora/nope"],
        expectedExportsUsed: ["inventedApi"],
      }),
    );

    const { failures } = audit(root, ["themes", "persistence"]);

    assert.ok(failures.length >= 4);
    for (const f of failures) {
      assert.equal(f.contract, CONTRACT);
      assert.equal(typeof f.detail, "string");
      assert.ok(f.detail.length > 0, `empty detail for ${f.symbol}`);
      assert.equal(typeof f.file, "string");
      assert.equal(typeof f.symbol, "string");
    }
  });
});
