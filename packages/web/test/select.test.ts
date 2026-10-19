// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDiagnosticEmission } from "@themvora/core";
import { getProviderRuntime } from "../src/utils";
import "../src/index";

/**
 * Phase 3.2 — the select.
 *
 * The control is native and its options are derived from the canonical
 * runtime: no family list of its own, no stale option after a catalog change,
 * and a selection it cannot resolve snaps back instead of lying.
 */

const provider = () => document.querySelector("themvora-provider") as HTMLElement;

function mount(selectAttributes: string, providerAttributes = 'default-theme="light"') {
  document.body.innerHTML = `<themvora-provider ${providerAttributes}><themvora-select ${selectAttributes}></themvora-select></themvora-provider>`;
  const host = document.querySelector("themvora-select") as HTMLElement;
  const select = host.querySelector("select") as HTMLSelectElement;
  return { host, select };
}

function values(select: HTMLSelectElement): string[] {
  return Array.from(select.options).map((option) => option.value);
}

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

describe("themvora-select — mode", () => {
  it("lists the canonical modes and reflects the current one", () => {
    const { select } = mount('type="mode"', 'default-theme="light" initial-mode="dark"');

    expect(values(select)).toEqual(["system", "light", "dark"]);
    expect(select.value).toBe("dark");
    expect(select.getAttribute("aria-label")).toBe("Theme mode");
  });

  it("changes the mode through the canonical selection API", () => {
    const { select } = mount('type="mode"');
    const runtime = getProviderRuntime(provider())!;

    select.value = "dark";
    select.dispatchEvent(new Event("change"));

    expect(runtime.selection.getMode()).toBe("dark");
  });

  it("follows a mode change made elsewhere", () => {
    const { select } = mount('type="mode"');
    const runtime = getProviderRuntime(provider())!;

    runtime.selection.setMode("system");

    expect(select.value).toBe("system");
  });

  it("defaults to the mode list when `type` is absent", () => {
    const { select } = mount("");
    expect(values(select)).toEqual(["system", "light", "dark"]);
  });

  it("falls back to mode and reports an unknown `type`", () => {
    const { select } = mount('type="variant"');

    expect(values(select)).toEqual(["system", "light", "dark"]);
    expect(warn).toHaveBeenCalledTimes(1);
    const [, diagnostic] = warn.mock.calls[0] as [string, { context: Record<string, unknown> }];
    expect(diagnostic.context).toMatchObject({
      property: "type",
      received: "variant",
    });
  });
});

describe("themvora-select — family", () => {
  it("derives the options from the provider catalog", () => {
    const { select } = mount('type="family"', 'themes="plum-light plum-dark berry-light"');

    expect(values(select)).toEqual(["plum", "berry"]);
    expect(select.getAttribute("aria-label")).toBe("Theme family");
  });

  it("uses the `label` attribute as the accessible name", () => {
    const { select } = mount('type="family" label="Colour family"');
    expect(select.getAttribute("aria-label")).toBe("Colour family");
  });

  it("changes the family through the canonical selection API", () => {
    const { select } = mount('type="family"');
    const runtime = getProviderRuntime(provider())!;

    select.value = "plum";
    select.dispatchEvent(new Event("change"));

    expect(runtime.selection.getFamily()).toBe("plum");
  });

  it("drops an option the new catalog no longer has", () => {
    const { select } = mount('type="family"', 'themes="plum-light plum-dark berry-light"');
    expect(values(select)).toEqual(["plum", "berry"]);

    provider().setAttribute("themes", "plum-light plum-dark");

    expect(values(select)).toEqual(["plum"]);
    expect(select.value).toBe("plum");
  });

  it("snaps back to the real family when the control holds an unregistered one", () => {
    const { select } = mount('type="family"');
    const runtime = getProviderRuntime(provider())!;
    const before = runtime.selection.getFamily();

    // A consumer script wrote a value the runtime does not know.
    select.appendChild(new Option("ghost", "ghost"));
    select.value = "ghost";
    select.dispatchEvent(new Event("change"));

    expect(runtime.selection.getFamily()).toBe(before);
    expect(select.value).toBe(before);
  });
});

describe("themvora-select — lifecycle", () => {
  it("reuses the rendered select across a reconnect and keeps one change listener", () => {
    const { host, select } = mount('type="mode"');
    const runtime = getProviderRuntime(provider())!;
    const setMode = vi.spyOn(runtime.selection, "setMode");

    host.remove();
    provider().appendChild(host);

    // The same <select> node is still the element's child.
    expect(host.querySelector("select")).toBe(select);

    select.value = "dark";
    select.dispatchEvent(new Event("change"));

    expect(setMode).toHaveBeenCalledTimes(1);
  });
});
