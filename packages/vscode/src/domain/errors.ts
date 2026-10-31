/**
 * Turning a thrown value into something a user can act on.
 *
 * Core throws `ThemeError` with a `message`, `code`, `hint` and `context`;
 * Node throws `Error` with a `code` such as `ENOENT`; a rejected promise can
 * throw anything at all. A `catch (error: unknown)` block that assumes
 * `error instanceof Error` loses the diagnostic detail core deliberately
 * provides, so the shape is probed rather than assumed.
 *
 * @packageDocumentation
 */

/** The subset of core's `ThemeError` this module reads. */
interface DiagnosticLike {
  message: string;
  code?: string;
  hint?: string;
}

/** Whether a value carries the fields {@link describeError} reads. */
function isDiagnostic(value: unknown): value is DiagnosticLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

/**
 * Describe a thrown value in one line, keeping any hint core attached.
 *
 * @param error - Whatever was thrown.
 * @returns A sentence suitable for an error notification.
 */
export function describeError(error: unknown): string {
  if (isDiagnostic(error)) {
    const hint = typeof error.hint === "string" && error.hint.length > 0 ? ` ${error.hint}` : "";
    return `${error.message}${hint}`;
  }

  if (typeof error === "string" && error.length > 0) return error;
  return "An unknown error occurred.";
}
