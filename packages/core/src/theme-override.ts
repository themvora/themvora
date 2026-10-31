/**
 * Explicit theme override: "apply this theme now, even though something else is
 * saved".
 *
 * `defaultTheme` is a *fallback* — it applies only when nothing else selected a
 * theme. Previewing a theme, or driving a theme picker from a prop, needs the
 * opposite: an explicit request that outranks a saved selection without turning
 * the prop into a permanently controlled value. That is what this module
 * resolves.
 *
 * @packageDocumentation
 */
import type { ThemeDefinition, ThemeMode } from "./model/theme";
import { getThemeFamilies, type ThemeSelectionState } from "./model";
import { createDiagnostic, emitDiagnostic, isThemeMode } from "./diagnostics";
import { resolveThemeReference } from "./theme-reference";

/**
 * A family/mode request. Either field may be omitted; the omitted one is taken
 * from the selection the provider would otherwise have used.
 *
 * @see {@link ThemeOverride}
 */
export interface ThemeOverrideSelection {
  /** Theme family to apply. Must be one the provider was given. */
  family?: string;
  /** Mode to apply within the family. */
  mode?: ThemeMode;
}

/**
 * An explicit theme override.
 *
 * Three equivalent ways to name the same thing:
 *
 * - a **variant** (`"mint-dark"`) applies exactly that definition,
 * - a **family** (`"mint"`) applies the variant the provider resolves for the
 *   mode already in effect,
 * - a **family/mode object** (`{ family: "mint", mode: "dark" }`) states both.
 *
 * All three are resolved against the provider's own registry through
 * {@link resolveThemeReference}, so an override cannot name a theme the provider
 * does not have, and the family form cannot pick "whichever variant came first".
 *
 * @example
 * ```tsx
 * // `themes` is the registry the provider was given.
 * const themes = getBuiltInThemes();
 *
 * <ThemeProvider themes={themes} themeOverride="mint-dark">{children}</ThemeProvider>
 * <ThemeProvider themes={themes} themeOverride="mint">{children}</ThemeProvider>
 * <ThemeProvider themes={themes} themeOverride={{ family: "mint" }}>{children}</ThemeProvider>
 * ```
 *
 * @see {@link resolveThemeOverride}
 * @see {@link themeOverrideKey}
 */
export type ThemeOverride<Name extends string = string> =
  | Name
  | ThemeOverrideSelection;

/** Describe an override for a diagnostic message without assuming its type. */
function describeOverride(override: unknown): string {
  if (typeof override === "string") return `"${override}"`;
  if (override && typeof override === "object") {
    const value = override as ThemeOverrideSelection;
    const parts: string[] = [];
    if (value.family !== undefined) parts.push(`family: ${JSON.stringify(value.family)}`);
    if (value.mode !== undefined) parts.push(`mode: ${JSON.stringify(value.mode)}`);
    return parts.length > 0 ? `{ ${parts.join(", ")} }` : "{}";
  }
  return String(override);
}

/**
 * Report an override that names something the provider does not have.
 *
 * The override is ignored — the selection it would have replaced stays in
 * effect — because the alternative (falling back to `themes[0]`) would silently
 * apply a *different* theme than the one requested, which is worse than leaving
 * the page on a valid theme and saying so.
 *
 * @param override - The rejected override, as supplied.
 * @param reason - What specifically could not be resolved.
 * @param available - The families or theme names that were available, for the hint.
 */
function emitUnresolvedOverrideDiagnostic(
  override: unknown,
  reason: string,
  available: readonly string[],
): void {
  const shown = available.slice(0, 8).join(", ");
  emitDiagnostic(
    createDiagnostic({
      code: "TV_THEME_OVERRIDE_UNRESOLVED",
      level: "warning",
      message: `themeOverride ${describeOverride(override)} could not be resolved: ${reason}. The override was ignored and the previous selection kept.`,
      context: {
        api: "themeOverride",
        property: "themeOverride",
        received: override,
        expected:
          "a provided theme name, a provided family name, or { family, mode }",
        details: { available },
      },
      hint:
        available.length > 0
          ? `Use one of the themes the provider was given (${shown}${available.length > 8 ? ", …" : ""}) or a family from that list.`
          : "Pass a non-empty `themes` collection to the provider before setting `themeOverride`.",
    }),
  );
}

/**
 * Resolve an override against the provider's themes.
 *
 * Pure: no side effects, no state. Returns a complete selection (both fields
 * filled) or `null` when the override cannot be satisfied — the caller decides
 * whether to report and ignore or to treat it as absent.
 *
 * A string is a **theme name** and must match exactly. An object is a
 * family/mode request; a missing field is inherited from `base`.
 *
 * @typeParam T - The theme definition type used by the application.
 * @param themes - The provider's registered themes.
 * @param override - The requested override, or `undefined`.
 * @param base - The selection the provider would use without an override. Used
 *   to fill in a partially specified request.
 * @returns The resolved selection, or `null` when absent or unresolvable.
 *
 * @example
 * ```ts
 * // `themes` is whatever registry the provider was given.
 * const themes = getBuiltInThemes();
 * const selection = { family: "mint", mode: "light" };
 *
 * resolveThemeOverride(themes, "mint-dark", selection);      // { family: "mint", mode: "dark" }
 * resolveThemeOverride(themes, { family: "mint" }, selection); // keeps base.mode
 * resolveThemeOverride(themes, "nope", selection);            // null
 * ```
 *
 * @see {@link ThemeOverride}
 */
export function resolveThemeOverride<T extends ThemeDefinition>(
  themes: readonly T[],
  override: ThemeOverride<T["name"]> | undefined,
  base: ThemeSelectionState,
): ThemeSelectionState | null {
  if (override === undefined || override === null) return null;

  if (typeof override === "string") {
    // A variant keeps its own mode; a family keeps the mode already in effect,
    // so switching family does not silently flip light/dark under the visitor.
    const resolved = resolveThemeReference(themes, override, { mode: base.mode });
    if (!resolved) return null;
    return {
      family: resolved.family,
      mode: resolved.kind === "variant" ? (resolved.mode ?? base.mode) : base.mode,
    };
  }

  if (typeof override !== "object") return null;

  const requestedFamily = override.family;
  const requestedMode = override.mode;

  // An empty object asks for nothing; treating it as "keep the current
  // selection" would make an inert prop look like it did something.
  if (requestedFamily === undefined && requestedMode === undefined) return null;

  const family = requestedFamily ?? base.family;
  if (!getThemeFamilies(themes).includes(family)) return null;

  if (requestedMode !== undefined && !isThemeMode(requestedMode)) return null;

  return { family, mode: requestedMode ?? base.mode };
}

/**
 * The semantic identity of an override, for change detection.
 *
 * Two overrides with the same key request the same theme, even when they are
 * different objects — which is the normal case for an inline
 * `themeOverride={{ family: "mint" }}` that is rebuilt on every render. Built
 * from resolved primitives only: no object stringification, no identity.
 *
 * Pass the provider's catalog to canonicalise a **theme name** against the
 * family and mode it resolves to, so `"mint-dark"` and
 * `{ family: "mint", mode: "dark" }` compare equal — they are the same request
 * written two ways, and re-applying one because the other was spelled
 * differently is exactly the churn this function exists to prevent. Without a
 * catalog the name form keys on the name alone.
 *
 * A partially specified request (`{ family: "mint" }`) keys on what was asked
 * for, never on the base selection it would inherit: otherwise a manual mode
 * change would make an unchanged prop look like a new request and re-assert the
 * family.
 *
 * @param override - The override to key.
 * @param themes - The provider's themes, used to canonicalise a theme name.
 * @returns A stable string, or `null` when there is no override.
 *
 * @see {@link resolveThemeOverride}
 */
export function themeOverrideKey(
  override: ThemeOverride<string> | undefined,
  themes?: readonly ThemeDefinition[],
): string | null {
  if (override === undefined || override === null) return null;

  if (typeof override === "string") {
    if (override.length === 0) return null;
    const resolved = themes ? resolveThemeReference(themes, override) : null;
    if (resolved?.kind === "variant") {
      return `selection:${resolved.family}:${resolved.mode}`;
    }
    if (resolved?.kind === "family") {
      // Same request as `{ family: "cocoa" }`, so switching between the two
      // spellings must not look like a new override.
      return `request:${resolved.family}:`;
    }
    return `name:${override}`;
  }

  if (typeof override !== "object") return null;
  const { family, mode } = override;
  if (family === undefined && mode === undefined) return null;
  if (family !== undefined && mode !== undefined) {
    return `selection:${family}:${mode}`;
  }
  return `request:${family ?? ""}:${mode ?? ""}`;
}

/**
 * Resolve and report: the runtime's single entry point for an override.
 *
 * @typeParam T - The theme definition type used by the application.
 * @param themes - The provider's registered themes.
 * @param override - The requested override, or `undefined`.
 * @param base - The selection to fall back on and to complete a partial request.
 * @returns The resolved selection, or `null` when absent or unresolvable.
 *
 * @internal — used by the runtime and the pre-paint bootstrap so both apply the
 *   same rule and the same diagnostic.
 */
export function resolveThemeOverrideReporting<T extends ThemeDefinition>(
  themes: readonly T[],
  override: ThemeOverride<T["name"]> | undefined,
  base: ThemeSelectionState,
): ThemeSelectionState | null {
  const resolved = resolveThemeOverride(themes, override, base);
  if (resolved || override === undefined || override === null) return resolved;

  const isName = typeof override === "string";
  const requestedFamily = isName ? null : override.family;
  const available = isName
    ? themes.map((theme) => String(theme.name))
    : getThemeFamilies(themes);

  let reason = "no usable value was supplied";
  if (isName) {
    reason = `no provided theme or family is named "${override}"`;
  } else if (requestedFamily !== undefined) {
    reason = `no theme family named "${requestedFamily}" is registered`;
  } else if (override.mode !== undefined && !isThemeMode(override.mode)) {
    reason = `"${String(override.mode)}" is not a valid mode`;
  }

  emitUnresolvedOverrideDiagnostic(override, reason, available);
  return null;
}
