// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineTheme, resetDiagnosticEmission, type ThemeDefinition } from "@themvora/core";
import { ThemeProvider, ThemeModeButton, useTheme, useThemeMode } from "../src";

/**
 * A scheduled transition must repaint the UI, not just the document.
 *
 * The reported failure was exactly this: with `scheduled={{ enabled: true }}`
 * the page flipped light ⇄ dark at the right time, but the control that stated
 * the current mode kept showing the old one until a reload. Nothing here touches
 * the DOM bindings — `dom: false` — so the assertions can only pass if React
 * re-rendered from the runtime's own reactive API.
 *
 * The clock is deterministic: `getTimes` pins sunrise at 06:00 and sunset at
 * 18:00, and timers are faked. No test waits for the real sun.
 */

const theme = (name: string, mode: "light" | "dark"): ThemeDefinition =>
  defineTheme({
    name,
    meta: { family: "solar", mode },
    tokens: { colors: { background: mode === "dark" ? "#000" : "#fff" } },
  }) as ThemeDefinition;

const catalog = [theme("solar-light", "light"), theme("solar-dark", "dark")];

function fixedTimes(date: Date) {
  const sunrise = new Date(date);
  sunrise.setHours(6, 0, 0, 0);
  const sunset = new Date(date);
  sunset.setHours(18, 0, 0, 0);
  return { sunrise, sunset };
}

const base = { dom: false, cssVariables: false, broadcast: null } as const;

const DAY = new Date("2025-06-21T12:00:00");
const NIGHT = new Date("2025-06-21T19:00:00");

let mounts = 0;

/** States the applied theme and both modes, and counts its own mounts. */
function Readout() {
  const { theme: active, mode, effectiveMode } = useTheme();
  const selectionMode = useThemeMode();

  useEffect(() => {
    mounts += 1;
  }, []);

  return (
    <p data-testid="readout">
      {active.name}|{mode}|{effectiveMode}|{selectionMode}
    </p>
  );
}

function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const render = (element: React.ReactNode) => {
    act(() => {
      root.render(element);
    });
  };

  return {
    render,
    read: () => container.querySelector('[data-testid="readout"]')!.textContent,
    cleanup: () => {
      act(() => root.unmount());
      document.body.removeChild(container);
    },
  };
}

/** Advance the fake clock and let React flush the resulting re-render. */
function tick(to: Date, ms = 60000) {
  vi.setSystemTime(to);
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mounts = 0;
  window.localStorage.clear();
  document.getElementById("themvora-bootstrap")?.remove();
  // The pre-paint bootstrap writes the resolved selection onto `<html>`, and the
  // runtime adopts it on creation. A leftover attribute from the previous test
  // would therefore decide the next test's initial mode — the DOM is the
  // authority by design, so it has to be reset between tests.
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
  document.documentElement.classList.remove("dark");
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: undefined,
  });
});

afterEach(() => {
  vi.useRealTimers();
  resetDiagnosticEmission();
  window.localStorage.clear();
  document.getElementById("themvora-bootstrap")?.remove();
});

describe("scheduled transitions re-render React", () => {
  it("moves the applied theme and the mode label in both directions", () => {
    vi.setSystemTime(DAY);
    const ui = mount();

    ui.render(
      <ThemeProvider
        {...(base as never)}
        themes={catalog}
        initialFamily="solar"
        initialMode="system"
        scheduled={{ getTimes: fixedTimes, checkInterval: 60000 }}
      >
        <Readout />
      </ThemeProvider>,
    );

    expect(ui.read()).toBe("solar-light|system|light|system");

    tick(NIGHT);
    expect(ui.read()).toBe("solar-dark|system|dark|system");

    tick(new Date("2025-06-22T12:00:00"));
    expect(ui.read()).toBe("solar-light|system|light|system");

    ui.cleanup();
  });

  it("keeps the configured mode when it is pinned", () => {
    vi.setSystemTime(DAY);
    const ui = mount();

    ui.render(
      <ThemeProvider
        {...(base as never)}
        themes={catalog}
        initialFamily="solar"
        initialMode="light"
        scheduled={{ getTimes: fixedTimes, checkInterval: 60000 }}
      >
        <Readout />
      </ThemeProvider>,
    );

    expect(ui.read()).toBe("solar-light|light|light|light");

    tick(NIGHT);

    // The theme and the effective mode follow the schedule; the configured mode
    // stays what the visitor asked for, so their next explicit choice is not
    // silently built on a mode a sunset changed.
    expect(ui.read()).toBe("solar-dark|light|dark|light");

    ui.cleanup();
  });

  it("does not remount or reload to update", () => {
    vi.setSystemTime(DAY);
    const ui = mount();

    ui.render(
      <ThemeProvider
        {...(base as never)}
        themes={catalog}
        initialFamily="solar"
        initialMode="system"
        scheduled={{ getTimes: fixedTimes, checkInterval: 60000 }}
      >
        <Readout />
      </ThemeProvider>,
    );

    expect(mounts).toBe(1);

    tick(NIGHT);
    tick(new Date("2025-06-22T12:00:00"));

    expect(mounts).toBe(1);
    ui.cleanup();
  });

  it("follows a toggle made while the schedule is running", () => {
    vi.setSystemTime(NIGHT);
    const ui = mount();

    function Toggle() {
      const { toggleTheme } = useTheme();
      return (
        <button type="button" data-testid="toggle" onClick={toggleTheme}>
          toggle
        </button>
      );
    }

    ui.render(
      <ThemeProvider
        {...(base as never)}
        themes={catalog}
        initialFamily="solar"
        initialMode="system"
        scheduled={{ getTimes: fixedTimes, checkInterval: 60000 }}
      >
        <Readout />
        <Toggle />
      </ThemeProvider>,
    );

    expect(ui.read()).toBe("solar-dark|system|dark|system");

    act(() => {
      (document.querySelector('[data-testid="toggle"]') as HTMLButtonElement).click();
    });

    // Toggling pins the opposite of what is on screen, so the label follows.
    expect(ui.read()).toBe("solar-light|light|light|light");

    ui.cleanup();
  });

  it("updates the shipped ThemeModeButton label on a transition", () => {
    vi.setSystemTime(DAY);
    const ui = mount();

    ui.render(
      <ThemeProvider
        {...(base as never)}
        themes={catalog}
        initialFamily="solar"
        initialMode="system"
        scheduled={{ getTimes: fixedTimes, checkInterval: 60000 }}
      >
        <ThemeModeButton />
      </ThemeProvider>,
    );

    const label = () => document.querySelector("button")!.textContent;

    // This is the exact control that stayed stale: it renders the current mode,
    // and with `mode: "system"` the configured value never moves, so binding it
    // to `useThemeMode()` left it announcing "system" forever.
    expect(label()).toBe("Mode: light (system)");

    tick(NIGHT);
    expect(label()).toBe("Mode: dark (system)");

    tick(new Date("2025-06-22T12:00:00"));
    expect(label()).toBe("Mode: light (system)");

    ui.cleanup();
  });
});
