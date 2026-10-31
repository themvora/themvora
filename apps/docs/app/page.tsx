import type { Metadata } from "next";

import { Hero } from "../components/home/hero";
import { Pillars } from "../components/home/pillars";
import { FrameworkMatrix } from "../components/home/framework-matrix";
import { SsrIntegrations } from "../components/home/ssr-integrations";
import { AdapterStory } from "../components/home/adapter-story";
import { Capabilities } from "../components/home/capabilities";
import { ThemeGallery } from "../components/home/theme-gallery";
import { LearningPath } from "../components/learning-path";
import { GetStarted } from "../components/home/get-started";
import { HERO_SNIPPET_LANG, HERO_SNIPPET_TEMPLATE } from "../components/home/hero-snippet";
import { Reveal } from "../components/reveal";
import { compatibilityLabel } from "../lib/code-variants";
import { docsUrl } from "../lib/site";

// Title/description/OG are inherited from the root layout (which describes the
// site as a whole, i.e. this page). Only the canonical is declared here: without
// it the homepage would have none, and a canonical declared in the layout would
// leak onto every other route.
export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/") },
};

/**
 * The hero's compatibility badge.
 *
 * Derived from the template rather than written by hand: the sample's only
 * interpolations sit inside string literals and a comment, so the template
 * parses as TypeScript on its own and the label is a fact about the source
 * instead of a claim about it.
 */
const heroSnippetLabel =
  compatibilityLabel(HERO_SNIPPET_TEMPLATE, HERO_SNIPPET_LANG) ?? undefined;

export default function Home() {
  return (
    <>
      <Hero {...(heroSnippetLabel ? { snippetLabel: heroSnippetLabel } : {})} />
      <Reveal>
        <Pillars />
      </Reveal>
      <Reveal delay={60}>
        <FrameworkMatrix />
      </Reveal>
      <Reveal delay={60}>
        <SsrIntegrations />
      </Reveal>
      <Reveal delay={60}>
        <Capabilities />
      </Reveal>
      <Reveal delay={60}>
        <AdapterStory />
      </Reveal>
      <Reveal delay={60}>
        <ThemeGallery />
      </Reveal>
      <Reveal delay={60}>
        <LearningPath />
      </Reveal>
      <Reveal delay={80}>
        <GetStarted />
      </Reveal>
    </>
  );
}
