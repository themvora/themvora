/**
 * Locator tests.
 *
 * The locator is the riskiest piece of Milestone 6: everything else depends on it
 * producing a *correct* range, and a wrong range is worse than none. So these
 * assert the extracted text at each span, not merely that a span exists.
 */
import { describe, expect, it } from "vitest";

import { parseThemeDocument } from "../src/domain/themeDocument";
import {
  indexThemeDocument,
  splitPath,
  type Location,
  type SourceRange,
  type ThemeDocumentIndex,
} from "../src/domain/diagnosticLocator";

/** A single theme, pretty-printed. */
const SINGLE = JSON.stringify(
  {
    name: "solo",
    meta: { family: "solo", mode: "light" },
    tokens: {
      colors: { primary: "#ff0000", background: "#ffffff" },
      typography: { fontSizes: { base: "16px" } },
    },
  },
  null,
  2,
);

/** A light/dark pair, sharing every key. */
const PAIR = JSON.stringify(
  {
    light: { name: "pair-light", tokens: { colors: { primary: "#111111" } } },
    dark: { name: "pair-dark", tokens: { colors: { primary: "#222222" } } },
  },
  null,
  2,
);

/** The text at a range. */
function textAt(text: string, range: SourceRange): string {
  return text.slice(range.start, range.end);
}

/** Index, or fail the test. */
function indexOf(text: string): ThemeDocumentIndex {
  const index = indexThemeDocument(text);
  if (index === null) throw new Error("expected the document to be scannable");
  return index;
}

/** Locate, or fail the test. */
function locate(text: string, path: string, half: "single" | "light" | "dark" = "single"): Location {
  return indexOf(text).locate(splitPath(path), half);
}

describe("single theme", () => {
  it("finds a nested token value", () => {
    const location = locate(SINGLE, "tokens.colors.primary");

    expect(location.status).toBe("value");
    if (location.status !== "value") return;
    expect(textAt(SINGLE, location.range)).toBe("#ff0000");
  });

  it("finds a deeper path", () => {
    const location = locate(SINGLE, "tokens.typography.fontSizes.base");

    expect(location.status).toBe("value");
    if (location.status !== "value") return;
    expect(textAt(SINGLE, location.range)).toBe("16px");
  });

  it("finds a top-level scalar", () => {
    const location = locate(SINGLE, "name");

    expect(location.status).toBe("value");
    if (location.status !== "value") return;
    expect(textAt(SINGLE, location.range)).toBe("solo");
  });

  it("excludes the quotes from a string value", () => {
    const location = locate(SINGLE, "tokens.colors.primary");
    if (location.status !== "value") throw new Error("expected a value");

    // The character before the span is the opening quote, the one after is the
    // closing quote — this is the span a colour swatch must replace.
    expect(SINGLE.charAt(location.range.start - 1)).toBe('"');
    expect(SINGLE.charAt(location.range.end)).toBe('"');
  });

  it("does not confuse a key with a value", () => {
    const location = locate(SINGLE, "tokens.colors");
    if (location.status !== "value") throw new Error("expected a value");

    const text = textAt(SINGLE, location.range);
    expect(text.startsWith("{")).toBe(true);
    expect(text.endsWith("}")).toBe(true);
    expect(text).toContain('"primary"');
  });
});

describe("light/dark pair", () => {
  it("resolves the same path to different values per half", () => {
    const light = locate(PAIR, "tokens.colors.primary", "light");
    const dark = locate(PAIR, "tokens.colors.primary", "dark");

    if (light.status !== "value" || dark.status !== "value") throw new Error("expected values");
    expect(textAt(PAIR, light.range)).toBe("#111111");
    expect(textAt(PAIR, dark.range)).toBe("#222222");
    expect(light.range.start).not.toBe(dark.range.start);
  });

  it("refuses a half the document does not have", () => {
    const onlyLight = JSON.stringify({ light: { name: "x", tokens: {} } }, null, 2);

    expect(locate(onlyLight, "tokens", "dark").status).toBe("unresolved");
  });

  it("does not resolve a single-theme document as a pair half", () => {
    // The same path exists in SINGLE, but not under a `light` key.
    expect(locate(SINGLE, "tokens.colors.primary", "light").status).toBe("unresolved");
  });
});

describe("missing paths", () => {
  it("reports the containing object for an absent token", () => {
    const location = locate(SINGLE, "tokens.colors.muted");

    expect(location.status).toBe("container");
    if (location.status !== "container") return;
    expect(location.missingPath).toBe("muted");

    const text = textAt(SINGLE, location.range);
    expect(text.startsWith("{")).toBe(true);
    expect(text).toContain('"primary"');
  });

  it("falls back to the deepest ancestor that exists", () => {
    const location = locate(SINGLE, "tokens.spacing.sm");

    expect(location.status).toBe("container");
    if (location.status !== "container") return;
    // `spacing` is absent, so the fallback is `tokens`, not `colors`.
    expect(location.missingPath).toBe("spacing.sm");
    expect(textAt(SINGLE, location.range)).toContain('"colors"');
  });

  it("falls back to the theme root when the first segment is absent", () => {
    const location = locate(SINGLE, "extends");

    expect(location.status).toBe("container");
    if (location.status !== "container") return;
    expect(textAt(SINGLE, location.range).startsWith("{")).toBe(true);
    expect(textAt(SINGLE, location.range)).toContain('"tokens"');
  });

  it("reports at the scalar when one sits where an object is expected", () => {
    const text = JSON.stringify({ tokens: "not an object" });
    const location = locate(text, "tokens.colors");

    // The scalar is the problem, so it is the honest place to point — and the
    // diagnostic is not lost.
    expect(location.status).toBe("container");
    if (location.status !== "container") return;
    expect(textAt(text, location.range)).toBe("not an object");
    expect(location.missingPath).toBe("colors");
  });
});

describe("strings and structure", () => {
  it("handles escaped quotes without ending the string early", () => {
    const text = JSON.stringify({ meta: { description: 'a "quoted" value' } }, null, 2);
    const location = locate(text, "meta.description");

    if (location.status !== "value") throw new Error("expected a value");
    // The raw text still contains the escape; the span must cover all of it.
    expect(textAt(text, location.range)).toBe('a \\"quoted\\" value');
  });

  it("ignores key-like text inside a string", () => {
    const text = JSON.stringify({ meta: { description: "tokens.colors.primary" } }, null, 2);

    // There is no real `tokens` key, so this must not resolve to the text inside
    // the string.
    expect(locate(text, "tokens.colors.primary").status).toBe("container");
  });

  it("resolves duplicate keys the way JSON.parse does", () => {
    const text = '{"tokens":{"colors":{"primary":"#111111"}},"tokens":{"colors":{"primary":"#222222"}}}';
    const location = locate(text, "tokens.colors.primary");

    if (location.status !== "value") throw new Error("expected a value");
    // Last one wins, which is what the runtime sees.
    expect(textAt(text, location.range)).toBe("#222222");
  });

  it("works the same minified and pretty-printed", () => {
    const minified = '{"tokens":{"colors":{"primary":"#ff0000"}}}';
    const pretty = JSON.stringify({ tokens: { colors: { primary: "#ff0000" } } }, null, 4);

    for (const text of [minified, pretty]) {
      const location = locate(text, "tokens.colors.primary");
      if (location.status !== "value") throw new Error("expected a value");
      expect(textAt(text, location.range)).toBe("#ff0000");
    }
  });

  it("walks array indices", () => {
    const text = JSON.stringify({ extends: ["base-a", "base-b"] }, null, 2);
    const location = locate(text, "extends.1");

    if (location.status !== "value") throw new Error("expected a value");
    expect(textAt(text, location.range)).toBe("base-b");
  });

  it("reports the array for an index that is out of range", () => {
    const text = JSON.stringify({ extends: ["base-a"] }, null, 2);
    const location = locate(text, "extends.9");

    expect(location.status).toBe("container");
    if (location.status !== "container") return;
    expect(textAt(text, location.range)).toContain("base-a");
  });

  it("handles a key that repeats across different objects", () => {
    const text = JSON.stringify(
      { light: { meta: { family: "a" } }, dark: { meta: { family: "b" } } },
      null,
      2,
    );

    const light = locate(text, "meta.family", "light");
    const dark = locate(text, "meta.family", "dark");
    if (light.status !== "value" || dark.status !== "value") throw new Error("expected values");

    expect(textAt(text, light.range)).toBe("a");
    expect(textAt(text, dark.range)).toBe("b");
  });
});

describe("documents that cannot be scanned", () => {
  it("refuses truncated JSON", () => {
    expect(indexThemeDocument('{"tokens": {')).toBeNull();
  });

  it("refuses empty text", () => {
    expect(indexThemeDocument("")).toBeNull();
  });

  it("refuses raw text that still contains comments", () => {
    // The locator is given the *masked* source. Handed raw text it refuses, which
    // is why every caller passes `parseThemeDocument(...).source`.
    expect(indexThemeDocument('{\n  // a comment\n  "name": "x"\n}')).toBeNull();
  });
});

describe("commented documents", () => {
  /** Index a commented document the way the adapters do. */
  function indexCommented(text: string): { index: ThemeDocumentIndex; original: string } {
    const document = parseThemeDocument(text);
    if (document.shape !== "themes") throw new Error("expected a theme document");
    const index = indexThemeDocument(document.source);
    if (index === null) throw new Error("expected an index");
    return { index, original: text };
  }

  it("keeps offsets exact when comments precede the token", () => {
    const text = `{
  // brand palette
  "name": "brand",
  "tokens": {
    "colors": {
      /* the main action colour */
      "primary": "#4f46e5",
    },
  },
}`;

    const { index, original } = indexCommented(text);
    const location = index.locate(["tokens", "colors", "primary"], "single");

    if (location.status !== "value") throw new Error("expected a value");
    // Offsets come from the masked source but address the original file.
    expect(original.slice(location.range.start, location.range.end)).toBe("#4f46e5");
  });

  it("does not find a token that only appears inside a comment", () => {
    const text = `{
  // "muted": "#000000" is not defined here
  "tokens": { "colors": { "primary": "#4f46e5" } }
}`;

    const { index } = indexCommented(text);

    // The comment is masked, so the key is genuinely absent.
    expect(index.locate(["tokens", "colors", "muted"], "single").status).toBe("container");
  });

  it("keeps positions correct across CRLF with comments", () => {
    const text = [
      "{",
      '  // a comment',
      '  "tokens": {',
      '    "colors": {',
      '      "primary": "#4f46e5",',
      "    },",
      "  },",
      "}",
    ].join("\r\n");

    const { index, original } = indexCommented(text);
    const location = index.locate(["tokens", "colors", "primary"], "single");

    if (location.status !== "value") throw new Error("expected a value");
    expect(original.slice(location.range.start, location.range.end)).toBe("#4f46e5");

    // The token really is on line 4 (zero-based), counting the CRLF lines.
    const before = original.slice(0, location.range.start);
    expect(before.split("\n")).toHaveLength(5);
  });

  it("tolerates a trailing comma", () => {
    const text = '{"tokens":{"colors":{"primary":"#4f46e5",},},}';
    const { index, original } = indexCommented(text);

    const location = index.locate(["tokens", "colors", "primary"], "single");
    if (location.status !== "value") throw new Error("expected a value");
    expect(original.slice(location.range.start, location.range.end)).toBe("#4f46e5");
  });
});

describe("splitPath", () => {
  it("splits a dot-path", () => {
    expect(splitPath("tokens.colors.primary")).toEqual(["tokens", "colors", "primary"]);
  });

  it("ignores empty segments", () => {
    expect(splitPath(".tokens..primary.")).toEqual(["tokens", "primary"]);
  });
});
