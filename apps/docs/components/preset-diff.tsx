"use client";

import { useMemo } from "react";
import { getContrastRatio, type PresetCatalogEntry, type ThemeDefinition } from "@themvora/core";

/**
 * Semantic diff between a brand preset and a default baseline.
 *
 * ## Why it is semantic, not token-by-token
 *
 * A raw token diff for a *generated* preset is noise: every surface shifts by a
 * fraction of a lightness step, so a table of 21 changed rows says "everything
 * changed", which is true and useless.
 *
 * What a reader actually wants to know is which *design decisions* differ:
 *
 *   Primary identity      changed
 *   Surface temperature   changed
 *   Border character      unchanged
 *   Status system         unchanged
 *
 * So the comparison is made on axes, from public primitives only — hex equality
 * and `getContrastRatio`. No colour maths is reimplemented here; anything that
 * needed the OKLCH engine would be a core function, not a React one.
 *
 * @packageDocumentation
 */

function colorsOf(theme: ThemeDefinition | undefined): Record<string, string> {
  return (theme?.tokens?.colors ?? {}) as Record<string, string>;
}

type Verdict = "changed" | "unchanged" | "shifted";

interface Axis {
  label: string;
  verdict: Verdict;
  detail: string;
  /** Roles to render as before/after swatches. */
  swatches?: Array<[string, string | undefined, string | undefined]>;
}

/** How far a surface's contrast against white moved before it counts as a shift. */
const SURFACE_DEPTH_EPSILON = 0.25;

type Swatches = Array<[string, string | undefined, string | undefined]>;

/**
 * Build an axis, omitting `swatches` when there are none.
 *
 * `exactOptionalPropertyTypes` rejects `swatches: undefined`, and an explicit
 * `undefined` would render as an empty swatch row rather than no row at all.
 */
function axis(label: string, verdict: Verdict, detail: string, swatches?: Swatches): Axis {
  return swatches ? { label, verdict, detail, swatches } : { label, verdict, detail };
}

function buildAxes(brand: ThemeDefinition, baseline: ThemeDefinition): Axis[] {
  const b = colorsOf(brand);
  const d = colorsOf(baseline);

  const same = (key: string) => b[key] !== undefined && b[key] === d[key];

  // -- primary identity ------------------------------------------------------
  const primaryChanged = !same("primary");
  const primaryAxis = axis(
    "Primary identity",
    primaryChanged ? "changed" : "unchanged",
    primaryChanged ? "the brand's own hue anchors `primary`" : "same primary as the default baseline",
    primaryChanged
      ? [["primary", d.primary, b.primary], ["primaryForeground", d.primaryForeground, b.primaryForeground]]
      : undefined,
  );

  // -- surface temperature ---------------------------------------------------
  const backgroundChanged = !same("background");
  const surfaceAxis = axis(
    "Surface temperature",
    backgroundChanged ? "changed" : "unchanged",
    backgroundChanged
      ? "the neutral scale is tinted toward the brand hue"
      : "neutral surfaces match the baseline",
    backgroundChanged ? [["background", d.background, b.background], ["muted", d.muted, b.muted]] : undefined,
  );

  // -- surface depth ---------------------------------------------------------
  const depthOf = (hex: string | undefined) =>
    hex && /^#[0-9a-f]{6}$/i.test(hex) ? getContrastRatio(hex, "#ffffff") : null;
  const brandDepth = depthOf(b.background);
  const baselineDepth = depthOf(d.background);
  const depthShift =
    brandDepth !== null && baselineDepth !== null && Math.abs(brandDepth - baselineDepth) > SURFACE_DEPTH_EPSILON;

  const depthAxis = axis(
    "Surface depth",
    depthShift ? "shifted" : "unchanged",
    brandDepth === null || baselineDepth === null
      ? "not comparable"
      : depthShift
        ? `canvas contrast ${baselineDepth.toFixed(2)}:1 → ${brandDepth.toFixed(2)}:1`
        : `canvas contrast within ${SURFACE_DEPTH_EPSILON} of the baseline`,
  );

  // -- border character ------------------------------------------------------
  const borderChanged = !same("border");
  const borderAxis = axis(
    "Border character",
    borderChanged ? "shifted" : "unchanged",
    borderChanged ? "the hairline takes the brand's neutral tint" : "border matches the baseline",
    borderChanged ? [["border", d.border, b.border]] : undefined,
  );

  // -- status system ---------------------------------------------------------
  const statusUnchanged = same("destructive") && same("success");
  const statusAxis = axis(
    "Status system",
    statusUnchanged ? "unchanged" : "changed",
    statusUnchanged
      ? "destructive and success are seed-independent, so they are identical to every other preset"
      : "status colours differ from the baseline",
  );

  // -- interaction roles -----------------------------------------------------
  const interactionChanged = !same("input") || !same("ring");
  const interactionAxis = axis(
    "Interaction roles",
    interactionChanged ? "shifted" : "unchanged",
    interactionChanged
      ? "`input` and `ring` follow the brand hue and its contrast solution"
      : "interaction roles match the baseline",
    interactionChanged ? [["ring", d.ring, b.ring], ["input", d.input, b.input]] : undefined,
  );

  return [primaryAxis, surfaceAxis, depthAxis, borderAxis, interactionAxis, statusAxis];
}

function verdictTone(verdict: Verdict): string {
  return verdict === "unchanged" ? "opacity-45" : verdict === "changed" ? "text-foreground" : "opacity-80";
}

function verdictLabel(verdict: Verdict): string {
  return verdict === "unchanged" ? "unchanged" : verdict;
}

/**
 * Render the semantic diff of a brand preset against a default baseline.
 *
 * @param props.entry - The brand catalog entry.
 * @param props.baseline - The default entry to compare against.
 */
export function PresetSemanticDiff({
  entry,
  baseline,
}: {
  entry: PresetCatalogEntry;
  baseline: PresetCatalogEntry | undefined;
}) {
  const axes = useMemo(
    () => (baseline ? buildAxes(entry.themes.light, baseline.themes.light) : []),
    [entry, baseline],
  );

  if (!baseline || axes.length === 0) return null;

  const changed = axes.filter((axis) => axis.verdict !== "unchanged").length;

  return (
    <details className="group rounded-lg border border-border bg-background/40">
      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none text-[11px]">
        <span className="opacity-60">
          Changes from <code className="mono">{baseline.name}</code>
        </span>
        <span className="opacity-45 ml-auto">
          {changed} of {axes.length}
        </span>
        <span className="opacity-40 transition-transform group-open:rotate-90">›</span>
      </summary>

      <ul className="px-3 pb-3 pt-1 border-t border-border flex flex-col gap-2">
        {axes.map((axis) => (
          <li key={axis.label} className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2 text-[11px]">
              <span className="flex-1 min-w-0 opacity-80">{axis.label}</span>
              <span className={`mono text-[10px] ${verdictTone(axis.verdict)}`}>
                {verdictLabel(axis.verdict)}
              </span>
            </div>
            <div className="text-[10px] opacity-50 leading-snug">{axis.detail}</div>
            {axis.swatches && (
              <div className="flex flex-wrap gap-3">
                {axis.swatches.map(([role, from, to]) => (
                  <span key={role} className="inline-flex items-center gap-1 text-[10px] mono opacity-70">
                    <span
                      className="w-3 h-3 rounded-sm border border-black/10"
                      style={{ background: from ?? "transparent" }}
                      title={`baseline ${role}`}
                    />
                    <span className="opacity-40">→</span>
                    <span
                      className="w-3 h-3 rounded-sm border border-black/10"
                      style={{ background: to ?? "transparent" }}
                      title={`${entry.name} ${role}`}
                    />
                    {role}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
