/**
 * Locating a core token path in the source text.
 *
 * Core validation reports dot-paths — `colors.primary` — and no positions. The
 * editor needs a `Range`. This module bridges the two with a small structural
 * scanner rather than a JSON-parser dependency, because the repository ships none
 * and adding one is out of bounds.
 *
 * **It is a scanner, not a parser.** It walks text that has already parsed and
 * records the span of each key and value. It does not build a document model,
 * does not validate, and refuses rather than guesses.
 *
 * **Input is the masked source**, not the raw file. Core's `parseThemeJson()`
 * blanks comments and trailing commas with spaces while preserving length, so
 * this scanner never has to understand comment syntax — and every offset it
 * returns still addresses the original document.
 *
 * Three behaviours are deliberate:
 *
 * - **Scoped to a theme.** A pair document has the same keys in both halves, so a
 *   lookup always names which half it means. Searching the whole text for
 *   `"primary"` would find whichever came first.
 * - **Duplicate keys resolve like `JSON.parse`** — the last occurrence wins, so a
 *   diagnostic points at the value the runtime actually uses.
 * - **String values are reported without their quotes.** That is the span a
 *   colour swatch must edit and the span a squiggle should cover.
 *
 * @packageDocumentation
 */

/** Which theme of a document a path is relative to. */
export type ThemeHalf = "single" | "light" | "dark";

/** A half-open character range. */
export interface SourceRange {
  /** First character, inclusive. */
  readonly start: number;
  /** Last character, exclusive. */
  readonly end: number;
}

/** The outcome of locating a path. */
export type Location =
  | { readonly status: "value"; readonly range: SourceRange }
  /**
   * The path is absent. The range is the deepest ancestor that does exist — the
   * object that should have contained the key — which is a justified place to
   * report a *missing* token.
   */
  | { readonly status: "container"; readonly range: SourceRange; readonly missingPath: string }
  /** The text or the theme half could not be understood. Do not underline anything. */
  | { readonly status: "unresolved" };

/** The kind of a scanned node. */
type NodeKind = "object" | "array" | "string" | "number" | "literal";

/** One `key: value` pair of an object node. */
interface ObjectEntry {
  readonly key: string;
  readonly value: JsonNode;
}

/** A scanned value and its span. */
interface JsonNode {
  readonly kind: NodeKind;
  readonly start: number;
  readonly end: number;
  readonly entries?: readonly ObjectEntry[];
  readonly items?: readonly JsonNode[];
}

/** A cursor over the text. */
interface Cursor {
  index: number;
}

/** Whitespace, as JSON defines it. */
const WHITESPACE = new Set([" ", "\t", "\n", "\r"]);

/**
 * Skip insignificant whitespace.
 *
 * @param text - The source.
 * @param cursor - The cursor to advance.
 */
function skipWhitespace(text: string, cursor: Cursor): void {
  while (cursor.index < text.length && WHITESPACE.has(text.charAt(cursor.index))) {
    cursor.index += 1;
  }
}

/**
 * Read a string literal starting at the cursor's quote.
 *
 * Handles every JSON escape, so a `\"` inside a value cannot be mistaken for the
 * closing quote, and `\\` cannot escape the character after it twice.
 *
 * @param text - The source.
 * @param cursor - Positioned on the opening quote.
 * @returns The decoded value and its content span, or `null` when unterminated.
 */
function readString(text: string, cursor: Cursor): { value: string; start: number; end: number } | null {
  const quote = cursor.index;
  let index = quote + 1;
  let value = "";

  while (index < text.length) {
    const character = text.charAt(index);

    if (character === "\\") {
      const escape = text.charAt(index + 1);
      switch (escape) {
        case '"':
        case "\\":
        case "/":
          value += escape;
          index += 2;
          continue;
        case "b":
          value += "\b";
          index += 2;
          continue;
        case "f":
          value += "\f";
          index += 2;
          continue;
        case "n":
          value += "\n";
          index += 2;
          continue;
        case "r":
          value += "\r";
          index += 2;
          continue;
        case "t":
          value += "\t";
          index += 2;
          continue;
        case "u": {
          const hex = text.slice(index + 2, index + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) return null;
          value += String.fromCharCode(Number.parseInt(hex, 16));
          index += 6;
          continue;
        }
        default:
          return null;
      }
    }

    if (character === '"') {
      cursor.index = index + 1;
      // The span excludes the quotes: that is what a swatch edits.
      return { value, start: quote + 1, end: index };
    }

    value += character;
    index += 1;
  }

  return null;
}

/**
 * Read a number.
 *
 * @param text - The source.
 * @param cursor - Positioned on the first character.
 * @returns The node, or `null` when the text is not a number.
 */
function readNumber(text: string, cursor: Cursor): JsonNode | null {
  const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(cursor.index));
  if (match === null) return null;

  const start = cursor.index;
  cursor.index += match[0].length;
  return { kind: "number", start, end: cursor.index };
}

/**
 * Read one value.
 *
 * @param text - The source.
 * @param cursor - Positioned on the value's first character.
 * @returns The node, or `null` when the text is not a value.
 */
function readValue(text: string, cursor: Cursor): JsonNode | null {
  skipWhitespace(text, cursor);
  const character = text.charAt(cursor.index);

  if (character === "{") return readObject(text, cursor);
  if (character === "[") return readArray(text, cursor);

  if (character === '"') {
    const string = readString(text, cursor);
    return string === null ? null : { kind: "string", start: string.start, end: string.end };
  }

  for (const literal of ["true", "false", "null"]) {
    if (text.startsWith(literal, cursor.index)) {
      const start = cursor.index;
      cursor.index += literal.length;
      return { kind: "literal", start, end: cursor.index };
    }
  }

  return readNumber(text, cursor);
}

/**
 * Read an object.
 *
 * @param text - The source.
 * @param cursor - Positioned on `{`.
 * @returns The node, or `null` when malformed.
 */
function readObject(text: string, cursor: Cursor): JsonNode | null {
  const start = cursor.index;
  cursor.index += 1;

  const entries: ObjectEntry[] = [];

  skipWhitespace(text, cursor);
  if (text.charAt(cursor.index) === "}") {
    cursor.index += 1;
    return { kind: "object", start, end: cursor.index, entries };
  }

  for (;;) {
    // A key is mandatory here: this is also what rejects a trailing comma.
    if (text.charAt(cursor.index) !== '"') return null;
    const key = readString(text, cursor);
    if (key === null) return null;

    skipWhitespace(text, cursor);
    if (text.charAt(cursor.index) !== ":") return null;
    cursor.index += 1;

    const value = readValue(text, cursor);
    if (value === null) return null;
    entries.push({ key: key.value, value });

    skipWhitespace(text, cursor);
    const separator = text.charAt(cursor.index);
    if (separator === ",") {
      cursor.index += 1;
      skipWhitespace(text, cursor);
      continue;
    }
    if (separator === "}") {
      cursor.index += 1;
      return { kind: "object", start, end: cursor.index, entries };
    }
    return null;
  }
}

/**
 * Read an array.
 *
 * @param text - The source.
 * @param cursor - Positioned on `[`.
 * @returns The node, or `null` when malformed.
 */
function readArray(text: string, cursor: Cursor): JsonNode | null {
  const start = cursor.index;
  cursor.index += 1;

  const items: JsonNode[] = [];

  skipWhitespace(text, cursor);
  if (text.charAt(cursor.index) === "]") {
    cursor.index += 1;
    return { kind: "array", start, end: cursor.index, items };
  }

  for (;;) {
    const value = readValue(text, cursor);
    if (value === null) return null;
    items.push(value);

    skipWhitespace(text, cursor);
    const separator = text.charAt(cursor.index);
    if (separator === ",") {
      cursor.index += 1;
      continue;
    }
    if (separator === "]") {
      cursor.index += 1;
      return { kind: "array", start, end: cursor.index, items };
    }
    return null;
  }
}

/**
 * Find an entry by key, matching `JSON.parse`'s last-one-wins behaviour.
 *
 * @param node - The object node.
 * @param key - The key to find.
 * @returns The winning entry, or `undefined`.
 */
function findEntry(node: JsonNode, key: string): ObjectEntry | undefined {
  const entries = node.entries;
  if (entries === undefined) return undefined;

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry !== undefined && entry.key === key) return entry;
  }

  return undefined;
}

/** A scanned document, ready for repeated lookups. */
export interface ThemeDocumentIndex {
  /**
   * Locate a path inside one theme.
   *
   * @param segments - The dot-path, split, e.g. `["colors", "primary"]`.
   * @param half - Which theme of the document.
   * @returns The location, or `unresolved`.
   */
  locate(segments: readonly string[], half: ThemeHalf): Location;

  /**
   * The span of one theme within the document.
   *
   * Used to decide which half the cursor is inside — a pair has the same role
   * name in both, and showing the light value while the cursor is in the dark
   * theme would be worse than showing nothing.
   *
   * @param half - Which theme.
   * @returns The span, or `null` when the document has no such half.
   */
  halfRange(half: ThemeHalf): SourceRange | null;
}

/**
 * Index a document for lookups.
 *
 * Scanned once and reused, because a document produces many diagnostics and a
 * pair document produces them for two themes.
 *
 * @param text - Masked source from `parseThemeJson()`, not the raw file.
 * @returns The index, or `null` when the text cannot be scanned.
 */
export function indexThemeDocument(text: string): ThemeDocumentIndex | null {
  const cursor: Cursor = { index: 0 };
  const root = readValue(text, cursor);
  if (root === null) return null;

  return {
    locate(segments, half): Location {
      let current: JsonNode = root;

      if (half !== "single") {
        if (root.kind !== "object") return { status: "unresolved" };
        const halfEntry = findEntry(root, half);
        if (halfEntry === undefined) return { status: "unresolved" };
        current = halfEntry.value;
      }

      let node: JsonNode = current;

      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index] as string;

        if (node.kind === "object") {
          const entry = findEntry(node, segment);
          if (entry === undefined) {
            // The key is absent: report at the object that should have held it.
            return {
              status: "container",
              range: { start: node.start, end: node.end },
              missingPath: segments.slice(index).join("."),
            };
          }
          node = entry.value;
          continue;
        }

        if (node.kind === "array") {
          const position = Number(segment);
          const item = Number.isInteger(position) ? node.items?.[position] : undefined;
          if (item === undefined) {
            return {
              status: "container",
              range: { start: node.start, end: node.end },
              missingPath: segments.slice(index).join("."),
            };
          }
          node = item;
          continue;
        }

        // A scalar where an object was expected. The scalar *is* the problem —
        // report at it rather than at some unrelated property, and never lose the
        // diagnostic.
        return {
          status: "container",
          range: { start: node.start, end: node.end },
          missingPath: segments.slice(index).join("."),
        };
      }

      return { status: "value", range: { start: node.start, end: node.end } };
    },

    halfRange(half): SourceRange | null {
      if (half === "single") return { start: root.start, end: root.end };
      if (root.kind !== "object") return null;

      const entry = findEntry(root, half);
      return entry === undefined ? null : { start: entry.value.start, end: entry.value.end };
    },
  };
}

/**
 * Split a dot-path into segments.
 *
 * @param path - e.g. `"colors.primary"`.
 * @returns The segments.
 */
export function splitPath(path: string): string[] {
  return path.split(".").filter((segment) => segment.length > 0);
}
