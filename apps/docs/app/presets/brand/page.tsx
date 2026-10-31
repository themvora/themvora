import type { Metadata } from "next";

import { BrandPresetsView } from "./brand-presets";
import {
  presetJavaScript,
  presetJavaScriptUnfiltered,
  presetJavaScriptFamilyPicker,
  presetLabels,
  presetLabelsUnfiltered,
  presetLabelsFamilyPicker,
} from "../../../lib/preset-js";
import { docsUrl } from "../../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/presets/brand") },
  title: "Brand Presets",
  description:
    "Real-world brand palettes — Apple, GitHub, Vercel, Slack and more. Click any preset to apply it live, with light and dark variants.",
};

/**
 * The JavaScript form of each setup snippet, derived once on the server.
 *
 * The snippet itself is generated in the browser from the selected family, so
 * the page sends the derivation for a sentinel family; the client substitutes
 * the real name. See `lib/preset-js.ts`.
 */
const jsSources = presetJavaScript("brand");
const jsSourcesUnfiltered = presetJavaScriptUnfiltered("brand");
const jsSourcesFamilyPicker = presetJavaScriptFamilyPicker();

/**
 * The compatibility badge of each setup snippet — `TS / JS`, `TS`, and so on.
 *
 * Kept separate from `jsSources`: the badge describes the source, so it is
 * present even for a snippet with no distinct JavaScript form.
 */
const labels = presetLabels("brand");
const labelsUnfiltered = presetLabelsUnfiltered("brand");
const labelsFamilyPicker = presetLabelsFamilyPicker();

export default function BrandPresetsPage() {
  return (
    <BrandPresetsView
      jsSources={jsSources}
      labels={labels}
      jsSourcesUnfiltered={jsSourcesUnfiltered}
      labelsUnfiltered={labelsUnfiltered}
      jsSourcesFamilyPicker={jsSourcesFamilyPicker}
      labelsFamilyPicker={labelsFamilyPicker}
    />
  );
}
