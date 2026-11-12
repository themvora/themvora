/**
 * The interactive `init` wizard.
 *
 * Every test drives the real resolver with a scripted prompt adapter, so what is
 * asserted is the behaviour a terminal user sees — prompt order, which questions
 * are skipped, which answers win — without a TTY, and without a generator ever
 * being spawned.
 */
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cmdInit, type InitDependencies } from "../src/commands/init.js";
import { UsageError } from "../src/exit-codes.js";
import type { PromptAdapter, PromptChoice } from "../src/init/prompts.js";
import { DEFAULT_STYLING, resolveStyling } from "../src/init/styling.js";
import { resolveInitIntent, validateProjectName } from "../src/init/wizard.js";
import { parseArgs } from "../src/utils.js";
import { captureCommand } from "./helpers.js";

/** A prompt call the fake recorded. */
interface PromptCall {
  kind: "input" | "select";
  message: string;
  choices?: readonly PromptChoice<string>[];
  default?: string;
}

/**
 * A prompt adapter that replays a fixed answer list and records every question.
 *
 * Validation is executed, not ignored: a test that scripts an invalid name must
 * see the same rejection a real prompt would produce.
 */
function fakePrompt(answers: readonly string[]): {
  calls: PromptCall[];
  adapter: PromptAdapter;
} {
  const calls: PromptCall[] = [];
  let index = 0;

  const adapter: PromptAdapter = {
    async input(options: {
      message: string;
      default?: string;
      validate?: (value: string) => true | string;
    }): Promise<string> {
      calls.push({
        kind: "input",
        message: options.message,
        ...(options.default !== undefined ? { default: options.default } : {}),
      });

      const value = answers[index++] ?? "";
      const verdict = options.validate?.(value);
      if (verdict !== undefined && verdict !== true) throw new Error(verdict);
      return value;
    },

    async select<T extends string>(options: {
      message: string;
      choices: readonly PromptChoice<T>[];
      default?: T;
    }): Promise<T> {
      calls.push({
        kind: "select",
        message: options.message,
        choices: options.choices,
        ...(options.default !== undefined ? { default: options.default } : {}),
      });

      const wanted = answers[index++];
      const choice = options.choices.find((entry) => entry.value === wanted);
      if (!choice) throw new Error(`scripted answer "${wanted}" is not a choice`);
      return choice.value;
    },
  };

  return { calls, adapter };
}

const dirs: string[] = [];

/**
 * `CI` and `TERM` are part of the prompt gate, so they are neutralised for the
 * whole file: a suite that asserted "the wizard runs" would otherwise pass
 * locally and fail on the very CI it is meant to protect.
 */
const savedEnv = { CI: process.env["CI"], TERM: process.env["TERM"] };

beforeEach(() => {
  delete process.env["CI"];
  process.env["TERM"] = "xterm-256color";
});

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();

  if (savedEnv.CI === undefined) delete process.env["CI"];
  else process.env["CI"] = savedEnv.CI;
  if (savedEnv.TERM === undefined) delete process.env["TERM"];
  else process.env["TERM"] = savedEnv.TERM;
});

/** A throwaway working directory, entered for the duration of a test. */
function workspace(files: Record<string, string> = {}): string {
  const path = mkdtempSync(join(tmpdir(), "themvora-wizard-"));
  dirs.push(path);
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(path, name), contents);
  }
  return path;
}

/** Run `fn` with `cwd` as the process working directory. */
async function inDir<T>(cwd: string, fn: () => Promise<T>): Promise<T> {
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    return await fn();
  } finally {
    process.chdir(previous);
  }
}

/** A React project, so detection has something to find. */
const REACT_PROJECT = {
  "package.json": JSON.stringify({
    name: "existing-app",
    dependencies: { react: "^19.0.0" },
  }),
  "package-lock.json": "",
};

/** Run `cmdInit` in-process with both streams captured. */
async function runInit(
  argv: string[],
  deps: InitDependencies = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return captureCommand(() => cmdInit(parseArgs(argv), deps));
}

describe("wizard — prompt order", () => {
  it("asks for the project name, then the package manager, then the framework, then styling", async () => {
    const cwd = workspace();
    const prompt = fakePrompt(["my-app", "pnpm", "react", "tailwind"]);

    const intent = await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init"]),
        interactive: true,
        prompt: prompt.adapter,
      }),
    );

    expect(prompt.calls.map((call) => call.kind)).toEqual([
      "input",
      "select",
      "select",
      "select",
    ]);
    expect(prompt.calls.map((call) => call.message)).toEqual([
      "What would you like to name your project?",
      "Which package manager would you like to use?",
      "Which framework would you like to use?",
      "Would you like to use Tailwind CSS with Themvora?",
    ]);
    expect(intent).toMatchObject({
      target: "my-app",
      frameworkId: "react",
      packageManager: "pnpm",
      styling: "tailwind",
      projectName: "my-app",
      wizard: true,
    });
  });

  it("offers all four package managers", async () => {
    const cwd = workspace();
    const prompt = fakePrompt(["my-app", "bun", "vue", "tailwind"]);

    await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init"]),
        interactive: true,
        prompt: prompt.adapter,
      }),
    );

    const manager = prompt.calls.find((call) => call.message.includes("package manager"));
    expect(manager?.choices?.map((choice) => choice.value)).toEqual([
      "npm",
      "pnpm",
      "yarn",
      "bun",
    ]);
  });

  it("offers exactly the five frameworks init can scaffold", async () => {
    const cwd = workspace();
    const prompt = fakePrompt(["my-app", "npm", "solid", "tailwind"]);

    await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init"]),
        interactive: true,
        prompt: prompt.adapter,
      }),
    );

    const framework = prompt.calls.find((call) => call.message.includes("framework"));
    expect(framework?.choices?.map((choice) => choice.value)).toEqual([
      "react",
      "next",
      "vue",
      "svelte",
      "solid",
    ]);
    // Every entry is explained, so the menu is not five bare ids.
    expect(framework?.choices?.every((choice) => (choice.description ?? "").length > 0)).toBe(true);
  });

  it("preselects the invoking package manager", async () => {
    const cwd = workspace();
    const prompt = fakePrompt(["my-app", "yarn", "react", "tailwind"]);

    await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init"]),
        interactive: true,
        prompt: prompt.adapter,
        env: { npm_config_user_agent: "pnpm/9.1.0 npm/? node/v22.0.0 win32 x64" },
      }),
    );

    const manager = prompt.calls.find((call) => call.message.includes("package manager"));
    expect(manager?.default).toBe("pnpm");
  });

  it("falls back to npm as the preselected manager", async () => {
    const cwd = workspace();
    const prompt = fakePrompt(["my-app", "npm", "react", "tailwind"]);

    await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init"]),
        interactive: true,
        prompt: prompt.adapter,
        env: {},
      }),
    );

    const manager = prompt.calls.find((call) => call.message.includes("package manager"));
    expect(manager?.default).toBe("npm");
  });
});

describe("wizard — partial arguments skip answered questions", () => {
  it("asks only for the manager and framework when the directory is named", async () => {
    const cwd = workspace();
    const prompt = fakePrompt(["pnpm", "next", "tailwind"]);

    const intent = await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init", "my-app"]),
        interactive: true,
        prompt: prompt.adapter,
      }),
    );

    expect(prompt.calls.map((call) => call.kind)).toEqual(["select", "select", "select"]);
    expect(intent.target).toBe("my-app");
    expect(intent.frameworkId).toBe("next");
  });

  it("asks only for the framework and styling when the manager was supplied", async () => {
    const cwd = workspace();
    const prompt = fakePrompt(["svelte", "css"]);

    const intent = await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init", "my-app", "--tool", "pnpm"]),
        interactive: true,
        prompt: prompt.adapter,
      }),
    );

    expect(prompt.calls.map((call) => call.message)).toEqual([
      "Which framework would you like to use?",
      "Would you like to use Tailwind CSS with Themvora?",
    ]);
    expect(intent.packageManager).toBe("pnpm");
    expect(intent.frameworkId).toBe("svelte");
    expect(intent.styling).toBe("css");
  });

  it("asks only for the manager and styling when the framework was supplied", async () => {
    const cwd = workspace();
    const prompt = fakePrompt(["bun", "tailwind"]);

    const intent = await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init", "my-app", "--framework", "react"]),
        interactive: true,
        prompt: prompt.adapter,
      }),
    );

    expect(prompt.calls.map((call) => call.message)).toEqual([
      "Which package manager would you like to use?",
      "Would you like to use Tailwind CSS with Themvora?",
    ]);
    expect(intent.frameworkId).toBe("react");
    expect(intent.packageManager).toBe("bun");
    expect(intent.styling).toBe("tailwind");
  });

  it("asks nothing when every value was supplied", async () => {
    const cwd = workspace();
    const prompt = fakePrompt([]);

    const intent = await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs([
          "init",
          "my-app",
          "--tool",
          "pnpm",
          "--framework",
          "react",
          "--styling",
          "css",
        ]),
        interactive: true,
        prompt: prompt.adapter,
        styling: "css",
      }),
    );

    expect(prompt.calls).toEqual([]);
    expect(intent.wizard).toBe(false);
    expect(intent).toMatchObject({
      target: "my-app",
      frameworkId: "react",
      packageManager: "pnpm",
      styling: "css",
    });
  });

  it("does not ask for a manager when the framework was supplied and a manager flag was too", async () => {
    const cwd = workspace();
    const prompt = fakePrompt([]);

    const intent = await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs([
          "init",
          "my-app",
          "--framework",
          "react",
          "--package-manager",
          "yarn",
          "--styling",
          "tailwind",
        ]),
        interactive: true,
        prompt: prompt.adapter,
        styling: "tailwind",
      }),
    );

    expect(prompt.calls).toEqual([]);
    expect(intent.packageManager).toBe("yarn");
  });
});

describe("styling default resolution", () => {
  it("resolves to plain CSS when the flag is absent", () => {
    expect(resolveStyling(parseArgs(["init"]))).toEqual({ styling: "css", explicit: false });
  });

  it("takes the flag as authoritative in both directions", () => {
    expect(resolveStyling(parseArgs(["init", "--styling", "css"]))).toEqual({
      styling: "css",
      explicit: true,
    });
    expect(resolveStyling(parseArgs(["init", "--styling", "tailwind"]))).toEqual({
      styling: "tailwind",
      explicit: true,
    });
  });

  it("tolerates case and whitespace, and rejects anything else", () => {
    expect(resolveStyling(parseArgs(["init", "--styling", " Tailwind "])).styling).toBe("tailwind");
    expect(() => resolveStyling(parseArgs(["init", "--styling", "sass"]))).toThrow(UsageError);
  });

  it("keeps exactly one default, shared by the flag and the prompt", () => {
    // The point of the shared constant: a wizard that preselects something the
    // flag does not default to is the inconsistency this test exists to catch.
    expect(DEFAULT_STYLING).toBe("css");
    expect(resolveStyling(parseArgs(["init"])).styling).toBe(DEFAULT_STYLING);
  });
});

describe("wizard — the styling question", () => {
  it("asks whether to use Tailwind, with two explained choices", async () => {
    const cwd = workspace();
    const prompt = fakePrompt(["my-app", "npm", "react", "tailwind"]);

    await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init"]),
        interactive: true,
        prompt: prompt.adapter,
      }),
    );

    const styling = prompt.calls.find((call) => call.message.includes("Tailwind"));
    expect(styling?.message).toBe("Would you like to use Tailwind CSS with Themvora?");
    expect(styling?.choices?.map((choice) => choice.value)).toEqual(["tailwind", "css"]);
    expect(styling?.choices?.map((choice) => choice.name)).toEqual([
      "Yes — Tailwind CSS",
      "No — Plain CSS",
    ]);
    expect(styling?.choices?.every((choice) => (choice.description ?? "").length > 0)).toBe(true);
  });

  it("preselects Plain CSS, the same default a non-interactive run uses", async () => {
    const cwd = workspace();
    const prompt = fakePrompt(["my-app", "npm", "react", "css"]);

    const intent = await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init"]),
        interactive: true,
        prompt: prompt.adapter,
      }),
    );

    const styling = prompt.calls.find((call) => call.message.includes("Tailwind"));
    expect(styling?.default).toBe("css");
    // The prompt and the flag read the same constant, so pressing Enter here and
    // running without a terminal produce the same project.
    expect(intent.styling).toBe(DEFAULT_STYLING);
  });

  it("resolves Yes to the Tailwind engine and No to plain CSS", async () => {
    for (const [answer, expected] of [
      ["tailwind", "tailwind"],
      ["css", "css"],
    ] as const) {
      const cwd = workspace();
      const prompt = fakePrompt(["my-app", "npm", "react", answer]);

      const intent = await inDir(cwd, () =>
        resolveInitIntent({
          args: parseArgs(["init"]),
          interactive: true,
          prompt: prompt.adapter,
        }),
      );

      expect(intent.styling, `answer "${answer}"`).toBe(expected);
    }
  });

  it("skips the question when --styling already answered it", async () => {
    for (const styling of ["tailwind", "css"] as const) {
      const cwd = workspace();
      const prompt = fakePrompt(["my-app", "npm", "react"]);

      const intent = await inDir(cwd, () =>
        resolveInitIntent({
          args: parseArgs(["init", "--styling", styling]),
          interactive: true,
          prompt: prompt.adapter,
          styling,
        }),
      );

      expect(
        prompt.calls.map((call) => call.message),
        `--styling ${styling} must not prompt for styling`,
      ).toEqual([
        "What would you like to name your project?",
        "Which package manager would you like to use?",
        "Which framework would you like to use?",
      ]);
      expect(intent.styling).toBe(styling);
    }
  });

  it("never asks an existing project — its stylesheets are the user's", async () => {
    const cwd = workspace(REACT_PROJECT);
    const prompt = fakePrompt([]);

    const intent = await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init"]),
        interactive: true,
        prompt: prompt.adapter,
      }),
    );

    expect(prompt.calls).toEqual([]);
    expect(intent.styling).toBeUndefined();
  });

  it("exits 130 and writes nothing when cancelled at the styling question", async () => {
    const cwd = workspace();
    let asked = 0;
    const adapter: PromptAdapter = {
      input: async () => {
        asked += 1;
        return "my-app";
      },
      select: async <T extends string>(options: {
        choices: readonly PromptChoice<T>[];
      }): Promise<T> => {
        asked += 1;
        // name → manager → framework → styling; the fourth one is cancelled.
        if (asked === 4) throw Object.assign(new Error("cancelled"), { name: "ExitPromptError" });
        return options.choices[asked - 2]!.value;
      },
    };

    const result = await inDir(cwd, () =>
      runInit(["init", "--no-install"], { prompt: adapter, promptsEnabled: true }),
    );

    expect(result.code).toBe(130);
    expect(result.stderr).toContain("Cancelled.");
    expect(readdirSync(cwd)).toEqual([]);
  });
});

describe("wizard — existing projects are integrated, never re-created", () => {
  it("detects the framework and asks nothing", async () => {
    const cwd = workspace(REACT_PROJECT);
    const prompt = fakePrompt([]);

    const intent = await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init"]),
        interactive: true,
        prompt: prompt.adapter,
      }),
    );

    expect(prompt.calls).toEqual([]);
    expect(intent.frameworkId).toBe("react");
    expect(intent.target).toBe(".");
    expect(intent.wizard).toBe(false);
  });

  it("integrates a named existing directory instead of scaffolding a new one", async () => {
    const cwd = workspace();
    mkdirSync(join(cwd, "existing-app"));
    writeFileSync(join(cwd, "existing-app", "package.json"), REACT_PROJECT["package.json"]);
    writeFileSync(join(cwd, "existing-app", "package-lock.json"), "");

    const prompt = fakePrompt([]);
    const intent = await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init", "existing-app"]),
        interactive: true,
        prompt: prompt.adapter,
      }),
    );

    expect(prompt.calls).toEqual([]);
    expect(intent.target).toBe("existing-app");
    expect(intent.frameworkId).toBe("react");
  });

  it("names the supported frameworks when an existing project has none", async () => {
    const cwd = workspace({
      "package.json": JSON.stringify({ name: "plain", dependencies: { lodash: "^4.0.0" } }),
    });

    await expect(
      inDir(cwd, () =>
        resolveInitIntent({
          args: parseArgs(["init"]),
          interactive: true,
          prompt: fakePrompt([]).adapter,
        }),
      ),
    ).rejects.toThrow(/could not detect a supported framework.*react, next, vue, svelte, solid/s);
  });
});

describe("wizard — project name validation", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = workspace();
  });

  it("rejects an empty name", () => {
    expect(validateProjectName("", cwd)).toBe("a project name is required");
    expect(validateProjectName("   ", cwd)).toBe("a project name is required");
  });

  it("rejects path traversal and separators", () => {
    expect(validateProjectName("..", cwd)).toBe('choose a name other than "." or ".."');
    expect(validateProjectName("../evil", cwd)).toMatch(/single directory name/);
    expect(validateProjectName("a/b", cwd)).toMatch(/single directory name/);
    expect(validateProjectName("a\\b", cwd)).toMatch(/single directory name/);
  });

  it("rejects characters a generator cannot safely receive", () => {
    expect(validateProjectName("my app", cwd)).toMatch(/letters, digits, dots/);
    expect(validateProjectName("app;rm", cwd)).toMatch(/letters, digits, dots/);
    expect(validateProjectName("app$(id)", cwd)).toMatch(/letters, digits, dots/);
    expect(validateProjectName("-leading", cwd)).toMatch(/letters, digits, dots/);
  });

  it("refuses a directory that already holds a project", () => {
    mkdirSync(join(cwd, "taken"));
    writeFileSync(join(cwd, "taken", "package.json"), "{}");
    expect(validateProjectName("taken", cwd)).toMatch(/already exists and is not empty/);
  });

  it("accepts a fresh name, and an existing empty directory", () => {
    expect(validateProjectName("my-app", cwd)).toBe(true);
    expect(validateProjectName("my.app_2", cwd)).toBe(true);
    mkdirSync(join(cwd, "empty-dir"));
    expect(validateProjectName("empty-dir", cwd)).toBe(true);
  });

  it("surfaces the rejection through the prompt instead of scaffolding", async () => {
    const target = workspace();
    const prompt = fakePrompt(["my app"]);

    await expect(
      inDir(target, () =>
        resolveInitIntent({
          args: parseArgs(["init"]),
          interactive: true,
          prompt: prompt.adapter,
        }),
      ),
    ).rejects.toThrow(/letters, digits, dots/);
    expect(readdirSync(target)).toEqual([]);
  });
});

describe("wizard — cancellation", () => {
  it("exits 130, says so, and writes nothing", async () => {
    const cwd = workspace();
    const adapter: PromptAdapter = {
      input: () => Promise.reject(Object.assign(new Error("cancelled"), { name: "ExitPromptError" })),
      select: () => Promise.reject(new Error("unreachable")),
    };

    const result = await inDir(cwd, () =>
      runInit(["init"], { prompt: adapter, promptsEnabled: true }),
    );

    expect(result.code).toBe(130);
    expect(result.stderr).toContain("Cancelled.");
    expect(readdirSync(cwd)).toEqual([]);
  });

  it("does not print a stack trace for a cancellation", async () => {
    const cwd = workspace();
    const adapter: PromptAdapter = {
      input: () => Promise.reject(Object.assign(new Error("cancelled"), { name: "ExitPromptError" })),
      select: () => Promise.reject(new Error("unreachable")),
    };

    const result = await inDir(cwd, () =>
      runInit(["init"], { prompt: adapter, promptsEnabled: true }),
    );

    expect(result.stderr).not.toMatch(/\bat .*\.ts:\d+/);
  });
});

describe("wizard — end to end", () => {
  it("creates the named project and reports the dev command", async () => {
    const cwd = workspace();
    const prompt = fakePrompt(["my-app", "pnpm", "react", "tailwind"]);

    const result = await inDir(cwd, () =>
      runInit(["init", "--no-install"], {
        prompt: prompt.adapter,
        promptsEnabled: true,
        // The generator is faked: nothing is downloaded, nothing is spawned.
        run: () => ({ ok: true }),
      }),
    );

    expect(result.code).toBe(0);
    // The wizard introduction is printed once, and only for the wizard.
    expect(result.stdout).toContain("Create a Themvora application.");
    expect(result.stdout).toContain("Project created successfully!");
    expect(result.stdout).toContain("pnpm run dev");
    expect(readdirSync(cwd)).toContain("my-app");
  });

  it("scaffolds in place when the directory is given explicitly", async () => {
    const cwd = workspace();
    const prompt = fakePrompt(["npm", "react", "tailwind"]);

    const result = await inDir(cwd, () =>
      runInit(["init", ".", "--no-install"], {
        prompt: prompt.adapter,
        promptsEnabled: true,
        run: () => ({ ok: true }),
      }),
    );

    expect(result.code).toBe(0);
    // No name question: `.` is an explicit request to use this directory.
    expect(prompt.calls.map((call) => call.kind)).toEqual(["select", "select", "select"]);
  });
});

describe("wizard — non-interactive runs never prompt", () => {
  it("refuses a new project with no framework and names the flag", async () => {
    const cwd = workspace();

    await expect(
      inDir(cwd, () =>
        resolveInitIntent({
          args: parseArgs(["init", "my-app"]),
          interactive: false,
          prompt: fakePrompt([]).adapter,
        }),
      ),
    ).rejects.toBeInstanceOf(UsageError);
  });

  it("plans without prompting when the framework is supplied", async () => {
    const cwd = workspace();
    const prompt = fakePrompt([]);

    const intent = await inDir(cwd, () =>
      resolveInitIntent({
        args: parseArgs(["init", "my-app", "--framework", "react"]),
        interactive: false,
        prompt: prompt.adapter,
      }),
    );

    expect(prompt.calls).toEqual([]);
    expect(intent.packageManager).toBeUndefined();
  });

  it.each([
    ["--json"],
    ["--quiet"],
    ["--plan"],
    ["--dry-run"],
  ])("does not launch the wizard under %s", async (flag) => {
    const cwd = workspace();
    const prompt = fakePrompt(["my-app", "npm", "react", "tailwind"]);

    // `promptsEnabled: true` overrides only the TTY check; the flag contract
    // still wins, which is what keeps these modes non-interactive.
    const result = await inDir(cwd, () =>
      runInit(["init", "my-app", "--framework", "react", "--no-install", flag], {
        prompt: prompt.adapter,
        promptsEnabled: true,
        run: () => ({ ok: true }),
      }),
    );

    expect(prompt.calls).toEqual([]);
    expect(result.stdout).not.toContain("Create a Themvora application.");
    expect(result.code).toBe(0);
  });

  it("does not launch the wizard in CI", async () => {
    const cwd = workspace();
    const prompt = fakePrompt(["my-app", "npm", "react", "tailwind"]);
    const previous = process.env["CI"];
    process.env["CI"] = "1";

    try {
      const result = await inDir(cwd, () =>
        runInit(["init", "my-app", "--framework", "react", "--no-install"], {
          prompt: prompt.adapter,
          promptsEnabled: true,
          run: () => ({ ok: true }),
        }),
      );

      expect(prompt.calls).toEqual([]);
      expect(result.code).toBe(0);
    } finally {
      if (previous === undefined) delete process.env["CI"];
      else process.env["CI"] = previous;
    }
  });
});
