// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createThemeBootstrapScript, createThemeReadoutScript } from "../src";
import { defineTheme } from "../src/model";

/**
 * The three DOM contracts the pre-paint script owns, and the reason they are
 * tested together: they all answer "what did the visitor actually choose?" from
 * the same three values. A regression in one is the same bug as a regression in
 * another, just with a smaller visible surface.
 *
 * The defect these guard: a server-rendered control asserts the value the
 * *server* resolved. On a prerendered page that is always the build-time
 * default, and for `system` mode it is a fallback the browser overrides — so a
 * page painted dark displayed "Themvora Light · light" with no mode selected,
 * and corrected itself once the runtime mounted. With a reload in the loop it
 * reads as the label flickering between light and dark.
 */

const themes = [
  defineTheme({
    name: "sunrise-light",
    meta: { family: "sunrise", mode: "light", label: "Sunrise Light" },
    tokens: { colors: { background: "#fff7ed", foreground: "#431407" } },
  }),
  defineTheme({
    name: "sunrise-dark",
    meta: { family: "sunrise", mode: "dark", label: "Sunrise Dark" },
    tokens: { colors: { background: "#431407", foreground: "#fff7ed" } },
  }),
  // No `meta.label`: the `label` readout must leave this one alone rather than
  // substituting the machine name for a human label.
  defineTheme({
    name: "bare-light",
    meta: { family: "bare", mode: "light" },
    tokens: { colors: { background: "#ffffff", foreground: "#000000" } },
  }),
  defineTheme({
    name: "bare-dark",
    meta: { family: "bare", mode: "dark" },
    tokens: { colors: { background: "#000000", foreground: "#ffffff" } },
  }),
] as const;

/** Marks up a page that opts into all three contracts. */
function renderControls(): void {
  document.body.innerHTML = `
    <span data-tv-readout="label">Sunrise Light</span>
    <span data-tv-readout="mode">light</span>
    <span data-tv-readout="theme">-</span>
    <button data-tv-pressed="mode" data-tv-value="light">light</button>
    <button data-tv-pressed="mode" data-tv-value="dark">dark</button>
    <button data-tv-pressed="mode" data-tv-value="system">system</button>
    <button data-tv-pressed="family" data-tv-value="sunrise">sunrise</button>
    <button data-tv-pressed="family" data-tv-value="bare">bare</button>
    <select data-tv-select="family">
      <option value="sunrise">sunrise</option>
      <option value="bare">bare</option>
    </select>
    <select data-tv-select="family">
      <option value="sunrise">sunrise</option>
    </select>
  `;
}

function run(script: string): void {
  new Function(script)();
}

function text(selector: string): string | null {
  return document.querySelector(selector)?.textContent ?? null;
}

function pressed(kind: string, value: string): string | null {
  return document
    .querySelector(`[data-tv-pressed="${kind}"][data-tv-value="${value}"]`)
    ?.getAttribute("aria-pressed") ?? null;
}

function selected(index: number): string | null {
  return (
    document.querySelectorAll<HTMLSelectElement>("[data-tv-select]")[index]
      ?.value ?? null
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-mode");
  document.documentElement.removeAttribute("data-theme-family");
  document.documentElement.removeAttribute("data-theme-selection-mode");
  document.documentElement.removeAttribute("data-theme-selection-family");
  document.documentElement.removeAttribute("data-theme-ready");
  delete (window as unknown as Record<string, unknown>).__THEMVORA_BOOTSTRAP__;
  // The script installs one observer per document and keeps it, so a previous
  // case's observer would otherwise still be attached here.
  (
    window as unknown as {
      __THEMVORA_READOUT_OBSERVER__?: { disconnect(): void };
    }
  ).__THEMVORA_READOUT_OBSERVER__?.disconnect();
  delete (window as unknown as Record<string, unknown>)
    .__THEMVORA_READOUT_OBSERVER__;
});

afterEach(() => {
  (
    window as unknown as {
      __THEMVORA_READOUT_OBSERVER__?: { disconnect(): void };
    }
  ).__THEMVORA_READOUT_OBSERVER__?.disconnect();
  delete (window as unknown as Record<string, unknown>)
    .__THEMVORA_READOUT_OBSERVER__;
  document.body.innerHTML = "";
});

describe("pre-paint control reconciliation", () => {
  it("writes the resolved theme's label and mode before paint", () => {
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "dark", family: "sunrise" }),
    );
    renderControls();

    run(createThemeBootstrapScript({ themes }));

    expect(text('[data-tv-readout="label"]')).toBe("Sunrise Dark");
    expect(text('[data-tv-readout="mode"]')).toBe("dark");
    expect(text('[data-tv-readout="theme"]')).toBe("sunrise-dark");
  });

  it("presses exactly the selected mode option", () => {
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "dark", family: "sunrise" }),
    );
    renderControls();

    run(createThemeBootstrapScript({ themes }));

    expect(pressed("mode", "dark")).toBe("true");
    expect(pressed("mode", "light")).toBe("false");
    expect(pressed("mode", "system")).toBe("false");
  });

  it("presses the family option that matches the selection", () => {
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "dark", family: "bare" }),
    );
    renderControls();

    run(createThemeBootstrapScript({ themes }));

    expect(pressed("family", "bare")).toBe("true");
    expect(pressed("family", "sunrise")).toBe("false");
  });

  it("presses `system` rather than the mode it resolved to", () => {
    // A `system` selection resolves to a concrete light/dark before anything is
    // painted. Pressing the resolved mode instead of the selection would leave
    // the button the visitor actually clicked unpressed.
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "system", family: "sunrise" }),
    );
    renderControls();

    run(createThemeBootstrapScript({ themes }));

    expect(
      document.documentElement.getAttribute("data-theme-mode"),
    ).toMatch(/light|dark/);
    expect(pressed("mode", "system")).toBe("true");
    expect(pressed("mode", "light")).toBe("false");
    expect(pressed("mode", "dark")).toBe("false");
  });

  it("selects only an option the <select> actually offers", () => {
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "dark", family: "bare" }),
    );
    renderControls();

    run(createThemeBootstrapScript({ themes }));

    // The first select offers `bare`, so it moves.
    expect(selected(0)).toBe("bare");
    // The second is a subset without it. Assigning `""` would leave it looking
    // broken rather than out of scope, so it keeps its first option.
    expect(selected(1)).toBe("sunrise");
  });

  it("leaves a label readout alone when the theme declares no label", () => {
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "dark", family: "bare" }),
    );
    document.body.innerHTML =
      '<span data-tv-readout="label">placeholder</span>';
    run(createThemeBootstrapScript({ themes }));

    // The element keeps what the caller rendered. Substituting `bare-dark` for
    // a human label would be a content change disguised as a fix.
    expect(text('[data-tv-readout="label"]')).toBe("placeholder");
  });

  it("is inert for controls the contract does not own", () => {
    window.localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "dark", family: "sunrise" }),
    );
    document.body.innerHTML = `
      <button data-tv-pressed="mode">no value</button>
      <button data-tv-pressed="nonsense" data-tv-value="x">unknown kind</button>
      <span data-tv-readout="nonsense">untouched</span>
    `;

    run(createThemeBootstrapScript({ themes }));

    // `aria-pressed="false"` is an assertion that the element is *not* the
    // selected option. For an element that represents nothing, it is a lie a
    // screen reader reads out, so it is never written.
    const buttons = document.querySelectorAll("button");
    expect(buttons[0]!.getAttribute("aria-pressed")).toBeNull();
    expect(buttons[1]!.getAttribute("aria-pressed")).toBeNull();
    expect(text('[data-tv-readout="nonsense"]')).toBe("untouched");
  });
});

describe("end-of-body control reconciliation", () => {
  it("agrees with the head script, from the published payload", () => {
    // The end-of-body script has no registry, so the label travels in the
    // payload. Without it a page whose `<head>` bootstrap was not injected
    // would settle the label after hydration — the flash, just later.
    (window as unknown as Record<string, unknown>).__THEMVORA_BOOTSTRAP__ = {
      theme: "sunrise-dark",
      mode: "dark",
      family: "sunrise",
      label: "Sunrise Dark",
      selection: { mode: "dark", family: "sunrise" },
    };
    renderControls();

    run(createThemeReadoutScript());

    expect(text('[data-tv-readout="label"]')).toBe("Sunrise Dark");
    expect(text('[data-tv-readout="mode"]')).toBe("dark");
    expect(pressed("mode", "dark")).toBe("true");
    expect(pressed("mode", "light")).toBe("false");
    expect(pressed("family", "sunrise")).toBe("true");
  });

  it("prefers the live <html> attributes over the payload", () => {
    // The payload describes the page as it was built; `<html>` describes what
    // the visitor is looking at. A client-side navigation re-executes this
    // script, and reading the payload there would revert every control to the
    // page-build default.
    (window as unknown as Record<string, unknown>).__THEMVORA_BOOTSTRAP__ = {
      theme: "sunrise-light",
      mode: "light",
      family: "sunrise",
      label: "Sunrise Light",
      selection: { mode: "light", family: "sunrise" },
    };
    document.documentElement.setAttribute("data-theme", "sunrise-dark");
    document.documentElement.setAttribute(
      "data-theme-selection-mode",
      "dark",
    );
    document.documentElement.setAttribute(
      "data-theme-selection-family",
      "sunrise",
    );
    renderControls();

    run(createThemeReadoutScript());

    expect(text('[data-tv-readout="mode"]')).toBe("dark");
    expect(pressed("mode", "dark")).toBe("true");
  });
});
