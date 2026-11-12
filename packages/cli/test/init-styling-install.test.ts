/**
 * The install path, per styling mode and framework.
 *
 * A styling engine's build-time packages used to be installed by a second
 * `add -D` command, which resolved the same dependency tree twice for one new
 * project. They are now written into `package.json` before the install runs, so
 * there is exactly one package-manager invocation in both modes — and
 * `--no-install` produces a manifest that is complete enough to build.
 *
 * The generator is simulated: the fake runner writes the `package.json` and
 * `vite.config.ts` a real scaffold would leave behind. Everything after that —
 * the integration, the manifest edit, the install command, the verification —
 * is the real code.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { cmdInit, type InitDependencies } from "../src/commands/init.js";
import type { CommandStep } from "../src/init/types.js";
import { parseArgs } from "../src/utils.js";
import { captureCommand } from "./helpers.js";

const FRAMEWORKS = ["react", "next", "vue", "svelte", "solid"] as const;

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function scratch(): string {
  const path = mkdtempSync(join(tmpdir(), "themvora-styling-"));
  dirs.push(path);
  return path;
}

/** What each generator would have written, reduced to what the integration reads. */
function scaffoldOutput(framework: string): Record<string, string> {
  const viteConfig = `import { defineConfig } from "vite";\n\nexport default defineConfig({\n  plugins: [],\n});\n`;

  return {
    "package.json": `${JSON.stringify(
      {
        name: "my-app",
        private: true,
        type: "module",
        scripts: { dev: "vite", build: "vite build", typecheck: "tsc --noEmit" },
        dependencies: { [framework === "next" ? "next" : "react"]: "^19.0.0" },
      },
      null,
      2,
    )}\n`,
    ...(framework === "next" ? {} : { "vite.config.ts": viteConfig }),
  };
}

/**
 * Run `init <framework> my-app` with the generator simulated.
 *
 * The fake runner writes the scaffold's output the first time a scaffold command
 * is seen, which is what the integration re-reads.
 */
async function runScaffold(
  framework: string,
  styling: "css" | "tailwind",
  extra: string[] = [],
): Promise<{
  commands: CommandStep[];
  result: Awaited<ReturnType<typeof captureCommand>>;
  project: string;
}> {
  const cwd = scratch();
  const project = join(cwd, "my-app");
  const commands: CommandStep[] = [];

  const deps: InitDependencies = {
    promptsEnabled: false,
    commandAvailable: () => true,
    run: (step) => {
      commands.push(step);
      if (step.args.some((arg) => arg.includes("create"))) {
        mkdirSync(project, { recursive: true });
        for (const [name, contents] of Object.entries(scaffoldOutput(framework))) {
          writeFileSync(join(project, name), contents);
        }
      }
      return { ok: true };
    },
  };

  const previous = process.cwd();
  process.chdir(cwd);
  try {
    const result = await captureCommand(() =>
      cmdInit(
        parseArgs(["init", "my-app", "--tool", "npm", "--framework", framework, "--styling", styling, ...extra]),
        deps,
      ),
    );
    return { commands, result, project };
  } finally {
    process.chdir(previous);
  }
}

/** The package manager commands, as strings. */
function rendered(commands: readonly CommandStep[]): string[] {
  return commands.map((step) => [step.command, ...step.args].join(" "));
}

function manifest(project: string): {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} {
  return JSON.parse(readFileSync(join(project, "package.json"), "utf-8"));
}

describe.each(FRAMEWORKS)("%s — install path", (framework) => {
  it("records Tailwind's build-time packages before the single install", async () => {
    const { commands, result, project } = await runScaffold(framework, "tailwind");
    expect(result.code, result.output).toBe(0);

    const installs = rendered(commands).filter((line) => line.startsWith("npm install"));
    expect(installs, rendered(commands).join("\n")).toHaveLength(1);

    const plugin = framework === "next" ? "@tailwindcss/postcss" : "@tailwindcss/vite";
    const dev = manifest(project).devDependencies ?? {};
    expect(Object.keys(dev).sort()).toEqual([plugin, "tailwindcss"].sort());
    expect(dev["tailwindcss"]).toMatch(/^\^4\./);
  });

  it("adds no Tailwind dependency in plain-CSS mode", async () => {
    const { commands, result, project } = await runScaffold(framework, "css");
    expect(result.code, result.output).toBe(0);

    expect(rendered(commands).filter((line) => line.startsWith("npm install"))).toHaveLength(1);

    const dev = manifest(project).devDependencies ?? {};
    expect(Object.keys(dev)).toEqual([]);
    expect(JSON.stringify(manifest(project))).not.toContain("tailwind");
  });

  it("writes a complete manifest under --no-install, and installs nothing", async () => {
    const { commands, result, project } = await runScaffold(framework, "tailwind", ["--no-install"]);
    expect(result.code, result.output).toBe(0);

    // The generator ran; nothing else did.
    expect(rendered(commands)).toHaveLength(1);
    expect(rendered(commands)[0]).toContain("create");

    const plugin = framework === "next" ? "@tailwindcss/postcss" : "@tailwindcss/vite";
    const dev = manifest(project).devDependencies ?? {};
    expect(Object.keys(dev).sort()).toEqual([plugin, "tailwindcss"].sort());
  });

  it("keeps the package manager it was given for the install and the dev command", async () => {
    const { commands, result } = await runScaffold(framework, "tailwind");
    expect(result.code, result.output).toBe(0);

    const install = rendered(commands).find((line) => line.startsWith("npm install"))!;
    expect(install).toContain("@themvora/");
    expect(result.stdout).toContain("npm run dev");
  });
});
