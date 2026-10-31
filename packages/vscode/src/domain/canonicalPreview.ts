/**
 * Canonical preview data shared by both preview surfaces.
 *
 * The Studio and the standalone Preview panel both render themes, but they
 * evolved separate data models. This module defines the unified interface both
 * consume, ensuring the same theme produces the same interpretation everywhere.
 *
 * The host produces this data; the webviews consume it. Neither webview
 * re-derives colors, tokens, or validation — they render what the host resolved.
 *
 * @packageDocumentation
 */

import type { StudioEditorContrast, StudioToken } from "../shared/studioProtocol.js";

/** A preview scenario defines what to render. */
export type PreviewScenario = "components" | "dashboard";

/** The canonical preview data both surfaces consume. */
export interface CanonicalPreviewData {
  /** Theme identity. */
  readonly identity: {
    /** The theme's own name. */
    readonly name: string;
    /** The family grouping. */
    readonly family: string;
    /** The concrete mode being rendered (light or dark). */
    readonly mode: string;
    /** Whether a "system" theme was resolved to this mode. */
    readonly systemMode: boolean;
    /** Every mode this theme family supports. */
    readonly availableModes: readonly string[];
    /** Where the theme came from (file path, "generated draft", "preset: X"). */
    readonly source: string;
  };

  /** Resolved tokens in the canonical format. */
  readonly tokens: readonly StudioToken[];

  /** CSS custom properties ready to apply to the DOM. */
  readonly cssVariables: Readonly<Record<string, string>>;

  /** Semantic color roles (the 21 core colors). */
  readonly roles: readonly PreviewRole[];

  /** Readable foreground for each filled surface. */
  readonly readableForegrounds: Readonly<Record<string, string>>;

  /** Contrast summary (e.g., "16 pairs · text 9/9 · ui 7/7"). */
  readonly contrastSummary: string;

  /** Validation state. */
  readonly validation: {
    readonly valid: boolean;
    readonly issue?: string;
  };

  /** Provenance and evidence (optional, for project themes). */
  readonly provenance?: {
    /** What source analysis proves about runtime supply. */
    readonly evidence?: string;
    /** Provider files that import this theme. */
    readonly usedBy?: readonly string[];
    /** The export/declaration symbol. */
    readonly binding?: string;
    /** Which canonical API produced it. */
    readonly origin?: "definition" | "generated" | "catalog";
    /** 1-based definition position in source. */
    readonly location?: { readonly line: number; readonly column: number };
    /** The source region (e.g., "<script setup>", "frontmatter"). */
    readonly region?: string;
  };

  /** Draft metadata (optional, for unsaved drafts). */
  readonly draft?: {
    /** Which Create workflow produced this draft. */
    readonly kind: "generate" | "define";
    /** The preset this was based on, when applicable. */
    readonly source?: string;
  };
}

/** One semantic color role. */
export interface PreviewRole {
  /** The role name (e.g., "mutedForeground"). */
  readonly role: string;
  /** The CSS custom property (e.g., "--theme-color-mutedForeground"). */
  readonly variable: string;
  /** The value, or null when the theme doesn't define it. */
  readonly value: string | null;
  /** Contrast information for this role, when applicable. */
  readonly contrasts?: readonly StudioEditorContrast[];
}

/**
 * Build canonical preview data from a resolved theme.
 *
 * This is the single source of truth for preview data. Both the Studio and the
 * standalone Preview panel consume this, ensuring consistency.
 *
 * @param input - The resolved theme and metadata.
 * @returns The canonical preview data.
 */
export function buildCanonicalPreviewData(input: CanonicalPreviewInput): CanonicalPreviewData {
  const { theme, source, mode, systemMode, availableModes, tokens, cssVariables, roles, readableForegrounds, contrastSummary, valid, issue, provenance, draft } = input;

  return {
    identity: {
      name: theme.name,
      family: theme.meta?.family ?? "default",
      mode,
      systemMode,
      availableModes,
      source,
    },
    tokens,
    cssVariables,
    roles,
    readableForegrounds,
    contrastSummary,
    validation: {
      valid,
      ...(issue === undefined ? {} : { issue }),
    },
    ...(provenance === undefined ? {} : { provenance }),
    ...(draft === undefined ? {} : { draft }),
  };
}

/** What buildCanonicalPreviewData needs. */
export interface CanonicalPreviewInput {
  /** The resolved theme definition. */
  readonly theme: import("@themvora/core").ThemeDefinition;
  /** Where the theme came from (file path, "generated draft", etc.). */
  readonly source: string;
  /** The concrete mode being rendered. */
  readonly mode: string;
  /** Whether a "system" theme was resolved to this mode. */
  readonly systemMode: boolean;
  /** Every mode this theme family supports. */
  readonly availableModes: readonly string[];
  /** Resolved tokens in StudioToken format. */
  readonly tokens: readonly StudioToken[];
  /** CSS custom properties. */
  readonly cssVariables: Readonly<Record<string, string>>;
  /** Semantic color roles. */
  readonly roles: readonly PreviewRole[];
  /** Readable foreground for each filled surface. */
  readonly readableForegrounds: Readonly<Record<string, string>>;
  /** Contrast summary. */
  readonly contrastSummary: string;
  /** Whether the theme is valid. */
  readonly valid: boolean;
  /** Validation issue, when not valid. */
  readonly issue?: string;
  /** Provenance metadata, for project themes. */
  readonly provenance?: CanonicalPreviewData["provenance"];
  /** Draft metadata, for unsaved drafts. */
  readonly draft?: CanonicalPreviewData["draft"];
}
