/**
 * The preview model: everything the webview is allowed to know.
 *
 * One function turns a parsed document plus a requested mode into either a
 * concrete, validated model or a message explaining why there is none. It is
 * pure — core in, plain data out, no `vscode` — which is what lets the whole
 * theme→screen decision be tested without a host or a browser.
 *
 * Three rules it enforces, each of which the preview would otherwise get wrong:
 *
 * - **Resolve before projecting.** A theme that declares `extends` is flattened
 *   against its document first; otherwise it renders as a handful of overrides.
 * - **Refuse rather than approximate.** A theme missing required roles produces a
 *   message, not a page of `transparent` boxes that looks like a real theme.
 * - **Never follow the OS.** A theme whose mode is `"system"` is rendered in the
 *   mode the caller asked for, and the model says so, so the header can show
 *   `system → light` instead of implying the document chose light.
 *
 * @packageDocumentation
 */
import {
  CORE_COLORS,
  getContrastRatio,
  getThemeMode,
  measureThemeContrast,
  themeToCSSVariables,
  validateTheme,
  type ThemeDefinition,
} from "@themvora/core";

import { describeContrast, summariseContrast } from "./report.js";
import { resolveInDocument } from "./themeResolution.js";

/** A concrete visual mode. `"system"` is a selector, never a preview mode. */
export type PreviewMode = "light" | "dark";

/** One semantic role, as the token table shows it. */
export interface PreviewRole {
  /** The role name, e.g. `mutedForeground`. */
  readonly role: string;
  /** The custom property it becomes, e.g. `--theme-color-mutedForeground`. */
  readonly variable: string;
  /** The value, or `null` when the theme does not define it. */
  readonly value: string | null;
}

/** The view model handed to the webview. */
export interface PreviewModel {
  /** The file name, with a `• unsaved` marker when it has unsaved edits. */
  readonly source: string;
  /** The rendered theme's name. */
  readonly themeName: string;
  /** Its family, or `default`. */
  readonly family: string;
  /** The concrete mode being rendered. */
  readonly mode: PreviewMode;
  /** `true` when a `"system"` theme was resolved to {@link PreviewModel.mode}. */
  readonly systemMode: boolean;
  /** The modes this document can render. Drives which buttons are enabled. */
  readonly modes: readonly PreviewMode[];
  /** Every `--theme-*` custom property, ready to apply. */
  readonly variables: Readonly<Record<string, string>>;
  /** Core's contrast summary, e.g. `16 pairs · text 9/9 · ui 7/7`. */
  readonly contrast: string;
  /** All 21 colour roles, in core's order. */
  readonly roles: readonly PreviewRole[];
  /**
   * The most readable foreground for each filled surface, chosen from the
   * theme's own colours.
   *
   * A theme's `successForeground` is chosen for `success` as the generator sees
   * it, but a hand-written or brand theme can pair a light green with near-white
   * text. Rather than assume the pairing, the best of the theme's own foreground
   * candidates is picked by measured contrast — no colour is invented, and a
   * badge is never unreadable.
   */
  readonly readable: Readonly<Record<string, string>>;
}

/** The outcome of building a model. */
export type PreviewResult =
  | { readonly ok: true; readonly model: PreviewModel }
  | { readonly ok: false; readonly message: string };

/** What {@link buildPreviewModel} needs. */
export interface PreviewInput {
  /** Every theme in the document. */
  readonly themes: readonly ThemeDefinition[];
  /** The mode the user asked for. */
  readonly mode: PreviewMode;
  /** The file name shown in the header. */
  readonly source: string;
}

/**
 * Describe a thrown value for a user-facing message.
 *
 * @param error - The thrown value.
 * @returns Its message, or a fallback.
 */
function messageOf(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message;
  return String(error);
}

/**
 * Build the preview model.
 *
 * @param input - The document's themes, the requested mode and the source label.
 * @returns A model, or a message explaining why none could be built.
 */
export function buildPreviewModel(input: PreviewInput): PreviewResult {
  const { themes, source } = input;

  if (themes.length === 0) {
    return { ok: false, message: `${source} contains no themes.` };
  }

  const entries = themes.map((theme) => ({ theme, declared: getThemeMode(theme) }));
  const concreteModes = [
    ...new Set(entries.map((entry) => entry.declared).filter((mode) => mode !== "system")),
  ] as PreviewMode[];

  // Prefer an exact mode match, then a `"system"` theme rendered in the
  // requested mode, then a lone theme whatever its mode.
  const exact = entries.find((entry) => entry.declared === input.mode);
  const system = entries.find((entry) => entry.declared === "system");
  const only = entries.length === 1 ? entries[0] : undefined;

  let chosen: { theme: ThemeDefinition; mode: PreviewMode; systemMode: boolean } | undefined;

  if (exact !== undefined) {
    chosen = { theme: exact.theme, mode: input.mode, systemMode: false };
  } else if (system !== undefined) {
    chosen = { theme: system.theme, mode: input.mode, systemMode: true };
  } else if (only !== undefined) {
    chosen = {
      theme: only.theme,
      mode: concreteModes[0] ?? "light",
      systemMode: false,
    };
  }

  if (chosen === undefined) {
    return {
      ok: false,
      message: `${source} has no ${input.mode} theme. Available: ${concreteModes.join(", ") || "none"}.`,
    };
  }

  let resolved: ThemeDefinition;
  try {
    resolved = resolveInDocument(chosen.theme, themes);
  } catch (error) {
    // A missing base or a circular chain: core's message names the theme.
    return { ok: false, message: messageOf(error) };
  }

  const validated = validateTheme(resolved, { themes });
  if (!validated.valid) {
    const first = validated.issues[0];
    const detail =
      first === undefined
        ? "the theme does not pass validation"
        : `${first.path}: ${first.message}`;
    return {
      ok: false,
      message: `${resolved.name} is not valid — ${detail}. Run "Themvora: Validate Theme…" for the full report.`,
    };
  }

  const variables = themeToCSSVariables(resolved);
  const roles: PreviewRole[] = CORE_COLORS.map((role) => {
    const variable = `--theme-color-${role}`;
    return { role, variable, value: variables[variable] ?? null };
  });

  const modes = concreteModes.length > 0 ? concreteModes : [chosen.mode];
  const readable = readableForegrounds(variables);

  return {
    ok: true,
    model: {
      source,
      themeName: resolved.name,
      family: resolved.meta?.family ?? "default",
      mode: chosen.mode,
      systemMode: chosen.systemMode,
      modes,
      variables,
      contrast: describeContrast(summariseContrast(measureThemeContrast(resolved))),
      roles,
      readable,
    },
  };
}

/** The surfaces whose text the preview must keep readable. */
const FILLED_SURFACES = [
  "primary",
  "secondary",
  "accent",
  "success",
  "destructive",
  "muted",
  "card",
  "popover",
  "background",
] as const;

/**
 * Pick a readable foreground for every filled surface.
 *
 * Candidates are the theme's own colours, tried in order of intent: the role's
 * paired foreground, then the body foreground, the page background and the card
 * foreground. The highest measured contrast wins.
 *
 * @param variables - The theme's CSS custom properties.
 * @returns A foreground per surface, for the surfaces that have one.
 */
function readableForegrounds(variables: Readonly<Record<string, string>>): Record<string, string> {
  const colour = (name: string): string | undefined => variables[`--theme-color-${name}`];
  const readable: Record<string, string> = {};

  for (const surface of FILLED_SURFACES) {
    const background = colour(surface);
    if (background === undefined) continue;

    const candidates = [`${surface}Foreground`, "foreground", "background", "cardForeground"]
      .map((name) => colour(name))
      .filter((value): value is string => value !== undefined);

    let best: string | undefined;
    let bestRatio = 0;
    for (const candidate of candidates) {
      const ratio = getContrastRatio(candidate, background);
      if (ratio > bestRatio) {
        best = candidate;
        bestRatio = ratio;
      }
    }

    if (best !== undefined) readable[surface] = best;
  }

  return readable;
}
