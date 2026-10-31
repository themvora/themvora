// @vitest-environment node
//
// Node, not jsdom: `astro/container` compiles the component with esbuild, and
// jsdom replaces the global `TextEncoder` with an implementation esbuild
// refuses to run against. Nothing here needs a DOM — the assertions are on the
// rendered string.
import { describe, expect, it } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { defineTheme, type ThemeDefinition } from "@themvora/core";
import ThemeScope from "../src/ThemeScope.astro";

/**
 * Contract tests for the native `ThemeScope.astro`.
 *
 * These assert the **server** markup, because that is the entire reason the
 * component exists: a scope whose variables are applied from a `<script>` emits
 * a bare wrapper, and everything inside it paints with the page theme and is
 * then repainted. Anything that only shows up after the client script runs is
 * not this component's contract — the browser gate
 * (`scripts/release/verify-astro-interaction.mjs`) covers the live behaviour.
 */

const light = defineTheme({
  name: "cocoa-light",
  meta: { family: "cocoa", mode: "light" },
  tokens: { colors: { background: "#faf6f1", foreground: "#241a12" } },
});

const dark = defineTheme({
  name: "cocoa-dark",
  meta: { family: "cocoa", mode: "dark" },
  tokens: { colors: { background: "#1a1310", foreground: "#f5ece3" } },
});

const oceanDark = defineTheme({
  name: "ocean-dark",
  meta: { family: "ocean", mode: "dark" },
  tokens: { colors: { background: "#0b1a2b", foreground: "#e2eefc" } },
});

const themes: readonly ThemeDefinition[] = [light, dark, oceanDark];

async function render(
  props: Record<string, unknown>,
  slot = "<p>inside</p>",
): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(ThemeScope, {
    props,
    slots: { default: slot },
  });
}

/** Pulls the wrapper element's opening tag out of the rendered markup. */
function openTag(html: string): string {
  const match = html.match(/<div[^>]*>/);
  if (!match) throw new Error(`no wrapper element in: ${html}`);
  return match[0];
}

describe("ThemeScope.astro — server-rendered contract", () => {
  it("writes the scoped variables into the markup, not into a script", async () => {
    const html = await render({ theme: "cocoa-dark", themes });

    // The value, not the variable name: the point is that the first paint is
    // already the scoped one.
    expect(html).toContain("--theme-color-background:#1a1310");
    expect(html).toContain("--theme-color-foreground:#f5ece3");
    // And nothing from the page theme leaked in.
    expect(html).not.toContain("#faf6f1");
  });

  it("marks the wrapper with the theme name so the client script can find it", async () => {
    const html = await render({ theme: "cocoa-dark", themes });

    expect(openTag(html)).toContain('data-tv-scope="cocoa-dark"');
  });

  it("adds the dark class for a dark theme and omits it for a light one", async () => {
    const darkHtml = await render({ theme: "cocoa-dark", themes });
    const lightHtml = await render({ theme: "cocoa-light", themes });

    // Tailwind's `dark:` variants key off this class, and the binding only adds
    // it once the client runs — so without it here, scoped content using
    // `dark:` utilities would flash.
    expect(openTag(darkHtml)).toMatch(/class="[^"]*\bdark\b/);
    expect(openTag(lightHtml)).not.toMatch(/class="[^"]*\bdark\b/);
  });

  it("forwards id and class without dropping the dark marker", async () => {
    const html = await render({
      theme: "cocoa-dark",
      themes,
      id: "panel",
      class: "rounded border p-4",
    });

    const tag = openTag(html);
    expect(tag).toContain('id="panel"');
    expect(tag).toContain("rounded");
    expect(tag).toContain("border");
    expect(tag).toContain("dark");
  });

  it("renders the element named by `as`", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ThemeScope, {
      props: { theme: "cocoa-dark", themes, as: "section" },
      slots: { default: "<p>inside</p>" },
    });

    expect(html).toContain("<section");
    expect(html).toContain("</section>");
  });

  it("keeps two scopes on one page independent", async () => {
    // A single component rendered twice is the shape that broke the selection
    // controls: anything keyed by an id or a module-level singleton collides
    // here.
    const a = await render({ theme: "cocoa-dark", themes });
    const b = await render({ theme: "ocean-dark", themes });

    expect(a).toContain("#1a1310");
    expect(b).toContain("#0b1a2b");
    expect(b).not.toContain("#1a1310");
  });

  it("escapes a theme name that would otherwise break out of the attribute", async () => {
    const hostile = defineTheme({
      name: 'evil" onmouseover="alert(1)' as unknown as "evil",
      meta: { family: "evil", mode: "light" },
      tokens: { colors: { background: "#ffffff" } },
    });

    const html = await render({
      theme: hostile.name as unknown as string,
      themes: [hostile as unknown as ThemeDefinition],
    });

    // The raw sequence must not appear, and the quote must be entity-encoded so
    // the injected text stays *inside* the attribute value. Which entity is
    // emitted is the compiler's business and changed with Astro 7's Rust
    // compiler — `&#34;` before, `&quot;` now — so both are accepted and only
    // the raw character is rejected.
    expect(html).not.toContain('onmouseover="alert(1)"');
    expect(html).toMatch(/onmouseover=(?:&quot;|&#0?34;)alert\(1\)/);
    expect(html).not.toMatch(/data-tv-scope="evil"[^>]*\sonmouseover=/);
  });

  it("fails loudly for a theme that is not in the registry", async () => {
    // A silent fallback would render the panel with the page theme and look
    // like a styling bug in the caller's app.
    await expect(render({ theme: "nope", themes })).rejects.toThrow(
      /ThemeScope: theme "nope" is not in the registry \(cocoa-light, cocoa-dark, ocean-dark\)/,
    );
  });
});
