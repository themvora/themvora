// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createThemeBootstrapScript,
  getBuiltInThemes,
  resetDiagnosticEmission,
} from "@themvora/core";
import { getProviderRuntime } from "../src/utils";
import "../src/index";

/**
 * Phase 5 — initial rendering.
 *
 * Two guarantees are tested separately:
 *
 * 1. **Before first paint** — the supported zero-flash setup is the core
 *    bootstrap script, which paints `<html>` from the persisted selection
 *    before any module evaluates. The Web Components package must *adopt* that
 *    state, not immediately replace it with a different default.
 * 2. **After mount** — every later change applies without a reload.
 *
 * The script is executed here in the same order a browser runs it (before the
 * module), which is what makes the adoption assertion meaningful.
 */

const SELECTION_KEY = "theme-selection";

/** Resolves after two animation frames (the theme animation's swap frame). */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function runBootstrap(script: string) {
  // The generated script is an IIFE that touches `document`, `window` and
  // `localStorage` — all present in this environment, in that order of use.
  new Function(script)();
}

function mountProvider() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<themvora-provider default-theme="light" initial-mode="system"></themvora-provider>`,
  );
  return document.querySelector("themvora-provider") as HTMLElement;
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetDiagnosticEmission();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.clear();
  document.documentElement.removeAttribute("style");
  for (const attribute of [
    "data-theme",
    "data-theme-mode",
    "data-theme-family",
    "data-theme-selection-mode",
    "data-theme-selection-family",
    "data-theme-ready",
  ]) {
    document.documentElement.removeAttribute(attribute);
  }
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  document.body.innerHTML = "";
  warn.mockRestore();
  localStorage.clear();
});

describe("zero-flash bootstrap adoption", () => {
  it("adopts the theme the pre-paint script painted", () => {
    localStorage.setItem(
      SELECTION_KEY,
      JSON.stringify({ mode: "dark", family: "plum" }),
    );

    const script = createThemeBootstrapScript({
      themes: getBuiltInThemes(),
      defaultTheme: "light",
      initialMode: "system",
    });
    runBootstrap(script);

    const painted = document.documentElement.getAttribute("data-theme");
    expect(painted).toBe("plum-dark");
    expect(document.documentElement.getAttribute("data-theme-ready")).toBe("true");

    const el = mountProvider();
    const runtime = getProviderRuntime(el)!;

    // The client runtime resolves the same selection the script painted; it
    // does not fall back to its own default and flash the page.
    expect(String(runtime.store.get().name)).toBe(painted);
    expect(document.documentElement.getAttribute("data-theme")).toBe(painted);
  });

  it("keeps a `system` selection instead of downgrading it to a concrete mode", () => {
    localStorage.setItem(SELECTION_KEY, JSON.stringify({ mode: "system" }));

    runBootstrap(
      createThemeBootstrapScript({
        themes: getBuiltInThemes(),
        defaultTheme: "light",
        initialMode: "system",
      }),
    );
    expect(
      document.documentElement.getAttribute("data-theme-selection-mode"),
    ).toBe("system");

    const el = mountProvider();
    const runtime = getProviderRuntime(el)!;

    expect(runtime.selection.getMode()).toBe("system");
    expect(
      document.documentElement.getAttribute("data-theme-selection-mode"),
    ).toBe("system");
  });

  it("persists a selection made after mount, for the next load's script", () => {
    const el = mountProvider();
    const runtime = getProviderRuntime(el)!;

    runtime.selection.setMode("dark");

    expect(JSON.parse(localStorage.getItem(SELECTION_KEY)!)).toMatchObject({
      mode: "dark",
    });
  });

  it("updates after mount without a reload, with no bootstrap involved", async () => {
    const el = mountProvider();
    const runtime = getProviderRuntime(el)!;
    expect(String(runtime.store.get().name)).toBe("light");

    runtime.selection.setFamily("plum");
    expect(String(runtime.store.get().name)).toBe("plum-light");

    runtime.selection.setMode("dark");
    expect(String(runtime.store.get().name)).toBe("plum-dark");

    // Post-mount changes animate by default, so the root's attributes are
    // written on the animation's first frame rather than synchronously. The
    // *initial* application is synchronous (see the adoption test above), which
    // is what keeps first paint correct.
    await nextFrame();

    expect(document.documentElement.getAttribute("data-theme")).toBe("plum-dark");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("dark");
  });
});
