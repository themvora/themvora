/**
 * The Define editor's pure model.
 *
 * Derived from the shipped `ThemeTokens` and `SEMANTIC_ROLE_GROUPS`, this module
 * flattens string leaves while keeping their path, assigns schema groups and
 * control types, and compares a draft against its baseline. It never invents a
 * token, a group, a validation rule or a contrast value.
 *
 * @packageDocumentation
 */
import {
  CORE_COLORS,
  SEMANTIC_ROLE_GROUPS,
  measureThemeContrast,
  themeToCSSVariables,
  validateTheme,
  type ThemeDefinition,
  type ThemeTokens,
} from "@themvora/core";

import type {
  StudioDraftEditor,
  StudioEditorContrast,
  StudioEditorGroup,
  StudioEditorToken,
  StudioTokenKind,
} from "../shared/studioProtocol.js";

/** A flattened string leaf and where it lives. */
interface FlatToken {
  readonly path: readonly string[];
  readonly value: string;
}

/** One non-colour schema group. */
interface SchemaGroup {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

/** The non-colour groups in the shipped `ThemeTokens`. */
const EXTRA_GROUPS: readonly SchemaGroup[] = [
  {
    id: "code",
    label: "Code",
    description: "Opt-in syntax-highlighting colours; absent themes emit no --theme-code-* variables.",
  },
  {
    id: "spacing",
    label: "Spacing",
    description: "Spacing scale values, typically CSS lengths.",
  },
  {
    id: "radius",
    label: "Radius",
    description: "Border radius scale values, typically CSS lengths.",
  },
  {
    id: "shadows",
    label: "Shadows",
    description: "Box-shadow values.",
  },
  {
    id: "borderWidths",
    label: "Border widths",
    description: "Border width values, typically CSS lengths.",
  },
  {
    id: "zIndex",
    label: "Z-index",
    description: "Stacking-order values.",
  },
  {
    id: "breakpoints",
    label: "Breakpoints",
    description: "Responsive breakpoint values.",
  },
  {
    id: "typography",
    label: "Typography",
    description: "Font family, size and line-height scales.",
  },
];

/** Extra colour paths the schema permits but the core contract does not name. */
const ADDITIONAL_COLORS: SchemaGroup = {
  id: "additional-colors",
  label: "Additional colors",
  description: "ThemeColors permits extra semantic keys; these are outside the core role contract.",
};

/** The other-token fallback, only reachable from a non-schema object. */
const OTHER_GROUP: SchemaGroup = {
  id: "other",
  label: "Other tokens",
  description: "String tokens outside the documented ThemeTokens groups.",
};

/** The eight non-colour groups by root key. */
const EXTRA_GROUP_BY_ROOT = new Map(EXTRA_GROUPS.map((group) => [group.id, group]));

/** Core and optional roles, mapped to their shipped group. */
const ROLE_GROUP = new Map<string, { readonly id: string; readonly optional: boolean }>();
for (const group of SEMANTIC_ROLE_GROUPS) {
  for (const role of group.roles) ROLE_GROUP.set(role, { id: group.id, optional: false });
  for (const role of group.optional ?? []) ROLE_GROUP.set(role, { id: group.id, optional: true });
}

/** A stable key for a token path. */
export function pathKey(path: readonly string[]): string {
  return path.join("\u001f");
}

/**
 * The display mode of a theme.
 *
 * @param theme - The theme.
 * @returns `light`, `dark`, `system` or `default`.
 */
export function modeOf(theme: ThemeDefinition): string {
  return theme.meta?.mode ?? "default";
}

/**
 * Split a camelCase or dotted schema name into words.
 *
 * @param name - The schema key.
 * @returns A human label.
 */
function humanize(name: string): string {
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/[._-]+/gu, " ")
    .trim();
  return spaced.length === 0 ? name : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Flatten every string leaf under `tokens`.
 *
 * Nested `ThemeColors` keep their nesting in the path. Non-string leaves are not
 * editable and are skipped rather than coerced.
 *
 * @param tokens - The token object.
 * @returns Every string leaf.
 */
export function flattenThemeTokens(tokens: ThemeTokens | undefined): FlatToken[] {
  const result: FlatToken[] = [];

  const walk = (node: unknown, path: string[]): void => {
    if (typeof node === "string") {
      result.push({ path, value: node });
      return;
    }
    if (typeof node !== "object" || node === null || Array.isArray(node)) return;
    for (const [key, value] of Object.entries(node)) {
      if (value === undefined) continue;
      walk(value, [...path, key]);
    }
  };

  walk(tokens ?? {}, []);
  return result;
}

/**
 * Read one string leaf.
 *
 * @param tokens - The token object.
 * @param path - The leaf path.
 * @returns Its value, or undefined.
 */
export function tokenValueAt(tokens: ThemeTokens | undefined, path: readonly string[]): string | undefined {
  let node: unknown = tokens;
  for (const segment of path) {
    if (typeof node !== "object" || node === null || Array.isArray(node)) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Write one existing string leaf immutably.
 *
 * A path that does not already end in a string is refused, so the editor cannot
 * add a token the schema did not contain.
 *
 * @param theme - The theme.
 * @param path - The leaf path.
 * @param value - The new value.
 * @returns A new theme, or undefined when the path is not an existing string.
 */
export function editThemeToken(
  theme: ThemeDefinition,
  path: readonly string[],
  value: string,
): ThemeDefinition | undefined {
  if (path.length === 0) return undefined;

  const update = (
    node: Record<string, unknown>,
    segments: readonly string[],
  ): Record<string, unknown> | undefined => {
    const [head, ...rest] = segments;
    if (head === undefined || !Object.prototype.hasOwnProperty.call(node, head)) return undefined;

    if (rest.length === 0) {
      if (typeof node[head] !== "string") return undefined;
      return { ...node, [head]: value };
    }

    const child = node[head];
    if (typeof child !== "object" || child === null || Array.isArray(child)) return undefined;
    const next = update(child as Record<string, unknown>, rest);
    return next === undefined ? undefined : { ...node, [head]: next };
  };

  const tokens = (theme.tokens ?? {}) as Record<string, unknown>;
  const updated = update(tokens, path);
  if (updated === undefined) return undefined;
  return { ...theme, tokens: updated as ThemeTokens };
}

/**
 * The CSS custom property a path projects to.
 *
 * Core appends raw keys, so `primaryForeground` stays camelCase. The value is
 * verified against core's projection before the editor offers it.
 *
 * @param path - The token path.
 * @param value - The token value.
 * @param variables - Core's projected variables.
 * @returns The property, or undefined when no matching projection exists.
 */
function cssVarForPath(
  path: readonly string[],
  value: string,
  variables: Readonly<Record<string, string>>,
): string | undefined {
  const [root, ...rest] = path;
  if (root === undefined || rest.length === 0) return undefined;

  let name: string | undefined;
  if (root === "colors") name = `--theme-color-${rest.join("-")}`;
  else if (root === "spacing") name = `--theme-spacing-${rest.join("-")}`;
  else if (root === "radius") name = `--theme-radius-${rest.join("-")}`;
  else if (root === "shadows") name = `--theme-shadow-${rest.join("-")}`;
  else if (root === "borderWidths") name = `--theme-border-width-${rest.join("-")}`;
  else if (root === "zIndex") name = `--theme-z-index-${rest.join("-")}`;
  else if (root === "breakpoints") name = `--theme-breakpoint-${rest.join("-")}`;
  else if (root === "code") name = `--theme-code-${rest.join("-")}`;
  else if (root === "typography" && rest.length >= 2) {
    const [scale, ...keys] = rest;
    const prefix =
      scale === "fontFamilies"
        ? "font-family"
        : scale === "fontSizes"
          ? "font-size"
          : scale === "lineHeights"
            ? "line-height"
            : undefined;
    if (prefix === undefined) return undefined;
    name = `--theme-typography-${prefix}-${keys.join("-")}`;
  }

  return name !== undefined && variables[name] === value ? name : undefined;
}

/** The token kind for a path. */
function kindOf(path: readonly string[]): StudioTokenKind {
  const [root, second] = path;
  if (root === "colors" || root === "code") return "color";
  if (root === "spacing" || root === "radius" || root === "borderWidths" || root === "breakpoints") {
    return "length";
  }
  if (root === "zIndex") return "number";
  if (root === "shadows") return "shadow";
  if (root === "typography") {
    if (second === "fontFamilies") return "font-family";
    if (second === "fontSizes") return "font-size";
    if (second === "lineHeights") return "line-height";
  }
  return "text";
}

/** The schema group for a path. */
function groupOf(path: readonly string[]): { readonly group: SchemaGroup; readonly optional: boolean } {
  const [root, second] = path;

  if (root === "colors") {
    if (path.length === 2 && second !== undefined) {
      const role = ROLE_GROUP.get(second);
      if (role !== undefined) {
        const group = SEMANTIC_ROLE_GROUPS.find((candidate) => candidate.id === role.id);
        if (group !== undefined) {
          return {
            group: { id: group.id, label: group.label, description: group.description },
            optional: role.optional,
          };
        }
      }
    }
    return { group: ADDITIONAL_COLORS, optional: true };
  }

  if (root === "typography") return { group: EXTRA_GROUP_BY_ROOT.get("typography")!, optional: false };
  if (root !== undefined) {
    const group = EXTRA_GROUP_BY_ROOT.get(root);
    if (group !== undefined) return { group, optional: false };
  }
  return { group: OTHER_GROUP, optional: true };
}

/** The display name for a token path. */
function nameOf(path: readonly string[]): string {
  if (path[0] === "colors" && path.length === 2) return path[1]!;
  return path.slice(1).join(".");
}

/** The contrast pairs for one selected-mode theme. */
function contrastsOf(theme: ThemeDefinition): Map<string, StudioEditorContrast[]> {
  const map = new Map<string, StudioEditorContrast[]>();
  for (const pair of measureThemeContrast(theme)) {
    const entry: StudioEditorContrast = {
      ratio: pair.ratio,
      passes: pair.passes,
      against: pair.background,
      floor: pair.floor,
      requirement: pair.requirement,
      ...(pair.direction === undefined ? {} : { direction: pair.direction }),
      ...(pair.severity === undefined ? {} : { severity: pair.severity }),
    };
    const list = map.get(pair.foreground) ?? [];
    list.push(entry);
    map.set(pair.foreground, list);
  }
  return map;
}

/** What {@link buildThemeEditor} needs. */
export interface ThemeEditorInput {
  /** The theme currently displayed. */
  readonly theme: ThemeDefinition;
  /** Every variant of the same family, including {@link theme}. */
  readonly family: readonly ThemeDefinition[];
  /** The original family, when this selection is an editable draft. */
  readonly baseline?: readonly ThemeDefinition[];
  /** Whether the selection is a draft. */
  readonly editable: boolean;
}

/** The editor plus the per-mode flat maps needed by the host. */
export interface ThemeEditorResult {
  readonly editor: StudioDraftEditor;
  /** Current values by mode. */
  readonly currentByMode: ReadonlyMap<string, ReadonlyMap<string, string>>;
  /** Baseline values by mode. */
  readonly baselineByMode: ReadonlyMap<string, ReadonlyMap<string, string>>;
}

function byMode(themes: readonly ThemeDefinition[]): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>();
  for (const theme of themes) {
    const flat = new Map<string, string>();
    for (const token of flattenThemeTokens(theme.tokens)) flat.set(pathKey(token.path), token.value);
    result.set(modeOf(theme), flat);
  }
  return result;
}

/**
 * Build the grouped editor view.
 *
 * @param input - The selected theme, its family and optional baseline.
 * @returns The serialized editor and host-side comparisons.
 */
export function buildThemeEditor(input: ThemeEditorInput): ThemeEditorResult {
  const family = input.family.length > 0 ? input.family : [input.theme];
  const modes = [...new Set(family.map(modeOf))];
  const selectedMode = modeOf(input.theme);
  const currentByMode = byMode(family);
  const baselineByMode = input.baseline === undefined ? new Map() : byMode(input.baseline);
  const currentSelected = currentByMode.get(selectedMode) ?? new Map<string, string>();
  const baselineSelected = baselineByMode.get(selectedMode) ?? new Map<string, string>();

  // Union of every path across current and baseline modes.
  const pathSet = new Map<string, readonly string[]>();
  for (const map of [...currentByMode.values(), ...baselineByMode.values()]) {
    for (const key of map.keys()) {
      pathSet.set(key, key.split("\u001f"));
    }
  }
  const variables = themeToCSSVariables(input.theme);
  const contrastByRole = contrastsOf(input.theme);
  const issues = validateTheme(input.theme).issues;
  const issueByPath = new Map(issues.map((issue) => [issue.path, issue.message]));

  const tokens: StudioEditorToken[] = [];
  for (const [key, path] of pathSet) {
    const group = groupOf(path);
    const name = nameOf(path);
    const value = currentSelected.get(key);
    const original = baselineSelected.get(key);
    const presentIn = modes.filter((mode) => currentByMode.get(mode)?.has(key) === true);
    const role = path[0] === "colors" && path.length === 2 ? path[1] : undefined;
    const previewKey = role !== undefined && (CORE_COLORS as readonly string[]).includes(role) ? role : undefined;
    const contrasts = role === undefined ? [] : (contrastByRole.get(role) ?? []);
    const cssVar =
      value === undefined ? undefined : cssVarForPath(path, value, variables);
    const issue = issueByPath.get(path.join("."));

    tokens.push({
      path,
      name,
      label: humanize(path.slice(1).join(".")),
      group: group.group.id,
      type: kindOf(path),
      ...(value === undefined ? {} : { value }),
      ...(original === undefined ? {} : { original }),
      changed: input.baseline !== undefined && value !== original,
      presentIn,
      presentInSelected: value !== undefined,
      optional: group.optional,
      ...(previewKey === undefined ? {} : { previewKey }),
      ...(cssVar === undefined ? {} : { cssVar }),
      contrasts,
      ...(issue === undefined ? {} : { issue }),
    });
  }

  const groupDefs: SchemaGroup[] = [
    ...SEMANTIC_ROLE_GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      description: group.description,
    })),
    ADDITIONAL_COLORS,
    ...EXTRA_GROUPS,
  ];

  // A missing required role has no row, but its issue still belongs to the
  // schema group that owns the role.
  const issueGroup = new Map<string, number>();
  for (const issue of issues) {
    const match = /^colors\.([A-Za-z0-9_]+)$/u.exec(issue.path);
    const role = match?.[1];
    if (role === undefined) continue;
    const owner = ROLE_GROUP.get(role);
    if (owner === undefined) continue;
    issueGroup.set(owner.id, (issueGroup.get(owner.id) ?? 0) + 1);
  }

  const groups: StudioEditorGroup[] = groupDefs
    .map((definition) => {
      const grouped = tokens
        .filter((token) => token.group === definition.id)
        .sort((left, right) =>
          left.name.localeCompare(right.name, undefined, { numeric: true }),
        );
      // Core groups keep the canonical role order.
      const schemaGroup = SEMANTIC_ROLE_GROUPS.find((group) => group.id === definition.id);
      const roleOrder: readonly string[] = [
        ...(schemaGroup?.roles ?? []),
        ...(schemaGroup?.optional ?? []),
      ];
      if (roleOrder.length > 0) {
        grouped.sort(
          (left, right) =>
            roleOrder.indexOf(left.name) - roleOrder.indexOf(right.name),
        );
      }
      const tokenIssues = grouped.filter((token) => token.issue !== undefined).length;
      const inherited = issueGroup.get(definition.id) ?? 0;
      return {
        id: definition.id,
        label: definition.label,
        description: definition.description,
        tokens: grouped,
        issueCount: Math.max(tokenIssues, inherited),
        changedCount: grouped.filter((token) => token.changed).length,
      };
    })
    .filter((group) => group.tokens.length > 0 || group.issueCount > 0);

  // Count changed path+mode pairs across the family.
  let changedTokens = 0;
  if (input.baseline !== undefined) {
    const allModes = new Set([...currentByMode.keys(), ...baselineByMode.keys()]);
    for (const mode of allModes) {
      const current = currentByMode.get(mode) ?? new Map<string, string>();
      const baseline = baselineByMode.get(mode) ?? new Map<string, string>();
      const keys = new Set([...current.keys(), ...baseline.keys()]);
      for (const key of keys) {
        if (current.get(key) !== baseline.get(key)) changedTokens += 1;
      }
    }
  }

  return {
    editor: {
      editable: input.editable,
      customized: input.editable && changedTokens > 0,
      changedTokens,
      totalTokens: pathSet.size,
      modes,
      groups,
    },
    currentByMode,
    baselineByMode,
  };
}
