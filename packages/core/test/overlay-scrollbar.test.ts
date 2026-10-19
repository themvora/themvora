// @vitest-environment jsdom
import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import {
  createOverlayScrollbar,
  createPrePaintScrollbarCSS,
  createPrePaintScrollbarScript,
  createThemeScrollbar,
  resolveScrollbarOptions,
} from "../src/utils/overlay-scrollbar";
import { createThemeStore } from "../src/createThemeStore";
import { defineTheme } from "../src/model";
import { resetDiagnosticEmission } from "../src/diagnostics";

// Polyfill ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// The engine also adds the `tv-scrollbar` class to <html> (native-bar hiding),
// so `.tv-scrollbar` alone matches the document root too. Target strip roots
// explicitly (they carry `data-themvora-host`).
const STRIP_SELECTOR = ".tv-scrollbar[data-themvora-host]";

const theme = defineTheme({
  name: "test-theme",
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

describe("createOverlayScrollbar", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-themvora-scrollbar");
    document.documentElement.classList.remove("tv-scrollbar");
    document.documentElement.classList.remove("tv-scrollbar-ready");
    document.getElementById("tv-scrollbar-style")?.remove();
  });

  it("returns null when window is undefined", () => {
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {});
    expect(handle).toBeTypeOf("object");
    expect(handle).not.toBeNull();
    expect(typeof handle!.update).toBe("function");
    expect(typeof handle!.destroy).toBe("function");
    handle!.destroy();
  });

  it("creates overlay root element appended to body", () => {
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { thickness: 10 });
    expect(handle).not.toBeNull();

    const children = Array.from(document.body.children);
    const rootElement = children.find(
      (el) =>
        el instanceof HTMLElement &&
        getComputedStyle(el).position === "fixed",
    );
    expect(rootElement).toBeDefined();

    handle!.destroy();
  });

  it("does not set data-themvora-scrollbar on document (bootstrap owns it)", () => {
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {});
    // The overlay no longer sets the attribute on <html> — the bootstrap script
    // or ThemeScrollbar component manages it.
    expect(document.documentElement.getAttribute("data-themvora-scrollbar")).toBeNull();
    handle!.destroy();
  });

  it("injects native-scrollbar hiding CSS + adds tv-scrollbar (bootstrap), so mounting the overlay alone hides native bars", () => {
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {});
    expect(handle).not.toBeNull();

    // Phase 1 bootstrap is now applied by the engine itself — mounting
    // ThemeScrollbar / createOverlayScrollbar hides native scrollbars even
    // when no pre-paint script or provider `scrollbar` prop is present.
    expect(document.documentElement.classList.contains("tv-scrollbar")).toBe(true);
    const style = document.getElementById("tv-scrollbar-style");
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain("scrollbar-width:none");

    handle!.destroy();
  });

  it("updates thumb position on scroll", () => {
    const store = createThemeStore({ initialTheme: theme });

    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", {
      value: 2000,
      writable: true,
      configurable: true,
    });

    const handle = createOverlayScrollbar(store, {});
    expect(handle).not.toBeNull();
    handle!.update();

    const children = Array.from(document.body.children);
    const rootElement = children.find(
      (el) => el instanceof HTMLElement && getComputedStyle(el).position === "fixed",
    );
    expect(rootElement).toBeDefined();

    handle!.destroy();
  });

  it("destroy removes overlay elements", () => {
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {});

    const strips = document.querySelectorAll(STRIP_SELECTOR);
    expect(strips.length).toBeGreaterThan(0);

    handle!.destroy();

    // All overlay strips are removed.
    expect(document.querySelectorAll(STRIP_SELECTOR).length).toBe(0);
  });

  it("renders a .tv-scrollbar strip with track and thumb children", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { thickness: 10 });
    handle!.update();

    const strips = Array.from(document.querySelectorAll<HTMLElement>(STRIP_SELECTOR));
    expect(strips.length).toBeGreaterThan(0);
    for (const strip of strips) {
      expect(strip.querySelector(".tv-track")).not.toBeNull();
      expect(strip.querySelector(".tv-thumb")).not.toBeNull();
    }

    handle!.destroy();
  });

  it("applies custom option values to the thumb", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { thickness: 14 });
    handle!.update();

    const thumbs = Array.from(document.querySelectorAll<HTMLElement>(".tv-thumb"));
    expect(thumbs.length).toBeGreaterThan(0);

    handle!.destroy();
  });

  it("createThemeScrollbar alias delegates to the same engine", () => {
    const store = createThemeStore({ initialTheme: theme });
    const handle = createThemeScrollbar(store, { autoHide: false });
    expect(handle).not.toBeNull();
    expect(document.querySelectorAll(STRIP_SELECTOR).length).toBeGreaterThan(0);
    handle!.destroy();
    expect(document.querySelectorAll(STRIP_SELECTOR).length).toBe(0);
  });

  it("overlays the document AND every scrollable element by default", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });
    const inner = document.createElement("div");
    inner.className = "scrollable-inner";
    inner.style.overflowY = "auto";
    inner.style.overflowX = "auto";
    Object.defineProperty(inner, "scrollHeight", { value: 500, configurable: true });
    Object.defineProperty(inner, "clientHeight", { value: 50, configurable: true });
    Object.defineProperty(inner, "scrollWidth", { value: 500, configurable: true });
    Object.defineProperty(inner, "clientWidth", { value: 200, configurable: true });
    document.body.appendChild(inner);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {});
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    // root (2) + inner vertical + inner horizontal = 4 strips — inner
    // scrollables are overlaid anywhere a native scrollbar would appear.
    // The overlay may create additional strips for the same inner element
    // during rescan cycles; allow up to 6.
    const strips = Array.from(document.querySelectorAll<HTMLElement>(STRIP_SELECTOR));
    expect(strips.length).toBeGreaterThanOrEqual(4);

    // The native track of the inner container is hidden automatically.
    expect(inner.getAttribute("data-themvora-scrollbar")).toBe("overlay");

    handle!.destroy();
    inner.remove();
  });

  it("overlays inner scrollables when explicitly included, honoring exclude", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });
    const inner = document.createElement("div");
    inner.className = "scrollable-inner";
    inner.style.overflowY = "auto";
    inner.style.overflowX = "auto";
    Object.defineProperty(inner, "scrollHeight", { value: 500, configurable: true });
    Object.defineProperty(inner, "clientHeight", { value: 50, configurable: true });
    Object.defineProperty(inner, "scrollWidth", { value: 500, configurable: true });
    Object.defineProperty(inner, "clientWidth", { value: 200, configurable: true });
    document.body.appendChild(inner);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".scrollable-inner"] });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    // root (2) + inner vertical + inner horizontal = 4 strips minimum;
    // additional strips may appear during rescan cycles.
    let strips = Array.from(document.querySelectorAll<HTMLElement>(STRIP_SELECTOR));
    expect(strips.length).toBeGreaterThanOrEqual(4);

    handle!.destroy();

    const handle2 = createOverlayScrollbar(store, {
      include: [".scrollable-inner"],
      exclude: [".scrollable-inner"],
    });
    handle2!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    strips = Array.from(document.querySelectorAll<HTMLElement>(STRIP_SELECTOR));
    expect(strips.length).toBe(2);

    handle2!.destroy();
    inner.remove();
  });

  it("renders arrow buttons by default and hides them when arrows:false", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {});
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const withArrows = document.querySelectorAll<HTMLElement>(".tv-arrow");
    expect(withArrows.length).toBeGreaterThan(0);

    handle!.destroy();

    const handle2 = createOverlayScrollbar(store, { arrows: false });
    handle2!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    expect(document.querySelectorAll(".tv-arrow").length).toBe(0);

    handle2!.destroy();
  });

  it("hides the document scrollbar while the page is scroll-locked (body overflow hidden)", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { autoHide: false });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const rootStrips = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".tv-scrollbar.tv-v:not([data-overlay])",
      ),
    );
    expect(rootStrips.length).toBe(1);
    expect(rootStrips[0].style.display).not.toBe("none");

    // Lock the page the way modals / mobile menus do — the document scrollbar
    // must disappear so it never stacks over the fixed overlay's own strip.
    document.body.style.overflowY = "hidden";
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    const refresh = Number(document.documentElement.clientHeight); // force reflow
    expect(refresh).toBeGreaterThan(0);
    // The strip fades out before `display:none` lands; wait out the fade+hide.
    await new Promise((r) => setTimeout(r, 400));
    expect(rootStrips[0].style.display).toBe("none");

    document.body.style.overflowY = "";
    handle!.destroy();
  });

  it("does not render an overlay for a scrollable element that is hidden (opacity 0)", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });
    const hidden = document.createElement("div");
    hidden.className = "hidden-scrollable";
    hidden.style.overflowY = "auto";
    hidden.style.opacity = "0";
    Object.defineProperty(hidden, "scrollHeight", { value: 500, configurable: true });
    Object.defineProperty(hidden, "clientHeight", { value: 50, configurable: true });
    document.body.appendChild(hidden);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {});
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const strips = Array.from(document.querySelectorAll<HTMLElement>(STRIP_SELECTOR));
    // The hidden scrollable should still be detected as a host (4 total),
    // but its overlay strips must be hidden so they don't appear on screen.
    expect(strips.length).toBe(4);
    const hiddenStrips = strips.filter(
      (s) => s.style.display === "none",
    );
    expect(hiddenStrips.length).toBeGreaterThan(0);

    handle!.destroy();
    hidden.remove();
  });

  it("renders visible rgba thumb and track derived from theme foreground", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {});
    handle!.update();

    const thumb = document.querySelector<HTMLElement>(".tv-thumb");
    expect(thumb).not.toBeNull();
    // theme primary #0066cc -> rgba(0, 102, 204, ...): themed + visible
    expect(thumb!.style.background).toMatch(/rgba\(0, 102, 204,/);

    const track = document.querySelector<HTMLElement>(".tv-track");
    expect(track).not.toBeNull();
    expect(track!.style.background).toMatch(/rgba\(0, 102, 204,/);

    // arrows carry no background, only a themed glyph color
    const up = document.querySelector<HTMLElement>(".tv-arrow-up");
    expect(up).not.toBeNull();
    expect(up!.style.background).toBe("transparent");

    handle!.destroy();
  });

  it("applies custom arrow icons and keeps them hidden when arrows:false", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      arrowUpIcon: "<b>up</b>",
      arrowDownIcon: "<b>down</b>",
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const up = document.querySelector<HTMLElement>(".tv-arrow-up");
    const down = document.querySelector<HTMLElement>(".tv-arrow-down");
    expect(up).not.toBeNull();
    expect(up!.innerHTML).toBe("<b>up</b>");
    expect(down!.innerHTML).toBe("<b>down</b>");

    handle!.destroy();

    const handle2 = createOverlayScrollbar(store, { arrows: false });
    handle2!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    expect(document.querySelectorAll(".tv-arrow").length).toBe(0);
    handle2!.destroy();
  });

  it("accepts DOM nodes and arrays as arrow icons", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });

    const store = createThemeStore({ initialTheme: theme });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("data-test", "node-icon");
    const handle = createOverlayScrollbar(store, {
      arrowUpIcon: svg,
      arrowDownIcon: ["<span>a</span>", document.createTextNode("b")],
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const up = document.querySelector<HTMLElement>(".tv-arrow-up");
    expect(up!.querySelector("svg[data-test='node-icon']")).not.toBeNull();

    const down = document.querySelector<HTMLElement>(".tv-arrow-down");
    expect(down!.querySelector("span")?.textContent).toBe("a");
    expect(down!.textContent).toContain("b");
    expect(down!.classList.contains("tv-arrow-custom")).toBe(true);

    handle!.destroy();
  });

  it("invokes arrowIconRenderer with the correct direction for every arrow", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });

    const calls: string[] = [];
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      arrowIcon: "X",
      arrowIconRenderer: (el, dir) => {
        calls.push(dir);
        el.textContent = `icon:${dir}`;
      },
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    expect(calls).toEqual(expect.arrayContaining(["up", "down", "left", "right"]));
    const up = document.querySelector<HTMLElement>(".tv-arrow-up");
    expect(up!.textContent).toBe("icon:up");

    handle!.destroy();
  });

  it("positions the horizontal right arrow at the container's right edge (regression)", async () => {
    const inner = document.createElement("div");
    inner.className = "scrollable-h";
    inner.style.overflowX = "auto";
    Object.defineProperty(inner, "scrollWidth", { value: 500, configurable: true });
    Object.defineProperty(inner, "clientWidth", { value: 200, configurable: true });
    Object.defineProperty(inner, "clientHeight", { value: 40, configurable: true });
    Object.defineProperty(inner, "offsetWidth", { value: 200, configurable: true });
    Object.defineProperty(inner, "getBoundingClientRect", {
      value: () => ({
        left: 100,
        top: 0,
        width: 200,
        height: 40,
        right: 300,
        bottom: 40,
        x: 100,
        y: 0,
        toJSON: () => ({}),
      }),
      configurable: true,
    });
    document.body.appendChild(inner);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      include: [".scrollable-h"],
      arrows: true,
      thickness: 8,
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const hRoot = document.querySelector<HTMLElement>(
      ".tv-scrollbar.tv-h[data-overlay]",
    );
    expect(hRoot).not.toBeNull();
    // The strip's longitudinal span is inset by `offset` (4px) at the right
    // edge, so its right end sits at rect.right - offset and the right arrow
    // lands at the true end of the scroll progress.
    const rightEdge =
      parseFloat(hRoot!.style.left) + parseFloat(hRoot!.style.width);
    expect(rightEdge).toBeCloseTo(300 - 4);
    expect(hRoot!.querySelector(".tv-arrow-right")).not.toBeNull();

    handle!.destroy();
    inner.remove();
  });

  it("notches both strips at the native corner when both axes overflow", async () => {
    const inner = document.createElement("div");
    inner.className = "scrollable-both";
    inner.style.overflowY = "auto";
    inner.style.overflowX = "auto";
    Object.defineProperty(inner, "scrollHeight", { value: 500, configurable: true });
    Object.defineProperty(inner, "clientHeight", { value: 50, configurable: true });
    Object.defineProperty(inner, "scrollWidth", { value: 500, configurable: true });
    Object.defineProperty(inner, "clientWidth", { value: 200, configurable: true });
    Object.defineProperty(inner, "offsetWidth", { value: 200, configurable: true });
    Object.defineProperty(inner, "getBoundingClientRect", {
      value: () => ({
        left: 100,
        top: 0,
        width: 200,
        height: 50,
        right: 300,
        bottom: 50,
        x: 100,
        y: 0,
        toJSON: () => ({}),
      }),
      configurable: true,
    });
    document.body.appendChild(inner);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      include: [".scrollable-both"],
      thickness: 8,
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const hRoot = document.querySelector<HTMLElement>(
      ".tv-scrollbar.tv-h[data-overlay]",
    );
    const vRoot = document.querySelector<HTMLElement>(
      ".tv-scrollbar.tv-v[data-overlay]",
    );
    expect(hRoot).not.toBeNull();
    expect(vRoot).not.toBeNull();

    // Horizontal strip stops before the vertical strip: right edge lands at
    // rect.right - offset - (thickness + gap) (it never runs under the vertical
    // bar nor pokes past the container).
    const hRight = parseFloat(hRoot!.style.left) + parseFloat(hRoot!.style.width);
    expect(hRight).toBeCloseTo(300 - 4 - 16);

    // Vertical strip stops above the horizontal strip.
    const vBottom = parseFloat(vRoot!.style.top) + parseFloat(vRoot!.style.height);
    expect(vBottom).toBeCloseTo(50 - 4 - 16);

    handle!.destroy();
    inner.remove();
  });

  it("reveals the strip immediately when a hidden scrollable becomes visible (mobile-menu open)", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });
    const panel = document.createElement("div");
    panel.className = "reveal-panel";
    panel.style.overflowY = "auto";
    panel.style.opacity = "0";
    Object.defineProperty(panel, "scrollHeight", { value: 500, configurable: true });
    Object.defineProperty(panel, "clientHeight", { value: 50, configurable: true });
    document.body.appendChild(panel);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".reveal-panel"] });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const strip = document.querySelector<HTMLElement>(".tv-scrollbar.tv-v[data-overlay]");
    const thumb = strip?.querySelector<HTMLElement>(".tv-thumb");
    // First layout records visibility only: still hidden (opacity 0), no reveal.
    expect(strip).not.toBeNull();
    expect(thumb?.style.opacity).toBe("0");
    expect(strip!.style.display).toBe("none");

    // Open the menu: the panel becomes visible and the scrollbar must reveal
    // right away — no scroll/hover required. Allow the reveal to run its
    // deferred fade-in frames.
    panel.style.opacity = "1";
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const thumb2 = strip?.querySelector<HTMLElement>(".tv-thumb");
    expect(strip!.style.display).not.toBe("none");
    expect(thumb2?.style.opacity).not.toBe("0");

    handle!.destroy();
    panel.remove();
  });

  it("reuses vertical custom icons (rotated) for horizontal arrows when left/right are not given", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });
    const inner = document.createElement("div");
    inner.className = "scrollable-h-rot";
    inner.style.overflowX = "auto";
    inner.style.overflowY = "auto";
    Object.defineProperty(inner, "scrollWidth", { value: 500, configurable: true });
    Object.defineProperty(inner, "clientWidth", { value: 200, configurable: true });
    Object.defineProperty(inner, "scrollHeight", { value: 500, configurable: true });
    Object.defineProperty(inner, "clientHeight", { value: 50, configurable: true });
    Object.defineProperty(inner, "offsetWidth", { value: 200, configurable: true });
    Object.defineProperty(inner, "getBoundingClientRect", {
      value: () => ({
        left: 100,
        top: 0,
        width: 200,
        height: 50,
        right: 300,
        bottom: 50,
        x: 100,
        y: 0,
        toJSON: () => ({}),
      }),
      configurable: true,
    });
    document.body.appendChild(inner);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      arrowUpIcon: "<b>u</b>",
      arrowDownIcon: "<b>d</b>",
      include: [".scrollable-h-rot"],
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const left = document.querySelector<HTMLElement>(".tv-arrow-left");
    const right = document.querySelector<HTMLElement>(".tv-arrow-right");
    expect(left).not.toBeNull();
    expect(left!.classList.contains("tv-arrow-custom")).toBe(true);
    const leftGlyph = left!.querySelector<HTMLElement>(".tv-arrow-glyph-rot");
    expect(leftGlyph).not.toBeNull();
    expect(leftGlyph!.textContent).toBe("u");
    expect(leftGlyph!.style.transform).toBe("rotate(-90deg)");

    expect(right).not.toBeNull();
    expect(right!.classList.contains("tv-arrow-custom")).toBe(true);
    const rightGlyph = right!.querySelector<HTMLElement>(".tv-arrow-glyph-rot");
    expect(rightGlyph).not.toBeNull();
    expect(rightGlyph!.textContent).toBe("u");
    expect(rightGlyph!.style.transform).toBe("rotate(90deg)");

    handle!.destroy();
    inner.remove();
  });

  it("puts the page scrollbar on the chrome layer and inner strips in their container's", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });
    const inner = document.createElement("div");
    inner.className = "scrollable-z";
    inner.style.overflowY = "auto";
    inner.style.zIndex = "15";
    inner.style.position = "relative";
    Object.defineProperty(inner, "scrollHeight", { value: 500, configurable: true });
    Object.defineProperty(inner, "clientHeight", { value: 50, configurable: true });
    document.body.appendChild(inner);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".scrollable-z"] });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    // Document scrollbar: the page's own indicator is chrome, so it sits on the
    // page-chrome layer — above a `z-index: 50` fixed header (otherwise the
    // header hides the top of the track), below a full-screen backdrop (60).
    const rootStrips = Array.from(
      document.querySelectorAll<HTMLElement>(`${STRIP_SELECTOR}:not([data-overlay])`),
    );
    expect(rootStrips.length).toBeGreaterThan(0);
    for (const strip of rootStrips) {
      expect(Number(strip.style.zIndex)).toBe(55);
    }

    // Inner scrollbar: adopts the container's declared z-index (15).
    const overlayStrips = Array.from(
      document.querySelectorAll<HTMLElement>(`${STRIP_SELECTOR}[data-overlay]`),
    );
    expect(overlayStrips.length).toBeGreaterThan(0);
    for (const strip of overlayStrips) {
      expect(Number(strip.style.zIndex)).toBe(15);
    }

    handle!.destroy();
    inner.remove();
  });

  it("gives an inner scrollable with no declared z-index the neutral default", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });
    const inner = document.createElement("div");
    inner.className = "scrollable-plain";
    inner.style.overflowY = "auto";
    Object.defineProperty(inner, "scrollHeight", { value: 500, configurable: true });
    Object.defineProperty(inner, "clientHeight", { value: 50, configurable: true });
    document.body.appendChild(inner);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".scrollable-plain"] });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const strips = Array.from(
      document.querySelectorAll<HTMLElement>(`${STRIP_SELECTOR}[data-overlay]`),
    );
    expect(strips.length).toBeGreaterThan(0);
    for (const strip of strips) {
      // Same level as its container: a sticky header (z-index > 0) wins.
      expect(Number(strip.style.zIndex)).toBe(0);
    }

    handle!.destroy();
    inner.remove();
  });

  it("respects an explicit zIndex option over the resolved value", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { zIndex: 60 });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const strips = Array.from(
      document.querySelectorAll<HTMLElement>(`${STRIP_SELECTOR}:not([data-overlay])`),
    );
    expect(strips.length).toBeGreaterThan(0);
    for (const strip of strips) {
      expect(Number(strip.style.zIndex)).toBe(60);
    }

    handle!.destroy();
  });

  it("re-measures content growth on mutation without waiting for the periodic rescan (navigation regression)", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
      value: 1000,
      configurable: true,
    });
    const container = document.createElement("div");
    container.className = "growing-container";
    container.style.overflowY = "auto";
    // Initially the content fits: no overlay should be created.
    Object.defineProperty(container, "scrollHeight", { value: 50, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(container, "scrollWidth", { value: 200, configurable: true });
    Object.defineProperty(container, "clientWidth", { value: 200, configurable: true });
    document.body.appendChild(container);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {});
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const overlaysBefore = document.querySelectorAll<HTMLElement>(`${STRIP_SELECTOR}[data-overlay]`);
    expect(overlaysBefore.length).toBe(0);

    // Simulate a navigation: new content makes the container overflow. No
    // class/style attribute changes on the container itself — a plain
    // childList mutation (like React swapping children) is all the observer sees.
    Object.defineProperty(container, "scrollHeight", { value: 500, configurable: true });
    container.appendChild(document.createElement("span"));
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    // The overlay must appear immediately from the mutation-triggered rescan,
    // not only after the 4s periodic full recompute.
    const visibleOverlays = Array.from(
      document.querySelectorAll<HTMLElement>(`${STRIP_SELECTOR}[data-overlay]`),
    ).filter((s) => s.style.display !== "none");
    expect(visibleOverlays.length).toBe(1);
    expect(visibleOverlays[0].classList.contains("tv-v")).toBe(true);

    handle!.destroy();
    container.remove();
  });
});

/**
 * Geometry contract for the custom overlay spacing:
 *   - the track sits `offset` (4px) inside the container edge,
 *   - a transparent `gap` (8px) widens the rail's pointer target on the
 *     content side (the clearance itself comes from the native scrollbar
 *     gutter the pre-paint CSS reserves — no content padding is written),
 *   - the two axes never overlap at the corner.
 *
 * These assert the *rendered* strip rectangle the engine writes (its inline
 * `left/top/width/height`), not the mere presence of a CSS declaration — so
 * they fail if the geometry regresses even when the stylesheet still mentions
 * the spacing.
 */
describe("overlay scrollbar spacing contract", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-themvora-scrollbar");
    document.documentElement.classList.remove("tv-scrollbar");
    document.documentElement.classList.remove("tv-scrollbar-ready");
    document.getElementById("tv-scrollbar-style")?.remove();
  });

  const EDGE_INSET = 4;
  const CONTENT_GAP = 8;
  const THICKNESS = 8;

  /** A mocked scrollable container with a fixed border box, so the engine's
   *  rect-based geometry is fully deterministic in jsdom. */
  function makeHost(
    name: string,
    rect: { left: number; top: number; width: number; height: number },
    opts: {
      overflow?: "y" | "x" | "both";
      scrollTop?: number;
      scrollLeft?: number;
    } = {},
  ) {
    const el = document.createElement("div");
    el.className = name;
    const overflow = opts.overflow ?? "y";
    // Both axes stay `auto`: the engine conceals a host whose overflow is
    // `hidden` on either axis, and overflow is driven purely by the (mocked)
    // content-vs-client sizes below.
    el.style.overflowY = "auto";
    el.style.overflowX = "auto";
    Object.defineProperty(el, "scrollHeight", {
      value: overflow === "x" ? rect.height : rect.height + 1000,
      configurable: true,
    });
    Object.defineProperty(el, "clientHeight", { value: rect.height, configurable: true });
    Object.defineProperty(el, "scrollWidth", {
      value: overflow === "y" ? rect.width : rect.width + 1000,
      configurable: true,
    });
    Object.defineProperty(el, "clientWidth", { value: rect.width, configurable: true });
    Object.defineProperty(el, "offsetWidth", { value: rect.width, configurable: true });
    Object.defineProperty(el, "scrollTop", {
      value: opts.scrollTop ?? 0,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(el, "scrollLeft", {
      value: opts.scrollLeft ?? 0,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(el, "getBoundingClientRect", {
      value: () => ({
        ...rect,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        x: rect.left,
        y: rect.top,
        toJSON: () => ({}),
      }),
      configurable: true,
    });
    document.body.appendChild(el);
    return el;
  }

  it("insets the vertical track 4px from the container edge with a 6px content gap and 4px end clearance", async () => {
    const rect = { left: 100, top: 0, width: 200, height: 50 };
    const el = makeHost("spacing-v", rect, { overflow: "y" });

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      include: [".spacing-v"],
      thickness: THICKNESS,
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const strip = document.querySelector<HTMLElement>(".tv-scrollbar.tv-v[data-overlay]");
    expect(strip).not.toBeNull();

    const left = parseFloat(strip!.style.left);
    const width = parseFloat(strip!.style.width);
    const top = parseFloat(strip!.style.top);
    const height = parseFloat(strip!.style.height);
    const right = 300; // rect.left + rect.width
    const bottom = 50; // rect.top + rect.height

    // Edge inset: the painted track's outer edge is 4px inside the container.
    expect(right - (left + width)).toBeCloseTo(EDGE_INSET);
    // Content-to-track gap: 6px of transparent strip between the content-facing
    // edge and the track — the strip's cross-axis box is thickness + gap.
    expect(width).toBeCloseTo(THICKNESS + CONTENT_GAP);
    expect(width - THICKNESS).toBeCloseTo(CONTENT_GAP);
    // 4px clearance at the near/far ends.
    expect(top).toBeCloseTo(EDGE_INSET);
    expect(bottom - (top + height)).toBeCloseTo(EDGE_INSET);

    // No content padding is written — the clearance comes from the native
    // scrollbar gutter reserved by the pre-paint CSS, so nothing reflows.
    expect(el.style.paddingRight).toBe("");

    handle!.destroy();
    el.remove();
  });

  it("insets the horizontal track 4px from both ends and the bottom edge, with a 6px gap above", async () => {
    const rect = { left: 100, top: 0, width: 200, height: 40 };
    const el = makeHost("spacing-h", rect, { overflow: "x" });

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      include: [".spacing-h"],
      thickness: THICKNESS,
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const strip = document.querySelector<HTMLElement>(".tv-scrollbar.tv-h[data-overlay]");
    expect(strip).not.toBeNull();

    const left = parseFloat(strip!.style.left);
    const width = parseFloat(strip!.style.width);
    const top = parseFloat(strip!.style.top);
    const height = parseFloat(strip!.style.height);

    // The inline-start inset defaults to 0 (flush), the inline-end to 4px.
    expect(left - rect.left).toBeCloseTo(0);
    expect(rect.left + rect.width - (left + width)).toBeCloseTo(EDGE_INSET);
    // 4px clearance from the bottom edge.
    expect(rect.top + rect.height - (top + height)).toBeCloseTo(EDGE_INSET);
    // 6px transparent gap above the track (content-facing side).
    expect(height).toBeCloseTo(THICKNESS + CONTENT_GAP);
    expect(height - THICKNESS).toBeCloseTo(CONTENT_GAP);

    // No content padding is written on either axis.
    expect(el.style.paddingBottom).toBe("");
    expect(el.style.paddingRight).toBe("");

    handle!.destroy();
    el.remove();
  });

  it("exposes the spacing as internal custom properties on the strip", async () => {
    const el = makeHost("spacing-vars", { left: 0, top: 0, width: 200, height: 50 }, { overflow: "y" });
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".spacing-vars"] });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const strip = document.querySelector<HTMLElement>(".tv-scrollbar.tv-v[data-overlay]");
    expect(strip!.style.getPropertyValue("--tv-scrollbar-inset")).toBe(`${EDGE_INSET}px`);
    expect(strip!.style.getPropertyValue("--tv-scrollbar-gap")).toBe(`${CONTENT_GAP}px`);

    // The spacing custom properties live on the strip, never on the document
    // root — the page/window scrollbar is out of scope.
    expect(document.documentElement.style.getPropertyValue("--tv-scrollbar-gap")).toBe("");
    expect(document.documentElement.style.getPropertyValue("--tv-scrollbar-inset")).toBe("");

    handle!.destroy();
    el.remove();
  });

  it("honors an explicit offset option for the edge inset while keeping the 6px content gap", async () => {
    const rect = { left: 100, top: 0, width: 200, height: 50 };
    const el = makeHost("spacing-offset", rect, { overflow: "y" });
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      include: [".spacing-offset"],
      thickness: THICKNESS,
      offset: 10,
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const strip = document.querySelector<HTMLElement>(".tv-scrollbar.tv-v[data-overlay]");
    const left = parseFloat(strip!.style.left);
    const width = parseFloat(strip!.style.width);
    expect(300 - (left + width)).toBeCloseTo(10);
    expect(width - THICKNESS).toBeCloseTo(CONTENT_GAP);

    handle!.destroy();
    el.remove();
  });

  it("does not add a gutter, attribute, or dimension change for a container that does not overflow", async () => {
    const el = document.createElement("div");
    el.className = "spacing-no-overflow";
    el.style.overflowY = "auto";
    el.style.width = "200px";
    el.style.height = "50px";
    Object.defineProperty(el, "scrollHeight", { value: 50, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: 50, configurable: true });
    Object.defineProperty(el, "scrollWidth", { value: 200, configurable: true });
    Object.defineProperty(el, "clientWidth", { value: 200, configurable: true });
    document.body.appendChild(el);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".spacing-no-overflow"] });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    // No host → no strip, no hidden-native attribute, and the element's own
    // box styles are untouched (no reserved gutter, no padding).
    expect(document.querySelectorAll(`${STRIP_SELECTOR}[data-overlay]`).length).toBe(0);
    expect(el.getAttribute("data-themvora-scrollbar")).toBeNull();
    expect(el.style.paddingRight).toBe("");
    expect(el.style.scrollbarGutter).toBe("");

    handle!.destroy();
    el.remove();
  });

  it("keeps the two strips' hit areas from overlapping at the corner when both axes overflow", async () => {
    const rect = { left: 100, top: 0, width: 200, height: 50 };
    const el = makeHost("spacing-both", rect, { overflow: "both", scrollTop: 10, scrollLeft: 10 });

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      include: [".spacing-both"],
      thickness: THICKNESS,
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const v = document.querySelector<HTMLElement>(".tv-scrollbar.tv-v[data-overlay]")!;
    const h = document.querySelector<HTMLElement>(".tv-scrollbar.tv-h[data-overlay]")!;
    const vLeft = parseFloat(v.style.left);
    const vTop = parseFloat(v.style.top);
    const hRight = parseFloat(h.style.left) + parseFloat(h.style.width);
    const hTop = parseFloat(h.style.top);

    // Horizontal strip ends at (or before) the vertical strip's content-side
    // edge; vertical strip ends at (or before) the horizontal strip's top edge.
    expect(hRight).toBeLessThanOrEqual(vLeft + 0.5);
    expect(parseFloat(v.style.top) + parseFloat(v.style.height)).toBeLessThanOrEqual(hTop + 0.5);
    expect(vTop).toBeCloseTo(EDGE_INSET);

    handle!.destroy();
    el.remove();
  });

  it("positions a nested scroll container from its own rect, not the page", async () => {
    const outerRect = { left: 20, top: 20, width: 300, height: 300 };
    const innerRect = { left: 60, top: 60, width: 120, height: 100 };
    const outer = makeHost("spacing-outer", outerRect, { overflow: "y" });
    const inner = document.createElement("div");
    inner.className = "spacing-inner";
    inner.style.overflowY = "auto";
    Object.defineProperty(inner, "scrollHeight", { value: 500, configurable: true });
    Object.defineProperty(inner, "clientHeight", { value: 100, configurable: true });
    Object.defineProperty(inner, "scrollWidth", { value: 120, configurable: true });
    Object.defineProperty(inner, "clientWidth", { value: 120, configurable: true });
    Object.defineProperty(inner, "getBoundingClientRect", {
      value: () => ({
        ...innerRect,
        right: innerRect.left + innerRect.width,
        bottom: innerRect.top + innerRect.height,
        x: innerRect.left,
        y: innerRect.top,
        toJSON: () => ({}),
      }),
      configurable: true,
    });
    outer.appendChild(inner);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      include: [".spacing-outer", ".spacing-inner"],
      thickness: THICKNESS,
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const strips = Array.from(document.querySelectorAll<HTMLElement>(`${STRIP_SELECTOR}[data-overlay]`));
    // The inner host's strip is placed against the inner rect, not the outer one.
    const innerRight = innerRect.left + innerRect.width;
    const innerStrip = strips.find(
      (s) => Math.abs(parseFloat(s.style.left) + parseFloat(s.style.width) - (innerRight - EDGE_INSET)) < 0.5,
    );
    expect(innerStrip).toBeDefined();
    expect(parseFloat(innerStrip!.style.top)).toBeCloseTo(innerRect.top + EDGE_INSET);

    handle!.destroy();
    outer.remove();
  });

  it("mirrors the horizontal thumb travel in RTL", async () => {
    const rect = { left: 0, top: 0, width: 200, height: 40 };
    const el = makeHost("spacing-rtl", rect, { overflow: "x", scrollLeft: 100 });
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      include: [".spacing-rtl"],
      thickness: THICKNESS,
      dir: "rtl",
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const h = document.querySelector<HTMLElement>(".tv-scrollbar.tv-h[data-overlay]")!;
    const thumb = h.querySelector<HTMLElement>(".tv-thumb")!;
    // In RTL the thumb travels toward negative X for a positive scroll value.
    expect(thumb.style.transform).toMatch(/^translate3d\(-/);

    handle!.destroy();
    el.remove();
  });

  it("injects only the native-bar hiding CSS — the page/window scrollbar is untouched", async () => {
    const el = makeHost("spacing-global", { left: 0, top: 0, width: 200, height: 50 }, { overflow: "y" });
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".spacing-global"] });
    handle!.update();

    const style = document.getElementById("tv-scrollbar-style")!;
    const css = style.textContent ?? "";
    // No global spacing rules: no gutter reservation, no page margin/padding,
    // no insets — everything stays scoped to the overlay strips.
    expect(css).not.toMatch(/scrollbar-gutter/);
    expect(css).not.toMatch(/margin/);
    expect(css).not.toMatch(/padding/);
    expect(css).not.toMatch(/inset/);
    expect(document.documentElement.style.cssText).toBe("");
    expect(document.body.style.cssText).toBe("");

    handle!.destroy();
    el.remove();
  });

  it("writes no content padding — the native gutter provides the clearance", async () => {
    const both = makeHost("reserve-both", { left: 0, top: 0, width: 200, height: 100 }, {
      overflow: "both",
      scrollTop: 10,
      scrollLeft: 10,
    });
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".reserve-both"], thickness: THICKNESS });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    // Nothing is written on the host, so hiding the native bar and drawing the
    // rail cannot reflow the content (no load-time layout shift).
    expect(both.getAttribute("style") ?? "").not.toMatch(/padding/);
    expect(both.style.paddingRight).toBe("");
    expect(both.style.paddingBottom).toBe("");

    handle!.destroy();
    both.remove();
  });

  it("leaves a host whose own padding already clears the scrollbar untouched", async () => {
    const el = makeHost("reserve-padded", { left: 0, top: 0, width: 200, height: 100 }, { overflow: "y" });
    el.style.paddingRight = "40px";

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".reserve-padded"], thickness: THICKNESS });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    // 40px already exceeds the reserve, so nothing is written (no double count).
    expect(el.style.paddingRight).toBe("40px");
    expect(el.style.paddingBottom).toBe("");

    handle!.destroy();
    el.remove();
  });

  it("never touches the host's own inline padding", async () => {
    const el = makeHost("reserve-restore", { left: 0, top: 0, width: 200, height: 100 }, { overflow: "y" });
    el.style.paddingRight = "3px";

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".reserve-restore"], thickness: THICKNESS });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    expect(el.style.paddingRight).toBe("3px");

    handle!.destroy();
    expect(el.style.paddingRight).toBe("3px");

    el.remove();
  });

  it("does not narrow a fixed-width host (no horizontal overflow introduced)", async () => {
    const el = document.createElement("div");
    el.className = "reserve-guard";
    el.style.overflowY = "auto";
    el.style.overflowX = "auto";
    el.style.width = "300px";
    el.style.height = "100px";
    Object.defineProperty(el, "scrollWidth", { value: 300, configurable: true });
    Object.defineProperty(el, "clientWidth", { value: 300, configurable: true });
    Object.defineProperty(el, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: 100, configurable: true });
    document.body.appendChild(el);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".reserve-guard"], thickness: THICKNESS });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    // Content width is untouched, so no horizontal scrollbar can appear.
    expect(el.style.paddingRight).toBe("");
    expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth + 1);

    handle!.destroy();
    el.remove();
  });

  it("accepts a per-side offset object for the rail insets", async () => {
    const rect = { left: 100, top: 0, width: 200, height: 60 };
    const el = makeHost("spacing-sides", rect, { overflow: "y" });
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      include: [".spacing-sides"],
      thickness: THICKNESS,
      offset: { top: 8, right: 12, bottom: 2 },
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const strip = document.querySelector<HTMLElement>(".tv-scrollbar.tv-v[data-overlay]")!;
    const left = parseFloat(strip.style.left);
    const width = parseFloat(strip.style.width);
    const top = parseFloat(strip.style.top);
    const height = parseFloat(strip.style.height);

    // Right (rail edge) uses `right`; the ends use `top` / `bottom`.
    expect(300 - (left + width)).toBeCloseTo(12);
    expect(top).toBeCloseTo(8);
    expect(60 - (top + height)).toBeCloseTo(2);
    // No padding is written on any axis.
    expect(el.style.paddingRight).toBe("");

    handle!.destroy();
    el.remove();
  });

  it("places the vertical rail on the inline-start side in RTL", async () => {
    const rect = { left: 100, top: 0, width: 200, height: 50 };
    const el = makeHost("spacing-rtl-v", rect, { overflow: "y" });
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      include: [".spacing-rtl-v"],
      thickness: THICKNESS,
      dir: "rtl",
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const strip = document.querySelector<HTMLElement>(".tv-scrollbar.tv-v[data-overlay]")!;
    expect(strip.getAttribute("data-rail")).toBe("left");
    // Rail hugs the left edge (the \`left\` inset defaults to 0); the gap band is
    // on its right. No content padding is written.
    expect(parseFloat(strip.style.left) - rect.left).toBeCloseTo(0);
    expect(el.style.paddingLeft).toBe("");
    expect(el.style.paddingRight).toBe("");

    handle!.destroy();
    el.remove();
  });

  it("warns and falls back to defaults for an unusable offset", async () => {
    resetDiagnosticEmission();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rect = { left: 0, top: 0, width: 200, height: 50 };
    const el = makeHost("spacing-bad", rect, { overflow: "y" });
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      include: [".spacing-bad"],
      thickness: THICKNESS,
      offset: { right: -10 },
    });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const strip = document.querySelector<HTMLElement>(".tv-scrollbar.tv-v[data-overlay]")!;
    // Default inset kept — the rail is not hidden by a negative value.
    expect(200 - (parseFloat(strip.style.left) + parseFloat(strip.style.width))).toBeCloseTo(
      EDGE_INSET,
    );
    const diagnostic = warn.mock.calls.find(
      (c) => (c[1] as { code?: string } | undefined)?.code === "TV_SCROLLBAR_OPTION_INVALID",
    );
    expect(diagnostic).toBeDefined();
    expect(JSON.stringify(diagnostic![1])).toContain("offset.right");

    warn.mockRestore();
    handle!.destroy();
    el.remove();
  });

  it("does not move the document scrollbar when a per-side offset is set", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 5000, configurable: true });
    Object.defineProperty(document.documentElement, "clientHeight", { value: 1000, configurable: true });
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { offset: { right: 40, top: 40 } });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const rootV = document.querySelector<HTMLElement>(".tv-scrollbar.tv-v:not([data-overlay])")!;
    expect(rootV).not.toBeNull();
    // The page rail keeps the physical-right side and the default inset, not
    // the configured per-side offset.
    expect(rootV.getAttribute("data-rail")).toBe("right");
    expect(
      window.innerWidth - (parseFloat(rootV.style.left) + parseFloat(rootV.style.width)),
    ).toBeCloseTo(EDGE_INSET);

    handle!.destroy();
  });

  it("keeps pointer dragging functional with the new geometry", async () => {
    const el = makeHost("spacing-drag", { left: 0, top: 0, width: 200, height: 100 }, {
      overflow: "y",
    });
    if (typeof (el as any).setPointerCapture !== "function") {
      (HTMLElement.prototype as any).setPointerCapture = () => {};
      (HTMLElement.prototype as any).releasePointerCapture = () => {};
    }
    const PointerEventCtor: typeof MouseEvent =
      (globalThis as any).PointerEvent ?? (class extends MouseEvent {} as any);

    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".spacing-drag"], thickness: THICKNESS });
    handle!.update();
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    const v = document.querySelector<HTMLElement>(".tv-scrollbar.tv-v[data-overlay]")!;
    const thumb = v.querySelector<HTMLElement>(".tv-thumb")!;
    const evt = (type: string, clientY: number) =>
      new PointerEventCtor(type, { clientY, clientX: 190, bubbles: true, pointerId: 1 } as any);
    thumb.dispatchEvent(evt("pointerdown", 10));
    window.dispatchEvent(evt("pointermove", 60));
    window.dispatchEvent(evt("pointerup", 60));

    // Dragging down scrolls the container down (native scroll mechanics intact).
    expect((el as any).scrollTop).toBeGreaterThan(0);

    handle!.destroy();
    el.remove();
  });
});

/**
 * The arrow buttons drive the CONTENT through a single rAF controller: a tap
 * glides one step, press-and-hold glides continuously, extra taps retarget the
 * same move, and the loop is cancelled on release/cancel/teardown. The tests
 * drive a controllable frame clock so timing is asserted, not slept.
 */
describe("arrow-driven content scrolling", () => {
  const rafMap = new Map<number, FrameRequestCallback>();
  let rafId = 0;
  let clock = 0;
  let origRaf: typeof globalThis.requestAnimationFrame | undefined;
  let origCaf: typeof globalThis.cancelAnimationFrame | undefined;
  let origMatchMedia: unknown;

  beforeEach(() => {
    rafMap.clear();
    rafId = 0;
    clock = 0;
    origRaf = globalThis.requestAnimationFrame;
    origCaf = globalThis.cancelAnimationFrame;
    origMatchMedia = (window as { matchMedia?: unknown }).matchMedia;
    // Fake timers must be installed BEFORE the rAF stub: sinon also fakes
    // `requestAnimationFrame`, and it would otherwise replace this one.
    vi.useFakeTimers();
    (globalThis as Record<string, unknown>).requestAnimationFrame = (
      cb: FrameRequestCallback,
    ) => {
      const id = ++rafId;
      rafMap.set(id, cb);
      return id;
    };
    (globalThis as Record<string, unknown>).cancelAnimationFrame = (id: number) => {
      rafMap.delete(id);
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as Record<string, unknown>).requestAnimationFrame =
      origRaf ?? (window as unknown as { requestAnimationFrame: unknown }).requestAnimationFrame;
    (globalThis as Record<string, unknown>).cancelAnimationFrame =
      origCaf ?? (window as unknown as { cancelAnimationFrame: unknown }).cancelAnimationFrame;
    (window as { matchMedia?: unknown }).matchMedia = origMatchMedia;
    document.body.innerHTML = "";
    document.documentElement.classList.remove("tv-scrollbar", "tv-scrollbar-ready");
    document.getElementById("tv-scrollbar-style")?.remove();
  });

  /** Run every pending animation frame, as the browser would. */
  function frame(dt = 16) {
    clock += dt;
    const pending = [...rafMap.values()];
    rafMap.clear();
    for (const cb of pending) cb(clock);
  }
  function frames(n: number, dt = 16) {
    for (let i = 0; i < n; i++) frame(dt);
  }
  function fire(target: EventTarget, type: string, pointerId = 1) {
    const e = new MouseEvent(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, "pointerId", { value: pointerId });
    target.dispatchEvent(e);
  }

  /** A vertical scroll container with a fixed, mockable box. */
  function host(name: string, scrollHeight = 1050, clientHeight = 50) {
    const el = document.createElement("div");
    el.className = name;
    el.style.overflowY = "auto";
    el.style.overflowX = "auto";
    Object.defineProperty(el, "scrollHeight", { value: scrollHeight, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: clientHeight, configurable: true });
    Object.defineProperty(el, "scrollWidth", { value: 200, configurable: true });
    Object.defineProperty(el, "clientWidth", { value: 200, configurable: true });
    Object.defineProperty(el, "offsetWidth", { value: 200, configurable: true });
    Object.defineProperty(el, "scrollTop", { value: 0, writable: true, configurable: true });
    Object.defineProperty(el, "scrollLeft", { value: 0, writable: true, configurable: true });
    Object.defineProperty(el, "getBoundingClientRect", {
      value: () => ({
        left: 0, top: 0, width: 200, height: clientHeight,
        right: 200, bottom: clientHeight, x: 0, y: 0, toJSON: () => ({}),
      }),
      configurable: true,
    });
    document.body.appendChild(el);
    return el;
  }

  function mount(el: HTMLElement, extra: Record<string, unknown> = {}) {
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, {
      include: [`.${el.className}`],
      thickness: 8,
      ...extra,
    });
    handle!.update();
    frames(2); // first layout pass
    return handle!;
  }

  // Scope to the INNER container's strip — the document scroller has its own
  // arrows, which appear first in the DOM.
  const arrows = () => ({
    up: document.querySelector<HTMLElement>(".tv-scrollbar[data-overlay] .tv-arrow-up")!,
    down: document.querySelector<HTMLElement>(".tv-scrollbar[data-overlay] .tv-arrow-down")!,
  });

  it("glides one step on a tap and settles exactly on it", () => {
    const el = host("arrow-tap");
    const handle = mount(el);
    const { down } = arrows();

    fire(down, "pointerdown");
    fire(down, "pointerup");
    // The move is eased, so it is progressive — not an instant jump.
    frame();
    expect(el.scrollTop).toBeGreaterThan(0);
    expect(el.scrollTop).toBeLessThan(16);
    frames(40);
    // step = max(16, clientHeight · 0.05)
    expect(el.scrollTop).toBeCloseTo(16, 1);

    handle.destroy();
    el.remove();
  });

  it("accumulates rapid taps instead of restarting the move", () => {
    const el = host("arrow-rapid");
    const handle = mount(el);
    const { down } = arrows();

    for (let i = 0; i < 3; i++) {
      fire(down, "pointerdown");
      fire(down, "pointerup");
      frame();
    }
    frames(60);
    // Three taps = three steps (16px each): none lost, none queued twice.
    expect(el.scrollTop).toBeCloseTo(48, 1);

    handle.destroy();
    el.remove();
  });

  it("glides continuously while held and stops promptly on release", () => {
    const el = host("arrow-hold");
    const handle = mount(el);
    const { down } = arrows();

    fire(down, "pointerdown");
    // The first step lands immediately, before any repeat.
    frame();
    const firstStep = el.scrollTop;
    expect(firstStep).toBeGreaterThan(0);

    vi.advanceTimersByTime(350); // repeat kicks in (historical delay)
    const before = el.scrollTop;
    frames(10);
    const after = el.scrollTop;
    expect(after).toBeGreaterThan(before + 10); // continuous, frame-driven

    fire(down, "pointerup");
    const atRelease = el.scrollTop;
    frames(10);
    expect(el.scrollTop).toBe(atRelease); // no motion after release

    handle.destroy();
    el.remove();
  });

  it("reverses without a position jump", () => {
    const el = host("arrow-reverse");
    const handle = mount(el);
    const { up, down } = arrows();

    fire(down, "pointerdown");
    vi.advanceTimersByTime(350);
    frames(10);
    const turningPoint = el.scrollTop;
    expect(turningPoint).toBeGreaterThan(0);

    fire(down, "pointerup");
    fire(up, "pointerdown");
    frame();
    // Reversal continues from where the content actually is — no snap.
    expect(Math.abs(el.scrollTop - turningPoint)).toBeLessThan(6);
    vi.advanceTimersByTime(350);
    frames(10);
    expect(el.scrollTop).toBeLessThan(turningPoint);

    fire(up, "pointerup");
    handle.destroy();
    el.remove();
  });

  it("clamps at the boundary and never spins against it", () => {
    const el = host("arrow-edge", 60, 50); // maxScroll = 10
    const handle = mount(el);
    const { down } = arrows();

    for (let i = 0; i < 4; i++) {
      fire(down, "pointerdown");
      fire(down, "pointerup");
      frames(20);
    }
    expect(el.scrollTop).toBe(10); // clamped, not 64
    // Settled: the loop stopped (no pending animation frames of its own).
    expect(rafMap.size).toBeLessThanOrEqual(1);

    handle.destroy();
    el.remove();
  });

  it("stops when the user scrolls another way (wheel wins)", () => {
    const el = host("arrow-wheel");
    const handle = mount(el);
    const { down } = arrows();

    fire(down, "pointerdown");
    vi.advanceTimersByTime(350);
    frames(6);
    const mid = el.scrollTop;
    expect(mid).toBeGreaterThan(0);

    el.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
    frames(10);
    expect(el.scrollTop).toBe(mid);

    handle.destroy();
    el.remove();
  });

  it("cancels pending movement on destroy", () => {
    const el = host("arrow-destroy");
    const handle = mount(el);
    const { down } = arrows();

    fire(down, "pointerdown");
    vi.advanceTimersByTime(350);
    frames(6);
    const mid = el.scrollTop;
    expect(mid).toBeGreaterThan(0);

    handle.destroy();
    frames(10);
    expect(el.scrollTop).toBe(mid);
    el.remove();
  });

  it("moves instantly when the user prefers reduced motion", () => {
    (window as { matchMedia?: unknown }).matchMedia = (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    });
    const el = host("arrow-reduced");
    const handle = mount(el);
    const { down } = arrows();

    fire(down, "pointerdown");
    fire(down, "pointerup");
    frame();
    // No easing: the step is applied on the first frame.
    expect(el.scrollTop).toBeCloseTo(16, 0);

    handle.destroy();
    el.remove();
  });

  it("keeps the rail's own `smooth` option independent of the content move", () => {
    const el = host("arrow-smooth");
    const handle = mount(el, { smooth: true });
    const { down } = arrows();

    fire(down, "pointerdown");
    fire(down, "pointerup");
    frames(40);
    // The content still lands exactly on the step — `smooth` governs the
    // thumb's travel, not the content scroll.
    expect(el.scrollTop).toBeCloseTo(16, 1);

    handle.destroy();
    el.remove();
  });
});

describe("resolveScrollbarOptions (grouped props)", () => {
  it("resolves behavior, appearance and scope groups into one options object", () => {
    const opts = resolveScrollbarOptions({
      behavior: { autoHide: false, smooth: true, touch: true },
      appearance: { thickness: 12, radius: 4, thumbColor: "#f00" },
      scope: { include: [".a"], exclude: [".b"] },
    });
    expect(opts.autoHide).toBe(false);
    expect(opts.smooth).toBe(true);
    expect(opts.touch).toBe(true);
    expect(opts.thickness).toBe(12);
    expect(opts.radius).toBe(4);
    expect(opts.thumbColor).toBe("#f00");
    expect(opts.include).toEqual([".a"]);
    expect(opts.exclude).toEqual([".b"]);
  });

  it("treats include/exclude as scope, not appearance", () => {
    const opts = resolveScrollbarOptions({ scope: { include: [".only"] } });
    expect(opts.include).toEqual([".only"]);
    // Not present anywhere in the appearance group.
    expect(new Set(Object.keys(opts))).not.toContain("scope");
  });

  it("lets a flat option win over the same key in a group", () => {
    const opts = resolveScrollbarOptions(
      { appearance: { thickness: 12, radius: 4 } },
      { thickness: 20 },
    );
    expect(opts.thickness).toBe(20);
    expect(opts.radius).toBe(4);
  });

  it("skips undefined group values so core defaults survive", () => {
    const opts = resolveScrollbarOptions({
      behavior: { autoHide: undefined },
      appearance: { thickness: undefined },
    });
    expect(Object.keys(opts)).not.toContain("autoHide");
    expect(Object.keys(opts)).not.toContain("thickness");
  });

  it("never mutates its inputs", () => {
    const behavior = { autoHide: false };
    const flat = { thickness: 20 };
    const opts = resolveScrollbarOptions({ behavior }, flat);
    expect(opts).not.toBe(behavior);
    expect(opts).not.toBe(flat);
    expect(Object.keys(behavior)).toEqual(["autoHide"]);
    expect(Object.keys(flat)).toEqual(["thickness"]);
  });
});

/**
 * Icon sizing contract: `icons.size` (core `iconSize`) drives ALL four glyphs
 * through `--tv-arrow-size`, floored at the internal minimum while the button
 * allows it and always capped at the button's usable area.
 */
describe("arrow icon sizing", () => {
  const rafQueue: Array<FrameRequestCallback> = [];
  let clock = 0;
  const origRaf = globalThis.requestAnimationFrame;
  const origCaf = globalThis.cancelAnimationFrame;

  beforeEach(() => {
    rafQueue.length = 0;
    clock = 0;
    (globalThis as Record<string, unknown>).requestAnimationFrame = (
      cb: FrameRequestCallback,
    ) => {
      rafQueue.push(cb);
      return rafQueue.length;
    };
    (globalThis as Record<string, unknown>).cancelAnimationFrame = () => {};
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).requestAnimationFrame = origRaf;
    (globalThis as Record<string, unknown>).cancelAnimationFrame = origCaf;
    document.body.innerHTML = "";
    document.documentElement.classList.remove("tv-scrollbar", "tv-scrollbar-ready");
    document.getElementById("tv-scrollbar-style")?.remove();
  });

  function frame() {
    clock += 16;
    const pending = [...rafQueue];
    rafQueue.length = 0;
    for (const cb of pending) cb(clock);
  }

  function mount(opts: Record<string, unknown>) {
    const el = document.createElement("div");
    el.className = "icon-host";
    el.style.overflowY = "auto";
    Object.defineProperty(el, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(el, "clientHeight", { value: 50, configurable: true });
    Object.defineProperty(el, "scrollWidth", { value: 200, configurable: true });
    Object.defineProperty(el, "clientWidth", { value: 200, configurable: true });
    Object.defineProperty(el, "getBoundingClientRect", {
      value: () => ({
        left: 0, top: 0, width: 200, height: 50, right: 200, bottom: 50, x: 0, y: 0, toJSON: () => ({}),
      }),
      configurable: true,
    });
    document.body.appendChild(el);
    const store = createThemeStore({ initialTheme: theme });
    const handle = createOverlayScrollbar(store, { include: [".icon-host"], ...opts });
    handle!.update();
    frame();
    frame();
    const root = document.querySelector<HTMLElement>(".tv-scrollbar[data-overlay].tv-v")!;
    const read = () => ({
      size: root.style.getPropertyValue("--tv-arrow-size"),
      half: root.style.getPropertyValue("--tv-arrow"),
      btn: 0,
    });
    return { el, handle: handle!, read, root };
  }

  it("defaults to the button's usable square when no size is requested", () => {
    const { handle, read, el } = mount({ thickness: 8 });
    // button cross = 8, button length = max(10, round(8·1.4)) = 11 → min = 8
    expect(read().size).toBe("8px");
    // The triangle keeps its historical thickness-derived half-width.
    expect(read().half).toBe("3px");
    handle.destroy();
    el.remove();
  });

  it("grows with an explicit size while staying inside the button", () => {
    const { handle, read, el } = mount({ thickness: 20, iconSize: 12 });
    // cross = 20, length = max(10, round(28)) = 28 → usable = 20; 12 fits.
    expect(read().size).toBe("12px");
    expect(read().half).toBe("6px");
    handle.destroy();
    el.remove();
  });

  it("clamps an oversized request to the usable area (thickness 8, request 200)", () => {
    const { handle, read, el } = mount({ thickness: 8, iconSize: 200 });
    expect(read().size).toBe("8px");
    handle.destroy();
    el.remove();
  });

  it("floors a tiny request at the internal minimum while space allows", () => {
    const { handle, read, el } = mount({ thickness: 20, iconSize: 2 });
    expect(read().size).toBe("8px"); // ICON_MIN_SIZE
    handle.destroy();
    el.remove();
  });

  it("lets the available space win below the minimum (very thin rail)", () => {
    const { handle, read, el } = mount({ thickness: 4, iconSize: 20 });
    // cross = 4, length = max(10, 6) = 10 → usable = 4 → the button wins.
    expect(read().size).toBe("4px");
    handle.destroy();
    el.remove();
  });

  it("ignores non-finite and negative sizes and reports them", () => {
    resetDiagnosticEmission();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const bad of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
      resetDiagnosticEmission();
      const { handle, read, el } = mount({ thickness: 8, iconSize: bad });
      // Falls back to the default sizing instead of corrupting layout.
      expect(read().size).toBe("8px");
      handle.destroy();
      el.remove();
      expect(
        warn.mock.calls.some(
          (c) => (c[1] as { code?: string } | undefined)?.code === "TV_SCROLLBAR_OPTION_INVALID",
        ),
      ).toBe(true);
    }
    warn.mockRestore();
  });

  it("re-sizes the glyph when hover-expand grows the rail", () => {
    const { handle, read, el } = mount({ thickness: 12, hoverThickness: 30, hoverExpand: true, iconSize: 30 });
    // Resting: cross 12, length max(10, 17) = 17 → usable 12 → clamped to 12.
    expect(read().size).toBe("12px");
    const root = document.querySelector<HTMLElement>(".tv-scrollbar[data-overlay].tv-v")!;
    root.dispatchEvent(new MouseEvent("mouseenter"));
    // Hovered: cross 30, length 17 → usable 17 → clamped to 17.
    expect(read().size).toBe("17px");
    handle.destroy();
    el.remove();
  });
});

describe("createPrePaintScrollbarScript", () => {
  afterEach(() => {
    document.documentElement.classList.remove("tv-scrollbar");
    document.getElementById("tv-scrollbar-style")?.remove();
    (window as any).matchMedia = undefined;
  });

  it("emits a script that injects hiding CSS and adds tv-scrollbar class", () => {
    const script = createPrePaintScrollbarScript();
    expect(script).toContain("tv-scrollbar");
    expect(script).toContain("scrollbar-width");
    expect(script).toContain("tv-scrollbar-style");
  });

  it("hides native scrollbar when executed", () => {
    eval(createPrePaintScrollbarScript());
    expect(document.documentElement.classList.contains("tv-scrollbar")).toBe(true);
    const style = document.getElementById("tv-scrollbar-style");
    expect(style).not.toBeNull();
    const css = style!.textContent ?? "";
    expect(css).toContain("scrollbar-width:none");
    expect(css).toContain("::-webkit-scrollbar");
  });

  it("is idempotent — a second run does not duplicate the style", () => {
    eval(createPrePaintScrollbarScript());
    eval(createPrePaintScrollbarScript());
    expect(document.querySelectorAll("#tv-scrollbar-style").length).toBe(1);
  });

  it("collapses the page bar but RESERVES the inner scrollbar's space (invisible)", () => {
    const css = createPrePaintScrollbarCSS();
    // Page/window: collapsed — no reserved empty strip.
    expect(css).toContain(
      "html.tv-scrollbar,html.tv-scrollbar body,body.tv-scrollbar{scrollbar-width:none",
    );
    expect(css).toContain("html.tv-scrollbar::-webkit-scrollbar,html.tv-scrollbar body::-webkit-scrollbar");
    // Inner containers: sized (space kept) and painted transparent — sizing the
    // WebKit pseudo-element is what avoids OVERLAY scrollbars (macOS), so the
    // content-side gutter exists there too. Crucially NOT collapsed to 0.
    expect(css).toContain("html.tv-scrollbar *::-webkit-scrollbar{width:15px;height:15px;background:transparent}");
    expect(css).toContain("html.tv-scrollbar *::-webkit-scrollbar-thumb");
    expect(css).toContain("[data-themvora-scrollbar=overlay]::-webkit-scrollbar{width:15px");
    // Non-WebKit engines (Firefox) reserve the same space via standard props.
    expect(css).toContain("@supports not selector(::-webkit-scrollbar)");
    expect(css).toContain("scrollbar-width:thin;scrollbar-color:transparent transparent");
  });

  it("leaves native scrollbars on coarse pointers unless touch is opted in", () => {
    (window as any).matchMedia = () => ({ matches: true });
    eval(createPrePaintScrollbarScript());
    expect(document.documentElement.classList.contains("tv-scrollbar")).toBe(false);

    eval(createPrePaintScrollbarScript({ touch: true }));
    expect(document.documentElement.classList.contains("tv-scrollbar")).toBe(true);
  });
});