/**
 * Project profile detection.
 *
 * The cases that matter are the ones where a naive rule gives a confident wrong
 * answer: a Nuxt project also depends on `vue`, an Astro project may depend on
 * `react`, and a declared package is not an installed one.
 */

import { describe, expect, it } from "vitest";

import { readProjectProfile } from "../src/domain/projectProfile";

/** A manifest with the given dependencies. */
function manifest(deps: Record<string, string>, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ name: "app", dependencies: deps, ...extra });
}

/** No resolved versions. */
const NONE = new Map<string, string>();

describe("framework detection", () => {
  it("prefers a meta-framework over the view library it builds on", () => {
    // Nuxt depends on vue; reporting "Vue" would send the user to the wrong docs.
    const profile = readProjectProfile(manifest({ nuxt: "^3.0.0", vue: "^3.4.0" }), [], NONE);

    expect(profile.framework).toBe("nuxt");
    expect(profile.frameworkEvidence).toContain("nuxt");
  });

  it("detects Next from a dependency", () => {
    expect(readProjectProfile(manifest({ next: "^15.0.0", react: "^19.0.0" }), [], NONE).framework).toBe("next");
  });

  it("falls back to a config file when the dependency is absent", () => {
    const profile = readProjectProfile(manifest({ react: "^19.0.0" }), ["astro.config.mjs"], NONE);

    expect(profile.framework).toBe("astro");
    expect(profile.frameworkEvidence).toContain("astro.config");
  });

  it("does not call a Vite project Solid", () => {
    // Regression: `vite.config.ts` was listed as Solid evidence, so every Vite
    // React project was reported as Solid. Vite is a bundler, not a framework.
    const profile = readProjectProfile(
      manifest({ react: "^19.0.0", "react-dom": "^19.0.0", vite: "^8.0.0" }),
      ["vite.config.ts"],
      NONE,
    );

    expect(profile.framework).toBe("react");
  });

  it("prefers a Themvora integration package over a shared dependency", () => {
    // `@themvora/react` names the framework outright; `react` alone would also
    // match a Next project, and `vue` would match Nuxt.
    const profile = readProjectProfile(
      manifest({ "@themvora/react": "^1.3.1", react: "^19.0.0", vue: "^3.4.0" }),
      [],
      NONE,
    );

    expect(profile.framework).toBe("react");
    expect(profile.frameworkEvidence).toContain("@themvora/react");
  });

  it("still detects Solid from its own package", () => {
    expect(readProjectProfile(manifest({ "@themvora/solid": "^1.0.0" }), [], NONE).framework).toBe("solid");
  });

  it("says unknown rather than guessing", () => {
    const profile = readProjectProfile(manifest({ left: "^1.0.0" }), ["README.md"], NONE);

    expect(profile.framework).toBe("unknown");
    expect(profile.frameworkEvidence).toContain("no framework");
  });

  it("survives a missing manifest", () => {
    expect(readProjectProfile(null, [], NONE).framework).toBe("unknown");
  });
});

describe("package manager detection", () => {
  it("trusts the packageManager field over a lockfile", () => {
    const profile = readProjectProfile(
      manifest({}, { packageManager: "pnpm@9.0.0" }),
      ["package-lock.json"],
      NONE,
    );

    expect(profile.packageManager).toBe("pnpm");
    expect(profile.packageManagerEvidence).toContain("packageManager field");
  });

  it("reads the lockfile otherwise", () => {
    expect(readProjectProfile(manifest({}), ["yarn.lock"], NONE).packageManager).toBe("yarn");
  });

  it("says unknown when neither is present", () => {
    expect(readProjectProfile(manifest({}), [], NONE).packageManager).toBe("unknown");
  });
});

describe("Themvora packages", () => {
  it("reports a declared package as missing when nothing resolved", () => {
    // This is the state that breaks an app, and the one a manifest alone hides.
    const profile = readProjectProfile(
      manifest({ "@themvora/react": "^1.3.1" }),
      [],
      NONE,
    );

    expect(profile.packages).toHaveLength(1);
    expect(profile.packages[0]).toMatchObject({
      name: "@themvora/react",
      declaredRange: "^1.3.1",
      field: "dependencies",
      status: "missing",
    });
    expect(profile.packages[0]?.installedVersion).toBeUndefined();
  });

  it("reports a resolved package as installed, with the version", () => {
    const profile = readProjectProfile(
      manifest({ "@themvora/core": "^1.4.0" }),
      [],
      new Map([["@themvora/core", "1.4.2"]]),
    );

    expect(profile.packages[0]).toMatchObject({
      status: "installed",
      installedVersion: "1.4.2",
    });
  });

  it("records dev and peer declarations, and ignores other scopes", () => {
    const text = JSON.stringify({
      dependencies: { "@themvora/core": "^1.4.0", react: "^19.0.0" },
      devDependencies: { "@themvora/cli": "^1.3.0" },
      peerDependencies: { "@themvora/tailwind": "^1.3.0" },
    });

    const profile = readProjectProfile(text, [], NONE);

    expect(profile.packages.map((entry) => `${entry.name}:${entry.field}`)).toEqual([
      "@themvora/cli:devDependencies",
      "@themvora/core:dependencies",
      "@themvora/tailwind:peerDependencies",
    ]);
  });

  it("is empty for a project with no Themvora packages", () => {
    expect(readProjectProfile(manifest({ react: "^19.0.0" }), [], NONE).packages).toEqual([]);
  });

  it("ignores a malformed manifest instead of throwing", () => {
    expect(readProjectProfile("{ not json", [], NONE).packages).toEqual([]);
  });
});
