import { describe, it, expect, vi, afterAll } from "vitest";
import { compile } from "svelte/compiler";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mount, unmount, flushSync } from "svelte";
import { createThemeRuntime, type ThemeDefinition } from "@themvora/core";

const themes: ThemeDefinition[] = [
  {
    name: "forest-light",
    meta: { family: "forest", mode: "light" },
    tokens: { colors: { background: "#f0fff0", card: "#ffffff" } },
  },
  {
    name: "forest-dark",
    meta: { family: "forest", mode: "dark" },
    tokens: { colors: { background: "#002200", card: "#003300" } },
  },
  {
    name: "ocean-light",
    meta: { family: "ocean", mode: "light" },
    tokens: { colors: { background: "#f0f0ff", card: "#ffffff" } },
  },
  {
    name: "ocean-dark",
    meta: { family: "ocean", mode: "dark" },
    tokens: { colors: { background: "#00002f", card: "#0a0a50" } },
  },
];

const consumerSource = `<script>
  import { ThemeProvider, ThemeScope } from "@themvora/svelte";
  export let themes = [];
  export let runtime = null;
  export let scopeTheme = "forest-dark";
</script>

<ThemeProvider {runtime} {themes}>
  <main><p id="global-text">global</p></main>
  <ThemeScope theme={scopeTheme} className="scoped-box" data-testid="scope">
    <p id="scoped-text">scoped</p>
  </ThemeScope>
  <ThemeScope family="ocean">
    <p id="ocean-text">ocean</p>
  </ThemeScope>
</ThemeProvider>
`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedDir = join(__dirname, ".generated");

async function buildConsumer(source: string, name: string) {
  mkdirSync(generatedDir, { recursive: true });
  const { js } = compile(source, { filename: `${name}.svelte`, runes: false });
  const outFile = join(generatedDir, `${name}.${Date.now()}.${Math.random().toString(36).slice(2)}.mjs`);
  writeFileSync(outFile, js.code);
  return import(outFile.replace(/\\/g, "/"));
}

afterAll(() => {
  rmSync(generatedDir, { recursive: true, force: true });
});

describe("compiled consumer e2e", () => {
  it("scopes themes locally, follows provider mode, never mutates the store", async () => {
    const mod = await buildConsumer(consumerSource, "Consumer");

    const runtime = createThemeRuntime({ themes, dom: false, cssVariables: false } as any);
    const spy = vi.fn();
    runtime.store.subscribe(spy);

    const target = document.createElement("div");
    document.body.appendChild(target);

    const instance = mount(mod.default, {
      target,
      props: { scopeTheme: "forest-dark", themes, runtime },
    });

    flushSync();

    // Provider rendered its children
    expect(target.querySelector("#global-text")).toBeTruthy();

    // Explicit-theme scope: wrapper with local CSS variables, no global mutation
    const scope = target.querySelector('[data-testid="scope"]') as HTMLElement;
    expect(scope).toBeTruthy();
    expect(scope.classList.contains("scoped-box")).toBe(true);
    expect(scope.getAttribute("data-theme")).toBe("forest-dark");
    expect(scope.getAttribute("data-mode")).toBe("dark");
    expect(scope.classList.contains("dark")).toBe(true);
    expect(scope.style.getPropertyValue("--theme-color-background")).toBe("#002200");
    expect(scope.querySelector("#scoped-text")?.textContent).toBe("scoped");

    // Family scope followed the provider's initial mode (light default)
    const ocean = Array.from(target.querySelectorAll("div")).find(
      (el) => el.getAttribute("data-theme") === "ocean-light",
    ) as HTMLElement | undefined;
    expect(ocean).toBeTruthy();
    expect(ocean!.style.getPropertyValue("--theme-color-background")).toBe("#f0f0ff");
    expect(ocean!.querySelector("#ocean-text")?.textContent).toBe("ocean");

    // Mounting scopes must NOT have touched the global store
    expect(spy).not.toHaveBeenCalled();

    // Family scope follows a global mode flip (no global store sub-mutation of scopes)
    runtime.selection.setMode("dark");
    flushSync();

    const oceanDark = Array.from(target.querySelectorAll("div")).find(
      (el) => el.getAttribute("data-theme") === "ocean-dark",
    ) as HTMLElement | undefined;
    expect(oceanDark).toBeTruthy();
    expect(oceanDark!.style.getPropertyValue("--theme-color-background")).toBe("#00002f");

    // Explicit-theme scope is unaffected by the global flip
    expect(scope.getAttribute("data-theme")).toBe("forest-dark");

    // Global mode change is expected in the store
    expect(spy).toHaveBeenCalledTimes(1);

    unmount(instance);
    flushSync();

    // Cleanup removed wrappers + children
    expect(target.querySelector('[data-testid="scope"]')).toBeFalsy();
    expect(target.querySelector("#ocean-text")).toBeFalsy();
    runtime.destroy();
    document.body.removeChild(target);
  });

  it("supports isolated local themes that shadow parent themes", async () => {
    const runtime = createThemeRuntime({ themes, dom: false, cssVariables: false } as any);
    const target = document.createElement("div");
    document.body.appendChild(target);

    const localThemes: ThemeDefinition[] = [
      {
        name: "local-red",
        meta: { family: "local", mode: "light" },
        tokens: { colors: { background: "#ff0000" } },
      },
    ];

    const source = `<script>
  import { ThemeProvider, ThemeScope } from "@themvora/svelte";
  export let themes = [];
  export let local = [];
  export let runtime = null;
</script>
<ThemeProvider {runtime} {themes}>
  <ThemeScope theme="ocean-light">
    <p id="forrest">leaf</p>
  </ThemeScope>
  <ThemeScope themes={local} theme="local-red" data-testid="local-scope">
    <p id="local-leaf">local</p>
  </ThemeScope>
</ThemeProvider>
`;
    const { js } = compile(source, { filename: "LocalConsumer.svelte", runes: false });
    const outFile = join(generatedDir, `local-consumer.${Date.now()}.${Math.random().toString(36).slice(2)}.mjs`);
    writeFileSync(outFile, js.code);
    const mod2 = await import(outFile.replace(/\\/g, "/"));

    // The provider keeps its own catalog; only the second scope gets `local`.
    // Passing `localThemes` as the provider catalog made `ocean-light` above
    // unresolvable, so that scope fell back to `local-red` — the same
    // `data-theme` the local scope produces. `find()` then picked the *first*
    // of two identical scopes and the assertion looked for `#local-leaf` inside
    // the wrong subtree. The fixture now gives the provider the catalog its
    // scopes actually reference, which is also the scenario the test describes:
    // a parent theme and a locally supplied one side by side.
    const instance = mount(mod2.default, {
      target,
      props: { runtime, themes, local: localThemes },
    });
    flushSync();

    const scopes = Array.from(target.querySelectorAll("div"));
    const ocean = scopes.find((el) => el.getAttribute("data-theme") === "ocean-light");
    const local = target.querySelector('[data-testid="local-scope"]') as HTMLElement | null;

    // The parent catalog is untouched by the local one, and vice versa.
    expect(ocean).toBeTruthy();
    expect(ocean!.querySelector("#forrest")?.textContent).toBe("leaf");
    expect(local).toBeTruthy();
    expect(local!.getAttribute("data-theme")).toBe("local-red");
    expect(local!.style.getPropertyValue("--theme-color-background")).toBe("#ff0000");
    expect(local!.querySelector("#local-leaf")?.textContent).toBe("local");

    unmount(instance);
    flushSync();
    runtime.destroy();
    document.body.removeChild(target);
  });
});