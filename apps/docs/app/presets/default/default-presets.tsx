"use client";

import Link from "next/link";
import { DocsLayout } from "../../../components/docs-layout";
import { PresetsHeader, usePresetGroups } from "../../../components/presets";
import { PresetComparison } from "../../../components/preset-preview";
import { PresetCatalogCard, usePresetCatalog } from "../../../components/preset-catalog";

/**
 * `/presets/default` — Themvora's curated palette collection.
 *
 * ## What this page is
 *
 * The public visual explanation of the preset system, not a developer test page.
 * Every card renders a *generated* preset: its identity, its palette, a live
 * preview, its quality score and its provenance — all read from
 * `getPresetCatalog()`, which is derived from the recipes.
 *
 * There is no palette data on this page. That is deliberate: a page that carried
 * its own copy of the tokens would be free to drift from what ships.
 *
 * ## The two halves
 *
 * 1. **The collection** — what the nine families look like, and how they differ.
 *    Visual, not textual: chips, a rendered interface, and the three interaction
 *    roles side by side.
 * 2. **Use it in your app** — the interactive surface, which keeps the
 *    framework-aware snippet and the runtime preview.
 */
export function DefaultPresetsView() {
  const groups = usePresetGroups("default");
  const catalog = usePresetCatalog("default");

  return (
    <DocsLayout>
      <div className="max-w-5xl">
        <PresetsHeader kind="default" />

        <section className="mb-12">
          <h2 className="text-lg font-semibold tracking-tight mb-1">
            The collection
          </h2>
          <p className="text-sm opacity-70 mb-5 leading-relaxed max-w-3xl">
            Nine curated families, each one a recipe: a seed, a style and a radius.
            The tokens are resolved by the same generator that powers{" "}
            <code className="mono text-[0.9em]">generateTheme()</code>, so every
            preset below already satisfies the contrast contract and the visual
            relationship checks before it ships. Switch a card to dark to see the
            family generated independently for that mode — not inverted from the
            light one.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            {catalog.map((entry) => (
              <PresetCatalogCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold tracking-tight mb-1">
            Preview a preset and use it in your app
          </h2>
          <p className="text-sm opacity-70 mb-4 leading-relaxed max-w-3xl">
            Pick a family and a mode to see the same interface under each. This
            changes only the preview — not the documentation site. Everything
            below the preview follows your selection: the setup snippet for your
            framework, the resolved CSS variables, and a ready-to-paste{" "}
            <code className="mono text-[12px]">defineTheme()</code> call you can
            copy or download.
          </p>
          <PresetComparison groups={groups} kind="default" />
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold tracking-tight mb-1">
            Use it in your app
          </h2>
          <p className="text-sm opacity-70 mb-4 leading-relaxed max-w-3xl">
            Every preset ships inside{" "}
            <code className="mono text-[0.9em]">@themvora/core</code> as a
            complete light/dark family. Pick your framework in the preview above
            and copy the snippet for the preset you were looking at. Presets are
            generated artifacts, so a preset is not a frozen token list you have to
            maintain — it is a recipe you can restyle.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/custom-themes#presets"
              className="inline-flex items-center gap-1.5 text-sm text-foreground no-underline font-medium underline hover:decoration-foreground"
            >
              Learn how to define your own themes →
            </Link>
            <Link
              href="/presets/brand"
              className="inline-flex items-center gap-1.5 text-sm text-primary no-underline font-medium hover:underline"
            >
              Compare with Brand presets →
            </Link>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
