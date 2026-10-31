// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createThemeRuntime, defineTheme, type ThemeDefinition } from "@themvora/core";
import {
  provideThemeRuntime,
  useEffectiveThemeMode,
  useTheme,
  useThemeMode,
} from "../src/index";

/**
 * Vue parity for scheduled transitions.
 *
 * The core suite proves the runtime publishes the effective mode; this proves
 * the Vue accessors pick it up, which is what a template actually renders. The
 * clock is deterministic — `getTimes` pins sunrise at 06:00 and sunset at 18:00
 * — so nothing depends on the real sun.
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

const Probe = defineComponent({
  setup() {
    const { theme, mode, effectiveMode } = useTheme();
    const selectionMode = useThemeMode();
    const standalone = useEffectiveThemeMode();
    return () =>
      h(
        "p",
        { "data-testid": "readout" },
        `${theme.value.name}|${mode.value}|${effectiveMode.value}|${selectionMode.value}|${standalone.value}`,
      );
  },
});

async function mount(runtime: ReturnType<typeof createRuntime>) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const app = createApp(
    defineComponent({
      setup() {
        provideThemeRuntime(runtime);
        return () => h(Probe);
      },
    }),
  );
  app.mount(container);

  return {
    read: () => container.querySelector('[data-testid="readout"]')!.textContent,
    unmount: () => {
      app.unmount();
      document.body.removeChild(container);
    },
  };
}

async function tick(to: Date, ms = 60000) {
  vi.setSystemTime(to);
  vi.advanceTimersByTime(ms);
  await nextTick();
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("scheduled transitions re-render Vue", () => {
  it("moves the applied theme and both mode refs in both directions", async () => {
    vi.setSystemTime(DAY);
    const runtime = createRuntime("system");
    const ui = await mount(runtime);

    expect(ui.read()).toBe("solar-light|system|light|system|light");

    await tick(NIGHT);
    expect(ui.read()).toBe("solar-dark|system|dark|system|dark");

    await tick(new Date("2025-06-22T12:00:00"));
    expect(ui.read()).toBe("solar-light|system|light|system|light");

    ui.unmount();
    runtime.destroy();
  });

  it("keeps a pinned configured mode through a transition", async () => {
    vi.setSystemTime(DAY);
    const runtime = createRuntime("light");
    const ui = await mount(runtime);

    expect(ui.read()).toBe("solar-light|light|light|light|light");

    await tick(NIGHT);

    expect(ui.read()).toBe("solar-dark|light|dark|light|dark");

    ui.unmount();
    runtime.destroy();
  });
});
