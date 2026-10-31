/**
 * `Themvora: Validate Theme…`
 *
 * Read-only: it reads one JSON theme document, asks the canonical client to
 * validate every theme it holds, and reports. It writes nothing — not to the
 * workspace, not to a project registry — which is why it needs no root
 * coordination.
 *
 * The exit-code semantics carry through from the client: a document whose themes
 * fail validation is a **warning with a report**, not an error. That distinction
 * matters, because an invalid theme is a normal thing to have open while you are
 * editing it, and a red error would misrepresent a correct answer.
 *
 * @packageDocumentation
 */
import {
  commands,
  window,
  workspace,
  type Disposable,
  type OutputChannel,
  type Uri,
} from "vscode";

import { describeContrast } from "../domain/report.js";
import { parseThemeDocument, shapeMessage } from "../domain/themeDocument.js";
import type { ThemeDefinition } from "@themvora/core";

import type { ThemvoraClient, ValidationReport } from "../services/coreClient.js";
import {
  isStaleEntry,
  latestEntry,
  resolveThemeEntry,
  themeSetFor,
  type ThemeCatalogDeps,
} from "../services/themeCatalog.js";
import { asUri } from "./commandArgs.js";

/**
 * The command identifier.
 *
 * Must match `contributes.commands`; a unit test asserts the two agree.
 */
export const COMMAND_VALIDATE_THEME = "themvora.validateTheme";

/** What the command needs from the extension. */
export interface ValidateCommandDeps {
  /** The canonical client. */
  readonly client: ThemvoraClient;
  /**
   * Every selectable theme.
   *
   * A project theme and a catalog preset are validatable; without this the
   * command could only read a JSON file the user had already found.
   */
  readonly catalog: ThemeCatalogDeps;
  /** Where the detailed report goes. */
  readonly output: OutputChannel;
}

/**
 * Register the command.
 *
 * @param deps - The client and the report channel.
 * @returns The registration, for `context.subscriptions`.
 */
export function registerValidateThemeCommand(deps: ValidateCommandDeps): Disposable {
  return commands.registerCommand(COMMAND_VALIDATE_THEME, (file?: unknown) =>
    runValidateTheme(file, deps),
  );
}

/**
 * Validate one theme document.
 *
 * @param fileArgument - A `Uri` to validate instead of prompting, so the command
 *   is callable from the command bus and from a test.
 * @param deps - The client and the report channel.
 */
export async function runValidateTheme(
  fileArgument: unknown,
  deps: ValidateCommandDeps,
): Promise<void> {
  const target = asUri(fileArgument);

  if (target === undefined) {
    const resolution = await resolveThemeEntry(deps.catalog, {
      title: "Validate a theme",
      autoSelectSingle: true,
    });
    if (!resolution.ok) {
      if (resolution.failure.kind === "cancelled") return;
      void window.showWarningMessage(
        resolution.failure.kind === "no-workspace"
          ? "Themvora: open a folder, or a theme file, before validating."
          : "Themvora: no theme to validate. Open a theme file or use a catalog preset.",
      );
      return;
    }

    const entry = resolution.entry;
    // Resolve the latest revision: a draft edited between the picker and here
    // must be validated as it is now, not as it was when the list was built.
    const current = latestEntry(deps.catalog, entry);
    if (current === undefined) {
      void window.showWarningMessage(
        "Themvora: that draft is no longer available, so there is nothing to validate.",
      );
      return;
    }

    await reportThemes(
      [current.theme],
      themeSetFor(current),
      `${current.label} (${current.originLabel})`,
      deps,
    );

    // The report is already on screen. If the draft moved while it was being
    // produced, the counts describe the previous revision, so say so rather
    // than letting it read as the current verdict.
    if (isStaleEntry(deps.catalog, current)) {
      deps.output.appendLine("");
      deps.output.appendLine(
        "Note: this draft changed while it was being validated. The result above describes the revision read at the time; run it again for the current one.",
      );
      void window.showWarningMessage(
        `Themvora: ${current.label} changed while it was being validated, so the report describes an earlier revision. Run the validation again.`,
      );
    }
    return;
  }

  const text = await readText(target);
  if (text === null) {
    void window.showErrorMessage(`Themvora could not read ${target.fsPath}.`);
    return;
  }

  const document = parseThemeDocument(text);
  if (document.shape !== "themes") {
    // A document that is not a theme at all is an error: there is nothing to
    // report, and calling it "invalid" would imply the theme was read.
    void window.showErrorMessage(
      shapeMessage(target.fsPath, document) ?? `${target.fsPath} could not be read.`,
    );
    return;
  }

  await reportThemes(document.themes, document.themes, target.fsPath, deps);
}

/**
 * Validate a set of themes and report them.
 *
 * One implementation for the file path and the catalog path, so both produce the
 * same report, the same counts and the same wording.
 *
 * @param themes - The themes to validate.
 * @param context - The document they belong to, for `extends` resolution.
 * @param label - What to call the source in the report header.
 * @param deps - The client and the report channel.
 */
async function reportThemes(
  themes: readonly ThemeDefinition[],
  context: readonly ThemeDefinition[],
  label: string,
  deps: ValidateCommandDeps,
): Promise<void> {
  const validated: { name: string; mode: string; report: ValidationReport }[] = [];

  for (const theme of themes) {
    // The whole document goes with it: a theme that `extends` a sibling is
    // validated against that sibling, not in isolation.
    const result = await deps.client.validate({ theme, themes: context });

    // `ok` and `validation-failed` both carry a report. Anything else means the
    // validation did not happen, so the command stops rather than reporting a
    // partial picture as though it were complete.
    if ((result.outcome !== "ok" && result.outcome !== "validation-failed") || result.value === null) {
      const detail = result.errors[0]?.message ?? result.reason ?? result.outcome;
      void window.showErrorMessage(`Themvora could not validate ${label}: ${detail}`);
      return;
    }

    validated.push({
      name: theme.name ?? "unnamed",
      mode: String(theme.meta?.mode ?? "unknown mode"),
      report: result.value,
    });
  }

  const invalid = validated.filter((entry) => !entry.report.valid).length;

  deps.output.clear();
  for (const line of renderReport(label, validated)) deps.output.appendLine(line);
  deps.output.show(true);

  const plural = validated.length === 1 ? "" : "s";
  if (invalid === 0) {
    void window.showInformationMessage(
      `Themvora: ${validated.length} theme${plural} valid — see the Themvora output for details.`,
    );
  } else {
    void window.showWarningMessage(
      `Themvora: ${invalid} of ${validated.length} theme${plural} invalid — see the Themvora output.`,
    );
  }
}

/**
 * Render the report.
 *
 * @param path - The file being validated.
 * @param validated - One entry per theme, in document order.
 * @returns The lines to append to the output channel.
 */
function renderReport(
  path: string,
  validated: readonly { name: string; mode: string; report: ValidationReport }[],
): string[] {
  const lines = ["Themvora — validate", `File:   ${path}`, `Themes: ${validated.length}`, ""];

  for (const entry of validated) {
    const { report } = entry;
    lines.push(`${entry.name} (${entry.mode})`);
    lines.push(report.valid ? "  PASS" : "  FAIL");

    for (const issue of report.issues) {
      lines.push(`    ${issue.path}: ${issue.message}`);
    }

    // Core's layered diagnostics do not decide validity, but they are the useful
    // part when a theme passes and still looks wrong.
    for (const level of report.levels) {
      lines.push(`    (${level.level}) ${level.message}`);
    }

    lines.push(`  ${describeContrast(report.contrast)}`);
    lines.push("");
  }

  return lines;
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
