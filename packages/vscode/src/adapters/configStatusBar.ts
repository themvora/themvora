/**
 * A status bar item that appears only while a theme file is focused.
 *
 * The item exists because the Explorer icon cannot be ours: a file's icon belongs
 * to the user's icon theme. The status bar is one of the few places an extension
 * can put its own mark beside a file the user is looking at.
 *
 * **The click does what the file allows, and the label says which.** A JSON theme
 * document can be previewed, so the item offers the preview. A `theme.config.ts`
 * cannot — the extension does not execute project code — so the item focuses the
 * Themvora panel, where that file is listed, rather than opening a preview that
 * would fail and fall back to a file dialog.
 *
 * @packageDocumentation
 */
import { StatusBarAlignment, window, type Disposable, type TextDocument } from "vscode";

import {
  ROOT_THEME_FILE,
  THEME_FILE_SUFFIX,
  baseName,
  isConfigFileName,
  isThemeModuleName,
} from "../domain/projectFiles.js";

/** What the item should say and do for a document. */
interface Target {
  readonly text: string;
  readonly tooltip: string;
  readonly command: string;
}

/**
 * The status bar target for a file, or `undefined` when it is not a theme file.
 *
 * @param fileName - The document's base name.
 * @returns The label, tooltip and command, or `undefined`.
 */
export function targetForFile(fileName: string): Target | undefined {
  if (fileName === ROOT_THEME_FILE || fileName.endsWith(THEME_FILE_SUFFIX)) {
    return {
      text: "$(preview) Preview Theme",
      tooltip: `Preview ${fileName} in the Themvora panel`,
      command: "themvora.previewTheme",
    };
  }

  if (isConfigFileName(fileName) || isThemeModuleName(fileName)) {
    return {
      text: "$(symbol-color) Themvora",
      tooltip: `${fileName} — show this project's Themvora files`,
      // The panel, not the preview: a TypeScript configuration cannot be read.
      command: "themvora.workspace.focus",
    };
  }

  return undefined;
}

/**
 * Register the item.
 *
 * @returns The registration, to be disposed with the extension.
 */
export function registerConfigStatusBar(): Disposable {
  const item = window.createStatusBarItem(StatusBarAlignment.Right, 99);
  item.name = "Themvora theme file";

  /**
   * Show the item for a document, or hide it.
   *
   * @param document - The active document, when there is one.
   */
  const sync = (document: TextDocument | undefined): void => {
    const target = document === undefined ? undefined : targetForFile(baseName(document.uri.path));

    if (target === undefined) {
      item.hide();
      return;
    }

    item.text = target.text;
    item.tooltip = target.tooltip;
    item.command = target.command;
    item.show();
  };

  // A theme file may already be the active editor when the extension activates.
  sync(window.activeTextEditor?.document);

  const listener = window.onDidChangeActiveTextEditor((editor) => sync(editor?.document));

  return {
    dispose(): void {
      listener.dispose();
      item.dispose();
    },
  };
}
