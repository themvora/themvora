import { describe, expect, it } from "vitest";
import { themvoraVitePlugin } from "../src/vite-plugin";

/**
 * The plugin's public entry point.
 *
 * `themvoraVitePlugin()` with no arguments is the documented registration —
 * discovery of `theme.config.ts` is the default, and every option is optional.
 * Constructing it must therefore work without arguments; only the later
 * `configResolved` / `transformIndexHtml` hooks need a Vite config.
 */
describe("themvoraVitePlugin", () => {
  it("constructs without arguments", () => {
    expect(() => themvoraVitePlugin()).not.toThrow();
  });

  it("returns a pre-enforced plugin named themvora:vite", () => {
    const plugin = themvoraVitePlugin();
    expect(plugin.name).toBe("themvora:vite");
    expect(plugin.enforce).toBe("pre");
    expect(typeof plugin.transformIndexHtml).toBe("function");
  });

  it("accepts an empty options object", () => {
    const plugin = themvoraVitePlugin({});
    expect(plugin.name).toBe("themvora:vite");
  });

  it("accepts an explicit config path", () => {
    const plugin = themvoraVitePlugin({ config: "./config/theme.config.ts" });
    expect(plugin.name).toBe("themvora:vite");
  });
});
