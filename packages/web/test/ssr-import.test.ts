// @vitest-environment node
import { describe, expect, it } from "vitest";

/**
 * Phase 1.2 — SSR safety.
 *
 * `@themvora/web` is imported by Next.js, Remix, Nuxt, Astro and SvelteKit
 * server bundles. Module evaluation must not touch `window`, `document` or
 * `customElements`, and auto-registration must be skipped rather than crash.
 *
 * This file runs in the `node` environment, which has none of those globals —
 * exactly the condition a server render produces.
 */

describe("server import", () => {
  it("imports without a DOM and exports the elements", async () => {
    expect(typeof globalThis.document).toBe("undefined");
    expect(typeof (globalThis as { customElements?: unknown }).customElements).toBe(
      "undefined",
    );

    const mod = await import("../src/index");

    // The classes are exported, so a server render can reference them; only
    // registration is skipped.
    expect(typeof mod.ThemvoraProvider).toBe("function");
    expect(typeof mod.ThemvoraToggle).toBe("function");
    expect(typeof mod.ThemvoraScope).toBe("function");
    expect(typeof mod.defineCustomElements).toBe("function");
  });

  it("defineCustomElements() is a no-op without customElements", async () => {
    const { defineCustomElements } = await import("../src/index");
    expect(() => defineCustomElements()).not.toThrow();
  });

  it("injectComponentStyles() is a no-op without a document", async () => {
    const { injectComponentStyles } = await import("../src/styles");
    expect(injectComponentStyles()).toBe(false);
  });
});
