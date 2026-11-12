// @vitest-environment jsdom
/**
 * Scope + spacing contract for the overlay scrollbar.
 *
 * Two behaviours are covered here because both are about space the overlay
 * should *not* consume:
 *
 *  1. An excluded container (`scope.exclude`) keeps no scrollbar gutter. The
 *     pre-paint CSS reserves a bar's width on every element so the overlay never
 *     reflows the page; an excluded element never receives an overlay, so that
 *     reservation has to be collapsed or it reads as an empty strip down the
 *     edge with nothing in it.
 *  2. `offset: 0` means flush against the edge — on every host, including the
 *     page scrollbar, which used to be hard-wired to the defaults.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createOverlayScrollbar,
  createPrePaintScrollbarCSS,
} from "../src/utils/overlay-scrollbar";
import { createThemeStore } from "../src/createThemeStore";
import { defineTheme } from "../src/model";

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const STRIP_SELECTOR = ".tv-scrollbar[data-themvora-host]";
const EXCLUDED_ATTR = "data-themvora-scrollbar";
const EXCLUDED_VALUE = "excluded";

const theme = defineTheme({
  name: "scope-test",
  meta: { family: "test", mode: "light" },
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

/** A scrollable element jsdom will agree is scrollable. */
function makeScrollable(className: string): HTMLElement {
  const el = document.createElement("div");
  el.className = className;
  el.style.overflowY = "auto";
  el.style.overflowX = "auto";
  Object.defineProperty(el, "scrollHeight", { value: 500, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: 50, configurable: true });
  Object.defineProperty(el, "scrollWidth", { value: 500, configurable: true });
  Object.defineProperty(el, "clientWidth", { value: 200, configurable: true });
  document.body.appendChild(el);
  return el;
}

/** The document has to report overflow for the root strip to lay out. */
function makeDocumentScrollable(): void {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: 5000,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, "clientHeight", {
    value: 1000,
    configurable: true,
  });
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)));

describe("scope.exclude — no reserved gutter", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.classList.remove("tv-scrollbar");
    document.documentElement.classList.remove("tv-scrollbar-ready");
    document.getElementById("tv-scrollbar-style")?.remove();
  });

  it("marks an excluded container and gives it no strip", async () => {
    makeDocumentScrollable();
    const excluded = makeScrollable("toc-rail");

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { exclude: ["[class*=toc-rail]"] });
    handle!.update();
    await nextFrame();

    expect(excluded.getAttribute(EXCLUDED_ATTR)).toBe(EXCLUDED_VALUE);
    // No strip may point at the excluded element.
    const strips = Array.from(document.querySelectorAll<HTMLElement>(STRIP_SELECTOR));
    expect(strips.length).toBe(2); // root vertical + horizontal only

    handle!.destroy();
  });

  it("leaves tracked containers on the overlay marker", async () => {
    makeDocumentScrollable();
    const tracked = makeScrollable("content");

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".content"] });
    handle!.update();
    await nextFrame();

    expect(tracked.getAttribute(EXCLUDED_ATTR)).toBe("overlay");

    handle!.destroy();
  });

  it("removes the marker on destroy so the native gutter returns", async () => {
    makeDocumentScrollable();
    const excluded = makeScrollable("toc-rail");

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { exclude: ["[class*=toc-rail]"] });
    handle!.update();
    await nextFrame();
    expect(excluded.getAttribute(EXCLUDED_ATTR)).toBe(EXCLUDED_VALUE);

    handle!.destroy();
    expect(excluded.hasAttribute(EXCLUDED_ATTR)).toBe(false);
  });

  it("unmarks a container that stops matching the exclude selector", async () => {
    makeDocumentScrollable();
    const el = makeScrollable("panel");

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { exclude: [".panel"] });
    handle!.update();
    await nextFrame();
    expect(el.getAttribute(EXCLUDED_ATTR)).toBe(EXCLUDED_VALUE);

    // The container leaves the excluded scope; a rescan must unmark it.
    el.className = "panel-now-tracked";
    handle!.update();
    await nextFrame();
    expect(el.getAttribute(EXCLUDED_ATTR)).not.toBe(EXCLUDED_VALUE);

    handle!.destroy();
  });

  it("does not mark the strip DOM itself", async () => {
    makeDocumentScrollable();
    makeScrollable("toc-rail");

    const store = createThemeStore({ initialTheme: theme });
    // A descendant selector would otherwise reach into a strip if one existed
    // inside the container; the marker must never land on our own nodes.
    const handle = createOverlayScrollbar(store, { exclude: ["body *"] });
    handle!.update();
    await nextFrame();

    const markedStrips = document.querySelectorAll(
      `[data-themvora-host][${EXCLUDED_ATTR}="${EXCLUDED_VALUE}"]`,
    );
    expect(markedStrips.length).toBe(0);

    handle!.destroy();
  });
});

describe("offset: 0 — flush against the edge", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.classList.remove("tv-scrollbar");
    document.documentElement.classList.remove("tv-scrollbar-ready");
    document.getElementById("tv-scrollbar-style")?.remove();
  });

  /** The vertical strip's rail inset, as the engine writes it. */
  function rootInset(): string {
    const strip = document.querySelector<HTMLElement>(
      `${STRIP_SELECTOR}[data-rail="right"].tv-v`,
    );
    expect(strip).not.toBeNull();
    return strip!.style.getPropertyValue("--tv-scrollbar-inset").trim();
  }

  it("applies offset 0 to the page scrollbar", async () => {
    makeDocumentScrollable();
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { offset: 0 });
    handle!.update();
    await nextFrame();

    expect(rootInset()).toBe("0px");

    handle!.destroy();
  });

  it("keeps the documented default when no offset is passed", async () => {
    makeDocumentScrollable();
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {});
    handle!.update();
    await nextFrame();

    expect(rootInset()).toBe("4px");

    handle!.destroy();
  });

  it("honours a per-side object on the page scrollbar", async () => {
    makeDocumentScrollable();
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { offset: { right: 0 } });
    handle!.update();
    await nextFrame();

    expect(rootInset()).toBe("0px");

    handle!.destroy();
  });
});

describe("shipped stylesheets collapse the excluded gutter", () => {
  it("pre-paint CSS carries the collapse rule", () => {
    const css = createPrePaintScrollbarCSS();
    expect(css).toContain(`[${EXCLUDED_ATTR}=${EXCLUDED_VALUE}]::-webkit-scrollbar{width:0;height:0}`);
    expect(css).toContain(`html.tv-scrollbar [${EXCLUDED_ATTR}=${EXCLUDED_VALUE}]{scrollbar-width:none}`);
  });

  it("scrollbar.css carries the collapse rule", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(here, "..", "scrollbar.css"), "utf8");
    expect(css).toContain(`html.tv-scrollbar [${EXCLUDED_ATTR}="${EXCLUDED_VALUE}"]::-webkit-scrollbar`);
    expect(css).toContain(`html.tv-scrollbar [${EXCLUDED_ATTR}="${EXCLUDED_VALUE}"]`);
    expect(css).toMatch(
      new RegExp(`html\\.tv-scrollbar \\[${EXCLUDED_ATTR}="${EXCLUDED_VALUE}"\\]\\s*\\{\\s*scrollbar-width:\\s*none`),
    );
  });
});
