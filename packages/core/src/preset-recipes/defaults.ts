/**
 * The nine curated default preset recipes.
 *
 * Each recipe states a *visual character* — seed, style, radius — and lets the
 * generator resolve the tokens. Nothing here names a resolved token value, which
 * is what keeps the presets from drifting away from the generator's contrast and
 * relationship guarantees.
 *
 * The styles are deliberately spread across all six so the preset gallery
 * demonstrates the range of the system rather than nine variations of `balanced`.
 *
 * @packageDocumentation
 */
import type { ThemePresetRecipe } from "./recipe";

/**
 * The default presets, in gallery order.
 */
export const DEFAULT_PRESET_RECIPES: readonly ThemePresetRecipe[] = [
  {
    id: "oat",
    name: "Oat",
    family: "oat",
    kind: "default",
    seed: "#b45309",
    style: "soft",
    radius: "12px",
    metadata: {
      description: "Warm · Soft · Neutral",
      tags: ["warm", "soft", "neutral"],
    },
  },
  {
    id: "berry",
    name: "Berry",
    family: "berry",
    kind: "default",
    seed: "#db2777",
    style: "vibrant",
    radius: "16px",
    metadata: {
      description: "Warm · Vibrant",
      tags: ["warm", "vibrant"],
    },
  },
  {
    id: "mint",
    name: "Mint",
    family: "mint",
    kind: "default",
    seed: "#059669",
    style: "soft",
    radius: "18px",
    metadata: {
      description: "Cool · Soft · Restrained",
      tags: ["cool", "soft", "restrained"],
    },
  },
  {
    id: "citrus",
    name: "Citrus",
    family: "citrus",
    kind: "default",
    seed: "#d97706",
    style: "vibrant",
    radius: "18px",
    metadata: {
      description: "Warm · Vibrant · Bright",
      tags: ["warm", "vibrant", "bright"],
    },
  },
  {
    id: "cocoa",
    name: "Cocoa",
    family: "cocoa",
    kind: "default",
    seed: "#92400e",
    style: "editorial",
    radius: "14px",
    metadata: {
      description: "Warm · Deep · Editorial",
      tags: ["warm", "deep", "editorial"],
    },
  },
  {
    id: "plum",
    name: "Plum",
    family: "plum",
    kind: "default",
    seed: "#7c3aed",
    style: "editorial",
    radius: "18px",
    metadata: {
      description: "Violet · Editorial",
      tags: ["violet", "editorial"],
    },
  },
  {
    id: "iris",
    name: "Iris",
    family: "iris",
    kind: "default",
    seed: "#6366f1",
    style: "balanced",
    radius: "16px",
    metadata: {
      description: "Cool · Balanced",
      tags: ["cool", "balanced"],
    },
  },
  {
    id: "sky",
    name: "Sky",
    family: "sky",
    kind: "default",
    seed: "#0ea5e9",
    style: "soft",
    radius: "18px",
    metadata: {
      description: "Cool · Soft · Airy",
      tags: ["cool", "soft", "airy"],
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    family: "graphite",
    kind: "default",
    seed: "#52525b",
    style: "minimal",
    radius: "14px",
    metadata: {
      description: "Neutral · Minimal",
      tags: ["neutral", "minimal"],
    },
  },
];
