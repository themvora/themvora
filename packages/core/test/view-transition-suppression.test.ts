// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCSSVariablesBinding, createThemeStore, defineTheme } from "../src";

/**
 * The View Transition path must mute descendant transitions for the crossfade.
 *
 * Observed failure (real browser, React + MUI, measured by
 * `packages/adapters/mui/scripts/browser-check.mjs`):
 *
 *   document swapped at frame 1, MUI Button reached its new colour at frame 31
 *   (540 ms of its own `background-color` easing), MUI Paper at frame 0.
 *
 * Three timings for one change: the page crossfaded, the button eased, the paper
 * snapped. The CSS-property path already muted descendants for exactly this
 * reason; the View Transition path did not, so every component that owns a
 * colour transition re-eased the new palette underneath the fade.
 *
 * jsdom has no `startViewTransition`, so it is stubbed — the assertion is about
 * the window the binding opens around it, which is what the browser check
 * measures end to end.
 */

const light = defineTheme({
  name: "vt-light",
  meta: { family: "vt", mode: "light" },
  tokens: { colors: { background: "#ffffff", foreground: "#000000" } },
});
const dark = defineTheme({
  name: "vt-dark",
  meta: { family: "vt", mode: "dark" },
  tokens: { colors: { background: "#000000", foreground: "#ffffff" } },
});

function storeWith(theme: typeof light) {
  return createThemeStore({ initialTheme: theme });
}

/**
 * Stub `document.startViewTransition` with one deferred per call.
 *
 * A single shared promise would resolve every overlapping transition at once,
 * which is not what the browser does — the depth-counted window is exactly what
 * the overlapping case is about.
 */
function installViewTransition() {
  const calls: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];

  const startViewTransition = vi.fn((callback: () => Promise<void>) => {
    void callback();
    let resolve: () => void = () => {};
    let reject: (error: unknown) => void = () => {};
    const finished = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    // The binding attaches its own handler; this keeps an intentional abort from
    // surfacing as an unhandled rejection in the test run.
    finished.catch(() => {});
    calls.push({ resolve, reject });
    return { ready: Promise.resolve(), finished };
  });

  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    writable: true,
    value: startViewTransition,
  });

  return {
    startViewTransition,
    calls,
    resolveFinished: (index = 0) => calls[index]?.resolve(),
    rejectFinished: (index = 0) => calls[index]?.reject(new Error("AbortError")),
  };
}

/** jsdom has no `matchMedia`; the binding reads it for reduced motion. */
function installMatchMedia(matches: (query: string) => boolean) {
  const original = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) =>
      ({
        matches: matches(query),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
  return () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: original,
    });
  };
}

afterEach(() => {
  delete (document as unknown as Record<string, unknown>).startViewTransition;
  document.documentElement.removeAttribute("data-themvora-animating");
  document
    .querySelectorAll("style[data-themvora-animating-style]")
    .forEach((el) => el.remove());
  document.documentElement.removeAttribute("style");
});

describe("View Transition path — descendant suppression", () => {
  it("mutes descendants for the crossfade and releases when it finishes", async () => {
    const { startViewTransition, resolveFinished } = installViewTransition();
    const store = storeWith(light);

    const binding = createCSSVariablesBinding(store, { transition: { enabled: true } });
    expect(binding).not.toBeNull();

    // The first apply is suppressed (no animation on mount).
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute("data-themvora-animating")).toBe(false);

    store.set(dark as never);

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    // The window is open *while* the browser holds the crossfade — this is the
    // frame at which MUI used to start its own 540 ms easing.
    expect(document.documentElement.hasAttribute("data-themvora-animating")).toBe(true);
    expect(
      document.querySelector("style[data-themvora-animating-style]"),
    ).not.toBeNull();

    resolveFinished();
    await Promise.resolve();
    await Promise.resolve();

    // …and it closes with the transition, so hover/focus transitions come back.
    expect(document.documentElement.hasAttribute("data-themvora-animating")).toBe(false);

    binding!.destroy();
  });

  it("releases the window when the transition is aborted", async () => {
    const { rejectFinished } = installViewTransition();
    const store = storeWith(light);
    const binding = createCSSVariablesBinding(store, { transition: { enabled: true } });

    store.set(dark as never);
    expect(document.documentElement.hasAttribute("data-themvora-animating")).toBe(true);

    rejectFinished(0);
    await Promise.resolve();
    await Promise.resolve();

    // An aborted crossfade must not leave every descendant transition muted.
    expect(document.documentElement.hasAttribute("data-themvora-animating")).toBe(false);

    binding!.destroy();
  });

  it("coalesces a change that arrives during a crossfade", async () => {
    const { resolveFinished, calls, startViewTransition } = installViewTransition();
    const store = storeWith(light);
    // A short duration so the coalesced change's own suppression window closes
    // inside the test.
    const binding = createCSSVariablesBinding(store, {
      transition: { enabled: true, duration: 10 },
    });

    store.set(dark as never);
    // A second toggle before the first crossfade settles.
    store.set(light as never);

    // One crossfade, not two. Starting a second one aborts the first, and an
    // aborted crossfade leaves the page mid-fade before snapping to the new
    // palette — on repeated clicks that reads as the theme flickering rather
    // than changing.
    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(1);

    // The latest choice still wins, immediately: the variables are written now
    // and the running crossfade simply finishes over them.
    expect(
      document.documentElement.style.getPropertyValue("--theme-color-background"),
    ).toBe("#ffffff");

    // Two windows are open — the crossfade's and the coalesced swap's — so
    // descendants stay muted until both release.
    expect(document.documentElement.hasAttribute("data-themvora-animating")).toBe(true);

    resolveFinished(0);
    await Promise.resolve();
    await Promise.resolve();

    // The crossfade's window closed, the swap's is still open: the flag must not
    // drop while anything still needs it.
    expect(document.documentElement.hasAttribute("data-themvora-animating")).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(document.documentElement.hasAttribute("data-themvora-animating")).toBe(false);

    binding!.destroy();
  });

  it("reports each applied change after the variables are on the target", () => {
    installViewTransition();
    const store = storeWith(light);
    const seen: Array<{ theme: string; background: string }> = [];

    const binding = createCSSVariablesBinding(store, {
      transition: { enabled: true },
      onAfterSwap: (theme) => {
        seen.push({
          theme: String(theme.name),
          background: document.documentElement.style.getPropertyValue(
            "--theme-color-background",
          ),
        });
      },
    });

    // The initial suppressed apply is reported too, so a consumer can rely on
    // the hook rather than on a separate first-run path.
    expect(seen).toEqual([{ theme: "vt-light", background: "#ffffff" }]);

    store.set(dark as never);

    // One report per applied change, and the document already holds the new
    // value when it fires. That is the contract the vanilla runtime publishes
    // `themeChange` from: a consumer reading the document inside the handler
    // sees the theme it is being told about, not the previous one.
    expect(seen).toHaveLength(2);
    expect(seen[1]).toEqual({ theme: "vt-dark", background: "#000000" });

    binding!.destroy();
  });

  it("does not open a window when transitions are disabled", () => {
    const { startViewTransition } = installViewTransition();
    const store = storeWith(light);
    const binding = createCSSVariablesBinding(store, {
      transition: { enabled: false },
    });

    store.set(dark as never);

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute("data-themvora-animating")).toBe(false);

    binding!.destroy();
  });

  it("does not open a window when the user prefers reduced motion", () => {
    const { startViewTransition } = installViewTransition();
    const restoreMatchMedia = installMatchMedia((query) =>
      query.includes("prefers-reduced-motion"),
    );

    const store = storeWith(light);
    const binding = createCSSVariablesBinding(store, { transition: { enabled: true } });

    store.set(dark as never);

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute("data-themvora-animating")).toBe(false);

    binding!.destroy();
    restoreMatchMedia();
  });
});
