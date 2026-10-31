/**
 * Where Themvora keeps its configuration and theme registries.
 *
 * The config filenames are **not** listed here: they are imported from
 * `@themvora/core/config`, which is the same constant the Vite plugin and the
 * Astro integration discover with. A second copy would let the extension probe
 * for a filename the build tool does not look for.
 *
 * The two registry module paths are the exception, and they are a known
 * duplication: `init` writes them from `packages/cli/src/init/registry-file.ts`,
 * and that module is internal to the CLI. Rather than freeze a CLI internal into
 * its public API for two strings, the paths are repeated here and guarded by a
 * drift test (`test/registryPaths.test.ts`) that reads the CLI source and fails
 * if they ever disagree.
 *
 * @packageDocumentation
 */
import { THEMVORA_CONFIG_FILES } from "@themvora/core/config";

/** The `theme.config.*` filenames, in resolution order. Canonical, from core. */
export const CONFIG_FILES: readonly string[] = THEMVORA_CONFIG_FILES;

/**
 * The generated theme-registry modules `init` writes.
 *
 * Vite-based targets put the module under `src/`; Next puts it beside `app/`.
 * Both are plain TypeScript modules that import from `@themvora/core`, which is
 * why they cannot be read yet — see `inspectProject`.
 */
export const THEME_MODULE_PATHS = ["src/themes/themes.ts", "themes/themes.ts"] as const;

/** A single-theme or light/dark-pair JSON document at the project root. */
export const ROOT_THEME_FILE = "theme.json";

/** The suffix marking a per-theme JSON document at the project root. */
export const THEME_FILE_SUFFIX = ".theme.json";

/** The directory scanned one level deep for `*.json` theme documents. */
export const THEMES_DIRECTORY = "themes";

/** The manifest read for dependency evidence. */
export const MANIFEST_FILE = "package.json";

/** The dependency scope every Themvora package is published under. */
export const THEMVORA_SCOPE = "@themvora/";

/** The generated registry module's file name, whichever directory holds it. */
const REGISTRY_MODULE_NAME = "themes.ts";

/**
 * Whether saving a file could change what an inspection would report.
 *
 * Used to decide when to re-read the project. It is deliberately generous — a
 * `.json` save anywhere triggers a re-read — because a refresh is a handful of
 * reads and a stale tree is worse than a redundant scan.
 *
 * @param fileName - The file's base name, with extension.
 * @returns `true` when the file is one an inspection reads.
 */
export function isProjectFile(fileName: string): boolean {
  if (CONFIG_FILES.includes(fileName)) return true;
  if (isThemeModuleName(fileName)) return true;
  if (fileName === MANIFEST_FILE) return true;
  return fileName.endsWith(".json");
}

/**
 * Whether a base name is a Themvora configuration module.
 *
 * The name is distinctive enough to stand alone: nothing else in a JavaScript
 * project is called `theme.config.ts` by accident. That is why discovery may
 * report it anywhere in the workspace without inspecting its contents.
 *
 * @param fileName - The file's base name, with extension.
 * @returns `true` for `theme.config.ts`, `.js`, `.mts` and the rest of the set
 *   `@themvora/core` resolves.
 */
export function isConfigFileName(fileName: string): boolean {
  return CONFIG_FILES.includes(fileName);
}

/**
 * Whether a base name is a theme registry module — the `themes.ts` `init` writes.
 *
 * Less distinctive than a config name, but still the convention the CLI and the
 * adapters share, and discovery only reports such a file as *unreadable* rather
 * than inventing themes from it.
 *
 * @param fileName - The file's base name, with extension.
 * @returns `true` for `themes.ts`.
 */
/** The extensions a theme registry module may carry. */
const THEME_MODULE_EXTENSIONS = [".ts", ".js", ".mjs", ".cjs"] as const;

/** `themes` — the base name, without the extension. */
const REGISTRY_MODULE_BASE = REGISTRY_MODULE_NAME.replace(/\.ts$/, "");

export function isThemeModuleName(fileName: string): boolean {
  return THEME_MODULE_EXTENSIONS.some((extension) => fileName === `${REGISTRY_MODULE_BASE}${extension}`);
}

/**
 * The final path segment of a `/`-separated path.
 *
 * @param path - A workspace-relative path.
 * @returns The base name.
 */
export function baseName(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? path : path.slice(index + 1);
}

/**
 * Whether a file could hold theme definitions a user wrote by hand.
 *
 * Deliberately narrow: a file has to say "theme" in its name. Reading every
 * source file for `defineTheme(...)` would turn a refresh into a scan of the
 * whole project for a construct almost no file contains.
 *
 * @param path - A workspace-relative path.
 * @returns `true` for a `.ts`/`.js` file whose name mentions themes.
 */
export function isThemeSourceFile(path: string): boolean {
  const lower = path.toLowerCase();
  if (!/\.(?:[cm]?[jt]s)$/u.test(lower)) return false;
  // The whole path, not just the base name: `src/theme/brand.ts` is a theme file
  // by virtue of its directory, and checking only `brand.ts` would miss it.
  return lower.includes("theme");
}
