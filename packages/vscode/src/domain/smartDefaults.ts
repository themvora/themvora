/**
 * Smart defaults for patch target files.
 *
 * Analyzes the project inspection to suggest reasonable target files for patch
 * application. Suggestions are based on existing theme files, detected framework,
 * and common project patterns.
 *
 * @packageDocumentation
 */

import type { ProjectInspection, RegistryEntry } from "../domain/registry.js";
import type { FrameworkId } from "../domain/projectProfile.js";

/** A suggested target file for patch application. */
export interface FileSuggestion {
  /** The workspace-relative file path. */
  readonly path: string;
  /** Why this file was suggested. */
  readonly reason: string;
  /** The suggestion priority (lower is better). */
  readonly priority: number;
  /** Whether this is a new file or existing. */
  readonly exists: boolean;
}

/**
 * Suggest target files for theme patches.
 *
 * Analyzes the project inspection to find existing theme files and suggests
 * reasonable locations for new theme files based on project structure.
 *
 * @param inspection - The project inspection.
 * @returns The file suggestions, sorted by priority.
 */
export function suggestTargetFiles(inspection: ProjectInspection): FileSuggestion[] {
  const suggestions: FileSuggestion[] = [];

  // Suggest existing theme files first
  const registries = inspection.registries ?? [];
  for (const registry of registries) {
    if (registry.status === "supported" && isThemeFile(registry)) {
      suggestions.push({
        path: registry.path,
        reason: `Existing theme file with ${registry.themes?.length ?? 0} themes`,
        priority: 1,
        exists: true,
      });
    }
  }

  // Suggest common theme file locations if no existing files
  if (suggestions.length === 0) {
    const commonPaths = [
      "src/theme.ts",
      "src/themes.ts",
      "src/theme/index.ts",
      "src/theme/theme.config.ts",
      "themes.ts",
      "theme.ts",
    ];

    for (const path of commonPaths) {
      suggestions.push({
        path,
        reason: "Common location for theme definitions",
        priority: 2,
        exists: false,
      });
    }
  }

  return suggestions.sort((a, b) => a.priority - b.priority);
}

/**
 * Suggest provider files for theme registration.
 *
 * Analyzes the project inspection to find existing provider files and suggests
 * reasonable locations for new provider files based on the detected framework.
 *
 * @param inspection - The project inspection.
 * @param framework - The detected framework.
 * @returns The provider file suggestions, sorted by priority.
 */
export function suggestProviderFiles(
  inspection: ProjectInspection,
  framework: FrameworkId,
): FileSuggestion[] {
  const suggestions: FileSuggestion[] = [];

  // Suggest existing provider files
  const providers = inspection.providers ?? [];
  for (const provider of providers) {
    suggestions.push({
      path: provider.path,
      reason: `Existing provider using ${provider.api ?? "theme API"}`,
      priority: 1,
      exists: true,
    });
  }

  // Suggest common provider file locations based on framework
  const frameworkPaths = getFrameworkProviderPaths(framework);
  for (const path of frameworkPaths) {
    // Don't suggest if already in the list
    if (!suggestions.some((s) => s.path === path)) {
      suggestions.push({
        path,
        reason: `Common location for ${framework} theme providers`,
        priority: 2,
        exists: false,
      });
    }
  }

  return suggestions.sort((a, b) => a.priority - b.priority);
}

/**
 * Suggest component files for theme mounting.
 *
 * Analyzes the project structure to find component files that could mount the
 * theme provider. Suggestions are based on framework-specific patterns.
 *
 * @param inspection - The project inspection.
 * @param framework - The detected framework.
 * @returns The component file suggestions, sorted by priority.
 */
export function suggestComponentFiles(
  inspection: ProjectInspection,
  framework: FrameworkId,
): FileSuggestion[] {
  const suggestions: FileSuggestion[] = [];

  // Look for common entry point files
  const entryPoints = getFrameworkEntryPoints(framework);
  const registries = inspection.registries ?? [];
  const providers = inspection.providers ?? [];

  for (const path of entryPoints) {
    // Check if the file exists in the project
    const exists =
      registries.some((r) => r.path === path) || providers.some((p) => p.path === path);

    suggestions.push({
      path,
      reason: `Common entry point for ${framework} applications`,
      priority: exists ? 1 : 2,
      exists,
    });
  }

  // Suggest layout files
  const layoutFiles = getFrameworkLayoutFiles(framework);
  for (const path of layoutFiles) {
    const exists =
      registries.some((r) => r.path === path) || providers.some((p) => p.path === path);

    if (!suggestions.some((s) => s.path === path)) {
      suggestions.push({
        path,
        reason: `Layout file for ${framework} applications`,
        priority: exists ? 1 : 3,
        exists,
      });
    }
  }

  return suggestions.sort((a, b) => a.priority - b.priority);
}

/**
 * Check if a registry entry is a theme file.
 *
 * @param registry - The registry entry.
 * @returns True if the entry is a theme file.
 */
function isThemeFile(registry: RegistryEntry): boolean {
  return registry.kind === "theme-module" || registry.kind === "theme-json";
}

/**
 * Get common provider file paths for a framework.
 *
 * @param framework - The detected framework.
 * @returns The provider file paths.
 */
function getFrameworkProviderPaths(framework: FrameworkId): string[] {
  switch (framework) {
    case "react":
    case "next":
    case "remix":
      return ["src/ThemeProvider.tsx", "src/providers/ThemeProvider.tsx", "src/theme/ThemeProvider.tsx"];
    case "vue":
    case "nuxt":
      return ["src/ThemeProvider.vue", "src/providers/ThemeProvider.vue", "src/theme/ThemeProvider.vue"];
    case "svelte":
      return ["src/ThemeProvider.svelte", "src/providers/ThemeProvider.svelte"];
    case "astro":
      return ["src/components/ThemeProvider.astro"];
    case "angular":
      return ["src/app/theme.module.ts", "src/app/providers/theme.module.ts"];
    case "solid":
      return ["src/ThemeProvider.tsx", "src/providers/ThemeProvider.tsx"];
    default:
      return ["src/theme-provider.ts"];
  }
}

/**
 * Get common entry point files for a framework.
 *
 * @param framework - The detected framework.
 * @returns The entry point file paths.
 */
function getFrameworkEntryPoints(framework: FrameworkId): string[] {
  switch (framework) {
    case "react":
      return ["src/main.tsx", "src/index.tsx", "src/App.tsx"];
    case "next":
      return ["app/layout.tsx", "pages/_app.tsx", "src/app/layout.tsx"];
    case "vue":
      return ["src/main.ts", "src/App.vue"];
    case "nuxt":
      return ["app.vue", "layouts/default.vue"];
    case "svelte":
      return ["src/main.ts", "src/App.svelte", "+layout.svelte"];
    case "astro":
      return ["src/layouts/Layout.astro", "src/pages/index.astro"];
    case "angular":
      return ["src/main.ts", "src/app/app.component.ts", "src/app/app.module.ts"];
    case "solid":
      return ["src/index.tsx", "src/App.tsx"];
    case "remix":
      return ["app/root.tsx", "app/entry.client.tsx"];
    default:
      return ["src/main.ts", "src/index.ts"];
  }
}

/**
 * Get common layout files for a framework.
 *
 * @param framework - The detected framework.
 * @returns The layout file paths.
 */
function getFrameworkLayoutFiles(framework: FrameworkId): string[] {
  switch (framework) {
    case "react":
      return ["src/Layout.tsx", "src/components/Layout.tsx"];
    case "next":
      return ["app/layout.tsx", "src/app/layout.tsx", "components/Layout.tsx"];
    case "vue":
    case "nuxt":
      return ["src/layouts/default.vue", "layouts/default.vue"];
    case "svelte":
      return ["src/routes/+layout.svelte", "+layout.svelte"];
    case "astro":
      return ["src/layouts/BaseLayout.astro", "src/layouts/Layout.astro"];
    case "angular":
      return ["src/app/app.component.html"];
    case "solid":
      return ["src/Layout.tsx"];
    case "remix":
      return ["app/root.tsx"];
    default:
      return [];
  }
}
