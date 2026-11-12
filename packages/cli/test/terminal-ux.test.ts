/**
 * The terminal-output abstraction.
 *
 * These tests pin the contract that makes the CLI safe to script: colour is
 * opt-in by environment, decoration is suppressed when there is no terminal, and
 * a machine-readable run never sees a banner or a spinner. They deliberately do
 * not assert on specific colours — only on whether escape sequences exist at
 * all — so restyling the output cannot fail the suite.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  animationsEnabled,
  colorEnabled,
  createProgress,
  paint,
  promptsAllowed,
  renderBanner,
  renderPanel,
} from "../src/output.js";
import { renderReport } from "../src/init/render.js";
import type { InitReport } from "../src/init/types.js";
import { parseArgs } from "../src/utils.js";

/** The ANSI escape introducer. */
const ESC = String.fromCharCode(27);

const saved = {
  NO_COLOR: process.env["NO_COLOR"],
  FORCE_COLOR: process.env["FORCE_COLOR"],
  CI: process.env["CI"],
  TERM: process.env["TERM"],
};

afterEach(() => {
  for (const key of ["NO_COLOR", "FORCE_COLOR", "CI", "TERM"] as const) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.restoreAllMocks();
});

/** Capture everything written to a stream. */
function capture(stream: NodeJS.WriteStream): { text: () => string; restore: () => void } {
  let text = "";
  const spy = vi.spyOn(stream, "write").mockImplementation((chunk: unknown): boolean => {
    text += String(chunk);
    return true;
  });
  return { text: () => text, restore: () => spy.mockRestore() };
}

describe("colour", () => {
  it("is off when stdout is not a terminal", () => {
    delete process.env["NO_COLOR"];
    delete process.env["FORCE_COLOR"];
    delete process.env["CI"];
    delete process.env["TERM"];
    expect(colorEnabled()).toBe(false);
  });

  it("honours NO_COLOR over FORCE_COLOR", () => {
    process.env["FORCE_COLOR"] = "1";
    process.env["NO_COLOR"] = "1";
    expect(colorEnabled()).toBe(false);
  });

  it("is off in CI and on a dumb terminal", () => {
    delete process.env["NO_COLOR"];
    delete process.env["FORCE_COLOR"];

    process.env["CI"] = "1";
    expect(colorEnabled()).toBe(false);

    delete process.env["CI"];
    process.env["TERM"] = "dumb";
    expect(colorEnabled()).toBe(false);
  });

  it("emits no escape sequences when disabled", () => {
    delete process.env["FORCE_COLOR"];
    expect(paint("bold", "plain")).toBe("plain");
    expect(paint("green", "plain")).not.toContain(ESC);
  });

  it("emits escape sequences when forced", () => {
    process.env["FORCE_COLOR"] = "1";
    expect(paint("bold", "styled")).toContain(ESC);
  });
});

describe("animations", () => {
  it("are off without a TTY, in CI, and on a dumb terminal", () => {
    delete process.env["CI"];
    delete process.env["TERM"];
    expect(animationsEnabled()).toBe(false);

    process.env["CI"] = "1";
    expect(animationsEnabled()).toBe(false);

    delete process.env["CI"];
    process.env["TERM"] = "dumb";
    expect(animationsEnabled()).toBe(false);
  });
});

describe("prompts", () => {
  it("are forbidden by --json, --quiet, --plan and --dry-run", () => {
    for (const flag of ["--json", "--quiet", "--plan", "--dry-run"]) {
      expect(promptsAllowed(parseArgs([flag])), flag).toBe(false);
    }
  });

  it("are forbidden in CI and on a dumb terminal", () => {
    delete process.env["CI"];
    delete process.env["TERM"];
    expect(promptsAllowed(parseArgs([]))).toBe(true);

    process.env["CI"] = "1";
    expect(promptsAllowed(parseArgs([]))).toBe(false);

    delete process.env["CI"];
    process.env["TERM"] = "dumb";
    expect(promptsAllowed(parseArgs([]))).toBe(false);
  });
});

describe("banner", () => {
  it("degrades to a wordmark on a narrow terminal", () => {
    delete process.env["FORCE_COLOR"];
    expect(renderBanner(40)).toBe("THEMVORA");
  });

  it("fits the width it is given", () => {
    delete process.env["FORCE_COLOR"];
    for (const columns of [48, 60, 80, 120]) {
      const banner = renderBanner(columns);
      expect(banner.length, `${columns} columns`).toBeGreaterThan(0);
      for (const line of banner.split("\n")) {
        expect(line.length, `${columns} columns`).toBeLessThanOrEqual(columns);
      }
    }
  });

  it("carries no escape sequences when colour is off", () => {
    delete process.env["FORCE_COLOR"];
    expect(renderBanner(120)).not.toContain(ESC);
  });
});

describe("panel", () => {
  it("clamps its width on a wide terminal and stays usable on a narrow one", () => {
    delete process.env["FORCE_COLOR"];

    const wide = renderPanel("hello", { columns: 200 });
    for (const line of wide.split("\n")) expect(line.length).toBeLessThanOrEqual(76);

    const narrow = renderPanel("hello", { columns: 10 });
    for (const line of narrow.split("\n")) expect(line.length).toBeLessThanOrEqual(24);
  });

  it("carries no escape sequences when colour is off", () => {
    delete process.env["FORCE_COLOR"];
    expect(renderPanel("hello", { tone: "success" })).not.toContain(ESC);
  });
});

describe("progress", () => {
  it("prints nothing decorative in quiet mode", () => {
    const stderr = capture(process.stderr);
    try {
      const progress = createProgress({ quiet: true });
      progress.start("Installing dependencies", "npm install");
      progress.succeed("Installed");
      progress.stop();
    } finally {
      stderr.restore();
    }
    expect(stderr.text()).toBe("");
  });

  it("still reports a failure in quiet mode", () => {
    const stderr = capture(process.stderr);
    try {
      const progress = createProgress({ quiet: true });
      progress.start("Installing dependencies");
      progress.fail("Installation failed");
    } finally {
      stderr.restore();
    }
    expect(stderr.text()).toContain("Installation failed");
  });

  it("writes plain lines to stderr when animation is unavailable", () => {
    const stderr = capture(process.stderr);
    try {
      const progress = createProgress();
      progress.start("Installing dependencies", "npm install @themvora/core");
      progress.succeed("Installed dependencies");
    } finally {
      stderr.restore();
    }

    const text = stderr.text();
    expect(text).toContain("Installing dependencies");
    // The command is the only record of what ran, so a plain run keeps it.
    expect(text).toContain("npm install @themvora/core");
    expect(text).toContain("Installed dependencies");
    expect(text).not.toContain(ESC);
  });

  it("stops cleanly when a step is abandoned", () => {
    const stderr = capture(process.stderr);
    try {
      const progress = createProgress();
      progress.start("Scaffolding");
      expect(() => progress.stop()).not.toThrow();
      expect(() => progress.stop()).not.toThrow();
    } finally {
      stderr.restore();
    }
  });

  it("does not leave a step running after a failure", () => {
    const stderr = capture(process.stderr);
    try {
      const progress = createProgress();
      progress.start("Scaffolding");
      progress.fail("Scaffolding failed");
      // The step is over: a following stop must not repeat the failure line.
      progress.stop();
    } finally {
      stderr.restore();
    }

    const text = stderr.text();
    expect(text).toContain("Scaffolding failed");
    expect(text.match(/Scaffolding failed/g)).toHaveLength(1);
  });
});

describe("the completion summary", () => {
  const report: InitReport = {
    version: 1,
    projectPath: "/tmp/my-app",
    framework: "React",
    packageManager: "pnpm",
    created: ["src/App.tsx"],
    updated: [],
    unchanged: [],
    skipped: [],
    deleted: [],
    scaffolded: true,
    installed: true,
    verification: [
      { id: "build", title: "Build", status: "pass" },
      { id: "typecheck", title: "Typecheck", status: "skipped", detail: "no script" },
    ],
    manualSteps: [],
    warnings: [],
    nextSteps: ["cd /tmp/my-app", "pnpm run dev"],
  };

  it("names the project, the framework and the manager", () => {
    const text = renderReport(report);
    expect(text).toContain("Project created successfully!");
    expect(text).toContain("my-app · React · pnpm");
    expect(text).toContain("1 created");
  });

  it("lists the commands that start the app, and never starts it", () => {
    const text = renderReport(report);
    expect(text).toContain("Next steps:");
    expect(text).toContain("cd /tmp/my-app");
    expect(text).toContain("pnpm run dev");
  });

  it("stays plain text when colour is off", () => {
    delete process.env["FORCE_COLOR"];
    expect(renderReport(report)).not.toContain(ESC);
  });

  it("fits the terminal width it is given", () => {
    delete process.env["FORCE_COLOR"];
    const text = renderReport(report, { columns: 60 });

    // The panel is the width-constrained element; the structured lines below it
    // are short by construction.
    const panelLines = text.split("\n").filter((line) => /^[╭│╰]/.test(line));
    expect(panelLines.length).toBeGreaterThan(0);
    for (const line of panelLines) expect(line.length).toBeLessThanOrEqual(58);
  });
});
