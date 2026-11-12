import type { Metadata } from "next";

import { Hero } from "../components/home/hero";
import { Pillars } from "../components/home/pillars";
import { Architecture } from "../components/home/architecture";
import { FrameworkMatrix } from "../components/home/framework-matrix";
import { SsrIntegrations } from "../components/home/ssr-integrations";
import { AdapterStory } from "../components/home/adapter-story";
import { Capabilities } from "../components/home/capabilities";
import { LearningPath } from "../components/learning-path";
import { GetStarted } from "../components/home/get-started";
import { Reveal } from "../components/reveal";
import { docsUrl } from "../lib/site";

// Title/description/OG are inherited from the root layout (which describes the
// site as a whole, i.e. this page). Only the canonical is declared here: without
// it the homepage would have none, and a canonical declared in the layout would
// leak onto every other route.
export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/") },
};

/**
 * The section order is the argument:
 *
 *   Hero         — the claim, demonstrated by a live application preview.
 *   Pillars      — the five primitives it is built from.
 *   Architecture — how those primitives compose into one system.
 *   Frameworks / SSR / runtime / adapters — what follows from that system.
 *   Path / Start — how to begin.
 *
 * The built-in preset gallery used to sit between "Bring your existing UI
 * system" and the learning path. It listed every shipped family a second time
 * — the navigation and the hero picker already expose them — so the collection
 * lives on `/presets`, the page built for browsing it, and the architecture
 * section links there instead.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Reveal>
        <Pillars />
      </Reveal>
      <Reveal delay={60}>
        <Architecture />
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
        <LearningPath />
      </Reveal>
      <Reveal delay={80}>
        <GetStarted />
      </Reveal>
    </>
  );
}
