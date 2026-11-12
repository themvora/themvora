// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The standalone pre-paint asset is the non-Vite half of the zero-flash
 * contract, so the properties worth testing are the ones a browser depends on:
 *
 * - it reads one JSON element and applies the persisted selection from it;
 * - a malformed or hostile declaration degrades to a complete fallback theme
 *   instead of leaving the document half-themed;
 * - it is idempotent, because the same asset can be included twice and the Vite
 *   plugin's inline script may have painted first;
 * - it publishes the configuration the runtime then adopts, so the first paint
 *   and the runtime cannot use different registries.
 */

const CONFIG_ID = "themvora-config";
const STORAGE_KEY = "theme-selection";

function reset(): void {
  document.getElementById(CONFIG_ID)?.remove();
  // The scrollbar pre-paint injects a stylesheet of its own; leaving it behind
  // makes the next test look like it hid the scrollbar without being asked.
  document.querySelectorAll("[data-themvora-scrollbar-hiding]").forEach((node) => node.remove());

  const root = document.documentElement;
  for (const attribute of Array.from(root.attributes)) {
    if (attribute.name.startsWith("data-theme")) root.removeAttribute(attribute.name);
  }
  root.className = "";
  root.removeAttribute("style");

  delete (window as unknown as Record<string, unknown>).__THEMVORA_BOOTSTRAP__;
  delete (window as unknown as Record<string, unknown>).__THEMVORA_CONFIG__;
  window.localStorage.clear();
}

function declare(config: unknown, options: { type?: string | null } = {}): void {
  const element = document.createElement("script");
  element.id = CONFIG_ID;
  const type = options.type === undefined ? "application/json" : options.type;
  if (type !== null) element.setAttribute("type", type);
  element.textContent = typeof config === "string" ? config : JSON.stringify(config);
  document.head.appendChild(element);
}

/** Import the asset fresh, so its module-level boot runs against this document. */
async function loadAsset() {
  vi.resetModules();
  return import("../src/prepaint-entry");
}

/**
 * jsdom has no `matchMedia`.
 *
 * `coarse` is separate from `dark` because the asset reads both: the color
 * scheme decides the theme, and the pointer type decides whether hiding the
 * native scrollbar would remove the only way to scroll.
 */
function stubMatchMedia(dark: boolean, coarse = false): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("pointer: coarse") ? coarse : query.includes("dark") ? dark : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

const stubPrefersDark = (dark: boolean) => stubMatchMedia(dark, false);

beforeEach(() => {
  reset();
  stubPrefersDark(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  reset();
});

describe("prepaint asset — configuration", () => {
  it("applies the built-in catalog when the element declares only a fallback", async () => {
    declare({ defaultTheme: "light", initialMode: "light" });

    await loadAsset();

    const root = document.documentElement;
    expect(root.getAttribute("data-theme")).toBe("light");
    expect(root.getAttribute("data-theme-mode")).toBe("light");
    expect(root.getAttribute("data-theme-ready")).toBe("true");
    // A complete palette, not a partial one: the fallback layer is what a page
    // paints when JavaScript never runs, so it must be whole.
    expect(root.style.getPropertyValue("--theme-color-background")).not.toBe("");
  });

  it("publishes the resolved configuration for the runtime", async () => {
    declare({ defaultTheme: "light", initialMode: "system" });

    await loadAsset();

    const published = (window as unknown as Record<string, any>).__THEMVORA_CONFIG__;
    expect(published).toBeTruthy();
    expect(published.initialMode).toBe("system");
    expect(Array.isArray(published.themes)).toBe(true);
    // The runtime reads this global, so the registry it registers is the one the
    // first paint used — not the built-in default.
    expect(published.themes.length).toBeGreaterThan(1);
  });

  it("restores the persisted selection", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: "dark", family: "plum" }),
    );
    declare({ defaultTheme: "light", initialMode: "light" });

    await loadAsset();

    const root = document.documentElement;
    expect(root.getAttribute("data-theme")).toBe("plum-dark");
    expect(root.getAttribute("data-theme-family")).toBe("plum");
    expect(root.getAttribute("data-theme-selection-mode")).toBe("dark");
    expect(root.classList.contains("dark")).toBe(true);
  });

  it("resolves system mode against the OS preference", async () => {
    stubPrefersDark(true);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: "system", family: "default" }));
    declare({ defaultTheme: "light", initialMode: "system" });

    await loadAsset();

    const root = document.documentElement;
    expect(root.getAttribute("data-theme-mode")).toBe("dark");
    // The *selection* stays "system": a control reading the resolved mode here
    // would show the wrong active option.
    expect(root.getAttribute("data-theme-selection-mode")).toBe("system");
  });

  it("uses a custom catalog from the element", async () => {
    declare({
      defaultTheme: "brand-light",
      initialMode: "light",
      themes: [
        {
          name: "brand-light",
          meta: { family: "brand", mode: "light" },
          tokens: { colors: { background: "#ffffff", foreground: "#111111" } },
        },
        {
          name: "brand-dark",
          meta: { family: "brand", mode: "dark" },
          tokens: { colors: { background: "#101014", foreground: "#f5f5f5" } },
        },
      ],
    });

    await loadAsset();

    expect(document.documentElement.getAttribute("data-theme")).toBe("brand-light");
    expect(document.documentElement.style.getPropertyValue("--theme-color-background")).toBe(
      "#ffffff",
    );
    const published = (window as unknown as Record<string, any>).__THEMVORA_CONFIG__;
    expect(published.themes).toHaveLength(2);
  });

  it("honours a custom storage key", async () => {
    window.localStorage.setItem("app-theme", JSON.stringify({ mode: "dark", family: "mint" }));
    declare({ defaultTheme: "light", initialMode: "light", storageKey: "app-theme" });

    await loadAsset();

    expect(document.documentElement.getAttribute("data-theme")).toBe("mint-dark");
  });

  it("ignores a custom storage key's neighbour", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: "dark", family: "plum" }));
    declare({ defaultTheme: "light", initialMode: "light", storageKey: "app-theme" });

    await loadAsset();

    // The default key must not be consulted when a different one is declared:
    // reading both would apply a selection the runtime will never write.
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});

describe("prepaint asset — untrusted input", () => {
  it("survives malformed JSON", async () => {
    declare("{ not json at all");

    await expect(loadAsset()).resolves.toBeTruthy();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("ignores an invalid mode instead of resolving an unknown theme", async () => {
    declare({ defaultTheme: "light", initialMode: "Dusk" });

    await loadAsset();

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme-selection-mode")).toBe("light");
  });

  it("drops theme definitions that cannot be serialized", async () => {
    declare({
      defaultTheme: "brand-light",
      themes: [
        { name: "brand-light" },
        { name: "", tokens: {} },
        "not-a-theme",
        {
          name: "brand-light",
          meta: { family: "brand", mode: "light" },
          tokens: { colors: { background: "#ffffff" } },
        },
      ],
    });

    await loadAsset();

    const published = (window as unknown as Record<string, any>).__THEMVORA_CONFIG__;
    expect(published.themes).toHaveLength(1);
    expect(document.documentElement.getAttribute("data-theme")).toBe("brand-light");
  });

  it("does not read a classic script that reuses the id", async () => {
    // The Vite plugin writes `window.__THEMVORA_CONFIG__ = …` into a script with
    // the same id. That is JavaScript, not JSON; parsing it would throw and the
    // asset would fall back to the built-in catalog while the runtime used the
    // plugin's.
    declare("window.__THEMVORA_CONFIG__={themes:[]};", { type: null });

    await loadAsset();

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("prefers the document's own element over a transported configuration", async () => {
    (window as unknown as Record<string, any>).__THEMVORA_CONFIG__ = {
      themes: [
        {
          name: "brand-dark",
          meta: { family: "brand", mode: "dark" },
          tokens: { colors: { background: "#101014" } },
        },
      ],
      defaultTheme: "brand-dark",
      initialMode: "dark",
    };
    declare({ defaultTheme: "light", initialMode: "light" });

    await loadAsset();

    // The element is the declaration written in *this* document, so it is the
    // one the reader of the HTML sees. A page that carries both is a mixed
    // setup; the documented answer is to keep only one, and this asset resolves
    // the ambiguity the same way every time rather than by load order.
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    // The transported value is not overwritten, so the runtime still sees the
    // integration's registry rather than a partial one from the element.
    const published = (window as unknown as Record<string, any>).__THEMVORA_CONFIG__;
    expect(published.defaultTheme).toBe("brand-dark");
  });
});

describe("prepaint asset — idempotence", () => {
  it("does not re-apply after the Vite plugin already painted", async () => {
    const root = document.documentElement;
    root.setAttribute("data-theme", "plum-dark");
    root.setAttribute("data-theme-mode", "dark");
    root.setAttribute("data-theme-selection-mode", "dark");
    root.setAttribute("data-theme-selection-family", "plum");
    root.setAttribute("data-theme-ready", "true");
    (window as unknown as Record<string, any>).__THEMVORA_BOOTSTRAP__ = {
      theme: "plum-dark",
      mode: "dark",
      family: "plum",
      label: null,
      selection: { mode: "dark", family: "plum" },
    };
    // A selection that disagrees with what is already painted: a second apply
    // would repaint the page, which is the flash this guard prevents.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: "light", family: "mint" }));

    const { applyPrepaint } = await loadAsset();
    const applied = applyPrepaint();

    expect(applied?.theme).toBe("plum-dark");
    expect(root.getAttribute("data-theme")).toBe("plum-dark");
    expect(root.getAttribute("data-theme-mode")).toBe("dark");
  });

  it("is a no-op on a second call", async () => {
    declare({ defaultTheme: "light", initialMode: "light" });
    const { applyPrepaint } = await loadAsset();

    const first = applyPrepaint();
    const second = applyPrepaint();

    expect(second?.theme).toBe(first?.theme);
    expect(document.querySelectorAll("style")).toHaveLength(0);
  });
});

describe("prepaint asset — runtime options in the element", () => {
  it("transports `transition` to the runtime", async () => {
    declare({
      defaultTheme: "light",
      initialMode: "light",
      transition: { enabled: false },
    });

    await loadAsset();

    const published = (window as unknown as Record<string, any>).__THEMVORA_CONFIG__;
    // The runtime reads this global, so an option declared in the element is
    // honoured without a second declaration in application code — the same
    // contract the Vite plugin's transported configuration has.
    expect(published.transition).toEqual({ enabled: false });
  });

  it("transports a transition object verbatim", async () => {
    declare({
      defaultTheme: "light",
      transition: { enabled: true, duration: 900, easing: "ease-out" },
    });

    await loadAsset();

    const published = (window as unknown as Record<string, any>).__THEMVORA_CONFIG__;
    expect(published.transition).toEqual({
      enabled: true,
      duration: 900,
      easing: "ease-out",
    });
  });

  it("ignores a transition value that is neither boolean nor object", async () => {
    declare({ defaultTheme: "light", transition: "off" });

    await loadAsset();

    const published = (window as unknown as Record<string, any>).__THEMVORA_CONFIG__;
    // Dropped rather than forwarded: a string would reach the runtime as an
    // unknown shape and be interpreted as "enabled with defaults".
    expect(published.transition).toBeUndefined();
  });

  it("hides the native scrollbar before the first paint", async () => {
    declare({ defaultTheme: "light", scrollbar: true });

    await loadAsset();

    expect(document.documentElement.classList.contains("tv-scrollbar")).toBe(true);
    const style = document.getElementById("tv-scrollbar-style");
    expect(style).not.toBeNull();
    expect(style?.getAttribute("data-themvora-scrollbar-hiding")).toBe("");
  });

  it("does not hide the scrollbar on a coarse pointer unless asked", async () => {
    stubMatchMedia(false, true);
    declare({ defaultTheme: "light", scrollbar: true });

    await loadAsset();

    expect(document.documentElement.classList.contains("tv-scrollbar")).toBe(false);
    expect(document.getElementById("tv-scrollbar-style")).toBeNull();
  });

  it("hides it on a coarse pointer when `touch` is set", async () => {
    stubMatchMedia(false, true);
    declare({ defaultTheme: "light", scrollbar: { touch: true } });

    await loadAsset();

    expect(document.documentElement.classList.contains("tv-scrollbar")).toBe(true);
  });

  it("does nothing when `scrollbar` is false or absent", async () => {
    declare({ defaultTheme: "light", scrollbar: false });

    await loadAsset();

    expect(document.documentElement.classList.contains("tv-scrollbar")).toBe(false);
    expect(document.getElementById("tv-scrollbar-style")).toBeNull();
  });

  it("adds one hiding stylesheet across repeated applies", async () => {
    declare({ defaultTheme: "light", scrollbar: true });
    const { applyPrepaint } = await loadAsset();

    applyPrepaint();
    applyPrepaint();

    expect(document.querySelectorAll("[data-themvora-scrollbar-hiding]")).toHaveLength(1);
  });
});
