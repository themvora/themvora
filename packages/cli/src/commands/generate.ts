import {
  GENERATION_STYLE_NAMES,
  generateTheme,
  type GenerationStyle,
  type ThemeDefinition,
} from "@themvora/core";

import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { getBool, getString } from "../utils.js";
import type { ParsedArgs } from "../utils.js";
import { UsageError } from "../exit-codes.js";

import {
  listBrands,
  listPresets,
  resolveEntryThemes,
  type RegistryKind,
} from "../registry.js";

import { suggestionSuffix } from "../suggest.js";
import { status } from "../output.js";

/** The emitted shape: a single theme, or a light/dark pair. */
type EmittedTheme =
  ThemeDefinition | { light: ThemeDefinition; dark: ThemeDefinition };

/** A resolved generation source, ready to emit. */
interface ResolvedSource {
  light: ThemeDefinition;
  dark: ThemeDefinition;
  /** How the theme was produced, for the file-write status line. */
  origin: string;
}

/**
 * Resolve a canonical registry entry into a light/dark pair.
 *
 * The themes come from the catalog, so `--preset mint` emits exactly the preset
 * the docs page renders — the CLI never re-derives a recipe.
 *
 * @param kind - Which registry the identifier belongs to.
 * @param value - The identifier the user typed.
 * @returns The resolved pair.
 * @throws {UsageError} When the identifier is not in the registry.
 */
function resolveRegistrySource(
  kind: RegistryKind,
  value: string,
): ResolvedSource {
  const resolved = resolveEntryThemes(kind, value);

  if (!resolved) {
    const candidates = (kind === "brand" ? listBrands() : listPresets()).map(
      (entry) => entry.id,
    );
    throw new UsageError(
      `unknown ${kind} "${value}"${suggestionSuffix(value, candidates)} — ` +
        `run "themvora list ${kind}s" to see the available ${kind}s`,
    );
  }

  return {
    light: resolved.light,
    dark: resolved.dark,
    origin: `${kind} "${resolved.entry.id}" (style ${resolved.entry.style})`,
  };
}

/**
 * Implements the `generate` command.
 *
 * Generates a theme (or a light/dark pair) from one of three mutually exclusive
 * sources — a seed color, a canonical preset, or a brand-inspired recipe — and
 * prints it as JSON or writes it to a file.
 *
 * Reads `--seed`/`-s`, `--preset`, `--brand`, `--family`/`-f`, `--mode`/`-m`,
 * `--style`, `--contrast`, `--code`/`--with-code`, `--output`/`-o` and
 * `--dry-run`. A bare positional argument is treated as a seed color, which is
 * the original spelling.
 *
 * @param args The parsed command-line arguments.
 * @throws {UsageError} When more than one source is given, or a value is invalid.
 *
 * @see {@link parseArgs}
 */
export async function cmdGenerate(args: ParsedArgs) {
  const seedFlag = getString(args, "seed") ?? getString(args, "s");
  const presetFlag = getString(args, "preset");
  const brandFlag = getString(args, "brand");
  const positionalSeed = args._[1];
  const familyFlag = getString(args, "family") ?? getString(args, "f");
  const mode = (
    getString(args, "mode") ??
    getString(args, "m") ??
    "both"
  ).toLowerCase();
  const style = getString(args, "style");
  const contrast = getString(args, "contrast");
  const withCode = getBool(args, "code") || getBool(args, "with-code");
  const output = getString(args, "output") ?? getString(args, "o") ?? null;
  const dryRun = getBool(args, "dry-run");

  // --- source exclusivity ----------------------------------------------------
  const sources = [
    seedFlag !== undefined ? "--seed" : null,
    presetFlag !== undefined ? "--preset" : null,
    brandFlag !== undefined ? "--brand" : null,
    positionalSeed !== undefined ? "the positional seed argument" : null,
  ].filter((value): value is string => value !== null);

  if (sources.length > 1) {
    throw new UsageError(
      `only one theme source may be given — received ${sources.join(" and ")}. ` +
        "Use --seed, --preset, or --brand.",
    );
  }

  const registryKind: RegistryKind | null =
    presetFlag !== undefined
      ? "preset"
      : brandFlag !== undefined
        ? "brand"
        : null;
  const registryValue = presetFlag ?? brandFlag ?? null;

  // --- option validity -------------------------------------------------------
  if (mode !== "light" && mode !== "dark" && mode !== "both") {
    throw new UsageError(
      `invalid mode "${mode}"${suggestionSuffix(mode, ["light", "dark", "both"])} — ` +
        'use "light", "dark", or "both"',
    );
  }

  if (
    style !== undefined &&
    !(GENERATION_STYLE_NAMES as readonly string[]).includes(style)
  ) {
    throw new UsageError(
      `invalid style "${style}"${suggestionSuffix(style, GENERATION_STYLE_NAMES)} — ` +
        `run "themvora list styles" to see the available styles`,
    );
  }

  if (contrast !== undefined && contrast !== "AA") {
    throw new UsageError(
      `invalid contrast "${contrast}" — only "AA" is supported`,
    );
  }

  // --- resolve the source ----------------------------------------------------
  let resolved: ResolvedSource;

  if (registryKind !== null && registryValue !== null) {
    // Resolve first, so an unknown identifier is reported as such rather than as
    // whatever option conflict happens to be checked first.
    resolved = resolveRegistrySource(registryKind, registryValue);

    // A recipe pins its own family, style and curated tokens, so the seed-only
    // options are rejected rather than silently ignored. Silently ignoring them
    // is how a user ends up believing they generated something they did not.
    if (style !== undefined) {
      throw new UsageError(
        `--style cannot be combined with --${registryKind} — a ${registryKind} recipe pins its own ` +
          "style. Use --seed with --style to generate from a colour instead.",
      );
    }
    if (withCode) {
      throw new UsageError(
        `--code cannot be combined with --${registryKind} — a ${registryKind} recipe ships curated ` +
          "tokens and has no generated syntax palette. Use --seed with --code instead.",
      );
    }
    if (familyFlag !== undefined) {
      throw new UsageError(
        `--family cannot be combined with --${registryKind} — the ${registryKind}'s own family is ` +
          `"${resolved.light.meta?.family ?? registryValue}". ` +
          "Use --seed with --family to name a generated theme.",
      );
    }
  } else {
    const seed = seedFlag ?? positionalSeed ?? "#6366f1";

    if (!seed.startsWith("#") || seed.length !== 7) {
      throw new UsageError("seed must be a hex color (e.g. #6366f1)");
    }

    const family = familyFlag ?? "default";
    const pair = generateTheme({
      seed,
      family,
      withCode,
      ...(style !== undefined ? { style: style as GenerationStyle } : {}),
      ...(contrast !== undefined ? { contrast: "AA" as const } : {}),
    });

    resolved = { light: pair.light, dark: pair.dark, origin: `seed ${seed}` };
  }

  // --- emit ------------------------------------------------------------------
  const emitted: EmittedTheme =
    mode === "both"
      ? { light: resolved.light, dark: resolved.dark }
      : mode === "dark"
        ? resolved.dark
        : resolved.light;

  const json = JSON.stringify(emitted, null, 2);

  if (output === null) {
    process.stdout.write(`${json}\n`);
    return;
  }

  if (dryRun) {
    const action = existsSync(output) ? "would overwrite" : "would write";
    status(
      `${action} ${output} (${Buffer.byteLength(json)} bytes, ${resolved.origin})`,
    );
    process.stdout.write(`${json}\n`);
    return;
  }

  await writeFile(output, json, "utf-8");
  // Status goes to stderr: stdout stays free for a payload, so the command can
  // be piped or captured without the confirmation line contaminating it.
  status(`Theme written to ${output}`);
}
