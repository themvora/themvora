/**
 * Pre-paint assets shared by the Vite plugin, the static `boot.js` asset and
 * the runtime.
 *
 * @remarks
 * Two artifacts make the first visible frame correct:
 *
 * - a **render-blocking stylesheet** generated from the declared theme
 *   definitions, so the document has valid light, dark and per-theme variables
 *   even when JavaScript never runs;
 * - a **classic boot script** that restores the persisted selection before the
 *   browser parses the body.
 *
 * Both are derived here, from the same `buildBootstrapPlan` the inline
 * `createThemeBootstrapScript` uses, so the CSS, the script and the runtime
 * cannot disagree about theme identity or fallback resolution.
 *
 * @packageDocumentation
 */
import type {
  ThemeDefinition,
  ThemeIdentifier,
  ThemeMode,
} from "./model/theme";
import { getThemeMode, type ThemeSelectionState } from "./model";
import {
  buildBootstrapPlan,
  type ThemeBootstrapPlan,
} from "./bootstrap";
import { themeToCSSVariables, type ThemeToCSSVariablesOptions } from "./css";
import { escapeStyleElementText } from "./script-safety";

declare global {
  interface Window {
    /**
     * The handoff payload written by the pre-paint boot script.
     *
     * @internal — read by the runtime to detect a mismatch; not part of the
     * supported application API.
     */
    __THEMVORA_BOOTSTRAP__?: {
      theme: string | null;
      mode: "light" | "dark";
      family: string | null;
      label: string | null;
      selection: ThemeSelectionState;
    };
  }
}

/**
 * Options for {@link createThemePrePaintCss}.
 *
 * @typeParam T - The theme definition type used by the application.
 */
export interface ThemePrePaintCssOptions<T extends ThemeDefinition> {
  /** The theme definitions to emit. */
  themes: readonly T[];
  /** Theme to fall back to when no persisted selection exists. */
  defaultTheme?: ThemeIdentifier<T>;
  /**
   * Initial mode used when no persisted selection exists.
   * @defaultValue the mode the fallback theme implies.
   */
  initialMode?: ThemeMode;
  /** Initial family used when no persisted selection exists. */
  initialFamily?: string;
  /** CSS custom property prefix. Defaults to `"theme-"`. */
  prefix?: string;
  /**
   * HTML attribute that names the resolved theme on the root element.
   * @defaultValue `"data-theme"`
   */
  attributeName?: string;
}

function cssOptionsFrom(prefix?: string): ThemeToCSSVariablesOptions {
  return prefix !== undefined ? { prefix } : {};
}

function declarations(
  variables: Record<string, string>,
  colorScheme?: "light" | "dark",
): string {
  const lines: string[] = [];
  if (colorScheme) lines.push(`  color-scheme: ${colorScheme};`);
  for (const [name, value] of Object.entries(variables)) {
    lines.push(`  ${name}: ${value};`);
  }
  return lines.join("\n");
}

/** Escape a value used between double quotes in a CSS attribute selector. */
function cssAttributeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\a ");
}

/**
 * Generate the render-blocking stylesheet for the declared theme collection.
 *
 * @typeParam T - The theme definition type used by the application.
 * @param options - The registry and fallback configuration.
 * @returns A stylesheet that themes the document before any JavaScript runs.
 *
 * @remarks
 * The output has three layers, in cascade order:
 *
 * 1. `:root` carries the fallback theme's variables. It is the only layer a
 *    no-JavaScript page can rely on, so it is always a complete, readable
 *    palette — never a partial one.
 * 2. When the fallback mode is `"system"`, a
 *    `@media (prefers-color-scheme: dark)` block overrides the fallback while
 *    the root carries no resolved theme attribute. The guard is deliberate:
 *    once the boot script (or a server render) names a concrete theme, the
 *    media block must not override it.
 * 3. One `:root[data-theme="…"], [data-theme="…"]` rule per declared theme.
 *    The generic half is what pre-styles a scoped element such as
 *    `<themvora-scope data-theme="plum-dark">` before it upgrades; the `:root`
 *    half is what a server-rendered document and the boot script select. Both
 *    use the same canonical identity attribute, so any declared theme can be
 *    painted without JavaScript.
 *
 * Variables come from {@link themeToCSSVariables}, the canonical serializer, so
 * a token emitted here is byte-identical to the one the runtime writes inline.
 *
 * The stylesheet is returned as text for an inline `<style>` element. Inline is
 * used rather than an emitted asset because the CSS has to be present in Vite
 * development *and* in a production build with identical contents, and because
 * the only consumer-visible cost is one extra block in the document head — no
 * second request, no base-path rewriting and no build-only asset path that can
 * drift from the config.
 */
export function createThemePrePaintCss<T extends ThemeDefinition>(
  options: ThemePrePaintCssOptions<T>,
): string {
  const {
    themes,
    defaultTheme,
    initialMode,
    initialFamily,
    prefix,
    attributeName = "data-theme",
  } = options;

  const plan = buildBootstrapPlan(themes, {
    ...(prefix !== undefined ? { prefix } : {}),
    ...(defaultTheme !== undefined ? { defaultTheme } : {}),
    ...(initialMode !== undefined ? { initialMode } : {}),
    ...(initialFamily !== undefined ? { initialFamily } : {}),
  });

  const cssOptions = cssOptionsFrom(prefix);
  // `buildBootstrapPlan` guarantees both halves or throws on an empty registry.
  const defaultLightVars = themeToCSSVariables(plan.defaultLight!, cssOptions);
  const defaultDarkVars = themeToCSSVariables(plan.defaultDark!, cssOptions);

  /**
   * Every variable name the `:root` fallback declares.
   *
   * A theme's token groups are optional — `code` is the one that matters today,
   * but the rule is general. The `:root` block is the *default theme's* full
   * set, and a per-theme block only overrides the names that theme defines. Any
   * name it leaves out therefore keeps the default theme's value, which is how a
   * preset theme ended up rendering the default theme's light syntax palette on
   * a dark surface: `--theme-code-background` stayed `#f6f7fc` for every preset
   * in both modes, and the `var(..., fallback)` in the consuming stylesheet
   * could never be reached.
   *
   * Resetting the missing names to `initial` in that theme's own block restores
   * the intended cascade: the attribute selector outranks `:root`, so the
   * variable becomes the guaranteed-invalid value and the consumer's fallback
   * applies — per theme, per mode.
   */
  const defaultVariableNames = new Set([
    ...Object.keys(defaultLightVars),
    ...Object.keys(defaultDarkVars),
  ]);

  const blocks: string[] = [];

  if (plan.fallbackMode === "dark") {
    blocks.push(`:root {\n${declarations(defaultDarkVars, "dark")}\n}`);
  } else {
    blocks.push(`:root {\n${declarations(defaultLightVars, "light")}\n}`);
    if (plan.fallbackMode === "system") {
      blocks.push(
        `@media (prefers-color-scheme: dark) {:root:not([${attributeName}]) {\n${declarations(
          defaultDarkVars,
          "dark",
        )}\n}}`,
      );
    }
  }

  for (const theme of themes) {
    const name = String(theme.name);
    const mode = getThemeMode(theme);
    const value = cssAttributeValue(name);
    // The generic selector is what makes a *scoped* region correct before its
    // custom element upgrades: `<themvora-scope data-theme="plum-dark">` gets
    // the variables from the stylesheet while it is still plain HTML, and the
    // binding later writes the same values inline. Without it the scope's
    // children can inherit the page palette for a frame.
    const variables = themeToCSSVariables(theme, cssOptions);
    // Names this theme does not define must not inherit the default theme's
    // value — see `defaultVariableNames`. `initial` makes them absent again, so
    // the consumer's `var(--token, fallback)` resolves its fallback.
    const resets: string[] = [];
    for (const variable of defaultVariableNames) {
      if (!(variable in variables)) resets.push(`  ${variable}: initial;`);
    }
    blocks.push(
      `:root[${attributeName}="${value}"], [${attributeName}="${value}"] {\n${declarations(
        variables,
        mode === "dark" ? "dark" : "light",
      )}${resets.length ? `\n${resets.join("\n")}` : ""}\n}`,
    );
  }

  return escapeStyleElementText(
    `/* themvora pre-paint — generated from the declared theme collection */\n${blocks.join(
      "\n",
    )}\n`,
  );
}

/**
 * The persisted selection key the static boot asset reads.
 * @internal
 */
export const DEFAULT_PREPAINT_STORAGE_KEY = "theme-selection";

/**
 * Options for {@link applyThemeBootstrap}.
 */
export interface ApplyThemeBootstrapOptions {
  /** localStorage key holding `{ mode, family }`. Defaults to `"theme-selection"`. */
  storageKey?: string;
  /** Storage implementation. Defaults to `window.localStorage` when readable. */
  storage?: Storage | null;
  /** Document to patch. Defaults to the global document. */
  document?: Document | null;
  /** Window used for `matchMedia` and the handoff payload. Defaults to the global window. */
  window?: Window | null;
}

/**
 * What {@link applyThemeBootstrap} wrote to the document.
 */
export interface ThemeBootstrapApplied {
  /** Resolved theme name, or `null` when the plan could not name one. */
  theme: string | null;
  /** Concrete mode applied (`"light"` or `"dark"`). */
  mode: "light" | "dark";
  /** Resolved family, or `null` when the plan has none. */
  family: string | null;
  /** The theme's `meta.label`, when it declares one. */
  label: string | null;
  /** The visitor's selection, which may still be `"system"`. */
  selection: ThemeSelectionState;
}

/** Read localStorage without letting a blocked/private-mode access throw. */
function readStorage(storage: Storage | null, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function resolveStorage(
  options: ApplyThemeBootstrapOptions,
): Storage | null {
  if (options.storage !== undefined) return options.storage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    // Safari private mode and sandboxed frames can throw on *access*, not just
    // on read — the script must still paint the fallback theme.
    return null;
  }
}

function resolveDocument(
  options: ApplyThemeBootstrapOptions,
): Document | null {
  if (options.document !== undefined) return options.document;
  return typeof document !== "undefined" ? document : null;
}

function resolveWindow(
  options: ApplyThemeBootstrapOptions,
): Window | null {
  if (options.window !== undefined) return options.window;
  return typeof window !== "undefined" ? window : null;
}

/**
 * Apply a {@link ThemeBootstrapPlan} to the document before first paint.
 *
 * @param plan - The plan built by `buildBootstrapPlan`.
 * @param options - Storage/document/window overrides, for tests and SSR shells.
 * @returns The state written, or `null` when there is no document to patch.
 *
 * @remarks
 * This is the browser-side half of the static `boot.js` asset. It performs the
 * same writes as the generated inline script: the `.dark` class,
 * `color-scheme`, the canonical `data-theme*` attributes, the resolved CSS
 * variables, and the `window.__THEMVORA_BOOTSTRAP__` handoff payload.
 *
 * It is idempotent. Running it twice, or running it after the Vite plugin's
 * inline script has already painted, leaves the first result untouched — the
 * same rule that makes an accidental plugin-plus-manual setup harmless rather
 * than a second, conflicting initialization.
 */
export function applyThemeBootstrap(
  plan: ThemeBootstrapPlan,
  options: ApplyThemeBootstrapOptions = {},
): ThemeBootstrapApplied | null {
  const doc = resolveDocument(options);
  const root = doc?.documentElement ?? null;
  if (!doc || !root) return null;

  const win = resolveWindow(options);

  // Already painted by another copy of the same algorithm (the Vite plugin's
  // inline script, an SSR shell, or a previous evaluation of this asset).
  let existingPayload: unknown;
  try {
    existingPayload = win?.__THEMVORA_BOOTSTRAP__;
  } catch {
    existingPayload = null;
  }
  if (root.getAttribute("data-theme-ready") === "true" && existingPayload) {
    const payload = existingPayload as {
      theme?: string | null;
      mode?: string;
      family?: string | null;
      label?: string | null;
      selection?: ThemeSelectionState;
    };
    return {
      theme: payload.theme ?? null,
      mode: payload.mode === "dark" ? "dark" : "light",
      family: payload.family ?? null,
      label: payload.label ?? null,
      selection: payload.selection ?? {
        mode: plan.fallbackMode,
        family: plan.fallbackFamily ?? "default",
      },
    };
  }

  const key = options.storageKey ?? DEFAULT_PREPAINT_STORAGE_KEY;
  const raw = readStorage(resolveStorage(options), key);

  let persistedMode: ThemeMode | null = null;
  let persistedFamily: string | null = null;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const value = parsed as { mode?: unknown; family?: unknown };
        if (
          value.mode === "light" ||
          value.mode === "dark" ||
          value.mode === "system"
        ) {
          persistedMode = value.mode;
        }
        if (typeof value.family === "string") {
          persistedFamily = value.family;
        }
      }
    } catch {
      // A corrupt entry means "no persisted selection", not a broken page.
    }
  }

  if (plan.override) {
    persistedMode = plan.override.mode;
    persistedFamily = plan.override.family;
  }

  const mode: ThemeMode = persistedMode ?? plan.fallbackMode;

  const families = plan.families;
  const family = families
    ? families.includes(persistedFamily ?? "")
      ? persistedFamily
      : plan.fallbackFamily
    : (persistedFamily ?? plan.fallbackFamily);

  let systemDark = false;
  try {
    systemDark =
      typeof win?.matchMedia === "function" &&
      win.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    systemDark = false;
  }

  const effectiveMode: "light" | "dark" =
    mode === "dark" || (mode === "system" && systemDark) ? "dark" : "light";

  let themeKey =
    family && plan.map[`${family}:${effectiveMode}`]
      ? `${family}:${effectiveMode}`
      : `__default-${effectiveMode}`;

  if (!plan.map[themeKey]) {
    for (const candidate of Object.keys(plan.map)) {
      if (candidate.endsWith(`:${effectiveMode}`)) {
        themeKey = candidate;
        break;
      }
    }
  }

  const separator = themeKey.indexOf(":");
  const resolvedFamily =
    separator >= 0
      ? themeKey.slice(0, separator)
      : (plan.fallbackFamily ?? null);
  const variables = plan.map[themeKey] ?? plan.map["__default-light"] ?? {};
  const themeName =
    plan.names[themeKey] ?? plan.names[`__default-${effectiveMode}`] ?? null;
  const label = themeName ? (plan.labels?.[themeName] ?? null) : null;

  const allVariables = Array.from(
    new Set(Object.values(plan.map).flatMap((vars) => Object.keys(vars))),
  );

  if (effectiveMode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");

  try {
    (root.style as CSSStyleDeclaration & { colorScheme?: string }).colorScheme =
      effectiveMode;
  } catch {
    root.setAttribute("style", `${root.getAttribute("style") ?? ""};color-scheme:${effectiveMode}`);
  }

  root.setAttribute("data-theme-mode", effectiveMode);
  if (resolvedFamily) root.setAttribute("data-theme-family", resolvedFamily);
  if (themeName) root.setAttribute("data-theme", themeName);
  root.setAttribute("data-theme-selection-mode", mode);
  if (family || resolvedFamily) {
    root.setAttribute("data-theme-selection-family", family || resolvedFamily!);
  }
  root.setAttribute("data-theme-ready", "true");

  try {
    if (win) {
      win.__THEMVORA_BOOTSTRAP__ = {
        theme: themeName,
        mode: effectiveMode,
        family: resolvedFamily,
        label,
        selection: { mode, family: family || resolvedFamily || "default" },
      };
    }
  } catch {
    // A frozen/isolated window still gets the attributes and variables above.
  }

  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(name, value);
  }
  for (const name of allVariables) {
    if (!(name in variables)) root.style.removeProperty(name);
  }

  return {
    theme: themeName,
    mode: effectiveMode,
    family: resolvedFamily,
    label,
    selection: { mode, family: family || resolvedFamily || "default" },
  };
}
