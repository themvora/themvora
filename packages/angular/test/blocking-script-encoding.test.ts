// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineTheme } from "@themvora/core";
import {
  buildThemeCSSMap,
  createBlockingScriptContent,
} from "../src/lib/blocking-script";

/**
 * F2 — the Angular blocking script and its critical CSS are emitted as raw
 * `<script>` / `<style>` element bodies. Two separate defects lived here:
 *
 * 1. `initialMode`, `initialFamily` and the joined CSS variables were spliced
 *    into **single-quoted JavaScript literals**, so any `'` in a value broke
 *    the script's syntax. The preset font stacks happen to be unquoted, but
 *    `font-family: 'Inter', sans-serif` is an ordinary custom theme value and
 *    produced `Unexpected identifier 'Inter'`. The surrounding `try/catch`
 *    cannot help: a script that does not parse never runs.
 * 2. The critical CSS went into `<style>${criticalCSS}</style>` unescaped, so a
 *    value containing `</style>` closed the element.
 *
 * Both are asserted here at the output boundary: the emitted HTML is parsed by
 * the HTML parser and the emitted script is executed.
 */

const QUOTED_FONT = "'Inter', sans-serif";

function themesWith(family: string, fontFamily: string, background = "#ffffff") {
  return [
    defineTheme({
      name: `${family}-light`,
      meta: { family, mode: "light" },
      tokens: {
        colors: { background, foreground: "#111111", primary: "#0066cc" },
        typography: { fontFamilies: { sans: fontFamily } },
        radius: { md: "6px" },
      },
    }),
    defineTheme({
      name: `${family}-dark`,
      meta: { family, mode: "dark" },
      tokens: {
        colors: { background: "#101010", foreground: "#eeeeee", primary: "#3399ff" },
        typography: { fontFamilies: { sans: fontFamily } },
        radius: { md: "6px" },
      },
    }),
  ] as const;
}

/** Parse the emitted fragment the way a browser does. */
function parseFragment(html: string): {
  host: HTMLDivElement;
  scriptText: string;
  styleText: string;
  scriptCount: number;
  styleCount: number;
} {
  const host = document.createElement("div");
  host.innerHTML = html;
  return {
    host,
    scriptText: host.querySelector("script")?.textContent ?? "",
    styleText: host.querySelector("style")?.textContent ?? "",
    scriptCount: host.querySelectorAll("script").length,
    styleCount: host.querySelectorAll("style").length,
  };
}

function run(scriptText: string): void {
  new Function(scriptText)();
}

describe("Angular blocking script encoding (F2)", () => {
  beforeEach(() => {
    // jsdom does not implement matchMedia; the script guards the call but the
    // `system` branch reads it, so stub it to keep assertions deterministic.
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme-family");
    document.documentElement.removeAttribute("data-theme-mode");
    document.documentElement.classList.remove("dark");
    document.documentElement.style.cssText = "";
  });

  it("keeps the script valid for a quoted font stack", () => {
    const themes = themesWith("default", QUOTED_FONT);
    const html = createBlockingScriptContent(themes, null);
    const { scriptText, styleText } = parseFragment(html);

    expect(() => run(scriptText)).not.toThrow();

    // The value survives intact: quotes are data, not syntax.
    expect(styleText).toContain(`--theme-typography-font-family-sans:${QUOTED_FONT}`);
    expect(document.documentElement.style.getPropertyValue(
      "--theme-typography-font-family-sans",
    )).toBe(QUOTED_FONT);
  });

  it("keeps the script valid for quotes, backslashes and Unicode in a family name", () => {
    const family = `brand"quoted'family\\with\\backslashes-Ω`;
    const themes = themesWith(family, QUOTED_FONT);
    const html = createBlockingScriptContent(themes, null);
    const { scriptText } = parseFragment(html);

    expect(() => run(scriptText)).not.toThrow();
    expect(document.documentElement.getAttribute("data-theme-family")).toBe(family);
  });

  it("cannot be terminated by a value containing a script end tag", () => {
    const payload = "</script><script>window.__PWNED__=1</script>";
    const themes = themesWith("default", payload, payload);
    const html = createBlockingScriptContent(themes, null);
    const parsed = parseFragment(html);

    expect(parsed.scriptCount).toBe(1);
    expect(parsed.styleCount).toBe(1);
    expect(parsed.scriptText).toBe(
      parsed.host.querySelector("script")?.textContent,
    );
    expect((window as unknown as { __PWNED__?: number }).__PWNED__).toBeUndefined();
    expect(html).not.toContain("</script><script>");
  });

  it("cannot be terminated by a value that closes the style element", () => {
    const payload = "</style><img src=x onerror=window.__PWNED__=1>";
    const themes = themesWith("default", payload, payload);
    const html = createBlockingScriptContent(themes, null);
    const parsed = parseFragment(html);

    // One style element and no injected <img>.
    expect(parsed.styleCount).toBe(1);
    expect(parsed.host.querySelector("img")).toBeNull();
    expect(parsed.styleText).not.toContain("</style");
  });

  it("emits the same CSS values for ordinary theme data", () => {
    const themes = themesWith("default", "system-ui, sans-serif");
    const cssMap = buildThemeCSSMap(themes);
    const html = createBlockingScriptContent(themes, null);

    expect(html).toContain(":root{");
    for (const name of Object.keys(cssMap.light)) {
      expect(html).toContain(name);
    }
    // No escape is applied to values that contain none of the escaped
    // sequences, so the emitted CSS is byte-identical for normal themes.
    expect(html).not.toContain("<\\/");
  });

  it("still applies the saved selection", () => {
    const themes = themesWith("forest", "system-ui, sans-serif");
    const html = createBlockingScriptContent(themes, {
      mode: "dark",
      family: "forest",
    });
    const { scriptText } = parseFragment(html);

    run(scriptText);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme-family")).toBe("forest");
    expect(document.documentElement.style.getPropertyValue(
      "--theme-color-background",
    )).toBe("#101010");
  });
});
