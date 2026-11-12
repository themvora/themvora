/**
 * The styling choice, resolved in one place.
 *
 * `init` can be told how to style the project it generates in two ways — the
 * `--styling` flag and the wizard's fourth question — and they must never
 * disagree. Both go through this module:
 *
 * - {@link resolveStyling} turns the flag into a value and says whether it was
 *   given, so the wizard knows whether to ask at all;
 * - {@link DEFAULT_STYLING} is the answer when nothing was given, and it is the
 *   value the wizard preselects.
 *
 * That second point is the whole reason this file exists. A prompt with its own
 * hard-coded default drifts from the flag's default the first time one of them
 * is changed, and the drift is invisible until a user compares an interactive
 * run with a scripted one.
 *
 * @packageDocumentation
 */
import { getString } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { UsageError } from "../exit-codes.js";
import type { StylingEngine } from "./types.js";

/**
 * The styling engine a project gets when nobody chose one.
 *
 * Plain CSS, for two reasons that apply in both execution modes: it is the only
 * choice that adds no build-time dependency, and it is the one a generated
 * project can always build. Tailwind is one flag — or one keystroke at the
 * prompt — away.
 */
export const DEFAULT_STYLING: StylingEngine = "css";

/**
 * Every styling engine `--styling` accepts, in the order they are documented.
 *
 * `css` is first because it is the default, and the first entry is what a
 * reader of `--help` sees before the alternatives.
 */
export const STYLING_ENGINES: readonly StylingEngine[] = ["css", "tailwind"];

/** The styling choice and whether the command line supplied it. */
export interface StylingChoice {
  /** The engine to use. */
  styling: StylingEngine;
  /** Whether `--styling` supplied {@link styling}, rather than the default. */
  explicit: boolean;
}

/**
 * Resolve the `--styling` choice.
 *
 * @param args - The parsed arguments.
 * @returns The selected engine — {@link DEFAULT_STYLING} when the flag is
 *   absent — and whether the user named it.
 *
 * @throws {UsageError} When the value is not a supported engine.
 *
 * @remarks
 * `explicit` is what lets the wizard stay silent when the command line already
 * answered, and what lets an existing-project run say which stylesheets the flag
 * can and cannot reach.
 */
export function resolveStyling(args: ParsedArgs): StylingChoice {
  const value = getString(args, "styling");
  if (value === undefined) return { styling: DEFAULT_STYLING, explicit: false };

  const needle = value.trim().toLowerCase() as StylingEngine;
  if (!STYLING_ENGINES.includes(needle)) {
    throw new UsageError(
      `unknown styling engine "${value}" — expected one of ${STYLING_ENGINES.join(", ")}`,
    );
  }
  return { styling: needle, explicit: true };
}
