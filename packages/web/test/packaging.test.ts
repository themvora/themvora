// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Phase 1.1 / 1.3 — packaging contracts.
 *
 * These assertions read the *built* package, so they run only when `dist/` has
 * been produced (`pnpm --filter @themvora/web build`). Everything else in the
 * suite is source-level and runs unconditionally.
 */

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, "..");
const distDir = join(pkgRoot, "dist");
const manifest = JSON.parse(
  readFileSync(join(pkgRoot, "package.json"), "utf8"),
) as {
  exports: Record<string, Record<string, string> | string>;
  files: string[];
};

const hasBuild = existsSync(join(distDir, "index.js"));

describe.skipIf(!hasBuild)("built package", () => {
  it("points every export at a file that exists", () => {
    for (const [subpath, conditions] of Object.entries(manifest.exports)) {
      if (typeof conditions === "string") {
        const file = join(pkgRoot, conditions);
        expect(existsSync(file), `${subpath} (${conditions})`).toBe(true);
        continue;
      }
      for (const [condition, target] of Object.entries(conditions)) {
        const file = join(pkgRoot, target);
        expect(existsSync(file), `${subpath} → ${condition} (${target})`).toBe(true);
      }
    }
  });

  it("ships the standalone browser bundle with no bare imports", () => {
    const cdn = readFileSync(join(distDir, "cdn.js"), "utf8");

    // A browser cannot resolve a bare specifier: everything must be inlined.
    expect(cdn).not.toMatch(/require\(\s*["']@themvora\//);
    expect(cdn).not.toMatch(/from\s*["']@themvora\//);
    expect(cdn).not.toMatch(/import\(\s*["']@themvora\//);

    // It registers the elements and exposes the API.
    expect(cdn).toContain("customElements.define");
    expect(cdn).toContain("ThemvoraWeb");
  });

  it("ships the static boot asset with no bare imports", () => {
    const boot = readFileSync(join(distDir, "boot.js"), "utf8");

    expect(boot).not.toMatch(/require\(\s*["']@themvora\//);
    expect(boot).not.toMatch(/from\s*["']@themvora\//);
    expect(boot).not.toMatch(/import\(\s*["']@themvora\//);
    expect(boot).toContain("__THEMVORA_BOOTSTRAP__");
    expect(manifest.exports["./boot.js"]).toBe("./dist/boot.js");
  });

  it("declares `dist` in the published files", () => {
    expect(manifest.files).toContain("dist");
  });
});

describe("standalone bundle in a browser", () => {
  it("registers the elements when loaded with no module system", () => {
    const file = join(distDir, "cdn.js");
    if (!existsSync(file)) return;

    // A fresh document with a provider already in the markup, then the bundle,
    // exactly as a plain HTML page would load them.
    document.body.innerHTML = `<themvora-provider default-theme="dark"><themvora-toggle></themvora-toggle></themvora-provider>`;

    // eslint-disable-next-line no-new-func
    new Function(readFileSync(file, "utf8"))();

    const el = document.querySelector("themvora-provider") as HTMLElement;
    // The bundle's own runtime marker: the element upgraded, so a runtime is
    // attached under the shared symbol the public helper reads.
    expect(el.querySelector("themvora-toggle > button")).toBeTruthy();
    expect(document.getElementById("themvora-elements-style")).toBeTruthy();
  });
});

describe("editor metadata", () => {
  it("ships the HTML custom-data file", () => {
    expect(manifest.files).toContain("html-data.json");
    expect(existsSync(join(pkgRoot, "html-data.json"))).toBe(true);
  });
});
