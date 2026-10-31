import {
  createThemeRuntime,
  resolveRuntimeOptions,
  getBuiltInThemes,
  type CSSVariablesOptions,
  type DOMBindingOptions,
  type ThemeConfigurationUpdate,
  type ThemeDefinition,
  type ThemeIdentifier,
  type ThemeMode,
  type ThemeRuntime,
  type ThemeScheduleOptions,
  type ThemeTransitionOptions,
  type ThemeOverride,
} from "@themvora/core";
import { setProviderRuntime } from "./utils";
import { CustomElementBase } from "./custom-element-base";
import { emitInvalidAttributeDiagnostic } from "./diagnostics";
import { THEME_READY_EVENT, THEMES_CHANGE_EVENT } from "./events";

const TAG = "themvora-provider";

/**
 * Configuration for the `<themvora-provider>` custom element, parsed from its
 * attributes.
 */
export interface ThemvoraProviderProps<
  T extends ThemeDefinition = ThemeDefinition,
> {
  /**
   * Theme definitions, parsed from the `themes` attribute.
   *
   * The attribute accepts either syntax:
   * - a space- or comma-separated list of **theme names** already registered
   *   in the canonical catalog — `themes="light dark plum-dark"`;
   * - a JSON array of full theme definitions — `themes='[{"name":"brand",…}]'`.
   *
   * Names are resolved against the built-in catalog plus any theme already
   * registered on the live runtime; an unknown name is reported and skipped.
   * A list that resolves nothing is reported and the built-in set is used.
   */
  themes?: readonly ThemeDefinition[];
  /**
   * The default theme. Parsed from the `default-theme` attribute.
   *
   * Accepts a supplied theme **name** (`"cocoa-light"`) or a **family**
   * (`"cocoa"`); a family resolves to the variant for the mode in effect.
   *
   * @remarks
   * The attribute is a string, so a custom element cannot infer a literal union
   * from `themes` the way a typed framework prop can. Type a JSX/TSX wrapper
   * against `ThemvoraProviderProps<typeof themes[number]>` when you want the
   * completion list.
   */
  defaultTheme?: ThemeIdentifier<T>;
  /**
   * Mode used when no selection is persisted. Parsed from the `initial-mode`
   * attribute (`"light" | "dark" | "system"`).
   *
   * Optional: both the runtime and the pre-paint script derive the same fallback
   * mode from `default-theme` by default. Set it only to pin a mode the script
   * would not derive — e.g. `"system"` to follow `prefers-color-scheme` — and
   * give `themvoraVitePlugin` the same `initialMode`.
   */
  initialMode?: ThemeMode;
  /**
   * Family used when no selection is persisted. Parsed from the
   * `initial-family` attribute. Pair it with `initialMode` for the same
   * reason. A variant name is accepted and normalised to its family.
   */
  initialFamily?: ThemeIdentifier<T>;
  /**
   * Sunrise/sunset scheduling options. Parsed from the `scheduled` attribute
   * (JSON).
   */
  scheduled?: ThemeScheduleOptions<ThemeDefinition>;
  /**
   * Transition configuration. Parsed from the `transition` attribute (JSON).
   */
  transition?: boolean | ThemeTransitionOptions;
}

/**
 * Custom element `<themvora-provider>` that owns a Themvora runtime and
 * applies the active theme to the document.
 *
 * Framework-free (vanilla JS). Creates and destroys its runtime across its
 * lifecycle, applies DOM/CSS variable bindings, and dispatches a bubbling
 * `theme-ready` event once initialized. Observes the `themes`,
 * `default-theme`, `initial-mode`, `initial-family`, `scheduled`, and
 * `transition` attributes.
 *
 * @remarks
 * **Attributes.** All six are observed and applied to the live runtime.
 *
 * - `themes` — the catalog. Either space-separated registered identifiers
 *   (`"light dark plum-light"`) or a JSON array of full theme definitions
 *   (`'[{"name":"brand","tokens":{…}}]'`). An unknown identifier is reported
 *   and skipped; an empty or unusable list falls back to the neutral
 *   light/dark pair (`TV_THEME_NEUTRAL_FALLBACK`).
 * - `default-theme` — theme name used when nothing is persisted. Supplies both
 *   the fallback theme's family and its mode; an unknown name resolves to the
 *   catalog's first theme.
 * - `initial-mode` — `"light"`, `"dark"` or `"system"` (case-insensitive).
 *   Overrides the mode `default-theme` implies. An invalid value is reported
 *   (`TV_CONFIG_OPTION_INVALID`) and ignored.
 * - `initial-family` — family used when nothing is persisted. Overrides the
 *   family `default-theme` implies; an unregistered one is reported
 *   (`TV_THEME_FAMILY_UNKNOWN`) and normalised.
 * - `transition` — `true`, `false`, or JSON
 *   (`'{"enabled":true,"duration":250,"easing":"ease-in-out"}'`). Changing it
 *   reconfigures the live bindings; removing it returns to no transition.
 * - `scheduled` — JSON sunrise/sunset options
 *   (`'{"latitude":27.7,"longitude":85.3}'`). Removing it tears the schedule
 *   down.
 *
 * **Properties.** None of its own beyond the standard `HTMLElement` surface.
 * The runtime is reached with {@link getProviderRuntime} (or
 * {@link useThemeRuntime} for the first provider on the page).
 *
 * **Events.** `theme-ready` (bubbles, composed) once the runtime exists and the
 * first theme is applied; `themes-change` (bubbles, composed) on a microtask
 * after the catalog changes, with `detail.themes` holding the new names.
 *
 * **Slots.** Its children are ordinary light-DOM content — the consumer's
 * markup and the other `<themvora-*>` elements. The element renders no wrapper
 * and styles nothing of its own.
 *
 * When an observed attribute changes after initialization, the change is
 * applied to the live runtime through the shared `configure()` contract — the
 * runtime is never destroyed and recreated, so history, persistence and the
 * current selection survive, and the transition/schedule subsystems are
 * reconciled in place.
 *
 * **Removing an attribute never resets the runtime.** A removed `themes`,
 * `default-theme`, `initial-mode` or `initial-family` stops contributing to
 * the configuration; the live catalog and selection stay as they are, and the
 * removal takes effect on the next mount (where `resolveRuntimeOptions` runs
 * again). `transition` and `scheduled` are the exception: removing them turns
 * the subsystem off, because "off" is expressible for them.
 *
 * The element never writes its own observed attributes, so an attribute
 * change always originates from the consumer and cannot feed back into
 * itself. The `configuring` guard additionally covers a consumer that
 * reflects state into the attribute during `themes-change`.
 *
 * @example
 * ```html
 * <themvora-provider themes="light dark plum-dark" default-theme="light">
 *   ...
 * </themvora-provider>
 * ```
 *
 * @see {@link ThemvoraProviderProps}
 * @see {@link defineCustomElements}
 * @see {@link ThemvoraScope}
 * @see {@link ThemvoraToggle}
 * @see {@link ThemvoraSelect}
 */
export class ThemvoraProvider extends CustomElementBase {
  static observedAttributes = [
    "themes",
    "default-theme",
    "theme-override",
    "initial-mode",
    "initial-family",
    "scheduled",
    "transition",
  ];

  private runtime: ThemeRuntime<ThemeDefinition> | null = null;

  /** Guard against re-entering attribute handling from inside `configure()`. */
  private configuring = false;

  /** Releases the runtime's catalog subscription. */
  private unsubscribeThemes: (() => void) | null = null;

  /** The catalog to announce on the next microtask, if one is scheduled. */
  private pendingCatalog: readonly string[] | null = null;
  private catalogDispatchScheduled = false;

  // Parsed snapshot of the attributes. `undefined` means "not supplied".
  private parsedThemes: readonly ThemeDefinition[] | undefined;
  private parsedDefaultTheme: string | undefined;
  private parsedThemeOverride: ThemeOverride<string> | undefined;
  /** Whether `theme-override` was ever set, so its removal is reported. */
  private hadThemeOverride = false;
  private parsedInitialMode: ThemeMode | undefined;
  private parsedInitialFamily: string | undefined;
  private parsedScheduled: ThemeScheduleOptions<ThemeDefinition> | undefined;
  private parsedTransition: boolean | ThemeTransitionOptions | undefined;

  /** Lifecycle hook: parses attributes and initializes the runtime. */
  connectedCallback() {
    // `connectedCallback` runs again after a remove/re-add. The previous
    // runtime was destroyed in `disconnectedCallback`, so this is a real
    // re-initialization, not a duplicate.
    if (this.runtime) return;
    this.parseAttributes();
    this.initRuntime();
  }

  /** Lifecycle hook: destroys the runtime. */
  disconnectedCallback() {
    this.destroyRuntime();
  }

  /** Lifecycle hook: re-resolves the runtime when an observed attribute changes. */
  attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    _newValue: string | null,
  ) {
    // Attributes are applied before `connectedCallback`, and `configure()` can
    // dispatch `themes-change`; neither may re-enter this handler.
    if (!this.runtime || this.configuring) return;

    this.parseAttributes();

    // Every observed attribute is applied to the *live* runtime: `configure`
    // reconciles the catalog/selection, the transition and the schedule in
    // place, so an attribute change never destroys the runtime (which would
    // discard history, the current selection and every other consumer of it).
    //
    // Only the attribute that changed is forwarded. Forwarding the whole
    // snapshot would reset a catalog registered imperatively (`runtime.use()`)
    // on an unrelated `transition` edit, and forwarding an absent value would
    // re-resolve a selection the consumer never asked to change.
    const update: ThemeConfigurationUpdate<ThemeDefinition> = {};
    if (name === "themes") {
      // A removed or unusable `themes` attribute contributes nothing: the
      // live catalog is left alone (see the class remarks).
      if (this.parsedThemes) update.themes = this.parsedThemes;
    } else if (name === "default-theme") {
      if (this.parsedDefaultTheme !== undefined) {
        update.defaultTheme = this.parsedDefaultTheme;
      }
    } else if (name === "theme-override") {
      // Removing the attribute removes the override: the runtime restores the
      // selection it was layered over. Reported as an explicit `undefined`, which
      // `configure()` reads as "this input is gone".
      if (this.parsedThemeOverride !== undefined) this.hadThemeOverride = true;
      if (this.hadThemeOverride) update.themeOverride = this.parsedThemeOverride;
    } else if (name === "initial-mode") {
      if (this.parsedInitialMode !== undefined) {
        update.initialMode = this.parsedInitialMode;
      }
    } else if (name === "initial-family") {
      if (this.parsedInitialFamily !== undefined) {
        update.initialFamily = this.parsedInitialFamily;
      }
    } else if (name === "transition") {
      // Presence-based: a removed attribute forwards `undefined`, which the
      // runtime reads as "no transition configured" and pushes into the live
      // bindings.
      update.transition = this.parsedTransition;
    } else if (name === "scheduled") {
      // Presence-based: `false` is the explicit "tear the schedule down".
      update.scheduled = this.parsedScheduled ?? false;
    }

    this.configuring = true;
    try {
      this.runtime.configure(update);
    } finally {
      this.configuring = false;
    }
  }

  /**
   * Mirrors the runtime's catalog signal onto the DOM.
   *
   * Subscribed once per runtime, so it also covers `runtime.use(pack)` and
   * `runtime.restore()` — not just attribute-driven changes. A catalog change
   * can leave the active theme untouched, so the store subscription cannot
   * report it; consumers that resolve themes themselves need the change itself.
   *
   * The dispatch is deferred to a microtask on purpose. The registry
   * notification fires *inside* `configure()`, and a consumer handling the
   * event may legitimately write back to `themes`; dispatching synchronously
   * would re-enter `attributeChangedCallback` while this element is still
   * configuring and the write would be dropped by the re-entrancy guard.
   * Deferring also coalesces several changes made in one task into a single
   * event carrying the final catalog, which is what a listener wants.
   */
  private subscribeThemes(): void {
    const runtime = this.runtime;
    if (!runtime) return;

    this.unsubscribeThemes = runtime.registry.subscribe(() => {
      this.pendingCatalog = runtime.themes.map((theme) => String(theme.name));
      if (this.catalogDispatchScheduled) return;
      this.catalogDispatchScheduled = true;
      queueMicrotask(() => {
        this.catalogDispatchScheduled = false;
        const catalog = this.pendingCatalog;
        this.pendingCatalog = null;
        if (!catalog || !this.isConnected) return;
        this.dispatchEvent(
          new CustomEvent(THEMES_CHANGE_EVENT, {
            bubbles: true,
            composed: true,
            detail: { themes: catalog },
          }),
        );
      });
    });
  }

  /**
   * The catalog a name is resolved against.
   *
   * Deliberately a *superset* of the active catalog — the built-in set plus
   * everything the runtime knows about — so that restricting the catalog with
   * one attribute edit does not make the other names unresolvable on the next
   * one (`themes="light"` followed by `themes="light dark"` must still find
   * `dark`). Themes registered imperatively through `runtime.use()` are
   * included, so an attribute edit cannot silently drop them.
   *
   * Before the runtime exists, the same union is read from
   * `resolveRuntimeOptions()`, which is where a build-integration's
   * transported catalog would come from.
   */
  private themePool(): readonly ThemeDefinition[] {
    const registered = this.runtime
      ? this.runtime.themes
      : ((resolveRuntimeOptions<ThemeDefinition>({}).themes ??
          getBuiltInThemes()) as readonly ThemeDefinition[]);

    const byName = new Map<string, ThemeDefinition>();
    for (const theme of getBuiltInThemes()) {
      byName.set(String(theme.name), theme);
    }
    for (const theme of registered) {
      byName.set(String(theme.name), theme);
    }
    return [...byName.values()];
  }

  private parseAttributes() {
    this.parsedThemes = this.parseThemes();
    this.parsedDefaultTheme = this.parseDefaultTheme(this.parsedThemes);
    this.parsedThemeOverride = this.parseThemeOverride();
    this.parsedInitialMode = this.parseInitialMode();
    this.parsedInitialFamily = this.parseInitialFamily();
    this.parsedScheduled = this.parseJsonOption<ThemeScheduleOptions<ThemeDefinition>>(
      "scheduled",
      (value) => typeof value === "object" && value !== null && !Array.isArray(value),
      "a JSON object, e.g. '{\"latitude\":27.7,\"longitude\":85.3}'",
    );
    this.parsedTransition = this.parseJsonOption<boolean | ThemeTransitionOptions>(
      "transition",
      (value) => typeof value === "boolean" || (typeof value === "object" && value !== null && !Array.isArray(value)),
      "a JSON boolean or object, e.g. 'true' or '{\"enabled\":true,\"duration\":250}'",
    );
  }

  /**
   * Parses the `theme-override` attribute.
   *
   * Two syntaxes, matching the prop's two forms: a bare theme name
   * (`theme-override="mint-dark"`) or a JSON family/mode request
   * (`theme-override='{"family":"mint","mode":"dark"}'`). A JSON object that is
   * not a valid request is reported and ignored, like every other attribute.
   *
   * @returns The override, or `undefined` when the attribute is absent or unusable.
   */
  private parseThemeOverride(): ThemeOverride<string> | undefined {
    const raw = this.getAttribute("theme-override");
    if (raw === null) return undefined;

    const value = raw.trim();
    if (value.length === 0) {
      emitInvalidAttributeDiagnostic(
        this.localName,
        "theme-override",
        raw,
        "a theme name, or a JSON object like '{\"family\":\"mint\",\"mode\":\"dark\"}'",
        "the attribute was ignored",
      );
      return undefined;
    }

    if (!value.startsWith("{")) return value;

    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const family = typeof parsed.family === "string" ? parsed.family : undefined;
      const mode = parsed.mode;
      const modeValid =
        mode === undefined || mode === "light" || mode === "dark" || mode === "system";
      if (modeValid && (family !== undefined || mode !== undefined)) {
        return {
          ...(family !== undefined ? { family } : {}),
          ...(mode !== undefined ? { mode: mode as ThemeMode } : {}),
        };
      }
    } catch {
      // Falls through to the diagnostic below.
    }

    emitInvalidAttributeDiagnostic(
      this.localName,
      "theme-override",
      raw,
      "a theme name, or a JSON object like '{\"family\":\"mint\",\"mode\":\"dark\"}'",
      "the attribute was ignored",
    );
    return undefined;
  }

  /**
   * Parses the `themes` attribute in either supported syntax.
   *
   * @returns The resolved catalog, or `undefined` when the attribute is absent
   *   or unusable (the caller then leaves the live catalog alone).
   */
  private parseThemes(): readonly ThemeDefinition[] | undefined {
    const raw = this.getAttribute("themes");
    if (raw === null) return undefined;

    const value = raw.trim();
    if (value.length === 0) {
      emitInvalidAttributeDiagnostic(
        this.localName,
        "themes",
        raw,
        "a space-separated list of theme names, or a JSON array of theme definitions",
        "the attribute was ignored",
      );
      return undefined;
    }

    // JSON array syntax: a full theme definition list, unchanged from the
    // original contract.
    if (value.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(value);
        if (
          Array.isArray(parsed) &&
          parsed.every(
            (theme) =>
              typeof theme === "object" &&
              theme !== null &&
              typeof (theme as { name?: unknown }).name === "string",
          )
        ) {
          return parsed as readonly ThemeDefinition[];
        }
      } catch {
        // Reported below, together with the identifier syntax it fell through to.
      }
      emitInvalidAttributeDiagnostic(
        this.localName,
        "themes",
        raw,
        "a JSON array of theme definitions, each with a string `name`",
        "the attribute was ignored",
      );
      return undefined;
    }

    // Identifier syntax: resolve each name against the canonical catalog. No
    // theme is ever constructed here — a bare name is a lookup, not a
    // definition, so an unknown name can only be reported and skipped.
    const pool = this.themePool();
    const byName = new Map(pool.map((theme) => [String(theme.name), theme]));
    const identifiers = value.split(/[\s,]+/).filter((id) => id.length > 0);

    const resolved: ThemeDefinition[] = [];
    const unknown: string[] = [];
    const seen = new Set<string>();
    for (const identifier of identifiers) {
      const theme = byName.get(identifier);
      if (!theme) {
        unknown.push(identifier);
        continue;
      }
      if (seen.has(identifier)) continue;
      seen.add(identifier);
      resolved.push(theme);
    }

    if (unknown.length > 0) {
      emitInvalidAttributeDiagnostic(
        this.localName,
        "themes",
        unknown,
        `registered theme names (known: ${pool
          .slice(0, 6)
          .map((theme) => String(theme.name))
          .join(", ")}, …)`,
        unknown.length === identifiers.length
          ? "none of the listed names matched a registered theme, so the attribute was ignored"
          : `the unknown name${unknown.length === 1 ? " was" : "s were"} skipped`,
      );
    }

    return resolved.length > 0 ? resolved : undefined;
  }

  /**
   * Parses and validates `default-theme` against the effective catalog.
   *
   * An unknown name is reported here rather than left to the runtime, which
   * falls back to the catalog's first theme without a word. Ignoring the
   * attribute produces that same fallback, so the diagnosis costs nothing and
   * the outcome is unchanged.
   */
  private parseDefaultTheme(
    catalog: readonly ThemeDefinition[] | undefined,
  ): string | undefined {
    const raw = this.getAttribute("default-theme");
    if (raw === null) return undefined;

    const value = raw.trim();
    if (value.length === 0) {
      emitInvalidAttributeDiagnostic(
        this.localName,
        "default-theme",
        raw,
        "the name of a registered theme, e.g. \"light\"",
        "the attribute was ignored",
      );
      return undefined;
    }

    const pool = catalog ?? this.themePool();
    if (!pool.some((theme) => String(theme.name) === value)) {
      emitInvalidAttributeDiagnostic(
        this.localName,
        "default-theme",
        value,
        "the name of a registered theme",
        "the attribute was ignored and the runtime kept its own default",
      );
      return undefined;
    }

    return value;
  }

  private parseInitialMode(): ThemeMode | undefined {
    const raw = this.getAttribute("initial-mode");
    if (raw === null) return undefined;

    const value = raw.trim().toLowerCase();
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }

    emitInvalidAttributeDiagnostic(
      this.localName,
      "initial-mode",
      raw,
      '"light", "dark" or "system"',
      "the attribute was ignored and the mode was left to the runtime",
    );
    return undefined;
  }

  private parseInitialFamily(): string | undefined {
    const raw = this.getAttribute("initial-family");
    if (raw === null) return undefined;

    const value = raw.trim();
    if (value.length === 0) {
      emitInvalidAttributeDiagnostic(
        this.localName,
        "initial-family",
        raw,
        "a theme family name, e.g. \"plum\"",
        "the attribute was ignored",
      );
      return undefined;
    }

    // Family validity is the runtime's call: `configure()` already reports an
    // unknown family through `TV_THEME_FAMILY_UNKNOWN` when it re-resolves.
    return value;
  }

  private parseJsonOption<T>(
    attribute: string,
    isValid: (value: unknown) => boolean,
    expected: string,
  ): T | undefined {
    const raw = this.getAttribute(attribute);
    if (raw === null) return undefined;

    try {
      const parsed: unknown = JSON.parse(raw);
      if (isValid(parsed)) return parsed as T;
    } catch {
      // Fall through to the diagnostic.
    }

    emitInvalidAttributeDiagnostic(
      this.localName,
      attribute,
      raw,
      expected,
      "the attribute was ignored and the previous setting was kept",
    );
    return undefined;
  }

  private resolveTransition(): ThemeTransitionOptions | undefined {
    if (this.parsedTransition === undefined) return undefined;
    if (typeof this.parsedTransition === "object") return this.parsedTransition;
    if (this.parsedTransition === true) return {};
    return { enabled: false };
  }

  private initRuntime() {
    const resolvedTransition = this.resolveTransition();
    // `parsedThemes` defaults to `undefined` when the attribute is absent, so
    // the distinction between "the element asked for these" and "nothing was
    // set" survives: without it the built-in set would always shadow the
    // catalog a build integration transported.
    const explicit: Record<string, unknown> = {
      ...(this.parsedThemes ? { themes: this.parsedThemes } : {}),
      ...(this.parsedDefaultTheme
        ? { defaultTheme: this.parsedDefaultTheme }
        : {}),
      // Mirror the pre-paint bootstrap's mode/family. Without these the runtime
      // resolves the mode from `defaultTheme` alone and overwrites the theme
      // the script already painted from `prefers-color-scheme`.
      ...(this.parsedInitialMode !== undefined
        ? { initialMode: this.parsedInitialMode }
        : {}),
      ...(this.parsedInitialFamily !== undefined
        ? { initialFamily: this.parsedInitialFamily }
        : {}),
      ...(this.parsedScheduled ? { scheduled: this.parsedScheduled } : {}),
      ...(this.parsedThemeOverride !== undefined
        ? { themeOverride: this.parsedThemeOverride }
        : {}),
    };
    if (this.parsedThemeOverride !== undefined) this.hadThemeOverride = true;

    this.runtime = createThemeRuntime({
      ...resolveRuntimeOptions(explicit),
      ...(resolvedTransition !== undefined
        ? { transition: resolvedTransition }
        : {}),
      // Empty binding options (not explicit `transition` values): the runtime
      // merges its top-level `transition` into both bindings and, because the
      // caller did not supply an explicit per-binding transition, owns
      // reconciling them on a live `transition` change.
      dom: {} as DOMBindingOptions,
      cssVariables: {} as CSSVariablesOptions,
    });

    setProviderRuntime(this, this.runtime);
    this.subscribeThemes();

    this.dispatchEvent(
      new CustomEvent(THEME_READY_EVENT, {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private destroyRuntime() {
    this.unsubscribeThemes?.();
    this.unsubscribeThemes = null;
    this.runtime?.destroy();
    this.runtime = null;
  }

  static define(tag = TAG) {
    // SSR-safe: customElements only exists in the browser. Framework wrappers
    // (Vue, Solid, Angular, Astro, …) call define() from both server and client
    // environments, so this must be a no-op on the server.
    if (typeof customElements === "undefined") return;
    if (!customElements.get(tag)) {
      customElements.define(tag, ThemvoraProvider);
    }
  }
}
