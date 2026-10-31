/**
 * Reading a theme document that may contain comments.
 *
 * Theme files are hand-authored, so people comment them. `JSON.parse` rejects
 * that, and a second parser in the extension would eventually disagree with the
 * CLI about what a comment is — so tolerance lives here, once, and both the CLI
 * and the editor use it.
 *
 * ## Mask, do not strip
 *
 * Comments and trailing commas are replaced with **spaces of the same length**
 * rather than removed. Removing them would shift every offset after the first
 * one, and the editor locates tokens by character offset — a diagnostic or a
 * colour swatch would land on the wrong text.
 *
 * Two consequences are load-bearing:
 *
 * - **`source` has the same length as the input, always.** Line terminators are
 *   preserved even inside a block comment, so line and column numbers stay
 *   correct for a CRLF document.
 * - **`JSON.parse` still does the parsing.** Escapes, numbers and duplicate keys
 *   behave exactly as they always have; the masker only ever writes spaces.
 *
 * @packageDocumentation
 */

/** A parsed theme document. */
export interface ParsedThemeJson {
  /** The parsed value. */
  readonly value: unknown;
  /**
   * The input with comments and trailing commas blanked out.
   *
   * Same length as the input, so an offset into this string is an offset into the
   * original. Consumers that need positions scan this rather than re-parsing.
   */
  readonly source: string;
}

/**
 * Whether a character ends a line.
 *
 * @param character - The character to test.
 * @returns `true` for `\n` and `\r`.
 */
function isLineTerminator(character: string): boolean {
  return character === "\n" || character === "\r";
}

/**
 * Blank every comment, preserving length and line terminators.
 *
 * String state is tracked, so `//` inside a value survives untouched and an
 * escaped quote does not end the string early.
 *
 * @param text - The input.
 * @returns The same text with comment characters replaced by spaces.
 */
function maskComments(text: string): string {
  const out = text.split("");
  let inString = false;
  let escaped = false;
  let index = 0;

  while (index < text.length) {
    const character = text.charAt(index);

    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      index += 1;
      continue;
    }

    if (character === '"') {
      inString = true;
      index += 1;
      continue;
    }

    if (character === "/" && text.charAt(index + 1) === "/") {
      while (index < text.length && !isLineTerminator(text.charAt(index))) {
        out[index] = " ";
        index += 1;
      }
      continue;
    }

    if (character === "/" && text.charAt(index + 1) === "*") {
      out[index] = " ";
      out[index + 1] = " ";
      index += 2;

      while (index < text.length) {
        if (text.charAt(index) === "*" && text.charAt(index + 1) === "/") {
          out[index] = " ";
          out[index + 1] = " ";
          index += 2;
          break;
        }
        // Line terminators survive, so positions and line numbers hold.
        if (!isLineTerminator(text.charAt(index))) out[index] = " ";
        index += 1;
      }
      continue;
    }

    index += 1;
  }

  return out.join("");
}

/**
 * Blank a comma that is followed only by whitespace and a closing bracket.
 *
 * Runs after comments are masked, so `, // note\n}` is already `,        \n}`.
 *
 * @param text - Comment-masked text.
 * @returns The same text with trailing commas replaced by spaces.
 */
function maskTrailingCommas(text: string): string {
  const out = text.split("");
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text.charAt(index);

    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character !== ",") continue;

    let ahead = index + 1;
    while (ahead < text.length && /\s/.test(text.charAt(ahead))) ahead += 1;

    const next = text.charAt(ahead);
    if (next === "}" || next === "]") out[index] = " ";
  }

  return out.join("");
}

/**
 * Parse a theme document, tolerating comments and trailing commas.
 *
 * @param text - The document's text.
 * @returns The parsed value and the masked source.
 * @throws {SyntaxError} When the document is not valid JSONC. `JSON.parse`'s
 *   message is propagated, so the caller can report the position it names.
 */
export function parseThemeJson(text: string): ParsedThemeJson {
  const source = maskTrailingCommas(maskComments(text));

  if (source.length !== text.length) {
    // The masker only ever writes spaces over existing characters, so this cannot
    // happen. Asserted because a silent length change would corrupt every offset
    // a consumer derives from `source`.
    throw new Error("parseThemeJson: masked source changed length");
  }

  return { value: JSON.parse(source), source };
}
