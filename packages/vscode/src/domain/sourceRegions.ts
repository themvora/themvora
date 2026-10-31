/**
 * The small source-region abstraction behind framework support.
 *
 * A `.vue`, `.svelte` or `.astro` file is not JavaScript. Only its script
 * region (or Astro frontmatter) may be handed to the JavaScript analyzers, and
 * the template must never be parsed as code. This module produces one
 * normalized view of a file:
 *
 * - `masked` keeps the analyzable script text and blanks everything else,
 *   preserving every offset and newline;
 * - `regions` records what each analyzable block is and where it lives;
 * - the original `text` is retained for the markup recognizers.
 *
 * Because the mask is the same length as the file, every offset and line/column
 * the existing readers produce still points into the original file. There is no
 * virtual `.ts` path and no second engine.
 *
 * @packageDocumentation
 */

import { positionOf } from "./sourceSyntax.js";

/** The file kinds this reader understands. */
export type SourceFormat = "js" | "vue" | "svelte" | "astro" | "html";

/** What an analyzable region is. */
export type RegionKind =
  | "script"
  | "script-setup"
  | "module"
  | "frontmatter"
  | "template"
  | "markup"
  | "element";

/** One analyzable block. Offsets index the original file. */
export interface SourceRegion {
  readonly kind: RegionKind;
  /** A label for the Studio, e.g. `<script setup>`. */
  readonly label: string;
  /** Content start, exclusive of the opening tag. */
  readonly start: number;
  /** Content end, exclusive of the closing tag. */
  readonly end: number;
}

/** One file, normalized for analysis. */
export interface SourceDocument {
  /** Workspace-relative path. */
  readonly path: string;
  /** The original text. */
  readonly text: string;
  /** Same length as `text`; script/frontmatter preserved, everything else blank. */
  readonly masked: string;
  readonly format: SourceFormat;
  readonly regions: readonly SourceRegion[];
}

/**
 * The format from a file extension.
 *
 * @param path - A workspace-relative path.
 * @returns The format.
 */
export function sourceFormatOf(path: string): SourceFormat {
  const lower = path.toLowerCase();
  if (lower.endsWith(".vue")) return "vue";
  if (lower.endsWith(".svelte")) return "svelte";
  if (lower.endsWith(".astro")) return "astro";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  return "js";
}

/**
 * Find `<script>` blocks in a component file.
 *
 * The canonical examples use a top-level `<script>`; `</script>` inside a
 * string is pathological and would break any regex-based block reader. The
 * scanner is bounded to the script tags themselves, not the template.
 *
 * @param text - The original text.
 * @returns Script content regions.
 */
function scriptRegions(text: string): SourceRegion[] {
  const regions: SourceRegion[] = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/giu;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const attributes = match[1] ?? "";
    const content = match[2] ?? "";
    const start = (match.index ?? 0) + match[0].indexOf(">") + 1;
    const isSetup = /(?:^|\s)setup(?:\s|=|$)/u.test(attributes);
    const isModule = /(?:context\s*=\s*["']module["']|\bmodule\b)/u.test(attributes);

    regions.push({
      kind: isSetup ? "script-setup" : isModule ? "module" : "script",
      label: isSetup ? "<script setup>" : isModule ? "<script module>" : "<script>",
      start,
      end: start + content.length,
    });
  }

  return regions;
}

/**
 * Find `<style>` blocks, which markup scanning must ignore.
 *
 * @param text - The original text.
 * @returns Their content ranges.
 */
export function styleRanges(text: string): { readonly start: number; readonly end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const pattern = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/giu;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const content = match[1] ?? "";
    const start = (match.index ?? 0) + match[0].indexOf(">") + 1;
    ranges.push({ start, end: start + content.length });
  }

  return ranges;
}

/**
 * Find Astro's frontmatter block.
 *
 * @param text - The original text.
 * @returns The frontmatter content region, when the file starts with one.
 */
function frontmatterRegion(text: string): SourceRegion | undefined {
  const match = /^(?:\uFEFF)?[ \t]*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/u.exec(text);
  if (match === null) return undefined;

  const body = match[1] ?? "";
  const start = (match.index ?? 0) + match[0].indexOf("\n") + 1;
  return { kind: "frontmatter", label: "frontmatter", start, end: start + body.length };
}

/**
 * Blank everything outside the given regions, preserving offsets and newlines.
 *
 * @param text - The original text.
 * @param regions - The ranges to keep.
 * @returns The masked text.
 */
export function maskToRegions(
  text: string,
  regions: readonly { readonly start: number; readonly end: number }[],
): string {
  const characters = text.split("");
  const keep = new Array<boolean>(characters.length).fill(false);

  for (const region of regions) {
    for (let index = Math.max(0, region.start); index < Math.min(characters.length, region.end); index += 1) {
      keep[index] = true;
    }
  }

  for (let index = 0; index < characters.length; index += 1) {
    if (!keep[index] && characters[index] !== "\n") characters[index] = " ";
  }

  return characters.join("");
}

/**
 * Normalize one source file.
 *
 * @param path - The workspace-relative path.
 * @param text - The file's text.
 * @returns The normalized document.
 */
export function readSourceDocument(path: string, text: string): SourceDocument {
  const format = sourceFormatOf(path);

  if (format === "js") {
    return { path, text, masked: text, format, regions: [] };
  }

  if (format === "html") {
    // HTML has no JavaScript region this stage analyzes. The markup recognizer
    // reads the original text; the mask is never handed to the JS readers.
    return { path, text, masked: text, format, regions: [] };
  }

  const frontmatter = format === "astro" ? frontmatterRegion(text) : undefined;
  const regions = frontmatter === undefined
    ? scriptRegions(text)
    : [frontmatter, ...scriptRegions(text)];

  return {
    path,
    text,
    masked: maskToRegions(text, regions),
    format,
    regions,
  };
}

/**
 * A label for the file's analyzable region(s), for the Studio.
 *
 * @param document - The normalized file.
 * @returns E.g. `<script setup>`, `frontmatter`, or undefined for plain JS.
 */
export function regionLabelOf(document: SourceDocument): string | undefined {
  const labels = [...new Set(document.regions.map((region) => region.label))];
  return labels.length === 0 ? undefined : labels.join(" + ");
}

/**
 * The analyzable region that contains a 1-based line.
 *
 * @param document - The normalized file.
 * @param line - A 1-based line number.
 * @returns Its label, or undefined.
 */
export function regionAtLine(document: SourceDocument, line: number): string | undefined {
  for (const region of document.regions) {
    const start = positionOf(document.text, region.start).line;
    const end = positionOf(document.text, region.end).line;

    if (line >= start && line <= end) return region.label;
  }

  return undefined;
}

/**
 * Ranges the markup scanner must skip: script/frontmatter content and styles.
 *
 * @param document - The normalized file.
 * @returns The ranges.
 */
export function markupSkipRanges(document: SourceDocument): { readonly start: number; readonly end: number }[] {
  const blocks = document.format === "html" ? scriptRegions(document.text) : document.regions;

  return [
    ...blocks.map((region) => ({ start: region.start, end: region.end })),
    ...styleRanges(document.text),
  ];
}
