/**
 * The semantic **context** contract.
 *
 * ## The question this answers
 *
 * `contract.ts` answers *"does this token have enough contrast against its paired
 * token?"* That is a necessary question and it is not sufficient, because real UI
 * asks a different one:
 *
 * > *"Is this token readable in every context where the design system allows it
 * > to be used?"*
 *
 * Those are not the same. `primary` against `primaryForeground` can pass at 5:1
 * while `primary` against `background` sits at 1.4:1 — and a page that paints a
 * brand-coloured wordmark, link or hero accent onto the canvas is doing the
 * second thing, not the first. Measured across the shipped presets, `primary` on
 * the canvas fails 4.5:1 in **11 of 28** theme/mode pairs, and drops to **1.42:1**
 * in Slack dark. Nothing in the old contract noticed, because the old contract
 * was never asked.
 *
 * ## What a context is
 *
 * A context is a *promise about where a role may be used*:
 *
 * ```
 * role  +  the role it sits on  +  the threshold  +  required or advisory
 * ```
 *
 * The generator's job is to keep every `required` context true. A theme that
 * cannot is not shipped.
 *
 * ## What this deliberately does *not* do
 *
 * It does **not** require `primary` to clear 4.5:1 against the canvas. That would
 * kill saturated brand palettes, and it would be the wrong fix: a vivid brand
 * purple is excellent as a button fill and unsuitable as body text, and the
 * answer is to say so — not to desaturate the brand until it can do both.
 *
 * So the brand roles are declared `advisory` for text-on-canvas use, and
 * {@link CONTEXT_RESTRICTIONS} names the intended alternative. `primary` is an
 * **action and identity** colour; `foreground` is the **reading** colour. The
 * system now states that, and {@link describeRoleUsage} exposes it so the docs
 * and Theme Studio can show it.
 *
 * @packageDocumentation
 */
import { contrastRatioHex } from "../color";
import type { CoreColor } from "../model/semantic-roles";
import type { ThemeDefinition } from "../model/theme";
import { floorFor, type ContrastRequirement } from "./contract";

/**
 * The threshold a context is held to.
 *
 * `decorative` is not "anything goes" — it means the role must be *visible and
 * subordinate*, which is enforced as a relationship rather than a ratio. A
 * border is the canonical case.
 */
export type ContextRequirement = ContrastRequirement | "decorative";

/**
 * Whether the generator promises the context, or merely reports it.
 *
 * - `required` — part of the shipped guarantee. A theme that fails is a bug.
 * - `advisory` — a use the system knows about and deliberately does not promise,
 *   because promising it would force brand colours to be desaturated. Reported
 *   so the failure is visible rather than silent.
 */
export type ContextLevel = "required" | "advisory";

/**
 * Who is responsible for keeping a context true.
 *
 * The point of naming an owner is to make a bad screenshot cheap to triage. The
 * first question is never "is the generator wrong?" — it is "whose promise is
 * this?", and the answer decides whether the fix belongs in the colour engine, in
 * a Themvora integration, or in the application that placed the role.
 *
 * - `generator` — the colour itself must satisfy the contract. Nothing outside
 *   the engine can fix a failure here.
 * - `integration` — Themvora's own runtime consumes the tokens and must choose
 *   a role that satisfies the context. The scrollbar is the case.
 * - `consumer` — the application decides where the role goes. Themvora declares
 *   the use as advisory and the consumer owns the judgement.
 */
export type ContextOwner = "generator" | "integration" | "consumer";

/**
 * One promise about where a role may be used.
 */
export interface SemanticContext {
  /** Stable id, used in diagnostics and fixtures. */
  id: string;
  /** What the UI is doing, in words. */
  description: string;
  /** The role carrying the content or indicator. */
  role: CoreColor;
  /** The role it is drawn on. */
  against: CoreColor;
  /** The threshold it is held to. */
  requirement: ContextRequirement;
  /** Whether the generator guarantees it. */
  level: ContextLevel;
  /** Who has to make it true. */
  owner: ContextOwner;
}

/**
 * Every context the system declares.
 *
 * The `required` set is the invariant: *a generated theme is safe for every
 * semantic usage Themvora's own components promise to support*. The `advisory`
 * set is the honest inventory of uses that exist in the wild but are not
 * guaranteed — chiefly "a brand colour used as reading text on the canvas".
 */
export const SEMANTIC_CONTEXTS: readonly SemanticContext[] = [
  // -- reading content --------------------------------------------------------
  {
    id: "content-on-canvas",
    description: "Body text on the page canvas",
    role: "foreground",
    against: "background",
    requirement: "text",
    level: "required",
    owner: "generator",
  },
  {
    id: "content-on-surface",
    description: "Body text inside an elevated surface",
    role: "cardForeground",
    against: "card",
    requirement: "text",
    level: "required",
    owner: "generator",
  },
  {
    id: "content-on-popover",
    description: "Body text inside an overlay",
    role: "popoverForeground",
    against: "popover",
    requirement: "text",
    level: "required",
    owner: "generator",
  },
  {
    id: "muted-content-on-canvas",
    description: "Supporting text on the canvas",
    role: "mutedForeground",
    against: "background",
    requirement: "text",
    level: "required",
    owner: "generator",
  },
  {
    // Not in `SEMANTIC_PAIRS`, and it is the single most common real usage in
    // any UI: `text-muted-foreground` inside a card. Measured minimum across the
    // presets is 5.61:1, so the promise already holds — this makes it explicit
    // so a future change cannot quietly break it.
    id: "muted-content-on-surface",
    description: "Supporting text inside an elevated surface",
    role: "mutedForeground",
    against: "card",
    requirement: "text",
    level: "required",
    owner: "generator",
  },

  // -- action surfaces --------------------------------------------------------
  {
    id: "primary-action-label",
    description: "The label on a primary action",
    role: "primaryForeground",
    against: "primary",
    requirement: "text",
    level: "required",
    owner: "generator",
  },
  {
    id: "secondary-action-label",
    description: "The label on a secondary action",
    role: "secondaryForeground",
    against: "secondary",
    requirement: "text",
    level: "required",
    owner: "generator",
  },
  {
    id: "accent-label",
    description: "The label on an accented control",
    role: "accentForeground",
    against: "accent",
    requirement: "text",
    level: "required",
    owner: "generator",
  },
  {
    id: "destructive-action-label",
    description: "The label on a destructive action",
    role: "destructiveForeground",
    against: "destructive",
    requirement: "text",
    level: "required",
    owner: "generator",
  },

  // -- boundaries and indicators ----------------------------------------------
  {
    id: "input-boundary-on-canvas",
    description: "A form field boundary on the canvas",
    role: "input",
    against: "background",
    requirement: "ui",
    level: "required",
    owner: "generator",
  },
  {
    id: "input-boundary-on-surface",
    description: "A form field boundary inside a surface",
    role: "input",
    against: "card",
    requirement: "ui",
    level: "required",
    owner: "generator",
  },
  {
    id: "focus-ring-on-canvas",
    description: "A focus ring on the canvas",
    role: "ring",
    against: "background",
    requirement: "ui",
    level: "required",
    owner: "generator",
  },
  {
    id: "focus-ring-on-surface",
    description: "A focus ring inside a surface",
    role: "ring",
    against: "card",
    requirement: "ui",
    level: "required",
    owner: "generator",
  },
  {
    id: "focus-ring-on-muted",
    description: "A focus ring on a quiet fill",
    role: "ring",
    against: "muted",
    requirement: "ui",
    level: "required",
    owner: "generator",
  },
  {
    // The scrollbar integration draws a thumb over the canvas it scrolls. It
    // used to pick the first of `primary → accent → foreground` that existed,
    // which is how a brand purple ended up 1.42:1 against a near-black track.
    // `scrollbar/thumb-color.ts` now tries those same roles in order and takes
    // the first that clears the floor, falling through to `foreground` — which
    // always does. The owner is the integration, not the generator: the colour
    // engine cannot fix a consumer that picks a role without checking it.
    id: "scrollbar-thumb-on-canvas",
    description: "A scrollbar thumb over the canvas it scrolls",
    role: "foreground",
    against: "background",
    requirement: "ui",
    level: "required",
    owner: "integration",
  },
  {
    id: "border-on-surface",
    description: "A structural hairline on a surface",
    role: "border",
    against: "card",
    requirement: "decorative",
    level: "required",
    owner: "generator",
  },

  // -- advisory: declared, reported, deliberately not promised ----------------
  {
    id: "brand-text-on-canvas",
    description: "A brand-coloured wordmark, link or hero accent on the canvas",
    role: "primary",
    against: "background",
    requirement: "text",
    level: "advisory",
    owner: "consumer",
  },
  {
    id: "brand-text-on-surface",
    description: "A brand-coloured wordmark or link inside a surface",
    role: "primary",
    against: "card",
    requirement: "text",
    level: "advisory",
    owner: "consumer",
  },
  {
    id: "accent-text-on-canvas",
    description: "An accent-coloured highlight on the canvas",
    role: "accent",
    against: "background",
    requirement: "text",
    level: "advisory",
    owner: "consumer",
  },
  {
    id: "status-text-on-canvas",
    description: "A status colour used as reading text on the canvas",
    role: "success",
    against: "background",
    requirement: "text",
    level: "advisory",
    owner: "consumer",
  },
  {
    id: "brand-scrollbar-thumb",
    description: "A brand-coloured scrollbar thumb",
    role: "accent",
    against: "background",
    requirement: "ui",
    level: "advisory",
    owner: "consumer",
  },
];

/**
 * A use the system explicitly does **not** promise, and what to do instead.
 *
 * This is the half that makes the contract useful. Knowing that `primary` is
 * *not* supported as body text is what turns "the brand colour looks weak on this
 * page" into a decision with an obvious answer.
 */
export interface ContextRestriction {
  /** The role that must not be used this way. */
  role: CoreColor;
  /** The role it must not be used against. */
  against: CoreColor;
  /** What the role *is* for. */
  intended: string;
  /** What to reach for instead. */
  instead: string;
}

/**
 * The declared restrictions.
 *
 * These are not failures — they are the design system saying what it means. A
 * brand colour is allowed to be vivid precisely because nobody promised it would
 * work as a paragraph.
 */
export const CONTEXT_RESTRICTIONS: readonly ContextRestriction[] = [
  {
    role: "primary",
    against: "background",
    intended: "action surfaces, selected states, and controlled emphasis",
    instead:
      "`foreground` for reading text; `primary` with `primaryForeground` for an action surface; an underline or weight change for emphasis",
  },
  {
    role: "primary",
    against: "card",
    intended: "action surfaces and selected states",
    instead: "`cardForeground` for reading text inside a surface",
  },
  {
    role: "accent",
    against: "background",
    intended: "decoration and hover fills",
    instead: "`foreground` for reading text",
  },
  {
    role: "success",
    against: "background",
    intended: "indicators and status fills, always with an icon or label",
    instead: "`foreground` for reading text; a `success` dot or badge for status",
  },
  {
    role: "destructive",
    against: "background",
    intended: "destructive actions and error indicators",
    instead: "`foreground` for reading text; a `destructive` fill for the action",
  },
];

/** The outcome of evaluating one context against a theme. */
export interface ContextResult {
  /** The context that was evaluated. */
  context: SemanticContext;
  /** The measured ratio, or `null` when a role is missing. */
  ratio: number | null;
  /** The floor it was held to, or `null` for a decorative context. */
  floor: number | null;
  /** Whether it met its floor. Decorative contexts are always `true` here. */
  passes: boolean;
}

/**
 * Evaluate every declared context against a theme.
 *
 * @param theme - The theme to check.
 * @returns One result per context, in declaration order.
 */
export function auditSemanticContexts(theme: ThemeDefinition): ContextResult[] {
  const colors = (theme.tokens?.colors ?? {}) as Record<string, string | undefined>;

  return SEMANTIC_CONTEXTS.map((context) => {
    const role = colors[context.role];
    const against = colors[context.against];

    if (typeof role !== "string" || typeof against !== "string") {
      return { context, ratio: null, floor: null, passes: false };
    }

    const ratio = contrastRatioHex(role, against);

    if (context.requirement === "decorative") {
      // Subordination is a relationship constraint, not a ratio — see
      // `relationships.ts`. There is no numeric floor to hold here.
      return { context, ratio, floor: null, passes: true };
    }

    const floor = floorFor(context.requirement);
    return { context, ratio, floor, passes: ratio >= floor };
  });
}

/**
 * The contexts a theme fails, split by whether the generator promised them.
 *
 * @param theme - The theme to check.
 * @returns `required` failures are bugs; `advisory` failures are declared gaps.
 */
export function contextFailures(theme: ThemeDefinition): {
  required: ContextResult[];
  advisory: ContextResult[];
} {
  const results = auditSemanticContexts(theme).filter((result) => !result.passes);
  return {
    required: results.filter((result) => result.context.level === "required"),
    advisory: results.filter((result) => result.context.level === "advisory"),
  };
}

/** The prominence of the primary action fill against the canvas. */
export interface ActionProminence {
  /** The ratio between the fill and the canvas. */
  ratio: number;
  /** The floor a generated fill is held to. */
  floor: number;
  /**
   * Whether the fill is a pinned brand anchor rather than a generated colour.
   *
   * Read from `meta.generation.anchored`, which the recipe builder records. When
   * true, `passes` is reported but not enforced: the brand colour is the brand's,
   * and moving it would trade identity for a number.
   */
  anchored: boolean;
  /** Whether the fill is prominent enough to read as a control. */
  passes: boolean;
}

/** The non-text floor an action fill is held to against the canvas. */
export const ACTION_PROMINENCE_FLOOR = 3;

/**
 * Measure whether a theme's action fill reads as a control.
 *
 * ## Why this is a third contract, not a fourth context
 *
 * 1. **semantic pair** — `primary` against `primaryForeground` must be readable.
 * 2. **context** — where each role may be used, and with whose judgement.
 * 3. **prominence** — a *generated* fill must separate from the canvas, because a
 *    fill that does not has stopped reading as a control.
 *
 * It cannot be expressed as "`primary` must clear X:1 against `background`"
 * globally, because that would condemn every dark brand anchor. Hence the
 * `anchored` flag: the invariant binds generated fills and merely reports
 * anchored ones — Slack's aubergine is 1.42:1 against the dark canvas, and that
 * is the brand being the brand.
 *
 * @param theme - The theme to measure.
 * @returns The measurement, with `anchored` telling the caller which rule applies.
 */
export function auditActionProminence(theme: ThemeDefinition): ActionProminence {
  const colors = (theme.tokens?.colors ?? {}) as Record<string, string | undefined>;
  const fill = colors.primary;
  const canvas = colors.background;

  const anchored = (theme.meta?.generation?.anchored ?? []).includes("primary");

  if (typeof fill !== "string" || typeof canvas !== "string") {
    return { ratio: 0, floor: ACTION_PROMINENCE_FLOOR, anchored, passes: false };
  }

  const ratio = contrastRatioHex(fill, canvas);
  return {
    ratio,
    floor: ACTION_PROMINENCE_FLOOR,
    anchored,
    passes: ratio >= ACTION_PROMINENCE_FLOOR,
  };
}

/**
 * What a role is for — the "safe usage" description.
 *
 * The docs and Theme Studio show this instead of a bare hex, because *how a token
 * may be used* is the thing a reader actually needs. A ratio answers "is it
 * readable here"; this answers "is it readable here on purpose".
 *
 * @param role - The role to describe.
 * @returns Where the role is supported, and where it is not.
 */
export function describeRoleUsage(role: CoreColor): {
  supported: string[];
  restricted: string[];
  advisory: { description: string; owner: ContextOwner }[];
} {
  const supported = SEMANTIC_CONTEXTS.filter(
    (context) => context.role === role && context.level === "required",
  ).map((context) => context.description);

  // Advisory uses are reported with their owner, so a consumer knows the
  // judgement is theirs rather than the generator's.
  const advisory = SEMANTIC_CONTEXTS.filter(
    (context) => context.role === role && context.level === "advisory",
  ).map((context) => ({ description: context.description, owner: context.owner }));

  const restricted = CONTEXT_RESTRICTIONS.filter(
    (restriction) => restriction.role === role,
  ).map((restriction) => `not intended as reading text on \`${restriction.against}\``);

  return { supported, restricted, advisory };
}
