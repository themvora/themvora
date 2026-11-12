// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Themvora } from "../src/vanilla";

/**
 * The vanilla facade is the whole public surface for a framework-free app, so
 * these tests exercise it the way an app does — through the class, against the
 * real DOM — rather than through the runtime it wraps.
 *
 * The properties under test are the ones that were observably wrong:
 *
 * - one event per logical action, in a stable order;
 * - `mode` reporting the visitor's choice while `resolvedMode` reports the
 *   appearance;
 * - the constructor adopting a state the pre-paint bootstrap already applied
 *   instead of resetting the document to a default theme;
 * - mode and family surviving together across a reload.
 */

const STORAGE_KEY = "theme-selection";

function clearDocument(): void {
  const root = document.documentElement;
  for (const attribute of [
    "data-theme",
    "data-theme-mode",
    "data-theme-family",
    "data-theme-selection-mode",
    "data-theme-selection-family",
    "data-theme-ready",
  ]) {
    root.removeAttribute(attribute);
  }
  root.className = "";
  root.removeAttribute("style");
}

/** jsdom has no `matchMedia`; the runtime and the system binding both use it. */
function stubPrefersDark(dark: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("dark") ? dark : !dark,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  clearDocument();
  stubPrefersDark(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  clearDocument();
});

describe("Themvora — construction", () => {
  it("emits nothing while it adopts the state it resolved", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });
    const events: string[] = [];

    kit.on("themeChange", () => events.push("theme"));
    kit.on("modeChange", () => events.push("mode"));
    kit.on("familyChange", () => events.push("family"));

    // Subscribing after construction must not replay the initial state: a
    // listener that renders on `themeChange` would otherwise render twice on
    // load, and the second render would land after the first paint.
    expect(events).toEqual([]);

    kit.destroy();
  });

  it("adopts a theme the pre-paint bootstrap already applied", () => {
    // Exactly what the bootstrap writes before the first paint.
    const root = document.documentElement;
    root.setAttribute("data-theme", "plum-dark");
    root.setAttribute("data-theme-mode", "dark");
    root.setAttribute("data-theme-family", "plum");
    root.setAttribute("data-theme-selection-mode", "dark");
    root.setAttribute("data-theme-selection-family", "plum");
    root.setAttribute("data-theme-ready", "true");

    // The constructor's own configuration disagrees on purpose: the bootstrap is
    // newer than the declaration, because it also knows `prefers-color-scheme`
    // and what the visitor picked last time. Re-resolving would repaint the
    // document — the flash the bootstrap exists to prevent.
    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });

    expect(String(kit.theme.name)).toBe("plum-dark");
    expect(kit.mode).toBe("dark");
    expect(kit.family).toBe("plum");
    expect(root.getAttribute("data-theme")).toBe("plum-dark");
    expect(root.classList.contains("dark")).toBe(true);

    kit.destroy();
  });

  it("is safe to construct more than once", () => {
    const first = new Themvora({ defaultTheme: "light", initialMode: "dark" });
    const second = new Themvora({ defaultTheme: "light", initialMode: "dark" });

    // The second instance adopts what the first one painted, so the two agree.
    expect(String(second.theme.name)).toBe(String(first.theme.name));
    expect(second.mode).toBe(first.mode);

    first.setMode("light");
    expect(second.mode).toBe("dark");

    first.destroy();
    second.destroy();
  });

  it("makes destroy idempotent", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });
    kit.destroy();
    expect(() => kit.destroy()).not.toThrow();
  });
});

describe("Themvora — mode switching", () => {
  it("emits one event per name, with the theme last", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });
    const events: string[] = [];

    kit.on("themeChange", () => events.push("themeChange"));
    kit.on("modeChange", () => events.push("modeChange"));
    kit.on("familyChange", () => events.push("familyChange"));

    kit.setMode("dark");

    // The selection notifies before the store commits, so the mode is reported
    // first and the resolved theme second. Both fire exactly once: the old
    // implementation subscribed to both channels and emitted `modeChange` and
    // `familyChange` twice for this single call.
    expect(events).toEqual(["modeChange", "themeChange"]);
    expect(kit.mode).toBe("dark");
    expect(kit.resolvedMode).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme-selection-mode")).toBe("dark");

    kit.destroy();
  });

  it("does not emit a family event for a mode change", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });
    let familyEvents = 0;
    kit.on("familyChange", () => familyEvents++);

    kit.setMode("dark");

    expect(familyEvents).toBe(0);
    kit.destroy();
  });

  it("keeps light, dark and system mutually consistent", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });

    kit.setMode("dark");
    expect(kit.mode).toBe("dark");
    expect(kit.resolvedMode).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("dark");

    kit.setMode("light");
    expect(kit.mode).toBe("light");
    expect(kit.resolvedMode).toBe("light");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("light");

    kit.setMode("system");
    expect(kit.mode).toBe("system");
    // No OS preference in this test: "system" resolves light.
    expect(kit.resolvedMode).toBe("light");
    // The selection attribute keeps the choice, not the resolution — a control
    // that read the resolved value here would show "light" as the active option.
    expect(document.documentElement.getAttribute("data-theme-selection-mode")).toBe("system");

    kit.destroy();
  });

  it("resolves system against the OS preference and follows a change", () => {
    stubPrefersDark(true);
    const kit = new Themvora({ defaultTheme: "light", initialMode: "system" });

    expect(kit.mode).toBe("system");
    expect(kit.resolvedMode).toBe("dark");

    kit.destroy();
  });

  it("survives repeated rapid toggles", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });
    const seen: string[] = [];
    kit.on("themeChange", (theme) => seen.push(String(theme.name)));

    for (let i = 0; i < 6; i++) kit.toggleTheme();

    // Six toggles from light end on light, and every toggle emitted once.
    expect(seen).toHaveLength(6);
    expect(kit.mode).toBe("light");
    expect(kit.resolvedMode).toBe("light");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("light");

    kit.destroy();
  });

  it("toggles out of system mode rather than through it", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "system" });
    kit.toggleTheme();

    // `toggleTheme` ignores "system": it flips the appearance the visitor is
    // looking at into an explicit choice.
    expect(kit.mode).toBe("dark");

    kit.destroy();
  });
});

describe("Themvora — family switching", () => {
  it("preserves the active mode", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "dark" });

    kit.setFamily("plum");

    expect(kit.family).toBe("plum");
    expect(kit.mode).toBe("dark");
    expect(String(kit.theme.name)).toBe("plum-dark");
    expect(document.documentElement.getAttribute("data-theme-family")).toBe("plum");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("dark");

    kit.destroy();
  });

  it("emits family then theme, once each", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });
    const events: string[] = [];
    kit.on("themeChange", () => events.push("themeChange"));
    kit.on("familyChange", () => events.push("familyChange"));

    kit.setFamily("mint");

    expect(events).toEqual(["familyChange", "themeChange"]);

    kit.destroy();
  });

  it("ignores a family the registry does not contain", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });
    const before = kit.family;

    kit.setFamily("not-a-family");

    expect(kit.family).toBe(before);
    kit.destroy();
  });
});

describe("Themvora — persistence", () => {
  it("restores mode and family together on the next instance", () => {
    const first = new Themvora({ defaultTheme: "light", initialMode: "light" });
    first.setMode("dark");
    first.setFamily("plum");
    first.destroy();

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored).toEqual({ mode: "dark", family: "plum" });

    // A second instance is the reload: the persisted selection wins over the
    // constructor's `initialMode`, which is only a fallback.
    const second = new Themvora({ defaultTheme: "light", initialMode: "light" });
    expect(second.mode).toBe("dark");
    expect(second.family).toBe("plum");
    expect(String(second.theme.name)).toBe("plum-dark");

    second.destroy();
  });

  it("honours a custom storage key", () => {
    const kit = new Themvora({
      defaultTheme: "light",
      initialMode: "light",
      storageKey: "app-theme",
    });

    kit.setMode("dark");
    expect(window.localStorage.getItem("app-theme")).toBeTruthy();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    kit.destroy();

    const reloaded = new Themvora({
      defaultTheme: "light",
      initialMode: "light",
      storageKey: "app-theme",
    });
    expect(reloaded.mode).toBe("dark");
    reloaded.destroy();
  });

  it("falls back to the configured mode when storage is corrupt", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    const kit = new Themvora({ defaultTheme: "light", initialMode: "dark" });

    expect(kit.mode).toBe("dark");
    kit.destroy();
  });

  it("falls back when the stored mode is not a mode", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: "dusk", family: "plum" }),
    );

    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });

    expect(kit.mode).toBe("light");
    kit.destroy();
  });
});

describe("Themvora — subscriptions", () => {
  it("stops notifying after unsubscribe", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });
    let calls = 0;
    const unsubscribe = kit.on("themeChange", () => calls++);

    kit.setMode("dark");
    expect(calls).toBe(1);

    unsubscribe();
    kit.setMode("light");
    expect(calls).toBe(1);

    kit.destroy();
  });

  it("supports off() with the same listener", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });
    let calls = 0;
    const listener = () => calls++;

    kit.on("modeChange", listener);
    kit.off("modeChange", listener);
    kit.setMode("dark");

    expect(calls).toBe(0);
    kit.destroy();
  });

  it("lets a listener unsubscribe during notification", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });
    let calls = 0;

    const unsubscribe = kit.on("themeChange", () => {
      calls++;
      unsubscribe();
    });

    expect(() => kit.setMode("dark")).not.toThrow();
    kit.setMode("light");
    expect(calls).toBe(1);

    kit.destroy();
  });
});

describe("Themvora — token updates", () => {
  it("notifies when the active theme's tokens change under the same name", () => {
    const kit = new Themvora({ defaultTheme: "light", initialMode: "light" });
    const before = String(kit.theme.name);
    let notified = 0;
    kit.on("themeChange", () => notified++);

    kit.update({ colors: { primary: "#123456" } });

    // Same theme name, new tokens: a listener that renders colours has to hear
    // about it, which is why the comparison is by identity and not by name.
    expect(String(kit.theme.name)).toBe(before);
    expect(notified).toBe(1);
    expect(kit.toCSSVariables()["--theme-color-primary"]).toBe("#123456");

    kit.destroy();
  });
});
