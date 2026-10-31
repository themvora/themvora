/**
 * `Themvora: Copy CSS Variables`
 *
 * Read-only with respect to the workspace. The only external effect is the
 * clipboard, and it happens once — after the theme has been chosen, validated and
 * rendered.
 *
 * Four outcomes are kept distinct, because collapsing any two of them would tell
 * the user something untrue:
 *
 * - **Unreadable or malformed** — the file could not be read, or is not JSON.
 * - **Not a theme** — JSON that is neither a theme nor a `{ light, dark }` pair.
 * - **Fails semantic validation** — a real theme with missing tokens. It is not
 *   offered, and the user is told so rather than being handed broken CSS.
 * - **Selectable** — validated, so it can be rendered.
 *
 * When a document holds more than one selectable theme the user chooses. The
 * first theme is never picked silently: "copy the CSS" that copies something
 * other than what the user meant is worse than asking.
 *
 * @packageDocumentation
 */
import { commands, window, workspace, type Disposable, type QuickPickItem, type Uri } from "vscode";
import type { ThemeDefinition } from "@themvora/core";

import type { Clipboard } from "../adapters/clipboard.js";
import { describeError } from "../domain/errors.js";
import { parseThemeDocument, shapeMessage } from "../domain/themeDocument.js";
import type { ThemvoraClient } from "../services/coreClient.js";
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
export const COMMAND_COPY_CSS_VARIABLES = "themvora.copyCssVariables";

/** What the command needs from the extension. */
export interface CopyCssCommandDeps {
  /** The canonical client. */
  readonly client: ThemvoraClient;
  /**
   * Every selectable theme.
   *
   * Without it the command could only copy from a JSON file, so a project theme
   * or a catalog preset — the two most likely sources — were unreachable.
   */
  readonly catalog: ThemeCatalogDeps;
  /** The clipboard to write to. */
  readonly clipboard: Clipboard;
}

/** A theme that passed validation and can be rendered. */
interface Candidate {
  readonly name: string;
  readonly mode: string;
  readonly theme: ThemeDefinition;
}

/** A quick-pick row carrying its candidate. */
interface ThemeItem extends QuickPickItem {
  readonly candidate: Candidate;
}

/**
 * Register the command.
 *
 * @param deps - The client and the clipboard.
 * @returns The registration, for `context.subscriptions`.
 */
export function registerCopyCssVariablesCommand(deps: CopyCssCommandDeps): Disposable {
  return commands.registerCommand(COMMAND_COPY_CSS_VARIABLES, (file?: unknown) =>
    runCopyCssVariables(file, deps),
  );
}

/**
 * Copy one theme's CSS custom properties.
 *
 * @param fileArgument - A `Uri` to read instead of prompting, so the command is
 *   callable from the command bus and from a test.
 * @param deps - The client and the clipboard.
 */
export async function runCopyCssVariables(
  fileArgument: unknown,
  deps: CopyCssCommandDeps,
): Promise<void> {
  const target = asUri(fileArgument);

  if (target === undefined) {
    // No file named: resolve through the shared catalog, which knows about the
    // project's themes and the presets as well as an open document.
    const resolution = await resolveThemeEntry(deps.catalog, {
      title: "Copy CSS variables",
      autoSelectSingle: true,
    });
    if (!resolution.ok) {
      if (resolution.failure.kind === "cancelled") return;
      void window.showWarningMessage(
        resolution.failure.kind === "no-workspace"
          ? "Themvora: open a folder, or a theme file, before copying variables."
          : "Themvora: no theme to copy. Open a theme file or use a catalog preset.",
      );
      return;
    }

    // A draft is mutable host state. Resolve the latest revision before
    // validating, so the copied text is what the Studio holds now rather than
    // what it held when the picker was opened.
    const entry = latestEntry(deps.catalog, resolution.entry);
    if (entry === undefined) {
      void window.showWarningMessage(
        "Themvora: that draft is no longer available, so nothing was copied.",
      );
      return;
    }

    const checked = await deps.client.validate({ theme: entry.theme, themes: themeSetFor(entry) });
    if (!checked.ok || checked.value === null) {
      const detail = checked.errors[0]?.message ?? checked.reason ?? checked.outcome;
      void window.showErrorMessage(`Themvora could not validate ${entry.label}: ${detail}`);
      return;
    }
    if (!checked.value.valid) {
      // Copying would hand the user CSS for a theme the engine has rejected.
      void window.showErrorMessage(
        `Themvora: ${entry.label} is not valid, so its variables were not copied. ` +
          'Run "Themvora: Validate Theme…" for the details.',
      );
      return;
    }

    await copyTheme(entry.theme, themeSetFor(entry), entry.label, entry.mode, deps);

    // Validation and serialisation are two awaits; a draft edited in between
    // means the clipboard holds an earlier revision. The copy already happened,
    // so the honest answer is to say which revision it holds.
    if (isStaleEntry(deps.catalog, entry)) {
      void window.showWarningMessage(
        `Themvora: ${entry.label} changed while its variables were being copied, so the clipboard holds an earlier revision. Run the copy again for the current one.`,
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
    void window.showErrorMessage(
      shapeMessage(target.fsPath, document) ?? `${target.fsPath} could not be read.`,
    );
    return;
  }

  const partition = await partitionByValidation(document.themes, deps.client, target);
  if (partition === null) return;

  const { candidates, rejected } = partition;

  if (candidates.length === 0) {
    // Every theme failed validation. Copying would hand the user CSS for a theme
    // the engine has already rejected.
    void window.showErrorMessage(
      `No theme in ${target.fsPath} passed validation (${rejected.join(", ")}). ` +
        'Run "Themvora: Validate Theme…" for the details.',
    );
    return;
  }

  const selected = await selectTheme(candidates, rejected);
  if (selected === undefined) return;

  // Resolved against the document, so inherited tokens are included rather than
  // a one-property stylesheet built from the overrides alone.
  await copyTheme(selected.theme, document.themes, selected.name, selected.mode, deps);
}

/**
 * Render one theme's CSS and put it on the clipboard.
 *
 * The last step of both paths, so the two cannot drift in what they copy or in
 * what they claim afterwards.
 *
 * @param theme - The theme to serialise.
 * @param themes - The rest of its document, so inherited tokens resolve.
 * @param name - What to call it in the confirmation.
 * @param mode - Its mode, for the confirmation.
 * @param deps - The client and the clipboard.
 */
async function copyTheme(
  theme: ThemeDefinition,
  themes: readonly ThemeDefinition[],
  name: string,
  mode: string | undefined,
  deps: CopyCssCommandDeps,
): Promise<void> {
  const rendered = await deps.client.cssDocument({ theme, themes });
  if (!rendered.ok || rendered.value === null) {
    const detail = rendered.errors[0]?.message ?? rendered.reason ?? rendered.outcome;
    void window.showErrorMessage(`Themvora could not render ${name}: ${detail}`);
    return;
  }

  try {
    await deps.clipboard.writeText(rendered.value);
  } catch (error) {
    // No success message on this path: the copy did not happen.
    void window.showErrorMessage(`Themvora could not copy to the clipboard: ${describeError(error)}`);
    return;
  }

  void window.showInformationMessage(
    `Themvora: copied ${name}${mode === undefined ? "" : ` (${mode})`} CSS variables to the clipboard.`,
  );
}

/**
 * Validate every theme in the document.
 *
 * @param themes - The themes the document holds.
 * @param client - The canonical client.
 * @param target - The file, for error messages.
 * @returns The selectable candidates and the names that failed validation, or
 *   `null` when validation itself could not run and the caller should stop.
 */
async function partitionByValidation(
  themes: readonly ThemeDefinition[],
  client: ThemvoraClient,
  target: Uri,
): Promise<{ candidates: Candidate[]; rejected: string[] } | null> {
  const candidates: Candidate[] = [];
  const rejected: string[] = [];

  for (const theme of themes) {
    const result = await client.validate({ theme, themes });

    // `ok` and `validation-failed` are both answers. Anything else means
    // validation did not happen, so the command stops rather than guessing.
    if ((result.outcome !== "ok" && result.outcome !== "validation-failed") || result.value === null) {
      const detail = result.errors[0]?.message ?? result.reason ?? result.outcome;
      void window.showErrorMessage(`Themvora could not validate ${target.fsPath}: ${detail}`);
      return null;
    }

    const name = theme.name ?? "unnamed";
    if (result.value.valid) {
      candidates.push({ name, mode: String(theme.meta?.mode ?? "unknown mode"), theme });
    } else {
      rejected.push(name);
    }
  }

  return { candidates, rejected };
}

/**
 * Ask which theme to copy, unless there is exactly one.
 *
 * @param candidates - The validated themes.
 * @param rejected - Names that failed validation, mentioned in the placeholder.
 * @returns The chosen candidate, or `undefined` when the pick was dismissed.
 */
async function selectTheme(
  candidates: readonly Candidate[],
  rejected: readonly string[],
): Promise<Candidate | undefined> {
  // One candidate is not a choice; asking would be ceremony.
  if (candidates.length === 1) return candidates[0];

  const items: ThemeItem[] = candidates.map((candidate) => ({
    label: candidate.name,
    description: candidate.mode,
    candidate,
  }));

  const picked = await window.showQuickPick<ThemeItem>(items, {
    title: "Copy CSS Variables",
    placeHolder:
      rejected.length > 0
        ? `Select a theme — ${rejected.join(", ")} failed validation and cannot be copied`
        : "Select a theme to copy",
  });

  return picked?.candidate;
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
