// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineTheme, resetDiagnosticEmission } from "@themvora/core";
import { getProviderRuntime } from "../src/utils";
import { observeEffectiveThemeMode, useEffectiveThemeMode, useThemeMode } from "../src/index";
import "../src/index";

/**
 * Web Components parity for scheduled transitions.
 *
 * The core suite proves the runtime publishes the effective mode; this proves
 * the framework-free accessors pick it up, which is what a vanilla consumer
 * renders. The clock is deterministic — `getTimes` pins sunrise at 06:00 and
 * sunset at 18:00 — so nothing depends on the real sun.
 */

const themes = [
  defineTheme({ name: "solar-light", meta: { family: "solar", mode: "light" }, tokens: { colors: { background: "#ffffff" } } }),
  defineTheme({ name: "solar-dark", meta: { family: "solar", mode: "dark" }, tokens: { colors: { background: "#000000" } } }),
];

const json = JSON.stringify(themes).replace(/"/g, "&quot;");

function fixedTimes(date: Date) {
  const sunrise = new Date(date);
  sunrise.setHours(6, 0, 0, 0);
  const sunset = new Date(date);
  sunset.setHours(18, 0, 0, 0);
  return { sunrise, sunset };
}

const DAY = new Date("2025-06-21T12:00:00");
const NIGHT = new Date("2025-06-21T19:00:00");

function mount(initialMode: "light" | "system") {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<themvora-provider themes="${json}" initial-family="solar" initial-mode="${initialMode}" persistence="none"></themvora-provider>`,
  );
  const el = document.querySelector("themvora-provider") as HTMLElement;
  const runtime = getProviderRuntime(el)!;

  runtime.configure({
    scheduled: { getTimes: fixedTimes, checkInterval: 60000 },
  });

  return {
    el,
    runtime,
    cleanup: () => {
      runtime.destroy();
      el.remove();
    },
  };
}

function tick(to: Date, ms = 60000) {
  vi.setSystemTime(to);
  vi.advanceTimersByTime(ms);
}

beforeEach(() => {
  vi.useFakeTimers();
  resetDiagnosticEmission();
  window.localStorage.clear();
  for (const attribute of [
    "data-theme",
    "data-theme-ready",
    "data-theme-mode",
    "data-theme-family",
    "data-theme-selection-mode",
    "data-theme-selection-family",
  ]) {
    document.documentElement.removeAttribute(attribute);
  }
});

afterEach(() => {
  vi.useRealTimers();
  document.querySelectorAll("themvora-provider").forEach((el) => el.remove());
});

describe("scheduled transitions update the framework-free accessors", () => {
  it("moves the applied theme and the effective mode in both directions", () => {
    vi.setSystemTime(DAY);
    const ui = mount("system");

    const seen: string[] = [];
    const stop = observeEffectiveThemeMode((selection) => {
      seen.push(`${selection.family}/${selection.mode}`);
    });

    try {
      expect(useEffectiveThemeMode()).toBe("light");
      expect(useThemeMode()).toBe("system");

      tick(NIGHT);
      expect(useEffectiveThemeMode()).toBe("dark");
      // The configured mode is the visitor's request and does not move.
      expect(useThemeMode()).toBe("system");

      tick(new Date("2025-06-22T12:00:00"));
      expect(useEffectiveThemeMode()).toBe("light");

      expect(seen).toEqual(["solar/dark", "solar/light"]);
    } finally {
      stop();
      ui.cleanup();
    }
  });

  it("keeps a pinned configured mode through a transition", () => {
    vi.setSystemTime(DAY);
    const ui = mount("light");

    try {
      expect(useEffectiveThemeMode()).toBe("light");
      expect(useThemeMode()).toBe("light");

      tick(NIGHT);

      expect(useEffectiveThemeMode()).toBe("dark");
      expect(useThemeMode()).toBe("light");
    } finally {
      ui.cleanup();
    }
  });
});
