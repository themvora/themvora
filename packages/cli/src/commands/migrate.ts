/**
 * `themvora migrate` — move a theme file to the current schema.
 *
 * Three behaviours are deliberately separated, because conflating them is how a
 * migration tool overwrites someone's file:
 *
 * - **nothing is written by default.** The migrated theme goes to stdout, exactly
 *   as before.
 * - **`--dry-run` reports and never writes.** It answers "would this change
 *   anything", which is the question a migration is actually asked.
 * - **writing is explicit.** `--output <file>` writes elsewhere (unchanged
 *   behaviour); `--write` migrates **in place**, and that flag *is* the
 *   confirmation. There is no path that overwrites the input file without it.
 *
 * @packageDocumentation
 */
import { migrateTheme, type ThemeDefinition } from "@themvora/core";
import { writeFileSync } from "node:fs";
import { getBool, getString } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { UsageError } from "../exit-codes.js";
import { readThemeJSON, isThemePair } from "../theme-shared.js";
import { paint, status, wantsJson, wantsQuiet, writeJson } from "../output.js";

/** One theme's migration outcome. */
interface MigratedTheme {
  /** The theme's name. */
  name: string;
  /** The schema version it declared, or `null` when it declared none. */
  fromVersion: string | null;
  /** The schema version it now declares. */
  toVersion: string | null;
  /** Whether the migration changed anything. */
  changed: boolean;
}

/** The machine-readable migration report. */
interface MigrateReport {
  /** Schema version of this report. */
  version: 1;
  /** The file that was read. */
  file: string;
  /** Whether any theme changed. */
  changed: boolean;
  /** Per-theme outcomes. */
  themes: MigratedTheme[];
  /** Where the result was written, or `null` when it was not. */
  written: string | null;
  /** Whether this was a dry run. */
  dryRun: boolean;
}

/** Describe one theme's migration. */
function describe(before: ThemeDefinition, after: ThemeDefinition): MigratedTheme {
  return {
    name: after.name ?? before.name ?? "unnamed",
    fromVersion: before.meta?.version ?? null,
    toVersion: after.meta?.version ?? null,
    changed: JSON.stringify(before) !== JSON.stringify(after),
  };
}

/** Render the report for a human. */
function render(report: MigrateReport): string {
  const lines: string[] = [];
  lines.push(paint("bold", report.dryRun ? "themvora migrate — plan" : "themvora migrate"));
  lines.push("");
  lines.push(`  file     ${report.file}`);
  lines.push(`  themes   ${report.themes.length}`);
  lines.push("");

  for (const theme of report.themes) {
    const version =
      theme.fromVersion === theme.toVersion
        ? `version ${theme.fromVersion ?? "(none)"}`
        : `version ${theme.fromVersion ?? "(none)"} → ${theme.toVersion ?? "(none)"}`;
    const outcome = theme.changed ? paint("green", "changed") : paint("dim", "no change");
    lines.push(`  ${theme.name.padEnd(20)} ${version.padEnd(24)} ${outcome}`);
  }
  lines.push("");

  if (report.changed) {
    lines.push(
      report.written
        ? `Written to ${report.written}.`
        : report.dryRun
          ? `${report.themes.filter((theme) => theme.changed).length} theme(s) would change. Nothing was written.`
          : `${report.themes.filter((theme) => theme.changed).length} theme(s) changed.`,
    );
  } else {
    lines.push("Already current — nothing to migrate.");
  }

  return lines.join("\n");
}

/**
 * Run `themvora migrate`.
 *
 * @param args - The parsed arguments.
 *
 * @throws {UsageError} When no file is given, or when `--write` and `--output`
 *   are combined (they name two different destinations).
 */
export async function cmdMigrate(args: ParsedArgs): Promise<void> {
  const file = getString(args, "file") || getString(args, "f") || args._[1];
  const output = getString(args, "output") || getString(args, "o") || null;
  const write = getBool(args, "write");
  const dryRun = getBool(args, "dry-run");
  const json = wantsJson(args);
  const quiet = wantsQuiet(args);

  if (!file) {
    throw new UsageError("--file <path> is required");
  }
  if (write && output) {
    throw new UsageError(
      "--write migrates the file in place, so it cannot be combined with --output <file>",
    );
  }
  if (dryRun && (write || output)) {
    throw new UsageError("--dry-run never writes, so it cannot be combined with --write or --output");
  }

  const parsed = readThemeJSON(file);

  let payload: ThemeDefinition | { light: ThemeDefinition; dark: ThemeDefinition };
  let themes: MigratedTheme[];

  if (isThemePair(parsed)) {
    const light = migrateTheme(parsed.light);
    const dark = migrateTheme(parsed.dark);
    payload = { light, dark };
    themes = [describe(parsed.light, light), describe(parsed.dark, dark)];
  } else {
    const migrated = migrateTheme(parsed as ThemeDefinition);
    payload = migrated;
    themes = [describe(parsed as ThemeDefinition, migrated)];
  }

  const changed = themes.some((theme) => theme.changed);

  let written: string | null = null;
  if (!dryRun && (write || output)) {
    const destination = output ?? file;
    // No trailing newline, matching `generate --output` and `export --output`:
    // a file's bytes are the payload, and a migration must not churn them.
    writeFileSync(destination, JSON.stringify(payload, null, 2), "utf-8");
    written = destination;
  }

  const report: MigrateReport = {
    version: 1,
    file,
    changed,
    themes,
    written,
    dryRun,
  };

  if (json) {
    writeJson(report);
    if (!dryRun && written === null) {
      // The report went to stdout, so the migrated theme had nowhere to go.
      status("note: --json emits the report; add --write or --output to persist the result.");
    }
    return;
  }

  if (dryRun) {
    process.stdout.write(`${render(report)}\n`);
    return;
  }

  if (written) {
    if (!quiet) status(`Migrated theme written to ${written}`);
    return;
  }

  // Unchanged default: the migrated theme is the payload.
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}
