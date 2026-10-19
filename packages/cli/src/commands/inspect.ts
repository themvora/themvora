import {
  measureThemeContrast,
  migrateTheme,
  validateThemeLevels,
  type MeasuredPair,
  type ThemeDefinition,
} from "@themvora/core";
import { getBool, getString } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { UsageError } from "../exit-codes.js";
import { readThemeJSON, toThemes, themeName } from "../theme-shared.js";
import { paint, wantsJson, writeJson } from "../output.js";

/** The optional sections `inspect` can narrow to. */
const SELECTORS = ["tokens", "colors", "generation", "accessibility"] as const;

type Selector = (typeof SELECTORS)[number];

/** A theme as `inspect` reads it — the definition plus whatever meta it carries. */
type ThemeLike = ThemeDefinition & {
  meta?: Record<string, unknown>;
  extends?: unknown;
};

/** The structured summary of one theme. */
interface ThemeSummary {
  name: string;
  mode: string | null;
  family: string | null;
  label: string | null;
  description: string | null;
  version: string | null;
  extends: string | null;
  /** Generation provenance, when the theme carries it. */
  generation: {
    algorithm: string;
    seed: string;
    style: string | null;
    anchored: readonly string[];
  } | null;
  /** Whether a registered migration step applies to this theme. */
  migratable: boolean;
  tokens: { groups: { name: string; count: number }[] };
  colors: Record<string, string> | null;
  accessibility: {
    pairs: number;
    text: { total: number; passing: number };
    ui: { total: number; passing: number };
    diagnostics: { level: string; message: string }[];
  };
}

/** Build the structured summary for one theme. */
function summarise(theme: ThemeDefinition): ThemeSummary {
  const like = theme as ThemeLike;
  const meta = like.meta ?? {};

  const tokens = (theme.tokens ?? {}) as Record<string, unknown>;
  const groups = Object.entries(tokens).map(([name, values]) => ({
    name,
    count:
      Array.isArray(values) || typeof values !== "object" || values === null
        ? 1
        : Object.keys(values as object).length,
  }));

  const colors = (tokens.colors ?? null) as Record<string, string> | null;

  const generationMeta = meta.generation as
    | { algorithm?: string; seed?: string; style?: string; anchored?: readonly string[] }
    | undefined;

  const pairs: MeasuredPair[] = measureThemeContrast(theme);
  const count = (requirement: MeasuredPair["requirement"]) => {
    const subset = pairs.filter((pair) => pair.requirement === requirement);
    return { total: subset.length, passing: subset.filter((pair) => pair.passes).length };
  };

  // Running the canonical migration is how "is this legacy?" is answered without
  // hardcoding the current schema version: if a registered step changes it, the
  // theme predates the current format.
  const migrated = migrateTheme(theme);

  return {
    name: themeName(theme),
    mode: (meta.mode as string) ?? null,
    family: (meta.family as string) ?? null,
    label: (meta.label as string) ?? null,
    description: (meta.description as string) ?? null,
    version: (meta.version as string) ?? null,
    extends: like.extends !== undefined ? String(like.extends) : null,
    generation: generationMeta
      ? {
          algorithm: generationMeta.algorithm ?? "unknown",
          seed: generationMeta.seed ?? "unknown",
          style: generationMeta.style ?? null,
          anchored: generationMeta.anchored ?? [],
        }
      : null,
    migratable: migrated.meta?.version !== theme.meta?.version,
    tokens: { groups },
    colors,
    accessibility: {
      pairs: pairs.length,
      text: count("text"),
      ui: count("ui"),
      diagnostics: validateThemeLevels(theme, {
        levels: ["semantic", "contrast", "visual", "accessibility"],
      }).map((issue) => ({ level: issue.level, message: issue.message })),
    },
  };
}

/** Render the provenance block. */
function renderGeneration(summary: ThemeSummary): string[] {
  if (!summary.generation) {
    const note = summary.migratable
      ? 'not recorded — this theme predates the current format. Run "themvora migrate" to update it.'
      : "not recorded — this theme was not produced by the generator.";
    return [`  ${paint("dim", note)}`];
  }

  const lines = [`${"Algorithm".padEnd(14)}${summary.generation.algorithm}`];
  lines.push(`${"Seed".padEnd(14)}${summary.generation.seed}`);
  if (summary.generation.style) {
    lines.push(`${"Style".padEnd(14)}${summary.generation.style}`);
  }
  if (summary.generation.anchored.length > 0) {
    lines.push(`${"Anchored".padEnd(14)}${summary.generation.anchored.join(", ")}`);
  }
  return lines;
}

/** Render one theme's summary. */
function renderSummary(summary: ThemeSummary, selectors: readonly Selector[], index?: number): string {
  const show = (selector: Selector) => selectors.length === 0 || selectors.includes(selector);
  const lines: string[] = [];

  lines.push(
    index !== undefined ? `Theme ${index}: ${summary.name}` : `Theme: ${summary.name}`,
  );
  lines.push(`Mode: ${summary.mode ?? "N/A"}`);
  lines.push(`Family: ${summary.family ?? "N/A"}`);
  lines.push(`Label: ${summary.label ?? "N/A"}`);
  lines.push(`Version: ${summary.version ?? "N/A"}`);

  if (show("generation")) {
    lines.push("", "Provenance:");
    lines.push(...renderGeneration(summary));
  }

  if (summary.extends) lines.push(`Extends: ${summary.extends}`);

  if (show("tokens")) {
    lines.push("", "Tokens:");
    for (const group of summary.tokens.groups) {
      lines.push(`  ${group.name}: ${group.count} items`);
    }
  }

  if (show("colors") && summary.colors) {
    lines.push("", "Colors:");
    for (const [role, value] of Object.entries(summary.colors)) {
      lines.push(`  ${role.padEnd(20)}${value}`);
    }
  }

  if (show("accessibility")) {
    const { accessibility } = summary;
    lines.push("", "Accessibility:");
    lines.push(
      `  ${"contrast".padEnd(14)}${accessibility.text.passing}/${accessibility.text.total} text · ` +
        `${accessibility.ui.passing}/${accessibility.ui.total} ui pairs meet the floor`,
    );
    if (accessibility.diagnostics.length === 0) {
      lines.push(`  ${"relationships".padEnd(14)}${paint("green", "no issues")}`);
    } else {
      lines.push(
        `  ${"relationships".padEnd(14)}${paint("yellow", `${accessibility.diagnostics.length} issue(s)`)}`,
      );
      for (const diagnostic of accessibility.diagnostics) {
        lines.push(`    ${paint("dim", "·")} ${diagnostic.message}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Implements the `inspect` command.
 *
 * Prints a human-readable summary of a theme's provenance, semantic token
 * groups, resolved colors and accessibility. A theme that carries no generation
 * provenance is identified as such, and `migrate` is suggested when a registered
 * migration step actually applies to it.
 *
 * Reads `--file`/`-f` (or the first positional) plus the `--tokens`, `--colors`,
 * `--generation` and `--accessibility` selectors. With no selector every section
 * is shown. `--json` emits the same data as a machine-readable document.
 *
 * @param args The parsed command-line arguments.
 * @throws {UsageError} When no file is provided.
 */
export async function cmdInspect(args: ParsedArgs) {
  const file = getString(args, "file") ?? getString(args, "f") ?? args._[1];

  if (!file) {
    throw new UsageError("--file <path> is required");
  }

  const selectors = SELECTORS.filter((selector) => getBool(args, selector));
  const parsed = readThemeJSON(file);
  const themes = toThemes(parsed);
  const summaries = themes.map(summarise);

  if (wantsJson(args)) {
    writeJson(
      summaries.length === 1
        ? summaries[0]
        : { themes: summaries },
    );
    return;
  }

  if (summaries.length > 1) {
    process.stdout.write(
      `${summaries.map((summary, index) => renderSummary(summary, selectors, index + 1)).join("\n\n")}\n`,
    );
  } else {
    process.stdout.write(`${renderSummary(summaries[0]!, selectors)}\n`);
  }
}
