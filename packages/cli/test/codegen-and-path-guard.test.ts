import { describe, expect, it } from "vitest";
import { win32, posix } from "node:path";
import { defineTheme } from "@themvora/core";
import { resolveInsideProject } from "../src/init/apply.js";
import { renderThemesModule } from "../src/init/adapters/themes-module.js";
import type { InitSourceSummary } from "../src/init/types.js";

/**
 * F14 — the generated `themes/themes.ts` wrote family names into a TypeScript
 * array as `"${family}"`. A family is free text (a seed source can carry one),
 * so a quote, a backslash or a newline produced invalid — or silently
 * different — TypeScript in the user's registry. Theme bodies already used
 * `JSON.stringify`; only this list did not.
 *
 * F15 — `resolveInsideProject` rejected a same-drive `..` traversal but let an
 * absolute path on a **different Windows drive** through: `relative()` returns
 * the target unchanged when no relative path exists between the two drives, and
 * that value neither starts with `..` nor contains `..\`. The same
 * `startsWith("..")` test also rejected legitimate names such as `..foo/a.ts`.
 */

const source: InitSourceSummary = {
  sources: ["preset:mint"],
  label: "preset mint",
  family: "mint",
  defaultTheme: "mint-light",
  themes: ["mint-light", "mint-dark"],
  modes: ["light", "dark"],
};

function theme(family: string, mode: "light" | "dark") {
  return defineTheme({
    name: `${family}-${mode}`,
    meta: { family, mode },
    tokens: {
      colors: { background: "#ffffff", foreground: "#111111", primary: "#0066cc" },
    },
  });
}

/** Pull the generated `selection` array out of the module source. */
function selectionLiteral(contents: string): string {
  const match = contents.match(/export const selection = \[(.*?)\];/s);
  expect(match).not.toBeNull();
  return match![1]!;
}

describe("generated TypeScript family escaping (F14)", () => {
  it("escapes a quote in a family name", () => {
    const family = `brand"quote`;
    const contents = renderThemesModule([theme(family, "light"), theme(family, "dark")], source);
    const literal = selectionLiteral(contents);

    // The generated literal is valid JavaScript/TypeScript and round-trips to
    // the original family.
    const parsed = new Function(`return [${literal}];`)() as string[];
    expect(parsed).toContain(family);
  });

  it("escapes a backslash and a newline in a family name", () => {
    const family = "brand\\path\nnewline";
    const contents = renderThemesModule([theme(family, "light"), theme(family, "dark")], source);
    const literal = selectionLiteral(contents);

    // A raw newline would have ended the string literal and made the module
    // fail to parse.
    expect(literal).not.toContain("\nnewline");
    const parsed = new Function(`return [${literal}];`)() as string[];
    expect(parsed).toContain(family);
  });

  it("escapes Unicode and script-like content without altering it", () => {
    const family = `ブランド</script>`;
    const contents = renderThemesModule([theme(family, "light"), theme(family, "dark")], source);
    const literal = selectionLiteral(contents);
    const parsed = new Function(`return [${literal}];`)() as string[];

    expect(parsed).toContain(family);
  });

  it("leaves ordinary family names byte-identical", () => {
    const contents = renderThemesModule([theme("mint", "light"), theme("mint", "dark")], source);

    expect(selectionLiteral(contents)).toContain('"mint"');
    expect(selectionLiteral(contents)).toContain('"citrus"');
  });

  it("keeps the registry structure around the list", () => {
    const contents = renderThemesModule([theme("mint", "light"), theme("mint", "dark")], source);

    expect(contents).toContain("export const selection = [");
    expect(contents).toContain("export const scopedFamily");
    expect(contents).toContain("getPresetThemes()");
  });
});

describe("Windows path guard (F15)", () => {
  const root = "C:\\proj";

  it("rejects an absolute path on a different drive", () => {
    expect(() =>
      resolveInsideProject(root, "D:/evil/f.ts", win32),
    ).toThrow(/outside the project root/);
  });

  it("rejects an absolute path on the same drive", () => {
    expect(() =>
      resolveInsideProject(root, "C:/Windows/system32/evil.ts", win32),
    ).toThrow(/outside the project root/);
  });

  it("rejects a same-drive traversal", () => {
    expect(() => resolveInsideProject(root, "../evil.ts", win32)).toThrow(
      /outside the project root/,
    );
    expect(() => resolveInsideProject(root, "a/../../evil.ts", win32)).toThrow(
      /outside the project root/,
    );
  });

  it("rejects a traversal written with backslashes", () => {
    expect(() => resolveInsideProject(root, "..\\..\\evil.ts", win32)).toThrow(
      /outside the project root/,
    );
  });

  it("rejects the project root itself", () => {
    expect(() => resolveInsideProject(root, "", win32)).toThrow(
      /outside the project root/,
    );
    expect(() => resolveInsideProject(root, ".", win32)).toThrow(
      /outside the project root/,
    );
  });

  it("accepts a legitimate name that starts with two dots", () => {
    const resolved = resolveInsideProject(root, "..foo/a.ts", win32);
    expect(resolved).toBe("C:\\proj\\..foo\\a.ts");
  });

  it("accepts legitimate nested paths", () => {
    expect(resolveInsideProject(root, "src/themes/index.ts", win32)).toBe(
      "C:\\proj\\src\\themes\\index.ts",
    );
  });

  it("keeps the POSIX rules working", () => {
    expect(() => resolveInsideProject("/proj", "../evil.ts", posix)).toThrow(
      /outside the project root/,
    );
    expect(() => resolveInsideProject("/proj", "/etc/passwd", posix)).toThrow(
      /outside the project root/,
    );
    expect(resolveInsideProject("/proj", "..foo/a.ts", posix)).toBe(
      "/proj/..foo/a.ts",
    );
  });

  it("uses the platform implementation by default", () => {
    // The default must not throw for an ordinary path on any host.
    expect(() => resolveInsideProject(process.cwd(), "src/a.ts")).not.toThrow();
    expect(() => resolveInsideProject(process.cwd(), "../a.ts")).toThrow(
      /outside the project root/,
    );
  });
});
