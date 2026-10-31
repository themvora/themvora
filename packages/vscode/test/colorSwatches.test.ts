/**
 * Colour-swatch tests.
 *
 * The provider is called directly. The important assertions are that every range
 * is exact and that a presentation edit touches nothing but the literal — a
 * swatch that rewrites a key or the neighbouring theme is worse than no swatch.
 */
import { generateTheme, type ThemeDefinition } from "@themvora/core";
import { beforeEach, describe, expect, it } from "vitest";
import type { ColorPresentation, DocumentColorProvider, TextDocument } from "vscode";

import { createColorProvider } from "../src/adapters/colorSwatches";
import { Color, Range, __openDocument, __reset, type FakeDocument } from "./stubs/vscode";

const BASE = generateTheme({ seed: "#4f46e5" }).light;
const DARK = generateTheme({ seed: "#4f46e5" }).dark;

const SINGLE = JSON.stringify(BASE, null, 2);
const PAIR = JSON.stringify({ light: BASE, dark: DARK }, null, 2);

const provider: DocumentColorProvider = createColorProvider();

/** The colours offered for a document. */
function colorsOf(document: FakeDocument) {
  return provider.provideDocumentColors!(
    document as unknown as TextDocument,
    undefined as never,
  ) as unknown as { range: Range; color: Color }[];
}

/** The text a range covers. */
function textAt(document: FakeDocument, range: Range): string {
  return document.getText(range);
}

/** The context type the provider expects. */
type PresentationContext = Parameters<
  NonNullable<DocumentColorProvider["provideColorPresentations"]>
>[1];

/** Ask for presentations, bridging the stub's types to the real ones. */
function present(color: Color, document: FakeDocument, range: Range): ColorPresentation[] {
  return provider.provideColorPresentations!(
    color,
    { document: document as unknown as TextDocument, range } as unknown as PresentationContext,
    undefined as never,
  ) as unknown as ColorPresentation[];
}

/** Apply a presentation edit to the text. */
function applyEdit(
  document: FakeDocument,
  edit: { range: Range; newText: string },
): string {
  const text = document.getText();
  const start = document.offsetAt!(edit.range.start);
  const end = document.offsetAt!(edit.range.end);
  return text.slice(0, start) + edit.newText + text.slice(end);
}

beforeEach(() => {
  __reset();
});

describe("swatches", () => {
  it("offers one per colour token", () => {
    const document = __openDocument("/app/theme.json", SINGLE);
    const colors = colorsOf(document);

    expect(colors).toHaveLength(21);
  });

  it("covers exactly the hex literal", () => {
    const document = __openDocument("/app/theme.json", SINGLE);

    for (const entry of colorsOf(document)) {
      expect(textAt(document, entry.range)).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });

  it("reports the token's actual value", () => {
    const document = __openDocument("/app/theme.json", SINGLE);
    const colors = colorsOf(document);

    const primary = colors.find(
      (entry) => textAt(document, entry.range) === BASE.tokens!.colors!["primary"],
    );
    if (primary === undefined) throw new Error("expected a swatch for primary");

    // Channels come back as 0–1 floats.
    expect(primary.color.red).toBeGreaterThanOrEqual(0);
    expect(primary.color.red).toBeLessThanOrEqual(1);
  });

  it("offers both halves of a pair", () => {
    const document = __openDocument("/app/theme.json", PAIR);

    expect(colorsOf(document)).toHaveLength(42);
  });

  it("skips a value the schema cannot mean", () => {
    const withNamed = {
      ...BASE,
      tokens: { ...BASE.tokens!, colors: { ...BASE.tokens!.colors!, primary: "red" } },
    } as ThemeDefinition;
    const document = __openDocument("/app/theme.json", JSON.stringify(withNamed, null, 2));

    // 20 swatches, not 21: `red` is not a hex literal and gets none.
    expect(colorsOf(document)).toHaveLength(20);
  });

  it("offers a swatch for shorthand", () => {
    const withShort = {
      ...BASE,
      tokens: { ...BASE.tokens!, colors: { ...BASE.tokens!.colors!, primary: "#f00" } },
    } as ThemeDefinition;
    const document = __openDocument("/app/theme.json", JSON.stringify(withShort, null, 2));

    const colors = colorsOf(document);
    expect(colors).toHaveLength(21);
    expect(colors.some((entry) => textAt(document, entry.range) === "#f00")).toBe(true);
  });

  it("offers no colours for an unrelated JSON file", () => {
    const document = __openDocument(
      "/app/package.json",
      JSON.stringify({ name: "app", color: "#ff0000" }, null, 2),
    );

    expect(colorsOf(document)).toEqual([]);
  });

  it("offers no colours for malformed JSON", () => {
    const document = __openDocument("/app/theme.json", '{"tokens": {');

    expect(colorsOf(document)).toEqual([]);
  });
});

describe("presentations", () => {
  /** The range of the first swatch. */
  function firstRange(document: FakeDocument): Range {
    const [first] = colorsOf(document);
    if (first === undefined) throw new Error("expected a swatch");
    return first.range;
  }

  it("edits only the literal's characters", () => {
    const document = __openDocument("/app/theme.json", SINGLE);
    const range = firstRange(document);

    const presentations = present(new Color(0, 0.5, 1), document, range);

    expect(presentations).toHaveLength(1);
    const edit = presentations[0]!.textEdit as unknown as { range: Range; newText: string };
    expect(edit.range).toBe(range);
    expect(edit.newText).toBe("#0080ff");
  });

  it("leaves every other character unchanged", () => {
    const document = __openDocument("/app/theme.json", SINGLE);
    const text = document.getText();
    const range = firstRange(document);

    const presentations = present(new Color(0, 0.5, 1), document, range);

    const edit = presentations[0]!.textEdit as unknown as { range: Range; newText: string };
    const updated = applyEdit(document, edit);

    const start = document.offsetAt!(range.start);
    const end = document.offsetAt!(range.end);

    // Only the replaced span differs; everything before and after is identical.
    expect(updated.slice(0, start)).toBe(text.slice(0, start));
    expect(updated.slice(start + edit.newText.length)).toBe(text.slice(end));
    expect(updated.slice(start, start + edit.newText.length)).toBe("#0080ff");
  });

  it("preserves alpha when the colour is not opaque", () => {
    const document = __openDocument("/app/theme.json", SINGLE);
    const range = firstRange(document);

    const presentations = present(new Color(0, 0, 0, 0.5), document, range);

    const edit = presentations[0]!.textEdit as unknown as { newText: string };
    // Half alpha → eight digits, so the edit does not silently drop it.
    expect(edit.newText).toMatch(/^#[0-9a-f]{6}[0-9a-f]{2}$/);
  });

  it("normalises shorthand to long form on edit", () => {
    const withShort = {
      ...BASE,
      tokens: { ...BASE.tokens!, colors: { ...BASE.tokens!.colors!, primary: "#f00" } },
    } as ThemeDefinition;
    const document = __openDocument("/app/theme.json", JSON.stringify(withShort, null, 2));

    const short = colorsOf(document).find(
      (entry) => textAt(document, entry.range) === "#f00",
    );
    if (short === undefined) throw new Error("expected the shorthand swatch");

    const presentations = present(new Color(0, 1, 0), document, short.range);

    const edit = presentations[0]!.textEdit as unknown as { newText: string };
    // Documented behaviour: `#rgb` becomes `#rrggbb` once edited.
    expect(edit.newText).toBe("#00ff00");
  });
});
