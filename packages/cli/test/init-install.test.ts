/**
 * Scaffolding and installation, end to end.
 *
 * The process runner is faked, so nothing is downloaded and no generator runs.
 * What is asserted is the sequence Themvora drives — scaffold once, integrate,
 * install once, verify — and that the generator's own install is never part of
 * it. That sequence is the whole point of the change: the previous flow asked
 * the user "Install and start now?" and then installed Themvora's packages
 * anyway, so either answer produced a redundant or contradictory install.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { cmdInit, type InitDependencies } from "../src/commands/init.js";
import type { CommandStep } from "../src/init/types.js";
import { parseArgs } from "../src/utils.js";
import { captureCommand } from "./helpers.js";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function scratch(): string {
  const path = mkdtempSync(join(tmpdir(), "themvora-install-"));
  dirs.push(path);
  return path;
}

/** An existing React project with the scripts verification looks for. */
function reactProject(scripts: Record<string, string> = {}): string {
  const path = scratch();
  writeFileSync(
    join(path, "package.json"),
    JSON.stringify(
      {
        name: "fixture",
        private: true,
        type: "module",
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
        devDependencies: { vite: "^6.0.0" },
        scripts,
      },
      null,
      2,
    ),
  );
  writeFileSync(join(path, "package-lock.json"), "");
  writeFileSync(
    join(path, "vite.config.ts"),
    'import { defineConfig } from "vite";\n\nexport default defineConfig({ plugins: [] });\n',
  );
  return path;
}

/** Run `init` with a recording runner and a fixed set of command outcomes. */
async function runWithCommands(
  argv: string[],
  outcomes: (step: CommandStep) => boolean = () => true,
): Promise<{ commands: CommandStep[]; result: Awaited<ReturnType<typeof captureCommand>> }> {
  const commands: CommandStep[] = [];
  const deps: InitDependencies = {
    promptsEnabled: false,
    commandAvailable: () => true,
    run: (step) => {
      commands.push(step);
      return outcomes(step) ? { ok: true } : { ok: false, detail: "exit 1" };
    },
  };

  const result = await captureCommand(() => cmdInit(parseArgs(argv), deps));
  return { commands, result };
}

/** The commands, rendered as strings, for readable assertions. */
function lines(commands: readonly CommandStep[]): string[] {
  return commands.map((step) => [step.command, ...step.args].join(" "));
}

describe("a new project installs dependencies exactly once", () => {
  it("runs the scaffold, then a single install, and never a dev server", async () => {
    const cwd = scratch();
    const previous = process.cwd();
    process.chdir(cwd);

    try {
      const { commands, result } = await runWithCommands([
        "init",
        "my-app",
        "--tool",
        "pnpm",
        "--framework",
        "react",
      ]);

      expect(result.code, result.output).toBe(0);

      const rendered = lines(commands);
      const installs = rendered.filter((line) => line.startsWith("pnpm add"));
      expect(installs).toHaveLength(1);
      expect(installs[0]).toContain("@themvora/core");
      expect(installs[0]).toContain("@themvora/react");

      // The generator is asked to scaffold, and asked to not install.
      expect(rendered[0]).toContain("create vite@latest");
      expect(rendered[0]).toContain("--no-interactive");

      // Nothing starts the application.
      expect(rendered.some((line) => /(^|\s)dev(\s|$)/.test(line))).toBe(false);
    } finally {
      process.chdir(previous);
    }
  });

  it("still runs one install when a styling engine needs build-time packages", async () => {
    const cwd = scratch();
    const previous = process.cwd();
    process.chdir(cwd);

    try {
      const { commands, result } = await runWithCommands([
        "init",
        "my-app",
        "--tool",
        "npm",
        "--framework",
        "react",
        "--styling",
        "tailwind",
      ]);

      expect(result.code, result.output).toBe(0);

      const rendered = lines(commands);
      const installs = rendered.filter((line) => line.startsWith("npm install"));
      expect(installs, rendered.join("\n")).toHaveLength(1);
      // The build-time packages live in the manifest that install reads, not in
      // a command of their own.
      expect(installs[0]).not.toContain("tailwindcss");
      expect(rendered.some((line) => line.includes("-D"))).toBe(false);
    } finally {
      process.chdir(previous);
    }
  });

  it("installs nothing at all under --no-install, but still scaffolds", async () => {
    const cwd = scratch();
    const previous = process.cwd();
    process.chdir(cwd);

    try {
      const { commands, result } = await runWithCommands([
        "init",
        "my-app",
        "--tool",
        "npm",
        "--framework",
        "react",
        "--no-install",
      ]);

      expect(result.code, result.output).toBe(0);
      expect(commands).toHaveLength(1);
      expect(lines(commands)[0]).toContain("create vite@latest");
      expect(result.stdout).toContain("Project created successfully!");
    } finally {
      process.chdir(previous);
    }
  });

  it("writes the framework and core packages into the plan", async () => {
    const cwd = scratch();
    const previous = process.cwd();
    process.chdir(cwd);

    try {
      const result = await captureCommand(() =>
        cmdInit(
          parseArgs([
            "init",
            "my-app",
            "--tool",
            "pnpm",
            "--framework",
            "next",
            "--plan",
            "--json",
          ]),
          { promptsEnabled: false },
        ),
      );

      const plan = result.json<{ packages: string[]; installStep: { args: string[] } | null }>();
      expect(plan.packages).toContain("@themvora/next");
      expect(plan.installStep?.args).toContain("@themvora/next");
    } finally {
      process.chdir(previous);
    }
  });
});

describe("failures are reported, not hidden", () => {
  it("reports a failed install and stops before verifying", async () => {
    const project = reactProject({ build: "vite build" });

    const { commands, result } = await runWithCommands(
      ["init", project, "--framework", "react"],
      (step) => !step.args.includes("@themvora/core"),
    );

    expect(result.code).toBe(1);
    expect(String(result.error)).toContain("installing dependencies failed");
    expect(result.stderr).toContain("Dependency installation failed");

    // The build was never reached.
    expect(lines(commands).some((line) => line.includes("build"))).toBe(false);
  });

  it("reports a failed scaffold with the command that failed", async () => {
    const cwd = scratch();
    const previous = process.cwd();
    process.chdir(cwd);

    try {
      const { result } = await runWithCommands(
        ["init", "my-app", "--tool", "npm", "--framework", "react"],
        (step) => step.args.includes("--template") === false,
      );

      expect(result.code).toBe(1);
      expect(String(result.error)).toContain("the scaffold command failed");
      expect(result.stderr).toContain("Scaffolding React failed");
    } finally {
      process.chdir(previous);
    }
  });

  it("exits 3 when a verification step fails, after the files were written", async () => {
    const project = reactProject({ build: "vite build" });

    const { result } = await runWithCommands(
      ["init", project, "--framework", "react"],
      (step) => !(step.args.includes("build") || step.args.includes("typecheck")),
    );

    expect(result.code).toBe(3);
    expect(result.stderr).toContain("verification failed: build");
    // The project is still on disk: a failed verification does not roll back.
    expect(readFileSync(join(project, "package.json"), "utf8")).toContain("react");
  });

  it("passes verification when the project's own scripts succeed", async () => {
    const project = reactProject({ build: "vite build", typecheck: "tsc --noEmit" });

    const { commands, result } = await runWithCommands([
      "init",
      project,
      "--framework",
      "react",
    ]);

    expect(result.code, result.output).toBe(0);
    const rendered = lines(commands);
    expect(rendered).toContain("npm run typecheck");
    expect(rendered).toContain("npm run build");
    expect(result.stdout).toContain("Build");
  });

  it("skips dependency-backed verification under --no-install and says why", async () => {
    const project = reactProject({ build: "vite build" });

    const { commands, result } = await runWithCommands([
      "init",
      project,
      "--framework",
      "react",
      "--no-install",
    ]);

    expect(result.code, result.output).toBe(0);
    expect(commands).toHaveLength(0);
    expect(result.stdout).toContain("dependencies are not installed");
  });
});
