/**
 * The interactive prompt layer.
 *
 * Inquirer is wrapped rather than called directly from the wizard, for two
 * reasons that both matter to this package's test suite:
 *
 * - the wizard can be driven with a fake adapter, so prompt *order*, skipping
 *   and validation are testable without a terminal;
 * - cancellation is one predicate instead of a per-call `try`/`catch` around a
 *   library-specific error name.
 *
 * The adapter is only ever constructed when {@link promptsAllowed} says the
 * process is genuinely interactive. Nothing here is reachable from `--json`,
 * `--quiet`, `--plan`, `--dry-run`, CI, or a piped stdin.
 *
 * @packageDocumentation
 */
import inquirer from "inquirer";

/** One entry in a selection menu. */
export interface PromptChoice<T extends string> {
  /** The label the user sees. */
  name: string;
  /** The value returned when it is chosen. */
  value: T;
  /** A short explanation shown beside the label, where the terminal supports it. */
  description?: string;
}

/** The prompt operations the wizard needs. */
export interface PromptAdapter {
  /** Ask for a line of text. */
  input(options: {
    message: string;
    default?: string;
    validate?: (value: string) => true | string;
  }): Promise<string>;
  /** Ask the user to pick one entry from a menu. */
  select<T extends string>(options: {
    message: string;
    choices: readonly PromptChoice<T>[];
    default?: T;
  }): Promise<T>;
}

/** How a cancelled prompt is recognised. */
const CANCELLATION_NAMES = new Set([
  "ExitPromptError",
  "AbortPromptError",
  "CancelPromptError",
]);

/**
 * Whether an error is the user pressing Ctrl+C at a prompt.
 *
 * @param error - The value a prompt rejected with.
 * @returns `true` for a cancellation, `false` for a real failure.
 *
 * @remarks
 * Inquirer signals cancellation by throwing. Treating that as a crash would
 * print a stack trace and exit non-zero for a user who simply changed their
 * mind, so the caller maps it to a quiet cancellation instead.
 */
export function isPromptCancellation(error: unknown): boolean {
  return error instanceof Error && CANCELLATION_NAMES.has(error.name);
}

/**
 * Build the Inquirer-backed adapter.
 *
 * @returns The adapter the wizard uses in a real terminal.
 */
export function createPromptAdapter(): PromptAdapter {
  return {
    async input({ message, default: initial, validate }) {
      const answers = await inquirer.prompt<{ value: string }>([
        {
          type: "input",
          name: "value",
          message,
          ...(initial !== undefined ? { default: initial } : {}),
          ...(validate !== undefined ? { validate } : {}),
        },
      ]);
      return String(answers.value ?? "");
    },

    async select<T extends string>(options: {
      message: string;
      choices: readonly PromptChoice<T>[];
      default?: T;
    }): Promise<T> {
      const { message, choices, default: initial } = options;
      // The menu is built as a plain object and the answer is asserted to `T`:
      // Inquirer's own generic infers from the choice array, which cannot carry
      // the caller's union through `inquirer.prompt`.
      const question = {
        type: "select" as const,
        name: "value",
        message,
        choices: choices.map((choice) => ({
          name: choice.name,
          value: choice.value as string,
          ...(choice.description !== undefined ? { description: choice.description } : {}),
        })),
        ...(initial !== undefined ? { default: initial as string } : {}),
      };

      const answers = (await inquirer.prompt([question])) as { value: T };
      return answers.value;
    },
  };
}
