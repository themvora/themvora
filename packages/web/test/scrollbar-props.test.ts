// @vitest-environment jsdom
/**
 * Every overlay option is an attribute, and every attribute must be live.
 *
 * ## What this file pins
 *
 * Two failures that look identical from the outside — "changing a prop does
 * nothing until you reload" — and a third that made changing one *worse* than
 * not changing it:
 *
 * 1. An attribute the element does not observe never reaches the engine. The
 *    engine resolves its options once, when the overlay is built, so an
 *    unobserved attribute is silently ignored forever.
 * 2. An attribute observed but not re-read is ignored the same way.
 * 3. A rebuild that destroys before it creates drops the native-scrollbar
 *    hiding to zero for one task. The native bar comes back, the page reflows
 *    by the bar's width, and the new overlay takes it away again — a visible
 *    flash on every prop change. `rebuild()` therefore creates first.
 *
 * The attribute table is derived from `ThemvoraScrollbar.observedAttributes`,
 * so a newly added option is covered without touching this file — and a
 * separate contract test fails if that list ever stops matching the attributes
 * `optionsFrom` actually reads.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createThemeRuntime, restoreNativeScrollbar, type ThemeRuntime, type ThemeDefinition } from "@themvora/core";
import { ThemvoraScrollbar } from "../src/scrollbar";

const RAILS = ".tv-scrollbar[data-themvora-host]";

function rails(): Element[] {
  return [...document.querySelectorAll(RAILS)];
}

/** A representative valid value for each attribute the element observes. */
const SAMPLE: Record<string, string> = {
  "auto-hide": "false",
  "auto-hide-delay": "250",
  "hover-expand": "",
  draggable: "false",
  "click-to-jump": "false",
  smooth: "",
  overscroll: "false",
  arrows: "false",
  "arrow-icon": "<b>!</b>",
  "arrow-up-icon": "<b>^</b>",
  "arrow-down-icon": "<b>v</b>",
  "arrow-left-icon": "<b>&lt;</b>",
  "arrow-right-icon": "<b>&gt;</b>",
  touch: "",
  thickness: "12",
  "hover-thickness": "18",
  radius: "4",
  "min-thumb-size": "48",
  "icon-size": "10",
  offset: "6",
  "offset-top": "8",
  "offset-right": "9",
  "offset-bottom": "10",
  "offset-left": "11",
  "track-opacity": "0.5",
  "thumb-opacity": "0.6",
  duration: "120",
  "animation-duration": "90",
  "thumb-color": "#123456",
  "track-color": "#654321",
  "active-thumb-color": "#abcdef",
  "thumb-hover-color": "#fedcba",
  "z-index": "42",
  dir: "rtl",
  axes: "vertical",
  include: ".panel",
  exclude: ".skip",
};

let runtime: ThemeRuntime<ThemeDefinition> | null = null;
let host: HTMLElement;

function mount(): HTMLElement {
  runtime = createThemeRuntime({});
  host = document.createElement("div");
  (host as any).__themvoraRuntime = runtime;
  document.body.appendChild(host);
  ThemvoraScrollbar.define();
  const el = document.createElement("themvora-scrollbar");
  host.appendChild(el);
  return el;
}

/** Lets the manager run its first render pass (rAF + the 80 ms ready timer). */
function settle(ms = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  restoreNativeScrollbar();
  document.body.innerHTML = "";
  document.documentElement.className = "";
});

afterEach(() => {
  document.body.innerHTML = "";
  runtime?.destroy();
  runtime = null;
  restoreNativeScrollbar();
  document.documentElement.className = "";
});

describe("every observed attribute rebuilds the overlay", () => {
  it("covers every attribute the element declares", async () => {
    const el = mount();
    await settle();

    const missing = ThemvoraScrollbar.observedAttributes.filter((a) => !(a in SAMPLE));
    // If this fails, a new option was added to `observedAttributes` without a
    // sample value here — add one so the reactivity table keeps covering it.
    expect(missing).toEqual([]);
  });

  it("rebuilds on each attribute, one at a time", async () => {
    const el = mount();
    await settle();
    expect(rails().length).toBeGreaterThan(0);

    const unhandled: string[] = [];

    for (const attr of ThemvoraScrollbar.observedAttributes) {
      const value = SAMPLE[attr];
      if (value === undefined) continue;

      // Mark the incumbent rails so a rebuild is observable as their removal.
      for (const rail of rails()) rail.setAttribute("data-before", "1");

      el.setAttribute(attr, value);
      await settle(60);

      const replaced = rails().every((rail) => !rail.hasAttribute("data-before"));
      if (!replaced || rails().length === 0) unhandled.push(attr);
    }

    // The bug was silence: the attribute changed, the overlay did not.
    expect(unhandled).toEqual([]);
  });

  it("applies a changed value, not just a rebuild", async () => {
    const el = mount();
    await settle();

    el.setAttribute("thumb-color", "#123456");
    await settle(60);

    const vertical = document.querySelector(".tv-scrollbar.tv-v[data-themvora-host]") as HTMLElement | null;
    expect(vertical).not.toBeNull();
    expect(vertical!.style.getPropertyValue("--tv-scrollbar-thumb").trim()).toBe("#123456");
  });

  it("never hands the native scrollbar back while swapping overlays", async () => {
    const el = mount();
    await settle();

    // A MutationObserver callback runs after the whole task, so reading
    // `className` there would only ever see the settled value and a
    // remove-then-re-add inside one task would look like nothing happened.
    // `attributeOldValue` records the value *before* each mutation, so a
    // destroy-first rebuild shows up as a mutation whose previous class list
    // had already lost `tv-scrollbar`.
    const previousValues: string[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.oldValue !== null) previousValues.push(record.oldValue);
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
      attributeOldValue: true,
    });

    for (const attr of ["thickness", "radius", "thumb-color", "dir", "arrows"]) {
      el.setAttribute(attr, SAMPLE[attr]!);
      await settle(60);
    }
    observer.disconnect();

    const lapsed = previousValues.filter((value) => !value.includes("tv-scrollbar"));
    expect(lapsed).toEqual([]);
    expect(document.documentElement.classList.contains("tv-scrollbar")).toBe(true);
  });

  it("applies an attribute set before the runtime attaches", async () => {
    // A framework may set attributes on the element before a provider runtime
    // exists. The first `onRuntime` must read them as they are, not the
    // defaults it saw at construction time.
    const el = document.createElement("themvora-scrollbar");
    el.setAttribute("thumb-color", "#abcdef");
    const local = createThemeRuntime({});
    const container = document.createElement("div");
    (container as any).__themvoraRuntime = local;
    document.body.appendChild(container);
    ThemvoraScrollbar.define();
    container.appendChild(el);
    await settle();

    const vertical = document.querySelector(".tv-scrollbar.tv-v[data-themvora-host]") as HTMLElement | null;
    expect(vertical).not.toBeNull();
    expect(vertical!.style.getPropertyValue("--tv-scrollbar-thumb").trim()).toBe("#abcdef");

    local.destroy();
  });

  it("restores the native scrollbar when the element is removed", async () => {
    const el = mount();
    await settle();
    expect(document.documentElement.classList.contains("tv-scrollbar")).toBe(true);

    el.remove();
    await settle(60);

    expect(document.documentElement.classList.contains("tv-scrollbar")).toBe(false);
    expect(document.documentElement.classList.contains("tv-scrollbar-ready")).toBe(false);
    expect(document.querySelector("style[data-themvora-scrollbar-hiding]")).toBeNull();
    expect(rails().length).toBe(0);
  });
});
