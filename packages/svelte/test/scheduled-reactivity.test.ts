// @vitest-environment jsdom
import { describe, it, expect, afterAll, beforeEach, afterEach, vi } from "vitest";
import { compile } from "svelte/compiler";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mount, unmount, flushSync } from "svelte";
import { createThemeRuntime, defineTheme, resetDiagnosticEmission, type ThemeDefinition } from "@themvora/core";

/**
 * Svelte parity for scheduled transitions.
 *
 * The core suite proves the runtime publishes the effective mode; this proves
 * the Svelte stores pick it up, which is what a template renders. The clock is
 * deterministic — `getTimes` pins sunrise at 06:00 and sunset at 18:00 — so
 * nothing depends on the real sun.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedDir = join(__dirname, ".generated-scheduled-reactivity");

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

function write(name: string, source: string): string {
  mkdirSync(generatedDir, { recursive: true });
  const { js } = compile(source, { filename: `${name}.svelte`, runes: true });
  const outFile = join(generatedDir, `${name}.mjs`);
  writeFileSync(outFile, js.code);
  return outFile;
}

const probeSource = `<script>
  import {
    setThemeRuntime,
    useTheme,
    useThemeMode,
    useEffectiveThemeMode,
  } from "@themvora/svelte";

  let { runtime } = $props();
  setThemeRuntime(runtime);

  const { theme, mode, effectiveMode } = useTheme();
  const selectionMode = useThemeMode();
  const standalone = useEffectiveThemeMode();
</script>

<p id="readout">{$theme.name}|{$mode}|{$effectiveMode}|{$selectionMode}|{$standalone}</p>
`;

function mountWith(Component: unknown, props: Record<string, unknown>) {
  const target = document.createElement("div");
  document.body.appendChild(target);
  const instance = mount(Component as never, { target, props });
  flushSync();
  return {
    target,
    cleanup: () => {
      unmount(instance);
      flushSync();
      document.body.removeChild(target);
    },
  };
}

async function tick(to: Date, ms = 60000) {
  vi.setSystemTime(to);
  vi.advanceTimersByTime(ms);
  flushSync();
}

beforeEach(() => resetDiagnosticEmission());
afterAll(() => rmSync(generatedDir, { recursive: true, force: true }));

describe("scheduled transitions re-render Svelte", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("moves the applied theme and both mode stores in both directions", async () => {
    write("ScheduledProbe", probeSource);
    const Component = (await import(join(generatedDir, "ScheduledProbe.mjs").replace(/\\/g, "/"))).default;

    vi.setSystemTime(DAY);
    const runtime = createRuntime("system");
    const m = mountWith(Component, { runtime });

    const read = () => m.target.querySelector("#readout")?.textContent;

    try {
      expect(read()).toBe("solar-light|system|light|system|light");

      await tick(NIGHT);
      expect(read()).toBe("solar-dark|system|dark|system|dark");

      await tick(new Date("2025-06-22T12:00:00"));
      expect(read()).toBe("solar-light|system|light|system|light");
    } finally {
      m.cleanup();
      runtime.destroy();
    }
  });

  it("keeps a pinned configured mode through a transition", async () => {
    write("ScheduledPinned", probeSource);
    const Component = (await import(join(generatedDir, "ScheduledPinned.mjs").replace(/\\/g, "/"))).default;

    vi.setSystemTime(DAY);
    const runtime = createRuntime("light");
    const m = mountWith(Component, { runtime });

    const read = () => m.target.querySelector("#readout")?.textContent;

    try {
      expect(read()).toBe("solar-light|light|light|light|light");

      await tick(NIGHT);
      expect(read()).toBe("solar-dark|light|dark|light|dark");
    } finally {
      m.cleanup();
      runtime.destroy();
    }
  });
});
