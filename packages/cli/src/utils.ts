/**
 * A flag exactly as it was written on the command line.
 *
 * Recorded because a command may need the *order* the user typed flags in, and
 * an object keyed by flag name cannot express it — `--brand a --preset b` and
 * `--preset b --brand a` produce identical `ParsedArgs` keys but are different
 * requests.
 */
export interface ParsedFlag {
  /** The flag name, without leading dashes. */
  key: string;
  /** The flag's value, or `true` for a boolean flag. */
  value: string | true;
}

/**
 * The result of parsing command-line arguments.
 *
 * Positional arguments are collected in `_`; flags and their values are stored
 * under their key (with or without leading dashes).
 */
export interface ParsedArgs {
  /** Positional (non-flag) arguments in order. */
  _: string[];
  /** Every flag, in the order it appeared. */
  __flags: ParsedFlag[];
  [key: string]: any;
}

/**
 * Parses an array of command-line arguments into a {@link ParsedArgs} object.
 *
 * Supports `--flag value`, `--flag` (boolean), `-f value`, and `-f` (boolean)
 * forms. Repeated flags accumulate into an array. Positional arguments are
 * collected under `_`.
 *
 * @param argv The raw argument array (for example `process.argv.slice(2)`).
 * @returns The parsed arguments.
 *
 * @see {@link UsageError}
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = { _: [], __flags: [] };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];

      if (next !== undefined && !next.startsWith("-")) {
        const existing = result[key];
        if (Array.isArray(existing)) {
          existing.push(next);
        } else if (existing !== undefined) {
          result[key] = [existing, next];
        } else {
          result[key] = next;
        }
        result.__flags.push({ key, value: next });
        i++;
      } else {
        result[key] = true;
        result.__flags.push({ key, value: true });
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      const key = arg.slice(1);
      const next = argv[i + 1];

      if (next !== undefined && !next.startsWith("-")) {
        result[key] = next;
        result.__flags.push({ key, value: next });
        i++;
      } else {
        result[key] = true;
        result.__flags.push({ key, value: true });
      }
    } else {
      result._.push(arg);
    }
  }

  return result;
}

export function getString(args: ParsedArgs, key: string, fallback?: string): string | undefined {
  const val = args[key];
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val[0] as string | undefined;
  return fallback;
}

/**
 * Reads a boolean flag.
 *
 * `--flag` parses to `true`; an absent flag is `false`. A flag that was given a
 * value (`--flag=false`) is treated as present-but-not-true only for the literal
 * strings `"false"` and `"0"`, so `--flag false` behaves the way a shell user
 * expects.
 *
 * @param args The parsed command-line arguments.
 * @param key The flag name, without leading dashes.
 * @returns Whether the flag is set.
 */
export function getBool(args: ParsedArgs, key: string): boolean {
  const val = args[key];
  if (val === undefined) return false;
  if (val === true) return true;
  if (typeof val === "string") return val !== "false" && val !== "0";
  return false;
}