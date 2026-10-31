/**
 * Regression: the overlay scrollbar must initialize on the **first load**, not
 * on the first theme change.
 *
 * ## The bug this file pins
 *
 * `<themvora-scrollbar>` never creates a runtime; it *follows* one. In Astro
 * there is no `<themvora-provider>` element to follow — the provider is
 * server-rendered markup, and `@themvora/astro` publishes the runtime on
 * `<html>` and as a `theme-ready` event. `<ThemeToggle />`'s bindings are
 * deliberately lazy ("nothing here creates a runtime — the controller is
 * resolved on the first interaction"), so on a page with no island *nothing*
 * published a runtime until the visitor clicked a control.
 *
 * The consequence, measured in a real browser:
 *
 * | Step | `<html>` class | overlay rails |
 * | ---- | -------------- | ------------- |
 * | fresh load | `""` | 0 |
 * | after one toggle | `tv-scrollbar …` | 2 |
 * | after refresh | `""` | 0 |
 *
 * So initialization was a side effect of the theme-change path, and a refresh
 * took it away again.
 *
 * ## What is asserted here
 *
 * The distinction itself: **connected, then runtime installed, with no theme
 * change** must produce a live overlay. Both creation paths are covered
 * separately, because they are different code:
 *
 * - the native Astro path, where `ThemeScrollbar.astro`'s script calls
 *   `getThemeController()` (get-or-create the app-wide runtime);
 * - the Astro + React path, where `ThemeProviderClient` calls
 *   `createThemeController()` after hydration.
 *
 * The rest of the file covers the lifecycle rules that keep the fix honest:
 * a theme change must not rebuild the manager, reconnection must not duplicate
 * it, and unmount must remove what it created.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ThemvoraScrollbar } from "@themvora/web";
import { createThemeController, getThemeController, __resetThemeController } from "../src/controller";
import { getGlobalRuntime, releaseGlobalRuntime } from "../src/shared-runtime";

/** The rails the manager appends to `<body>`, excluding `<html>` itself. */
const RAILS = ".tv-scrollbar[data-themvora-host]";

function rails(): Element[] {
  return [...document.querySelectorAll(RAILS)];
}

/** Lets the manager run its first render pass (`requestAnimationFrame` + 80 ms). */
function settle(ms = 160): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Puts a `<themvora-scrollbar>` in the document and upgrades it. */
function mountScrollbar(): HTMLElement {
  const el = document.createElement("themvora-scrollbar");
  document.body.appendChild(el);
  ThemvoraScrollbar.define();
  return el;
}

beforeEach(() => {
  // A previous case's runtime would be adopted by the next one, turning
  // "no runtime yet" into "runtime already installed" and hiding the bug.
  __resetThemeController();
  document.body.innerHTML = "";
  document.documentElement.className = "";
  document.getElementById("tv-scrollbar-style")?.remove();
  document.cookie = "theme-name=; max-age=0; path=/";
  document.cookie = "theme-family=; max-age=0; path=/";
  document.cookie = "theme-mode=; max-age=0; path=/";
});

afterEach(() => {
  // Removing the element runs `disconnectedCallback` → `onDetach` → destroy,
  // which is also what releases the manager's interval and observers.
  document.body.innerHTML = "";
  const live = getGlobalRuntime();
  if (live) {
    live.destroy();
    releaseGlobalRuntime(live);
  }
  __resetThemeController();
  document.documentElement.className = "";
  document.getElementById("tv-scrollbar-style")?.remove();
});

describe("native Astro path — the component installs the runtime itself", () => {
  it("has no runtime and no overlay before the component's script runs", async () => {
    mountScrollbar();
    await settle();

    // This is the pre-fix state: connected, parked on `theme-ready`, nothing
    // to draw. The assertion is here so a regression that makes the element
    // create a runtime on connect (and therefore duplicate the app-wide one)
    // cannot pass silently.
    expect(getGlobalRuntime()).toBeNull();
    expect(rails()).toHaveLength(0);
  });

  it("initializes on connect + runtime install, with no theme change", async () => {
    mountScrollbar();
    await settle();
    expect(rails()).toHaveLength(0);

    // Exactly what `ThemeScrollbar.astro`'s `<script>` does. No toggle, no
    // second load, no theme change: this is the whole fix.
    const controller = getThemeController();
    const themeBefore = document.documentElement.getAttribute("data-theme");
    await settle();

    expect(controller.runtime).toBe(getGlobalRuntime());
    expect(rails().length).toBeGreaterThan(0);
    expect(document.documentElement.classList.contains("tv-scrollbar")).toBe(true);
    expect(document.documentElement.classList.contains("tv-scrollbar-ready")).toBe(true);
    // The point of the distinction: the overlay exists *before* the theme
    // moved. A fix that only worked because a change re-published the runtime
    // would leave this equal to `themeBefore` but the rails absent above.
    expect(document.documentElement.getAttribute("data-theme")).toBe(themeBefore);
  });

  it("does not create a second runtime when the page already has one", async () => {
    const existing = createThemeController();
    mountScrollbar();
    await settle();

    const controller = getThemeController();
    expect(controller.runtime).toBe(existing.runtime);
    expect(getGlobalRuntime()).toBe(existing.runtime);
    expect(rails().length).toBeGreaterThan(0);
  });
});

describe("Astro + React path — the island installs the runtime after hydration", () => {
  it("initializes when hydration installs the runtime after connect", async () => {
    mountScrollbar();
    await settle();
    expect(rails()).toHaveLength(0);

    // `ThemeProviderClient`'s creation path.
    const island = createThemeController();
    await settle();

    expect(rails().length).toBeGreaterThan(0);
    expect(getGlobalRuntime()).toBe(island.runtime);
  });

  it("initializes on connect when hydration already installed the runtime", async () => {
    // The other order: the island hydrated first, so the element finds the
    // runtime on `<html>` during `connectedCallback` and never waits.
    createThemeController();
    mountScrollbar();
    await settle();

    expect(rails().length).toBeGreaterThan(0);
  });

  it("keeps one manager when an island replaces the runtime", async () => {
    const island = createThemeController();
    mountScrollbar();
    await settle();
    const before = rails().length;
    expect(before).toBeGreaterThan(0);

    // A navigation mounts a new island; the old runtime is destroyed and a new
    // one published. The element must swap, not stack.
    island.destroy();
    releaseGlobalRuntime(island.runtime);
    __resetThemeController();
    createThemeController();
    await settle();

    expect(rails().length).toBe(before);
  });
});

describe("the component's client script", () => {
  /**
   * The behavioural cases above drive the *contract* the script relies on, so
   * they pass whether or not the script actually uses it. This case pins the
   * wiring itself: the one line whose absence was the bug.
   *
   * Astro bundles a component's `<script>` as a module and executes it in the
   * browser only, so it cannot be imported and run here — the script body is
   * the contract, and it is asserted as source.
   */
  it("defines the element and installs the app-wide runtime", () => {
    // `import.meta.url` is not a `file:` URL under the jsdom environment, so
    // the path is resolved from the package root instead — vitest runs with
    // its config directory (`packages/astro`) as the cwd.
    const source = readFileSync(resolve(process.cwd(), "src/ThemeScrollbar.astro"), "utf8");
    const open = source.indexOf("<script>");
    const close = source.indexOf("</script>");
    expect(open).toBeGreaterThan(-1);
    expect(close).toBeGreaterThan(open);
    // Comments are stripped first: the rationale in that script *names*
    // `getThemeController()`, so matching the raw text would pass even with the
    // call deleted — the assertion would be testing the comment.
    const script = source
      .slice(open, close)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    expect(script).toContain("ThemvoraScrollbar.define()");
    // Without this the overlay waits for a `theme-ready` that a page with no
    // island never dispatches until the visitor clicks a control.
    expect(script).toMatch(/getThemeController\(\)\s*;/);
  });
});

describe("lifecycle rules the fix must not break", () => {
  it("updates appearance on a theme change without rebuilding the manager", async () => {
    const controller = getThemeController();
    mountScrollbar();
    await settle();
    const original = rails();

    controller.setMode("dark");
    await settle();

    // Same nodes: a colour change must not destroy and recreate the overlay,
    // which would drop the scroll position's visual continuity and re-attach
    // every listener.
    expect(rails()).toEqual(original);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does not duplicate rails across a reconnect", async () => {
    getThemeController();
    const el = mountScrollbar();
    await settle();
    const count = rails().length;
    expect(count).toBeGreaterThan(0);

    el.remove();
    await settle(40);
    expect(rails()).toHaveLength(0);

    document.body.appendChild(el);
    await settle();

    expect(rails()).toHaveLength(count);
  });

  it("removes its rails and the hiding class when it unmounts", async () => {
    getThemeController();
    mountScrollbar();
    await settle();
    expect(rails().length).toBeGreaterThan(0);

    document.body.innerHTML = "";
    await settle(40);

    expect(rails()).toHaveLength(0);
  });

  it("rebuilds once when an option attribute changes, and applies the new value", async () => {
    getThemeController();
    const el = mountScrollbar();
    await settle();
    const before = rails().length;
    expect(document.querySelector(`${RAILS}.tv-v`)?.getAttribute("style")).not.toContain(
      "--tv-scrollbar-thumb",
    );

    // A config change is the one trigger that *should* rebuild: the engine
    // resolves its options once, when the overlay is created.
    el.setAttribute("thumb-color", "#123456");
    await settle();

    expect(rails()).toHaveLength(before);
    expect(
      document.querySelector<HTMLElement>(`${RAILS}.tv-v`)?.style.getPropertyValue("--tv-scrollbar-thumb"),
    ).toBe("#123456");
  });

  it("initializes when a themeOverride is in force", async () => {
    // An override is a selection source like any other; the overlay must come
    // up under it on the first load, not once the override is removed.
    createThemeController({ themeOverride: { family: "cocoa", mode: "dark" } });
    mountScrollbar();
    await settle();

    expect(rails().length).toBeGreaterThan(0);
    expect(document.documentElement.getAttribute("data-theme")).toBe("cocoa-dark");
  });
});
