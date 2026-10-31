// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  buildBootstrapPlan,
  createThemeBootstrapScript,
  darkModeCSSTemplate,
  getBuiltInThemes,
  serializeThemeBootstrapScript,
  systemModeCSSTemplate,
} from "../src";
import { defineTheme } from "../src/model";

/**
 * F1 — the bootstrap script is emitted as the body of a `<script>` element by
 * every SSR integration (Next, Remix, Nuxt, Astro, Vite). `JSON.stringify` does
 * not escape markup delimiters, so before this was fixed a theme name or token
 * value containing `</script>` ended the element and everything after it became
 * markup — stored XSS on every page for an app whose themes can be
 * user-supplied.
 *
 * These tests assert the property at the *output* boundary, not on the helper:
 * the emitted script is parsed back through the HTML parser and executed, so a
 * regression in any one of the fields (map, names, families, fallback, storage
 * key, cookie names) fails here.
 */

/** Theme data that tries to end the script element and start another one. */
const TERMINATOR = "</script><script>window.__PWNED__=1</script>";

/**
 * A theme whose *data* carries every payload the report listed: a script
 * terminator in the name, a family with quotes and a backslash, and token
 * values with markup delimiters, U+2028/U+2029 and a quoted font stack.
 */
const hostileThemes = [
  defineTheme({
    name: `sunrise-light${TERMINATOR}`,
    meta: { family: `sunrise"quote'back\\slash${TERMINATOR}`, mode: "light" },
    tokens: {
      colors: {
        background: "</style><script>window.__PWNED__=1</script>",
        foreground: "#0f172a",
        primary: "rgb(14, 165, 233)",
      },
      typography: {
        fontFamilies: { sans: "'Inter', sans-serif" },
      },
      radius: { lg: "16px" },
    },
  }),
  defineTheme({
    name: `sunrise-dark${TERMINATOR}`,
    meta: { family: `sunrise"quote'back\\slash${TERMINATOR}`, mode: "dark" },
    tokens: {
      colors: {
        background: "line\u2028sep\u2029end",
        foreground: "#f8fafc",
        primary: "rgb(56, 189, 248)",
      },
      radius: { lg: "16px" },
    },
  }),
] as const;

/**
 * Parse `script` the way a browser does when the HTML arrives over the wire:
 * as the body of a single `<script>` element.
 *
 * @returns The parsed element's text and the number of script elements the
 *   fragment produced.
 */
function parseAsScriptElement(script: string): {
  elementCount: number;
  childElementCount: number;
  text: string;
} {
  const host = document.createElement("div");
  host.innerHTML = `<script id="probe">${script}</script>`;
  const scripts = host.querySelectorAll("script");
  return {
    // More than one `<script>` means the payload closed the probe element and
    // the remainder was parsed as markup — which is the vulnerability.
    elementCount: scripts.length,
    // Any element at all beyond the probe means markup was injected.
    childElementCount: host.children.length,
    text: scripts[0]?.textContent ?? "",
  };
}

function run(script: string): void {
  // A parse failure here is the bug, not a test detail: the whole point is that
  // the emitted script stays syntactically valid for any theme data.
  new Function(script)();
}

describe("bootstrap script encoding (F1)", () => {
  it("emits exactly one script element and no injected markup", () => {
    const script = createThemeBootstrapScript({ themes: hostileThemes });
    const parsed = parseAsScriptElement(script);

    expect(parsed.elementCount).toBe(1);
    expect(parsed.childElementCount).toBe(1);
    // The script's text round-trips unchanged: the HTML tokenizer saw no end
    // tag, so nothing was truncated or re-parsed.
    expect(parsed.text).toBe(script);
  });

  it("keeps the script syntactically valid and executes it", () => {
    const script = createThemeBootstrapScript({
      themes: hostileThemes,
      defaultTheme: hostileThemes[0].name,
    });

    expect(() => run(script)).not.toThrow();
    expect((window as unknown as { __PWNED__?: number }).__PWNED__).toBeUndefined();
  });

  it("escapes the theme map, names and family list", () => {
    const script = createThemeBootstrapScript({ themes: hostileThemes });

    // No raw markup delimiter survives anywhere in the emitted script.
    expect(script).not.toContain("</script");
    expect(script).not.toContain("</style");
    expect(script).toContain("\\u003c/script");
  });

  it("preserves the theme values that carry quotes, backslashes and Unicode", () => {
    const script = createThemeBootstrapScript({ themes: hostileThemes });

    expect(() => run(script)).not.toThrow();

    // The quoted font stack is applied verbatim — the escape is transport-level,
    // so the CSS the browser receives still has its quotes.
    const fontFamily = document.documentElement.style.getPropertyValue(
      "--theme-typography-font-family-sans",
    );
    expect(fontFamily).toBe("'Inter', sans-serif");

    // A name is written to `data-theme` unchanged, terminator included.
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      hostileThemes[0].name,
    );
  });

  it("escapes the U+2028/U+2029 line separators", () => {
    const script = createThemeBootstrapScript({ themes: hostileThemes });

    expect(script).not.toContain("\u2028");
    expect(script).not.toContain("\u2029");
    expect(script).toContain("\\u2028");
  });

  it("escapes the persisted-selection fields too (storage key and family list)", () => {
    const plan = buildBootstrapPlan(hostileThemes);
    const script = serializeThemeBootstrapScript(plan, {
      kind: "storage",
      key: `key${TERMINATOR}`,
    });

    const parsed = parseAsScriptElement(script);
    expect(parsed.elementCount).toBe(1);
    expect(parsed.text).toBe(script);
    expect(() => run(script)).not.toThrow();
  });

  it("escapes the cookie-source fields (names, fingerprint)", () => {
    const plan = buildBootstrapPlan(hostileThemes);
    const script = serializeThemeBootstrapScript(
      plan,
      {
        kind: "cookies",
        names: {
          mode: `theme-mode${TERMINATOR}`,
          family: `theme-family${TERMINATOR}`,
          fingerprint: `theme-fingerprint${TERMINATOR}`,
        },
      },
      { fingerprint: `fp${TERMINATOR}` },
    );

    const parsed = parseAsScriptElement(script);
    expect(parsed.elementCount).toBe(1);
    expect(parsed.text).toBe(script);
    expect(() => run(script)).not.toThrow();
  });

  it("leaves ordinary theme data byte-identical", () => {
    const themes = getBuiltInThemes();
    const script = createThemeBootstrapScript({ themes });

    // No escaping is triggered by values that contain none of the five
    // characters, so the shipped presets produce exactly the script they did
    // before this change.
    expect(script).not.toContain("\\u003c");
    expect(script).not.toContain("\\u0026");
    expect(() => run(script)).not.toThrow();
  });
});

describe("style-element encoding (F1 related)", () => {
  it("darkModeCSSTemplate cannot close the style element", () => {
    const css = darkModeCSSTemplate({
      "--theme-color-background": "</style><script>alert(1)</script>",
      "--theme-typography-font-family-sans": "'Inter', sans-serif",
    });

    expect(css).not.toContain("</style");
    expect(css).toContain("<\\/style");
    // The quoted font stack is untouched: this is a transport escape only.
    expect(css).toContain("'Inter', sans-serif");
  });

  it("systemModeCSSTemplate cannot close the style element", () => {
    const css = systemModeCSSTemplate(
      { "--theme-color-background": "</style><img src=x onerror=alert(1)>" },
      { "--theme-color-background": "</STYLE><b>x</b>" },
    );

    expect(css.toLowerCase()).not.toContain("</style");
    expect(css).toContain("<\\/style");
  });
});
