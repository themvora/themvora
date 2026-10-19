/**
 * The generated `themes/themes.ts`.
 *
 * One canonical theme-definition module per generated project, framework
 * agnostic: it imports only `@themvora/core`, so the same file is correct for
 * React, Next, Vue, Svelte and Solid. Everything that reads it — the root
 * provider, the showcase, the scoped-theme demo — imports from here.
 *
 * @packageDocumentation
 */
import { getPresetThemes, type ThemeDefinition } from "@themvora/core";
import { GENERATED_MARKER } from "../files.js";
import { renderSourcesLine } from "../source.js";
import type { InitSourceSummary } from "../types.js";

/** The reference blueprint's demo families, always offered by the showcase. */
const DEMO_FAMILIES = ["themvora", "citrus", "cocoa", "berry"] as const;

/**
 * The families `getPresetThemes()` already serves.
 *
 * @remarks
 * Read from the catalog at generation time so the emitted module can tell the two
 * cases apart: a **preset** family is referenced and never copied, because the
 * canonical implementation ships it; anything else — a brand, a seed, the neutral
 * pair — has no runtime API that reproduces it and must be written out.
 */
const CATALOG_FAMILIES: ReadonlySet<string> = new Set(
  getPresetThemes().map((theme) => theme.meta?.family ?? ""),
);

/**
 * One resolved theme as a TypeScript literal.
 *
 * @param theme - The resolved definition.
 * @returns The definition wrapped in `defineTheme(...)`, indented for the array.
 */
function renderThemeLiteral(theme: ThemeDefinition): string {
  const body = JSON.stringify(theme, null, 2)
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
  return `  defineTheme(\n${body}\n  )`;
}

/**
 * The custom Themvora Light theme, exactly as the reference blueprint defines it.
 *
 * @remarks
 * `shadows` is deliberately absent. The blueprint's snippet carries
 * `shadows: { sm: "#17172B" }`, but a shadow token is a **CSS box-shadow value**
 * — the shipped mapping reads it as
 * `var(--theme-shadow-sm, 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06))`
 * — so a bare colour would emit `--theme-shadow-sm: #17172B`, which is not a
 * shadow. The blueprint gives no valid shadow value, so the optional group is
 * omitted rather than filled with something that would not render.
 *
 * Empty optional groups are omitted for the same reason: an empty `spacing: {}`
 * declares nothing and only makes the object look complete.
 */
const THEMVORA_LIGHT = `  defineTheme({
    name: "themvora-default-light",
    meta: {
      family: "themvora",
      mode: "light",
      label: "Themvora Light",
      order: 10,
      tags: ["docs-site"],
    },
    tokens: {
      colors: {
        background: "#F8F9FF",
        foreground: "#17172B",

        card: "#FFFFFF",
        cardForeground: "#17172B",

        popover: "#FFFFFF",
        popoverForeground: "#17172B",

        primary: "#635BFF",
        primaryForeground: "#FFFFFF",

        secondary: "#EEEFFF",
        secondaryForeground: "#29264A",

        muted: "#F0F1FA",
        mutedForeground: "#686B85",

        accent: "#E9E7FF",
        accentForeground: "#4F46D8",

        destructive: "#F05265",
        destructiveForeground: "#FFFFFF",

        success: "#159C72",
        successForeground: "#FFFFFF",

        border: "#E2E4F2",
        input: "#DDE0F0",

        ring: "#635BFF",
      },
      radius: { lg: "12px" },
    },
  })`;

/** The custom Themvora Dark theme. Mirrors the light theme's structure. */
const THEMVORA_DARK = `  defineTheme({
    name: "themvora-default-dark",
    meta: {
      family: "themvora",
      mode: "dark",
      label: "Themvora Dark",
      order: 10,
      tags: ["docs-site"],
    },
    tokens: {
      colors: {
        background: "#0A0B14",
        foreground: "#F0F0FF",

        card: "#111321",
        cardForeground: "#F0F0FF",

        popover: "#17192A",
        popoverForeground: "#F0F0FF",

        primary: "#8178FF",
        primaryForeground: "#0A0B14",

        secondary: "#1A1C30",
        secondaryForeground: "#E8E8FF",

        muted: "#151727",
        mutedForeground: "#999CB8",

        accent: "#25234A",
        accentForeground: "#C7C2FF",

        destructive: "#FF6878",
        destructiveForeground: "#180B10",

        success: "#22C58B",
        successForeground: "#06251B",

        border: "#292B41",
        input: "#30324A",

        ring: "#8178FF",
      },
      radius: { lg: "12px" },
    },
  })`;

/**
 * The theme families a set of resolved themes belongs to, in registration order.
 *
 * @param themes - The resolved definitions.
 * @returns Each family once, in the order it first appears.
 *
 * @remarks
 * Derived from the resolved themes rather than from the encoded source list. The
 * source list records a `kind`, and a **seed** has no family in it — but a seed
 * does produce themes, with a family, and those themes are written into the
 * registry. Deriving from the source list left `indigo` out of `selection` while
 * `indigo-light` sat in `sourceThemes`, so the showcase offered no control for a
 * theme the app had registered.
 */
function themeFamilies(themes: readonly ThemeDefinition[]): string[] {
  const families: string[] = [];
  for (const theme of themes) {
    const family = theme.meta?.family;
    if (family && !families.includes(family)) families.push(family);
  }
  return families;
}

/**
 * The custom pair plus the canonical preset catalog.
 *
 * @param source - The resolved source summary, for the file header and the
 *   source's own families.
 * @returns The contents of `themes/themes.ts`.
 *
 * @remarks
 * The preset themes are **not** written out here. `getPresetThemes()` returns the
 * catalog Themvora ships, and `selection` filters it by family, so the generated
 * project consumes the canonical preset implementation rather than a second copy
 * of its colours.
 *
 * `selection` is the reference's four demo families — `themvora` (the custom
 * pair), `citrus`, `cocoa` and `berry` — **plus whatever families the source
 * contributed**. Without that second part `--preset` and `themvora add` would
 * generate a registry that silently omitted the theme the user asked for: the
 * module filters the catalog, so a family missing from `selection` is a theme
 * missing from the app.
 *
 * `scopedFamily` is derived from the registry rather than hardcoded at the use
 * site: `ThemeScope` accepts a family name, and deriving it means the demo can
 * only ever point at a family the catalog actually ships. `scopedThemes` exposes
 * the resolved pair so a reader — and a test — can assert it is non-empty.
 */
export function renderThemesModule(
  themes: readonly ThemeDefinition[],
  source: InitSourceSummary,
): string {
  const sources = renderSourcesLine(source.sources);
  const families = [...new Set([...themeFamilies(themes), ...DEMO_FAMILIES])];
  const selection = families.map((family) => `"${family}"`).join(", ");

  // Everything the catalog does not serve has to be written out, or the family
  // would sit in `selection` with no theme behind it — which is exactly what
  // happened to `themvora add brand`: the family was recorded, `getPresetThemes()`
  // could not resolve it, and the app silently never got the brand.
  const inlined = themes.filter((theme) => !CATALOG_FAMILIES.has(theme.meta?.family ?? ""));
  const sourceThemes = inlined.length
    ? `[\n${inlined.map(renderThemeLiteral).join(",\n")},\n]`
    : "[]";

  // The app opens with the theme the source asked for, not with the custom pair.
  // `--preset mint` used to open on `themvora-default-light`, which is not what
  // the flag means.
  const defaultTheme = source.defaultTheme || "themvora-default-light";

  return `/**
 * Themvora theme definitions.
 *
 * ${GENERATED_MARKER}
 * Re-running \`themvora init\` or \`themvora add\` regenerates this file. Remove
 * this header to keep your own version instead.
 *
 * Source: ${source.label}.
 * ${sources}
 */
import { defineTheme, getPresetThemes } from "@themvora/core";

/**
 * The custom Themvora theme pair.
 *
 * Both modes share the \`themvora\` family, so the family control selects this
 * pair and the mode control switches between them.
 */
export const themvora = [
${THEMVORA_LIGHT},

${THEMVORA_DARK},
];

/**
 * The theme families the showcase offers.
 *
 * \`themvora\` is the custom pair above; the rest are canonical presets. The
 * families this project's sources contributed are included, so \`themvora add\`
 * extends the app rather than being filtered back out.
 */
export const selection = [${selection}];

/**
 * The canonical preset themes, filtered to the selected families.
 *
 * \`getPresetThemes()\` returns Themvora's own catalog — one light and one dark
 * theme per preset family — so this project inherits the real preset colours
 * instead of a copy of them.
 */
export const presetThemes = getPresetThemes().filter((theme) =>
  selection.includes(theme.meta?.family ?? ""),
);

/**
 * Themes the catalog does not serve: a brand, a seed, the neutral pair.
 *
 * Written out because no runtime API reproduces them — \`getPresetThemes()\` only
 * covers preset families. A preset never appears here; it is referenced above so
 * the canonical implementation stays the single source of its colours.
 */
export const sourceThemes = ${sourceThemes};

/** Every theme the application registers. */
export const themes = [...themvora, ...presetThemes, ...sourceThemes];

/**
 * The theme the application opens with.
 *
 * Typed as one of the registry's own names, so the provider's \`defaultTheme\`
 * prop accepts it and a typo is a compile error.
 */
export const defaultTheme: (typeof themes)[number]["name"] =
  "${defaultTheme}";

/** The family the scoped-theme demo pins its subtree to. */
export const scopedFamily = "cocoa";

/**
 * The concrete themes the scoped demo resolves against.
 *
 * Derived from the registry, so the demo cannot point at a family the catalog
 * does not ship — and a reader can assert the pair exists.
 */
export const scopedThemes = presetThemes.filter(
  (theme) => theme.meta?.family === scopedFamily,
);
`;
}
