// @vitest-environment jsdom
/**
 * Regression: hiding the native scrollbar must never outlive its overlay.
 *
 * ## The bug this file pins
 *
 * `scrollbar` on `provider.astro` server-renders `tv-scrollbar` on `<html>` and
 * inlines the hiding CSS. `<ThemeScrollbar />` renders the element that draws
 * the replacement. Two independent switches for one feature, and the page was
 * broken whenever they disagreed:
 *
 * - provider `scrollbar` + component present  → correct;
 * - provider `scrollbar` + component **absent** → the native bar was hidden and
 *   nothing drew a scrollbar. **No scrollbar at all.**
 *
 * The second case is not hypothetical: it is what you get by commenting out
 * `<ThemeScrollbar />` or forgetting it, and it also survived removing the
 * overlay's stylesheet import, because the hiding rules are inlined in `<head>`
 * by the provider rather than living in that stylesheet.
 *
 * ## What is asserted here
 *
 * The guard script is the enforcement: at the end of `<body>` it checks whether
 * an overlay element exists, and removes the hiding if it does not. These tests
 * run the *shipped* script — the same string `provider.astro` serialises — in a
 * jsdom document, so the behaviour asserted is the behaviour that ships.
 *
 * The source-contract test at the bottom keeps the wiring honest: the provider
 * must mark its stylesheet (an unmarked stylesheet cannot be found by the
 * guard, since the markup has no id) and must actually emit the guard.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createScrollbarHidingGuardScript } from "../src/scrollbar-guard";

const HIDING_ATTR = "data-themvora-scrollbar-hiding";

/** A document that looks like the provider's output with an overlay present. */
function serverRendered({ withOverlay }: { withOverlay: boolean }) {
  document.documentElement.className = "tv-scrollbar tv-scrollbar-ready";
  const style = document.createElement("style");
  style.setAttribute(HIDING_ATTR, "");
  style.textContent = "html.tv-scrollbar{scrollbar-width:none}";
  document.head.appendChild(style);

  if (withOverlay) {
    const el = document.createElement("themvora-scrollbar");
    document.body.appendChild(el);
  }
}

const runGuard = () => new Function(createScrollbarHidingGuardScript())();

const html = () => document.documentElement;
const hidingSheets = () => document.querySelectorAll(`style[${HIDING_ATTR}]`);

describe("provisional hiding — the guard hands the native bar back", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.className = "";
    document.head.innerHTML = "";
  });

  it("removes the hiding when the page rendered no overlay element", () => {
    serverRendered({ withOverlay: false });
    expect(html().classList.contains("tv-scrollbar")).toBe(true);

    runGuard();

    // The page is left with a native scrollbar, not with nothing.
    expect(html().classList.contains("tv-scrollbar")).toBe(false);
    expect(html().classList.contains("tv-scrollbar-ready")).toBe(false);
    expect(hidingSheets().length).toBe(0);
  });

  it("keeps the hiding when the overlay element is present", () => {
    serverRendered({ withOverlay: true });

    runGuard();

    expect(html().classList.contains("tv-scrollbar")).toBe(true);
    expect(hidingSheets().length).toBe(1);
  });

  it("also removes a client-injected stylesheet, which has an id and no marker", () => {
    serverRendered({ withOverlay: false });
    const client = document.createElement("style");
    client.id = "tv-scrollbar-style";
    client.textContent = "html.tv-scrollbar{scrollbar-width:none}";
    document.head.appendChild(client);

    runGuard();

    expect(document.getElementById("tv-scrollbar-style")).toBeNull();
  });

  it("is a no-op on a page that never hid anything", () => {
    document.body.innerHTML = "<p>plain page</p>";

    expect(() => runGuard()).not.toThrow();
    expect(html().className).toBe("");
  });

  it("does not throw when the stylesheet was already removed", () => {
    document.documentElement.className = "tv-scrollbar";
    // Class present, no stylesheet at all — a half-torn-down document.
    expect(() => runGuard()).not.toThrow();
    expect(html().classList.contains("tv-scrollbar")).toBe(false);
  });
});

describe("provider wiring", () => {
  const source = readFileSync(resolve(process.cwd(), "src/provider.astro"), "utf8");

  it("marks the hiding stylesheet so a teardown can find it", () => {
    // The markup has no `id`, so `getElementById` cannot find it — the marker
    // attribute is the only handle.
    expect(source).toContain(`${HIDING_ATTR} set:html={createPrePaintScrollbarCSS()}`);
  });

  it("emits the guard only when the scrollbar is enabled", () => {
    expect(source).toContain("createScrollbarHidingGuardScript()");
    expect(source).toMatch(/scrollbar\s*\?\s*createScrollbarHidingGuardScript\(\)\s*:\s*""/);
    expect(source).toMatch(/\{scrollbarGuardScript && <script is:inline/);
  });

  it("runs the guard after the slot, so the overlay element has been parsed", () => {
    const slot = source.indexOf("<slot />");
    const guard = source.indexOf("scrollbarGuardScript && <script");
    expect(slot).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(slot);
  });
});
