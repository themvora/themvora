// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { defineTheme } from "../src/model";
import {
  buildBootstrapPlan,
  createThemeBootstrapScript,
} from "../src/bootstrap";
import {
  applyThemeBootstrap,
  createThemePrePaintCss,
} from "../src/prepaint";

const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light", label: "Mint" },
    tokens: {
      colors: { background: "#ffffff", foreground: "#111111" },
    },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark", label: "Mint Dark" },
    tokens: {
      colors: { background: "#101014", foreground: "#f5f5f5" },
    },
  }),
  defineTheme({
    name: "ocean-light",
    meta: { family: "ocean", mode: "light" },
    tokens: {
      colors: { background: "#f2f8ff", foreground: "#102030" },
    },
  }),
  defineTheme({
    name: "ocean-dark",
    meta: { family: "ocean", mode: "dark" },
    tokens: {
      colors: { background: "#04121f", foreground: "#e6f4ff" },
    },
  }),
];

function resetRoot() {
  const root = document.documentElement;
  root.removeAttribute("style");
  for (const name of [
    "data-theme",
    "data-theme-mode",
    "data-theme-family",
    "data-theme-selection-mode",
    "data-theme-selection-family",
    "data-theme-ready",
  ]) {
    root.removeAttribute(name);
  }
  root.classList.remove("dark");
  delete (window as unknown as { __THEMVORA_BOOTSTRAP__?: unknown })
    .__THEMVORA_BOOTSTRAP__;
  localStorage.clear();
}

function darkOS(matches: boolean) {
  (window as unknown as { matchMedia: (q: string) => { matches: boolean } }).matchMedia =
    () => ({ matches });
}

function capture() {
  const root = document.documentElement;
  const variables: Record<string, string> = {};
  for (let i = 0; i < root.style.length; i++) {
    const name = root.style.item(i);
    if (name.startsWith("--")) variables[name] = root.style.getPropertyValue(name);
  }
  return {
    dark: root.classList.contains("dark"),
    colorScheme: (root.style as CSSStyleDeclaration & { colorScheme?: string })
      .colorScheme,
    attributes: {
      theme: root.getAttribute("data-theme"),
      mode: root.getAttribute("data-theme-mode"),
      family: root.getAttribute("data-theme-family"),
      selectionMode: root.getAttribute("data-theme-selection-mode"),
      selectionFamily: root.getAttribute("data-theme-selection-family"),
      ready: root.getAttribute("data-theme-ready"),
    },
    variables,
    payload: (window as unknown as { __THEMVORA_BOOTSTRAP__?: unknown })
      .__THEMVORA_BOOTSTRAP__,
  };
}

beforeEach(() => {
  resetRoot();
  darkOS(false);
});

describe("createThemePrePaintCss", () => {
  it("provides a readable light default and a system dark fallback", () => {
    const css = createThemePrePaintCss({
      themes,
      defaultTheme: "mint-light",
      initialMode: "system",
    });

    expect(css).toContain(":root {");
    expect(css).toContain("--theme-color-background: #ffffff;");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain(":root:not([data-theme])");
    expect(css).toContain("--theme-color-background: #101014;");
  });

  it("emits a selector for every declared theme", () => {
    const css = createThemePrePaintCss({ themes });

    for (const theme of themes) {
      expect(css).toContain(`:root[data-theme="${theme.name}"]`);
      // The generic half pre-styles a scoped element that is still plain HTML.
      expect(css).toContain(`], [data-theme="${theme.name}"]`);
    }
  });

  it("resets token groups a theme does not define instead of inheriting the default", () => {
    // A theme's `code` group is optional — the presets ship none. The `:root`
    // block carries the *default* theme's full set, so without an explicit reset
    // a theme without `code` kept the default's syntax palette: every preset
    // rendered the default theme's light code surface on a dark page.
    const withCode = defineTheme({
      name: "code-light",
      meta: { family: "code", mode: "light" },
      tokens: {
        colors: { background: "#ffffff", foreground: "#111111" },
        code: { background: "#f6f7fc", foreground: "#0f172a", keyword: "#7c3aed" },
      },
    });
    const withoutCode = defineTheme({
      name: "plain-light",
      meta: { family: "plain", mode: "light" },
      tokens: {
        colors: { background: "#fdf2f8", foreground: "#1a0b12" },
      },
    });

    const css = createThemePrePaintCss({
      themes: [withCode, withoutCode],
      defaultTheme: "code-light",
    });

    const blockFor = (name: string) => {
      const start = css.indexOf(`:root[data-theme="${name}"]`);
      expect(start).toBeGreaterThan(-1);
      const open = css.indexOf("{", start);
      const close = css.indexOf("}", open);
      return css.slice(open, close);
    };

    // The default's own values stay in `:root` and in its own block.
    expect(blockFor("code-light")).toContain("--theme-code-background: #f6f7fc;");
    expect(blockFor("code-light")).not.toContain("--theme-code-background: initial;");

    // The theme that does not define `code` resets it, so the consuming
    // `var(--theme-code-background, <mix>)` resolves its fallback.
    expect(blockFor("plain-light")).toContain("--theme-code-background: initial;");
    expect(blockFor("plain-light")).toContain("--theme-code-keyword: initial;");
    // Its own tokens are untouched.
    expect(blockFor("plain-light")).toContain("--theme-color-background: #fdf2f8;");
  });

  it("pins an explicit dark fallback without a system media block", () => {
    const css = createThemePrePaintCss({
      themes,
      defaultTheme: "ocean-dark",
    });

    expect(css).toContain(":root {");
    expect(css).toContain("--theme-color-background: #04121f;");
    expect(css).not.toContain("@media (prefers-color-scheme: dark)");
  });

  it("cannot terminate the style element that carries it", () => {
    const hostile = [
      defineTheme({
        name: "hostile</style><script>bad()</script>",
        meta: { family: "hostile", mode: "light" },
        tokens: { colors: { background: "</style>" } },
      }),
    ];

    const css = createThemePrePaintCss({ themes: hostile });
    expect(css).not.toContain("</style");
    expect(css).toContain("<\\/style");
  });
});

describe("applyThemeBootstrap", () => {
  it("restores a persisted non-default theme", () => {
    localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "dark", family: "ocean" }),
    );

    const plan = buildBootstrapPlan(themes, {
      defaultTheme: "mint-light",
      initialMode: "system",
    });
    const applied = applyThemeBootstrap(plan);

    expect(applied?.theme).toBe("ocean-dark");
    expect(capture()).toMatchObject({
      dark: true,
      colorScheme: "dark",
      attributes: {
        theme: "ocean-dark",
        mode: "dark",
        family: "ocean",
        selectionMode: "dark",
        selectionFamily: "ocean",
        ready: "true",
      },
    });
    expect(
      document.documentElement.style.getPropertyValue("--theme-color-background"),
    ).toBe("#04121f");
  });

  it("resolves `system` against prefers-color-scheme", () => {
    darkOS(true);
    localStorage.setItem("theme-selection", JSON.stringify({ mode: "system" }));

    const plan = buildBootstrapPlan(themes, {
      defaultTheme: "mint-light",
      initialMode: "system",
    });
    const applied = applyThemeBootstrap(plan);

    expect(applied?.mode).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "mint-dark",
    );
  });

  it("falls back safely when storage is unavailable", () => {
    const plan = buildBootstrapPlan(themes, { defaultTheme: "mint-light" });
    const stored = {
      getItem() {
        throw new Error("blocked");
      },
    } as unknown as Storage;

    const applied = applyThemeBootstrap(plan, { storage: stored });

    expect(applied?.theme).toBe("mint-light");
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "mint-light",
    );
  });

  it("is idempotent: a second copy does not repaint", () => {
    localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "dark", family: "ocean" }),
    );
    const plan = buildBootstrapPlan(themes, { defaultTheme: "mint-light" });
    applyThemeBootstrap(plan);

    localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "light", family: "mint" }),
    );
    const second = applyThemeBootstrap(plan);

    expect(second?.theme).toBe("ocean-dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "ocean-dark",
    );
  });

  it("produces the same DOM state as the generated inline script", () => {
    localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "system", family: "ocean" }),
    );
    darkOS(true);

    const options = {
      themes,
      defaultTheme: "mint-light",
      initialMode: "system" as const,
    };

    // Inline script first.
    new Function(createThemeBootstrapScript(options))();
    const scripted = capture();

    resetRoot();
    darkOS(true);
    localStorage.setItem(
      "theme-selection",
      JSON.stringify({ mode: "system", family: "ocean" }),
    );

    applyThemeBootstrap(buildBootstrapPlan(themes, options));
    const applied = capture();

    expect(applied.dark).toBe(scripted.dark);
    expect(applied.attributes).toEqual(scripted.attributes);
    expect(applied.variables).toEqual(scripted.variables);
    expect(applied.payload).toEqual(scripted.payload);
  });
});
