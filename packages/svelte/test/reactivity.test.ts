import { describe, it, expect, afterAll, beforeEach, vi } from "vitest";
import { compile } from "svelte/compiler";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mount, unmount, flushSync } from "svelte";
import { defineTheme, getNeutralThemes, resetDiagnosticEmission, createThemeRuntime } from "@themvora/core";

/**
 * Svelte 5 reactivity: a changed configuration prop on a **mounted** provider —
 * and a changed prop on a mounted `ThemeScope` — must update the DOM without a
 * reload or remount, via the shared `runtime.configure()` contract.
 *
 * Consumers are compiled in runes mode so `$state` drives the props.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedDir = join(__dirname, ".generated-reactivity");

const t = (name: string, family: string, mode: "light" | "dark" = "light") =>
  defineTheme({ name, meta: { family, mode }, tokens: { colors: { background: "#fff" } } });

const a = [t("a-light", "a"), t("a-dark", "a", "dark")];
const b = [t("b-light", "b"), t("b-dark", "b", "dark")];

function write(name: string, source: string): string {
  mkdirSync(generatedDir, { recursive: true });
  const { js } = compile(source, { filename: `${name}.svelte`, runes: true });
  const outFile = join(generatedDir, `${name}.mjs`);
  writeFileSync(outFile, js.code);
  return outFile;
}

const innerSource = `<script>
  import { useThemeValue } from "@themvora/svelte";
  const theme = useThemeValue();
</script>
<p id="name">{$theme.name}</p>
`;

const providerSource = `<script>
  import { ThemeProvider } from "@themvora/svelte";
  import Inner from "./InnerProvider.mjs";
  let { initialThemes, initialDefault, ready } = $props();
  let themes = $state(initialThemes);
  let defaultTheme = $state(initialDefault);
  ready?.({ setThemes: (v) => { themes = v; }, setDefault: (v) => { defaultTheme = v; } });
</script>

<ThemeProvider {themes} {defaultTheme} persistence={null} dom={false} cssVariables={false}>
  <Inner />
</ThemeProvider>
`;

const scopeSource = `<script>
  import { ThemeProvider, ThemeScope } from "@themvora/svelte";
  let { initialThemes, ready } = $props();
  let themes = $state(initialThemes);
  let scopeTheme = $state("a-light");
  ready?.({ setThemes: (v) => { themes = v; }, setScope: (v) => { scopeTheme = v; } });
</script>

<ThemeProvider {themes} persistence={null} dom={false} cssVariables={false}>
  <ThemeScope theme={scopeTheme} data-testid="scope">
    <p id="scoped">scoped</p>
  </ThemeScope>
</ThemeProvider>
`;

async function buildProvider(name: string) {
  write("InnerProvider", innerSource);
  const out = write(name, providerSource);
  return (await import(out.replace(/\\/g, "/"))).default;
}

async function buildScope(name: string) {
  const out = write(name, scopeSource);
  return (await import(out.replace(/\\/g, "/"))).default;
}

const transitionProviderSource = `<script>
  import { ThemeProvider } from "@themvora/svelte";
  let { runtime, initialTransition, ready } = $props();
  let transition = $state(initialTransition);
  ready?.({ setTransition: (v) => { transition = v; } });
</script>

<ThemeProvider {runtime} {transition} dom={false} cssVariables={false}>
  <p>ok</p>
</ThemeProvider>
`;

async function buildTransitionProvider(name: string) {
  const out = write(name, transitionProviderSource);
  return (await import(out.replace(/\\/g, "/"))).default;
}

function mountWith(Component: any, props: Record<string, unknown>) {
  const target = document.createElement("div");
  document.body.appendChild(target);
  const instance = mount(Component, { target, props });
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

describe("Svelte ThemeProvider — reactive config props", () => {
  it("follows a changed defaultTheme and a replaced catalog", async () => {
    const T = await buildProvider("ProviderReactive");
    let api: any;
    const m = mountWith(T, { initialThemes: a, initialDefault: "a-light", ready: (v: any) => (api = v) });
    const name = () => m.target.querySelector("#name")?.textContent;
    try {
      expect(name()).toBe("a-light");

      api.setDefault("a-dark");
      flushSync();
      expect(name()).toBe("a-dark");

      api.setThemes(b);
      api.setDefault("b-light");
      flushSync();
      expect(name()).toBe("b-light");
    } finally {
      m.cleanup();
    }
  });

  it("falls back to the neutral theme for an empty catalog", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const T = await buildProvider("ProviderReactiveEmpty");
    let api: any;
    const m = mountWith(T, { initialThemes: a, initialDefault: "a-light", ready: (v: any) => (api = v) });
    try {
      expect(m.target.querySelector("#name")?.textContent).toBe("a-light");
      api.setThemes([]);
      flushSync();
      expect(m.target.querySelector("#name")?.textContent).toBe(getNeutralThemes()[0]!.name);
      expect(warn).toHaveBeenCalled();
    } finally {
      m.cleanup();
    }
  });
});

describe("Svelte ThemeScope — reactive props", () => {
  it("re-resolves when the scope theme prop changes", async () => {
    const T = await buildScope("ScopeReactive");
    let api: any;
    const m = mountWith(T, { initialThemes: a, ready: (v: any) => (api = v) });
    const scope = () => m.target.querySelector('[data-testid="scope"]') as HTMLElement | null;
    try {
      expect(scope()?.getAttribute("data-theme")).toBe("a-light");

      api.setScope("a-dark");
      flushSync();
      expect(scope()?.getAttribute("data-theme")).toBe("a-dark");
    } finally {
      m.cleanup();
    }
  });
});

describe("Svelte ThemeProvider — reactive transition prop", () => {
  it("reconfigures the live runtime without recreating it", async () => {
    const runtime = createThemeRuntime({
      themes: a,
      dom: false,
      cssVariables: false,
      persistence: null,
      broadcast: null,
      transition: { enabled: true, duration: 300 },
    } as never);

    const T = await buildTransitionProvider("ProviderTransitionReactive");
    let api: any;
    const m = mountWith(T, {
      runtime,
      initialTransition: { enabled: true, duration: 300 },
      ready: (v: any) => (api = v),
    });

    try {
      expect(runtime.transition?.duration).toBe(300);
      const themeBefore = runtime.store.get().name;
      const historyBefore = runtime.history.getHistory().length;

      api.setTransition({ enabled: true, duration: 900 });
      flushSync();

      // Same runtime, reconfigured in place; a transition change is not a theme
      // change, so the selection and history are untouched.
      expect(runtime.transition?.duration).toBe(900);
      expect(runtime.store.get().name).toBe(themeBefore);
      expect(runtime.history.getHistory().length).toBe(historyBefore);
    } finally {
      m.cleanup();
      runtime.destroy();
    }
  });
});
