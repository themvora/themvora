// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import {
  createOverlayScrollbar,
  hideNativeScrollbar,
  restoreNativeScrollbar,
  SCROLLBAR_HIDING_STYLE_ATTR,
  SCROLLBAR_HIDING_STYLE_ID,
} from "../src/utils/overlay-scrollbar";
import { createThemeStore } from "../src/createThemeStore";
import { defineTheme } from "../src/model";

// jsdom has no ResizeObserver; the engine only observes with it.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

const theme = defineTheme({
  name: "restore-theme",
  meta: { family: "restore", mode: "light" },
  tokens: {
    colors: {
      background: "#ffffff",
      foreground: "#000000",
      primary: "#0066cc",
      border: "#e0e0e0",
      muted: "#f5f5f5",
      accent: "#e6f0ff",
    },
    radius: { lg: "8px" },
  },
});

const store = () => createThemeStore({ initialTheme: theme });

const html = () => document.documentElement;
const hidingSheets = () =>
  document.querySelectorAll(`style[${SCROLLBAR_HIDING_STYLE_ATTR}]`);
const isHidden = () => html().classList.contains("tv-scrollbar");

describe("native scrollbar hiding is a claim, not a switch", () => {
  afterEach(() => {
    // Hard reset: drops any claim a failing test left behind, so one failure
    // cannot cascade into the next test's assertions.
    restoreNativeScrollbar();
    document.body.innerHTML = "";
  });

  it("hides the native scrollbar while an overlay is alive", () => {
    const handle = createOverlayScrollbar(store(), {})!;

    expect(isHidden()).toBe(true);
    expect(hidingSheets().length).toBe(1);

    handle.destroy();
  });

  it("restores the native scrollbar when the overlay is destroyed", () => {
    const handle = createOverlayScrollbar(store(), {})!;
    expect(isHidden()).toBe(true);

    handle.destroy();

    // The bug this locks down: destroy() used to remove the rails but leave
    // `tv-scrollbar` and the hiding stylesheet on the document, so a page that
    // unmounted <ThemeScrollbar /> kept the native bar hidden with nothing
    // drawing a replacement — no scrollbar at all.
    expect(isHidden()).toBe(false);
    expect(html().classList.contains("tv-scrollbar-ready")).toBe(false);
    expect(hidingSheets().length).toBe(0);
    expect(document.getElementById(SCROLLBAR_HIDING_STYLE_ID)).toBeNull();
  });

  it("keeps the native bar hidden while a second overlay is still drawing", () => {
    const first = createOverlayScrollbar(store(), {})!;
    const second = createOverlayScrollbar(store(), {})!;

    first.destroy();

    // One overlay is still live, so handing the native bar back would show two
    // scrollbars at once.
    expect(isHidden()).toBe(true);
    expect(hidingSheets().length).toBe(1);

    second.destroy();

    expect(isHidden()).toBe(false);
    expect(hidingSheets().length).toBe(0);
  });

  it("survives an overlay swap without ever handing the native bar back", () => {
    // This is the ordering `ThemvoraScrollbar.rebuild()` uses for an attribute
    // change: create the replacement first, then destroy the incumbent. If it
    // destroyed first, the count would hit zero for one task and the native bar
    // would flash back in, reflowing the page by its width.
    const first = createOverlayScrollbar(store(), {})!;
    const second = createOverlayScrollbar(store(), {})!;
    first.destroy();

    expect(isHidden()).toBe(true);

    second.destroy();
    expect(isHidden()).toBe(false);
  });

  it("releases a claim only once, so a double destroy cannot disarm another overlay", () => {
    const first = createOverlayScrollbar(store(), {})!;
    const second = createOverlayScrollbar(store(), {})!;

    first.destroy();
    first.destroy();
    first.destroy();

    expect(isHidden()).toBe(true);

    second.destroy();
    expect(isHidden()).toBe(false);
  });

  it("finds and removes a server-rendered hiding stylesheet that has no id", () => {
    // The Astro provider renders the rules inline in <head> with only the
    // marker attribute — `getElementById` cannot find it, which is why an
    // id-only teardown left the page hidden.
    document.documentElement.classList.add("tv-scrollbar");
    const ssr = document.createElement("style");
    ssr.setAttribute(SCROLLBAR_HIDING_STYLE_ATTR, "");
    ssr.textContent = "html.tv-scrollbar{scrollbar-width:none}";
    document.head.appendChild(ssr);

    restoreNativeScrollbar();

    expect(isHidden()).toBe(false);
    expect(hidingSheets().length).toBe(0);
  });

  it("adopts an existing hiding stylesheet instead of stacking a duplicate", () => {
    document.documentElement.classList.add("tv-scrollbar");
    const ssr = document.createElement("style");
    ssr.setAttribute(SCROLLBAR_HIDING_STYLE_ATTR, "");
    document.head.appendChild(ssr);

    const handle = createOverlayScrollbar(store(), {})!;

    expect(hidingSheets().length).toBe(1);

    handle.destroy();
    expect(hidingSheets().length).toBe(0);
  });

  it("reports the hiding to the caller through hideNativeScrollbar", () => {
    const release = hideNativeScrollbar();

    expect(isHidden()).toBe(true);
    expect(hidingSheets().length).toBe(1);

    release();
    expect(isHidden()).toBe(false);

    // Releasing twice must not restore a second time and must not go negative.
    const release2 = hideNativeScrollbar();
    release();
    expect(isHidden()).toBe(true);
    release2();
    expect(isHidden()).toBe(false);
  });

  it("leaves coarse-pointer devices on their native scrollbars", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("coarse"),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    })) as any;

    try {
      const handle = createOverlayScrollbar(store(), {});
      expect(handle).toBeNull();
      expect(isHidden()).toBe(false);
      expect(hidingSheets().length).toBe(0);
    } finally {
      window.matchMedia = original;
    }
  });
});
