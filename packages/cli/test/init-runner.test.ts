/**
 * The `init` process runner's output contract.
 *
 * `init` shells out to the framework's own generator, then to the project's own
 * `typecheck`/`build` scripts. Everything those children print is commentary, and
 * commentary must never reach the CLI's stdout: `themvora init --json` writes its
 * report there, so a child's banner interleaved into it makes the payload
 * unparseable for any consumer piping the command into a JSON parser.
 *
 * The end-to-end proof of that lives in the external consumer harness (stdout has
 * to be a real descriptor for the contamination to be observable at all — an
 * in-process spy on `process.stdout.write` cannot see a child writing to fd 1).
 * What is pinned here is the invariant that prevents it: the runner never hands a
 * child the parent's stdout, and it faithfully uses the descriptors it is given.
 */
import { openSync, closeSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { childCommandStdio, createProcessRunner } from "../src/init/runner.js";

const dirs: string[] = [];

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "themvora-runner-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("init process runner — child output never reaches the CLI's stdout", () => {
  it("routes a child's stdout to the parent's stderr, not its stdout", () => {
    const stdio = childCommandStdio() as unknown[];
    // Slot 1 is the child's stdout. fd 1 and "inherit" are both forbidden: either
    // one puts the generator's banner and the build's output into the CLI's own
    // stdout, which is where `--json` writes its payload.
    expect(stdio[1]).not.toBe("inherit");
    expect(stdio[1]).not.toBe(1);
    expect(stdio[1]).toBe(2);
    // The child's stderr is commentary too, and belongs on the parent's stderr.
    expect(stdio[2]).toBe(2);
    // stdin stays attached so a generator that prompts still can.
    expect(stdio[0]).toBe("inherit");
  });

  it("writes a child's streams to the descriptors it is given", () => {
    const dir = scratch();
    const outPath = join(dir, "out.txt");
    const errPath = join(dir, "err.txt");
    const outFd = openSync(outPath, "w+");
    const errFd = openSync(errPath, "w+");

    // A script file rather than `-e`: the runner enables a shell on Windows, and
    // an inline script's quotes and semicolons do not survive that trip intact.
    writeFileSync(
      join(dir, "probe.mjs"),
      "process.stdout.write('CHILD-OUT');\nprocess.stderr.write('CHILD-ERR');\n",
      "utf8",
    );

    try {
      const run = createProcessRunner(["ignore", outFd, errFd]);
      const result = run(
        { command: process.execPath, args: ["probe.mjs"], description: "probe" },
        { cwd: dir },
      );

      expect(result.ok).toBe(true);
      // The runner forwards each stream to the descriptor it was handed — which
      // is what makes the default configuration meaningful.
      expect(readFileSync(outPath, "utf8")).toBe("CHILD-OUT");
      expect(readFileSync(errPath, "utf8")).toBe("CHILD-ERR");
    } finally {
      closeSync(outFd);
      closeSync(errFd);
    }
  });

  it("reports a non-zero exit as a failure rather than throwing", () => {
    const run = createProcessRunner(["ignore", "ignore", "ignore"]);
    const result = run(
      { command: process.execPath, args: ["-e", "process.exit(7)"], description: "probe" },
      { cwd: scratch() },
    );
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("7");
  });

  it("passes arguments with spaces and quotes through verbatim", () => {
    // The runner enables a shell only for Windows `.cmd`/`.bat` shims. For every
    // other command it spawns directly, so an argument is never re-parsed by
    // `cmd.exe` — which would strip quotes and split on spaces.
    const dir = scratch();
    const outPath = join(dir, "args.txt");
    const errPath = join(dir, "args-err.txt");
    const outFd = openSync(outPath, "w+");
    const errFd = openSync(errPath, "w+");

    const payload = 'a b "c" & d | e';

    try {
      const run = createProcessRunner(["ignore", outFd, errFd]);
      const result = run(
        {
          command: process.execPath,
          args: [
            "-e",
            "process.stdout.write(process.argv[1])",
            payload,
          ],
          description: "args",
        },
        { cwd: dir },
      );

      expect(result.ok).toBe(true);
      expect(readFileSync(outPath, "utf8")).toBe(payload);
    } finally {
      closeSync(outFd);
      closeSync(errFd);
    }
  });

  it.skipIf(process.platform !== "win32")(
    "runs a package-manager shim through the shell",
    () => {
      // The one path that *does* need a shell: `npm` resolves to `npm.cmd`,
      // which cannot be spawned directly on Windows.
      const run = createProcessRunner(["ignore", "ignore", "ignore"]);
      const result = run(
        { command: "npm", args: ["--version"], description: "npm --version" },
        { cwd: scratch() },
      );
      expect(result.ok, result.detail).toBe(true);
    },
  );

  it.skipIf(process.platform !== "win32")(
    "runs an explicit .cmd shim through the shell",
    () => {
      const run = createProcessRunner(["ignore", "ignore", "ignore"]);
      const result = run(
        { command: "npm.cmd", args: ["--version"], description: "npm.cmd --version" },
        { cwd: scratch() },
      );
      expect(result.ok, result.detail).toBe(true);
    },
  );
});
