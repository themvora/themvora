// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createThemeStore, createDOMBinding } from "../src";

describe("createDOMBinding", () => {
  it("applies the active theme to the document", () => {
    const store = createThemeStore({ initialTheme: { name: "light" } });

    const binding = createDOMBinding(store);

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    store.set({ name: "dark" });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    binding.destroy();
  });
});

describe("createDOMBinding — selection source", () => {
  it("writes data-theme once per theme change, even with a selection source", () => {
    // The selection controller notifies its listeners *before* it commits the
    // new theme to the store. If the selection subscription re-applied the
    // theme, it would write the previous theme's `data-theme` first and the new
    // one a moment later — two DOM states per change, i.e. a flash.
    const store = createThemeStore({ initialTheme: { name: "light" } });

    let notify = () => {};
    let selection = { family: "default", mode: "light" as const };
    const source = {
      getSelection: () => selection,
      subscribe: (listener: () => void) => {
        notify = listener;
        return () => {};
      },
    };

    const binding = createDOMBinding(store, { selection: source });
    const spy = vi.spyOn(document.documentElement, "setAttribute");

    // What the controller does on `setMode("dark")`: notify, then commit.
    selection = { family: "default", mode: "dark" };
    notify();
    store.set({ name: "dark" });

    const themeWrites = spy.mock.calls
      .filter(([name]) => name === "data-theme")
      .map(([, value]) => value);

    expect(themeWrites).toEqual(["dark"]);
    expect(document.documentElement.getAttribute("data-theme-selection-mode")).toBe("dark");

    spy.mockRestore();
    binding?.destroy();
  });

  it("still refreshes the selection attributes when the theme does not change", () => {
    const store = createThemeStore({ initialTheme: { name: "light" } });

    let notify = () => {};
    let selection = { family: "default", mode: "light" as const };
    const source = {
      getSelection: () => selection,
      subscribe: (listener: () => void) => {
        notify = listener;
        return () => {};
      },
    };

    const binding = createDOMBinding(store, { selection: source });
    const spy = vi.spyOn(document.documentElement, "setAttribute");

    // `system` while the resolved theme is already light: no store change.
    selection = { family: "default", mode: "system" as const };
    notify();

    expect(spy.mock.calls.filter(([name]) => name === "data-theme")).toHaveLength(0);
    expect(document.documentElement.getAttribute("data-theme-selection-mode")).toBe("system");

    spy.mockRestore();
    binding?.destroy();
  });
});
