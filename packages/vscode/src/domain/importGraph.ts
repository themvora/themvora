/**
 * The small part of a module graph a theme reader needs.
 *
 * A provider file often does not hold its themes; it imports them. Deciding
 * whether a theme is actually supplied to the app therefore means following a
 * name from the call site to the file that declares it. That is the one job of
 * this module, and it is deliberately narrow:
 *
 * - **Imports and re-exports only.** ESM `import`/`export … from`, plus the
 *   CommonJS `require` forms the package's `require` condition makes real.
 * - **Relative specifiers only.** `./theme` and `../theme` are project paths
 *   this reader can resolve against the walk. A bare specifier is a package or
 *   an alias and is reported unresolved rather than guessed at.
 * - **One level each.** One local collection (`const themes = [...a, ...b]`)
 *   and one re-export hop. Deeper chains are reported as unresolved, because a
 *   second hop is where a static reader starts pretending to be an interpreter.
 *
 * The source is never executed and never rewritten. Comments and strings are
 * masked so a mention in documentation cannot become an edge, and the mask
 * preserves every offset so the original text is still what specifiers are read
 * from.
 *
 * @packageDocumentation
 */

import {
  atStatementStart,
  maskSource,
  readStringLiteral,
  skipSpace,
  trimSpan,
  readBalanced,
  splitTopLevel,
  readObjectProperty,
} from "./sourceSyntax.js";

/** One imported binding. */
export interface ModuleImport {
  /** The local identifier. */
  readonly local: string;
  /** The imported export name, `default`, or `*` for a namespace. */
  readonly imported: string;
  /** The specifier as written. */
  readonly specifier: string;
}

/** One `export … from` binding. */
export interface ModuleReExport {
  /** The name this module exports, or `*`. */
  readonly exported: string;
  /** The name it takes from the target module, or `*`. */
  readonly imported: string;
  /** The specifier as written. */
  readonly specifier: string;
}

/** What one module says about its edges. */
export interface ModuleLinks {
  /** Every value import and require. */
  readonly imports: readonly ModuleImport[];
  /** Specifiers of side-effect imports — a bare package import with no bindings. */
  readonly sideEffectImports: readonly string[];
  /** Every re-export. */
  readonly reExports: readonly ModuleReExport[];
  /**
   * Local variables initialised with an array or another identifier.
   *
   * Only these two shapes: `const themes = [a, b]` and `const themes = other`.
   * Anything else — a call, an object, a conditional — is not a collection this
   * reader will follow.
   */
  readonly collections: ReadonlyMap<string, readonly string[]>;
}

/** Source extensions a relative specifier may resolve to. */
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"] as const;

/**
 * The source extensions a runtime extension may stand for.
 *
 * `import { x } from "./theme.js"` is the correct form for a TypeScript ESM
 * project, while the file on disk is `theme.ts`. The bundler and `tsc` map it;
 * a reader that did not would report a working import as unresolved.
 */
const EXTENSION_ALIASES: Readonly<Record<string, readonly string[]>> = {
  ".js": [".ts", ".tsx"],
  ".jsx": [".tsx"],
  ".mjs": [".mts"],
  ".cjs": [".cts"],
};

/** Identifiers that are never a theme binding. */
const KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "of",
  "return",
  "satisfies",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "yield",
]);

/** Local alias: a specifier is a string literal at a known index. */
const readSpecifier = readStringLiteral;

/**
 * Find a keyword in a bounded window of masked source.
 *
 * @param masked - The masked text.
 * @param from - Where to start.
 * @param keyword - The word to find.
 * @returns Its index, or -1.
 */
function findKeyword(masked: string, from: number, keyword: string): number {
  const pattern = new RegExp(`\\b${keyword}\\b`, "gu");
  pattern.lastIndex = from;
  const match = pattern.exec(masked.slice(0, from + 600));
  return match === null ? -1 : match.index;
}

/**
 * Parse the clause between `import` and `from`.
 *
 * @param clause - Masked clause text.
 * @returns Value bindings, in source order.
 */
function parseImportClause(clause: string): { local: string; imported: string }[] {
  const trimmed = clause.trim();

  // `import type { Theme } from …` carries no value. A mixed clause is handled
  // below by skipping individual `type` specifiers.
  if (/^type\b/u.test(trimmed)) return [];

  const bindings: { local: string; imported: string }[] = [];
  const named = /\{([\s\S]*)\}/u.exec(trimmed);

  if (named !== null) {
    for (const raw of (named[1] ?? "").split(",")) {
      const part = raw.trim();
      if (part === "" || /^type\b/u.test(part)) continue;

      const alias = /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/u.exec(part);
      if (alias?.[1] !== undefined && alias[2] !== undefined) {
        bindings.push({ local: alias[2], imported: alias[1] });
        continue;
      }

      if (/^[A-Za-z_$][\w$]*$/u.test(part)) bindings.push({ local: part, imported: part });
    }
  }

  const beforeNamed = trimmed.slice(0, named?.index ?? trimmed.length);

  const namespace = /^\s*\*\s*as\s+([A-Za-z_$][\w$]*)/u.exec(beforeNamed);
  if (namespace?.[1] !== undefined) {
    bindings.push({ local: namespace[1], imported: "*" });
    return bindings;
  }

  const defaultImport = /^\s*([A-Za-z_$][\w$]*)\s*(?:,|$)/u.exec(beforeNamed);
  if (defaultImport?.[1] !== undefined && defaultImport[1] !== "type") {
    bindings.push({ local: defaultImport[1], imported: "default" });
  }

  return bindings;
}

/**
 * Parse an `export { … }` clause.
 *
 * @param clause - Masked clause text.
 * @returns The names exported from the target, in source order.
 */
function parseReExportClause(clause: string): { exported: string; imported: string }[] {
  const bindings: { exported: string; imported: string }[] = [];

  for (const raw of clause.split(",")) {
    const part = raw.trim();
    if (part === "" || /^type\b/u.test(part)) continue;

    const alias = /^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/u.exec(part);
    if (alias?.[1] !== undefined && alias[2] !== undefined) {
      bindings.push({ exported: alias[2], imported: alias[1] });
      continue;
    }

    if (/^[A-Za-z_$][\w$]*$/u.test(part)) bindings.push({ exported: part, imported: part });
  }

  return bindings;
}

/**
 * Read the initializer of a declaration.
 *
 * Stops at a statement boundary at bracket depth zero, so a following statement
 * cannot contribute identifiers.
 *
 * @param masked - The masked text.
 * @param start - The index just after `=`.
 * @returns The initializer text.
 */
function readInitializer(masked: string, start: number): string {
  let depth = 0;

  for (let index = start; index < masked.length; index += 1) {
    const character = masked[index];

    if (character === "(" || character === "[" || character === "{") depth += 1;
    else if (character === ")" || character === "]" || character === "}") {
      depth -= 1;
      if (depth < 0) return masked.slice(start, index);
    } else if (character === ";" && depth === 0) {
      return masked.slice(start, index);
    } else if (character === "\n" && depth === 0) {
      const before = masked.slice(start, index).trimEnd();
      // A line ending in an operator continues the expression.
      if (!/[=+\-*/%&|,?:([{.<>!]$/u.test(before)) return masked.slice(start, index);
    }
  }

  return masked.slice(start);
}

/**
 * The identifiers an array or alias initializer mentions.
 *
 * @param expression - Masked initializer text.
 * @returns Names in source order, without properties or keywords.
 */
function identifiersIn(expression: string): string[] {
  const names: string[] = [];

  for (const match of expression.matchAll(/[A-Za-z_$][\w$]*/gu)) {
    const name = match[0];
    if (KEYWORDS.has(name)) continue;

    const beforeOne = expression[match.index - 1] ?? "";
    const beforeTwo = expression.slice(Math.max(0, match.index - 2), match.index);
    // `theme.primary` is a property; `...theme` is a spread of the name.
    if (beforeOne === "." && beforeTwo !== "..") continue;

    const after = expression.slice(match.index + name.length).trimStart();
    if (after.startsWith(":")) continue;

    if (!names.includes(name)) names.push(name);
  }

  return names;
}

/**
 * Parse the module edges of one source file.
 *
 * @param source - The module text.
 * @returns Its value imports, re-exports and local collections.
 */
export function readModuleLinks(source: string): ModuleLinks {
  const masked = maskSource(source);
  const imports: ModuleImport[] = [];
  const sideEffectImports: string[] = [];
  const reExports: ModuleReExport[] = [];
  const collections = new Map<string, string[]>();

  const importPattern = /\bimport\b/gu;
  let match: RegExpExecArray | null;

  while ((match = importPattern.exec(masked)) !== null) {
    if (!atStatementStart(masked, match.index)) continue;

    const after = skipSpace(masked, match.index + "import".length);
    const character = masked[after];

    // `import(…)` and `import.meta` are not static value imports.
    if (character === "(" || character === ".") continue;

    if (character === '"' || character === "'" || character === "`") {
      const specifier = readSpecifier(source, masked, after);
      if (specifier !== undefined) {
        sideEffectImports.push(specifier.value);
        importPattern.lastIndex = specifier.end;
      }
      continue;
    }

    const from = findKeyword(masked, after, "from");
    if (from === -1) continue;

    const specifier = readSpecifier(source, masked, skipSpace(masked, from + "from".length));
    if (specifier === undefined) continue;

    for (const binding of parseImportClause(masked.slice(after, from))) {
      imports.push({ ...binding, specifier: specifier.value });
    }

    importPattern.lastIndex = specifier.end;
  }

  const exportPattern = /\bexport\b/gu;
  while ((match = exportPattern.exec(masked)) !== null) {
    if (!atStatementStart(masked, match.index)) continue;

    const after = skipSpace(masked, match.index + "export".length);
    const character = masked[after];

    if (character === "*") {
      const from = findKeyword(masked, after, "from");
      if (from === -1) continue;

      const specifier = readSpecifier(source, masked, skipSpace(masked, from + "from".length));
      if (specifier === undefined) continue;

      const clause = masked.slice(after, from).trim();
      const named = /^\*\s+as\s+([A-Za-z_$][\w$]*)$/u.exec(clause);
      reExports.push({
        exported: named?.[1] ?? "*",
        imported: "*",
        specifier: specifier.value,
      });
      exportPattern.lastIndex = specifier.end;
      continue;
    }

    if (character === "{") {
      const close = masked.indexOf("}", after);
      if (close === -1) continue;

      const next = skipSpace(masked, close + 1);
      const from = masked.startsWith("from", next) ? next : -1;
      if (from === -1) continue;

      const specifier = readSpecifier(source, masked, skipSpace(masked, from + "from".length));
      if (specifier === undefined) continue;

      const clause = masked.slice(after + 1, close);
      if (/^\s*type\b/u.test(clause)) {
        exportPattern.lastIndex = specifier.end;
        continue;
      }

      for (const binding of parseReExportClause(clause)) {
        reExports.push({ ...binding, specifier: specifier.value });
      }
      exportPattern.lastIndex = specifier.end;
    }
  }

  // CommonJS. The package ships a `require` condition, so these are value
  // imports on a real runtime path.
  const requirePattern = /(?:const|let|var)\s+(\{[^}]*\}|[A-Za-z_$][\w$]*)\s*=\s*require\s*\(\s*(["'`])/gu;
  while ((match = requirePattern.exec(masked)) !== null) {
    const specifier = readSpecifier(source, masked, match.index + match[0].length - 1);
    if (specifier === undefined) continue;

    const target = match[1] ?? "";

    if (target.startsWith("{")) {
      for (const raw of target.slice(1, -1).split(",")) {
        const part = raw.trim();
        if (part === "") continue;

        const alias = /^([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*)$/u.exec(part);
        if (alias?.[1] !== undefined && alias[2] !== undefined) {
          imports.push({ local: alias[2], imported: alias[1], specifier: specifier.value });
          continue;
        }

        if (/^[A-Za-z_$][\w$]*$/u.test(part)) {
          imports.push({ local: part, imported: part, specifier: specifier.value });
        }
      }
    } else if (/^[A-Za-z_$][\w$]*$/u.test(target)) {
      imports.push({ local: target, imported: "*", specifier: specifier.value });
    }

    requirePattern.lastIndex = specifier.end;
  }

  // Local collections. `const themes = [...themvora, ...presetThemes]` is the
  // shape real provider files use, so one level of it is worth following.
  const declarationPattern = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*/gu;
  while ((match = declarationPattern.exec(masked)) !== null) {
    const name = match[1];
    if (name === undefined) continue;

    const start = match.index + match[0].length;
    const first = masked[skipSpace(masked, start)];
    if (first !== "[" && !/[A-Za-z_$]/u.test(first ?? "")) continue;

    const initializer = readInitializer(masked, start);
    const trimmed = initializer.trim();
    const isArray = first === "[";
    const isAlias = /^[A-Za-z_$][\w$]*$/u.test(trimmed);

    // A call is not a collection: `const themes = getAllThemes()` delegates to
    // code this reader cannot see.
    if (!isArray && !isAlias) continue;

    const identifiers = identifiersIn(initializer);
    if (identifiers.length > 0) collections.set(name, identifiers);
  }

  return { imports, sideEffectImports, reExports, collections };
}

/** A theme collection declared as a literal, such as a ThemePack. */
export interface ThemeCollectionDeclaration {
  /** The local or exported name. */
  readonly name: string;
  /** The identifiers listed in its `themes` array, in source order. */
  readonly identifiers: readonly string[];
}

/**
 * Find `{ name, themes: [a, b] }` collections in one module.
 *
 * The real Web Components and vanilla examples install a pack with
 * `runtime.use(solarPack)`. A pack is data, not computation, so its themes can
 * be read statically — but only when the array is a plain list of identifiers;
 * a spread or call inside it makes the collection unreadable rather than
 * guessed at.
 *
 * @param source - The module text.
 * @param property - The collection property, `themes` by default.
 * @returns Each readable collection declaration.
 */
export function readThemeCollections(
  source: string,
  property = "themes",
): readonly ThemeCollectionDeclaration[] {
  const masked = maskSource(source);
  const declarations = new Map<string, readonly string[]>();
  const pattern = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*\{/gu;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(masked)) !== null) {
    const name = match[1];
    const open = match.index + match[0].length - 1;
    const object = readBalanced(masked, open);
    if (name === undefined || object === undefined) continue;

    const read = readObjectProperty(masked, object, property);
    if (read.kind === "value") {
      const value = trimSpan(masked, read.expression);
      if (masked[value.start] === "[") {
        const array = readBalanced(masked, value.start);
        if (array !== undefined) {
          const identifiers: string[] = [];

          for (const part of splitTopLevel(masked, array)) {
            const text = masked.slice(part.start, part.end).trim();
            const bare = text.startsWith("...") ? text.slice(3).trim() : text;
            if (!/^[A-Za-z_$][\w$]*$/u.test(bare)) {
              identifiers.length = 0;
              break;
            }
            identifiers.push(bare);
          }

          if (identifiers.length > 0) declarations.set(name, identifiers);
        }
      }
    }

    pattern.lastIndex = object.end;
  }

  return [...declarations].map(([name, identifiers]) => ({ name, identifiers }));
}

/**
 * Resolve a relative specifier against the files a project walk found.
 *
 * Resolution is intentionally only the shapes a source import can take:
 * an exact file, an extensionless file, or a directory index. TypeScript path
 * aliases and package names are not resolved — those need a compiler's module
 * resolver, and guessing would be worse than saying "unresolved".
 *
 * @param importer - The importing file, workspace-relative.
 * @param specifier - The specifier as written.
 * @param files - Every project file the walk found.
 * @returns The resolved workspace-relative path, or undefined.
 */
export function resolveRelativeSpecifier(
  importer: string,
  specifier: string,
  files: ReadonlySet<string>,
): string | undefined {
  const clean = specifier.split("?")[0] ?? specifier;
  if (!clean.startsWith("./") && !clean.startsWith("../")) return undefined;

  const directory = importer.includes("/") ? importer.slice(0, importer.lastIndexOf("/")) : "";
  const stack: string[] = [];

  for (const segment of `${directory}/${clean}`.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (stack.length === 0) return undefined;
      stack.pop();
      continue;
    }
    stack.push(segment);
  }

  const base = stack.join("/");
  if (base === "" || /\.d\.[cm]?ts$/u.test(base)) return undefined;

  const extension = SOURCE_EXTENSIONS.find((candidate) => base.endsWith(candidate));

  if (extension !== undefined) {
    if (files.has(base)) return base;

    const stem = base.slice(0, -extension.length);
    for (const alternative of EXTENSION_ALIASES[extension] ?? []) {
      const candidate = `${stem}${alternative}`;
      if (files.has(candidate)) return candidate;
    }

    return undefined;
  }

  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (files.has(candidate)) return candidate;
  }

  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = `${base}/index${extension}`;
    if (files.has(candidate)) return candidate;
  }

  return undefined;
}

/** Where a name at a call site came from. */
export interface TracedBinding {
  /** The name as written at the call site. */
  readonly name: string;
  /** The specifier of the import that carries it. */
  readonly specifier: string;
  /** The export name at the resolved file, or `*` for a namespace. */
  readonly imported: string;
  /** The file it resolves to, when the specifier is a project-relative one. */
  readonly path?: string;
  /** The file that re-exported it, when one hop was followed. */
  readonly reExportedFrom?: string;
}

/** What tracing a provider's names found. */
export interface BindingTrace {
  /** Every binding that resolved to a project file. */
  readonly bindings: readonly TracedBinding[];
  /** Names with no project file behind them. */
  readonly unresolved: readonly string[];
  /** Every specifier the names passed through, for a message. */
  readonly specifiers: readonly string[];
}

/** The options `traceBindings` needs. */
export interface TraceOptions {
  /** The provider file's source. */
  readonly source: string;
  /** The names at the call site. */
  readonly names: readonly string[];
  /** The provider file, workspace-relative. */
  readonly importer: string;
  /** Every project file the walk found. */
  readonly files: ReadonlySet<string>;
  /** Read another module's source, for a re-export hop. */
  readonly read: (path: string) => Promise<string | null>;
}

/**
 * Trace provider names through imports, local collections, and one re-export.
 *
 * @param options - The provider, its names, and the project's files.
 * @returns The bindings that resolved, and the names that did not.
 */
export async function traceBindings(options: TraceOptions): Promise<BindingTrace> {
  const links = readModuleLinks(options.source);
  const imports = new Map<string, { imported: string; specifier: string }>();

  for (const entry of links.imports) {
    if (!imports.has(entry.local)) {
      imports.set(entry.local, { imported: entry.imported, specifier: entry.specifier });
    }
  }

  const bindings: TracedBinding[] = [];
  const unresolved: string[] = [];
  const specifiers = new Set<string>();
  /** Re-export links by file, so many names from one module read it once. */
  const linkCache = new Map<string, ModuleLinks>();

  const traceImport = async (
    name: string,
    imported: string,
    specifier: string,
  ): Promise<boolean> => {
    specifiers.add(specifier);
    const target = resolveRelativeSpecifier(options.importer, specifier, options.files);
    if (target === undefined) return false;

    let targetLinks = linkCache.get(target);
    if (targetLinks === undefined) {
      const source = await options.read(target);
      if (source === null) {
        bindings.push({ name, specifier, imported, path: target });
        return true;
      }
      targetLinks = readModuleLinks(source);
      linkCache.set(target, targetLinks);
    }

    const reExport =
      targetLinks.reExports.find((entry) => entry.exported === imported) ??
      targetLinks.reExports.find((entry) => entry.exported === "*");

    if (reExport === undefined) {
      bindings.push({ name, specifier, imported, path: target });
      return true;
    }

    const finalPath = resolveRelativeSpecifier(target, reExport.specifier, options.files);
    if (finalPath === undefined) return false;

    // `export * from "./theme"` re-exports the name under its own name; a named
    // re-export may rename it.
    const finalName = reExport.exported === "*" ? imported : reExport.imported;

    bindings.push({
      name,
      specifier,
      imported: finalName,
      path: finalPath,
      reExportedFrom: target,
    });
    return true;
  };

  for (const name of options.names) {
    const direct = imports.get(name);

    if (direct !== undefined) {
      const resolved = await traceImport(name, direct.imported, direct.specifier);
      if (!resolved) unresolved.push(name);
      continue;
    }

    const collection = links.collections.get(name);
    if (collection !== undefined) {
      let resolvedAny = false;
      for (const member of collection) {
        const imported = imports.get(member);
        if (imported === undefined) continue;
        const resolved = await traceImport(name, imported.imported, imported.specifier);
        resolvedAny = resolvedAny || resolved;
      }
      if (!resolvedAny) unresolved.push(name);
      continue;
    }

    unresolved.push(name);
  }

  return { bindings, unresolved, specifiers: [...specifiers] };
}
