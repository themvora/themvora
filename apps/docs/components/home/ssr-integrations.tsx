import Link from "next/link";
import { frameworkGuidePath, frameworks } from "../../lib/frameworks";

/**
 * SSR integrations.
 *
 * Three integrations ship server-side resolution: `@themvora/next`,
 * `@themvora/nuxt` and `@themvora/remix`. They share one cookie contract —
 * `theme-mode`, `theme-family`, `theme-fingerprint` (`theme-name` for the
 * resolved theme) — but they do **not** share one wiring, and the cards say so:
 * Next resolves inside the App Router's server `ThemeProvider`, Nuxt through the
 * module's server helper, and Remix — including its React Router Framework Mode
 * target — in a loader. Claiming a single lifecycle across all of them would be
 * the kind of tidy-but-false summary this site exists to avoid.
 */

const SEQUENCE = [
  {
    title: "Server renders",
    body: "The request carries the theme cookies, so the HTML comes back already themed — inline CSS variables on <html>.",
  },
  {
    title: "Resolved before paint",
    body: "A blocking script applies the persisted selection — and the operating system preference when the mode is system.",
  },
  {
    title: "No flash",
    body: "The first frame is the correct theme. The runtime then hydrates onto the same state instead of overwriting it.",
  },
];

type SsrIntegration = {
  slug: "next" | "nuxt" | "remix";
  badge: string;
  mechanism: string;
  symbols: string;
};

const INTEGRATIONS: SsrIntegration[] = [
  {
    slug: "next",
    badge: "App Router",
    mechanism:
      "The server ThemeProvider reads the theme cookies, resolves the initial theme, and renders <html> with inline CSS variables plus a blocking bootstrap script.",
    symbols: "ThemeProvider · @themvora/next",
  },
  {
    slug: "nuxt",
    badge: "Nuxt module",
    mechanism:
      "The module resolves the same cookies on the server and emits the pre-paint script from NuxtThemeBootstrap, so the document is themed before it is sent.",
    symbols: "resolveThemeFromCookies · NuxtThemeBootstrap",
  },
  {
    slug: "remix",
    badge: "Loader",
    mechanism:
      "getInitialThemeState or createThemeDocument() resolves the theme in your loader. Remix v2 keeps its root layout; React Router Framework Mode uses the /react-router entry with its root Layout.",
    symbols: "getInitialThemeState · createThemeDocument · @themvora/remix",
  },
];

function SsrCard({ slug, badge, mechanism, symbols }: SsrIntegration) {
  const fw = frameworks.find((f) => f.slug === slug);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background text-xl">
            {fw?.icon}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{fw?.name}</div>
            <div className="mono truncate text-[10px] opacity-45">{fw?.pkg}</div>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
          style={{
            background: "var(--theme-color-secondary)",
            color: "var(--theme-color-secondaryForeground)",
          }}
        >
          {badge}
        </span>
      </div>

      <p className="text-xs leading-relaxed opacity-65">{mechanism}</p>

      <code className="mono rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] leading-relaxed opacity-70 break-words">
        {symbols}
      </code>

      <Link
        href={frameworkGuidePath(slug)}
        className="mt-auto pt-1 text-xs font-semibold no-underline"
        style={{ color: "var(--docs-accent)" }}
      >
        {fw?.name} guide →
      </Link>
    </div>
  );
}

export function SsrIntegrations() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          SSR integrations
        </h2>
        <p className="opacity-70 max-w-2xl">
          A returning visitor who chose dark mode should never be shown a white
          page first. These integrations resolve the theme on the server, so the
          HTML arrives already themed and the first paint is the right one.
        </p>
      </div>

      {/* The sequence, not a feature list: the point is the order. */}
      <ol className="mb-4 grid gap-3 grid-cols-2 sm:grid-cols-3 sm:gap-4">
        {SEQUENCE.map((step, i) => (
          <li
            key={step.title}
            className="relative rounded-xl border border-border bg-card p-4"
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                style={{
                  background: "var(--theme-color-primary)",
                  color: "var(--theme-color-primaryForeground)",
                }}
              >
                {i + 1}
              </span>
              <h3 className="text-[13px] font-semibold">{step.title}</h3>
            </div>
            <p className="text-[11px] leading-relaxed opacity-60">{step.body}</p>
            {i < SEQUENCE.length - 1 ? (
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 -right-[13px] hidden -translate-y-1/2 text-sm opacity-45 sm:block"
              >
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((integration) => (
          <SsrCard key={integration.slug} {...integration} />
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed opacity-55">
        All three read the same theme cookies, so a visitor keeps their selection
        across a reload. Where they differ is where the server does the
        resolving — in the provider, in the module, or in a loader. Read the
        mechanics on the{" "}
        <Link
          href="/zero-flash"
          className="no-underline font-semibold"
          style={{ color: "var(--docs-accent)" }}
        >
          zero-flash page →
        </Link>
      </p>
    </section>
  );
}
