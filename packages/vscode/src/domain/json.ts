/**
 * A narrow JSON guard.
 *
 * Used wherever untrusted JSON has to be narrowed to an object before its keys
 * are read — a theme document, a `package.json`. Arrays are excluded because
 * every caller wants a keyed object, and `typeof [] === "object"` is the trap
 * this exists to avoid.
 *
 * @packageDocumentation
 */

/**
 * Whether a value is a plain object.
 *
 * @param value - The value to test.
 * @returns `true` for a non-null, non-array object.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
