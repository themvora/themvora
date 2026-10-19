// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createThemeRuntime } from "../src";
import { defineTheme } from "../src/model";

/**
 * The deterministic clock exists so a *server* render never reads `Date.now()`
 * (Next's Cache Components refuse to prerender a client component that does).
 * It must be scoped to that case only: a browser-created history must still use
 * the real clock, or every persisted timestamp would read as `0`.
 *
 * jsdom provides `document`, so `createThemeRuntime` here takes the client path
 * — the same path a browser takes. The Node-environment counterpart lives in
 * `ssr-runtime.test.ts`, which asserts the server path never touches the clock.
 */
const themes = [
  defineTheme({ name: "light", meta: { family: "default", mode: "light" } }),
  defineTheme({ name: "dark", meta: { family: "default", mode: "dark" } }),
];

describe("history clock — browser runtime", () => {
  it("stamps history with the real clock, never the server's zero", () => {
    const before = Date.now();

    const runtime = createThemeRuntime({
      themes,
      defaultTheme: "light",
      initialMode: "light",
      persistence: null,
      broadcast: null,
      dom: false,
      cssVariables: false,
    });

    const seed = runtime.history.getHistory()[0]!;
    expect(seed.timestamp).toBeGreaterThanOrEqual(before);
    expect(seed.timestamp).not.toBe(0);

    runtime.selection.setMode("dark");
    const latest = runtime.history.getHistory().at(-1)!;
    expect(latest.timestamp).toBeGreaterThanOrEqual(before);
    expect(latest.timestamp).not.toBe(0);

    runtime.destroy();
  });
});
