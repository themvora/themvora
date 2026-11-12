/**
 * The two styling variants, for every framework `init` can scaffold.
 *
 * The claim this file exists to defend is narrow and absolute: a project created
 * with `--styling css` contains **no** Tailwind — not a dependency, not an
 * import, not a directive, not a utility class, not a plugin — while the same
 * project created with `--styling tailwind` is the same application with the
 * same components, expressed in utilities that resolve to the same tokens.
 *
 * Both halves matter. A plain-CSS starter that had merely dropped the Tailwind
 * dependency would still render Tailwind class names into unstyled markup, and
 * a Tailwind starter that had lost a component would be a different application
 * behind the same flag.
 *
 * The adapters are exercised directly, against a synthetic scaffold context, so
 * the matrix runs without a generator, a network call or a temp project. The
 * install path is covered separately, through the command, in
 * `init-styling-install.test.ts`.
 */
import { describe, expect, it } from "vitest";

import { nextAdapter } from "../src/init/adapters/next.js";
import { reactAdapter } from "../src/init/adapters/react.js";
import { solidAdapter } from "../src/init/adapters/solid.js";
import { svelteAdapter } from "../src/init/adapters/svelte.js";
import { vueAdapter } from "../src/init/adapters/vue.js";
import { showcaseClasses } from "../src/init/adapters/showcase-classes.js";
import {
  CSS_SNIPPET,
  TAILWIND_SNIPPET,
  TAILWIND_SNIPPET_CLASS,
} from "../src/init/adapters/showcase-content.js";
import type { FrameworkAdapter, IntegrationContext } from "../src/init/adapters/context.js";
import { INIT_FRAMEWORKS } from "../src/frameworks.js";
import type { FileOperation, StylingEngine } from "../src/init/types.js";

const ADAPTERS: Record<string, FrameworkAdapter> = {
  react: reactAdapter,
  next: nextAdapter,
  vue: vueAdapter,
  svelte: svelteAdapter,
  solid: solidAdapter,
};

/** Every framework the matrix covers, asserted against the registry below. */
const FRAMEWORKS = ["react", "next", "vue", "svelte", "solid"] as const;

const SOURCE = {
  sources: ['{"kind":"preset","id":"mint"}'],
  label: "preset mint",
  family: "mint",
  defaultTheme: "mint-light",
  themes: ["mint-light", "mint-dark"],
  modes: ["light", "dark"] as const,
};

const IMPORTS = {
  adapter: "@themvora/react",
  client: "@themvora/react/client",
  core: "@themvora/core",
  vite: "@themvora/core/vite",
};

/** A context for a project `init` just scaffolded, with the given files present. */
function scaffoldContext(
  framework: string,
  styling: StylingEngine,
  files: Record<string, string> = {},
): IntegrationContext {
  return {
    projectPath: "/tmp/unused",
    projectName: "my-app",
    projectKind: "missing",
    styling,
    example: false,
    force: false,
    source: SOURCE,
    themes: [],
    imports: IMPORTS,
    read: (path: string) => files[path] ?? null,
    exists: (path: string) => files[path] !== undefined,
    listProjectFiles: () => Object.keys(files),
  } satisfies IntegrationContext & { framework: string };
}

/**
 * The files each official generator leaves behind, reduced to the ones the
 * integration edits.
 *
 * A Vite project without a `vite.config.ts` is not a Vite project — the plugin
 * registration has nowhere to go, and the adapter correctly degrades to a manual
 * step. Supplying the config is what makes the matrix test the real path.
 */
function scaffoldFiles(framework: string): Record<string, string> {
  const viteConfig = (plugin: string) =>
    `import { defineConfig } from "vite";\nimport ${plugin} from "${plugin}";\n\nexport default defineConfig({\n  plugins: [${plugin}()],\n});\n`;

  switch (framework) {
    case "react":
      return { "vite.config.ts": viteConfig("react") };
    case "vue":
      return { "vite.config.ts": viteConfig("vue") };
    case "svelte":
      return { "vite.config.ts": viteConfig("svelte") };
    case "solid":
      return { "vite.config.ts": viteConfig("solid") };
    default:
      return {};
  }
}

/** Integrate one framework in one styling mode. */
function integrate(framework: string, styling: StylingEngine) {
  const adapter = ADAPTERS[framework]!;
  const result = adapter.integrate(
    scaffoldContext(framework, styling, scaffoldFiles(framework)),
  );
  const written = result.files.filter(
    (file): file is FileOperation & { contents: string } =>
      file.action === "create" || file.action === "update",
  );
  return { result, files: written };
}

/** The concatenation of every file the integration writes. */
function allContents(files: readonly { contents: string }[]): string {
  return files.map((file) => file.contents).join("\n");
}

/**
 * The generated sources, with the two documentation snippets removed.
 *
 * The showcase *displays* a Tailwind snippet and a CSS snippet side by side —
 * that is the page's point, and the snippet is text, not markup. Stripping those
 * constants first is what lets the sweep below mean "no Tailwind in the
 * application" rather than "no Tailwind in the prose".
 */
function sourcesWithoutSnippets(files: readonly { path: string; contents: string }[]): string {
  return files
    .filter((file) => !file.path.endsWith("themes.ts"))
    .map((file) =>
      file.contents
        .replaceAll(TAILWIND_SNIPPET, "")
        .replaceAll(TAILWIND_SNIPPET_CLASS, "")
        .replaceAll(CSS_SNIPPET, ""),
    )
    .join("\n");
}

/** Every value a `class=`/`className=` attribute carries, tokenised. */
function classTokens(contents: string): string[] {
  const tokens: string[] = [];
  for (const match of contents.matchAll(/(?:class|className)="([^"]*)"/g)) {
    tokens.push(...(match[1] ?? "").split(/\s+/).filter(Boolean));
  }
  return tokens;
}

/** The Tailwind utilities, as whole tokens, that a plain-CSS project must not contain. */
function tailwindTokens(): Set<string> {
  const tokens = new Set<string>();
  for (const value of Object.values(showcaseClasses("tailwind"))) {
    for (const token of value.split(/\s+/)) {
      if (token.length > 0) tokens.add(token);
    }
  }
  return tokens;
}

describe("the matrix covers every init-supported framework", () => {
  it("has an adapter and a case for each registered framework", () => {
    expect([...FRAMEWORKS].sort()).toEqual(INIT_FRAMEWORKS.map((entry) => entry.id).sort());
    for (const framework of FRAMEWORKS) {
      expect(ADAPTERS[framework], `${framework} has no adapter`).toBeDefined();
    }
  });
});

describe.each(FRAMEWORKS)("%s — plain CSS", (framework) => {
  const { result, files } = integrate(framework, "css");

  it("writes no Tailwind dependency, import, directive or plugin", () => {
    const contents = allContents(files).toLowerCase();
    expect(contents).not.toContain("tailwind");
    expect(contents).not.toContain("@theme");
    expect(contents).not.toContain("@import \"tailwindcss\"");
    expect(result.packages ?? []).not.toContain("@themvora/tailwind");
    expect(result.devDependencies ?? {}).toEqual({});
  });

  it("writes no Tailwind utility class into its markup", () => {
    const tokens = classTokens(sourcesWithoutSnippets(files));
    expect(tokens.length).toBeGreaterThan(20);

    const utilities = tailwindTokens();
    const leaked = tokens.filter((token) => utilities.has(token));
    expect(leaked, `Tailwind utilities found in ${framework} plain-CSS markup`).toEqual([]);
  });

  it("styles the markup with the component classes its stylesheet defines", () => {
    const stylesheet = files.find((file) => file.path.endsWith(".css"));
    expect(stylesheet, `${framework} must write a stylesheet`).toBeDefined();

    // Only classes the generated markup actually renders are required to have a
    // rule — the vocabulary also carries entries no element uses.
    const rendered = new Set(classTokens(sourcesWithoutSnippets(files)));
    const vocabulary = new Set(
      Object.values(showcaseClasses("css")).flatMap((value) => value.split(/\s+/)),
    );
    const unstyled = [...rendered].filter(
      (token) => vocabulary.has(token) && !stylesheet!.contents.includes(`.${token}`),
    );
    expect(unstyled, `${framework} stylesheet is missing component rules`).toEqual([]);
  });

  it("uses the Themvora tokens rather than a literal palette", () => {
    const stylesheet = files.find((file) => file.path.endsWith(".css"))!;
    expect(stylesheet.contents).toContain("var(--theme-color-background)");
    expect(stylesheet.contents).toContain("var(--theme-color-foreground)");
    // No hex colour outside the font import: a literal palette would not follow
    // a theme switch.
    expect(stylesheet.contents.replace(/@import url\([^)]*\);/, "")).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe.each(FRAMEWORKS)("%s — Tailwind CSS", (framework) => {
  const { result, files } = integrate(framework, "tailwind");

  it("imports Tailwind and Themvora's token mapping", () => {
    const stylesheet = files.find((file) => file.path.endsWith(".css"))!;
    expect(stylesheet.contents).toContain('@import "tailwindcss"');
    expect(stylesheet.contents).toContain('@import "@themvora/tailwind"');
    expect(stylesheet.contents).toContain("var(--theme-color-background)");
  });

  it("installs @themvora/tailwind and the framework's own plugin", () => {
    expect(result.packages).toContain("@themvora/tailwind");

    const devDependencies = result.devDependencies ?? {};
    expect(devDependencies["tailwindcss"]).toMatch(/^\^4\./);
    const plugin = framework === "next" ? "@tailwindcss/postcss" : "@tailwindcss/vite";
    expect(Object.keys(devDependencies).sort()).toEqual([plugin, "tailwindcss"].sort());
  });

  it("registers the plugin in the framework's build configuration", () => {
    const paths = files.map((file) => file.path);
    if (framework === "next") {
      expect(paths).toContain("postcss.config.mjs");
      const postcss = files.find((file) => file.path === "postcss.config.mjs")!;
      expect(postcss.contents).toContain("@tailwindcss/postcss");
    } else {
      const vite = files.find((file) => file.path === "vite.config.ts")!;
      expect(vite.contents).toContain('import tailwindcss from "@tailwindcss/vite"');
      expect(vite.contents).toMatch(/plugins: \[tailwindcss\(\), /);
    }
  });

  it("expresses the same design in utilities, not in component classes", () => {
    const classes = showcaseClasses("tailwind");
    const contents = sourcesWithoutSnippets(files);
    const tokens = new Set(classTokens(contents));

    // The Tailwind vocabulary is what the markup actually renders…
    const expected = classes.card.split(" ").filter((token) => token.length > 0);
    for (const token of expected) {
      expect(tokens.has(token), `${framework} should render \`${token}\``).toBe(true);
    }

    // …and the plain-CSS vocabulary is absent, because this variant defines no
    // component classes at all — a `class="card"` here would be unstyled.
    const plain = new Set(
      Object.values(showcaseClasses("css")).flatMap((value) => value.split(/\s+/)),
    );
    const leaked = [...tokens].filter((token) => plain.has(token));
    expect(leaked, `${framework} rendered plain-CSS classes in Tailwind mode`).toEqual([]);
  });

  it("still shows the Tailwind snippet in its documentation card", () => {
    // The teaching card compares the two ways to consume the tokens, and a
    // Tailwind project is where that comparison is most useful.
    expect(allContents(files)).toContain("bg-primary px-4 py-2 text-primary-foreground");
  });
});

describe("both variants produce the same application", () => {
  it.each(FRAMEWORKS)("%s keeps its provider, themes and showcase in both modes", (framework) => {
    for (const styling of ["css", "tailwind"] as const) {
      const { files } = integrate(framework, styling);
      const paths = files.map((file) => file.path);

      expect(paths.some((path) => path.endsWith("themes.ts")), `${framework}/${styling} themes`).toBe(
        true,
      );
      expect(
        paths.filter((path) => path.includes("ThemvoraDefault")).length,
        `${framework}/${styling} showcase`,
      ).toBe(1);
      expect(
        paths.filter((path) => path.includes("ThemeSwitcher")).length,
        `${framework}/${styling} switcher`,
      ).toBe(1);

      const contents = allContents(files);
      expect(contents, `${framework}/${styling} provider`).toContain("ThemeProvider");
    }
  });

  it.each(FRAMEWORKS)("%s writes the same application files in both modes", (framework) => {
    // The only file the styling choice may add is the build configuration that
    // registers Tailwind's plugin.
    const buildConfig = new Set(["vite.config.ts", "postcss.config.mjs"]);
    const css = integrate(framework, "css")
      .files.map((file) => file.path)
      .filter((path) => !buildConfig.has(path))
      .sort();
    const tailwind = integrate(framework, "tailwind")
      .files.map((file) => file.path)
      .filter((path) => !buildConfig.has(path))
      .sort();
    expect(tailwind).toEqual(css);
  });
});
