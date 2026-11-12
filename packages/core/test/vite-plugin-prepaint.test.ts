// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { defineTheme } from "../src/model";
import { themvoraVitePlugin } from "../src/vite-plugin";

const themes = [
  defineTheme({
    name: "sample-light",
    meta: { family: "sample", mode: "light" },
    tokens: {
      colors: { background: "#ffffff", foreground: "#111111" },
    },
  }),
  defineTheme({
    name: "sample-dark",
    meta: { family: "sample", mode: "dark" },
    tokens: {
      colors: { background: "#101014", foreground: "#f5f5f5" },
    },
  }),
];

const config = {
  themes,
  defaultTheme: "sample-light",
  initialMode: "system" as const,
};

type InjectedTag = {
  tag: string;
  attrs?: Record<string, string>;
  children?: string;
  injectTo?: string;
};

async function transform(
  html: string,
  options: Record<string, unknown> = {},
  source = config,
) {
  const plugin = themvoraVitePlugin({
    config: source as never,
    ...options,
  });
  const result = await plugin.transformIndexHtml!(html);
  return (Array.isArray(result) ? result : []) as InjectedTag[];
}

const page = (provider: string) =>
  `<html><head></head><body>${provider}</body></html>`;

describe("Vite plugin pre-paint assets", () => {
  it("injects CSS, config and the blocking script in that order", async () => {
    const tags = await transform(
      page(
        `<themvora-provider default-theme="sample-light" initial-mode="system"></themvora-provider>`,
      ),
    );

    const ids = tags.map((tag) => tag.attrs?.id);
    expect(ids.indexOf("themvora-pre-paint-css")).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf("themvora-config")).toBeGreaterThan(
      ids.indexOf("themvora-pre-paint-css"),
    );
    expect(ids.indexOf("themvora-bootstrap")).toBeGreaterThan(
      ids.indexOf("themvora-config"),
    );
  });

  it("generates the stylesheet from the declared themes", async () => {
    const tags = await transform(page(`<themvora-provider></themvora-provider>`));
    const css = tags.find((tag) => tag.attrs?.id === "themvora-pre-paint-css")
      ?.children;

    expect(css).toContain(":root {");
    expect(css).toContain('--theme-color-background: #ffffff;');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(':root[data-theme="sample-dark"]');
  });

  it("accepts a provider that relies entirely on the transported config", async () => {
    await expect(
      transform(page(`<themvora-provider></themvora-provider>`)),
    ).resolves.toBeTruthy();
  });

  it("accepts a family reference that resolves to the configured variant", async () => {
    await expect(
      transform(
        page(
          `<themvora-provider default-theme="sample" initial-mode="system"></themvora-provider>`,
        ),
      ),
    ).resolves.toBeTruthy();
  });

  it("rejects a provider default theme the collection does not contain", async () => {
    await expect(
      transform(
        page(`<themvora-provider default-theme="other-light"></themvora-provider>`),
      ),
    ).rejects.toThrow(/different initial themes|not in the catalog|not in the generated/);
  });

  it("rejects a provider mode that diverges from the plugin config", async () => {
    await expect(
      transform(
        page(
          `<themvora-provider default-theme="sample-light" initial-mode="dark"></themvora-provider>`,
        ),
      ),
    ).rejects.toThrow(/different initial themes/);
  });

  it("rejects an unknown theme name declared by the provider", async () => {
    await expect(
      transform(
        page(
          `<themvora-provider themes="sample-light missing-dark"></themvora-provider>`,
        ),
      ),
    ).rejects.toThrow(/missing-dark/);
  });

  it("rejects an invalid initial mode", async () => {
    await expect(
      transform(
        page(`<themvora-provider initial-mode="dusk"></themvora-provider>`),
      ),
    ).rejects.toThrow(/initial-mode/);
  });

  it("includes provider JSON definitions in the generated CSS", async () => {
    const runtimeTheme = defineTheme({
      name: "runtime-light",
      meta: { family: "runtime", mode: "light" },
      tokens: { colors: { background: "#abcdef", foreground: "#000000" } },
    });
    const tags = await transform(
      page(
        `<themvora-provider themes='${JSON.stringify([runtimeTheme])}' default-theme="runtime-light"></themvora-provider>`,
      ),
    );
    const css = tags.find((tag) => tag.attrs?.id === "themvora-pre-paint-css")
      ?.children;

    expect(css).toContain(':root[data-theme="runtime-light"]');
    expect(css).toContain("--theme-color-background: #abcdef;");
  });

  it("can emit only the CSS for a CSS-only setup", async () => {
    const tags = await transform(
      page(`<themvora-provider></themvora-provider>`),
      { boot: false },
    );

    expect(tags.some((tag) => tag.attrs?.id === "themvora-pre-paint-css")).toBe(
      true,
    );
    expect(tags.some((tag) => tag.attrs?.id === "themvora-bootstrap")).toBe(
      false,
    );
  });
});
