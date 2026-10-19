/**
 * Theme source resolution for `init` and `add`.
 *
 * A theme source is one of four things, and all four resolve to the *same*
 * thing: a list of `ThemeDefinition` objects the framework provider can consume.
 * There is no `init`-specific theme model — the neutral source returns core's
 * built-in themes, a preset or brand returns the catalog's already-resolved
 * themes, and a seed goes through `generateTheme`. Nothing here constructs a
 * colour.
 *
 * Sources are **encodable**, and that is what makes `add` possible without
 * parsing TypeScript. A generated registry file records the sources it was built
 * from in a machine-readable header line; `add` decodes that list, appends its
 * own source, and regenerates the file. The alternative — reading the theme
 * objects back out of the generated source — would mean parsing the very file
 * the CLI wrote, which breaks the moment a user reformats it.
 *
 * @packageDocumentation
 */
import {
  generateTheme,
  getBuiltInThemes,
  validateTheme,
  type ThemeDefinition,
} from "@themvora/core";
import { resolveEntryThemes, type RegistryKind } from "../registry.js";
import type { InitSourceSummary } from "./types.js";

/** What the user asked for. Exactly one branch is taken. */
export type SourceRequest =
  | { kind: "neutral" }
  | { kind: "preset"; id: string }
  | { kind: "brand"; id: string }
  | { kind: "seed"; seed: string; family?: string; style?: string };

/** A resolved source: what to register, and how to describe it. */
export interface ResolvedSource {
  /** The summary the plan carries. */
  summary: InitSourceSummary;
  /** The themes to register, in source order. */
  themes: ThemeDefinition[];
  /** Validation problems, empty when the source is sound. */
  problems: readonly string[];
}

/** The marker that introduces the source list in a generated file. */
export const SOURCES_MARKER = "themvora:sources:";

/**
 * Encode a source request as a single JSON object.
 *
 * @param request - The request to encode.
 * @returns A compact JSON string, safe on one comment line.
 */
export function encodeSource(request: SourceRequest): string {
  return JSON.stringify(request);
}

/**
 * Decode a source request.
 *
 * @param encoded - The JSON produced by {@link encodeSource}.
 * @returns The request, or `null` when the value is not a source this version
 *   understands — a file written by a newer CLI, for instance.
 */
export function decodeSource(encoded: string): SourceRequest | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(encoded);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  const kind = record["kind"];

  if (kind === "neutral") return { kind: "neutral" };
  if (kind === "preset" && typeof record["id"] === "string") {
    return { kind: "preset", id: record["id"] };
  }
  if (kind === "brand" && typeof record["id"] === "string") {
    return { kind: "brand", id: record["id"] };
  }
  if (kind === "seed" && typeof record["seed"] === "string") {
    return {
      kind: "seed",
      seed: record["seed"],
      ...(typeof record["family"] === "string"
        ? { family: record["family"] }
        : {}),
      ...(typeof record["style"] === "string"
        ? { style: record["style"] }
        : {}),
    };
  }
  return null;
}

/**
 * Read the source list out of a generated file's contents.
 *
 * @param contents - The file's text.
 * @returns The decoded requests, and the raw strings that could not be decoded.
 *
 * @remarks
 * An undecodable entry is returned rather than dropped: silently ignoring one
 * would make `add` rewrite the registry and quietly lose a theme.
 */
export function readSources(contents: string): {
  requests: SourceRequest[];
  unknown: string[];
} {
  const line = contents
    .split("\n")
    .find((candidate) => candidate.includes(SOURCES_MARKER));
  if (line === undefined) return { requests: [], unknown: [] };

  const raw = line
    .slice(line.indexOf(SOURCES_MARKER) + SOURCES_MARKER.length)
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { requests: [], unknown: [raw] };
  }
  if (!Array.isArray(parsed)) return { requests: [], unknown: [raw] };

  const requests: SourceRequest[] = [];
  const unknown: string[] = [];
  for (const entry of parsed) {
    const decoded = typeof entry === "string" ? decodeSource(entry) : null;
    if (decoded) requests.push(decoded);
    else unknown.push(String(entry));
  }
  return { requests, unknown };
}

/**
 * The comment line a generated file carries.
 *
 * @param sources - The encoded sources.
 * @returns The line, without a comment prefix — the renderer adds that.
 */
export function renderSourcesLine(sources: readonly string[]): string {
  return `${SOURCES_MARKER} ${JSON.stringify(sources)}`;
}

/**
 * Validate every theme in a source.
 *
 * @param themes - The themes to check.
 * @returns One message per problem, empty when all themes validate.
 *
 * @remarks
 * The plan requires the generated theme to be validated before the project is
 * declared complete. Doing it during resolution rather than after `apply` means
 * a broken source fails *before* anything is written, which is the difference
 * between a clean refusal and a half-integrated project.
 */
function validateThemes(themes: readonly ThemeDefinition[]): string[] {
  const problems: string[] = [];
  for (const theme of themes) {
    const result = validateTheme(theme);
    if (!result.valid) {
      for (const issue of result.issues) {
        problems.push(`${theme.name}: ${issue.message}`);
      }
    }
  }
  return problems;
}

/** Resolve one request to its themes and a display label. */
function resolveOne(request: SourceRequest): {
  label: string;
  themes: ThemeDefinition[];
} {
  if (request.kind === "neutral") {
    // The built-in neutral pair, and only that pair. Registering all 34
    // built-ins would make a "minimal" starter ship every recipe Themvora
    // publishes, which is the opposite of minimal.
    const themes = getBuiltInThemes().filter(
      (theme) => theme.name === "light" || theme.name === "dark",
    ) as ThemeDefinition[];
    return { label: "built-in neutral", themes };
  }

  if (request.kind === "seed") {
    const generated = generateTheme({
      seed: request.seed,
      ...(request.family !== undefined ? { family: request.family } : {}),
      ...(request.style !== undefined ? { style: request.style as never } : {}),
    });
    return {
      label: `seed ${request.seed}`,
      themes: [generated.light, generated.dark],
    };
  }

  const registryKind: RegistryKind =
    request.kind === "brand" ? "brand" : "preset";
  const resolved = resolveEntryThemes(registryKind, request.id);
  if (!resolved) {
    throw new Error(`unknown ${registryKind} "${request.id}"`);
  }
  return {
    label: `${registryKind} ${resolved.entry.id}`,
    themes: [resolved.light, resolved.dark],
  };
}

/**
 * Resolve a list of theme sources into one registerable set.
 *
 * @param requests - The sources, in the order they should appear in the registry.
 * @returns The merged themes, their summary, and any validation problems.
 *
 * @throws {Error} When a named preset or brand does not exist, or a seed is not
 *   a colour `generateTheme` accepts. Both are user-input errors the caller
 *   turns into a usage or runtime failure.
 *
 * @remarks
 * The first source's default theme becomes the registry default, so the theme an
 * app opens with never changes when a second source is added.
 */
export function resolveSources(
  requests: readonly SourceRequest[],
): ResolvedSource {
  if (requests.length === 0) {
    throw new Error("at least one theme source is required");
  }

  const parts = requests.map(resolveOne);
  const themes = parts.flatMap((part) => part.themes);

  const duplicate = themes
    .map((theme) => theme.name)
    .find((name, index, names) => names.indexOf(name) !== index);
  if (duplicate !== undefined) {
    throw new Error(
      `two sources both register a theme named "${duplicate}" — remove one of them`,
    );
  }

  return {
    summary: {
      sources: requests.map(encodeSource),
      label: parts.map((part) => part.label).join(" + "),
      family: themes[0]?.meta?.family ?? "default",
      defaultTheme: themes[0]?.name ?? "light",
      themes: themes.map((theme) => theme.name),
      modes: ["light", "dark"],
    },
    themes,
    problems: validateThemes(themes),
  };
}

/**
 * Resolve a single theme source request.
 *
 * @param request - Which source the user asked for.
 * @returns The themes, their summary, and any validation problems.
 */
export function resolveSource(request: SourceRequest): ResolvedSource {
  return resolveSources([request]);
}
