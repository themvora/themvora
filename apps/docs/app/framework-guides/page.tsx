import type { Metadata } from "next";
import Link from "next/link";

import { DocsLayout } from "../../components/docs-layout";
import { PageHeader } from "../../components/ui/page-header";
import { Callout } from "../../components/ui/callout";
import { frameworks } from "../../lib/frameworks";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/framework-guides") },
  title: "Framework Guides",
  description:
    "First-class integrations for React, Next.js, Vue, Svelte, Solid, Angular, Web Components, Tailwind, Astro, Nuxt and Remix — every feature of every framework.",
};

export default function FrameworkGuidesPage() {
  return (
    <DocsLayout>
      <div className="max-w-3xl">
        <PageHeader
          eyebrow="Frameworks"
          title="Framework Guides"
          description={
            <>
              One runtime from{" "}
              <code className="mono text-[0.9em]">@themvora/core</code>, wrapped
              in the shape each framework actually uses — a provider and hooks in
              React, DI tokens, providers and{" "}
              <code className="mono text-[0.9em]">injectTheme*</code> functions in
              Angular, a readable store in Svelte, signals in Solid, and for
              Tailwind a build-time plugin with no runtime at all. Every guide has
              two halves: the setup walkthrough, and an examples page that shows
              each export against the problem it solves.
            </>
          }
        />

        <Callout className="mb-10">
          <strong>Every example is real</strong> — the snippets below are
          executed against the actual{" "}
          <code className="mono text-[0.9em]">@themvora/*</code> packages, and
          reference copies ship alongside each package in{" "}
          <code className="mono text-[0.9em]">packages/</code>.
        </Callout>

        <div className="grid gap-3 sm:grid-cols-2">
          {frameworks.map((framework) => (
            <div
              key={framework.slug}
              className="glass-card card-lift p-4 flex items-start gap-3 flex-col group"
            >
              <Link
                href={`/framework-guides/${framework.slug}`}
                className="flex items-center gap-3 w-full no-underline"
              >
                <span
                  className="w-10 h-10 shrink-0 rounded-lg grid place-items-center font-bold text-sm select-none"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--theme-color-primary), color-mix(in srgb, var(--theme-color-primary) 40%, var(--theme-color-accent)))",
                    color:
                      "var(--theme-color-primaryForeground)",
                  }}
                >
                  <span className="grayscale group-hover:grayscale-0 transition-all duration-100">
                    {framework.icon}
                  </span>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold">{framework.name}</span>
                  <span className="block text-xs opacity-50 mono truncate">
                    {framework.pkg}
                  </span>
                </span>
                <span className="text-xs opacity-50 shrink-0 whitespace-nowrap">
                  {framework.featureCount} feature
                  {framework.featureCount === 1 ? "" : "s"}
                </span>
              </Link>
              <span className="flex flex-wrap items-center gap-1.5">
                {framework.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-card/60 text-foreground/60"
                  >
                    {tag}
                  </span>
                ))}
                {/* The examples page is the second half of every guide, so it
                    gets a link on the index rather than being reachable only
                    after opening the guide. */}
                <Link
                  href={`/framework-guides/${framework.slug}/examples`}
                  className="ml-auto text-[11px] font-medium text-foreground no-underline whitespace-nowrap"
                >
                  Examples →
                </Link>
              </span>
            </div>
          ))}
        </div>
      </div>
    </DocsLayout>
  );
}
