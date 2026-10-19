// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBuiltInThemes, resetDiagnosticEmission } from "@themvora/core";
import { ThemvoraProvider } from "../src/provider";
import { getProviderRuntime } from "../src/utils";
import { THEMES_CHANGE_EVENT } from "../src/events";

/**
 * Phase 2 — declarative provider configuration.
 *
 * Every assertion here is about the *live* runtime: an attribute edit must
 * reconcile the runtime in place (never recreate it), report unusable input
 * through the canonical diagnostic pipeline, and leave a defined state.
 */

const TAG = "themvora-provider-attr-test";
ThemvoraProvider.define(TAG);

function mount(attributes: Record<string, string> = {}) {
  const el = document.createElement(TAG) as ThemvoraProvider;
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  document.body.appendChild(el);
  return el;
}

function names(el: ThemvoraProvider): string[] {
  return getProviderRuntime(el)!.themes.map((theme) => String(theme.name));
}

let warn: ReturnType<typeof vi.spyOn>;

/**
 * Drains the microtask queue.
 *
 * `themes-change` is dispatched from a microtask (the runtime signal fires
 * inside `configure()`, and dispatching synchronously there would re-enter the
 * element's own attribute handling), so an assertion about the event has to
 * wait for it.
 */
async function flushEvents(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  resetDiagnosticEmission();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
  document.getElementById("themvora-bootstrap")?.remove();
  warn.mockRestore();
  localStorage.clear();
});

describe("themes attribute — identifier syntax", () => {
  it("resolves a space-separated list of registered names", () => {
    const el = mount({ themes: "light dark plum-dark" });
    expect(names(el)).toEqual(["light", "dark", "plum-dark"]);
  });

  it("accepts commas as separators and de-duplicates", () => {
    const el = mount({ themes: "light, dark  light" });
    expect(names(el)).toEqual(["light", "dark"]);
  });

  it("skips an unknown name, reports it, and keeps the rest", () => {
    const el = mount({ themes: "light nord" });
    expect(names(el)).toEqual(["light"]);

    expect(warn).toHaveBeenCalled();
    const [, diagnostic] = warn.mock.calls[0] as [string, { context: Record<string, unknown> }];
    expect(diagnostic.context).toMatchObject({
      api: TAG,
      property: "themes",
      received: ["nord"],
    });
  });

  it("ignores a list that resolves nothing and reports once", () => {
    const el = mount({ themes: "nord dracula" });
    expect(names(el)).toEqual(getBuiltInThemes().map((t) => String(t.name)));

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not construct a theme from an unknown identifier", () => {
    const el = mount({ themes: "brand-new" });
    expect(names(el)).not.toContain("brand-new");
  });
});

describe("themes attribute — JSON syntax", () => {
  it("still accepts a JSON array of theme definitions", () => {
    const el = mount({
      themes: JSON.stringify([
        { name: "brand-light", meta: { family: "brand", mode: "light" } },
        { name: "brand-dark", meta: { family: "brand", mode: "dark" } },
      ]),
      "default-theme": "brand-dark",
    });

    expect(names(el)).toEqual(["brand-light", "brand-dark"]);
    expect(String(getProviderRuntime(el)!.store.get().name)).toBe("brand-dark");
  });

  it("ignores malformed JSON, reports it and keeps the built-in catalog", () => {
    const el = mount({ themes: "[{" });
    expect(names(el)).toEqual(getBuiltInThemes().map((t) => String(t.name)));
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("rejects a JSON array whose entries have no string name", () => {
    const el = mount({ themes: '[{"family":"x"}]' });
    expect(names(el)).toEqual(getBuiltInThemes().map((t) => String(t.name)));
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("default-theme", () => {
  it("applies the named theme at initialization", () => {
    const el = mount({ "default-theme": "plum-dark" });
    expect(String(getProviderRuntime(el)!.store.get().name)).toBe("plum-dark");
  });

  it("reports an unknown name and falls back to the catalog's first theme", () => {
    const el = mount({ "default-theme": "nord" });
    expect(String(getProviderRuntime(el)!.store.get().name)).toBe("light");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("re-resolves the selection when changed, without recreating the runtime", () => {
    const el = mount({ "default-theme": "light" });
    const runtime = getProviderRuntime(el)!;

    el.setAttribute("default-theme", "berry-dark");

    expect(getProviderRuntime(el)).toBe(runtime);
    expect(String(runtime.store.get().name)).toBe("berry-dark");
  });

  it("does not reset the live selection when the attribute is removed", () => {
    const el = mount({ "default-theme": "light" });
    const runtime = getProviderRuntime(el)!;
    runtime.selection.setMode("dark");

    el.removeAttribute("default-theme");

    // Removal stops the attribute contributing; it is not a reset. The
    // selection the visitor made survives, as documented.
    expect(String(runtime.store.get().name)).toBe("dark");
  });
});

describe("initial-mode", () => {
  it("accepts the documented values case-insensitively", () => {
    const el = mount({ "initial-mode": "DARK" });
    expect(getProviderRuntime(el)!.selection.getMode()).toBe("dark");
  });

  it("ignores an unknown value, reports it and keeps the derived mode", () => {
    const el = mount({ "default-theme": "light", "initial-mode": "sepia" });
    const runtime = getProviderRuntime(el)!;

    expect(runtime.selection.getMode()).not.toBe("sepia");
    expect(warn).toHaveBeenCalledTimes(1);
    const [, diagnostic] = warn.mock.calls[0] as [string, { context: Record<string, unknown> }];
    expect(diagnostic.context).toMatchObject({
      property: "initial-mode",
      received: "sepia",
    });
  });
});

describe("catalog changes", () => {
  it("preserves a still-valid selection", () => {
    const el = mount({ themes: "light dark" });
    const runtime = getProviderRuntime(el)!;
    runtime.selection.setMode("dark");
    expect(String(runtime.store.get().name)).toBe("dark");

    el.setAttribute("themes", "light dark plum-dark");

    expect(String(runtime.store.get().name)).toBe("dark");
  });

  it("reconciles a selection the new catalog no longer has", () => {
    const el = mount({
      themes: JSON.stringify([
        { name: "brand-light", meta: { family: "brand", mode: "light" } },
      ]),
      "default-theme": "brand-light",
    });
    expect(String(getProviderRuntime(el)!.store.get().name)).toBe("brand-light");

    el.setAttribute("themes", "light dark");

    const runtime = getProviderRuntime(el)!;
    expect(String(runtime.store.get().name)).toBe("light");
    expect(runtime.store.get().name).not.toBe("brand-light");
  });

  it("leaves the live catalog alone when the attribute is removed", () => {
    const el = mount({ themes: "light dark" });
    const runtime = getProviderRuntime(el)!;

    el.removeAttribute("themes");

    // Documented removal semantics: the attribute stops contributing, the
    // runtime keeps its catalog. It is re-derived on the next mount.
    expect(getProviderRuntime(el)).toBe(runtime);
    expect(names(el)).toEqual(["light", "dark"]);
  });

  it("announces a catalog change once, and not on initialization", async () => {
    const events: string[][] = [];
    document.addEventListener(THEMES_CHANGE_EVENT, (event) => {
      events.push([...(event as CustomEvent<{ themes: string[] }>).detail.themes]);
    });

    const el = mount({ themes: "light dark" });
    expect(events).toHaveLength(0);

    el.setAttribute("themes", "light dark plum-dark");
    await flushEvents();
    expect(events).toEqual([["light", "dark", "plum-dark"]]);

    // A non-catalog edit must not announce a catalog change.
    el.setAttribute("default-theme", "plum-dark");
    await flushEvents();
    expect(events).toHaveLength(1);
  });
});

describe("feedback safety", () => {
  it("converges when a consumer reflects state into an observed attribute", async () => {
    const el = mount({ themes: "light dark" });
    const runtime = getProviderRuntime(el)!;

    // A consumer that reflects its own state into `themes` while handling the
    // catalog event must not recurse: the event is delivered after the current
    // configuration settles, so the write is applied instead of being dropped
    // by the re-entrancy guard, and the second pass produces the same catalog.
    const onThemesChange = () => {
      el.setAttribute("themes", "light dark plum-dark");
    };
    el.addEventListener(THEMES_CHANGE_EVENT, onThemesChange);

    expect(() => el.setAttribute("themes", "light dark berry-dark")).not.toThrow();
    await flushEvents();
    await flushEvents();

    expect(getProviderRuntime(el)).toBe(runtime);
    expect(names(el)).toEqual(["light", "dark", "plum-dark"]);

    el.removeEventListener(THEMES_CHANGE_EVENT, onThemesChange);
  });
});
