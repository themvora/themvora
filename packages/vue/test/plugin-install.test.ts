import { describe, expect, it } from "vitest";
import { createApp, h, type Component } from "vue";
import {
  ThemeInspector,
  ThemeProvider,
  ThemeScope,
  ThemeScrollbar,
} from "../src/index";

/**
 * The plugin `install` surface.
 *
 * These four components are used two ways — as components, and as plugins via
 * `app.use(ThemeProvider)` — and the second way had no coverage at all before
 * this file. That mattered: the install method used to be attached through a
 * cast that erased the component's props type
 *
 * ```ts
 * defineComponent({ … }) as unknown as Component & { install(app: App): void }
 * ```
 *
 * and the fix replaced that cast with `Object.assign`. `Object.assign` returns
 * the component type *and* the plugin method, which is what restored prop
 * completion in `.vue` files — but it also rewrote how `install` is attached on
 * all four components at once. A silent regression here would have broken
 * `app.use()` for every Vue consumer, so it is worth a test.
 */
const components: [string, Component & { install(app: unknown): void }][] = [
  ["ThemeProvider", ThemeProvider as never],
  ["ThemeScope", ThemeScope as never],
  ["ThemeScrollbar", ThemeScrollbar as never],
  ["ThemeInspector", ThemeInspector as never],
];

describe("vue components — plugin install", () => {
  it.each(components)("%s exposes an install method", (_name, component) => {
    expect(typeof component.install).toBe("function");
  });

  it.each(components)(
    "%s registers itself under its own name via app.use()",
    (name, component) => {
      const app = createApp({ render: () => h("div") });
      app.use(component as never);
      expect(app.component(name)).toBeDefined();
    },
  );

  it("registers all four on a single app", () => {
    const app = createApp({ render: () => h("div") });
    for (const [, component] of components) {
      app.use(component as never);
    }
    for (const [name] of components) {
      expect(app.component(name)).toBeDefined();
    }
  });
});
