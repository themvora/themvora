/**
 * JSONC parsing tests.
 *
 * The identity invariant is the one that matters most: for input that is already
 * valid JSON, masking must change nothing. If that holds, every consumer that
 * worked before still works, and JSONC is purely additive.
 */
import { generateTheme } from "../src";
import { parseThemeJson } from "../src/parse-theme-json";
import { describe, expect, it } from "vitest";

const PAIR = generateTheme({ seed: "#4f46e5" });
const PAIR_JSON = JSON.stringify({ light: PAIR.light, dark: PAIR.dark }, null, 2);

describe("plain JSON is untouched", () => {
  it("returns the source unchanged", () => {
    // The invariant: masking a valid document is a no-op.
    expect(parseThemeJson(PAIR_JSON).source).toBe(PAIR_JSON);
  });

  it("returns the same value as JSON.parse", () => {
    expect(parseThemeJson(PAIR_JSON).value).toEqual(JSON.parse(PAIR_JSON));
  });

  it.each([
    ["an empty object", "{}"],
    ["an array", '[1, 2, 3]'],
    ["a nested document", '{"a":{"b":[{"c":"d"}]}}'],
    ["a document with escapes", '{"a":"line\\nbreak \\"quoted\\" \\\\ done"}'],
    ["unicode escapes", '{"a":"\\u00e9"}'],
    ["duplicate keys", '{"a":1,"a":2}'],
    ["CRLF line endings", '{\r\n  "a": 1\r\n}'],
    ["no whitespace", '{"a":1,"b":2}'],
  ])("leaves %s alone", (_label, text) => {
    const parsed = parseThemeJson(text);
    expect(parsed.source).toBe(text);
    expect(parsed.value).toEqual(JSON.parse(text));
  });
});

describe("the length guarantee", () => {
  it.each([
    ["plain", '{"a":1}'],
    ["line comment", '{\n  // note\n  "a": 1\n}'],
    ["block comment", '{\n  /* note\n     over lines */\n  "a": 1\n}'],
    ["trailing comma", '{"a":1,}'],
    ["comments and commas", '{\n  // one\n  "a": 1, /* two */\n}'],
    ["CRLF with comments", '{\r\n  // note\r\n  "a": 1,\r\n}'],
    ["comments in strings", '{"a":"// not a comment","b":"/* nor this */"}'],
  ])("holds for %s", (_label, text) => {
    expect(parseThemeJson(text).source).toHaveLength(text.length);
  });

  it("preserves every line terminator, including inside block comments", () => {
    const text = '{\r\n  /* a\r\n     b */\r\n  "a": 1\r\n}';
    const { source } = parseThemeJson(text);

    const count = (input: string): number => (input.match(/\r\n/g) ?? []).length;
    expect(count(source)).toBe(count(text));
    expect(source.length).toBe(text.length);
  });
});

describe("comments", () => {
  it("accepts a line comment", () => {
    const text = '{\n  // the primary action colour\n  "primary": "#ff0000"\n}';
    expect(parseThemeJson(text).value).toEqual({ primary: "#ff0000" });
  });

  it("accepts a block comment", () => {
    const text = '{\n  /* one\n     two */\n  "primary": "#ff0000"\n}';
    expect(parseThemeJson(text).value).toEqual({ primary: "#ff0000" });
  });

  it("accepts a comment before the root value", () => {
    expect(parseThemeJson('// leading\n{"a":1}').value).toEqual({ a: 1 });
  });

  it("leaves comment-like text inside strings intact", () => {
    const text = '{"a":"// not a comment","b":"/* nor this */"}';
    expect(parseThemeJson(text).value).toEqual({ a: "// not a comment", b: "/* nor this */" });
  });

  it("does not end a string at an escaped quote", () => {
    // Without escape tracking, the `\"` would close the string and the `//` would
    // be treated as a comment, swallowing the rest of the line.
    const text = '{"a":"quote \\" then // text","b":2}';
    expect(parseThemeJson(text).value).toEqual({ a: 'quote " then // text', b: 2 });
  });
});

describe("trailing commas", () => {
  it("accepts one in an object", () => {
    expect(parseThemeJson('{"a":1,}').value).toEqual({ a: 1 });
  });

  it("accepts one in an array", () => {
    expect(parseThemeJson('{"a":[1,2,],}').value).toEqual({ a: [1, 2] });
  });

  it("accepts one followed by a comment", () => {
    const text = '{\n  "a": 1, // last\n}';
    expect(parseThemeJson(text).value).toEqual({ a: 1 });
  });

  it("does not remove a comma that separates values", () => {
    expect(parseThemeJson('{"a":1,"b":2}').value).toEqual({ a: 1, b: 2 });
  });
});

describe("genuinely invalid input still fails", () => {
  it("throws for an unterminated block comment", () => {
    expect(() => parseThemeJson('{"a": 1 /* unterminated')).toThrow();
  });

  it("throws for a document that is only a comment", () => {
    expect(() => parseThemeJson("// nothing here")).toThrow();
  });

  it("throws for a missing value", () => {
    expect(() => parseThemeJson('{"a":}')).toThrow();
  });

  it("throws for an unquoted key", () => {
    expect(() => parseThemeJson("{a: 1}")).toThrow();
  });
});

describe("a commented theme document", () => {
  it("parses to the same value as the comment-free equivalent", () => {
    const commented = `{
  // The light theme.
  "light": {
    "name": "brand-light",
    "tokens": {
      "colors": {
        "primary": "#4f46e5", // brand
      },
    },
  },
}`;

    const plain = JSON.stringify({
      light: { name: "brand-light", tokens: { colors: { primary: "#4f46e5" } } },
    });

    expect(parseThemeJson(commented).value).toEqual(JSON.parse(plain));
  });
});
