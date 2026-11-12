import Link from "next/link";
import { ThemeScope } from "@themvora/next/client";

/**
 * "A runtime, not a toggle".
 *
 * Three capabilities, each one something a CSS class toggler cannot do:
 * persistence across visits, a theme boundary inside the tree, and time-aware
 * mode. The scoped card is not a mockup — it renders a real `<ThemeScope>` pinned
 * to `slack-dark`, so the panel stays dark while the page around it follows the
 * visitor's own selection. That is the capability demonstrating itself.
 */

const EDITOR_LINES = [
  { indent: 0, text: "export const theme = defineTheme({", tone: "text-foreground" },
  { indent: 1, text: "name: \"slack-dark\",", tone: "text-foreground" },
  { indent: 1, text: "tokens: { colors: { primary: \"#4a154b\" } },", tone: "text-muted-foreground" },
  { indent: 0, text: "});", tone: "text-foreground" },
  { indent: 0, text: "// scoped: this subtree never reads the page theme", tone: "text-muted-foreground" },
];

function ScopedEditor() {
  return (
    <ThemeScope
      theme="slack-dark"
      className="overflow-hidden rounded-lg border border-border"
    >
      <div className="bg-card">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-2.5 py-1.5">
          <span className="size-1.5 rounded-full bg-muted-foreground/30" />
          <span className="size-1.5 rounded-full bg-muted-foreground/30" />
          <span className="mono ml-1 truncate text-[9px] text-muted-foreground">
            theme.ts
          </span>
          <span className="ml-auto shrink-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
            scoped
          </span>
        </div>
        <div className="space-y-0.5 p-2.5">
          {EDITOR_LINES.map((line, i) => (
            <div
              key={i}
              className={`mono truncate text-[9.5px] leading-relaxed ${line.tone}`}
              style={{ paddingLeft: `${line.indent * 10}px` }}
            >
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </ThemeScope>
  );
}

type Capability = {
  title: string;
  desc: string;
  href: string;
  linkLabel: string;
  tag: string;
  visual?: React.ReactNode;
  chips?: string[];
  icon: React.ReactNode;
};

const capabilities: Capability[] = [
  {
    title: "Persistent preferences",
    desc: "The selection is written to storage and restored on the next visit, so a returning reader keeps the theme they chose. The key, the adapter and whether to persist at all are configuration.",
    href: "/persistence",
    linkLabel: "Persistence",
    tag: "storage",
    chips: ["theme-selection", "localStorage", "cookies"],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <path d="M17 21v-8H7v8M7 3v5h8" />
      </svg>
    ),
  },
  {
    title: "Scoped themes",
    desc: "Any subtree can hold its own theme — an embedded editor, a third-party widget, a legacy island — without touching the global selection. This panel is pinned to slack-dark; the rest of the page is not.",
    href: "/scoped-theme",
    linkLabel: "Scoped themes",
    tag: "islands",
    visual: <ScopedEditor />,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18" />
        <path d="M3 9h18" />
      </svg>
    ),
  },
  {
    title: "Automatic mode",
    desc: "The system mode follows the operating system's preference, and the scheduler switches at each visitor's local sunrise and sunset. Both are runtime state that resolves before paint — not a CSS media query standing in for a decision.",
    href: "/sunrise-sunset",
    linkLabel: "Scheduling",
    tag: "time-aware",
    chips: ["system", "sunrise", "sunset"],
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
];

export function Capabilities() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          A runtime, not a toggle
        </h2>
        <p className="opacity-70 max-w-2xl">
          A toggle flips a class. A runtime owns the selection, keeps it across
          visits, isolates it where it has to be isolated, and resolves it before
          the first paint.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((cap) => (
          <Link
            key={cap.title}
            href={cap.href}
            className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 no-underline card-lift min-w-0"
          >
            <div className="flex items-center justify-between">
              <div
                className="w-9 h-9 rounded-lg grid place-items-center"
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

            <h3 className="font-semibold text-[15px] leading-snug">
              {cap.title}
            </h3>
            <p className="text-[13px] opacity-65 leading-relaxed">
              {cap.desc}
            </p>

            {cap.visual ? (
              <div className="mt-1 min-w-0">{cap.visual}</div>
            ) : cap.chips ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {cap.chips.map((chip) => (
                  <span
                    key={chip}
                    className="mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/40"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}

            <span
              className="mt-auto pt-1 text-xs font-semibold"
              style={{ color: "var(--docs-accent)" }}
            >
              {cap.linkLabel} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
