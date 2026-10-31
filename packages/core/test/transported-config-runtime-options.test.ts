// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createThemeRuntime,
  defineThemvoraConfig,
  defineTheme,
  resolveRuntimeOptions,
  toBootstrapConfig,
} from "../src";

/**
 * The transported configuration is the *client runtime's* configuration.
 *
 * `themvora()` injects `window.__THEMVORA_CONFIG__ = toBootstrapConfig(cfg)` and
 * every client runtime is then built with `resolveRuntimeOptions`, which spreads
 * that object under the provider's own options. So a key missing from the
 * projection is not "unused in the browser" — it is **replaced by a default**.
 *
 * That is exactly how a `theme.config.ts` declaring `transition: { enabled:
 * false }` still ran a `document.startViewTransition` on every theme change. A
 * view transition applies the document swap in a later task, while a consumer
 * rendering from the theme store updates immediately, so the page painted the
 * new theme's components one frame before the document had the new palette: a
 * visible flash on every mode and preset change.
 */

const appThemes = [
  defineTheme({
    name: "app-light",
    meta: { family: "app", mode: "light" },
    tokens: { colors: { background: "#ffffff", foreground: "#111111" } },
  }),
  defineTheme({
    name: "app-dark",
    meta: { family: "app", mode: "dark" },
    tokens: { colors: { background: "#101014", foreground: "#f0f0ff" } },
  }),
];

const scope = globalThis as unknown as Record<string, unknown>;

/**
 * Stands in for `document.startViewTransition`.
 *
 * The callback is *deferred*, exactly as the real API defers it to a later
 * task. Running it synchronously here would hide the very ordering this file
 * exists to pin: with a transition, `setMode()` returns before the document has
 * been swapped.
 */
function installViewTransitionSpy() {
  const pending: Array<() => void> = [];
  (document as unknown as Record<string, unknown>).startViewTransition = (
    cb: () => void,
  ) => {
    pending.push(cb);
    return { ready: Promise.resolve(), finished: Promise.resolve() };
  };
  return pending;
}

let pendingSwaps: Array<() => void> = [];

function flushSwaps() {
  for (const run of pendingSwaps.splice(0)) run();
}

beforeEach(() => {
  // Each runtime persists the selection it is given, so without this the second
  // test would start already dark and `setMode("dark")` would be a no-op — a
  // test that passes for the wrong reason.
  localStorage.clear();
  sessionStorage.clear();
  document.cookie = "theme-mode=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
  pendingSwaps = installViewTransitionSpy();
});

afterEach(() => {
  delete scope.__THEMVORA_CONFIG__;
  delete (document as unknown as Record<string, unknown>).startViewTransition;
});

describe("toBootstrapConfig — serializable runtime options", () => {
  it("carries transition and scrollbar to the browser", () => {
    const projected = toBootstrapConfig(
      defineThemvoraConfig({
        themes: appThemes,
        defaultTheme: "app-light",
        transition: { enabled: false },
        scrollbar: { autoHide: false },
      }),
    );

    expect(projected.transition).toEqual({ enabled: false });
    expect(projected.scrollbar).toEqual({ autoHide: false });
  });

  it("omits an undeclared option instead of writing undefined over a provider's value", () => {
    const projected = toBootstrapConfig(
      defineThemvoraConfig({ themes: appThemes }),
    );

    expect("transition" in projected).toBe(false);
    expect("scrollbar" in projected).toBe(false);
  });

  it("leaves out the three options that cannot be serialized", () => {
    const projected = toBootstrapConfig(
      defineThemvoraConfig({
        themes: appThemes,
        persistence: { get: () => null, set: () => {} },
        plugins: [{ name: "p" }],
        adapters: [{ name: "a" }],
      }),
    );

    expect("persistence" in projected).toBe(false);
    expect("plugins" in projected).toBe(false);
    expect("adapters" in projected).toBe(false);
  });

  it("survives the wire format the integrations actually use", () => {
    const projected = toBootstrapConfig(
      defineThemvoraConfig({ themes: appThemes, transition: { enabled: false } }),
    );

    // The integrations emit `JSON.stringify(...)` into a <script>, so the test
    // has to go through the same encoding — a value that only exists as a live
    // object would not reach the browser.
    const wire = JSON.parse(JSON.stringify(projected)) as Record<string, unknown>;

    expect(wire.transition).toEqual({ enabled: false });
  });
});

describe("a declared transition policy reaches the runtime", () => {
  function runtimeFrom(config: ReturnType<typeof defineThemvoraConfig>) {
    scope.__THEMVORA_CONFIG__ = JSON.parse(
      JSON.stringify(toBootstrapConfig(config)),
    );
    const resolved = resolveRuntimeOptions({});
    const runtime = createThemeRuntime({ ...resolved, themes: appThemes });
    // Both behavioural tests below assume a light starting point; asserting it
    // keeps a persisted selection from turning one of them into a no-op.
    expect(runtime.selection.getMode()).toBe("light");
    return runtime;
  }

  it("does not start a view transition when the app disabled transitions", () => {
    const runtime = runtimeFrom(
      defineThemvoraConfig({ themes: appThemes, transition: { enabled: false } }),
    );

    pendingSwaps.length = 0;
    runtime.selection.setMode("dark");

    expect(pendingSwaps).toHaveLength(0);
    expect(runtime.store.get().name).toBe("app-dark");
    runtime.destroy();
  });

  it("does start one when the app declared nothing — so the assertion above is not vacuous", () => {
    const runtime = runtimeFrom(defineThemvoraConfig({ themes: appThemes }));

    pendingSwaps.length = 0;
    runtime.selection.setMode("dark");

    expect(pendingSwaps.length).toBeGreaterThan(0);
    runtime.destroy();
  });

  it("swaps the document synchronously, so a consumer cannot paint ahead of it", () => {
    const runtime = runtimeFrom(
      defineThemvoraConfig({ themes: appThemes, transition: { enabled: false } }),
    );

    runtime.selection.setMode("dark");

    // The whole point. A consumer subscribed to the theme store updates inside
    // `setMode`; if the document write were deferred to a transition callback,
    // that consumer would paint the new theme while `<html>` still carried the
    // old palette — one torn frame on every mode and preset change.
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    runtime.destroy();
  });

  it("is deferred when transitions are on — the ordering that produced the flash", () => {
    const runtime = runtimeFrom(defineThemvoraConfig({ themes: appThemes }));

    pendingSwaps.length = 0;
    runtime.selection.setMode("dark");

    // Reproduces the defect: the store has the new theme, the document does not
    // yet. Anything rendering from the store in this window paints a mix.
    expect(runtime.store.get().name).toBe("app-dark");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    flushSwaps();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    runtime.destroy();
  });
});
