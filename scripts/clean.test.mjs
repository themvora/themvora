/**
 * Tests for `scripts/clean.mjs`.
 *
 * Run with Node's built-in test runner (no extra dependency):
 *
 * ```bash
 * pnpm test:scripts
 * ```
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { BUILD_OUTPUT_NAMES, cleanBuildOutputs, collectBuildOutputs } from "./clean.mjs";

let root;

/** Create a file (and its parent directories) under the fixture root. */
function write(relativePath, contents = "") {
  const absolute = join(root, relativePath);
  mkdirSync(join(absolute, ".."), { recursive: true });
  writeFileSync(absolute, contents);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "themvora-clean-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("collectBuildOutputs", () => {
  it("finds build output inside a workspace package", () => {
    write("packages/core/package.json", "{}");
    write("packages/core/dist/index.js", "built");
    write("packages/core/src/index.ts", "source");

    const found = collectBuildOutputs(root);

    assert.deepEqual(found, [join(root, "packages", "core", "dist")]);
  });

  it("ignores a build-output name that is not inside a package", () => {
    // A stray `dist` at the repository root has no package.json beside it.
    write("dist/whatever.js", "built");

    assert.deepEqual(collectBuildOutputs(root), []);
  });

  it("ignores directory names outside the allowlist", () => {
    write("packages/core/package.json", "{}");
    write("packages/core/src/index.ts", "source");
    write("packages/core/node_modules/dep/index.js", "dep");

    const found = collectBuildOutputs(root);
    assert.deepEqual(found, []);
    assert.equal(BUILD_OUTPUT_NAMES.has("node_modules"), false);
    assert.equal(BUILD_OUTPUT_NAMES.has("src"), false);
  });

  it("covers the nested workspace layouts", () => {
    for (const layout of [
      "packages/adapters/mui",
      "apps/docs",
      "examples/apps/react",
      "examples/playground",
    ]) {
      write(`${layout}/package.json`, "{}");
      write(`${layout}/dist/out.js`, "built");
    }

    const found = collectBuildOutputs(root);
    assert.equal(found.length, 4);
  });
});

describe("cleanBuildOutputs", () => {
  it("removes build output and preserves source", () => {
    write("packages/core/package.json", "{}");
    write("packages/core/dist/index.js", "built");
    write("packages/core/src/index.ts", "source");
    write("packages/core/README.md", "docs");

    const { removed } = cleanBuildOutputs(root);

    assert.equal(removed.length, 1);
    assert.equal(existsSync(join(root, "packages/core/dist")), false);
    assert.equal(existsSync(join(root, "packages/core/src/index.ts")), true);
    assert.equal(existsSync(join(root, "packages/core/README.md")), true);
  });

  it("never removes untracked files outside a build-output directory", () => {
    write("packages/core/package.json", "{}");
    write("packages/core/scratch/notes.md", "unsaved work");
    write("packages/core/dist/index.js", "built");

    cleanBuildOutputs(root);

    assert.equal(existsSync(join(root, "packages/core/scratch/notes.md")), true);
  });

  it("does not follow a symlinked build directory", () => {
    write("packages/core/package.json", "{}");
    write("outside/keep.txt", "do not delete");
    // A symlinked `dist` pointing outside the package must be left alone.
    try {
      symlinkSync(join(root, "outside"), join(root, "packages/core/dist"));
    } catch {
      // Creating a symlink needs privileges on Windows; the guard is still
      // exercised by the `isSymbolicLink` check below on platforms that allow it.
      return;
    }

    const { removed } = cleanBuildOutputs(root);

    assert.deepEqual(removed, []);
    assert.equal(existsSync(join(root, "outside/keep.txt")), true);
  });

  it("is a no-op with --dry-run", () => {
    write("packages/core/package.json", "{}");
    write("packages/core/dist/index.js", "built");

    const { removed } = cleanBuildOutputs(root, { dryRun: true });

    assert.equal(removed.length, 1);
    assert.equal(existsSync(join(root, "packages/core/dist/index.js")), true);
  });

  it("is idempotent", () => {
    write("packages/core/package.json", "{}");
    write("packages/core/dist/index.js", "built");

    cleanBuildOutputs(root);
    const second = cleanBuildOutputs(root);

    assert.deepEqual(second.removed, []);
  });
});
