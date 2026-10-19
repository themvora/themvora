import { afterEach, describe, expect, it } from "vitest";
import {
  defineThemvoraConfig,
  getBuiltInThemes,
  readTransportedConfig,
  resolveRuntimeOptions,
  toBootstrapConfig,
} from "../src";
import { defineTheme } from "../src/model";

/**
 * The runtime half of the single-configuration contract.
 *
 * A build integration publishes `toBootstrapConfig(theme.config.ts)` as
 * `globalThis.__THEMVORA_CONFIG__` before any application code runs, and every
 * framework provider merges it under its own options through
 * {@link resolveRuntimeOptions}. These tests pin the merge order and the
 * fallbacks, because getting either wrong produces the same symptom — a runtime
 * on the wrong registry — that is invisible until a theme fails to resolve.
 */

const appThemes = [
  defineTheme({
    name: "app-light",
    meta: { family: "app", mode: "light" },
    tokens: { colors: { background: "#ffffff" } },
  }),
  defineTheme({
    name: "app-dark",
    meta: { family: "app", mode: "dark" },
    tokens: { colors: { background: "#101014" } },
  }),
];

const scope = globalThis as unknown as Record<string, unknown>;

afterEach(() => {
  delete scope.__THEMVORA_CONFIG__;
});

describe("readTransportedConfig", () => {
  it("returns null when no integration has run", () => {
    expect(readTransportedConfig()).toBeNull();
  });

  it("returns the transported configuration", () => {
    scope.__THEMVORA_CONFIG__ = toBootstrapConfig(
      defineThemvoraConfig({ themes: appThemes, defaultTheme: "app-dark" }),
    );

    const read = readTransportedConfig<typeof appThemes[number]>();
    expect(read?.defaultTheme).toBe("app-dark");
    expect(read?.themes?.map((t) => t.name)).toEqual(["app-light", "app-dark"]);
  });

  it("ignores a non-object global", () => {
    scope.__THEMVORA_CONFIG__ = "nope";
    expect(readTransportedConfig()).toBeNull();
  });
});

describe("resolveRuntimeOptions", () => {
  it("uses the transported registry when the provider passes nothing", () => {
    scope.__THEMVORA_CONFIG__ = toBootstrapConfig(
      defineThemvoraConfig({
        themes: appThemes,
        defaultTheme: "app-dark",
        initialMode: "system",
      }),
    );

    const resolved = resolveRuntimeOptions<typeof appThemes[number]>({});

    expect(resolved.themes?.map((t) => t.name)).toEqual(["app-light", "app-dark"]);
    expect(resolved.defaultTheme).toBe("app-dark");
    expect(resolved.initialMode).toBe("system");
  });

  it("lets an explicit prop win over the transported value", () => {
    scope.__THEMVORA_CONFIG__ = toBootstrapConfig(
      defineThemvoraConfig({ themes: appThemes, defaultTheme: "app-dark" }),
    );

    const resolved = resolveRuntimeOptions<typeof appThemes[number]>({
      defaultTheme: "app-light",
    });

    expect(resolved.defaultTheme).toBe("app-light");
    // The registry still comes from the transport — overriding one key must not
    // discard the rest.
    expect(resolved.themes?.map((t) => t.name)).toEqual(["app-light", "app-dark"]);
  });

  it("drops undefined provider options instead of letting them clobber the transport", () => {
    scope.__THEMVORA_CONFIG__ = toBootstrapConfig(
      defineThemvoraConfig({
        themes: appThemes,
        defaultTheme: "app-dark",
        initialMode: "system",
        initialFamily: "app",
      }),
    );

    // Exactly the shape Vue and Svelte hand a provider: every declared key is
    // present, with `undefined` for the ones the app did not pass. A plain
    // spread would erase the transported values.
    const resolved = resolveRuntimeOptions<typeof appThemes[number]>({
      defaultTheme: undefined,
      initialMode: undefined,
      initialFamily: undefined,
      themes: undefined,
    });

    expect(resolved.defaultTheme).toBe("app-dark");
    expect(resolved.initialMode).toBe("system");
    expect(resolved.initialFamily).toBe("app");
    expect(resolved.themes?.map((t) => t.name)).toEqual(["app-light", "app-dark"]);
  });

  it("passes an explicit empty registry through so the runtime can apply the neutral fallback", () => {
    scope.__THEMVORA_CONFIG__ = toBootstrapConfig(
      defineThemvoraConfig({ themes: appThemes }),
    );

    // An explicitly empty collection is the caller's intent — the runtime
    // resolves it to the canonical neutral fallback — so it is *not* silently
    // replaced by the transported registry. (An *absent* `themes` still falls
    // back to the transport; the Web Components provider only sends `themes`
    // when the attribute is actually present.)
    const resolved = resolveRuntimeOptions<typeof appThemes[number]>({ themes: [] });

    expect(resolved.themes).toEqual([]);
  });

  it("falls back to the built-in themes with no transport and no props", () => {
    const resolved = resolveRuntimeOptions<typeof appThemes[number]>({});

    // The provider-only mode: no build integration, no props, still themed.
    expect(resolved.themes?.map((t) => t.name)).toEqual(
      getBuiltInThemes().map((t) => t.name),
    );
  });

  it("prefers a non-empty explicit registry over the transport", () => {
    scope.__THEMVORA_CONFIG__ = toBootstrapConfig(
      defineThemvoraConfig({ themes: appThemes }),
    );

    const localThemes = [
      defineTheme({
        name: "local-light",
        meta: { family: "local", mode: "light" },
        tokens: { colors: { background: "#000000" } },
      }),
    ];

    const resolved = resolveRuntimeOptions<typeof localThemes[number]>({
      themes: localThemes,
    });

    expect(resolved.themes?.map((t) => t.name)).toEqual(["local-light"]);
  });
});
