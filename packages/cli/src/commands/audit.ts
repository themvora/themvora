import {
  getPresetCatalog,
  scoreTheme,
  validateTheme,
  type PresetCheck,
  type ThemeDefinition,
} from "@themvora/core";
import { existsSync } from "node:fs";
import { getBool } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { CommandExit, ExitCodes, UsageError } from "../exit-codes.js";
import { readThemeJSON, toThemes } from "../theme-shared.js";
import { paint, wantsJson, wantsQuiet, writeJson } from "../output.js";

/** One audited theme. */
interface AuditedTheme {
  name: string;
  /** Structural validity, from `validateTheme()`. */
  valid: boolean;
  issues: string[];
  /** The canonical scorecard. */
  checks: PresetCheck[];
  passed: number;
  total: number;
  /** `true` when the theme fails the audit. */
  failed: boolean;
  /** `true` when the theme only has warnings. */
  warned: boolean;
}

/** One audited subject — a preset family, or a theme in a file. */
interface AuditedSubject {
  id: string;
  label: string;
  themes: AuditedTheme[];
}

/** The audit report, as data. */
interface AuditReport {
  scope: "presets" | "file";
  strict: boolean;
  subjects: AuditedSubject[];
  summary: { subjects: number; themes: number; passed: number; warned: number; failed: number };
}

/** Audit one theme with the canonical scorecard. */
function auditTheme(theme: ThemeDefinition, strict: boolean): AuditedTheme {
  const validation = validateTheme(theme);
  const score = scoreTheme(theme);

  const failures = score.checks.filter((check) => check.status === "fail");
  const warnings = score.checks.filter((check) => check.status === "warn");

  return {
    name: theme.name,
    valid: validation.valid,
    issues: validation.issues.map((issue) => issue.message),
    checks: score.checks,
    passed: score.passed,
    total: score.total,
    failed: !validation.valid || failures.length > 0 || (strict && warnings.length > 0),
    warned: warnings.length > 0,
  };
}

/** Audit every shipped preset and brand. */
function auditPresets(strict: boolean): AuditReport {
  const subjects = getPresetCatalog().map((entry) => ({
    id: entry.id,
    label: entry.name,
    themes: [auditTheme(entry.themes.light, strict), auditTheme(entry.themes.dark, strict)],
  }));

  return { scope: "presets", strict, subjects, summary: summarise(subjects) };
}

/** Audit every theme in a file. */
function auditFile(file: string, strict: boolean): AuditReport {
  const themes = toThemes(readThemeJSON(file));
  const subjects: AuditedSubject[] = [
    { id: file, label: file, themes: themes.map((theme) => auditTheme(theme, strict)) },
  ];

  return { scope: "file", strict, subjects, summary: summarise(subjects) };
}

/** Roll up per-subject results. */
function summarise(subjects: AuditedSubject[]): AuditReport["summary"] {
  const themes = subjects.flatMap((subject) => subject.themes);
  return {
    subjects: subjects.length,
    themes: themes.length,
    passed: themes.filter((theme) => !theme.failed && !theme.warned).length,
    warned: themes.filter((theme) => !theme.failed && theme.warned).length,
    failed: themes.filter((theme) => theme.failed).length,
  };
}

/** The failure detail for one theme, most severe first. */
function failureDetail(theme: AuditedTheme): string {
  const failures = theme.checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.detail ?? "failed"}`);
  const warnings = theme.checks
    .filter((check) => check.status === "warn")
    .map((check) => check.id);

  const parts = [...theme.issues, ...failures];
  if (warnings.length > 0) parts.push(`warn: ${warnings.join(", ")}`);
  return parts.join("; ");
}

/** Render the human report. */
function renderReport(report: AuditReport, quiet: boolean): string {
  const lines: string[] = [
    paint("bold", report.scope === "presets" ? "Shipped presets and brands" : report.subjects[0]!.label),
    "",
  ];

  for (const subject of report.subjects) {
    for (const theme of subject.themes) {
      const label = theme.name.padEnd(24);
      const score = `${theme.passed}/${theme.total}`.padStart(4);

      if (theme.failed) {
        lines.push(
          `  ${label}${score}  ${paint("red", "FAIL")}  ${failureDetail(theme)}`,
        );
        continue;
      }

      if (theme.warned) {
        const warnings = theme.checks
          .filter((check) => check.status === "warn")
          .map((check) => check.id);
        lines.push(
          `  ${label}${score}  ${paint("green", "PASS")}  ${paint("yellow", `warn: ${warnings.join(", ")}`)}`,
        );
        continue;
      }

      if (!quiet) lines.push(`  ${label}${score}  ${paint("green", "PASS")}`);
    }
  }

  const { themes, passed, warned, failed } = report.summary;
  lines.push(
    "",
    `${themes} theme(s)   ${passed} pass   ${warned} with warnings   ${failed} fail` +
      (report.strict ? "   (--strict: warnings are failures)" : ""),
  );

  return lines.join("\n");
}

/**
 * Implements the `audit` command.
 *
 * Audits a theme, or every shipped preset and brand, with the **canonical**
 * scorecard — `scoreTheme()`. That is the same quality model the repository's
 * `audit-presets.mjs` gate and the preset documentation use, so the CLI and the
 * release gate cannot disagree about whether a preset is healthy.
 *
 * `audit` is deliberately stricter than `validate`: it gates on the full
 * scorecard rather than on the frozen structural contract alone.
 *
 * Reads `presets` or `<file>`, plus `--json`, `--quiet` and `--strict`.
 *
 * @param args The parsed command-line arguments.
 * @throws {UsageError} When no scope is given.
 */
export async function cmdAudit(args: ParsedArgs) {
  const scope = args._[1];
  const strict = getBool(args, "strict");
  const quiet = wantsQuiet(args) || getBool(args, "quiet");

  if (scope === undefined) {
    throw new UsageError("audit needs a scope — a theme file, or `presets`");
  }

  // A path-looking value that does not exist is a file the user meant to name.
  const looksLikePath = /[\\/]/.test(scope) || scope.endsWith(".json");
  if (scope !== "presets" && !existsSync(scope) && !looksLikePath) {
    throw new UsageError(
      `unknown audit scope "${scope}" — expected a theme file, or \`presets\``,
    );
  }

  const report = scope === "presets" ? auditPresets(strict) : auditFile(scope, strict);

  if (wantsJson(args)) {
    writeJson(report);
    if (report.summary.failed > 0) throw new CommandExit(ExitCodes.ValidationFailed);
    return;
  }

  process.stdout.write(`${renderReport(report, quiet)}\n`);

  if (report.summary.failed > 0) {
    process.stderr.write("\nA theme must not fail its own contract.\n");
    throw new CommandExit(ExitCodes.ValidationFailed);
  }

  if (!quiet) process.stdout.write("\nAudit passed.\n");
}
