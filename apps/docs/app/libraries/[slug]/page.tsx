import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { use } from "react";

import { DocsLayout } from "../../../components/docs-layout";
import { CodeBlock } from "../../../components/code-block";
import { CodeExample } from "../../../components/code-example";
import { ApiExplorer } from "../../../components/api-explorer";
import { PageHeader } from "../../../components/ui/page-header";
import { ADAPTER_FAMILY } from "../../../lib/framework-support";
import {
  LibraryRecipe,
  type RecipeFrameworkExample,
} from "../../../components/library-recipe";
import { Prerequisites } from "../../../components/ui/prerequisites";
import { NextSteps } from "../../../components/ui/next-step-card";
import { RelatedLinks } from "../../../components/ui/related-links";
import { InlineCode } from "../../../components/ui/inline-code";
import { libraries } from "../../../lib/libraries";
import { libraryCompatibilityData } from "../../../lib/compatibility-data";
import { contractForSlug, coreRelationFor } from "../../../lib/package-contracts";
import { libraryUseCases } from "../../../lib/use-cases-libraries";
import { highlightCode } from "../../../lib/highlight";
import {
  highlightedVariants,
  compatibilityBadge,
  type CodeVariant,
} from "../../../lib/code-variants";
import { PKG_VERSION, getPackageVersion } from "../../../lib/version";
import { docsUrl } from "../../../lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * The provider component each generated-theme adapter exports.
 *
 * Only the adapters that build a native theme object have one; the CSS-variable
 * adapters install through a hook instead, so they map to nothing.
 */
const PROVIDER_BY_SLUG: Record<string, string> = {
  mui: "MuiThemeProvider",
  chakra: "ChakraThemeProvider",
  antd: "AntdThemeProvider",
  mantine: "MantineThemeProvider",
};

/** One file inside a recipe snippet. */
export type RecipeFile = {
  filename?: string | undefined;
  code: string;
  html: string;
  lang: string;
  /** Both language forms, when the snippet has a JavaScript counterpart. */
  variants?: CodeVariant[] | undefined;
  /** The compatibility badge — `TS / JS`, `TSX / JSX`, `TS`, … */
  displayLanguage?: string | undefined;
};

/** A snippet, as one or more files. */
export type RecipeBlock = { lang: string; files: RecipeFile[] };

/**
 * The banner that separates files inside a single authored snippet:
 * `// ---- app/layout.tsx` (also `<!-- ---- x.astro -->`).
 */
const FILE_BANNER =
  /^(?:\/\/|<!--)\s*-{3,}\s*([\w./@-]+\.[a-z]{2,6})\s*(?:-->)?$/;

function splitRecipeFiles(
  code: string,
  lang: string,
  framework?: string,
): RecipeFile[] {
  const lines = code.split("\n");
  type Chunk = { filename?: string | undefined; body: string[] };
  const chunks: Chunk[] = [];
  let current: Chunk = { body: [] };

  for (const line of lines) {
    const m = line.trim().match(FILE_BANNER);
    if (m) {
      if (current.body.length || current.filename) chunks.push(current);
      current = { filename: m[1], body: [] };
      continue;
    }
    current.body.push(line);
  }
  if (current.body.length || current.filename) chunks.push(current);

  // A single-file snippet declares its path in a leading comment. That comment is
  // the filename source — and then it is **removed**, because the block toolbar
  // already shows the path.
  //
  // Without this, two blocks in the same section render differently: a
  // banner-split block shows the path once (in the toolbar), while a single-file
  // block shows it twice (inline and in the toolbar). The reader sees the same
  // information presented two ways and has to work out that it means the same
  // thing.
  const only = chunks[0];
  if (chunks.length === 1 && only && !only.filename) {
    const first = only.body[0]?.trim() ?? "";
    const lead = first.match(/^(?:\/\/|<!--|#)\s*([\w./@-]+\.[a-z]{2,6})/);
    if (lead) {
      only.filename = lead[1];
      if (first.startsWith("<!--") && !first.endsWith("-->")) {
        // Multi-line HTML comment — drop through its closing marker.
        let i = 0;
        while (i < only.body.length && !(only.body[i] ?? "").includes("-->"))
          i += 1;
        only.body.splice(0, i + 1);
      } else {
        only.body.splice(0, 1);
      }
      // and the blank line the comment usually leaves behind
      if ((only.body[0] ?? "").trim() === "") only.body.splice(0, 1);
    }
  }

  return chunks.map((c) => {
    const body = c.body.join("\n").replace(/^\n+|\n+$/g, "");
    const variants = highlightedVariants(
      {
        code: body,
        lang,
        ...(framework ? { framework } : {}),
        ...(c.filename ? { filename: c.filename } : {}),
      },
      highlightCode,
    );
    return {
      filename: c.filename,
      code: body,
      html: variants?.[0]?.html ?? highlightCode(body, lang),
      lang,
      // The badge describes this file's own source, so it is derived per chunk
      // rather than per authored snippet: two files in one snippet can differ.
      ...compatibilityBadge(body, lang, framework),
      ...(variants ? { variants } : {}),
    };
  });
}

function anchor(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateStaticParams() {
  return libraries.map((lib) => ({ slug: lib.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const lib = libraries.find((l) => l.slug === slug);
  if (!lib) return { title: "Library" };
  return {
    title: lib.name,
    description: lib.tagline,
    alternates: { canonical: docsUrl(`/libraries/${slug}`) },
  };
}

/**
 * The sentence above the framework picker.
 *
 * It has to describe the adapter's **actual mechanism**, because the two families
 * work differently and the previous copy claimed otherwise — it said every
 * adapter was "a hook, composable, directive or custom element depending on your
 * stack", which is false for a library that ships a React provider and nothing
 * else.
 */
function frameworkPickerIntro(slug: string, name: string): string {
  if (ADAPTER_FAMILY[slug] === "provider") {
    return `The adapter derives a ${name} theme from Themvora semantic tokens and connects it to ${name}'s own theme system. Pick the framework you are building in — every snippet below follows that choice.`;
  }
  if (ADAPTER_FAMILY[slug] === "css-variable") {
    return `The adapter writes ${name}'s own CSS custom properties from Themvora semantic tokens, so ${name}'s classes and components follow the active theme. Pick the framework you are building in — every snippet below follows that choice.`;
  }
  return `The mapping is compiled into the preset at build time. Pick the framework you are building in — every snippet below follows that choice.`;
}

export default function LibraryGuidePage({ params }: PageProps) {
  const { slug } = use(params);
  const lib = libraries.find((l) => l.slug === slug);
  if (!lib) notFound();

  // Every snippet below the framework picker follows that choice, so each one is
  // highlighted here (shiki is server-side) and the client only picks a block.
  //
  // A snippet may open with its own path comment (`// app/root.tsx`) — that is
  // the file name, and it is lifted into the block toolbar rather than repeated
  // in the body.
  const filenameOf = (code: string) => {
    const first = code.split("\n")[0]?.trim() ?? "";
    const match = first.match(/^(?:\/\/|#|<!--)\s*(\S+\.[a-z]+)\s*(?:-->)?$/i);
    return match?.[1];
  };

  /**
   * The highlighter for one file, from its own extension.
   *
   * A recipe section is often several files with different grammars — a
   * `vite.config.ts`, a `tsconfig.json` and a `globals.css` in one "configure"
   * step. Highlighting them all with the snippet's declared language renders
   * CSS as TypeScript and labels it wrong in the toolbar, so each file is
   * re-highlighted with the grammar its filename implies.
   */
  const langForFile = (filename: string | undefined, fallback: string) => {
    const ext = filename?.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "css":
        return "css";
      case "json":
        return "json";
      case "html":
        return "html";
      case "vue":
        return "vue";
      case "svelte":
        return "svelte";
      case "astro":
        return "astro";
      case "tsx":
        return "tsx";
      case "ts":
        return "ts";
      case "js":
      case "mjs":
      case "cjs":
        return "js";
      default:
        return fallback;
    }
  };

  // `framework` is the recipe's own framework, and it is what makes Angular's
  // snippets TypeScript-only (see `TYPESCRIPT_ONLY_FRAMEWORKS`).
  const hl = (
    snippet: { lang: string; code: string } | undefined,
    framework?: string,
  ): RecipeBlock | undefined => {
    if (!snippet) return undefined;
    const files = splitRecipeFiles(
      snippet.code,
      snippet.lang,
      framework,
    ).map((file) => {
      const lang = langForFile(file.filename, file.lang);
      if (lang === file.lang) return file;
      const variants = highlightedVariants(
        {
          code: file.code,
          lang,
          ...(framework ? { framework } : {}),
          ...(file.filename ? { filename: file.filename } : {}),
        },
        highlightCode,
      );
      return {
        ...file,
        lang,
        html: variants?.[0]?.html ?? highlightCode(file.code, lang),
        ...(variants ? { variants } : {}),
        ...compatibilityBadge(file.code, lang, framework),
      };
    });
    return { lang: snippet.lang, files };
  };

  const frameworkExamples: RecipeFrameworkExample[] = (
    lib.frameworks ?? []
  ).map((f) => ({
    label: f.label,
    lang: f.lang,
    codeHtml: highlightCode(f.code, f.lang),
    ...compatibilityBadge(f.code, f.lang, f.label),
    codeVariants: highlightedVariants(
      {
        code: f.code,
        lang: f.lang,
        framework: f.label,
        ...(filenameOf(f.code) ? { filename: filenameOf(f.code)! } : {}),
      },
      highlightCode,
    ),
    ...(filenameOf(f.code) ? { filename: filenameOf(f.code)! } : {}),
    install: f.install ?? [],
    themvora: f.themvora ?? [],
    ...(f.setup ? { setup: hl(f.setup, f.label) } : {}),
    ...(f.mountProvider ? { mountProvider: hl(f.mountProvider, f.label) } : {}),
    code: hl({ lang: f.lang, code: f.code }, f.label)!,
    ...(f.componentExample
      ? { componentExample: hl(f.componentExample, f.label) }
      : {}),
    ...(f.themeSwitchExample
      ? { themeSwitchExample: hl(f.themeSwitchExample, f.label) }
      : {}),
    ...(f.completeExample
      ? { completeExample: hl(f.completeExample, f.label) }
      : {}),
    ...(f.prereqs ? { prereqs: f.prereqs } : {}),
  }));

  const useCases = libraryUseCases[lib.slug] ?? [];
  const content = (
    <article className="min-w-0">
      <PageHeader
        icon={lib.icon}
        title={`Themvora + ${lib.name}`}
        subtitle={lib.pkg}
        description={lib.tagline}
        badges={[
          {
            label:
              lib.architecture === "generated-theme"
                ? "Generated theme"
                : lib.architecture === "build-time"
                  ? "Build-time"
                  : "CSS variables",
          },
          ...lib.tags.map((tag) => ({ label: tag })),
        ]}
        verified={{
          version: getPackageVersion(lib.slug) ?? PKG_VERSION,
          date: "",
        }}
      />

      {/*
            Install the library first, then the adapter.

            The page used to assume the UI library was already there, which is a
            dead end for anyone who arrives at /libraries/mui from a search
            rather than from our own getting-started flow.
          */}

      {frameworkExamples.length > 0 && (
        <LibraryRecipe
          slug={lib.slug}
          libraryName={lib.name}
          description={frameworkPickerIntro(lib.slug, lib.name)}
          examples={frameworkExamples}
          officialUrl={lib.officialUrl}
          architecture={lib.architecture}
          className="mt-10 scroll-mt-24"
        />
      )}


      <Prerequisites
        className="mt-10"
        items={[
          {
            label: "Core Package",
            value:
              contractForSlug(lib.slug) &&
              coreRelationFor(contractForSlug(lib.slug)!) === "dependency"
                ? "@themvora/core (normal dependency — installed with the adapter)"
                : "@themvora/core (required)",
          },
          {
            label: "Library Version",
            value:
              libraryCompatibilityData.find(
                (entry) => entry.package === lib.pkg,
              )?.libraryVersion ?? "See the library's own installation guide",
          },
          {
            label: "Adapter Type",
            value: lib.kind,
          },
        ]}
      />

      <section id="whats-available" className="mt-10 scroll-mt-24">
        <h2 className="text-lg font-semibold tracking-tight">
          What's Available
        </h2>
        <p className="text-sm opacity-70 mt-1 mb-4">
          <code className="mono text-[0.9em]">{lib.pkg}</code> ships{" "}
          {lib.featureCount} exports in {lib.groups.length} categories. Click
          any export to reveal what it does and how to use it — or see{" "}
          <a href={`/libraries/${slug}/examples`} className="underline">
            worked examples for every export
          </a>
          .
        </p>
        <ApiExplorer groups={lib.groups} slug={lib.slug} />
      </section>

      {useCases.length > 0 && (
        <section id="use-cases" className="mt-10 scroll-mt-24">
          <h2 className="text-lg font-semibold tracking-tight">Use Cases</h2>
          <p className="text-sm opacity-70 mt-1 mb-4">
            The important features in practice — copy any of these straight into
            your app.
          </p>
          <div className="flex flex-col gap-8">
            {useCases.map((useCase) => (
              <div key={useCase.title}>
                <h3 className="text-sm font-semibold mb-0.5">
                  {useCase.title}
                </h3>
                <p className="text-xs opacity-60 mb-2">
                  <InlineCode>{useCase.desc}</InlineCode>
                </p>
                <CodeExample
                  code={useCase.code}
                  lang={useCase.lang}
                  filename={useCase.title}
                  className="rounded-lg m-0"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="more-examples" className="mt-10 scroll-mt-24">
        <h2 className="text-lg font-semibold tracking-tight">More Examples</h2>
        <p className="text-sm opacity-70 mt-1 mb-3">
          {lib.kind === "CSS Variables"
            ? "Static variable maps for build-time CSS, and manual adapter lifecycle control."
            : lib.kind === "Generated Theme"
              ? "Static themes generated from concrete tokens, and runtime subscriptions."
              : "Static UnoCSS theme objects for build-time generation."}
        </p>
        <CodeExample
          code={lib.snippet2.code}
          lang={lib.snippet2.lang}
          filename={lib.snippet2.title}
          className="rounded-lg m-0"
        />
      </section>

      <section id="api" className="mt-10 scroll-mt-24">
        <h2 className="text-lg font-semibold tracking-tight">API Reference</h2>
        <div className="flex flex-col gap-8 mt-4">
          {lib.groups.map((group, groupIndex) => {
            const base = anchor(group.label);
            const count = lib.groups
              .slice(0, groupIndex)
              .filter((g) => anchor(g.label) === base).length;
            const sectionId = `api-${base}${count > 0 ? `-${count + 1}` : ""}`;
            return (
              <section
                key={`${group.label}-${groupIndex}`}
                id={sectionId}
                className="scroll-mt-24"
              >
                <h3 className="text-sm font-semibold uppercase tracking-widest opacity-50 mb-2">
                  {group.label}
                </h3>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">
                          Export
                        </th>
                        <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.features.map((feature) => (
                        <tr
                          key={feature.name}
                          className="border-b border-border last:border-0 align-top"
                        >
                          <td className="px-4 py-3">
                            <code
                              className="mono text-[0.85em] font-semibold"
                              style={{
                                color: "var(--theme-color-primary)",
                              }}
                            >
                              {feature.name}
                            </code>
                          </td>
                          <td className="px-4 py-3 opacity-70 leading-relaxed">
                            <InlineCode>{feature.desc}</InlineCode>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <NextSteps
        className="mt-12"
        steps={[
          {
            title: "Compatibility Check",
            description: "Verify framework and library version compatibility",
            href: "/reference/compatibility",
          },
          {
            title: "Browse Components",
            description: `See all ${lib.name} components with theming`,
            href: "/showcase",
          },
          {
            title: "Migration Guide",
            description: "Upgrade from previous adapter versions",
            href: "/migration",
          },
        ]}
      />

      <RelatedLinks
        links={[
          { title: "Core Package", href: "/packages/core" },
          { title: "Framework Guides", href: "/framework-guides" },
          { title: "Troubleshooting", href: "/troubleshooting" },
          { title: "API Reference", href: `/api-reference/${lib.slug}` },
        ]}
      />
    </article>
  );

  return <DocsLayout>{content}</DocsLayout>;
}
