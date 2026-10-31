// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DestroyRef, Injector, runInInjectionContext } from "@angular/core";
import { createThemeRuntime, defineTheme, resetDiagnosticEmission, type ThemeDefinition } from "@themvora/core";
import { injectEffectiveThemeMode, injectTheme } from "../src/lib/hooks";
import { THEME_RUNTIME } from "../src/lib/tokens";

/**
 * Angular parity for scheduled transitions.
 *
 * The core suite proves the runtime publishes the effective mode; this proves
 * the Angular signals pick it up, which is what a template renders. The clock is
 * deterministic — `getTimes` pins sunrise at 06:00 and sunset at 18:00 — so
 * nothing depends on the real sun.
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

function createRuntime(initialMode: "light" | "system") {
  return createThemeRuntime({
    themes,
    initialFamily: "solar",
    initialMode,
    scheduled: { getTimes: fixedTimes, checkInterval: 60000 },
    dom: false,
    cssVariables: false,
    persistence: null,
    broadcast: null,
    transition: false,
  });
}

function readout(runtime: ReturnType<typeof createRuntime>) {
  const injector = Injector.create({
    providers: [
      { provide: THEME_RUNTIME, useValue: runtime },
      { provide: DestroyRef, useValue: { onDestroy: () => {} } },
    ],
  });

  return runInInjectionContext(injector, () => {
    const state = injectTheme();
    const mode = injectEffectiveThemeMode();
    return () =>
      `${state().theme.name}|${state().mode}|${state().resolvedMode}|${mode()}`;
  });
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

afterEach(() => vi.useRealTimers());

describe("scheduled transitions re-render Angular signals", () => {
  it("moves the applied theme and resolvedMode in both directions", () => {
    vi.setSystemTime(DAY);
    const runtime = createRuntime("system");
    const read = readout(runtime);

    try {
      expect(read()).toBe("solar-light|system|light|light");

      tick(NIGHT);
      expect(read()).toBe("solar-dark|system|dark|dark");

      tick(new Date("2025-06-22T12:00:00"));
      expect(read()).toBe("solar-light|system|light|light");
    } finally {
      runtime.destroy();
    }
  });

  it("keeps a pinned configured mode through a transition", () => {
    vi.setSystemTime(DAY);
    const runtime = createRuntime("light");
    const read = readout(runtime);

    try {
      expect(read()).toBe("solar-light|light|light|light");

      tick(NIGHT);
      expect(read()).toBe("solar-dark|light|dark|dark");
    } finally {
      runtime.destroy();
    }
  });
});
