/**
 * Tailwind's build-time dependencies.
 *
 * One version, one place. The starter is generated, not hand-edited, so the
 * range it records has to be chosen by the CLI — and choosing it here rather
 * than letting `add` resolve "latest" is what keeps a generated app on the
 * Tailwind v4 line that `@themvora/tailwind` declares as its peer range.
 *
 * The plugin is the only difference between the frameworks: Vite-based
 * integrations register `@tailwindcss/vite`, Next.js goes through PostCSS.
 *
 * @packageDocumentation
 */

/**
 * The Tailwind version the generated apps target.
 *
 * Tailwind v4 is what `@themvora/tailwind` supports (`peerDependencies:
 * tailwindcss ^4.0.0`), and `^4.3.3` is the line this repository's own example
 * apps build against. A caret range keeps patch and minor upgrades available
 * without ever crossing into a different major.
 */
export const TAILWIND_VERSION = "^4.3.3";

/** Build-time dependencies for a Vite-based integration. */
export const TAILWIND_VITE_DEV_DEPENDENCIES: Readonly<Record<string, string>> = {
  "@tailwindcss/vite": TAILWIND_VERSION,
  tailwindcss: TAILWIND_VERSION,
};

/** Build-time dependencies for the Next.js integration. */
export const TAILWIND_POSTCSS_DEV_DEPENDENCIES: Readonly<Record<string, string>> = {
  "@tailwindcss/postcss": TAILWIND_VERSION,
  tailwindcss: TAILWIND_VERSION,
};
