// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ThemvoraProvider } from "../src/provider";
import { getProviderRuntime } from "../src/utils";

/**
 * The `<themvora-provider>` custom element must apply observed-attribute
 * changes to the *live* runtime through the shared `configure()` contract.
 * Previously `transition` / `scheduled` destroyed and recreated the runtime,
 * discarding history, persistence and the current selection.
 */

const TAG = "themvora-provider-live-test";
ThemvoraProvider.define(TAG);

function mountProvider(attributes: Record<string, string> = {}) {
  const el = document.createElement(TAG) as ThemvoraProvider;
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
  document.getElementById("themvora-bootstrap")?.remove();
  localStorage.clear();
});

describe("ThemvoraProvider — live attribute changes", () => {
  it("applies a changed transition attribute without recreating the runtime", () => {
    const el = mountProvider({
      transition: JSON.stringify({ enabled: true, duration: 300 }),
    });

    const runtime = getProviderRuntime(el)!;
    expect(runtime).toBeTruthy();
    expect(runtime.transition?.duration).toBe(300);

    const historyBefore = runtime.history.getHistory().length;
    const themeBefore = runtime.store.get().name;

    el.setAttribute("transition", JSON.stringify({ enabled: true, duration: 900 }));

    // Same runtime instance (no teardown), and the theme/history are untouched.
    expect(getProviderRuntime(el)).toBe(runtime);
    expect(runtime.transition?.duration).toBe(900);
    expect(runtime.store.get().name).toBe(themeBefore);
    expect(runtime.history.getHistory().length).toBe(historyBefore);

    document.body.removeChild(el);
  });

  it("reverts to the default transition when the attribute is removed, and disables it on `false`", () => {
    const el = mountProvider({
      transition: JSON.stringify({ enabled: true, duration: 300 }),
    });
    const runtime = getProviderRuntime(el)!;

    // `false` is the explicit "off" signal.
    el.setAttribute("transition", "false");
    expect(getProviderRuntime(el)).toBe(runtime);
    expect(runtime.transition?.enabled).toBe(false);

    // Removing the attribute means "no transition configuration", which is the
    // documented default (transitions enabled with defaults) — not "off".
    el.removeAttribute("transition");
    expect(getProviderRuntime(el)).toBe(runtime);
    expect(runtime.transition).toBeUndefined();

    document.body.removeChild(el);
  });

  it("installs, reconfigures and removes the schedule in place", () => {
    const el = mountProvider({});
    const runtime = getProviderRuntime(el)!;

    expect(runtime.schedule).toBeNull();

    el.setAttribute(
      "scheduled",
      JSON.stringify({ lightTheme: "light", darkTheme: "dark", latitude: 40.7, longitude: -74 }),
    );
    expect(getProviderRuntime(el)).toBe(runtime);
    expect(runtime.schedule).not.toBeNull();

    const handle = runtime.schedule;
    el.setAttribute(
      "scheduled",
      JSON.stringify({ lightTheme: "light", darkTheme: "dark", latitude: 51.5, longitude: -0.1 }),
    );
    // Reconciled through the controller's own `set()`, not recreated.
    expect(runtime.schedule).toBe(handle);

    el.removeAttribute("scheduled");
    expect(runtime.schedule).toBeNull();

    document.body.removeChild(el);
  });
});
