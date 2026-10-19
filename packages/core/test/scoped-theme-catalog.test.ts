// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createScopedThemeBinding } from "../src/adapters/scoped-theme";
import { defineTheme } from "../src/index";
import type { ThemeDefinition } from "../src/index";

/**
 * A scoped binding must resolve against the *live* catalog.
 *
 * The runtime keeps one theme array and replaces its contents in place on
 * `configure()`. A binding that copied that array at creation kept rendering a
 * theme the runtime had already dropped — the defect this file pins.
 */

const theme = (name: string, family: string, mode: "light" | "dark", bg: string) =>
  defineTheme({
    name,
    meta: { family, mode },
    tokens: { colors: { background: bg, foreground: "#000000" } },
  }) as ThemeDefinition;

const aLight = theme("a-light", "a", "light", "#aa0000");
const bLight = theme("b-light", "b", "light", "#00bb00");

function mount() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

/** Mirrors what `runtime.configure({ themes })` does to its live list. */
function replaceCatalog(live: ThemeDefinition[], next: ThemeDefinition[]) {
  live.length = 0;
  live.push(...next);
}

describe("createScopedThemeBinding — live catalog", () => {
  it("re-resolves a still-present theme after the catalog is replaced", () => {
    const live = [aLight, bLight];
    const el = mount();
    const binding = createScopedThemeBinding(live, el, "b-light");

    expect(String(binding.getTheme().name)).toBe("b-light");
    expect(el.style.getPropertyValue("--theme-color-background")).toBe("#00bb00");

    // Same name, new definition — a redeploy or a regenerated theme.
    const bLight2 = theme("b-light", "b", "light", "#00cc00");
    replaceCatalog(live, [aLight, bLight2]);
    binding.refresh();

    expect(el.style.getPropertyValue("--theme-color-background")).toBe("#00cc00");
    binding.destroy();
  });

  it("falls back to the catalog's first theme when the scoped theme is removed", () => {
    const live = [aLight, bLight];
    const el = mount();
    const binding = createScopedThemeBinding(live, el, "b-light");
    expect(String(binding.getTheme().name)).toBe("b-light");

    replaceCatalog(live, [aLight]);
    binding.refresh();

    expect(String(binding.getTheme().name)).toBe("a-light");
    expect(el.getAttribute("data-theme")).toBe("a-light");
    expect(el.style.getPropertyValue("--theme-color-background")).toBe("#aa0000");
    binding.destroy();
  });

  it("picks up a theme added after the binding was created", () => {
    const live = [aLight];
    const el = mount();
    const binding = createScopedThemeBinding(live, el, "c-light");
    // Not resolvable yet: the documented fallback is the catalog's first theme.
    expect(String(binding.getTheme().name)).toBe("a-light");

    const cLight = theme("c-light", "c", "light", "#0000cc");
    replaceCatalog(live, [aLight, cLight]);
    binding.refresh();

    expect(String(binding.getTheme().name)).toBe("c-light");
    binding.destroy();
  });

  it("keeps local themes ahead of the runtime catalog across a refresh", () => {
    const live = [aLight];
    const local = [theme("local-light", "local", "light", "#123456")];
    const el = mount();
    const binding = createScopedThemeBinding(live, el, "local-light", {
      localThemes: local,
    });

    expect(el.style.getPropertyValue("--theme-color-background")).toBe("#123456");

    const bLight2 = theme("b-light", "b", "light", "#00cc00");
    replaceCatalog(live, [aLight, bLight2]);
    binding.refresh();

    expect(String(binding.getTheme().name)).toBe("local-light");
    expect(el.style.getPropertyValue("--theme-color-background")).toBe("#123456");
    binding.destroy();
  });
});
