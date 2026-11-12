/**
 * Package-manager selection: `--tool`, its `--package-manager` alias, detection
 * and the commands each choice produces.
 *
 * The generators themselves are never spawned here. What is asserted is the
 * command Themvora *would* run — the flags, the executable and the argument
 * order — because that is the part the CLI owns.
 */
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { cmdInit } from "../src/commands/init.js";
import { UsageError } from "../src/exit-codes.js";
import { detectPackageManager } from "../src/init/detect.js";
import {
  PACKAGE_MANAGERS,
  assertManagerAvailable,
  defaultPackageManager,
  invokingPackageManager,
  isPackageManager,
  resolveExplicitPackageManager,
} from "../src/init/package-manager.js";
import { scaffoldCommand } from "../src/init/scaffold.js";
import { parseArgs } from "../src/utils.js";
import { cli, tempDir, type TempDir } from "./helpers.js";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function scratch(): string {
  const path = mkdtempSync(join(tmpdir(), "themvora-tool-"));
  dirs.push(path);
  return path;
}

/** Plan a new project with a given manager and return the JSON plan. */
async function planFor(manager: string, framework = "react") {
  const result = await cli(
    "init",
    "my-app",
    "--framework",
    framework,
    "--tool",
    manager,
    "--plan",
    "--json",
  );
  expect(result.code, result.output).toBe(0);
  return result.json<{
    packageManager: string;
    scaffold: { command: string; args: string[] } | null;
    installStep: { command: string; args: string[] } | null;
  }>();
}

describe("--tool and --package-manager resolve to one value", () => {
  it("accepts every supported manager", () => {
    for (const manager of PACKAGE_MANAGERS) {
      expect(resolveExplicitPackageManager(parseArgs(["--tool", manager]))).toBe(manager);
      expect(resolveExplicitPackageManager(parseArgs(["--package-manager", manager]))).toBe(
        manager,
      );
    }
  });

  it("is case- and whitespace-insensitive", () => {
    expect(resolveExplicitPackageManager(parseArgs(["--tool", " PNPM "]))).toBe("pnpm");
  });

  it("returns undefined when neither flag was given", () => {
    expect(resolveExplicitPackageManager(parseArgs([]))).toBeUndefined();
  });

  it("accepts both spellings when they agree", () => {
    expect(
      resolveExplicitPackageManager(parseArgs(["--tool", "bun", "--package-manager", "bun"])),
    ).toBe("bun");
  });

  it("rejects both spellings when they disagree", () => {
    expect(() =>
      resolveExplicitPackageManager(parseArgs(["--tool", "pnpm", "--package-manager", "yarn"])),
    ).toThrow(/disagree/);
  });

  it("rejects an unknown manager", () => {
    expect(() => resolveExplicitPackageManager(parseArgs(["--tool", "deno"]))).toThrow(
      /unknown package manager "deno"/,
    );
  });

  it("rejects a flag with no value", () => {
    expect(() => resolveExplicitPackageManager(parseArgs(["--tool"]))).toThrow(
      /--tool needs a value/,
    );
  });

  it("recognises only the four supported names", () => {
    expect(isPackageManager("pnpm")).toBe(true);
    expect(isPackageManager("deno")).toBe(false);
  });
});

describe("detection precedence", () => {
  it("reports a fallback when nothing identifies a manager", () => {
    const dir = scratch();
    const result = detectPackageManager(dir, null);

    expect(result.manager).toBe("npm");
    expect(result.source).toBe("fallback");
  });

  it("reports a lockfile when one is present", () => {
    const dir = scratch();
    writeFileSync(join(dir, "yarn.lock"), "");
    const result = detectPackageManager(dir, null);

    expect(result.manager).toBe("yarn");
    expect(result.source).toBe("lockfile");
  });

  it("lets the corepack field win over a lockfile", () => {
    const dir = scratch();
    writeFileSync(join(dir, "package-lock.json"), "");
    const result = detectPackageManager(dir, {
      name: "p",
      dependencies: [],
      devDependencies: [],
      scripts: {},
      packageManagerField: "pnpm@9.1.0",
    });

    expect(result.manager).toBe("pnpm");
    expect(result.source).toBe("declared");
  });

  it("reports several lockfiles as ambiguous", () => {
    const dir = scratch();
    writeFileSync(join(dir, "pnpm-lock.yaml"), "");
    writeFileSync(join(dir, "package-lock.json"), "");

    expect(detectPackageManager(dir, null).ambiguous).toBe(true);
  });
});

describe("the invoking package manager", () => {
  it("is read from npm_config_user_agent", () => {
    expect(
      invokingPackageManager({ npm_config_user_agent: "pnpm/9.1.0 npm/? node/v22.0.0" }),
    ).toBe("pnpm");
    expect(
      invokingPackageManager({ npm_config_user_agent: "bun/1.1.0 npm/? node/v22.0.0" }),
    ).toBe("bun");
  });

  it("is undefined for an unrecognised or absent agent", () => {
    expect(invokingPackageManager({})).toBeUndefined();
    expect(invokingPackageManager({ npm_config_user_agent: "deno/2.0.0" })).toBeUndefined();
  });

  it("seeds the default, which is npm when nothing is detectable", () => {
    expect(defaultPackageManager({ npm_config_user_agent: "yarn/4.0.0 npm/?" })).toBe("yarn");
    expect(defaultPackageManager({})).toBe("npm");
  });
});

describe("a missing executable is an error, not a substitution", () => {
  it("names the manager and the way out", () => {
    expect(() => assertManagerAvailable("pnpm", () => false)).toThrow(/pnpm is not available/);
    expect(() => assertManagerAvailable("pnpm", () => false)).toThrow(/--tool/);
  });

  it("passes when the executable is present", () => {
    expect(() => assertManagerAvailable("pnpm", () => true)).not.toThrow();
  });

  it("fails the run before anything is written", async () => {
    const cwd = scratch();
    const previous = process.cwd();
    process.chdir(cwd);

    try {
      await expect(
        cmdInit(parseArgs(["init", "my-app", "--tool", "pnpm", "--framework", "react"]), {
          commandAvailable: () => false,
          promptsEnabled: false,
        }),
      ).rejects.toBeInstanceOf(UsageError);

      expect(readdirSync(cwd)).toEqual([]);
    } finally {
      process.chdir(previous);
    }
  });

  it("does not probe when the manager came from detection", async () => {
    const dir: TempDir = tempDir();
    dir.write("package.json", JSON.stringify({ name: "p", dependencies: { react: "^19.0.0" } }));
    dir.write("package-lock.json", "");

    try {
      const result = await cli("init", dir.path, "--framework", "react", "--plan", "--json");
      expect(result.code, result.output).toBe(0);
      expect(result.json<{ packageManager: string }>().packageManager).toBe("npm");
    } finally {
      dir.cleanup();
    }
  });
});

describe("the generator receives the selected manager", () => {
  it("drives create-vite with each manager", async () => {
    const expected = {
      npm: ["create", "vite@latest", "my-app", "--", "--template", "react-ts", "--no-interactive"],
      pnpm: ["create", "vite@latest", "my-app", "--template", "react-ts", "--no-interactive"],
      yarn: ["create", "vite@latest", "my-app", "--template", "react-ts", "--no-interactive"],
      bun: ["create", "vite", "my-app", "--template", "react-ts", "--no-interactive"],
    } as const;

    for (const [manager, args] of Object.entries(expected)) {
      const plan = await planFor(manager);
      expect(plan.packageManager).toBe(manager);
      expect(plan.scaffold?.args, manager).toEqual(args);
    }
  });

  it("drives create-next-app with each manager", async () => {
    const expected: Record<string, { command: string; prefix: string[] }> = {
      npm: { command: "npx", prefix: ["--yes"] },
      pnpm: { command: "pnpm", prefix: ["dlx"] },
      yarn: { command: "yarn", prefix: ["dlx"] },
      bun: { command: "bunx", prefix: [] },
    };

    for (const [manager, invocation] of Object.entries(expected)) {
      const plan = await planFor(manager, "next");
      expect(plan.scaffold?.command, manager).toBe(invocation.command);
      expect(plan.scaffold?.args.slice(0, invocation.prefix.length), manager).toEqual(
        invocation.prefix,
      );
      expect(plan.scaffold?.args, manager).toContain(`--use-${manager}`);
    }
  });

  it("installs with each manager's own add syntax", async () => {
    const expected = {
      npm: ["install", "@themvora/core", "@themvora/react"],
      pnpm: ["add", "@themvora/core", "@themvora/react"],
      yarn: ["add", "@themvora/core", "@themvora/react"],
      bun: ["add", "@themvora/core", "@themvora/react"],
    } as const;

    for (const [manager, args] of Object.entries(expected)) {
      const plan = await planFor(manager);
      expect(plan.installStep?.command, manager).toBe(manager);
      expect(plan.installStep?.args, manager).toEqual(args);
    }
  });

  it("scaffolds every supported framework with Vite's template ids", () => {
    const templates: Record<string, string> = {
      react: "react-ts",
      vue: "vue-ts",
      svelte: "svelte-ts",
      solid: "solid-ts",
    };

    for (const [framework, template] of Object.entries(templates)) {
      const command = scaffoldCommand(framework, "my-app", "pnpm");
      expect(command, framework).not.toBeNull();
      expect(command?.args).toContain(template);
      expect(command?.args).toContain("--no-interactive");
    }
  });

  it("returns no command for a framework without a scaffold strategy", () => {
    expect(scaffoldCommand("nuxt", "my-app", "npm")).toBeNull();
  });
});

describe("the alias is still accepted by the command", () => {
  it("plans the same thing for --tool and --package-manager", async () => {
    const viaTool = await cli(
      "init",
      "my-app",
      "--tool",
      "yarn",
      "--framework",
      "react",
      "--plan",
      "--json",
    );
    const viaAlias = await cli(
      "init",
      "my-app",
      "--package-manager",
      "yarn",
      "--framework",
      "react",
      "--plan",
      "--json",
    );

    expect(viaTool.code).toBe(0);
    expect(viaAlias.code).toBe(0);
    expect(viaAlias.json<unknown>()).toEqual(viaTool.json<unknown>());
  });

  it("reports the conflict as a usage error", async () => {
    const result = await cli(
      "init",
      "my-app",
      "--tool",
      "pnpm",
      "--package-manager",
      "yarn",
      "--framework",
      "react",
      "--plan",
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain("disagree");
  });

  it("documents both spellings in help", async () => {
    const result = await cli("init", "--help");

    expect(result.stdout).toContain("--tool <name>");
    expect(result.stdout).toContain("--package-manager");
  });
});
