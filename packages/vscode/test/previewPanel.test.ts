/**
 * Panel tests.
 *
 * Two halves. The first reads the generated HTML: the CSP, the nonce wiring, the
 * 21 role rows, the two pre-rendered surfaces and the absence of any literal
 * colour in the preview. The second extracts the `<script>` the panel actually
 * emits and runs it against a small fake DOM, so the code under test is the code
 * that ships rather than a TypeScript lookalike.
 *
 * What this cannot prove: that a real browser paints the surfaces as intended.
 * It proves the script applies the 21 roles to the preview root, honours the
 * revision guard, switches views and posts the messages the host expects. A
 * visual check still needs a VS Code window.
 */
import { CORE_COLORS, generateTheme } from "@themvora/core";
import { describe, expect, it } from "vitest";

import { previewHtml } from "../src/adapters/previewPanel";
import {
  DASHBOARD_SURFACE_CSS,
} from "../src/shared/dashboardSurface";
import { PREVIEW_SURFACE_CSS } from "../src/shared/previewSurface";
import { buildPreviewModel, type PreviewModel } from "../src/domain/previewModel";

const NONCE = "nonce-abc123";
const ASSETS = {
  inter: "vscode-webview://t/inter-var-latin.woff2",
  mono: "vscode-webview://t/jetbrains-mono-var-latin.woff2",
  cspSource: "vscode-webview://t",
};
const HTML = previewHtml(NONCE, ASSETS);

const BASE = generateTheme({ seed: "#4f46e5" }).light;
const DARK = generateTheme({ seed: "#4f46e5" }).dark;

/** The model a pair produces in light mode. */
function lightModel(): PreviewModel {
  const result = buildPreviewModel({
    themes: [BASE, DARK],
    mode: "light",
    source: "theme.json",
  });
  if (!result.ok) throw new Error(result.message);
  return result.model;
}

/** The role's custom property. */
function roleProperty(role: string): string {
  return `--${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** The inline script, exactly as the panel emits it. */
function inlineScript(html: string): string {
  const match = /<script nonce="[^"]+">([\s\S]*?)<\/script>/.exec(html);
  if (match === null) throw new Error("the panel emitted no inline script");
  return match[1]!;
}

/** A DOM element with only the surface the webview script touches. */
interface FakeElement {
  textContent: string;
  hidden: boolean;
  disabled: boolean;
  className: string;
  attributes: Record<string, string>;
  classList: {
    add(name: string): void;
    remove(name: string): void;
    toggle(name: string, force?: boolean): void;
  };
  classes: Set<string>;
  style: { properties: Record<string, string>; setProperty(name: string, value: string): void };
  listeners: (() => void)[];
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  addEventListener(type: string, listener: () => void): void;
}

/** A DOM small enough to read, and no smaller. */
function createHarness() {
  const elements = new Map<string, FakeElement>();
  const posted: unknown[] = [];
  const messageListeners: ((event: { data: unknown }) => void)[] = [];
  const rootProperties: Record<string, string> = {};

  const makeElement = (): FakeElement => {
    const classes = new Set<string>();
    const element: FakeElement = {
      textContent: "",
      hidden: false,
      disabled: false,
      className: "",
      attributes: {},
      classes,
      classList: {
        add(name: string) {
          classes.add(name);
        },
        remove(name: string) {
          classes.delete(name);
        },
        toggle(name: string, force?: boolean) {
          const next = force ?? !classes.has(name);
          if (next) classes.add(name);
          else classes.delete(name);
        },
      },
      style: {
        properties: {},
        setProperty(name: string, value: string) {
          this.properties[name] = value;
        },
      },
      listeners: [],
      setAttribute(name: string, value: string) {
        element.attributes[name] = value;
      },
      getAttribute(name: string) {
        return element.attributes[name] ?? null;
      },
      addEventListener(_type: string, listener: () => void) {
        element.listeners.push(listener);
      },
    };
    return element;
  };

  const ensure = (id: string): FakeElement => {
    const existing = elements.get(id);
    if (existing !== undefined) return existing;
    const created = makeElement();
    elements.set(id, created);
    return created;
  };

  for (const id of [
    "preview-root",
    "theme-name",
    "theme-family",
    "theme-contrast",
    "theme-source",
    "theme-mode",
    "chrome-name",
    "chrome-source",
    "stat-tokens",
    "stat-family",
    "stat-mode",
    "stat-contrast",
    "mode-light",
    "mode-dark",
    "view-dashboard",
    "view-components",
    "inspect-toggle",
    "surface-dashboard",
    "surface-components",
    "banner",
  ]) {
    ensure(id);
  }
  for (const role of CORE_COLORS) {
    ensure(`swatch-${role}`);
    ensure(`value-${role}`);
  }
  // The preview root's style is the view model under test.
  const previewRoot = ensure("preview-root");
  previewRoot.style.setProperty = (name: string, value: string) => {
    rootProperties[name] = value;
  };

  const document = {
    documentElement: {
      style: {
        properties: {},
        setProperty(): void {},
      },
    },
    getElementById(id: string): FakeElement | null {
      return elements.get(id) ?? null;
    },
  };

  const window = {
    addEventListener(type: string, listener: (event: { data: unknown }) => void): void {
      if (type === "message") messageListeners.push(listener);
    },
  };

  return {
    /** The element with this id, or a failure. */
    el(id: string): FakeElement {
      const element = elements.get(id);
      if (element === undefined) throw new Error(`no element ${id}`);
      return element;
    },
    rootProperties,
    posted,
    /** Run the emitted script, as the webview would on load. */
    run(): void {
      const factory = new Function("document", "window", "acquireVsCodeApi", inlineScript(HTML));
      factory(document, window, () => ({
        postMessage: (message: unknown) => posted.push(message),
      }));
    },
    /** Deliver a message to the script, as `postMessage` would. */
    deliver(data: unknown): void {
      for (const listener of messageListeners) listener({ data });
    },
  };
}

describe("generated HTML", () => {
  it("declares a policy with no remote or inline allowances", () => {
    expect(HTML).toContain("default-src 'none'");
    expect(HTML).toContain(`style-src 'nonce-${NONCE}'`);
    expect(HTML).toContain(`script-src 'nonce-${NONCE}'`);
  });

  it("grants nothing it does not need", () => {
    expect(HTML).not.toContain("unsafe-inline");
    expect(HTML).not.toContain("unsafe-eval");
    expect(HTML).not.toContain("http://");
    expect(HTML).not.toContain("https://");
    expect(HTML).not.toContain("asWebviewUri");
  });

  it("tags both inline blocks with the nonce", () => {
    expect(HTML).toContain(`<style nonce="${NONCE}">`);
    expect(HTML).toContain(`<script nonce="${NONCE}">`);
  });

  it("paints the editor background before anything else can", () => {
    // A webview's first frame is whatever its body paints. With no rule of its
    // own the body is transparent and the panel shows the host's backdrop for a
    // frame, which is the flash seen when a panel is revealed. The rule has to
    // be the first style in the head so it wins that frame.
    const firstStyle = HTML.indexOf("<style");
    const background = HTML.indexOf("background: var(--vscode-editor-background");
    expect(background).toBeGreaterThan(firstStyle);
    // Nothing but the background may come before it.
    expect(HTML.slice(firstStyle, background)).not.toContain("font-face");
    expect(HTML).toContain("html, body { background: var(--vscode-editor-background, #1f1f1f); }");
  });

  it("loads the same bundled faces as the Studio", () => {
    // Without these rules "Inter" resolves to nothing and the panel falls back
    // to the workbench font, so the same dashboard renders in two typefaces.
    expect(HTML).toContain(`font-src ${ASSETS.cspSource};`);
    expect(HTML).toContain(`url("${ASSETS.inter}") format("woff2")`);
    expect(HTML).toContain(`url("${ASSETS.mono}") format("woff2")`);
    // Both surfaces read their stacks from the same variables.
    expect(HTML).toContain('--font-ui: "Inter"');
    expect(HTML).toContain('--font-mono: "JetBrains Mono"');
  });

  it("frames the gallery as token usage, not as a component library", () => {
    // Themvora themes UI; it does not ship one. A heading of "Theme components"
    // read as a component-library demo, so the gallery states what it is.
    expect(HTML).toContain("Themvora theme token usage");
    expect(HTML).toContain("painted with Themvora tokens");
    expect(HTML).toContain("theming library, not a UI library");
    expect(HTML).not.toContain(">Theme components<");
    // The line is a caption under the identity, not a second heading.
    expect(HTML).toContain('class="tvc-lede"');
  });

  it("pre-renders the dashboard and the components gallery", () => {
    expect(HTML).toContain('<div class="tvp" id="preview-root"');
    expect(HTML).toContain('id="surface-dashboard"');
    expect(HTML).toContain('<div id="surface-components" hidden>');
    expect(HTML).toContain('class="tvd"');
    expect(HTML).toContain('class="tvp-app tvc"');
    expect(HTML).toContain('id="view-dashboard"');
    expect(HTML).toContain('id="view-components"');
  });

  it("renders a row for every semantic role", () => {
    for (const role of CORE_COLORS) {
      expect(HTML).toContain(`id="swatch-${role}"`);
      expect(HTML).toContain(`id="value-${role}"`);
    }
    expect(HTML.match(/<tr data-role="/g)).toHaveLength(21);
  });

  it("uses real buttons for the chrome's mode controls", () => {
    expect(HTML).toContain('<button type="button" id="mode-light" aria-pressed="true">');
    expect(HTML).toContain('<button type="button" id="mode-dark" aria-pressed="false">');
    expect(HTML).toContain('role="group" aria-label="Preview mode"');
  });

  it("gives the dashboard a brand, a search field and four facts", () => {
    expect(HTML).toContain("tvp-brand-name");
    expect(HTML).toContain('class="tvp-search"');
    expect(HTML).toContain('type="search"');
    expect(HTML).toContain('viewBox="0 0 128 128"');
    expect(HTML).not.toContain("Theme Kit");
    for (const id of ["stat-tokens", "stat-family", "stat-mode", "stat-contrast"]) {
      expect(HTML).toContain(`id="${id}"`);
    }
    expect(HTML).toContain('setText("stat-tokens", String(model.roles.length))');
  });

  it("binds the search field to the input role without painting it", () => {
    const rule = /\.tvp \.tvd-search \{([\s\S]*?)\}/u.exec(HTML)?.[1] ?? "";

    expect(rule).toContain("background: var(--card)");
    expect(rule).toContain("border: 1px solid var(--input)");
    expect(rule).not.toContain("background: var(--input)");
  });

  it("contains no literal colour in the preview", () => {
    // The chrome is painted from the extension's own design tokens; the preview
    // below it may only read the theme's roles. Scan that subtree, not the chrome.
    const preview =
      /<div class="tvp" id="preview-root"[\s\S]*?<script nonce=/u.exec(HTML)?.[0] ?? "";
    expect(preview.length).toBeGreaterThan(0);
    expect(preview).not.toMatch(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/u);
    expect(preview).not.toMatch(/\brgba?\(/u);
    expect(preview).not.toMatch(/\bhsla?\(/u);
    expect(preview).not.toContain("--vscode-");
  });

  it("paints status pills solid, never as a tint", () => {
    const success = /\.tvp \.tvd-status\.is-success \{([\s\S]*?)\}/u.exec(HTML)?.[1] ?? "";
    const failed = /\.tvp \.tvd-status\.is-destructive \{([\s\S]*?)\}/u.exec(HTML)?.[1] ?? "";
    const live = /\.tvp \.tvd-live \{([\s\S]*?)\}/u.exec(HTML)?.[1] ?? "";

    expect(success).toContain("background: var(--success)");
    expect(success).toContain("color: var(--success-foreground)");
    expect(failed).toContain("background: var(--destructive)");
    expect(failed).toContain("color: var(--destructive-foreground)");
    expect(live).toContain("background: var(--success)");
    expect(live).toContain("color: var(--success-foreground)");
    expect(success).not.toContain("color-mix");
    expect(failed).not.toContain("color-mix");
  });

  it("keeps both surface stylesheets free of host variables and oklab mixes", () => {
    for (const css of [PREVIEW_SURFACE_CSS, DASHBOARD_SURFACE_CSS]) {
      expect(css).not.toContain("--vscode-");
      expect(css).not.toContain("--theme-color-");
      expect(css).not.toContain("oklab");
      expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/u);
      expect(css).not.toMatch(/\brgba?\(/u);
    }
  });
});

describe("the emitted script", () => {
  it("announces itself when it starts", () => {
    const harness = createHarness();
    harness.run();

    expect(harness.posted).toEqual([{ type: "ready" }]);
  });

  it("applies exactly the 21 roles to the preview root", () => {
    const harness = createHarness();
    harness.run();

    const model = lightModel();
    harness.deliver({ type: "preview", revision: 1, model });

    const values = new Map(model.roles.map((role) => [role.role, role.value]));
    for (const role of CORE_COLORS) {
      expect(harness.rootProperties[roleProperty(role)]).toBe(values.get(role));
    }

    // No `--theme-*` variables and no readable-foreground table: the role
    // contract is the only input, and each role's pair is the foreground.
    expect(Object.keys(harness.rootProperties)).toHaveLength(21);
    expect(Object.keys(harness.rootProperties).some((name) => name.startsWith("--theme-"))).toBe(false);
    expect(Object.keys(harness.rootProperties).some((name) => name.startsWith("--on-"))).toBe(false);
    expect(harness.el("preview-root").attributes["data-mode"]).toBe("light");
  });

  it("turns a missing role into the invalid value, not a host colour", () => {
    const harness = createHarness();
    harness.run();

    const model = lightModel();
    harness.deliver({
      type: "preview",
      revision: 1,
      model: {
        ...model,
        roles: model.roles.map((role) =>
          role.role === "accent" ? { ...role, value: null } : role,
        ),
      },
    });

    expect(harness.rootProperties["--accent"]).toBe("initial");
    expect(harness.el("value-accent").textContent).toBe("(missing)");
    expect(harness.el("swatch-accent").style.properties["background"]).toBe("initial");
  });

  it("fills the header and the role table", () => {
    const harness = createHarness();
    harness.run();

    const model = lightModel();
    harness.deliver({ type: "preview", revision: 1, model });

    expect(harness.el("theme-name").textContent).toBe(model.themeName);
    expect(harness.el("theme-family").textContent).toBe(model.family);
    expect(harness.el("theme-contrast").textContent).toBe(model.contrast);
    expect(harness.el("theme-mode").textContent).toBe("light");

    for (const role of model.roles) {
      expect(harness.el(`value-${role.role}`).textContent).toBe(role.value);
      expect(harness.el(`swatch-${role.role}`).style.properties["background"]).toBe(role.value);
    }
  });

  it("marks the active mode and disables the unavailable one", () => {
    const harness = createHarness();
    harness.run();

    harness.deliver({
      type: "preview",
      revision: 1,
      model: { ...lightModel(), modes: ["light"] },
    });

    expect(harness.el("mode-light").attributes["aria-pressed"]).toBe("true");
    expect(harness.el("mode-dark").attributes["aria-pressed"]).toBe("false");
    expect(harness.el("mode-dark").disabled).toBe(true);
  });

  it("switches between the dashboard and the gallery", () => {
    const harness = createHarness();
    harness.run();

    expect(harness.el("surface-dashboard").hidden).toBe(false);
    expect(harness.el("surface-components").hidden).toBe(true);

    harness.el("view-components").listeners.forEach((listener) => listener());

    expect(harness.el("surface-dashboard").hidden).toBe(true);
    expect(harness.el("surface-components").hidden).toBe(false);
    expect(harness.el("view-components").attributes["aria-pressed"]).toBe("true");
  });

  it("says when a system theme was resolved", () => {
    const harness = createHarness();
    harness.run();

    harness.deliver({
      type: "preview",
      revision: 1,
      model: { ...lightModel(), systemMode: true },
    });

    expect(harness.el("theme-mode").textContent).toBe("system → light");
  });

  it("shows an error and marks it stale", () => {
    const harness = createHarness();
    harness.run();

    harness.deliver({ type: "preview", revision: 1, model: lightModel() });
    expect(harness.el("banner").hidden).toBe(true);

    harness.deliver({
      type: "error",
      revision: 2,
      message: "theme.json is not valid JSON.",
      stale: true,
    });

    expect(harness.el("banner").hidden).toBe(false);
    expect(harness.el("banner").textContent).toContain("theme.json is not valid JSON.");
    expect(harness.el("banner").attributes["data-stale"]).toBe("true");
  });

  it("says the render is stale, not only that the file is broken", () => {
    const harness = createHarness();
    harness.run();

    harness.deliver({ type: "preview", revision: 1, model: lightModel() });
    harness.deliver({ type: "error", revision: 2, message: "not valid JSON.", stale: true });

    expect(harness.el("banner").textContent).toContain("Showing the last valid preview");
    expect(harness.el("banner").textContent).toContain("not valid JSON.");
  });

  it("does not claim staleness when nothing valid was ever shown", () => {
    const harness = createHarness();
    harness.run();

    harness.deliver({ type: "error", revision: 1, message: "not valid JSON.", stale: false });

    expect(harness.el("banner").textContent).toBe("not valid JSON.");
  });

  it("clears the banner when a good model arrives again", () => {
    const harness = createHarness();
    harness.run();

    harness.deliver({ type: "error", revision: 1, message: "broken", stale: false });
    expect(harness.el("banner").hidden).toBe(false);

    harness.deliver({ type: "preview", revision: 2, model: lightModel() });
    expect(harness.el("banner").hidden).toBe(true);
  });

  it("ignores anything that is not newer", () => {
    const harness = createHarness();
    harness.run();

    const model = lightModel();
    harness.deliver({ type: "preview", revision: 5, model });
    harness.deliver({
      type: "preview",
      revision: 5,
      model: { ...model, themeName: "stale" },
    });
    harness.deliver({
      type: "preview",
      revision: 4,
      model: { ...model, themeName: "older" },
    });

    expect(harness.el("theme-name").textContent).toBe(model.themeName);
  });

  it("asks the host for a mode when a button is activated", () => {
    const harness = createHarness();
    harness.run();

    // A real `<button>` turns Enter and Space into a click, which is what the
    // click listener receives.
    harness.el("mode-dark").listeners.forEach((listener) => listener());

    expect(harness.posted).toContainEqual({ type: "setMode", mode: "dark" });
  });

  it("survives a message it does not understand", () => {
    const harness = createHarness();
    harness.run();

    expect(() => harness.deliver(null)).not.toThrow();
    expect(() => harness.deliver({ type: "nonsense" })).not.toThrow();
    expect(() => harness.deliver({ type: "preview" })).not.toThrow();
  });
});
