import { describe, expect, it } from "vitest";

import {
  CSS_DARK_SELECTOR,
  CSS_ROOT_SELECTOR,
  generateTheme,
  themeToCSSVariables,
  themeToCssDocument,
} from "../src";
import { defineTheme } from "../src/model";

/** A theme with a known, minimal token set, so the output can be asserted exactly. */
const SIMPLE = defineTheme({
  name: "simple",
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#111111",
    },
    radius: {
      lg: "8px",
    },
  },
});

/** A real generated pair, for the cases that care about semantic completeness. */
const PAIR = generateTheme({ seed: "#4f46e5" });

describe("themeToCssDocument — single theme", () => {
  it("renders a :root block with the canonical spacing", () => {
    expect(themeToCssDocument(SIMPLE)).toBe(
      [
        ":root {",
        "  --theme-color-background: #ffffff;",
        "  --theme-color-foreground: #111111;",
        "  --theme-radius-lg: 8px;",
        "}",
        "",
      ].join("\n"),
    );
  });

  it("uses the exported root selector", () => {
    expect(CSS_ROOT_SELECTOR).toBe(":root");
    expect(themeToCssDocument(SIMPLE).startsWith(":root {")).toBe(true);
  });

  it("emits exactly the variables themeToCSSVariables produces", () => {
    // The document is a rendering of that map and must not add or drop a token.
    const variables = themeToCSSVariables(SIMPLE);
    const document = themeToCssDocument(SIMPLE);

    for (const [name, value] of Object.entries(variables)) {
      expect(document).toContain(`  ${name}: ${value};`);
    }

    const emitted = document
      .split("\n")
      .filter((line) => line.trim().startsWith("--"))
      .map((line) => line.trim().split(":")[0]);
    expect(emitted).toEqual(Object.keys(variables));
  });

  it("preserves every semantic colour of a generated theme", () => {
    const document = themeToCssDocument(PAIR.light);

    // 21 required roles plus the radius group core always emits.
    expect(document.match(/--theme-color-/g)).toHaveLength(21);
    expect(document).toContain(`  --theme-color-primary: ${PAIR.light.tokens!.colors!["primary"]};`);
    expect(document).toContain(`  --theme-color-border: ${PAIR.light.tokens!.colors!["border"]};`);
  });

  it("is deterministic", () => {
    // Same input, byte-identical output — twice, and across two instances of the
    // same theme.
    expect(themeToCssDocument(PAIR.light)).toBe(themeToCssDocument(PAIR.light));
    expect(themeToCssDocument(PAIR.dark)).toBe(themeToCssDocument(PAIR.dark));
  });

  it("ends with exactly one newline", () => {
    const document = themeToCssDocument(SIMPLE);
    expect(document.endsWith("\n")).toBe(true);
    expect(document.endsWith("\n\n")).toBe(false);
  });
});

describe("themeToCssDocument — light/dark pair", () => {
  it("emits :root then the dark selector", () => {
    const document = themeToCssDocument({ light: SIMPLE, dark: SIMPLE });

    expect(document).toBe(
      [
        ":root {",
        "  --theme-color-background: #ffffff;",
        "  --theme-color-foreground: #111111;",
        "  --theme-radius-lg: 8px;",
        "}",
        "",
        '.dark, [data-theme="dark"] {',
        "  --theme-color-background: #ffffff;",
        "  --theme-color-foreground: #111111;",
        "  --theme-radius-lg: 8px;",
        "}",
        "",
      ].join("\n"),
    );
  });

  it("uses the exported dark selector", () => {
    expect(CSS_DARK_SELECTOR).toBe('.dark, [data-theme="dark"]');
    expect(themeToCssDocument({ light: PAIR.light, dark: PAIR.dark })).toContain(
      '.dark, [data-theme="dark"] {',
    );
  });

  it("keeps the two halves distinct", () => {
    const document = themeToCssDocument({ light: PAIR.light, dark: PAIR.dark });
    const [lightBlock, darkBlock] = document.split(`\n${CSS_DARK_SELECTOR} {`);

    expect(lightBlock).toContain(`--theme-color-background: ${PAIR.light.tokens!.colors!["background"]};`);
    expect(darkBlock).toContain(`--theme-color-background: ${PAIR.dark.tokens!.colors!["background"]};`);
    // Light and dark really do differ for this seed, so the assertion above is
    // not comparing a value with itself.
    expect(PAIR.light.tokens!.colors!["background"]).not.toBe(PAIR.dark.tokens!.colors!["background"]);
  });

  it("separates the blocks with exactly one blank line", () => {
    const document = themeToCssDocument({ light: SIMPLE, dark: SIMPLE });
    expect(document).toContain("}\n\n.dark");
  });
});

describe("themeToCssDocument — edge cases", () => {
  it("renders an empty block for a theme with no tokens", () => {
    // Deliberately preserved from the CLI exporter so the refactor is
    // byte-compatible. A tokenless theme cannot pass validation, so no validated
    // theme reaches this state.
    expect(themeToCssDocument(defineTheme({ name: "empty", tokens: {} }))).toBe(":root {\n\n}\n");
  });

  it("ignores undefined token values rather than emitting them", () => {
    const theme = defineTheme({
      name: "sparse",
      tokens: { colors: { background: "#fff", foreground: undefined } },
    });

    expect(themeToCssDocument(theme)).not.toContain("foreground");
  });

  it.each([[null], [undefined], ["a theme"], [42]])(
    "throws a TypeError for %s",
    (value) => {
      expect(() => themeToCssDocument(value as never)).toThrow(TypeError);
    },
  );
});
