import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";

import { DocsLayout } from "../../../../components/docs-layout";
import { CodeBlock } from "../../../../components/code-block";
import { PageHeader } from "../../../../components/ui/page-header";
import { RelatedLinks } from "../../../../components/ui/related-links";
import { InlineCode } from "../../../../components/ui/inline-code";
import { libraries } from "../../../../lib/libraries";
import { libraryApiExamples } from "../../../../lib/library-api-examples";
import { docsUrl } from "../../../../lib/site";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return libraries.map((lib) => ({ slug: lib.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const lib = libraries.find((l) => l.slug === slug);
  if (!lib) return { title: "Examples" };
  return {
    title: `${lib.name} API examples`,
    description: `Worked examples for every export of ${lib.pkg} — what each one does and how it is called.`,
    alternates: { canonical: docsUrl(`/libraries/${slug}/examples`) },
  };
}

/**
 * Worked API examples for one adapter.
 *
 * The library guide answers "how do I install this". This page answers "what do
 * the exports do, and how are they called" — the question the API reference
 * table lists but does not demonstrate.
 */
export default function LibraryExamplesPage({ params }: PageProps) {
  const { slug } = use(params);
  const lib = libraries.find((l) => l.slug === slug);
  if (!lib) notFound();

  const examples = libraryApiExamples[slug] ?? [];

  return (
    <DocsLayout>
      <article className="min-w-0">
        <PageHeader
          icon={lib.icon}
          title={`${lib.name} API examples`}
          subtitle={lib.pkg}
          description={`Every export, what it is for, and how it is called. Each snippet uses the package's real surface — nothing here is illustrative pseudo-code.`}
          badges={[{ label: "Examples" }]}
        />

        <nav
          className="mt-6 flex flex-wrap gap-2 text-sm"
          aria-label="On this page"
        >
          <a className="chip" href="#examples">
            Examples
          </a>
          <a className="chip" href="#exports">
            All exports
          </a>
          <Link className="chip" href={`/libraries/${slug}`}>
            ← Installation guide
          </Link>
        </nav>

        <section id="examples" className="mt-10 scroll-mt-24">
          <h2 className="text-lg font-semibold tracking-tight">Examples</h2>
          <p className="mt-1 text-sm opacity-70">
            One entry per API you are likely to reach for, in the order you meet
            them: mount the adapter, read the theme, generate static CSS.
          </p>

          <div className="mt-6 flex flex-col gap-8">
            {examples.map((example) => (
              <div key={example.api} data-testid="api-example">
                <h3 className="text-sm font-semibold">
                  <code className="mono">{example.api}</code>
                </h3>
                <p className="mt-1 mb-3 text-sm opacity-70">{example.desc}</p>
                <CodeBlock
                  code={example.code}
                  language={example.lang}
                  className="rounded-lg m-0"
                />
              </div>
            ))}
          </div>
        </section>

        <section id="exports" className="mt-12 scroll-mt-24">
          <h2 className="text-lg font-semibold tracking-tight">All exports</h2>
          <p className="mt-1 text-sm opacity-70">
            The complete surface of{" "}
            <code className="mono text-[0.9em]">{lib.pkg}</code>, grouped by
            purpose.
          </p>

          <div className="mt-4 flex flex-col gap-8">
            {lib.groups.map((group) => (
              <div key={group.label}>
                <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50">
                  {group.label}
                </h3>
                <dl className="mt-2 flex flex-col gap-2">
                  {group.features.map((feature) => (
                    <div
                      key={feature.name}
                      className="grid gap-1 rounded-lg border border-border px-3 py-2 text-sm sm:grid-cols-[18rem_1fr]"
                    >
                      <dt>
                        <code className="mono text-[0.9em]">
                          {feature.name}
                        </code>
                      </dt>
                      <dd className="opacity-70">
                        <InlineCode>{feature.desc}</InlineCode>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mt-12 scroll-mt-24">
          <h2 className="text-lg font-semibold tracking-tight">How it works</h2>
          {lib.architecture === "generated-theme" ? (
            <p className="mt-2 text-sm leading-relaxed opacity-70">
              Themvora builds {lib.name}&apos;s own theme object from its tokens
              and hands it to {lib.name}&apos;s provider. The library keeps
              doing exactly what it always did — it just gets its theme from
              Themvora instead of from you. That is why this adapter is a
              provider component: there is a real theme object to hand over.
            </p>
          ) : lib.architecture === "build-time" ? (
            <p className="mt-2 text-sm leading-relaxed opacity-70">
              The mapping is compiled rather than resolved at runtime.{" "}
              {lib.name}&apos;s utilities are generated from Themvora tokens at
              build time, and each generated value is a{" "}
              <code className="mono text-[0.9em]">var(--theme-…)</code>{" "}
              reference — so a theme change updates the utilities without a
              rebuild, while the utility set itself is fixed at build time.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed opacity-70">
              Themvora writes {lib.name}&apos;s own CSS custom properties from
              its tokens, and {lib.name}&apos;s stylesheet consumes them.
              Nothing is rebuilt on a theme change — the variables change and
              the styles follow. That is why this adapter is a hook that
              registers a writer rather than a provider component, and why it
              also needs its stylesheet imported.
            </p>
          )}
        </section>

        {lib.mapping && (
          <section id="mapping" className="mt-12 scroll-mt-24">
            <h2 className="text-lg font-semibold tracking-tight">
              What gets mapped
            </h2>
            <p className="mt-1 text-sm opacity-70">
              Themvora owns the meaning; the adapter owns the vocabulary.
            </p>
            <div
              className="mt-4 overflow-x-auto rounded-lg border"
              style={{ borderColor: "var(--theme-color-border)" }}
            >
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ background: "var(--theme-color-muted)" }}>
                    <th className="px-3 py-2 font-medium">Themvora</th>
                    <th className="px-3 py-2 font-medium">{lib.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {lib.mapping.map((row, i) => (
                    <tr
                      key={`${row.role}-${i}`}
                      className="border-t"
                      style={{ borderColor: "var(--theme-color-border)" }}
                    >
                      <td className="mono px-3 py-1.5">{row.role}</td>
                      <td className="mono px-3 py-1.5 opacity-70">
                        {row.target}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <RelatedLinks
          links={[
            { title: "Installation guide", href: `/libraries/${slug}` },
            { title: "API reference", href: `/api-reference/${slug}` },
            { title: "Framework guides", href: "/framework-guides" },
            { title: "Troubleshooting", href: "/troubleshooting" },
          ]}
        />
      </article>
    </DocsLayout>
  );
}
