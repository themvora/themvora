/**
 * The in-process CLI harness.
 *
 * Every command is driven through `run()` with `process.stdout.write` and
 * `process.stderr.write` captured, so a test can assert on exactly what a user
 * would see and on the exit code — without spawning a child process. That
 * matters on this host: capturing a child's piped stdio is unreliable here, so a
 * subprocess-based suite would not run at all.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { vi } from "vitest";
import { run } from "../src/run.js";

/** One captured CLI invocation. */
export interface CliResult {
  /** The exit code `run()` returned. */
  code: number;
  /** Everything written to stdout. */
  stdout: string;
  /** Everything written to stderr. */
  stderr: string;
  /** `stdout` and `stderr` concatenated, for "the user saw this" assertions. */
  output: string;
  /** `stdout` parsed as JSON. Throws when stdout is not valid JSON. */
  json: <T = unknown>() => T;
}

/**
 * Run the CLI in-process with stdout/stderr captured.
 *
 * @param argv - The arguments after `themvora`.
 * @returns The exit code and captured streams.
 */
export async function cli(...argv: string[]): Promise<CliResult> {
  let stdout = "";
  let stderr = "";

  const outSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: unknown): boolean => {
      stdout += String(chunk);
      return true;
    });
  const errSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: unknown): boolean => {
      stderr += String(chunk);
      return true;
    });

  try {
    const code = await run(argv);
    return {
      code,
      stdout,
      stderr,
      output: stdout + stderr,
      json: <T,>() => JSON.parse(stdout) as T,
    };
  } finally {
    outSpy.mockRestore();
    errSpy.mockRestore();
  }
}

/** A throwaway directory for tests that touch the filesystem. */
export interface TempDir {
  path: string;
  /** Write a file into the directory and return its absolute path. */
  write: (name: string, contents: string) => string;
  /** Read a file back out of the directory. */
  read: (name: string) => string;
  /** Remove the directory. */
  cleanup: () => void;
}

/**
 * Create a throwaway directory.
 *
 * @returns The directory handle. Call `cleanup()` when finished.
 */
export function tempDir(): TempDir {
  const path = mkdtempSync(join(tmpdir(), "themvora-cli-"));

  return {
    path,
    write(name, contents) {
      const file = join(path, name);
      // A nested name (`themes/broken.json`) needs its parent first.
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, contents, "utf8");
      return file;
    },
    read(name) {
      return readFileSync(join(path, name), "utf8");
    },
    cleanup() {
      rmSync(path, { recursive: true, force: true });
    },
  };
}
