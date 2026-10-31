// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDiagnosticEmission } from "@themvora/core";
import "../src/index";

/**
 * F4 — `<themvora-inspector>` interpolated theme data straight into
 * `innerHTML`: token paths and values, the theme name, the family and the mode.
 * The token value reached it twice — once as text and once inside a
 * `style="background:…"` attribute, which is a **CSS** context, so an HTML
 * escape would not have been sufficient even if one had been applied.
 *
 * The inspector now builds nodes. These tests assert that a hostile theme
 * renders as text, creates no elements or attributes, and cannot add CSS
 * declarations to the swatch.
 */

const NAME_PAYLOAD = `<img src=x onerror="window.__PWNED__=1">`;
const ATTR_PAYLOAD = `" onmouseover="window.__PWNED__=1" x="`;
const CSS_PAYLOAD = `rgb(0, 0, 0); background-image: url("https://evil.test/p.png")`;

function mount(themes: unknown[]) {
  const provider = document.createElement("themvora-provider");
  provider.setAttribute("themes", JSON.stringify(themes));
  provider.setAttribute("default-theme", (themes[0] as { name: string }).name);
  document.body.appendChild(provider);

  const inspector = document.createElement("themvora-inspector");
  provider.appendChild(inspector);
  return { provider, inspector };
}

function panel(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[part="inspector-panel"]');
  expect(el).not.toBeNull();
  return el!;
}

const hostileTheme = {
  name: `hostile${NAME_PAYLOAD}`,
  meta: { family: `hostile${ATTR_PAYLOAD}`, mode: "light" },
  tokens: {
    colors: {
      background: CSS_PAYLOAD,
      foreground: "#111111",
      primary: "#0066cc",
    },
    typography: {
      fontFamilies: { sans: `'Inter', sans-serif` },
    },
    radius: { md: "6px" },
  },
};

const darkTheme = {
  name: "hostile-dark",
  meta: { family: hostileTheme.meta.family, mode: "dark" },
  tokens: {
    colors: { background: "#101010", foreground: "#eeeeee", primary: "#3399ff" },
    radius: { md: "6px" },
  },
};

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetDiagnosticEmission();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
  warn.mockRestore();
  localStorage.clear();
});

describe("web inspector injection safety (F4)", () => {
  it("renders a hostile theme name, family and token value as text", () => {
    mount([hostileTheme, darkTheme]);
    const el = panel();

    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector("script")).toBeNull();
    expect(el.querySelector("[onmouseover]")).toBeNull();
    expect((window as unknown as { __PWNED__?: number }).__PWNED__).toBeUndefined();

    // The values are still displayed — they are theme data.
    expect(el.textContent).toContain("__PWNED__");
    expect(el.textContent).toContain("'Inter', sans-serif");
  });

  it("does not let a token value add declarations to the swatch", () => {
    mount([hostileTheme, darkTheme]);
    const el = panel();

    // `setProperty("background", …)` parses the whole value as one declaration
    // value, so the `;`-separated payload is rejected instead of becoming two
    // declarations. Nothing anywhere in the panel may carry the injected URL.
    for (const node of Array.from(el.querySelectorAll<HTMLElement>("[style]"))) {
      expect(node.getAttribute("style") ?? "").not.toContain("evil.test");
      expect(node.style.getPropertyValue("background-image")).not.toContain(
        "evil.test",
      );
    }

    // And no element was created from the payload's `url()`.
    expect(el.querySelector("img")).toBeNull();
  });

  it("still shows the identity, selection and token sections", () => {
    mount([hostileTheme, darkTheme]);
    const el = panel();

    expect(el.textContent).toContain("Theme Inspector");
    expect(el.textContent).toContain("Tokens");
    expect(el.textContent).toContain("CSS Variables");
    // The mode chip is rendered from the runtime's selection.
    expect(el.textContent).toContain("light");
  });

  it("opens and closes on the toggle without re-creating markup", () => {
    const { inspector } = mount([hostileTheme, darkTheme]);
    const toggle = inspector.querySelector<HTMLButtonElement>("button");
    expect(toggle).not.toBeNull();

    toggle!.click();
    expect(panel().style.opacity).toBe("1");

    const close = panel().querySelector<HTMLButtonElement>("[data-close]");
    expect(close).not.toBeNull();
    close!.click();
    expect(panel().style.opacity).toBe("0");
  });
});
