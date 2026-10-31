import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import {
  createThemeRuntime,
  createThemeReadoutScript,
  defineTheme,
  type ThemeDefinition,
} from "@themvora/core";
import { createThemeReadoutScript as createReadoutScriptFromCore } from "@themvora/core";
import { ThemeReadout } from "../src/theme-readout";
import { setGlobalRuntime, getGlobalRuntime } from "../src/shared-runtime";

/**
 * Regression matrix for the bootstrap-readout contract.
 *
 * The behaviour under test is the one that keeps re-appearing: for
 * `mode: "system"` the server renders a fallback it cannot verify, the pre-paint
 * bootstrap resolves the real value and patches the DOM, and React hydration
 * must then **not** put the server's fallback back. The final assertion in the
 * hydration suite is the heart of the contract.
 */

const mintLight = defineTheme({
  name: "mint-light",
  meta: { family: "mint", mode: "light" },
  tokens: { colors: { background: "#f8fafc", primary: "#059669" } },
});

const mintDark = defineTheme({
  name: "mint-dark",
  meta: { family: "mint", mode: "dark" },
  tokens: { colors: { background: "#020617", primary: "#10b981" } },
});

const themes: readonly ThemeDefinition[] = [mintLight, mintDark];

/** The payload the blocking bootstrap publishes (see `bootstrap.ts`). */
function publish(payload: Record<string, unknown>) {
  (window as unknown as Record<string, unknown>).__THEMVORA_BOOTSTRAP__ = payload;
}

function runReadoutScript() {
  // The emitted script is a self-contained IIFE, exactly as the browser gets it.
  // eslint-disable-next-line no-new-func
  new Function(createThemeReadoutScript())();
}

beforeEach(() => {
  // The blocking script attaches a MutationObserver to `<html>` that patches
  // readouts as they are parsed. Disconnecting it first keeps it out of the
  // teardown below: an observer left attached fires while the document is being
  // emptied, and its writes then race the removal — which surfaced as an
  // intermittent `NotFoundError` from jsdom, but only on a loaded machine.
  const observer = (window as unknown as Record<string, unknown>)
    .__THEMVORA_READOUT_OBSERVER__ as { disconnect?(): void } | undefined;
  observer?.disconnect?.();
  delete (window as unknown as Record<string, unknown>).__THEMVORA_READOUT_OBSERVER__;

  document.documentElement.innerHTML = "";
  document.body.innerHTML = "";
  // The readout script reads the state off `<html>` first, because that is the
  // only copy that is still live after a client navigation. Clearing the
  // element's children does not clear its *attributes*, so without this a case
  // that publishes a payload would still see the previous case's `data-theme`.
  for (const name of [
    "data-theme",
    "data-theme-mode",
    "data-theme-family",
    "data-theme-selection-mode",
    "data-theme-selection-family",
    "data-theme-ready",
  ]) {
    document.documentElement.removeAttribute(name);
  }
  document.documentElement.removeAttribute("style");
  delete (window as unknown as Record<string, unknown>).__THEMVORA_BOOTSTRAP__;
});

describe("the bootstrap publishes a selection the resolved mode cannot express", () => {
  it("writes the selection mode, the completion marker and the global payload", async () => {
    const { createBlockingScript, buildThemeBootstrapPayload } = await import(
      "../src/blocking-script"
    );
    const cssMap = Object.fromEntries(
      themes.map((t) => [t.name, { "--theme-color-background": "#000" }]),
    );
    const { names, defaults, family } = buildThemeBootstrapPayload(themes, "mint");

    const script = createBlockingScript("fp", cssMap, {
      mode: "system",
      family,
      names,
      defaults,
    });

    // `data-theme-mode` carries the *resolved* mode, so a `"system"` selection
    // is unrecoverable from it — which is why the selection is published too.
    expect(script).toContain("data-theme-selection-mode");
    expect(script).toContain("data-theme-selection-family");
    expect(script).toContain("data-theme-ready");
    expect(script).toContain("__THEMVORA_BOOTSTRAP__");
    expect(script).toContain("selection:{mode:mode,family:family||fam}");
  });
});

describe("createThemeReadoutScript", () => {
  it("patches theme / mode / family from the published payload", () => {
    document.body.innerHTML = `
      <strong id="t" data-tv-readout="theme">mint-light</strong>
      <strong id="m" data-tv-readout="mode">system</strong>
      <strong id="f" data-tv-readout="family">mint</strong>
      <span id="untouched">keep me</span>`;
    publish({ theme: "mint-dark", mode: "dark", selection: { mode: "system", family: "mint" } });

    runReadoutScript();

    expect(document.getElementById("t")!.textContent).toBe("mint-dark");
    // The *selection*, not the resolved mode — the readout shows what the
    // visitor chose, which is still "system".
    expect(document.getElementById("m")!.textContent).toBe("system");
    expect(document.getElementById("f")!.textContent).toBe("mint");
    expect(document.getElementById("untouched")!.textContent).toBe("keep me");
  });

  it("patches var:<name> from the variable the bootstrap applied to <html>", () => {
    document.body.innerHTML = `<span id="v" data-tv-readout="var:--theme-color-primary">#059669</span>`;
    document.documentElement.style.setProperty("--theme-color-primary", "#10b981");
    publish({ theme: "mint-dark", selection: { mode: "dark", family: "mint" } });

    runReadoutScript();

    expect(document.getElementById("v")!.textContent).toBe("#10b981");
    document.documentElement.style.removeProperty("--theme-color-primary");
  });

  it("leaves the server text alone when the bootstrap did not publish (graceful absence)", () => {
    document.body.innerHTML = `<strong id="t" data-tv-readout="theme">mint-light</strong>`;

    // No payload: the script must return immediately, not throw and not blank
    // the readout.
    expect(() => runReadoutScript()).not.toThrow();
    expect(document.getElementById("t")!.textContent).toBe("mint-light");
  });

  it("prefers the state on <html> over a stale payload", () => {
    // The regression this pins: `<ClientRouter />` re-executes inline scripts in
    // the swapped body, but `window.__THEMVORA_BOOTSTRAP__` still holds the
    // *first* page's payload. Reading the payload would therefore stamp the
    // destination page's readouts with the selection the app was built with —
    // "mint-light" next to a document painted `cocoa-dark`. The navigation
    // script keeps `<html>` in step with the live selection, so that copy is the
    // one to trust.
    document.documentElement.setAttribute("data-theme", "cocoa-dark");
    document.documentElement.setAttribute("data-theme-selection-family", "cocoa");
    document.documentElement.setAttribute("data-theme-selection-mode", "system");
    document.body.innerHTML = `
      <strong id="t" data-tv-readout="theme">mint-light</strong>
      <strong id="f" data-tv-readout="family">mint</strong>`;
    publish({ theme: "mint-light", selection: { mode: "system", family: "mint" } });

    runReadoutScript();

    expect(document.getElementById("t")!.textContent).toBe("cocoa-dark");
    expect(document.getElementById("f")!.textContent).toBe("cocoa");
  });

  it("falls back to the payload when <html> carries no state", () => {
    // The self-managed path: a site that opts out of the bootstrap script emits
    // the readouts but never writes the attributes.
    document.body.innerHTML = `<strong id="t" data-tv-readout="theme">mint-light</strong>`;
    publish({ theme: "mint-dark", selection: { mode: "system", family: "mint" } });

    runReadoutScript();

    expect(document.getElementById("t")!.textContent).toBe("mint-dark");
  });

  it("writes into the existing text node instead of replacing it", () => {
    // The regression this pins: assigning `textContent` discards the node, and
    // a framework that still holds a reference to it — React's fiber for an
    // island readout — then throws `NotFoundError` when it unmounts, because
    // the node it is asked to remove is no longer a child. Updating
    // `nodeValue` keeps the node identity.
    document.body.innerHTML = `<strong id="t" data-tv-readout="theme">mint-light</strong>`;
    const el = document.getElementById("t")!;
    const original = el.firstChild;

    publish({ theme: "mint-dark", selection: { mode: "system", family: "mint" } });
    runReadoutScript();

    expect(el.textContent).toBe("mint-dark");
    expect(el.firstChild).toBe(original);
  });

  it("still fills an empty readout, which has no text node to write into", () => {
    document.body.innerHTML = `<strong id="t" data-tv-readout="theme"></strong>`;

    publish({ theme: "mint-dark", selection: { mode: "system", family: "mint" } });
    runReadoutScript();

    expect(document.getElementById("t")!.textContent).toBe("mint-dark");
  });

  it("is the same implementation the package re-exports", () => {
    expect(createReadoutScriptFromCore()).toBe(createThemeReadoutScript());
  });
});

describe("ThemeReadout encodes the contract for the caller", () => {
  function withRuntime<T>(fn: (runtime: ReturnType<typeof createThemeRuntime<ThemeDefinition>>) => T): T {
    const runtime = createThemeRuntime<ThemeDefinition>({
      themes,
      defaultTheme: "mint-light",
      initial: { theme: mintLight, selection: { family: "mint", mode: "light" } },
    });
    setGlobalRuntime(runtime);
    try {
      return fn(runtime);
    } finally {
      runtime.destroy();
    }
  }

  it("renders the marker attribute and the value", () => {
    withRuntime(() => {
      const html = renderToStaticMarkup(<ThemeReadout kind="theme" fallback="—" />);
      // `data-tv-readout` is a real DOM attribute, so it survives to the markup
      // the bootstrap patch script looks for.
      expect(html).toContain('data-tv-readout="theme"');
      expect(html).toContain("mint-light");
      // `suppressHydrationWarning` is deliberately NOT asserted here: it is a
      // React-only prop that never reaches the DOM, which is exactly why the
      // hydration test below — not a markup snapshot — is what proves the
      // contract.
    });
  });

  it("renders the fallback when a value is missing", () => {
    withRuntime(() => {
      const html = renderToStaticMarkup(<ThemeReadout kind="theme" fallback="—" />);
      expect(html).toContain("mint-light");
    });
  });

  /**
   * The `label` kind.
   *
   * The contract, the pre-paint bootstrap and the controller all resolve
   * `data-tv-readout="label"`, but this component did not — so a React app that
   * wanted the human label had to hand-write the attribute *and*
   * `suppressHydrationWarning`, which is the pair this component exists so that
   * nobody has to know. The obvious shortcut instead — rendering
   * `useTheme().theme.name` as text — is the one that fluctuates on load. A
   * component that wraps "the contract" has to cover it whole.
   */
  it("renders a theme's meta.label through the label kind", () => {
    const labelled = defineTheme({
      name: "labelled-light",
      meta: { family: "labelled", mode: "light", label: "Labelled Light" },
      tokens: { colors: { background: "#f8fafc" } },
    });
    const bare = defineTheme({
      name: "bare-light",
      meta: { family: "bare", mode: "light" },
      tokens: { colors: { background: "#ffffff" } },
    });

    const previous = getGlobalRuntime<ThemeDefinition>()!;

    for (const [theme, expected] of [
      [labelled, "Labelled Light"],
      // No `meta.label` → the caller's fallback, never the machine name.
      // Substituting one for the other would be a silent content change, and it
      // is the value the pre-paint script leaves untouched.
      [bare, "—"],
    ] as const) {
      const runtime = createThemeRuntime<ThemeDefinition>({
        themes: [theme],
        defaultTheme: theme.name,
        initial: {
          theme,
          selection: { family: theme.meta?.family ?? "bare", mode: "light" },
        },
      });
      setGlobalRuntime(runtime);
      try {
        const html = renderToStaticMarkup(<ThemeReadout kind="label" fallback="—" />);
        expect(html).toContain('data-tv-readout="label"');
        expect(html).toContain(expected);
      } finally {
        runtime.destroy();
      }
    }

    // Hand the global slot back. `destroy()` does not clear it, so without this
    // the next case in this file renders against a destroyed runtime and reads
    // *this* case's theme — a failure that looks like a `ThemeReadout` bug and
    // is really test leakage.
    setGlobalRuntime(previous);
  });

  /**
   * The heart of the contract: the bootstrap patches the node before hydration,
   * and hydration must leave that text in place.
   */
  it("does not let hydration overwrite a patched readout", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const container = document.createElement("div");
    document.body.appendChild(container);

    // 1. SSR: the server renders the fallback it cannot verify.
    container.innerHTML = renderToStaticMarkup(<ThemeReadout kind="theme" />);
    expect(container.textContent).toBe("mint-light");

    // 2. Bootstrap: the browser resolves the real value and patches the DOM.
    publish({ theme: "mint-dark", selection: { mode: "system", family: "mint" } });
    runReadoutScript();
    expect(container.textContent).toBe("mint-dark");

    // The runtime's lifetime is managed here rather than by `withRuntime`:
    // that helper destroys it in a `finally`, which for an async test would run
    // *before* the root is unmounted. A store notification arriving after the
    // root is gone schedules a commit against nodes React has already detached,
    // and the resulting `removeChild` throws asynchronously — an unhandled
    // error that only reproduces when the machine is loaded.
    const runtime = createThemeRuntime<ThemeDefinition>({
      themes,
      defaultTheme: "mint-light",
      initial: { theme: mintLight, selection: { family: "mint", mode: "light" } },
    });
    setGlobalRuntime(runtime);

    let root: Root | null = null;
    try {
      // 3. Hydrate. React's own render produces the server's fallback here,
      //    which is exactly the value that must NOT win. Both `act` calls are
      //    awaited so hydration and unmount are finished before the test ends.
      await act(async () => {
        root = hydrateRoot(container, <ThemeReadout kind="theme" />);
      });

      expect(container.textContent).toBe("mint-dark");
    } finally {
      await act(async () => {
        root?.unmount();
      });
      runtime.destroy();
      container.remove();
      errors.mockRestore();
    }
  });

});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the head script patches readouts as they are parsed", () => {
  it("patches an element that appears after the script ran", async () => {
    // The bootstrap runs in <head>, before the body exists, so it cannot query
    // once — it watches instead. A body-end script is too late: the browser is
    // free to paint the prerendered value while the parser is still working.
    const { createThemeBootstrapScript } = await import("@themvora/core");
    const script = createThemeBootstrapScript({
      themes,
      defaultTheme: "mint-light",
      initialMode: "dark",
    });

    document.body.innerHTML = "";
    // eslint-disable-next-line no-new-func
    new Function(script)();
    expect(document.documentElement.getAttribute("data-theme")).toBe("mint-dark");

    const el = document.createElement("span");
    el.setAttribute("data-tv-readout", "theme");
    el.textContent = "mint-light";
    document.body.appendChild(el);

    // MutationObserver callbacks are microtasks.
    await Promise.resolve();
    await Promise.resolve();
    expect(el.textContent).toBe("mint-dark");
    expect(el.getAttribute("data-tv-patched")).toBe("1");
  });
});

describe("the head script patches readouts as they are parsed", () => {
  it("patches an element that appears after the script ran", async () => {
    // The bootstrap runs in <head>, before the body exists, so it cannot query
    // once — it watches instead. A body-end script is too late: the browser is
    // free to paint the prerendered value while the parser is still working.
    const { createThemeBootstrapScript } = await import("@themvora/core");
    const script = createThemeBootstrapScript({
      themes,
      defaultTheme: "mint-light",
      initialMode: "dark",
    });

    document.body.innerHTML = "";
    // eslint-disable-next-line no-new-func
    new Function(script)();
    expect(document.documentElement.getAttribute("data-theme")).toBe("mint-dark");

    const el = document.createElement("span");
    el.setAttribute("data-tv-readout", "theme");
    el.textContent = "mint-light";
    document.body.appendChild(el);

    // MutationObserver callbacks are microtasks.
    await Promise.resolve();
    await Promise.resolve();
    expect(el.textContent).toBe("mint-dark");
    expect(el.getAttribute("data-tv-patched")).toBe("1");
  });
});
