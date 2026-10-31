/**
 * The project-reading contract.
 *
 * Everything here is deliberately free of `vscode`: the shape of a project
 * inspection is a domain fact, not an editor fact. `ProjectReader` is the whole
 * filesystem surface the domain is allowed to touch, which is what keeps the
 * inspection logic testable against an in-memory fixture and keeps later
 * commands from reaching for `workspace.fs` directly.
 *
 * @packageDocumentation
 */
import type { ThemeDefinition, ThemeGenerationInput } from "@themvora/core";

import type { ConsumerInput, ConsumerIntegration } from "./consumers.js";

/**
 * What a candidate file is.
 *
 * - `config` — a `theme.config.*` module, the Vite plugin's declaration file.
 * - `theme-module` — a generated registry module (`src/themes/themes.ts`,
 *   `themes/themes.ts`).
 * - `theme-json` — a JSON document holding one theme or a light/dark pair.
 */
export type RegistryKind = "config" | "theme-module" | "theme-json";

/**
 * The outcome of trying to read a registry.
 *
 * `unsupported` is a first-class state, not a failure: the file was found and is
 * real, but this extension has no canonical way to interpret it yet. Collapsing
 * it into `malformed` would blame the user's file for our limitation.
 */
export type RegistryStatus = "supported" | "missing" | "malformed" | "unsupported";

/** Where one theme in a registry entry came from. */
export interface RegistryThemeSource {
  /** The theme's own name. */
  readonly name: string;
  /** The theme's mode, when the definition records one. */
  readonly mode?: string;
  /** The declaration or export symbol, when the reader knows it. */
  readonly binding?: string;
  /** The canonical API that produced it. */
  readonly origin?: "definition" | "generated" | "catalog";
  /** 1-based position of the definition, when known. */
  readonly location?: { readonly line: number; readonly column: number };
  /** The source region, e.g. `<script setup>` or `frontmatter`. */
  readonly region?: string;
  /** The static inputs of the `generateTheme()` call, when it produced this theme. */
  readonly generateOptions?: ThemeGenerationInput;
}

/** One candidate registry, and what could be made of it. */
export interface RegistryEntry {
  /** What kind of file this is. */
  kind: RegistryKind;
  /** Workspace-relative path, using `/` separators. */
  path: string;
  /** What could be read from it. */
  status: RegistryStatus;
  /** One sentence explaining the status, suitable for a tooltip. */
  detail: string;
  /** The analyzable region this file contributed, e.g. `<script setup>`. */
  region?: string;
  /**
   * The themes read from the file.
   *
   * Present only when `status` is `supported`. Never synthesised: a registry
   * this extension cannot read contributes no themes, so no caller can mistake
   * an empty list for an empty project.
   */
  themes?: readonly ThemeDefinition[];
  /**
   * One entry per theme, aligned with `themes` when they are present.
   *
   * Present even when the themes are invalid and omitted, so the UI can still
   * say which declaration produced the bad data.
   */
  themeSources?: readonly RegistryThemeSource[];
  /**
   * Calls in the file that could not be read, with the reason.
   *
   * A file can yield four themes and still contain a fifth call this reader
   * cannot resolve — an invalid seed, an argument it cannot evaluate. Dropping
   * that silently makes a missing theme look like a project that never had it.
   */
  problems?: readonly string[];
}

/** Everything read from one workspace folder. */
export interface ProjectInspection {
  /** Absolute path of the folder, exactly as the caller supplied it. */
  root: string;
  /** The best status across every candidate, or `missing` when there are none. */
  status: RegistryStatus;
  /** The installed `@themvora/*` packages, sorted. Evidence, not inference. */
  packages: readonly string[];
  /** Every candidate found, in a stable order. */
  registries: readonly RegistryEntry[];
  /** Non-fatal problems worth surfacing — a broken `package.json`, say. */
  notes: readonly string[];
  /**
   * Files that hand themes to a provider, and the names they pass.
   *
   * Framework-independent by design: React passes `themes={…}`, Vue, Svelte and
   * Angular pass `themes: …` to `provideTheme`. The extension matches the
   * *prop*, not the framework, and reports the identifiers rather than pretending
   * to resolve them — an expression like `[...themes, ...presets]` is a spread
   * this reader does not evaluate.
   */
  providers: readonly ProviderUsage[];
  /**
   * Each discovered theme's definition site and the providers that import it.
   *
   * One entry per theme, including the ones nothing imports: `usedBy` is empty
   * when no consumer was traced, which is the difference between "defined" and
   * "supplied to the app".
   */
  relationships: readonly ThemeRelationship[];
}

/** How far a provider's names could be traced. */
export type ProviderResolution =
  /** Every name reached a project file that defines themes. */
  | "resolved"
  /** Some names reached a theme file, some did not. */
  | "partially-resolved"
  /** No name reached a theme definition. */
  | "unresolved";

/**
 * What a verified consumer use proves.
 *
 * `registration-only` exists for Web Components: `defineCustomElements()`
 * proves the elements were registered, not that any particular theme was
 * supplied to them.
 */
export type ConsumerEvidence =
  | "registered"
  | "partially-resolved"
  | "dynamic-unverified"
  | "unresolved"
  | "registration-only";

/** One verified consumer use, after its names were traced. */
export interface ProviderUsage {
  /** Workspace-relative path. */
  path: string;
  /** The identifiers named in the theme value, in source order. */
  names: readonly string[];
  /** The verified integration whose API matched. */
  integration?: ConsumerIntegration;
  /** The canonical API, e.g. `ThemeProvider` or `runtime.use`. */
  api?: string;
  /** Whether a theme value was supplied and how it reads. */
  input?: ConsumerInput;
  /** The project files the names were traced to. */
  importsFrom?: readonly string[];
  /** The names that did not reach a theme definition. */
  unresolved?: readonly string[];
  /** The strictest trace outcome across the names. */
  resolution?: ProviderResolution;
  /** What the consumer use proves, independently of the graph's trace. */
  evidence?: ConsumerEvidence;
  /** Why the value is dynamic, absent, or only a registration. */
  reason?: string;
  /** Where the API reference is, 1-based. */
  location?: { readonly line: number; readonly column: number };
  /** The source region, e.g. `template`, `markup`, `element`. */
  region?: string;
  /** The API registers elements but does not carry a theme value. */
  registrationOnly?: boolean;
  /** Names are theme identifiers from markup, resolved against catalogs/themes. */
  directNames?: boolean;
  /** The source slice used for tracing; a template resolves through its script scope. */
  traceSource?: string;
}

/** What is proven about one theme's runtime supply. */
export type ThemeEvidence =
  /** A verified consumer supplies it (statically traced). */
  | "registered"
  /** A consumer relationship exists, but the collection or consumer is incomplete. */
  | "partially-resolved"
  /** It came from a canonical catalog call; consumer use is a separate fact. */
  | "catalog-source"
  /** It is defined, but no verified consumer association was established. */
  | "defined-unregistered";

/** One theme's origin and the consumers proven to import it. */
export interface ThemeRelationship {
  /** The theme's own name. */
  readonly name: string;
  /** The workspace-relative file that defines it. */
  readonly definedIn: string;
  /** The theme's mode, when the definition records one. */
  readonly mode?: string;
  /** The theme's family, when the definition records one. */
  readonly family?: string;
  /** Provider files that import this theme, through one local collection or re-export. */
  readonly usedBy: readonly string[];
  /** What the inspection can prove about its runtime supply. */
  readonly evidence: ThemeEvidence;
}

/**
 * The filesystem surface the domain may use.
 *
 * Both methods are read-only by construction: there is no write method, so no
 * inspection path can modify a workspace even by mistake.
 */
export interface ProjectReader {
  /**
   * Read a workspace-relative file as UTF-8.
   *
   * @param relativePath - Path relative to the project root, `/`-separated.
   * @returns The contents, or `null` when the file does not exist or cannot be
   *   read. Absence is not an error.
   */
  read(relativePath: string): Promise<string | null>;

  /**
   * List the file names directly inside a workspace-relative directory.
   *
   * @param relativeDir - Directory relative to the project root; `"."` is the root.
   * @returns The names, or an empty array when the directory is absent.
   */
  list(relativeDir: string): Promise<readonly string[]>;

  /**
   * Every file in the project, as workspace-relative `/`-separated paths.
   *
   * Exists because a Themvora project may keep its configuration anywhere —
   * `src/theme/theme.config.ts` is as valid as `theme.config.ts`, and the editor
   * must not impose a layout the build tools do not. Implementations are
   * expected to bound the walk (skip dependency and build directories, cap
   * depth and file count); discovery must not become a crawl of a monorepo.
   *
   * @returns The paths, in whatever order the implementation produces. Callers
   *   that need determinism sort.
   */
  walk(): Promise<readonly string[]>;
}
