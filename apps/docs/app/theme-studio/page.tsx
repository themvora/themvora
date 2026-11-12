import type { Metadata } from "next";

import { ThemeStudio } from "../../components/theme-studio/theme-studio";
import { PageHeader } from "../../components/ui/page-header";
import { RelatedLinks } from "../../components/ui/related-links";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/theme-studio") },
  title: "Theme Studio",
  description:
    "Generate a complete light and dark theme pair from a single seed color using generateTheme(), then apply it to this very site.",
};

/**
 * The studio is a tool, not a document.
 *
 * It renders outside `DocsLayout` for the same reason the playground does: a
 * navigation rail and a table of contents belong beside prose, and here they
 * would only take width away from the two columns the tool actually uses. The
 * page owns its own shell, header and spacing instead.
 */
export default function ThemeStudioPage() {
  return (
    /* `site-shell` rather than `max-w-6xl`: on a page without the docs layout
       this is the same column the header and footer use, so all three edges line
       up. A fixed `max-w-6xl` would sit 40px inside them. */
    <div className="site-shell px-4 py-10 sm:px-6">
      {/* <PageHeader
        eyebrow="Theme studio"
        title="Generate a theme from a seed"
        description={
          <>
            Pick a seed colour and Themvora derives a complete light and dark
            pair: secondary, muted, accent, card, popover, input, border and
            ring are all computed in OKLCH by{" "}
            <code className="font-mono text-[0.9em]">generateTheme()</code>.
            Preview both modes, then apply one to this site to see the runtime
            re-theme everything live.
          </>
        }
      />

      <hr className="w-full mb-6" /> */}

      <ThemeStudio />

      {/*
        §3.1 requires a feature page to link the API reference it documents. The
        previous version of this was a bare line reading "Generated from source
        JSDoc: @themvora/core API reference"; this keeps the requirement and
        puts it in the same shape as every other page's footer.
      */}
      <RelatedLinks
        links={[
          {
            title: "Core API Reference",
            href: "/api-reference/core",
            description: "Every export of @themvora/core, from source JSDoc",
          },
          {
            title: "Custom Themes",
            href: "/custom-themes",
            description:
              "Hand-author or extend a theme instead of generating it",
          },
          {
            title: "Core Concepts",
            href: "/core-concepts",
            description: "Semantic tokens, families and the runtime",
          },
        ]}
      />
    </div>
  );
}
