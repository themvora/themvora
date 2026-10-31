import type { Metadata } from "next";
import Link from "next/link";

import { DocsLayout } from "../../components/docs-layout";
import { PageHeader } from "../../components/ui/page-header";
import { SectionHeading } from "../../components/ui/section-heading";
import { Callout } from "../../components/ui/callout";
import { ScopedThemeGuide } from "./ScopedThemeGuide";
import {
  imperativeExamples,
  localThemeExamples,
  nestedScopeExamples,
  scopeExamples,
  transitionExamples,
} from "./snippets";
import { compatibilityLabels, javascriptSources } from "../../lib/code-variants";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/scoped-theme") },
  title: "Scoped Theme",
  description:
    "Apply a theme to a subtree — a sandboxed island inside the app. ThemeScope, the themvoraScope directive, and per-framework scope theming snippets.",
};

/**
 * Every snippet the guide can render, in one place.
 *
 * Both derivations below read this list, so a snippet can never be paired
 * without also being labelled — or the other way round.
 *
 * The framework key is carried onto each entry rather than dropped: it is what
 * keeps Angular's snippets TypeScript-only (see `TYPESCRIPT_ONLY_FRAMEWORKS`),
 * and `Object.values` would have discarded the only copy of it.
 */
const snippets = [
  scopeExamples,
  imperativeExamples,
  localThemeExamples,
  transitionExamples,
  nestedScopeExamples,
].flatMap((examples) =>
  Object.entries(examples).map(([framework, snippet]) => ({
    ...snippet,
    framework,
  })),
);

/**
 * The JavaScript counterpart of every snippet the guide can render.
 *
 * Derived here, on the server, because the guide is a client component and the
 * TypeScript compiler cannot be shipped to the browser. The guide highlights the
 * result with its own Shiki instance, so only the source crosses the boundary.
 */
const jsSources = javascriptSources(snippets);

/**
 * The compatibility badge of every snippet — `TS / JS`, `TS`, and so on.
 *
 * Separate from `jsSources` because a label is metadata, not source: a snippet
 * highlighted with the TypeScript grammar may still be valid JavaScript.
 */
const labels = compatibilityLabels(snippets);

export default function ScopedThemePage() {
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
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
          title="Scoped Theme"
          subtitle="@themvora/core · ThemeScope"
          description={
            <>
              Most theming is global. Scoped theming is not: it lets you apply a
              whole theme — palette, radius, typography — to a{" "}
              <em>subtree</em>, turning it into a sandboxed island that ignores
              the global theme. Great for embedded widgets, preview panes,
              marketing sections, and multi-brand surfaces inside one app.
            </>
          }
        />
        <ScopedThemeGuide jsSources={jsSources} labels={labels} />
      </div>
    </DocsLayout>
  );
}