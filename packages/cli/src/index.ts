/**
 * Themvora CLI — programmatic entry points.
 *
 * Exposes the same commands as the `themvora` binary (`generate`, `list`,
 * `validate`, `inspect`, `diff`, `explain`, `audit`, `doctor`, `init`,
 * `migrate`, `export`), the `run` dispatcher, and `parseArgs`, `UsageError`,
 * `CommandExit` and `ExitCodes` for embedding or scripting.
 *
 * Everything else in this package — the command contract, the canonical
 * registry accessors, the framework registry, the `init` engine and the output
 * helpers — is internal. They are the implementation of the CLI, not an API for
 * consumers, and exporting them would freeze an internal shape into the
 * published surface.
 *
 * @packageDocumentation
 */
export { cmdGenerate } from "./commands/generate.js";
export { cmdList } from "./commands/list.js";
export { cmdValidate } from "./commands/validate.js";
export { cmdMigrate } from "./commands/migrate.js";
export { cmdInspect } from "./commands/inspect.js";
export { cmdExport } from "./commands/export.js";
export { cmdDiff } from "./commands/diff.js";
export { cmdExplain } from "./commands/explain.js";
export { cmdAudit } from "./commands/audit.js";
export { cmdDoctor } from "./commands/doctor.js";
export { cmdInit } from "./commands/init.js";
export { cmdCompletion } from "./commands/completion.js";
export { cmdAdd } from "./commands/add.js";
export { run } from "./run.js";
export { ExitCodes, CommandExit, UsageError } from "./exit-codes.js";
export { parseArgs } from "./utils.js";
export type { ParsedArgs, ParsedFlag } from "./utils.js";
export { VERSION } from "./version.js";
