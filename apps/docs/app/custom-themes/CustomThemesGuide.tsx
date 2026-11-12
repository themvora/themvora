"use client";

import { useState } from "react";
import Link from "next/link";
import { pairWithJavaScript } from "../../lib/code-language";
import { CodeBlock } from "../../components/code-block";
import { GENERATION_STYLE_NAMES } from "@themvora/core";
import { SectionHeading } from "../../components/ui/section-heading";
import { Callout } from "../../components/ui/callout";
import { FrameworkPicker, getExample } from "../../components/framework-picker";
import { Prerequisites } from "../../components/ui/prerequisites";
import { NextSteps } from "../../components/ui/next-step-card";
import { RelatedLinks } from "../../components/ui/related-links";

import {
  STYLE_NOTES,
  customThemeSnippets,
  darkSnippet,
  defineSnippet,
  extendSnippet,
  generatedSnippet,
  runtimeSnippet,
  styledSnippet,
  vanillaSnippet,
} from "./snippets";

type Snippet = { lang: string; title: string; code: string };

/**
 * One snippet, with its JavaScript counterpart when there is one.
 *
 * The page derives the JavaScript and passes it down as `jsSources` — the
 * TypeScript compiler cannot be shipped to the browser — and the pair is
 * assembled here with the Shiki instance this guide already runs.
 */
function snippetBlock(
  snippet: Snippet,
  jsSources: Record<string, string> | undefined,
  labels?: Record<string, string>,
  className = "rounded-lg m-0",
) {
  const js = jsSources?.[snippet.code];
  const variants = js
    ? pairWithJavaScript(snippet, js)?.map((variant) => ({
        ...variant,
      }))
    : undefined;

  return (
    <CodeBlock
      code={snippet.code}
      language={snippet.lang}
      filename={snippet.title}
      {...(labels?.[snippet.code] ? { displayLanguage: labels[snippet.code] } : {})}
      {...(variants ? { variants } : {})}
      className={className}
    />
  );
}

export function CustomThemesGuide({
  jsSources,
  labels,
}: {
  /** Derived JavaScript for every snippet on the page, keyed by its source. */
  jsSources?: Record<string, string>;
  /** Compatibility badge per snippet, also keyed by source. */
  labels?: Record<string, string>;
}) {
  const [selectedFramework, setSelectedFramework] = useState("react");
  const customSnippet = getExample(customThemeSnippets, selectedFramework);
  const block = (snippet: Snippet, className?: string) =>
    snippetBlock(snippet, jsSources, labels, className);

  return (
    <>
      <Prerequisites
        items={[
          {
            label: "Core package installed",
            value: "@themvora/core for theme definitions",
          },
          {
            label: "Token structure understanding",
            value: "Familiarity with semantic token patterns",
            href: "/tokens",
          },
          {
            label: "Framework runtime",
            value: "A Themvora provider mounted in your app",
            href: "/quick-start",
          },
        ]}
      />

      <section id="define" className="scroll-mt-24 my-10">
        <SectionHeading
          num={1}
          desc="The smallest building block. A name, an optional family + mode, and nested tokens that become CSS variables."
        >
          Define a theme
        </SectionHeading>
        {block(defineSnippet)}
        <Callout className="mt-3">
          <strong>Mode + family</strong>{" "}
          <span className="mx-1 opacity-40">|</span>
          Give light and dark variants the same{" "}
          <code className="mono text-[0.9em]">family</code> so switching mode
          stays within your palette. See{" "}
          <Link href="/core-concepts" className="text-primary no-underline">
            Core Concepts
          </Link>{" "}
          for how families work.
        </Callout>
        <div className="mt-3">{block(darkSnippet)}</div>
      </section>

      <section id="extend" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={2}
          desc="Inherit from a base theme and override only the tokens that change."
        >
          Extend & compose
        </SectionHeading>
        {block(extendSnippet)}
      </section>

      <section id="register" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={3}
          desc="Pass your themes to the runtime or provider in any framework. The same list works everywhere."
        >
          Register with the runtime
        </SectionHeading>
        {block(runtimeSnippet)}
        <div className="mt-3">{block(vanillaSnippet)}</div>
      </section>

      <section id="generate" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={4}
          desc="No token math needed — derive an entire light/dark pair from one color, then validate it."
        >
          Generate from a seed
        </SectionHeading>
        {block(generatedSnippet)}

        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">
            Generation styles
          </h3>
          <p className="text-sm opacity-80 mb-3 leading-relaxed">
            A style is not a separate algorithm. Every style runs the same
            generator and the same solver and produces the same semantic
            contract; a style only modulates a fixed, enumerated set of
            parameters — surface chroma, primary chroma, the secondary and
            accent relationships, neutral temperature, border strength and
            dark-mode depth. Omitting{" "}
            <code className="mono text-[0.9em]">style</code> means{" "}
            <code className="mono text-[0.9em]">balanced</code>, so an existing{" "}
            <code className="mono text-[0.9em]">{"{ seed, family }"}</code> call
            keeps working unchanged.
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2 mb-3">
            {GENERATION_STYLE_NAMES.map((name) => (
              <li key={name} className="flex items-baseline gap-2 text-sm">
                <code className="mono text-[0.9em] shrink-0">{name}</code>
                <span className="opacity-60 text-[13px] leading-snug">
                  {STYLE_NOTES[name] ?? ""}
                </span>
              </li>
            ))}
          </ul>
          {block(styledSnippet)}
        </div>

        <div className="rounded-xl border border-border p-4 mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">
            What the generator guarantees
          </h3>
          <ul className="flex flex-col gap-2 text-sm opacity-80 leading-relaxed">
            <li>
              <strong className="font-semibold">Deterministic.</strong> The same
              seed, style and options produce byte-identical output. There is no
              randomness and no time input.
            </li>
            <li>
              <strong className="font-semibold">
                Light and dark are independent.
              </strong>{" "}
              The dark theme is generated for dark, not inverted from the light
              one, so the brand hue survives the mode change.
            </li>
            <li>
              <strong className="font-semibold">
                The contrast contract is met before you get the theme.
              </strong>{" "}
              The published contract is 4.5:1 for text and 3:1 for interactive
              boundaries and focus rings. The generator aims slightly higher
              internally so the guarantee survives a small edit, and every
              semantic pair is solved rather than left to chance.
            </li>
            <li>
              <strong className="font-semibold">Provenance is recorded.</strong>{" "}
              <code className="mono text-[0.9em]">meta.generation</code> carries
              the algorithm version, the seed, and the style. The algorithm
              version is separate from the theme schema version, so a future
              generator can ship without silently rewriting themes you already
              generated.
            </li>
          </ul>
        </div>
      </section>

      <section id="presets" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={5}
          desc="Compose on top of the built-in palettes instead of starting from scratch."
        >
          Presets & brand themes
        </SectionHeading>
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">
            Default presets
          </h3>
          <p className="text-sm opacity-80 mb-3 leading-relaxed">
            Nine curated families —{" "}
            <code className="mono text-[0.9em]">
              oat, berry, mint, citrus, cocoa, plum, iris, sky, graphite
            </code>{" "}
            — each with light + dark. Grab them via{" "}
            <code className="mono text-[0.9em]">getPresetThemes()</code> or
            restyle with{" "}
            <code className="mono text-[0.9em]">
              getPresetThemes(overrides)
            </code>
            .
          </p>
          <CodeBlock
            code={`import { getPresetThemes } from "@themvora/core";

// All nine families, light + dark.
const themes = getPresetThemes();

// Or restyle a family as you take it.
const restyled = getPresetThemes({
  plum: {
    light: { tokens: { colors: { primary: "#6d28d9" } } },
  },
});`}
            language="ts"
            className="rounded-lg m-0"
          />
        </div>

        <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">
          Brand presets
        </h3>
        <p className="text-sm opacity-80 mb-3 leading-relaxed">
          Brand-inspired starting points — Apple, GitHub, Vercel, Slack, Discord
          — via <code className="mono text-[0.9em]">getBrandPresets()</code>.
          Each starts from a colour the brand <em>publishes</em> in its
          guidelines or design system, pins that value as the identity anchor,
          and generates the surfaces, borders, interaction roles and status
          colours around it with the same engine as any other theme. They are
          examples, not official brand themes.
        </p>
        <CodeBlock
          code={`import { getBrandPresets } from "@themvora/core";

const themes = getBrandPresets();

const brand = themes.filter((t) => t.meta?.family === "github");
createThemeRuntime({ themes: brand, defaultTheme: "github-light" });`}
          language="ts"
          className="rounded-lg m-0"
        />

        <div className="rounded-xl border border-border p-4 mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">
            Overrides are yours
          </h3>
          <p className="text-sm opacity-80 leading-relaxed">
            Presets are generated artifacts, so a preset is not a frozen token
            list you have to maintain — it is a recipe you can restyle.
            Overrides are applied{" "}
            <strong className="font-semibold">after</strong> generation and are
            never rewritten for you: the generated baseline satisfies the
            contract, but an override is free to break it, and it is your call.
            Run <code className="mono text-[0.9em]">validateTheme()</code> to
            find out whether it did.
          </p>
        </div>

        <div className="rounded-xl border border-border p-4 mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">
            Accessibility profiles
          </h3>
          <p className="text-sm opacity-80 leading-relaxed">
            High-contrast and large-text variants ship via{" "}
            <code className="mono text-[0.9em]">
              getAccessibilityProfiles()
            </code>{" "}
            and are tagged{" "}
            <code className="mono text-[0.9em]">"accessibility"</code> for
            filtering.
          </p>
        </div>
      </section>

      <section id="use-your-theme" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={6}
          desc="The theme you defined above is a plain object — the same two objects register in every framework. Pick yours to see the exact integration with the custom ocean family."
        >
          Use your custom theme
        </SectionHeading>
        <FrameworkPicker
          value={selectedFramework}
          onChange={setSelectedFramework}
          label="Pick your framework"
        />
        {block(customSnippet)}
        {customSnippet.extra
          ? block(customSnippet.extra, "rounded-lg m-0 mt-3")
          : null}
        {customSnippet.vite
          ? block(customSnippet.vite, "rounded-lg m-0 mt-3")
          : null}
        <Callout className="mt-3">
          The <code className="mono text-[0.9em]">oceanLight</code> and{" "}
          <code className="mono text-[0.9em]">oceanDark</code> themes come from
          section 1. Register both, set{" "}
          <code className="mono text-[0.9em]">ocean-light</code> as the default,
          and mode toggling stays inside your family. See{" "}
          <Link href="/framework-guides" className="text-primary no-underline">
            Framework Guides
          </Link>{" "}
          for a deeper walkthrough of each integration.
        </Callout>
      </section>

      <NextSteps
        steps={[
          {
            title: "Generate from a seed color",
            description:
              "Use Theme Studio to create a complete light/dark pair",
            href: "/theme-studio",
          },
          {
            title: "Apply scoped themes",
            description: "Override tokens in specific app sections",
            href: "/scoped-theme",
          },
          {
            title: "Test with accessibility profiles",
            description:
              "Validate your custom theme with WCAG-compliant presets",
            href: "/accessibility",
          },
        ]}
      />

      <RelatedLinks
        links={[
          {
            title: "Playground",
            description: "Explore families, history, and multi-window sync",
            href: "/playground",
          },
          {
            title: "@themvora/core",
            description:
              "Full reference for models, registry, and runtime APIs",
            href: "/packages/core",
          },
          {
            title: "Token resolution",
            description:
              "Understand how semantic tokens resolve to concrete values",
            href: "/token-resolution",
          },
        ]}
      />
    </>
  );
}
