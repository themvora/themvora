/**
 * The CLI dispatcher.
 *
 * Split out from `cli.ts` so the whole command surface can be driven
 * in-process. `cli.ts` is then a three-line bootstrap that turns the returned
 * exit code into `process.exit`.
 *
 * That split is not cosmetic: this host cannot reliably capture a child
 * process's piped stdio (`EBUSY`), so a test suite that shelled out to the
 * binary would not run here at all. Returning the exit code instead of calling
 * `process.exit` is what makes the commands testable.
 *
 * @packageDocumentation
 */
import { parseArgs } from "./utils.js";
import type { ParsedArgs } from "./utils.js";
import { CommandExit, ExitCodes, UsageError } from "./exit-codes.js";
import { VERSION } from "./version.js";
import {
  COMMAND_SPECS,
  findCommand,
  renderCommandHelp,
  renderMainHelp,
} from "./command-schema.js";
import { cmdGenerate } from "./commands/generate.js";
import { cmdValidate } from "./commands/validate.js";
import { cmdMigrate } from "./commands/migrate.js";
import { cmdInspect } from "./commands/inspect.js";
import { cmdExport } from "./commands/export.js";
import { cmdList } from "./commands/list.js";
import { cmdDiff } from "./commands/diff.js";
import { cmdExplain } from "./commands/explain.js";
import { cmdAudit } from "./commands/audit.js";
import { cmdDoctor } from "./commands/doctor.js";
import { cmdInit } from "./commands/init.js";
import { cmdCompletion } from "./commands/completion.js";
import { cmdAdd } from "./commands/add.js";

/**
 * The command implementations, keyed by canonical name.
 *
 * The command *contract* lives in `command-schema.json`; this map is the
 * dispatch half. A name in one and not the other is a bug the drift test
 * catches, so the two cannot diverge silently.
 */
const handlers: Record<string, (args: ParsedArgs) => Promise<void>> = {
  generate: cmdGenerate,
  list: cmdList,
  validate: cmdValidate,
  inspect: cmdInspect,
  diff: cmdDiff,
  explain: cmdExplain,
  audit: cmdAudit,
  doctor: cmdDoctor,
  init: cmdInit,
  add: cmdAdd,
  migrate: cmdMigrate,
  export: cmdExport,
  completion: cmdCompletion,
};

/** The canonical command names, for the unknown-command message. */
export const COMMAND_NAMES: readonly string[] = COMMAND_SPECS.map((spec) => spec.name);

/**
 * Run one CLI invocation.
 *
 * @param argv - The raw arguments, i.e. `process.argv.slice(2)`.
 * @returns The process exit code. Never throws.
 */
export async function run(argv: string[]): Promise<number> {
  const args = parseArgs(argv);

  if (args.version || args.v) {
    process.stdout.write(`${VERSION}\n`);
    return ExitCodes.OK;
  }

  const commandName = args._[0];

  if (!commandName) {
    process.stdout.write(`${renderMainHelp(VERSION)}\n`);
    return args.help || args.h ? ExitCodes.OK : ExitCodes.Usage;
  }

  const spec = findCommand(commandName);
  const handler = spec ? handlers[spec.name] : undefined;

  if (!spec || !handler) {
    process.stderr.write(`Unknown command: ${commandName}\n`);
    process.stderr.write(`Available commands: ${COMMAND_NAMES.join(", ")}\n`);
    return ExitCodes.Error;
  }

  if (args.help || args.h) {
    process.stdout.write(`${renderCommandHelp(spec)}\n`);
    return ExitCodes.OK;
  }

  try {
    await handler(args);
    return ExitCodes.OK;
  } catch (error) {
    if (error instanceof CommandExit) return error.code;

    if (error instanceof UsageError) {
      process.stderr.write(`Usage: ${spec.usage}\n`);
      process.stderr.write(`${error.message}\n`);
      return ExitCodes.Usage;
    }

    process.stderr.write(
      `Error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return ExitCodes.Error;
  }
}
