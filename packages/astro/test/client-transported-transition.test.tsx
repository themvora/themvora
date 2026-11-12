// @vitest-environment jsdom
/**
 * Regression: the React island must adopt the transported `transition`.
 *
 * `theme.config.ts` is the one declaration for the registry, the initial
 * selection **and the runtime options**. The native controller path spreads the
 * transported projection into `createThemeRuntime`, but `ThemeProviderClient`
 * used to read only the explicit prop — so an Astro + React page whose config
 * declared `transition: { duration: 200 }` created its island runtime with no
 * transition at all (or with the defaults), while native controls on the same
 * page used the declared options.
 *
 * These tests render the shipped island with a transported config in place and
 * read the runtime it installs. An explicit prop must still win, so the escape
 * hatch for one island stays intact.
 */
import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getBuiltInThemes } from "@themvora/core";
import { ThemeProviderClient } from "../src/client";
import { getGlobalRuntime, releaseGlobalRuntime } from "../src/shared-runtime";
import { __resetTransportedConfig } from "../src/transport";

const themes = getBuiltInThemes();

function transported(config: Record<string, unknown>) {
  (globalThis as unknown as Record<string, unknown>).__THEMVORA_CONFIG__ = {
    themes,
    ...config,
  };
}

function render(props: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    <ThemeProviderClient {...(props as never)}>
      <span>panel</span>
    </ThemeProviderClient>,
  );
}

afterEach(() => {
  const runtime = getGlobalRuntime();
  if (runtime) {
    runtime.destroy();
    releaseGlobalRuntime(runtime);
  }
  __resetTransportedConfig();
});

describe("ThemeProviderClient — transported runtime options", () => {
  it("uses the transition declared in theme.config.ts", () => {
    transported({ transition: { enabled: true, duration: 200, preset: "smooth" } });

    render();

    expect(getGlobalRuntime()?.transition).toMatchObject({
      enabled: true,
      duration: 200,
      preset: "smooth",
    });
  });

  it("uses a disabled transported transition", () => {
    transported({ transition: false });

    render();

    expect(getGlobalRuntime()?.transition).toEqual({ enabled: false });
  });

  it("lets an explicit prop override the transported transition", () => {
    transported({ transition: { enabled: true, duration: 200 } });

    render({ transition: { enabled: false } });

    expect(getGlobalRuntime()?.transition).toEqual({ enabled: false });
  });

  it("leaves the runtime without a transition when neither declares one", () => {
    transported({});

    render();

    expect(getGlobalRuntime()?.transition).toBeUndefined();
  });
});
