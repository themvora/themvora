// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getThemeMode, resetDiagnosticEmission } from "@themvora/core";
import { getProviderRuntime } from "../src/utils";
import "../src/index";

/**
 * Phase 3.1 — the toggle.
 *
 * Out of the box it must render a recognizable, accessible control with no
 * consumer icons, no consumer stylesheet and no JavaScript, and it must follow
 * the canonical mode when something else changes it.
 */

const provider = () => document.querySelector("themvora-provider") as HTMLElement;

function mount(providerAttributes: Record<string, string> = {}) {
  const attrs = Object.entries(providerAttributes)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ");
  document.body.innerHTML = `<themvora-provider ${attrs}><themvora-toggle></themvora-toggle></themvora-provider>`;
  const host = document.querySelector("themvora-toggle") as HTMLElement;
  const button = host.querySelector("button") as HTMLButtonElement;
  return { host, button };
}

beforeEach(() => {
  resetDiagnosticEmission();
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
});

describe("themvora-toggle", () => {
  it("renders a native button with a built-in icon", () => {
    const { button } = mount({ "default-theme": "light" });

    expect(button).toBeTruthy();
    expect(button.type).toBe("button");
    // No icon package, no consumer stylesheet: the glyph is inline SVG.
    expect(button.querySelector("svg")).toBeTruthy();
    // The element itself is not a second tab stop.
    expect(document.querySelector("themvora-toggle")?.getAttribute("role")).toBeNull();
    expect(document.querySelector("themvora-toggle")?.getAttribute("tabindex")).toBeNull();
  });

  it("exposes a stable accessible name and the current state", () => {
    const { button } = mount({ "default-theme": "light" });

    expect(button.getAttribute("aria-label")).toBe("Dark mode");
    expect(button.getAttribute("aria-pressed")).toBe("false");

    button.click();

    expect(button.getAttribute("aria-pressed")).toBe("true");
    // The name does not change, so assistive tech reports "Dark mode, pressed".
    expect(button.getAttribute("aria-label")).toBe("Dark mode");
  });

  it("toggles the canonical mode and reflects it on the host", () => {
    const { host, button } = mount({ "default-theme": "light" });
    const runtime = getProviderRuntime(provider())!;

    button.click();
    expect(runtime.selection.getMode()).toBe("dark");
    expect(String(runtime.store.get().name)).toBe("dark");
    expect(host.getAttribute("data-mode")).toBe("dark");

    button.click();
    expect(runtime.selection.getMode()).toBe("light");
    expect(host.getAttribute("data-mode")).toBe("light");
  });

  it("follows a mode change made through the runtime API", () => {
    const { button } = mount({ "default-theme": "light" });
    const runtime = getProviderRuntime(provider())!;

    runtime.selection.setMode("dark");

    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.querySelector("svg")).toBeTruthy();
  });

  it("shows a `system` state while the selection follows the OS", () => {
    const { button } = mount({ "default-theme": "light", "initial-mode": "system" });
    const runtime = getProviderRuntime(provider())!;

    // jsdom has no `matchMedia`, so the system preference resolves to light.
    expect(runtime.selection.getMode()).toBe("system");
    expect(getThemeMode(runtime.store.get())).toBe("light");

    // The control reports what the visitor asked for: following the system.
    expect(button.getAttribute("aria-pressed")).toBe("mixed");
    expect(provider().querySelector("themvora-toggle")?.getAttribute("data-mode")).toBe("system");
    // …with the monitor glyph, not the sun the resolved light theme would show.
    expect(button.querySelector("svg rect")).toBeTruthy();
    expect(button.querySelector("svg circle")).toBeNull();

    // Activating it pins an explicit mode rather than staying on `system`.
    button.click();
    expect(runtime.selection.getMode()).toBe("dark");
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("releases its subscriptions on disconnect and restores exactly one set on reconnect", () => {
    document.body.innerHTML = `<themvora-provider default-theme="light"></themvora-provider>`;
    const p = provider();
    const runtime = getProviderRuntime(p)!;

    // Wrap the canonical subscribe functions so every returned unsubscribe is
    // observable. A leaked subscription is exactly what a re-mounted element
    // used to leave behind.
    const records: Array<{ active: boolean; release: () => void }> = [];
    const instrument = (target: { subscribe: (listener: never) => () => void }) => {
      const original = target.subscribe.bind(target);
      target.subscribe = ((listener: never) => {
        const inner = original(listener);
        const record = {
          active: true,
          release: () => {
            record.active = false;
            inner();
          },
        };
        records.push(record);
        return record.release;
      }) as never;
    };
    instrument(runtime.selection as never);
    instrument(runtime.store as never);

    const host = document.createElement("themvora-toggle");
    p.appendChild(host);
    const active = () => records.filter((record) => record.active).length;

    // One subscription per source: selection and store.
    expect(active()).toBe(2);

    host.remove();
    expect(active()).toBe(0);

    p.appendChild(host);
    expect(active()).toBe(2);
    expect(records).toHaveLength(4);
  });

  it("does not double-toggle after a reconnect", () => {
    const { host, button } = mount({ "default-theme": "light" });
    const runtime = getProviderRuntime(provider())!;

    host.remove();
    provider().appendChild(host);

    button.click();

    expect(runtime.selection.getMode()).toBe("dark");
  });

  it("rebuilds its icon when a consumer replaced the element's children", () => {
    const { host } = mount({ "default-theme": "dark" });

    host.replaceChildren();
    host.remove();
    provider().appendChild(host);

    const button = host.querySelector("button") as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.querySelector("svg")).toBeTruthy();
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });
});
