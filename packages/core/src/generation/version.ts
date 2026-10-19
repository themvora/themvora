/**
 * Generation algorithm versioning.
 *
 * The generation algorithm version is deliberately **separate** from the theme
 * schema version and from the package version. A theme's token shape can stay
 * identical while the algorithm that produced it improves; shipping `semantic-v3`
 * must not silently rewrite every theme a consumer already generated.
 *
 * theme-generation.md Phase 6.
 *
 * @packageDocumentation
 */
import { ThemeError } from "../errors";

/** The generation algorithm shipped today. */
export const GENERATION_ALGORITHM = "semantic-v2" as const;

/** A generation algorithm identifier. */
export type GenerationAlgorithm = typeof GENERATION_ALGORITHM;

/** Every algorithm this build can produce. */
export const SUPPORTED_GENERATION_ALGORITHMS: readonly GenerationAlgorithm[] = [
  GENERATION_ALGORITHM,
];

/**
 * Resolve a requested algorithm to one that is implemented.
 *
 * Omitting the request yields the current algorithm, which is what keeps existing
 * `generateTheme({ seed, family })` calls working unchanged.
 *
 * @param requested - The algorithm requested by the caller, if any.
 * @returns The algorithm to run.
 * @throws {ThemeError} When the requested algorithm is not implemented.
 */
export function resolveGenerationAlgorithm(requested?: string): GenerationAlgorithm {
  if (requested === undefined) return GENERATION_ALGORITHM;
  if ((SUPPORTED_GENERATION_ALGORITHMS as readonly string[]).includes(requested)) {
    return requested as GenerationAlgorithm;
  }

  throw new ThemeError(
    `Unknown generation algorithm "${requested}". Supported: ${SUPPORTED_GENERATION_ALGORITHMS.join(", ")}.`,
    {
      context: {
        api: "generateTheme",
        property: "algorithm",
        received: requested,
        expected: SUPPORTED_GENERATION_ALGORITHMS.join(" | "),
      },
    },
  );
}
