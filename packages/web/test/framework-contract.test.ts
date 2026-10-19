// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDiagnosticEmission } from "@themvora/core";
import { getProviderRuntime } from "../src/utils";
import { THEMES_CHANGE_EVENT } from "../src/events";
import "../src/index";

/**
 * Phase 6 — the framework-neutral contract.
 *
 * Every framework template ends up doing one of three things to a custom
 * element: setting an attribute before insertion, setting it after insertion,
 * and listening for a DOM event. This file exercises those three operations
 * with the shapes frameworks actually produce, plus the multi-provider case
 * that a duplicated provider would break.
 *
 * What this does *not* do is run React, Vue, Svelte, Solid or Angular itself —
 * no such harness exists for `@themvora/web` in this repository. The
 * framework-specific requirements that remain (JSX typings, Vue's
 * `isCustomElement`, Angular's `CUSTOM_ELEMENTS_SCHEMA`) are compile-time
 * concerns and are documented in the Web Components guide.
 */

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetDiagnosticEmission();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
  warn.mockRestore();
  localStorage.clear();
});

describe("framework template contract", () => {
  it("applies attributes set before the element is inserted (SSR/JSX markup)", () => {
    // What a server render or a JSX template produces: the element is created
    // detached, attributes are set, then it is inserted.
    const provider = document.createElement("themvora-provider");
    provider.setAttribute("themes", "light dark plum-light plum-dark");
    provider.setAttribute("default-theme", "plum-dark");
    provider.setAttribute("initial-mode", "dark");

    const toggle = document.createElement("themvora-toggle");
    provider.appendChild(toggle);
    document.body.appendChild(provider);

    const runtime = getProviderRuntime(provider)!;
    expect(runtime.themes.map((theme) => String(theme.name))).toEqual([
      "light",
      "dark",
      "plum-light",
      "plum-dark",
    ]);
    expect(String(runtime.store.get().name)).toBe("plum-dark");
    expect(toggle.querySelector("button")).toBeTruthy();
  });

  it("applies attributes set after insertion (a framework re-render)", () => {
    document.body.innerHTML = `<themvora-provider default-theme="light"><themvora-toggle></themvora-toggle></themvora-provider>`;
    const provider = document.querySelector("themvora-provider") as HTMLElement;
    const runtime = getProviderRuntime(provider)!;

    // React/Vue/Svelte all patch attributes on the live node after mount.
    provider.setAttribute("default-theme", "berry-dark");

    expect(getProviderRuntime(provider)).toBe(runtime);
    expect(String(runtime.store.get().name)).toBe("berry-dark");
  });

  it("lets a listener on an ancestor observe the catalog event", async () => {
    document.body.innerHTML = `<div id="app"><themvora-provider themes="light dark"></themvora-provider></div>`;
    const app = document.getElementById("app")!;
    const provider = document.querySelector("themvora-provider") as HTMLElement;

    const seen: string[][] = [];
    app.addEventListener(THEMES_CHANGE_EVENT, (event) => {
      seen.push([...(event as CustomEvent<{ themes: string[] }>).detail.themes]);
    });

    provider.setAttribute("themes", "light dark plum-dark");
    // The event is dispatched on a microtask, after the configuration settles.
    await Promise.resolve();
    await Promise.resolve();

    // Bubbles to the framework's root node, which is where its event wiring
    // usually sits.
    expect(seen).toEqual([["light", "dark", "plum-dark"]]);
  });

  it("gives each provider its own runtime and does not share state", () => {
    document.body.innerHTML = `
      <themvora-provider id="a" default-theme="light"><themvora-toggle></themvora-toggle></themvora-provider>
      <themvora-provider id="b" default-theme="dark"><themvora-toggle></themvora-toggle></themvora-provider>`;

    const a = document.getElementById("a") as HTMLElement;
    const b = document.getElementById("b") as HTMLElement;
    const runtimeA = getProviderRuntime(a)!;
    const runtimeB = getProviderRuntime(b)!;

    expect(runtimeA).not.toBe(runtimeB);
    expect(String(runtimeA.store.get().name)).toBe("light");
    expect(String(runtimeB.store.get().name)).toBe("dark");

    runtimeA.selection.setMode("dark");

    expect(String(runtimeA.store.get().name)).toBe("dark");
    expect(String(runtimeB.store.get().name)).toBe("dark");
    expect(runtimeB.selection.getMode()).toBe("dark");

    // Each toggle drives its own provider, not the first one on the page.
    runtimeA.selection.setMode("light");
    (b.querySelector("themvora-toggle button") as HTMLButtonElement).click();
    expect(runtimeB.selection.getMode()).toBe("light");
    expect(runtimeA.selection.getMode()).toBe("light");
  });

  it("creates exactly one runtime per provider even after a double registration", () => {
    // A second `customElements.define` for the same tag is a no-op, so a
    // duplicated import cannot produce a second upgrade pass.
    document.body.innerHTML = `<themvora-provider default-theme="light"></themvora-provider>`;
    const provider = document.querySelector("themvora-provider") as HTMLElement;
    const runtime = getProviderRuntime(provider)!;

    const before = provider.innerHTML;
    expect(() => customElements.define("themvora-provider", class extends HTMLElement {})).toThrow();
    expect(getProviderRuntime(provider)).toBe(runtime);
    expect(provider.innerHTML).toBe(before);
  });
});
