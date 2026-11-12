import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocsLayout } from "../../../../components/docs-layout";
import { CodeExample } from "../../../../components/code-example";
import { Callout } from "../../../../components/ui/callout";
import { DocHeader } from "../../../../components/ui/doc-header";
import { InlineCode } from "../../../../components/ui/inline-code";
import { RelatedLinks } from "../../../../components/ui/related-links";
import { SectionHeading } from "../../../../components/ui/section-heading";
import {
  allFrameworks,
  frameworkExamplesPath,
  frameworkGuidePath,
} from "../../../../lib/frameworks";
import {
  examplesFor,
  type ExampleSnippet,
} from "../../../../lib/framework-examples";
import { buildPageHeadings } from "../../../../lib/toc";
import { PKG_VERSION, getPackageVersion } from "../../../../lib/version";
import { docsUrl } from "../../../../lib/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * `/framework-guides/<slug>/examples` — the practical layer of a framework
 * guide.
 *
 * Three pages now describe the same package, and each answers a different
 * question:
 *
 *   - the guide (`/framework-guides/<slug>`) gets an app from zero to a
 *     working theme;
 *   - this page shows which export solves which problem, in code;
 *   - `/api-reference/<slug>` states exact signatures and return types.
 *
 * The content is data (`lib/framework-examples/*.ts`) rather than prose so the
 * coverage claim is checkable: `scripts/check-framework-examples.mjs` fails if a
 * What's Available feature has no entry, or an entry claims a feature that does
 * not exist.
 */
export function generateStaticParams() {
  return allFrameworks
    .filter((framework) => !framework.nested && examplesFor(framework.slug) !== undefined)
    .map((framework) => ({ slug: framework.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const framework = allFrameworks.find((f) => f.slug === slug);
  if (!framework || !examplesFor(slug)) return { title: "Examples" };
  return {
    title: `${framework.name} examples`,
    description: `Runnable ${framework.name} examples for every export in ${framework.pkg} — what each API does, when to use it, and what changes on screen.`,
    alternates: {
      canonical: docsUrl(frameworkExamplesPath(slug)),
    },
  };
}

/** One or more samples for one API, recipe or workflow. */
function CodeSamples({
  snippets,
  slug,
}: {
  snippets: ExampleSnippet[];
  /** The guide's framework — Angular's samples never pair. */
  slug: string;
}) {
  return (
    <>
      {snippets.map((snippet, index) => (
        <CodeExample
          key={`${snippet.title}-${index}`}
          code={snippet.code}
          lang={snippet.lang}
          framework={slug}
          filename={snippet.title}
          {...(snippet.js ? { js: snippet.js } : {})}
          {...(snippet.jsFilename ? { jsFilename: snippet.jsFilename } : {})}
          className={`rounded-lg m-0 ${index > 0 ? "mt-3" : ""}`}
        />
      ))}
    </>
  );
}

export default async function FrameworkExamplesPage({ params }: PageProps) {
  const { slug } = await params;
  const framework = allFrameworks.find((f) => f.slug === slug);
  const examples = examplesFor(slug);
  if (!framework || !examples) notFound();

  /**
   * The rail is built here rather than by the layout's tree walk because every
   * id below is a published anchor: `#api-examples` is linked from the guide and
   * `#<entry-id>` is linked from What's Available, so the ids have to be the
   * ones this page writes onto the headings. `buildPageHeadings` keeps the
   * explicit ones and allocates the rest exactly as the client scanner does, so
   * the server-rendered rail and the live scan agree from first paint.
   */
  const headings = buildPageHeadings([
    { id: "start-here", text: examples.sections.startHere, level: 2 },
    { id: "use-cases", text: examples.sections.useCases, level: 2 },
    ...examples.recipes.map((recipe) => ({
      id: recipe.id,
      text: recipe.title,
      level: 3 as const,
    })),
    { id: "api-examples", text: examples.sections.api, level: 2 },
    ...examples.categories.map((category) => ({
      id: category.id,
      text: category.label,
      level: 3 as const,
    })),
    ...(examples.combining.length > 0
      ? [
          {
            id: "combining",
            text: examples.sections.combining ?? "Combining APIs",
            level: 2 as const,
          },
          ...examples.combining.map((workflow) => ({
            id: workflow.id,
            text: workflow.title,
            level: 3 as const,
          })),
        ]
      : []),
    ...(examples.notAvailable?.length
      ? [
          {
            id: "not-available",
            text: "Not available in this integration",
            level: 2 as const,
          },
        ]
      : []),
    // `RelatedLinks` renders its own h3, but a component's output is invisible
    // to the render-tree walk (it only descends into literal host elements), so
    // its id is assigned by the client scan after hydration — the same as on
    // every other page that uses it. Declaring it here would put an item in the
    // server-rendered rail that has no element to scroll to yet.
  ]);

  const apiReference = `/api-reference/${framework.slug}`;

  return (
    <DocsLayout headings={headings}>
      <article className="min-w-0">
        <DocHeader
          eyebrow="Examples & use cases"
          title={`${framework.name} examples`}
          description={`Each export in ${framework.pkg}, with the problem it solves and the code that solves it.`}
          metadata={{
            package: framework.pkg,
            framework: framework.name,
            version: getPackageVersion(framework.slug) ?? PKG_VERSION,
            status: "stable",
          }}
        />

        <p className="text-sm leading-relaxed opacity-80">
          <Link
            href={frameworkGuidePath(framework.slug)}
            className="text-foreground no-underline hover:underline"
          >
            ← Back to the {framework.name} guide
          </Link>
        </p>

        {examples.intro.map((paragraph) => (
          <p
            key={paragraph}
            className="mt-3 text-sm leading-relaxed opacity-80"
          >
            <InlineCode>{paragraph}</InlineCode>
          </p>
        ))}

        {/* --- 1. Start here ------------------------------------------------ */}
        <section className="mt-10">
          <SectionHeading
            num={1}
            headingId="start-here"
            desc={<InlineCode>{examples.startHere.body}</InlineCode>}
          >
            {examples.sections.startHere}
          </SectionHeading>
          <CodeSamples snippets={examples.startHere.code} slug={slug} />
          {examples.startHere.note ? (
            <Callout className="mt-3" variant="tip">
              <p className="leading-relaxed">
                <InlineCode>{examples.startHere.note}</InlineCode>
              </p>
            </Callout>
          ) : null}
        </section>

        {/* --- 2. Common use cases ----------------------------------------- */}
        <section className="mt-12">
          <SectionHeading num={2} headingId="use-cases">
            {examples.sections.useCases}
          </SectionHeading>

          <div className="flex flex-col gap-10">
            {examples.recipes.map((recipe) => (
              <div key={recipe.id}>
                <h3
                  id={recipe.id}
                  className="scroll-mt-24 text-base font-semibold tracking-tight"
                >
                  {recipe.title}
                </h3>

                <p className="mt-1.5 text-sm leading-relaxed opacity-80">
                  <InlineCode>{recipe.problem}</InlineCode>
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {recipe.apis.map((api) => (
                    <code
                      key={api}
                      className="mono rounded border border-border bg-muted/20 px-1.5 py-0.5 text-[11px] opacity-80"
                    >
                      {api}
                    </code>
                  ))}
                </div>

                <div className="mt-3">
                  <CodeSamples snippets={recipe.code} slug={slug} />
                </div>

                {/* `why` and `expect` are written to be read in sequence — the
                    reason these APIs, then what the screen does — so they run
                    together as one paragraph instead of two labelled rows that
                    would repeat the same labels on every recipe. */}
                <p className="mt-2 text-[13px] leading-relaxed opacity-70">
                  <InlineCode>{recipe.why}</InlineCode>{" "}
                  <InlineCode>{recipe.expect}</InlineCode>
                </p>
                {recipe.caveats ? (
                  <p className="mt-1.5 text-[13px] leading-relaxed opacity-60">
                    <span className="font-semibold opacity-80">
                      Watch out:{" "}
                    </span>
                    <InlineCode>{recipe.caveats}</InlineCode>
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* --- 3. API examples --------------------------------------------- */}
        <section className="mt-12">
          <SectionHeading num={3} headingId="api-examples">
            {examples.sections.api}
          </SectionHeading>

          <div className="flex flex-col gap-10">
            {examples.categories.map((category) => {
              // A long category (React's Hooks has fourteen entries) is hard to
              // scan, so it gets a jump row of its own entries. Short ones don't
              // need it and the row would just be noise.
              const showJump = category.entries.length > 4;
              return (
                <div key={category.id}>
                  <h3
                    id={category.id}
                    className="scroll-mt-24 text-base font-semibold tracking-tight"
                  >
                    {category.label}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed opacity-70">
                    <InlineCode>{category.intro}</InlineCode>
                  </p>

                  {showJump ? (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {category.entries.map((entry) => (
                        <a
                          key={entry.id}
                          href={`#${entry.id}`}
                          className="chip no-underline"
                        >
                          <code className="mono text-[0.85em]">{entry.name}</code>
                        </a>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-col gap-8">
                    {category.entries.map((entry) => (
                      <div key={entry.id}>
                        <h4
                          id={entry.id}
                          className="scroll-mt-24 text-sm font-semibold tracking-tight"
                        >
                          <code className="mono">{entry.name}</code>
                        </h4>

                        {entry.covers.length > 1 ||
                        entry.covers[0] !== entry.name ? (
                          <p className="mt-1 text-[11px] opacity-50">
                            Documents{" "}
                            {entry.covers.map((cover, index) => (
                              <span key={cover}>
                                {index > 0 ? " · " : ""}
                                <code className="mono">{cover}</code>
                              </span>
                            ))}
                          </p>
                        ) : null}

                        <p className="mt-1.5 text-sm leading-relaxed opacity-80">
                          <InlineCode>{entry.what}</InlineCode>
                        </p>

                        {/* The reason to choose this export sits before the
                            code, because it is what decides whether the reader
                            should read the snippet at all. The observable
                            result goes after it, where the reader has something
                            to check it against. */}
                        <p className="mt-1.5 text-[13px] leading-relaxed opacity-60">
                          <InlineCode>{entry.when}</InlineCode>
                        </p>

                        <div className="mt-3">
                          <CodeSamples snippets={entry.code} slug={slug} />
                        </div>

                        <p className="mt-2 text-[13px] leading-relaxed opacity-60">
                          <InlineCode>{entry.effect}</InlineCode>
                        </p>

                        {entry.related?.length ? (
                          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] opacity-60">
                            <span className="uppercase tracking-widest">
                              Related
                            </span>
                            {entry.related.map((related) => (
                              <a
                                key={related}
                                href={`#${related}`}
                                className="text-foreground no-underline"
                              >
                                <code className="mono text-[0.9em]">
                                  {related}
                                </code>
                              </a>
                            ))}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* --- 4. Combining APIs ------------------------------------------- */}
        {examples.combining.length > 0 ? (
          <section className="mt-12">
            <SectionHeading num={4} headingId="combining">
              {examples.sections.combining ?? "Combining APIs"}
            </SectionHeading>

            <div className="flex flex-col gap-8">
              {examples.combining.map((workflow) => (
                <div key={workflow.id}>
                  <h3
                    id={workflow.id}
                    className="scroll-mt-24 text-base font-semibold tracking-tight"
                  >
                    {workflow.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed opacity-80">
                    <InlineCode>{workflow.body}</InlineCode>
                  </p>
                  <div className="mt-3">
                    <CodeSamples snippets={workflow.code} slug={slug} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* --- Not available ------------------------------------------------ */}
        {examples.notAvailable?.length ? (
          <section className="mt-12">
            <SectionHeading headingId="not-available">
              Not available in this integration
            </SectionHeading>
            <p className="mb-3 text-sm leading-relaxed opacity-80">
              These exports exist in other integrations but not in{" "}
              <code className="mono text-[0.9em]">{framework.pkg}</code>. Listing
              them is more useful than inventing an example: if you need one of
              them here, the workaround is named.
            </p>
            <div className="flex flex-col gap-2">
              {examples.notAvailable.map((item) => (
                <Callout key={item.name} variant="limitation" title={item.name}>
                  <p className="leading-relaxed">
                    <InlineCode>{item.reason}</InlineCode>
                  </p>
                </Callout>
              ))}
            </div>
          </section>
        ) : null}

        {/* No "Next steps" paragraph. It said the same thing on all eleven
            pages — "signatures are in the API reference" — and the link cards
            below already go there, plus to the guide for setup. A conclusion
            that restates the navigation is the clearest example of the padding
            this page is meant to avoid. */}
        <RelatedLinks
          className="mt-12"
          title="Where to go next"
          links={[
            {
              title: `${framework.name} guide`,
              description: "Install, provider setup, and the first toggle",
              href: frameworkGuidePath(framework.slug),
            },
            {
              title: "API Reference",
              description: `Complete ${framework.pkg} documentation`,
              href: apiReference,
            },
            {
              title: "Custom Themes",
              description: "Build your own palettes and semantic tokens",
              href: "/custom-themes",
            },
            {
              title: "Scoped Theme",
              description: "Apply a theme to a subtree",
              href: "/scoped-theme",
            },
          ]}
        />
      </article>
    </DocsLayout>
  );
}
