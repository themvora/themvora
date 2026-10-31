/**
 * The preview's token map.
 *
 * One data table drives both directions: a selected token highlights every
 * region that names it, and clicking a region reports the tokens that render it.
 * The tokens are the camel-case core role names the Studio's editor uses as
 * `previewKey`, so the editor and the surface cannot drift.
 *
 * Only roles a region actually paints appear here. A region without an entry is
 * still inspectable through `data-token`, which reads the markup itself.
 */

/** One rendered region and the core roles it consumes. */
export interface PreviewRegionDefinition {
  readonly id: string;
  readonly label: string;
  readonly tokens: readonly string[];
}

/** Every region either surface renders, by id. */
export const PREVIEW_REGIONS: readonly PreviewRegionDefinition[] = [
  { id: "canvas", label: "Preview canvas", tokens: ["background", "foreground", "border"] },
  { id: "hero", label: "Header", tokens: ["background", "foreground", "mutedForeground"] },
  {
    id: "stat",
    label: "Summary card",
    tokens: [
      "card",
      "cardForeground",
      "border",
      "primary",
      "primaryForeground",
      "muted",
      "mutedForeground",
      "success",
      "destructive",
      "accent",
    ],
  },
  {
    id: "search",
    label: "Search field",
    tokens: ["card", "cardForeground", "input", "muted", "mutedForeground", "border"],
  },
  { id: "primary-action", label: "Primary button", tokens: ["primary", "primaryForeground"] },
  {
    id: "secondary-action",
    label: "Secondary buttons",
    tokens: ["card", "cardForeground", "border", "secondary", "secondaryForeground"],
  },
  { id: "success", label: "Success status", tokens: ["success", "successForeground"] },
  {
    id: "destructive",
    label: "Destructive status",
    tokens: ["destructive", "destructiveForeground"],
  },
  {
    id: "roles",
    label: "Semantic roles",
    tokens: ["card", "cardForeground", "border", "muted", "mutedForeground", "foreground"],
  },

  /* Dashboard */
  {
    id: "sidebar",
    label: "Dashboard sidebar",
    tokens: [
      "card",
      "cardForeground",
      "border",
      "primary",
      "primaryForeground",
      "accent",
      "muted",
      "mutedForeground",
    ],
  },
  {
    id: "topbar",
    label: "Dashboard top bar",
    tokens: ["background", "foreground", "border"],
  },
  {
    id: "revenue-card",
    label: "Revenue card",
    tokens: ["card", "cardForeground", "border", "primary", "mutedForeground"],
  },
  {
    id: "chart",
    label: "Revenue chart",
    tokens: [
      "card",
      "border",
      "primary",
      "mutedForeground",
      "ring",
      "popover",
      "popoverForeground",
      "success",
    ],
  },
  {
    id: "goal-card",
    label: "Monthly goal",
    tokens: [
      "card",
      "cardForeground",
      "border",
      "primary",
      "accent",
      "muted",
      "mutedForeground",
      "success",
    ],
  },
  {
    id: "table",
    label: "Orders table",
    tokens: [
      "card",
      "cardForeground",
      "border",
      "muted",
      "mutedForeground",
      "secondary",
      "secondaryForeground",
      "success",
      "successForeground",
      "destructive",
      "destructiveForeground",
    ],
  },
  {
    id: "activity-card",
    label: "Activity",
    tokens: [
      "card",
      "cardForeground",
      "border",
      "primary",
      "accent",
      "success",
      "successForeground",
      "destructive",
      "mutedForeground",
    ],
  },

  /* Components gallery */
  {
    id: "components-buttons",
    label: "Buttons",
    tokens: [
      "primary",
      "primaryForeground",
      "secondary",
      "secondaryForeground",
      "card",
      "cardForeground",
      "border",
      "destructive",
      "destructiveForeground",
      "mutedForeground",
    ],
  },
  {
    id: "components-form",
    label: "Form controls",
    tokens: [
      "card",
      "cardForeground",
      "border",
      "background",
      "foreground",
      "input",
      "ring",
      "destructive",
      "mutedForeground",
    ],
  },
  {
    id: "components-choices",
    label: "Choices",
    tokens: [
      "card",
      "cardForeground",
      "border",
      "background",
      "primary",
      "primaryForeground",
      "input",
      "ring",
      "muted",
      "mutedForeground",
    ],
  },
  {
    id: "components-cards",
    label: "Cards and menu",
    tokens: [
      "card",
      "cardForeground",
      "border",
      "popover",
      "popoverForeground",
      "accent",
      "accentForeground",
      "success",
      "successForeground",
      "primary",
      "primaryForeground",
      "muted",
    ],
  },
  {
    id: "components-status",
    label: "Badges and status",
    tokens: [
      "card",
      "cardForeground",
      "border",
      "primary",
      "primaryForeground",
      "secondary",
      "secondaryForeground",
      "success",
      "successForeground",
      "destructive",
      "destructiveForeground",
      "mutedForeground",
    ],
  },
  {
    id: "components-tabs",
    label: "Tabs and segmented",
    tokens: ["card", "cardForeground", "border", "muted", "mutedForeground", "primary"],
  },
  {
    id: "components-borders",
    label: "Borders and depth",
    tokens: [
      "background",
      "card",
      "border",
      "input",
      "ring",
      "mutedForeground",
      "primary",
      "foreground",
    ],
  },
  {
    id: "components-type",
    label: "Typography",
    tokens: ["card", "cardForeground", "primary", "muted", "mutedForeground"],
  },
];

/** The region table by id. */
export const PREVIEW_REGION_BY_ID = new Map(
  PREVIEW_REGIONS.map((region) => [region.id, region]),
);

/**
 * The regions that use a token.
 *
 * @param token - A camel-case core role name.
 * @returns Its regions, without duplicates.
 */
export function regionsUsingToken(token: string): readonly PreviewRegionDefinition[] {
  return PREVIEW_REGIONS.filter((region) => region.tokens.includes(token));
}

/**
 * The region with an id.
 *
 * @param id - The region id.
 * @returns The region, or undefined.
 */
export function regionById(id: string | undefined): PreviewRegionDefinition | undefined {
  return id === undefined ? undefined : PREVIEW_REGION_BY_ID.get(id);
}
