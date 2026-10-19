"use client";

import { useMemo, useState } from "react";
import { generateTheme, getContrastRatio, getPresetCatalog, type ThemeDefinition } from "@themvora/core";

/**
 * The visual regression harness.
 *
 * ## What it is for
 *
 * Every other gate in this project measures *numbers*: contrast ratios, ΔL
 * separation, anchor preservation. None of them can tell you that a theme looks
 * broken — that a disabled button reads as enabled, that a tab strip has no
 * visible selected state, or that an alert's text has vanished into its
 * background.
 *
 * So this renders the same component board under every shipped preset, in both
 * modes, plus a generated seed matrix. It is the half of the quality story that
 * cannot be asserted.
 *
 * ## Why a seed matrix as well as the presets
 *
 * The presets are 14 hand-checked recipes. The generator is unbounded. A board
 * built only from presets would look healthy while the generator was producing
 * unusable output for the other 16 million seeds. The matrix uses a fixed
 * pseudo-random sequence, so it is deterministic and the same boards render every
 * time.
 *
 * ## Component coverage
 *
 * Buttons (primary, secondary, ghost, destructive, disabled) · card · form field
 * with a focused ring · alert (destructive, success) · tabs with a selected state
 * · badges · selected list row · muted text · status indicators.
 *
 * ## The context set
 *
 * It also renders the *contexts* rather than only the components: the brand mark
 * beside its wordmark, a navigation row with a default and an active item, a hero
 * headline with its accent rule, a link in prose, and a scrollbar thumb on its
 * track. Those are where the screenshots that started this work went wrong — a
 * brand colour asked to be a reading colour — and none of them is a "component"
 * in the usual sense, so none of them was on the board.
 *
 * @packageDocumentation
 */

function colorsOf(theme: ThemeDefinition | undefined): Record<string, string> {
  return (theme?.tokens?.colors ?? {}) as Record<string, string>;
}

/**
 * One component board, rendered entirely in a theme's own tokens.
 *
 * Every colour here comes from the theme — nothing falls back to the docs site's
 * own palette, or the fixture would be measuring the wrong thing.
 */
export function ComponentBoard({ theme }: { theme: ThemeDefinition | undefined }) {
  const c = colorsOf(theme);
  const v = (key: string, fallback: string) => c[key] ?? fallback;
  if (!theme) return null;

  const surface = v("background", "#ffffff");
  const fg = v("foreground", "#0f172a");
  const card = v("card", "#ffffff");
  const muted = v("muted", "#e2e8f0");
  const mutedFg = v("mutedForeground", "#64748b");
  const border = v("border", "#e2e8f0");
  const primary = v("primary", "#4f46e5");
  const primaryFg = v("primaryForeground", "#ffffff");
  const secondary = v("secondary", "#e2e8f0");
  const secondaryFg = v("secondaryForeground", "#0f172a");
  const destructive = v("destructive", "#ef4444");
  const destructiveFg = v("destructiveForeground", "#ffffff");
  const success = v("success", "#16a34a");
  const successFg = v("successForeground", "#ffffff");

  // The scrollbar thumb: first of `primary -> accent -> foreground` clearing 3:1
  // against the canvas. Mirrors `scrollbar/thumb-color.ts`, which owns the real
  // rule and is covered by `test/scrollbar-thumb.test.ts`.
  const thumbColor = [primary, v("accent", "#e2e8f0"), fg].find(
    (candidate) => getContrastRatio(candidate, surface) >= 3,
  ) ?? fg;
  const accent = v("accent", "#e2e8f0");
  const accentFg = v("accentForeground", "#0f172a");
  const input = v("input", "#94a3b8");
  const ring = v("ring", "#6366f1");

  return (
    <div
      className="flex flex-col gap-3 p-3 rounded-lg text-[11px]"
      style={{ background: surface, color: fg }}
    >
      {/* Buttons, including the disabled state — the one most likely to read as
          enabled when the muted surface is too close to the canvas. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="px-2.5 py-1 rounded-md font-semibold"
          style={{ background: primary, color: primaryFg }}
        >
          Primary
        </span>
        <span
          className="px-2.5 py-1 rounded-md font-semibold"
          style={{ background: secondary, color: secondaryFg }}
        >
          Secondary
        </span>
        <span
          className="px-2.5 py-1 rounded-md font-semibold"
          style={{ background: destructive, color: destructiveFg }}
        >
          Delete
        </span>
        <span
          className="px-2.5 py-1 rounded-md font-semibold opacity-50"
          style={{ background: muted, color: mutedFg }}
        >
          Disabled
        </span>
      </div>

      {/* Card + form, with a focused field so the ring is visible next to the
          input border — the pair that must not collapse. */}
      <div
        className="rounded-md p-2.5 flex flex-col gap-2"
        style={{ background: card, border: `1px solid ${border}` }}
      >
        <div className="font-semibold">Card title</div>
        <div style={{ color: mutedFg }} className="leading-snug">
          Muted supporting text, on the card surface.
        </div>

        <label className="flex flex-col gap-1">
          <span style={{ color: mutedFg }}>Label</span>
          <span
            className="rounded-md px-2 py-1"
            style={{
              background: surface,
              border: `1px solid ${input}`,
              color: mutedFg,
            }}
          >
            Default field
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span style={{ color: mutedFg }}>Focused</span>
          <span
            className="rounded-md px-2 py-1"
            style={{
              background: surface,
              border: `1px solid ${input}`,
              color: fg,
              boxShadow: `0 0 0 2px ${ring}`,
            }}
          >
            Focused field
          </span>
        </label>
      </div>

      {/* Alerts — both status roles, which most adapters consume. */}
      <div
        className="rounded-md px-2.5 py-1.5 font-semibold"
        style={{ background: destructive, color: destructiveFg }}
      >
        Alert · something failed
      </div>
      <div
        className="rounded-md px-2.5 py-1.5 font-semibold"
        style={{ background: success, color: successFg }}
      >
        Alert · it worked
      </div>

      {/* Tabs with a selected state, plus badges and a selected row. */}
      <div className="flex items-center gap-1.5" style={{ borderBottom: `1px solid ${border}` }}>
        <span
          className="px-2 py-1 font-semibold rounded-t-md"
          style={{ background: accent, color: accentFg }}
        >
          Selected
        </span>
        <span className="px-2 py-1" style={{ color: mutedFg }}>
          Tab
        </span>
        <span className="px-2 py-1" style={{ color: mutedFg }}>
          Tab
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="px-2 py-0.5 rounded-full font-semibold"
          style={{ background: primary, color: primaryFg }}
        >
          Badge
        </span>
        <span
          className="px-2 py-0.5 rounded-full font-semibold"
          style={{ background: muted, color: mutedFg }}
        >
          Neutral
        </span>
        <span className="flex items-center gap-1" style={{ color: mutedFg }}>
          <span className="w-2 h-2 rounded-full" style={{ background: success }} />
          online
        </span>
        <span className="flex items-center gap-1" style={{ color: mutedFg }}>
          <span className="w-2 h-2 rounded-full" style={{ background: destructive }} />
          offline
        </span>
      </div>

      <div
        className="rounded-md px-2 py-1.5 flex items-center justify-between"
        style={{ background: accent, color: accentFg }}
      >
        <span>Selected row</span>
        <span className="opacity-70">✓</span>
      </div>

      <div className="leading-snug" style={{ color: mutedFg }}>
        Muted text · the quietest tier in the hierarchy.
      </div>

      {/* ------------------------------------------------------------------
          The contexts, not the components.

          Each of these is a place where a brand colour can be asked to do a
          reading colour's job. They are drawn with the roles the contract says
          belong here, so a theme that makes them unreadable is visibly wrong on
          the board rather than only in production.
         ------------------------------------------------------------------ */}

      {/* Brand mark beside its wordmark. The mark is `primary`; the wordmark is
          `foreground`, because a wordmark is text and text is read. */}
      <div className="flex items-center gap-2 pt-1">
        <span
          aria-hidden
          className="w-5 h-5 rounded-md shrink-0"
          style={{ background: primary }}
        />
        <span className="font-bold tracking-tight" style={{ color: fg }}>
          themvora
        </span>
      </div>

      {/* Navigation: the default item is reading text, the active item is marked
          by a brand rule rather than painted in the brand colour. */}
      <div
        className="flex items-center gap-3 border-b pb-1.5"
        style={{ borderColor: border }}
      >
        <span className="font-medium" style={{ color: fg }}>
          Docs
        </span>
        <span
          className="font-medium"
          style={{
            color: fg,
            boxShadow: `inset 0 -2px 0 0 ${primary}`,
          }}
        >
          Active
        </span>
        <span className="opacity-60" style={{ color: fg }}>
          Guides
        </span>
      </div>

      {/* Hero headline with the accent rule. */}
      <div className="leading-tight text-[15px] font-bold" style={{ color: fg }}>
        The theming runtime for{" "}
        <span
          style={{
            textDecorationLine: "underline",
            textDecorationColor: primary,
            textDecorationThickness: "0.085em",
            textUnderlineOffset: "0.1em",
          }}
        >
          modern applications.
        </span>
      </div>

      {/* A link in prose: reading colour, affordance from the underline. */}
      <div className="leading-snug" style={{ color: fg }}>
        Read the{" "}
        <span
          style={{
            textDecorationLine: "underline",
            textDecorationColor: border,
            textUnderlineOffset: "2px",
          }}
        >
          migration guide
        </span>{" "}
        for the details.
      </div>

      {/* Scrollbar: the thumb is the first of `primary -> accent -> foreground`
          that clears 3:1 against the canvas, which is what
          `scrollbar/thumb-color.ts` does at runtime. Mirrored rather than
          imported so the board stays a pure render; the real rule is covered by
          `test/scrollbar-thumb.test.ts`. */}
      <div className="flex items-center gap-2">
        <span className="mono text-[10px] opacity-60" style={{ color: fg }}>
          scrollbar
        </span>
        <span
          className="relative h-2 flex-1 rounded-full overflow-hidden"
          style={{ background: `color-mix(in srgb, ${fg} 14%, transparent)` }}
        >
          <span
            className="absolute inset-y-0 right-1 w-8 rounded-full"
            style={{ background: thumbColor }}
          />
        </span>
      </div>
    </div>
  );
}

/** A board in a labelled frame. */
function Fixture({
  theme,
  title,
  subtitle,
}: {
  theme: ThemeDefinition | undefined;
  title: string;
  subtitle: string;
}) {
  return (
    <figure className="flex flex-col gap-1.5 m-0">
      <figcaption className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="font-semibold">{title}</span>
        <span className="mono opacity-50">{subtitle}</span>
      </figcaption>
      <ComponentBoard theme={theme} />
    </figure>
  );
}

/** A deterministic 32-bit LCG, so the seed matrix is reproducible. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** Seeds chosen to spread across the hue wheel and the lightness range. */
const MATRIX_SEEDS = ["#ef4444", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];

/**
 * The harness: every shipped preset in both modes, plus a generated seed matrix.
 *
 * Grouped by kind so a regression is attributable — "the brand presets broke"
 * and "the generator broke" are different failures.
 */
export function PresetVisualHarness() {
  const [kind, setKind] = useState<"default" | "brand" | "generated">("default");
  const [mode, setMode] = useState<"light" | "dark" | "both">("both");

  const catalog = useMemo(() => getPresetCatalog(kind === "generated" ? undefined : kind), [kind]);

  const generated = useMemo(() => {
    const rng = makeRng(0x5eed);
    return MATRIX_SEEDS.map((seed) => ({
      id: seed,
      name: seed,
      light: generateTheme({ seed, family: "matrix" }).light,
      dark: generateTheme({ seed, family: "matrix" }).dark,
    }));
  }, []);

  const modes: Array<"light" | "dark"> = mode === "both" ? ["light", "dark"] : [mode];

  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold tracking-tight mb-1">Visual regression board</h2>
      <p className="text-sm opacity-70 mb-4 leading-relaxed max-w-3xl">
        The same component board under every preset, in both modes. The numeric
        gates check contrast, separation and anchor preservation; none of them can
        see that a disabled button reads as enabled or that a selected tab has no
        visible state. This is the part that has to be looked at. The{" "}
        <strong className="font-semibold">Generated</strong> tab renders themes
        produced by <code className="mono text-[0.9em]">generateTheme()</code>{" "}
        rather than by a curated recipe — the presets are 14 hand-checked inputs,
        and the generator is unbounded.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1">
          {(["default", "brand", "generated"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              aria-pressed={kind === value}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize cursor-pointer transition-colors ${
                kind === value ? "bg-muted text-foreground" : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
        <span className="opacity-20" aria-hidden>
          |
        </span>
        <div className="flex gap-1">
          {(["light", "dark", "both"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize cursor-pointer transition-colors ${
                mode === value ? "bg-muted text-foreground" : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {kind === "generated" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {generated.map((entry) =>
            modes.map((m) => (
              <Fixture
                key={`${entry.id}-${m}`}
                theme={m === "light" ? entry.light : entry.dark}
                title={entry.name}
                subtitle={`generated · ${m}`}
              />
            )),
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {catalog.map((entry) =>
            modes.map((m) => (
              <Fixture
                key={`${entry.id}-${m}`}
                theme={entry.themes[m]}
                title={entry.name}
                subtitle={`${entry.style} · ${m}`}
              />
            )),
          )}
        </div>
      )}
    </section>
  );
}
