// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCSSVariablesBinding,
  createDOMBinding,
  createThemeRuntime,
  createThemeStore,
  defineTheme,
  resetDiagnosticEmission,
  type ThemeDefinition,
} from "../src";

/**
 * Live runtime configuration: `transition` and `scheduled` are part of the
 * runtime's live contract. Changing either after mount must reconcile the
 * running runtime in place — never rebuild it, never reset the active theme or
 * history, and never leave stale styles/timers behind.
 */

const light = defineTheme({
  name: "mint-light",
  meta: { family: "mint", mode: "light", label: "Mint Light" },
  tokens: { colors: { background: "#f8fafc", card: "#ffffff", primary: "#059669" } },
});

const dark = defineTheme({
  name: "mint-dark",
  meta: { family: "mint", mode: "dark", label: "Mint Dark" },
  tokens: { colors: { background: "#020617", card: "#0f172a", primary: "#10b981" } },
});

const plumLight = defineTheme({
  name: "plum-light",
  meta: { family: "plum", mode: "light", label: "Plum Light" },
  tokens: { colors: { background: "#faf5ff", primary: "#7c3aed" } },
});

const plumDark = defineTheme({
  name: "plum-dark",
  meta: { family: "plum", mode: "dark", label: "Plum Dark" },
  tokens: { colors: { background: "#1e1b4b", primary: "#a78bfa" } },
});

const themes: ThemeDefinition[] = [light, dark, plumLight, plumDark];

const baseOptions = {
  themes,
  defaultTheme: "mint-light",
  persistence: null,
  broadcast: null,
} as const;

function flushFrames(count = 2) {
  const frames: Promise<void>[] = [];
  for (let i = 0; i < count; i++) {
    frames.push(new Promise((r) => requestAnimationFrame(() => r())));
  }
  return Promise.all(frames);
}

function cleanupDocument() {
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-mode");
  document.documentElement.removeAttribute("data-theme-family");
  document.documentElement.removeAttribute("data-themvora-animating");
  document.documentElement.classList.remove("dark");
  document.body.innerHTML = "";
  // Only the *persistent* coordinator stylesheets are removed here. Transient
  // `transition:none` overrides are owned by a deferred `requestAnimationFrame`
  // removal — detaching them early makes that ownership assert fail.
  document.head
    .querySelectorAll(
      "style[data-themvora-transition],style[data-themvora-animating-style]",
    )
    .forEach((node) => node.remove());
}

/** Number of transient `transition:none` override nodes currently in `<head>`. */
function suppressionNodeCount(): number {
  return [...document.head.querySelectorAll("style")].filter((node) =>
    node.textContent?.includes("transition:none"),
  ).length;
}

beforeEach(() => {
  resetDiagnosticEmission();
  cleanupDocument();
});

afterEach(() => {
  resetDiagnosticEmission();
  vi.restoreAllMocks();
  vi.useRealTimers();
  cleanupDocument();
});

// ---------------------------------------------------------------------------
// Transition
// ---------------------------------------------------------------------------

describe("runtime.configure — transition", () => {
  it("reflects the creation option and applies a live update without touching the theme", () => {
    const runtime = createThemeRuntime({
      ...baseOptions,
      transition: { enabled: true, duration: 300 },
    });

    expect(runtime.transition?.duration).toBe(300);
    const historyBefore = runtime.history.getHistory().length;

    runtime.configure({ transition: { enabled: true, duration: 900 } });

    expect(runtime.transition?.duration).toBe(900);
    // A transition change is not a theme change: selection, store and history
    // must be untouched.
    expect(runtime.store.get().name).toBe("mint-light");
    expect(runtime.history.getHistory().length).toBe(historyBefore);

    runtime.destroy();
  });

  it("uses the updated duration for the next suppression window", async () => {
    const runtime = createThemeRuntime({
      ...baseOptions,
      transition: { enabled: true, duration: 300 },
    });

    runtime.configure({ transition: { enabled: true, duration: 900 } });

    // The configured duration is no longer a CSS interpolation length — it is
    // how long descendant transitions stay muted around the atomic swap, so a
    // live change has to reach that timer.
    const timer = vi.spyOn(globalThis, "setTimeout");
    try {
      runtime.selection.toggleTheme();

      expect(timer.mock.calls.map((call) => call[1])).toContain(900);
      expect(document.documentElement.style.transition).toBe("");
      expect(
        document.documentElement.hasAttribute("data-themvora-animating"),
      ).toBe(true);
    } finally {
      timer.mockRestore();
    }

    runtime.destroy();
    await flushFrames();
  });

  it("disables transitions after mount and releases every transition style", async () => {
    const runtime = createThemeRuntime({
      ...baseOptions,
      transition: { enabled: true, duration: 300 },
    });

    // An animated change opens a suppression window — and never installs the
    // persistent `:root` interpolation rule the old fallback used.
    runtime.selection.toggleTheme();
    expect(
      document.documentElement.hasAttribute("data-themvora-animating"),
    ).toBe(true);
    expect(document.head.querySelector("style[data-themvora-transition]")).toBeNull();
    await flushFrames();

    runtime.configure({ transition: false });

    expect(runtime.transition?.enabled).toBe(false);
    // Everything the window owned is gone: a stale rule would keep easing later
    // swaps, and a stale attribute would keep muting descendants forever.
    expect(document.head.querySelector("style[data-themvora-transition]")).toBeNull();
    expect(
      document.head.querySelector("style[data-themvora-animating-style]"),
    ).toBeNull();
    expect(
      document.documentElement.hasAttribute("data-themvora-animating"),
    ).toBe(false);
    expect(document.documentElement.style.transition).toBe("");

    // The next change is immediate: no suppression window opens at all.
    runtime.selection.toggleTheme();
    expect(
      document.documentElement.hasAttribute("data-themvora-animating"),
    ).toBe(false);
    expect(document.documentElement.style.transition).toBe("");

    runtime.destroy();
    await flushFrames();
  });

  it("is a no-op when an equivalent configuration is supplied again", () => {
    const runtime = createThemeRuntime({
      ...baseOptions,
      transition: { enabled: true, duration: 300 },
    });

    runtime.configure({ transition: { enabled: true, duration: 900 } });
    const applied = runtime.transition;

    // A fresh object with the same values must not re-apply (identity proves the
    // reconciler short-circuited rather than rewriting the same options).
    runtime.configure({ transition: { enabled: true, duration: 900 } });
    expect(runtime.transition).toBe(applied);

    runtime.destroy();
  });

  it("does not emit a theme-change event for a transition-only update", () => {
    const runtime = createThemeRuntime({
      ...baseOptions,
      transition: { enabled: true },
    });

    const events: unknown[] = [];
    runtime.lifecycle.on("afterThemeChange", (event) => events.push(event));

    runtime.configure({ transition: { enabled: true, duration: 500 } });
    runtime.configure({ transition: { duration: 640 } });

    expect(events).toEqual([]);
    runtime.destroy();
  });

  it("reports an unusable duration and keeps the previous setting", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const runtime = createThemeRuntime({
      ...baseOptions,
      transition: { enabled: true, duration: 300 },
    });

    runtime.configure({ transition: { duration: -5 } });

    expect(runtime.transition?.duration).toBe(300);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![1]).toMatchObject({
      code: "TV_CONFIG_OPTION_INVALID",
      context: { property: "transition.duration", received: -5 },
    });

    runtime.destroy();
  });
});

describe("createCSSVariablesBinding.setTransition", () => {
  it("changes subsequent windows and releases styles when disabled", async () => {
    const store = createThemeStore<ThemeDefinition>({ initialTheme: light });
    const binding = createCSSVariablesBinding(store, {
      transition: { enabled: true, duration: 300 },
    })!;

    // Each change swaps atomically; the duration only sizes the mute window.
    const first = vi.spyOn(globalThis, "setTimeout");
    store.set(dark);
    expect(first.mock.calls.map((call) => call[1])).toContain(300);
    expect(document.documentElement.style.transition).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--theme-color-background"),
    ).toBe(dark.tokens.colors.background);
    first.mockRestore();
    await flushFrames();

    binding.setTransition({ enabled: true, duration: 700 });
    const second = vi.spyOn(globalThis, "setTimeout");
    store.set(light);
    expect(second.mock.calls.map((call) => call[1])).toContain(700);
    expect(document.documentElement.style.transition).toBe("");
    second.mockRestore();
    await flushFrames();

    binding.setTransition({ enabled: false });
    expect(document.head.querySelector("style[data-themvora-transition]")).toBeNull();
    expect(
      document.head.querySelector("style[data-themvora-animating-style]"),
    ).toBeNull();
    expect(
      document.documentElement.hasAttribute("data-themvora-animating"),
    ).toBe(false);
    expect(document.documentElement.style.transition).toBe("");

    binding.destroy();
  });
});

describe("createDOMBinding.setTransition", () => {
  it("toggles the instant-switch suppression override", async () => {
    const store = createThemeStore<ThemeDefinition>({ initialTheme: light });
    const binding = createDOMBinding(store, { transition: { enabled: true } })!;
    await flushFrames();

    const before = suppressionNodeCount();
    store.set(dark);
    expect(suppressionNodeCount()).toBe(before);

    binding.setTransition({ enabled: false });
    store.set(light);
    expect(suppressionNodeCount()).toBe(before + 1);

    binding.destroy();
  });
});

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

describe("runtime.configure — scheduled", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-21T14:00:00"));
  });

  it("installs a schedule after mount, reconfigures it in place, then removes it", () => {
    const runtime = createThemeRuntime({ ...baseOptions, dom: false, cssVariables: false });

    expect(runtime.schedule).toBeNull();

    runtime.configure({
      scheduled: { lightTheme: "mint-light", darkTheme: "mint-dark", latitude: 40.7, longitude: -74 },
    });
    expect(runtime.schedule).not.toBeNull();
    expect(runtime.schedule?.lightTheme).toBe("mint-light");

    // Reconfiguring reuses the same controller (it is handed to `set()`), so a
    // framework that subscribed to it once keeps working.
    const handle = runtime.schedule;
    runtime.configure({
      scheduled: { lightTheme: "plum-light", darkTheme: "plum-dark", latitude: 40.7, longitude: -74 },
    });
    expect(runtime.schedule).toBe(handle);
    expect(runtime.schedule?.lightTheme).toBe("plum-light");

    runtime.configure({ scheduled: false });
    expect(runtime.schedule).toBeNull();

    runtime.destroy();
  });

  it("does not reset theme history on a scheduling-only update", () => {
    const runtime = createThemeRuntime({ ...baseOptions, dom: false, cssVariables: false });
    const before = runtime.history.getHistory().map((entry) => entry.theme.name);

    runtime.configure({
      scheduled: { lightTheme: "mint-light", darkTheme: "mint-dark", latitude: 40.7, longitude: -74 },
    });

    const after = runtime.history.getHistory().map((entry) => entry.theme.name);
    expect(after.slice(0, before.length)).toEqual(before);

    runtime.destroy();
  });

  it("is idempotent for equivalent values and never stacks schedulers", () => {
    const runtime = createThemeRuntime({ ...baseOptions, dom: false, cssVariables: false });

    const config = {
      lightTheme: "mint-light",
      darkTheme: "mint-dark",
      latitude: 40.7,
      longitude: -74,
      checkInterval: 30_000,
    };
    runtime.configure({ scheduled: config });
    const timersAfterInstall = vi.getTimerCount();

    runtime.configure({ scheduled: { ...config } });
    runtime.configure({ scheduled: { ...config } });

    expect(vi.getTimerCount()).toBe(timersAfterInstall);

    runtime.destroy();
  });

  it("reports an unusable schedule option and does not install it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const runtime = createThemeRuntime({ ...baseOptions, dom: false, cssVariables: false });

    runtime.configure({ scheduled: { checkInterval: 0 } });

    expect(runtime.schedule).toBeNull();
    expect(warn.mock.calls[0]![1]).toMatchObject({
      code: "TV_CONFIG_OPTION_INVALID",
      context: { property: "scheduled.checkInterval", received: 0 },
    });

    runtime.destroy();
  });

  it("warns when the schedule names themes that are not registered", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const runtime = createThemeRuntime({ ...baseOptions, dom: false, cssVariables: false });

    runtime.configure({ scheduled: { lightTheme: "ghost-light", darkTheme: "ghost-dark" } });

    expect(warn.mock.calls[0]![1]).toMatchObject({
      code: "TV_SCHEDULE_THEME_UNRESOLVED",
      context: { property: "scheduled" },
    });

    runtime.destroy();
  });

  it("leaves the schedule untouched when the update omits it", () => {
    const runtime = createThemeRuntime({
      ...baseOptions,
      dom: false,
      cssVariables: false,
      scheduled: { lightTheme: "mint-light", darkTheme: "mint-dark", latitude: 40.7, longitude: -74 },
    });
    const handle = runtime.schedule;

    // An update that does not mention `scheduled` must not disturb it.
    runtime.configure({ defaultTheme: "plum-light" });

    expect(runtime.schedule).toBe(handle);

    runtime.destroy();
  });
});
