import type { Metadata } from "next";

import { DefaultPresetsView } from "./default-presets";
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
  alternates: { canonical: docsUrl("/presets/default") },
  title: "Default Presets",
  description:
    "Nine signature preset families — click any to apply it live. Every preset includes light and dark variants with WCAG-conscious token sets.",
};

/**
 * The JavaScript form of each setup snippet, derived once on the server.
 *
 * The snippet itself is generated in the browser from the selected family, so
 * the page sends the derivation for a sentinel family; the client substitutes
 * the real name. See `lib/preset-js.ts`.
 */
const jsSources = presetJavaScript("default");
const jsSourcesUnfiltered = presetJavaScriptUnfiltered("default");
const jsSourcesFamilyPicker = presetJavaScriptFamilyPicker();

/**
 * The compatibility badge of each setup snippet — `TS / JS`, `TS`, and so on.
 *
 * Kept separate from `jsSources`: the badge describes the source, so it is
 * present even for a snippet with no distinct JavaScript form.
 */
const labels = presetLabels("default");
const labelsUnfiltered = presetLabelsUnfiltered("default");
const labelsFamilyPicker = presetLabelsFamilyPicker();

export default function DefaultPresetsPage() {
  return (
    <DefaultPresetsView
      jsSources={jsSources}
      labels={labels}
      jsSourcesUnfiltered={jsSourcesUnfiltered}
      labelsUnfiltered={labelsUnfiltered}
      jsSourcesFamilyPicker={jsSourcesFamilyPicker}
      labelsFamilyPicker={labelsFamilyPicker}
    />
  );
}
