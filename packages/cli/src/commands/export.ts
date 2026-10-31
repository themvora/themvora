import { themeToCssDocument, themeToCSSVariables, type ThemeDefinition } from "@themvora/core";
import { writeFileSync } from "node:fs";
import { getString } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { UsageError } from "../exit-codes.js";
import { readThemeJSON, isThemePair } from "../theme-shared.js";
import { status } from "../output.js";

/**
 * Implements the `export` command: exports a theme file as CSS variables or
 * JSON.
 *
 * Reads `--file`/`-f` (or the first positional), `--format`/`-F` (`css` or
 * `json`), and `--output`/`-o`. Prints the exported CSS or JSON to stdout, or
 * writes it to the output file when provided.
 *
 * @remarks
 * The CSS document is formatted by core's `themeToCssDocument()`, not here. The
 * extension's Copy CSS Variables command calls the same function, so the CSS a
 * user copies in the editor is byte-identical to the CSS this command writes.
 * What stays in the CLI is the file handling: `--output` and the status line.
 *
 * @param args The parsed command-line arguments.
 * @throws {UsageError} When no file is provided or the format is unknown.
 *
 * @see {@link parseArgs}
 */
export async function cmdExport(args: ParsedArgs) {
  const file = getString(args, "file") || getString(args, "f") || args._[1];
  const format = (getString(args, "format") || getString(args, "F") || "css").toLowerCase();
  const output = getString(args, "output") || getString(args, "o") || null;

  if (!file) {
    throw new UsageError("--file <path> is required");
  }

  const parsed = readThemeJSON(file);

  if (format === "css") {
    const css = themeToCssDocument(
      isThemePair(parsed) ? parsed : (parsed as ThemeDefinition),
    );

    if (output) {
      writeFileSync(output, css, "utf-8");
      status(`CSS exported to ${output}`);
    } else {
      process.stdout.write(`${css}\n`);
    }
  } else if (format === "json") {
    const data = isThemePair(parsed)
      ? {
          light: themeToCSSVariables(parsed.light),
          dark: themeToCSSVariables(parsed.dark),
        }
      : themeToCSSVariables(parsed as ThemeDefinition);

    const json = JSON.stringify(data, null, 2);

    if (output) {
      writeFileSync(output, json, "utf-8");
      status(`JSON exported to ${output}`);
    } else {
      process.stdout.write(`${json}\n`);
    }
  } else {
    throw new UsageError(`unknown format "${format}" — use "css" or "json"`);
  }
}