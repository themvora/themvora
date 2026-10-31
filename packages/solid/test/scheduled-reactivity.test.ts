// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "solid-js/web";
import { createComponent, createEffect } from "solid-js";
import { defineTheme, resetDiagnosticEmission, type ThemeDefinition } from "@themvora/core";
import { ThemeProvider, useEffectiveThemeMode, useTheme, useThemeMode } from "@themvora/solid";

/**
 * Solid parity for scheduled transitions.
 *
 * The core suite proves the runtime publishes the effective mode; this proves
 * the Solid signals pick it up, which is what a component renders. The clock is
 * deterministic — `getTimes` pins sunrise at 06:00 and sunset at 18:00 — so
 * nothing depends on the real sun.
 *
 * Written without JSX (the package's vitest config only collects `.test.ts`), so
 * the readout is an effect that records the five values a component would
 * render. That is the same reactive graph: if a signal does not update, the
 * recorded string does not change.
 */

const themes: ThemeDefinition[] = [
  defineTheme({ name: "solar-light", meta: { family: "solar", mode: "light" }, tokens: { colors: { background: "#fff" } } }),
  defineTheme({ name: "solar-dark", meta: { family: "solar", mode: "dark" }, tokens: { colors: { background: "#000" } } }),
];

function fixedTimes(date: Date) {
  const sunrise = new Date(date);
  sunrise.setHours(6, 0, 0, 0);
  const sunset = new Date(date);
  sunset.setHours(18, 0, 0, 0);
  return { sunrise, sunset };
}

const DAY = new Date("2025-06-21T12:00:00");
const NIGHT = new Date("2025-06-21T19:00:00");

let observed = "";

function Readout() {
  const { theme, mode, effectiveMode } = useTheme();
  const selectionMode = useThemeMode();
  const standalone = useEffectiveThemeMode();

  createEffect(() => {
    observed = `${theme().name}|${mode()}|${effectiveMode()}|${selectionMode()}|${standalone()}`;
  });

  return null;
}

function mount(initialMode: "light" | "system") {
  const host = document.createElement("div");
  document.body.appendChild(host);

  const dispose = render(
    () =>
      createComponent(ThemeProvider, {
        themes,
        initialFamily: "solar",
        initialMode,
        scheduled: { getTimes: fixedTimes, checkInterval: 60000 },
        dom: false,
        cssVariables: false,
        persistence: null,
        broadcast: null,
        transition: false,
        children: () => createComponent(Readout, {}) as unknown as Node,
      } as never),
    host,
  );

  return {
    read: () => observed,
    cleanup: () => {
      dispose();
      document.body.removeChild(host);
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
  observed = "";
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

afterEach(() => vi.useRealTimers());

describe("scheduled transitions re-render Solid", () => {
  it("moves the applied theme and both mode signals in both directions", () => {
    vi.setSystemTime(DAY);
    const ui = mount("system");

    try {
      expect(ui.read()).toBe("solar-light|system|light|system|light");

      tick(NIGHT);
      expect(ui.read()).toBe("solar-dark|system|dark|system|dark");

      tick(new Date("2025-06-22T12:00:00"));
      expect(ui.read()).toBe("solar-light|system|light|system|light");
    } finally {
      ui.cleanup();
    }
  });

  it("keeps a pinned configured mode through a transition", () => {
    vi.setSystemTime(DAY);
    const ui = mount("light");

    try {
      expect(ui.read()).toBe("solar-light|light|light|light|light");

      tick(NIGHT);
      expect(ui.read()).toBe("solar-dark|light|dark|light|dark");
    } finally {
      ui.cleanup();
    }
  });
});
