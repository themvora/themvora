/**
 * Reading a theme JSON document.
 *
 * The extension accepts exactly the two shapes the CLI reads: a `{ light, dark }`
 * pair (what `themvora generate --mode both` writes) and a single theme
 * definition. Keeping the set identical is what lets a file this extension
 * writes be fed straight back to `themvora validate`, and it is why the shape
 * check lives in one place instead of once per command.
 *
 * **Shape only.** Whether a theme is *valid* is `validateTheme()`'s answer, not
 * this module's. Parsing decides "is this a theme document at all"; validation
 * decides "is this theme correct". Conflating them would make a malformed
 * document and an invalid theme indistinguishable to the caller.
 *
 * @packageDocumentation
 */
import { parseThemeJson, type ThemeDefinition } from "@themvora/core";

import { isRecord } from "./json.js";

/** The outcome of reading a document's shape. */
export type ThemeDocument =
  | {
      readonly shape: "themes";
      readonly themes: readonly ThemeDefinition[];
      /**
       * The document with comments and trailing commas blanked out.
       *
       * Same length as the input, so an offset into this is an offset into the
       * file. Callers that need positions scan this rather than the raw text.
       */
      readonly source: string;
    }
  | { readonly shape: "invalid-json" }
  | { readonly shape: "unknown" };

/**
 * Extract the theme definitions a parsed value holds.
 *
 * @param parsed - The parsed JSON value.
 * @returns The themes, or `null` when the value is neither accepted shape.
 */
function themesIn(parsed: unknown): ThemeDefinition[] | null {
  if (!isRecord(parsed)) return null;

  // The casts go through `unknown` because a JSON document proves nothing
  // statically; `validateTheme()` is the runtime guarantee, and it runs before
  // any theme is reported as valid.
  const light = parsed["light"];
  const dark = parsed["dark"];
  if (isRecord(light) && isRecord(dark)) {
    return [light as unknown as ThemeDefinition, dark as unknown as ThemeDefinition];
  }

  if (isRecord(parsed["tokens"])) return [parsed as unknown as ThemeDefinition];

  return null;
}

/**
 * Parse a theme document's text.
 *
 * @param text - The file's contents.
 * @returns The shape, and the themes when the shape is recognised.
 */
export function parseThemeDocument(text: string): ThemeDocument {
  let value: unknown;
  let source: string;

  try {
    // Comments and trailing commas are tolerated by core, so a commented theme
    // file behaves the same here as it does in the CLI.
    const parsed = parseThemeJson(text);
    value = parsed.value;
    source = parsed.source;
  } catch {
    return { shape: "invalid-json" };
  }

  const themes = themesIn(value);
  return themes === null ? { shape: "unknown" } : { shape: "themes", themes, source };
}

/**
 * Describe why a document could not be read, for a user-facing message.
 *
 * One wording, used by both the project reader and the validate command, so the
 * same file is described the same way wherever it is encountered.
 *
 * @param path - The path shown to the user.
 * @param document - The parsed shape.
 * @returns The reason, or `null` when the document is readable.
 */
export function shapeMessage(path: string, document: ThemeDocument): string | null {
  switch (document.shape) {
    case "invalid-json":
      return `${path} is not valid JSON.`;
    case "unknown":
      return `${path} is neither a theme nor a { light, dark } pair.`;
    case "themes":
      return null;
  }
}
