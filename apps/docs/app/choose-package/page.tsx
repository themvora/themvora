import type { Metadata } from "next";
import Link from "next/link";

import { DocsLayout } from "../../components/docs-layout";
import { CodeBlock } from "../../components/code-block";
import { PageHeader } from "../../components/ui/page-header";
import { SectionHeading } from "../../components/ui/section-heading";
import { highlightCode } from "../../lib/highlight";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/choose-package") },
  title: "Which package should I install?",
  description:
    "A decision guide for the Themvora packages: the core runtime, framework integrations, and library adapters — plus the combinations that work together.",
};

const decisions: { when: string; pkg: string; href: string; note: string }[] = [
  {
    when: "You need the runtime",
    pkg: "@themvora/core",
    href: "/packages/core",
    note: "The framework-agnostic heart — store, registry, runtime, transitions, persistence, adapters.",
  },
  {
    when: "You're using React",
    pkg: "@themvora/react",
    href: "/packages/react",
    note: "Provider, hooks and ThemeScope. The base that Next and Remix re-export.",
  },
  {
    when: "You're using Next.js",
    pkg: "@themvora/next",
    href: "/packages/next",
    note: "App Router SSR: cookie persistence, zero-flash bootstrap, blocking script.",
  },
  {
    when: "You're using Vue 3",
    pkg: "@themvora/vue",
    href: "/packages/vue",
    note: "Provider component, composables and scoped theming.",
  },
  {
    when: "You're using Nuxt 4",
    pkg: "@themvora/nuxt",
    href: "/packages/nuxt",
    note: "A Nuxt module — configure in nuxt.config.ts, composables auto-import.",
  },
  {
    when: "You're using Svelte 5",
    pkg: "@themvora/svelte",
    href: "/packages/svelte",
    note: "Context-based provider with reactive readable stores.",
  },
  {
    when: "You're using Solid",
    pkg: "@themvora/solid",
    href: "/packages/solid",
    note: "Signals-first provider, getters and scoped subtrees.",
  },
  {
    when: "You're using Angular",
    pkg: "@themvora/angular",
    href: "/packages/angular",
    note: "DI providers, reactive injectables and an element-scoped directive.",
  },
  {
    when: "You're using Astro",
    pkg: "@themvora/astro",
    href: "/packages/astro",
    note: "Islands-friendly with a shared global runtime and zero-flash bootstrap.",
  },
  {
    when: "You're using Remix v2 or React Router Framework Mode",
    pkg: "@themvora/remix",
    href: "/framework-guides/remix",
    note: "Loader-based SSR theming. React Router Framework Mode uses the /react-router entry inside the same guide.",
  },
  {
    when: "No framework, or Web Components",
    pkg: "@themvora/web",
    href: "/packages/web",
    note: "Custom elements and imperative APIs for any HTML page.",
  },
  {
    when: "You use Tailwind CSS v4",
    pkg: "@themvora/tailwind",
    href: "/packages/tailwind",
    note: "Maps semantic tokens to @theme variables and utilities.",
  },
];

const combos: { name: string; packages: string[]; href: string }[] = [
  {
    name: "Next.js + MUI",
    packages: ["@themvora/core", "@themvora/next", "@themvora/mui"],
    href: "/libraries/mui",
  },
  {
    name: "Next.js + shadcn/ui",
    packages: ["@themvora/core", "@themvora/next", "@themvora/shadcn"],
    href: "/libraries/shadcn",
  },
  {
    name: "React + Chakra UI",
    packages: ["@themvora/core", "@themvora/react", "@themvora/chakra"],
    href: "/libraries/chakra",
  },
  {
    name: "Vue + Bootstrap",
    packages: ["@themvora/core", "@themvora/vue", "@themvora/bootstrap"],
    href: "/libraries/bootstrap",
  },
  {
    name: "Nuxt + daisyUI",
    packages: ["@themvora/core", "@themvora/nuxt", "@themvora/daisyui"],
    href: "/libraries/daisyui",
  },
  {
    name: "React + Mantine",
    packages: ["@themvora/core", "@themvora/react", "@themvora/mantine"],
    href: "/libraries/mantine",
  },
];

const installCode = `npm install @themvora/core @themvora/next @themvora/mui`;

export default function ChoosePackagePage() {
  return (
    <DocsLayout wide>
      <PageHeader
        eyebrow="Package decision guide"
        title="Which package should I install?"
        description="Start from what you're building. @themvora/core is a normal dependency of every framework binding, so the binding brings the runtime with it. The guides still install both explicitly so the core version stays visible in your manifest."
      />

      <section className="mb-12">
        <SectionHeading>Pick your entry point</SectionHeading>
        <div className="flex flex-col gap-2">
          {decisions.map((d) => (
            <Link
              key={d.pkg}
              href={d.href}
              className="glass-card card-lift p-4 no-underline flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4"
            >
              <div className="sm:w-48 shrink-0 text-sm font-semibold">
                {d.when}
              </div>
              <div
                className="mono text-xs sm:text-right sm:ml-auto font-semibold shrink-0"
                style={{ color: "var(--theme-color-primary)" }}
              >
                {d.pkg} →
              </div>
              <div className="text-xs opacity-60 sm:w-full sm:max-w-md text-left">
                {d.note}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <SectionHeading>Common combinations</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          {combos.map((combo) => (
            <Link
              key={combo.name}
              href={combo.href}
              className="glass-card card-lift p-4 no-underline flex flex-col gap-2"
            >
              <div className="font-semibold text-sm">{combo.name}</div>
              <div className="flex flex-wrap gap-1.5">
                {combo.packages.map((p) => (
                  <span
                    key={p}
                    className="mono text-[10px] px-2 py-0.5 rounded border border-border bg-muted/40"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-5">
          <div className="mb-2 text-sm opacity-70">
            For example — Next.js with Material UI:
          </div>
          <CodeBlock
            html={highlightCode(installCode, "bash")}
            code={installCode}
            language="bash"
            filename="terminal"
            className="m-0"
          />
        </div>
      </section>

      <section>
        <SectionHeading>Still unsure?</SectionHeading>
        <div className="flex flex-col gap-2">
          <Link
            href="/packages"
            className="glass-card card-lift p-4 no-underline flex items-center justify-between gap-3"
          >
            <div>
              <div className="font-semibold text-sm">Package map</div>
              <div className="text-xs opacity-60">
                Every package with its own install + API page.
              </div>
            </div>
            <span style={{ color: "var(--theme-color-primary)" }}>→</span>
          </Link>
          <Link
            href="/api-reference"
            className="glass-card card-lift p-4 no-underline flex items-center justify-between gap-3"
          >
            <div>
              <div className="font-semibold text-sm">API reference</div>
              <div className="text-xs opacity-60">
                Generated from source — see every export of every package.
              </div>
            </div>
            <span style={{ color: "var(--theme-color-primary)" }}>→</span>
          </Link>
        </div>
      </section>
    </DocsLayout>
  );
}
