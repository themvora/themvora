"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BRAND_PRESET_DISCLAIMER,
  describeRoleUsage,
  getPresetCatalog,
  measureThemeContrast,
  type CoreColor,
  type PresetCatalogEntry,
  type PresetKind,
  type PresetQuality,
  type ThemeDefinition,
} from "@themvora/core";
import { useSetThemeFamily, useTheme } from "@themvora/next/client";

/**
 * The preset catalog surface.
 *
 * ## Why this file exists
 *
 * Phase 7 made presets *generated artifacts*. This module is the presentation
 * half of that: it reads `getPresetCatalog()` — identity, provenance and quality,
 * all derived from the recipe and the generator — and renders it. It holds **no
 * palette data of its own**.
 *
 * That is the whole point of the design. A preset page that carried its own copy
 * of the tokens would be free to drift from what ships; a page that renders the
 * catalog cannot.
 *
 * The same applies to contrast: the numbers here come from
 * `measureThemeContrast()`, which is the function the preset quality gate scores
 * with. The page cannot show a ratio the gate disagrees with.
 *
 * @packageDocumentation
 */

/** The roles shown as palette chips, in reading order. */
const CHIP_ROLES = [
  "background",
  "card",
  "muted",
  "secondary",
  "primary",
  "accent",
  "border",
] as const;

function colorsOf(theme: ThemeDefinition | undefined): Record<string, string> {
  return (theme?.tokens?.colors ?? {}) as Record<string, string>;
}

/**
 * The catalog for one preset kind, derived once per render pass.
 *
 * @param kind - `"default"` or `"brand"`.
 * @returns The catalog entries.
 */
export function usePresetCatalog(kind: PresetKind): PresetCatalogEntry[] {
  return useMemo(() => getPresetCatalog(kind), [kind]);
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/** Palette chips for a resolved theme. */
export function PaletteChips({
  theme,
  roles = CHIP_ROLES,
  size = "md",
}: {
  theme: ThemeDefinition | undefined;
  roles?: readonly string[];
  size?: "sm" | "md";
}) {
  const colors = colorsOf(theme);
  const dimension = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";

  return (
    <div className="flex flex-wrap gap-1.5" role="img" aria-label="Palette swatches">
      {roles.map((role) =>
        colors[role] ? (
          <span
            key={role}
            title={`${role} — ${colors[role]}`}
            className={`${dimension} rounded-full border border-black/10 dark:border-white/15`}
            style={{ background: colors[role] }}
          />
        ) : null,
      )}
    </div>
  );
}

/** The character line: temperature · style · tags. */
export function PresetCharacter({ entry }: { entry: PresetCatalogEntry }) {
  return (
    <p className="text-[11px] opacity-60 leading-relaxed">
      {entry.character}
      <span className="opacity-70">
        {" · "}
        <code className="mono">{entry.style}</code>
      </span>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Quality
// ---------------------------------------------------------------------------

function statusGlyph(status: "pass" | "warn" | "fail"): string {
  return status === "pass" ? "✓" : status === "warn" ? "!" : "✗";
}

function statusTone(status: "pass" | "warn" | "fail"): string {
  return status === "pass" ? "opacity-70" : status === "warn" ? "text-amber-600" : "text-red-600";
}

/**
 * The 8-check quality summary, expandable into the individual checks.
 *
 * Deliberately does **not** say the theme "is accessible". It reports that the
 * checks passed, which is what was measured. The distinction is the one the docs
 * audit established: contrast checks passing is evidence, not a conformance
 * claim.
 */
export function QualityPanel({ quality }: { quality: PresetQuality }) {
  const allPassed = quality.failures.length === 0;

  return (
    <details className="group rounded-lg border border-border bg-background/40">
      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none text-[11px]">
        <span className={`font-semibold ${allPassed ? "" : "text-red-600"}`}>
          {quality.passed}/{quality.total}
        </span>
        <span className="opacity-60">semantic checks passed</span>
        {quality.warnings.length > 0 && (
          <span className="text-amber-600 opacity-80">
            · {quality.warnings.length} warning{quality.warnings.length === 1 ? "" : "s"}
          </span>
        )}
        <span className="ml-auto opacity-40 transition-transform group-open:rotate-90">›</span>
      </summary>
      <ul className="px-3 pb-2.5 pt-1 flex flex-col gap-1 border-t border-border">
        {quality.checks.map((check) => (
          <li key={check.id} className="flex items-baseline gap-2 text-[11px]">
            <span className={`mono w-3 shrink-0 ${statusTone(check.status)}`}>
              {statusGlyph(check.status)}
            </span>
            <span className="opacity-70 flex-1 min-w-0">{check.label}</span>
            {check.detail && (
              <span className="mono text-[10px] opacity-50 truncate max-w-[55%]" title={check.detail}>
                {check.detail}
              </span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Contrast
// ---------------------------------------------------------------------------

/** The three semantic categories the contract pairs fall into. */
function categoryOf(foreground: string, requirement: "text" | "ui"): string {
  if (requirement === "text") return "Text";
  return foreground === "ring" ? "Focus indicators" : "UI boundaries";
}

const CATEGORY_ORDER = ["Text", "UI boundaries", "Focus indicators"] as const;

/**
 * Contrast reporting, grouped by what the pairs are *for*.
 *
 * Reads `measureThemeContrast()`, so the ratios match the preset quality gate
 * exactly. Each category collapses to a pass/fail line; the pairs are one
 * expansion away.
 */
export function ContrastPanel({ theme }: { theme: ThemeDefinition | undefined }) {
  const rows = useMemo(() => (theme ? measureThemeContrast(theme) : []), [theme]);
  if (rows.length === 0) return null;

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    rows: rows.filter((row) => categoryOf(row.foreground, row.requirement) === category),
  })).filter((group) => group.rows.length > 0);

  const colors = colorsOf(theme);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 text-[10px] font-semibold uppercase tracking-wider opacity-60">
        Contrast checks
      </div>
      <div className="divide-y divide-border">
        {groups.map((group) => {
          const passed = group.rows.every((row) => row.passes);
          return (
            <details key={group.category} className="group">
              <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none text-[11px]">
                <span className="flex-1 min-w-0 opacity-80">{group.category}</span>
                <span className={`mono text-[10px] font-semibold ${passed ? "opacity-70" : "text-red-600"}`}>
                  {passed ? "PASS" : "FAIL"}
                </span>
                <span className="opacity-30 transition-transform group-open:rotate-90">›</span>
              </summary>
              <ul className="px-3 pb-2 flex flex-col gap-1">
                {group.rows.map((row) => (
                  <li
                    key={`${row.foreground}/${row.background}`}
                    className="flex items-center gap-2 text-[10px]"
                  >
                    <span className="inline-flex shrink-0" aria-hidden>
                      <span
                        className="w-3 h-3 rounded-sm border border-black/10"
                        style={{ background: colors[row.foreground] }}
                      />
                      <span
                        className="w-3 h-3 rounded-sm border border-black/10 -ml-1"
                        style={{ background: colors[row.background] }}
                      />
                    </span>
                    <code className="mono opacity-60 flex-1 min-w-0 truncate">
                      {row.foreground}/{row.background}
                    </code>
                    <span className="mono opacity-80 shrink-0">
                      {row.ratio.toFixed(2)}:1
                    </span>
                    <span className="mono opacity-40 shrink-0">≥{row.floor}</span>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The three interaction roles
// ---------------------------------------------------------------------------

/**
 * A live demonstration of why `border`, `input` and `ring` are three different
 * roles rather than one "UI colour".
 *
 * The three strokes are rendered from the preset's own tokens, side by side, at
 * the same size. The difference is the argument — a paragraph would not make it.
 */
export function InteractionRoles({ theme }: { theme: ThemeDefinition | undefined }) {
  const colors = colorsOf(theme);
  const [focused, setFocused] = useState(false);

  const roles: Array<{ role: string; label: string; note: string }> = [
    { role: "border", label: "Border", note: "subtle structural separation" },
    { role: "input", label: "Input", note: "stronger interactive boundary" },
    { role: "ring", label: "Ring", note: "focus visibility" },
  ];

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-2">
        Three interaction roles
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-3">
        {roles.map(({ role, label, note }) => (
          <div key={role} className="flex flex-col gap-1.5 min-w-0">
            <div
              className="h-9 rounded-md bg-card"
              style={{
                border: `2px solid ${colors[role] ?? "currentColor"}`,
                ...(role === "ring" && focused
                  ? { boxShadow: `0 0 0 3px ${colors.ring ?? "currentColor"}` }
                  : {}),
              }}
            />
            <div className="text-[10px] font-semibold">{label}</div>
            <div className="text-[10px] opacity-55 leading-snug">{note}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-[10px] opacity-70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={focused}
            onChange={(event) => setFocused(event.target.checked)}
            className="cursor-pointer"
          />
          focused
        </label>
        <p className="text-[10px] opacity-50 leading-snug flex-1 min-w-0">
          Border is decoration and stays a hairline. Input identifies a control, so
          it clears the 3:1 non-text floor. Ring only has to be seen when focused.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Safe usage
// ---------------------------------------------------------------------------

/**
 * What a role is *for*, not just what it measures.
 *
 * A ratio answers "is this readable here"; this answers "is this readable here
 * **on purpose**". The distinction is the whole point of the context contract:
 * `primary` clears 4.5:1 against `primaryForeground` in every shipped preset, and
 * against the canvas in only 17 of 28 — because it is an action and identity
 * colour, not a reading colour.
 *
 * Rendered from `describeRoleUsage()`, so it cannot drift from the contract the
 * generator is held to.
 */
export function RoleUsage({ role }: { role: string }) {
  const usage = useMemo(() => describeRoleUsage(role as CoreColor), [role]);

  return (
    <details className="group rounded-lg border border-border bg-background/40">
      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none text-[11px]">
        <span className="opacity-60">
          How <code className="mono">{role}</code> is meant to be used
        </span>
        <span className="opacity-40 transition-transform group-open:rotate-90 ml-auto">›</span>
      </summary>

      <div className="px-3 pb-3 pt-1 border-t border-border flex flex-col gap-2.5 text-[11px]">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-1">
            Supported
          </div>
          <ul className="flex flex-col gap-0.5">
            {usage.supported.map((item) => (
              <li key={item} className="flex gap-1.5">
                <span className="mono text-emerald-600 shrink-0">✓</span>
                <span className="opacity-70 leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {usage.advisory.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-1">
              Advisory — your judgement
            </div>
            <ul className="flex flex-col gap-0.5">
              {usage.advisory.map((item) => (
                <li key={item.description} className="flex gap-1.5">
                  <span className="mono text-amber-600 shrink-0">!</span>
                  <span className="opacity-70 leading-snug">
                    {item.description}
                    <span className="opacity-50"> · owned by the {item.owner}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {usage.restricted.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-1">
              Not intended
            </div>
            <ul className="flex flex-col gap-0.5">
              {usage.restricted.map((item) => (
                <li key={item} className="flex gap-1.5">
                  <span className="mono text-destructive shrink-0">✗</span>
                  <span className="opacity-70 leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

/**
 * "Generated from" — the technical detail, collapsed by default.
 *
 * The point of showing it is reproducibility: the palette is not an arbitrary
 * static object, it is the deterministic output of a recipe. Generator internals
 * are not the headline; they are one expansion away for the reader who wants them.
 */
export function GeneratedFrom({ entry }: { entry: PresetCatalogEntry }) {
  const rows: Array<[string, string]> = [
    ["Algorithm", entry.algorithm],
    ["Family", entry.family],
    ["Seed", entry.seed],
    ["Style", entry.style],
    ["Temperature", entry.temperature],
    ["Modes", entry.modes.join(" + ")],
    ["Radius", entry.radius],
  ];

  if (entry.provenance) rows.push(["Provenance", entry.provenance]);
  if (entry.brandColor) rows.push(["Brand colour", entry.brandColor]);

  return (
    <details className="group rounded-lg border border-border bg-background/40">
      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none text-[11px]">
        <span className="opacity-60">Generated from</span>
        <span className="opacity-40 transition-transform group-open:rotate-90 ml-auto">›</span>
      </summary>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-3 pb-3 pt-1 border-t border-border text-[11px]">
        {rows.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="opacity-55">{key}</dt>
            <dd className="mono break-all">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="px-3 pb-3 text-[10px] opacity-50 leading-relaxed">
        A recipe is design intent; these tokens are its resolved implementation.
        The same seed and style always produce this palette.
      </p>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Live preview
// ---------------------------------------------------------------------------

/**
 * A compact interface rendered in the preset's own tokens: a primary button, a
 * card, an input and a status badge.
 */
export function PresetMiniPreview({ theme }: { theme: ThemeDefinition | undefined }) {
  const c = colorsOf(theme);
  const v = (key: string, fallback: string) => c[key] ?? fallback;
  if (!theme) return null;

  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-2.5"
      style={{ background: v("background", "#ffffff"), color: v("foreground", "#0f172a") }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="px-2.5 py-1 rounded-md text-[11px] font-semibold"
          style={{
            background: v("primary", "#4f46e5"),
            color: v("primaryForeground", "#ffffff"),
          }}
        >
          Primary
        </span>
        <span
          className="px-2.5 py-1 rounded-md text-[11px] font-semibold"
          style={{
            background: v("secondary", "#e2e8f0"),
            color: v("secondaryForeground", "#0f172a"),
          }}
        >
          Secondary
        </span>
        <span
          className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{
            background: v("destructive", "#ef4444"),
            color: v("destructiveForeground", "#ffffff"),
          }}
        >
          Alert
        </span>
      </div>

      <div
        className="rounded-md p-2.5"
        style={{
          background: v("card", "#ffffff"),
          border: `1px solid ${v("border", "#e2e8f0")}`,
        }}
      >
        <div className="text-[11px] font-semibold">Card title</div>
        <div className="text-[10px] leading-relaxed" style={{ color: v("mutedForeground", "#64748b") }}>
          Muted supporting text on the card surface.
        </div>
      </div>

      <div
        className="rounded-md px-2.5 py-1.5 text-[10px]"
        style={{
          background: v("background", "#ffffff"),
          border: `1px solid ${v("input", "#94a3b8")}`,
          color: v("mutedForeground", "#64748b"),
          boxShadow: `0 0 0 2px ${v("ring", "#6366f1")}33`,
        }}
      >
        Input, focused
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

/**
 * One preset family, as a card.
 *
 * Reads entirely from the catalog entry. "Use preset" applies the family to the
 * documentation site's own runtime, which is the strongest possible
 * demonstration that the preset is real and not a picture of one.
 */
export function PresetCatalogCard({
  entry,
  footer,
}: {
  entry: PresetCatalogEntry;
  footer?: ReactNode;
}) {
  const { theme } = useTheme();
  const setFamily = useSetThemeFamily();
  const appliedMode: "light" | "dark" = theme?.meta?.mode === "dark" ? "dark" : "light";
  const [mode, setMode] = useState<"light" | "dark">(appliedMode);

  const isActive = (theme?.meta?.family ?? "default") === entry.family;
  const previewTheme = entry.themes[mode];

  return (
    <div
      className={`glass-card card-lift p-4 flex flex-col gap-3 min-w-0 ${
        isActive ? "ring-2 ring-ring" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* Deliberately not an <h3>: the docs TOC rail scans `h2, h3`, so a
              heading here would list every card title under "On this page". The
              section heading above the grid is the real heading. */}
          <div className="font-semibold text-sm tracking-tight truncate">{entry.name}</div>
          <PresetCharacter entry={entry} />
        </div>
        {isActive && (
          <span
            className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: "var(--theme-color-primary)",
              color: "var(--theme-color-primaryForeground)",
            }}
          >
            Active
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <PaletteChips theme={previewTheme} />
        <div className="flex gap-1">
          {(["light", "dark"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                mode === value ? "bg-muted text-foreground" : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <PresetMiniPreview theme={previewTheme} />
      <InteractionRoles theme={previewTheme} />
      <QualityPanel quality={entry.quality} />
      <ContrastPanel theme={previewTheme} />
      <RoleUsage role="primary" />

      <button
        type="button"
        onClick={() => setFamily(entry.family)}
        className="w-full px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
        style={{
          background: "var(--theme-color-primary)",
          color: "var(--theme-color-primaryForeground)",
        }}
      >
        {isActive ? "Applied to this site" : "Use preset"}
      </button>

      <GeneratedFrom entry={entry} />

      {footer}
    </div>
  );
}

/** The canonical brand disclaimer, rendered from the exported constant. */
export function BrandDisclaimer() {
  return (
    <p
      className="text-[11px] opacity-55 leading-relaxed rounded-lg border border-border bg-muted/30 px-3 py-2"
      data-testid="brand-disclaimer"
    >
      {BRAND_PRESET_DISCLAIMER}
    </p>
  );
}
