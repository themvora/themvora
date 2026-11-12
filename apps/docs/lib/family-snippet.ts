/**
 * The theme-family snippet, in one place.
 *
 * The library page renders it under "Theme switching"; the package READMEs
 * render the same text under their own heading. Both read it from here, so a
 * change to the wording cannot land on one surface and miss the other — which
 * is exactly how a README and its documentation page drift apart.
 *
 * Framework coverage is deliberately narrow for the *snippet*: `useTheme()`
 * returns `{ family, setFamily }` in `@themvora/react` and in every integration
 * that re-exports it (`-next/client`, `-remix`, `-astro/client`). The Vue,
 * Svelte, Solid and Angular bindings expose the same capability under their own
 * idiom, so rather than invent syntax here, those readers are pointed at the
 * framework guide that documents the composable for that binding.
 */

export const FAMILY_SNIPPET_FRAMEWORKS = new Set([
  "React",
  "Next.js",
  "Remix",
  "Astro",
]);

export function familySnippet(label: string): string {
  if (FAMILY_SNIPPET_FRAMEWORKS.has(label)) {
    return `// The same hook carries the family and its setter.
const { family, setFamily } = useTheme();

// One control per family you ship. The literals are checked against your
// theme registry, so a family that does not exist is a compile error.
setFamily("mint"); // "plum" | "mint" | "berry" | "iris" | "citrus" | …`;
  }
  return `// The ${label} binding exposes the same capability through its own
// composable — see the ${label} framework guide for the exact call shape.`;
}

/** The framework's own language for the family snippet. */
export const FAMILY_SNIPPET_LANG: Record<string, string> = {
  React: "tsx",
  "Next.js": "tsx",
  Remix: "tsx",
  Astro: "tsx",
  "Vue 3": "ts",
  Nuxt: "ts",
  Svelte: "ts",
  Solid: "ts",
  Angular: "ts",
};
