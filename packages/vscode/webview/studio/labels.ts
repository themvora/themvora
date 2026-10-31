/**
 * Human wording for the evidence model.
 *
 * These labels never upgrade a state: "registered in source" is not "active",
 * and a catalog preset is never a project theme.
 */
import type { StudioSelection, StudioTheme } from "../../src/shared/studioProtocol";

/** Plain-language labels for theme evidence. Never "active". */
const THEME_EVIDENCE_LABEL = {
  registered: "registered in source",
  "defined-unregistered": "not registered",
  "partially-resolved": "registration partial",
  "catalog-source": "catalog",
} as const;

/**
 * The label for one theme evidence value, including unknown values.
 *
 * @param evidence - The state the host sent.
 * @returns A label.
 */
export function themeEvidenceLabel(evidence: string | undefined): string {
  switch (evidence) {
    case "registered":
      return THEME_EVIDENCE_LABEL.registered;
    case "defined-unregistered":
      return THEME_EVIDENCE_LABEL["defined-unregistered"];
    case "partially-resolved":
      return THEME_EVIDENCE_LABEL["partially-resolved"];
    case "catalog-source":
      return THEME_EVIDENCE_LABEL["catalog-source"];
    default:
      return evidence ?? "not established";
  }
}

/** Plain-language labels for consumer evidence. */
export const CONSUMER_EVIDENCE_LABEL: Record<string, string> = {
  registered: "registered in source",
  "partially-resolved": "partially resolved",
  "dynamic-unverified": "dynamic · unverified",
  unresolved: "not traced to a theme",
  "registration-only": "elements registered · supply unknown",
};

/** The canonical API that produced a theme. */
export const SOURCE_ORIGIN_LABEL: Record<string, string> = {
  definition: "defineTheme()",
  generated: "generateTheme()",
  catalog: "catalog",
};

/** Labels for where a selection came from. */
export const ORIGIN_LABEL: Record<StudioSelection["origin"], string> = {
  project: "Project theme",
  draft: "Generated draft",
  preset: "Catalog preset",
};

/** The strongest evidence a family's themes share. */
export function familyEvidenceLabel(themes: readonly StudioTheme[]): string {
  if (themes.every((theme) => theme.evidence === "registered")) {
    return THEME_EVIDENCE_LABEL.registered;
  }
  if (themes.some((theme) => theme.evidence === "registered")) return "partially registered";
  if (
    themes.every(
      (theme) => theme.origin === "catalog" || theme.evidence === "catalog-source",
    )
  ) {
    return THEME_EVIDENCE_LABEL["catalog-source"];
  }
  if (themes.some((theme) => theme.evidence === "partially-resolved")) {
    return THEME_EVIDENCE_LABEL["partially-resolved"];
  }
  return THEME_EVIDENCE_LABEL["defined-unregistered"];
}

/** The registration evidence for the selected theme. */
export function selectionEvidence(selected: StudioSelection): string {
  if (selected.evidence !== undefined) return themeEvidenceLabel(selected.evidence);
  if (selected.origin === "draft") return "generated draft — not registered";
  if (selected.origin === "preset") return "catalog preview — not project-registered";
  return "not established";
}

/** Token groups, by role. Presentation only — the schema is unchanged. */
export const TOKEN_GROUPS: readonly { readonly title: string; readonly names: readonly string[] }[] = [
  {
    title: "Surfaces and text",
    names: [
      "background",
      "foreground",
      "card",
      "cardForeground",
      "popover",
      "popoverForeground",
      "muted",
      "mutedForeground",
    ],
  },
  {
    title: "Actions",
    names: [
      "primary",
      "primaryForeground",
      "secondary",
      "secondaryForeground",
      "accent",
      "accentForeground",
    ],
  },
  { title: "Status", names: ["destructive", "destructiveForeground", "success", "successForeground"] },
  { title: "Borders and focus", names: ["border", "input", "ring"] },
];

/** The save formats. */
export const FORMATS: readonly { readonly value: string; readonly label: string }[] = [
  { value: "json", label: "JSON" },
  { value: "ts-generate", label: "TypeScript · generateTheme (minimal)" },
  { value: "ts", label: "TypeScript · defineTheme (custom theme)" },
  { value: "ts-preset", label: "TypeScript · catalog reference" },
  { value: "css", label: "CSS variables" },
];

/** The default save format for a selection origin. */
export const DEFAULT_FORMAT: Record<string, string> = {
  preset: "ts-preset",
  draft: "ts-generate",
  "draft-define": "ts",
  project: "ts",
};

/**
 * The origin key used to choose a save format.
 *
 * @param selected - The current selection.
 * @returns A key in {@link DEFAULT_FORMAT}.
 */
export function formatOrigin(
  selected:
    | {
        readonly origin: StudioSelection["origin"];
        readonly draftKind?: "generate" | "define" | undefined;
        readonly editor?: { readonly customized: boolean } | undefined;
      }
    | undefined,
): string {
  if (selected?.origin === "draft") {
    // An edited draft is a custom definition, even when it started from the
    // generator; its output can no longer be reproduced from seed parameters.
    if (selected.editor?.customized === true || selected.draftKind === "define") {
      return "draft-define";
    }
    return "draft";
  }
  return selected?.origin ?? "project";
}

/**
 * The formats valid for a selection.
 *
 * A preset must not be written as an inlined literal, and a draft must not be
 * written as a catalog reference. Both are filtered rather than offered and
 * refused.
 *
 * @param origin - The origin key.
 * @returns The formats to offer.
 */
export function formatsFor(
  origin: string,
): readonly { readonly value: string; readonly label: string }[] {
  return FORMATS.filter((entry) => {
    if (entry.value === "ts-preset" && (origin === "draft" || origin === "draft-define")) {
      return false;
    }
    // A define draft — generated, preset-copied, project-copied or edited — is
    // written as a definition, not as a generator call.
    if (entry.value === "ts-generate" && origin === "draft-define") return false;
    return true;
  });
}

/**
 * The default file name for a format.
 *
 * @param format - The save format.
 * @returns A file name.
 */
export function fileNameFor(format: string): string {
  if (format === "json") return "themvora-theme.json";
  if (format === "css") return "themvora-theme.css";
  if (format === "ts-preset") return "themvora-presets.ts";
  return "themvora-theme.ts";
}

/**
 * The extension a format writes.
 *
 * @param format - The save format.
 * @returns The extension, including the dot.
 */
export function extensionFor(format: string): string {
  const name = fileNameFor(format);
  return name.slice(name.lastIndexOf("."));
}
