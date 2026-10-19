import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateTheme } from "@themvora/core";
import { cli, tempDir, type TempDir } from "./helpers.js";

let dir: TempDir | null = null;

afterEach(() => {
  dir?.cleanup();
  dir = null;
});

/** A healthy project: framework, integration, lockfile, config, valid themes. */
function healthyProject(): TempDir {
  const project = tempDir();
  project.write(
    "package.json",
    JSON.stringify({
      name: "healthy-app",
      dependencies: { react: "^19.0.0", "@themvora/core": "^1.4.0", "@themvora/react": "^1.3.1" },
    }),
  );
  project.write("pnpm-lock.yaml", "");
  project.write("theme.config.ts", "export default {};\n");
  project.write("theme.json", JSON.stringify(generateTheme({ seed: "#3366ff" }), null, 2));
  return project;
}

/** Read the findings out of a `--json` doctor run. */
async function findings(project: TempDir): Promise<
  { id: string; level: string; detail: string; fix: string | null }[]
> {
  const result = await cli("doctor", project.path, "--json");
  return result.json<{ findings: { id: string; level: string; detail: string; fix: string | null }[] }>()
    .findings;
}

describe("doctor — healthy project", () => {
  it("reports healthy and exits 0", async () => {
    dir = healthyProject();
    const result = await cli("doctor", dir.path);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("healthy");
    expect(result.stdout).toContain("React");
    expect(result.stdout).toContain("pnpm");
    expect(result.stdout).toContain("theme.config.ts");
  });

  it("emits a parseable JSON report", async () => {
    dir = healthyProject();
    const result = await cli("doctor", dir.path, "--json");

    expect(result.code).toBe(0);
    const report = result.json<{
      directory: string;
      framework: { id: string } | null;
      packageManager: string | null;
      findings: unknown[];
      summary: { errors: number; warnings: number; healthy: boolean };
    }>();

    expect(Object.keys(report).sort()).toEqual([
      "directory",
      "findings",
      "framework",
      "packageManager",
      "summary",
    ]);
    expect(report.framework?.id).toBe("react");
    expect(report.packageManager).toBe("pnpm");
    expect(report.summary).toEqual({ errors: 0, warnings: 0, info: 6, healthy: true });
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });

  it("hides informational findings under --quiet", async () => {
    dir = healthyProject();
    const result = await cli("doctor", dir.path, "--quiet");

    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("Project manifest");
    expect(result.stdout).toContain("healthy");
  });
});

describe("doctor — framework detection", () => {
  it("prefers the most specific framework", async () => {
    dir = tempDir();
    dir.write(
      "package.json",
      JSON.stringify({
        name: "next-app",
        dependencies: { next: "^15.0.0", react: "^19.0.0", "@themvora/next": "^2.0.0" },
      }),
    );
    dir.write("pnpm-lock.yaml", "");
    dir.write("theme.config.ts", "export default {};\n");

    const found = await findings(dir);
    expect(found.find((item) => item.id === "framework")?.detail).toContain("Next.js");
  });

  it("warns when the framework integration is missing", async () => {
    dir = tempDir();
    dir.write(
      "package.json",
      JSON.stringify({
        name: "app",
        dependencies: { vue: "^3.5.0", "@themvora/core": "^1.4.0" },
      }),
    );
    dir.write("pnpm-lock.yaml", "");

    const found = await findings(dir);
    const integration = found.find((item) => item.id === "framework-integration")!;
    expect(integration.level).toBe("warning");
    expect(integration.detail).toContain("@themvora/vue");
    expect(integration.fix).toContain("@themvora/vue");
  });

  it("notes a framework that is a library integration but not an init target", async () => {
    dir = tempDir();
    dir.write(
      "package.json",
      JSON.stringify({
        name: "astro-app",
        dependencies: { astro: "^5.0.0", "@themvora/core": "^1.4.0", "@themvora/astro": "^2.0.0" },
      }),
    );
    dir.write("pnpm-lock.yaml", "");

    const found = await findings(dir);
    const support = found.find((item) => item.id === "framework-support")!;
    expect(support.level).toBe("info");
    expect(support.detail).toContain("not an `init` target");
  });

  it("warns when no framework is detected", async () => {
    dir = tempDir();
    dir.write("package.json", JSON.stringify({ name: "plain", dependencies: {} }));
    dir.write("pnpm-lock.yaml", "");

    const found = await findings(dir);
    expect(found.find((item) => item.id === "framework")?.level).toBe("warning");
  });
});

describe("doctor — project configuration", () => {
  it("reports an error when no Themvora package is installed", async () => {
    dir = tempDir();
    dir.write("package.json", JSON.stringify({ name: "app", dependencies: { react: "^19.0.0" } }));
    dir.write("pnpm-lock.yaml", "");

    const result = await cli("doctor", dir.path);
    expect(result.code).toBe(3);

    const found = await findings(dir);
    const packages = found.find((item) => item.id === "themvora-packages")!;
    expect(packages.level).toBe("error");
    expect(packages.fix).toContain("@themvora/core");
  });

  it("warns about several lockfiles", async () => {
    dir = healthyProject();
    dir.write("yarn.lock", "");

    const found = await findings(dir);
    const manager = found.find((item) => item.id === "package-manager")!;
    expect(manager.level).toBe("warning");
    expect(manager.detail).toContain("2 lockfiles");
  });

  it("warns when a lockfile is missing entirely", async () => {
    dir = tempDir();
    dir.write(
      "package.json",
      JSON.stringify({ name: "app", dependencies: { "@themvora/core": "^1.4.0" } }),
    );

    const found = await findings(dir);
    expect(found.find((item) => item.id === "package-manager")?.level).toBe("warning");
  });

  it("errors when a theme config exists without @themvora/core", async () => {
    dir = tempDir();
    dir.write("package.json", JSON.stringify({ name: "app", dependencies: { react: "^19.0.0" } }));
    dir.write("pnpm-lock.yaml", "");
    dir.write("theme.config.ts", "export default {};\n");

    const found = await findings(dir);
    const config = found.find((item) => item.id === "theme-config")!;
    expect(config.level).toBe("error");
    expect(config.detail).toContain("@themvora/core is not a dependency");
  });

  it("warns when the theme config is missing", async () => {
    dir = tempDir();
    dir.write(
      "package.json",
      JSON.stringify({ name: "app", dependencies: { "@themvora/core": "^1.4.0" } }),
    );
    dir.write("pnpm-lock.yaml", "");

    const found = await findings(dir);
    expect(found.find((item) => item.id === "theme-config")?.level).toBe("warning");
  });

  it("reports an error for a package.json that is not valid JSON", async () => {
    dir = tempDir();
    dir.write("package.json", "{ not json");

    const result = await cli("doctor", dir.path);
    expect(result.code).toBe(3);

    const found = await findings(dir);
    expect(found[0]!.level).toBe("error");
  });
});

describe("doctor — theme files", () => {
  it("finds theme files in the root and in themes/", async () => {
    dir = healthyProject();
    dir.write("brand.theme.json", JSON.stringify(generateTheme({ seed: "#ff0000" }).light, null, 2));

    const found = await findings(dir);
    expect(found.find((item) => item.id === "theme-files")?.detail).toContain("2 valid");
  });

  it("errors on an invalid theme file", async () => {
    dir = healthyProject();
    dir.write(
      "themes/broken.json",
      JSON.stringify({ name: "broken", meta: { mode: "light" }, tokens: { colors: { background: "#fff" } } }),
    );

    const result = await cli("doctor", dir.path);
    expect(result.code).toBe(3);

    const found = await findings(dir);
    const themeFile = found.find((item) => item.id === "theme-files" && item.level === "error")!;
    expect(themeFile.detail).toContain("missing required tokens");
  });

  it("warns when a theme was generated by an older algorithm", async () => {
    dir = healthyProject();
    const pair = generateTheme({ seed: "#3366ff" });
    const stale = {
      ...pair.light,
      meta: { ...pair.light.meta, generation: { ...pair.light.meta!.generation!, algorithm: "semantic-v1" } },
    };
    dir.write("theme.json", JSON.stringify(stale, null, 2));

    const found = await findings(dir);
    const metadata = found.find((item) => item.id === "generator-metadata")!;
    expect(metadata.level).toBe("warning");
    expect(metadata.detail).toContain("semantic-v1");
    expect(metadata.fix).toContain("migrate");
  });

  it("errors on a theme file that is not valid JSON", async () => {
    dir = healthyProject();
    dir.write("themes/bad.json", "{ not json");

    const result = await cli("doctor", dir.path);
    expect(result.code).toBe(3);

    const found = await findings(dir);
    expect(found.some((item) => item.id === "theme-files" && item.detail.includes("not valid JSON"))).toBe(true);
  });
});

describe("doctor — exit codes", () => {
  it("exits 0 for a warnings-only project", async () => {
    dir = tempDir();
    dir.write(
      "package.json",
      JSON.stringify({ name: "app", dependencies: { "@themvora/core": "^1.4.0" } }),
    );
    // Missing lockfile and missing config are warnings, not errors.
    const result = await cli("doctor", dir.path);
    expect(result.code).toBe(0);
  });

  it("fails with exit 1 for a path that is not a directory", async () => {
    const result = await cli("doctor", join(process.cwd(), "does-not-exist"));
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("not a directory");
  });
});
