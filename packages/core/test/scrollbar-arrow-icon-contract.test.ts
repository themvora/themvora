// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createOverlayScrollbar } from "../src/utils/overlay-scrollbar";
import { createThemeStore } from "../src/createThemeStore";
import { defineTheme } from "../src/model";
import { resetDiagnosticEmission } from "../src/diagnostics";

/**
 * F16H — `arrowIcon` accepts an HTML string that is inserted with
 * `insertAdjacentHTML`. That is deliberate (an inline `<svg>` glyph has to
 * become elements), and it is a **public contract**: the string is trusted
 * markup, not text.
 *
 * The review's conclusion was that the option must be documented rather than
 * silently changed, because escaping the string would break every existing
 * caller that passes an SVG. These tests pin the contract down so a future
 * change to it is a deliberate, visible decision:
 *
 * - a string becomes markup (documented behaviour, unchanged);
 * - a `Node` is inserted as a node, never parsed as markup — the safe path for
 *   anything that is not fully trusted;
 * - the documented warning is present in the type's JSDoc.
 */

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const theme = defineTheme({
  name: "arrow-theme",
  meta: { family: "arrow", mode: "light" },
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#000000",
      primary: "#0066cc",
      border: "#e0e0e0",
      muted: "#f5f5f5",
      accent: "#e6f0ff",
    },
    radius: { lg: "8px" },
  },
});

/** The arrow buttons the engine rendered. */
function arrowButtons(): HTMLDivElement[] {
  return Array.from(document.querySelectorAll<HTMLDivElement>(".tv-arrow"));
}

beforeEach(() => {
  resetDiagnosticEmission();
});

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-themvora-scrollbar");
  document.documentElement.classList.remove("tv-scrollbar");
  document.documentElement.classList.remove("tv-scrollbar-ready");
  document.getElementById("tv-scrollbar-style")?.remove();
});

describe("scrollbar arrowIcon contract (F16H)", () => {
  it("inserts a string as markup, as documented", () => {
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      arrowIcon: '<svg data-glyph="chevron"><path d="M0 0"/></svg>',
    });

    const glyph = document.querySelector('[data-glyph="chevron"]');
    expect(glyph).not.toBeNull();
    expect(glyph!.tagName.toLowerCase()).toBe("svg");

    handle!.destroy();
  });

  it("inserts a Node as a node, without parsing it as markup", () => {
    const store = createThemeStore({ initialTheme: theme });
    const node = document.createElement("span");
    node.dataset.glyph = "node";
    // Text that would be markup if it were ever parsed.
    node.textContent = "<img src=x onerror=alert(1)>";

    const handle = createOverlayScrollbar(store, { arrowIcon: node });

    const inserted = document.querySelector('[data-glyph="node"]');
    expect(inserted).not.toBeNull();
    // The angle brackets stayed text: no element was created from them.
    expect(inserted!.querySelector("img")).toBeNull();
    expect(inserted!.textContent).toBe("<img src=x onerror=alert(1)>");

    handle!.destroy();
  });

  it("renders the built-in glyph when no icon is given", () => {
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {});

    const buttons = arrowButtons();
    expect(buttons.length).toBeGreaterThan(0);
    // No custom content: the CSS triangle fallback is used, which means the
    // button does not carry the custom-glyph class.
    expect(buttons.every((button) => !button.classList.contains("tv-arrow-custom"))).toBe(
      true,
    );

    handle!.destroy();
  });

  it("documents the trust boundary on the option", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "src", "scrollbar", "types.ts"),
      "utf8",
    );

    // The warning is part of the deliverable, not just the code: a future edit
    // that drops it fails here.
    expect(source).toContain("Trusted markup only");
    expect(source).toContain("insertAdjacentHTML");
    expect(source).toContain("Never pass user-controlled content");
  });
});
