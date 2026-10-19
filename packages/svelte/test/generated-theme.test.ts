// @vitest-environment jsdom
import { describe, it, expect, afterAll } from "vitest";
import { compile } from "svelte/compiler";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mount, unmount, flushSync } from "svelte";
import {
  createThemeRuntime,
  generateTheme,
  getBuiltInThemes,
  type ThemeDefinition,
  type ThemeError,
} from "@themvora/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedDir = join(__dirname, ".generated-generated-theme");

afterAll(() => {
  rmSync(generatedDir, { recursive: true, force: true });
});

function compileTo(source: string, name: string): string {
  mkdirSync(generatedDir, { recursive: true });
  const { js } = compile(source, { filename: `${name}.svelte`, runes: false });
  const outFile = join(generatedDir, `${name}.mjs`);
  writeFileSync(outFile, js.code);
  return outFile;
}

/** The child reads the generated theme inside the provider subtree. */
const childSource = `<script>
  import { useGeneratedTheme } from "@themvora/svelte";
  const generated = useGeneratedTheme();
</script>

{#if $generated}
  <p id="name">{$generated.name}</p>
  <p id="label">{$generated.meta?.label ?? ""}</p>
{/if}
`;

/** The parent renders the provider and a child that consumes it. */
const parentSource = `<script>
  import { ThemeProvider } from "@themvora/svelte";
  import Child from "./Child.mjs";
  export let themes = [];
  export let runtime = null;
</script>

<ThemeProvider {themes} {runtime} persistence={null} dom={false} cssVariables={false}>
  <Child />
</ThemeProvider>
`;

async function load() {
  compileTo(childSource, "Child");
  const parent = compileTo(parentSource, "Parent");
  return (await import(parent.replace(/\\/g, "/"))).default;
}

function mountWith(
  Parent: any,
  themes: readonly ThemeDefinition[],
  runtimeOptions: Record<string, unknown> = {},
) {
  const runtime = createThemeRuntime({
    themes,
    dom: false,
    cssVariables: false,
    persistence: null,
    ...runtimeOptions,
  } as any);

  const target = document.createElement("div");
  document.body.appendChild(target);

  let instance: any;
  let error: unknown;
  try {
    instance = mount(Parent, { target, props: { themes, runtime } });
    flushSync();
  } catch (caught) {
    error = caught;
  }

  return {
    error,
    runtime,
    name: () => target.querySelector("#name")?.textContent ?? null,
    label: () => target.querySelector("#label")?.textContent ?? null,
    cleanup: () => {
      if (instance) {
        unmount(instance);
        flushSync();
      }
      runtime.destroy();
      document.body.removeChild(target);
    },
  };
}

describe("useGeneratedTheme (Svelte)", () => {
  it("returns the registered generated theme the active selection resolves to", async () => {
    const Parent = await load();
    const { light, dark } = generateTheme({ seed: "#635BFF", family: "brand" });

    const lightMount = mountWith(Parent, [light, dark], { initialMode: "light" });
    expect(lightMount.name()).toBe("brand-light");
    lightMount.cleanup();

    const darkMount = mountWith(Parent, [light, dark], { initialMode: "dark" });
    expect(darkMount.name()).toBe("brand-dark");
    darkMount.cleanup();
  });

  it("does not qualify an ordinary preset", async () => {
    const Parent = await load();
    const { error, cleanup } = mountWith(Parent, getBuiltInThemes());

    expect((error as ThemeError | undefined)?.code).toBe("TV_GENERATION_THEME_NOT_FOUND");
    cleanup();
  });

  it("updates a mounted consumer when a pack changes the generated theme", async () => {
    const Parent = await load();
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });

    const mounted = mountWith(Parent, [light]);
    expect(mounted.label()).toBe("Brand Light");

    mounted.runtime.use({
      name: "brand",
      themes: [{ ...light, meta: { ...light.meta, label: "Refreshed Light" } }],
    });
    flushSync();

    expect(mounted.label()).toBe("Refreshed Light");
    mounted.cleanup();
  });

  it("clears the value when the generated theme is removed (no stale theme)", async () => {
    const Parent = await load();
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });

    const mounted = mountWith(Parent, [light]);
    expect(mounted.name()).toBe("brand-light");

    mounted.runtime.registry.unregister("brand-light");
    flushSync();

    // The store no longer holds the removed theme.
    expect(mounted.name()).toBeNull();
    mounted.cleanup();
  });

  it("tracks a same-name replacement", async () => {
    const Parent = await load();
    const { light } = generateTheme({ seed: "#635BFF", family: "brand" });

    const mounted = mountWith(Parent, [light]);
    expect(mounted.label()).toBe("Brand Light");

    mounted.runtime.registry.replace("brand-light", {
      ...light,
      meta: { ...light.meta, label: "Replaced Light" },
    });
    flushSync();

    expect(mounted.label()).toBe("Replaced Light");
    mounted.cleanup();
  });
});
