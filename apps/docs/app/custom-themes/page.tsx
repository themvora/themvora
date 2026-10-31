import type { Metadata } from "next";
import Link from "next/link";

import { DocsLayout } from "../../components/docs-layout";
import { PageHeader } from "../../components/ui/page-header";
import { SectionHeading } from "../../components/ui/section-heading";
import { Callout } from "../../components/ui/callout";
import { CustomThemesGuide } from "./CustomThemesGuide";
import {
  customThemeSnippets,
  darkSnippet,
  defineSnippet,
  extendSnippet,
  generatedSnippet,
  runtimeSnippet,
  styledSnippet,
  vanillaSnippet,
} from "./snippets";
import { compatibilityLabels, javascriptSources } from "../../lib/code-variants";
import { docsUrl } from "../../lib/site";

/**
 * Every snippet the guide can render, in one place.
 *
 * Both derivations below read this list, so a snippet can never be paired
 * without also being labelled — or the other way round.
 */
const snippets = [
  defineSnippet,
  darkSnippet,
  extendSnippet,
  runtimeSnippet,
  vanillaSnippet,
  styledSnippet,
  generatedSnippet,
  // The framework key is carried onto each entry rather than dropped: it is what
  // keeps Angular's snippets TypeScript-only (see `TYPESCRIPT_ONLY_FRAMEWORKS`),
  // and `Object.values` would have discarded the only copy of it.
  ...Object.entries(customThemeSnippets).flatMap(([framework, snippet]) => [
    { ...snippet, framework },
    ...(snippet.extra ? [{ ...snippet.extra, framework }] : []),
  ]),
];

/**
 * The JavaScript counterpart of every snippet the guide can render.
 *
 * Derived here, on the server, because the guide is a client component and the
 * TypeScript compiler cannot be shipped to the browser. Only the derived source
 * crosses the boundary; the guide highlights it with its own Shiki instance.
 */
const jsSources = javascriptSources(snippets);

/**
 * The compatibility badge of every snippet — `TS / JS`, `TS`, and so on.
 *
 * Separate from `jsSources` because a label is metadata, not source: a snippet
 * highlighted with the TypeScript grammar may still be valid JavaScript.
 */
const labels = compatibilityLabels(snippets);

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/custom-themes") },
  title: "Custom Themes",
  description:
    "Define your own themes with semantic tokens, extend and compose them, register with any framework runtime, and generate themes from a single seed color.",
};

export default function CustomThemesPage() {
  return (
    <DocsLayout>
      <div className="max-w-3xl">
        <PageHeader
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          }
          title="Custom Themes"
          subtitle="@themvora/core"
          description={
            <>
              Themvora ships neutral, preset, brand and accessibility themes.
              A theme of your own is a plain object of{" "}
              <em className="mono text-[0.9em]">semantic tokens</em> plus{" "}
              <em className="mono text-[0.9em]">metadata</em> — no build step,
              and nothing to regenerate when you add one.
            </>
          }
        />
        <CustomThemesGuide jsSources={jsSources} labels={labels} />
      </div>
    </DocsLayout>
  );
}