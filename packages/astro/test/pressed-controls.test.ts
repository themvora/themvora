import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineTheme, type ThemeDefinition } from "@themvora/core";
import {
  __resetThemeController,
  createThemeController,
  type ThemeController,
} from "../src/controller";
import { readoutValue, syncPressedControls } from "../src/dom";

/**
 * The **runtime** half of the selection-control contract.
 *
 * The pre-paint bootstrap reconciles `[data-tv-pressed]` from `<head>` so the
 * first frame is already correct (covered in `@themvora/core`'s
 * `bootstrap-controls.test.ts`). This file covers what happens afterwards: the
 * bootstrap runs once and is then finished, so without a live writer the pressed
 * state would freeze at whatever the first paint showed and stop following the
 * visitor's clicks.
 *
 * That is not hypothetical — it is the state `examples/apps/astro` was in while
 * its page script did the `aria-pressed` bookkeeping by hand: the server
 * rendered `aria-pressed="false"` for every mode, the page script corrected it
 * once the runtime existed, and any reload put it back. Two writers, one
 * attribute, and a visible flip between them.
 */

const themes: readonly ThemeDefinition[] = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light", label: "Mint Light" },
    tokens: { colors: { background: "#f8fafc" } },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark", label: "Mint Dark" },
    tokens: { colors: { background: "#020617" } },
  }),
  defineTheme({
    name: "ocean-light",
    meta: { family: "ocean", mode: "light", label: "Ocean Light" },
    tokens: { colors: { background: "#f2f8ff" } },
  }),
  defineTheme({
    name: "ocean-dark",
    meta: { family: "ocean", mode: "dark", label: "Ocean Dark" },
    tokens: { colors: { background: "#04121f" } },
  }),
];

function markup(): void {
  document.body.innerHTML = `
    <span data-tv-readout="label">Mint Light</span>
    <button data-tv-pressed="mode" data-tv-value="light">light</button>
    <button data-tv-pressed="mode" data-tv-value="dark">dark</button>
    <button data-tv-pressed="mode" data-tv-value="system">system</button>
    <button data-tv-pressed="family" data-tv-value="mint">mint</button>
    <button data-tv-pressed="family" data-tv-value="ocean">ocean</button>
  `;
}

function pressed(kind: string, value: string): string | null {
  return (
    document
      .querySelector(`[data-tv-pressed="${kind}"][data-tv-value="${value}"]`)
      ?.getAttribute("aria-pressed") ?? null
  );
}

let controller: ThemeController<ThemeDefinition> | null = null;

beforeEach(() => {
  window.localStorage.clear();
  document.cookie = "theme-mode=; Max-Age=0; path=/";
  document.cookie = "theme-family=; Max-Age=0; path=/";
  document.cookie = "theme-fingerprint=; Max-Age=0; path=/";
  document.documentElement.className = "";
  __resetThemeController();
  markup();
});

afterEach(() => {
  controller?.destroy();
  controller = null;
  __resetThemeController();
  document.body.innerHTML = "";
});

describe("syncPressedControls", () => {
  it("writes aria-pressed from the live selection", () => {
    syncPressedControls("dark", "ocean");

    expect(pressed("mode", "dark")).toBe("true");
    expect(pressed("mode", "light")).toBe("false");
    expect(pressed("mode", "system")).toBe("false");
    expect(pressed("family", "ocean")).toBe("true");
    expect(pressed("family", "mint")).toBe("false");
  });

  it("compares against the selection, not the resolved mode", () => {
    // A `system` choice resolves to a concrete light/dark before it is painted.
    // Pressing the resolved mode would leave the button the visitor clicked
    // unpressed and light up a button they did not.
    syncPressedControls("system", "mint");

    expect(pressed("mode", "system")).toBe("true");
    expect(pressed("mode", "light")).toBe("false");
    expect(pressed("mode", "dark")).toBe("false");
  });

  it("does not assert `false` for an element that represents nothing", () => {
    document.body.innerHTML = `
      <button data-tv-pressed="mode">no value</button>
      <button data-tv-pressed="nonsense" data-tv-value="x">unknown kind</button>
    `;

    syncPressedControls("dark", "mint");

    // `"false"` claims the element is not the selected option. For an element
    // that represents no option at all that is a lie, and a screen reader reads
    // it out — so nothing is written.
    const buttons = document.querySelectorAll("button");
    expect(buttons[0]!.getAttribute("aria-pressed")).toBeNull();
    expect(buttons[1]!.getAttribute("aria-pressed")).toBeNull();
  });

  it("is a no-op on the server", () => {
    expect(() => syncPressedControls("dark", "mint", null)).not.toThrow();
  });
});

describe("readoutValue — label", () => {
  it("returns the theme's human label", () => {
    expect(readoutValue("label", themes[0]!, "light", "mint")).toBe(
      "Mint Light",
    );
  });

  it("returns null for a theme with no label rather than its machine name", () => {
    const bare = defineTheme({
      name: "bare-light",
      meta: { family: "bare", mode: "light" },
      tokens: { colors: { background: "#fff" } },
    });

    // `"theme"` is the machine name; `"label"` is what the caller rendered. A
    // readout that silently switched between them would be a content change
    // disguised as a fix.
    expect(readoutValue("label", bare, "light", "bare")).toBeNull();
    expect(readoutValue("theme", bare, "light", "bare")).toBe("bare-light");
  });
});

describe("controller keeps the pressed state live", () => {
  it("reconciles on creation, before any change", () => {
    controller = createThemeController<ThemeDefinition>({
      themes,
      defaultTheme: "mint-light",
      initialMode: "light",
      initialFamily: "mint",
    });

    // No change yet: the controller must correct the markup the server rendered
    // as soon as it exists, or a page whose bootstrap did not run shows the
    // server's guess until the first interaction.
    expect(pressed("mode", "light")).toBe("true");
    expect(pressed("family", "mint")).toBe("true");
  });

  it("follows a mode change", () => {
    controller = createThemeController<ThemeDefinition>({
      themes,
      defaultTheme: "mint-light",
      initialMode: "light",
      initialFamily: "mint",
    });

    controller.setMode("dark");

    expect(pressed("mode", "dark")).toBe("true");
    expect(pressed("mode", "light")).toBe("false");
  });

  it("follows a family change", () => {
    controller = createThemeController<ThemeDefinition>({
      themes,
      defaultTheme: "mint-light",
      initialMode: "light",
      initialFamily: "mint",
    });

    controller.setFamily("ocean");

    expect(pressed("family", "ocean")).toBe("true");
    expect(pressed("family", "mint")).toBe("false");
  });

  it("follows a change that resolves to the same theme", () => {
    controller = createThemeController<ThemeDefinition>({
      themes,
      defaultTheme: "mint-light",
      initialMode: "light",
      initialFamily: "mint",
    });

    // `setMode("system")` while the OS preference is light paints the theme
    // already applied, so no *store* change is emitted. A store-only
    // subscription would never fire and the pressed state would stay on
    // `light` — which is why the controller observes the selection too.
    controller.setMode("system");

    expect(pressed("mode", "system")).toBe("true");
    expect(pressed("mode", "light")).toBe("false");
  });
});
