/**
 * The result envelope every client operation returns.
 *
 * One shape for every operation, whether it succeeded, failed validation, was
 * cancelled before it started, or could not run at all. Callers can therefore
 * branch on `outcome` once instead of pattern-matching per operation, and the
 * original diagnostics are preserved rather than flattened into a message.
 *
 * `exitCode` exists because the Themvora CLI has a documented exit-code contract
 * that later milestones must honour when a CLI transport lands. Core operations
 * do not have a process exit code, so the envelope derives the value the CLI
 * *would* have returned from the same outcome. That keeps one contract from the
 * start instead of retrofitting semantics later.
 *
 * @packageDocumentation
 */

/**
 * How an operation ended.
 *
 * - `ok` — completed; `value` is set.
 * - `validation-failed` — the theme was read but is not valid.
 * - `usage` — the request itself was wrong (an unparseable seed, say).
 * - `error` — the operation failed for a reason the caller cannot fix by
 *   changing the request.
 * - `cancelled` — aborted before doing any work. Never conflated with a failure:
 *   a user who cancels has not produced an invalid theme.
 * - `unavailable` — the capability does not exist in this build.
 */
export type Outcome =
  | "ok"
  | "validation-failed"
  | "usage"
  | "error"
  | "cancelled"
  | "unavailable";

/**
 * The CLI's exit codes, keyed by outcome.
 *
 * `null` means the situation has no CLI equivalent: a cancelled operation was
 * killed rather than exited, and an unavailable capability never ran.
 *
 * These values mirror `packages/cli/src/exit-codes.ts`. `test/outcome.test.ts`
 * reads that file and fails if the two ever disagree, because importing the
 * constant would pull the CLI's `node:fs` graph into the bundle.
 */
export const OUTCOME_EXIT_CODES: Readonly<Record<Outcome, number | null>> = {
  ok: 0,
  error: 1,
  usage: 2,
  "validation-failed": 3,
  cancelled: null,
  unavailable: null,
};

/** One problem, with the structure the source provided. */
export interface Diagnostic {
  /** How serious it is. */
  readonly severity: "error" | "warning" | "info";
  /** Stable code, e.g. `TV_THEME_TOKEN_MISSING`. Safe to branch on. */
  readonly code: string;
  /** Human-readable description. May be reworded; do not parse it. */
  readonly message: string;
  /** Dot-separated token path, when the source supplied one. */
  readonly path?: string;
  /** What to do about it, when the source supplied one. */
  readonly hint?: string;
}

/** The result of one client operation. */
export interface OperationResult<T> {
  /** How it ended. */
  readonly outcome: Outcome;
  /** `true` only for {@link Outcome} `ok`. */
  readonly ok: boolean;
  /** The operation's value, or `null` when it did not produce one. */
  readonly value: T | null;
  /** Non-fatal diagnostics. Present on success and on failure. */
  readonly warnings: readonly Diagnostic[];
  /** Fatal diagnostics. Empty unless the operation failed. */
  readonly errors: readonly Diagnostic[];
  /** Why the operation was cancelled or unavailable; `null` otherwise. */
  readonly reason: string | null;
  /** `true` when the operation never ran because the capability is absent. */
  readonly skipped: boolean;
  /** The CLI exit code this outcome corresponds to, or `null`. */
  readonly exitCode: number | null;
  /** Wall-clock duration in milliseconds. */
  readonly durationMs: number;
}

/**
 * Build the envelope for one outcome.
 *
 * @param outcome - How the operation ended.
 * @param durationMs - How long it took.
 * @param fields - The rest of the envelope.
 * @returns The envelope.
 */
export function resultOf<T>(
  outcome: Outcome,
  durationMs: number,
  fields: {
    value?: T | null;
    warnings?: readonly Diagnostic[];
    errors?: readonly Diagnostic[];
    reason?: string | null;
  } = {},
): OperationResult<T> {
  const reason = fields.reason ?? null;

  return {
    outcome,
    ok: outcome === "ok",
    value: fields.value ?? null,
    warnings: fields.warnings ?? [],
    errors: fields.errors ?? [],
    reason,
    skipped: outcome === "unavailable",
    exitCode: OUTCOME_EXIT_CODES[outcome],
    durationMs,
  };
}
