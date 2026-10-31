/**
 * Reading a Themvora project, read-only.
 *
 * This module answers one question per candidate file: *can this be read, and
 * what did it say?* It never writes, never spawns, and never guesses.
 *
 * Three rules shape it.
 *
 * **Validation is core's.** A JSON theme document is checked with
 * `validateTheme()` from `@themvora/core`; nothing here re-derives which tokens
 * are required.
 *
 * **Unreadable is not invalid.** A generated project's registry is
 * `src/themes/themes.ts` — a TypeScript module importing `@themvora/core`. There
 * is no canonical loader for it, so it is reported as `unsupported` with the
 * path and a reason. It is *not* parsed with a regular expression, and the
 * generated showcase components are not treated as evidence of what a project
 * registers: the demo UI is a demo, not the registry.
 *
 * **Absence is normal.** A folder that is not a Themvora project produces
 * `missing`, not an error.
 *
 * @packageDocumentation
 */
import {
  getBuiltInThemes,
  loadThemeRegistry,
  readThemeDefinitions,
  validateTheme,
  type ThemeDefinition,
  type ThemeDefinitionSource,
} from "@themvora/core";

import {
  recognizeConsumers,
  recognizeHtmlConsumers,
  recognizeTemplateConsumers,
  type ApiAlias,
  type ConsumerCandidate,
} from "./consumers.js";
import {
  readModuleLinks,
  readThemeCollections,
  resolveRelativeSpecifier,
  traceBindings,
  type TracedBinding,
} from "./importGraph.js";
import { isRecord } from "./json.js";
import {
  readSourceDocument,
  regionAtLine,
  regionLabelOf,
  sourceFormatOf,
} from "./sourceRegions.js";
import { themeApisOf, type ThemeApiName } from "./themeApis.js";
import {
  MANIFEST_FILE,
  ROOT_THEME_FILE,
  THEME_FILE_SUFFIX,
  THEMES_DIRECTORY,
  THEME_MODULE_PATHS,
  THEMVORA_SCOPE,
  baseName,
  isConfigFileName,
  isThemeModuleName,
} from "./projectFiles.js";
import type {
  ConsumerEvidence,
  ProjectInspection,
  ProjectReader,
  ProviderResolution,
  ProviderUsage,
  RegistryEntry,
  RegistryStatus,
  RegistryThemeSource,
  ThemeEvidence,
  ThemeRelationship,
} from "./registry.js";
import { parseThemeDocument, shapeMessage } from "./themeDocument.js";
import { type CancellationToken, noneCancellationToken, throwIfCancelled } from "../services/cancellation.js";

/**
 * The theme APIs a file can reach, and how.
 *
 * A call to `generateTheme()` proves nothing on its own: a project may define a
 * function with that name. What makes the call canonical is that the name came
 * from a package that publicly exports it. Direct, aliased, namespace and
 * CommonJS bindings are all resolved through the same import edges, and only
 * names present in a verified package's export surface are accepted.
 */
export interface ThemeApiBinding {
  /** A real import or require of any `@themvora/*` package. */
  readonly imported: boolean;
  /** A real import of a package that exports core theme APIs. */
  readonly importedCore: boolean;
  /** Local name to canonical API. */
  readonly bindings: Readonly<Record<string, string>>;
  /** Local namespace to the canonical members it may expose. */
  readonly namespaces: Readonly<Record<string, readonly ThemeApiName[]>>;
  /** The canonical APIs the file imports, for messages and readability. */
  readonly apis: readonly ThemeApiName[];
  /** Aliases as written, for a message a reader can act on. */
  readonly aliased: readonly string[];
  /** A `require()` whose specifier is not a literal, so nothing can be bound. */
  readonly dynamicRequire: boolean;
}

/**
 * Read how a file reaches the Themvora API.
 *
 * Reuses the same module-edge reader the graph uses, so an aliased or
 * namespaced import cannot be recognized by one analyzer and missed by another.
 *
 * @param contents - The source text.
 * @param apiAliases - Local imports resolved through one verified API re-export.
 * @returns The verified theme-API bindings.
 */
export function themeApiBinding(
  contents: string,
  apiAliases: ReadonlyMap<string, ApiAlias> = new Map(),
): ThemeApiBinding {
  const links = readModuleLinks(contents);
  const bindings: Record<string, string> = {};
  const namespaces: Record<string, readonly ThemeApiName[]> = {};
  const apis = new Set<ThemeApiName>();
  const aliased: string[] = [];
  let importedCore = false;

  for (const entry of links.imports) {
    const exported = themeApisOf(entry.specifier);
    if (exported === undefined) continue;
    importedCore = true;

    if (entry.imported === "*") {
      namespaces[entry.local] = exported;
      for (const name of exported) apis.add(name);
      continue;
    }

    if (!(exported as readonly string[]).includes(entry.imported)) continue;

    const canonical = entry.imported as ThemeApiName;
    bindings[entry.local] = canonical;
    apis.add(canonical);
    if (entry.local !== canonical) aliased.push(`${canonical} as ${entry.local}`);
  }

  // One re-export hop, when the caller resolved one. This keeps a project's
  // local `theme-api.ts` wrapper from looking like a local function.
  for (const [local, alias] of apiAliases) {
    if (bindings[local] !== undefined || namespaces[local] !== undefined) continue;
    const exported = themeApisOf(alias.specifier);
    if (exported === undefined || !(exported as readonly string[]).includes(alias.imported)) continue;

    importedCore = true;
    const canonical = alias.imported as ThemeApiName;
    bindings[local] = canonical;
    apis.add(canonical);
    if (local !== canonical) aliased.push(`${canonical} as ${local}`);
  }

  const imported =
    links.imports.some((entry) => entry.specifier.startsWith(THEMVORA_SCOPE)) ||
    links.sideEffectImports.some((specifier) => specifier.startsWith(THEMVORA_SCOPE));

  if (links.sideEffectImports.some((specifier) => themeApisOf(specifier) !== undefined)) {
    importedCore = true;
  }

  // `require(specifier)` with a variable cannot be resolved, and pretending the
  // file has no Themvora usage would be wrong too — so it is its own state.
  const dynamicRequire = /require\s*\(\s*[^"')\s]/u.test(contents);

  return { imported, importedCore, bindings, namespaces, apis: [...apis], aliased, dynamicRequire };
}

/** A source file this reader is willing to open. */
const ANALYZABLE_SOURCE_PATTERN = /\.(?:[cm]?[jt]sx?|vue|svelte|astro|html?)$/iu;

/**
 * The calls that make a file a theme source.
 *
 * Matched on text, before parsing: it decides which files are worth opening, and
 * a file that calls `getBuiltInThemes()` has themes even though this reader
 * cannot resolve them.
 */
const THEME_API_MARKERS =
  /\b(?:defineTheme|generateTheme|getPresetThemes|getBrandPresets|getBuiltInThemes)\s*\(/u;

/** How many files the definition scan will open in one pass. */
const MAX_SCANNED_SOURCES = 400;

/** Status precedence, best first. Used to summarise a project in one word. */
const RANK: Record<RegistryStatus, number> = {
  supported: 3,
  malformed: 2,
  unsupported: 1,
  missing: 0,
};

/**
 * Read one JSON theme document.
 *
 * The shape check is shared with the validate command, so a file is described the
 * same way wherever it is encountered. Validity is core's answer, applied below.
 *
 * @param path - The workspace-relative path, for messages.
 * @param text - The file's contents.
 * @returns The entry describing what was found.
 */
function readThemeDocument(path: string, text: string): RegistryEntry {
  const document = parseThemeDocument(text);

  if (document.shape !== "themes") {
    return {
      kind: "theme-json",
      path,
      status: "malformed",
      detail: shapeMessage(path, document) ?? `${path} could not be read.`,
    };
  }

  const themes = document.themes;
  const themeSources: RegistryThemeSource[] = themes.map((theme) => ({
    name: theme.name,
    ...(theme.meta?.mode === undefined ? {} : { mode: theme.meta.mode }),
  }));
  const invalid = themes.filter((theme) => !validateTheme(theme).valid);
  if (invalid.length > 0) {
    const names = invalid.map((theme) => theme.name ?? "unnamed").join(", ");
    return {
      kind: "theme-json",
      path,
      status: "malformed",
      detail: `${path} is missing required tokens: ${names}.`,
      themeSources,
    };
  }

  return {
    kind: "theme-json",
    path,
    status: "supported",
    detail: `${path} — ${themes.length} theme${themes.length === 1 ? "" : "s"}.`,
    themes,
    themeSources,
  };
}

/**
 * Why a generated registry module cannot be read yet.
 *
 * Stated once, because the same sentence appears for both paths and a second
 * wording would drift.
 */
/**
 * Build a registry entry from definitions read out of a file.
 *
 * Validated before it is offered: a definition that reads but does not satisfy
 * the schema is the user's file being wrong, which is `malformed`, not
 * `unsupported`. Showing its themes as usable would be worse than saying so.
 *
 * @param path - The workspace-relative path.
 * @param themes - The definitions found.
 * @returns The entry.
 */
function entryFromDefinitions(
  path: string,
  definitions: readonly ThemeDefinitionSource[],
  problems: readonly string[] = [],
  regionOf?: (line: number, column: number) => string | undefined,
  regionLabel?: string,
): RegistryEntry {
  const themes = definitions.map((entry) => entry.theme);
  const themeSources: RegistryThemeSource[] = definitions.map((entry) => {
    const region = regionOf?.(entry.location.line, entry.location.column);

    return {
      name: entry.theme.name,
      ...(entry.theme.meta?.mode === undefined ? {} : { mode: entry.theme.meta.mode }),
      ...(entry.binding === undefined ? {} : { binding: entry.binding }),
      ...(entry.origin === undefined ? {} : { origin: entry.origin }),
      ...(entry.generateOptions === undefined ? {} : { generateOptions: entry.generateOptions }),
      ...(region === undefined ? {} : { region }),
      location: entry.location,
    };
  });
  const carried = problems.length === 0 ? {} : { problems };
  const invalid = definitions
    .map((entry) => ({ theme: entry.theme, report: validateTheme(entry.theme) }))
    .find((entry) => !entry.report.valid);

  if (invalid !== undefined) {
    const issue = invalid.report.issues[0];
    return {
      kind: "theme-module",
      path,
      status: "malformed",
      detail: `${path} — theme "${invalid.theme.name}" is invalid${issue === undefined ? "." : `: ${issue.message}`}`,
      themeSources,
      ...(regionLabel === undefined ? {} : { region: regionLabel }),
      ...carried,
    };
  }

  const unread = problems.length === 0 ? "" : ` ${problems.length} call(s) could not be read.`;
  return {
    kind: "theme-module",
    path,
    status: "supported",
    detail: `${path} — ${themes.length} theme${themes.length === 1 ? "" : "s"} defined in this file.${unread}`,
    themes,
    themeSources,
    ...(regionLabel === undefined ? {} : { region: regionLabel }),
    ...carried,
  };
}

/**
 * Read a generated registry module.
 *
 * The loader is core's, so the CLI, the editor and any future consumer share one
 * interpretation of `themes.ts`. Nothing here executes project code: the module is
 * parsed as literals, and a construct outside the canonical shape is reported
 * rather than evaluated.
 *
 * The status split matters. A registry that parsed but holds invalid data is
 * `malformed` — the user's file is wrong. One whose shape is not understood is
 * `unsupported` — our limitation, and it reads as "not readable yet" rather than
 * blaming the file.
 *
 * @param path - The workspace-relative path, for the node and its detail.
 * @param contents - The module's text.
 * @returns The registry entry.
 */
function readThemeModule(path: string, contents: string): RegistryEntry {
  const result = loadThemeRegistry(contents);

  if (!result.ok) {
    return {
      kind: "theme-module",
      path,
      status: result.reason === "invalid-theme" ? "malformed" : "unsupported",
      detail: `${path} — ${result.message}`,
    };
  }

  const count = result.themes.length;
  return {
    kind: "theme-module",
    path,
    status: "supported",
    detail: `${path} — ${count} theme${count === 1 ? "" : "s"}.`,
    themes: result.themes,
    themeSources: result.themes.map((theme, index) => ({
      name: theme.name,
      ...(theme.meta?.mode === undefined ? {} : { mode: theme.meta.mode }),
      origin: result.origins[index] ?? "definition",
    })),
  };
}

/**
 * Why a `theme.config.*` module cannot be read yet.
 *
 * Distinct from a registry module: the config is loaded by the *build tool*
 * at build time, so reading it here would mean executing workspace TypeScript.
 */
const CONFIG_REASON =
  "a build-time configuration module; reading it means executing workspace TypeScript, which this extension does not do";

/**
 * Resolve one level of API re-export for a consumer file's imports.
 *
 * The Stage 4 graph follows re-exports for *theme values*. A project may also
 * wrap a provider or runtime in its own module, and Stage 5 allows exactly one
 * such hop for API identity. Only a re-export that lands on a `@themvora/*`
 * package is accepted; a chain of local modules is not.
 *
 * @param path - The importing file, workspace-relative.
 * @param contents - Its text.
 * @param files - Every project file the walk found.
 * @param read - Reads another module, with the inspection's cache.
 * @returns Local name to the public API it ultimately names.
 */
async function apiAliasesFor(
  path: string,
  contents: string,
  files: ReadonlySet<string>,
  read: (path: string) => Promise<string | null>,
): Promise<Map<string, ApiAlias>> {
  const aliases = new Map<string, ApiAlias>();

  for (const entry of readModuleLinks(contents).imports) {
    if (!entry.specifier.startsWith(".")) continue;

    const target = resolveRelativeSpecifier(path, entry.specifier, files);
    if (target === undefined) continue;

    const targetSource = await read(target);
    if (targetSource === null) continue;

    const links = readModuleLinks(targetSource);
    const reExport =
      links.reExports.find((candidate) => candidate.exported === entry.imported) ??
      links.reExports.find((candidate) => candidate.exported === "*");

    if (reExport === undefined || !reExport.specifier.startsWith("@themvora/")) continue;

    aliases.set(entry.local, {
      specifier: reExport.specifier,
      imported: reExport.exported === "*" ? entry.imported : reExport.imported,
    });
  }

  return aliases;
}

/** The names a theme file exports, and the themes behind each. */
interface ThemeFileFacts {
  /** Every theme defined in the file. */
  readonly themes: readonly ThemeDefinition[];
  /** Export name to the theme(s) that name carries. */
  readonly exports: ReadonlyMap<string, readonly ThemeDefinition[]>;
  /** Export names that carry the whole collection, as the generated registry's `themes` does. */
  readonly aggregates: readonly string[];
  /** A `ThemePack`-shaped export, resolved to the themes its `themes` array names. */
  readonly packs: ReadonlyMap<string, readonly ThemeDefinition[]>;
  /** Which canonical API produced each theme. */
  readonly origins: ReadonlyMap<ThemeDefinition, ThemeDefinitionSource["origin"]>;
}

/**
 * Turn the verified bindings into strict reader options.
 *
 * Strict mode removes the reader's name defaults, so a local `getPresetThemes`
 * cannot reach the catalog. Namespace members are restricted to the verified
 * exports of the package the namespace was imported from.
 *
 * @param binding - What the file imports.
 * @returns Reader options.
 */
function readOptionsFor(binding: ThemeApiBinding): {
  bindings: Readonly<Record<string, string>>;
  namespaces: Readonly<Record<string, readonly string[]>>;
  strict: true;
} {
  return { bindings: binding.bindings, namespaces: binding.namespaces, strict: true };
}

/**
 * Build the export facts for a file read by `readThemeDefinitions`.
 *
 * A pack is data as well: `runtime.use(solarPack)` can only be attributed when
 * `solarPack = { themes: [solarLight, solarDark] }` resolves through the same
 * symbol map the definitions already produced.
 *
 * @param source - The file's text, for pack literals.
 * @param definitions - The definitions found.
 * @returns The facts, with no aggregate exports.
 */
function factsFromDefinitions(
  source: string,
  definitions: readonly ThemeDefinitionSource[],
): ThemeFileFacts {
  const themes = definitions.map((entry) => entry.theme);
  const exports = new Map<string, ThemeDefinition[]>();
  const origins = new Map<ThemeDefinition, ThemeDefinitionSource["origin"]>();

  for (const entry of definitions) {
    if (entry.origin !== undefined) origins.set(entry.theme, entry.origin);
    if (entry.binding === undefined) continue;
    const named = exports.get(entry.binding) ?? [];
    named.push(entry.theme);
    exports.set(entry.binding, named);
  }

  const packs = new Map<string, ThemeDefinition[]>();

  // Collections an import can name: a `ThemePack` object and a plain exported
  // array (`export const themes = [a, b]`) are both data, and both are used in
  // real projects.
  const declarations = [
    ...readModuleLinks(source).collections.entries(),
    ...readThemeCollections(source).map((entry) => [entry.name, entry.identifiers] as const),
  ];

  for (const [name, identifiers] of declarations) {
    const resolved = identifiers.map((identifier) => exports.get(identifier));
    if (resolved.some((entry) => entry === undefined || entry.length === 0)) continue;

    const seen = new Set<ThemeDefinition>();
    const packed: ThemeDefinition[] = [];

    for (const entry of resolved) {
      for (const theme of entry ?? []) {
        if (seen.has(theme)) continue;
        seen.add(theme);
        packed.push(theme);
      }
    }

    if (packed.length > 0) packs.set(name, packed);
  }

  return { themes, exports, aggregates: [], packs, origins };
}

/**
 * The themes an import symbol carries.
 *
 * `*` is deliberately not resolved: a namespace import says the module was
 * imported, not which of its themes the provider supplied.
 *
 * @param binding - The traced binding.
 * @param facts - Facts by file.
 * @returns The themes, or an empty list when the symbol is not attributable.
 */
function themesForBinding(
  binding: TracedBinding,
  facts: ReadonlyMap<string, ThemeFileFacts>,
): readonly ThemeDefinition[] {
  if (binding.path === undefined || binding.imported === "*") return [];

  const file = facts.get(binding.path);
  if (file === undefined) return [];
  if (file.aggregates.includes(binding.imported)) return file.themes;

  const pack = file.packs.get(binding.imported);
  if (pack !== undefined) return pack;

  return file.exports.get(binding.imported) ?? [];
}

/** Evidence strength, strongest first. A proven registration outranks a hint. */
const EVIDENCE_RANK: Readonly<Record<ThemeEvidence, number>> = {
  registered: 4,
  "partially-resolved": 3,
  "catalog-source": 2,
  "defined-unregistered": 1,
};

/**
 * Keep the stronger of two evidence levels.
 *
 * @param left - Current evidence.
 * @param right - Candidate evidence.
 * @returns The stronger level.
 */
function strongestEvidence(left: ThemeEvidence, right: ThemeEvidence): ThemeEvidence {
  return EVIDENCE_RANK[right] > EVIDENCE_RANK[left] ? right : left;
}

/**
 * Trace each provider's names across files, and attach the consumers to themes.
 *
 * A provider is `resolved` only when every name reached a theme definition.
 * A name that imported fine but named something other than a theme is
 * `partially-resolved` — the import is real, the association is not — which is
 * the honest middle state this graph exists to keep.
 *
 * @param options - Providers, sources, facts, files and a reader.
 * @returns The enriched providers and one relationship per discovered theme.
 */
async function traceProviders(options: {
  readonly providers: readonly ProviderUsage[];
  readonly sources: ReadonlyMap<string, string>;
  readonly facts: ReadonlyMap<string, ThemeFileFacts>;
  readonly registries: readonly RegistryEntry[];
  readonly files: ReadonlySet<string>;
  readonly read: (path: string) => Promise<string | null>;
  /** Canonical catalog theme names, for markup attribute identifiers. */
  readonly catalogNames: ReadonlySet<string>;
  /** The origin of each relationship's theme, keyed like the relationship. */
  readonly relationshipOrigins: ReadonlyMap<string, ThemeDefinitionSource["origin"]>;
}): Promise<{ providers: ProviderUsage[]; relationships: ThemeRelationship[] }> {
  const relationships = new Map<
    string,
    {
      name: string;
      definedIn: string;
      mode?: string;
      family?: string;
      usedBy: Set<string>;
      evidence: ThemeEvidence;
    }
  >();

  for (const entry of options.registries) {
    for (const theme of entry.themes ?? []) {
      const mode = theme.meta?.mode;
      const family = theme.meta?.family;
      const key = `${entry.path}\u0000${theme.name}\u0000${mode ?? ""}`;

      if (!relationships.has(key)) {
        const origin = options.facts.get(entry.path)?.origins.get(theme);
        relationships.set(key, {
          name: theme.name,
          definedIn: entry.path,
          ...(mode === undefined ? {} : { mode }),
          ...(family === undefined ? {} : { family }),
          usedBy: new Set(),
          evidence: origin === "catalog" ? "catalog-source" : "defined-unregistered",
        });
      }
    }
  }

  const tracedProviders: ProviderUsage[] = [];

  for (const provider of options.providers) {
    if (provider.registrationOnly === true) {
      tracedProviders.push({ ...provider, evidence: "registration-only" });
      continue;
    }

    if (provider.input === "absent") {
      tracedProviders.push({ ...provider, evidence: "unresolved", resolution: "unresolved" });
      continue;
    }

    if (provider.input === "dynamic") {
      tracedProviders.push({ ...provider, evidence: "dynamic-unverified" });
      continue;
    }

    if (provider.directNames === true) {
      const catalogMatches: string[] = [];
      const projectMatches: string[] = [];
      const unresolved: string[] = [];

      for (const name of provider.names) {
        if (options.catalogNames.has(name)) {
          catalogMatches.push(name);

          // A catalog-origin project definition with this name is the same
          // canonical theme the element names; a project-origin collision is
          // not, and is handled below.
          for (const [key, relationship] of relationships) {
            if (relationship.name !== name) continue;
            if (options.relationshipOrigins.get(key) !== "catalog") continue;
            relationship.usedBy.add(provider.path);
            relationship.evidence = strongestEvidence(relationship.evidence, "registered");
          }
          continue;
        }

        let matched = false;
        for (const relationship of relationships.values()) {
          if (relationship.name !== name) continue;
          matched = true;
          relationship.usedBy.add(provider.path);
          relationship.evidence = strongestEvidence(relationship.evidence, "partially-resolved");
        }

        if (matched) projectMatches.push(name);
        else unresolved.push(name);
      }

      const anyResolved = catalogMatches.length + projectMatches.length > 0;
      const allCatalog =
        provider.names.length > 0 &&
        catalogMatches.length === provider.names.length &&
        projectMatches.length === 0 &&
        unresolved.length === 0;
      const resolution: ProviderResolution = allCatalog
        ? "resolved"
        : anyResolved
          ? "partially-resolved"
          : "unresolved";
      const evidence: ConsumerEvidence = allCatalog
        ? "registered"
        : anyResolved
          ? "partially-resolved"
          : "unresolved";
      const reason = allCatalog
        ? undefined
        : projectMatches.length > 0
          ? "names match discovered project themes, but the element resolves identifiers against its runtime catalog; catalog membership is not established"
          : "the themes attribute names identifiers that are neither canonical catalog themes nor discovered project themes";

      tracedProviders.push({
        ...provider,
        ...(unresolved.length === 0 ? {} : { unresolved }),
        resolution,
        evidence,
        ...(reason === undefined ? {} : { reason }),
      });
      continue;
    }

    const source = provider.traceSource ?? options.sources.get(provider.path);
    if (source === undefined) {
      tracedProviders.push({ ...provider, evidence: "unresolved" });
      continue;
    }

    const trace = await traceBindings({
      source,
      names: provider.names,
      importer: provider.path,
      files: options.files,
      read: options.read,
    });

    const importsFrom: string[] = [];
    const unresolved: string[] = [];
    const touched = new Set<string>();
    const localFacts = options.facts.get(provider.path);
    let matchedAny = false;
    let allResolved = true;

    for (const name of provider.names) {
      const bindings = trace.bindings.filter((entry) => entry.name === name);

      // A provider file may define or collect its themes locally. The import
      // trace cannot see that, but the same file's facts can.
      const localThemes =
        localFacts === undefined
          ? []
          : (localFacts.packs.get(name) ?? localFacts.exports.get(name) ?? []);

      let matched = localThemes.length;
      let complete = bindings.length > 0 || localThemes.length > 0;

      for (const theme of localThemes) {
        const key = `${provider.path}\u0000${theme.name}\u0000${theme.meta?.mode ?? ""}`;
        const relationship = relationships.get(key);
        if (relationship !== undefined) {
          relationship.usedBy.add(provider.path);
          touched.add(key);
        }
      }

      for (const binding of bindings) {
        if (binding.path !== undefined && !importsFrom.includes(binding.path)) {
          importsFrom.push(binding.path);
        }

        const themes = themesForBinding(binding, options.facts);
        if (themes.length === 0) {
          complete = false;
          continue;
        }

        matched += themes.length;

        if (binding.path !== undefined) {
          for (const theme of themes) {
            const key = `${binding.path}\u0000${theme.name}\u0000${theme.meta?.mode ?? ""}`;
            const relationship = relationships.get(key);
            if (relationship !== undefined) {
              relationship.usedBy.add(provider.path);
              touched.add(key);
            }
          }
        }
      }

      if (matched > 0) matchedAny = true;
      if (!complete) {
        unresolved.push(name);
        allResolved = false;
      }
    }

    const resolution: ProviderResolution = !matchedAny
      ? "unresolved"
      : allResolved
        ? "resolved"
        : "partially-resolved";

    // The trace resolution asks "did every name find its themes?". The evidence
    // asks "what does this consumer use prove?". They differ when an import
    // resolved but named nothing the project defines: the relationship is
    // partial, not absent.
    const evidence: ConsumerEvidence =
      resolution === "resolved"
        ? "registered"
        : matchedAny || trace.bindings.length > 0
          ? "partially-resolved"
          : "unresolved";

    if (evidence === "registered" || evidence === "partially-resolved") {
      for (const key of touched) {
        const relationship = relationships.get(key);
        if (relationship !== undefined) {
          relationship.evidence = strongestEvidence(relationship.evidence, evidence);
        }
      }
    }

    tracedProviders.push({
      path: provider.path,
      names: provider.names,
      ...(provider.integration === undefined ? {} : { integration: provider.integration }),
      ...(provider.api === undefined ? {} : { api: provider.api }),
      ...(provider.input === undefined ? {} : { input: provider.input }),
      ...(importsFrom.length === 0 ? {} : { importsFrom }),
      ...(unresolved.length === 0 ? {} : { unresolved }),
      ...(provider.reason === undefined ? {} : { reason: provider.reason }),
      ...(provider.location === undefined ? {} : { location: provider.location }),
      ...(provider.region === undefined ? {} : { region: provider.region }),
      resolution,
      evidence,
    });
  }

  const list = [...relationships.values()]
    .map((entry) => ({
      name: entry.name,
      definedIn: entry.definedIn,
      ...(entry.mode === undefined ? {} : { mode: entry.mode }),
      ...(entry.family === undefined ? {} : { family: entry.family }),
      usedBy: [...entry.usedBy].sort(),
      evidence: entry.evidence,
    }))
    .sort(
      (left, right) =>
        left.definedIn.localeCompare(right.definedIn) ||
        left.name.localeCompare(right.name) ||
        (left.mode ?? "").localeCompare(right.mode ?? ""),
    );

  return { providers: tracedProviders, relationships: list };
}

/**
 * Inspect one project folder.
 *
 * @param root - The absolute folder path. Echoed back, never resolved.
 * @param reader - The read-only filesystem the inspection may use.
 * @param cancellationToken - Optional token to cancel the inspection.
 * @returns The inspection result.
 * @throws {CancellationError} If the inspection was cancelled.
 */
export async function inspectProject(
  root: string,
  reader: ProjectReader,
  cancellationToken: CancellationToken = noneCancellationToken,
): Promise<ProjectInspection> {
  throwIfCancelled(cancellationToken);
  const registries: RegistryEntry[] = [];
  const notes: string[] = [];
  /** What each theme file exports, for the cross-file trace below. */
  const facts = new Map<string, ThemeFileFacts>();
  /** Provider sources, kept so the trace runs after every file has been read. */
  const providerSources = new Map<string, string>();

  // One read per file per inspection. Consumer recognition and the graph can
  // both ask for a re-export target that the walk already touched; caching
  // keeps a refresh from becoming several passes over the same sources.
  const sourceCache = new Map<string, string | null>();
  const readSource = async (path: string): Promise<string | null> => {
    throwIfCancelled(cancellationToken);
    const cached = sourceCache.get(path);
    if (cached !== undefined) return cached;
    const text = await reader.read(path);
    sourceCache.set(path, text);
    return text;
  };

  // --- dependency evidence ---------------------------------------------------
  const packages: string[] = [];
  const manifestText = await readSource(MANIFEST_FILE);

  if (manifestText === null) {
    notes.push(`No ${MANIFEST_FILE} found.`);
  } else {
    let manifest: unknown;
    try {
      manifest = JSON.parse(manifestText);
    } catch {
      manifest = null;
      notes.push(`${MANIFEST_FILE} is not valid JSON.`);
    }

    if (isRecord(manifest)) {
      for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
        const block = manifest[field];
        if (!isRecord(block)) continue;
        for (const name of Object.keys(block)) {
          if (name.startsWith(THEMVORA_SCOPE)) packages.push(name);
        }
      }
    }
  }

  // --- configuration and registry modules ------------------------------------
  // Discovered by file name, not by location. A project may keep its theme
  // configuration wherever it likes — `src/theme/theme.config.ts` is as valid as
  // `theme.config.ts` — and an editor that only looked at the root reported a
  // perfectly wired project as having nothing in it. The walk is bounded by the
  // reader, so this stays a scan of source rather than of the whole disk.
  const files = [...(await reader.walk())].sort();
  const fileSet = new Set(files);
  const canonicalModules: readonly string[] = THEME_MODULE_PATHS;

  const configPaths = files.filter((path) => isConfigFileName(baseName(path)));
  const modulePaths = [
    // Canonical paths first: the file a user most likely meant is listed first.
    ...canonicalModules.filter((path) => files.includes(path)),
    ...files.filter(
      (path) => isThemeModuleName(baseName(path)) && !canonicalModules.includes(path),
    ),
  ];

  for (const path of configPaths) {
    const contents = await readSource(path);
    if (contents === null) continue;

    // A file named `theme.config.ts` is not necessarily build configuration: in
    // a real project it often *is* the theme module, imported by `main.tsx`. Read
    // the definitions first, and only report it as a config module when it holds
    // none — otherwise a working project would be described as unreadable.
    const aliases = await apiAliasesFor(path, contents, fileSet, readSource);
    const binding = themeApiBinding(contents, aliases);
    const found = readThemeDefinitions(contents, readOptionsFor(binding));
    if (found.definitions.length > 0) {
      facts.set(path, factsFromDefinitions(contents, found.definitions));
      registries.push(
        entryFromDefinitions(
          path,
          found.definitions,
          found.problems.map((problem) => problem.message),
        ),
      );
      continue;
    }

    registries.push({
      kind: "config",
      path,
      status: "unsupported",
      detail: `${path} is ${CONFIG_REASON}.`,
    });
  }

  for (const path of modulePaths) {
    const contents = await readSource(path);
    if (contents === null) continue;
    const entry = readThemeModule(path, contents);
    registries.push(entry);

    // The generated registry exports `themes`, the whole collection. Importing
    // that name is the one aggregate association this reader can stand behind.
    if (entry.themes !== undefined) {
      const origins = new Map<ThemeDefinition, ThemeDefinitionSource["origin"]>();

      for (const source of entry.themeSources ?? []) {
        const theme = entry.themes.find(
          (candidate) =>
            candidate.name === source.name &&
            (candidate.meta?.mode ?? "") === (source.mode ?? ""),
        );
        if (theme !== undefined && source.origin !== undefined) origins.set(theme, source.origin);
      }

      facts.set(path, {
        themes: entry.themes,
        exports: new Map(),
        aggregates: ["themes"],
        packs: new Map(),
        origins,
      });
    }
  }

  // --- themes defined outside the canonical registry --------------------------
  // A project may define themes in any file it likes. `defineTheme()` returns its
  // argument unchanged, so a literal is the theme — no evaluation needed. Only
  // files the registry loader has not already covered are read here, or the
  // canonical registry's themes would be listed twice.
  const covered = new Set([...modulePaths, ...configPaths]);
  const providers: ProviderUsage[] = [];

  // Any source file that calls a Themvora theme API, not only files whose path
  // says "theme": a project may define its themes in `brand.ts` or `palette.ts`.
  // Bounded, because this reads files to decide: the walk is already capped, and
  // the slice keeps a refresh from becoming a full-project parse.
  const analyzable = files.filter(
    (path) => !covered.has(path) && ANALYZABLE_SOURCE_PATTERN.test(path),
  );
  const candidates = [
    ...analyzable.filter((path) => sourceFormatOf(path) !== "html"),
    ...analyzable.filter((path) => sourceFormatOf(path) === "html"),
  ].slice(0, MAX_SCANNED_SOURCES);

  const pushProvider = (consumer: ConsumerCandidate): void => {
    providers.push({
      path: consumer.path,
      names: consumer.names,
      integration: consumer.integration,
      api: consumer.api,
      input: consumer.input,
      location: consumer.location,
      ...(consumer.region === undefined ? {} : { region: consumer.region }),
      ...(consumer.reason === undefined ? {} : { reason: consumer.reason }),
      ...(consumer.registrationOnly === true ? { registrationOnly: true } : {}),
      ...(consumer.directNames === true ? { directNames: true } : {}),
      ...(consumer.traceSource === undefined ? {} : { traceSource: consumer.traceSource }),
    });
  };

  for (const path of candidates) {
    throwIfCancelled(cancellationToken);
    const contents = await readSource(path);
    if (contents === null) continue;

    const document = readSourceDocument(path, contents);

    if (document.format === "html") {
      // HTML is markup, not JavaScript. Only the real provider element and its
      // themes attribute are read; no JS analyzer sees the document.
      if (!contents.includes("themvora-provider")) continue;

      const consumers = recognizeHtmlConsumers(document);
      if (consumers.length === 0) continue;

      providerSources.set(path, contents);
      for (const consumer of consumers) pushProvider(consumer);
      continue;
    }

    // A verified consumer can live in any component file, so it is checked
    // before the theme-API filter, which only decides whether the file *defines*
    // themes. Recognition is by import binding, never by the `themes` spelling.
    const aliases = await apiAliasesFor(path, document.masked, fileSet, readSource);
    const scriptConsumers = recognizeConsumers(document.masked, path, aliases).map((consumer) => {
      if (consumer.region !== undefined || document.regions.length === 0) return consumer;
      const region = regionAtLine(document, consumer.location.line);
      return region === undefined ? consumer : { ...consumer, region };
    });
    const consumers = [...scriptConsumers, ...recognizeTemplateConsumers(document)];

    if (consumers.length > 0) {
      providerSources.set(path, document.masked);
      for (const consumer of consumers) pushProvider(consumer);
    }

    const binding = themeApiBinding(document.masked, aliases);
    const callsApi = THEME_API_MARKERS.test(document.masked);

    // An aliased or namespaced call is a real call: the reader is given the
    // bindings so `make(...)` reads as `defineTheme(...)`. A file whose only
    // calls are aliased still has to be read, which is why this is checked
    // before the name-based marker.
    const readable =
      binding.aliased.length > 0 ||
      Object.keys(binding.namespaces).length > 0 ||
      callsApi;

    if (!readable) continue;

    if (!binding.imported && binding.dynamicRequire) {
      registries.push({
        kind: "theme-module",
        path,
        status: "unsupported",
        detail: `${path} — require() with a non-literal specifier; the module cannot be identified statically.`,
      });
      continue;
    }

    // A call to a theme API without the import is a local function that happens
    // to share the name. Reading it would invent a theme.
    if (!binding.importedCore) {
      registries.push({
        kind: "theme-module",
        path,
        status: "unsupported",
        detail: `${path} — calls a theme API name but does not import it from @themvora/core.`,
      });
      continue;
    }

    const found = readThemeDefinitions(document.masked, readOptionsFor(binding));
    if (found.definitions.length === 0) {
      // A file that uses the API in a way this reader does not interpret is still
      // a theme source, and saying so is more useful than omitting it. A file
      // that merely reuses an API name without importing one is a lookalike, and
      // is named as such.
      registries.push({
        kind: "theme-module",
        path,
        status: "unsupported",
        detail:
          binding.apis.length === 0
            ? `${path} — calls a theme API name that is not imported from a verified Themvora package.`
            : `${path} — uses a Themvora theme API this reader cannot interpret statically.`,
        ...(found.problems.length === 0
          ? {}
          : { problems: found.problems.map((problem) => problem.message) }),
      });
      continue;
    }

    const regionOf = document.regions.length === 0
      ? undefined
      : (line: number): string | undefined => regionAtLine(document, line);

    facts.set(path, factsFromDefinitions(document.masked, found.definitions));
    registries.push(
      entryFromDefinitions(
        path,
        found.definitions,
        found.problems.map((problem) => problem.message),
        regionOf,
        regionLabelOf(document),
      ),
    );
  }

  // --- JSON theme documents ---------------------------------------------------
  const rootFiles = await reader.list(".");
  const jsonCandidates: string[] = [];

  if (rootFiles.includes(ROOT_THEME_FILE)) jsonCandidates.push(ROOT_THEME_FILE);
  for (const name of [...rootFiles].sort()) {
    if (name.endsWith(THEME_FILE_SUFFIX)) jsonCandidates.push(name);
  }

  for (const name of [...(await reader.list(THEMES_DIRECTORY))].sort()) {
    if (name.endsWith(".json")) jsonCandidates.push(`${THEMES_DIRECTORY}/${name}`);
  }

  for (const path of jsonCandidates) {
    const contents = await readSource(path);
    if (contents === null) continue;
    registries.push(readThemeDocument(path, contents));
  }

  // --- cross-file relationships ----------------------------------------------
  // The trace runs last: every theme file has been read by now, so a provider's
  // names can be followed into files the same inspection discovered.
  const catalogNames = new Set(getBuiltInThemes().map((theme) => String(theme.name)));
  const relationshipOrigins = new Map<string, ThemeDefinitionSource["origin"]>();

  for (const entry of registries) {
    for (const theme of entry.themes ?? []) {
      const origin = facts.get(entry.path)?.origins.get(theme);
      if (origin !== undefined) {
        relationshipOrigins.set(
          `${entry.path}\u0000${theme.name}\u0000${theme.meta?.mode ?? ""}`,
          origin,
        );
      }
    }
  }

  const traced = await traceProviders({
    providers,
    sources: providerSources,
    facts,
    registries,
    files: fileSet,
    read: readSource,
    catalogNames,
    relationshipOrigins,
  });

  // --- summary ----------------------------------------------------------------
  const status = registries.reduce<RegistryStatus>(
    (best, entry) => (RANK[entry.status] > RANK[best] ? entry.status : best),
    "missing",
  );

  return {
    root,
    status,
    packages: [...new Set(packages)].sort(),
    registries,
    notes,
    providers: traced.providers,
    relationships: traced.relationships,
  };
}
