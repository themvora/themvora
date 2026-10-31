/**
 * Contrast reporting.
 *
 * The measurement itself comes from core's `measureThemeContrast()` and is never
 * recomputed here — WCAG ratio maths, the pair list and the applicable floor all
 * live in one place, and a second implementation would be a second answer.
 *
 * What this module owns is the summary: turning the canonical pair list into the
 * counts and the sentence the UI shows. The wording matches the CLI's `inspect`
 * and `validate` output so a number the extension reports and a number the
 * terminal reports are the same number described the same way.
 *
 * @packageDocumentation
 */
import type { MeasuredPair } from "@themvora/core";

/** A pass/fail tally over the canonical contrast pairs. */
export interface ContrastSummary {
  /** Every pair measured. */
  pairs: number;
  /** Pairs held to the text floor. */
  text: { total: number; passing: number };
  /** Pairs held to the UI-component floor. */
  ui: { total: number; passing: number };
}

/**
 * Tally a measurement.
 *
 * @param pairs - The pairs returned by `measureThemeContrast()`.
 * @returns The counts, split by the requirement each pair was held to.
 */
export function summariseContrast(pairs: readonly MeasuredPair[]): ContrastSummary {
  const count = (requirement: MeasuredPair["requirement"]) => {
    const subset = pairs.filter((pair) => pair.requirement === requirement);
    return { total: subset.length, passing: subset.filter((pair) => pair.passes).length };
  };

  return { pairs: pairs.length, text: count("text"), ui: count("ui") };
}

/**
 * Render a tally as one line.
 *
 * @param summary - The tally.
 * @returns A line such as `16 pairs · text 16/16 · ui 4/4`.
 */
export function describeContrast(summary: ContrastSummary): string {
  const { pairs, text, ui } = summary;
  return `${pairs} pairs · text ${text.passing}/${text.total} · ui ${ui.passing}/${ui.total}`;
}
