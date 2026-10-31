/**
 * The workspace view.
 *
 * Three things are worth testing without a browser: the view model (pure), the
 * document's security posture (it must not gain a remote dependency), and the
 * ready → state round trip that a real webview performs on reveal.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { RootView } from "../src/domain/rootView";
import { buildWorkspaceState, registerWorkspaceView, workspaceHtml } from "../src/adapters/workspaceView";
import type { ProjectProfile } from "../src/domain/projectProfile";
import type { ProjectInspection, RegistryEntry } from "../src/domain/registry";
import { __reset, __state } from "./stubs/vscode";

afterEach(() => {
  __reset();
});

/** An inspection holding one readable registry with two themes. */
function inspection(root: string): ProjectInspection {
  const registry: RegistryEntry = {
    kind: "theme-module",
    path: "src/themes/themes.ts",
    status: "supported",
    detail: "src/themes/themes.ts — 2 themes.",
    themes: [
      {
        name: "brand-light",
        meta: { mode: "light", family: "brand" },
        tokens: {
          colors: {
            background: "#ffffff",
            foreground: "#111111",
            card: "#ffffff",
            cardForeground: "#111111",
            popover: "#ffffff",
            popoverForeground: "#111111",
            primary: "#4f46e5",
            primaryForeground: "#ffffff",
            secondary: "#eef2ff",
            secondaryForeground: "#312e81",
            muted: "#f4f4f5",
            mutedForeground: "#52525b",
            accent: "#e0e7ff",
            accentForeground: "#312e81",
            destructive: "#dc2626",
            destructiveForeground: "#ffffff",
            success: "#16a34a",
            successForeground: "#ffffff",
            border: "#e4e4e7",
            input: "#e4e4e7",
            ring: "#4f46e5",
          },
        },
      },
      { name: "brand-dark", meta: { mode: "dark", family: "brand" }, tokens: { colors: {} } },
    ],
  };

  return {
    root,
    status: "supported",
    packages: ["@themvora/core"],
    registries: [registry],
    notes: [],
    providers: [],
    relationships: [],
  };
}

/** A profile for a Next project with one installed package. */
function profile(): ProjectProfile {
  return {
    framework: "next",
    frameworkEvidence: "next is declared",
    packageManager: "pnpm",
    packageManagerEvidence: "pnpm-lock.yaml is present",
    packages: [
      { name: "@themvora/core", declaredRange: "^1.4.0", field: "dependencies", status: "installed", installedVersion: "1.4.2" },
    ],
  };
}

describe("buildWorkspaceState", () => {
  it("flattens registries into themes and names the framework", () => {
    const roots: RootView[] = [{ name: "app", inspection: inspection("C:/app") }];
    const state = buildWorkspaceState(roots, new Map([["C:/app", profile()]]));

    expect(state.roots).toHaveLength(1);
    const root = state.roots[0]!;
    expect(root.framework).toBe("Next.js");
    expect(root.packageManager).toBe("pnpm");
    expect(root.status).toBe("themes detected");
    expect(root.themes.map((theme) => theme.name)).toEqual(["brand-light", "brand-dark"]);
    // Tokens come from the theme itself, and the verdict from the validator.
    expect(root.themes[0]?.tokens.find((token) => token.name === "primary")?.value).toBe("#4f46e5");
    expect(root.themes[0]?.valid).toBe(true);
    expect(root.themes[0]?.source).toBe("src/themes/themes.ts");
    expect(root.sources).toEqual(["src/themes/themes.ts"]);
    expect(root.packages[0]?.installedVersion).toBe("1.4.2");
  });

  it("groups a file's themes into one family per theme", () => {
    // A registry lists rose-light and rose-dark as two themes; the Presets tab
    // shows them as one theme with two modes, and the file list must agree.
    const roots: RootView[] = [{ name: "app", inspection: inspection("C:/app") }];
    const state = buildWorkspaceState(roots, new Map());

    const file = state.roots[0]?.files[0];
    expect(file?.families).toHaveLength(1);
    expect(file?.families[0]?.name).toBe("brand");
    expect(file?.families[0]?.modes).toEqual(["light", "dark"]);
    // The row opens the light variant.
    expect(file?.families[0]?.primary).toBe("brand-light");
  });

  it("takes the family from the name when meta.family is absent", () => {
    const base = inspection("C:/app");
    const entry = base.registries[0]!;
    const themed: ProjectInspection = {
      ...base,
      registries: [
        {
          ...entry,
          themes: [
            { name: "ocean-dark", meta: { mode: "dark" }, tokens: { colors: {} } },
            { name: "ocean-light", meta: { mode: "light" }, tokens: { colors: {} } },
            { name: "rose-light", meta: { mode: "light" }, tokens: { colors: {} } },
          ],
        },
      ],
    };

    const state = buildWorkspaceState([{ name: "app", inspection: themed }], new Map());
    const families = state.roots[0]?.files[0]?.families ?? [];

    expect(families.map((family) => family.name)).toEqual(["ocean", "rose"]);
    // Light sorts before dark even when the file lists dark first.
    expect(families[0]?.modes).toEqual(["light", "dark"]);
    expect(families[1]?.modes).toEqual(["light"]);
    expect(families[1]?.primary).toBe("rose-light");
  });

  it("marks a folder with no Themvora as not configured", () => {
    const empty: ProjectInspection = {
      root: "C:/cpp",
      status: "missing",
      packages: [],
      registries: [],
      notes: [],
      providers: [],
      relationships: [],
    };

    const state = buildWorkspaceState([{ name: "cpp", inspection: empty }], new Map());
    const setup = state.roots[0]?.setup;

    expect(setup?.kind).toBe("not-configured");
    // No project to edit, so the Studio tab is locked…
    expect(setup?.studioEnabled).toBe(false);
    // …but the bundled catalog is not.
    expect(setup?.catalogAvailable).toBe(true);
  });

  it("keeps a configured project's Studio available", () => {
    const state = buildWorkspaceState([{ name: "app", inspection: inspection("C:/app") }], new Map());
    expect(state.roots[0]?.setup.studioEnabled).toBe(true);
  });

  it("does not invent a framework when the profile is missing", () => {
    const roots: RootView[] = [{ name: "app", inspection: inspection("C:/app") }];
    const state = buildWorkspaceState(roots, new Map());

    expect(state.roots[0]?.framework).toBe("Unknown");
    expect(state.roots[0]?.packages).toEqual([]);
  });

  it("keeps every root, so a multi-root workspace is not silently reduced", () => {
    const roots: RootView[] = [
      { name: "one", inspection: inspection("C:/one") },
      { name: "two", inspection: inspection("C:/two") },
    ];
    const state = buildWorkspaceState(roots, new Map());

    expect(state.roots.map((root) => root.name)).toEqual(["one", "two"]);
  });
});

describe("workspaceHtml", () => {
  it("pins a strict CSP with the nonce and no remote source", () => {
    const html = workspaceHtml("abc123");

    expect(html).toContain("default-src 'none'");
    expect(html).toContain("style-src 'nonce-abc123'");
    expect(html).toContain("script-src 'nonce-abc123'");
    // A remote font, script or stylesheet would need a CSP exception to work, so
    // the absence of one is what keeps the policy tight.
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("contains a script that parses", () => {
    // The document is a string, so the compiler never sees its script. A syntax
    // error would only surface as a blank panel in a real window.
    const html = workspaceHtml("n");
    const script = /<script nonce="n">([\s\S]*?)<\/script>/u.exec(html)?.[1];
    expect(script).toBeDefined();
    expect(() => new Function(script!)).not.toThrow();
  });

  it("ships the onboarding copy and the capability check", () => {
    const html = workspaceHtml("n");

    expect(html).toContain("Get started with Themvora");
    expect(html).toContain("Framework guides");
    expect(html).toContain("Themvora on npm");
    // The view asks the host to open a destination by id; it never carries a URL.
    expect(html).toContain('type: "openExternal"');
    // The Studio tab is locked from the host's verdict, not from a local guess.
    expect(html).toContain("root.setup.studioEnabled");
  });

  it("labels the sections that are not built yet instead of faking them", () => {
    const html = workspaceHtml("n");

    // The shell names all five sections, and is explicit about which exist.
    for (const label of ["Overview", "Studio", "Presets", "Packages", "Validation"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("BUILT = { overview: true, packages: true");
    expect(html).toContain("is not in this build yet");
  });
});

describe("registerWorkspaceView", () => {
  /** A stand-in for the object VS Code hands `resolveWebviewView`. */
  function fakeView() {
    const messages: unknown[] = [];
    let html = "";
    let handler: ((message: unknown) => void) | undefined;

    return {
      view: {
        webview: {
          options: {},
          get html() {
            return html;
          },
          set html(value: string) {
            html = value;
          },
          onDidReceiveMessage(callback: (message: unknown) => void) {
            handler = callback;
            return { dispose() {} };
          },
          postMessage(message: unknown) {
            messages.push(message);
            return Promise.resolve(true);
          },
        },
        onDidDispose() {
          return { dispose() {} };
        },
      },
      messages,
      send: (message: unknown) => handler?.(message),
    };
  }

  it("registers one provider for the contributed view", () => {
    registerWorkspaceView({ roots: () => [], profileFor: async () => profile() });

    expect(__state.webviewViewProviders).toHaveLength(1);
    expect(__state.webviewViewProviders[0]?.id).toBe("themvora.workspace");
  });

  it("serves the document and posts state when the view says it is ready", async () => {
    const roots: RootView[] = [{ name: "app", inspection: inspection("C:/app") }];
    registerWorkspaceView({ roots: () => roots, profileFor: async () => profile() });

    const provider = __state.webviewViewProviders[0]?.provider as {
      resolveWebviewView(view: unknown): void;
    };
    const fake = fakeView();
    provider.resolveWebviewView(fake.view);

    expect(fake.view.webview.html).toContain("Content-Security-Policy");

    fake.send({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const posted = fake.messages[0] as { type: string; state: { roots: { name: string; framework: string }[] } };
    expect(posted.type).toBe("state");
    expect(posted.state.roots[0]?.name).toBe("app");
    expect(posted.state.roots[0]?.framework).toBe("Next.js");
  });

  it("previews the selected theme through the shared preview", async () => {
    const roots: RootView[] = [{ name: "app", inspection: inspection("C:/app") }];
    const opened: { themes: unknown[]; label: string }[] = [];

    registerWorkspaceView({
      roots: () => roots,
      profileFor: async () => profile(),
      preview: {
        async openThemes(themes, label) {
          opened.push({ themes: [...themes], label });
        },
      },
    });

    const provider = __state.webviewViewProviders[0]?.provider as { resolveWebviewView(view: unknown): void };
    const fake = fakeView();
    provider.resolveWebviewView(fake.view);

    // Selection first: the Studio owns what is selected, so `preview` takes no
    // arguments and cannot be pointed at an arbitrary theme by the webview.
    fake.send({ type: "selectProject", path: "src/themes/themes.ts", name: "brand-light" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // `selectProject` previews immediately: the sidebar has no Studio selection
    // to hold, so a second explicit preview would be a second open.
    expect(opened).toHaveLength(1);
    expect(opened[0]?.label).toBe("src/themes/themes.ts");
    // The whole family goes to the preview, so it can switch modes.
    expect(opened[0]?.themes).toHaveLength(2);
    expect((opened[0]?.themes[0] as { name: string }).name).toBe("brand-light");
  });

  it("previews only the clicked theme's family when a registry holds several", async () => {
    const base = inspection("C:/app");
    const entry = base.registries[0]!;
    const withTwoFamilies: ProjectInspection = {
      ...base,
      registries: [
        {
          ...entry,
          themes: [
            ...(entry.themes ?? []),
            {
              name: "ocean-light",
              meta: { mode: "light", family: "ocean" },
              tokens: { colors: {} },
            },
          ],
        },
      ],
    };
    const roots: RootView[] = [{ name: "app", inspection: withTwoFamilies }];
    const opened: { themes: unknown[]; label: string }[] = [];

    registerWorkspaceView({
      roots: () => roots,
      profileFor: async () => profile(),
      preview: {
        async openThemes(themes, label) {
          opened.push({ themes: [...themes], label });
        },
      },
    });

    const provider = __state.webviewViewProviders[0]?.provider as { resolveWebviewView(view: unknown): void };
    const fake = fakeView();
    provider.resolveWebviewView(fake.view);

    fake.send({ type: "selectProject", path: "src/themes/themes.ts", name: "brand-light" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(opened).toHaveLength(1);
    // The family is brand-light + brand-dark; the ocean theme in the same file
    // must not be handed to the preview, where the light lookup would pick it.
    expect((opened[0]?.themes as { name: string }[]).map((theme) => theme.name)).toEqual([
      "brand-light",
      "brand-dark",
    ]);
  });

  it("ignores a preview for a theme it does not have", async () => {
    const roots: RootView[] = [{ name: "app", inspection: inspection("C:/app") }];
    const opened: unknown[] = [];

    registerWorkspaceView({
      roots: () => roots,
      profileFor: async () => profile(),
      preview: { async openThemes(themes) { opened.push(themes); } },
    });

    const provider = __state.webviewViewProviders[0]?.provider as { resolveWebviewView(view: unknown): void };
    const fake = fakeView();
    provider.resolveWebviewView(fake.view);

    fake.send({ type: "preview" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Nothing selected, so nothing is previewed.
    expect(opened).toEqual([]);
  });

  it("ignores a malformed message rather than throwing", () => {
    registerWorkspaceView({ roots: () => [], profileFor: async () => profile() });
    const provider = __state.webviewViewProviders[0]?.provider as { resolveWebviewView(view: unknown): void };
    const fake = fakeView();
    provider.resolveWebviewView(fake.view);

    expect(() => fake.send(null)).not.toThrow();
    expect(() => fake.send({ type: "unknown" })).not.toThrow();
  });
});
