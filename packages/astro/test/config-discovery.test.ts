// @vitest-environment node
/**
 * The contract that replaced the duplicated configuration: the integration
 * discovers `theme.config.ts`, derives the bootstrap from it, and transports the
 * same projection to the runtime.
 *
 * Node environment, deliberately. Discovery goes through Vite's
 * `loadConfigFromFile`, which bundles the config in the Node realm and asserts
 * on its own `Uint8Array` — under jsdom that global is a different realm's, and
 * the loader fails with `Invariant violation: "new TextEncoder().encode("")
 * instanceof Uint8Array" is incorrectly false`, which surfaces only as a warning
 * and a silent fall back to the built-in themes. The DOM tests live in
 * `integration.test.ts`; these need the real Node globals.
 *
 * The fixture lives inside this package on purpose: `loadThemvoraConfig`
 * resolves Vite through whichever framework hosts it, and from here `astro` —
 * and therefore Vite — is reachable by walking up to
 * `packages/astro/node_modules`. A fixture in a temp directory outside the
 * workspace would have no `node_modules` to walk to, and the test would be
 * measuring the resolver's fallback rather than the integration's behaviour.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { themvora } from "../src/integration";

interface SetupOptions {
  injectScript(stage: string, content: string): void;
  /**
   * Astro always passes this to `astro:config:setup`; the integration uses it to
   * register the pre-paint CSS Vite plugin. A harness without it throws before
   * the discovered config can be observed.
   */
  updateConfig(patch: { vite?: { plugins?: unknown[] } }): void;
  /** Astro's watch registration: a change restarts the dev container. */
  addWatchFile?(path: string): void;
  command?: "dev" | "build" | "preview" | "sync";
  config?: { root: URL | string };
}

const FIXTURE_ROOT = pathToFileURL(
  path.join(import.meta.dirname, "fixtures", "discovery"),
);

/** Runs the hook against a given root and collects the injections. */
async function injectAtRoot(root: URL, extra: Partial<SetupOptions> = {}) {
  const injected: { stage: string; content: string }[] = [];
  const hook = themvora().hooks["astro:config:setup"] as unknown as (
    setup: SetupOptions,
  ) => void | Promise<void>;

  await hook({
    config: { root },
    injectScript(stage, content) {
      injected.push({ stage, content });
    },
    updateConfig() {
      /* the pre-paint CSS plugin is not under test here */
    },
    ...extra,
  });

  return injected;
}

/**
 * Runs the hook in dev and reports which files the integration asked Astro to
 * watch.
 *
 * The injected `<head>` content is generated at setup, so the only way an edit
 * to `theme.config.ts` can reach the browser is a container restart — which is
 * what a watched file triggers.
 */
async function watchedFilesAtRoot(root: URL, options: Record<string, unknown> = {}) {
  const watched: string[] = [];
  const hook = themvora(options as never).hooks["astro:config:setup"] as unknown as (
    setup: SetupOptions,
  ) => void | Promise<void>;

  await hook({
    command: "dev",
    config: { root },
    injectScript() {
      /* not under test here */
    },
    updateConfig() {
      /* not under test here */
    },
    addWatchFile(file) {
      watched.push(file);
    },
  });

  return watched;
}

describe("themvora integration — config discovery", () => {
  it("transports the discovered config to the runtime", async () => {
    const injected = await injectAtRoot(FIXTURE_ROOT);
    const transport = injected.find((entry) =>
      entry.content.includes("__THEMVORA_CONFIG__"),
    );

    expect(transport).toBeDefined();
    expect(transport!.stage).toBe("head-inline");

    // The bootstrap projection, not the whole config: `persistence`,
    // `transition`, `scrollbar`, `plugins` and `adapters` are runtime-only and
    // are deliberately not serialized into the page.
    const payload = JSON.parse(
      transport!.content
        .replace(/^window\.__THEMVORA_CONFIG__=/, "")
        .replace(/;$/, ""),
    ) as Record<string, unknown>;

    expect(Object.keys(payload).sort()).toEqual(
      ["defaultTheme", "initialFamily", "initialMode", "themes"].sort(),
    );
    expect(payload.defaultTheme).toBe("fixture-dark");
    expect(payload.initialMode).toBe("system");
    expect(payload.initialFamily).toBe("fixture");
    expect((payload.themes as { name: string }[]).map((t) => t.name)).toEqual([
      "fixture-light",
      "fixture-dark",
    ]);
  });

  it("derives the bootstrap from the discovered config, not from the built-ins", async () => {
    const injected = await injectAtRoot(FIXTURE_ROOT);
    const bootstrap = injected.find((entry) => entry.content.includes("fp!=="));

    expect(bootstrap).toBeDefined();
    // The fixture's registry is what got inlined. The built-in neutral themes
    // would be the giveaway that discovery silently failed and the integration
    // fell back — the failure mode this whole path exists to prevent.
    expect(bootstrap!.content).toContain("fixture-light");
    expect(bootstrap!.content).toContain("fixture-dark");
    expect(bootstrap!.content).not.toContain("neutral-light");
  });

  it("resolves discovery from a string root as well as a URL", async () => {
    const injected = await injectAtRoot(
      fileURLToPath(FIXTURE_ROOT) as unknown as URL,
    );

    expect(
      injected.some((entry) => entry.content.includes("__THEMVORA_CONFIG__")),
    ).toBe(true);
  });

  it("falls back to the built-in themes when the root has no config", async () => {
    // This package's own root: reachable, and no `theme.config.ts` in it.
    const injected = await injectAtRoot(pathToFileURL(import.meta.dirname));

    expect(
      injected.some((entry) => entry.content.includes("__THEMVORA_CONFIG__")),
    ).toBe(false);
    expect(injected.some((entry) => entry.content.includes("fp!=="))).toBe(true);
  });
});

describe("themvora integration — config changes during dev", () => {
  it("asks Astro to watch the discovered config file", async () => {
    const watched = await watchedFilesAtRoot(FIXTURE_ROOT);

    // The injected `<head>` content — bootstrap, transported config, stylesheet —
    // is produced once at setup. Without this registration an edit to
    // `theme.config.ts` was invisible until the process was restarted by hand,
    // which is what made `transition: { enabled: false }` look broken.
    expect(watched).toHaveLength(1);
    expect(watched[0].replace(/\\/g, "/")).toMatch(/fixtures\/discovery\/theme\.config\.ts$/);
  });

  it("watches a config passed by path", async () => {
    const watched = await watchedFilesAtRoot(pathToFileURL(import.meta.dirname), {
      config: "fixtures/discovery/theme.config.ts",
    });

    expect(watched).toHaveLength(1);
    expect(watched[0].replace(/\\/g, "/")).toMatch(/fixtures\/discovery\/theme\.config\.ts$/);
  });

  it("does not watch when the app passes the config object", async () => {
    const watched = await watchedFilesAtRoot(FIXTURE_ROOT, {
      config: {
        themes: [
          {
            name: "inline-light",
            meta: { family: "inline", mode: "light" },
            tokens: { colors: { background: "#ffffff" } },
          },
        ],
        defaultTheme: "inline-light",
      },
    });

    // Nothing on disk to watch: the object is the source, and the application
    // owns its identity.
    expect(watched).toEqual([]);
  });

  it("does not watch during a build", async () => {
    const watched: string[] = [];
    const hook = themvora().hooks["astro:config:setup"] as unknown as (
      setup: SetupOptions,
    ) => void | Promise<void>;

    await hook({
      command: "build",
      config: { root: FIXTURE_ROOT },
      injectScript() {},
      updateConfig() {},
      addWatchFile(file) {
        watched.push(file);
      },
    });

    // A build resolves the configuration once; a watch registration there would
    // be a hook nobody reads.
    expect(watched).toEqual([]);
  });
});
