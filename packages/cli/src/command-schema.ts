/**
 * The authoritative CLI command contract.
 *
 * `command-schema.json` is the single source of truth for what the CLI accepts:
 * every command, alias, option, allowed value, default and exit code lives
 * there once. Three consumers read it, and none of them keeps a second copy:
 *
 * - `themvora --help` — rendered by {@link renderCommandHelp} / {@link renderMainHelp};
 * - the generated docs reference — `apps/docs/scripts/generate-cli-reference.mjs`
 *   reads the same JSON directly, so it needs no build step;
 * - shell completion (Stage 4) — reads {@link COMMAND_SPECS}.
 *
 * The JSON is deliberately not a TypeScript module: a `.mjs` docs script cannot
 * import TypeScript, and a regex parser over a `.ts` file is exactly the fragile
 * coupling this module removes. `resolveJsonModule` makes the import typed here
 * while keeping the file readable by plain Node.
 *
 * @packageDocumentation
 */
import raw from "./command-schema.json";

/** How an option's allowed values are sourced from a canonical registry. */
export type ValuesFrom = "preset" | "brand" | "style" | "framework";

/** One command-line option. */
export interface CommandOptionSpec {
  /** The long flag, e.g. `--seed`. */
  flag: string;
  /** The short alias, e.g. `-s`. */
  alias?: string;
  /** Additional long-form spellings that are accepted but not advertised. */
  aliases?: readonly string[];
  /** Value placeholder, e.g. `<color>`. Omitted for boolean flags. */
  value?: string;
  /** One-line description shown in help and the docs table. */
  description: string;
  /** Documented default, rendered as `[default …]`. */
  default?: string;
  /** A closed set of allowed values. */
  values?: readonly string[];
  /** Allowed values come from a canonical registry instead of being listed. */
  valuesFrom?: ValuesFrom;
}

/** One positional argument. */
export interface CommandPositionalSpec {
  /** Placeholder as written in the usage line, e.g. `<file>`. */
  name: string;
  /** One-line description. */
  description: string;
  /** Whether the positional must be supplied. */
  required?: boolean;
  /** A closed set of allowed values. */
  values?: readonly string[];
}

/** A command's exit code and what it means. */
export interface CommandExitCodeSpec {
  code: number;
  meaning: string;
}

/** The full contract for one command. */
export interface CommandSpec {
  /** The canonical command name. */
  name: string;
  /** Accepted aliases, e.g. `gen`. */
  aliases: readonly string[];
  /** Heading printed by `--help`. */
  title: string;
  /** One-line description for the main help command table. */
  summary: string;
  /** Paragraph printed under the heading. */
  description: string;
  /** Usage line, including the `themvora` prefix. */
  usage: string;
  /** Positional arguments. */
  positionals: readonly CommandPositionalSpec[];
  /** Options. */
  options: readonly CommandOptionSpec[];
  /** Exit codes this command can return. */
  exitCodes: readonly CommandExitCodeSpec[];
  /** Copy-pasteable examples. */
  examples: readonly string[];
  /** Whether the command can emit machine-readable JSON. */
  json: boolean;
  /** Whether the command may prompt for input. */
  interactive: boolean;
}

interface CommandSchema {
  version: number;
  global: { options: readonly CommandOptionSpec[] };
  commands: readonly CommandSpec[];
}

const SCHEMA = raw as unknown as CommandSchema;

/** Every command, in the order they are documented. */
export const COMMAND_SPECS: readonly CommandSpec[] = SCHEMA.commands;

/** Options accepted by every command. */
export const GLOBAL_OPTIONS: readonly CommandOptionSpec[] = SCHEMA.global.options;

/** The schema format version. */
export const COMMAND_SCHEMA_VERSION: number = SCHEMA.version;

/**
 * Find a command by its canonical name or any of its aliases.
 *
 * @param name - The token the user typed.
 * @returns The command spec, or `undefined` when nothing matches.
 */
export function findCommand(name: string): CommandSpec | undefined {
  return COMMAND_SPECS.find(
    (spec) => spec.name === name || (spec.aliases ?? []).includes(name),
  );
}

/** Every accepted command spelling, canonical names first. */
export function commandNames(): string[] {
  return COMMAND_SPECS.flatMap((spec) => [spec.name, ...spec.aliases]);
}

/**
 * Every long flag a command accepts, including global options and the
 * undocumented back-compat aliases.
 *
 * Used by the drift test to prove the parser cannot accept a flag the contract
 * does not describe.
 */
export function acceptedFlags(spec: CommandSpec): string[] {
  const fromOptions = spec.options.flatMap((option) => [
    option.flag,
    ...(option.aliases ?? []),
  ]);
  return [...fromOptions, ...GLOBAL_OPTIONS.map((option) => option.flag)];
}

/** Render an option's left-hand label, e.g. `-s, --seed <color>`. */
export function optionLabel(option: CommandOptionSpec): string {
  const long = option.value ? `${option.flag} ${option.value}` : option.flag;
  return option.alias ? `${option.alias}, ${long}` : long;
}

/** The parenthetical that documents an option's allowed values. */
function valueHint(option: CommandOptionSpec): string {
  if (option.values) return ` (one of: ${option.values.join(", ")})`;
  if (option.valuesFrom) {
    const registry = option.valuesFrom === "brand" ? "brands" : `${option.valuesFrom}s`;
    return ` (run "themvora list ${registry}")`;
  }
  return "";
}

/** Pad every label to the same width so the columns line up. */
function pad(labels: readonly string[]): number {
  return labels.reduce((max, label) => Math.max(max, label.length), 0);
}

/**
 * Render the text `themvora <command> --help` prints.
 *
 * @param spec - The command contract.
 * @returns The help text, without a trailing newline.
 */
export function renderCommandHelp(spec: CommandSpec): string {
  const labels = spec.options.map(optionLabel);
  const width = pad(labels);

  const optionLines = spec.options.map((option, index) => {
    const suffix = option.default !== undefined ? ` [default ${option.default}]` : "";
    const label = labels[index]!.padEnd(width);
    return `  ${label}  ${option.description}${valueHint(option)}${suffix}`;
  });

  const sections: string[] = [spec.title, "", spec.description, "", "Usage:", `  ${spec.usage}`];

  if (spec.positionals.length > 0) {
    sections.push("", "Arguments:");
    const positionalLabels = spec.positionals.map((positional) => positional.name);
    const positionalWidth = pad(positionalLabels);
    spec.positionals.forEach((positional, index) => {
      const suffix = positional.values ? ` (one of: ${positional.values.join(", ")})` : "";
      sections.push(
        `  ${positionalLabels[index]!.padEnd(positionalWidth)}  ${positional.description}${suffix}`,
      );
    });
  }

  sections.push("", "Options:", ...optionLines);

  if (spec.exitCodes.length > 0) {
    sections.push("", "Exit codes:");
    const codes = spec.exitCodes.map((exit) => String(exit.code));
    const codeWidth = pad(codes);
    spec.exitCodes.forEach((exit, index) => {
      sections.push(`  ${codes[index]!.padEnd(codeWidth)}  ${exit.meaning}`);
    });
  }

  if (spec.examples.length > 0) {
    sections.push("", "Examples:");
    for (const example of spec.examples) sections.push(`  ${example}`);
  }

  return sections.join("\n");
}

/**
 * Render the text `themvora --help` prints.
 *
 * @param version - The CLI version to print in the heading.
 * @returns The help text, without a trailing newline.
 */
export function renderMainHelp(version: string): string {
  const width = pad(COMMAND_SPECS.map((spec) => spec.name));
  const commandLines = COMMAND_SPECS.map(
    (spec) => `  ${spec.name.padEnd(width)}  ${spec.summary}`,
  );

  const optionLabels = GLOBAL_OPTIONS.map(optionLabel);
  const optionWidth = pad(optionLabels);
  const optionLines = GLOBAL_OPTIONS.map(
    (option, index) =>
      `  ${optionLabels[index]!.padEnd(optionWidth)}  ${option.description}`,
  );

  return [
    `Themvora CLI — v${version}`,
    "",
    "The command-line toolkit for generating, validating, inspecting, migrating,",
    "and exporting Themvora themes.",
    "",
    "Usage:",
    "  themvora <command> [options]",
    "",
    "Commands:",
    ...commandLines,
    "",
    "Options:",
    ...optionLines,
    "",
    'Run "themvora <command> --help" for command-specific options.',
  ].join("\n");
}
