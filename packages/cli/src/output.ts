import boxen from "boxen";
import { Chalk, type ChalkInstance } from "chalk";
import figlet from "figlet";
import ora, { type Ora } from "ora";
import type { ParsedArgs } from "./utils.js";

const STYLES = {
  bold: (chalk: ChalkInstance, text: string) => chalk.bold(text),
  dim: (chalk: ChalkInstance, text: string) => chalk.dim(text),
  red: (chalk: ChalkInstance, text: string) => chalk.red(text),
  green: (chalk: ChalkInstance, text: string) => chalk.green(text),
  yellow: (chalk: ChalkInstance, text: string) => chalk.yellow(text),
  cyan: (chalk: ChalkInstance, text: string) => chalk.cyan(text),
} as const;

export type ColorName = keyof typeof STYLES;

export function colorEnabled(): boolean {
  if (process.env["NO_COLOR"] !== undefined) return false;
  if (process.env["FORCE_COLOR"] !== undefined) return true;
  if (process.env["CI"] || process.env["TERM"] === "dumb") return false;
  return Boolean(process.stdout.isTTY);
}

export function animationsEnabled(): boolean {
  if (process.env["CI"] || process.env["TERM"] === "dumb") return false;
  return Boolean(process.stderr.isTTY);
}

/**
 * Whether the invocation's *flags* permit an interactive prompt.
 *
 * @param args - The parsed arguments.
 * @returns `false` for `--json`, `--quiet`, `--plan`, `--dry-run`, CI and a
 *   dumb terminal.
 *
 * @remarks
 * This is the half of the question a caller cannot override: those flags are
 * contracts about what the command may do, not hints about the terminal. The
 * other half — "is there a real TTY attached?" — is
 * {@link isInteractiveTerminal}.
 */
export function promptsAllowed(args: ParsedArgs): boolean {
  if (wantsJson(args) || wantsQuiet(args)) return false;
  if (args["plan"] === true || args["dry-run"] === true) return false;
  if (process.env["CI"] || process.env["TERM"] === "dumb") return false;
  return true;
}

/**
 * Whether a usable terminal is attached.
 *
 * @returns `true` when both stdin and stdout are TTYs.
 *
 * @remarks
 * Both are required: Inquirer reads keys from stdin and draws on stdout, so a
 * redirected either one turns a prompt into a hang or into garbage in a pipe.
 */
export function isInteractiveTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/**
 * Whether interactive prompts may be shown.
 *
 * @param args - The parsed arguments.
 * @returns `true` only when the flags allow it and a terminal is attached.
 */
export function promptsEnabled(args: ParsedArgs): boolean {
  return promptsAllowed(args) && isInteractiveTerminal();
}

export function paint(name: ColorName, text: string): string {
  const chalk = new Chalk({ level: colorEnabled() ? 1 : 0 });
  return STYLES[name](chalk, text);
}

export function heading(text: string): string {
  return paint("bold", text);
}

export function path(text: string): string {
  return paint("cyan", text);
}

export function command(text: string): string {
  return paint("cyan", text);
}

export function value(text: string): string {
  return paint("bold", text);
}

export function wantsJson(args: ParsedArgs): boolean {
  return args.json === true;
}

export function wantsQuiet(args: ParsedArgs): boolean {
  return args.quiet === true;
}

export function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function status(message: string): void {
  process.stderr.write(`${message}\n`);
}

export function info(message: string, quiet = false): void {
  if (!quiet) status(`${paint("cyan", "i")} ${message}`);
}

export function warning(message: string): void {
  status(`${paint("yellow", "!")} ${message}`);
}

export function success(message: string, quiet: boolean): void {
  if (quiet) return;
  process.stdout.write(`${paint("green", "✓")} ${message}\n`);
}

export function failure(message: string): void {
  process.stderr.write(`${paint("red", "✗")} ${message}\n`);
}

export interface TerminalProgress {
  /**
   * Begin a step.
   *
   * @param message - What is happening, in the present tense.
   * @param detail - The command behind it. Shown only when animation is off,
   *   where it is the only record of what actually ran.
   */
  start(message: string, detail?: string): void;
  succeed(message: string): void;
  fail(message: string): void;
  stop(): void;
}

/**
 * Build a progress reporter for one long-running operation.
 *
 * @param options - Whether the run is quiet or machine-readable.
 * @returns A reporter that is safe to call in any mode.
 *
 * @remarks
 * Three modes, one interface:
 *
 * - **animated** (a real terminal) — an Ora spinner on stderr, so stdout stays a
 *   payload;
 * - **plain** (a pipe, CI, `NO_COLOR`, `TERM=dumb`) — one line per step on
 *   stderr, including the command, because a log with no record of what ran is
 *   not a log;
 * - **quiet** — nothing at all, but a failure still reaches stderr through
 *   {@link fail}, because `--quiet` silences decoration, not errors.
 */
export function createProgress(options: { quiet?: boolean; json?: boolean } = {}): TerminalProgress {
  const quiet = options.quiet === true;
  const animated = !quiet && !options.json && animationsEnabled();
  let spinner: Ora | undefined;

  return {
    start(message, detail) {
      spinner?.stop();
      spinner = undefined;

      if (quiet) return;

      if (!animated) {
        status(`  ${message}`);
        if (detail) status(`    ${paint("dim", detail)}`);
        return;
      }

      // The command is printed even with animation on: "the exact command being
      // run is printed before it runs" is a documented guarantee, and a spinner
      // that only says "Scaffolding…" does not keep it.
      if (detail) status(`  ${paint("dim", detail)}`);

      spinner = ora({
        text: message,
        stream: process.stderr,
        isEnabled: true,
        color: colorEnabled() ? "cyan" : false,
      }).start();
    },
    succeed(message) {
      if (quiet) {
        spinner?.stop();
        spinner = undefined;
        return;
      }
      if (spinner) {
        spinner.succeed(message);
        spinner = undefined;
        return;
      }
      status(`${paint("green", "✓")} ${message}`);
    },
    fail(message) {
      if (spinner && !quiet) {
        spinner.fail(message);
        spinner = undefined;
        return;
      }
      spinner?.stop();
      spinner = undefined;
      failure(message);
    },
    stop() {
      spinner?.stop();
      spinner = undefined;
    },
  };
}

/**
 * Render the Themvora wordmark.
 *
 * @param columns - The terminal width to fit. Defaults to the real terminal.
 * @returns The banner, already coloured when colour is enabled.
 *
 * @remarks
 * Three widths, so the banner never wraps and never dominates: the full
 * `Standard` figlet face, a `Small` face below 72 columns, and a plain
 * uppercase wordmark below 48 — where even `Small` would be wider than the
 * terminal.
 */
export function renderBanner(columns = process.stdout.columns ?? 80): string {
  if (columns < 48) return paint("bold", "THEMVORA");
  const text = figlet.textSync("Themvora", {
    font: columns < 72 ? "Small" : "Standard",
    horizontalLayout: "fitted",
  });
  return paint("cyan", text);
}

/**
 * Render a bordered panel.
 *
 * @param content - The body. May contain newlines.
 * @param options - The width to fit, an optional title, and the border tone.
 * @returns The boxed text.
 *
 * @remarks
 * `maxWidth` is clamped to 76 so a panel stays readable on a wide terminal,
 * and floored at 24 so it stays a panel on a narrow one. The border colour is
 * omitted rather than set to `undefined` when colour is off — the box still
 * draws, it simply draws in the terminal's default colour.
 */
export function renderPanel(
  content: string,
  options: { columns?: number; title?: string; tone?: "info" | "success" | "warning" } = {},
): string {
  const columns = options.columns ?? process.stdout.columns ?? 80;
  const borderColor =
    options.tone === "success" ? "green" : options.tone === "warning" ? "yellow" : "cyan";

  return boxen(content, {
    borderStyle: "round",
    margin: 0,
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    maxWidth: Math.max(24, Math.min(76, columns - 2)),
    ...(options.title !== undefined ? { title: options.title } : {}),
    ...(colorEnabled() ? { borderColor } : {}),
  });
}

export function formatCommand(command: string, args: readonly string[]): string {
  return [command, ...args].join(" ");
}
