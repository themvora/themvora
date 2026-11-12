/**
 * Themvora UnoCSS integration.
 *
 * Provides the `presetThemvora` UnoCSS preset and the `createUnoTheme`
 * adapter-source helper that map Themvora tokens to UnoCSS theme values.
 *
 * @packageDocumentation
 */
import { definePreset, type Preset } from "@unocss/core";
import type { ThemeTokens } from "@themvora/core";
import type { AdapterSource } from "@themvora/adapters";
import { resolveAdapterSource } from "@themvora/adapters";

function pair(name: string, fallback?: string): string {
  return fallback
    ? `var(--theme-color-${name}, ${fallback})`
    : `var(--theme-color-${name})`;
}

function pairForeground(name: string): string {
  return `var(--theme-color-${name}-foreground, var(--theme-color-${name}Foreground))`;
}

/**
 * Base rules the preset contributes.
 *
 * UnoCSS ships utilities, not a reset: without these, a bare `<input>` keeps the
 * user agent's `2px inset` border and its `outline: auto` focus ring, which
 * renders black on both themes and cannot be themed by any utility the preset
 * generates. The rules below are element selectors, so every `border-*`,
 * `bg-*`, `outline-*` or `ring-*` utility on the same element still wins — they
 * only decide what a form control looks like when the author says nothing.
 *
 * The focus ring is recoloured, never removed: width and offset stay at the
 * accessible defaults.
 */
const PREFLIGHTS = [
  {
    getCSS: () =>
      [
        ":root{",
        "--un-ring-color:var(--theme-color-ring,var(--theme-color-primary));",
        "}",
        'input:not([type="checkbox"]):not([type="radio"]),select,textarea{',
        "border:1px solid var(--theme-color-border);",
        "background-color:var(--theme-color-card);",
        "color:var(--theme-color-foreground);",
        "border-radius:var(--theme-radius-md,0.5rem);",
        "}",
        'input::placeholder,textarea::placeholder{color:var(--theme-color-muted-foreground,var(--theme-color-mutedForeground));}',
        'input:not([type="checkbox"]):not([type="radio"]):focus-visible,select:focus-visible,textarea:focus-visible,',
        "a:focus-visible,button:focus-visible,[tabindex]:focus-visible{",
        "outline:2px solid var(--theme-color-ring,var(--theme-color-primary));",
        "outline-offset:2px;",
        "}",
      ].join(""),
  },
];

/**
 * UnoCSS preset that exposes Themvora semantic tokens as utilities such as
 * `bg-primary`, `text-foreground`, `border-border`, `rounded-lg`, etc.
 * Values reference the live `--theme-*` variables, so they update at runtime.
 *
 * @see {@link createUnoTheme}
 */
export function presetThemvora(): Preset {
  return definePreset({
    name: "@themvora/unocss",
    preflights: PREFLIGHTS,
    theme: {
      colors: {
        background: pair("background"),
        foreground: pair("foreground"),
        card: {
          DEFAULT: pair("card", "var(--theme-color-background)"),
          foreground: pairForeground("card"),
        },
        popover: {
          DEFAULT: pair("popover", "var(--theme-color-card)"),
          foreground: pairForeground("popover"),
        },
        primary: {
          DEFAULT: pair("primary"),
          foreground: pairForeground("primary"),
        },
        secondary: {
          DEFAULT: pair("secondary", "var(--theme-color-muted)"),
          foreground: pairForeground("secondary"),
        },
        muted: {
          DEFAULT: pair("muted"),
          foreground: pairForeground("muted"),
        },
        accent: {
          DEFAULT: pair("accent", "var(--theme-color-secondary)"),
          foreground: pairForeground("accent"),
        },
        destructive: {
          DEFAULT: pair("destructive"),
          foreground: pairForeground("destructive"),
        },
        border: pair("border"),
        input: pair("input", "var(--theme-color-border)"),
        ring: pair("ring", "var(--theme-color-primary)"),
      },
      borderRadius: {
        sm: "var(--theme-radius-sm, calc(var(--theme-radius-lg) * 0.75))",
        md: "var(--theme-radius-md, calc(var(--theme-radius-lg) * 0.9))",
        lg: "var(--theme-radius-lg)",
        xl: "var(--theme-radius-xl, calc(var(--theme-radius-lg) * 1.25))",
      },
      boxShadow: {
        sm: "var(--theme-shadow-sm)",
        md: "var(--theme-shadow-md)",
        lg: "var(--theme-shadow-lg)",
        xl: "var(--theme-shadow-xl)",
      },
      fontFamily: {
        sans: "var(--theme-typography-font-family-sans)",
        mono: "var(--theme-typography-font-family-mono, ui-monospace, monospace)",
      },
    },
  }) as Preset;
}

/**
 * Returns a static UnoCSS theme object with concrete values for a given set of
 * Themvora tokens (useful for build-time generation instead of runtime vars).
 *
 * @see {@link presetThemvora}
 */
export function createUnoTheme(source: AdapterSource) {
  const theme = resolveAdapterSource(source);
  const tokens = theme.tokens;

  const read = (category: "colors" | "radius" | "shadows", key: string): string | undefined => {
    const section = tokens[category] as Record<string, unknown> | undefined;
    const value = section?.[key];
    return typeof value === "string" ? value : undefined;
  };

  const result: Record<string, unknown> = {
    colors: {
      background: read("colors", "background"),
      foreground: read("colors", "foreground"),
      primary: read("colors", "primary"),
      secondary: read("colors", "secondary"),
      accent: read("colors", "accent"),
      muted: read("colors", "muted"),
      destructive: read("colors", "destructive"),
      border: read("colors", "border"),
      ring: read("colors", "ring"),
    },
    borderRadius: {
      sm: read("radius", "sm"),
      md: read("radius", "md"),
      lg: read("radius", "lg"),
      xl: read("radius", "xl"),
    },
    boxShadow: {
      sm: read("shadows", "sm"),
      md: read("shadows", "md"),
      lg: read("shadows", "lg"),
      xl: read("shadows", "xl"),
    },
  };

  return pruneUndefined(result);
}

function pruneUndefined(input: Record<string, unknown>): Record<string, unknown> {
  for (const key of Object.keys(input)) {
    const value = input[key];
    if (value && typeof value === "object") {
      pruneUndefined(value as Record<string, unknown>);
    }
    if (value === undefined) delete input[key];
  }
  return input;
}

export type { ThemeTokens };