import {
  SEMANTIC_ROLE_GROUPS,
  diffThemes,
  generateTheme,
  type ThemeDefinition,
  type ThemeDiffReport,
  type ThemeModeDiff,
  type ThemeSet,
  type ThemeTokenChange,
} from "@themvora/core";
import { existsSync } from "node:fs";
import { getBool, getString } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { UsageError } from "../exit-codes.js";
import { readThemeJSON, toThemes } from "../theme-shared.js";
import {
  listBrands,
  listPresets,
  resolveEntryThemes,
  type RegistryKind,
} from "../registry.js";
import { suggestionSuffix } from "../suggest.js";
import { paint, wantsJson, wantsQuiet, writeJson } from "../output.js";

/** A comparison side: the theme data plus how it was found. */
interface ResolvedSource {
  input: ThemeDefinition | ThemeSet;
  /** The source label shown in human output, e.g. `preset mint`. */
  label: string;
}

/** An explicit source given by a flag rather than positionally. */
interface FlagSource {
  flag: SourceFlag;
  value: string;
}

type Mode = "light" | "dark";
type Side = "a" | "b";
type SourceFlag = "preset" | "brand" | "seed";

/** The explicit source flags, in the order they are assigned to sides. */
const SOURCE_FLAGS: readonly SourceFlag[] = ["preset", "brand", "seed"];

/** Resolve a canonical registry entry into a light/dark set. */
function fromRegistry(kind: RegistryKind, id: string): ResolvedSource {
  const resolved = resolveEntryThemes(kind, id);

  if (!resolved) {
    const candidates = (kind === "brand" ? listBrands() : listPresets()).map(
      (entry) => entry.id,
    );
    throw new UsageError(
      `unknown ${kind} "${id}"${suggestionSuffix(id, candidates)} — ` +
        `run "themvora list ${kind}s" to see the available ${kind}s`,
    );
  }

  return {
    input: { light: resolved.light, dark: resolved.dark },
    label: `${kind} ${id}`,
  };
}

/** Resolve a seed into a generated light/dark set. */
function fromSeed(seed: string): ResolvedSource {
  if (!seed.startsWith("#") || seed.length !== 7) {
    throw new UsageError("seed must be a hex color (e.g. #6366f1)");
  }
  const pair = generateTheme({ seed, family: "default" });
  return {
    input: { light: pair.light, dark: pair.dark },
    label: `seed ${seed}`,
  };
}

/** Resolve a theme file into a single theme or a light/dark set. */
function fromFile(path: string): ResolvedSource {
  const themes = toThemes(readThemeJSON(path));
  const input =
    themes.length === 2 ? { light: themes[0]!, dark: themes[1]! } : themes[0]!;
  return { input, label: `file ${path}` };
}

/**
 * Resolve a positional source.
 *
 * Precedence is fixed and documented: an existing file, then a canonical preset
 * id, then a brand id. The label always states which branch was taken, so the
 * precedence is visible rather than implicit.
 *
 * A value that *looks* like a path — it has a separator, or a `.json` suffix —
 * is treated as a file even when it does not exist, so a mistyped filename
 * reports "cannot read file" (exit 1) exactly as `validate` does, rather than
 * being misreported as an unknown registry id.
 */
function fromPositional(value: string): ResolvedSource {
  if (existsSync(value)) return fromFile(value);

  if (/[\\/]/.test(value) || value.endsWith(".json")) return fromFile(value);

  if (resolveEntryThemes("preset", value)) return fromRegistry("preset", value);
  if (resolveEntryThemes("brand", value)) return fromRegistry("brand", value);

  const candidates = [...listPresets(), ...listBrands()].map(
    (entry) => entry.id,
  );
  throw new UsageError(
    `cannot resolve "${value}"${suggestionSuffix(value, candidates)} — ` +
      "expected a theme file, a preset id, or a brand id",
  );
}

/** Turn one flag source into a resolved side. */
function fromFlag(source: FlagSource): ResolvedSource {
  if (source.flag === "seed") return fromSeed(source.value);
  return fromRegistry(source.flag, source.value);
}

/**
 * Collect the explicit `--preset` / `--brand` / `--seed` sources, **in the order
 * they were typed**.
 *
 * Order matters: the first source fills the first side without a positional. An
 * object keyed by flag name cannot express it, which is why `parseArgs` records
 * the flags in sequence.
 */
function collectFlagSources(args: ParsedArgs): FlagSource[] {
  const sources: FlagSource[] = [];

  for (const flag of args.__flags) {
    if (!(SOURCE_FLAGS as readonly string[]).includes(flag.key)) continue;
    if (typeof flag.value !== "string") continue;
    sources.push({ flag: flag.key as SourceFlag, value: flag.value });
  }

  return sources;
}

/**
 * Resolve one side.
 *
 * A side is sourced either positionally or by one explicit flag — never both.
 *
 * @param positional - The positional value for this side, if any.
 * @param flag - The explicit source assigned to this side, if any.
 * @param side - Which side this is, for error messages.
 * @returns The resolved source.
 * @throws {UsageError} When the side has no source, or two.
 */
function resolveSide(
  positional: string | undefined,
  flag: FlagSource | undefined,
  side: Side,
): ResolvedSource {
  if (positional !== undefined && flag !== undefined) {
    throw new UsageError(
      `side "${side}" received both the positional "${positional}" and --${flag.flag} — ` +
        "a side takes one source",
    );
  }

  if (flag !== undefined) return fromFlag(flag);

  if (positional === undefined) {
    throw new UsageError(
      `side "${side}" needs a source — a positional (file, preset id, or brand id), ` +
        "or --preset / --brand / --seed",
    );
  }

  return fromPositional(positional);
}

/** The section a change belongs to, for human grouping. */
function sectionOf(change: ThemeTokenChange): string {
  if (change.group !== "colors") return change.group;
  const group = SEMANTIC_ROLE_GROUPS.find(
    (candidate) => candidate.id === change.roleGroup,
  );
  return group ? group.label : "Other colours";
}

/** The row label within a section: the path without its group prefix. */
function rowLabel(change: ThemeTokenChange): string {
  const prefix = change.group === "colors" ? "colors." : `${change.group}.`;
  return change.path.startsWith(prefix)
    ? change.path.slice(prefix.length)
    : change.path;
}

/** Render one mode's changes. */
function renderMode(diff: ThemeModeDiff, quiet: boolean): string[] {
  const lines: string[] = [];

  if (diff.present !== "both") {
    const owner = diff.present === "a" ? "a" : "b";
    lines.push(
      `  ${paint("dim", `only side "${owner}" has a ${diff.mode} theme — ${diff.counts.total} token(s) counted against an empty side`)}`,
    );
  }

  if (!quiet) {
    const sections = new Map<string, ThemeTokenChange[]>();
    for (const change of diff.changes) {
      const section = sectionOf(change);
      const bucket = sections.get(section) ?? [];
      bucket.push(change);
      sections.set(section, bucket);
    }

    const labelWidth = Math.max(
      0,
      ...[...sections.values()].flatMap((changes) =>
        changes.map((c) => rowLabel(c).length),
      ),
    );

    for (const [section, changes] of sections) {
      lines.push(`  ${paint("bold", section)}`);
      for (const change of changes) {
        const label = rowLabel(change).padEnd(labelWidth);
        const value =
          change.status === "added"
            ? paint("green", `+ ${change.after}`)
            : change.status === "removed"
              ? paint("red", `- ${change.before}`)
              : change.status === "changed"
                ? `${change.before} → ${change.after}`
                : paint("dim", `${change.before} (unchanged)`);
        lines.push(`    ${label}  ${value}`);
      }
    }
  }

  const { added, removed, changed, unchanged } = diff.counts;
  lines.push(
    `  ${paint("dim", `${changed} changed · ${added} added · ${removed} removed · ${unchanged} unchanged`)}`,
  );

  return lines;
}

/** Render the whole report. */
function renderReport(
  report: ThemeDiffReport,
  labels: Record<Side, string>,
  quiet: boolean,
): string {
  if (!report.hasChanges && !report.provenance.changed) {
    return `${report.a.name} and ${report.b.name} are identical (${report.summary.total} tokens compared).`;
  }

  const lines: string[] = [
    `${paint("bold", report.a.name)} → ${paint("bold", report.b.name)}`,
    `  a: ${labels.a}`,
    `  b: ${labels.b}`,
  ];

  for (const mode of ["light", "dark"] as const) {
    const diff = report.modes[mode];
    if (!diff) continue;
    lines.push("", `${paint("bold", mode)}`);
    lines.push(...renderMode(diff, quiet));
  }

  if (report.provenance.changed) {
    lines.push(
      "",
      `  ${paint("dim", `provenance differs: ${report.provenance.differing.join(", ")}`)}`,
    );
  }

  return lines.join("\n");
}

/**
 * Implements the `diff` command.
 *
 * Compares two theme sources and reports the semantic differences. Every
 * comparison decision comes from `@themvora/core`; this command resolves
 * sources, renders the report, and maps failures to exit codes.
 *
 * Sources are the two positionals, or `--preset` / `--brand` / `--seed` for a
 * side that has none. Explicit flags are assigned to the sides without a
 * positional, in order, so `diff mint --brand apple` compares preset `mint`
 * against brand `apple`.
 *
 * @param args The parsed command-line arguments.
 * @throws {UsageError} When a source cannot be resolved, or a mode is requested
 *   that a source does not have.
 */
export async function cmdDiff(args: ParsedArgs) {
  const requestedMode = getString(args, "mode")?.toLowerCase();
  if (
    requestedMode !== undefined &&
    requestedMode !== "light" &&
    requestedMode !== "dark"
  ) {
    throw new UsageError(
      requestedMode === "system"
        ? '"system" is a selector over the light and dark themes, not a mode to diff. ' +
            "Use --mode light or --mode dark."
        : `invalid mode "${requestedMode}"${suggestionSuffix(requestedMode, ["light", "dark"])} — use "light" or "dark"`,
    );
  }

  const positionals: Record<Side, string | undefined> = {
    a: args._[1],
    b: args._[2],
  };
  const flagSources = collectFlagSources(args);

  // Explicit flags fill the sides that have no positional, in order.
  const openSides = (["a", "b"] as const).filter(
    (side) => positionals[side] === undefined,
  );
  if (flagSources.length > openSides.length) {
    throw new UsageError(
      `received ${flagSources.length} explicit source(s) for ${openSides.length} side(s) without a positional — ` +
        "a side takes one source",
    );
  }

  const flagBySide = new Map<Side, FlagSource>();
  openSides.forEach((side, index) => {
    const source = flagSources[index];
    if (source !== undefined) flagBySide.set(side, source);
  });

  const sideA = resolveSide(positionals.a, flagBySide.get("a"), "a");
  const sideB = resolveSide(positionals.b, flagBySide.get("b"), "b");

  const report = diffThemes(sideA.input, sideB.input, {
    includeUnchanged: getBool(args, "all"),
    ...(requestedMode !== undefined ? { modes: [requestedMode as Mode] } : {}),
  });

  if (requestedMode !== undefined) {
    const diff = report.modes[requestedMode as Mode];
    if (!diff) {
      throw new UsageError(`neither source has a ${requestedMode} theme`);
    }
    if (diff.present !== "both") {
      const missing = diff.present === "a" ? "b" : "a";
      throw new UsageError(
        `side "${missing}" has no ${requestedMode} theme — diff a mode both sources provide`,
      );
    }
  }

  if (wantsJson(args)) {
    writeJson(report);
    return;
  }

  const labels: Record<Side, string> = { a: sideA.label, b: sideB.label };
  process.stdout.write(`${renderReport(report, labels, wantsQuiet(args))}\n`);
}
