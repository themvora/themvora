"use client";

import { useState } from "react";

import { CodeBlock } from "../code-block";
import { InstallCommandPair } from "../install-command-pair";
import { SectionHeading } from "../ui/section-heading";
import { StepperSection } from "../ui/stepper-section";
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
import {
  QUICK_START_COMPONENT_STYLES,
  QUICK_START_DOCUMENT_STYLES,
  QUICK_START_GLOBAL_STYLES,
  QUICK_START_LOADERS,
  QUICK_START_SWITCHES,
} from "../../lib/quick-start-snippets";
import type { CodeContent } from "../../lib/code-variants";
import { InstallCommand, type PackageManager } from "../install-command";

export function QuickStartGuide({
  frameworkContent,
  setupExtraContent,
  buildConfigContent,
  themeConfigContent,
  switchContent,
  appFileContent,
  globalStylesHtml,
  globalStylesOnlyHtml,
  styleContent,
  installCommands,
  prerequisiteInstallCommands,
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
  /**
   * Web Components only — the Vite integration and the `theme.config.ts`
   * registry. Both are defined on the entry's `buildConfig`/`themeConfig`
   * slots and rendered before the page markup in step 2.
   */
  buildConfigContent: Record<string, CodeContent | undefined>;
  themeConfigContent: Record<string, CodeContent | undefined>;
  /** Content for the switching snippet. */
  switchContent: Record<string, CodeContent>;
  /** Content for the file that mounts the components, where a framework needs one. */
  appFileContent: Record<string, CodeContent | undefined>;
  /**
   * Shiki HTML for the global stylesheet.
   *
   * `globalStylesHtml` is the document rule plus the four run-step classes;
   * `globalStylesOnlyHtml` is the document rule alone, which is all Tailwind
   * needs. Only the file name differs per framework, so these are one string
   * each rather than a map. CSS has no language variants.
   */
  globalStylesHtml: string;
  globalStylesOnlyHtml: string;
  /**
   * Shiki HTML for the styling step, per framework.
   *
   * Runtime frameworks render the component half of the canonical stylesheet;
   * Tailwind renders its token→utility map instead.
   */
  styleContent: Record<string, CodeContent | undefined>;
  /** Precomputed install-command HTML per framework package name. */
  installCommands: Record<
    string,
    Record<PackageManager, { code: string; html: string }>
  >;
  /** Optional second command for a project that has no framework yet. */
  prerequisiteInstallCommands: Record<
    string,
    Record<PackageManager, { code: string; html: string }> | undefined
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
        /** The framework-free switch (`<ThemeToggle />`). */
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

  const quickStartSwitcher = QUICK_START_SWITCHES[fw.slug];

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
    : installCommands[fw.slug]!;

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
  const switchSnippet = showReactSwitcher
    ? (quickStartSwitcher ?? fw.switchSnippet ?? fw.snippet)
    : QUICK_START_SWITCHES["astro-native"]!;
  const switchSnippetContent = showReactSwitcher
    ? switchContent[fw.slug]
    : astroContent!.onlySwitch;

  // Step 4 (3 for CSS-only) — the global stylesheet. Runtime frameworks get the
  // document rule plus the four classes from step 3; Tailwind has no run step,
  // so it gets the document rule alone.
  const globalStylesCode = fw.cssOnly
    ? QUICK_START_DOCUMENT_STYLES
    : QUICK_START_GLOBAL_STYLES;
  const globalStylesMarkup = fw.cssOnly
    ? globalStylesOnlyHtml
    : globalStylesHtml;
  const stylesheetLoader = QUICK_START_LOADERS[fw.slug];

  // Step 6 (5 for CSS-only) — the component rules. Tailwind's styling step is
  // the token→utility map instead, because its utilities need no component
  // stylesheet.
  const styleSnippet =
    fw.cssOnly && fw.snippet2
      ? fw.snippet2
      : {
          title: fw.styles.title,
          lang: "css",
          code: QUICK_START_COMPONENT_STYLES,
        };

  // Scroll to the Install step after the framework change commits, so the
  // reader lands on the updated install command for the framework they picked.
  useScrollToOnChange("install", slug);

  // The runtime flow is six steps; Tailwind is CSS-only and has no run step, so
  // its later steps shift down by one. Deriving the offset once keeps the badge
  // numbers and the prose ("the classes from step 3") from drifting apart.
  const stepOffset = fw.cssOnly ? -1 : 0;

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
        <div className="docs-card-grid">
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

      <StepperSection id="install" className="mb-10" first>
        <SectionHeading
          num={1}
          stepper
          desc={
            <span className="block max-w-2xl">
              {reactShape
                ? "The same Themvora packages, plus the React renderer Astro needs to hydrate an island."
                : fw.cssOnly
                  ? "Install the mapping package, Tailwind v4 itself, and the core package it builds on."
                  : fw.extraPackages?.length
                    ? "Install the core package, the integration, and the runtime adapter the snippets below use."
                    : "Install the core package and the adapter for your framework."}
            </span>
          }
        >
          Install
        </SectionHeading>
        {fw.prerequisiteInstall &&
        prerequisiteInstallCommands[fw.slug] ? (
          <InstallCommandPair
            primary={install}
            secondary={prerequisiteInstallCommands[fw.slug]!}
            secondaryLabel={fw.prerequisiteInstall.label}
          />
        ) : (
          <InstallCommand commands={install} />
        )}
      </StepperSection>

      <StepperSection className="mb-10">
        <SectionHeading
          num={2}
          stepper
          desc={
            <span className="block max-w-2xl">
              {astroSetup ? (
                "Three files. theme.config.ts declares the themes and the starting mode, the integration config registers themvora(), and the layout mounts the provider that server-renders the themed <html>."
              ) : fw.guideSteps ? (
                <InlineCode>{fw.guideSteps[1]!.desc}</InlineCode>
              ) : (
                "Themvora ships the built-in themes, so there is nothing to define yet."
              )}
            </span>
          }
        >
          Set up
        </SectionHeading>
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
            {fw.slug === "web" &&
            fw.buildConfig &&
            buildConfigContent[fw.slug] ? (
              <CodeBlock
                {...buildConfigContent[fw.slug]}
                code={fw.buildConfig.code}
                language={fw.buildConfig.lang}
                filename={fw.buildConfig.title}
                className="rounded-lg m-0"
              />
            ) : null}
            {fw.slug === "web" &&
            fw.themeConfig &&
            themeConfigContent[fw.slug] ? (
              <CodeBlock
                {...themeConfigContent[fw.slug]}
                code={fw.themeConfig.code}
                language={fw.themeConfig.lang}
                filename={fw.themeConfig.title}
                className="rounded-lg m-0 mt-3"
              />
            ) : null}
            <CodeBlock
              {...setupContent}
              code={setup.code}
              language={setup.lang}
              filename={setup.title}
              className={`rounded-lg m-0 ${
                fw.slug === "web" && fw.buildConfig ? "mt-3" : ""
              }`}
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
      </StepperSection>

      {!fw.cssOnly ? (
        <StepperSection id="choose-a-theme" className="mb-10">
          <SectionHeading
            num={3}
            stepper
            desc={
              <span className="block max-w-2xl">
                {reactShape || fw.slug === "astro"
                  ? "The toggle below writes to the runtime the provider installed. Flip light and dark and the card below repaints. "
                  : fw.slug === "nuxt"
                    ? "The toggle below reads and writes the runtime. Mount it with the card in app/app.vue — Nuxt auto-registers anything in app/components/. "
                    : fw.slug === "remix"
                      ? "The route below reads and writes the runtime. The toggle flips light and dark, and the card below repaints. "
                      : "The toggle below reads and writes the runtime. Flip light and dark and the card below repaints. "}
                The markup carries only the four classes —{" "}
                <InlineCode>page</InlineCode>, <InlineCode>primary</InlineCode>,{" "}
                <InlineCode>card</InlineCode> and <InlineCode>muted</InlineCode>{" "}
                — and no CSS.
              </span>
            }
          >
            Run and choose a theme
          </SectionHeading>
          <CodeBlock
            {...switchSnippetContent}
            code={switchSnippet.code}
            language={switchSnippet.lang}
            filename={switchSnippet.title}
            className="rounded-lg m-0"
          />
          {fw.appFile ? (
            <div className="mt-4">
              <p className="opacity-70 text-sm mb-2">
                Mount both components in <code className="mono">app/app.vue</code>:
              </p>
              <CodeBlock
                {...(appFileContent[fw.slug] ?? {})}
                code={fw.appFile.code}
                language={fw.appFile.lang}
                filename={fw.appFile.title}
                className="rounded-lg m-0"
              />
            </div>
          ) : null}
        </StepperSection>
      ) : null}

      <StepperSection id="global-stylesheet" className="mb-10">
        <SectionHeading
          num={4 + stepOffset}
          stepper
          desc={
            <span className="block max-w-2xl">
              {fw.cssOnly
                ? "Put the document rule in "
                : "Put the document rule and the four classes from step 3 in "}
              <InlineCode>{fw.styles.title}</InlineCode>. Themvora emits its
              design tokens as CSS custom properties on the root element, so
              this stylesheet only reads them.
            </span>
          }
        >
          Add the global stylesheet
        </SectionHeading>
        <CodeBlock
          html={globalStylesMarkup}
          code={globalStylesCode}
          language="css"
          filename={fw.styles.title}
          className="rounded-lg m-0"
        />
        {stylesheetLoader ? (
          <p className="opacity-70 text-sm mt-3 max-w-2xl">
            Load it once from <InlineCode>{stylesheetLoader.file}</InlineCode>{" "}
            with <InlineCode>{stylesheetLoader.code}</InlineCode>, so{" "}
            {fw.cssOnly
              ? "the document rule applies before any component styles."
              : "the classes from step 3 pick up the theme."}
          </p>
        ) : null}
      </StepperSection>

      <StepperSection id="ui" className="mb-10">
        <SectionHeading
          num={5 + stepOffset}
          stepper
          desc={
            <span className="block max-w-2xl">
              {reactShape
                ? "A small status card rendered inside the island, with the framework's own class attribute. The native <ThemeToggle /> still works alongside it with no client runtime; the card's own classes are not styled yet."
                : fw.slug === "tailwind"
                  ? "The same card with Tailwind utilities. Every class resolves to a semantic token, so a theme switch repaints it without a re-render."
                  : "A small status card with a heading, a description, a status label and a primary button. The class names are ordinary CSS; the next step connects them to the theme."}
            </span>
          }
        >
          Add a small UI
        </SectionHeading>
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
      </StepperSection>

      <StepperSection id="themed-component" className="mb-10" last>
        <SectionHeading
          num={6 + stepOffset}
          stepper
          desc={
            <span className="block max-w-2xl">
              {CANONICAL_STYLES_STEP.desc}{" "}
              {fw.cssOnly
                ? "The global stylesheet above paints the document; the utilities from the previous step only read the required colour roles."
                : "These component rules use only required semantic colours, so no typography token is involved. The document rule lives in the global stylesheet above."}
            </span>
          }
        >
          {CANONICAL_STYLES_STEP.label}
        </SectionHeading>
        <div
          className="rounded-xl border border-border p-5 mb-4"
          style={{ background: "var(--theme-color-background)" }}
        >
          <ThemedExample />
        </div>
        <CodeBlock
          {...styleContent[fw.slug]}
          code={styleSnippet.code}
          language={styleSnippet.lang}
          filename={fw.styles.title}
          className="rounded-lg m-0"
        />
        <Callout
          className="mt-3"
          title="This never needs a second stylesheet"
        >
          <p className="text-sm leading-relaxed">
            <InlineCode>{CANONICAL_STYLES_NOTE}</InlineCode>
          </p>
        </Callout>
        {fw.cssOnly ? (
          <p className="opacity-70 text-sm mt-4 max-w-2xl">
            The utilities in step 4 read the same required colour roles —{" "}
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
            <code className="mono text-[0.9em]">@themvora/tailwind</code>. The
            global stylesheet above paints the document; the component styles
            are utilities, not a second stylesheet.
          </p>
        ) : (
          <p className="opacity-70 text-sm mt-4 max-w-2xl">
            These component rules are identical in every framework, and they are
            where the theme actually reaches the component. They read eight
            required colour tokens —{" "}
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
      </StepperSection>

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
