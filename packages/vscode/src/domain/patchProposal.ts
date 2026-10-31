/**
 * Patch proposal generation for "Use in my project" actions.
 *
 * Generates framework-specific code patches that add a theme to a project.
 * Each patch is a structured proposal that can be previewed and applied.
 *
 * @packageDocumentation
 */

import type { ThemeDefinition } from "@themvora/core";

import type { StudioPatchProposal } from "../shared/studioProtocol.js";
import { themeFilePayload } from "../services/saveTheme.js";

/** Supported frameworks for code generation. */
export type SupportedFramework =
  | "react"
  | "vue"
  | "svelte"
  | "next"
  | "nuxt"
  | "astro"
  | "angular"
  | "solid"
  | "remix"
  | "web-components";

/** The type of patch to generate. */
export type PatchType = "create-theme-file" | "add-to-theme-file" | "register-theme" | "mount-in-component";

/** Options for generating a patch proposal. */
export interface PatchGenerationOptions {
  /** The theme to generate a patch for. */
  readonly theme: ThemeDefinition;
  /** The target file path (workspace-relative). */
  readonly targetPath: string;
  /** The type of patch to generate. */
  readonly patchType: PatchType;
  /** The detected or overridden framework. */
  readonly framework: SupportedFramework;
  /** The original file content (for updates; empty for creates). */
  readonly originalContent?: string;
  /** The theme variable name to use in generated code. */
  readonly themeVariableName?: string;
  /** The save format for theme definitions. */
  readonly saveFormat?: "ts" | "json" | "css";
}

/**
 * Generate a patch proposal for adding a theme to a project.
 *
 * @param options - The patch generation options.
 * @returns The patch proposal.
 */
export function generatePatchProposal(options: PatchGenerationOptions): StudioPatchProposal {
  const {
    theme,
    targetPath,
    patchType,
    framework,
    originalContent = "",
    themeVariableName = "theme",
    saveFormat = "ts",
  } = options;

  const action = originalContent === "" ? "create" : "update";
  const generatedCode = generateFrameworkCode(theme, framework, themeVariableName, patchType);
  const themeDefinition = generateThemeDefinition(theme, saveFormat);

  const updated = applyPatch(originalContent, themeDefinition, generatedCode, patchType);

  const description = describePatch(patchType, framework, targetPath, theme.name);

  return {
    path: targetPath,
    action,
    original: originalContent,
    updated,
    description,
    generatedCode: {
      imports: generatedCode.imports,
      ...(generatedCode.themeDefinition === undefined ? {} : { themeDefinition: generatedCode.themeDefinition }),
      ...(generatedCode.providerMounting === undefined ? {} : { providerMounting: generatedCode.providerMounting }),
      ...(generatedCode.registration === undefined ? {} : { registration: generatedCode.registration }),
    },
  };
}

/**
 * Generate framework-specific code for a theme.
 *
 * @param theme - The theme definition.
 * @param framework - The target framework.
 * @param themeVariableName - The variable name for the theme.
 * @param patchType - The type of patch being generated.
 * @returns The generated code components.
 */
function generateFrameworkCode(
  theme: ThemeDefinition,
  framework: SupportedFramework,
  themeVariableName: string,
  patchType: PatchType,
): {
  imports: string[];
  themeDefinition?: string;
  providerMounting?: string;
  registration?: string;
} {
  const imports: string[] = [];
  let providerMounting: string | undefined;
  let registration: string | undefined;

  // Generate imports based on framework
  switch (framework) {
    case "react":
      imports.push(`import { ThemeProvider } from '@themvora/react';`);
      if (patchType === "mount-in-component") {
        providerMounting = `<ThemeProvider theme={${themeVariableName}}>`;
      }
      break;
    case "vue":
      imports.push(`import { ThemeProvider } from '@themvora/vue';`);
      if (patchType === "mount-in-component") {
        providerMounting = `<ThemeProvider :theme="${themeVariableName}">`;
      }
      break;
    case "svelte":
      imports.push(`import { ThemeProvider } from '@themvora/svelte';`);
      if (patchType === "mount-in-component") {
        providerMounting = `<ThemeProvider theme={${themeVariableName}}>`;
      }
      break;
    case "next":
      imports.push(`import { ThemeProvider } from '@themvora/next';`);
      if (patchType === "mount-in-component") {
        providerMounting = `<ThemeProvider theme={${themeVariableName}}>`;
      }
      break;
    case "nuxt":
      imports.push(`import { ThemeProvider } from '@themvora/nuxt';`);
      if (patchType === "mount-in-component") {
        providerMounting = `<ThemeProvider :theme="${themeVariableName}">`;
      }
      break;
    case "astro":
      imports.push(`import { ThemeProvider } from '@themvora/astro';`);
      if (patchType === "mount-in-component") {
        providerMounting = `<ThemeProvider theme={${themeVariableName}}>`;
      }
      break;
    case "angular":
      imports.push(`import { ThemeModule } from '@themvora/angular';`);
      if (patchType === "mount-in-component") {
        providerMounting = `ThemeModule.forRoot(${themeVariableName})`;
      }
      break;
    case "solid":
      imports.push(`import { ThemeProvider } from '@themvora/solid';`);
      if (patchType === "mount-in-component") {
        providerMounting = `<ThemeProvider theme={${themeVariableName}}>`;
      }
      break;
    case "remix":
      imports.push(`import { ThemeProvider } from '@themvora/remix';`);
      if (patchType === "mount-in-component") {
        providerMounting = `<ThemeProvider theme={${themeVariableName}}>`;
      }
      break;
    case "web-components":
      imports.push(`import '@themvora/web';`);
      if (patchType === "mount-in-component") {
        providerMounting = `<theme-provider theme="${themeVariableName}">`;
      }
      break;
  }

  // Generate registration code if needed
  if (patchType === "register-theme") {
    registration = `registerTheme(${themeVariableName});`;
  }

  return {
    imports,
    ...(providerMounting === undefined ? {} : { providerMounting }),
    ...(registration === undefined ? {} : { registration }),
  };
}

/**
 * Generate the theme definition code.
 *
 * @param theme - The theme definition.
 * @param format - The save format.
 * @returns The theme definition code.
 */
function generateThemeDefinition(theme: ThemeDefinition, format: "ts" | "json" | "css"): string {
  const payload = themeFilePayload([theme], format);
  return payload;
}

/**
 * Apply a patch to the original content.
 *
 * @param original - The original file content.
 * @param themeDefinition - The theme definition code.
 * @param generatedCode - The generated framework code.
 * @param patchType - The type of patch being applied.
 * @returns The updated file content.
 */
function applyPatch(
  original: string,
  themeDefinition: string,
  generatedCode: {
    imports: string[];
    themeDefinition?: string;
    providerMounting?: string;
    registration?: string;
  },
  patchType: PatchType,
): string {
  if (original === "") {
    // Creating a new file
    return themeDefinition;
  }

  // Updating an existing file
  let updated = original;

  // Add imports at the top (after any existing imports)
  if (generatedCode.imports.length > 0) {
    const importBlock = generatedCode.imports.join("\n") + "\n";
    const lastImportIndex = updated.lastIndexOf("import ");
    if (lastImportIndex !== -1) {
      const lineEnd = updated.indexOf("\n", lastImportIndex);
      if (lineEnd !== -1) {
        updated = updated.slice(0, lineEnd + 1) + importBlock + updated.slice(lineEnd + 1);
      }
    } else {
      updated = importBlock + updated;
    }
  }

  // Add theme definition before the last export (if any)
  if (patchType === "add-to-theme-file") {
    const lastExportIndex = updated.lastIndexOf("export ");
    if (lastExportIndex !== -1) {
      updated = updated.slice(0, lastExportIndex) + themeDefinition + "\n\n" + updated.slice(lastExportIndex);
    } else {
      updated = updated + "\n\n" + themeDefinition;
    }
  }

  // Add registration code at the end
  if (generatedCode.registration !== undefined) {
    updated = updated + "\n\n" + generatedCode.registration;
  }

  return updated;
}

/**
 * Generate a human-readable description of the patch.
 *
 * @param patchType - The type of patch.
 * @param framework - The target framework.
 * @param targetPath - The target file path.
 * @param themeName - The theme name.
 * @returns The description.
 */
function describePatch(
  patchType: PatchType,
  framework: SupportedFramework,
  targetPath: string,
  themeName: string,
): string {
  switch (patchType) {
    case "create-theme-file":
      return `Create ${targetPath} with ${themeName} theme for ${framework}`;
    case "add-to-theme-file":
      return `Add ${themeName} theme to ${targetPath} for ${framework}`;
    case "register-theme":
      return `Register ${themeName} theme in ${targetPath} for ${framework}`;
    case "mount-in-component":
      return `Mount ${themeName} theme in ${targetPath} for ${framework}`;
  }
}
