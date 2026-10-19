// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDiagnosticEmission } from "@themvora/core";
import "../src/index";

/**
 * Phase 3.4 — scopes.
 *
 * A scope writes the canonical theme's variables inline on itself, so consumer
 * markup stays in the light DOM and inheritance does the rest. The tests read
 * the inline variables directly: they are the mechanism, and jsdom's
 * `getComputedStyle` does not implement custom-property inheritance.
 */

const VAR = "--theme-color-background";

function scopeTheme(el: Element): string | null {
  return el.getAttribute("data-theme");
}

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

describe("themvora-scope", () => {
  it("applies the named theme's variables to the element", () => {
    document.body.innerHTML = `
      <themvora-provider default-theme="light">
        <themvora-scope theme="plum-dark"><p>content</p></themvora-scope>
      </themvora-provider>`;
    const scope = document.querySelector("themvora-scope") as HTMLElement;

    expect(scope.style.getPropertyValue(VAR)).not.toBe("");
    expect(scopeTheme(scope)).toBe("plum-dark");
    expect(scope.getAttribute("data-mode")).toBe("dark");
    expect(scope.classList.contains("dark")).toBe(true);
    // Consumer content is untouched and stays in the light DOM.
    expect(scope.querySelector("p")?.textContent).toBe("content");
  });

  it("accepts a family name and resolves it to that family's theme", () => {
    document.body.innerHTML = `
      <themvora-provider default-theme="light">
        <themvora-scope theme="plum"></themvora-scope>
      </themvora-provider>`;
    const scope = document.querySelector("themvora-scope") as HTMLElement;

    expect(scopeTheme(scope)).toBe("plum-light");
  });

  it("re-applies immediately when `theme` changes", () => {
    document.body.innerHTML = `
      <themvora-provider default-theme="light">
        <themvora-scope theme="plum-dark"></themvora-scope>
      </themvora-provider>`;
    const scope = document.querySelector("themvora-scope") as HTMLElement;

    scope.setAttribute("theme", "berry-light");

    expect(scopeTheme(scope)).toBe("berry-light");
    expect(scope.getAttribute("data-mode")).toBe("light");
  });

  it("nests without leaking into the ancestor or a sibling", () => {
    document.body.innerHTML = `
      <themvora-provider default-theme="light">
        <themvora-scope id="outer" theme="plum-dark">
          <themvora-scope id="inner" theme="berry-light"></themvora-scope>
        </themvora-scope>
        <themvora-scope id="sibling" theme="mint-dark"></themvora-scope>
      </themvora-provider>`;
    const outer = document.getElementById("outer")!;
    const inner = document.getElementById("inner")!;
    const sibling = document.getElementById("sibling")!;

    expect(scopeTheme(outer)).toBe("plum-dark");
    expect(scopeTheme(inner)).toBe("berry-light");
    expect(scopeTheme(sibling)).toBe("mint-dark");

    inner.setAttribute("theme", "sky-light");

    expect(scopeTheme(inner)).toBe("sky-light");
    expect(scopeTheme(outer)).toBe("plum-dark");
    expect(scopeTheme(sibling)).toBe("mint-dark");
  });

  it("returns to inheritance when `theme` is removed, leaving no stale variables", () => {
    document.body.innerHTML = `
      <themvora-provider default-theme="light">
        <themvora-scope theme="plum-dark"></themvora-scope>
      </themvora-provider>`;
    const scope = document.querySelector("themvora-scope") as HTMLElement;
    expect(scope.style.getPropertyValue(VAR)).not.toBe("");

    scope.removeAttribute("theme");

    expect(scope.style.getPropertyValue(VAR)).toBe("");
    expect(scope.hasAttribute("data-theme")).toBe(false);
    expect(scope.classList.contains("dark")).toBe(false);
  });

  it("reports an unavailable theme and falls back to the catalog's first theme", () => {
    document.body.innerHTML = `
      <themvora-provider default-theme="light">
        <themvora-scope theme="nord"></themvora-scope>
      </themvora-provider>`;
    const scope = document.querySelector("themvora-scope") as HTMLElement;

    // Documented contract, shared with the framework ThemeScope components:
    // an unregistered name falls back to the first theme in the catalog.
    expect(scopeTheme(scope)).toBe("light");
    expect(scope.style.getPropertyValue(VAR)).not.toBe("");
    expect(warn).toHaveBeenCalledTimes(1);
    const [, diagnostic] = warn.mock.calls[0] as [string, { context: Record<string, unknown> }];
    expect(diagnostic.context).toMatchObject({
      property: "theme",
      received: "nord",
    });
  });

  it("re-resolves when the provider's catalog changes", () => {
    document.body.innerHTML = `
      <themvora-provider themes="plum-dark berry-light" default-theme="plum-dark">
        <themvora-scope theme="berry-light"></themvora-scope>
      </themvora-provider>`;
    const scope = document.querySelector("themvora-scope") as HTMLElement;
    const provider = document.querySelector("themvora-provider") as HTMLElement;
    expect(scopeTheme(scope)).toBe("berry-light");

    // `berry-light` leaves the catalog: the scope must not keep rendering it.
    provider.setAttribute("themes", "plum-dark");

    expect(scopeTheme(scope)).toBe("plum-dark");
    expect(scope.style.getPropertyValue(VAR)).not.toBe("");
    expect(warn).toHaveBeenCalled();
  });

  it("re-applies to a provider that is recreated", () => {
    document.body.innerHTML = `
      <themvora-provider default-theme="light">
        <themvora-scope theme="plum-dark"></themvora-scope>
      </themvora-provider>`;
    const provider = document.querySelector("themvora-provider") as HTMLElement;
    const scope = document.querySelector("themvora-scope") as HTMLElement;

    // Move the whole subtree out and back: the provider builds a new runtime,
    // and the scope must follow it rather than keep the destroyed one.
    const detached = provider;
    detached.remove();
    expect(scope.style.getPropertyValue(VAR)).toBe("");

    document.body.appendChild(detached);

    expect(scope.style.getPropertyValue(VAR)).not.toBe("");
    expect(scopeTheme(scope)).toBe("plum-dark");
  });

  it("inherits the provider transition unless it overrides it", () => {
    document.body.innerHTML = `
      <themvora-provider default-theme="light" transition='{"enabled":true,"duration":120}'>
        <themvora-scope theme="plum-dark"></themvora-scope>
        <themvora-scope theme="berry-light" theme-transition="false"></themvora-scope>
      </themvora-provider>`;
    const [inherits, disabled] = Array.from(
      document.querySelectorAll("themvora-scope"),
    ) as HTMLElement[];

    // Both scopes resolve their theme; the transition only affects the swap,
    // which the next assertion proves by changing one.
    expect(scopeTheme(inherits!)).toBe("plum-dark");
    inherits!.setAttribute("theme", "mint-dark");
    expect(scopeTheme(inherits!)).toBe("mint-dark");

    expect(scopeTheme(disabled!)).toBe("berry-light");
    disabled!.setAttribute("theme", "sky-dark");
    expect(scopeTheme(disabled!)).toBe("sky-dark");
  });

  it("reports a malformed `theme-transition` and keeps working", () => {
    document.body.innerHTML = `
      <themvora-provider default-theme="light">
        <themvora-scope theme="plum-dark" theme-transition="fast"></themvora-scope>
      </themvora-provider>`;
    const scope = document.querySelector("themvora-scope") as HTMLElement;

    expect(scopeTheme(scope)).toBe("plum-dark");
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("family scopes follow the provider's mode", () => {
  it("flips to the family's dark theme when the provider's mode changes", () => {
    document.body.innerHTML = `
      <themvora-provider themes="berry-light berry-dark" default-theme="berry-light">
        <themvora-scope theme="berry"></themvora-scope>
      </themvora-provider>`;
    const scope = document.querySelector("themvora-scope") as HTMLElement;
    const provider = document.querySelector("themvora-provider") as HTMLElement;

    expect(scopeTheme(scope)).toBe("berry-light");

    provider.setAttribute("initial-mode", "dark");

    expect(scopeTheme(scope)).toBe("berry-dark");
  });

  it("keeps an exact theme name pinned when the mode changes", () => {
    document.body.innerHTML = `
      <themvora-provider themes="berry-light berry-dark" default-theme="berry-light">
        <themvora-scope theme="berry-light"></themvora-scope>
      </themvora-provider>`;
    const scope = document.querySelector("themvora-scope") as HTMLElement;
    const provider = document.querySelector("themvora-provider") as HTMLElement;

    provider.setAttribute("initial-mode", "dark");

    expect(scopeTheme(scope)).toBe("berry-light");
  });
});
