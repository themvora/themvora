/**
 * The generation plugin — a thin runtime wrapper over `generateTheme`.
 *
 * It has **no formulas of its own**. Its only job is to let a caller generate a
 * theme from inside the plugin system: `seed → generateTheme() → apply`. That is
 * theme-generation.md §1's "one engine" rule at the plugin boundary — if this
 * file ever contains color math, the rule has been broken.
 *
 * @packageDocumentation
 */
import { ThemeError } from "../../errors";
import type { ThemeDefinition } from "../../model/theme";
import type { ThemePlugin } from "../types";
import {
  generateTheme,
  type GeneratedThemePair,
  type GenerateThemeOptions,
} from "../../generate-theme";

/**
 * Options for {@link createGenerationPlugin}.
 */
export interface GenerationPluginOptions {
  /** Default seed used by {@link GenerationPlugin.generate} when none is passed. */
  seed?: string;
  /** Default generation options, merged under any per-call overrides. */
  options?: Omit<GenerateThemeOptions, "seed">;
  /** Called with the resolved options each time a theme is generated. */
  onGenerate?: (options: GenerateThemeOptions) => void;
}

/**
 * A generation plugin: a normal {@link ThemePlugin} plus a `generate` entry point.
 */
export interface GenerationPlugin<T extends ThemeDefinition = ThemeDefinition>
  extends ThemePlugin<T> {
  /**
   * Generate a light/dark pair via `generateTheme`.
   *
   * @param options - Per-call overrides; merged over the plugin's defaults.
   * @returns The generated pair, exactly as `generateTheme` would return it.
   * @throws {ThemeError} When no seed is available.
   */
  generate(options?: GenerateThemeOptions): GeneratedThemePair;
}

/**
 * Creates a plugin that participates in theme generation.
 *
 * The plugin is inert until {@link GenerationPlugin.generate} is called: it
 * registers no tokens of its own and its `transformTokens` hook is the identity.
 * Generating goes through `generateTheme`, so the plugin and the runtime cannot
 * disagree about what a seed produces.
 *
 * @param options - Default seed, default generation options, and a hook.
 * @returns A `"theme-generation"` plugin with a `generate` method.
 *
 * @example
 * ```ts
 * const plugin = createGenerationPlugin({ seed: "#6366f1" });
 * const { light, dark } = plugin.generate({ family: "brand", style: "brand" });
 * ```
 *
 * @see {@link GenerationPluginOptions}
 */
export function createGenerationPlugin<T extends ThemeDefinition>(
  options?: GenerationPluginOptions,
): GenerationPlugin<T> {
  return {
    name: "theme-generation",
    version: "1.0.0",
    priority: 30,

    generate(override?: GenerateThemeOptions): GeneratedThemePair {
      const seed = override?.seed ?? options?.seed;
      if (seed === undefined) {
        throw new ThemeError(
          "createGenerationPlugin: no seed configured. Pass a seed to generate() or to the plugin options.",
          {
            context: {
              api: "createGenerationPlugin",
              property: "seed",
              expected: "a color string",
            },
          },
        );
      }

      const resolved: GenerateThemeOptions = {
        ...options?.options,
        ...override,
        seed,
      };

      options?.onGenerate?.(resolved);
      return generateTheme(resolved);
    },

    transformTokens(tokens) {
      return tokens;
    },
  };
}
