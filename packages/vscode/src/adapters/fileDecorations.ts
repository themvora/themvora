/**
 * The badge on a Themvora theme file.
 *
 * VS Code has no API to give a file an *icon*: the picture beside `vite.config.ts`
 * comes from the user's file icon theme, which an extension cannot add to. What
 * an extension can do is decorate a file — a short badge and a colour, in the
 * Explorer, in tabs and in Quick Open — and that is what this does.
 *
 * The badge is only applied inside a project that declares `@themvora/*`. A file
 * called `theme.config.ts` in an unrelated project would otherwise claim to be
 * Themvora configuration, and the whole point is to mark the files that are.
 *
 * @packageDocumentation
 */
import {
  ThemeColor,
  window,
  type Disposable,
  type FileDecoration,
  type FileDecorationProvider,
  type Uri,
} from "vscode";

import { baseName, isConfigFileName, isThemeModuleName } from "../domain/projectFiles.js";
import type { RootView } from "../domain/rootView.js";

/** The badge text. VS Code allows two characters. */
const BADGE = "TV";

/** Shown on hover. */
const TOOLTIP = "Themvora theme configuration";

/**
 * A colour that reads against both light and dark lists.
 *
 * `charts.purple` is a documented theme-colour id, so it follows the user's
 * theme rather than being a fixed hex that could disappear.
 */
const COLOR = new ThemeColor("charts.purple");

/** What the provider needs from the rest of the extension. */
export interface ThemeFileDecorationOptions {
  /** The current workspace roots, read lazily so the badge follows a refresh. */
  readonly roots: () => readonly RootView[];
}

/**
 * Whether a path sits inside a root.
 *
 * Compared as `/`-separated text rather than with `startsWith` alone, so
 * `/app-other` is not treated as inside `/app`.
 *
 * @param fsPath - The file's path.
 * @param root - A project root.
 * @returns `true` when the file is below the root.
 */
function isInside(fsPath: string, root: string): boolean {
  const path = fsPath.replace(/\\/g, "/");
  const base = root.replace(/\\/g, "/").replace(/\/+$/, "");
  return path.startsWith(`${base}/`);
}

/**
 * Register the decoration provider.
 *
 * @param options - Access to the current roots.
 * @returns The registration, to be disposed with the extension.
 */
export function registerThemeFileDecorations(options: ThemeFileDecorationOptions): Disposable {
  const provider: FileDecorationProvider = {
    provideFileDecoration(uri: Uri): FileDecoration | undefined {
      // Called for every file the Explorer draws, so the cheap name check comes
      // first and nothing else runs for the overwhelming majority of files.
      const name = baseName(uri.path);
      if (!isConfigFileName(name) && !isThemeModuleName(name)) return undefined;

      const owner = options.roots().find((root) => isInside(uri.fsPath, root.inspection.root));
      if (owner === undefined || owner.inspection.packages.length === 0) return undefined;

      return { badge: BADGE, color: COLOR, tooltip: TOOLTIP };
    },
  };

  return window.registerFileDecorationProvider(provider);
}
