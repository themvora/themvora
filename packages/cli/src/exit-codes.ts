/**
 * Stable process exit codes for the `themvora` CLI.
 *
 * These are guaranteed by the command implementations and documented in the
 * CLI README and docs. Consumers (CI pipelines, editor integrations) can rely
 * on them without parsing stdout.
 */
export const ExitCodes = Object.freeze({
  /** Command completed successfully. */
  OK: 0,
  /** A runtime or command error occurred. */
  Error: 1,
  /** Invalid arguments / usage error. */
  Usage: 2,
  /** A theme failed validation (the `validate` command). */
  ValidationFailed: 3,
});

/**
 * Thrown by commands when the user passes invalid arguments. Reported by the
 * CLI runtime with exit code `Usage` (2) and a usage hint.
 *
 * @see {@link parseArgs}
 */
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

/**
 * Thrown by a command to end the run with a specific exit code after it has
 * already reported the reason.
 *
 * Commands do not call `process.exit` themselves: returning through the
 * dispatcher is what makes every command runnable in-process, which is how the
 * test suite asserts exit codes without spawning a child process.
 *
 * @see {@link ExitCodes}
 */
export class CommandExit extends Error {
  /** The process exit code to end the run with. */
  readonly code: number;

  constructor(code: number, message = "") {
    super(message);
    this.name = "CommandExit";
    this.code = code;
  }
}