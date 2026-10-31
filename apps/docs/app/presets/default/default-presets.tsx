"use client";

import Link from "next/link";
import { DocsLayout } from "../../../components/docs-layout";
import { PresetsHeader, usePresetGroups } from "../../../components/presets";
import { PresetComparison } from "../../../components/preset-preview";
import { PresetCatalogCard, usePresetCatalog } from "../../../components/preset-catalog";
import type { PresetJavaScript } from "../../../lib/preset-js";

/**
 * `/presets/default` — Themvora's curated palette collection.
 *
 * Nine families, each a recipe resolved into a complete light/dark theme by the
 * same generator that powers `generateTheme()`. The cards are compact by
 * default; expand "Details" on any card for quality scores, contrast checks,
 * role usage and provenance.
 */
export function DefaultPresetsView({
  jsSources,
  labels,
  jsSourcesUnfiltered,
  labelsUnfiltered,
  jsSourcesFamilyPicker,
  labelsFamilyPicker,
}: {
  jsSources?: PresetJavaScript;
  labels?: Record<string, string>;
  jsSourcesUnfiltered?: PresetJavaScript;
  labelsUnfiltered?: Record<string, string>;
  jsSourcesFamilyPicker?: PresetJavaScript;
  labelsFamilyPicker?: Record<string, string>;
}) {
  const groups = usePresetGroups("default");
  const catalog = usePresetCatalog("default");

  return (
    <DocsLayout wide>
      <div className="max-w-5xl">
        <PresetsHeader kind="default" />

        <section className="mb-12">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((entry) => (
              <PresetCatalogCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold tracking-tight mb-1">
            Preview &amp; use
          </h2>
          <p className="text-sm opacity-70 mb-4 leading-relaxed max-w-3xl">
            Pick a family and mode to see a full application preview, the setup
            snippet for your framework, and the resolved CSS variables.
          </p>
          <PresetComparison
            groups={groups}
            kind="default"
            {...(jsSources ? { jsSources } : {})}
            {...(labels ? { labels } : {})}
            {...(jsSourcesUnfiltered ? { jsSourcesUnfiltered } : {})}
            {...(labelsUnfiltered ? { labelsUnfiltered } : {})}
            {...(jsSourcesFamilyPicker ? { jsSourcesFamilyPicker } : {})}
            {...(labelsFamilyPicker ? { labelsFamilyPicker } : {})}
          />
        </section>

        <section className="mb-10">
          <div className="flex flex-wrap gap-4">
            <Link
              href="/custom-themes#presets"
              className="inline-flex items-center gap-1.5 text-sm text-foreground no-underline font-medium underline hover:decoration-foreground"
            >
              Define your own themes →
            </Link>
            <Link
              href="/presets/brand"
              className="inline-flex items-center gap-1.5 text-sm text-primary no-underline font-medium hover:underline"
            >
              Brand presets →
            </Link>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
