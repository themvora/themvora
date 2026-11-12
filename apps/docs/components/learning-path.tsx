import Link from "next/link";

/**
 * The documentation path, as a progression rather than a pile of links.
 *
 * Five steps, each one a real destination that exists today, ordered the way the
 * docs are actually sequenced: understand the model, try it live, put it in an
 * app, read the integration you use, then the advanced surface. The rail behind
 * the numbers is what makes it read as a sequence instead of a card grid.
 */

const steps = [
  {
    href: "/core-concepts",
    label: "Core concepts",
    desc: "The model: tokens, families, modes, the runtime.",
    outcome: "Know what a theme is made of.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 2 10 5.5-10 5.5L2 7.5 12 2z" />
        <path d="m2 12.2 10 5.5 10-5.5" />
        <path d="m2 16.9 10 5.5 10-5.5" />
      </svg>
    ),
  },
  {
    href: "/playground",
    label: "Playground",
    desc: "Change tokens, families and modes on a live app.",
    outcome: "See the contract move.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m22 2-7 20-4-9-9-4 20-7z" />
      </svg>
    ),
  },
  {
    href: "/get-started",
    label: "Get started",
    desc: "Install the package for your framework and wrap the app.",
    outcome: "Ship your first theme.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    href: "/framework-guides",
    label: "Framework guides",
    desc: "The exact files, imports and hooks for your stack.",
    outcome: "Wire it the idiomatic way.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 8h10M7 12h10M7 16h5" />
      </svg>
    ),
  },
  {
    href: "/advanced-features",
    label: "Advanced",
    desc: "Scopes, history, plugins, scheduling, adapters.",
    outcome: "Handle the edge cases.",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      </svg>
    ),
  },
];

export function LearningPath() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 border-t border-border">
      <div className="mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
          From your first theme to production
        </h2>
        <p className="opacity-70 max-w-2xl">
          The documentation is sequenced, not alphabetical. Each step leaves you
          with something that runs, and the next one builds on it — so you can
          stop at any point without having read the whole thing.
        </p>
      </div>

      <div className="relative">
        {/* The rail: one line joining the step numbers, `lg` only.
            It is inset to the first and last badge centres (20px card padding
            + 18px badge radius) and dropped behind the cards with `-z-10`, so
            what shows is a short segment in each gap rather than a rule drawn
            across the card faces. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -z-10 left-[39px] right-[39px] top-[39px] hidden h-px bg-border lg:block"
        />
        <ol className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {steps.map((step, i) => (
            <li key={step.href} className="relative">
              <Link
                href={step.href}
                className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 no-underline card-lift"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="grid size-9 place-items-center rounded-full border border-border bg-background text-[11px] font-bold"
                    style={{ color: "var(--docs-accent)" }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="grid size-7 place-items-center rounded-lg"
                    style={{
                      background: "var(--theme-color-secondary)",
                      color: "var(--theme-color-secondaryForeground)",
                    }}
                  >
                    {step.icon}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold">{step.label}</div>
                  <div className="mt-1 text-[12px] leading-relaxed opacity-60">
                    {step.desc}
                  </div>
                </div>
                <div className="mono mt-auto text-[10px] uppercase tracking-wide opacity-45">
                  {step.outcome}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
