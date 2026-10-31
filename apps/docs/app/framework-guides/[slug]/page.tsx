import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocsLayout } from "../../../components/docs-layout";
import { CodeExample } from "../../../components/code-example";
import { Callout } from "../../../components/ui/callout";
import { DocHeader } from "../../../components/ui/doc-header";
import { Prerequisites } from "../../../components/ui/prerequisites";
import { RelatedLinks } from "../../../components/ui/related-links";
import { InlineCode } from "../../../components/ui/inline-code";
import { SectionHeading } from "../../../components/ui/section-heading";
import { ApiExplorer } from "../../../components/api-explorer";
import {
  InstallCommand,
  type PackageManager,
} from "../../../components/install-command";
import {
  frameworks,
  CANONICAL_STYLES_NOTE,
} from "../../../lib/frameworks";
import type { FrameworkSnippet } from "../../../lib/frameworks";
import { frameworkCompatibilityData } from "../../../lib/compatibility-data";
import type { SupportLevel } from "../../../components/ui/support-badge";
import { frameworkUseCases } from "../../../lib/use-cases";
import { anchorForCategory, anchorForFeature } from "../../../lib/framework-examples";
import { highlightCode } from "../../../lib/highlight";
import { ThemedExample } from "../../../components/example-ui/themed-example";
import { PKG_VERSION } from "../../../lib/version";
import { docsUrl } from "../../../lib/site";
import {
  WhichReactSetupPanel,
  OptimizedCsrBootstrap,
} from "../../../components/framework-guides/react-bootstrap";
import { AstroSetupGuide } from "../../../components/framework-guides/astro-guide";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const MANAGERS: PackageManager[] = ["pnpm", "npm", "yarn", "bun"];

/**
 * Section anchors for the onboarding steps, by position.
 *
 * Positional rather than keyed by label: the labels differ per framework ("Create
 * the root and wrap it", "Register the providers at bootstrap"), but the step a
 * reader links to is always the second or third one. The first step is the
 * install command and has no anchor, because nothing links to it.
 */
const STEP_ANCHORS = ["", "setup", "ui", "styling"];

/**
 * One block in the guide's second examples section.
 *
 * The caption is part of the snippet's definition rather than the page's prose,
 * so the sentence that explains a block travels with the code it explains. A
 * filename alone is not an explanation — `index.html` and `App.tsx` each appear
 * more than once across the guides.
 *
 * `slug` is the guide's own framework. It decides whether the block may carry a
 * language selector at all: Angular's documentation is TypeScript-only by
 * decision, so its snippets never pair.
 */
function ExampleBlock({
  snippet,
  slug,
}: {
  snippet: FrameworkSnippet;
  slug: string;
}) {
  return (
    <div>
      <CodeExample
        code={snippet.code}
        lang={snippet.lang}
        framework={slug}
        filename={snippet.title}
        {...(snippet.js ? { js: snippet.js } : {})}
        {...(snippet.jsFilename ? { jsFilename: snippet.jsFilename } : {})}
        className="rounded-lg m-0"
      />
      {snippet.caption ? (
        <p className="text-sm opacity-70 mt-2">
          <InlineCode>{snippet.caption}</InlineCode>
        </p>
      ) : null}
    </div>
  );
}

function installCommand(pkgs: string, manager: PackageManager): string {
  return manager === "npm" ? `npm install ${pkgs}` : `${manager} add ${pkgs}`;
}

/** Build one `InstallCommand` prop set — one entry per package manager. */
function installCommandsFor(pkgs: string) {
  return Object.fromEntries(
    MANAGERS.map((manager) => [
      manager,
      {
        code: installCommand(pkgs, manager),
        html: highlightCode(installCommand(pkgs, manager), "bash"),
      },
    ]),
  ) as Record<PackageManager, { code: string; html: string }>;
}

export function generateStaticParams() {
  return frameworks.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const framework = frameworks.find((f) => f.slug === slug);
  if (!framework) return { title: "Framework Guide" };
  return {
    title: framework.name,
    description: framework.tagline,
    alternates: { canonical: docsUrl(`/framework-guides/${slug}`) },
  };
}

export default async function FrameworkGuidePage({ params }: PageProps) {
  const { slug } = await params;
  const framework = frameworks.find((f) => f.slug === slug);
  if (!framework) notFound();

  // Astro's guide is shape-driven (Astro-only vs Astro + React) rather than a
  // single onboarding sequence, so it renders its own steps and the generic
  // ones are skipped. See components/framework-guides/astro-guide.tsx.
  const isAstro = framework.slug === "astro";

  // The same package list Quick Start installs, so the two pages cannot tell a
  // reader to install different things: the shared core, this framework's
  // adapter, and any runtime an integration needs on top (Tailwind's).
  const pkgs = [
    "@themvora/core",
    framework.pkg,
    ...(framework.extraPackages ?? []),
  ].join(" ");

  const commands = installCommandsFor(pkgs);

  // Astro's two paths install different things. The Astro-only path stays
  // framework-free; the Astro + React path adds the renderer Astro needs to
  // hydrate an island. Both sets are passed so each path's install step renders
  // a command that is complete on its own — the reader never has to work out
  // which extra packages the React path needs from the prose.
  const astroInstallCommands = {
    base: commands,
    renderer: installCommandsFor(`${pkgs} @astrojs/react react react-dom`),
  };

  const useCases = frameworkUseCases[framework.slug] ?? [];

  // Feature name → the anchor that documents it on this framework's examples
  // page. Computed here, on the server, so the client-side index ships a small
  // lookup instead of the whole examples corpus. A feature with no entry maps to
  // `null` and simply renders without a link — the coverage gate is what keeps
  // that from happening, not the UI.
  const exampleAnchors = Object.fromEntries(
    framework.groups.flatMap((group) =>
      group.features.map((feature) => [
        feature.name,
        anchorForFeature(framework.slug, feature.name)?.anchor ?? null,
      ]),
    ),
  );

  const examplesHref = `/framework-guides/${framework.slug}/examples`;

  // Group label → examples-page category anchor, so each group header in the
  // index is a real link rather than a label the reader has to hunt past.
  const categoryAnchors = Object.fromEntries(
    framework.groups.map((group) => [
      group.label,
      anchorForCategory(framework.slug, group.label),
    ]),
  );

  // Read SSR and zero-flash from the compatibility table rather than from the
  // tag list, so the header can never disagree with /reference/compatibility.
  const compatibility = frameworkCompatibilityData.find(
    (entry) => entry.package === framework.pkg,
  );

  const ssrLevel: SupportLevel | undefined =
    compatibility === undefined || compatibility.ssr === "N/A"
      ? undefined
      : compatibility.ssr === "Full"
        ? "yes"
        : compatibility.ssr === "Helpers"
          ? "partial"
          : "no";

  const zeroFlashLevel: SupportLevel | undefined =
    compatibility === undefined || compatibility.zeroFlash === "N/A"
      ? undefined
      : compatibility.zeroFlash === "Auto"
        ? "yes"
        : compatibility.zeroFlash === "Manual"
          ? "partial"
          : "no";

  return (
    <DocsLayout>
      <article className="min-w-0 max-w-3xl">
        <DocHeader
          title={framework.name}
          description={framework.tagline}
          metadata={{
            package: framework.pkg,
            framework: framework.name,
            version: PKG_VERSION,
            lastVerified: "2026-09-17",
            status: "stable",
            ...(ssrLevel ? { ssr: ssrLevel } : {}),
            ...(zeroFlashLevel ? { zeroFlash: zeroFlashLevel } : {}),
          }}
        />

        {framework.slug === "react" ? <WhichReactSetupPanel /> : null}

        <Prerequisites
          items={[
            {
              label: "Runtime",
              value:
                "Node.js 18+ and a package manager (npm, pnpm, yarn, or bun)",
            },
            {
              label: "Project",
              value:
                framework.projectPrerequisite ??
                `A ${framework.name} project${ssrLevel ? " with SSR support" : ""}`,
            },
            ...(framework.slug === "angular"
              ? [
                  {
                    label: "Toolchain",
                    value:
                      "Angular 17+ using the standalone bootstrap API — your Angular version also sets the TypeScript and Node versions you need",
                  },
                ]
              : []),
            ...(framework.slug === "tailwind"
              ? [
                  {
                    label: "Adapter",
                    value:
                      "A Themvora runtime for your framework — @themvora/react, -vue, -svelte, -solid, -angular or -web. Tailwind itself is build-time only.",
                  },
                ]
              : []),
          ]}
        />

        {/* Astro supports two application shapes — Astro-only and Astro + React
            — so its guide presents that choice before the install step and
            gives each path its own steps. The generic onboarding sections
            below assume a single setup and would restate one path as if it
            were the only one, so they are replaced for Astro. */}
        {isAstro ? (
          <AstroSetupGuide
            framework={framework}
            installCommands={astroInstallCommands}
          />
        ) : null}

        {/* The onboarding steps come from the framework entry, not from this
            template. "Wrap the app in the provider" is the right instruction for
            React and the wrong one for Angular (providers at bootstrap),
            Tailwind (no provider at all) and Web Components (an element in the
            markup), so a single sequence here can only be accurate for the
            frameworks it was written for. The anchors are positional because
            the order is the same even though the wording is not. */}
        {!isAstro && framework.guideSteps ? (
          <>
            {framework.guideSteps.map((step, index) => {
              const snippet = step.ref ? framework[step.ref] : undefined;
              const extra = step.refExtra ? framework[step.refExtra] : undefined;
              const sectionId = STEP_ANCHORS[index];
              return (
                <section
                  key={step.label}
                  {...(sectionId ? { id: sectionId } : {})}
                  className="mt-10 scroll-mt-24"
                >
                  <SectionHeading num={index + 1} desc={step.desc}>
                    {step.label}
                  </SectionHeading>
                  {step.install ? <InstallCommand commands={commands} /> : null}
                  {step.ref === "uiExample" ? (
                    <div
                      className="mb-4 rounded-xl border border-border p-5"
                      style={{ background: "var(--theme-color-background)" }}
                    >
                      <ThemedExample />
                    </div>
                  ) : null}
                  {snippet ? (
                    <CodeExample
                      code={snippet.code}
                      lang={snippet.lang}
                      framework={framework.slug}
                      filename={snippet.title}
                      {...(snippet.js ? { js: snippet.js } : {})}
                      {...(snippet.jsFilename ? { jsFilename: snippet.jsFilename } : {})}
                      className="rounded-lg m-0"
                    />
                  ) : null}
                  {extra ? (
                    <CodeExample
                      code={extra.code}
                      lang={extra.lang}
                      framework={framework.slug}
                      filename={extra.title}
                      {...(extra.js ? { js: extra.js } : {})}
                      {...(extra.jsFilename ? { jsFilename: extra.jsFilename } : {})}
                      className="rounded-lg m-0 mt-3"
                    />
                  ) : null}
                  {step.ref === "uiExample" && framework.uiExample?.caption ? (
                    <p className="text-sm opacity-70 mt-2">
                      <InlineCode>{framework.uiExample.caption}</InlineCode>
                    </p>
                  ) : null}
                  {step.note === "mode" ? (
                    <Callout className="mt-3" title="Choosing the starting theme">
                      <InlineCode>{framework.modeNote}</InlineCode>
                    </Callout>
                  ) : null}
                  {step.note === "styles" ? (
                    <Callout
                      className="mt-3"
                      title="Why this never needs a second stylesheet"
                    >
                      <InlineCode>{CANONICAL_STYLES_NOTE}</InlineCode>
                    </Callout>
                  ) : null}
                  {step.ref === "styles" && !framework.cssOnly ? (
                    <p className="text-sm opacity-80 mt-4">
                      The `body` rule uses exactly the two foundational colours
                      — `background` and `foreground`. Every component rule
                      reads one of the 21 colours `validateTheme()` requires, so
                      any valid theme emits it. Radius and shadow are optional
                      and carry fallbacks; no typography token is read, so a
                      theme without a typography group still renders correctly.
                    </p>
                  ) : null}
                  {step.ref === "styles" && framework.cssOnly ? (
                    <p className="text-sm opacity-80 mt-4">
                      The utilities in the previous step read the same required
                      colour roles —{" "}
                      <code className="mono text-[0.9em]">background</code>,{" "}
                      <code className="mono text-[0.9em]">foreground</code>,{" "}
                      <code className="mono text-[0.9em]">card</code>,{" "}
                      <code className="mono text-[0.9em]">cardForeground</code>,{" "}
                      <code className="mono text-[0.9em]">border</code>,{" "}
                      <code className="mono text-[0.9em]">mutedForeground</code>,{" "}
                      <code className="mono text-[0.9em]">success</code>,{" "}
                      <code className="mono text-[0.9em]">primary</code>,{" "}
                      <code className="mono text-[0.9em]">primaryForeground</code>{" "}
                      and <code className="mono text-[0.9em]">ring</code> — through
                      the <code className="mono text-[0.9em]">@theme</code> block
                      in <code className="mono text-[0.9em]">@themvora/tailwind</code>.
                      This step only paints the document; the component styles
                      are utilities, not a second stylesheet, and no typography
                      token is involved.
                    </p>
                  ) : null}
                </section>
              );
            })}

            <section id="configuration" className="mt-10 scroll-mt-24">
              <SectionHeading desc="The same setup with your own themes and options turned on. Everything here is optional — the first result above already works.">
                Theme configuration
              </SectionHeading>
              <CodeExample
                code={framework.quickStart.code}
                lang={framework.quickStart.lang}
                framework={framework.slug}
                filename={framework.quickStart.title}
                {...(framework.quickStart.js ? { js: framework.quickStart.js } : {})}
                {...(framework.quickStart.jsFilename ? { jsFilename: framework.quickStart.jsFilename } : {})}
                className="rounded-lg m-0"
              />
              {framework.quickStartExtra ? (
                <CodeExample
                  code={framework.quickStartExtra.code}
                  lang={framework.quickStartExtra.lang}
                  framework={framework.slug}
                  filename={framework.quickStartExtra.title}
                  {...(framework.quickStartExtra.js ? { js: framework.quickStartExtra.js } : {})}
                  {...(framework.quickStartExtra.jsFilename ? { jsFilename: framework.quickStartExtra.jsFilename } : {})}
                  className="rounded-lg m-0 mt-3"
                />
              ) : null}
              <Callout className="mt-3" title="Where the theme data lives">
                <InlineCode>{framework.configNote}</InlineCode>
              </Callout>
            </section>
          </>
        ) : null}

        <section className="mt-10">
          <h2 className="scroll-mt-24 text-lg font-semibold tracking-tight">
            What's Available
          </h2>
          <p className="text-sm opacity-70 mt-1 mb-2">
            <code className="mono text-[0.9em]">{framework.pkg}</code> ships{" "}
            {framework.featureCount} exports in {framework.groups.length}{" "}
            categories. Click an export to see what it does and jump to the code
            that uses it.
          </p>
          <p className="text-sm opacity-70 mb-4">
            Three pages cover this package, and they do different jobs: this
            index says what exists, the{" "}
            <a href={examplesHref} className="text-foreground underline hover:decoration-foreground">
              examples page
            </a>{" "}
            shows each export in code with the problem it solves, and the{" "}
            <a
              href={`/api-reference/${framework.slug}`}
              className="text-foreground underline hover:decoration-foreground"
            >
              API reference
            </a>{" "}
            gives exact signatures and return types.
          </p>
          <ApiExplorer
            groups={framework.groups}
            slug={framework.slug}
            exampleAnchors={exampleAnchors}
            categoryAnchors={categoryAnchors}
          />
        </section>

        <section className="mt-10">
          <h2 className="scroll-mt-24 text-lg font-semibold tracking-tight">
            Use Cases
          </h2>
          <p className="text-sm opacity-70 mt-1 mb-4">
            Short snippets you can drop into an existing app. For the same
            problems worked through end to end — problem, APIs, expectations,
            limitations — see the{" "}
            <a href={examplesHref} className="text-foreground underline hover:decoration-foreground">
              {framework.name} examples
            </a>
            .
          </p>
          <div className="flex flex-col gap-8">
            {useCases.map((useCase) => (
              <div key={useCase.title}>
                <h3 className="text-sm font-semibold mb-0.5">
                  {useCase.title}
                </h3>
                <p className="text-xs opacity-60 mb-2">
                  <InlineCode>{useCase.desc}</InlineCode>
                </p>
                <CodeExample
                  code={useCase.code}
                  lang={useCase.lang}
                  framework={framework.slug}
                  {...(useCase.filename ? { filename: useCase.filename } : {})}
                  {...(useCase.js ? { js: useCase.js } : {})}
                  {...(useCase.jsFilename ? { jsFilename: useCase.jsFilename } : {})}
                  className="rounded-lg m-0"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Astro's snippets all render inside its setup paths, so this section
            would show each of them a second time. */}
        {!isAstro ? (
          <section className="mt-10">
            <h2 className="scroll-mt-24 text-lg font-semibold tracking-tight">
              {framework.moreExamples?.title ?? "Further examples"}
            </h2>
            {framework.moreExamples ? (
              <p className="text-sm opacity-70 mt-1 mb-4">
                <InlineCode>{framework.moreExamples.intro}</InlineCode>
              </p>
            ) : null}
            <div className="flex flex-col gap-4">
              {/* A CSS-only integration has no runtime step in the onboarding
                  flow, so its runtime snippet is surfaced here rather than
                  being dropped. Every other entry shows its toggle in step 5. */}
              {framework.cssOnly && framework.switchSnippet ? (
                <ExampleBlock snippet={framework.switchSnippet} slug={framework.slug} />
              ) : null}
              <ExampleBlock snippet={framework.snippet2} slug={framework.slug} />
              {/* React renders its snippet3 through OptimizedCsrBootstrap below,
                  with its own prose. Every other framework shows it here. */}
              {framework.snippet3 && framework.slug !== "react" ? (
                <ExampleBlock snippet={framework.snippet3} slug={framework.slug} />
              ) : null}
              {framework.snippet4 ? (
                <ExampleBlock snippet={framework.snippet4} slug={framework.slug} />
              ) : null}
            </div>
            <p className="text-sm opacity-70 mt-4">
              The complete runnable app behind this guide is{" "}
              <InlineCode>{`examples/apps/${framework.slug}`}</InlineCode> —{" "}
              <a
                href="/examples"
                className="text-foreground no-underline hover:decoration-foreground"
              >
                listed with the other example apps
              </a>
              .
            </p>
          </section>
        ) : null}

        {framework.slug === "react" ? OptimizedCsrBootstrap(framework) : null}

        <RelatedLinks
          className="mt-12"
          links={[
            {
              title: `${framework.name} examples`,
              description: `Every export in ${framework.pkg}, with code and use cases`,
              href: examplesHref,
            },
            {
              title: "Custom Themes",
              description: "Build your own color palettes and semantic tokens",
              href: "/custom-themes",
            },
            {
              title: "API Reference",
              description: `Complete ${framework.pkg} documentation`,
              href: `/api-reference/${framework.slug}`,
            },
            {
              title: "Migration Guide",
              description: "Upgrade from previous versions",
              href: "/migration",
            },
            {
              title: "Compatibility Matrix",
              description: "Check framework and library version support",
              href: "/reference/compatibility",
            },
          ]}
        />
      </article>
    </DocsLayout>
  );
}
