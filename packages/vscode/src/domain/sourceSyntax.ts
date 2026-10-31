/**
 * The small, safe slice of JavaScript syntax this extension reads.
 *
 * Two analyzers need the same primitives: the import graph and the consumer
 * recognizer. Both must look at code without being fooled by comments, strings
 * or object-literal property order, and both must never evaluate anything. This
 * module is that shared floor — masking, balanced spans, top-level splitting,
 * and object/JSX property lookup — so neither analyzer grows a second scanner.
 *
 * Every span is an offset range into the **original** source unless the
 * function takes the masked text explicitly. Masking replaces comment and
 * string bodies with spaces and preserves offsets, so a span found in the mask
 * points at the same characters in the source.
 *
 * @packageDocumentation
 */

/** A half-open offset range. */
export interface Span {
  readonly start: number;
  /** Exclusive. */
  readonly end: number;
}

/** What an object or JSX tag says about one property. */
export type PropertyRead =
  /** The property has a static value expression. */
  | { readonly kind: "value"; readonly expression: Span }
  /** The property is shorthand, as in `{ themes }`. */
  | { readonly kind: "shorthand"; readonly expression: Span }
  /** A spread or computed key may supply it; the value is not statically known. */
  | { readonly kind: "dynamic"; readonly expression?: Span }
  /** It is not present. */
  | { readonly kind: "absent" };

/**
 * Replace comment and string bodies with spaces, keeping every offset.
 *
 * Quotes are kept so a specifier or literal can be read from the original text
 * at the same index. Template interpolation is masked with the rest of the
 * template: this layer does not evaluate it.
 *
 * @param source - The source text.
 * @returns A same-length string where trivia is blank.
 */
export function maskSource(source: string): string {
  const characters = source.split("");
  const length = characters.length;
  let index = 0;

  while (index < length) {
    const character = characters[index];
    const next = characters[index + 1];

    if (character === "/" && next === "/") {
      let end = index;
      while (end < length && characters[end] !== "\n") {
        characters[end] = " ";
        end += 1;
      }
      index = end;
      continue;
    }

    if (character === "/" && next === "*") {
      let end = index;
      characters[end] = " ";
      characters[end + 1] = " ";
      end += 2;

      while (end < length && !(characters[end] === "*" && characters[end + 1] === "/")) {
        if (characters[end] !== "\n") characters[end] = " ";
        end += 1;
      }

      if (end < length) {
        characters[end] = " ";
        characters[end + 1] = " ";
        end += 2;
      }

      index = end;
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      const quote = character;
      let end = index + 1;

      while (end < length) {
        if (characters[end] === "\\") {
          characters[end] = " ";
          if (end + 1 < length) characters[end + 1] = " ";
          end += 2;
          continue;
        }
        if (characters[end] === quote) break;
        if (characters[end] !== "\n") characters[end] = " ";
        end += 1;
      }

      index = end + 1;
      continue;
    }

    index += 1;
  }

  return characters.join("");
}

/**
 * Skip whitespace in masked source.
 *
 * @param masked - The masked text.
 * @param index - Where to start.
 * @returns The next non-space index.
 */
export function skipSpace(masked: string, index: number): number {
  let cursor = index;
  while (cursor < masked.length && /\s/u.test(masked[cursor] ?? "")) cursor += 1;
  return cursor;
}

/**
 * Read a quoted string from the original source.
 *
 * @param source - The original text.
 * @param masked - The masked text; only its quote position is used.
 * @param index - The index of the opening quote.
 * @returns The decoded value and the index after the closing quote.
 */
export function readStringLiteral(
  source: string,
  masked: string,
  index: number,
): { readonly value: string; readonly end: number } | undefined {
  const quote = masked[index];
  if (quote !== '"' && quote !== "'" && quote !== "`") return undefined;

  let cursor = index + 1;
  while (cursor < source.length) {
    if (source[cursor] === "\\") {
      cursor += 2;
      continue;
    }
    if (source[cursor] === quote) {
      return { value: source.slice(index + 1, cursor), end: cursor + 1 };
    }
    cursor += 1;
  }

  return undefined;
}

/**
 * Find the matching close for a bracket, respecting nesting.
 *
 * @param masked - The masked text.
 * @param openIndex - The index of `(`, `[` or `{`.
 * @returns The span including both delimiters, or undefined when unbalanced.
 */
export function readBalanced(masked: string, openIndex: number): Span | undefined {
  const opening = masked[openIndex];
  if (opening !== "(" && opening !== "[" && opening !== "{") return undefined;

  const expected: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const stack: string[] = [];

  for (let index = openIndex; index < masked.length; index += 1) {
    const character = masked[index];

    if (character !== undefined && expected[character] !== undefined) {
      stack.push(expected[character]!);
      continue;
    }

    if (character === ")" || character === "]" || character === "}") {
      if (stack.at(-1) !== character) return undefined;
      stack.pop();
      if (stack.length === 0) return { start: openIndex, end: index + 1 };
    }
  }

  return undefined;
}

/**
 * Trim whitespace from both ends of a span.
 *
 * @param masked - The masked text.
 * @param span - The span to trim.
 * @returns The trimmed span.
 */
export function trimSpan(masked: string, span: Span): Span {
  let start = span.start;
  let end = span.end;

  while (start < end && /\s/u.test(masked[start] ?? "")) start += 1;
  while (end > start && /\s/u.test(masked[end - 1] ?? "")) end -= 1;

  return { start, end };
}

/**
 * Split the inside of a bracket span on top-level commas.
 *
 * @param masked - The masked text.
 * @param span - A span including its brackets.
 * @returns The content spans, trimmed and without empty entries.
 */
export function splitTopLevel(masked: string, span: Span): Span[] {
  const parts: Span[] = [];
  const start = span.start + 1;
  const end = span.end - 1;

  let depth = 0;
  let partStart = start;

  for (let index = start; index < end; index += 1) {
    const character = masked[index];

    if (character === "(" || character === "[" || character === "{") depth += 1;
    else if (character === ")" || character === "]" || character === "}") depth -= 1;
    else if (character === "," && depth === 0) {
      const part = trimSpan(masked, { start: partStart, end: index });
      if (part.end > part.start) parts.push(part);
      partStart = index + 1;
    }
  }

  const last = trimSpan(masked, { start: partStart, end });
  if (last.end > last.start) parts.push(last);

  return parts;
}

/**
 * Read a property from an object literal.
 *
 * @param masked - The masked source.
 * @param objectSpan - The span of the object, including braces.
 * @param name - The property name to find.
 * @returns Its static value, shorthand, dynamic state, or absence.
 */
export function readObjectProperty(
  masked: string,
  objectSpan: Span,
  name: string,
): PropertyRead {
  if (masked[objectSpan.start] !== "{") return { kind: "dynamic" };

  let dynamic: Span | undefined;

  for (const part of splitTopLevel(masked, objectSpan)) {
    const text = masked.slice(part.start, part.end);

    if (text.startsWith("...")) {
      dynamic = part;
      continue;
    }

    const colon = topLevelColon(masked, part);
    if (colon === -1) {
      if (text.trim() === name) return { kind: "shorthand", expression: part };
      continue;
    }

    const key = masked.slice(part.start, colon).trim();
    if (key === name) {
      return {
        kind: "value",
        expression: trimSpan(masked, { start: colon + 1, end: part.end }),
      };
    }

    // `[computed]: …` could be this property under another spelling.
    if (key.startsWith("[") || key.startsWith("...")) dynamic = part;
  }

  return dynamic === undefined ? { kind: "absent" } : { kind: "dynamic", expression: dynamic };
}

/**
 * Find a top-level colon inside one property span.
 *
 * @param masked - The masked source.
 * @param span - The property span.
 * @returns The index, or -1.
 */
function topLevelColon(masked: string, span: Span): number {
  let depth = 0;

  for (let index = span.start; index < span.end; index += 1) {
    const character = masked[index];
    if (character === "(" || character === "[" || character === "{") depth += 1;
    else if (character === ")" || character === "]" || character === "}") depth -= 1;
    else if (character === ":" && depth === 0) return index;
  }

  return -1;
}

/**
 * Read the attributes of a JSX opening tag.
 *
 * Only the opening tag is scanned; children are outside it. A spread attribute
 * is remembered because it may carry the property under analysis.
 *
 * @param masked - The masked source.
 * @param afterName - The index just after the element or component name.
 * @param tagEnd - The index of the closing `>`.
 * @param name - The attribute name to find.
 * @returns Its static value, shorthand, dynamic state, or absence.
 */
export function readJsxAttribute(
  masked: string,
  afterName: number,
  tagEnd: number,
  name: string,
): PropertyRead {
  let dynamic: Span | undefined;
  let index = skipSpace(masked, afterName);

  while (index < tagEnd) {
    const character = masked[index];

    if (character === "/" || character === ">") {
      index += 1;
      continue;
    }

    // `{...props}`
    if (character === "{") {
      const span = readBalanced(masked, index);
      if (span === undefined) break;
      dynamic = span;
      index = span.end;
      continue;
    }

    const nameStart = index;
    while (index < tagEnd && /[\w$:-]/u.test(masked[index] ?? "")) index += 1;
    const attribute = masked.slice(nameStart, index);
    if (attribute === "") {
      index += 1;
      continue;
    }

    index = skipSpace(masked, index);

    if (masked[index] !== "=") {
      if (attribute === name) return { kind: "shorthand", expression: { start: nameStart, end: index } };
      continue;
    }

    index = skipSpace(masked, index + 1);
    const valueStart = index;

    if (masked[index] === "{") {
      const span = readBalanced(masked, index);
      if (span === undefined) break;
      if (attribute === name) {
        return {
          kind: "value",
          expression: trimSpan(masked, { start: span.start + 1, end: span.end - 1 }),
        };
      }
      index = span.end;
      continue;
    }

    if (masked[index] === '"' || masked[index] === "'") {
      while (index < tagEnd && masked[index] !== (masked[valueStart] ?? "")) index += 1;
      index += 1;
      if (attribute === name) return { kind: "dynamic", expression: { start: valueStart, end: index } };
      continue;
    }

    while (index < tagEnd && !/\s/u.test(masked[index] ?? "")) index += 1;
    if (attribute === name) return { kind: "dynamic", expression: { start: valueStart, end: index } };
  }

  return dynamic === undefined ? { kind: "absent" } : { kind: "dynamic", expression: dynamic };
}

/**
 * Convert a source offset to a 1-based line and column.
 *
 * @param source - The whole source.
 * @param offset - The offset.
 * @returns The position.
 */
export function positionOf(source: string, offset: number): { line: number; column: number } {
  const before = source.slice(0, Math.max(0, offset));
  const lines = before.split("\n");
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

/**
 * Whether an index is where a statement may begin.
 *
 * JSX text is not a string, so a keyword in prose would otherwise look like a
 * declaration. A real statement starts a line or follows a semicolon.
 *
 * @param masked - The masked text.
 * @param index - The keyword's index.
 * @returns `true` at a plausible statement boundary.
 */
export function atStatementStart(masked: string, index: number): boolean {
  const lineStart = masked.lastIndexOf("\n", index - 1) + 1;
  const prefix = masked.slice(lineStart, index).trim();
  return prefix === "" || prefix.endsWith(";");
}
