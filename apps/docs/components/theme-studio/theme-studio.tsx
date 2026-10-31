"use client";

import { useCallback, useId, useMemo, useState } from "react";
import {
  generateTheme,
  themeToCSSVariables,
  type GeneratedThemePair,
  type GenerationStyle,
} from "@themvora/core";
import { useThemeRuntime } from "@themvora/next/client";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { CopyButton } from "../ui/copy-button";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { highlightCode } from "../../lib/highlight";

const GENERATION_STYLES: { value: GenerationStyle; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "soft", label: "Soft" },
  { value: "vibrant", label: "Vibrant" },
  { value: "editorial", label: "Editorial" },
  { value: "minimal", label: "Minimal" },
  { value: "brand", label: "Brand" },
];

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

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

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

type TokenColors = Record<string, string>;

const glassCard = cn(
  "rounded-2xl border border-border/50 bg-background/60",
  "backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-white/5",
  "transition-all motion-reduce:transition-none",
);

function ThemePreview({
  theme,
  title,
  onApply,
}: {
  theme: ReturnType<typeof generateTheme>["light"];
  title: string;
  onApply: () => void;
}) {
  const colors = (theme.tokens?.colors ?? {}) as TokenColors;
  const keys = [
    "background",
    "foreground",
    "card",
    "primary",
    "primaryForeground",
    "secondary",
    "accent",
    "muted",
    "success",
    "destructive",
    "border",
    "ring",
  ];

  return (
    <div
      className={cn(
        glassCard,
        "overflow-hidden hover:shadow-xl hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
      )}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5 sm:px-4 sm:py-3"
        style={{
          background: colors.card,
          color: colors.cardForeground,
        }}
      >
        <span className="truncate text-sm font-semibold capitalize">
          {theme.meta?.label ?? title}
        </span>
        <span className="shrink-0 font-mono text-[11px] opacity-50">
          {theme.name}
        </span>
      </div>

      {/* Card body */}
      <div
        className="p-3.5 sm:p-4"
        style={{ background: colors.background, color: colors.foreground }}
      >
        <div
          className="mb-3 flex items-center gap-3"
          style={{ color: colors.foreground }}
        >
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold"
            style={{
              background: colors.primary,
              color: colors.primaryForeground,
            }}
          >
            A
          </div>
          <div className="min-w-0 text-sm font-semibold leading-tight">
            <span className="block truncate">Generated {title} theme</span>
            <div className="truncate text-[11px] font-normal opacity-50">
              Derived from your seed in OKLCH
            </div>
          </div>
        </div>

        {/* Color swatches */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {keys
            .filter((k) => colors[k])
            .map((k) => (
              <div
                key={k}
                className="h-7 w-7 rounded-md border border-black/10"
                style={{ background: colors[k] }}
                title={`${k}: ${colors[k]}`}
              />
            ))}
        </div>

        <button
          type="button"
          onClick={onApply}
          className={cn(
            "w-full rounded-xl px-4 py-2.5 text-sm font-semibold",
            "cursor-pointer transition-all motion-reduce:transition-none",
            "hover:brightness-110 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "active:translate-y-px",
          )}
          style={{
            background: colors.primary,
            color: colors.primaryForeground,
          }}
        >
          Apply {title} to this site
        </button>
      </div>
    </div>
  );
}

export function ThemeStudio({ compact = false }: { compact?: boolean }) {
  const runtime = useThemeRuntime();
  const pathname = usePathname();
  const [seed, setSeed] = useState("#6366f1");
  const [family, setFamily] = useState("indigo");
  const [style, setStyle] = useState<GenerationStyle>("balanced");
  const [withCode, setWithCode] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);

  const seedInputId = useId();
  const familyInputId = useId();

  // Hide "Open in Playground" when already inside the playground.
  const isOnPlayground = pathname === "/playground";

  /** Convert "indigo-light" → "indigoLight" so the exported const name is a
   *  valid JS/TS identifier. */
  const sanitizeName = useCallback((value: string): string => {
    const cleaned = value
      .replace(/[-.\s]+/g, "_")
      .replace(/[^a-zA-Z0-9_$]/g, "")
      .replace(/^([0-9])/, "_$1");
    return cleaned || "theme";
  }, []);

  const isValid = /^#[0-9a-fA-F]{6}$/.test(seed);

  const pair: GeneratedThemePair | null = useMemo(() => {
    if (!isValid) return null;
    return generateTheme({
      seed,
      family: family.trim() || seed.replace("#", ""),
      style,
      withCode,
    });
  }, [seed, family, isValid, style, withCode]);

  /*
    The CSS export.

    This was computed and never rendered — a light-only variable list with no
    reader. It now emits both modes, which is what someone pasting it into a
    stylesheet actually needs, and it is shown below alongside the TS and JSON
    forms.

    `themeToCSSVariables` rather than a hand-rolled `--theme-color-*` loop, so the
    export is the same projection the runtime performs.
  */
  const css = useMemo(() => {
    if (!pair) return "";
    const block = (
      label: string,
      selector: string,
      theme: GeneratedThemePair["light"],
    ) => {
      const vars = themeToCSSVariables(theme);
      const body = Object.entries(vars)
        .map(([name, value]) => `  ${name}: ${value};`)
        .join("\n");
      return `/* ${label} */\n${selector} {\n${body}\n}`;
    };
    return `${block("Light theme", ":root", pair.light)}\n\n${block("Dark theme", ".dark", pair.dark)}`;
  }, [pair]);

  const json = useMemo(() => JSON.stringify(pair ?? null, null, 2), [pair]);

  const tsCode = useMemo(() => {
    if (!pair) return "";
    const baseName = sanitizeName(pair.light.meta?.family || family);
    /*
      `generateTheme`, not `defineTheme`.

      This snippet used to dump the entire generated theme object into
      `defineTheme(...)`, which is the opposite of what it is demonstrating.
      `generateTheme` exists so that nobody authors those tokens by hand: one
      seed produces the complete light and dark pair, every colour derived. A
      snippet that pastes the output back in as authored input tells the reader
      the wrong story about the API — and it buries the one line that matters
      under two hundred lines of JSON.

      The page's own copy says "computed with HSL math by generateTheme()". Now
      the code agrees with it.
    */
    const options = [
      `  seed: ${JSON.stringify(seed)},`,
      `  family: ${JSON.stringify(family.trim() || seed.replace("#", ""))},`,
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
  }, [pair, family, seed, sanitizeName, style, withCode]);

  function apply(kind: "light" | "dark") {
    if (!pair) return;
    runtime.update((kind === "light" ? pair.light : pair.dark).tokens ?? {});
    setApplied(`${family.trim() || seed}-${kind}`);
  }

  return (
    <div className="w-full min-w-0">
      {!compact && (
        <header className="mb-6 sm:mb-8">
          {/* Badge / chip */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: "var(--theme-color-primary)" }}
            />
            Theme Studio
          </div>
          <h1 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Generate a theme from a seed
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed opacity-70 sm:text-base">
            Pick a seed color and Themvora derives a complete light + dark pair
            — secondary, muted, accent, card, popover, input, border and ring
            colors are all computed in OKLCH by{" "}
            <code className="font-mono text-[0.9em]">generateTheme()</code>.
            Apply it to this very site to see the runtime re-theme everything
            live.
          </p>
        </header>
      )}

      {/* gap-8: the row gap between the controls card and the preview cards.
          24px read as glued once the glass card's shadow filled it. */}
      <div className="grid min-w-0 items-start gap-12">
        {/* Sidebar: controls only. `relative z-10` lifts the whole column above
            the generated-theme cards below it: the glass card's backdrop-filter
            creates a stacking context, so the Select popover's own z-50 cannot
            escape it — without this, later siblings painted over the open list. */}
        <div className="relative z-10 flex min-w-0 flex-col gap-6 lg:top-6 lg:self-start">
          <div className={cn(glassCard, "p-4 sm:p-5")}>
            <label
              htmlFor={seedInputId}
              className="grid gap-2 text-sm font-medium"
            >
              Seed color
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={seedInputId}
                  type="color"
                  value={isValid ? seed : "#6366f1"}
                  onChange={(e) => setSeed(e.target.value)}
                  className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border-2 border-border bg-transparent p-1 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 sm:h-12 sm:w-12"
                  aria-label="Seed color picker"
                />
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className={cn(
                    "min-w-36 flex-1 rounded-xl border-2 bg-muted px-3 py-2.5 font-mono text-sm outline-none transition-colors",
                    // Plain cn() join: the two states must not carry conflicting
                    // border classes, so the focus styles branch with the color.
                    isValid
                      ? "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                      : "border-red-500/60 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20",
                  )}
                  placeholder="#6366f1"
                  spellCheck={false}
                  inputMode="text"
                  aria-invalid={!isValid}
                />
              </div>
              {!isValid && (
                <span className="text-xs text-red-500">
                  Enter a valid 6-digit hex color, e.g. #6366f1.
                </span>
              )}
            </label>

            {/* Preset swatches */}
            <div className="mt-3 flex flex-wrap gap-2 sm:gap-1.5">
              {PRESETS.map((p) => {
                const isActive = seed.toLowerCase() === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSeed(p)}
                    aria-label={`Use ${p}`}
                    aria-pressed={isActive}
                    className={cn(
                      "h-8 w-8 shrink-0 rounded-full border-2 transition-transform hover:scale-110 motion-reduce:hover:scale-100",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "sm:h-7 sm:w-7",
                      isActive ? "scale-110 border-ring" : "border-transparent",
                    )}
                    style={{ background: p }}
                  />
                );
              })}
            </div>

            <label
              htmlFor={familyInputId}
              className="mt-4 grid gap-1.5 text-sm font-medium"
            >
              Family name
              <input
                id={familyInputId}
                type="text"
                value={family}
                onChange={(e) => setFamily(e.target.value)}
                className="w-full rounded-xl border-2 border-border bg-muted px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="indigo"
                spellCheck={false}
              />
            </label>

            <div className="mt-4 grid gap-1.5 text-sm font-medium">
              Visual style
              <Select
                value={style}
                onChange={(value) => setStyle(value as GenerationStyle)}
                label="Visual style"
                options={GENERATION_STYLES.map((s) => ({
                  value: s.value,
                  label: s.label,
                }))}
              />
              <span className="text-xs opacity-50 font-normal">
                Controls the visual language — how saturated, contrasted, and
                styled the generated palette is.
              </span>
            </div>

            <label className="mt-4 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={withCode}
                onChange={(e) => setWithCode(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-(--theme-color-primary) cursor-pointer"
              />
              <span className="text-sm font-medium">Include syntax tokens</span>
              <span className="text-xs opacity-50 ml-auto">19 code colors</span>
            </label>

            <p
              className="mt-3 flex min-h-[1rem] items-center gap-1.5 text-xs opacity-60"
              role="status"
              aria-live="polite"
            >
              {applied && (
                <>
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: "var(--theme-color-success)" }}
                  />
                  <span className="truncate">
                    Applied <code className="font-mono">{applied}</code> to the
                    live runtime.
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Main content: theme previews */}
        <div className="flex min-w-0 flex-col gap-6">
          {!pair ? (
            <p className={cn(glassCard, "p-6 text-sm opacity-60")}>
              Enter a valid 6-digit hex color to generate a theme pair.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <ThemePreview
                theme={pair.light}
                title="light"
                onApply={() => apply("light")}
              />
              <ThemePreview
                theme={pair.dark}
                title="dark"
                onApply={() => apply("dark")}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        {pair ? (
          <>
            {/* Primary Output Actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              <CopyButton
                text={tsCode}
                label="Copy TS Definition"
                title="Copy the TypeScript theme definition"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm font-semibold cursor-pointer transition-colors hover:border-ring"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const blob = new Blob([tsCode], { type: "text/typescript" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${sanitizeName(pair.light.meta?.family || family)}.ts`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Icon icon="lucide:download" className="mr-2 h-4 w-4" />
                Download .ts
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${sanitizeName(pair.light.meta?.family || family)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Icon icon="lucide:download" className="mr-2 h-4 w-4" />
                Download .json
              </Button>
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
                className="ml-auto"
                href="/api-reference/core"
              >
                <span className="flex items-center gap-2 text-xs">
                  View API Reference
                  <Icon icon="lucide:external-link" className="h-3 w-3" />
                </span>
              </Button>
            </div>

            {/* Theme JSON Output */}
            <div className="code-block overflow-hidden">
              <div className="code-block-toolbar">
                <span className="code-block-filename" title="Theme JSON">
                  Theme JSON
                </span>
                <div className="flex items-center gap-1.5">
                  <code className="truncate mono text-[11px] opacity-40">
                    {pair.light.name} · {pair.dark.name}
                  </code>
                  <span className="code-block-lang">json</span>
                  <CopyButton
                    text={json}
                    label="Copy JSON"
                    className="code-block-copy"
                  />
                </div>
              </div>
              <div
                className="max-h-72 overflow-auto sm:max-h-96"
                dangerouslySetInnerHTML={{
                  __html: highlightCode(json, "json"),
                }}
              />
            </div>

            {/* TypeScript Code Output */}
            <div className="code-block overflow-hidden mt-4">
              <div className="code-block-toolbar">
                <span className="code-block-filename" title="TypeScript code">
                  Theme Definition (TS)
                </span>
                <div className="flex items-center gap-1.5">
                  <code className="truncate mono text-[11px] opacity-40">
                    {sanitizeName(pair.light.meta?.family || family)}
                  </code>
                  <span className="code-block-lang">TS</span>
                  <CopyButton
                    text={tsCode}
                    label="Copy"
                    className="code-block-copy"
                  />
                </div>
              </div>
              <div
                className="max-h-72 overflow-auto sm:max-h-96"
                dangerouslySetInnerHTML={{
                  __html: highlightCode(tsCode, "typescript"),
                }}
              />
            </div>

            {/* Quick Import Statement */}
            <div className="code-block overflow-hidden mt-4">
              <div className="code-block-toolbar">
                <span className="code-block-filename" title="Import statement">
                  Import Statement
                </span>
                <div className="flex items-center gap-1.5">
                  <code className="truncate mono text-[11px] opacity-40">
                    {`import { themes } from "./${sanitizeName(pair.light.meta?.family || family)}";`}
                  </code>
                  <CopyButton
                    text={`import { themes } from "./${sanitizeName(pair.light.meta?.family || family)}";`}
                    label="Copy"
                    className="code-block-copy"
                  />
                </div>
              </div>
            </div>

            {/* CSS Variables Output */}
            <div className="code-block overflow-hidden mt-4">
              <div className="code-block-toolbar">
                <span
                  className="code-block-filename"
                  title="CSS custom properties"
                >
                  CSS Variables
                </span>
                <div className="flex items-center gap-1.5">
                  <code className="truncate mono text-[11px] opacity-40">
                    :root / .dark
                  </code>
                  <span className="code-block-lang">CSS</span>
                  <CopyButton
                    text={css}
                    label="Copy"
                    className="code-block-copy"
                  />
                </div>
              </div>
              <div
                className="max-h-72 overflow-auto sm:max-h-96"
                dangerouslySetInnerHTML={{ __html: highlightCode(css, "css") }}
              />
            </div>

            {/* Recipes — the API beyond the one call this page makes. Only on
                /theme-studio.
                The playground embeds this component with `compact`, and these recipes
                document the API rather than the seed — the wrong material for a page
                about experimenting. */}
            {!compact && (
              <section
                className="mt-10"
                aria-labelledby="generate-theme-recipes"
              >
                <h2
                  id="generate-theme-recipes"
                  className="text-lg font-semibold tracking-tight mb-1"
                >
                  generateTheme() recipes
                </h2>
                <p className="text-sm opacity-60 mb-5 max-w-2xl leading-relaxed">
                  This page exercises one call. These are the rest of the
                  options, each one run against the shipped function rather than
                  described from its signature.
                </p>

                <div className="flex flex-col gap-4">
                  {GENERATE_RECIPES.map((recipe) => (
                    <div
                      key={recipe.title}
                      className="code-block overflow-hidden"
                    >
                      <div className="code-block-toolbar">
                        <span
                          className="code-block-filename"
                          title={recipe.blurb}
                        >
                          {recipe.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="code-block-lang">ts</span>
                          <CopyButton
                            text={recipe.code}
                            label="Copy"
                            className="code-block-copy"
                          />
                        </div>
                      </div>
                      <p className="px-3 py-2 text-xs opacity-60 leading-relaxed border-b border-border">
                        {recipe.blurb}
                      </p>
                      <div
                        className="max-h-72 overflow-auto"
                        dangerouslySetInnerHTML={{
                          __html: highlightCode(recipe.code, "typescript"),
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
            <p className="text-sm opacity-60">
              Generated tokens will appear here once you enter a valid seed
              color.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
