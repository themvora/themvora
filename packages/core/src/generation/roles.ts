/**
 * The role registry — the data-driven description of what each semantic role
 * *is*, which group it belongs to, what it is read against, and what contrast
 * requirement it carries.
 *
 * The generators and the solver read this rather than hard-coding token names,
 * so a future role can be added in one place. This is theme-generation.md
 * Phase 2's "role registry is data-driven" requirement.
 *
 * @packageDocumentation
 */
import { CORE_COLORS, type CoreColor } from "../model/semantic-roles";
import { SEMANTIC_PAIRS, type ContrastRequirement } from "./contract";

/** The five intent groups a role belongs to. */
export type RoleGroup = "canvas" | "surfaces" | "actions" | "states" | "interaction";

/**
 * What a role is, for generation and validation.
 */
export interface RoleSpec {
  /** The role. */
  role: CoreColor;
  /** Which intent group it belongs to. */
  group: RoleGroup;
  /** `true` when the role is a background something is read *on*. */
  isSurface: boolean;
  /** The role(s) a foreground is read against. Empty for surfaces. */
  readsOn: readonly CoreColor[];
  /** The contrast requirement, present only for roles that are read against something. */
  requirement?: ContrastRequirement;
}

const GROUP_OF: Record<CoreColor, RoleGroup> = {
  background: "canvas",
  foreground: "canvas",
  muted: "canvas",
  mutedForeground: "canvas",

  card: "surfaces",
  cardForeground: "surfaces",
  popover: "surfaces",
  popoverForeground: "surfaces",

  primary: "actions",
  primaryForeground: "actions",
  secondary: "actions",
  secondaryForeground: "actions",
  accent: "actions",
  accentForeground: "actions",
  destructive: "actions",
  destructiveForeground: "actions",

  success: "states",
  successForeground: "states",

  border: "interaction",
  input: "interaction",
  ring: "interaction",
};

/** The background side of every pair — the roles a foreground is read on. */
const SURFACE_ROLES: ReadonlySet<CoreColor> = new Set(
  SEMANTIC_PAIRS.map((pair) => pair.background),
);

function buildRegistry(): Record<CoreColor, RoleSpec> {
  const registry = {} as Record<CoreColor, RoleSpec>;

  for (const role of CORE_COLORS) {
    registry[role] = {
      role,
      group: GROUP_OF[role],
      isSurface: SURFACE_ROLES.has(role),
      readsOn: [],
    };
  }

  for (const pair of SEMANTIC_PAIRS) {
    const spec = registry[pair.foreground];
    // `ring` is read on more than one surface; keep every partner.
    registry[pair.foreground] = {
      ...spec,
      readsOn: [...spec.readsOn, pair.background],
      requirement: pair.requirement,
    };
  }

  return registry;
}

/** Every role, described. */
export const ROLE_SPECS: Record<CoreColor, RoleSpec> = buildRegistry();

/** The registry as an ordered list, in the canonical {@link CORE_COLORS} order. */
export const ROLE_REGISTRY: readonly RoleSpec[] = CORE_COLORS.map((role) => ROLE_SPECS[role]);

/** The roles that carry text or indicators (every pair's foreground). */
export const FOREGROUND_ROLES: readonly CoreColor[] = ROLE_REGISTRY.filter(
  (spec) => spec.readsOn.length > 0,
).map((spec) => spec.role);

/** The roles that act as backgrounds (every pair's surface). */
export const SURFACES: readonly CoreColor[] = ROLE_REGISTRY.filter(
  (spec) => spec.isSurface,
).map((spec) => spec.role);
