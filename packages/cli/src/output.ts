/**
 * Output conventions shared by every command.
 *
 * Three rules the whole CLI follows, and this module is where they are
 * implemented so no command has to remember them:
 *
 * 1. **stdout carries the payload, stderr carries the commentary.** A command
 *    that emits JSON must stay parseable, so progress and status lines never go
 *    to stdout alongside it.
 * 2. **JSON output never contains terminal escape sequences.** Colour is applied
 *    to human output only, and `--json` implies `--no-color` behaviour.
 * 3. **Colour is opt-out.** `NO_COLOR` is honoured, and colour is only used when
 *    stdout is a TTY — CI logs and piped output stay plain.
 *
 * @packageDocumentation
 */
import type { ParsedArgs } from "./utils.js";

/** ANSI codes, kept private so nothing else has to think about them. */
const CODES = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
} as const;

type ColorName = keyof Omit<typeof CODES, "reset">;

/** Whether colour may be used for human output. */
export function colorEnabled(): boolean {
  if (process.env["NO_COLOR"] !== undefined) return false;
  if (process.env["FORCE_COLOR"] !== undefined) return true;
  return Boolean(process.stdout.isTTY);
}

/** Wrap text in an ANSI code, or return it unchanged when colour is off. */
export function paint(name: ColorName, text: string): string {
  if (!colorEnabled()) return text;
  return `${CODES[name]}${text}${CODES.reset}`;
}

/** `true` when the invocation asked for machine-readable output. */
export function wantsJson(args: ParsedArgs): boolean {
  return args.json === true;
}

/** `true` when the invocation asked for reduced human output. */
export function wantsQuiet(args: ParsedArgs): boolean {
  return args.quiet === true;
}

/**
 * Write a machine-readable payload to stdout.
 *
 * @param value - The value to serialise. Always pretty-printed for readable diffs.
 */
export function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Write a status or progress line.
 *
 * Goes to stderr so it can never contaminate a stdout payload.
 *
 * @param message - The message to print.
 */
export function status(message: string): void {
  process.stderr.write(`${message}\n`);
}

/**
 * Print a success line to stdout, unless `--quiet` was passed.
 *
 * @param message - The message to print.
 * @param quiet - Whether `--quiet` was requested.
 */
export function success(message: string, quiet: boolean): void {
  if (quiet) return;
  process.stdout.write(`${paint("green", "✓")} ${message}\n`);
}

/**
 * Print an error line to stderr. Never suppressed by `--quiet`.
 *
 * @param message - The message to print.
 */
export function failure(message: string): void {
  process.stderr.write(`${paint("red", "✗")} ${message}\n`);
}
