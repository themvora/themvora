"use client";

import Link from "next/link";
import { useState } from "react";
import { frameworkExamplesPath } from "../lib/frameworks";
import { Callout } from "./ui/callout";

type Feature = { name: string; desc: string };
type Group = { label: string; features: Feature[] };

/**
 * The "What's Available" index: one chip per export, grouped by category.
 *
 * Clicking a chip reveals what that export does and — the point of this page
 * being a *hub* rather than a list — a link straight to the example that
 * documents it. `exampleAnchors` is computed on the server from the same
 * `covers` declarations the coverage gate reads, so the link and the entry it
 * points at cannot disagree; a feature with no entry simply has no link.
 */
export function ApiExplorer({
  groups,
  slug,
  exampleAnchors,
  categoryAnchors,
}: {
  groups: Group[];
  slug: string;
  /** Feature name → anchor id on `/framework-guides/<slug>/examples`. */
  exampleAnchors?: Record<string, string | null>;
  /** Group label → category anchor id on the same page. */
  categoryAnchors?: Record<string, string | null>;
}) {
  const [selected, setSelected] = useState<Record<string, string | null>>({});

  function toggle(group: string, name: string) {
    setSelected((prev) => ({
      ...prev,
      [group]: prev[group] === name ? null : name,
    }));
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, groupIndex) => {
        const activeName = selected[group.label];
        const active = group.features.find((f) => f.name === activeName);
        const example = active ? exampleAnchors?.[active.name] : null;
        const categoryAnchor = categoryAnchors?.[group.label] ?? null;

        return (
          <div
            key={`${group.label}-${groupIndex}`}
            className="rounded-xl border border-border p-4"
          >
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50">
                {group.label}
              </h3>
              {/* A link that exists before any chip is clicked: the category
                  anchor on the examples page. The per-export anchor appears in
                  the panel below, once there is an export to point at. */}
              {categoryAnchor ? (
                <Link
                  href={`${frameworkExamplesPath(slug)}#${categoryAnchor}`}
                  className="shrink-0 text-[11px] text-foreground no-underline opacity-80 hover:opacity-100"
                >
                  Examples →
                </Link>
              ) : null}
            </div>

            {/* A list, not a row of loose buttons: the chips are a set of
                sibling exports, and screen readers announce the count. It also
                keeps the group label and the names from running together when
                the markup is read as plain text. */}
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {group.features.map((feature) => {
                const isActive = activeName === feature.name;
                return (
                  <li key={feature.name}>
                    <button
                      type="button"
                      onClick={() => toggle(group.label, feature.name)}
                      aria-expanded={isActive}
                      className={`chip ${isActive ? "chip-active" : ""}`}
                    >
                      <code className="mono">{feature.name}</code>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div
              className={`grid transition-all duration-300 ease-out ${
                active
                  ? "grid-rows-[1fr] opacity-100 mt-3"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <Callout>
                  {/* Name and description are separate blocks. Rendered as two
                      inline spans they were correct visually but read as one
                      run-on string — "ThemeProviderCreates a runtime…" — for
                      anything that extracts text (a scraper, a screen reader
                      in browse mode, a copy-paste). */}
                  <div
                    className="font-semibold"
                    style={{ color: "var(--docs-accent)" }}
                  >
                    {active?.name}
                  </div>
                  <p className="mt-0.5">{active?.desc}</p>
                  {example ? (
                    <Link
                      href={`${frameworkExamplesPath(slug)}#${example}`}
                      className="mt-1.5 inline-block text-xs font-medium text-foreground no-underline"
                    >
                      See the example →
                    </Link>
                  ) : null}
                </Callout>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
