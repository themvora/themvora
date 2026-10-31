/**
 * Verified runtime-consumer recognition.
 *
 * A `themes`-shaped property proves nothing. `ThemeProvider` may be a local
 * function, `runtime.use` may be an unrelated object's method, and a `themes`
 * prop may belong to a component this extension has never heard of. Each rule
 * here therefore starts from the **import binding**: the call site is only a
 * consumer when the identifier resolves to a verified public export of a
 * Themvora package, and the rule then reads that API's real configuration
 * shape.
 *
 * The recognizer is deliberately separate from theme resolution. It says *what
 * the application supplied, and through which API*; the Stage 4 graph and the
 * inspection decide which themes those names actually name. A consumer with a
 * dynamic value is reported as such rather than being dropped.
 *
 * `@packageDocumentation`
 */

import { readModuleLinks, type ModuleImport } from "./importGraph.js";
import { readMarkupTags } from "./markup.js";
import { markupSkipRanges, maskToRegions, type SourceDocument } from "./sourceRegions.js";
import {
  maskSource,
  positionOf,
  readBalanced,
  readJsxAttribute,
  readObjectProperty,
  readStringLiteral,
  skipSpace,
  splitTopLevel,
  trimSpan,
  type Span,
} from "./sourceSyntax.js";

/** A framework/runtime integration this analyzer can recognize. */
export type ConsumerIntegration =
  | "react"
  | "next"
  | "remix"
  | "solid"
  | "angular"
  | "nuxt"
  | "vue"
  | "svelte"
  | "astro"
  | "vanilla"
  | "web";

/** How the theme input was read. */
export type ConsumerInput =
  /** A static identifier or array of identifiers. */
  | "static"
  /** A value this reader will not evaluate. */
  | "dynamic"
  /** The verified API was used without a theme input. */
  | "absent";

/** One verified consumer use in a source file. */
export interface ConsumerCandidate {
  /** The integration whose public API matched. */
  readonly integration: ConsumerIntegration;
  /** The canonical API, e.g. `ThemeProvider`, `provideTheme`, `new Themvora`. */
  readonly api: string;
  /** Workspace-relative source path. */
  readonly path: string;
  /** 1-based position of the API reference. */
  readonly location: { readonly line: number; readonly column: number };
  /** Whether a theme value was supplied and how it reads. */
  readonly input: ConsumerInput;
  /** The identifiers in the value, when `input` is `static`. */
  readonly names: readonly string[];
  /** Why a value could not be read, when it is dynamic or absent. */
  readonly reason?: string;
  /**
   * The API proves integration registration but not theme supply.
   *
   * Web Components use this: `defineCustomElements()` registers the elements;
   * the catalog is supplied later through attributes the current source
   * formats do not expose.
   */
  readonly registrationOnly?: boolean;
  /** The source region, e.g. `<script setup>`, `template`, `frontmatter`. */
  readonly region?: string;
  /**
   * Names are theme identifiers from a markup attribute, not imports.
   *
   * The inspection resolves them against the canonical catalog and discovered
   * theme names rather than through the import graph.
   */
  readonly directNames?: boolean;
  /**
   * The source slice to trace names through, when it differs from the file.
   *
   * A template's names resolve against its script scope: Svelte's module script
   * and Astro's client scripts are not in the template's scope.
   */
  readonly traceSource?: string;
}

/** A local import whose public API was reached through one re-export. */
export interface ApiAlias {
  /** The package specifier the re-export points at. */
  readonly specifier: string;
  /** The export name at that package. */
  readonly imported: string;
}

/** Display names for the integrations. */
export const INTEGRATION_LABELS: Readonly<Record<ConsumerIntegration, string>> = {
  react: "React",
  next: "Next.js",
  remix: "Remix",
  solid: "Solid",
  angular: "Angular",
  nuxt: "Nuxt",
  vue: "Vue",
  svelte: "Svelte",
  astro: "Astro",
  vanilla: "Vanilla JavaScript",
  web: "Web Components",
};

/** What a verified API reference is, for this recognizer. */
type ApiKind =
  | "provider"
  | "options"
  | "constructor"
  | "registration"
  | "registration-class"
  | "receiver"
  | "adopt";

interface ApiMatch {
  readonly integration: ConsumerIntegration;
  readonly api: string;
  readonly kind: ApiKind;
}

/** A resolved import reference at a call site. */
interface Reference {
  readonly imported: string;
  readonly specifier: string;
  readonly end: number;
  readonly start: number;
}

/** A theme input read from source. */
export interface ThemeInput {
  readonly input: ConsumerInput;
  readonly names: readonly string[];
  readonly reason?: string;
}

/**
 * Match a public export to the integration rule it belongs to.
 *
 * @param specifier - The import specifier, exactly as written.
 * @param imported - The imported export name.
 * @returns The rule, or undefined when this export is not a recognized consumer.
 */
function matchApi(specifier: string, imported: string): ApiMatch | undefined {
  const pkg = specifier.split("?")[0] ?? specifier;

  if (pkg === "@themvora/react") {
    if (imported === "ThemeProvider") return { integration: "react", api: "ThemeProvider", kind: "provider" };
    if (imported === "useThemeRuntime") return { integration: "react", api: "useThemeRuntime", kind: "receiver" };
  }

  if (pkg === "@themvora/next") {
    if (imported === "ThemeProvider") return { integration: "next", api: "ThemeProvider", kind: "provider" };
  }

  if (pkg === "@themvora/next/client") {
    if (imported === "ClientThemeProvider") {
      return { integration: "next", api: "ClientThemeProvider", kind: "provider" };
    }
  }

  if (pkg === "@themvora/remix") {
    if (imported === "ThemeProvider") return { integration: "remix", api: "ThemeProvider", kind: "provider" };
  }

  if (pkg === "@themvora/solid") {
    if (imported === "ThemeProvider") return { integration: "solid", api: "ThemeProvider", kind: "provider" };
    if (imported === "useThemeRuntime") return { integration: "solid", api: "useThemeRuntime", kind: "receiver" };
  }

  if (pkg === "@themvora/vue" || pkg === "@themvora/nuxt") {
    if (imported === "ThemeProvider") {
      return {
        integration: pkg === "@themvora/nuxt" ? "nuxt" : "vue",
        api: "ThemeProvider",
        kind: "provider",
      };
    }
  }

  if (pkg === "@themvora/svelte" && imported === "ThemeProvider") {
    return { integration: "svelte", api: "ThemeProvider", kind: "provider" };
  }

  if (pkg === "@themvora/astro/provider.astro" && imported === "default") {
    return { integration: "astro", api: "Provider", kind: "provider" };
  }

  if (pkg === "@themvora/angular") {
    if (imported === "provideTheme") return { integration: "angular", api: "provideTheme", kind: "options" };
    if (imported === "provideThemeRuntime") {
      return { integration: "angular", api: "provideThemeRuntime", kind: "adopt" };
    }
  }

  if (pkg === "@themvora/core/vanilla" && imported === "Themvora") {
    return { integration: "vanilla", api: "Themvora", kind: "constructor" };
  }

  if (pkg === "@themvora/web") {
    if (imported === "defineCustomElements") {
      return { integration: "web", api: "defineCustomElements", kind: "registration" };
    }
    if (imported === "getProviderRuntime" || imported === "useThemeRuntime") {
      return { integration: "web", api: imported, kind: "receiver" };
    }
    if (
      imported === "ThemvoraProvider" ||
      imported === "ThemvoraScope" ||
      imported === "ThemvoraToggle" ||
      imported === "ThemvoraSelect" ||
      imported === "ThemvoraScrollbar" ||
      imported === "ThemvoraInspector"
    ) {
      return { integration: "web", api: imported, kind: "registration-class" };
    }
  }

  return undefined;
}

/**
 * Build the local-name index from a module's imports.
 *
 * A local whose import resolved through one re-export is replaced with the
 * package and export it ultimately names, so the rules below see the public
 * API rather than the project's wrapper module.
 *
 * @param imports - Every value import in the file.
 * @param aliases - Local name to the API it re-exports, when known.
 * @returns Local name to import.
 */
function indexImports(
  imports: readonly ModuleImport[],
  aliases: ReadonlyMap<string, ApiAlias>,
): Map<string, ModuleImport> {
  const index = new Map<string, ModuleImport>();

  for (const entry of imports) {
    if (index.has(entry.local)) continue;
    const alias = aliases.get(entry.local);
    index.set(
      entry.local,
      alias === undefined ? entry : { ...entry, specifier: alias.specifier, imported: alias.imported },
    );
  }

  return index;
}

/**
 * Read globals declared as a package namespace.
 *
 * The Web Components example loads the package's standalone build in `<head>`
 * and declares `ThemvoraWeb` with the package's namespace type
 * (`typeof import(...)`). That type is a source binding to the public package —
 * not a guess from the name — so a destructuring from it is treated like one.
 *
 * @param source - The original text, for the specifier.
 * @param masked - The masked text, to reject comments and strings.
 * @returns Global name to package specifier.
 */
function readGlobalNamespaces(source: string, masked: string): Map<string, string> {
  const names = new Map<string, string>();
  const pattern =
    /\b([A-Za-z_$][\w$]*)\??\s*:\s*typeof\s+import\s*\(\s*["'](@themvora\/[^"']+)["']\s*\)/gu;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const name = match[1];
    const specifier = match[2];
    if (name === undefined || specifier === undefined) continue;

    // The declaration must be real code, not a mention in a comment or string.
    if (masked.slice(match.index, match.index + name.length) !== name) continue;
    names.set(name, specifier);
  }

  return names;
}

/**
 * Bind destructured or aliased globals to the package they name.
 *
 * @param imports - The import index to extend, in place.
 * @param source - The original text.
 * @param masked - The masked text.
 */
function bindGlobalNamespaces(
  imports: Map<string, ModuleImport>,
  source: string,
  masked: string,
): void {
  const namespaces = readGlobalNamespaces(source, masked);
  if (namespaces.size === 0) return;

  // A short fixed point: `const web = window.ThemvoraWeb` then
  // `const { getProviderRuntime } = web`.
  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;
    const pattern =
      /\b(?:const|let|var)\s+(\{[^}]*\}|[A-Za-z_$][\w$]*)\s*=\s*(?:window\s*\.\s*)?([A-Za-z_$][\w$]*)\s*;?/gu;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(masked)) !== null) {
      const target = match[2];
      const specifier = target === undefined ? undefined : namespaces.get(target);
      if (specifier === undefined) continue;

      const left = match[1] ?? "";

      if (left.startsWith("{")) {
        for (const raw of left.slice(1, -1).split(",")) {
          const part = raw.trim();
          if (part === "") continue;

          const alias = /^([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*)$/u.exec(part);
          const imported = alias?.[1] ?? part;
          const local = alias?.[2] ?? part;
          if (!/^[A-Za-z_$][\w$]*$/u.test(imported) || !/^[A-Za-z_$][\w$]*$/u.test(local)) continue;

          if (!imports.has(local)) imports.set(local, { local, imported, specifier });
          changed = true;
        }
        continue;
      }

      if (!/^[A-Za-z_$][\w$]*$/u.test(left)) continue;
      if (!namespaces.has(left)) {
        namespaces.set(left, specifier);
        changed = true;
      }
      if (!imports.has(left)) imports.set(left, { local: left, imported: "*", specifier });
    }

    if (!changed) break;
  }
}

/**
 * Resolve an identifier at `index` to its imported export.
 *
 * A namespace import (`import * as web`) is resolved through its member, so the
 * member decides the API and the object never does.
 *
 * @param masked - The masked source.
 * @param index - The identifier start.
 * @param imports - Local name to import.
 * @returns The reference and where it ends.
 */
function resolveReference(
  masked: string,
  index: number,
  imports: ReadonlyMap<string, ModuleImport>,
): Reference | undefined {
  const word = /^[A-Za-z_$][\w$]*/u.exec(masked.slice(index, index + 80));
  if (word === null) return undefined;

  const entry = imports.get(word[0]);
  if (entry === undefined) return undefined;

  const end = index + word[0].length;
  if (entry.imported !== "*") {
    return { imported: entry.imported, specifier: entry.specifier, start: index, end };
  }

  const dot = skipSpace(masked, end);
  if (masked[dot] !== ".") {
    return { imported: "*", specifier: entry.specifier, start: index, end };
  }

  const memberStart = skipSpace(masked, dot + 1);
  const member = /^[A-Za-z_$][\w$]*/u.exec(masked.slice(memberStart, memberStart + 80));
  if (member === null) return { imported: "*", specifier: entry.specifier, start: index, end };

  return {
    imported: member[0],
    specifier: entry.specifier,
    start: index,
    end: memberStart + member[0].length,
  };
}

/**
 * Skip a TypeScript type-argument list, when one starts here.
 *
 * @param masked - The masked source.
 * @param index - The candidate `<`.
 * @returns The index after `>`, or the input index.
 */
function skipTypeArguments(masked: string, index: number): number {
  if (masked[index] !== "<") return index;

  let depth = 0;
  for (let cursor = index; cursor < masked.length; cursor += 1) {
    const character = masked[cursor];
    if (character === "<") depth += 1;
    else if (character === ">" && masked[cursor - 1] !== "=") {
      depth -= 1;
      if (depth === 0) return cursor + 1;
    }
  }

  return index;
}

/**
 * Read a call's arguments.
 *
 * @param masked - The masked source.
 * @param afterReference - The index after the API reference.
 * @returns The argument span and the top-level argument spans.
 */
function callArguments(
  masked: string,
  afterReference: number,
): { readonly span: Span; readonly args: readonly Span[] } | undefined {
  const open = skipSpace(masked, skipTypeArguments(masked, afterReference));
  if (masked[open] !== "(") return undefined;

  const span = readBalanced(masked, open);
  if (span === undefined) return undefined;

  return { span, args: splitTopLevel(masked, span) };
}

/**
 * Read the name a declaration is assigned to.
 *
 * @param masked - The masked source.
 * @param expressionStart - Where the initializer begins.
 * @returns The local name, or undefined.
 */
function assignedName(masked: string, expressionStart: number): string | undefined {
  const before = masked.slice(Math.max(0, expressionStart - 400), expressionStart).trimEnd();
  const match = /(?:^|[;{}])\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*$/u.exec(
    before,
  );
  return match?.[1];
}

/**
 * Find the `new` keyword before a reference.
 *
 * @param masked - The masked source.
 * @param index - The reference start.
 * @returns The keyword's index, or undefined.
 */
function newKeywordBefore(masked: string, index: number): number | undefined {
  let cursor = index - 1;
  while (cursor >= 0 && /\s/u.test(masked[cursor] ?? "")) cursor -= 1;

  const end = cursor + 1;
  while (cursor >= 0 && /[\w$]/u.test(masked[cursor] ?? "")) cursor -= 1;
  return masked.slice(cursor + 1, end) === "new" ? cursor + 1 : undefined;
}

/**
 * Read a theme value from an expression.
 *
 * Accepts the two shapes a provider or runtime can be configured with
 * statically: an identifier, or an array of identifiers (including spreads,
 * which are themselves identifiers). Everything else is dynamic.
 *
 * @param masked - The masked source.
 * @param span - The expression span.
 * @returns The input state and names.
 */
function readThemeExpression(masked: string, span: Span): ThemeInput {
  const trimmed = trimSpan(masked, span);
  const text = masked.slice(trimmed.start, trimmed.end).trim();

  if (text === "" || text === "undefined" || text === "null") {
    return { input: "absent", names: [], reason: "the theme value is empty or undefined" };
  }

  if (masked[trimmed.start] === "[") {
    const array = readBalanced(masked, trimmed.start);
    if (array === undefined || array.end !== trimmed.end) {
      return { input: "dynamic", names: [], reason: "the theme value is not a plain array literal" };
    }

    const names: string[] = [];
    for (const part of splitTopLevel(masked, array)) {
      let item = masked.slice(part.start, part.end).trim();
      if (item.startsWith("...")) item = item.slice(3).trim();

      const cast = /^([A-Za-z_$][\w$]*)\s+(?:as|satisfies)\s+/u.exec(item);
      if (cast?.[1] !== undefined) {
        names.push(cast[1]);
        continue;
      }

      if (/^[A-Za-z_$][\w$]*$/u.test(item)) {
        names.push(item);
        continue;
      }

      return {
        input: "dynamic",
        names: [],
        reason: "the themes array contains an expression this reader does not evaluate",
      };
    }

    return names.length === 0
      ? { input: "absent", names: [], reason: "the themes array is empty" }
      : { input: "static", names };
  }

  const cast = /^([A-Za-z_$][\w$]*)\s+(?:as|satisfies)\s+/u.exec(text);
  if (cast?.[1] !== undefined) return { input: "static", names: [cast[1]] };

  if (/^[A-Za-z_$][\w$]*$/u.test(text)) return { input: "static", names: [text] };

  return {
    input: "dynamic",
    names: [],
    reason: "the theme value is not a static identifier or array literal",
  };
}

/**
 * Read a theme value from a standalone expression string.
 *
 * Used by the template recognizers, where the expression is already isolated
 * from the surrounding markup.
 *
 * @param expression - The expression text.
 * @returns The input state and names.
 */
export function themeInputOfExpression(expression: string): ThemeInput {
  const masked = maskSource(expression);
  return readThemeExpression(masked, { start: 0, end: masked.length });
}

/**
 * Read the `themes` property of an object expression.
 *
 * @param expression - The expression text.
 * @param property - The property to read.
 * @param absence - The sentence for a missing property.
 * @returns The input state and names.
 */
export function themeInputOfObject(
  expression: string,
  property: string,
  absence: string,
): ThemeInput {
  const masked = maskSource(expression);
  const trimmed = trimSpan(masked, { start: 0, end: masked.length });

  if (masked[trimmed.start] !== "{") return themeInputOfExpression(expression);

  const object = readBalanced(masked, trimmed.start);
  if (object === undefined) {
    return { input: "dynamic", names: [], reason: "the options object is not balanced" };
  }

  const read = readObjectProperty(masked, object, property);
  if (read.kind === "value" || read.kind === "shorthand") {
    return themeInputOfExpression(expression.slice(read.expression.start, read.expression.end));
  }

  if (read.kind === "dynamic") {
    return {
      input: "dynamic",
      names: [],
      reason: "the options spread another object, so the themes it supplies cannot be determined statically",
    };
  }

  return { input: "absent", names: [], reason: absence };
}

/**
 * Read a Web Components `themes` attribute value.
 *
 * The shipped element accepts a space/comma-separated identifier list or a JSON
 * array of full theme definitions. Only the identifier list is interpreted; the
 * definition array is reported rather than read as a second theme model. A JSON
 * array of strings is not this attribute's syntax — the element reports it
 * invalid and ignores it — so it is not treated as a theme supply either.
 *
 * @param value - The attribute text.
 * @returns The input state and names.
 */
export function themeInputOfAttribute(value: string): ThemeInput {
  const text = value.trim();

  if (text === "") {
    return { input: "absent", names: [], reason: "the themes attribute is empty" };
  }

  if (text.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) {
        return {
          input: "dynamic",
          names: [],
          reason:
            "the JSON array form takes full theme definitions; a JSON name array is not the element's attribute syntax",
        };
      }

      return {
        input: "dynamic",
        names: [],
        reason: "inline JSON theme definitions are not interpreted by this reader",
      };
    } catch {
      return {
        input: "dynamic",
        names: [],
        reason: "the themes attribute is not valid JSON; the array form takes theme definitions",
      };
    }
  }

  if (/[{}]/u.test(text)) {
    return {
      input: "dynamic",
      names: [],
      reason: "the themes attribute contains a template expression, which is not evaluated",
    };
  }

  const names = text.split(/[\s,]+/u).filter((entry) => entry.length > 0);
  if (names.length === 0) {
    return { input: "absent", names: [], reason: "the themes attribute is empty" };
  }

  if (names.some((entry) => /["'<>]/u.test(entry))) {
    return {
      input: "dynamic",
      names: [],
      reason: "the themes attribute contains markup rather than theme identifiers",
    };
  }

  return { input: "static", names };
}

/**
 * Read a `themes` property from an object literal.
 *
 * @param masked - The masked source.
 * @param object - The object span.
 * @param absence - The sentence to use when the property is absent.
 * @returns The input state and names.
 */
function readThemesProperty(masked: string, object: Span, absence: string): ThemeInput {
  const read = readObjectProperty(masked, object, "themes");

  if (read.kind === "value" || read.kind === "shorthand") {
    return readThemeExpression(masked, read.expression);
  }

  if (read.kind === "dynamic") {
    return {
      input: "dynamic",
      names: [],
      reason: "the options spread another object, so the themes it supplies cannot be determined statically",
    };
  }

  return { input: "absent", names: [], reason: absence };
}

/**
 * Read a theme input from a call's first options argument.
 *
 * @param masked - The masked source.
 * @param args - The call's top-level arguments.
 * @param absent - The sentence for a call with no theme input.
 * @returns The input state and names.
 */
function readOptionsInput(masked: string, args: readonly Span[], absent: string): ThemeInput {
  const first = args[0];
  if (first === undefined) return { input: "absent", names: [], reason: absent };

  const argument = trimSpan(masked, first);
  if (masked[argument.start] !== "{") {
    return {
      input: "dynamic",
      names: [],
      reason: "the options are not a static object literal, so they are not evaluated",
    };
  }

  const object = readBalanced(masked, argument.start);
  if (object === undefined) {
    return { input: "dynamic", names: [], reason: "the options object is not balanced" };
  }

  return readThemesProperty(masked, object, absent);
}

/**
 * Find the `>` that ends a JSX opening tag.
 *
 * @param masked - The masked source.
 * @param from - The index after the element name.
 * @returns The `>` index, or -1.
 */
function findJsxTagEnd(masked: string, from: number): number {
  let depth = 0;

  for (let index = from; index < masked.length; index += 1) {
    const character = masked[index];
    if (character === "{") depth += 1;
    else if (character === "}") depth = Math.max(0, depth - 1);
    else if (character === ">" && depth === 0) return index;
  }

  return -1;
}

/**
 * Whether a path is the Nuxt configuration module.
 *
 * @param path - A workspace-relative path.
 * @returns `true` for `nuxt.config.ts` and its JavaScript variants.
 */
function isNuxtConfig(path: string): boolean {
  const base = path.slice(path.lastIndexOf("/") + 1);
  return /^nuxt\.config\.[cm]?[jt]sx?$/u.test(base);
}

/**
 * Recognize the Nuxt module configuration.
 *
 * Nuxt's provider is the module itself: `@themvora/nuxt` is listed in
 * `modules`, and its theme input is the `themvora` block whose key is the
 * module's own `configKey`. The `defineNuxtConfig` call is auto-imported by
 * Nuxt, so identity comes from the config file name plus the verified module
 * specifier and key — not from a global name.
 *
 * @param source - The original text.
 * @param masked - The masked text.
 * @param path - The file path.
 * @returns The consumer, or undefined when this is not a Themvora Nuxt config.
 */
function recognizeNuxtConfig(
  source: string,
  masked: string,
  path: string,
): ConsumerCandidate | undefined {
  if (!isNuxtConfig(path)) return undefined;

  const call = /\bdefineNuxtConfig\s*\(/u.exec(masked);
  if (call === null) return undefined;

  const open = call.index + call[0].length - 1;
  const span = readBalanced(masked, open);
  if (span === undefined) return undefined;

  const first = splitTopLevel(masked, span)[0];
  if (first === undefined) return undefined;

  const argument = trimSpan(masked, first);
  if (masked[argument.start] !== "{") return undefined;

  const config = readBalanced(masked, argument.start);
  if (config === undefined) return undefined;

  const modules = readObjectProperty(masked, config, "modules");
  if (modules.kind !== "value") return undefined;

  const modulesValue = trimSpan(masked, modules.expression);
  if (masked[modulesValue.start] !== "[") return undefined;

  const modulesArray = readBalanced(masked, modulesValue.start);
  if (modulesArray === undefined) return undefined;

  const enabled = splitTopLevel(masked, modulesArray).some((part) => {
    const entry = trimSpan(masked, part);
    return readStringLiteral(source, masked, entry.start)?.value === "@themvora/nuxt";
  });

  if (!enabled) return undefined;

  const location = positionOf(source, call.index);
  const options = readObjectProperty(masked, config, "themvora");

  if (options.kind === "absent") {
    return {
      integration: "nuxt",
      api: "defineNuxtConfig",
      path,
      location,
      input: "absent",
      names: [],
      reason: "the @themvora/nuxt module is enabled without a themvora block; it uses the built-in catalog",
    };
  }

  if (options.kind === "dynamic") {
    return {
      integration: "nuxt",
      api: "defineNuxtConfig",
      path,
      location,
      input: "dynamic",
      names: [],
      reason: "the themvora module options are not statically known",
    };
  }

  const value = trimSpan(masked, options.expression);
  if (masked[value.start] !== "{") {
    return {
      integration: "nuxt",
      api: "defineNuxtConfig",
      path,
      location,
      input: "dynamic",
      names: [],
      reason: "the themvora module options are not an object literal",
    };
  }

  const object = readBalanced(masked, value.start);
  if (object === undefined) return undefined;

  return {
    integration: "nuxt",
    api: "defineNuxtConfig",
    path,
    location,
    ...readThemesProperty(
      masked,
      object,
      "the themvora module is configured without themes; it uses the built-in catalog",
    ),
  };
}

/**
 * Recognize every verified consumer in one source file.
 *
 * @param source - The file's text.
 * @param path - The workspace-relative path, echoed into every candidate.
 * @param apiAliases - Local imports resolved through one re-export, when the
 *   caller could resolve them.
 * @returns The consumers found, in source order.
 */
export function recognizeConsumers(
  source: string,
  path: string,
  apiAliases: ReadonlyMap<string, ApiAlias> = new Map(),
): ConsumerCandidate[] {
  const masked = maskSource(source);
  const links = readModuleLinks(source);
  const imports = indexImports(links.imports, apiAliases);
  bindGlobalNamespaces(imports, source, masked);
  const candidates: ConsumerCandidate[] = [];

  // --- JSX providers ---------------------------------------------------------
  for (let index = 0; index < masked.length; index += 1) {
    if (masked[index] !== "<") continue;

    const first = masked[index + 1];
    if (first === undefined || !/[A-Za-z_$]/u.test(first)) continue;

    const word = /^[A-Za-z_$][\w$.-]*/u.exec(masked.slice(index + 1, index + 80));
    if (word === null) continue;

    const custom = word[0].toLowerCase() === "themvora-provider";
    const entry = imports.get(word[0]);
    const match = custom || entry === undefined
      ? undefined
      : matchApi(entry.specifier, entry.imported);
    if (!custom && match?.kind !== "provider") continue;

    const nameEnd = index + 1 + word[0].length;
    const tagEnd = findJsxTagEnd(masked, skipTypeArguments(masked, nameEnd));
    if (tagEnd === -1) continue;

    const themes = readJsxAttribute(masked, nameEnd, tagEnd, "themes");
    let read: ThemeInput;

    if (custom) {
      // A custom element's `themes` attribute is a string. A quoted attribute
      // or a string expression can be read; an object/array expression is not
      // the element's API and is reported rather than guessed at.
      if (
        (themes.kind === "value" || themes.kind === "dynamic") &&
        themes.expression !== undefined &&
        (masked[themes.expression.start] === '"' || masked[themes.expression.start] === "'")
      ) {
        const literal = readStringLiteral(source, masked, themes.expression.start);
        read = literal === undefined
          ? {
              input: "dynamic",
              names: [],
              reason: "the themes attribute string is not closed",
            }
          : themeInputOfAttribute(literal.value);
      } else if (themes.kind === "value") {
        read = {
          input: "dynamic",
          names: [],
          reason: "the themes prop must be a string attribute; an object or array expression is not the element's API",
        };
      } else if (themes.kind === "shorthand" || themes.kind === "dynamic") {
        read = {
          input: "dynamic",
          names: [],
          reason: "the themes attribute is a spread or expression this reader does not evaluate",
        };
      } else {
        read = {
          input: "absent",
          names: [],
          reason: "the provider element has no themes attribute; theme supply is not established",
        };
      }

      candidates.push({
        integration: "web",
        api: "themvora-provider",
        path,
        location: positionOf(source, index + 1),
        region: "JSX",
        directNames: true,
        ...(read.input === "absent" ? { registrationOnly: true } : {}),
        ...read,
      });

      index = tagEnd;
      continue;
    }

    if (match === undefined) continue;

    if (themes.kind === "value") {
      read = readThemeExpression(masked, themes.expression);
    } else if (themes.kind === "shorthand") {
      read = {
        input: "dynamic",
        names: [],
        reason: "the themes prop has no value; it passes a boolean rather than a theme collection",
      };
    } else if (themes.kind === "dynamic") {
      read = {
        input: "dynamic",
        names: [],
        reason: "the themes prop is a string, spread or other expression this reader does not evaluate",
      };
    } else {
      const runtime = readJsxAttribute(masked, nameEnd, tagEnd, "runtime");
      read = {
        input: "absent",
        names: [],
        reason:
          runtime.kind === "absent"
            ? "the provider has no themes prop; it uses the built-in or build-transported catalog"
            : "the provider adopts a runtime; themes are configured on that runtime, not through this prop",
      };
    }

    candidates.push({
      integration: match.integration,
      api: match.api,
      path,
      location: positionOf(source, index + 1),
      ...read,
    });

    index = tagEnd;
  }

  // --- Verified options calls, constructors and receivers --------------------
  const receivers = new Map<string, ConsumerIntegration>();
  let webRegistration:
    | { readonly integration: ConsumerIntegration; readonly api: string; readonly location: number }
    | undefined;

  const referencePattern = /[A-Za-z_$][\w$]*/gu;
  let reference: RegExpExecArray | null;

  while ((reference = referencePattern.exec(masked)) !== null) {
    const resolved = resolveReference(masked, reference.index, imports);
    if (resolved === undefined) continue;

    const match = matchApi(resolved.specifier, resolved.imported);
    if (match === undefined) continue;

    referencePattern.lastIndex = resolved.end;

    if (match.kind === "provider") continue;

    if (match.kind === "registration") {
      const call = callArguments(masked, resolved.end);
      if (call !== undefined) {
        webRegistration ??= { integration: "web", api: match.api, location: resolved.start };
      }
      continue;
    }

    if (match.kind === "registration-class") {
      const dot = skipSpace(masked, resolved.end);
      if (masked[dot] !== ".") continue;
      const memberStart = skipSpace(masked, dot + 1);
      const member = /^[A-Za-z_$][\w$]*/u.exec(masked.slice(memberStart, memberStart + 80));
      if (member?.[0] !== "define") continue;
      if (callArguments(masked, memberStart + member[0].length) !== undefined) {
        webRegistration ??= {
          integration: "web",
          api: `${match.api}.define`,
          location: resolved.start,
        };
      }
      continue;
    }

    if (match.kind === "receiver") {
      const call = callArguments(masked, resolved.end);
      if (call === undefined) continue;
      const name = assignedName(masked, resolved.start);
      if (name !== undefined) receivers.set(name, match.integration);
      continue;
    }

    if (match.kind === "adopt") {
      const call = callArguments(masked, resolved.end);
      if (call === undefined) continue;
      candidates.push({
        integration: match.integration,
        api: match.api,
        path,
        location: positionOf(source, resolved.start),
        input: "absent",
        names: [],
        reason: "adopts an existing runtime; themes are configured where that runtime was created",
      });
      continue;
    }

    if (match.kind === "constructor") {
      const newKeyword = newKeywordBefore(masked, resolved.start);

      if (newKeyword !== undefined) {
        const call = callArguments(masked, resolved.end);
        if (call === undefined) continue;

        const read = readOptionsInput(
          masked,
          call.args,
          "constructed without options; it uses the built-in catalog or build-transported configuration",
        );
        const name = assignedName(masked, newKeyword);
        if (name !== undefined) receivers.set(name, match.integration);

        candidates.push({
          integration: match.integration,
          api: `new ${match.api}`,
          path,
          location: positionOf(source, resolved.start),
          ...read,
        });
        continue;
      }

      const dot = skipSpace(masked, resolved.end);
      if (masked[dot] !== ".") continue;
      const memberStart = skipSpace(masked, dot + 1);
      const member = /^[A-Za-z_$][\w$]*/u.exec(masked.slice(memberStart, memberStart + 80));
      if (member?.[0] !== "init") continue;

      const call = callArguments(masked, memberStart + member[0].length);
      if (call === undefined) continue;

      const read = readOptionsInput(
        masked,
        call.args,
        "initialized without options; it uses the built-in catalog or build-transported configuration",
      );
      const name = assignedName(masked, resolved.start);
      if (name !== undefined) receivers.set(name, match.integration);

      candidates.push({
        integration: match.integration,
        api: `${match.api}.init`,
        path,
        location: positionOf(source, resolved.start),
        ...read,
      });
      continue;
    }

    // An Angular options call.
    const call = callArguments(masked, resolved.end);
    if (call === undefined) continue;

    candidates.push({
      integration: match.integration,
      api: match.api,
      path,
      location: positionOf(source, resolved.start),
      ...readOptionsInput(
        masked,
        call.args,
        "called without a themes option; it uses the built-in or build-transported catalog",
      ),
    });
  }

  // One level of `const runtime = kit.runtime`.
  for (const [name, integration] of [...receivers]) {
    const pattern = new RegExp(
      `(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*(?::[^=]*)?=\\s*${name}\\s*\\.\\s*runtime\\b`,
      "gu",
    );
    let alias: RegExpExecArray | null;
    while ((alias = pattern.exec(masked)) !== null) {
      if (alias[1] !== undefined) receivers.set(alias[1], integration);
    }
  }

  // --- Methods on a verified runtime ----------------------------------------
  for (const [name, integration] of receivers) {
    const pattern = new RegExp(
      `(^|[^\\w$.])${name}\\s*\\.\\s*(?:runtime\\s*\\.\\s*)?(use|configure)\\s*\\(`,
      "gu",
    );
    let use: RegExpExecArray | null;

    while ((use = pattern.exec(masked)) !== null) {
      const method = use[2];
      const open = use.index + use[0].length - 1;
      const span = readBalanced(masked, open);
      if (span === undefined) continue;

      const args = splitTopLevel(masked, span);
      const first = args[0];
      let read: ThemeInput;

      if (method === "use") {
        if (first === undefined) {
          read = { input: "absent", names: [], reason: "runtime.use() was called without a theme pack" };
        } else {
          const argument = trimSpan(masked, first);
          if (masked[argument.start] === "{") {
            const object = readBalanced(masked, argument.start);
            read =
              object === undefined
                ? { input: "dynamic", names: [], reason: "the theme pack object is not balanced" }
                : readThemesProperty(
                    masked,
                    object,
                    "the inline theme pack has no themes property",
                  );
          } else {
            read = readThemeExpression(masked, argument);
          }
        }
      } else {
        read = readOptionsInput(masked, args, "runtime.configure() does not change the themes");
      }

      candidates.push({
        integration,
        api: `runtime.${method}`,
        path,
        location: positionOf(source, use.index + use[0].indexOf(name)),
        ...read,
      });
    }
  }

  // --- Nuxt module configuration --------------------------------------------
  const nuxt = recognizeNuxtConfig(source, masked, path);
  if (nuxt !== undefined) candidates.push(nuxt);

  // --- Web Components registration ------------------------------------------
  const webImported =
    links.sideEffectImports.includes("@themvora/web") ||
    links.imports.some((entry) => entry.specifier === "@themvora/web");

  if (webImported || webRegistration !== undefined) {
    const location =
      webRegistration?.location ?? Math.max(0, source.indexOf("@themvora/web"));

    candidates.push({
      integration: "web",
      api: webRegistration?.api ?? "import @themvora/web",
      path,
      location: positionOf(source, location),
      input: "absent",
      names: [],
      reason:
        "custom elements are registered; theme configuration is supplied through element attributes, which this source format does not expose",
      registrationOnly: true,
    });
  }

  return candidates.sort(
    (left, right) =>
      left.location.line - right.location.line || left.location.column - right.location.column,
  );
}

/**
 * Whether an integration belongs to a component file format.
 *
 * @param format - The source format.
 * @param integration - The integration a binding resolved to.
 * @returns `true` when the provider belongs in that template format.
 */
function integrationMatchesFormat(
  format: SourceDocument["format"],
  integration: ConsumerIntegration,
): boolean {
  if (format === "vue") return integration === "vue" || integration === "nuxt";
  if (format === "svelte") return integration === "svelte";
  if (format === "astro") return integration === "astro";
  return false;
}

/**
 * Read the theme input from a Svelte/Astro/Vue markup attribute.
 *
 * @param attribute - The attribute.
 * @param reason - The reason to use for a string-valued attribute.
 * @returns The input state.
 */
function readMarkupThemes(
  attribute: { readonly kind: string; readonly value?: string } | undefined,
  reason: string,
): ThemeInput {
  if (attribute === undefined) {
    return { input: "absent", names: [], reason: "the provider has no themes attribute" };
  }

  if (attribute.kind === "braced" && attribute.value !== undefined) {
    return themeInputOfExpression(attribute.value);
  }

  return { input: "dynamic", names: [], reason };
}

/**
 * Recognize verified providers written in a Vue, Svelte or Astro template.
 *
 * The component tag is resolved through the imports in the script/frontmatter
 * region. Template markup is never parsed as JavaScript: only the named tag and
 * its theme attribute are read.
 *
 * @param document - The normalized component file.
 * @returns The template consumers.
 */
export function recognizeTemplateConsumers(document: SourceDocument): ConsumerCandidate[] {
  if (document.format !== "vue" && document.format !== "svelte" && document.format !== "astro") {
    return [];
  }

  // The template sees only its script scope: Svelte's module script and Astro's
  // client scripts are not in scope for template expressions.
  const scopeRegions = document.format === "astro"
    ? document.regions.filter((region) => region.kind === "frontmatter")
    : document.format === "svelte"
      ? document.regions.filter((region) => region.kind !== "module")
      : document.regions;
  const scopeSource = maskToRegions(document.text, scopeRegions);
  const imports = indexImports(readModuleLinks(scopeSource).imports, new Map());
  const providers = new Map<string, ApiMatch>();

  for (const [local, entry] of imports) {
    const match = matchApi(entry.specifier, entry.imported);
    if (match?.kind === "provider" && integrationMatchesFormat(document.format, match.integration)) {
      providers.set(local, match);
    }
  }

  if (providers.size === 0) return [];

  const candidates: ConsumerCandidate[] = [];
  const tags = readMarkupTags(document.text, {
    skip: markupSkipRanges(document),
    tags: [...providers.keys()],
  });

  for (const tag of tags) {
    const match = providers.get(tag.name);
    if (match === undefined) continue;

    let read: ThemeInput;

    if (document.format === "vue") {
      const binding = tag.attributes.get(":themes") ?? tag.attributes.get("v-bind:themes");
      const plain = tag.attributes.get("themes");

      if (binding !== undefined) {
        read = binding.kind === "quoted" && binding.value !== undefined
          ? themeInputOfExpression(binding.value)
          : binding.kind === "braced" && binding.value !== undefined
            ? themeInputOfExpression(binding.value)
            : { input: "dynamic", names: [], reason: "the themes binding has no readable expression" };
      } else if (plain !== undefined) {
        read = {
          input: "dynamic",
          names: [],
          reason: "Vue binds an array prop with :themes; a plain themes attribute passes a string literal",
        };
      } else if (tag.hasSpread) {
        read = {
          input: "dynamic",
          names: [],
          reason: "the provider uses a spread binding, so its themes cannot be determined statically",
        };
      } else {
        read = {
          input: "absent",
          names: [],
          reason: "the provider has no themes binding; it uses the built-in or build-transported catalog",
        };
      }
    } else if (document.format === "svelte") {
      read = readMarkupThemes(
        tag.attributes.get("themes"),
        "Svelte passes a themes expression with braces; a string attribute is not a theme collection",
      );

      if (read.input === "absent" && tag.hasSpread) {
        read = {
          input: "dynamic",
          names: [],
          reason: "the provider uses a spread attribute, so its themes cannot be determined statically",
        };
      }
    } else {
      const config = tag.attributes.get("config");

      if (config !== undefined) {
        if (config.kind === "braced" && config.value !== undefined) {
          read = themeInputOfObject(config.value, "themes", "the config has no themes option");

          if (read.input === "static" && read.names.length === 1) {
            const imported = imports.get(read.names[0]!);
            if (imported?.specifier.includes("theme.config")) {
              read = {
                ...read,
                reason: "config is imported from a build-time theme config; it is not executed",
              };
            }
          }
        } else {
          read = {
            input: "dynamic",
            names: [],
            reason: "the Astro config attribute is not a braced expression this reader evaluates",
          };
        }
      } else {
        read = readMarkupThemes(
          tag.attributes.get("themes"),
          "Astro passes a themes expression with braces; a string attribute is not a theme collection",
        );

        if (read.input === "absent" && tag.hasSpread) {
          read = {
            input: "dynamic",
            names: [],
            reason: "the provider uses a spread attribute, so its themes cannot be determined statically",
          };
        }
      }
    }

    candidates.push({
      integration: match.integration,
      api: match.api,
      path: document.path,
      location: positionOf(document.text, tag.nameStart),
      region: document.format === "svelte" ? "markup" : "template",
      traceSource: scopeSource,
      ...read,
    });
  }

  return candidates.sort(
    (left, right) =>
      left.location.line - right.location.line || left.location.column - right.location.column,
  );
}

/**
 * Recognize `<themvora-provider>` theme attributes in HTML.
 *
 * The only attribute read is `themes`; the shipped element's other attributes
 * configure mode/family/transition but do not carry the catalog. A tag with no
 * `themes` attribute is registration-only, never a theme association.
 *
 * @param document - The normalized HTML file.
 * @returns The element consumers.
 */
export function recognizeHtmlConsumers(document: SourceDocument): ConsumerCandidate[] {
  if (document.format !== "html") return [];

  return readMarkupTags(document.text, {
    skip: markupSkipRanges(document),
    tags: ["themvora-provider"],
  }).map((tag) => {
    const themes = tag.attributes.get("themes");
    let read: ThemeInput;

    if (themes === undefined) {
      read = {
        input: "absent",
        names: [],
        reason: "the provider element has no themes attribute; theme supply is not established",
      };
    } else if (themes.kind === "quoted" || themes.kind === "unquoted") {
      read = themeInputOfAttribute(themes.value ?? "");
    } else if (themes.kind === "braced") {
      read = {
        input: "dynamic",
        names: [],
        reason: "the themes attribute contains a template expression, which is not evaluated",
      };
    } else {
      read = {
        input: "absent",
        names: [],
        reason: "the provider element has an empty themes attribute; theme supply is not established",
      };
    }

    return {
      integration: "web",
      api: "themvora-provider",
      path: document.path,
      location: positionOf(document.text, tag.nameStart),
      region: "element",
      directNames: true,
      ...(read.input === "absent" ? { registrationOnly: true } : {}),
      ...read,
    };
  });
}
