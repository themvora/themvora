import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { defineTheme } from "@themvora/core";
import { themvora } from "../src/integration";
import { createNavigationScript } from "../src/navigation-script";

const themes = [
  defineTheme({
    name: "mint-light",
    meta: { family: "mint", mode: "light" },
    tokens: { colors: { background: "#ffffff" } },
  }),
  defineTheme({
    name: "mint-dark",
    meta: { family: "mint", mode: "dark" },
    tokens: { colors: { background: "#101014" } },
  }),
];

interface SetupOptions {
  injectScript(stage: string, content: string): void;
  /**
   * Astro always passes this to `astro:config:setup`. The integration uses it to
   * register the pre-paint CSS Vite plugin, so a harness without it fails with
   * `updateConfig is not a function` before any assertion runs. These cases are
   * about the injected scripts, so the call is recorded and not acted on.
   */
  updateConfig(patch: { vite?: { plugins?: unknown[] } }): void;
  config?: { root: URL | string };
}

/**
 * Runs the integration's `astro:config:setup` hook and collects injections.
 *
 * The hook is async — it awaits config discovery — so this must be awaited too;
 * collecting synchronously yields an empty array.
 *
 * `root` points at this package, which has no `theme.config.ts`. Discovery
 * therefore short-circuits on the file check and the options passed here are
 * the effective ones, which is what these cases are about. Without a root the
 * loader would search `process.cwd()`, and the result would depend on where the
 * suite was started from.
 */
async function inject(options: Parameters<typeof themvora>[0]) {
  const injected: { stage: string; content: string }[] = [];

  const hook = themvora(options).hooks["astro:config:setup"] as unknown as (
    setup: SetupOptions,
  ) => void | Promise<void>;

  await hook({
    config: { root: pathToFileURL(import.meta.dirname) },
    injectScript(stage, content) {
      injected.push({ stage, content });
    },
    updateConfig() {
      /* the pre-paint CSS plugin is not under test here */
    },
  });

  return injected;
}

/** Only the pre-paint scrollbar script from core matches coarse pointers. */
const COARSE_POINTER = "pointer: coarse";

describe("themvora integration — injected scripts", () => {
  it("injects the pre-paint bootstrap and the navigation script", async () => {
    const injected = await inject({
      themes,
      defaultTheme: "mint-light",
      mode: "system",
    });

    expect(injected).toHaveLength(2);
    expect(injected.every((entry) => entry.stage === "head-inline")).toBe(true);
    expect(injected[0]!.content).toContain("fp!==");
    expect(injected[1]!.content).toContain("astro:before-swap");
    expect(injected.some((entry) => entry.content.includes(COARSE_POINTER))).toBe(
      false,
    );
  });

  it("injects the scrollbar pre-paint script when scrollbar is enabled", async () => {
    const injected = await inject({ themes, scrollbar: true });
    const scrollbar = injected.find((entry) =>
      entry.content.includes(COARSE_POINTER),
    );

    expect(injected).toHaveLength(3);
    expect(scrollbar).toBeDefined();
    // Default: coarse-pointer devices keep their native scrollbars.
    expect(scrollbar!.content).toContain("!false");
  });

  it("forces the scrollbar bootstrap on coarse pointers when touch is set", async () => {
    const injected = await inject({ themes, scrollbar: { touch: true } });
    const scrollbar = injected.find((entry) =>
      entry.content.includes(COARSE_POINTER),
    );

    expect(scrollbar!.content).toContain("!true");
  });

  it("can opt out of the navigation script", async () => {
    const injected = await inject({ themes, navigation: false });

    expect(injected).toHaveLength(1);
    expect(injected[0]!.content).not.toContain("astro:before-swap");
  });

  it("still injects the navigation script when the bootstrap is self-managed", async () => {
    const injected = await inject({ themes, injectBootstrap: false });

    expect(injected).toHaveLength(1);
    expect(injected[0]!.content).toContain("astro:before-swap");
  });
});


interface FakeRoot {
  classList: {
    add(name: string): void;
    remove(name: string): void;
    contains(name: string): boolean;
  };
  attributes: Record<string, string>;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
}

function fakeRoot(initialClasses: string[] = []): FakeRoot {
  const classes = new Set(initialClasses);
  const attributes: Record<string, string> = {};

  return {
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
    attributes,
    setAttribute(name, value) {
      attributes[name] = String(value);
    },
    getAttribute(name) {
      return attributes[name] ?? null;
    },
  };
}

/** A `[data-tv-readout]` element, as far as the navigation script uses one. */
interface FakeReadout {
  kind: string;
  text: string;
}

/** A `[data-tv-select]` control, as far as the navigation script uses one. */
interface FakeSelect {
  kind: string;
  options: string[];
  value: string;
}

/** The body nodes a page rendered, as the script sees them via selectors. */
interface FakeBody {
  readouts?: FakeReadout[];
  selects?: FakeSelect[];
}

/**
 * Builds the minimal element surface the navigation script touches.
 *
 * Deliberately not jsdom: the script is emitted as an inline string and
 * evaluated with `eval`, so what matters is which properties it reads — a real
 * DOM would hide a script that reached for something the browser guarantees but
 * this contract does not.
 */
function fakeBody({ readouts = [], selects = [] }: FakeBody) {
  const readoutEls = readouts.map((entry) => ({
    getAttribute: (name: string) =>
      name === "data-tv-readout" ? entry.kind : null,
    get textContent(): string {
      return entry.text;
    },
    set textContent(value: string) {
      entry.text = value;
    },
  }));

  const selectEls = selects.map((entry) => ({
    getAttribute: (name: string) => (name === "data-tv-select" ? entry.kind : null),
    options: entry.options.map((value) => ({ value })),
    get value(): string {
      return entry.value;
    },
    set value(next: string) {
      entry.value = next;
    },
  }));

  return {
    querySelectorAll(selector: string) {
      if (selector === "[data-tv-readout]") return readoutEls;
      if (selector === "[data-tv-select]") return selectEls;
      return [];
    },
  };
}

interface FakeDocument extends ReturnType<typeof fakeBody> {
  documentElement: FakeRoot;
  root: FakeRoot;
  headChildren: unknown[];
  head?: { appendChild(node: unknown): void };
}

function fakeDocument(
  initialClasses: string[] = [],
  withHead = true,
  body: FakeBody = {},
): FakeDocument {
  const root = fakeRoot(initialClasses);
  const headChildren: unknown[] = [];

  const doc: FakeDocument = {
    documentElement: root,
    root,
    headChildren,
    getElementById: () => null,
    importNode: (node: unknown) => node,
    ...fakeBody(body),
  } as unknown as FakeDocument;

  if (withHead) {
    doc.head = {
      appendChild: (node) => {
        headChildren.push(node);
      },
    };
  }

  return doc;
}

interface LiveState extends FakeBody {
  classes: string[];
  attributes?: Record<string, string>;
  style?: string | null;
  scrollbarStyle?: boolean;
}

/**
 * Executes the navigation script against a live document and dispatches
 * `astro:before-swap` with the given incoming document.
 */
function dispatchBeforeSwap(live: LiveState, next: unknown) {
  const liveRoot = fakeRoot(live.classes);
  if (live.style !== undefined && live.style !== null) {
    liveRoot.attributes["style"] = live.style;
  }
  for (const [name, value] of Object.entries(live.attributes ?? {})) {
    liveRoot.attributes[name] = value;
  }

  const scrollbarStyle = live.scrollbarStyle
    ? { id: "tv-scrollbar-style", textContent: "html.tv-scrollbar{scrollbar-width:none}" }
    : null;

  const handlers: Array<(event: unknown) => void> = [];
  const scope = globalThis as { document?: unknown };
  const previous = scope.document;

  scope.document = {
    documentElement: liveRoot,
    getElementById: (id: string) =>
      id === "tv-scrollbar-style" ? scrollbarStyle : null,
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      if (type === "astro:before-swap") handlers.push(handler);
    },
    ...fakeBody(live),
  };

  try {
    (0, eval)(createNavigationScript());
    for (const handler of handlers) handler({ newDocument: next });
  } finally {
    scope.document = previous;
  }

  return handlers.length;
}

describe("createNavigationScript — client-side navigation", () => {
  it("carries the resolved theme onto the incoming document", () => {
    const next = fakeDocument();

    const handlers = dispatchBeforeSwap(
      {
        classes: ["dark", "tv-scrollbar"],
        attributes: {
          "data-theme": "mint-dark",
          "data-theme-mode": "dark",
          "data-theme-family": "mint",
        },
        style: "color-scheme: dark; --theme-color-background: #101014",
        scrollbarStyle: true,
      },
      next,
    );

    expect(handlers).toBe(1);
    expect(next.root.classList.contains("dark")).toBe(true);
    expect(next.root.classList.contains("tv-scrollbar")).toBe(true);
    expect(next.root.attributes["data-theme"]).toBe("mint-dark");
    expect(next.root.attributes["data-theme-mode"]).toBe("dark");
    expect(next.root.attributes["data-theme-family"]).toBe("mint");
    expect(next.root.attributes["style"]).toBe(
      "color-scheme: dark; --theme-color-background: #101014",
    );
    expect(next.headChildren).toHaveLength(1);
    expect((next.headChildren[0] as { id: string }).id).toBe(
      "tv-scrollbar-style",
    );
  });

  it("restores the light state when the incoming document is dark", () => {
    const next = fakeDocument(["dark"]);

    dispatchBeforeSwap({ classes: [] }, next);

    expect(next.root.classList.contains("dark")).toBe(false);
  });

  it("keeps the scrollbar class without adding a style element when none exists", () => {
    const next = fakeDocument();

    dispatchBeforeSwap({ classes: ["tv-scrollbar"] }, next);

    expect(next.root.classList.contains("tv-scrollbar")).toBe(true);
    expect(next.headChildren).toHaveLength(0);
  });

  it("only copies attributes the live document actually has", () => {
    const next = fakeDocument();

    dispatchBeforeSwap(
      { classes: [], attributes: { "data-theme": "mint-light" } },
      next,
    );

    expect(next.root.attributes["data-theme"]).toBe("mint-light");
    expect(next.root.attributes["data-theme-mode"]).toBeUndefined();
  });

  it("ignores navigation events it cannot apply", () => {
    expect(dispatchBeforeSwap({ classes: [] }, null)).toBe(1);
    expect(() => dispatchBeforeSwap({ classes: [] }, {})).not.toThrow();
    expect(() =>
      dispatchBeforeSwap({ classes: [] }, fakeDocument([], false)),
    ).not.toThrow();
  });

  /**
   * The selection attributes are what a `[data-tv-select]` control reads, and
   * they are not derivable from `data-theme` — a `"system"` selection and a
   * resolved `dark` mode are different facts. Carrying only the resolved pair
   * left every navigation showing the first option of every control.
   */
  it("carries the selection attributes alongside the resolved ones", () => {
    const next = fakeDocument();

    dispatchBeforeSwap(
      {
        classes: [],
        attributes: {
          "data-theme": "cocoa-dark",
          "data-theme-mode": "dark",
          "data-theme-family": "cocoa",
          "data-theme-selection-mode": "system",
          "data-theme-selection-family": "cocoa",
        },
      },
      next,
    );

    expect(next.root.attributes["data-theme-selection-mode"]).toBe("system");
    expect(next.root.attributes["data-theme-selection-family"]).toBe("cocoa");
  });

  it("carries readout text by kind, not by position", () => {
    const next = fakeDocument([], true, {
      readouts: [
        // Deliberately in the opposite order from the live document: an
        // index-based copy would swap the two labels.
        { kind: "family", text: "mint" },
        { kind: "theme", text: "mint-light" },
        { kind: "mode", text: "light" },
      ],
    });

    dispatchBeforeSwap(
      {
        classes: [],
        attributes: {
          "data-theme": "cocoa-dark",
          "data-theme-selection-family": "cocoa",
          "data-theme-selection-mode": "system",
        },
        readouts: [
          { kind: "theme", text: "cocoa-dark" },
          { kind: "mode", text: "system" },
          { kind: "family", text: "cocoa" },
        ],
      },
      next,
    );

    const rendered = next.querySelectorAll("[data-tv-readout]");
    expect(
      Object.fromEntries(
        rendered.map((el) => [el.getAttribute("data-tv-readout"), el.textContent]),
      ),
    ).toEqual({ theme: "cocoa-dark", mode: "system", family: "cocoa" });
  });

  it("carries a readout kind the destination page does not render", () => {
    // A page can render a subset. The script must copy what matches and leave
    // the rest — no exception, no blank node.
    const next = fakeDocument([], true, {
      readouts: [{ kind: "theme", text: "mint-light" }],
    });

    expect(() =>
      dispatchBeforeSwap(
        {
          classes: [],
          readouts: [
            { kind: "theme", text: "ocean-dark" },
            { kind: "family", text: "ocean" },
          ],
        },
        next,
      ),
    ).not.toThrow();

    expect(next.querySelectorAll("[data-tv-readout]")[0]!.textContent).toBe("ocean-dark");
  });

  it("selects the incoming control to the live selection", () => {
    const next = fakeDocument([], true, {
      selects: [
        { kind: "family", options: ["mint", "cocoa", "ocean"], value: "mint" },
        { kind: "mode", options: ["light", "dark", "system"], value: "light" },
      ],
    });

    dispatchBeforeSwap(
      {
        classes: [],
        attributes: {
          "data-theme-selection-family": "ocean",
          "data-theme-selection-mode": "system",
        },
      },
      next,
    );

    const selects = next.querySelectorAll("[data-tv-select]");
    expect(selects[0]!.value).toBe("ocean");
    // `system` is a selection, not a resolved mode: it must be selectable even
    // though the document is painted `dark`.
    expect(selects[1]!.value).toBe("system");
  });

  it("leaves a control alone when the selection has no matching option", () => {
    const next = fakeDocument([], true, {
      selects: [{ kind: "family", options: ["mint", "cocoa"], value: "mint" }],
    });

    dispatchBeforeSwap(
      {
        classes: [],
        attributes: { "data-theme-selection-family": "ocean" },
      },
      next,
    );

    // The live selection is stale relative to the destination page's registry.
    // Forcing `select.value = "ocean"` would blank the control, which is worse
    // than leaving it on a value that at least exists.
    expect(next.querySelectorAll("[data-tv-select]")[0]!.value).toBe("mint");
  });
});