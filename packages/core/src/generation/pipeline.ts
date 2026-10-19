/**
 * The generation pipeline — the single entry point for producing a solved
 * palette for one mode.
 *
 * ```
 * buildPalette → enforceRelationships → solvePalette → checkRelationships
 * ```
 *
 * Every generation surface (runtime, CLI, Studio, preset recipes) ultimately
 * calls {@link generateRolePalette}, so there is exactly one place the algorithm
 * lives — theme-generation.md §1's "one engine" rule.
 *
 * @packageDocumentation
 */
import { generateActions } from "./actions";
import { generateContent } from "./content";
import { generateInteraction } from "./interaction";
import {
  checkRelationships,
  enforceRelationships,
  type RelationshipAdjustment,
  type RelationshipIssue,
} from "./relationships";
import { generateStatus } from "./status";
import { generateSurfaces } from "./surfaces";
import { solvePalette, type Adjustment, type UnsatisfiedConstraint } from "./solver";
import { oklchToHexMapped, type Oklch } from "../color";
import type { CoreColor } from "../model/semantic-roles";
import type { Palette, PaletteContext } from "./types";

/** An anchor the solver had to move, and what it became. */
export interface AnchorAdjustment {
  /** The role that was anchored. */
  role: CoreColor;
  /** The exact value the brand source published. */
  anchor: Oklch;
  /** The value the theme actually ships. */
  resolved: Oklch;
}

/**
 * Overwrite the candidate palette with the pinned anchors.
 *
 * Anchors are applied **after** generation and **before** relationship
 * enforcement, so a pinned value is treated exactly like a generated one from
 * that point on: the same separation checks and the same contrast solve apply.
 */
function applyAnchors(
  palette: Palette,
  anchors: Partial<Record<CoreColor, Oklch>> | undefined,
): void {
  if (!anchors) return;
  for (const [role, value] of Object.entries(anchors)) {
    if (value === undefined) continue;
    palette[role as CoreColor] = value;
  }
}

/**
 * Whether an anchor survived unchanged, judged on the **token value**.
 *
 * Comparing raw OKLCH would report a "normalization" for a sub-float nudge that
 * rounds to the same hex — which is a false alarm: the theme ships exactly the
 * value the brand published. The token is the hex, so the hex is the comparison.
 */
function anchorSurvived(anchor: Oklch, resolved: Oklch): boolean {
  return oklchToHexMapped(anchor) === oklchToHexMapped(resolved);
}

/**
 * Compose the five role-group generators into one palette for a mode.
 *
 * This is the raw candidate set, before any relationship enforcement or contrast
 * solving. Prefer {@link generateRolePalette} unless you specifically need the
 * unsolved candidates.
 *
 * @param ctx - The mode, identity and style to generate from.
 * @returns Every core role as an OKLCH candidate.
 */
export function buildPalette(ctx: PaletteContext): Palette {
  const actions = generateActions(ctx);

  return {
    ...generateSurfaces(ctx),
    ...generateContent(ctx),
    ...actions,
    ...generateStatus(ctx),
    ...generateInteraction(ctx, actions.primary),
  };
}

/**
 * The result of the full role-generation pipeline for one mode.
 */
export interface RolePaletteResult {
  /** The final, contrast-solved palette. */
  palette: Palette;
  /** Contrast repairs made by the solver. */
  adjustments: Adjustment[];
  /** Relationship repairs made before solving. */
  relationshipAdjustments: RelationshipAdjustment[];
  /** Relationship checks still failing after solving (expected: empty). */
  relationshipIssues: RelationshipIssue[];
  /** Contrast constraints the solver could not satisfy (expected: empty). */
  unsatisfied: UnsatisfiedConstraint[];
  /**
   * Anchors the solver had to move to satisfy the contract.
   *
   * Empty for a generated theme (there are no anchors) and empty for a brand
   * preset whose anchor already worked. A non-empty list is the honest answer to
   * "was the brand colour preserved exactly?" — it is the accessibility
   * normalization, and the brand page reports it rather than hiding it.
   */
  anchorAdjustments: AnchorAdjustment[];
}

/**
 * How many relationship-repair rounds may follow a contrast solve.
 *
 * Two is enough in practice: the only interference observed is `input` and
 * `ring` both solving toward the same neutral target, which one round separates.
 * Bounded, so the pipeline always terminates.
 */
const MAX_RELATIONSHIP_ROUNDS = 2;

/**
 * Run the full pipeline for one mode:
 *
 * ```
 * generate → pin anchors → establish relationships → solve contrast
 *          → re-check relationships → (repair, re-solve) → freeze
 * ```
 *
 * The re-check matters: the contrast solver moves indicators, and moving `input`
 * and `ring` toward the same target can collapse them onto each other even
 * though each individually passes. The relationship pass is re-run afterwards so
 * that "solved for contrast" cannot quietly break "still looks like a system".
 *
 * @param ctx - The mode, identity, style and anchors to generate from.
 * @returns The solved palette and the record of what was changed and why.
 */
export function generateRolePalette(ctx: PaletteContext): RolePaletteResult {
  const candidates = buildPalette(ctx);
  applyAnchors(candidates, ctx.anchors);

  const relationshipAdjustments = enforceRelationships(candidates, ctx);

  const anchoredRoles = new Set(Object.keys(ctx.anchors ?? {})) as Set<CoreColor>;
  const solveOptions = anchoredRoles.size > 0 ? { anchoredRoles } : {};

  let solved = solvePalette(candidates, ctx, solveOptions);
  let adjustments = solved.adjustments;
  let relationshipIssues = checkRelationships(solved.palette, ctx);

  for (let round = 0; round < MAX_RELATIONSHIP_ROUNDS && relationshipIssues.length > 0; round += 1) {
    relationshipAdjustments.push(...enforceRelationships(solved.palette, ctx));
    solved = solvePalette(solved.palette, ctx, solveOptions);
    adjustments = [...adjustments, ...solved.adjustments];
    relationshipIssues = checkRelationships(solved.palette, ctx);
  }

  const anchorAdjustments: AnchorAdjustment[] = [];
  if (ctx.anchors) {
    for (const [role, anchor] of Object.entries(ctx.anchors)) {
      if (anchor === undefined) continue;
      const resolved = solved.palette[role as CoreColor];
      if (resolved !== undefined && !anchorSurvived(anchor, resolved)) {
        anchorAdjustments.push({ role: role as CoreColor, anchor, resolved });
      }
    }
  }

  return {
    palette: solved.palette,
    adjustments,
    relationshipAdjustments,
    relationshipIssues,
    unsatisfied: solved.unsatisfied,
    anchorAdjustments,
  };
}
