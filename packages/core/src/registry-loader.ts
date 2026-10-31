/**
 * Read a generated `themes.ts` without executing it.
 *
 * `themvora init` writes a TypeScript module, and that module is the canonical
 * theme registry — there is no JSON equivalent a consumer can read instead. Any
 * consumer that wants the themes has to understand the file, and the only safe
 * way to do that is to read the source rather than run it: executing a workspace
 * module is arbitrary code execution, and no editor or CI step should require it
 * to show a colour.
 *
 * What makes this tractable is that the generated module is **data with
 * references**, not computation:
 *
 * - every theme is a `defineTheme({ … })` call whose argument is an object
 *   literal — hand-written for the default pair, `JSON.stringify` output for
 *   inlined themes — so both are plain literals once parsed;
 * - the preset families are a string literal in `selection`;
 * - `presetThemes` is `getPresetThemes()` filtered by that literal, which this
 *   loader reproduces by calling the same catalog.
 *
 * So the loader parses literals and resolves references. It is **not** a
 * TypeScript interpreter: an object literal reader is enough, and anything
 * outside that shape — a computed value, a spread, a call as a value — is
 * reported as `unsupported-construct` rather than guessed at.
 *
 * @packageDocumentation
 */

import type { ThemeDefinition } from "./model/theme.js";
import { generateTheme } from "./generate-theme.js";
import { getBrandPresets } from "./brand-presets.js";
import { getBuiltInThemes } from "./built-in-themes.js";
import { getPresetThemes } from "./preset-themes.js";
import { validateTheme } from "./validate-theme.js";

/** A position in the source, 1-based, for an error message. */
export interface RegistrySourceLocation {
  /** Line number, 1-based. */
  readonly line: number;
  /** Column number, 1-based. */
  readonly column: number;
}

/** Why a registry could not be read. */
export type RegistryFailureReason =
  /** The file is not a generated theme registry. */
  | "not-a-registry"
  /** It is one, but uses a construct this loader does not interpret. */
  | "unsupported-construct"
  /** A theme literal parsed, but does not satisfy the theme schema. */
  | "invalid-theme";

/** Which canonical API produced a theme. */
export type ThemeDefinitionOrigin = "definition" | "generated" | "catalog";

/** The statically readable inputs of a `generateTheme()` call. */
export interface ThemeGenerationInput {
  readonly seed: string;
  readonly family?: string;
  readonly withCode?: boolean;
  readonly style?: string;
  readonly contrast?: string;
  readonly algorithm?: string;
}

/** A registry that was read. */
export interface RegistryLoadSuccess {
  /** Discriminant. */
  readonly ok: true;
  /** Every theme the module registers, in the module's own order. */
  readonly themes: readonly ThemeDefinition[];
  /**
   * The provenance of each theme, aligned with `themes`.
   *
   * A generated registry combines its own definitions with the preset families
   * in `selection`, so the combined list alone cannot tell a project's theme
   * from a curated preset. This does.
   */
  readonly origins: readonly ThemeDefinitionOrigin[];
  /** The families the module selects. */
  readonly selection: readonly string[];
  /** The theme the application opens with, when the module records one. */
  readonly defaultTheme?: string;
}

/** A registry that could not be read, and why. */
export interface RegistryLoadFailure {
  /** Discriminant. */
  readonly ok: false;
  /** Category, for callers that branch. */
  readonly reason: RegistryFailureReason;
  /** A sentence naming what was wrong and where. */
  readonly message: string;
  /** Where in the source, when a position is known. */
  readonly location?: RegistrySourceLocation;
}

/** The outcome of reading a registry. */
export type RegistryLoadResult = RegistryLoadSuccess | RegistryLoadFailure;

/** A parsed literal, or why it could not be read. */
type Parsed<T> =
  | { readonly ok: true; readonly value: T; readonly end: number }
  | { readonly ok: false; readonly message: string; readonly index: number };

/**
 * Convert an offset to a 1-based line and column.
 *
 * @param source - The whole source.
 * @param offset - The offset to convert.
 * @returns The position.
 */
function positionOf(source: string, offset: number): RegistrySourceLocation {
  const before = source.slice(0, Math.max(0, offset));
  const lines = before.split("\n");
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

/**
 * Skip whitespace and comments.
 *
 * @param source - The source.
 * @param index - Where to start.
 * @returns The index of the first significant character.
 */
function skipTrivia(source: string, index: number): number {
  let cursor = index;

  for (;;) {
    const character = source[cursor];

    if (character === undefined) return cursor;
    if (/\s/u.test(character)) {
      cursor += 1;
      continue;
    }

    if (character === "/" && source[cursor + 1] === "/") {
      const end = source.indexOf("\n", cursor);
      cursor = end === -1 ? source.length : end + 1;
      continue;
    }

    if (character === "/" && source[cursor + 1] === "*") {
      const end = source.indexOf("*/", cursor + 2);
      cursor = end === -1 ? source.length : end + 2;
      continue;
    }

    return cursor;
  }
}

/**
 * Read a quoted string literal.
 *
 * @param source - The source.
 * @param index - The index of the opening quote.
 * @returns The decoded string, or a failure for a template with interpolation.
 */
function readString(source: string, index: number): Parsed<string> {
  const quote = source[index] as string;
  let cursor = index + 1;
  let value = "";

  while (cursor < source.length) {
    const character = source[cursor];

    if (character === "\\") {
      const escaped = source[cursor + 1];
      // Enough for the escapes a theme can contain; anything exotic is refused.
      const table: Record<string, string> = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f" };
      value += escaped === undefined ? "" : (table[escaped] ?? escaped);
      cursor += 2;
      continue;
    }

    if (character === quote) return { ok: true, value, end: cursor + 1 };

    // A template with `${` is computation, not a literal.
    if (quote === "`" && character === "$" && source[cursor + 1] === "{") {
      return { ok: false, message: "A template literal uses interpolation.", index: cursor };
    }

    value += character;
    cursor += 1;
  }

  return { ok: false, message: "A string literal is not closed.", index };
}

/**
 * Read a number literal.
 *
 * @param source - The source.
 * @param index - The first character.
 * @returns The number.
 */
function readNumber(source: string, index: number): Parsed<number> {
  const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(source.slice(index));
  if (match === null) {
    return { ok: false, message: "Expected a number.", index };
  }
  return { ok: true, value: Number(match[0]), end: index + match[0].length };
}

/**
 * Read an object key: a bare identifier or a quoted string.
 *
 * @param source - The source.
 * @param index - Where to start.
 * @returns The key name and the index after it.
 */
function readKey(source: string, index: number): Parsed<string> {
  const character = source[index];

  if (character === '"' || character === "'") return readString(source, index);

  const match = /^[A-Za-z_$][\w$]*/u.exec(source.slice(index));
  if (match === null) {
    return { ok: false, message: "Expected an object key.", index };
  }
  return { ok: true, value: match[0], end: index + match[0].length };
}

/**
 * Read one literal value.
 *
 * Supports strings, numbers, booleans, `null`, arrays and objects. Everything
 * else — identifiers, calls, spreads, operators — is refused, which is what
 * keeps this a reader rather than an interpreter.
 *
 * @param source - The source.
 * @param index - Where to start.
 * @returns The value and the index after it.
 */
function readValue(source: string, index: number): Parsed<unknown> {
  const start = skipTrivia(source, index);
  const character = source[start];

  if (character === undefined) {
    return { ok: false, message: "Expected a value.", index: start };
  }

  if (character === '"' || character === "'" || character === "`") {
    return readString(source, start);
  }

  if (character === "-" || /[0-9]/u.test(character)) return readNumber(source, start);

  if (source.startsWith("true", start)) return { ok: true, value: true, end: start + 4 };
  if (source.startsWith("false", start)) return { ok: true, value: false, end: start + 5 };
  if (source.startsWith("null", start)) return { ok: true, value: null, end: start + 4 };

  if (character === "[") return readArray(source, start);
  if (character === "{") return readObject(source, start);

  return {
    ok: false,
    message: `Expected a literal value, found "${character}".`,
    index: start,
  };
}

/**
 * Read an array of literal values.
 *
 * @param source - The source.
 * @param index - The index of `[`.
 * @returns The array and the index after `]`.
 */
function readArray(source: string, index: number): Parsed<unknown[]> {
  const values: unknown[] = [];
  let cursor = skipTrivia(source, index + 1);

  if (source[cursor] === "]") return { ok: true, value: values, end: cursor + 1 };

  for (;;) {
    const item = readValue(source, cursor);
    if (!item.ok) return item;

    values.push(item.value);
    cursor = skipTrivia(source, item.end);

    if (source[cursor] === ",") {
      cursor = skipTrivia(source, cursor + 1);
      // A trailing comma before `]` is allowed, as in the generated source.
      if (source[cursor] === "]") return { ok: true, value: values, end: cursor + 1 };
      continue;
    }

    if (source[cursor] === "]") return { ok: true, value: values, end: cursor + 1 };

    return { ok: false, message: "Expected ',' or ']' in an array literal.", index: cursor };
  }
}

/**
 * Read an object of literal values.
 *
 * @param source - The source.
 * @param index - The index of `{`.
 * @returns The object and the index after `}`.
 */
function readObject(source: string, index: number): Parsed<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  let cursor = skipTrivia(source, index + 1);

  if (source[cursor] === "}") return { ok: true, value: result, end: cursor + 1 };

  for (;;) {
    const key = readKey(source, cursor);
    if (!key.ok) return key;

    cursor = skipTrivia(source, key.end);
    if (source[cursor] !== ":") {
      return { ok: false, message: "Expected ':' after an object key.", index: cursor };
    }

    const value = readValue(source, cursor + 1);
    if (!value.ok) return value;

    result[key.value] = value.value;
    cursor = skipTrivia(source, value.end);

    if (source[cursor] === ",") {
      cursor = skipTrivia(source, cursor + 1);
      if (source[cursor] === "}") return { ok: true, value: result, end: cursor + 1 };
      continue;
    }

    if (source[cursor] === "}") return { ok: true, value: result, end: cursor + 1 };

    return { ok: false, message: "Expected ',' or '}' in an object literal.", index: cursor };
  }
}

/**
 * Locate an exported binding's value.
 *
 * @param source - The whole module.
 * @param name - The exported identifier.
 * @returns The index of the value, or `null` when the export is absent.
 */
function findExportValue(source: string, name: string): number | null {
  const pattern = new RegExp(`export\\s+const\\s+${name}\\b[^=]*=`, "u");
  const match = pattern.exec(source);
  if (match === null) return null;
  return skipTrivia(source, match.index + match[0].length);
}

/**
 * Extract every `defineTheme({ … })` literal inside a slice of source.
 *
 * @param source - The whole module, for positions.
 * @param from - Where the slice starts.
 * @param to - Where the slice ends.
 * @returns The parsed themes, or a failure describing the first bad literal.
 */
function readDefineThemes(
  source: string,
  from: number,
  to: number,
): { themes: ThemeDefinition[] } | RegistryLoadFailure {
  const themes: ThemeDefinition[] = [];
  const slice = source.slice(from, to);
  const pattern = /defineTheme\s*\(/gu;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(slice)) !== null) {
    const argumentStart = from + match.index + match[0].length;
    const parsed = readValue(source, argumentStart);

    if (!parsed.ok) {
      return {
        ok: false,
        reason: "unsupported-construct",
        message: `A defineTheme(...) argument is not an object literal: ${parsed.message}`,
        location: positionOf(source, parsed.index),
      };
    }

    if (typeof parsed.value !== "object" || parsed.value === null || Array.isArray(parsed.value)) {
      return {
        ok: false,
        reason: "unsupported-construct",
        message: "A defineTheme(...) argument is not an object literal.",
        location: positionOf(source, argumentStart),
      };
    }

    themes.push(parsed.value as ThemeDefinition);

    // Continue after the literal, so a nested `defineTheme` in a string cannot
    // be mistaken for a theme.
    pattern.lastIndex = parsed.end - from;
  }

  return { themes };
}

/**
 * The catalog functions a source file may call, and what each returns.
 *
 * Three catalogs, not one: `getPresetThemes` is the curated set,
 * `getBrandPresets` the brand-inspired set, and `getBuiltInThemes` everything
 * shipped. A file that calls one of them has themes without listing them.
 */
const CATALOG_CALLS: readonly { readonly name: string; readonly themes: () => readonly ThemeDefinition[] }[] = [
  { name: "getPresetThemes", themes: () => getPresetThemes() },
  { name: "getBrandPresets", themes: () => getBrandPresets() },
  { name: "getBuiltInThemes", themes: () => getBuiltInThemes() },
];

/** A theme definition found in source, with where it starts. */
export interface ThemeDefinitionSource {
  /** The definition, as `defineTheme()` would return it. */
  readonly theme: ThemeDefinition;
  /** Where the object literal starts. */
  readonly location: RegistrySourceLocation;
  /**
   * The declaration the value is assigned to, when it is a simple one.
   *
   * `export const ocean = defineTheme(…)` reports `ocean`, and
   * `export const { light, dark } = generateTheme(…)` reports `light` and
   * `dark` respectively. Undefined when the call is not the whole initializer —
   * a literal inside an array, a call argument, a returned value — because then
   * no single exported name stands for it.
   *
   * This exists so a caller can follow the value into another module without
   * re-parsing the declaration itself.
   */
  readonly binding?: string;
  /** For a generated pair, which half of the pair this definition is. */
  readonly variant?: "light" | "dark";
  /**
   * Which canonical API produced the definition.
   *
   * `catalog` is the provenance a consumer needs to distinguish a curated
   * preset from an application's own theme: a preset is not project-defined
   * just because the file calls `getPresetThemes()`.
   */
  readonly origin?: ThemeDefinitionOrigin;
  /** The static inputs of a `generateTheme()` call that produced this theme. */
  readonly generateOptions?: ThemeGenerationInput;
}

/** A construct that looked like a definition but could not be read. */
export interface ThemeDefinitionProblem {
  /** Why it could not be read. */
  readonly message: string;
  /** Where the attempt started. */
  readonly location: RegistrySourceLocation;
}

/** What `readThemeDefinitions()` found. */
export interface ThemeDefinitionReadResult {
  /** Every definition it could read. */
  readonly definitions: readonly ThemeDefinitionSource[];
  /** Every candidate it refused, so nothing is dropped silently. */
  readonly problems: readonly ThemeDefinitionProblem[];
}

/**
 * The canonical APIs this reader understands.
 *
 * Kept in one place so both a direct binding and a namespace member are checked
 * against the same set; a binding cannot smuggle in an unrelated function name.
 */
const CANONICAL_APIS = new Set([
  "defineTheme",
  "generateTheme",
  "getPresetThemes",
  "getBrandPresets",
  "getBuiltInThemes",
]);

/**
 * The canonical API a call at `index` invokes, if any.
 *
 * Names are resolved through the bindings map so an aliased import is read like
 * the name it was imported as: `import { defineTheme as make }` makes `make(...)`
 * a `defineTheme` call. A namespace is resolved through its member, and a
 * caller that supplies `namespaces` restricts that member to the verified
 * exports. The source is never rewritten, so every offset the caller receives
 * still points at the original text.
 *
 * @param source - The source text.
 * @param index - The candidate start.
 * @param names - Local name to canonical API name.
 * @param namespaces - Local namespace to the canonical members it may expose.
 * @returns The canonical name, or undefined.
 */
function canonicalAt(
  source: string,
  index: number,
  names: ReadonlyMap<string, string>,
  namespaces: ReadonlyMap<string, readonly string[]>,
): { api: string; end: number } | undefined {
  const previous = index === 0 ? "" : (source[index - 1] ?? "");
  // Mid-identifier: `mydefineTheme` is not a call to `defineTheme`.
  if (previous !== "" && /[\w$]/u.test(previous)) return undefined;

  const word = /^[A-Za-z_$][\w$]*/u.exec(source.slice(index, index + 48))?.[0];
  if (word === undefined) return undefined;

  const direct = names.get(word);
  if (direct !== undefined && direct !== "*") {
    return CANONICAL_APIS.has(direct) ? { api: direct, end: index + word.length } : undefined;
  }

  // A namespace binding is mapped to `*` (or listed in `namespaces`): the
  // member decides, never the object.
  const allowed = namespaces.get(word);
  if (direct !== "*" && allowed === undefined) return undefined;

  const dot = skipTrivia(source, index + word.length);
  if (source[dot] !== ".") return undefined;

  const member = /^[A-Za-z_$][\w$]*/u.exec(source.slice(dot + 1, dot + 49))?.[0];
  if (member === undefined) return undefined;

  let target: string | undefined;
  if (allowed !== undefined) {
    target = allowed.includes(member) ? member : undefined;
  } else {
    const mapped = names.get(member);
    target = mapped !== undefined && mapped !== "*" && CANONICAL_APIS.has(mapped) ? mapped : undefined;
  }

  return target === undefined ? undefined : { api: target, end: dot + 1 + member.length };
}

/** The declaration a call is the whole initializer of, when it is one. */
interface CallDeclaration {
  /** `const ocean = …` */
  readonly single?: string;
  /** `const { light, dark } = …` — the local name for each half. */
  readonly light?: string;
  readonly dark?: string;
}

/**
 * Drop whitespace and block comments from the end of a slice.
 *
 * Only block comments: a line comment cannot sit between `=` and the call on
 * one line, and a call on the next line is not the same statement.
 *
 * @param window - Text ending at the call.
 * @returns The same text with trailing trivia removed.
 */
function trimTrailingTrivia(window: string): string {
  let end = window.length;

  for (;;) {
    while (end > 0 && /\s/u.test(window[end - 1] ?? "")) end -= 1;

    if (end >= 2 && window[end - 2] === "*" && window[end - 1] === "/") {
      const open = window.lastIndexOf("/*", end - 2);
      if (open === -1) break;
      end = open;
      continue;
    }

    break;
  }

  return window.slice(0, end);
}

/**
 * Read the declaration whose initializer starts at `callIndex`.
 *
 * A bounded window is enough: the declaration name is a few characters before
 * the `=`, and taking the whole prefix would make this quadratic across a file.
 *
 * @param source - The whole source.
 * @param callIndex - The start of the call.
 * @returns The binding names, if the call is a declared initializer.
 */
function declarationAt(source: string, callIndex: number): CallDeclaration {
  const window = trimTrailingTrivia(source.slice(Math.max(0, callIndex - 400), callIndex));

  const destructured =
    /(?:^|[^\w$])(?:export\s+)?(?:const|let|var)\s*\{([^}]*)\}\s*(?::[^=]*)?=\s*$/u.exec(window);
  if (destructured !== null) {
    const names = destructured[1] ?? "";
    const local = (key: "light" | "dark"): string | undefined => {
      const match = new RegExp(`(?:^|,)\\s*${key}\\s*(?::\\s*([A-Za-z_$][\\w$]*))?\\s*(?:,|$)`, "u").exec(names);
      if (match === null) return undefined;
      return match[1] ?? key;
    };

    const light = local("light");
    const dark = local("dark");
    if (light !== undefined || dark !== undefined) {
      return {
        ...(light === undefined ? {} : { light }),
        ...(dark === undefined ? {} : { dark }),
      };
    }
  }

  const single =
    /(?:^|[^\w$])(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*$/u.exec(window);
  return single?.[1] === undefined ? {} : { single: single[1] };
}

/** Options for {@link readThemeDefinitions}. */
export interface ThemeDefinitionReadOptions {
  /** Local name to canonical API name for directly imported bindings. */
  readonly bindings?: Readonly<Record<string, string>>;
  /** Local namespace to the canonical API names it may expose. */
  readonly namespaces?: Readonly<Record<string, readonly string[]>>;
  /**
   * When `true`, only the supplied bindings and namespaces are canonical.
   *
   * The default is `false`, which assumes the names as written. A project
   * analyzer that has verified imports should set this, so a local function
   * called `getPresetThemes` is not mistaken for the catalog API.
   */
  readonly strict?: boolean;
}

/**
 * Read every `defineTheme({ … })` literal in a source file.
 *
 * `defineTheme()` returns its argument unchanged — it is a type-level helper, not a
 * transformation — so reading the literal *is* reading the theme. That is what
 * makes a static reader sufficient here, and it is why this function needs no
 * knowledge of variants, defaults or provenance: there are none to apply.
 *
 * Broader than {@link loadThemeRegistry}, which requires the canonical registry's
 * exports. A project may define themes in any file it likes; this finds the
 * definitions wherever they are, and reports the ones it cannot read rather than
 * skipping them.
 *
 * It also reads `generateTheme({ … })` calls whose argument is a literal object.
 * That is **not** executing project code: `generateTheme` is Themvora's own pure
 * generator, and calling it with data read from the file is the same thing the
 * application does at runtime. A call with any other argument is refused.
 *
 * In strict mode every API name must come from `bindings` or `namespaces`; a
 * local function with a catalog's spelling is not the catalog.
 *
 * @param source - The file's text.
 * @param options - Verified bindings, namespaces and strictness.
 * @returns The definitions found, and the candidates refused.
 */
export function readThemeDefinitions(
  source: string,
  options?: ThemeDefinitionReadOptions,
): ThemeDefinitionReadResult {
  // Local name to canonical API. The defaults are the names as written; a
  // binding replaces them with whatever the import actually exported. Strict
  // mode has no defaults: an unimported name is not canonical.
  const defaults: [string, string][] =
    options?.strict === true
      ? []
      : [
          ["defineTheme", "defineTheme"],
          ["generateTheme", "generateTheme"],
          ["getPresetThemes", "getPresetThemes"],
          ["getBrandPresets", "getBrandPresets"],
          ["getBuiltInThemes", "getBuiltInThemes"],
        ];

  const names = new Map<string, string>([...defaults, ...Object.entries(options?.bindings ?? {})]);
  const namespaces = new Map<string, readonly string[]>(Object.entries(options?.namespaces ?? {}));
  const definitions: ThemeDefinitionSource[] = [];
  const problems: ThemeDefinitionProblem[] = [];

  // A manual scan rather than a regex over raw text: a `defineTheme(...)` inside
  // a comment or a string is documentation, not a definition, and matching it
  // would report a theme that does not exist.
  let index = 0;

  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];

    if (character === "/" && (next === "/" || next === "*")) {
      index = skipTrivia(source, index);
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      const string = readString(source, index);
      index = string.ok ? string.end : index + 1;
      continue;
    }

    // A file may reference the shipped themes instead of inlining them. Each
    // function is a different catalog, so the binding names which one — in
    // strict mode a local function with the same spelling is not the catalog.
    const resolved = canonicalAt(source, index, names, namespaces);

    if (resolved !== undefined) {
      const catalog = CATALOG_CALLS.find((entry) => entry.name === resolved.api);

      if (catalog !== undefined) {
        const open = skipTrivia(source, resolved.end);

        if (source[open] === "(") {
          const close = skipTrivia(source, open + 1);

          if (source[close] === ")") {
            // A chained call — `getPresetThemes().filter(...)` — selects a
            // subset this reader cannot evaluate. Resolving the whole catalog
            // there would report themes the file does not use, so it is skipped.
            const chained = source[skipTrivia(source, close + 1)] === ".";

            if (!chained) {
              const location = positionOf(source, index);
              const binding = declarationAt(source, index).single;
              for (const theme of catalog.themes()) {
                definitions.push({
                  theme,
                  location,
                  origin: "catalog",
                  ...(binding === undefined ? {} : { binding }),
                });
              }
            }

            index = close + 1;
            continue;
          }

          problems.push({
            message: `${catalog.name}(...) takes no arguments this reader can evaluate, so its themes are unknown.`,
            location: positionOf(source, open),
          });
          index = open + 1;
          continue;
        }

        index += 1;
        continue;
      }
    }

    if (resolved?.api === "generateTheme") {
      const open = skipTrivia(source, resolved.end);

      if (source[open] === "(") {
        const argumentStart = open + 1;
        const parsed = readValue(source, argumentStart);

        if (!parsed.ok || typeof parsed.value !== "object" || parsed.value === null || Array.isArray(parsed.value)) {
          problems.push({
            message:
              "A generateTheme(...) argument is not a static options object, so it cannot be evaluated without running the module.",
            location: positionOf(source, parsed.ok ? argumentStart : parsed.index),
          });
          index = parsed.ok ? parsed.end : open + 1;
          continue;
        }

        const options = parsed.value as {
          seed?: unknown;
          family?: unknown;
          withCode?: unknown;
          style?: unknown;
          contrast?: unknown;
          algorithm?: unknown;
        };
        if (typeof options.seed !== "string") {
          problems.push({
            message: "A generateTheme(...) call has no literal seed, so the themes it would produce are unknown.",
            location: positionOf(source, argumentStart),
          });
          index = parsed.end;
          continue;
        }

        const generationOptions: ThemeGenerationInput = {
          seed: options.seed,
          ...(typeof options.family === "string" ? { family: options.family } : {}),
          ...(typeof options.withCode === "boolean" ? { withCode: options.withCode } : {}),
          ...(typeof options.style === "string" ? { style: options.style } : {}),
          ...(typeof options.contrast === "string" ? { contrast: options.contrast } : {}),
          ...(typeof options.algorithm === "string" ? { algorithm: options.algorithm } : {}),
        };

        try {
          // Themvora's own generator, called with the literal options. The
          // generator validates the seed and throws a typed error for a bad one.
          const pair = generateTheme(generationOptions as never);
          const location = positionOf(source, skipTrivia(source, argumentStart));
          const declaration = declarationAt(source, index);
          const lightBinding = declaration.light ?? declaration.single;
          const darkBinding = declaration.dark ?? declaration.single;

          definitions.push(
            {
              theme: pair.light,
              location,
              variant: "light",
              origin: "generated",
              generateOptions: generationOptions,
              ...(lightBinding === undefined ? {} : { binding: lightBinding }),
            },
            {
              theme: pair.dark,
              location,
              variant: "dark",
              origin: "generated",
              generateOptions: generationOptions,
              ...(darkBinding === undefined ? {} : { binding: darkBinding }),
            },
          );
        } catch (error) {
          problems.push({
            message: `A generateTheme(...) call could not be generated: ${
              error instanceof Error ? error.message : String(error)
            }`,
            location: positionOf(source, argumentStart),
          });
        }

        index = parsed.end;
        continue;
      }
    }

    if (resolved?.api === "defineTheme") {
      const open = skipTrivia(source, resolved.end);

      if (source[open] === "(") {
        const argumentStart = open + 1;
        const parsed = readValue(source, argumentStart);

        if (!parsed.ok) {
          problems.push({
            message: `A defineTheme(...) argument is not a static object literal: ${parsed.message}`,
            location: positionOf(source, parsed.index),
          });
          index = open + 1;
          continue;
        }

        if (typeof parsed.value !== "object" || parsed.value === null || Array.isArray(parsed.value)) {
          problems.push({
            message: "A defineTheme(...) argument is not an object literal.",
            location: positionOf(source, argumentStart),
          });
          index = parsed.end;
          continue;
        }

        const binding = declarationAt(source, index).single;
        definitions.push({
          theme: parsed.value as ThemeDefinition,
          location: positionOf(source, skipTrivia(source, argumentStart)),
          origin: "definition",
          ...(binding === undefined ? {} : { binding }),
        });
        index = parsed.end;
        continue;
      }
    }

    index += 1;
  }

  return { definitions, problems };
}

/**
 * Read a generated theme registry from its source.
 *
 * Statically: the module is never imported, evaluated or transpiled.
 *
 * @param source - The module's text.
 * @returns The themes it registers, or a structured failure.
 *
 * @remarks
 * The shape recognised is the one `themvora init` writes: a `themvora` array of
 * `defineTheme` literals, a `selection` of family names, a `sourceThemes` array,
 * and a `themes` export combining them. A module outside that shape — including
 * a hand-written one — is reported as `not-a-registry` or
 * `unsupported-construct`, never partially guessed.
 */
export function loadThemeRegistry(source: string): RegistryLoadResult {
  const themvoraAt = findExportValue(source, "themvora");
  const sourceThemesAt = findExportValue(source, "sourceThemes");
  const selectionAt = findExportValue(source, "selection");

  if (themvoraAt === null || sourceThemesAt === null || selectionAt === null) {
    return {
      ok: false,
      reason: "not-a-registry",
      message:
        "This is not a generated Themvora registry: it is missing the themvora, selection or sourceThemes export.",
    };
  }

  const selection = readValue(source, selectionAt);
  if (!selection.ok) {
    return {
      ok: false,
      reason: "unsupported-construct",
      message: `The selection export could not be read: ${selection.message}`,
      location: positionOf(source, selection.index),
    };
  }

  if (!Array.isArray(selection.value) || !selection.value.every((entry) => typeof entry === "string")) {
    return {
      ok: false,
      reason: "unsupported-construct",
      message: "The selection export is not a literal array of family names.",
      location: positionOf(source, selectionAt),
    };
  }

  // `themvora` ends where `selection` begins; `sourceThemes` runs to the end of the
  // file. Bounding each slice by the next export is what stops a theme in one
  // array being read as a theme in the other.
  const first = readDefineThemes(source, themvoraAt, selectionAt);
  if ("ok" in first) return first;

  const second = readDefineThemes(source, sourceThemesAt, source.length);
  if ("ok" in second) return second;

  const families = selection.value as string[];

  // `presetThemes` is `getPresetThemes()` filtered by `selection`; resolving it
  // here is the same call the module would make at runtime.
  const presets = getPresetThemes().filter((theme) =>
    families.includes(theme.meta?.family ?? ""),
  );

  const themes = [...first.themes, ...presets, ...second.themes];
  const origins: ThemeDefinitionOrigin[] = [
    ...first.themes.map(() => "definition" as const),
    ...presets.map(() => "catalog" as const),
    ...second.themes.map(() => "definition" as const),
  ];

  for (const theme of themes) {
    const report = validateTheme(theme);
    if (!report.valid) {
      const issue = report.issues[0];
      return {
        ok: false,
        reason: "invalid-theme",
        message:
          `Theme "${String(theme.name)}" does not satisfy the schema` +
          (issue === undefined ? "." : `: ${issue.message}`),
      };
    }
  }

  const defaultMatch = /export\s+const\s+defaultTheme\b[^=]*=\s*"([^"]+)"/u.exec(source);
  const defaultTheme = defaultMatch?.[1];

  return {
    ok: true,
    themes,
    origins,
    selection: families,
    ...(defaultTheme === undefined ? {} : { defaultTheme }),
  };
}
