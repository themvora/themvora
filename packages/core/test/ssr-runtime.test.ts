import { describe, expect, it, vi } from "vitest";
import {
  createThemeHistory,
  createThemeRuntime,
  createThemeStore,
  defineTheme,
} from "../src";

describe("SSR runtime", () => {
  it("creates the runtime without window or document", () => {
    const runtime = createThemeRuntime({
      defaultTheme: "light",
      themes: [defineTheme({ name: "light" }), defineTheme({ name: "dark" })],
      lightTheme: "light",
      darkTheme: "dark",
      initialMode: "system",
    });

    expect(runtime.store.get().name).toBe("light");
    expect(runtime.selection.getMode()).toBe("system");

    runtime.destroy();
  });
});

describe("SSR runtime — deterministic clock", () => {
  const themes = [defineTheme({ name: "light" }), defineTheme({ name: "dark" })];

  it("never reads the clock while a server render constructs the runtime", () => {
    // Regression guard for a real Next.js failure. Under Cache Components, Next
    // refuses to prerender a client component that reads `Date.now()`:
    //
    //   Next.js encountered the unstable value `Date.now()` in a Client
    //   Component. This value would be evaluated during the prerender.
    //
    // A Next prerender renders the client provider, which constructs this
    // runtime, which constructs the history controller — and that controller
    // used to stamp its seed entry with `Date.now()`. The build failed for every
    // generated Next app as a result.
    const spy = vi.spyOn(Date, "now");

    const runtime = createThemeRuntime({
      defaultTheme: "light",
      themes,
      lightTheme: "light",
      darkTheme: "dark",
      initialMode: "system",
    });

    expect(spy).not.toHaveBeenCalled();
    expect(runtime.history.getHistory().every((entry) => entry.timestamp === 0)).toBe(true);

    runtime.destroy();
    spy.mockRestore();
  });

  it("uses a supplied clock, so a caller can make history deterministic", () => {
    // The escape hatch the runtime uses on the server, asserted directly: a
    // caller-supplied clock replaces `Date.now` for every entry, including the
    // seed and `clear()`. Covered here rather than through a stubbed `document`,
    // which would also make the runtime build its DOM bindings.
    const store = createThemeStore({ initialTheme: themes[0]! });
    const history = createThemeHistory(store, { now: () => 7 });

    expect(history.getHistory()[0]!.timestamp).toBe(7);

    store.set(themes[1]!);
    history.clear();

    expect(history.getHistory()[0]!.timestamp).toBe(7);

    history.destroy();
  });
});
