/**
 * "Did you mean …" suggestions for unknown registry values.
 *
 * Deliberately tiny: the canonical registries are small and fixed, so a plain
 * edit distance over the candidate ids is enough. There is no fuzzy-matching
 * dependency and no per-registry special case — a caller passes the candidate
 * list it already has.
 *
 * @packageDocumentation
 */

/** Levenshtein edit distance between two strings. */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let previous = Array.from({ length: cols }, (_, index) => index);

  for (let i = 1; i < rows; i++) {
    const current = [i];
    for (let j = 1; j < cols; j++) {
      const substitution = previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, substitution);
    }
    previous = current;
  }

  return previous[cols - 1]!;
}

/**
 * Pick the closest candidate to an unknown value.
 *
 * The tolerance scales with the input length so that a short typo (`mintt`) is
 * matched but an unrelated word (`banana`) is not silently corrected.
 *
 * @param value - What the user typed.
 * @param candidates - The canonical values to compare against.
 * @returns The closest candidate, or `undefined` when nothing is close enough.
 */
export function suggest(value: string, candidates: readonly string[]): string | undefined {
  const needle = value.trim().toLowerCase();
  if (needle.length === 0) return undefined;

  const tolerance = needle.length <= 3 ? 1 : Math.max(1, Math.floor(needle.length / 3));

  let best: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    // A prefix match is almost always what the user meant.
    if (lower.startsWith(needle) || needle.startsWith(lower)) return candidate;

    const distance = editDistance(needle, lower);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  return bestDistance <= tolerance ? best : undefined;
}

/**
 * Format a suggestion as a trailing clause.
 *
 * @param value - What the user typed.
 * @param candidates - The canonical values.
 * @returns ` — did you mean "mint"?`, or an empty string.
 */
export function suggestionSuffix(value: string, candidates: readonly string[]): string {
  const match = suggest(value, candidates);
  return match ? ` — did you mean "${match}"?` : "";
}
