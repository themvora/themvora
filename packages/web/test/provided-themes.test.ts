// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineTheme, resetDiagnosticEmission } from "@themvora/core";
import { getProviderRuntime } from "../src/utils";
import { useProvidedThemes } from "../src/index";
import "../src/index";

/**
 * Web Components parity: the `theme-override` attribute and
 * `useProvidedThemes()`.
 */

const themes = [
  defineTheme({ name: "a-light", meta: { family: "a", mode: "light" }, tokens: { colors: { background: "#ffffff" } } }),
  defineTheme({ name: "a-dark", meta: { family: "a", mode: "dark" }, tokens: { colors: { background: "#000000" } } }),
  defineTheme({ name: "b-light", meta: { family: "b", mode: "light" }, tokens: { colors: { background: "#111111" } } }),
];

const json = JSON.stringify(themes).replace(/"/g, "&quot;");

function mount(attributes: string) {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<themvora-provider themes="${json}" ${attributes}></themvora-provider>`,
  );
  const el = document.querySelector("themvora-provider") as HTMLElement;
  return {
    el,
    runtime: getProviderRuntime(el)!,
    cleanup: () => el.remove(),
  };
}

beforeEach(() => {
  resetDiagnosticEmission();
  window.localStorage.clear();
});

afterEach(() => {
  document.querySelectorAll("themvora-provider").forEach((el) => el.remove());
  window.localStorage.clear();
});

describe("themvora-provider — theme-override", () => {
  it("applies a theme-name override over default-theme", () => {
    const { runtime, cleanup } = mount(`default-theme="b-light" theme-override="a-dark"`);

    expect(runtime.store.get().name).toBe("a-dark");
    cleanup();
  });

  it("applies a JSON family/mode override", () => {
    const { runtime, cleanup } = mount(
      `default-theme="b-light" theme-override='{"family":"a","mode":"dark"}'`,
    );

    expect(runtime.store.get().name).toBe("a-dark");
    cleanup();
  });

  it("restores the underlying selection when the attribute is removed", () => {
    const { el, runtime, cleanup } = mount(`default-theme="b-light" theme-override="a-dark"`);

    expect(runtime.store.get().name).toBe("a-dark");

    el.removeAttribute("theme-override");

    expect(runtime.store.get().name).toBe("b-light");
    cleanup();
  });

  it("applies a changed attribute once and leaves storage alone", () => {
    const { el, runtime, cleanup } = mount(`theme-override="a-dark"`);

    expect(runtime.store.get().name).toBe("a-dark");
    expect(window.localStorage.getItem("theme-selection")).toBeNull();

    el.setAttribute("theme-override", "b-light");
    expect(runtime.store.get().name).toBe("b-light");

    // Re-setting the same value is not a new request.
    runtime.selection.setFamily("a");
    el.setAttribute("theme-override", "b-light");
    expect(runtime.selection.getFamily()).toBe("a");

    cleanup();
  });
});

describe("useProvidedThemes — web", () => {
  it("returns the provider's families", () => {
    const { cleanup } = mount(`default-theme="a-light"`);

    const families = useProvidedThemes();
    expect(families.map((family) => family.family)).toEqual(["a", "b"]);
    expect(families[0]!.variants.map((variant) => variant.mode)).toEqual(["light", "dark"]);

    cleanup();
  });
});
