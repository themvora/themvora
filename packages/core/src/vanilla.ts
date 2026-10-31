/**
 * Themvora vanilla runtime — a thin imperative wrapper over the core
 * runtime for plain-JavaScript applications.
 *
 * Imported from the `@themvora/core/vanilla` subpath. Avoids React
 * dependency entirely and exposes the same runtime, DOM, CSS-variable, and
 * transition machinery through a `Themvora` facade.
 *
 * @packageDocumentation
 */
import type { ThemeDefinition, ThemeMode } from "./model/theme";
import type { ThemeTokens } from "./model/tokens";
import { getBuiltInThemes } from "./built-in-themes";
import { resolveRuntimeOptions } from "./app-config";
import { createThemeRuntime, type ThemeRuntime, type ScheduledThemeOptions, type ThemeRuntimeOptions } from "./runtime";
import { createDOMBinding } from "./adapters/dom";
import { createCSSVariablesBinding } from "./adapters/css-variables";
import { themeToCSSVariables } from "./css";
import type { ThemePack, ThemeRegistry } from "./registry";
import type { ThemeSchedule } from "./adapters/schedule";
import type { ThemeTransitionOptions } from "./transition";
import { normalizeProvidedThemes, type ProvidedThemeFamily } from "./provided-themes";
import type { ThemeOverride } from "./theme-override";

export type { ThemeDefinition, ThemeMode } from "./model/theme";
export type { ThemeTokens } from "./model/tokens";
export { generateTheme } from "./generate-theme";
export type { GenerateThemeOptions, GeneratedThemePair } from "./generate-theme";
export type { ThemePack, ThemeRegistry } from "./registry";
export type {
  ProvidedThemeFamily,
  ProvidedThemeProvenance,
  ProvidedThemeVariant,
} from "./provided-themes";
export type { ThemeOverride, ThemeOverrideSelection } from "./theme-override";

/**
 * Options for creating a {@link Themvora} instance.
 */
export interface ThemvoraOptions {
  /** Custom set of themes. Defaults to all built-in themes. */
  themes?: readonly ThemeDefinition[];
  /** Default theme name when no persisted selection exists. */
  defaultTheme?: string;
  /** Initial mode: `"light"`, `"dark"`, or `"system"`. Ignored if a theme was previously persisted in localStorage. */
  initialMode?: ThemeMode;
  /** Initial family. Ignored if a theme was previously persisted in localStorage. */
  initialFamily?: string;
  /** Explicit theme override applied over any persisted selection. */
  themeOverride?: ThemeOverride<string>;
  /** Sunrise/sunset solar scheduling config. Automatically applies light/dark themes at sunrise/sunset. */
  scheduled?: false | ScheduledThemeOptions<ThemeDefinition>;
  /** Target element for CSS custom properties and `data-theme` attributes. Defaults to `document.documentElement`. */
  target?: HTMLElement | Document;
  /** Theme transition config. `false` disables transitions, `true` enables defaults, an object customizes the transition. */
  transition?: boolean | import("./transition").ThemeTransitionOptions;
}

type EventMap = {
  themeChange: ThemeDefinition;
  modeChange: ThemeMode;
  familyChange: string;
};

type Listener<T = unknown> = (data: T) => void;

/**
 * Framework-free drop-in theming with `@themvora/core`.
 *
 * ```js
 * import { Themvora } from "@themvora/core/vanilla";
 *
 * const kit = new Themvora();
 * kit.setMode("dark");
 * kit.setFamily("plum");
 * kit.on("themeChange", (theme) => console.log(theme.name));
 * ```
 */
export class Themvora {
  private _runtime: ThemeRuntime<ThemeDefinition> | null = null;
  private events: Map<string, Set<Listener>> = new Map();
  private domBinding: ReturnType<typeof createDOMBinding> | null = null;
  private cssBinding: ReturnType<typeof createCSSVariablesBinding> | null = null;

  /**
   * @param options - Configuration options. Persisted state in localStorage
   *                  takes precedence over `initialMode`/`initialFamily`.
   */
  constructor(options: ThemvoraOptions = {}) {
    // A build integration transports the application's `theme.config.ts` to the
    // runtime, so a `Themvora` constructed with no theme data still has a
    // registry. Explicit options win, which keeps a local override possible.
    // `target` is a DOM concern, not a runtime option, so it is not merged.
    const { target: _target, ...runtimeInput } = options;
    const resolved = resolveRuntimeOptions(
      runtimeInput as Partial<ThemeRuntimeOptions<ThemeDefinition>>,
    );
    const themes: readonly ThemeDefinition[] = resolved.themes!;

    const transitionOption = options.transition;
    const resolvedTransition: boolean | import("./transition").ThemeTransitionOptions | undefined =
      transitionOption === undefined
        ? undefined
        : typeof transitionOption === "object"
          ? transitionOption
          : true;

    this._runtime = createThemeRuntime({
      ...resolved,
      ...(options.scheduled !== undefined ? { scheduled: options.scheduled } : {}),
      ...(resolvedTransition !== undefined ? { transition: resolvedTransition } : {}),
      dom: false,
      cssVariables: false,
    } as any);

    if (typeof document !== "undefined") {
      const target = options.target ?? document.documentElement;
      this.domBinding = createDOMBinding(this._runtime.store, {
        target: target as HTMLElement,
        // Mirror the selection onto `data-theme-selection-mode` /
        // `data-theme-selection-family`, the same as the runtime's own binding
        // does. The runtime is created with `dom: false` here so that this class
        // owns the binding, and without this the selection attributes would be
        // the ones the pre-paint bootstrap wrote and never updated again.
        selection: this._runtime.selection,
        ...(resolvedTransition !== undefined ? { transition: resolvedTransition as any } : {}),
      } as any);
      this.cssBinding = createCSSVariablesBinding(this._runtime.store, {
        target: target as HTMLElement,
        ...(resolvedTransition !== undefined ? { transition: resolvedTransition as any } : {}),
      } as any);
    }

    this._runtime.store.subscribe((theme) => {
      this.emit("themeChange", theme);
      this.emit("modeChange", this._runtime!.selection.getMode());
      this.emit("familyChange", this._runtime!.selection.getFamily());
    });

    this._runtime.selection.subscribe((selection) => {
      this.emit("modeChange", selection.mode);
      this.emit("familyChange", selection.family);
    });
  }

  /** Create a Themvora instance. Shorthand for `new Themvora(options)`. */
  static init(options: ThemvoraOptions = {}): Themvora {
    return new Themvora(options);
  }

  /** Access the underlying runtime for advanced use (history, direct store access). */
  get runtime(): ThemeRuntime<ThemeDefinition> {
    return this._runtime!;
  }

  /** Access the theme schedule controller if configured. */
  get schedule(): ThemeSchedule | null {
    return this._runtime!.schedule;
  }

  /** Access the theme registry for dynamic theme registration. */
  get registry(): ThemeRegistry<ThemeDefinition> {
    return this._runtime!.registry;
  }

  /** The currently active theme definition (includes resolved tokens). */
  get theme(): ThemeDefinition {
    return this._runtime!.store.get();
  }

  /** The current mode: `"light"`, `"dark"`, or `"system"`. */
  get mode(): ThemeMode {
    return this._runtime!.selection.getMode();
  }

  /** The current theme family name (e.g. `"default"`, `"plum"`, `"mint"`). */
  get family(): string {
    return this._runtime!.selection.getFamily();
  }

  /** All registered theme definitions. */
  get themes(): readonly ThemeDefinition[] {
    return this._runtime!.themes;
  }

  /**
   * The themes this instance was given, grouped by family.
   *
   * Derived on read from the live registry (never from a catalog elsewhere), so
   * a theme registered later appears here. Use `useProvidedThemes()` in a
   * framework integration for a reactive view.
   *
   * @see {@link normalizeProvidedThemes}
   */
  get providedThemes(): readonly ProvidedThemeFamily[] {
    return normalizeProvidedThemes(this._runtime!.themes);
  }

  /**
   * Apply an explicit theme override.
   *
   * Applies once, outranks a persisted selection, and does not write to storage.
   * Passing the same value again is a no-op, so a render loop cannot pin the
   * theme.
   *
   * @param override A theme name, a `{ family, mode }` request, or `undefined`.
   */
  setThemeOverride(override: ThemeOverride<string> | undefined): void {
    this._runtime!.configure({ themeOverride: override } as never);
  }

  /** Switch to a specific mode. Persisted to localStorage automatically. */
  setMode(mode: ThemeMode): void {
    this._runtime!.selection.setMode(mode);
  }

  /** Switch to a theme family. Persisted to localStorage automatically. */
  setFamily(family: string): void {
    this._runtime!.selection.setFamily(family);
  }

  /** Toggle between light and dark mode (ignores `"system"`). */
  toggleTheme(): void {
    this._runtime!.selection.toggleTheme();
  }

  /** Merge partial tokens into the current theme at runtime. */
  update(tokens: Partial<ThemeTokens>): void {
    this._runtime!.update(tokens);
  }

  /** Install a theme pack (collection of themes). */
  use(pack: ThemePack<ThemeDefinition>): void {
    this._runtime!.use(pack);
  }

  /** Convert a theme (or the current theme) into a flat CSS variables map. */
  toCSSVariables(theme?: ThemeDefinition): Record<string, string> {
    return themeToCSSVariables(theme ?? this.theme);
  }

  /**
   * Subscribe to theme events.
   *
   * @param event - Event name: `"themeChange"`, `"modeChange"`, or `"familyChange"`.
   * @param listener - Callback receiving the event payload.
   * @returns An unsubscribe function.
   */
  on<K extends keyof EventMap>(
    event: K,
    listener: Listener<EventMap[K]>,
  ): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener as Listener);
    return () => this.off(event, listener as Listener);
  }

  /** Remove a previously registered event listener. */
  off<K extends keyof EventMap>(
    event: K,
    listener: Listener<EventMap[K]>,
  ): void {
    this.events.get(event)?.delete(listener as Listener);
  }

  private emit<K extends keyof EventMap>(
    event: K,
    data: EventMap[K],
  ): void {
    this.events.get(event)?.forEach((fn) => fn(data));
  }

  /** Clean up DOM bindings, event listeners, and persistence subscriptions. */
  destroy(): void {
    this.domBinding?.destroy();
    this.cssBinding?.destroy();
    this._runtime?.destroy();
    this._runtime = null;
    this.events.clear();
  }
}
