import Link from "next/link";

/**
 * "Five primitives, one system".
 *
 * Each card states one primitive, what it actually does, and what that buys a
 * developer. The architecture section below explains how the five chain
 * together, so these cards stay on "what it is" and never restate the chain.
 *
 * Terminology follows the docs' canonical vocabulary: a **family** is the named
 * visual identity, a **mode** is the light/dark/system axis. They are separate
 * axes, which is why they get separate cards.
 */

type Pillar = {
  title: string;
  desc: string;
  visual: string[];
  href: string;
  icon: React.ReactNode;
};

const pillars: Pillar[] = [
  {
    title: "Semantic tokens",
    desc: "Components ask for a role — background, primary, border — and the theme supplies the value. No component names a colour, so none needs editing when one changes.",
    visual: ["background", "foreground", "primary", "muted", "border", "ring"],
    href: "/tokens",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 12H4M12 4v16" />
      </svg>
    ),
  },
  {
    title: "Theme families",
    desc: "A named visual identity: mint, plum, github, slack. Families are what the picker in the hero switches between — and what a component never has to know about.",
    visual: ["mint", "plum", "cocoa", "iris"],
    href: "/presets",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="13.5" cy="6.5" r=".5" />
        <circle cx="17.5" cy="10.5" r=".5" />
        <circle cx="8.5" cy="7.5" r=".5" />
        <circle cx="6.5" cy="12.5" r=".5" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
      </svg>
    ),
  },
  {
    title: "Light & dark modes",
    desc: "Mode is a separate axis from family: light, dark, or system to follow the OS. Any family renders in either, so the two can change independently.",
    visual: ["light", "dark", "system"],
    href: "/core-concepts#mode-family",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
      </svg>
    ),
  },
  {
    title: "Runtime transitions",
    desc: "A theme change diffs the tokens and animates what moved, in the DOM. No re-render, no remount, and no transition rules to maintain in your stylesheet.",
    visual: ["change", "diff", "plan", "animate"],
    href: "/animation",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12h4l3-8 4 16 3-8h4" />
      </svg>
    ),
  },
  {
    title: "Adapters",
    desc: "Your component library keeps its own API. An adapter maps the tokens onto that library's styling convention, so it gains a theme runtime without being replaced.",
    visual: ["shadcn", "MUI", "Chakra", "AntD", "Bootstrap"],
    href: "/adapters",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
];

export function Pillars() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          Five primitives, one system
        </h2>
        <p className="opacity-70 max-w-2xl">
          Everything Themvora does is one of these five, or a combination of
          them. Each card opens the page that documents it.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {pillars.map((pillar) => (
          <Link
            key={pillar.title}
            href={pillar.href}
            className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 no-underline card-lift"
          >
            <div
              className="w-9 h-9 rounded-lg grid place-items-center"
              style={{
                background: "var(--theme-color-secondary)",
                color: "var(--theme-color-secondaryForeground)",
              }}
            >
              {pillar.icon}
            </div>
            <h3 className="font-semibold text-[15px] leading-snug">
              {pillar.title}
            </h3>
            <p className="text-[13px] opacity-65 leading-relaxed flex-1">
              {pillar.desc}
            </p>
            <div className="flex flex-wrap gap-1 mt-auto pt-1">
              {pillar.visual.map((v) => (
                <span
                  key={v}
                  className="mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/40"
                >
                  {v}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
