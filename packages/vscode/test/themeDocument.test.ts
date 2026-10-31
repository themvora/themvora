/**
 * Theme-document shape tests.
 *
 * Shape and validity are separate on purpose: this module answers "is this a
 * theme document at all", and `validateTheme()` answers "is this theme correct".
 * The tests below pin the boundary, including the case that used to be conflated
 * — a theme with no colour tokens is *recognised*, and then found invalid.
 */
import { generateTheme } from "@themvora/core";
import { describe, expect, it } from "vitest";

import { parseThemeDocument, shapeMessage } from "../src/domain/themeDocument";

const PAIR = generateTheme({ seed: "#4f46e5" });

describe("parseThemeDocument", () => {
  it("reads a light/dark pair", () => {
    const document = parseThemeDocument(JSON.stringify({ light: PAIR.light, dark: PAIR.dark }));

    expect(document.shape).toBe("themes");
    if (document.shape !== "themes") return;
    expect(document.themes.map((theme) => theme.name)).toEqual([
      "generated-light",
      "generated-dark",
    ]);
  });

  it("reads a single theme definition", () => {
    const document = parseThemeDocument(JSON.stringify(PAIR.light));

    expect(document.shape).toBe("themes");
    if (document.shape !== "themes") return;
    expect(document.themes).toHaveLength(1);
  });

  it("recognises a theme that is structurally a theme but has no colours", () => {
    // Recognised, so the caller can go on to validate it and report the real
    // problem. Reporting "not a theme" here would be the wrong answer.
    const document = parseThemeDocument(JSON.stringify({ name: "x", tokens: { colors: {} } }));
    expect(document.shape).toBe("themes");
  });

  it("rejects a half pair", () => {
    // `light` without `dark` is neither shape.
    const document = parseThemeDocument(JSON.stringify({ light: PAIR.light }));
    expect(document.shape).toBe("unknown");
  });

  it("rejects invalid JSON", () => {
    expect(parseThemeDocument("{ not json").shape).toBe("invalid-json");
    expect(parseThemeDocument("").shape).toBe("invalid-json");
  });

  it.each([["[]"], ["null"], ['"a string"'], ["42"], ['{"hello":"world"}']])(
    "rejects %s",
    (text) => {
      expect(parseThemeDocument(text).shape).toBe("unknown");
    },
  );
});

describe("shapeMessage", () => {
  it("is null for a readable document", () => {
    const document = parseThemeDocument(JSON.stringify({ light: PAIR.light, dark: PAIR.dark }));
    expect(shapeMessage("theme.json", document)).toBeNull();
  });

  it("names the file and the reason", () => {
    expect(shapeMessage("theme.json", parseThemeDocument("{"))).toBe(
      "theme.json is not valid JSON.",
    );
    expect(shapeMessage("theme.json", parseThemeDocument("[]"))).toBe(
      "theme.json is neither a theme nor a { light, dark } pair.",
    );
  });
});
