// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "solid-js/web";
import { createComponent, createEffect, createSignal, mergeProps } from "solid-js";
import { ThemeProvider, useProvidedThemes, useTheme } from "@themvora/solid";
import { defineTheme, resetDiagnosticEmission, type ThemeDefinition } from "@themvora/core";

/** Solid parity for provider discovery and the one-shot `themeOverride` prop. */

const t = (name: string, family: string, mode: "light" | "dark" = "light") =>
  defineTheme({ name, meta: { family, mode }, tokens: { colors: { background: "#fff" } } }) as ThemeDefinition;

const a = [t("a-light", "a"), t("a-dark", "a", "dark")];
const b = [t("b-light", "b")];

const base = { persistence: null, dom: false, cssVariables: false };

/**
 * Mount the provider with reactive props.
 *
 * Solid's compiler turns `<Provider themes={sig()}/>` into a props *proxy*, and
 * `mergeProps` only takes its lazy path for a function source — a plain object
 * is copied eagerly, which would hand the provider a frozen value and make this
 * test prove nothing. A thunk is the faithful stand-in for JSX here.
 */
function mount(readProps: () => Record<string, unknown>, child: () => Node) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const dispose = render(
    () =>
      createComponent(
        ThemeProvider,
        mergeProps(() => ({ ...base, ...readProps() }), { children: child }) as never,
      ),
    host,
  );
  return {
    host,
    text: () => host.querySelector("#probe")?.textContent,
    dispose: () => {
      dispose();
      document.body.removeChild(host);
    },
  };
}

beforeEach(() => resetDiagnosticEmission());

describe("Solid provider discovery + override", () => {
  it("exposes the provided families and applies a changed override once", () => {
    const [override, setOverride] = createSignal<string | undefined>("a-dark");

    // A Solid component body runs once, so the text has to be written from an
    // effect — exactly what JSX interpolation compiles to.
    function Probe() {
      const families = useProvidedThemes();
      const { theme } = useTheme();
      const el = document.createElement("div");
      el.id = "probe";
      createEffect(() => {
        el.textContent = `${families().map((f) => f.family).join(",")}|${theme().name}`;
      });
      return el;
    }

    const m = mount(
      () => ({ themes: a, themeOverride: override() }),
      () => createComponent(Probe),
    );

    expect(m.text()).toBe("a|a-dark");

    setOverride("a-light");
    expect(m.text()).toBe("a|a-light");

    // An unchanged value must not re-assert itself.
    setOverride("a-light");
    expect(m.text()).toBe("a|a-light");

    m.dispose();
  });

  it("reflects a replaced catalog", () => {
    const [themes, setThemes] = createSignal(a);

    function Probe() {
      const families = useProvidedThemes();
      const el = document.createElement("div");
      el.id = "probe";
      createEffect(() => {
        el.textContent = families().map((f) => f.family).join(",");
      });
      return el;
    }

    const m = mount(() => ({ themes: themes() }), () => createComponent(Probe));

    expect(m.text()).toBe("a");

    setThemes(b);
    expect(m.text()).toBe("b");

    m.dispose();
  });
});
