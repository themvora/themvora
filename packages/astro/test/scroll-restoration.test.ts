// @vitest-environment jsdom
/**
 * Regression: the first frame of a reload must not paint at `scrollY === 0`.
 *
 * ## The bug this file pins
 *
 * `<ClientRouter />` sets `history.scrollRestoration = "manual"` and restores
 * the position from its deferred module. In dev, and on a slow production
 * load, the document paints before that module runs, so the visitor sees the
 * top of the page and then a jump. `createScrollRestorationScript()` closes
 * that window by reading the same `history.state` at the end of `<body>`.
 *
 * ## What is asserted here
 *
 * The shipped script string (the exact one `provider.astro` serialises) is run
 * against several `history.state` shapes:
 *
 * - Astro's state → the saved position is applied, and the inline
 *   `scroll-behavior` override is reverted synchronously;
 * - no state / zero position / another router's state → no scrolling.
 *
 * The source-contract test keeps the wiring honest: the provider must emit the
 * script, and it must sit after the slot — before the slot there is no content
 * to scroll.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createScrollRestorationScript } from "../src/scroll-restoration";

const run = () => new Function(createScrollRestorationScript())();
const html = () => document.documentElement;

afterEach(() => {
  window.history.replaceState(null, "");
  html().style.scrollBehavior = "";
  vi.restoreAllMocks();
});

describe("early scroll restoration", () => {
  it("restores Astro's saved position", () => {
    window.history.replaceState({ index: 0, scrollX: 0, scrollY: 640 }, "");
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    run();

    expect(scrollTo).toHaveBeenCalledWith(0, 640);
  });

  it("restores a horizontal position as well", () => {
    window.history.replaceState({ index: 2, scrollX: 48, scrollY: 0 }, "");
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    run();

    expect(scrollTo).toHaveBeenCalledWith(48, 0);
  });

  it("forces an instant scroll even when the page uses smooth scrolling", () => {
    // A smooth restore would animate from the top — the flash this script
    // exists to prevent. The override is inline and must be reverted.
    html().style.scrollBehavior = "smooth";
    window.history.replaceState({ index: 0, scrollX: 0, scrollY: 320 }, "");
    let behaviorDuringScroll = null;
    window.scrollTo = () => {
      behaviorDuringScroll = html().style.scrollBehavior;
    };

    run();

    expect(behaviorDuringScroll).toBe("auto");
    expect(html().style.scrollBehavior).toBe("smooth");
  });

  it("does nothing without history state", () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    run();

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("does nothing at the top of the page", () => {
    window.history.replaceState({ index: 0, scrollX: 0, scrollY: 0 }, "");
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    run();

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("leaves another router's state alone", () => {
    // Astro always writes `index`; state without it belongs to someone else.
    window.history.replaceState({ scrollY: 900 }, "");
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    run();

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("restores the inline style if the scroll call throws", () => {
    html().style.scrollBehavior = "smooth";
    window.history.replaceState({ index: 0, scrollX: 0, scrollY: 320 }, "");
    window.scrollTo = () => {
      throw new Error("scroll failed");
    };

    expect(() => run()).not.toThrow();
    expect(html().style.scrollBehavior).toBe("smooth");
  });
});

describe("provider wiring", () => {
  const source = readFileSync(resolve(process.cwd(), "src/provider.astro"), "utf8");

  it("emits the restoration script unconditionally", () => {
    expect(source).toContain("createScrollRestorationScript()");
    expect(source).toContain(
      "<script is:inline set:html={createScrollRestorationScript()} />",
    );
  });

  it("runs the script after the slot, when the page has content to scroll", () => {
    const slot = source.indexOf("<slot />");
    const script = source.indexOf("createScrollRestorationScript()");
    expect(slot).toBeGreaterThan(-1);
    expect(script).toBeGreaterThan(slot);
  });
});
