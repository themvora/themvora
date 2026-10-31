/**
 * Tests for `scripts/release/audit-production.mjs`.
 *
 * The point of the script is its *decision*: an advisory inside the published
 * runtime closure fails the build, an advisory anywhere else does not. Both
 * halves are asserted here by replaying a synthetic audit payload through the
 * real script, so the exit code — not just a helper — is what is checked.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { shippedRuntimeClosure } from "./audit-production.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "audit-production.mjs");
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

let workDir;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "themvora-audit-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

/** Write an audit payload and run the script against it. */
function runWith(payload, extraArgs = []) {
  const file = join(workDir, "audit.json");
  writeFileSync(file, JSON.stringify(payload));
  try {
    const stdout = execFileSync(
      process.execPath,
      [SCRIPT, `--audit-json=${file}`, ...extraArgs],
      { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { status: 0, stdout };
  } catch (error) {
    return { status: error.status ?? 1, stdout: error.stdout?.toString() ?? "" };
  }
}

/** One advisory for `module` at `severity`. */
function advisory(id, module, severity, version = "1.0.0") {
  return {
    advisories: {
      [id]: {
        id,
        module_name: module,
        severity,
        title: `${module} test advisory`,
        patched_versions: ">=9.9.9",
        url: `https://example.test/${module}`,
        findings: [
          {
            version,
            paths: [`examples__apps__fixture>${module}`],
            dev: false,
            optional: false,
            bundled: false,
          },
        ],
      },
    },
  };
}

describe("shippedRuntimeClosure", () => {
  it("contains only external runtime dependencies of the published packages", () => {
    const closure = shippedRuntimeClosure(REPO_ROOT);

    // Angular is the one package with a third-party runtime dependency.
    assert.equal(closure.has("tslib"), true);
    // Framework packages are peers, not runtime dependencies.
    assert.equal(closure.has("next"), false);
    assert.equal(closure.has("astro"), false);
    assert.equal(closure.has("nuxt"), false);
    // Dev tooling is not runtime.
    assert.equal(closure.has("vitest"), false);
    assert.equal(closure.has("jsdom"), false);
    // Internal workspace links are not installable packages.
    for (const name of closure.keys()) {
      assert.equal(name.startsWith("@themvora/"), false);
    }
  });
});

describe("exit code", () => {
  it("passes when every advisory is outside the published surface", () => {
    const result = runWith(advisory("1", "astro", "critical", "5.18.2"));

    assert.equal(result.status, 0);
    assert.match(result.stdout, /no advisories in the published runtime closure/);
    assert.match(result.stdout, /Outside the published surface/);
  });

  it("fails when a shipped runtime dependency has an advisory", () => {
    const result = runWith(advisory("1", "tslib", "high", "2.8.0"));

    assert.equal(result.status, 1);
    assert.match(result.stdout, /1 advisory\(ies\) in the published runtime closure/);
    assert.match(result.stdout, /tslib@2\.8\.0/);
  });

  it("fails at the default threshold even for a low-severity shipped advisory", () => {
    const result = runWith(advisory("1", "tslib", "low", "2.8.0"));

    assert.equal(result.status, 1);
  });

  it("respects --fail-on", () => {
    const low = runWith(advisory("1", "tslib", "low", "2.8.0"), ["--fail-on=moderate"]);
    assert.equal(low.status, 0);

    const high = runWith(advisory("1", "tslib", "high", "2.8.0"), ["--fail-on=critical"]);
    assert.equal(high.status, 0);

    const critical = runWith(advisory("1", "tslib", "critical", "2.8.0"), [
      "--fail-on=critical",
    ]);
    assert.equal(critical.status, 1);
  });

  it("reports a clean tree", () => {
    const result = runWith({ advisories: {} });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /no advisories in the published runtime closure/);
  });
});
