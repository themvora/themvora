/**
 * Markup tag reading.
 *
 * These tests pin the attribute shapes the framework recognizers rely on:
 * Vue bindings, Svelte/Astro braces and shorthand, HTML strings, and the
 * exclusions that keep comments and script content out of the markup graph.
 */
import { describe, expect, it } from "vitest";

import { readMarkupTags } from "../src/domain/markup";
import { markupSkipRanges, readSourceDocument } from "../src/domain/sourceRegions";

describe("Vue attributes", () => {
  const source = '<ThemeProvider :themes="themes" :default-theme="light" disabled />';
  const [tag] = readMarkupTags(source, { tags: ["ThemeProvider"] });

  it("reads a bound expression and a boolean attribute", () => {
    expect(tag?.name).toBe("ThemeProvider");
    expect(tag?.attributes.get(":themes")).toMatchObject({
      kind: "quoted",
      value: "themes",
    });
    expect(tag?.attributes.get(":default-theme")?.value).toBe("light");
    expect(tag?.attributes.get("disabled")?.kind).toBe("boolean");
    expect(tag?.end).toBe(source.length);
  });
});

describe("Svelte attributes", () => {
  it("reads a braced expression and shorthand", () => {
    const source = "<ThemeProvider themes={themes} {transition} />";
    const [tag] = readMarkupTags(source, { tags: ["ThemeProvider"] });

    expect(tag?.attributes.get("themes")).toMatchObject({
      kind: "braced",
      value: "themes",
    });
    expect(tag?.attributes.get("transition")).toMatchObject({
      kind: "braced",
      value: "transition",
    });
  });

  it("marks a spread attribute", () => {
    const [tag] = readMarkupTags("<ThemeProvider {...props} />", {
      tags: ["ThemeProvider"],
    });

    expect(tag?.hasSpread).toBe(true);
  });
});

describe("Astro attributes", () => {
  it("reads an inline object expression", () => {
    const source = '<Provider config={{ themes: [oceanLight] }} lang="en" />';
    const [tag] = readMarkupTags(source, { tags: ["Provider"] });

    expect(tag?.attributes.get("config")?.value).toBe("{ themes: [oceanLight] }");
    expect(tag?.attributes.get("lang")?.value).toBe("en");
  });
});

describe("HTML attributes", () => {
  it("reads the provider's themes string", () => {
    const source =
      '<themvora-provider id="provider" themes="light dark oat-light" default-theme="oat-light">';
    const [tag] = readMarkupTags(source, { tags: ["themvora-provider"] });

    expect(tag?.name).toBe("themvora-provider");
    expect(tag?.attributes.get("themes")).toMatchObject({
      kind: "quoted",
      value: "light dark oat-light",
    });
    expect(tag?.attributes.get("default-theme")?.value).toBe("oat-light");
  });

  it("does not let a '>' inside a quoted value end the tag", () => {
    const source = '<ThemeProvider label="a > b" :themes="themes" />';
    const [tag] = readMarkupTags(source, { tags: ["ThemeProvider"] });

    expect(tag?.attributes.get(":themes")?.value).toBe("themes");
    expect(tag?.end).toBe(source.length);
  });
});

describe("exclusions", () => {
  it("skips comments", () => {
    const tags = readMarkupTags('<!-- <themvora-provider themes="ghost"> -->', {
      tags: ["themvora-provider"],
    });

    expect(tags).toEqual([]);
  });

  it("skips script content", () => {
    const source =
      '<script>const sample = \'<themvora-provider themes="ghost">\';</script>' +
      '<themvora-provider themes="real"></themvora-provider>';
    const document = readSourceDocument("index.html", source);
    const tags = readMarkupTags(document.text, {
      skip: markupSkipRanges(document),
      tags: ["themvora-provider"],
    });

    expect(tags).toHaveLength(1);
    expect(tags[0]?.attributes.get("themes")?.value).toBe("real");
  });

  it("returns only the requested tag names", () => {
    const tags = readMarkupTags(
      '<ThemeProvider :themes="a" /><ThemeScrollbar /><div></div>',
      { tags: ["ThemeProvider"] },
    );

    expect(tags.map((tag) => tag.name)).toEqual(["ThemeProvider"]);
  });
});
