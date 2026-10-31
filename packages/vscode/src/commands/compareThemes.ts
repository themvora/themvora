/**
 * `Themvora: Compare Themes`
 *
 * Read-only. Reads two theme documents and reports what semantically differs,
 * mode by mode, using core's `diffThemes()`.
 *
 * The documents are passed to core **as they are**: a single theme stays a single
 * theme, and a `{ light, dark }` pair stays a set, which core compares mode by
 * mode. Collapsing a pair to one half first would answer a smaller question than
 * the user asked.
 *
 * Comparison is semantic, not textual: it compares resolved token values, so a
 * theme that extends another and restates the same colour is reported as
 * unchanged.
 *
 * @packageDocumentation
 */
import { commands, window, workspace, type Disposable, type OutputChannel, type Uri } from "vscode";
import type { ThemeDefinition, ThemeDiffReport, ThemeSet } from "@themvora/core";

import { parseThemeDocument, shapeMessage } from "../domain/themeDocument.js";
import type { ThemvoraClient } from "../services/coreClient.js";
import {
  collectThemeEntries,
  isStaleEntry,
  pickThemeEntry,
  type ThemeCatalogDeps,
  type ThemeEntry,
} from "../services/themeCatalog.js";
import { asUri } from "./commandArgs.js";

/**
 * The command identifier.
 *
 * Must match `contributes.commands`; a unit test asserts the two agree.
 */
export const COMMAND_COMPARE_THEMES = "themvora.compareThemes";

/** What the command needs from the extension. */
export interface CompareThemesDeps {
  /** The canonical client. */
  readonly client: ThemvoraClient;
  /** Where the report goes. */
  readonly output: OutputChannel;
  /**
   * Every selectable theme.
   *
   * Comparison is not a JSON feature: a project theme and a preset are both
   * themes, and asking the user to export them to files first would be asking
   * them to do the extension's job.
   */
  readonly catalog: ThemeCatalogDeps;
}

/**
 * Register the command.
 *
 * @param deps - The client and the report channel.
 * @returns The registration, for `context.subscriptions`.
 */
export function registerCompareThemesCommand(deps: CompareThemesDeps): Disposable {
  return commands.registerCommand(COMMAND_COMPARE_THEMES, (first?: unknown, second?: unknown) =>
    runCompareThemes(first, second, deps),
  );
}

/**
 * Compare two theme documents.
 *
 * @param firstArgument - A `Uri` for the left side, instead of prompting.
 * @param secondArgument - A `Uri` for the right side, instead of prompting.
 * @param deps - The client and the report channel.
 */
export async function runCompareThemes(
  firstArgument: unknown,
  secondArgument: unknown,
  deps: CompareThemesDeps,
): Promise<void> {
  const leftArgument = asUri(firstArgument);
  const rightArgument = asUri(secondArgument);

  let a: ThemeDefinition | ThemeSet | null;
  let b: ThemeDefinition | ThemeSet | null;
  let leftLabel: string;
  let rightLabel: string;
  /**
   * The draft entries the operands came from, when they did.
   *
   * Kept so the report can be recognised as stale: a draft edited while the
   * diff was running would otherwise be presented as the current comparison.
   */
  const drafts: ThemeEntry[] = [];

  if (leftArgument !== undefined && rightArgument !== undefined) {
    // An explicit pair from another surface: read the files, as before.
    a = await loadThemeSource(leftArgument);
    if (a === null) return;
    b = await loadThemeSource(rightArgument);
    if (b === null) return;
    leftLabel = leftArgument.fsPath;
    rightLabel = rightArgument.fsPath;
  } else {
    const entries = await collectThemeEntries(deps.catalog);
    if (entries.length < 2) {
      void window.showWarningMessage(
        "Themvora: comparison needs two themes. Open a theme file, add one to the project, or use a catalog preset.",
      );
      return;
    }

    const first = await pickThemeEntry(entries, "Select the first theme");
    if (first === undefined) return;

    // The same theme on both sides is not a comparison, so it is not offered.
    const rest = entries.filter((entry) => entry.id !== first.id);
    const second = await pickThemeEntry(rest, "Select the second theme");
    if (second === undefined) return;

    a = first.theme;
    b = second.theme;
    leftLabel = describeEntry(first);
    rightLabel = describeEntry(second);
    for (const entry of [first, second]) {
      if (entry.draftId !== undefined) drafts.push(entry);
    }
  }

  const compared = await deps.client.diff({ a, b });

  if (!compared.ok || compared.value === null) {
    const detail = compared.errors[0]?.message ?? compared.reason ?? compared.outcome;
    void window.showErrorMessage(`Themvora could not compare the themes: ${detail}`);
    return;
  }

  // A draft that moved while the diff ran makes this report describe a theme
  // that is no longer the one selected. Saying nothing would present stale
  // output as current, so it is dropped and the user is asked to run again.
  if (drafts.some((entry) => isStaleEntry(deps.catalog, entry))) {
    void window.showWarningMessage(
      "Themvora: a draft changed while the comparison was running, so the result was discarded. Run the comparison again.",
    );
    return;
  }

  const report = compared.value;

  deps.output.clear();
  for (const line of renderComparison(leftLabel, rightLabel, report)) {
    deps.output.appendLine(line);
  }
  deps.output.show(true);

  const differences = report.summary.changed + report.summary.added + report.summary.removed;

  if (differences === 0) {
    void window.showInformationMessage(
      `Themvora: ${report.a.name} and ${report.b.name} have no token differences.`,
    );
    return;
  }

  void window.showInformationMessage(
    `Themvora: ${differences} token difference${differences === 1 ? "" : "s"} between ` +
      `${report.a.name} and ${report.b.name} — see the Themvora output.`,
  );
}

/**
 * Read a document and return what core should compare.
 *
 * A single theme is compared as itself; a pair is compared as a set, so both
 * modes are covered in one report.
 *
 * @param uri - The file.
 * @returns The theme source, or `null` when it could not be read (already
 *   reported to the user).
 */
async function loadThemeSource(uri: Uri): Promise<ThemeDefinition | ThemeSet | null> {
  const text = await readText(uri);
  if (text === null) {
    void window.showErrorMessage(`Themvora could not read ${uri.fsPath}.`);
    return null;
  }

  const document = parseThemeDocument(text);
  if (document.shape !== "themes") {
    void window.showErrorMessage(
      shapeMessage(uri.fsPath, document) ?? `${uri.fsPath} could not be read.`,
    );
    return null;
  }

  // A pair is a set; core reports each mode separately. Anything shorter is a
  // single theme.
  if (document.themes.length === 1) return document.themes[0]!;
  return { light: document.themes[0]!, dark: document.themes[1]! };
}

/**
 * Render the report.
 *
 * @param pathA - The left file, for the header.
 * @param pathB - The right file, for the header.
 * @param report - Core's report.
 * @returns The lines to append to the output channel.
 */
function renderComparison(pathA: string, pathB: string, report: ThemeDiffReport): string[] {
  const lines = [
    "Themvora — compare",
    `A: ${pathA}`,
    `   ${report.a.name} (${report.a.family}, ${report.a.mode})`,
    `B: ${pathB}`,
    `   ${report.b.name} (${report.b.family}, ${report.b.mode})`,
    "",
  ];

  for (const mode of ["light", "dark"] as const) {
    const section = report.modes[mode];
    if (section === undefined) continue;

    const { counts } = section;
    lines.push(`${mode} (${section.present})`);
    lines.push(
      `  ${counts.total} tokens · ${counts.changed} changed · ${counts.added} added · ${counts.removed} removed`,
    );

    for (const change of section.changes) {
      if (change.status === "unchanged") continue;
      lines.push(`    ${change.path}: ${change.before ?? "(absent)"} → ${change.after ?? "(absent)"}`);
    }

    lines.push("");
  }

  if (!report.hasChanges) lines.push("No token differences.", "");

  return lines;
}

/**
 * How a chosen theme is named in the report header.
 *
 * The origin is part of the identity: "Oat" the preset and "Oat" a project
 * theme are the same colours only by coincidence, and the report should say
 * which one was compared.
 *
 * @param entry - The chosen entry.
 * @returns A line for the header.
 */
function describeEntry(entry: ThemeEntry): string {
  return entry.source === undefined
    ? `${entry.label} (${entry.originLabel})`
    : `${entry.label} (${entry.originLabel}) — ${entry.source}`;
}

/**
 * Read a file as UTF-8.
 *
 * @param uri - The file.
 * @returns The text, or `null` when it cannot be read.
 */
async function readText(uri: Uri): Promise<string | null> {
  try {
    return new TextDecoder().decode(await workspace.fs.readFile(uri));
  } catch {
    return null;
  }
}
