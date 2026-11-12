import type { Metadata } from "next";
import Link from "next/link";

import { DocsLayout } from "../../components/docs-layout";
import { PageHeader } from "../../components/ui/page-header";
import { Callout } from "../../components/ui/callout";
import { libraries } from "../../lib/libraries";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/libraries") },
  title: "Libraries",
  description:
    "Adapters for the UI libraries you already use: shadcn/ui, Bootstrap, daisyUI, Open Props, Material UI, Chakra UI, Ant Design, Mantine, and UnoCSS.",
};

export default function LibrariesPage() {
  const cssVars = libraries.filter((l) => l.kind === "CSS Variables");
  const generated = libraries.filter((l) => l.kind === "Generated Theme");
  const buildTime = libraries.filter((l) => l.kind === "Build Time");

  const groups = [
    { label: "CSS Variable Adapters", libs: cssVars },
    { label: "Generated Theme Adapters", libs: generated },
    { label: "Build-Time Integrations", libs: buildTime },
  ];

  const content = (
    <div>
      <PageHeader
        eyebrow="Adapters"
        title="Libraries"
        description="Adapters bridge Themvora semantic tokens to the libraries you already use. CSS-variable adapters inject live variables; generated adapters rebuild a library theme on every theme change; build-time integrations expose tokens as utilities."
      />

      <Callout className="mb-10">
        <span className="block">
          Every guide installs the library itself, configures its build, connects
          Themvora, and renders that library&apos;s own components — no stand-in
          markup. The imports name published entry points, and{" "}
          <code className="mono text-[0.9em]">audit-library-docs.mjs</code> fails
          the build when a snippet imports a subpath a package does not export,
          calls an adapter hook with the wrong arguments, or shows React code
          under a non-React framework. Each advertised library/framework
          combination is also materialised into an isolated app, typechecked,
          built and loaded in a browser by the{" "}
          <code className="mono text-[0.9em]">scripts/docs/verify-library-*.mjs</code>{" "}
          harnesses; those runs are the regression suite for these snippets.
        </span>
        <span className="block mt-2">
          New to the adapter system? Start with the{" "}
          <Link
            href="/adapters"
            className="text-primary no-underline font-medium hover:underline"
          >
            Adapters guide
          </Link>{" "}
          — strategies, plugins, the registry and how to use them in every
          framework. Each page below opens with a framework picker, and every
          command, file path and snippet under it follows that choice.
        </span>
      </Callout>

      {groups.map((group) => {
        if (!group.libs.length) return null;
        return (
          <div key={group.label} className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider opacity-50 mb-3">
              {group.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.libs.map((lib) => (
                <Link
                  key={lib.slug}
                  href={`/libraries/${lib.slug}`}
                  className="glass-card card-lift p-4 flex items-start gap-3 no-underline flex-col group min-w-0"
                >
                  <span className="flex items-center gap-3 w-full">
                    <span
                      className="w-10 h-10 shrink-0 rounded-lg grid place-items-center font-bold text-sm select-none"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--theme-color-primary), color-mix(in srgb, var(--theme-color-primary) 40%, var(--theme-color-accent)))",
                        color: "var(--theme-color-primaryForeground)",
                      }}
                    >
                      <span className="grayscale group-hover:grayscale-0 transition-all duration-100">
                        {lib.icon}
                      </span>
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold">{lib.name}</span>
                      <span className="block text-xs opacity-50 mono truncate">
                        {lib.pkg}
                      </span>
                    </span>
                    <span className="text-xs opacity-50 shrink-0 whitespace-nowrap">
                      {lib.featureCount} export
                      {lib.featureCount === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {lib.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-card/60 text-foreground/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return <DocsLayout wide>{content}</DocsLayout>;
}
