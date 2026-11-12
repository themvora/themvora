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
import { getThemeMode } from "./model";
import type { ThemeTokens } from "./model/tokens";
import { resolveRuntimeOptions } from "./app-config";
import { createThemeRuntime, type ThemeRuntime, type ScheduledThemeOptions, type ThemeRuntimeOptions } from "./runtime";
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
  /**
   * Initial mode: `"light"`, `"dark"`, or `"system"`. Ignored when a selection
   * is persisted in storage, or when the pre-paint bootstrap already applied
   * one — that state is newer than this option by definition.
   */
  initialMode?: ThemeMode;
  /** Initial family. Ignored under the same conditions as `initialMode`. */
  initialFamily?: string;
  /** Explicit theme override applied over any persisted selection. */
  themeOverride?: ThemeOverride<string>;
  /** Sunrise/sunset solar scheduling config. Automatically applies light/dark themes at sunrise/sunset. */
  scheduled?: false | ScheduledThemeOptions<ThemeDefinition>;
  /** Target element for CSS custom properties and `data-theme` attributes. Defaults to `document.documentElement`. */
  target?: HTMLElement | Document;
  /** Theme transition config. `false` disables transitions, `true` enables defaults, an object customizes the transition. */
  transition?: boolean | ThemeTransitionOptions;
  /**
   * The `localStorage` key the selection is persisted under.
   *
   * @defaultValue `"theme-selection"`
   *
   * @remarks
   * Must match the key the pre-paint bootstrap reads. Both read the same value
   * from the shared configuration, so in practice this is only passed when the
   * app deliberately uses a non-default key and configures the bootstrap to
   * match — a mismatch writes to one key and restores from another, which looks
   * exactly like persistence being broken.
   */
  storageKey?: string;
  /**
   * CSS custom property prefix.
   *
   * @defaultValue `"theme-"`
   *
   * @remarks
   * Must match the prefix the pre-paint bootstrap emitted, for the same reason
   * as {@link storageKey}: the stylesheet fallback and the runtime's inline
   * variables have to name the same properties.
   */
  prefix?: string;
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

  /**
   * The last state this instance published, so an event is emitted once per
   * logical change.
   *
   * @remarks
   * Both the store and the selection controller notify on a mode change, and
   * they notify in a fixed order: the selection first, then the store once the
   * new theme resolves. Emitting from both channels without this snapshot fired
   * `modeChange` twice per click, `familyChange` on a pure mode change, and
   * `themeChange` *after* the mode it belonged to. Comparing against the last
   * published value makes each channel idempotent and the pair ordered.
   */
  private published: {
    theme: ThemeDefinition | null;
    mode: ThemeMode | null;
    family: string | null;
  } = { theme: null, mode: null, family: null };

  /**
   * @param options - Configuration options. A persisted selection, and any
   *                  state the pre-paint bootstrap already applied, take
   *                  precedence over `initialMode`/`initialFamily`.
   */
  constructor(options: ThemvoraOptions = {}) {
    // A build integration transports the application's `theme.config.ts` to the
    // runtime, and the standalone pre-paint asset publishes the same projection
    // on `window.__THEMVORA_CONFIG__`. A `Themvora` constructed with no theme
    // data therefore still has a registry. Explicit options win, which keeps a
    // local override possible.
    //
    // `target`, `storageKey` and `prefix` are binding concerns rather than
    // runtime inputs, so they are handled here instead of being merged.
    const {
      target,
      storageKey,
      prefix,
      transition: transitionOption,
      ...runtimeInput
    } = options;

    const resolved = resolveRuntimeOptions(
      runtimeInput as Partial<ThemeRuntimeOptions<ThemeDefinition>>,
    );

    const transition: ThemeTransitionOptions | undefined =
      transitionOption === undefined
        ? undefined
        : typeof transitionOption === "object"
          ? transitionOption
          : transitionOption
            ? {}
            : { enabled: false };

    // The runtime owns both bindings. It is the only place where they are wired
    // to commit together: with inline variables (the default) the CSS binding
    // applies inside a single `startViewTransition` update callback and drives
    // the DOM binding from `onBeforeSwap`, so `data-theme`, the `dark` class,
    // `color-scheme` and every `--theme-*` variable land in the same frame.
    //
    // Creating the two bindings here instead — as this class used to — gave each
    // its own store subscription, which put the identity attributes in one task
    // and the palette in the next. A paint between them showed the new theme's
    // name over the old theme's colours.
    const bindingTarget =
      target ?? (typeof document !== "undefined" ? document.documentElement : undefined);

    this._runtime = createThemeRuntime({
      ...resolved,
      ...(options.scheduled !== undefined ? { scheduled: options.scheduled } : {}),
      ...(transition !== undefined ? { transition } : {}),
      ...(storageKey !== undefined ? { storageKey } : {}),
      ...(prefix !== undefined ? { prefix } : {}),
      ...(bindingTarget
        ? {
            dom: { target: bindingTarget as HTMLElement },
            cssVariables: {
              target: bindingTarget as HTMLElement,
              // Publish from the commit, not from the store.
              //
              // A View Transition applies its update callback in a *later task*
              // than the store commit, so a subscriber notified from the store
              // runs while `data-theme` and the `--theme-*` variables still
              // describe the previous theme. Rendering a label or a scoped
              // region from that notification put it one frame ahead of the
              // pixels — the "control says dark while the page is light" defect,
              // and the reason a rapid sequence of toggles read as flicker.
              onAfterSwap: () => this.publish(),
            },
          }
        : { dom: false, cssVariables: false }),
    } as ThemeRuntimeOptions<ThemeDefinition>);

    // Seed the snapshot from the state the runtime resolved — which is the
    // state already on the page when the pre-paint bootstrap ran. Seeding
    // before subscribing is what keeps construction silent: a subscriber added
    // to a store that already holds the initial theme must not receive a
    // `themeChange` for it.
    this.published = {
      theme: this._runtime.store.get(),
      mode: this._runtime.selection.getMode(),
      family: this._runtime.selection.getFamily(),
    };

    if (bindingTarget) {
      // `onAfterSwap` above is the primary channel. The selection channel still
      // has to exist for the one case it cannot see: a selection change that
      // resolves to the *same* theme (`"system"` → `"light"` while the OS is
      // already light). Nothing is applied, so nothing commits, yet the choice
      // moved and `mode` must be reported.
      //
      // Deferred to a microtask because the controller notifies selection
      // listeners *before* it commits the new theme. Publishing synchronously
      // there would read the previous theme out of the store.
      this._runtime.selection.subscribe(() => {
        queueMicrotask(() => {
          const runtime = this._runtime;
          if (!runtime) return;
          // A theme change is still in flight: `store` has already moved, but
          // the binding has not applied it yet (a View Transition applies in a
          // later task). `onAfterSwap` will publish — and it will do so only
          // once the document carries the new theme. Publishing here instead
          // would put a label or a scoped region one frame ahead of the page,
          // which is the flicker this class exists to avoid.
          if (runtime.store.get() !== this.published.theme) return;
          this.publish();
        });
      });
    } else {
      // No DOM, so no binding to commit through: fall back to the store.
      this._runtime.store.subscribe(() => this.publish());
      this._runtime.selection.subscribe(() => this.publish());
    }
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

  /**
   * The mode actually applied: `"light"` or `"dark"`, never `"system"`.
   *
   * @remarks
   * Differs from {@link mode} while the selection is `"system"`, and during a
   * sunrise/sunset transition. Read this to render the current appearance;
   * read {@link mode} to render which option the visitor chose.
   */
  get resolvedMode(): "light" | "dark" {
    return getThemeMode(this.theme) === "dark" ? "dark" : "light";
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
   *
   * @remarks
   * One logical change emits at most one event per name, in this order:
   * `modeChange` / `familyChange` for a selection change, then `themeChange`
   * once the new theme has been applied. An operating-system appearance change
   * while the mode is `"system"` emits `themeChange` only — the visitor's
   * selection did not move.
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
    // Copy before iterating: a listener that unsubscribes (or subscribes) while
    // being notified would otherwise mutate the set mid-iteration.
    const listeners = this.events.get(event);
    if (!listeners) return;
    for (const fn of [...listeners]) fn(data);
  }

  /**
   * Publish whatever moved since the last notification.
   *
   * Idempotent, and called from both channels. The theme is compared by
   * identity rather than by name so `update()` — which merges tokens into the
   * active theme and keeps its name — still notifies; the selection fields are
   * compared by value, which is what collapses the commit/selection pair into
   * one emission.
   *
   * Order is the choice first, then the result: a listener that renders on
   * `themeChange` sees a `mode` that already explains it, and a listener that
   * only cares about the choice never has to wait for a theme change.
   */
  private publish(): void {
    const runtime = this._runtime;
    if (!runtime) return;

    const theme = runtime.store.get();
    const mode = runtime.selection.getMode();
    const family = runtime.selection.getFamily();

    if (mode !== this.published.mode) {
      this.published.mode = mode;
      this.emit("modeChange", mode);
    }
    if (family !== this.published.family) {
      this.published.family = family;
      this.emit("familyChange", family);
    }
    if (theme !== this.published.theme) {
      this.published.theme = theme;
      this.emit("themeChange", theme);
    }
  }

  /**
   * Clean up DOM bindings, event listeners, and persistence subscriptions.
   *
   * @remarks
   * Idempotent: the runtime's own `destroy()` is, and the instance drops its
   * reference so a second call cannot touch a torn-down store.
   */
  destroy(): void {
    this._runtime?.destroy();
    this._runtime = null;
    this.events.clear();
    this.published = { theme: null, mode: null, family: null };
  }
}
