"use client";

import type { BrandColorClass } from "@themvora/core";
import { usePresetCatalog } from "../../../components/preset-catalog";

/**
 * The brand reference section — what makes the Brand page a brand page.
 *
 * ## What this component is for
 *
 * A brand preset makes a claim, and this section is where the claim is either
 * substantiated or exposed. It separates three things that are easy to blur:
 *
 * 1. **Brand identity** — the colours the brand publishes, with the source cited.
 * 2. **Themvora interpretation** — which of those are pinned, and which semantic
 *    roles the generator derived around them.
 * 3. **Accessibility normalization** — any anchor the solver had to move, named.
 *
 * ## Why the source matters
 *
 * "Exact brand colours" means the values in the brand's guidelines or design
 * system — not the colours currently painted on its website. A site has hover
 * states, overlays, alpha values, gradients and two appearances; sampling it
 * produces a snapshot of one implementation, which changes without notice.
 *
 * ## What this replaced
 *
 * An earlier version claimed the swatches were "the brand's own colors, taken as
 * authored" and that Themvora maps them "without altering the surfaces". That was
 * true of hand-authored presets and became false when the presets became
 * generated. It now states exactly what is exact and what is not.
 */
export function BrandIdentity() {
  const catalog = usePresetCatalog("brand");

  const legend: Array<[BrandColorClass, string]> = [
    ["ANCHOR", "published value; pinned exactly"],
    ["DERIVED", "generated from the anchors"],
    ["SEMANTIC", "seed-independent (status roles)"],
    ["IMPLEMENTATION", "specific to the source's own implementation; not used"],
  ];

  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold tracking-tight mb-1">
        Reference first, then interpretation
      </h2>
      <p className="text-sm opacity-70 mb-4 leading-relaxed max-w-3xl">
        Each brand preset starts from the colours the brand <em>publishes</em> —
        its guidelines or its design system — not from a screenshot of its
        website. The published value anchors the identity; Themvora generates
        the surfaces, borders, interaction roles and status colours around it,
        then solves the whole system for contrast. Where an anchor survives
        untouched this section says so; where the solver had to move one, it
        says that too.
      </p>

      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 mb-6 text-[11px]">
        {legend.map(([label, description]) => (
          <li key={label} className="flex items-baseline gap-1.5">
            <code className="mono font-semibold">{label}</code>
            <span className="opacity-55">{description}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-4">
        {catalog.map((entry) => {
          const source = entry.brand?.source;
          if (!source) return null;

          const pinned = entry.brand?.anchors.light ?? [];
          const normalized = [
            ...(entry.brand?.normalized.light ?? []),
            ...(entry.brand?.normalized.dark ?? []),
          ];
          const light = entry.themes.light.tokens?.colors as
            Record<string, string> | undefined;
          const dark = entry.themes.dark.tokens?.colors as
            Record<string, string> | undefined;

          return (
            <article
              key={entry.id}
              className="rounded-lg border border-border bg-card p-4"
              data-brand={entry.family}
            >
              <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                {/* Not an <h3> — the docs TOC rail scans `h2, h3`, and a brand
                    name in a card list is not a document section. */}
                <div className="text-base font-semibold tracking-tight text-card-foreground">
                  {entry.name}
                </div>
                <code className="mono text-[11px] opacity-60 text-card-foreground">
                  {source.kind}
                </code>
                <a
                  href={source.sourceUrl}
                  className="mono text-[11px] text-primary no-underline hover:underline break-all"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {source.sourceUrl}
                </a>
              </header>

              <div className="grid gap-4 sm:grid-cols-3">
                {/* 1 — identity */}
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-2">
                    Brand identity
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {source.colors.map((color) => (
                      <li
                        key={`${color.label}-${color.color}`}
                        className="flex items-start gap-2 text-[11px]"
                      >
                        <span
                          className="mt-0.5 w-4 h-4 shrink-0 rounded-sm border border-black/10 dark:border-white/15"
                          style={{ background: color.color }}
                          title={`${color.label} — ${color.color}`}
                        />
                        <span className="min-w-0 wrap-break-word">
                          <span className="text-card-foreground">
                            {color.label}
                          </span>
                          <span className="mono opacity-60">
                            {" "}
                            {color.color}
                          </span>
                          <span
                            className={`mono ml-1 text-[9px] ${
                              color.classification === "ANCHOR"
                                ? "text-primary"
                                : "opacity-45"
                            }`}
                          >
                            {color.classification}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2 — interpretation */}
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-2">
                    Themvora interpretation
                  </div>
                  <ul className="flex flex-col gap-1 text-[11px] text-card-foreground">
                    <li className="flex items-center gap-2">
                      <span className="opacity-60">light primary</span>
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-black/10"
                        style={{ background: light?.primary }}
                      />
                      <code className="mono">{light?.primary}</code>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="opacity-60">dark primary</span>
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-black/10"
                        style={{ background: dark?.primary }}
                      />
                      <code className="mono">{dark?.primary}</code>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="opacity-60">surface</span>
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-black/10"
                        style={{ background: light?.background }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-black/10 -ml-1"
                        style={{ background: light?.card }}
                      />
                      <code className="mono opacity-70">
                        {light?.background}
                      </code>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="opacity-60">border</span>
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-black/10"
                        style={{ background: light?.border }}
                      />
                      <span className="opacity-60">ring</span>
                      <span
                        className="w-3.5 h-3.5 rounded-sm border border-black/10"
                        style={{ background: light?.ring }}
                      />
                    </li>
                  </ul>
                  <p className="text-[10px] opacity-50 leading-snug mt-2">
                    Pinned:{" "}
                    {pinned
                      .map((anchor) => `${anchor.role} = ${anchor.color}`)
                      .join(", ") || "—"}
                    . Everything else is generated.
                  </p>
                </div>

                {/* 3 — normalization */}
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-2">
                    Accessibility normalization
                  </div>
                  {normalized.length === 0 ? (
                    <p className="text-[11px] leading-snug text-card-foreground">
                      <span className="opacity-80">
                        Anchor preserved exactly.
                      </span>
                      <span className="opacity-55">
                        {" "}
                        The published value already satisfied the contrast
                        contract, so the solver left it untouched.
                      </span>
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1 text-[11px] text-card-foreground">
                      {normalized.map((item) => (
                        <li key={`${item.role}-${item.anchor}`}>
                          <span className="opacity-80">{item.label}</span>{" "}
                          <code className="mono opacity-60">{item.anchor}</code>
                          <span className="opacity-40"> → </span>
                          <code className="mono">{item.resolved}</code>
                        </li>
                      ))}
                      <li className="text-[10px] opacity-55 leading-snug">
                        Moved to keep the system readable. The hue is preserved.
                      </li>
                    </ul>
                  )}
                  <p className="text-[10px] opacity-50 leading-snug mt-2">
                    {entry.quality.passed}/{entry.quality.total} semantic checks
                    passed.
                  </p>
                </div>
              </div>

              {source.notes && source.notes.length > 0 && (
                <ul className="mt-3 pt-3 border-t border-border flex flex-col gap-1">
                  {source.notes.map((note) => (
                    <li
                      key={note}
                      className="text-[10px] opacity-50 leading-snug"
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
