import Link from "next/link";

type Capability = {
  title: string;
  desc: string;
  href: string;
  tag: string;
  icon: React.ReactNode;
};

const capabilities: Capability[] = [
  {
    title: "Sunrise & sunset scheduling",
    desc: "Switch light/dark at each visitor's local sunrise and sunset. NOAA solar math in core, exposed through a reactive controller in every framework.",
    href: "/sunrise-sunset",
    tag: "scheduling",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2v8" />
        <path d="m4.93 10.93 1.41 1.41" />
        <path d="M2 18h2" />
        <path d="M20 18h2" />
        <path d="m19.07 10.93-1.41 1.41" />
        <path d="M22 22H2" />
        <path d="m16 6-4 4-4-4" />
        <path d="M16 18a4 4 0 0 0-8 0" />
      </svg>
    ),
  },
  {
    title: "Scoped themes",
    desc: "Isolate a subtree — a video player, an embedded widget, legacy DOM — with ThemeScope, the themvora-scope element, or an imperative binding.",
    href: "/scoped-theme",
    tag: "islands",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18" />
        <path d="M3 9h18" />
      </svg>
    ),
  },
  {
    title: "Theme-aware scrollbar",
    desc: "Replace the native scrollbar with a theme-colored overlay — same physics, no layout shift, no flash. Ships in core with wrappers for every framework.",
    href: "/custom-scrollbar",
    tag: "overlay",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M10 2v20" />
        <path d="m8 6 2 2 2-2" />
      </svg>
    ),
  },
];

export function Capabilities() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          A runtime, not a toggle
        </h2>
        <p className="opacity-70 max-w-2xl">
          Every feature below is real — implemented in{" "}
          <code className="mono text-[0.9em]">@themvora/core</code> and
          exposed natively by each framework adapter. Click through to see the
          actual API.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((cap) => (
          <Link
            key={cap.title}
            href={cap.href}
            className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2.5 no-underline card-lift"
          >
            <div className="flex items-center justify-between">
              <div
                className="w-8 h-8 rounded-lg grid place-items-center"
                style={{
                  background: "var(--theme-color-secondary)",
                  color: "var(--theme-color-secondaryForeground)",
                }}
              >
                {cap.icon}
              </div>
              <span className="mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/40">
                {cap.tag}
              </span>
            </div>
            <h3 className="font-semibold text-sm leading-tight">
              {cap.title}
            </h3>
            <p className="text-xs opacity-60 leading-relaxed flex-1">
              {cap.desc}
            </p>
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--theme-color-primary)" }}
            >
              Explore →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
