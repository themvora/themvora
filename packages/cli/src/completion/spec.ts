/**
 * The shell-completion model.
 *
 * One structure, four renderers. Every fact in it comes from somewhere that
 * already owns it:
 *
 * - **commands, aliases and flags** — `command-schema.json`, the same contract
 *   `--help` and the docs reference render, so completion cannot offer a flag the
 *   parser would reject;
 * - **registry values** (presets, brands, styles, frameworks) — *not* embedded.
 *   The generated script asks `themvora list <registry> --ids` at completion
 *   time, so the values are always the ones the installed CLI accepts. A user who
 *   upgrades Themvora gets correct completions without regenerating anything.
 *
 * That second decision is the one that matters. Embedding the lists would make
 * `completion` output a second copy of the registry that goes stale the moment a
 * preset is added — which is precisely the duplication the rest of this CLI is
 * built to avoid.
 *
 * @packageDocumentation
 */
import {
  COMMAND_SPECS,
  GLOBAL_OPTIONS,
  type CommandOptionSpec,
  type ValuesFrom,
} from "../command-schema.js";

/** A registry-backed value source, and the `list` selector that yields it. */
export interface RegistrySource {
  /** The `valuesFrom` key in the command contract. */
  from: ValuesFrom;
  /** The `themvora list <selector> --ids` selector. */
  selector: string;
}

/** One command's completable surface. */
export interface CompletionCommand {
  /** The canonical name. */
  name: string;
  /** Accepted aliases. */
  aliases: readonly string[];
  /** One-line summary, shown by shells that render descriptions. */
  summary: string;
  /** Long flags this command accepts, excluding globals. */
  flags: readonly string[];
  /** Short flags, as `-x`, for shells that complete them. */
  shortFlags: readonly string[];
  /**
   * Flags whose value comes from a registry.
   *
   * Keyed by flag name, so a shell can ask for the right registry when the
   * cursor sits after that flag.
   */
  registryValues: Readonly<Record<string, string>>;
  /** Flags whose value is a closed set. */
  closedValues: Readonly<Record<string, readonly string[]>>;
  /**
   * Positional selectors that are a closed set.
   *
   * Index is the positional's position among the command's positionals, which is
   * what a shell needs: the first positional of `list` is a registry name.
   */
  positionalValues: Readonly<Record<number, readonly string[]>>;
}

/** Everything a shell renderer needs. */
export interface CompletionSpec {
  /** The program name every script completes for. */
  program: string;
  /** Every registry-backed value source. */
  registries: readonly RegistrySource[];
  /** The commands, in contract order. */
  commands: readonly CompletionCommand[];
  /** Flags every command accepts. */
  globalFlags: readonly string[];
}

/** The program name. Kept here so the scripts and the binary cannot disagree. */
export const PROGRAM = "themvora";

/** `valuesFrom` → the `list` selector that yields those values. */
const REGISTRY_SELECTOR: Readonly<Record<ValuesFrom, string>> = {
  preset: "presets",
  brand: "brands",
  style: "styles",
  framework: "frameworks",
};

/** Every long and short flag an option declares. */
function flagsOf(option: CommandOptionSpec): { long: string[]; short: string[] } {
  const long: string[] = [];
  const short: string[] = [];

  for (const flag of [option.flag, ...(option.aliases ?? [])]) {
    if (flag.startsWith("--")) long.push(flag);
    else if (flag.startsWith("-")) short.push(flag);
  }
  if (option.alias) short.push(option.alias);

  return { long, short };
}

/**
 * Build the completion model from the command contract.
 *
 * @returns The model, with no registry values embedded.
 */
export function buildCompletionSpec(): CompletionSpec {
  const commands: CompletionCommand[] = COMMAND_SPECS.map((spec) => {
    const long: string[] = [];
    const short: string[] = [];
    const registryValues: Record<string, string> = {};
    const closedValues: Record<string, readonly string[]> = {};

    for (const option of spec.options) {
      const flags = flagsOf(option);
      long.push(...flags.long);
      short.push(...flags.short);

      // A registry-backed option is keyed by its long flag; `--preset` and
      // `--brand` both map to their own selector.
      if (option.valuesFrom) {
        const selector = REGISTRY_SELECTOR[option.valuesFrom];
        for (const flag of flags.long) registryValues[flag] = selector;
      }
      if (option.values) {
        for (const flag of flags.long) closedValues[flag] = option.values;
      }
    }

    const positionalValues: Record<number, readonly string[]> = {};
    spec.positionals.forEach((positional, index) => {
      if (positional.values) positionalValues[index] = positional.values;
    });

    return {
      name: spec.name,
      aliases: spec.aliases ?? [],
      summary: spec.summary,
      flags: long,
      shortFlags: short,
      registryValues,
      closedValues,
      positionalValues,
    };
  });

  const froms = new Set<ValuesFrom>();
  for (const spec of COMMAND_SPECS) {
    for (const option of spec.options) {
      if (option.valuesFrom) froms.add(option.valuesFrom);
    }
  }

  return {
    program: PROGRAM,
    registries: [...froms].map((from) => ({ from, selector: REGISTRY_SELECTOR[from] })),
    commands,
    globalFlags: GLOBAL_OPTIONS.flatMap((option) => flagsOf(option).long),
  };
}

/** Every command spelling, canonical names first. */
export function commandSpellings(spec: CompletionSpec): string[] {
  return spec.commands.flatMap((command) => [command.name, ...command.aliases]);
}
