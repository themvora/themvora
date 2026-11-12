"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  colorName,
  generateTheme,
  themeToCSSVariables,
  type GeneratedThemePair,
  type GenerationStyle,
} from "@themvora/core";
import { useThemeRuntime } from "@themvora/next/client";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { CopyButton } from "../ui/copy-button";
import { Button } from "../ui/button";
import { ClientPre } from "../ui/client-pre";

/* -------------------------------------------------------------------------- */
/*  Data                                                                      */
/* -------------------------------------------------------------------------- */

const GENERATION_STYLES: {
  value: GenerationStyle;
  label: string;
  hint: string;
}[] = [
  { value: "balanced", label: "Balanced", hint: "The default ramp" },
  { value: "soft", label: "Soft", hint: "Gentle, low contrast" },
  { value: "vibrant", label: "Vibrant", hint: "Saturated, punchy" },
  { value: "editorial", label: "Editorial", hint: "Quiet, typographic" },
  { value: "minimal", label: "Minimal", hint: "Near-neutral surfaces" },
  { value: "brand", label: "Brand", hint: "Seed colour everywhere" },
];

const STYLE_VALUES = GENERATION_STYLES.map((s) => s.value);

const PRESETS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#14b8a6",
];

const DEFAULT_SEED = "#6366f1";

/**
 * `generateTheme()` recipes.
 *
 * Every example here was checked against the shipped function rather than
 * written from the type signature: the accepted seed formats, the six style
 * names, the nineteen `tokens.code` entries and the generated names all come
 * from running it. A docs page about an API is the worst place for a plausible
 * guess.
 *
 * The list is data rather than markup so adding one is a single entry.
 */
const GENERATE_RECIPES: readonly {
  title: string;
  blurb: string;
  code: string;
}[] = [
  {
    title: "The minimum",
    blurb:
      'One required option. Family defaults to "generated", so the pair is named generated-light and generated-dark.',
    code: `import { generateTheme } from "@themvora/core";

const { light, dark } = generateTheme({ seed: "#6366f1" });

light.name; // "generated-light"
light.meta.family; // "generated"`,
  },
  {
    title: "Naming the family",
    blurb:
      "The family is what the runtime selects on, so name it something your app can refer to.",
    code: `const { light, dark } = generateTheme({
  seed: "#6366f1",
  family: "ocean",
});

light.name; // "ocean-light"
dark.name;  // "ocean-dark"`,
  },
  {
    title: "Choosing a visual language",
    blurb:
      "Six styles share one generator — they differ in how the ramp is shaped, not in which colours are derived. balanced is the default.",
    code: `const { light, dark } = generateTheme({
  seed: "#6366f1",
  family: "ocean",
  style: "editorial",
  // "balanced" | "soft" | "vibrant" | "editorial" | "minimal" | "brand"
});`,
  },
  {
    title: "Including the syntax palette",
    blurb:
      "Opt in to a code-token block: nineteen syntax roles derived from the same seed, so highlighted code belongs to the theme rather than fighting it.",
    code: `const { light, dark } = generateTheme({
  seed: "#6366f1",
  family: "ocean",
  withCode: true,
});

Object.keys(light.tokens.code).length; // 19`,
  },
  {
    title: "Any parseable seed",
    blurb:
      "Hex is the common case, but rgb() and hsl() are accepted too — useful when the seed comes from a picker or a design token. Named colours are not.",
    code: `generateTheme({ seed: "#6366f1" });
generateTheme({ seed: "rgb(99 102 241)" });
generateTheme({ seed: "hsl(239 84% 67%)" });

// An unparseable seed throws rather than silently falling back:
generateTheme({ seed: "rebeccapurple" });
// ColorError: generateTheme() received an invalid seed "rebeccapurple".`,
  },
  {
    title: "Light and dark are independent",
    blurb:
      "Both modes are solved from the same identity, but neither is a filter over the other — a dark theme is not its light theme inverted.",
    code: `const { light, dark } = generateTheme({ seed: "#6366f1" });

light.tokens.colors.primary; // "#5d5fea"
dark.tokens.colors.primary;  // "#808aff"

// Both clear the same contrast contract against their own canvas.`,
  },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

type TokenColors = Record<string, string>;
type Theme = GeneratedThemePair["light"];
type Mode = "light" | "dark";

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

const glassCard = cn(
  "rounded-2xl border border-border/50 bg-background/60",
  "backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-white/5",
);

const fieldBase = cn(
  "rounded-xl border-2 bg-muted px-3 py-2.5 font-mono text-sm",
  "outline-none transition-colors motion-reduce:transition-none",
);
const fieldOk =
  "border-border focus:border-primary focus:ring-2 focus:ring-primary/20";
const fieldBad =
  "border-red-500/60 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function colorsOf(theme: Theme | undefined): TokenColors {
  const raw = (theme?.tokens?.colors ?? {}) as unknown as Record<
    string,
    unknown
  >;
  const out: TokenColors = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function codeOf(theme: Theme | undefined): TokenColors {
  const tokens = theme?.tokens as unknown as
    { code?: Record<string, unknown> } | undefined;
  const raw: Record<string, unknown> = tokens?.code ?? {};
  const out: TokenColors = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/** "brand-blue" → "brandBlue": a valid JS/TS identifier stem. */
function sanitizeName(value: string): string {
  const cleaned = value
    .replace(/[-.\s_]+(.)?/g, (_, c: string | undefined) =>
      c ? c.toUpperCase() : "",
    )
    .replace(/[^a-zA-Z0-9$]/g, "")
    .replace(/^([0-9])/, "_$1");
  return cleaned || "theme";
}

/**
 * Reduce a family name to the token the runtime and the generated code carry.
 *
 * The family is not a label: it becomes `meta.family`, the exported
 * `family: "…"` field, and the stem of the generated identifiers. Typing
 * `purple=pink` produced `family: "purple=pink"` in the export while the
 * identifiers beside it read `purplepinkLight` — the export contradicted
 * itself. Normalising on input keeps one value and one spelling.
 */
function normalizeFamily(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "");
}

/**
 * A readable family name for a seed.
 *
 * The family is not an internal label: it is shown in the form, written into the
 * exported `family: "…"` field, and used as the stem of the generated
 * identifiers (`indigoLight`, `indigoDark`). `custom-6366f1` put a hyphen and
 * six digits into all three.
 *
 * Naming a colour needs colour math, and that belongs to the engine's colour
 * module — an architecture guard fails the build when it appears anywhere else.
 * `colorName()` is the engine's own answer, so the studio stays free of it and
 * the two can never disagree about what "indigo" means.
 */
function deriveFamily(seed: string): string {
  return colorName(seed) ?? "custom";
}

function randomSeed(): string {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`;
}

function download(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const t = timer;
    return () => clearTimeout(t.current);
  }, []);

  const copy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedKey(null), 1400);
    } catch {
      /* clipboard unavailable (insecure context / denied): nothing to do */
    }
  }, []);

  return { copiedKey, copy };
}

/* -------------------------------------------------------------------------- */
/*  Small UI pieces                                                           */
/* -------------------------------------------------------------------------- */

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-xl border border-border bg-muted p-0.5"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "cursor-pointer rounded-[10px] px-3 py-1.5 text-xs font-semibold",
              "transition-colors motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-background shadow-sm"
                : "opacity-60 hover:opacity-100",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionLabel({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <span className="mb-2 flex items-baseline justify-between gap-2">
      <span className="text-sm font-semibold">{children}</span>
      {aside && <span className="text-xs opacity-50">{aside}</span>}
    </span>
  );
}

/**
 * Native button for the few controls that need `disabled`, `aria-label` or
 * `title`, so none of them depend on what the shared `Button` forwards.
 */
function IconButton({
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border px-2.5 py-2 text-xs font-semibold",
        "transition-colors motion-reduce:transition-none hover:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Scoped preview                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Syntax sample. Each token names a role; if the generated `code` group has a
 * key with that name it is used, otherwise the role falls back to a stable
 * position in the palette so the sample always renders with the theme's own
 * colours.
 */
const SAMPLE_LINES: [role: string, text: string, fallback: number][][] = [
  [["comment", "// one seed, two themes", 0]],
  [
    ["keyword", "import", 1],
    ["punctuation", " { ", 2],
    ["function", "generateTheme", 3],
    ["punctuation", " } ", 2],
    ["keyword", "from", 1],
    ["string", ' "@themvora/core"', 4],
  ],
  [
    ["keyword", "const", 1],
    ["variable", " pair", 5],
    ["punctuation", " = ", 2],
    ["function", "generateTheme", 3],
    ["punctuation", "({ seed: ", 2],
    ["string", '"#6366f1"', 4],
    ["punctuation", ", ", 2],
    ["number", "withCode", 6],
    ["punctuation", " });", 2],
  ],
];

function SyntaxSample({
  code,
  background,
  fallbackText,
}: {
  code: TokenColors;
  // `| undefined` is explicit because token lookups are `string | undefined`
  // under `noUncheckedIndexedAccess`: the caller legitimately has "no value for
  // this role", and `exactOptionalPropertyTypes` treats that as different from
  // "property omitted". Both mean the same thing to the `<pre>` below.
  background?: string | undefined;
  fallbackText?: string | undefined;
}) {
  const values = Object.values(code);
  if (values.length === 0) return null;
  const colorFor = (role: string, i: number) =>
    code[role] ?? values[i % values.length] ?? fallbackText;

  return (
    <pre
      className="overflow-x-auto rounded-lg p-3 font-mono text-[11px] leading-relaxed"
      style={{ background, color: fallbackText }}
    >
      {SAMPLE_LINES.map((line, li) => (
        <div key={li}>
          {line.map(([role, text, fb], ti) => (
            <span key={ti} style={{ color: colorFor(role, fb) }}>
              {text}
            </span>
          ))}
        </div>
      ))}
    </pre>
  );
}

/**
 * A self-contained mini interface painted only from the theme's own tokens.
 * It reads `tokens.colors` directly rather than relying on the page's CSS
 * variables, so both modes render side by side regardless of which one the
 * site is currently in.
 */
function ThemePreview({
  theme,
  mode,
  isApplied,
  onApply,
}: {
  theme: Theme;
  mode: Mode;
  isApplied: boolean;
  onApply: () => void;
}) {
  const c = colorsOf(theme);
  const code = codeOf(theme);
  const pick = (...keys: string[]) => keys.map((k) => c[k]).find(Boolean);

  const bg = pick("background");
  const fg = pick("foreground");
  const card = pick("card", "background");
  const cardFg = pick("cardForeground", "foreground");
  const primary = pick("primary");
  const primaryFg = pick("primaryForeground", "background");
  const secondary = pick("secondary", "muted");
  const secondaryFg = pick("secondaryForeground", "foreground");
  const accent = pick("accent", "secondary");
  const accentFg = pick("accentForeground", "foreground");
  const muted = pick("muted", "secondary");
  const mutedFg = pick("mutedForeground", "foreground");
  const border = pick("border");
  const input = pick("input", "border");
  const ring = pick("ring", "primary");
  const success = pick("success", "primary");
  const destructive = pick("destructive");
  const destructiveFg = pick("destructiveForeground", "background");

  return (
    <article
      aria-label={`${mode} theme preview`}
      className="min-w-0 overflow-hidden rounded-2xl border"
      style={{ background: bg, color: fg, borderColor: border }}
    >
      {/* Top bar */}
      <header
        className="flex items-center justify-between gap-3 border-b px-4 py-3"
        style={{ background: card, color: cardFg, borderColor: border }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold"
            style={{ background: primary, color: primaryFg }}
          >
            A
          </span>
          <span className="truncate text-sm font-semibold capitalize">
            {theme.meta?.label ?? `${mode} theme`}
          </span>
        </div>
        <span
          className="shrink-0 font-mono text-[11px]"
          style={{ color: mutedFg }}
        >
          {theme.name}
        </span>
      </header>

      <div className="grid gap-4 p-4">
        {/* Card with copy + buttons */}
        <section
          className="rounded-xl border p-4"
          style={{ background: card, color: cardFg, borderColor: border }}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Weekly report</h3>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: accent, color: accentFg }}
            >
              New
            </span>
          </div>
          <p
            className="mb-3 text-xs leading-relaxed"
            style={{ color: mutedFg }}
          >
            Secondary text sits on the muted ramp and still has to stay readable
            on the card.
          </p>

          <div
            className="mb-3 rounded-lg border-2 px-3 py-2 text-xs"
            style={{
              background: bg,
              borderColor: ring,
              color: fg,
              boxShadow: ring ? `0 0 0 3px ${ring}33` : undefined,
            }}
          >
            Focused input
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ background: primary, color: primaryFg }}
            >
              Primary
            </span>
            <span
              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ background: secondary, color: secondaryFg }}
            >
              Secondary
            </span>
            <span
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: input, color: fg }}
            >
              Outline
            </span>
            <span
              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ background: destructive, color: destructiveFg }}
            >
              Delete
            </span>
          </div>
        </section>

        {/* Success alert + muted strip */}
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs"
          style={{ borderColor: success, color: fg }}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: success }}
          />
          Changes saved to the live runtime.
        </div>
        <div
          className="rounded-xl px-3 py-2.5 text-xs"
          style={{ background: muted, color: mutedFg }}
        >
          Muted surface
        </div>

        {Object.keys(code).length > 0 && (
          <SyntaxSample code={code} background={muted} fallbackText={fg} />
        )}

        <button
          type="button"
          onClick={onApply}
          className={cn(
            "w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold",
            "transition-all motion-reduce:transition-none",
            "hover:brightness-110 active:translate-y-px",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          style={{ background: primary, color: primaryFg }}
        >
          {isApplied ? `Applied · ${mode}` : `Apply ${mode} to this site`}
        </button>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*  Palette                                                                   */
/* -------------------------------------------------------------------------- */

const COLOR_GROUPS: { id: string; label: string; test: RegExp }[] = [
  {
    id: "surfaces",
    label: "Surfaces",
    test: /^(background|foreground|card|popover)/i,
  },
  { id: "brand", label: "Brand", test: /^(primary|secondary|accent)/i },
  { id: "neutral", label: "Neutral", test: /^muted/i },
  {
    id: "feedback",
    label: "Feedback",
    test: /^(success|warning|info|destructive|danger|error)/i,
  },
  { id: "lines", label: "Borders and focus", test: /^(border|input|ring)/i },
];

function Swatch({
  name,
  value,
  copied,
  onCopy,
}: {
  name: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title={`Copy ${value}`}
      className={cn(
        "group min-w-0 cursor-pointer text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg",
      )}
    >
      <span
        className="block h-12 rounded-lg border-2 border-border transition-transform group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        style={{ background: value }}
      />
      <span className="mt-1 block truncate text-[11px] font-medium">
        {name}
      </span>
      <span className="block truncate font-mono text-[10px] opacity-60">
        {copied ? "Copied" : value}
      </span>
    </button>
  );
}

function PalettePanel({
  pair,
  copiedKey,
  copy,
}: {
  pair: GeneratedThemePair;
  copiedKey: string | null;
  copy: (text: string, id: string) => void | Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>("light");
  const theme = pair[mode];
  const colors = useMemo(() => colorsOf(theme), [theme]);
  const code = useMemo(() => codeOf(theme), [theme]);

  // Entries rather than keys: the value is read exactly once, here, where its
  // type is `string`. Re-indexing `colors[key]` during render would yield
  // `string | undefined` under `noUncheckedIndexedAccess` and force a guard for
  // a case that cannot happen — the key came from `Object.keys(colors)`.
  const groups = useMemo(() => {
    const entries = Object.entries(colors);
    const rest = new Set(Object.keys(colors));
    const result = COLOR_GROUPS.map((g) => {
      const matched = entries.filter(([name]) => g.test.test(name));
      for (const [name] of matched) rest.delete(name);
      return { id: g.id, label: g.label, entries: matched };
    }).filter((g) => g.entries.length > 0);
    if (rest.size > 0) {
      result.push({
        id: "other",
        label: "Other",
        entries: entries.filter(([name]) => rest.has(name)),
      });
    }
    return result;
  }, [colors]);

  const codeEntries = Object.entries(code);

  return (
    <section className={cn(glassCard, "p-4 sm:p-5")} aria-label="Palette">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Palette</h2>
          <p className="text-xs opacity-60">
            Click a swatch to copy its value.
          </p>
        </div>
        <Segmented
          label="Palette mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </div>

      <div className="grid gap-5">
        {groups.map((g) => (
          <div key={g.id}>
            <div className="mb-2 text-xs font-semibold opacity-70">
              {g.label}
            </div>
            <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 xl:grid-cols-6">
              {g.entries.map(([name, value]) => (
                <Swatch
                  key={name}
                  name={name}
                  value={value}
                  copied={copiedKey === `${mode}:${name}`}
                  onCopy={() => void copy(value, `${mode}:${name}`)}
                />
              ))}
            </div>
          </div>
        ))}

        {codeEntries.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold opacity-70">
              Syntax ({codeEntries.length})
            </div>
            <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 xl:grid-cols-6">
              {codeEntries.map(([name, value]) => (
                <Swatch
                  key={name}
                  name={name}
                  value={value}
                  copied={copiedKey === `${mode}:code:${name}`}
                  onCopy={() => void copy(value, `${mode}:code:${name}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Studio                                                                    */
/* -------------------------------------------------------------------------- */

type ExportTab = "ts" | "json" | "css";

/**
 * Tab order, left to right.
 *
 * Kept apart from the tab content so the active tab can be looked up in a
 * `Record` — a total map — instead of an array index, which is `… | undefined`
 * under `noUncheckedIndexedAccess` and would turn every read of the selected
 * export into a possible-missing check.
 */
const EXPORT_TAB_ORDER: readonly ExportTab[] = ["ts", "json", "css"];
type CssView = "both" | "light" | "dark";
type PreviewMode = "split" | Mode;

export function ThemeStudio({ compact = false }: { compact?: boolean }) {
  const runtime = useThemeRuntime();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { copiedKey, copy } = useCopy();

  /* ---- State, seeded from the URL (full page only) ---------------------- */

  // Read once on mount; later changes are written out, not read back in.
  const [initial] = useState(() => {
    if (compact) return null;
    const sp = searchParams ?? new URLSearchParams();
    const s = sp.get("seed");
    const f = sp.get("family");
    const st = sp.get("style") as GenerationStyle | null;
    const nextStyle: GenerationStyle =
      st && STYLE_VALUES.includes(st) ? st : "balanced";
    return {
      seed: s || DEFAULT_SEED,
      // Same normalisation as the input handler: a URL is an untrusted entry
      // point (edited, shared, bookmarked), and `?family=purple%3Dpink` used to
      // reach the export verbatim.
      family: normalizeFamily(f ?? ""),
      style: nextStyle,
      withCode: sp.get("code") === "1",
    };
  });

  const [seed, setSeed] = useState(initial?.seed ?? DEFAULT_SEED);
  const [familyInput, setFamilyInput] = useState(initial?.family ?? "");
  const [familyTouched, setFamilyTouched] = useState(Boolean(initial?.family));
  const [style, setStyle] = useState<GenerationStyle>(
    initial?.style ?? "balanced",
  );
  const [withCode, setWithCode] = useState(initial?.withCode ?? false);

  const [previewMode, setPreviewMode] = useState<PreviewMode>("split");
  const [exportTab, setExportTab] = useState<ExportTab>("ts");
  const [cssView, setCssView] = useState<CssView>("both");
  const [applied, setApplied] = useState<string | null>(null);
  const [appliedMode, setAppliedMode] = useState<Mode | null>(null);

  /** Snapshot of whatever theme state the site had when the studio opened. */
  const [original] = useState(() => runtime.store.get());

  const seedInputId = useId();
  const familyInputId = useId();
  const isOnPlayground = pathname === "/playground";

  /* ---- Derived values --------------------------------------------------- */

  // Dragging the native colour picker fires per pixel; defer the heavy work.
  const deferredSeed = useDeferredValue(seed).trim();

  const derivedFamily = deriveFamily(deferredSeed);
  const family = familyTouched
    ? familyInput.trim() || derivedFamily
    : derivedFamily;

  const generated = useMemo(() => {
    try {
      const pair = generateTheme({
        seed: deferredSeed,
        family,
        style,
        withCode,
      });
      return { pair, error: null as string | null };
    } catch (err) {
      return {
        pair: null as GeneratedThemePair | null,
        error: err instanceof Error ? err.message : "Invalid seed",
      };
    }
  }, [deferredSeed, family, style, withCode]);

  const pair = generated.pair;
  const seedError = generated.error;

  /*
    The pair that gets applied to this site.

    Generated with `withCode` forced on, whatever the export toggle says: the
    preview paints the docs site, whose code pane needs a syntax palette the
    theme actually owns. When the toggle is already on, that is just `pair`.
    The toggle keeps governing the exported definition.
  */
  const appliedPair = useMemo<GeneratedThemePair | null>(() => {
    if (!pair) return null;
    if (withCode) return pair;
    try {
      return generateTheme({
        seed: deferredSeed,
        family,
        style,
        withCode: true,
      });
    } catch {
      return null;
    }
  }, [pair, withCode, deferredSeed, family, style]);

  /** One small generation per style so the picker shows what each one does. */
  const stylePreviews = useMemo(() => {
    const map = new Map<GenerationStyle, TokenColors>();
    if (!pair) return map;
    for (const s of GENERATION_STYLES) {
      try {
        const g = generateTheme({
          seed: deferredSeed,
          family: "preview",
          style: s.value,
        });
        map.set(s.value, colorsOf(g.light));
      } catch {
        /* skip: the seed was valid a moment ago, so this is unreachable in practice */
      }
    }
    return map;
  }, [pair, deferredSeed]);

  /** Presets as light/dark halves. Seeds are constants, so this runs once. */
  const presetPreviews = useMemo(
    () =>
      PRESETS.map((p) => {
        try {
          const g = generateTheme({ seed: p, family: "preset" });
          return {
            seed: p,
            light: colorsOf(g.light).primary ?? p,
            dark: colorsOf(g.dark).primary ?? p,
          };
        } catch {
          return { seed: p, light: p, dark: p };
        }
      }),
    [],
  );

  /* ---- Outputs ---------------------------------------------------------- */

  const baseName = sanitizeName(pair?.light.meta?.family || family);

  const cssBlocks = useMemo(() => {
    if (!pair) return { light: "", dark: "" };
    const block = (label: string, selector: string, theme: Theme) => {
      const vars = themeToCSSVariables(theme);
      const body = Object.entries(vars)
        .map(([name, value]) => `  ${name}: ${value};`)
        .join("\n");
      return `/* ${label} */\n${selector} {\n${body}\n}`;
    };
    return {
      light: block("Light theme", ":root", pair.light),
      dark: block("Dark theme", ".dark", pair.dark),
    };
  }, [pair]);

  const css =
    cssView === "light"
      ? cssBlocks.light
      : cssView === "dark"
        ? cssBlocks.dark
        : `${cssBlocks.light}\n\n${cssBlocks.dark}`;

  const json = useMemo(() => JSON.stringify(pair ?? null, null, 2), [pair]);

  const tsCode = useMemo(() => {
    if (!pair) return "";
    /*
      `generateTheme`, not `defineTheme`: one seed produces the complete light
      and dark pair, every colour derived. Pasting the output back in as
      authored input would tell the reader the wrong story about the API.
    */
    const options = [
      `  seed: ${JSON.stringify(deferredSeed)},`,
      `  family: ${JSON.stringify(family)},`,
      ...(style !== "balanced" ? [`  style: ${JSON.stringify(style)},`] : []),
      ...(withCode ? [`  withCode: true,`] : []),
    ].join("\n");

    return `import { generateTheme } from "@themvora/core";

/**
 * One seed, two themes. Every colour below is derived — secondary, muted,
 * accent, card, popover, input, border and ring included. Nothing is authored,
 * so nothing drifts out of contrast with anything else.
 */
export const { light: ${baseName}Light, dark: ${baseName}Dark } = generateTheme({
${options}
});

// Hand the pair straight to the provider:
export const themes = [${baseName}Light, ${baseName}Dark];
`;
  }, [pair, deferredSeed, family, style, withCode, baseName]);

  // One entry per tab, keyed by the tab id, so the selected export is a direct
  // lookup rather than a search with an array fallback — that fallback is
  // `undefined` to the type system, and every read of the active export would
  // have to re-establish something the `Record` already guarantees.
  const exportContent: Record<
    ExportTab,
    {
      label: string;
      text: string;
      lang: "typescript" | "json" | "css";
      file: string;
      mime: string;
    }
  > = {
    ts: {
      label: "TypeScript",
      text: tsCode,
      lang: "typescript",
      file: `${baseName}.ts`,
      mime: "text/typescript",
    },
    json: {
      label: "JSON",
      text: json,
      lang: "json",
      file: `${baseName}.json`,
      mime: "application/json",
    },
    css: {
      label: "CSS variables",
      text: css,
      lang: "css",
      file: `${baseName}.css`,
      mime: "text/css",
    },
  };
  const exportTabs = EXPORT_TAB_ORDER.map((id) => ({
    id,
    label: exportContent[id].label,
  }));
  const activeExport = exportContent[exportTab];

  /* ---- URL sync (full page only) ---------------------------------------- */

  useEffect(() => {
    if (compact || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("seed", deferredSeed);
    if (familyTouched && familyInput.trim())
      params.set("family", familyInput.trim());
    else params.delete("family");
    if (style !== "balanced") params.set("style", style);
    else params.delete("style");
    if (withCode) params.set("code", "1");
    else params.delete("code");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }, [
    compact,
    pathname,
    deferredSeed,
    familyTouched,
    familyInput,
    style,
    withCode,
  ]);

  /* ---- Runtime: apply / reset ------------------------------------------- */

  /**
   * Paint this site with one half of the generated pair.
   *
   * The theme is applied whole, not patched: `runtime.update()` would merge
   * into the active theme's tokens and keep the docs site's curated `code`
   * block, so every surface would re-theme and the code pane would not. The
   * applied pair is always generated with `withCode` on so the code pane is
   * painted by the same token group as everything else.
   */
  function apply(kind: Mode) {
    if (!appliedPair) return;
    const theme = appliedPair[kind];
    if (!theme.tokens) return;
    runtime.store.set(
      { ...runtime.store.get(), tokens: theme.tokens },
      { force: true },
    );
    setApplied(`${family}-${kind}`);
    setAppliedMode(kind);
  }

  function reset() {
    runtime.store.set(original, { force: true });
    setApplied(null);
    setAppliedMode(null);
  }

  /* ---- Seed / family handlers ------------------------------------------- */

  const pickerValue = HEX_RE.test(seed.trim()) ? seed.trim() : DEFAULT_SEED;

  /* ---------------------------------------------------------------------- */

  const showLight = previewMode !== "dark";
  const showDark = previewMode !== "light";

  return (
    <div className="w-full min-w-0">
      <div
        className={cn(
          // `grid-cols-1` is load-bearing, not decoration. Without an explicit
          // template the implicit column is `auto`, whose minimum is
          // min-content — so the export's `<pre>` (which is wider than a phone)
          // stretched the track and the whole page overflowed instead of the
          // code block scrolling. `grid-cols-1` is `minmax(0, 1fr)`, which lets
          // the column shrink and hands the overflow to the block's own
          // `overflow-auto`.
          "grid min-w-0 grid-cols-1 items-start gap-6 lg:gap-8",
          !compact && "lg:grid-cols-[360px_minmax(0,1fr)]",
        )}
      >
        {/* ------------------------------ Controls ------------------------- */}
        <aside
          className={cn(
            "min-w-0",
            !compact &&
              // The site header is `position: fixed` and four rems tall, so a
              // bare `top-6` parked the panel 40px underneath it: on scroll the
              // first thing to disappear was the "Seed colour" label, which is
              // the one control the page is built around. Offset by the header
              // height (the same expression the docs rails use) and take the
              // height budget from what is left below it.
              "lg:sticky lg:top-[calc(var(--site-header-height)+1.5rem)] lg:max-h-[calc(100vh-var(--site-header-height)-3rem)] lg:overflow-y-auto lg:pr-1",
          )}
        >
          <div className={cn(glassCard, "grid gap-5 p-4 sm:p-5")}>
            {/* Seed */}
            <div>
              <label htmlFor={seedInputId}>
                <SectionLabel aside="hex, rgb() or hsl()">
                  Seed colour
                </SectionLabel>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={pickerValue}
                  onChange={(e) => setSeed(e.target.value)}
                  className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border-2 border-border bg-transparent p-1 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 motion-reduce:transition-none"
                  aria-label="Seed colour picker"
                />
                <input
                  id={seedInputId}
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className={cn(
                    fieldBase,
                    seedError ? fieldBad : fieldOk,
                    "min-w-36 flex-1",
                  )}
                  placeholder={DEFAULT_SEED}
                  spellCheck={false}
                  aria-invalid={Boolean(seedError)}
                  aria-describedby={
                    seedError ? `${seedInputId}-error` : undefined
                  }
                />
                <IconButton
                  onClick={() => setSeed(randomSeed())}
                  aria-label="Shuffle seed colour"
                  title="Shuffle"
                >
                  <Icon icon="lucide:shuffle" className="h-4 w-4" />
                </IconButton>
              </div>
              {seedError && (
                <p
                  id={`${seedInputId}-error`}
                  className="mt-2 text-xs"
                  style={{ color: "var(--theme-color-destructive)" }}
                  role="alert"
                >
                  Couldn&rsquo;t read that colour. Try #6366f1, rgb(99 102 241)
                  or hsl(239 84% 67%). Named colours aren&rsquo;t supported.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {presetPreviews.map((p) => {
                  const active = seed.trim().toLowerCase() === p.seed;
                  return (
                    <button
                      key={p.seed}
                      type="button"
                      onClick={() => setSeed(p.seed)}
                      aria-label={`Use ${p.seed}`}
                      aria-pressed={active}
                      title={p.seed}
                      className={cn(
                        "h-8 w-8 shrink-0 cursor-pointer rounded-full border-2 transition-transform motion-reduce:transition-none",
                        "hover:scale-110 motion-reduce:hover:scale-100",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        active ? "scale-110 border-ring" : "border-border",
                      )}
                      style={{
                        background: `linear-gradient(135deg, ${p.light} 50%, ${p.dark} 50%)`,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Family */}
            <div className="border-t border-border pt-5">
              <label htmlFor={familyInputId}>
                <SectionLabel aside={familyTouched ? undefined : "auto"}>
                  Family name
                </SectionLabel>
              </label>
              <div className="flex gap-2">
                <input
                  id={familyInputId}
                  type="text"
                  value={familyTouched ? familyInput : derivedFamily}
                  onChange={(e) => {
                    // Normalised as it is typed, so the field always shows the
                    // value that will be used. A pasted or edited URL goes
                    // through the same function below.
                    setFamilyInput(normalizeFamily(e.target.value));
                    setFamilyTouched(true);
                  }}
                  className={cn(fieldBase, fieldOk, "w-full")}
                  placeholder={derivedFamily}
                  spellCheck={false}
                />
                {familyTouched && (
                  <IconButton
                    onClick={() => {
                      setFamilyTouched(false);
                      setFamilyInput("");
                    }}
                    aria-label="Reset family name to automatic"
                    title="Follow the seed again"
                  >
                    <Icon icon="lucide:rotate-ccw" className="h-4 w-4" />
                  </IconButton>
                )}
              </div>
            </div>

            {/* Style */}
            <div className="border-t border-border pt-5">
              <SectionLabel aside="visual language">Style</SectionLabel>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {GENERATION_STYLES.map((s) => {
                  const sc = stylePreviews.get(s.value) ?? {};
                  const active = style === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStyle(s.value)}
                      aria-pressed={active}
                      className={cn(
                        "cursor-pointer rounded-xl border-2 p-2 text-left transition-colors motion-reduce:transition-none",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        // No `border` here: it sets `border-width: 1px` and fights
                        // the base `border-2`, so the selected card lost a pixel of
                        // border on selection. The width is owned by the base class;
                        // this branch only chooses the colour and the tint.
                        active
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-ring/60",
                      )}
                    >
                      <span
                        className="flex h-11 items-stretch gap-1 overflow-hidden rounded-md border p-1"
                        style={{
                          background: sc.background,
                          borderColor: sc.border,
                        }}
                        aria-hidden="true"
                      >
                        <span
                          className="w-1/3 rounded"
                          style={{ background: sc.primary }}
                        />
                        <span
                          className="flex flex-1 flex-col justify-center gap-1 rounded border px-1"
                          style={{
                            background: sc.card,
                            borderColor: sc.border,
                          }}
                        >
                          <span
                            className="h-0.5 w-full rounded-full opacity-70"
                            style={{ background: sc.foreground }}
                          />
                          <span
                            className="h-0.5 w-2/3 rounded-full opacity-40"
                            style={{ background: sc.foreground }}
                          />
                        </span>
                        <span
                          className="w-3 rounded-full"
                          style={{ background: sc.accent }}
                        />
                      </span>
                      <span className="mt-1.5 flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold">{s.label}</span>
                        {active && (
                          <Icon
                            icon="lucide:check"
                            className="h-3 w-3 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                      <span className="block text-[11px] leading-snug opacity-60">
                        {s.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Syntax */}
            <label className="flex cursor-pointer select-none items-center gap-2">
              <input
                type="checkbox"
                checked={withCode}
                onChange={(e) => setWithCode(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-border accent-(--theme-color-primary)"
              />
              <span className="text-sm font-medium">Include syntax tokens</span>
              <span className="ml-auto text-xs opacity-50">
                19 code colours
              </span>
            </label>

            {/* Site runtime */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between gap-2">
                <p
                  className="flex min-h-[1rem] min-w-0 items-center gap-1.5 text-xs opacity-70"
                  role="status"
                  aria-live="polite"
                >
                  {applied ? (
                    <>
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: "var(--theme-color-success)" }}
                      />
                      <span className="truncate">
                        Applied <code className="font-mono">{applied}</code>
                      </span>
                    </>
                  ) : (
                    <span>This site is using its own theme.</span>
                  )}
                </p>
                <IconButton onClick={reset} disabled={!applied}>
                  <Icon
                    icon="lucide:rotate-ccw"
                    className="mr-1.5 h-3.5 w-3.5"
                  />
                  Reset site
                </IconButton>
              </div>
            </div>
          </div>
        </aside>

        {/* ------------------------------ Workspace ------------------------ */}
        {/* `grid-cols-1` for the same reason as the outer grid: an implicit
            `auto` track floors at min-content, and the export's `<pre>` is
            wider than a phone — the column would grow and push the page wide
            instead of the code block scrolling inside its own box. */}
        <main className="grid min-w-0 grid-cols-1 gap-6">
          {!pair ? (
            <p className={cn(glassCard, "p-6 text-sm opacity-70")}>
              Enter a valid seed colour to generate a theme pair.
            </p>
          ) : (
            <>
              {/* Preview */}
              <section aria-label="Preview" className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">Preview</h2>
                  <Segmented
                    label="Preview mode"
                    value={previewMode}
                    onChange={setPreviewMode}
                    options={[
                      { value: "split", label: "Side by side" },
                      { value: "light", label: "Light" },
                      { value: "dark", label: "Dark" },
                    ]}
                  />
                </div>
                <div
                  className={cn(
                    "grid gap-4",
                    previewMode === "split" &&
                      (compact ? "sm:grid-cols-2" : "xl:grid-cols-2"),
                  )}
                >
                  {showLight && (
                    <ThemePreview
                      theme={pair.light}
                      mode="light"
                      isApplied={appliedMode === "light"}
                      onApply={() => apply("light")}
                    />
                  )}
                  {showDark && (
                    <ThemePreview
                      theme={pair.dark}
                      mode="dark"
                      isApplied={appliedMode === "dark"}
                      onApply={() => apply("dark")}
                    />
                  )}
                </div>
              </section>

              {/* Palette */}
              <PalettePanel pair={pair} copiedKey={copiedKey} copy={copy} />

              {/* Export */}
              <section
                className="code-block min-w-0 overflow-hidden"
                aria-label="Export"
              >
                <div className="code-block-toolbar flex-wrap gap-y-2">
                  <div
                    role="tablist"
                    aria-label="Export format"
                    className="flex gap-1"
                  >
                    {exportTabs.map((t) => {
                      const active = t.id === exportTab;
                      return (
                        <button
                          key={t.id}
                          role="tab"
                          type="button"
                          aria-selected={active}
                          onClick={() => setExportTab(t.id)}
                          className={cn(
                            "cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors motion-reduce:transition-none",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "bg-muted"
                              : "opacity-60 hover:opacity-100",
                          )}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    {exportTab === "css" && (
                      <Segmented
                        label="CSS modes"
                        value={cssView}
                        onChange={setCssView}
                        options={[
                          { value: "both", label: "Both" },
                          { value: "light", label: "Light" },
                          { value: "dark", label: "Dark" },
                        ]}
                      />
                    )}
                    <CopyButton
                      text={activeExport.text}
                      label="Copy"
                      className="code-block-copy"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        download(
                          activeExport.file,
                          activeExport.text,
                          activeExport.mime,
                        )
                      }
                    >
                      <Icon icon="lucide:download" className="mr-1.5 h-4 w-4" />
                      {activeExport.file}
                    </Button>
                  </div>
                </div>

                <ClientPre
                  key={`${exportTab}-${cssView}`}
                  code={activeExport.text}
                  lang={activeExport.lang}
                  className="max-h-96 overflow-auto"
                />

                <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
                  <code className="truncate font-mono text-[11px] opacity-50">
                    {pair.light.name} · {pair.dark.name}
                  </code>
                  <div className="ml-auto flex flex-wrap gap-2">
                    {!compact && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void copy(window.location.href, "share")}
                      >
                        <Icon
                          icon={
                            copiedKey === "share"
                              ? "lucide:check"
                              : "lucide:link"
                          }
                          className="mr-1.5 h-4 w-4"
                        />
                        {copiedKey === "share"
                          ? "Link copied"
                          : "Copy share link"}
                      </Button>
                    )}
                    {!isOnPlayground && (
                      <Button
                        size="sm"
                        variant="ghost"
                        href="/playground?theme=custom"
                      >
                        <span className="flex items-center gap-2">
                          <Icon icon="lucide:cpu" className="h-4 w-4" />
                          Open in Playground
                        </span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      href="/api-reference/core"
                    >
                      <span className="flex items-center gap-2 text-xs">
                        API reference
                        <Icon icon="lucide:external-link" className="h-3 w-3" />
                      </span>
                    </Button>
                  </div>
                </div>
              </section>

              {/* Recipes — documents the API rather than the seed, so the
                  playground (which embeds this component with `compact`) skips it. */}
              {!compact && (
                <section aria-labelledby="generate-theme-recipes">
                  <h2
                    id="generate-theme-recipes"
                    className="mb-1 text-lg font-semibold tracking-tight"
                  >
                    generateTheme() recipes
                  </h2>
                  <p className="mb-4 max-w-2xl text-sm leading-relaxed opacity-60">
                    This page exercises one call. These are the rest of the
                    options, each one run against the shipped function rather
                    than described from its signature.
                  </p>

                  <div className="flex flex-col gap-3">
                    {GENERATE_RECIPES.map((recipe, i) => (
                      <details
                        key={recipe.title}
                        className="code-block group overflow-hidden"
                        open={i === 0}
                      >
                        <summary className="code-block-toolbar cursor-pointer list-none">
                          <span className="code-block-filename flex items-center gap-2">
                            <Icon
                              icon="lucide:chevron-right"
                              className="h-4 w-4 transition-transform motion-reduce:transition-none group-open:rotate-90"
                            />
                            {recipe.title}
                          </span>
                          <span className="code-block-lang">ts</span>
                        </summary>
                        <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-2">
                          <p className="text-xs leading-relaxed opacity-60">
                            {recipe.blurb}
                          </p>
                          <CopyButton
                            text={recipe.code}
                            label="Copy"
                            className="code-block-copy shrink-0"
                          />
                        </div>
                        <ClientPre
                          code={recipe.code}
                          lang="typescript"
                          className="max-h-72 overflow-auto"
                        />
                      </details>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
