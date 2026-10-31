/**
 * The colour contract, enforced statically.
 *
 * The preview may paint with the 21 theme roles and with sRGB mixes of two of
 * them. That is the whole palette. This test reads the stylesheets and the
 * markup the surfaces ship and rejects anything else: hex, rgb/hsl, named
 * colours, `--vscode-*` variables, oklab mixes, and tints pushed past the fill
 * or shadow caps. It does not test a rendering, which is why the panel carries
 * the runtime audit as well.
 */
import { describe, expect, it } from "vitest";

import { dashboardMarkup, DASHBOARD_SURFACE_CSS } from "../src/shared/dashboardSurface";
import { PREVIEW_SURFACE_CSS, previewSurfaceMarkup } from "../src/shared/previewSurface";
import { PREVIEW_ROLES, roleProperty } from "../src/shared/previewTokens";

const CSS = `${PREVIEW_SURFACE_CSS}\n${DASHBOARD_SURFACE_CSS}`;
const MARKUP = `${dashboardMarkup({ idPrefix: "test", ids: false })}\n${previewSurfaceMarkup(
  {
    themeName: "Test",
    family: "test",
    contrast: "",
    mode: "light",
    modeLabel: "light",
    source: "",
    roles: PREVIEW_ROLES.map((role) => ({ role, value: "role-value" })),
  },
  { ids: false },
)}`;

/** The body of every `color-mix(…)`, with balanced parentheses. */
function mixes(source: string): string[] {
  const found: string[] = [];
  let index = source.indexOf("color-mix(");
  while (index >= 0) {
    const start = index + "color-mix(".length;
    let depth = 1;
    let cursor = start;
    while (cursor < source.length && depth > 0) {
      const character = source[cursor];
      if (character === "(") depth += 1;
      else if (character === ")") depth -= 1;
      cursor += 1;
    }
    found.push(source.slice(start, cursor - 1));
    index = source.indexOf("color-mix(", cursor);
  }
  return found;
}

const ROLE_NAMES = new Set(PREVIEW_ROLES.map((role) => roleProperty(role).slice(2)));

describe("the preview palette", () => {
  it("contains no literal colour in the stylesheets", () => {
    expect(CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/u);
    expect(CSS).not.toMatch(/\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/u);
    expect(CSS).not.toContain("--vscode-");
    expect(CSS).not.toContain("--theme-color-");
  });

  it("contains no named colour, least of all black or white", () => {
    const named =
      /(?<![-\w])(?:black|white|red|green|blue|gray|grey|silver|maroon|olive|lime|aqua|teal|navy|fuchsia|purple|orange|yellow|pink|brown|gold|beige|ivory)(?![-\w])/iu;
    expect(CSS).not.toMatch(named);
  });

  it("uses transparent only as a mix operand", () => {
    for (const line of CSS.split("\n")) {
      if (!line.includes("transparent")) continue;
      expect(line).toContain("color-mix(");
    }
  });

  it("derives every mix from exactly two roles, in srgb, within the caps", () => {
    for (const body of mixes(CSS)) {
      expect(body.startsWith("in srgb, ")).toBe(true);
      const parsed = /^in srgb, var\(--([a-z-]+)\) (\d+)%, (?:var\(--([a-z-]+)\)|transparent)$/u.exec(
        body,
      );
      expect(parsed, body).not.toBeNull();
      const [, first, percentText, second] = parsed!;
      expect(ROLE_NAMES.has(first!)).toBe(true);
      if (second !== undefined) expect(ROLE_NAMES.has(second)).toBe(true);
      const percent = Number(percentText);
      expect(percent).toBeLessThanOrEqual(30);
    }
  });

  it("keeps every fill tint at or below 14 percent", () => {
    // Shadows and glows may reach 30; a surface or icon fill may not.
    for (const line of CSS.split("\n")) {
      if (!line.includes("color-mix(") || line.includes("shadow")) continue;
      for (const body of mixes(line)) {
        const percent = Number(/var\(--[a-z-]+\) (\d+)%/u.exec(body)?.[1] ?? "0");
        expect(percent, line).toBeLessThanOrEqual(14);
      }
    }
  });

  it("contains no literal colour in a paint attribute", () => {
    // Raw token values are text in the role table, not paint. What must never
    // happen is a colour written into an SVG presentation attribute or a style.
    expect(MARKUP).not.toMatch(/(?:fill|stroke|stop-color|color)="#/u);
    expect(MARKUP).not.toMatch(/\sstyle=/u);
    expect(MARKUP).not.toContain("--vscode-");
  });

  it("declares every data-token entry with a known role", () => {
    for (const match of MARKUP.matchAll(/data-token="([^"]+)"/gu)) {
      for (const part of match[1]!.split(/\s+/u)) {
        const body = part.slice(part.indexOf(":") + 1);
        const parsed = /^([a-z-]+)(?:\/\d+(?:\+([a-z-]+))?)?$/u.exec(body);
        expect(parsed, part).not.toBeNull();
        expect(ROLE_NAMES.has(parsed![1]!), part).toBe(true);
        if (parsed![2] !== undefined) expect(ROLE_NAMES.has(parsed![2]), part).toBe(true);
      }
    }
  });
});
