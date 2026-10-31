"use client";

import { useState } from "react";
import Link from "next/link";
import { CodeBlock } from "./code-block";
import { highlightCode } from "../lib/highlight";
import { DocsLayout } from "./docs-layout";
import { PresetVisualHarness } from "./preset-visual-fixture";
import { PageHeader } from "./ui/page-header";
import { SectionHeading } from "./ui/section-heading";
import { Callout } from "./ui/callout";
import {
  PRESET_KIND_META,
  PresetCard,
  CurrentThemeInspector,
  usePresetGroups,
} from "./presets";
import { BRAND_PRESET_SNIPPET, DEFAULT_PRESET_SNIPPET } from "./preset-snippets";

type Tab = "default" | "brand";

/**
 * The `/presets` index.
 *
 * `labels` carries the compatibility badge of each install snippet, keyed by
 * source text and derived on the page — this is a client component, so it
 * cannot ask the compiler itself. Both snippets are plain JavaScript, so both
 * read `TS / JS` even though they are highlighted with the TypeScript grammar.
 */
export function PresetShowcase({
  labels,
}: {
  labels?: Record<string, string> | undefined;
} = {}) {
  const [activeTab, setActiveTab] = useState<Tab>("default");
  const groups = usePresetGroups(activeTab);

  const defaultCount = 9;
  const brandCount = 5;

  return (
    <DocsLayout>
      <div className="max-w-3xl">
        <PageHeader
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8" />
            </svg>
          }
          title="Built-in Presets"
          subtitle="@themvora/core"
          description={
            <>
              Themvora ships with{" "}
              <strong>
                {defaultCount} curated families and {brandCount} brand families
              </strong>{" "}
              — {defaultCount * 2} default themes and {brandCount * 2} brand
              themes, each with a light and a dark variant. Click any preset to
              apply it to this site live.
            </>
          }
        />

        <section className="mb-10">
          <SectionHeading
            num={1}
            desc="Every preset is a full token set, not a colour swap — surfaces, borders, status colours and corner radius come with it. The nine default families run warm to neutral; the five brand families pin a published brand colour and generate the rest around it."
          >
            What&apos;s included
          </SectionHeading>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="glass-card p-4">
              <div className="font-semibold text-sm">Default Presets</div>
              <div className="text-xs opacity-60 mt-1 leading-relaxed">
                {defaultCount} curated families: oat, berry, mint, citrus, cocoa,
                plum, iris, sky, graphite. Each ships a light and a dark variant
                and carries its own seed, generation style and corner radius
                (12–18px), so the families differ in feel and not only in hue.
              </div>
              <Link
                href="/presets/default"
                className="inline-flex items-center gap-1 text-xs font-medium mt-2 no-underline hover:underline"
                style={{ color: "var(--theme-color-primary)" }}
              >
                Browse all defaults →
              </Link>
            </div>
            <div className="glass-card p-4">
              <div className="font-semibold text-sm">Brand Presets</div>
              <div className="text-xs opacity-60 mt-1 leading-relaxed">
                {brandCount} brand families — Apple, GitHub, Vercel, Slack,
                Discord — two themes each. The colour the brand publishes is
                pinned as the primary and the rest is generated around it, so
                they read as that brand without claiming to be its official
                theme.
              </div>
              <Link
                href="/presets/brand"
                className="inline-flex items-center gap-1 text-xs font-medium mt-2 no-underline hover:underline"
                style={{ color: "var(--theme-color-primary)" }}
              >
                Browse all brands →
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <SectionHeading
            num={2}
            desc="Click any card below to apply that theme to this entire site — live, no reload. Every card shows the preset's light and dark variants side-by-side."
          >
            Try them live
          </SectionHeading>

          <CurrentThemeInspector />

          <div className="flex gap-1 p-1 rounded-xl bg-muted/50 mb-4">
            {(["default", "brand"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
                  activeTab === tab
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground/50 hover:text-foreground/80"
                }`}
              >
                {PRESET_KIND_META[tab].label}
                <span className="ml-1.5 text-xs opacity-50">
                  ({tab === "default" ? defaultCount : brandCount})
                </span>
              </button>
            ))}
          </div>

          <p className="text-sm opacity-70 mb-4 leading-relaxed">
            {PRESET_KIND_META[activeTab].hint}
          </p>

          {groups.length === 0 ? (
            <p className="text-sm opacity-50">No themes in this group.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map((group) => (
                <PresetCard key={group.key} group={group} />
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <SectionHeading
            num={3}
            desc="Import preset families and brand palettes directly from the core package. No extra styling required."
          >
            Install instructions
          </SectionHeading>

          <h3 className="text-sm font-semibold mb-2">
            Default presets
          </h3>
          <CodeBlock
            html={highlightCode(DEFAULT_PRESET_SNIPPET, "ts")}
            code={DEFAULT_PRESET_SNIPPET}
            language="ts"
            {...(labels?.[DEFAULT_PRESET_SNIPPET]
              ? { displayLanguage: labels[DEFAULT_PRESET_SNIPPET] }
              : {})}
            className="rounded-lg m-0 mb-4"
          />

          <h3 className="text-sm font-semibold mb-2">
            Brand presets
          </h3>
          <CodeBlock
            html={highlightCode(BRAND_PRESET_SNIPPET, "ts")}
            code={BRAND_PRESET_SNIPPET}
            language="ts"
            {...(labels?.[BRAND_PRESET_SNIPPET]
              ? { displayLanguage: labels[BRAND_PRESET_SNIPPET] }
              : {})}
            className="rounded-lg m-0"
          />

          <Callout title="Tip" className="mt-4">
            You can override any preset&apos;s tokens by passing a{" "}
            <code className="mono text-[0.9em]">PresetOverrides</code> map to{" "}
            <code className="mono text-[0.9em]">getPresetThemes()</code>. See
            the custom themes guide for details.
          </Callout>
        </section>

        <section>
          <SectionHeading
            num={4}
            desc="Presets are a starting point — you can compose, extend, or generate your own families."
          >
            Create your own
          </SectionHeading>
          <div className="flex flex-col gap-2">
            <Link
              href="/custom-themes"
              className="glass-card card-lift p-4 no-underline flex items-center justify-between gap-3"
            >
              <div>
                <div className="font-semibold">Custom Themes Guide</div>
                <div className="text-xs opacity-60">
                  defineTheme, extendTheme, composeTheme and the generation
                  studio.
                </div>
              </div>
              <span style={{ color: "var(--theme-color-primary)" }}>→</span>
            </Link>
            <Link
              href="/tokens"
              className="glass-card card-lift p-4 no-underline flex items-center justify-between gap-3"
            >
              <div>
                <div className="font-semibold">Semantic Tokens</div>
                <div className="text-xs opacity-60">
                  Typography, spacing, radius, shadows, border widths, z-index
                  and breakpoints.
                </div>
              </div>
              <span style={{ color: "var(--theme-color-primary)" }}>→</span>
            </Link>
          </div>
        </section>

        {/* The half of the quality story that cannot be asserted. Every numeric
            gate checks contrast, separation and anchor preservation; none of
            them can see a disabled button that reads as enabled. */}
        <PresetVisualHarness />
      </div>
    </DocsLayout>
  );
}
