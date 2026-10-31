/**
 * Capability detection.
 *
 * Detection is by **presence of the real public exports**, not by a version
 * number. Core publishes no version constant, and a version comparison would
 * only be a proxy for the question that actually matters: is the function this
 * operation calls here?
 *
 * That makes the report actionable. A missing export names the export, so an
 * incompatible `@themvora/core` produces "cannot generate: `generateTheme` is
 * not exported" rather than a generic failure.
 *
 * @packageDocumentation
 */

/** The operations the client can perform in-process. */
export type CoreOperation =
  | "generate"
  | "validate"
  | "catalog"
  | "diff"
  | "exportVariables"
  | "cssDocument"
  | "migrate";

/**
 * The public exports each operation needs.
 *
 * Kept as data so detection is a loop rather than six copies of the same check,
 * and so a test can assert the table against the real module.
 */
export const CORE_OPERATION_EXPORTS: Readonly<Record<CoreOperation, readonly string[]>> = {
  generate: ["generateTheme"],
  // `resolveTheme` is required because a theme that declares `extends` cannot be
  // validated or measured correctly without flattening it first.
  validate: ["validateTheme", "validateThemeLevels", "measureThemeContrast", "resolveTheme"],
  catalog: ["getPresetCatalog", "GENERATION_STYLE_NAMES"],
  diff: ["diffThemes"],
  exportVariables: ["themeToCSSVariables"],
  cssDocument: ["themeToCssDocument", "resolveTheme"],
  migrate: ["migrateTheme"],
};

/** The operations that exist only as CLI commands. */
export type CliOperation = "init" | "add" | "doctor" | "listFrameworks" | "exportFiles";

/**
 * Why every CLI operation is unavailable.
 *
 * Stated once. The evidence, including the exact modules involved, is in
 * `MILESTONE-3-CLI-DECISION.md`. The wording here deliberately avoids naming the
 * process-spawning module: the bundle test asserts that the built output does
 * not contain that identifier anywhere, and a diagnostic string is not worth an
 * exception to a structural gate.
 */
export const CLI_UNAVAILABLE_REASON =
  "the Themvora CLI cannot be loaded in this extension: its modules require Node filesystem access " +
  "and process spawning, neither of which the extension bundle includes. See MILESTONE-3-CLI-DECISION.md.";

/** Whether one operation can run, and why not when it cannot. */
export interface OperationAvailability {
  /** `true` when every required export is present. */
  readonly available: boolean;
  /** Why it is unavailable, or `null` when it is available. */
  readonly reason: string | null;
}

/** The capability report. */
export interface Capabilities {
  /** In-process, core-backed operations. */
  readonly core: {
    /** Per-operation availability. */
    readonly operations: Readonly<Record<CoreOperation, OperationAvailability>>;
    /** The available operations, for a quick pick or a status line. */
    readonly available: readonly CoreOperation[];
    /** The unavailable operations. */
    readonly unavailable: readonly CoreOperation[];
  };
  /** CLI-backed operations, none of which are available. */
  readonly cli: {
    /** Always `false` in this build. */
    readonly available: false;
    /** Why. */
    readonly reason: string;
    /** Per-operation availability, all `false`. */
    readonly operations: Readonly<Record<CliOperation, OperationAvailability>>;
  };
}

/** Every core operation, in a stable order. */
const CORE_OPERATIONS = Object.keys(CORE_OPERATION_EXPORTS) as CoreOperation[];

/** Every CLI operation, in a stable order. */
const CLI_OPERATIONS: CliOperation[] = ["init", "add", "doctor", "listFrameworks", "exportFiles"];

/**
 * Check one operation's required exports against a module namespace.
 *
 * @param module - The module to inspect, normally `import * as core`.
 * @param operation - Which operation.
 * @returns Its availability.
 */
function availabilityOf(
  module: Readonly<Record<string, unknown>>,
  operation: CoreOperation,
): OperationAvailability {
  const missing = CORE_OPERATION_EXPORTS[operation].filter(
    (name) => module[name] === undefined || module[name] === null,
  );

  if (missing.length === 0) return { available: true, reason: null };

  return {
    available: false,
    reason: `@themvora/core does not export ${missing.map((name) => `\`${name}\``).join(", ")}, so \`${operation}\` cannot run.`,
  };
}

/**
 * Detect what the installed core can do.
 *
 * @param module - The core module namespace.
 * @returns The capability report.
 */
export function detectCapabilities(module: Readonly<Record<string, unknown>>): Capabilities {
  const operations = {} as Record<CoreOperation, OperationAvailability>;
  for (const operation of CORE_OPERATIONS) {
    operations[operation] = availabilityOf(module, operation);
  }

  const cliOperations = {} as Record<CliOperation, OperationAvailability>;
  for (const operation of CLI_OPERATIONS) {
    cliOperations[operation] = { available: false, reason: CLI_UNAVAILABLE_REASON };
  }

  return {
    core: {
      operations,
      available: CORE_OPERATIONS.filter((operation) => operations[operation].available),
      unavailable: CORE_OPERATIONS.filter((operation) => !operations[operation].available),
    },
    cli: {
      available: false,
      reason: CLI_UNAVAILABLE_REASON,
      operations: cliOperations,
    },
  };
}
