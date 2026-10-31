import type { ThemeDefinition, ThemeIdentifier, ThemeMode } from "./model/theme";
import {
  getThemeFamilies,
  getThemeFamily,
  resolveTheme,
  type ThemeSelectionState,
} from "./model";
import { resolveInitialTheme, resolveSelectionTheme } from "./resolver";
import { resolveThemeOverride, type ThemeOverride } from "./theme-override";
import { themeToCSSVariables, type ThemeToCSSVariablesOptions } from "./css";
import { escapeStyleElementText, serializeScriptJson } from "./script-safety";

/**
 * Options for {@link buildThemeCssMap}.
 */
export interface BuildThemeCssMapOptions {
  /**
   * CSS custom property prefix applied to every emitted variable.
   * @defaultValue `"theme-"`
   */
  prefix?: string;
}

function cssOptionsFrom(prefix?: string): ThemeToCSSVariablesOptions {
  return prefix !== undefined ? { prefix } : {};
}

/**
 * Build a lookup map of theme keys to flat CSS variables.
 *
 * Each theme is registered twice:
 * - under its own `name` (e.g. `"sunrise-light"`)
 * - under a `family:mode` key (e.g. `"sunrise:light"`) so that a persisted
 *   family + effective mode can be resolved without knowing theme names.
 * @see {@link createThemeBootstrapScript}
 */
export function buildThemeCssMap<T extends ThemeDefinition>(
  themes: readonly T[],
  options: BuildThemeCssMapOptions = {},
): Record<string, Record<string, string>> {
  const cssOptions = cssOptionsFrom(options.prefix);

  const map: Record<string, Record<string, string>> = {};

  for (const theme of themes) {
    const vars = themeToCSSVariables(theme, cssOptions);
    map[String(theme.name)] = vars;

    if (theme.meta?.family && theme.meta?.mode) {
      map[`${theme.meta.family}:${theme.meta.mode}`] = vars;
    }
  }

  return map;
}

/**
 * Options for {@link createThemeBootstrapScript}.
 */
export interface ThemeBootstrapScriptOptions<T extends ThemeDefinition> {
  /** The theme definitions to embed in the generated script. */
  themes: readonly T[];
  /** Theme to fall back to when no persisted selection exists (variant or family). */
  defaultTheme?: ThemeIdentifier<T>;
  /**
   * Initial mode used when no persisted selection exists.
   *
   * @defaultValue The fallback theme's own mode — i.e. the mode
   * `resolveInitialTheme` derives from `defaultTheme` (or from `themes[0]` when
   * `defaultTheme` is omitted). `"system"` is used only when you ask for it.
   *
   * @remarks
   * The default is deliberately *derived* rather than fixed, so the script and
   * the client runtime resolve the same mode by construction. Passing a value
   * here that disagrees with the runtime's `initialMode` reintroduces the
   * wrong-theme flash the script exists to prevent.
   */
  initialMode?: ThemeMode;
  /** Initial theme family used when no persisted selection exists. */
  initialFamily?: string;
  /**
   * An explicit theme override to apply before first paint, outranking any
   * persisted selection.
   *
   * The blocking script runs before the runtime exists, so an override applied
   * only by a post-mount effect would paint the saved theme first and then
   * correct it — exactly the flash this script exists to prevent. Passing it here
   * makes the very first frame the overridden theme.
   */
  themeOverride?: ThemeOverride<string>;
  /** localStorage key holding the persisted theme selection. Defaults to `"theme-selection"`. */
  storageKey?: string;
  /** CSS custom property prefix. Defaults to `"theme-"`. */
  prefix?: string;
}

/**
 * Generate an inline, blocking script that applies the persisted theme before
 * first paint, preventing a flash of the wrong (or missing) theme on reload.
 *
 * The script reads the saved selection from localStorage, resolves the theme
 * for the effective mode (`"system"` is resolved against `prefers-color-scheme`),
 * and writes the CSS variables plus DOM effects onto `document.documentElement`.
 * @see {@link buildThemeCssMap}
 * @see {@link createPrePaintScrollbarScript}
 */
export function createThemeBootstrapScript<T extends ThemeDefinition>(
  options: ThemeBootstrapScriptOptions<T>,
): string {
  const {
    themes,
    defaultTheme,
    initialMode,
    initialFamily,
    themeOverride,
    storageKey = "theme-selection",
    prefix,
  } = options;

  const plan = buildBootstrapPlan(themes, {
    ...(prefix !== undefined ? { prefix } : {}),
    ...(defaultTheme !== undefined ? { defaultTheme } : {}),
    ...(initialMode !== undefined ? { initialMode } : {}),
    ...(initialFamily !== undefined ? { initialFamily } : {}),
    ...(themeOverride !== undefined ? { themeOverride } : {}),
  });

  return serializeThemeBootstrapScript(plan, { kind: "storage", key: storageKey });
}

/**
 * Render a CSS variable record as `--name: value;` declaration lines.
 *
 * @param variables - The CSS variable record to render.
 * @returns The declaration block body (no braces).
 */
function cssRules(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
}

/**
 * Generate a `@media (prefers-color-scheme: dark)` CSS block carrying the given
 * variables.
 *
 * @remarks
 * This is a **pre-script** fallback only, and it cannot beat an inline `style`
 * on the same element: inline declarations outrank every stylesheet rule
 * regardless of specificity. So it is only safe when nothing inlines the light
 * variables — do not pair it with a server render that writes them onto
 * `<html>`, or an OS-dark visitor keeps the light ones and this block is inert.
 * When the resolved mode is `"system"`, use {@link systemModeCSSTemplate}
 * instead: it emits both schemes and expects no inline variables.
 *
 * @param variables - The CSS variables to emit under the dark media query.
 * @returns A `@media (prefers-color-scheme: dark)` block targeting `:root`,
 *   escaped so it cannot terminate a `<style>` element (`</` becomes `<\/`,
 *   which CSS parses identically).
 *
 * @see {@link systemModeCSSTemplate}
 */
export function darkModeCSSTemplate(
  variables: Record<string, string>,
): string {
  return escapeStyleElementText(
    `@media (prefers-color-scheme: dark) {:root {\n${cssRules(variables)}\n}}`,
  );
}

/**
 * Generate the stylesheet that resolves a `"system"` selection with CSS alone —
 * no script and no inline style.
 *
 * @remarks
 * Use this **instead of** inlining the resolved variables whenever the mode is
 * `"system"`. The two cannot be combined: an inline `style` on `<html>`
 * outranks any stylesheet rule, so a page that inlines the light variables and
 * also emits a dark media block paints light whatever the OS prefers. Measured
 * on a production build with page scripts blocked and the OS set to dark, that
 * combination painted `rgb(248, 250, 252)` (light); emitting both media blocks
 * and no inline variables painted `rgb(2, 6, 23)`.
 *
 * `prefers-color-scheme: light` also matches when the visitor has expressed no
 * preference — `light` is the specified default — so the light block doubles as
 * the no-preference branch.
 *
 * @param light - The light theme's CSS variables.
 * @param dark - The dark theme's CSS variables.
 * @returns Two media blocks, one per scheme, both targeting `:root`, escaped
 *   for `<style>`-element content exactly as {@link darkModeCSSTemplate} is.
 *
 * @see {@link darkModeCSSTemplate}
 */
export function systemModeCSSTemplate(
  light: Record<string, string>,
  dark: Record<string, string>,
): string {
  return escapeStyleElementText(
    [
      `@media (prefers-color-scheme: dark) {:root {\n${cssRules(dark)}\n}}`,
      `@media (prefers-color-scheme: light) {:root {\n${cssRules(light)}\n}}`,
    ].join(""),
  );
}

/** @internal — shared zero-flash implementation detail; not part of the public
 *  API and not shown in the public documentation. */
export interface ThemeBootstrapPlan<T extends ThemeDefinition = ThemeDefinition> {
  /** Theme keys → flat CSS variables (names, `family:mode`, `__default-*`). */
  map: Record<string, Record<string, string>>;
  /** Theme keys → theme name (used to write `data-theme`). */
  names: Record<string, string>;
  /**
   * Theme **name** → human label (`theme.meta.label`), for
   * `data-tv-readout="label"`.
   *
   * Keyed by name rather than by theme key because that is what the script can
   * read back: `data-theme` on `<html>` holds the resolved theme's *name*, and
   * the script has no registry to look a key up in. A theme with no
   * `meta.label` is absent, and the readout is then left as the server rendered
   * it rather than being rewritten with the machine name.
   *
   * Optional so a hand-assembled plan stays valid.
   */
  labels?: Record<string, string>;
  /** Mode used when no persisted selection is present. */
  fallbackMode: ThemeMode;
  /**
   * Family used when no persisted family is present.
   *
   * `buildBootstrapPlan` always resolves this to a real family — it is never
   * null and never the unknown family that was requested. The `| null` is for
   * callers that assemble a plan by hand (the Astro integration does, because
   * its theme map arrives pre-built from the Vite plugin).
   */
  fallbackFamily: string | null;
  /**
   * Every family registered in the plan's theme set, in registration order.
   *
   * The inline script validates a persisted family against this list. Without
   * it a stale cookie or `localStorage` entry — one written before the registry
   * changed its family set — survives into `data-theme-selection-family` and
   * into every `data-tv-readout="family"`, naming a family that is not applied
   * while the resolved theme falls back to `__default-*`. The server, which
   * normalises through `resolveSelection`, then disagrees with the browser about
   * the same page, and the readout visibly corrects on load.
   *
   * Optional so a hand-assembled plan stays valid; when absent the script cannot
   * confirm a persisted family and uses `fallbackFamily` instead.
   */
  families?: string[];
  /** The fallback family's resolved light theme (when themes are available). */
  defaultLight?: T;
  /** The fallback family's resolved dark theme (when themes are available). */
  defaultDark?: T;
  /**
   * The selection an explicit `themeOverride` resolved to, when one was supplied
   * and could be satisfied.
   *
   * The inline script applies it over the persisted selection: the override is
   * not stored, so storage must not be allowed to win on a reload.
   */
  override?: ThemeSelectionState | null;
}

/** @internal — reads the persisted selection from storage (no server
 *  boundary, so no fingerprint is applied). */
export interface ThemeBootstrapStorageSource {
  kind: "storage";
  /** localStorage key holding `{ mode, family }`. */
  key: string;
}

/**
 * Fingerprints a theme registry so a persisted selection from an older build —
 * different themes, or a different `defaultTheme` — is ignored rather than
 * applied against themes it was never valid for.
 *
 * @param themes - The theme registry to fingerprint.
 * @param defaultTheme - The fallback theme name. Included in the fingerprint,
 * so changing it invalidates previously persisted selections.
 * @returns A stable fingerprint string, or `""` when `themes` is empty.
 *
 * @remarks
 * The result is written to the `theme-fingerprint` cookie and compared on the
 * next request, so it is part of the **stable cookie contract** documented in
 * `VERSIONING.md` — changing the format invalidates every visitor's persisted
 * selection on their next visit.
 *
 * It lives here, in core, because four SSR integrations
 * (Next, Nuxt, Astro, Remix) previously each carried a byte-identical private
 * copy. Any edit to one of them would have silently broken cross-framework
 * persistence with nothing to catch it.
 *
 * @see {@link ThemeBootstrapCookieSource}
 * @see {@link buildBootstrapPlan}
 */
export function computeFingerprint(
  themes: readonly ThemeDefinition[],
  defaultTheme?: string,
): string {
  if (!themes.length) return "";
  const names = themes
    .map((theme) => theme.name)
    .sort()
    .join(",");
  return `${defaultTheme ?? ""}|${names}`;
}

/**
 * The state the pre-paint bootstrap published on `<html>`, validated against
 * the theme registry.
 *
 * @typeParam T - The theme definition type used by the application.
 *
 * @see {@link readBootstrapState}
 */
export interface ThemeBootstrapState<T extends ThemeDefinition> {
  /** The resolved theme — the one already painted on `<html>`. */
  theme: T;
  /**
   * The visitor's **selection**. For `"system"` this is still `"system"` — the
   * resolved mode is {@link resolvedMode}, and the two are deliberately
   * distinct so adopting this state cannot downgrade a `"system"` choice.
   */
  selection: ThemeSelectionState;
  /** The concrete mode the bootstrap applied (`"light"` or `"dark"`). */
  resolvedMode: "light" | "dark";
  /** Whether the bootstrap reported completing its DOM write. */
  ready: boolean;
}

/**
 * Reads the pre-paint bootstrap's state back off the DOM, validated against the
 * theme registry.
 *
 * @typeParam T - The theme definition type used by the application.
 * @param themes - The registry the `data-theme` name is validated against.
 * @param target - The element to read from. Defaults to `<html>`.
 * @returns The validated state, or `null` when there is no DOM, no
 *   `data-theme`, or the name is not in the registry.
 *
 * @remarks
 * This is the *read* half of the bootstrap handoff. The blocking script writes
 * `data-theme` (resolved theme), `data-theme-selection-mode` /
 * `data-theme-selection-family` (the selection, which is not recoverable from
 * the resolved theme), `data-theme-ready`, and a
 * `window.__THEMVORA_BOOTSTRAP__` payload.
 *
 * It exists so a client runtime can **adopt** what was already painted instead
 * of re-deriving it: by the time a client renders, `<html>` is the authority on
 * what the visitor is looking at, and anything that re-resolves can disagree
 * with it. The result is validated against the registry rather than trusted as
 * an arbitrary string, so a stale or hand-written attribute cannot inject a
 * theme that does not exist.
 *
 * @see {@link createThemeBootstrapScript}
 */
export function readBootstrapState<T extends ThemeDefinition>(
  themes: readonly T[],
  target?: Element | null,
): ThemeBootstrapState<T> | null {
  const el =
    target ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (!el || typeof el.getAttribute !== "function") return null;

  const themeName = el.getAttribute("data-theme");
  if (!themeName) return null;

  let theme: T;
  try {
    theme = resolveTheme(themes, themeName as T["name"]) as T;
  } catch {
    // An unknown name means the attribute was written by a different registry
    // (or hand-edited). Adopting it would put the runtime on a theme that is
    // not registered, so refuse and let the caller fall back to resolving.
    return null;
  }
  if (!theme) return null;

  const selectionMode = el.getAttribute("data-theme-selection-mode");
  const selectionFamily = el.getAttribute("data-theme-selection-family");
  const meta = (theme.meta ?? {}) as { family?: string; mode?: string };

  return {
    theme,
    selection: {
      mode:
        selectionMode === "light" ||
        selectionMode === "dark" ||
        selectionMode === "system"
          ? (selectionMode as ThemeMode)
          : ((meta.mode as ThemeMode) ?? "system"),
      family: selectionFamily ?? meta.family ?? getThemeFamily(theme),
    },
    resolvedMode: meta.mode === "dark" ? "dark" : "light",
    ready: el.getAttribute("data-theme-ready") === "true",
  };
}

/**
 * Builds the inline script that fills in **bootstrap readouts** and reconciles
 * **selection controls**: the parts of the page that display or reflect a
 * theme-derived value the server cannot know.
 *
 * @returns The script body to emit at the **end of `<body>`**, after the
 *   elements it patches exist.
 *
 * @remarks
 * Three kinds of element opt in, and all three are reconciled from the same
 * three values — the resolved theme, the mode selection and the family
 * selection — because a control that lags the canvas by one value is the same
 * bug in a smaller window:
 *
 * | Attribute | Written | Meaning |
 * | --------- | ------- | ------- |
 * | `data-tv-readout` | `textContent` | `"theme"`, `"label"`, `"mode"`, `"family"`, or `"var:<custom-property>"` |
 * | `data-tv-pressed` + `data-tv-value` | `aria-pressed` | this element represents that option of `"mode"` / `"family"` |
 * | `data-tv-select` | `value` | this `<select>` edits `"mode"` / `"family"` |
 *
 * Why this exists: a server-rendered readout or control can only show the
 * *server's* resolution, and for `"system"` mode — or for any prerendered page,
 * which has no request to read a cookie from — that is a fallback the browser
 * overrides before the first paint. The canvas is corrected by the bootstrap,
 * but the text and the pressed state are not, so they settle once after
 * hydration, which is the last visible difference on an otherwise static page.
 * On a page that reloads repeatedly it reads as the label "fluctuating" between
 * the two themes.
 *
 * `data-tv-pressed` writes `aria-pressed` and nothing else. That is the whole
 * point: the accessible state *is* the visual state, so a token class keyed off
 * `aria-pressed` needs no second attribute to keep in step, and a screen reader
 * can never announce a pressed option the page does not show as pressed.
 *
 * Patching before the first paint closes that, but only if the framework then
 * leaves the element alone. In React that means pairing a readout with
 * `suppressHydrationWarning` on the same element: React renders its own value
 * during hydration, sees the DOM already differs, and — with the attribute —
 * neither warns nor rewrites. The framework's own post-hydration render then
 * produces the live value, which is the same value the script wrote, so nothing
 * moves. Without the suppression React would rewrite the text back to the
 * server's fallback and re-introduce the settle.
 *
 * It is deliberately placed at the end of the body: the blocking script runs in
 * `<head>`, before these elements have been parsed, so it cannot patch them.
 *
 * **It reads the live document, not the page's build-time state.** The values
 * come from `<html>`'s own `data-theme` / `data-theme-selection-*` attributes,
 * which by this point describe what the visitor is actually looking at, and
 * only fall back to the published bootstrap payload when those attributes are
 * absent. That is what makes the script idempotent, and idempotence is
 * load-bearing rather than tidy: `<ClientRouter />` re-executes inline body
 * scripts on a client-side navigation, so this runs again on every navigation —
 * after the incoming page's readouts have already been brought up to date. A
 * script that wrote the *initial* selection would undo that, and every readout
 * would revert to the page-build default until the next theme change. Measured
 * on the example app: with the payload as the source, navigating from `/` with
 * `cocoa-dark` selected left the readouts at `mint-light` / `system` / `mint`
 * while the document was painted `cocoa-dark`.
 *
 * @see {@link createThemeBootstrapScript}
 * @see {@link readBootstrapState}
 */
export function createThemeReadoutScript(): string {
  return (
    "(function(){try{" +
    "var b=window.__THEMVORA_BOOTSTRAP__;" +
    "var de=document.documentElement;" +
    // `<html>` first: the blocking script has already written the resolved
    // state there, so it is more recent than anything a page was built with.
    "function attr(n){var v=de.getAttribute(n);return v===null||v===''?null:v;}" +
    "var t=attr('data-theme')||(b?b.theme:null);" +
    "var m=attr('data-theme-selection-mode')||(b&&b.selection?b.selection.mode:null);" +
    "var f=attr('data-theme-selection-family')||(b&&b.selection?b.selection.family:null);" +
    // The label belongs to the *resolved* theme, which is the one `data-theme`
    // names, so it travels in the payload rather than being looked up here — a
    // script emitted at the end of the body has no registry to look it up in.
    "var lb=b?b.label:null;" +
    "if(t==null&&m==null&&f==null)return;" +
    // Write into the existing text node when there is exactly one. Assigning
    // `textContent` replaces every child, and when the element is React-rendered
    // (an island's readout) the framework's fiber still points at the node that
    // was discarded — its later unmount then calls removeChild on a node that is
    // no longer a child and throws. Updating nodeValue keeps the identity.
    "var w=function(el,v){var c=el.firstChild;" +
    "if(c&&c.nodeType===3&&!c.nextSibling){if(c.nodeValue!==v){c.nodeValue=v;}return;}" +
    "el.textContent=v;};" +
    "var els=document.querySelectorAll('[data-tv-readout],[data-tv-pressed],[data-tv-select]');" +
    "for(var i=0;i<els.length;i++){" +
    "var n=els[i];" +
    "var k=n.getAttribute('data-tv-readout');" +
    "if(k){" +
    "var v=k==='theme'?t:(k==='label'?lb:(k==='mode'?m:(k==='family'?f:null)));" +
    // `var:<name>` reads a resolved variable. The bootstrap applied the resolved
    // theme's variables to <html> before this script runs, so they are readable
    // here without publishing the whole variable map to the payload.
    "if(v==null&&k.slice(0,4)==='var:'){" +
    "try{v=getComputedStyle(de).getPropertyValue(k.slice(4)).trim()||null;}catch(e2){v=null;}" +
    "}" +
    "if(v!=null&&n.textContent!==v){w(n,v);}" +
    "continue;" +
    "}" +
    // Control state, reconciled from the same three values as the text — see
    // `__tvPatch` in the blocking script for why only `aria-pressed` is
    // written, and why a `<select>` only takes a value it offers.
    "var pr=n.getAttribute('data-tv-pressed');" +
    "if(pr){" +
    "var want=n.getAttribute('data-tv-value');" +
    "var cur=pr==='mode'?m:(pr==='family'?f:null);" +
    "if(cur!=null&&want!=null){var nx=String(cur===want);" +
    "if(n.getAttribute('aria-pressed')!==nx){n.setAttribute('aria-pressed',nx);}}" +
    "continue;" +
    "}" +
    "var se=n.getAttribute('data-tv-select');" +
    "if(se){" +
    "var want2=se==='family'?f:(se==='mode'?m:null);" +
    "if(want2!=null&&n.value!==want2){" +
    "for(var o=0;o<n.options.length;o++){if(n.options[o].value===want2){n.value=want2;break;}}" +
    "}}" +
    "}" +
    "}catch(e){}})()"
  );
}

/** @internal — reads the persisted selection from the SSR cookie contract
 *  (`theme-mode` / `theme-family` / `theme-fingerprint`), rejecting stale
 *  fingerprints. Shared by the Next/Nuxt/Astro/Remix integrations. */
export interface ThemeBootstrapCookieSource {
  kind: "cookies";
  names: { mode: string; family: string; fingerprint: string };
}

/** @internal */
export type ThemeBootstrapSource =
  | ThemeBootstrapStorageSource
  | ThemeBootstrapCookieSource;

/**
 * Builds the shared {@link ThemeBootstrapPlan} for a theme registry: the CSS
 * map, the theme-name lookup and the resolved fallback light/dark themes.
 *
 * @internal — shared zero-flash implementation detail.
 */
export function buildBootstrapPlan<T extends ThemeDefinition>(
  themes: readonly T[],
  options: {
    prefix?: string;
    defaultTheme?: ThemeIdentifier<T>;
    initialMode?: ThemeMode;
    initialFamily?: string;
    themeOverride?: ThemeOverride<ThemeIdentifier<T>>;
  } = {},
): ThemeBootstrapPlan<T> {
  const { prefix, defaultTheme, initialMode, initialFamily, themeOverride } = options;
  const cssOptions = cssOptionsFrom(prefix);

  const baseResolution = resolveInitialTheme({
    themes,
    ...(defaultTheme !== undefined ? { defaultTheme } : {}),
    ...(initialFamily !== undefined ? { family: initialFamily } : {}),
    ...(initialMode !== undefined ? { mode: initialMode } : {}),
  });

  // Resolved with the same function the runtime uses, so the script and the
  // runtime cannot disagree about what an override means. A request the catalog
  // cannot satisfy is dropped here (the runtime reports it once, on the client);
  // an override that did not resolve must not change the plan.
  const override = resolveThemeOverride(themes, themeOverride, baseResolution.selection);
  const selection = override ?? baseResolution.selection;
  const defaultFamily = selection.family;

  // The script's fallback mode is the mode `resolveInitialTheme` just resolved —
  // the very same value the client runtime adopts from its own call to
  // `resolveInitialTheme`. Deriving it rather than hardcoding `"system"` is what
  // keeps the two halves of the zero-flash contract from disagreeing.
  //
  // Hardcoded, the script followed `prefers-color-scheme` while the runtime
  // followed the fallback theme's own mode (`"light"` for a `*-light`
  // `defaultTheme`), so a first-time visitor on a dark OS saw the script's dark
  // paint corrected to light by the runtime — a visible flash. It also meant a
  // `defaultTheme="*-dark"` app flashed in the opposite direction on a light OS.
  //
  // `initialMode` still wins when given (it is what `resolveInitialTheme`
  // resolved), so asking for `"system"` still gets you `"system"`.
  const fallbackMode = selection.mode;

  const defaultLight = resolveSelectionTheme({
    themes,
    selection: { family: defaultFamily, mode: "light" },
  }).theme;

  // The requested family may be unknown, and a theme may declare no `meta` at
  // all. Resolve dark against the family the light theme *actually* resolved
  // to, read through `getThemeFamily` so that a meta-less theme yields its
  // canonical family instead of leaking the requested one. Without this the
  // dark default can resolve to `themes[0]` — which is a light theme — and the
  // pair stops being coherent.
  const resolvedFamily = getThemeFamily(defaultLight);

  const defaultDark = resolveSelectionTheme({
    themes,
    selection: { family: resolvedFamily, mode: "dark" },
  }).theme;

  const map = buildThemeCssMap(themes, prefix !== undefined ? { prefix } : {});
  map["__default-light"] = themeToCSSVariables(defaultLight, cssOptions);
  map["__default-dark"] = themeToCSSVariables(defaultDark, cssOptions);

  const lightName = String(defaultLight.name);
  const darkName = String(defaultDark.name);

  const names: Record<string, string> = {};
  for (const theme of themes) {
    const themeName = String(theme.name);
    names[themeName] = themeName;
    if (theme.meta?.family && theme.meta?.mode) {
      names[`${theme.meta.family}:${theme.meta.mode}`] = themeName;
    }
  }
  names["__default-light"] = lightName;
  names["__default-dark"] = darkName;

  // Name → label, for the `label` readout kind. Built from the registry rather
  // than from `names` because a label is per-theme, not per-key: the same theme
  // is reachable under its name and under `family:mode`, and both must read
  // back the same label.
  //
  // A theme without `meta.label` is deliberately omitted. Writing the machine
  // name into a readout that a caller rendered as a human label would be a
  // silent content change, and `String(theme.name)` is already what the `theme`
  // kind is for.
  const labels: Record<string, string> = {};
  for (const theme of themes) {
    const label = theme.meta?.label;
    if (typeof label === "string" && label) labels[String(theme.name)] = label;
  }

  return {
    map,
    names,
    labels,
    fallbackMode,
    fallbackFamily: resolvedFamily,
    // The families the inline script may legitimately select, taken from the
    // same registry the CSS map was built from. A family is therefore either in
    // both or in neither, so the script's validation cannot accept a family the
    // map has no variables for.
    families: getThemeFamilies(themes),
    defaultLight,
    defaultDark,
    override,
  };
}

/**
 * The script's `family` expression: `fam0` when it names a registered family,
 * the plan's fallback otherwise.
 *
 * @internal — shared zero-flash implementation detail.
 *
 * @remarks
 * `fam0` is whatever the visitor persisted — a cookie or `localStorage` entry,
 * possibly written before the registry changed its family set. Trusting it
 * verbatim would leave `data-theme-selection-family` (and therefore every
 * `data-tv-readout="family"`) naming a family the CSS map has no variables for,
 * while the theme itself resolves to `__default-*`. That is a readout which
 * contradicts the page, and it makes the browser disagree with the server, which
 * normalises through `resolveSelection` — so the text visibly corrects on load.
 *
 * When the plan carries no `families` list (a hand-assembled plan) there is
 * nothing to validate against, so the persisted value is used as before.
 */
function familySelectionExpression(plan: ThemeBootstrapPlan): string {
  const families = serializeScriptJson(plan.families ?? null);
  const fallback = serializeScriptJson(plan.fallbackFamily ?? null);
  return (
    "var fams=" + families + ";" +
    "var family=fams?(fams.indexOf(fam0)!==-1?fam0:" + fallback + "):(fam0||" + fallback + ");"
  );
}

/**
 * The script's override assignment: replaces whatever the persisted selection
 * said with the override the server resolved from the provider's props.
 *
 * Placed after the storage/cookie read — and after the cookie fingerprint guard,
 * which only concerns the persisted value — so the override always wins, and
 * before the `family`/`mode` expressions so both see it. The values are resolved
 * server-side and serialized with {@link serializeScriptJson}, so an override
 * cannot inject script content.
 *
 * @internal
 */
function overrideExpression(plan: ThemeBootstrapPlan): string {
  if (!plan.override) return "";
  return (
    "var ov=" + serializeScriptJson(plan.override) + ";" +
    "if(ov){mode0=ov.mode;fam0=ov.family;}"
  );
}

/** @internal */
function readStorageSelection(
  plan: ThemeBootstrapPlan,
  source: ThemeBootstrapStorageSource,
): string {
  return (
    "var raw=localStorage.getItem(" + serializeScriptJson(source.key) + ");" +
    "var sel=null;try{sel=raw?JSON.parse(raw):null;}catch(e){}" +
    "var mode0=sel&&(sel.mode==='light'||sel.mode==='dark'||sel.mode==='system')?sel.mode:null;" +
    "var fam0=sel&&typeof sel.family==='string'?sel.family:null;" +
    overrideExpression(plan) +
    "var mode=mode0||" + serializeScriptJson(plan.fallbackMode) + ";" +
    familySelectionExpression(plan)
  );
}

/** @internal */
function readCookieSelection(
  plan: ThemeBootstrapPlan,
  source: ThemeBootstrapCookieSource,
  fingerprint: string,
): string {
  const guard = fingerprint
    ? "if(fp&&fp!==" + serializeScriptJson(fingerprint) + "){mode0=null;fam0=null;}"
    : "";

  return (
    // A cookie value is percent-encoded by the writer, but nothing guarantees
    // it still decodes: a sibling subdomain can plant `theme-mode=%E0%A4%A` on
    // the parent domain, and `decodeURIComponent` throws `URIError` on it. The
    // whole script runs inside one try/catch, so an unguarded throw here would
    // skip the theme apply entirely and the page would paint the default. A
    // value that does not decode is treated as "no selection", which is what a
    // malformed cookie means.
    "function getCookie(n){var m=document.cookie.match(new RegExp('(^|; )'+n+'=([^;]+)'));" +
    "if(!m)return null;try{return decodeURIComponent(m[2])}catch(e){return null}}" +
    "var mode0=getCookie(" + serializeScriptJson(source.names.mode) + ");" +
    "var fam0=getCookie(" + serializeScriptJson(source.names.family) + ");" +
    "var fp=getCookie(" + serializeScriptJson(source.names.fingerprint) + ");" +
    guard +
    overrideExpression(plan) +
    "var hasMode=mode0==='light'||mode0==='dark'||mode0==='system';" +
    "var mode=hasMode?mode0:" + serializeScriptJson(plan.fallbackMode) + ";" +
    familySelectionExpression(plan)
  );
}

/**
 * Serializes the single pre-paint applier that reads the persisted selection
 * (storage or cookies) and writes the theme state before first paint: the
 * `.dark` class, `color-scheme`, the `data-theme*` attributes and the CSS
 * variables — the exact contract the client runtime applies.
 *
 * @remarks
 * Every theme-derived value is embedded with {@link serializeScriptJson}, not
 * `JSON.stringify`. The result is placed in the body of a `<script>` element by
 * the framework integrations, where a `</script` sequence inside a theme name,
 * family name or token value ends the element and turns the rest of the theme
 * data into markup. JSON escaping does not cover that, so it is done here, once,
 * for every field the script carries.
 *
 * @internal — shared zero-flash implementation detail.
 */
export function serializeThemeBootstrapScript<T extends ThemeDefinition>(
  plan: ThemeBootstrapPlan<T>,
  source: ThemeBootstrapSource,
  options: { fingerprint?: string } = {},
): string {
  const fingerprint = options.fingerprint ?? "";

  const read =
    source.kind === "storage"
      ? readStorageSelection(plan, source)
      : readCookieSelection(plan, source, fingerprint);

  // Every CSS variable name any theme in the plan can produce. The pre-paint
  // script is the authority for the inline `--theme-*` set: an SSR shell paints
  // the *default* theme's variables, and the persisted theme may define fewer
  // token groups (e.g. a preset with no `code` group), so the groups it omits
  // must be cleared. Leaving them set lets them shadow a
  // `var(--theme-code-*, fallback)` rule — the code block would keep the
  // default theme's syntax colours after a reload.
  const allVarNames = Array.from(
    new Set(Object.values(plan.map).flatMap((vars) => Object.keys(vars))),
  );

  const app =
    "var sysDark=!!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);" +
    "var eff=mode==='dark'||(mode==='system'&&sysDark)?'dark':'light';" +
    "var map=" + serializeScriptJson(plan.map) + ";" +
    "var names=" + serializeScriptJson(plan.names) + ";" +
    "var lbl=" + serializeScriptJson(plan.labels ?? {}) + ";" +
    "var key=(family&&map[family+':'+eff])?family+':'+eff:'__default-'+eff;" +
    "if(!map[key]){for(var k in map){if(k.slice(-(eff.length+1))===':'+eff){key=k;break;}}}" +
    "var i=key.indexOf(':');" +
    "var fam=i>=0?key.slice(0,i):" + serializeScriptJson(plan.fallbackFamily ?? null) + ";" +
    "var vars=map[key]||map['__default-light'];" +
    "var name=names[key]||names['__default-'+eff]||null;" +
    "var el=document.documentElement;" +
    "var __all=" + serializeScriptJson(allVarNames) + ";" +
    "if(eff==='dark'){el.classList.add('dark');}else{el.classList.remove('dark');}" +
    "el.style.colorScheme=eff;" +
    "el.setAttribute('data-theme-mode',eff);" +
    "if(fam){el.setAttribute('data-theme-family',fam);}" +
    "if(name){el.setAttribute('data-theme',name);}" +
    // The *selection* — as opposed to the resolved mode above — plus a
    // completion marker and the published handoff payload. `data-theme-mode`
    // and the `dark` class describe the theme that was applied; they cannot
    // recover what the visitor chose, because a `"system"` selection is
    // resolved to `"light"`/`"dark"` before it is written. Without the
    // selection in the DOM, a client that adopted the bootstrap state would
    // silently downgrade `"system"` to a concrete mode.
    "el.setAttribute('data-theme-selection-mode',mode);" +
    "if(family||fam){el.setAttribute('data-theme-selection-family',family||fam);}" +
    "el.setAttribute('data-theme-ready','true');" +
    "try{window.__THEMVORA_BOOTSTRAP__={theme:name,mode:eff,family:fam,label:(lbl[name]||null),selection:{mode:mode,family:family||fam}};}catch(e2){}" +
    // Readouts and selection controls are reconciled from HERE, not only from
    // the end-of-body script. A body-end script is too late: the browser is free
    // to paint while the parser is still working through a large body, so a
    // prerendered readout or a pressed-state control can be painted with the
    // value the prerender used — visible as the label "fluctuating" on reload.
    // This script runs in <head>, before the body is parsed, so instead of
    // querying once it watches for these elements appearing and reconciles each
    // one in the same task it is inserted in.
    //
    // It reads the state off `<html>`, which this script has just written, and
    // only falls back to the values resolved above. That is what keeps it
    // correct across a client-side navigation, where the observer installed on
    // the first load is still attached: `<ClientRouter />` re-executes inline
    // scripts, so the destination page's controls are new, unmarked elements,
    // and an observer holding the *first* page's values would stamp them with
    // the selection the app was built with — the readouts reverting to
    // `mint-light` while the document is painted `cocoa-dark`.
    "var __tvPatch=function(){" +
    "try{" +
    "var t2=el.getAttribute('data-theme')||name;" +
    "var m2=el.getAttribute('data-theme-selection-mode')||mode;" +
    "var f3=el.getAttribute('data-theme-selection-family')||family||fam;" +
    // Single-text-node write, for the same reason as the end-of-body script:
    // assigning `textContent` would discard the node React's fiber tracks, and
    // the island's later unmount would throw on a node that is no longer a
    // child. See `createThemeReadoutScript`.
    "var __tvW=function(n,v){var c=n.firstChild;" +
    "if(c&&c.nodeType===3&&!c.nextSibling){if(c.nodeValue!==v){c.nodeValue=v;}return;}" +
    "n.textContent=v;};" +
    // One pass over everything the contract owns, not three queries. The three
    // kinds answer the same question — "what did the visitor actually choose?"
    // — from the same three values, so they must be reconciled together; a
    // control that lagged the canvas by one pass would be the same bug in a
    // smaller window.
    "var els=document.querySelectorAll('[data-tv-readout],[data-tv-pressed],[data-tv-select]');" +
    "for(var q=0;q<els.length;q++){" +
    // `n0`, not `el`: `el` is `<html>` above, and the `var:` readout branch
    // reads its computed style.
    "var n0=els[q];" +
    "var rd=n0.getAttribute('data-tv-readout');" +
    "if(rd){" +
    // Text readouts are marked once written, so the `var:` branch below does not
    // run `getComputedStyle` again on every later mutation. The other two kinds
    // are not marked: their writes are already conditional, and a `<select>`
    // marked before its options were parsed could never be corrected.
    "if(n0.getAttribute('data-tv-patched')==='1'){continue;}" +
    "var v2=rd==='theme'?t2:(rd==='label'?(lbl[t2]||null):(rd==='mode'?m2:(rd==='family'?f3:null)));" +
    "if(v2==null&&rd.slice(0,4)==='var:'){" +
    "try{v2=getComputedStyle(el).getPropertyValue(rd.slice(4)).trim()||null;}catch(e3){v2=null;}" +
    "}" +
    "if(v2!=null){__tvW(n0,v2);n0.setAttribute('data-tv-patched','1');}" +
    "continue;" +
    "}" +
    // A segmented control: `data-tv-pressed` names the kind, `data-tv-value`
    // the option this element represents. Only `aria-pressed` is written, so
    // the visual state and the accessible state cannot disagree — which is why
    // a token class keyed off `aria-pressed` needs no second attribute.
    "var pr=n0.getAttribute('data-tv-pressed');" +
    "if(pr){" +
    "var want=n0.getAttribute('data-tv-value');" +
    "var cur=pr==='mode'?m2:(pr==='family'?f3:null);" +
    "if(cur!=null&&want!=null){var nx=String(cur===want);" +
    "if(n0.getAttribute('aria-pressed')!==nx){n0.setAttribute('aria-pressed',nx);}}" +
    "continue;" +
    "}" +
    // A `<select>`: assigning `value` fires no `change`, so this cannot feed
    // back into the delegated listener. Only an option the element actually
    // offers is selected — a control built from a subset of the registry would
    // otherwise be set to `""`, which looks broken rather than out of scope.
    "var se=n0.getAttribute('data-tv-select');" +
    "if(se){" +
    "var want2=se==='family'?f3:(se==='mode'?m2:null);" +
    "if(want2!=null&&n0.value!==want2){" +
    "for(var o=0;o<n0.options.length;o++){if(n0.options[o].value===want2){n0.value=want2;break;}}" +
    "}}" +
    "}}catch(e4){}};" +
    // One observer per document. This script is re-executed on every client
    // navigation, and without the guard each navigation would attach another
    // observer over the same `<html>`, so a single DOM change would run the
    // patch N times. The first observer stays valid: it reads the live
    // attributes on every call, not the values it was created with.
    //
    // The handle is kept rather than a boolean so a test harness — or a host
    // that tears its document down — can `disconnect()` it. An observer left
    // attached fires while the document is being replaced, and its writes then
    // race whatever is removing those nodes.
    "try{__tvPatch();" +
    "if(window.MutationObserver&&el&&!window.__THEMVORA_READOUT_OBSERVER__){" +
    "window.__THEMVORA_READOUT_OBSERVER__=" +
    "new MutationObserver(function(){__tvPatch();});" +
    "window.__THEMVORA_READOUT_OBSERVER__.observe(el,{childList:true,subtree:true});" +
    "}}catch(e5){}" +
    // Apply the resolved theme's variables, then clear any inline variable the
    // theme does not define. The SSR shell only knows the default theme, so it
    // may have written a group the persisted theme omits (a `code` group, say);
    // those must be removed here, before first paint, or they shadow the CSS
    // fallback and the page keeps the default theme's values.
    "if(vars){for(var p in vars){el.style.setProperty(p,vars[p]);}" +
    "for(var a=0;a<__all.length;a++){var an=__all[a];if(!(an in vars)){el.style.removeProperty(an);}}}";

  return "(function(){try{" + read + app + "}catch(e){}})()";
}
