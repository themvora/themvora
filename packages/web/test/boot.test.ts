// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineTheme } from "@themvora/core";
import { bootTheme, readBootConfig } from "../src/boot";

const themes = [
  defineTheme({
    name: "boot-light",
    meta: { family: "boot", mode: "light", label: "Boot Light" },
    tokens: { colors: { background: "#ffffff", foreground: "#111111" } },
  }),
  defineTheme({
    name: "boot-dark",
    meta: { family: "boot", mode: "dark", label: "Boot Dark" },
    tokens: { colors: { background: "#0b0b0f", foreground: "#f4f4f5" } },
  }),
  defineTheme({
    name: "plum-light",
    meta: { family: "plum", mode: "light" },
    tokens: { colors: { background: "#faf5ff", foreground: "#2e1065" } },
  }),
  defineTheme({
    name: "plum-dark",
    meta: { family: "plum", mode: "dark" },
    tokens: { colors: { background: "#2e1065", foreground: "#f3e8ff" } },
  }),
];

function resetRoot() {
  const root = document.documentElement;
  root.removeAttribute("style");
  for (const name of [
    "data-theme",
    "data-theme-mode",
    "data-theme-family",
    "data-theme-selection-mode",
    "data-theme-selection-family",
    "data-theme-ready",
  ]) {
    root.removeAttribute(name);
  }
  root.classList.remove("dark");
  delete (window as unknown as { __THEMVORA_BOOTSTRAP__?: unknown })
    .__THEMVORA_BOOTSTRAP__;
  delete (window as unknown as { __THEMVORA_CONFIG__?: unknown })
    .__THEMVORA_CONFIG__;
  document.getElementById("themvora-config")?.remove();
  localStorage.clear();
}

beforeEach(() => {
  resetRoot();
  (window as unknown as { matchMedia: (q: string) => { matches: boolean } })
    .matchMedia = () => ({ matches: false });
});

afterEach(() => {
  resetRoot();
});

describe("static boot asset", () => {
  it("restores a persisted non-default theme from the global config", () => {
    (window as unknown as { __THEMVORA_CONFIG__?: unknown }).__THEMVORA_CONFIG__ =
      {
        themes,
        defaultTheme: "boot-light",
        initialMode: "system",
      };
    localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "dark", family: "plum" }),
    );

    const applied = bootTheme();

    expect(applied?.theme).toBe("plum-dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "plum-dark",
    );
    expect(document.documentElement.getAttribute("data-theme-ready")).toBe(
      "true",
    );
    expect(
      document.documentElement.style.getPropertyValue("--theme-color-background"),
    ).toBe("#2e1065");
  });

  it("reads a JSON config block when no global is present", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<script type="application/json" id="themvora-config">${JSON.stringify({
        themes,
        defaultTheme: "boot-dark",
      })}</script>`,
    );

    expect(readBootConfig()?.defaultTheme).toBe("boot-dark");
    const applied = bootTheme();

    expect(applied?.theme).toBe("boot-dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does nothing without a configuration", () => {
    expect(bootTheme()).toBeNull();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("does not repaint when another boot already ran", () => {
    (window as unknown as { __THEMVORA_CONFIG__?: unknown }).__THEMVORA_CONFIG__ =
      { themes, defaultTheme: "boot-light" };
    bootTheme();

    localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "dark", family: "plum" }),
    );
    bootTheme();

    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "boot-light",
    );
  });
});
