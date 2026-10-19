import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Phase 8 — the architecture guard.
 *
 * `theme-generation.md` §1: no scattered color math. Every color operation must
 * live in `packages/core/src/color`; presets, adapters, docs and the runtime must
 * not re-implement `lighten()` / `darken()` / `rotateHue()`.
 *
 * This is a grep guard: it fails the suite the moment such a helper reappears in
 * production source. Test files are excluded — a test may legitimately *name* the
 * forbidden helpers in order to assert they are absent.
 */

const REPO = join(import.meta.dirname, "..", "..", "..");

/** Directories that never contain first-party source. */
const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".turbo", "coverage", "test", "tests"]);

function collectSource(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry) || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectSource(full, out);
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** Every production source root in the workspace. */
function productionRoots(): string[] {
  const roots: string[] = [];
  const packagesDir = join(REPO, "packages");

  for (const entry of readdirSync(packagesDir)) {
    const src = join(packagesDir, entry, "src");
    try {
      if (statSync(src).isDirectory()) roots.push(src);
    } catch {
      // package without a src dir
    }
  }

  // The docs app is production source too — it must not grow its own color math.
  for (const sub of ["app", "components", "lib"]) {
    const dir = join(REPO, "apps", "docs", sub);
    try {
      if (statSync(dir).isDirectory()) roots.push(dir);
    } catch {
      // not present
    }
  }

  return roots;
}

/** The helpers the rule forbids outside the color engine. */
const FORBIDDEN = /\b(hexToHsl|hslToHex|lighten|darken|shiftHue|desaturate)\s*\(/;

describe("architecture guard — color math is confined to the engine", () => {
  it("no ad-hoc color manipulation exists outside packages/core/src/color", () => {
    const colorDir = `${join("packages", "core", "src", "color")}${sep}`;
    const offenders: string[] = [];

    for (const root of productionRoots()) {
      for (const file of collectSource(root)) {
        if (file.includes(colorDir)) continue;
        if (FORBIDDEN.test(readFileSync(file, "utf8"))) offenders.push(relative(REPO, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it("actually scans a meaningful amount of source", () => {
    const files = productionRoots().flatMap((root) => collectSource(root));
    expect(files.length).toBeGreaterThan(100);
  });
});
