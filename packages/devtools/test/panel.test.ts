// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createDevToolsPanel } from "../src/panel";

/**
 * F4 — the devtools panel built its markup by interpolating theme data into an
 * HTML string. Two of the interpolation sites were not even escaped:
 *
 * - `style="background:${val}"` next to a correctly escaped
 *   `${escapeHTML(val)}` — an HTML escape does nothing for a *CSS* context, so
 *   `red; background-image: url(…)` became two declarations.
 * - `class="tv-devtools-type tv-type-${e.type}"` — a quote or space in the type
 *   added attributes or classes.
 *
 * The panel now builds nodes. These tests assert that injected payloads are
 * rendered as text and never create elements, attributes or extra declarations.
 */

const HTML_PAYLOAD = `<img src=x onerror="window.__PWNED__=1">`;
const ATTR_PAYLOAD = `" onclick="window.__PWNED__=1" data-x="`;
const CSS_PAYLOAD = `red; background-image: url("https://evil.test/p.png")`;

function makeInspector(overrides: Record<string, unknown> = {}) {
  const state = {
    currentTheme: { name: `<b>${HTML_PAYLOAD}</b>`, meta: { family: ATTR_PAYLOAD } },
    selection: { mode: "light", family: ATTR_PAYLOAD },
    history: [{ index: 0 }, { index: 1 }],
    cssVariables: {
      "--theme-color-background": CSS_PAYLOAD,
      "--theme-typography-font-family-sans": "'Inter', sans-serif",
    },
    ...overrides,
  };

  return {
    getState: () => state,
    getEntries: () => [
      {
        type: `theme-change${ATTR_PAYLOAD}`,
        timestamp: 0,
        label: HTML_PAYLOAD,
        data: {},
      },
      { type: "theme-change", timestamp: 0, label: "ok", data: {} },
    ],
    getPerformance: () => [{ type: HTML_PAYLOAD, duration: 12, timestamp: 0 }],
    jump: vi.fn(),
    clearEntries: vi.fn(),
    clearPerformance: vi.fn(),
    exportState: () => "{}",
    exportCSS: () => ({}),
    destroy: vi.fn(),
  };
}

function render(overrides: Record<string, unknown> = {}) {
  const inspector = makeInspector(overrides);
  const panel = createDevToolsPanel(inspector as never);
  document.body.appendChild(panel);
  return { panel, inspector };
}

/** Switches tab by clicking its button, as a user would. */
function openTab(panel: HTMLElement, id: string) {
  const button = panel.querySelector<HTMLButtonElement>(`[data-tab="${id}"]`);
  expect(button).not.toBeNull();
  button!.click();
}

describe("devtools panel injection safety (F4)", () => {
  it("renders a malicious theme name as text, not markup", () => {
    const { panel } = render();

    expect(panel.querySelector("img")).toBeNull();
    expect(panel.querySelector("b")).toBeNull();
    expect((window as unknown as { __PWNED__?: number }).__PWNED__).toBeUndefined();
    // The payload is *displayed* — it is theme data — but as characters.
    expect(panel.textContent).toContain("__PWNED__");
    expect(panel.querySelector("[onclick]")).toBeNull();
  });

  it("does not add attributes or classes from an entry type", () => {
    const { panel } = render();
    openTab(panel, "events");

    const types = Array.from(panel.querySelectorAll(".tv-devtools-type"));
    expect(types).toHaveLength(2);

    for (const node of types) {
      expect(node.hasAttribute("onclick")).toBe(false);
      expect(node.getAttributeNames()).toEqual(["class"]);
    }

    // An unknown type gets no variant class at all; a known one gets exactly
    // its own.
    expect(types[0]!.className).toBe("tv-devtools-type");
    expect(types[1]!.className).toBe("tv-devtools-type tv-type-theme-change");
    // The malicious type is still *displayed*, just never used as a class.
    expect(types[0]!.textContent).toContain("theme-change");
  });

  it("applies a CSS variable value as one declaration, not several", () => {
    const { panel } = render();
    openTab(panel, "css");

    const swatches = Array.from(
      panel.querySelectorAll<HTMLElement>(".tv-devtools-css-swatch"),
    );
    expect(swatches.length).toBeGreaterThan(0);

    for (const swatch of swatches) {
      // `setProperty` rejects the `;`-separated payload outright, so no
      // declaration beyond `background` can appear.
      expect(swatch.style.getPropertyValue("background-image")).toBe("");
      expect(swatch.getAttribute("style") ?? "").not.toContain("evil.test");
    }
  });

  it("keeps a legitimate CSS value intact", () => {
    const { panel } = render();
    openTab(panel, "css");

    const values = Array.from(panel.querySelectorAll(".tv-devtools-css-val")).map(
      (node) => node.textContent,
    );
    expect(values).toContain("'Inter', sans-serif");
  });

  it("keeps the panel functional across tabs", () => {
    const { panel } = render();

    expect(panel.querySelector(".tv-devtools-body")).not.toBeNull();
    openTab(panel, "performance");
    expect(panel.textContent).toContain("Performance");
    openTab(panel, "history");
    expect(panel.textContent).toContain("History (2 entries)");

    const jump = panel.querySelector<HTMLButtonElement>("[data-jump='1']");
    expect(jump).not.toBeNull();
    jump!.click();
    expect(panel).not.toBeNull();
  });

  it("renders the empty state for CSS variables", () => {
    const { panel } = render({ cssVariables: {} });

    expect(panel.textContent).toContain("Inspector");
    openTab(panel, "css");
    expect(panel.textContent).toContain("No CSS variables.");
  });
});
