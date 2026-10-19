/**
 * Unit tests for `init` detection and source resolution.
 *
 * These run against the real filesystem in a throwaway directory, because the
 * behaviour under test *is* filesystem reading — a mocked `fs` would assert that
 * the mock was called, not that detection is correct.
 */
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  classifyProject,
  detectPackageManager,
  inspectProject,
  readManifest,
} from "../src/init/detect.js";
import { resolveSource } from "../src/init/source.js";
import { detectFramework, FRAMEWORK_INTEGRATIONS, INIT_FRAMEWORKS } from "../src/frameworks.js";
import { FRAMEWORK_ADAPTERS } from "../src/init/adapters/index.js";
import { tempDir, type TempDir } from "./helpers.js";

let dir: TempDir | null = null;

afterEach(() => {
  dir?.cleanup();
  dir = null;
});

function fixture(): TempDir {
  dir = tempDir();
  return dir;
}

describe("classifyProject", () => {
  it("reports a path that does not exist as missing", () => {
    expect(classifyProject(join(tempDir().path, "nope"))).toBe("missing");
  });

  it("reports a directory with no project files as empty", () => {
    // A freshly created directory, which is what `mkdtemp` gives us.
    expect(classifyProject(fixture().path)).toBe("empty");
  });

  it("ignores dotfiles when deciding emptiness", () => {
    const d = fixture();
    d.write(".gitignore", "node_modules\n");
    expect(classifyProject(d.path)).toBe("empty");
  });

  it("reports a directory holding a project as existing", () => {
    const d = fixture();
    d.write("package.json", "{}");
    expect(classifyProject(d.path)).toBe("existing");
  });
});

describe("readManifest", () => {
  it("returns null when there is no package.json", () => {
    expect(readManifest(fixture().path)).toBeNull();
  });

  it("returns null for malformed JSON rather than throwing", () => {
    const d = fixture();
    d.write("package.json", "{ not json");
    expect(readManifest(d.path)).toBeNull();
  });

  it("collects dependencies, devDependencies and scripts", () => {
    const d = fixture();
    d.write(
      "package.json",
      JSON.stringify({
        name: "app",
        dependencies: { react: "^19.0.0" },
        devDependencies: { vite: "^6.0.0" },
        scripts: { build: "vite build", typecheck: "tsc --noEmit" },
        packageManager: "pnpm@9.0.0",
      }),
    );

    const manifest = readManifest(d.path)!;
    expect(manifest.name).toBe("app");
    expect(manifest.dependencies).toEqual(["react"]);
    expect(manifest.devDependencies).toEqual(["vite"]);
    expect(manifest.scripts["build"]).toBe("vite build");
    expect(manifest.packageManagerField).toBe("pnpm@9.0.0");
  });
});

describe("detectPackageManager", () => {
  it("defaults to npm when nothing indicates otherwise", () => {
    const result = detectPackageManager(fixture().path, null);
    expect(result.manager).toBe("npm");
    expect(result.lockfiles).toEqual([]);
    expect(result.ambiguous).toBe(false);
  });

  it.each([
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
  ])("detects %s as %s", (lockfile, expected) => {
    const d = fixture();
    d.write(lockfile, "");
    expect(detectPackageManager(d.path, null).manager).toBe(expected);
  });

  it("prefers the corepack packageManager field over a lockfile", () => {
    const d = fixture();
    d.write("package-lock.json", "");
    const manifest = {
      name: undefined,
      dependencies: [],
      devDependencies: [],
      scripts: {},
      packageManagerField: "pnpm@9.1.0",
    };

    expect(detectPackageManager(d.path, manifest).manager).toBe("pnpm");
  });

  it("flags several lockfiles as ambiguous", () => {
    const d = fixture();
    d.write("package-lock.json", "");
    d.write("yarn.lock", "");

    const result = detectPackageManager(d.path, null);
    expect(result.ambiguous).toBe(true);
    expect(result.lockfiles).toHaveLength(2);
  });
});

describe("detectFramework", () => {
  it("prefers the more specific framework when several match", () => {
    // A Next app also depends on react; picking react would integrate the wrong
    // provider.
    expect(detectFramework(["react", "next"])?.id).toBe("next");
    expect(detectFramework(["vue", "nuxt"])?.id).toBe("nuxt");
  });

  it("returns undefined for an unrecognised project", () => {
    expect(detectFramework(["express"])).toBeUndefined();
  });
});

describe("inspectProject", () => {
  it("detects the framework from a project's dependencies", () => {
    const d = fixture();
    d.write(
      "package.json",
      JSON.stringify({ dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" } }),
    );

    const inspection = inspectProject(d.path);
    expect(inspection.kind).toBe("existing");
    expect(inspection.detectedFramework?.id).toBe("react");
  });

  it("reads no manifest from a new project", () => {
    const inspection = inspectProject(join(fixture().path, "new-app"));
    expect(inspection.kind).toBe("missing");
    expect(inspection.manifest).toBeNull();
    expect(inspection.detectedFramework).toBeUndefined();
  });
});

describe("resolveSource", () => {
  it("resolves the neutral pair to core's built-in light and dark", () => {
    const source = resolveSource({ kind: "neutral" });

    expect(source.summary.sources).toEqual(['{"kind":"neutral"}']);
    expect(source.themes.map((theme) => theme.name)).toEqual(["light", "dark"]);
    expect(source.summary.defaultTheme).toBe("light");
    expect(source.problems).toEqual([]);
  });

  it("resolves a preset to the catalog's own themes", () => {
    const source = resolveSource({ kind: "preset", id: "mint" });

    expect(source.summary.label).toBe("preset mint");
    expect(source.summary.family).toBe("mint");
    expect(source.summary.defaultTheme).toBe("mint-light");
    expect(source.problems).toEqual([]);
  });

  it("resolves a brand to the catalog's own themes", () => {
    const source = resolveSource({ kind: "brand", id: "apple" });
    expect(source.summary.label).toBe("brand apple");
    expect(source.summary.modes).toEqual(["light", "dark"]);
  });

  it("generates a validated pair from a seed", () => {
    const source = resolveSource({ kind: "seed", seed: "#3366ff", family: "custom" });

    expect(source.summary.sources).toEqual([JSON.stringify({ kind: "seed", seed: "#3366ff", family: "custom" })]);
    expect(source.summary.family).toBe("custom");
    expect(source.themes.map((theme) => theme.name)).toEqual([
      "custom-light",
      "custom-dark",
    ]);
    expect(source.problems).toEqual([]);
  });

  it("throws for an unknown preset", () => {
    expect(() => resolveSource({ kind: "preset", id: "nope" })).toThrow(/unknown preset/);
  });

  it("throws for an unknown brand", () => {
    expect(() => resolveSource({ kind: "brand", id: "nope" })).toThrow(/unknown brand/);
  });

  it("throws for a seed that is not a colour", () => {
    expect(() => resolveSource({ kind: "seed", seed: "not-a-colour" })).toThrow();
  });
});

describe("the adapter registry", () => {
  it("covers every init-supported framework", () => {
    const supported = INIT_FRAMEWORKS.map((framework) => framework.id).sort();
    const adapted = FRAMEWORK_ADAPTERS.map((adapter) => adapter.id).sort();

    expect(adapted).toEqual(supported);
  });

  it("registers exactly the five first-release targets", () => {
    expect(INIT_FRAMEWORKS.map((framework) => framework.id)).toEqual([
      "react",
      "next",
      "vue",
      "svelte",
      "solid",
    ]);
  });

  it("keeps published-but-unsupported integrations out of the init set", () => {
    const published = FRAMEWORK_INTEGRATIONS.filter((entry) => !entry.initSupported);
    expect(published.map((entry) => entry.id)).toContain("nuxt");
    expect(INIT_FRAMEWORKS.map((entry) => entry.id)).not.toContain("nuxt");
  });
});
