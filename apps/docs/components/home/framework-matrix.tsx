import Link from "next/link";
import { frameworkGuidePath, frameworks } from "../../lib/frameworks";

/**
 * The supported integrations, as navigation rather than a logo wall.
 *
 * The slug list is the supported set — every entry resolves to a real package
 * (`@themvora/<slug>`) and a real guide at `/framework-guides/<slug>`. Tailwind
 * is deliberately absent: `@themvora/tailwind` is a styling preset that maps
 * tokens to utilities, not a framework integration, and it is documented on the
 * adapters page and in each guide's styling section instead.
 *
 * Each card shows the package name a reader has to install, one clamped line of
 * what the integration actually provides, and the way in.
 */
const matrixSlugs = [
  "react",
  "next",
  "vue",
  "nuxt",
  "svelte",
  "solid",
  "angular",
  "astro",
  "remix",
  "web",
];

export function FrameworkMatrix() {
  const items = matrixSlugs
    .map((slug) => frameworks.find((f) => f.slug === slug))
    .filter((f) => f !== undefined);

  return (
    <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          Works everywhere
        </h2>
        <p className="opacity-70 max-w-2xl">
          One runtime, {items.length} integrations. The concepts are identical
          everywhere — only the wiring is idiomatic to the framework. Pick yours
          to see the exact imports, files and hooks.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {items.map((fw) => (
          <Link
            key={fw.slug}
            href={frameworkGuidePath(fw.slug)}
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 no-underline card-lift"
          >
            <span className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-background text-lg">
                {fw.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {fw.name}
                </span>
                <span className="mono block truncate text-[10px] opacity-45">
                  {fw.pkg}
                </span>
              </span>
            </span>

            <span className="line-clamp-2 text-[11px] leading-relaxed opacity-60">
              {fw.tagline}
            </span>

            <span
              className="mt-auto pt-1 text-[11px] font-semibold"
              style={{ color: "var(--docs-accent)" }}
            >
              Guide →
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-sm opacity-60">
        Styling utilities come from{" "}
        <Link
          href="/framework-guides/tailwind"
          className="no-underline font-semibold"
          style={{ color: "var(--docs-accent)" }}
        >
          <code className="mono text-[0.9em]">@themvora/tailwind</code>
        </Link>{" "}
        — see the{" "}
        <Link
          href="/framework-guides"
          className="no-underline font-semibold"
          style={{ color: "var(--docs-accent)" }}
        >
          framework guides →
        </Link>
      </p>
    </section>
  );
}
