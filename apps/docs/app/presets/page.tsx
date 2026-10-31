import type { Metadata } from "next";

import { PresetShowcase } from "../../components/preset-showcase";
import {
  BRAND_PRESET_SNIPPET,
  DEFAULT_PRESET_SNIPPET,
} from "../../components/preset-snippets";
import { compatibilityLabels } from "../../lib/code-variants";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/presets") },
  title: "Built-in Presets",
  description:
    "Themvora ships 9 curated preset families — 18 themes with their light and dark variants — and 10 brand presets across 5 brands. Click any to apply it live.",
};

/**
 * The compatibility badge of each install snippet.
 *
 * Derived here rather than in the showcase, which is a client component: the
 * badge needs the TypeScript compiler, and the compiler stays on the server.
 */
const labels = compatibilityLabels([
  { code: DEFAULT_PRESET_SNIPPET, lang: "ts" },
  { code: BRAND_PRESET_SNIPPET, lang: "ts" },
]);

export default function PresetsPage() {
  return <PresetShowcase labels={labels} />;
}
