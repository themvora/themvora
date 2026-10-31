// @vitest-environment jsdom
/**
 * Scheduled transitions must be observable.
 *
 * The reported failure: with `scheduled: { enabled: true }` the page really did
 * flip light ⇄ dark at sunrise/sunset, but anything that *displayed* the current
 * mode kept showing the old one until the page was reloaded.
 *
 * These tests pin the shared-layer contract that makes that impossible:
 *
 * - the effective mode is a first-class, subscribable value
 *   (`selection.getEffectiveMode()` / `selection.subscribeEffective`), separate
 *   from the configured mode (`selection.getMode()`);
 * - a transition moves the effective mode and leaves the configured one alone,
 *   so it is not persisted or broadcast as if the visitor had chosen it;
 * - the schedule owns the appearance while it is enabled, so
 *   `prefers-color-scheme` cannot overwrite it — which is what previously made
 *   the schedule lose at load time and take effect only at its first tick.
 *
 * The clock is fully deterministic: `getTimes` pins sunrise at 06:00 and sunset
 * at 18:00 local, and timers are faked. No test depends on the real sun.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  createThemeRuntime,
  type ThemeDefinition,
  type ThemeEffectiveSelection,
  type ThemeRuntime,
} from "../src";
import type { ThemeSelectionPersistenceAdapter } from "../src/adapters/theme-selection";

const themes: ThemeDefinition[] = [
  { name: "solar-light", meta: { mode: "light", family: "solar" } },
  { name: "solar-dark", meta: { mode: "dark", family: "solar" } },
];

/** Sunrise 06:00 / sunset 18:00 on whatever local day is passed in. */
function fixedTimes(date: Date) {
  const sunrise = new Date(date);
  sunrise.setHours(6, 0, 0, 0);
  const sunset = new Date(date);
  sunset.setHours(18, 0, 0, 0);
  return { sunrise, sunset };
}

const DAY = new Date("2025-06-21T12:00:00");
const NIGHT = new Date("2025-06-21T19:00:00");

function mockMatchMedia(matches: boolean) {
  let listener: ((event: MediaQueryListEvent) => void) | undefined;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      media: "(prefers-color-scheme: dark)",
      matches,
      addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => {
        listener = cb;
      },
      removeEventListener: () => {
        listener = undefined;
      },
      addListener: (cb: (event: MediaQueryListEvent) => void) => {
        listener = cb;
      },
      removeListener: () => {
        listener = undefined;
      },
    }),
  });
  return {
    fire(next: boolean) {
      listener?.({ matches: next } as MediaQueryListEvent);
    },
  };
}

function memoryPersistence() {
  const writes: { family: string; mode: string }[] = [];
  const adapter: ThemeSelectionPersistenceAdapter = {
    get: () => null,
    set: (value) => {
      writes.push({ family: value.family, mode: value.mode });
    },
    remove: () => {},
    subscribe: () => () => {},
  };
  return { adapter, writes };
}

function makeRuntime(
  overrides: Partial<Parameters<typeof createThemeRuntime<ThemeDefinition>>[0]> = {},
  scheduled: Record<string, unknown> = {},
) {
  return createThemeRuntime<ThemeDefinition>({
    themes,
    initialFamily: "solar",
    scheduled: {
      latitude: 0,
      longitude: 0,
      getTimes: fixedTimes,
      checkInterval: 60000,
      ...scheduled,
    },
    persistence: null,
    broadcast: null,
    dom: false,
    cssVariables: false,
    transition: false,
    ...overrides,
  });
}

describe("scheduled transitions are observable", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    // No `matchMedia` unless a test installs one: that is the jsdom default and
    // it keeps the OS binding out of the way of the assertions below.
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("publishes the effective mode in both directions", () => {
    vi.setSystemTime(DAY);
    const runtime = makeRuntime({ initialMode: "light" });

    const seen: ThemeEffectiveSelection[] = [];
    runtime.selection.subscribeEffective((selection) => seen.push(selection));

    expect(runtime.selection.getEffectiveMode()).toBe("light");
    expect(runtime.store.get().name).toBe("solar-light");

    vi.setSystemTime(NIGHT);
    vi.advanceTimersByTime(60000);

    expect(runtime.store.get().name).toBe("solar-dark");
    expect(runtime.selection.getEffectiveMode()).toBe("dark");
    expect(seen.at(-1)).toEqual({ family: "solar", mode: "dark" });

    // …and back, which is the direction a toggle button is usually clicked in.
    vi.setSystemTime(new Date("2025-06-22T12:00:00"));
    vi.advanceTimersByTime(60000);

    expect(runtime.store.get().name).toBe("solar-light");
    expect(runtime.selection.getEffectiveMode()).toBe("light");
    expect(seen.map((entry) => entry.mode)).toEqual(["dark", "light"]);

    runtime.destroy();
  });

  it("leaves the configured mode alone through a transition", () => {
    vi.setSystemTime(DAY);
    const runtime = makeRuntime({ initialMode: "light" });

    expect(runtime.selection.getMode()).toBe("light");

    vi.setSystemTime(NIGHT);
    vi.advanceTimersByTime(60000);

    // The visitor asked for light; a sunset does not overrule that choice.
    expect(runtime.selection.getMode()).toBe("light");
    expect(runtime.selection.getEffectiveMode()).toBe("dark");

    runtime.destroy();
  });

  it("does not report an automatic change on the configured-selection channel", () => {
    vi.setSystemTime(DAY);
    const runtime = makeRuntime({ initialMode: "light" });

    const configured: string[] = [];
    runtime.selection.subscribe((selection) => configured.push(selection.mode));

    vi.setSystemTime(NIGHT);
    vi.advanceTimersByTime(60000);

    // The runtime treats this channel as "the visitor chose something" — it
    // marks a manual selection made on top of a `themeOverride`. A sunset is
    // not that, so it must stay quiet here and speak on `subscribeEffective`.
    expect(configured).toEqual([]);

    runtime.destroy();
  });

  it("does not persist or broadcast an automatic change", () => {
    vi.setSystemTime(DAY);
    const persistence = memoryPersistence();
    const posted: unknown[] = [];
    const runtime = makeRuntime({
      initialMode: "light",
      persistence: persistence.adapter,
      broadcast: {
        post: (value) => posted.push(value),
        subscribe: () => () => {},
        destroy: () => {},
      },
    });

    vi.setSystemTime(NIGHT);
    vi.advanceTimersByTime(60000);

    expect(runtime.store.get().name).toBe("solar-dark");
    expect(persistence.writes).toEqual([]);
    expect(posted).toEqual([]);

    runtime.destroy();
  });

  it("keeps the schedule in charge of the appearance when the selection is system", () => {
    const media = mockMatchMedia(false); // OS prefers light
    vi.setSystemTime(NIGHT);

    const runtime = makeRuntime({ initialMode: "system" });

    // The regression: the schedule applied the night theme while the runtime was
    // being built, then the `"system"` binding replaced it with the daytime
    // theme, so the schedule only took effect one `checkInterval` later.
    expect(runtime.store.get().name).toBe("solar-dark");
    expect(runtime.selection.getMode()).toBe("system");
    expect(runtime.selection.getEffectiveMode()).toBe("dark");

    // And a live OS change must not undo it either.
    media.fire(true);
    expect(runtime.store.get().name).toBe("solar-dark");
    media.fire(false);
    expect(runtime.store.get().name).toBe("solar-dark");

    runtime.destroy();
  });

  it("hands the appearance back to the OS when the schedule is turned off", () => {
    const media = mockMatchMedia(false);
    vi.setSystemTime(NIGHT);
    const runtime = makeRuntime({ initialMode: "system" });

    expect(runtime.store.get().name).toBe("solar-dark");

    runtime.schedule?.disable();

    // Disabling must not repaint by itself…
    expect(runtime.store.get().name).toBe("solar-dark");
    // …but the OS preference is live again.
    media.fire(true);
    expect(runtime.store.get().name).toBe("solar-dark");
    media.fire(false);
    expect(runtime.store.get().name).toBe("solar-light");

    runtime.destroy();
  });

  it("resumes ownership when the schedule is turned back on", () => {
    const media = mockMatchMedia(false);
    vi.setSystemTime(NIGHT);
    const runtime = makeRuntime({ initialMode: "system" });

    runtime.schedule?.disable();
    expect(runtime.schedule?.enabled).toBe(false);

    runtime.schedule?.enable();
    expect(runtime.schedule?.enabled).toBe(true);
    expect(runtime.store.get().name).toBe("solar-dark");

    // The OS is out of the loop again.
    media.fire(true);
    media.fire(false);
    expect(runtime.store.get().name).toBe("solar-dark");

    runtime.destroy();
  });

  it("does not stack timers when the schedule is reconfigured", () => {
    vi.setSystemTime(DAY);
    const runtime = makeRuntime({ initialMode: "light" });

    const writes: string[] = [];
    runtime.store.subscribe((theme) => writes.push(theme.name));

    // Three reconciles: the first reuses the live binding, so there must still
    // be exactly one interval writing to the store.
    runtime.configure({ scheduled: { latitude: 0, longitude: 0, getTimes: fixedTimes, checkInterval: 60000 } });
    runtime.configure({ scheduled: { latitude: 0, longitude: 0, getTimes: fixedTimes, checkInterval: 60000 } });
    runtime.configure({ scheduled: { latitude: 0, longitude: 0, getTimes: fixedTimes, checkInterval: 60000 } });

    vi.setSystemTime(NIGHT);
    vi.advanceTimersByTime(60000);

    expect(writes).toEqual(["solar-dark"]);

    runtime.destroy();
  });

  it("writes nothing when the scheduled theme is already applied", () => {
    vi.setSystemTime(NIGHT);
    const runtime = makeRuntime({ initialMode: "light" });

    let writes = 0;
    runtime.store.subscribe(() => {
      writes += 1;
    });

    vi.advanceTimersByTime(60000 * 5);

    expect(writes).toBe(0);
    expect(runtime.selection.getEffectiveMode()).toBe("dark");

    runtime.destroy();
  });

  it("stops writing after destroy", () => {
    vi.setSystemTime(DAY);
    const runtime = makeRuntime({ initialMode: "light" });
    runtime.destroy();

    vi.setSystemTime(NIGHT);
    expect(() => vi.advanceTimersByTime(60000 * 3)).not.toThrow();
  });

  it("keeps themeOverride ahead of the schedule", () => {
    vi.setSystemTime(DAY);
    const runtime = makeRuntime({
      initialMode: "light",
      themeOverride: "solar-dark",
    });

    // The override outranks every automatic driver: it is an explicit request.
    expect(runtime.store.get().name).toBe("solar-dark");

    vi.setSystemTime(NIGHT);
    vi.advanceTimersByTime(60000);

    expect(runtime.store.get().name).toBe("solar-dark");

    runtime.destroy();
  });

  it("removes the override and lets the schedule resume", () => {
    vi.setSystemTime(NIGHT);
    const runtime: ThemeRuntime<ThemeDefinition> = makeRuntime({
      initialMode: "light",
      themeOverride: "solar-light",
    });

    expect(runtime.store.get().name).toBe("solar-light");

    runtime.configure({ themeOverride: undefined });
    vi.advanceTimersByTime(60000);

    expect(runtime.store.get().name).toBe("solar-dark");
    expect(runtime.selection.getMode()).toBe("light");

    runtime.destroy();
  });

  it("keeps the DOM attributes honest: resolved mode moves, selection does not", () => {
    vi.setSystemTime(DAY);
    const runtime = makeRuntime({
      initialMode: "system",
      dom: { target: document.documentElement },
    });

    const root = document.documentElement;
    expect(root.getAttribute("data-theme-mode")).toBe("light");
    expect(root.getAttribute("data-theme-selection-mode")).toBe("system");

    vi.setSystemTime(NIGHT);
    vi.advanceTimersByTime(60000);

    // The resolved attributes follow the page…
    expect(root.getAttribute("data-theme")).toBe("solar-dark");
    expect(root.getAttribute("data-theme-mode")).toBe("dark");
    // …while the selection attributes keep reporting what the visitor asked for.
    expect(root.getAttribute("data-theme-selection-mode")).toBe("system");

    runtime.destroy();
  });

  it("keeps an override in charge when the schedule is reconfigured underneath it", () => {    vi.setSystemTime(DAY);
    const runtime = makeRuntime({
      initialMode: "system",
      themeOverride: "solar-dark",
    });

    expect(runtime.store.get().name).toBe("solar-dark");

    // Reinstalling the schedule must not promote it over the override that is
    // already in force — ownership is decided by the whole ladder, not by
    // "is a schedule enabled".
    runtime.configure({
      scheduled: { latitude: 0, longitude: 0, getTimes: fixedTimes, checkInterval: 60000 },
    });
    vi.advanceTimersByTime(60000);

    expect(runtime.store.get().name).toBe("solar-dark");

    runtime.destroy();
  });
});
