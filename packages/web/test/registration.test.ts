// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDiagnosticEmission } from "@themvora/core";
import { getProviderRuntime } from "../src/utils";
import { COMPONENT_STYLE_ID, injectComponentStyles } from "../src/styles";

/**
 * Phase 1 — the package entry is the setup.
 *
 * Importing `@themvora/web` must register every built-in element and inject the
 * component stylesheet once, so a consumer writes semantic HTML and nothing
 * else. Registration has to survive repeated calls, duplicate evaluation and a
 * consumer that calls `defineCustomElements()` anyway.
 */

import "../src/index";
import { defineCustomElements } from "../src/index";

const TAGS = [
  "themvora-provider",
  "themvora-scope",
  "themvora-toggle",
  "themvora-select",
  "themvora-scrollbar",
  "themvora-inspector",
];

beforeEach(() => {
  resetDiagnosticEmission();
});

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

describe("package entry registration", () => {
  it("registers every built-in element on import", () => {
    for (const tag of TAGS) {
      expect(customElements.get(tag), `${tag} should be registered`).toBeTypeOf(
        "function",
      );
    }
  });

  it("is idempotent when the helper is called again", () => {
    const provider = customElements.get("themvora-provider");
    expect(() => defineCustomElements()).not.toThrow();
    expect(() => defineCustomElements()).not.toThrow();
    // Same constructor: nothing was redefined.
    expect(customElements.get("themvora-provider")).toBe(provider);
  });

  it("injects the component stylesheet exactly once", () => {
    injectComponentStyles();
    injectComponentStyles();
    const styles = document.querySelectorAll(`#${COMPONENT_STYLE_ID}`);
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain("themvora-toggle");
  });

  it("upgrades a provider written in static HTML", () => {
    document.body.innerHTML = `<themvora-provider default-theme="dark"><themvora-toggle></themvora-toggle></themvora-provider>`;
    const el = document.querySelector("themvora-provider") as HTMLElement;

    const runtime = getProviderRuntime(el);
    expect(runtime).toBeTruthy();
    expect(String(runtime?.store.get().name)).toBe("dark");

    // The toggle rendered itself from the provider it found on connect.
    const button = el.querySelector("themvora-toggle > button");
    expect(button).toBeTruthy();
  });
});
