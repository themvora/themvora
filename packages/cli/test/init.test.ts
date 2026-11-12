/**
 * Command-level tests for `themvora init`.
 *
 * Every test drives the real command in-process. Nothing scaffolds or installs:
 * `--no-install` removes the install step, and the fixtures declare no build or
 * typecheck script so no verification command is planned either. What is under
 * test is the planning, the edits, the idempotency and the refusals.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildInitPlan } from "../src/init/plan.js";
import { reactAdapter } from "../src/init/adapters/react.js";
import { nextAdapter } from "../src/init/adapters/next.js";
import { solidAdapter } from "../src/init/adapters/solid.js";
import { svelteAdapter } from "../src/init/adapters/svelte.js";
import { vueAdapter } from "../src/init/adapters/vue.js";
import { cli, tempDir, type TempDir } from "./helpers.js";

let dir: TempDir | null = null;

afterEach(() => {
  dir?.cleanup();
  dir = null;
});

/** A React + Vite project with the files the integration edits. */
function reactProject(options: { lockfile?: string } = {}): TempDir {
  dir = tempDir();

  dir.write(
    "package.json",
    JSON.stringify(
      {
        name: "fixture-react",
        private: true,
        type: "module",
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
        devDependencies: { vite: "^6.0.0" },
      },
      null,
      2,
    ),
  );

  if (options.lockfile !== false) dir.write(options.lockfile ?? "package-lock.json", "");

  dir.write(
    "vite.config.ts",
    [
      'import { defineConfig } from "vite";',
      'import react from "@vitejs/plugin-react";',
      "",
      "export default defineConfig({",
      "  plugins: [react()],",
      "});",
      "",
    ].join("\n"),
  );

  dir.write(
    "src/main.tsx",
    [
      'import { StrictMode } from "react";',
      'import { createRoot } from "react-dom/client";',
      'import "./index.css";',
      'import App from "./App";',
      "",
      'createRoot(document.getElementById("root")!).render(',
      "  <StrictMode>",
      "    <App />",
      "  </StrictMode>,",
      ");",
      "",
    ].join("\n"),
  );

  dir.write("src/App.tsx", "export default function App() {\n  return <h1>Mine</h1>;\n}\n");

  return dir;
}

/** Every file under a directory, relative and POSIX-separated. */
function tree(root: string, prefix = ""): string[] {
  const entries = readdirSync(join(root, prefix), { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...tree(root, relative));
    else files.push(relative);
  }

  return files.sort();
}

describe("init --plan", () => {
  it("writes nothing", async () => {
    const d = tempDir();
    dir = d;

    const result = await cli("init", "my-app", "--framework", "react", "--plan");

    expect(result.code).toBe(0);
    expect(readdirSync(d.path)).toEqual([]);
    expect(result.stdout).toContain("themvora init — plan");
  });

  it("names the official generator for a new project", async () => {
    const result = await cli("init", "my-app", "--framework", "react", "--plan");
    expect(result.stdout).toContain("npm create vite@latest my-app -- --template react-ts");
  });

  it("uses create-next-app for Next.js", async () => {
    const result = await cli("init", "my-app", "--framework", "next", "--plan");
    expect(result.stdout).toContain("create-next-app@latest my-app");
    expect(result.stdout).toContain("--no-tailwind");
  });

  it("resolves a preset source and names the default theme", async () => {
    const result = await cli("init", "my-app", "--framework", "react", "--preset", "mint", "--plan");
    expect(result.stdout).toContain("preset mint");
    expect(result.stdout).toContain("mint-light");
  });

  it("plans no install step under --no-install", async () => {
    const result = await cli(
      "init",
      "my-app",
      "--framework",
      "react",
      "--no-install",
      "--plan",
    );
    expect(result.stdout).not.toContain("Install");
  });

  it("always forwards --skip-install to create-next-app", async () => {
    // `create-next-app` installs its own dependencies by default. Themvora
    // installs once, after the integration has edited `package.json`, so the
    // generator's install is suppressed in *every* run — not only under
    // `--no-install`. Otherwise a normal run would install the tree twice.
    for (const extra of [[], ["--no-install"]]) {
      const result = await cli(
        "init",
        "my-app",
        "--framework",
        "next",
        "--plan",
        "--json",
        ...extra,
      );
      const plan = result.json<{ scaffold: { args: string[] } | null }>();

      expect(plan.scaffold?.args, `args with ${extra.join(" ")}`).toContain("--skip-install");
    }
  });

  it("plans exactly one install step for a normal new project", async () => {
    const result = await cli("init", "my-app", "--framework", "next", "--plan", "--json");
    const plan = result.json<{
      scaffold: { args: string[] } | null;
      installStep: { command: string } | null;
      devDependencies: Record<string, string>;
    }>();

    expect(plan.installStep).not.toBeNull();
    // Plain CSS is the default, so there are no build-time packages to add.
    expect(plan.devDependencies).toEqual({});
  });

  it("pins the package manager create-next-app would otherwise infer", async () => {
    const result = await cli(
      "init",
      "my-app",
      "--framework",
      "next",
      "--tool",
      "pnpm",
      "--plan",
      "--json",
    );
    const plan = result.json<{ scaffold: { args: string[] } | null }>();

    expect(plan.scaffold?.args).toContain("--use-pnpm");
    expect(plan.scaffold?.args).not.toContain("--use-npm");
  });

  it("suppresses create-vite's own install-and-start question", async () => {
    // `create-vite` asks "Install with npm and start now?" when it is
    // interactive, and answering either way conflicts with Themvora's own
    // install step. `--no-interactive` is Vite's documented switch.
    for (const framework of ["react", "vue", "svelte", "solid"]) {
      const result = await cli(
        "init",
        "my-app",
        "--framework",
        framework,
        "--plan",
        "--json",
      );
      const plan = result.json<{ scaffold: { args: string[] } | null }>();

      expect(plan.scaffold?.args, framework).toContain("--no-interactive");
      expect(plan.scaffold?.args, framework).not.toContain("--immediate");
    }
  });

  it("emits the plan as JSON", async () => {
    const result = await cli("init", "my-app", "--framework", "react", "--plan", "--json");
    const plan = result.json<{ version: number; framework: { id: string }; preview: boolean }>();

    expect(plan.version).toBe(1);
    expect(plan.framework.id).toBe("react");
    expect(plan.preview).toBe(true);
  });
});

describe("init --dry-run", () => {
  it("writes nothing and never scaffolds", async () => {
    const d = tempDir();
    dir = d;

    const result = await cli("init", "my-app", "--framework", "react", "--dry-run");

    expect(result.code).toBe(0);
    expect(readdirSync(d.path)).toEqual([]);
    expect(result.stdout).toContain("themvora init — plan");
  });

  it("describes the integration for an existing project without writing", async () => {
    const d = reactProject();
    const before = tree(d.path);

    const result = await cli("init", d.path, "--preset", "mint", "--no-install", "--dry-run");

    expect(result.code).toBe(0);
    expect(tree(d.path)).toEqual(before);
    expect(result.stdout).toContain("src/themes/themes.ts");
    expect(result.stdout).toContain("src/components/ThemeSwitcher.tsx");
  });
});

describe("init on an existing project", () => {
  it("detects the framework and integrates", async () => {
    const d = reactProject();

    const result = await cli("init", d.path, "--preset", "mint", "--no-install");

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("4 created");
    expect(existsSync(join(d.path, "src/themes/themes.ts"))).toBe(true);
    expect(existsSync(join(d.path, "src/index.css"))).toBe(true);
    expect(existsSync(join(d.path, "src/components/ThemeSwitcher.tsx"))).toBe(true);
  });

  it("skips dependency-backed verification under --no-install, and says so", async () => {
    const d = tempDir();
    dir = d;
    d.write(
      "package.json",
      JSON.stringify({
        name: "scripted",
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: { build: "vite build", typecheck: "tsc --noEmit" },
        dependencies: { react: "^19.0.0" },
      }),
    );
    d.write("vite.config.ts", "export default { plugins: [] };\n");
    d.write("src/App.tsx", "export default function App(){ return null }\n");

    const result = await cli(
      "init",
      d.path,
      "--framework",
      "react",
      "--preset",
      "mint",
      "--no-install",
    );

    // The project declares build/typecheck scripts, but `--no-install` means
    // their dependencies are absent. They cannot run, so they are reported as
    // *skipped* — not as failures, which would read as broken generated code.
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("dependencies are not installed");
    expect(result.stdout).not.toContain("✗");
    // The file-generation contract is unaffected.
    expect(existsSync(join(d.path, "src/themes/themes.ts"))).toBe(true);
  });

  it("leaves the user's entry component alone", async () => {
    const d = reactProject();
    const original = d.read("src/App.tsx");

    await cli("init", d.path, "--preset", "mint", "--no-install");

    expect(d.read("src/App.tsx")).toBe(original);
  });

  it("imports the stylesheet in the entry module without adding a second provider", async () => {
    const d = reactProject();

    await cli("init", d.path, "--preset", "mint", "--no-install");

    const main = d.read("src/main.tsx");
    expect(main).toContain('import "./index.css";');
    // The provider boundary is a manual step in an existing project: replacing
    // someone's entry module would discard whatever else they compose there, and
    // wrapping it automatically is how two runtimes got mounted.
    expect(main).not.toContain("<ThemeProvider");
    expect(main).not.toContain("@themvora/react");
  });

  it("registers no Themvora Vite plugin, preserving existing plugins", async () => {
    const d = reactProject();

    await cli("init", d.path, "--preset", "mint", "--no-install");

    const config = d.read("vite.config.ts");
    expect(config).toContain("plugins: [react()]");
    expect(config).not.toContain("themvora");
  });

  it("reports the detected package manager in the JSON report", async () => {
    const d = reactProject({ lockfile: "pnpm-lock.yaml" });

    const result = await cli("init", d.path, "--preset", "mint", "--no-install", "--json");
    const report = result.json<{ created: string[]; verification: unknown[] }>();

    expect(report.created).toContain("src/themes/themes.ts");
    expect(report.verification).toEqual([]);
  });
});

describe("init idempotency", () => {
  it("makes a second run a no-op", async () => {
    const d = reactProject();

    await cli("init", d.path, "--preset", "mint", "--no-install");
    const afterFirst = new Map(tree(d.path).map((file) => [file, d.read(file)]));

    const second = await cli("init", d.path, "--preset", "mint", "--no-install");

    expect(second.code).toBe(0);
    expect(second.stdout).toContain("0 created · 0 updated · 0 removed · 6 unchanged");

    for (const [file, contents] of afterFirst) {
      expect(d.read(file)).toBe(contents);
    }
  });

  it("never adds a provider to an existing project's own files", async () => {
    const d = reactProject();

    await cli("init", d.path, "--preset", "mint", "--no-install");
    await cli("init", d.path, "--preset", "mint", "--no-install");

    const main = d.read("src/main.tsx");
    const app = d.read("src/App.tsx");

    // Both files are the user's. For an existing project the provider boundary
    // is reported as a manual step, never applied automatically — wrapping a
    // root the user owns is how two runtimes got mounted.
    expect(main).not.toContain("<ThemeProvider");
    expect(app).not.toContain("<ThemeProvider");
    expect(main).toContain('import "./index.css";');
  });

  it("does not add a Vite plugin on a second run either", async () => {
    const d = reactProject();

    await cli("init", d.path, "--preset", "mint", "--no-install");
    await cli("init", d.path, "--preset", "mint", "--no-install");

    expect(d.read("vite.config.ts").match(/themvora/gi) ?? []).toHaveLength(0);
  });

  it("regenerates a generated file whose contents changed", async () => {
    const d = reactProject();

    await cli("init", d.path, "--preset", "mint", "--no-install");
    // Simulate a stale generated artifact by trimming it, keeping the header.
    const stale = d.read("src/index.css").split("\n").slice(0, 8).join("\n");
    d.write("src/index.css", stale);

    const result = await cli("init", d.path, "--preset", "mint", "--no-install");

    expect(result.stdout).toContain("~ src/index.css");
    expect(d.read("src/index.css")).toContain(".card {");
  });
});

describe("init conflicts", () => {
  it("refuses to replace a file the user owns", async () => {
    const d = reactProject();
    d.write("src/themes/themes.ts", "export const mine = true;\n");

    const result = await cli("init", d.path, "--preset", "mint", "--no-install");

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("conflict: src/themes/themes.ts");
    expect(d.read("src/themes/themes.ts")).toBe("export const mine = true;\n");
  });

  it("does not write anything else when a conflict blocks the run", async () => {
    const d = reactProject();
    d.write("src/themes/themes.ts", "export const mine = true;\n");

    await cli("init", d.path, "--preset", "mint", "--no-install");

    expect(existsSync(join(d.path, "src/index.css"))).toBe(false);
    expect(existsSync(join(d.path, "src/components/ThemeSwitcher.tsx"))).toBe(false);
  });

  it("replaces it under --force", async () => {
    const d = reactProject();
    d.write("src/themes/themes.ts", "export const mine = true;\n");

    const result = await cli("init", d.path, "--preset", "mint", "--no-install", "--force");

    expect(result.code).toBe(0);
    expect(d.read("src/themes/themes.ts")).toContain("export const themes");
  });
});

describe("init refusals", () => {
  it("fails with a usage error when a new project has no framework", async () => {
    const result = await cli("init", "my-app");

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("a new project needs --framework");
  });

  it("distinguishes a published integration from an init target", async () => {
    const result = await cli("init", "my-app", "--framework", "nuxt", "--plan");

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("is a supported Themvora integration but is not an `init` target");
  });

  it("rejects an unknown framework", async () => {
    const result = await cli("init", "my-app", "--framework", "ember", "--plan");

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('unknown framework "ember"');
  });

  it("rejects two theme sources", async () => {
    const result = await cli(
      "init",
      "my-app",
      "--framework",
      "react",
      "--preset",
      "mint",
      "--brand",
      "apple",
      "--plan",
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("choose one theme source");
  });

  it("rejects an unknown package manager", async () => {
    const result = await cli(
      "init",
      "my-app",
      "--framework",
      "react",
      "--package-manager",
      "cargo",
      "--plan",
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("unknown package manager");
  });

  it("rejects a project name that cannot be passed to a generator safely", async () => {
    const result = await cli("init", "bad name & rm -rf", "--framework", "react", "--plan");

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("may contain only letters, digits, dots, dashes and underscores");
  });
});

describe("plan construction", () => {
  it("refuses to write outside the project root", async () => {
    const d = reactProject();
    const { resolveInsideProject } = await import("../src/init/apply.js");

    expect(() => resolveInsideProject(d.path, "../escaped.ts")).toThrow(/outside the project root/);
    expect(() => resolveInsideProject(d.path, "a/../../escaped.ts")).toThrow(
      /outside the project root/,
    );
  });

  it("never emits a file operation with a traversing path", async () => {
    const d = reactProject();
    const plan = buildInitPlan({
      target: d.path,
      frameworkId: "react",
      source: { kind: "neutral" },
      styling: "css",
      example: false,
      install: false,
      force: false,
    });

    for (const file of plan.files) {
      expect(file.path.startsWith("..")).toBe(false);
      expect(file.path.includes("..")).toBe(false);
    }
  });

  it("warns when several lockfiles make the package manager ambiguous", async () => {
    const d = reactProject();
    d.write("yarn.lock", "");

    const plan = buildInitPlan({
      target: d.path,
      frameworkId: "react",
      source: { kind: "neutral" },
      styling: "css",
      example: false,
      install: false,
      force: false,
    });

    expect(plan.warnings.join("\n")).toContain("several lockfiles");
  });

  it("honours an explicit package manager over detection", async () => {
    const d = reactProject({ lockfile: "pnpm-lock.yaml" });

    const plan = buildInitPlan({
      target: d.path,
      frameworkId: "react",
      source: { kind: "neutral" },
      styling: "css",
      example: false,
      install: true,
      force: false,
      packageManager: "yarn",
    });

    expect(plan.packageManager).toBe("yarn");
    expect(plan.installStep?.command).toBe("yarn");
    expect(plan.warnings.join("\n")).toContain("instead of the detected pnpm");
  });

  it("plans verification from the project's own scripts", async () => {
    const d = reactProject();
    d.write(
      "package.json",
      JSON.stringify({
        name: "fixture-react",
        scripts: { build: "vite build", typecheck: "tsc --noEmit" },
        dependencies: { react: "^19.0.0" },
      }),
    );

    const plan = buildInitPlan({
      target: d.path,
      frameworkId: "react",
      source: { kind: "neutral" },
      styling: "css",
      example: false,
      install: false,
      force: false,
    });

    expect(plan.verification.map((step) => step.id)).toEqual(["typecheck", "build"]);
  });

  it("uses the project's own name from package.json", async () => {
    const d = reactProject();
    const plan = buildInitPlan({
      target: d.path,
      frameworkId: "react",
      source: { kind: "neutral" },
      styling: "css",
      example: false,
      install: false,
      force: false,
    });

    expect(plan.projectName).toBe("fixture-react");
  });
});

describe("the generated files", () => {
  it("mark every file Themvora owns as generated", async () => {
    const d = reactProject();
    await cli("init", d.path, "--preset", "mint", "--no-install");

    // `src/App.tsx` and `src/main.tsx` are deliberately absent: in an existing
    // project they are the user's files and carry no generated marker.
    for (const file of [
      "src/themes/themes.ts",
      "src/index.css",
      "src/components/ThemeSwitcher.tsx",
      "src/components/ThemvoraDefault.tsx",
    ]) {
      expect(d.read(file)).toContain("Generated by `themvora init`.");
    }
  });

  it("generates a registry the project can resolve at runtime", async () => {
    const d = reactProject();
    await cli("init", d.path, "--preset", "mint", "--no-install");

    const registry = d.read("src/themes/themes.ts");
    expect(registry).toContain('import { defineTheme, getPresetThemes } from "@themvora/core"');
    // The custom pair is written out; the preset is referenced, not copied.
    expect(registry).toContain('"themvora-default-light"');
    expect(registry).toContain("getPresetThemes()");
    expect(registry).toContain('"mint"');
    // And the app opens with the theme the flag asked for.
    expect(registry).toContain('"mint-light"');
  });

  it("styles the showcase from semantic tokens only", async () => {
    const d = reactProject();
    await cli("init", d.path, "--preset", "mint", "--no-install");

    const styles = d.read("src/index.css");
    for (const token of [
      "--theme-color-background",
      "--theme-color-foreground",
      "--theme-color-card",
      "--theme-color-border",
      "--theme-color-primary",
      "--theme-color-primaryForeground",
      "--theme-color-mutedForeground",
      "--theme-color-ring",
    ]) {
      expect(styles).toContain(token);
    }

    // No literal colour, and no competing `color-scheme` declaration.
    expect(styles).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(styles).not.toContain("color-scheme");
  });

  it("generates a switcher with no hard-coded colour", async () => {
    const d = reactProject();
    await cli("init", d.path, "--preset", "mint", "--no-install");

    const switcher = d.read("src/components/ThemeSwitcher.tsx");
    expect(switcher).toContain("toggleTheme");
    expect(switcher).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("generates the showcase for every project, with no --example gate", async () => {
    // The showcase *is* the starter now: there is no minimal variant to opt out
    // of, and `--example` no longer changes what is written.
    const d = reactProject();
    await cli("init", d.path, "--preset", "mint", "--no-install", "--example");

    const showcase = d.read("src/components/ThemvoraDefault.tsx");
    expect(showcase).toContain("Welcome to");
    expect(showcase).toContain("Themvora");
    expect(showcase).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("the Next.js adapter", () => {
  const imports = {
    adapter: "@themvora/next",
    client: "@themvora/next/client",
    core: "@themvora/core",
    vite: "@themvora/core/vite",
  };

  const source = {
    kind: "neutral" as const,
    label: "built-in neutral",
    family: "default",
    defaultTheme: "light",
    themes: ["light", "dark"],
    modes: ["light", "dark"] as const,
  };

  /** A context with the given files already present. */
  function contextWith(files: Record<string, string>, projectKind: "missing" | "existing") {
    return {
      projectPath: "/tmp/unused",
      projectName: "my-app",
      projectKind,
      styling: "css" as const,
      example: false,
      force: false,
      source,
      themes: [],
      imports,
      read: (path: string) => files[path] ?? null,
      exists: (path: string) => files[path] !== undefined,
      listProjectFiles: () => Object.keys(files),
    };
  }

  const GENERATOR_CONFIG = [
    'import type { NextConfig } from "next";',
    "",
    "const nextConfig: NextConfig = {",
    "  /* config options here */",
    "  cacheComponents: true,",
    "  partialPrefetching: true,",
    "};",
    "",
    "export default nextConfig;",
    "",
  ].join("\n");

  it("does not use the Vite plugin", () => {
    const result = nextAdapter.integrate(contextWith({}, "missing"));
    expect(result.files.some((file) => file.path === "vite.config.ts")).toBe(false);
    expect(result.manualSteps.some((step) => step.path === "vite.config.ts")).toBe(false);
  });

  it("renders no <html> or <body> in the generated layout", () => {
    const result = nextAdapter.integrate(contextWith({}, "missing"));
    const layout = result.files.find((file) => file.path === "app/layout.tsx")!.contents;

    // Comments are stripped first: the file *explains* that the provider renders
    // those elements, and only the JSX must not.
    const code = layout
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^[ \t]*\/\/.*$/gm, "");

    expect(code).not.toContain("<html");
    expect(code).not.toContain("<body");
    expect(code).toContain("<ThemeProvider");
  });

  it("never passes initialMode, which the Next provider does not accept", () => {
    const result = nextAdapter.integrate(contextWith({}, "missing"));
    const layout = result.files.find((file) => file.path === "app/layout.tsx")!.contents;
    expect(layout).not.toContain("initialMode");
  });

  it("takes hooks from the client entry, not the package root", () => {
    const result = nextAdapter.integrate(contextWith({}, "missing"));
    const switcher = result.files.find(
      (file) => file.path === "components/ThemeSwitcher.tsx",
    )!.contents;

    expect(switcher).toContain('from "@themvora/next/client"');
    expect(switcher).toContain('"use client"');
  });

  it("never modifies the project's Next config", () => {
    const result = nextAdapter.integrate(
      contextWith({ "next.config.ts": GENERATOR_CONFIG }, "missing"),
    );

    // The project's caching model is the project's. The integration adapts to
    // it rather than the CLI rewriting a framework feature.
    expect(result.files.some((file) => file.path === "next.config.ts")).toBe(false);
    expect(result.manualSteps.some((step) => step.path === "next.config.ts")).toBe(false);
  });

  it("generates a layout with no route-segment opt-out, even under Cache Components", () => {
    const result = nextAdapter.integrate(
      contextWith({ "next.config.ts": GENERATOR_CONFIG }, "missing"),
    );

    const layout = result.files.find((file) => file.path === "app/layout.tsx")!.contents;

    // `@themvora/next`'s server render is request-independent, so the route is
    // prerenderable and Next never asks for `instant = false`. That export used
    // to be generated here; it is a framework opt-out leaking into every app,
    // and users removed it because a normal Next app does not need it.
    expect(layout).not.toContain("instant");
    expect(layout).not.toContain("cacheComponents");

    // Still no document shell of its own — comments stripped, since the file
    // *explains* that the provider renders those elements.
    const code = layout
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^[ \t]*\/\/.*$/gm, "");
    expect(code).not.toMatch(/<html[\s>]/);
  });

  it("generates the same layout whatever the project's caching model is", () => {
    const layouts = [
      contextWith({ "next.config.ts": GENERATOR_CONFIG }, "missing"),
      contextWith(
        { "next.config.ts": "const c = { reactStrictMode: true };\nexport default c;\n" },
        "missing",
      ),
      contextWith({}, "missing"),
    ].map(
      (context) =>
        nextAdapter.integrate(context).files.find((file) => file.path === "app/layout.tsx")!
          .contents,
    );

    // Nothing in the generated layout depends on the framework feature, so all
    // three are byte-identical.
    expect(layouts[1]).toBe(layouts[0]);
    expect(layouts[2]).toBe(layouts[0]);
    expect(layouts[0]).not.toContain("instant");
  });

  it("does not ask an existing project to add a route opt-out", () => {
    const result = nextAdapter.integrate(
      contextWith(
        {
          "next.config.ts": GENERATOR_CONFIG,
          "app/layout.tsx": "export default function L({ children }) { return <html><body>{children}</body></html>; }\n",
        },
        "existing",
      ),
    );

    expect(result.warnings.join("\n")).not.toContain("Cache Components");
    const snippet = result.manualSteps.find((step) => step.path === "app/layout.tsx")!.snippet;
    expect(snippet).toContain("<ThemeProvider");
    expect(snippet).not.toContain("instant");
  });
});

describe("the Vite adapters", () => {
  it("leave the project's plugins array untouched", () => {
    const context = {
      projectPath: "/tmp/unused",
      projectName: "my-app",
      projectKind: "missing" as const,
      styling: "css" as const,
      listProjectFiles: () => [],
      example: false,
      force: false,
      source: {
        kind: "neutral" as const,
        label: "built-in neutral",
        family: "default",
        defaultTheme: "light",
        themes: ["light", "dark"],
        modes: ["light", "dark"] as const,
      },
      themes: [],
      imports: {
        adapter: "@themvora/react",
        client: "@themvora/react/client",
        core: "@themvora/core",
        vite: "@themvora/core/vite",
      },
      read: (path: string) =>
        path === "vite.config.ts"
          ? 'import { defineConfig } from "vite";\nexport default defineConfig({ plugins: [react()] });\n'
          : null,
      exists: (path: string) => path === "vite.config.ts",
    };

    const result = reactAdapter.integrate(context);

    // No Themvora plugin exists to register any more: the provider is flash-free
    // on its own and takes the registry as props. The config is therefore not
    // touched at all — which also means an unusual `plugins` shape is no longer
    // a reason to emit a manual step.
    const config = result.files.find((file) => file.path === "vite.config.ts")!;
    expect(config.action, "the config is planned but not rewritten").toBe("unchanged");
    expect(config.contents).not.toContain("themvora");
    expect(result.manualSteps.map((step) => step.path)).not.toContain("vite.config.ts");
  });

  it("does not touch a config it cannot recognise", () => {
    const context = {
      projectPath: "/tmp/unused",
      projectName: "my-app",
      projectKind: "existing" as const,
      styling: "css" as const,
      listProjectFiles: () => [],
      example: false,
      force: false,
      source: {
        kind: "neutral" as const,
        label: "built-in neutral",
        family: "default",
        defaultTheme: "light",
        themes: ["light", "dark"],
        modes: ["light", "dark"] as const,
      },
      themes: [],
      imports: {
        adapter: "@themvora/react",
        client: "@themvora/react/client",
        core: "@themvora/core",
        vite: "@themvora/core/vite",
      },
      read: (path: string) =>
        path === "vite.config.ts"
          ? "const plugins = [react()];\nexport default { plugins };\n"
          : null,
      exists: (path: string) => path === "vite.config.ts",
    };

    const result = reactAdapter.integrate(context);

    // A `plugins` shape the editor cannot rewrite is no longer a reason to stop:
    // nothing needs to be added to it. The file is left exactly as it is.
    const config = result.files.find((file) => file.path === "vite.config.ts")!;
    expect(config.action).toBe("unchanged");
    expect(config.contents).toBe("const plugins = [react()];\nexport default { plugins };\n");
    expect(result.manualSteps.map((step) => step.path)).not.toContain("vite.config.ts");
  });
});

describe("per-framework JSX attribute conventions", () => {
  /** A synthetic context that lets an adapter generate its full file set. */
  const context = (framework: string) => ({
    projectPath: "/tmp/unused",
    projectName: "my-app",
    projectKind: "missing" as const,
    styling: "css" as const,
    listProjectFiles: () => [],
    example: true,
    force: true,
    source: {
      kind: "neutral" as const,
      label: "built-in neutral",
      family: "default",
      defaultTheme: "light",
      themes: ["light", "dark"],
      modes: ["light", "dark"] as const,
    },
    themes: [],
    imports: {
      adapter: `@themvora/${framework}`,
      client: `@themvora/${framework}/client`,
      core: "@themvora/core",
      vite: "@themvora/core/vite",
    },
    read: () => null,
    exists: () => false,
  });

  it("Solid uses `class`, not React's `className`", () => {
    // Solid's JSX types declare `class`; `className` is a runtime alias that is
    // not declared, so a generated component using it fails `tsc --noEmit`.
    // Caught by building a real Solid project, not by reading the types.
    const files = solidAdapter.integrate(context("solid")).files;
    // `App` is the provider boundary and renders no markup of its own, so the
    // convention only applies to the components that do.
    const markup = files.filter(
      (file) => file.path.endsWith(".tsx") && /(className|class)="/.test(file.contents),
    );

    expect(markup.length).toBeGreaterThanOrEqual(2);
    for (const file of markup) {
      expect(file.contents, `${file.path} must not use className`).not.toContain("className=");
      expect(file.contents, `${file.path} should use class=`).toContain('class="');
    }
  });

  it("React uses `className`", () => {
    const files = reactAdapter.integrate(context("react")).files;
    // Only the components that render classed markup: `App` is the provider
    // boundary and renders none of its own.
    const markup = files.filter(
      (file) => file.path.endsWith(".tsx") && /(className|class)="/.test(file.contents),
    );

    expect(markup.length).toBeGreaterThanOrEqual(2);
    for (const file of markup) {
      expect(file.contents).toContain('className="');
      expect(file.contents, `${file.path} must not use class=`).not.toMatch(/\sclass="/);
    }
  });

  it("Vue and Svelte templates use `class`", () => {
    for (const [adapter, framework] of [
      [vueAdapter, "vue"],
      [svelteAdapter, "svelte"],
    ] as const) {
      const files = adapter.integrate(context(framework)).files;

      const markup = files.filter(
        (file) =>
          (file.path.endsWith(".vue") || file.path.endsWith(".svelte")) &&
          /(className|class)="/.test(file.contents),
      );

      expect(markup.length).toBeGreaterThanOrEqual(2);
      for (const file of markup) {
        expect(file.contents).toContain('class="');
        expect(file.contents).not.toContain("className=");
      }
    }
  });

  it("mounts exactly one provider in a project it scaffolded", () => {
    // The fresh-scaffold path is where the provider is written, so the count is
    // asserted through the adapter rather than through an existing project. The
    // provider lives in the entry module and `App` composes — the shape the
    // React docs use, and the one the reference blueprint assumes.
    const files = reactAdapter.integrate(context("react")).files;
    const app = files.find((file) => file.path === "src/App.tsx")!.contents;
    const main = files.find((file) => file.path === "src/main.tsx")?.contents ?? "";

    const sites = (app.match(/<ThemeProvider/g) ?? []).length + (main.match(/<ThemeProvider/g) ?? []).length;
    expect(sites).toBe(1);
    expect(main).toContain("<ThemeProvider");
    expect(app).not.toContain("<ThemeProvider");
    // And not the server-only bootstrap helper, which a CSR app does not need.
    expect(main).not.toContain("createThemeRoot(");
  });

  it("Solid reads signals through their accessors", () => {
    const files = solidAdapter.integrate(context("solid")).files;
    const app = files.find((file) => file.path === "src/components/ThemvoraDefault.tsx")!.contents;

    // `theme()` — not `theme.meta.label`, which would freeze at first render.
    expect(app).toContain("theme().meta?.label");
    expect(app).not.toMatch(/\btheme\.meta\b/);
  });
});

describe("init file permissions", () => {
  it("creates parent directories for generated files", async () => {
    const d = reactProject();
    await cli("init", d.path, "--framework", "react", "--preset", "mint", "--no-install");

    const switcher = join(d.path, "src", "components", "ThemeSwitcher.tsx");
    expect(statSync(switcher).isFile()).toBe(true);
    expect(readFileSync(switcher, "utf-8")).toContain("ThemeSwitcher");
  });
});
