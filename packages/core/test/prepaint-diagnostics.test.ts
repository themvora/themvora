// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createThemeRuntime } from "../src/runtime";
import { defineTheme } from "../src/model";
import { resetDiagnosticEmission } from "../src/diagnostics";

const themes = [
  defineTheme({
    name: "diag-light",
    meta: { family: "diag", mode: "light" },
    tokens: { colors: { background: "#ffffff", foreground: "#111111" } },
  }),
  defineTheme({
    name: "diag-dark",
    meta: { family: "diag", mode: "dark" },
    tokens: { colors: { background: "#101014", foreground: "#f5f5f5" } },
  }),
];

let warn: ReturnType<typeof vi.spyOn>;

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
  document.body.innerHTML = "";
  delete (window as unknown as { __THEMVORA_BOOTSTRAP__?: unknown })
    .__THEMVORA_BOOTSTRAP__;
}

beforeEach(() => {
  resetDiagnosticEmission();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  resetRoot();
  // jsdom has no Paint Timing. Pretend the document has already painted.
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([
    { name: "first-paint" } as unknown as PerformanceEntry,
  ]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function codes(): string[] {
  return warn.mock.calls
    .map((call) => (call[1] as { code?: string } | undefined)?.code)
    .filter((code): code is string => typeof code === "string");
}

describe("pre-paint diagnostics", () => {
  it("reports a runtime that starts after paint with no pre-paint setup", () => {
    const runtime = createThemeRuntime({ themes });
    runtime.destroy();

    expect(codes()).toContain("TV_PREPAINT_MISSING");
  });

  it("does not report before the document has painted", () => {
    vi.mocked(performance.getEntriesByType).mockReturnValue([]);

    const runtime = createThemeRuntime({ themes });
    runtime.destroy();

    expect(codes()).not.toContain("TV_PREPAINT_MISSING");
  });

  it("reports a painted theme the registry cannot adopt", () => {
    document.documentElement.setAttribute("data-theme-ready", "true");
    document.documentElement.setAttribute("data-theme", "ghost-dark");

    const runtime = createThemeRuntime({ themes });
    runtime.destroy();

    expect(codes()).toContain("TV_PREPAINT_MISMATCH");
    expect(codes()).not.toContain("TV_PREPAINT_MISSING");
  });

  it("does not repeat the warning for a second provider", () => {
    const first = createThemeRuntime({ themes });
    first.destroy();
    const second = createThemeRuntime({ themes });
    second.destroy();

    expect(
      codes().filter((code) => code === "TV_PREPAINT_MISSING"),
    ).toHaveLength(1);
  });

  it("stays quiet when the bootstrap marker is present", () => {
    document.documentElement.setAttribute("data-theme-ready", "true");
    document.documentElement.setAttribute("data-theme", "diag-light");
    document.documentElement.setAttribute("data-theme-selection-mode", "light");
    document.documentElement.setAttribute("data-theme-selection-family", "diag");
    (window as unknown as { __THEMVORA_BOOTSTRAP__?: unknown })
      .__THEMVORA_BOOTSTRAP__ = {
      theme: "diag-light",
      mode: "light",
      family: "diag",
      label: null,
      selection: { mode: "light", family: "diag" },
    };

    const runtime = createThemeRuntime({ themes });
    runtime.destroy();

    expect(codes()).not.toContain("TV_PREPAINT_MISSING");
    expect(codes()).not.toContain("TV_PREPAINT_MISMATCH");
  });
});
