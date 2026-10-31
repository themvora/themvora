/**
 * A bounded markup tag reader for framework templates and HTML.
 *
 * It reads **tags and attributes**, not JavaScript. Script and style content
 * are skipped by range, and a tag is only reported when the caller asks for its
 * name. That is what keeps `<ThemeProvider>` in a template from becoming a
 * theme definition and keeps a `<script>` string from becoming a consumer.
 *
 * The reader understands the attribute shapes the supported frameworks use:
 * quoted Vue props (`:themes="themes"`), braced Svelte/Astro expressions
 * (`themes={themes}`), HTML strings, boolean attributes and spreads.
 *
 * @packageDocumentation
 */

/** One attribute on a tag. */
export interface MarkupAttribute {
  readonly name: string;
  /** How the value was written. */
  readonly kind: "quoted" | "braced" | "unquoted" | "boolean";
  /** Raw value: without quotes, or the inner expression for `{…}`. */
  readonly value?: string;
  /** Offset of the value content in the original text. */
  readonly valueStart?: number;
  /** A `{...props}` / spread attribute. */
  readonly spread?: boolean;
}

/** One tag, with its attributes. */
export interface MarkupTag {
  readonly name: string;
  /** Offset of `<`. */
  readonly start: number;
  /** Offset of the first character of the tag name. */
  readonly nameStart: number;
  /** Offset after `>`. */
  readonly end: number;
  readonly attributes: ReadonlyMap<string, MarkupAttribute>;
  /** A spread attribute may supply props this reader cannot see. */
  readonly hasSpread: boolean;
}

/** Options for {@link readMarkupTags}. */
export interface MarkupOptions {
  /** Ranges to skip, such as script and style contents. */
  readonly skip?: readonly { readonly start: number; readonly end: number }[];
  /** Only return tags whose name is in this list (case-insensitive). */
  readonly tags?: readonly string[];
}

/**
 * Whether an offset falls inside a skipped range.
 *
 * @param index - The offset.
 * @param ranges - The ranges.
 * @returns The end of the containing range, or undefined.
 */
function skipEndAt(
  index: number,
  ranges: readonly { readonly start: number; readonly end: number }[],
): number | undefined {
  for (const range of ranges) {
    if (index >= range.start && index < range.end) return range.end;
  }
  return undefined;
}

/**
 * Read a `{…}` expression, respecting strings and nested braces.
 *
 * @param text - The original text.
 * @param open - The offset of `{`.
 * @returns The inner start/end, or undefined when unbalanced.
 */
function readBraces(
  text: string,
  open: number,
): { readonly start: number; readonly end: number } | undefined {
  let depth = 0;
  let index = open;

  while (index < text.length) {
    const character = text[index];

    if (character === '"' || character === "'" || character === "`") {
      const quote = character;
      index += 1;
      while (index < text.length) {
        if (text[index] === "\\") {
          index += 2;
          continue;
        }
        if (text[index] === quote) break;
        index += 1;
      }
      index += 1;
      continue;
    }

    if (character === "{") {
      depth += 1;
      index += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;
      if (depth === 0) return { start: open + 1, end: index };
      index += 1;
      continue;
    }

    index += 1;
  }

  return undefined;
}

/**
 * Find the `>` that closes an opening tag.
 *
 * @param text - The original text.
 * @param from - The offset after the tag name.
 * @returns The index of `>`, or -1.
 */
function findTagEnd(text: string, from: number): number {
  let index = from;

  while (index < text.length) {
    const character = text[index];

    if (character === '"' || character === "'") {
      const quote = character;
      index += 1;
      while (index < text.length && text[index] !== quote) {
        if (text[index] === "\\") index += 1;
        index += 1;
      }
      index += 1;
      continue;
    }

    if (character === "{") {
      const span = readBraces(text, index);
      if (span === undefined) return -1;
      index = span.end + 1;
      continue;
    }

    if (character === ">") return index;
    index += 1;
  }

  return -1;
}

/**
 * Parse the attributes between a tag name and its closing `>`.
 *
 * @param text - The original text.
 * @param from - The offset after the tag name.
 * @param to - The offset of `>`.
 * @returns The attributes and whether a spread was seen.
 */
function readAttributes(
  text: string,
  from: number,
  to: number,
): { attributes: Map<string, MarkupAttribute>; hasSpread: boolean } {
  const attributes = new Map<string, MarkupAttribute>();
  let hasSpread = false;
  let index = from;

  while (index < to) {
    const character = text[index];

    if (character === undefined) break;
    if (/\s/u.test(character) || character === "/") {
      index += 1;
      continue;
    }

    // `{themes}` shorthand or `{...props}` spread.
    if (character === "{") {
      const span = readBraces(text, index);
      if (span === undefined) break;

      const inner = text.slice(span.start, span.end).trim();
      if (inner.startsWith("...")) {
        hasSpread = true;
      } else if (/^[A-Za-z_$][\w$]*$/u.test(inner)) {
        if (!attributes.has(inner)) {
          const raw = text.slice(span.start, span.end);
          const offset = raw.indexOf(inner);
          attributes.set(inner, {
            name: inner,
            kind: "braced",
            value: inner,
            valueStart: span.start + (offset >= 0 ? offset : 0),
          });
        }
      } else {
        hasSpread = true;
      }

      index = span.end + 1;
      continue;
    }

    // Attribute name; `:`/`@`/`.` are legal in framework syntax.
    const nameStart = index;
    while (index < to && !/[\s=/>]/u.test(text[index] ?? "")) index += 1;
    const name = text.slice(nameStart, index);
    if (name === "") {
      index += 1;
      continue;
    }

    while (index < to && /\s/u.test(text[index] ?? "")) index += 1;

    if (text[index] !== "=") {
      if (!attributes.has(name)) attributes.set(name, { name, kind: "boolean" });
      continue;
    }

    index += 1;
    while (index < to && /\s/u.test(text[index] ?? "")) index += 1;

    const valueStart = index;

    if (text[index] === '"' || text[index] === "'") {
      const quote = text[index];
      index += 1;
      const contentStart = index;
      while (index < to && text[index] !== quote) {
        if (text[index] === "\\") index += 1;
        index += 1;
      }
      if (!attributes.has(name)) {
        attributes.set(name, {
          name,
          kind: "quoted",
          value: text.slice(contentStart, index),
          valueStart: contentStart,
        });
      }
      index += 1;
      continue;
    }

    if (text[index] === "{") {
      const span = readBraces(text, index);
      if (span === undefined) break;
      if (!attributes.has(name)) {
        attributes.set(name, {
          name,
          kind: "braced",
          value: text.slice(span.start, span.end),
          valueStart: span.start,
        });
      }
      index = span.end + 1;
      continue;
    }

    while (index < to && !/[\s>]/u.test(text[index] ?? "")) index += 1;
    if (!attributes.has(name)) {
      attributes.set(name, {
        name,
        kind: "unquoted",
        value: text.slice(valueStart, index),
        valueStart,
      });
    }
  }

  return { attributes, hasSpread };
}

/**
 * Read the tags a caller asked for.
 *
 * @param text - The original text.
 * @param options - Skip ranges and the tag names to return.
 * @returns The tags, in source order.
 */
export function readMarkupTags(text: string, options: MarkupOptions = {}): MarkupTag[] {
  const skip = options.skip ?? [];
  const wanted = options.tags === undefined
    ? undefined
    : new Set(options.tags.map((tag) => tag.toLowerCase()));
  const tags: MarkupTag[] = [];
  let index = 0;

  while (index < text.length) {
    const skipped = skipEndAt(index, skip);
    if (skipped !== undefined) {
      index = skipped;
      continue;
    }

    if (text[index] !== "<") {
      index += 1;
      continue;
    }

    if (text.startsWith("<!--", index)) {
      const end = text.indexOf("-->", index + 4);
      index = end === -1 ? text.length : end + 3;
      continue;
    }

    if (text.startsWith("</", index) || text.startsWith("<!", index) || text.startsWith("<?", index)) {
      const end = findTagEnd(text, index + 2);
      index = end === -1 ? text.length : end + 1;
      continue;
    }

    const nameMatch = /^[A-Za-z][\w:.-]*/u.exec(text.slice(index + 1, index + 80));
    if (nameMatch === null) {
      index += 1;
      continue;
    }

    const name = nameMatch[0];
    const nameStart = index + 1;
    const end = findTagEnd(text, nameStart + name.length);
    if (end === -1) break;

    const wantedTag = wanted === undefined || wanted.has(name.toLowerCase());

    if (wantedTag) {
      const parsed = readAttributes(text, nameStart + name.length, end);
      tags.push({
        name,
        start: index,
        nameStart,
        end: end + 1,
        attributes: parsed.attributes,
        hasSpread: parsed.hasSpread,
      });
    }

    index = end + 1;
  }

  return tags;
}
