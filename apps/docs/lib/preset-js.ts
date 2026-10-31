import { compatibilityLabel, javascriptFor } from "./code-variants.ts";
import {
  PRESET_FAMILY_TOKEN,
  PRESET_FRAMEWORKS,
  getPresetFrameworkSnippet,
  getPresetFrameworkSnippetUnfiltered,
  getPresetFrameworkSnippetFamilyPicker,
} from "../components/preset-snippets.ts";

/**
 * The JavaScript form of every preset setup snippet, derived on the server.
 *
 * The presets pages cannot precompute one entry per family: the families come
 * from `getPresetThemes()` at render time, and the snippet is regenerated for
 * whichever family, framework and mode the visitor selects. There are 11
 * frameworks × 2 modes to describe, not 9 × 11 × 2.
 *
 * That works because the family name reaches the snippet only through string
 * literals and comments — never through anything the TypeScript erasure touches.
 * So the transform is the same for every family, and this module derives it once
 * with a sentinel in place of the name. The client substitutes the real family
 * back in. `scripts/check-code-variants.mjs` asserts that projection against the
 * real derivation for every shipped family, so the shortcut is checked rather
 * than assumed.
 *
 * Keyed by `framework:mode`, and absent for a snippet that has no JavaScript
 * form — the CSS and HTML entries, the single-file components whose script block
 * cannot be separated from the template, and Angular, which is TypeScript-only by
 * decision (see `TYPESCRIPT_ONLY_FRAMEWORKS`).
 */
export type PresetJavaScript = Record<string, string>;

export function presetJavaScript(kind: "default" | "brand"): PresetJavaScript {
  const sources: PresetJavaScript = {};
  for (const { slug } of PRESET_FRAMEWORKS) {
    for (const mode of ["light", "dark"] as const) {
      const snippet = getPresetFrameworkSnippet(
        PRESET_FAMILY_TOKEN,
        kind,
        slug,
        mode,
      );
      const js = javascriptFor(snippet.code, snippet.lang, slug);
      if (js === null) continue;
      // Already JavaScript: a selector would toggle between two identical
      // blocks, which is worse than offering none.
      if (js.trim() === snippet.code.trim()) continue;
      sources[`${slug}:${mode}`] = js;
    }
  }
  return sources;
}

/**
 * The compatibility badge of every preset setup snippet, keyed by
 * `framework:mode` — the same keying as `presetJavaScript`.
 *
 * Derived with the same sentinel family, and for the same reason: the badge
 * depends only on the snippet's syntax, and the family name reaches the snippet
 * exclusively through string literals and comments, which no grammar rule
 * distinguishes. `scripts/check-code-variants.mjs` proves that projection for
 * every shipped family, so the shortcut is verified rather than assumed.
 *
 * Unlike `presetJavaScript` this keeps entries whose snippet has no distinct
 * JavaScript form: `TS / JS` describes the source itself, and a snippet can be
 * valid JavaScript while still having no meaningful second variant to show.
 *
 * It also keeps the TypeScript-only frameworks, with their grammar label: the
 * badge is not the selector, and an Angular setup snippet still needs a label in
 * its toolbar.
 */
export function presetLabels(kind: "default" | "brand"): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const { slug } of PRESET_FRAMEWORKS) {
    for (const mode of ["light", "dark"] as const) {
      const snippet = getPresetFrameworkSnippet(
        PRESET_FAMILY_TOKEN,
        kind,
        slug,
        mode,
      );
      const label = compatibilityLabel(snippet.code, snippet.lang, slug);
      if (label === null) continue;
      labels[`${slug}:${mode}`] = label;
    }
  }
  return labels;
}

/**
 * The JavaScript form of the unfiltered preset snippet, derived on the server.
 *
 * Same shape as `presetJavaScript` but for the "all presets" snippet. The family
 * name does not appear in this snippet, so no sentinel substitution is needed —
 * the derivation is the same for every family.
 */
export function presetJavaScriptUnfiltered(kind: "default" | "brand"): PresetJavaScript {
  const sources: PresetJavaScript = {};
  for (const { slug } of PRESET_FRAMEWORKS) {
    for (const mode of ["light", "dark"] as const) {
      const snippet = getPresetFrameworkSnippetUnfiltered(kind, slug, mode);
      const js = javascriptFor(snippet.code, snippet.lang, slug);
      if (js === null) continue;
      if (js.trim() === snippet.code.trim()) continue;
      sources[`${slug}:${mode}`] = js;
    }
  }
  return sources;
}

/**
 * The compatibility badge of the unfiltered preset snippet, keyed by `framework:mode`.
 */
export function presetLabelsUnfiltered(kind: "default" | "brand"): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const { slug } of PRESET_FRAMEWORKS) {
    for (const mode of ["light", "dark"] as const) {
      const snippet = getPresetFrameworkSnippetUnfiltered(kind, slug, mode);
      const label = compatibilityLabel(snippet.code, snippet.lang, slug);
      if (label === null) continue;
      labels[`${slug}:${mode}`] = label;
    }
  }
  return labels;
}

/**
 * The JavaScript form of the family picker snippet, derived on the server.
 *
 * The family picker snippet does not contain a family name, so the derivation
 * is the same for every family.
 */
export function presetJavaScriptFamilyPicker(): PresetJavaScript {
  const sources: PresetJavaScript = {};
  for (const { slug } of PRESET_FRAMEWORKS) {
    const snippet = getPresetFrameworkSnippetFamilyPicker(slug);
    const js = javascriptFor(snippet.code, snippet.lang, slug);
    if (js === null) continue;
    if (js.trim() === snippet.code.trim()) continue;
    sources[slug] = js;
  }
  return sources;
}

/**
 * The compatibility badge of the family picker snippet, keyed by framework.
 */
export function presetLabelsFamilyPicker(): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const { slug } of PRESET_FRAMEWORKS) {
    const snippet = getPresetFrameworkSnippetFamilyPicker(slug);
    const label = compatibilityLabel(snippet.code, snippet.lang, slug);
    if (label === null) continue;
    labels[slug] = label;
  }
  return labels;
}
