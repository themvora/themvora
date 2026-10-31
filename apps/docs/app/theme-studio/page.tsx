import type { Metadata } from "next";

import { DocsLayout } from "../../components/docs-layout";
import { ThemeStudio } from "../../components/theme-studio/theme-studio";
import { RelatedLinks } from "../../components/ui/related-links";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/theme-studio") },
  title: "Theme Studio",
  description:
    "Generate a complete light and dark theme pair from a single seed color using generateTheme(), then apply it to this very site.",
};

export default function ThemeStudioPage() {
  return (
    <DocsLayout wide>
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
            description: "Hand-author or extend a theme instead of generating it",
          },
          {
            title: "Core Concepts",
            href: "/core-concepts",
            description: "Semantic tokens, families and the runtime",
          },
        ]}
      />
    </DocsLayout>
  );
}
