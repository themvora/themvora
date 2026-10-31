/**
 * Reading arguments off the command bus.
 *
 * VS Code command arguments are untyped, so a command that accepts an optional
 * URI has to prove the value is one. Duck-typing on `fsPath` is deliberate:
 * `instanceof Uri` compares against the host's class identity, which is not
 * reliable for a value produced in another context (a test, another extension, a
 * deserialised argument).
 *
 * @packageDocumentation
 */
import type { Uri } from "vscode";

/**
 * Interpret a command argument as a URI.
 *
 * @param value - The argument.
 * @returns The URI, or `undefined` when the argument is not one.
 */
export function asUri(value: unknown): Uri | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  const candidate = value as { fsPath?: unknown };
  return typeof candidate.fsPath === "string" ? (value as Uri) : undefined;
}
