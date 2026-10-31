/**
 * Seed-colour input normalisation.
 *
 * The extension accepts the same seed form the CLI's `generate --seed` accepts —
 * a six-digit hex colour — and additionally tolerates a missing `#`, because an
 * input box is not a shell and rejecting `4f46e5` there would be pedantry rather
 * than safety. Everything is normalised to `#rrggbb` before it reaches core, so
 * the two entry points produce identical themes for identical input.
 *
 * Deliberately narrower than `generateTheme()`, which also parses `rgb()` and
 * `hsl()`. Those are valid for a programmatic caller but poor affordances in a
 * one-line prompt: the user cannot see what they will get, and a typo surfaces as
 * a thrown `ThemeError` instead of an inline hint.
 *
 * @packageDocumentation
 */

/** What the input box asks for. */
export const SEED_PROMPT = "Enter a hex colour to generate a light/dark pair from";

/** The example shown in the input box. */
export const SEED_PLACEHOLDER = "#4f46e5";

/** The inline message shown while the value is not a usable seed. */
export const SEED_VALIDATION_MESSAGE = "Use a 6-digit hex colour, for example #4f46e5";

/** A six-digit hex colour, with or without the leading `#`. */
const SEED_PATTERN = /^#?[0-9a-fA-F]{6}$/;

/**
 * Normalise a seed to the `#rrggbb` form core expects.
 *
 * @param input - Whatever the user typed.
 * @returns The normalised seed, or `null` when the input is not a seed.
 */
export function normaliseSeed(input: string): string | null {
  const trimmed = input.trim();
  if (!SEED_PATTERN.test(trimmed)) return null;

  const digits = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  return `#${digits.toLowerCase()}`;
}

/**
 * Whether an input is a usable seed.
 *
 * @param input - Whatever the user typed.
 * @returns `true` when {@link normaliseSeed} would succeed.
 */
export function isValidSeed(input: string): boolean {
  return normaliseSeed(input) !== null;
}
