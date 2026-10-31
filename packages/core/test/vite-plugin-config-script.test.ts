// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { defineTheme } from "../src/model";
import { themvoraVitePlugin } from "../src/vite-plugin";

/**
 * F3 — `transformIndexHtml` emitted the `themvora-config` script **twice**. The
 * second copy was the same block pasted again with
 * `.replace(/</g, "\u003c")`, which in JavaScript source is
 * `.replace(/</g, "<")` — a no-op. So the page carried two
 * `<script id="themvora-config">` elements, `window.__THEMVORA_CONFIG__` was
 * assigned twice, and the surviving escape did not protect the value anyway.
 *
 * The assertions below are on the descriptor list the hook returns, because
 * that is what Vite turns into HTML.
 */

const TERMINATOR = "</script><script>window.__PWNED__=1</script>";

const themes = [
  defineTheme({
    name: `probe-light${TERMINATOR}`,
    meta: { family: `probe${TERMINATOR}`, mode: "light" },
    tokens: {
      colors: { background: "</script>", foreground: "#111111", primary: "#0066cc" },
    },
  }),
  defineTheme({
    name: "probe-dark",
    meta: { family: "probe", mode: "dark" },
    tokens: {
      colors: { background: "#101010", foreground: "#eeeeee", primary: "#3399ff" },
    },
  }),
] as const;

type InjectedTag = {
  tag: string;
  attrs?: Record<string, string>;
  children?: string;
  injectTo?: string;
};

async function transform(html = "<html><head></head><body></body></html>") {
  const plugin = themvoraVitePlugin({
    config: { themes, defaultTheme: themes[0].name },
  });
  const result = await plugin.transformIndexHtml!(html);
  return (Array.isArray(result) ? result : []) as InjectedTag[];
}

describe("Vite plugin config script (F3)", () => {
  it("emits exactly one themvora-config script", async () => {
    const tags = await transform();
    const configTags = tags.filter((tag) => tag.attrs?.id === "themvora-config");

    expect(configTags).toHaveLength(1);
  });

  it("assigns window.__THEMVORA_CONFIG__ exactly once", async () => {
    const tags = await transform();
    const children = tags
      .filter((tag) => tag.attrs?.id === "themvora-config")
      .map((tag) => tag.children ?? "")
      .join("\n");

    expect(children.match(/__THEMVORA_CONFIG__/g) ?? []).toHaveLength(1);
  });

  it("serializes theme data safely for script content", async () => {
    const tags = await transform();
    const children =
      tags.find((tag) => tag.attrs?.id === "themvora-config")?.children ?? "";

    // No raw markup delimiter: the value cannot end the element.
    expect(children).not.toContain("</script");
    expect(children).toContain("\\u003c/script");

    // Still a single valid assignment expression.
    expect(() => new Function(children)).not.toThrow();
    expect(
      (window as unknown as { __PWNED__?: number }).__PWNED__,
    ).toBeUndefined();
  });

  it("emits one bootstrap and one readouts script as before", async () => {
    const tags = await transform();
    const ids = tags.map((tag) => tag.attrs?.id);

    expect(ids.filter((id) => id === "themvora-bootstrap")).toHaveLength(1);
    expect(ids.filter((id) => id === "themvora-readouts")).toHaveLength(1);
  });
});
