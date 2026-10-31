import { describe, it, expect, afterAll, beforeEach } from "vitest";
import { compile } from "svelte/compiler";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mount, unmount, flushSync } from "svelte";
import { defineTheme, resetDiagnosticEmission } from "@themvora/core";

/**
 * Svelte parity for the two provider features: the `useProvidedThemes()` store
 * and the one-shot `themeOverride` prop.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedDir = join(__dirname, ".generated-provided-themes");

const t = (name: string, family: string, mode: "light" | "dark" = "light") =>
  defineTheme({ name, meta: { family, mode }, tokens: { colors: { background: "#fff" } } });

const a = [t("a-light", "a"), t("a-dark", "a", "dark")];
const b = [t("b-light", "b")];

function write(name: string, source: string): string {
  mkdirSync(generatedDir, { recursive: true });
  const { js } = compile(source, { filename: `${name}.svelte`, runes: true });
  const outFile = join(generatedDir, `${name}.mjs`);
  writeFileSync(outFile, js.code);
  return outFile;
}

const innerSource = `<script>
  import { useProvidedThemes, useThemeValue } from "@themvora/svelte";
  const families = useProvidedThemes();
  const theme = useThemeValue();
</script>
<p id="families">{$families.map((f) => f.family + ":" + f.variants.length).join("|")}</p>
<p id="theme">{$theme.name}</p>
`;

const providerSource = `<script>
  import { ThemeProvider } from "@themvora/svelte";
  import Inner from "./InnerProvided.mjs";
  let { initialThemes, initialOverride, ready } = $props();
  let themes = $state(initialThemes);
  let themeOverride = $state(initialOverride);
  ready?.({ setThemes: (v) => { themes = v; }, setOverride: (v) => { themeOverride = v; } });
</script>

<ThemeProvider {themes} {themeOverride} persistence={null} dom={false} cssVariables={false}>
  <Inner />
</ThemeProvider>
`;

function mountWith(Component: unknown, props: Record<string, unknown>) {
  const target = document.createElement("div");
  document.body.appendChild(target);
  const instance = mount(Component as never, { target, props });
  flushSync();
  return {
    target,
    cleanup: () => {
      unmount(instance);
      flushSync();
      document.body.removeChild(target);
    },
  };
}

beforeEach(() => resetDiagnosticEmission());
afterAll(() => rmSync(generatedDir, { recursive: true, force: true }));

describe("Svelte provider discovery + override", () => {
  it("exposes the provided families and applies a changed override once", async () => {
    write("InnerProvided", innerSource);
    const out = write("ProviderProvided", providerSource);
    const Component = (await import(out.replace(/\\/g, "/"))).default;

    let api: any;
    const m = mountWith(Component, {
      initialThemes: a,
      initialOverride: "a-dark",
      ready: (v: any) => (api = v),
    });

    const families = () => m.target.querySelector("#families")?.textContent;
    const theme = () => m.target.querySelector("#theme")?.textContent;

    try {
      expect(families()).toBe("a:2");
      expect(theme()).toBe("a-dark");

      // Removing the override restores the layer it covered — the selection the
      // provider would have had without it (`a`'s first variant).
      api.setOverride(undefined);
      flushSync();
      expect(theme()).toBe("a-light");

      // Re-applying it is a new transition, not "already honoured".
      api.setOverride("a-dark");
      flushSync();
      expect(theme()).toBe("a-dark");

      // A changed catalog is reflected in the store.
      api.setThemes(b);
      flushSync();
      expect(families()).toBe("b:1");

      // A changed override applies once…
      api.setOverride("b-light");
      flushSync();
      expect(theme()).toBe("b-light");

      // …and an unchanged one does not re-assert itself.
      api.setOverride("b-light");
      flushSync();
      expect(theme()).toBe("b-light");
    } finally {
      m.cleanup();
    }
  });
});
