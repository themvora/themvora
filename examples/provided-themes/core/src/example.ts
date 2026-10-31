import {
  defineTheme,
  normalizeProvidedThemes,
  resolveThemeOverride,
  resolveThemeReference,
  themeOverrideKey,
  type ThemeDefinition,
  type ThemeSelectionState,
} from "@themvora/core";

/**
 * A provider exposes exactly the themes it was given. Nothing is invented, and
 * nothing is merged across families: `meta.family` is the grouping key and
 * `meta.mode` is the variant within it.
 */
const mintLight = defineTheme({
  name: "mint-light",
  meta: { family: "mint", mode: "light", label: "Mint" },
  tokens: { colors: { background: "#f0fdf9", foreground: "#042f2e" } },
});

const mintDark = defineTheme({
  name: "mint-dark",
  meta: { family: "mint", mode: "dark", label: "Mint" },
  tokens: { colors: { background: "#042f2e", foreground: "#ccfbf1" } },
});

const cocoaLight = defineTheme({
  name: "cocoa-light",
  meta: { family: "cocoa", mode: "light", label: "Cocoa" },
  tokens: { colors: { background: "#fdf8f3", foreground: "#3b2314" } },
});

/** The collection a provider would be handed — order is the registration order. */
const themes: readonly ThemeDefinition[] = [mintLight, mintDark, cocoaLight];

/**
 * `normalizeProvidedThemes` groups the collection into families, keeping each
 * family's modes as siblings instead of flattening them. It preserves the input
 * order and never invents a family that has no theme behind it.
 */
const families = normalizeProvidedThemes(themes);

for (const family of families) {
  const modes = family.variants.map((variant) => variant.mode).join("+");
  const background = family.variants[0]?.tokens.colors?.background;
  console.log(`${family.family} → ${family.variants.length} variant(s) [${modes}], background ${background}`);
}

/**
 * A theme reference is resolved against the collection: a bare name resolves to
 * either one variant or a whole family, which is what lets `"mint"` mean "this
 * family" without the caller knowing how many modes it has.
 */
console.log("\nreference resolution:");
for (const reference of ["mint", "mint-dark", "nope"]) {
  const resolved = resolveThemeReference(themes, reference);
  console.log(`  ${reference.padEnd(10)} → ${resolved ? `${resolved.kind} ${resolved.family}` : "unresolved"}`);
}

/**
 * An override is a one-shot request that outranks a saved selection. It is
 * resolved against the collection and completed from the base selection, so a
 * partial request inherits the mode already in effect rather than guessing.
 *
 * The resolver validates what it can see — that the family exists and that the
 * mode is a real mode — and refuses anything else, because falling back to
 * "whichever theme came first" would apply a different theme than the one
 * asked for. It does not decide whether the registry actually has that variant;
 * that is the provider's resolution step.
 */
const base: ThemeSelectionState = { family: "mint", mode: "light" };

console.log("\noverride resolution against base mint/light:");
const overrides = [
  "cocoa-light", // a variant name: the variant keeps its own mode
  "cocoa", // a family name: the mode already in effect is kept
  { family: "cocoa" } as const, // same request, written the other way
  { family: "cocoa", mode: "dark" } as const, // both stated: the family exists
  { family: "nope" } as const, // no such family: refused, selection unchanged
] as const;

for (const override of overrides) {
  const resolved = resolveThemeOverride(themes, override, base);
  const label = typeof override === "string" ? override : JSON.stringify(override);
  console.log(`  ${label.padEnd(32)} → ${resolved ? `${resolved.family}/${resolved.mode}` : "ignored"}`);
}

/**
 * `themeOverrideKey` is the change-detection identity of an override. The two
 * spellings of the same request must produce the same key, otherwise an inline
 * `themeOverride={{ family: "cocoa" }}` rebuilt on every render would look like
 * a new request each time and re-assert itself over the visitor's own choice.
 */
console.log("\noverride keys:");
for (const override of overrides) {
  const label = typeof override === "string" ? override : JSON.stringify(override);
  console.log(`  ${label.padEnd(32)} → ${themeOverrideKey(override, themes) ?? "none"}`);
}
