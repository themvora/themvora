/**
 * The live code sample on the landing page.
 *
 * A plain module — not `"use client"` — because `app/page.tsx` derives the
 * sample's compatibility badge on the server, and a value exported from a client
 * module reaches a server component as a client reference rather than as the
 * string. The hero itself stays a client component; only the template lives
 * here.
 *
 * The sample has no JSX and no type annotations, so it is valid JavaScript even
 * though it is highlighted with the TypeScript grammar. Its badge therefore
 * reads `TS / JS`, which is exactly the distinction the badge exists to draw: a
 * grammar is a highlighting choice, a label is a claim about the source.
 */

/** Language the sample is highlighted with. */
export const HERO_SNIPPET_LANG = "ts";

/**
 * The sample, with the interpolations left in place.
 *
 * Every interpolation sits inside a string literal or a comment, so this text
 * parses as TypeScript on its own — which is what lets the page derive its badge
 * from the template instead of from a hand-written claim.
 */
export const HERO_SNIPPET_TEMPLATE = `import { createThemeRuntime } from "@themvora/core";

// Applied on this page right now: \${themeName}
const runtime = createThemeRuntime();

runtime.selection.setFamily("\${family}"); // swap the palette
runtime.selection.setMode("\${mode}");      // swap light/dark`;

/** The sample as it is displayed for a given family, mode and theme name. */
export function heroSnippet(
  family: string,
  mode: string,
  themeName: string,
): string {
  return HERO_SNIPPET_TEMPLATE.split("${themeName}")
    .join(themeName)
    .split("${family}")
    .join(family)
    .split("${mode}")
    .join(mode);
}
