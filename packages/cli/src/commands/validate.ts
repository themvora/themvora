import {
  measureThemeContrast,
  validateTheme,
  validateThemeLevels,
  type LevelIssue,
  type MeasuredPair,
  type ThemeDefinition,
} from "@themvora/core";
import { getBool, getString } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { readThemeJSON, toThemes, themeName } from "../theme-shared.js";
import { ExitCodes, CommandExit, UsageError } from "../exit-codes.js";
import { failure, paint, success, wantsJson, wantsQuiet, writeJson } from "../output.js";

/**
 * The layers core actually provides, in the order they are reported.
 *
 * `required` is the frozen `validateTheme()` contract and the only layer that
 * decides the exit code. The rest are the internal `validateThemeLevels()`
 * breakdown plus the canonical contrast measurement — reported as diagnostics so
 * a theme that passed before still passes.
 */
const LAYER_ORDER = ["required", "structure", "semantic", "contrast", "accessibility"] as const;

type LayerName = (typeof LAYER_ORDER)[number];

/** The issues found at one layer. */
interface LayerReport {
  layer: LayerName;
  issues: { code: string; path?: string; message: string }[];
}

/** Everything `validate` reports about one theme. */
interface ThemeReport {
  name: string;
  valid: boolean;
  /** Issues that decide the exit code. */
  issues: { code: string; path: string; message: string }[];
  /** Per-layer diagnostics. */
  layers: LayerReport[];
  /** The canonical contrast measurement. */
  contrast: {
    pairs: number;
    text: { total: number; passing: number };
    ui: { total: number; passing: number };
  };
}

/** Map a `validateThemeLevels` level onto a reported layer. */
function layerOf(level: LevelIssue["level"]): LayerName {
  if (level === "structural") return "structure";
  if (level === "contrast") return "contrast";
  if (level === "accessibility") return "accessibility";
  return "semantic";
}

/** Collect the per-layer diagnostics for one theme. */
function buildLayers(theme: ThemeDefinition): LayerReport[] {
  const buckets = new Map<LayerName, LayerReport["issues"]>();

  for (const issue of validateThemeLevels(theme)) {
    const layer = layerOf(issue.level);
    const bucket = buckets.get(layer) ?? [];
    bucket.push({
      code: issue.code,
      ...(issue.path !== undefined ? { path: issue.path } : {}),
      message: issue.message,
    });
    buckets.set(layer, bucket);
  }

  return LAYER_ORDER.filter((layer) => layer !== "required").map((layer) => ({
    layer,
    issues: buckets.get(layer) ?? [],
  }));
}

/** Summarise the canonical contrast measurement into text/UI counts. */
function buildContrast(theme: ThemeDefinition): ThemeReport["contrast"] {
  const pairs: MeasuredPair[] = measureThemeContrast(theme);
  const count = (requirement: MeasuredPair["requirement"]) => {
    const subset = pairs.filter((pair) => pair.requirement === requirement);
    return { total: subset.length, passing: subset.filter((pair) => pair.passes).length };
  };

  return { pairs: pairs.length, text: count("text"), ui: count("ui") };
}

/** Build the full report for one theme. */
function reportTheme(theme: ThemeDefinition): ThemeReport {
  const result = validateTheme(theme);

  return {
    name: themeName(theme),
    valid: result.valid,
    issues: result.issues.map((issue) => ({
      code: issue.code,
      path: issue.path,
      message: issue.message,
    })),
    layers: buildLayers(theme),
    contrast: buildContrast(theme),
  };
}

/** Render one layer's diagnostic line for human output. */
function renderLayer(layer: LayerReport): string[] {
  const lines = [
    `  ${layer.layer.padEnd(14)}${layer.issues.length === 0 ? paint("green", "pass") : paint("yellow", `${layer.issues.length} issue(s)`)}`,
  ];
  for (const issue of layer.issues) lines.push(`    ${paint("dim", "·")} ${issue.message}`);
  return lines;
}

/**
 * Implements the `validate` command.
 *
 * Validates a theme file and reports the outcome. The exit code is decided by
 * the frozen `validateTheme()` contract — a missing or malformed required token
 * fails — while the semantic, contrast and accessibility layers are reported as
 * diagnostics. Making those layers gate the exit code would turn previously
 * passing themes into failures, so it is deliberately left to `themvora audit`.
 *
 * Reads `--file`/`-f` (or the first positional), `--json` and `--quiet`.
 *
 * @param args The parsed command-line arguments.
 * @throws {UsageError} When no file is provided.
 */
export async function cmdValidate(args: ParsedArgs) {
  const file = getString(args, "file") ?? getString(args, "f") ?? args._[1];
  const json = wantsJson(args);
  const quiet = wantsQuiet(args) || getBool(args, "quiet");

  if (!file) {
    throw new UsageError("--file <path> is required");
  }

  const parsed = readThemeJSON(file);
  const themes = toThemes(parsed);
  const reports = themes.map(reportTheme);
  const failures = reports.filter((report) => !report.valid);

  if (json) {
    writeJson({
      valid: failures.length === 0,
      themes: reports,
      summary: {
        themes: reports.length,
        valid: reports.length - failures.length,
        invalid: failures.length,
      },
    });
    if (failures.length > 0) throw new CommandExit(ExitCodes.ValidationFailed);
    return;
  }

  if (failures.length > 0) {
    for (const report of failures) {
      failure(`Theme is invalid: ${report.name}`);
      for (const issue of report.issues) {
        process.stderr.write(`  - ${issue.message}\n`);
      }
    }
    process.stderr.write(
      `(validation failed for ${failures.length} theme${failures.length === 1 ? "" : "s"})\n`,
    );
    throw new CommandExit(ExitCodes.ValidationFailed);
  }

  const summary =
    reports.length > 1
      ? `${reports[0]!.name} + ${reports[1]!.name}`
      : reports[0]!.name;

  success(`Theme is valid: ${summary}`, quiet);
  if (quiet) return;

  for (const report of reports) {
    const lines: string[] = ["", report.name];
    for (const layer of report.layers) lines.push(...renderLayer(layer));

    const { text, ui } = report.contrast;
    lines.push(
      `  ${"measured".padEnd(14)}${report.contrast.pairs} pairs · ` +
        `text ${text.passing}/${text.total} · ui ${ui.passing}/${ui.total}`,
    );

    process.stdout.write(`${lines.join("\n")}\n`);
  }
}
