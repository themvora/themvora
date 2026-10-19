/**
 * Themvora's semantic vocabulary.
 *
 * ## The architectural rule this file encodes
 *
 * **Themvora owns the meaning. Adapters own the vocabulary.**
 *
 * Themvora defines *semantic roles* — `primary`, `destructive`, `success`. It
 * does not define library tokens. `--primary-foreground` is shadcn's spelling;
 * `palette.primary.contrastText` is MUI's; `--bs-primary` is Bootstrap's. None of
 * those belong in this package, and a theme authored here should not have to
 * know which library will consume it.
 *
 * ```
 * Theme ──▶ Semantic roles ──▶ Adapter mapping ──▶ Derived values ──▶ Library tokens
 * ```
 *
 * The failure mode this prevents is subtle and terminal: if the canonical model
 * is shaped like whichever library was supported first, every later adapter has
 * to translate *through* that library's vocabulary, and Themvora quietly becomes
 * a shadcn clone with extra steps.
 *
 * ## Core vs optional
 *
 * {@link CoreColor} is the vocabulary every theme must define and every adapter
 * may rely on. {@link OptionalSemantic} is a *capability* — a role a theme may
 * declare and an adapter may consume, but which is not part of the universal
 * contract. `warning` is the motivating case: it is a genuine semantic role, but
 * not every library has one, so requiring it of every theme would force themes
 * to invent a value nothing consumes.
 *
 * @see {@link SemanticRoleGroup}
 * @packageDocumentation
 */

/**
 * The colour roles every Themvora theme defines.
 *
 * These are *semantic roles*, not library tokens. An adapter is responsible for
 * expressing each one in its target library's own vocabulary — or for declaring
 * that it does not need it.
 *
 * @see {@link OptionalSemantic}
 */
export type CoreColor =
  | "background"
  | "foreground"
  | "card"
  | "cardForeground"
  | "popover"
  | "popoverForeground"
  | "primary"
  | "primaryForeground"
  | "secondary"
  | "secondaryForeground"
  | "muted"
  | "mutedForeground"
  | "accent"
  | "accentForeground"
  | "destructive"
  | "destructiveForeground"
  | "success"
  | "successForeground"
  | "border"
  | "input"
  | "ring";

/**
 * Colour roles a theme *may* declare.
 *
 * These are capabilities rather than contract. A theme that omits them is
 * complete; an adapter that needs one declares it in its `optional` list and
 * must degrade gracefully when it is absent — by deriving it, or by omitting the
 * library token entirely. Fabricating a value no consumer reads is worse than
 * omitting it, because it looks like support.
 */
export type OptionalSemantic =
  | "warning"
  | "warningForeground"
  | "info"
  | "infoForeground"
  | "error"
  | "errorForeground";

/**
 * A status role, independent of how any library spells it.
 *
 * This is the *intent*: "this surface communicates a warning". How that becomes
 * `--warning` (shadcn), `--alert-warning` (Bootstrap), `colorScheme.warning`
 * (MUI) or nothing at all is the adapter's decision, not the theme's.
 */
export type SemanticRole = "success" | "warning" | "info" | "error";

/**
 * How a semantic role is grouped, by what it is *for* rather than where it is
 * used. The grouping is documentation and validation metadata — it is what lets
 * a reviewer answer "is this a surface or an action?" without consulting a
 * specific library's token list.
 */
export interface SemanticRoleGroup {
  /** Group identifier. */
  id: "canvas" | "surfaces" | "actions" | "states" | "interaction";
  /** Human-readable label. */
  label: string;
  /** The core roles in this group. */
  roles: readonly CoreColor[];
  /** Optional roles in this group, if any. */
  optional?: readonly OptionalSemantic[];
  /** What the group is for. */
  description: string;
}

/**
 * The canonical role vocabulary, grouped by intent.
 *
 * `warning` and `info` appear under `states` as **optional** — the grouping is
 * the same either way, but the contract is not.
 */
export const SEMANTIC_ROLE_GROUPS: readonly SemanticRoleGroup[] = [
  {
    id: "canvas",
    label: "Canvas",
    roles: ["background", "foreground", "muted", "mutedForeground"],
    description: "The page itself: its surface and the text on it.",
  },
  {
    id: "surfaces",
    label: "Surfaces",
    roles: ["card", "cardForeground", "popover", "popoverForeground"],
    description: "Elevated or floating regions that sit above the canvas.",
  },
  {
    id: "actions",
    label: "Actions",
    roles: [
      "primary",
      "primaryForeground",
      "secondary",
      "secondaryForeground",
      "accent",
      "accentForeground",
      "destructive",
      "destructiveForeground",
    ],
    description: "Interactive roles, each paired with its own contrast colour.",
  },
  {
    id: "states",
    label: "States",
    roles: ["success", "successForeground"],
    optional: ["warning", "warningForeground", "info", "infoForeground", "error", "errorForeground"],
    description:
      "Outcome roles. `success` is core; `warning` / `info` / `error` are capabilities a theme may declare and an adapter may consume.",
  },
  {
    id: "interaction",
    label: "Interaction",
    roles: ["border", "input", "ring"],
    description: "Structural and focus affordances.",
  },
] as const;

/** Every {@link CoreColor}, as a runtime list. */
export const CORE_COLORS: readonly CoreColor[] = SEMANTIC_ROLE_GROUPS.flatMap(
  (group) => group.roles,
);

/** Every {@link OptionalSemantic}, as a runtime list. */
export const OPTIONAL_SEMANTICS: readonly OptionalSemantic[] = SEMANTIC_ROLE_GROUPS.flatMap(
  (group) => group.optional ?? [],
);

/**
 * Whether a colour key is part of the core contract.
 *
 * @param key The colour key to test.
 */
export function isCoreColor(key: string): key is CoreColor {
  return (CORE_COLORS as readonly string[]).includes(key);
}

/**
 * Whether a colour key is an optional semantic capability.
 *
 * @param key The colour key to test.
 */
export function isOptionalSemantic(key: string): key is OptionalSemantic {
  return (OPTIONAL_SEMANTICS as readonly string[]).includes(key);
}
