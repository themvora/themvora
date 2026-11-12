// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { defineTheme, resolveInitialTheme } from "@themvora/core";
import { createThemeDocument } from "../src/document";
import { useTheme, useThemeRuntime } from "../src/hooks";

const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light" },
    tokens: { colors: { background: "#ffffff", foreground: "#101014" } },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark" },
    tokens: { colors: { background: "#101014", foreground: "#ffffff" } },
  }),
  defineTheme({
    name: "ocean-light",
    meta: { family: "ocean", mode: "light" },
    tokens: { colors: { background: "#f2f8ff" } },
  }),
  defineTheme({
    name: "ocean-dark",
    meta: { family: "ocean", mode: "dark" },
    tokens: { colors: { background: "#04121f" } },
  }),
];

interface ScriptResult {
  attributes: Record<string, string>;
  classes: string[];
}

function runScript(
  source: string,
  { cookie = "", systemDark = false }: { cookie?: string; systemDark?: boolean } = {},
): ScriptResult {
  const classes = new Set<string>();
  const attributes: Record<string, string> = {};
  const style = {
    colorScheme: "",
    setProperty() {},
    removeProperty() {},
  };

  const scope = globalThis as { document?: unknown; window?: unknown };
  const previousDocument = scope.document;
  const previousWindow = scope.window;

  scope.document = {
    documentElement: {
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
        contains: (name: string) => classes.has(name),
      },
      style,
      setAttribute(name: string, value: string) {
        attributes[name] = String(value);
      },
    },
    cookie,
    querySelectorAll: () => [],
  };
  scope.window = {
    matchMedia: (query: string) => ({
      matches: query.includes("dark") ? systemDark : !systemDark,
    }),
  };

  try {
    (0, eval)(source);
  } finally {
    scope.document = previousDocument;
    scope.window = previousWindow;
  }

  return { attributes, classes: [...classes] };
}

function htmlAttributes(markup: string): Record<string, string> {
  const tag = markup.match(/<html\b([^>]*)>/)?.[1] ?? "";
  const out: Record<string, string> = {};
  for (const match of tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
    out[match[1]!] = match[2]!;
  }
  return out;
}

function request(cookie = ""): Request {
  return new Request("https://example.test/", {
    headers: cookie ? { cookie } : {},
  });
}

let root: Root | null = null;
let container: HTMLElement | null = null;

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  container?.remove();
  container = null;
  localStorage.clear();
  for (const name of ["theme-name", "theme-family", "theme-mode", "theme-fingerprint"]) {
    document.cookie = `${name}=; path=/; max-age=0`;
  }
  for (const attribute of [
    "data-theme",
    "data-theme-ready",
    "data-theme-mode",
    "data-theme-family",
    "data-theme-selection-mode",
    "data-theme-selection-family",
  ]) {
    document.documentElement.removeAttribute(attribute);
  }
  document.documentElement.classList.remove("dark");
});

describe("createThemeDocument — one configuration, every layer", () => {
  it("drives the bootstrap, the <html> shell and the runtime from one object", () => {
    const theming = createThemeDocument({
      themes,
      defaultTheme: "mint-light",
      mode: "system",
      scrollbar: true,
    });

    const markup = renderToStaticMarkup(
      <theming.Document
        head={[
          <style key="head" data-framework-head="true">{"/* framework */"}</style>,
        ]}
        afterContent={<script data-framework-tail="true" />}
      >
        <main>app</main>
      </theming.Document>,
    );

    const script =
      markup.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? "";
    const executed = runScript(script);
    const attributes = htmlAttributes(markup);

    // The script and the shell publish the same resolution.
    for (const name of [
      "data-theme",
      "data-theme-mode",
      "data-theme-family",
      "data-theme-selection-mode",
      "data-theme-selection-family",
      "data-theme-ready",
    ]) {
      expect(attributes[name]).toBe(executed.attributes[name]);
    }

    // The configuration's scrollbar option reaches both halves.
    expect(attributes.class).toContain("tv-scrollbar");
    expect(markup).toContain('data-themvora-pre-paint="scrollbar"');
    expect(executed.classes).not.toContain("tv-scrollbar");

    // The framework's own document slots are preserved.
    expect(markup).toContain('data-framework-head="true"');
    expect(markup).toContain('data-framework-tail="true"');
    expect(markup).toContain("<main>app</main>");
  });

  it("keeps the head bootstrap ahead of framework head content", () => {
    const theming = createThemeDocument({ themes, defaultTheme: "mint-light" });

    const markup = renderToStaticMarkup(
      <theming.Document
        head={[
          <style key="head" data-framework-head="true">{"/* x */"}</style>,
        ]}
      >
        <p>content</p>
      </theming.Document>,
    );

    expect(markup.indexOf("<script")).toBeLessThan(
      markup.indexOf('data-framework-head="true"'),
    );
    expect(markup.indexOf("<script")).toBeLessThan(markup.indexOf("</head>"));
  });

  it("emits exactly one head script and one document element", () => {
    const theming = createThemeDocument({
      themes,
      defaultTheme: "mint-light",
      scrollbar: true,
    });

    const markup = renderToStaticMarkup(
      <theming.Document head={[<meta key="meta" />]} afterContent={<script />}>
        <p>content</p>
      </theming.Document>,
    );

    expect(markup.match(/<html\b/g)).toHaveLength(1);
    expect(markup.match(/<head\b/g)).toHaveLength(1);
    expect(markup.match(/<body\b/g)).toHaveLength(1);
    // Two scripts: the blocking bootstrap and the framework's own tail script.
    expect(markup.match(/<script\b/g)).toHaveLength(2);
    expect(markup.match(/id="themvora-bootstrap"/g)).toHaveLength(1);
    expect(markup.match(/data-themvora-pre-paint="scrollbar"/g)).toHaveLength(1);
  });

  it("rejects a layout element in the head with a clear error", () => {
    const theming = createThemeDocument({ themes, defaultTheme: "mint-light" });

    expect(() =>
      renderToStaticMarkup(
        <theming.Document head={[<div key="bad">Hello</div>]}>
          <p>content</p>
        </theming.Document>,
      ),
    ).toThrow(/<div> is not valid inside <head>/);
  });

  it("rejects a fragment containing a layout element", () => {
    const theming = createThemeDocument({ themes, defaultTheme: "mint-light" });

    expect(() =>
      renderToStaticMarkup(
        <theming.Document
          head={[
            <>
              <div>Hello</div>
            </>,
          ]}
        >
          <p>content</p>
        </theming.Document>,
      ),
    ).toThrow(/<div> is not valid inside <head>/);
  });

  it("marks the head bootstrap so the runtime does not append a second one", () => {
    const theming = createThemeDocument({
      themes,
      defaultTheme: "mint-light",
    });

    const markup = renderToStaticMarkup(
      <theming.Document>
        <p>content</p>
      </theming.Document>,
    );
    const bootstrap = markup.match(
      /<script id="themvora-bootstrap"[^>]*>[\s\S]*?<\/script>/,
    )?.[0];
    expect(bootstrap).toBeTruthy();

    document.head.innerHTML = bootstrap!;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root!.render(
        <theming.Provider>
          <p>content</p>
        </theming.Provider>,
      );
    });

    expect(
      document.querySelectorAll("script#themvora-bootstrap"),
    ).toHaveLength(1);
    document.head.innerHTML = "";
  });

  it("changes every layer when the configuration changes", () => {
    const light = createThemeDocument({
      themes,
      defaultTheme: "mint-light",
      mode: "light",
    });
    const dark = createThemeDocument({
      themes,
      defaultTheme: "ocean-dark",
      mode: "dark",
      scrollbar: true,
    });

    const lightMarkup = renderToStaticMarkup(
      <light.Document>
        <p />
      </light.Document>,
    );
    const darkMarkup = renderToStaticMarkup(
      <dark.Document>
        <p />
      </dark.Document>,
    );

    expect(htmlAttributes(lightMarkup)["data-theme"]).toBe("mint-light");
    expect(htmlAttributes(darkMarkup)["data-theme"]).toBe("ocean-dark");
    expect(htmlAttributes(lightMarkup).class).toBeUndefined();
    expect(htmlAttributes(darkMarkup).class).toContain("tv-scrollbar");
    expect(lightMarkup).toContain("--theme-color-background:#ffffff");
    expect(darkMarkup).toContain("--theme-color-background:#04121f");
  });

  it("does not hand arbitrary <html> props control of the theme attributes", () => {
    const theming = createThemeDocument({
      themes,
      defaultTheme: "mint-light",
      className: "app",
      style: { colorScheme: "light" },
    });

    const markup = renderToStaticMarkup(
      <theming.Document
        htmlProps={{
          lang: "fr",
          className: "page",
          style: { margin: 0 },
          "data-theme": "not-a-theme",
        } as React.HTMLAttributes<HTMLHtmlElement>}
        bodyProps={{ className: "body", style: { padding: 0 } }}
      >
        <p />
      </theming.Document>,
    );

    const attributes = htmlAttributes(markup);
    expect(attributes.lang).toBe("fr");
    expect(attributes["data-theme"]).toBe("mint-light");
    expect(attributes.class).toBe("app page");
    expect(markup).toContain("margin:0");
    expect(markup).toContain('class="body"');
    expect(markup).toContain("padding:0");
  });
});

function TransitionProbe() {
  const runtime = useThemeRuntime();
  return (
    <span
      data-testid="transition"
      data-preset={runtime.transition?.preset ?? "none"}
      data-duration={String(runtime.transition?.duration ?? "")}
    />
  );
}

describe("createThemeDocument — runtime options", () => {
  it("accepts the provider's initialMode/initialFamily names", () => {
    const theming = createThemeDocument({
      themes,
      defaultTheme: "mint-light",
      initialMode: "dark",
      initialFamily: "ocean",
    });

    const markup = renderToStaticMarkup(
      <theming.Document>
        <p />
      </theming.Document>,
    );

    expect(htmlAttributes(markup)["data-theme"]).toBe("ocean-dark");
  });

  it("forwards the transition configuration to the runtime", () => {
    const theming = createThemeDocument({
      themes,
      defaultTheme: "mint-light",
      transition: { enabled: true, preset: "subtle", duration: 180 },
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root!.render(
        <theming.Provider>
          <TransitionProbe />
        </theming.Provider>,
      );
    });

    const probe = container.querySelector('[data-testid="transition"]');
    expect(probe?.getAttribute("data-preset")).toBe("subtle");
    expect(probe?.getAttribute("data-duration")).toBe("180");
  });
});

describe("createThemeDocument — request state", () => {
  it("resolves each request against its own cookies", async () => {
    const theming = createThemeDocument({
      themes,
      defaultTheme: "mint-light",
      mode: "system",
    });

    const [dark, light, firstVisit] = await Promise.all([
      theming.resolveInitial(request("theme-mode=dark; theme-family=ocean")),
      theming.resolveInitial(request("theme-mode=light; theme-family=mint")),
      theming.resolveInitial(request()),
    ]);

    expect(dark.theme.name).toBe("ocean-dark");
    expect(dark.selection).toEqual({ mode: "dark", family: "ocean" });
    expect(light.theme.name).toBe("mint-light");
    expect(firstVisit.theme.name).toBe("mint-light");
    expect(firstVisit.selection.mode).toBe("system");
  });

  it("falls back to the frozen static resolution when the loader is unavailable", () => {
    const theming = createThemeDocument({
      themes,
      defaultTheme: "ocean-dark",
      mode: "dark",
      scrollbar: true,
    });

    expect(theming.fallback).toEqual(
      resolveInitialTheme({ themes, defaultTheme: "ocean-dark", mode: "dark" }),
    );

    const markup = renderToStaticMarkup(
      <theming.Document initial={null}>
        <p>error path</p>
      </theming.Document>,
    );

    expect(htmlAttributes(markup)["data-theme"]).toBe("ocean-dark");
    expect(markup).toContain("error path");
  });

  it("freezes the registry so later caller mutation cannot change the document", async () => {
    const registry = [...themes];
    const theming = createThemeDocument({
      themes: registry,
      defaultTheme: "mint-light",
      mode: "light",
    });

    registry.length = 0;

    expect(theming.config.themes).toHaveLength(themes.length);
    expect((await theming.resolveInitial(request())).theme.name).toBe("mint-light");
    expect(Object.isFrozen(theming.config)).toBe(true);
  });

  it("rejects an empty registry at construction instead of failing per request", () => {
    expect(() => createThemeDocument({ themes: [] })).toThrow(
      /requires at least one theme/,
    );
  });
});

describe("createThemeDocument — runtime provider", () => {
  it("hands the request-resolved state to the provider", () => {
    const theming = createThemeDocument({
      themes,
      defaultTheme: "mint-light",
      mode: "system",
    });

    function Probe() {
      const { theme, mode } = useTheme();
      return (
        <span data-testid="state">
          {theme.name}:{mode}
        </span>
      );
    }

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root!.render(
        <theming.Provider
          initial={{ theme: themes[3]!, selection: { family: "ocean", mode: "dark" } }}
        >
          <Probe />
        </theming.Provider>,
      );
    });

    expect(container.querySelector("[data-testid='state']")?.textContent).toBe(
      "ocean-dark:dark",
    );
  });
});
