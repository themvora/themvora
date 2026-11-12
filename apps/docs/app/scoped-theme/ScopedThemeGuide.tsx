"use client";

import { useState } from "react";
import Link from "next/link";
import { pairWithJavaScript } from "../../lib/code-language";
import { CodeBlock } from "../../components/code-block";
import { SectionHeading } from "../../components/ui/section-heading";
import { Callout } from "../../components/ui/callout";
import { FrameworkPicker, getExample } from "../../components/framework-picker";
import { Prerequisites } from "../../components/ui/prerequisites";
import { NextSteps } from "../../components/ui/next-step-card";
import { RelatedLinks } from "../../components/ui/related-links";

import {
  imperativeExamples,
  localThemeExamples,
  nestedScopeExamples,
  scopeExamples,
  transitionExamples,
} from "./snippets";

type Snippet = {
  lang: string;
  title: string;
  code: string;
  /** Web only — the same setup through the Vite plugin. */
  vite?: { lang: string; title: string; code: string };
};

function snippetBlock(
  snippet: Snippet,
  jsSources?: Record<string, string>,
  labels?: Record<string, string>,
) {
  // The JavaScript source arrives from the page — the TypeScript compiler lives
  // on the server — and is highlighted here with the Shiki instance this guide
  // already runs. `pairWithJavaScript` leaves `html` empty; filling it is the
  // only thing the client has to do.
  // The JavaScript source arrives from the page — the TypeScript compiler lives
  // on the server. `pairWithJavaScript` leaves `html` empty so `CodeBlock`
  // highlights the selected variant on demand instead of shipping Shiki in the
  // route's initial bundle.
  const js = jsSources?.[snippet.code];
  const variants = js
    ? pairWithJavaScript(snippet, js)?.map((variant) => ({
        ...variant,
      }))
    : undefined;

  const main = (
    <CodeBlock
      code={snippet.code}
      language={snippet.lang}
      filename={snippet.title}
      {...(labels?.[snippet.code] ? { displayLanguage: labels[snippet.code] } : {})}
      {...(variants ? { variants } : {})}
      className="rounded-lg m-0"
    />
  );
  if (!snippet.vite) return main;

  const vite = snippet.vite;
  const viteJs = jsSources?.[vite.code];
  const viteVariants = viteJs
    ? pairWithJavaScript(vite, viteJs)?.map((variant) => ({ ...variant }))
    : undefined;

  return (
    <>
      {main}
      <CodeBlock
        code={vite.code}
        language={vite.lang}
        filename={vite.title}
        {...(labels?.[vite.code] ? { displayLanguage: labels[vite.code] } : {})}
        {...(viteVariants ? { variants: viteVariants } : {})}
        className="rounded-lg m-0 mt-3"
      />
    </>
  );
}

export function ScopedThemeGuide({
  jsSources,
  labels,
}: {
  /** Derived JavaScript for every snippet on the page, keyed by its source. */
  jsSources?: Record<string, string>;
  /** Compatibility badge per snippet, also keyed by source. */
  labels?: Record<string, string>;
}) {
  const block = (snippet: Snippet) => snippetBlock(snippet, jsSources, labels);
  const [selectedFramework, setSelectedFramework] = useState("react");
  const selectedExample = getExample(scopeExamples, selectedFramework);
  const imperativeExample = getExample(imperativeExamples, selectedFramework);
  const localThemeExample = getExample(localThemeExamples, selectedFramework);
  const transitionExample = getExample(transitionExamples, selectedFramework);
  const nestedScopeExample = getExample(nestedScopeExamples, selectedFramework);

  return (
    <>
      <Prerequisites
        items={[
          {
            label: "Themvora provider mounted",
            value: "A global ThemeProvider wrapping your app",
            href: "/quick-start",
          },
          {
            label: "Custom themes defined",
            value: "At least one theme to apply to a scope",
            href: "/custom-themes",
          },
          {
            label: "Framework adapter installed",
            value: "@themvora/react, /next, /vue, or /angular",
            href: "/get-started",
          },
        ]}
      />

      <div className="mt-10">
        <FrameworkPicker
          value={selectedFramework}
          onChange={setSelectedFramework}
          label="Pick your framework"
          scrollToId="theme-scope"
        />
      </div>

      <section id="theme-scope" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={1}
          desc="The same scoping primitive in every adapter. Select a framework to see the exact implementation."
        >
          ThemeScope — pick your framework
        </SectionHeading>
        {block(selectedExample)}
        <Callout className="mt-3">
          <strong>How a scope selects its theme</strong>{" "}
          <span className="mx-1 opacity-40">|</span>
          Pass an exact theme name like{" "}
          <code className="mono text-[0.9em]">plum-dark</code>, a family name —
          the scope resolves the family&apos;s theme for the current mode — or
          split them into <code className="mono text-[0.9em]">family</code> +{" "}
          <code className="mono text-[0.9em]">mode</code> props. Omit both to
          mirror the global selection inside a fresh boundary. Every prop is
          reactive: when <code className="mono text-[0.9em]">theme</code>
          changes, the scope re-resolves and animates without a remount. An
          unregistered name falls back to the first theme.
        </Callout>
      </section>

      <section id="imperative" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={2}
          desc="When you don't control JSX or markup — e.g. a video player or legacy DOM — scope a raw element directly."
        >
          Imperative scoping
        </SectionHeading>
        {block({
          lang: "ts",
          title: "core/vanilla — createScopedThemeBinding",
          code: `import {
  createThemeRuntime,
  createScopedThemeBinding,
  getBuiltInThemes,
} from "@themvora/core";

// createScopedThemeBinding takes the registry positionally; the built-in set
// is a valid registry, so no theme file is needed. createThemeRuntime falls
// back to it on its own.
const themes = getBuiltInThemes();

const runtime = createThemeRuntime({ defaultTheme: "light" });

const binding = createScopedThemeBinding(themes, el, "plum-dark");

binding.destroy();`,
        })}
        <div className="mt-3">{block(imperativeExample)}</div>
      </section>

      <section id="local-themes" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={3}
          desc="Themes defined on the scope itself — for genuinely isolated components that ship their own palette. No second runtime is created."
        >
          Local themes
        </SectionHeading>
        {block(localThemeExample)}
        <Callout className="mt-3">
          <strong>local themes resolve first</strong>{" "}
          <span className="mx-1 opacity-40">|</span>A scope&apos;s{" "}
          <code className="mono text-[0.9em]">themes</code> are layered on top
          of the provider&apos;s registry: a local theme with the same name
          shadows the parent&apos;s, and anything a local theme doesn&apos;t
          define falls through to the app&apos;s themes (its{" "}
          <code className="mono text-[0.9em]">extends</code> chain is merged, so
          inherited tokens resolve). Late-loaded packs work too — swapping the{" "}
          <code className="mono text-[0.9em]">themes</code> array re-resolves
          the scope in place. The imperative equivalent passes{" "}
          <code className="mono text-[0.9em]">localThemes</code> to{" "}
          <code className="mono text-[0.9em]">createScopedThemeBinding</code>.
        </Callout>
      </section>

      <section id="transitions" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={4}
          desc="Scoped theme changes animate through the same transition engine — inheriting the provider's config unless you say otherwise."
        >
          Transitions
        </SectionHeading>
        {block(transitionExample)}
        <Callout className="mt-3">
          <strong>inheritance model</strong>{" "}
          <span className="mx-1 opacity-40">|</span>
          <code className="mono text-[0.9em]">
            Provider transition → Scope → inherited defaults → local overrides
          </code>
          . Passing an object merges over the provider&apos;s{" "}
          <code className="mono text-[0.9em]">ThemeTransitionOptions</code>{" "}
          (duration, easing, preset, View Transitions), so a scoped change
          animates smoothly with the rest of the app while letting you tweak
          just what&apos;s different. Reduced-motion users get an instant swap.
        </Callout>
      </section>

      <section id="how-it-works" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={5}
          desc="A scope is a plain element that emits the theme's variables into its own subtree — nothing leaks outside."
        >
          How a scope works
        </SectionHeading>

        <div className="mb-4">{block(nestedScopeExample)}</div>

        <ul className="text-sm opacity-80 leading-relaxed list-disc pl-5 space-y-1.5">
          <li>
            The scope element renders every token of the target theme as{" "}
            <code className="mono text-[0.9em]">--theme-*</code> CSS custom
            properties on itself, so children just consume them.
          </li>
          <li>
            Tailwind is supported directly — scopes also emit{" "}
            <code className="mono text-[0.9em]">--color-*</code> and{" "}
            <code className="mono text-[0.9em]">--radius-*</code> aliases, so
            utilities like <code className="mono text-[0.9em]">bg-card</code>{" "}
            pick up the scoped palette.
          </li>
          <li>
            Scopes nest arbitrarily — an inner{" "}
            <code className="mono text-[0.9em]">ThemeScope</code> overrides the
            outer one for its own subtree.
          </li>
          <li>
            The scope resolves its theme from the registry, so it updates
            automatically when the global mode changes (family fallback), and
            re-renders when the underlying theme definition is swapped. It also
            follows the catalog itself: when the provider&apos;s{" "}
            <code className="mono text-[0.9em]">themes</code> changes, every
            scope re-resolves in place — a scope whose theme left the catalog
            moves to the catalog&apos;s first theme rather than keeping stale
            variables.
          </li>
          <li>
            Server-rendered scopes pre-paint correctly too: an explicit
            selection (exact name, or a light/dark family mode) renders its
            variables inline, while an OS-dependent selection (a{" "}
            <code className="mono text-[0.9em]">system</code> mode, or a
            boundary scope following a system selection) ships a{" "}
            <code className="mono text-[0.9em]">
              @media (prefers-color-scheme: dark)
            </code>{" "}
            block so the first paint already matches the OS — no flash of the
            wrong scoped theme before hydration.
          </li>
        </ul>
      </section>

      <NextSteps
        steps={[
          {
            title: "Nest scopes for complex layouts",
            description: "Apply multiple scoped themes in nested sections",
            href: "#nested-scopes",
          },
          {
            title: "Add scope transitions",
            description: "Animate theme changes within a scope",
            href: "#transitions",
          },
          {
            title: "Explore advanced features",
            description:
              "History, plugins, scheduled themes, and token resolution",
            href: "/advanced-features",
          },
        ]}
      />

      <RelatedLinks
        links={[
          {
            title: "Playground",
            description: "See scoped themes in action with a live runtime",
            href: "/playground",
          },
          {
            title: "API Reference",
            description: "ThemeScopeProps and useScopedTheme for every adapter",
            href: "/api-reference/react",
          },
          {
            title: "Custom Themes",
            description: "Define themes to apply in scoped contexts",
            href: "/custom-themes",
          },
        ]}
      />
    </>
  );
}
