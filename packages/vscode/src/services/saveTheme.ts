/**
 * Writing a generated theme pair to a file the user chooses.
 *
 * Shared by the `Generate Theme` command and the Studio so both write the same
 * payload through the same coordinator. The distinction the caller must keep is
 * the one this function cannot make: **a written file is not a registered theme.**
 * Nothing here edits a registry or a provider, so a caller must not describe the
 * result as integrated into the application.
 *
 * @packageDocumentation
 */
import { Uri, window, workspace } from "vscode";

import { describeError } from "../domain/errors.js";
import type { RootSessions } from "./rootSessions.js";
import type { ThemeDefinition } from "@themvora/core";

/** The file name offered in the save dialog. */
export const DEFAULT_THEME_FILE_NAME = "themvora-theme.json";

/**
 * The formats a theme can be written as.
 *
 * The three TypeScript forms say the same thing three ways: `ts` inlines the
 * values with `defineTheme`, `ts-generate` re-derives them from the seed with
 * `generateTheme`, and `ts-preset` references the catalog with
 * `getPresetThemes`. A preset written as a literal is hundreds of lines the
 * package already ships.
 */
export type ThemeFileFormat = "json" | "ts" | "ts-generate" | "ts-preset" | "css";

/** The default file name for each format. */
export const DEFAULT_FILE_NAMES: Record<ThemeFileFormat, string> = {
  json: "themvora-theme.json",
  ts: "themvora-theme.ts",
  "ts-generate": "themvora-theme.ts",
  "ts-preset": "themvora-presets.ts",
  css: "themvora-theme.css",
};

/** What the caller needs to write a pair. */
export interface SaveThemeOptions {
  /** The themes to write: one, or a light/dark pair. */
  readonly themes: readonly ThemeDefinition[];
  /** Coordinates writes per project root. */
  readonly sessions: RootSessions;
  /** An explicit destination, skipping the dialog. Used by tests. */
  readonly target?: Uri;
  /**
   * A file name inside the first workspace folder.
   *
   * The Studio asks for a name rather than a path: the file belongs in the
   * project the user is looking at, and a save dialog for it is a detour.
   */
  readonly fileName?: string;
  /** The format to write. Defaults to JSON. */
  readonly format?: ThemeFileFormat;
  /** The CSS document, when `format` is `css` — produced by core, not here. */
  readonly css?: string;
  /** The seed and options a `ts-generate` file records. */
  readonly payload?: PayloadOptions;
  /** Called once the write has succeeded. */
  readonly onWritten?: () => void;
}

/** The outcome of a save attempt. */
export type SaveOutcome =
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly reason: "cancelled" }
  | { readonly ok: false; readonly reason: "failed"; readonly message: string };

/**
 * The exact bytes written for a pair.
 *
 * Exported so a test can assert the format without writing a file.
 *
 * @param pair - The pair.
 * @returns The file contents.
 */
export interface PayloadOptions {
  /** The seed the themes were generated from, for `ts-generate`. */
  readonly seed?: string;
  /** The family, when it is not core's default. */
  readonly family?: string;
  /** The generation style, when one was chosen. */
  readonly style?: string;
  /** Whether code-highlighting tokens were generated. */
  readonly withCode?: boolean;
  /** The contrast level, when one was chosen. */
  readonly contrast?: string;
  /** The pinned generation algorithm, when one was chosen. */
  readonly algorithm?: string;
  /** Which catalog a preset came from, so the file calls the right function. */
  readonly presetSource?: "preset" | "brand" | "builtin";
}

function nonEmpty(value: string | undefined): string | undefined {
  return value === undefined || value.trim().length === 0 ? undefined : value.trim();
}

export function themeFilePayload(
  themes: readonly ThemeDefinition[],
  format: ThemeFileFormat = "json",
  options: PayloadOptions = {},
): string {
  const [first, second] = themes;
  const byMode = (mode: string): ThemeDefinition | undefined =>
    themes.find((theme) => theme.meta?.mode === mode);

  if (format === "ts-preset") {
    // Three catalogs, and the file must call the one the theme actually came
    // from: a brand preset is not in `getPresetThemes()`.
    const fn =
      options.presetSource === "brand"
        ? "getBrandPresets"
        : options.presetSource === "builtin"
          ? "getBuiltInThemes"
          : "getPresetThemes";

    const lines = [`import { ${fn} } from "@themvora/core";`, "", `export const presets = ${fn}();`];

    if (options.family !== undefined && options.family.length > 0) {
      const identifier = options.family.replace(/[^A-Za-z0-9]+(.)/gu, (_, next: string) => next.toUpperCase());
      lines.push(
        "",
        "// Narrowed to this theme's family; drop the filter to keep the whole catalog.",
        `export const ${identifier} = presets.filter((theme) => theme.meta?.family === "${options.family}");`,
      );
    }

    return `${lines.join("\n")}\n`;
  }

  if (format === "ts-generate") {
    const seed = options.seed ?? first?.meta?.generation?.seed;
    if (typeof seed !== "string") {
      // Without a seed the file cannot reproduce the palette, so fall back to the
      // literal rather than emitting a call that would generate something else.
      return themeFilePayload(themes, "ts", options);
    }

    // Every option is written with its resolved value, so the file states what
    // was generated instead of relying on core's defaults staying the same.
    const family = nonEmpty(options.family) ?? nonEmpty(first?.meta?.family) ?? "generated";
    const style = nonEmpty(options.style) ?? nonEmpty(first?.meta?.generation?.style) ?? "balanced";
    const withCode = options.withCode ?? themes.some((theme) => theme.tokens?.code !== undefined);

    const fields = [
      `  seed: ${JSON.stringify(seed)},`,
      `  family: ${JSON.stringify(family)},`,
      `  style: ${JSON.stringify(style)},`,
      `  withCode: ${withCode},`,
      ...(nonEmpty(options.contrast) === undefined ? [] : [`  contrast: ${JSON.stringify(options.contrast)},`]),
      ...(nonEmpty(options.algorithm) === undefined ? [] : [`  algorithm: ${JSON.stringify(options.algorithm)},`]),
    ];

    return [
      'import { generateTheme } from "@themvora/core";',
      "",
      `// Re-derives the same pair from the seed; nothing is inlined.`,
      "export const { light, dark } = generateTheme({",
      ...fields,
      "});",
      "",
      "export const themes = [light, dark];",
      "",
    ].join("\n");
  }

  if (format === "ts") {
    // `defineTheme()` is identity, so a literal is the theme. Emitting the call
    // rather than a bare object keeps the file the same shape as the ones
    // `themvora init` writes, and the import is what makes it type-check.
    const names = themes.map((_, index) => (themes.length === 1 ? "theme" : index === 0 ? "light" : "dark"));
    return [
      'import { defineTheme } from "@themvora/core";',
      "",
      ...themes.flatMap((theme, index) => [
        `export const ${names[index]} = defineTheme(${JSON.stringify(theme, null, 2)});`,
        "",
      ]),
      `export const themes = [${names.join(", ")}];`,
      "",
    ].join("\n");
  }

  if (themes.length === 1 && first !== undefined) {
    return `${JSON.stringify(first, null, 2)}\n`;
  }

  // A pair is keyed by mode when both are present, which is the shape
  // `parseThemeDocument` reads back as a light/dark pair.
  const light = byMode("light") ?? first;
  const dark = byMode("dark") ?? second;
  return `${JSON.stringify({ light, dark }, null, 2)}\n`;
}

/**
 * Ask for a destination and write the pair.
 *
 * @param options - The pair, the coordinator and an optional explicit target.
 * @returns Whether the file was written.
 *
 * @remarks
 * Cancellation is not a failure and is not reported as one: a user who closes the
 * dialog has not lost anything, and an error toast would be noise.
 */
export async function saveThemes(options: SaveThemeOptions): Promise<SaveOutcome> {
  const folders = workspace.workspaceFolders;
  const first = folders && folders.length > 0 ? folders[0] : undefined;
  const defaultUri = first ? Uri.joinPath(first.uri, DEFAULT_THEME_FILE_NAME) : undefined;

  const target =
    options.target ??
    (options.fileName === undefined ? undefined : insideFirstFolder(options.fileName)) ??
    (await window.showSaveDialog({
      saveLabel: "Save Theme",
      filters: { "Theme JSON": ["json"] },
      ...(defaultUri !== undefined ? { defaultUri } : {}),
    }));

  if (target === undefined) return { ok: false, reason: "cancelled" };

  try {
    await options.sessions.run(projectRootOf(target), async () => {
      // `workspace.fs.writeFile` returns a `Thenable`, not a `Promise`; the async
      // wrapper is what lets the coordinator await it.
      const body =
        options.format === "css"
          ? (options.css ?? "")
          : themeFilePayload(options.themes, options.format ?? "json", options.payload ?? {});
      await workspace.fs.writeFile(target, Buffer.from(body, "utf8"));
    });
  } catch (error) {
    return { ok: false, reason: "failed", message: describeError(error) };
  }

  // Only after the write succeeded: a refresh on failure would re-read a project
  // that did not change.
  options.onWritten?.();

  return { ok: true, path: target.fsPath };
}

/**
 * The folder a write belongs to.
 *
 * @param target - The file being written.
 * @returns Its parent path, so writes to the same project are serialised.
 */
function projectRootOf(target: Uri): string {
  const path = target.fsPath;
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return index <= 0 ? path : path.slice(0, index);
}

/**
 * Resolve a bare file name inside the first workspace folder.
 *
 * @param fileName - The name the user typed.
 * @returns The URI, or `undefined` when no folder is open.
 */
function insideFirstFolder(fileName: string): Uri | undefined {
  const folders = workspace.workspaceFolders;
  const first = folders && folders.length > 0 ? folders[0] : undefined;
  if (first === undefined) return undefined;

  // A typed name must stay a name: a path separator would let it escape the
  // folder the user is looking at.
  const safe = fileName.replace(/[\\/]/gu, "-").trim();
  return Uri.joinPath(first.uri, safe.length > 0 ? safe : DEFAULT_THEME_FILE_NAME);
}
