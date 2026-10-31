import { describe, expect, it } from "vitest";

import { PREVIEW_SURFACE_CSS, previewSurfaceMarkup } from "../src/shared/previewSurface.js";

const CONTENT = {
  themeName: "<b>berry</b>",
  family: "berry",
  contrast: "12/12 pass",
  mode: "dark",
  modeLabel: "dark",
  source: "themes/berry.ts",
  roles: [
    { role: "background", value: "#101010" },
    { role: "primary", value: null },
  ],
  modes: ["light", "dark"],
};

describe("the components surface", () => {
  it("escapes theme-provided text", () => {
    const html = previewSurfaceMarkup(CONTENT, { ids: false });

    expect(html).not.toContain("<b>berry</b>");
    expect(html).toContain("&lt;b&gt;berry&lt;/b&gt;");
  });

  it("emits the facts the panel fills, but only when asked", () => {
    const studio = previewSurfaceMarkup(CONTENT, { ids: false });
    const panel = previewSurfaceMarkup(CONTENT, { ids: true });

    expect(panel).toContain('id="theme-name"');
    expect(panel).toContain('id="theme-family"');
    expect(panel).toContain('id="theme-contrast"');
    expect(panel).toContain('id="theme-source"');
    expect(panel).toContain('id="stat-tokens"');
    expect(panel).toContain('id="value-background"');
    expect(studio).not.toContain('id="theme-name"');
    expect(studio).not.toContain('id="value-background"');
  });

  it("keeps the mode control out of the surface", () => {
    // Light/Dark belongs to the Studio toolbar and the panel chrome; a third
    // control inside the preview would be a second owner of the same state.
    const html = previewSurfaceMarkup(CONTENT, { ids: true });

    expect(html).not.toContain('id="mode-light"');
    expect(html).not.toMatch(/\sdata-mode=/u);
  });

  it("names the roles it paints through data-token", () => {
    const html = previewSurfaceMarkup(CONTENT, { ids: false });
    const tokens = [...html.matchAll(/data-token="([^"]+)"/gu)].map((match) => match[1]!);

    expect(tokens.length).toBeGreaterThan(20);
    for (const token of tokens) {
      expect(token).toMatch(/^(?:(?:bg|fg|bd|st|ic):[a-z-]+(?:\/\d+(?:\+[a-z-]+)?)?\s*)+$/u);
    }
  });

  it("marks a missing role instead of inventing a colour", () => {
    expect(previewSurfaceMarkup(CONTENT, { ids: false })).toContain("(missing)");
  });

  it("carries no style attribute, which the Studio CSP would block", () => {
    expect(previewSurfaceMarkup(CONTENT, { ids: false })).not.toMatch(/\sstyle=/u);
  });

  it("scopes every rule to the surface", () => {
    expect(PREVIEW_SURFACE_CSS).not.toMatch(/(^|\})\s*(button|input|body|html)\b/u);
  });
});
