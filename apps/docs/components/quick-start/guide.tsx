"use client";

import { useState } from "react";

import { CodeBlock } from "../code-block";
import { Callout } from "../ui/callout";
import { InlineCode } from "../ui/inline-code";
import { PickCard } from "../ui/pick-card";
import { NextSteps } from "../ui/next-step-card";
import { ThemedExample } from "../example-ui/themed-example";
import { useScrollToOnChange } from "../ui/use-scroll-to-on-change";
import {
  frameworks,
  CANONICAL_STYLES_NOTE,
  CANONICAL_STYLES_STEP,
} from "../../lib/frameworks";
import type { CodeContent } from "../../lib/code-variants";
import { InstallCommand, type PackageManager } from "../install-command";

export function QuickStartGuide({
  frameworkContent,
  setupExtraContent,
  switchContent,
  stylesHtml,
  installCommands,
  astroContent,
  uiExampleContent,
}: {
  /**
   * Pre-highlighted content per framework slug.
   *
   * Each entry carries the markup for the TypeScript form, plus the JavaScript
   * form when one exists. `variants` absent means the snippet has no second
   * form — CSS, a type-only declaration, or code that is already JavaScript —
   * and the block renders without a selector from its own `html`.
   */
  frameworkContent: Record<string, CodeContent>;
  /** Content for a second setup file, where a framework needs one. */
  setupExtraContent: Record<string, CodeContent | undefined>;
  /** Content for the switching snippet. */
  switchContent: Record<string, CodeContent>;
  /**
   * Shiki HTML for the canonical stylesheet.
   *
   * One string, not a per-framework map: every entry points at the same
   * stylesheet, and only the file name differs — the name comes from the entry,
   * the highlighted source does not. CSS has no language variants.
   */
  stylesHtml: string;
  /** Precomputed install-command HTML per framework package name. */
  installCommands: Record<
    string,
    Record<PackageManager, { code: string; html: string }>
  >;
  /**
   * Astro only — its two application shapes.
   *
   * Astro is the one framework here with two supported setups, so without this
   * the page would teach one shape's install and config and the other's
   * switcher. `undefined` for every single-setup framework.
   */
  astroContent?:
    | {
        /** `snippet2` — the framework-free switch (`<ThemeToggle />`). */
        onlySwitch: CodeContent;
        /** `reactSetup` — the integration config with the React renderer. */
        reactSetup: CodeContent | undefined;
        /** Content for each setup file, keyed by the snippet's title. */
        setupContent: Record<string, CodeContent | undefined>;
        /** Install commands that include the React renderer. */
        reactInstall: Record<PackageManager, { code: string; html: string }>;
      }
    | undefined;
  /** Content for each framework's markup for the small themed UI. */
  uiExampleContent: Record<string, CodeContent | undefined>;
}) {
  const [slug, setSlug] = useState("next");
  const fw = frameworks.find((f) => f.slug === slug) ?? frameworks[0]!;

  const switcher = fw.switchSnippet ?? fw.snippet;

  // Astro has two shapes; every other framework has one setup, so the shape
  // state is inert for them. The framework-free shape is the default, because
  // Quick Start's promise is the shortest path and that one needs no client
  // framework at all.
  const isAstro = fw.slug === "astro" && astroContent !== undefined;
  const [astroShape, setAstroShape] = useState<"only" | "react">("only");
  const reactShape = isAstro && astroShape === "react";
  // Captured in a local so the narrowing survives into the render callback.
  const astroGuide = isAstro ? fw.setupGuide : undefined;

  // The small UI follows the chosen framework. The Astro + React shape uses the
  // React component so its markup shows `className`, not an `.astro` template.
  const reactFramework = frameworks.find((f) => f.slug === "react")!;
  const uiSnippet = reactShape ? reactFramework.uiExample : fw.uiExample;
  const uiSnippetContent = uiExampleContent[reactShape ? "react" : fw.slug];

  // Step 1 — the React shape installs a renderer the framework-free shape does
  // not, so the command follows the shape rather than being shared.
  const install = reactShape
    ? astroContent!.reactInstall
    : installCommands[fw.pkg]!;

  // Step 2 — registration. Astro's setup is three files (the theme config, the
  // integration config, and the layout that mounts the provider); every other
  // framework needs one or two. The React shape swaps only the integration
  // config, because `theme.config.ts` and the layout are identical in both.
  const useReactSetup = reactShape && fw.reactSetup !== undefined;
  const setup = useReactSetup ? fw.reactSetup! : fw.noTheme;
  const setupContent = useReactSetup
    ? astroContent!.reactSetup
    : frameworkContent[fw.slug];
  const astroSetup = isAstro
    ? [fw.quickStart, useReactSetup ? fw.reactSetup! : fw.noTheme, fw.snippet]
    : null;

  // Step 3 — the switcher. The framework-free shape uses the native
  // `<ThemeToggle />`; the React shape uses the island.
  const showReactSwitcher = reactShape || !isAstro;
  const switchSnippet = showReactSwitcher ? switcher : fw.snippet2;
  const switchSnippetContent = showReactSwitcher
    ? switchContent[fw.slug]
    : astroContent!.onlySwitch;

  // Scroll to the Install step after the framework change commits, so the
  // reader lands on the updated install command for the framework they picked.
  useScrollToOnChange("install", slug);

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-lg font-semibold tracking-tight mb-2">
          Pick your framework
        </h2>
        <p className="opacity-70 text-sm mb-5 max-w-2xl">
          Themvora ships a built-in neutral theme, so you can skip defining
          tokens entirely and still get a complete, toggleable light/dark theme.
          These snippets are the whole setup.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {frameworks.map((f) => (
            <PickCard
              key={f.slug}
              icon={f.icon}
              title={f.name}
              subtitle={f.pkg}
              active={f.slug === slug}
              onSelect={() => setSlug(f.slug)}
            />
          ))}
        </div>
      </section>

      {/* Astro is the one framework here with two supported shapes, so the
          reader picks one before installing rather than discovering a
          React-specific import halfway down a React-free setup. Deliberately
          not an <h2>: this is a control over the steps below, not a section of
          its own, and keeping it out of the heading set leaves the TOC rail's
          manifest untouched. */}
      {astroGuide ? (
        <div className="mb-10" role="group" aria-label="Astro setup">
          <p className="text-sm font-semibold mb-2">Astro setup</p>
          <p className="opacity-70 text-sm mb-3 max-w-2xl">
            Astro supports two shapes here, and they differ in whether the app
            ships a client framework at all. Pick one — the steps below follow
            it, and the framework guide explains what the two share.
          </p>
          <div className="flex flex-wrap gap-2">
            {astroGuide.choose.paths.map((path, index) => {
              const value = index === 0 ? "only" : "react";
              const active = astroShape === value;
              return (
                <button
                  key={path.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAstroShape(value)}
                  className={`chip ${active ? "chip-active" : ""}`}
                >
                  {path.name}
                  <span className="opacity-70 text-xs">{path.badge}</span>
                </button>
              );
            })}
          </div>
          <p className="opacity-70 text-xs mt-2">
            <a
              href={`/framework-guides/astro#${astroGuide.choose.paths[reactShape ? 1 : 0].id}`}
              className="text-foreground no-underline underline hover:decoration-foreground"
            >
              Read the full Astro guide →
            </a>
          </p>
        </div>
      ) : null}

      <section id="install" className="mb-10 scroll-mt-24">
        <h2 className="text-lg font-semibold tracking-tight mb-2">
          1 · Install
        </h2>
        <p className="opacity-70 text-sm mb-4 max-w-2xl">
          {reactShape
            ? "The same Themvora packages, plus the React renderer Astro needs to hydrate an island."
            : fw.cssOnly
              ? "Install the mapping package, Tailwind v4 itself, and the core package it builds on."
              : fw.extraPackages?.length
                ? "Install the core package, the integration, and the runtime adapter the snippets below use."
                : "Install the core package and the adapter for your framework."}
        </p>
        <InstallCommand commands={install} />
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold tracking-tight mb-2">
          2 · Set up
        </h2>
        <p className="opacity-70 text-sm mb-4 max-w-2xl">
          {astroSetup ? (
            "Three files. theme.config.ts declares the themes and the starting mode, the integration config registers themvora(), and the layout mounts the provider that server-renders the themed <html>."
          ) : fw.guideSteps ? (
            <InlineCode>{fw.guideSteps[1]!.desc}</InlineCode>
          ) : (
            "Themvora ships the built-in themes, so there is nothing to define yet."
          )}
        </p>
        {astroSetup ? (
          astroSetup.map((snippet, index) => {
            const content = astroContent!.setupContent[snippet.title];
            // The page builds this map from the same three slots, so a miss is a
            // wiring bug. Omitting the block is the honest failure: a `CodeBlock`
            // with no markup paints an empty pane the reader cannot tell from a
            // snippet that is genuinely blank.
            if (!content) return null;
            return (
              <CodeBlock
                key={snippet.title}
                {...content}
                code={snippet.code}
                language={snippet.lang}
                filename={snippet.title}
                className={`rounded-lg m-0 ${index ? "mt-3" : ""}`}
              />
            );
          })
        ) : (
          <>
            <CodeBlock
              {...setupContent}
              code={setup.code}
              language={setup.lang}
              filename={setup.title}
              className="rounded-lg m-0"
            />
            {fw.setupExtra && setupExtraContent[fw.slug] ? (
              <CodeBlock
                {...setupExtraContent[fw.slug]}
                code={fw.setupExtra.code}
                language={fw.setupExtra.lang}
                filename={fw.setupExtra.title}
                className="rounded-lg m-0 mt-3"
              />
            ) : null}
          </>
        )}
        <Callout className="mt-3" title="Choosing the starting theme">
          <p className="text-sm leading-relaxed">
            <InlineCode>{fw.modeNote}</InlineCode>
          </p>
        </Callout>
        <Callout className="mt-3" title="Where the configuration lives">
          <p className="text-sm leading-relaxed">
            <InlineCode>{fw.configNote}</InlineCode>
          </p>
        </Callout>
      </section>

      <section id="ui" className="mb-10 scroll-mt-24">
        <h2 className="text-lg font-semibold tracking-tight mb-2">
          3 · Add a small UI
        </h2>
        <p className="opacity-70 text-sm mb-4 max-w-2xl">
          {reactShape ? (
            "A small status card rendered inside the island, with the framework's own class attribute. The native <ThemeToggle /> still works alongside it with no client runtime; nothing is styled yet."
          ) : fw.slug === "tailwind" ? (
            "The same card with Tailwind utilities. Every class resolves to a semantic token, so a theme switch repaints it without a re-render."
          ) : (
            "A small status card with a heading, a description, a status label and a primary button. The class names are ordinary CSS; the next step connects them to the theme."
          )}
        </p>
        {uiSnippet && uiSnippetContent ? (
          <CodeBlock
            {...uiSnippetContent}
            code={uiSnippet.code}
            language={uiSnippet.lang}
            filename={uiSnippet.title}
            className="rounded-lg m-0"
          />
        ) : null}
        {reactShape ? (
          <Callout className="mt-3" title="Mount the island">
            <p className="text-sm leading-relaxed">
              Write one island whose tree holds both the provider and its
              consumers — <span className="mono">ThemeProviderClient</span>{" "}
              renders nothing, it installs the runtime — then mount it from a
              page with <span className="mono">client:load</span>. React hooks
              are not available in <span className="mono">.astro</span> files.
            </p>
          </Callout>
        ) : null}
      </section>

      <section id="themed-component" className="mb-10 scroll-mt-24">
        <h2 className="text-lg font-semibold tracking-tight mb-2">
          4 · {CANONICAL_STYLES_STEP.label}
        </h2>
        <p className="opacity-70 text-sm mb-4 max-w-2xl">
          {CANONICAL_STYLES_STEP.desc} The document rule uses only the two
          required foundational colours; the component rules use only required
          semantic colours, so no typography token is involved.
        </p>
        <div
          className="rounded-xl border border-border p-5 mb-4"
          style={{ background: "var(--theme-color-background)" }}
        >
          <ThemedExample />
        </div>
        <CodeBlock
          html={stylesHtml}
          code={fw.styles.code}
          language={fw.styles.lang}
          filename={fw.styles.title}
          className="rounded-lg m-0"
        />
        <Callout
          className="mt-3"
          title="Why this never needs a second stylesheet"
        >
          <p className="text-sm leading-relaxed">
            <InlineCode>{CANONICAL_STYLES_NOTE}</InlineCode>
          </p>
        </Callout>
        {fw.cssOnly ? (
          <p className="opacity-70 text-sm mt-4 max-w-2xl">
            The utilities in step 3 read the same required colour roles —{" "}
            <code className="mono text-[0.9em]">background</code>,{" "}
            <code className="mono text-[0.9em]">foreground</code>,{" "}
            <code className="mono text-[0.9em]">card</code>,{" "}
            <code className="mono text-[0.9em]">cardForeground</code>,{" "}
            <code className="mono text-[0.9em]">border</code>,{" "}
            <code className="mono text-[0.9em]">mutedForeground</code>,{" "}
            <code className="mono text-[0.9em]">success</code>,{" "}
            <code className="mono text-[0.9em]">primary</code>,{" "}
            <code className="mono text-[0.9em]">primaryForeground</code> and{" "}
            <code className="mono text-[0.9em]">ring</code> — through the{" "}
            <code className="mono text-[0.9em]">@theme</code> block in{" "}
            <code className="mono text-[0.9em]">@themvora/tailwind</code>. This
            step only paints the document; the component styles are utilities,
            not a second stylesheet.
          </p>
        ) : (
          <p className="opacity-70 text-sm mt-4 max-w-2xl">
            The stylesheet is identical in every framework, and it is where the
            theme actually reaches the component. It reads ten required colour
            tokens —{" "}
            <code className="mono text-[0.9em]">background</code>,{" "}
            <code className="mono text-[0.9em]">foreground</code>,{" "}
            <code className="mono text-[0.9em]">card</code>,{" "}
            <code className="mono text-[0.9em]">cardForeground</code>,{" "}
            <code className="mono text-[0.9em]">border</code>,{" "}
            <code className="mono text-[0.9em]">mutedForeground</code>,{" "}
            <code className="mono text-[0.9em]">success</code>,{" "}
            <code className="mono text-[0.9em]">primary</code>,{" "}
            <code className="mono text-[0.9em]">primaryForeground</code> and{" "}
            <code className="mono text-[0.9em]">ring</code> — all of them
            required, so every theme that passes{" "}
            <code className="mono text-[0.9em]">validateTheme()</code> emits
            them. The two optional tokens it touches, radius and shadow, are
            read through a fallback so a theme without them still lays out
            correctly. It reads no typography token at all: the font is
            inherited, and the line height is an ordinary value, because a
            valid theme may define no typography.
          </p>
        )}
      </section>

      {!fw.cssOnly ? (
        <section id="choose-a-theme" className="mb-10 scroll-mt-24">
          <h2 className="text-lg font-semibold tracking-tight mb-2">
            5 · Run and choose a theme
          </h2>
          <p className="opacity-70 text-sm mb-4 max-w-2xl">
            {reactShape || fw.slug === "astro"
              ? "The toggle below writes to the runtime the provider installed. Switch between the supplied families — or a custom theme with the required colours — and the card from step 3 repaints."
              : fw.slug === "nuxt"
                ? "The control below reads and writes the runtime. Render it in app/app.vue as <ThemeSwitcher /> — Nuxt auto-registers anything in app/components/. Switch between the supplied families and the card from step 3 repaints."
                : "The control below reads and writes the runtime. Switch between the supplied families — or a custom theme with the required colours — and the card from step 3 repaints."}
          </p>
          <CodeBlock
            {...switchSnippetContent}
            code={switchSnippet.code}
            language={switchSnippet.lang}
            filename={switchSnippet.title}
            className="rounded-lg m-0"
          />
        </section>
      ) : null}

      <section className="mt-10 rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold tracking-tight mb-1">
          You&apos;re ready
        </h2>
        <p className="text-sm opacity-80 leading-relaxed">
          You have a provider, a small UI and a stylesheet that reads only the
          token contract every valid theme guarantees. Choose another supplied
          family — or pass a custom theme with the 21 required colours and
          nothing else — and the same card repaints.
        </p>
      </section>

      <NextSteps
        className="mt-12"
        steps={[
          {
            title: "Define custom themes",
            description: "Create your own color palettes and design tokens",
            href: "/custom-themes",
          },
          {
            title: "Framework-specific setup",
            description:
              "Deep dive into SSR, zero-flash, and framework patterns",
            href: "/framework-guides",
          },
          {
            title: "Library adapters",
            description:
              "Integrate with shadcn/ui, Bootstrap, daisyUI, and more",
            href: "/libraries",
          },
        ]}
      />
    </div>
  );
}
