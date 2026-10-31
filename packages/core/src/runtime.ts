import type { ThemeDefinition, ThemeIdentifier } from "./model/theme";
import type { ThemeTokens } from "./model/tokens";
import {
  emitInvalidOptionDiagnostic,
  emitNeutralFallbackDiagnostic,
  emitScheduledThemeUnresolvedDiagnostic,
  emitUnknownFamilyDiagnostic,
  isSelectionResolvable,
  isUsableTheme,
  normalizeThemeCatalog,
  resolveEffectiveConfiguration,
  type InvalidOption,
} from "./configuration";
import { getThemeFamilies } from "./model/selection";
import { createThemeStore } from "./createThemeStore";
import { mergeTokens, resolveSelectedTheme } from "./model";
import { resolveTokens } from "./resolve";
import { getBuiltInThemes } from "./built-in-themes";
import {
  resolveThemeOverride,
  resolveThemeOverrideReporting,
  themeOverrideKey,
  type ThemeOverride,
} from "./theme-override";
import { resolveThemeReference } from "./theme-reference";

import {
  createThemeRegistry,
  ThemeRegistry,
  type ThemePack,
  type ThemeRegistryOptions,
} from "./registry";
import { resolveInitialTheme, type InitialThemeResolution } from "./resolver";
import { readBootstrapState } from "./bootstrap";

import {
  createThemeSelectionController,
  type ThemeSelectionBroadcastAdapter,
  type ThemeSelectionPersistenceAdapter,
} from "./adapters/theme-selection";

import { createThemeSelectionBroadcast } from "./adapters/broadcast";
import { runSyncAdapter } from "./adapters/sync-diagnostic";
import { createDOMBinding, type DOMBindingOptions } from "./adapters/dom";

import {
  createCSSVariablesBinding,
  type CSSVariablesOptions,
} from "./adapters/css-variables";

import {
  createAdapterRegistry,
  type AdapterRegistry,
  type ThemeAdapter,
} from "./adapters/library";

import {
  createThemeSchedule,
  type ThemeSchedule,
  type ThemeScheduleSetOptions,
  type ThemeScheduleStore,
} from "./adapters/schedule";

import type { SunTimes } from "./adapters/scheduled";

import type { ThemeMode } from "./model/theme";
import type { ThemeSelectionState } from "./model/selection";
import type { ThemeStore } from "./types";
import {
  DEFAULT_THEME_TRANSITION,
  type ThemeTransitionOptions,
} from "./transition";
import {
  createThemeHistory,
  type ThemeHistory,
  type HistoryEntry,
} from "./history";
import { cloneThemeValue } from "./utils/clone";
import { createThemeLifecycle, type ThemeLifecycle } from "./lifecycle";
import {
  createPluginManager,
  type ThemePlugin,
  type PluginManager,
} from "./plugin";

/**
 * Configures the runtime's automatic sunrise/sunset scheduling.
 *
 * When provided, the runtime creates a schedule controller that applies the
 * light or dark theme of the selected family based on solar times.
 */
export interface ScheduledThemeOptions<T extends ThemeDefinition> {
  /** Theme applied between sunrise and sunset. Optional — when omitted the
   *  schedule derives it from the currently selected theme's family (or falls
   *  back to the built-in neutral `"light"` theme). */
  lightTheme?: T["name"];
  /** Theme applied between sunset and sunrise. Optional — same derivation
   *  as `lightTheme`, falling back to the built-in neutral `"dark"` theme. */
  darkTheme?: T["name"];
  /** Explicit latitude. Optional — when omitted the location is resolved from
   *  `timeZone` or the visitor's browser timezone, so every user gets
   *  sunrise/sunset for their own location automatically. */
  latitude?: number;
  /** Explicit longitude. Optional — see `latitude`. */
  longitude?: number;
  /** IANA timezone to resolve coordinates from when `latitude`/`longitude`
   *  are omitted (e.g. `"Asia/Kathmandu"`). Takes precedence over
   *  auto-detection. */
  timeZone?: string;
  /** Auto-detect the visitor's location from their browser timezone when no
   *  explicit coordinates/timezone are given. Default `true`. */
  autoDetectLocation?: boolean;
  /** How often the schedule re-checks the solar state, in milliseconds.
   *  Passed through to the underlying schedule controller. */
  checkInterval?: number;
  /** Minimum time, in milliseconds, between two applications of the same
   *  theme — remote changes inside this window are ignored. */
  skipApplyMs?: number;
  /** Start enabled. Default `true`. */
  enabled?: boolean;
  /**
   * Override the sunrise/sunset computation.
   *
   * Defaults to the NOAA calculation in {@link calculateSunTimes}. Supply one
   * to drive the schedule from a known clock — a test that must not depend on
   * the real sun, or a product that defines "daytime" its own way. Read once
   * when the schedule is created; a later `configure({ scheduled })` keeps the
   * original function, because changing it mid-flight would re-interpret the
   * transition that is already pending.
   */
  getTimes?: (date: Date, latitude: number, longitude: number) => SunTimes;
}

/**
 * Configuration for creating a Themvora runtime.
 *
 * Every option is optional; the runtime falls back to built-in themes,
 * localStorage persistence, and default bindings when an option is omitted.
 * @see {@link createThemeRuntime}
 */
export interface ThemeRuntimeOptions<
  T extends ThemeDefinition,
> extends ThemeRegistryOptions<T> {
  /**
   * Explicit initial theme resolution, bypassing default + persistence
   * based resolution.
   */
  initial?: InitialThemeResolution<T>;

  /**
   * Theme to activate when no persisted or explicit selection exists.
   *
   * Accepts a **variant** name (`"cocoa-dark"`) or a **family** name
   * (`"cocoa"`); a family resolves to the variant the mode contract picks (see
   * {@link resolveThemeReference}). A variant also supplies its own mode unless
   * `initialMode` is given.
   */
  defaultTheme?: ThemeIdentifier<T>;

  /**
   * An explicit theme to apply, outranking a saved selection.
   *
   * Unlike {@link defaultTheme}, which is only a fallback, an override is
   * applied even when `localStorage` or a cookie already names another theme —
   * which is what makes "preview this theme" expressible as a prop. It is a
   * one-shot signal, not a controlled selection: it is applied when its value
   * changes, it is never re-asserted on later renders, and it does not write to
   * persistence. See {@link ThemeOverride}.
   */
  themeOverride?: ThemeOverride<ThemeIdentifier<T>> | undefined;

  /**
   * Initial mode used when nothing else is given.
   */
  initialMode?: ThemeMode;

  /**
   * Initial family used when nothing else is given.
   *
   * A **variant** name is also accepted and normalised to its family; the
   * variant's own mode is used only when {@link initialMode} is absent, so an
   * explicit mode always wins and the two props cannot silently disagree.
   */
  initialFamily?: ThemeIdentifier<T>;

  /**
   * Whether a persisted selection is read at runtime creation.
   *
   * @defaultValue true
   */
  readPersistenceOnInit?: boolean;

  /**
   * Persistence adapter for the theme selection. Pass `null` to disable
   * persistence entirely.
   *
   * @defaultValue localStorage-backed persistence under the
   *   `"theme-selection"` key, when `window` is available.
   */
  persistence?: ThemeSelectionPersistenceAdapter | null;

  /**
   * Cross-tab broadcast adapter. When omitted, a `BroadcastChannel`-based
   * adapter on channel `"theme-selection"` is created; pass `null` to
   * disable cross-tab sync.
   */
  broadcast?: ThemeSelectionBroadcastAdapter | null;

  /**
   * The `window` to bind to. Defaults to the global `window` when
   * available; omit (or pass `undefined`) in SSR environments.
   */
  view?: Window;

  /**
   * DOM attribute/class binding configuration. `false` disables the
   * binding.
   *
   * @defaultValue enabled with default options
   */
  dom?: false | DOMBindingOptions;

  /**
   * CSS-variable binding configuration. `false` disables the binding.
   *
   * @defaultValue enabled with default options
   */
  cssVariables?: false | CSSVariablesOptions;

  /**
   * Transition configuration. `true` enables transitions with defaults,
   * `false` disables them, and an object provides explicit options.
   *
   * @defaultValue enabled (transitions on unless disabled)
   */
  transition?: boolean | ThemeTransitionOptions;

  /**
   * Sunrise/sunset scheduling configuration. `false` disables scheduling.
   *
   * @defaultValue disabled
   */
  scheduled?: false | ScheduledThemeOptions<T>;

  /**
   * Runtime plugins installed at creation.
   */
  plugins?: ThemePlugin<T>[];

  /**
   * Library adapters installed when the runtime is created. The runtime owns
   *  the registry and notifies every adapter whenever the theme changes; it
   *  never knows anything about the libraries themselves. */
  adapters?: ThemeAdapter<T>[];
}

/**
 * A serializable snapshot of a runtime's state.
 *
 * Produced by {@link ThemeRuntime.snapshot} and accepted by
 * {@link ThemeRuntime.restore} for time-travel and state transfer.
 */
export interface ThemeRuntimeSnapshot<
  T extends ThemeDefinition = ThemeDefinition,
> {
  /** The active theme definition. */
  theme: T;
  /** The active selection (family + mode). */
  selection: ThemeSelectionState;
  /** Recorded history entries. */
  history: HistoryEntry<T>[];
  /** The registry contents at snapshot time. */
  registry: { themes: T[] };
}

/**
 * The state a **server render** produces: the fallback resolution with no
 * persisted override and no OS preference resolved, plus the history state
 * captured before the initial selection was applied.
 *
 * @remarks
 * This is what React's `useSyncExternalStore` must be given as its *server*
 * snapshot. The runtime's live state cannot serve that purpose: by the time a
 * client component renders, the runtime has already adopted the persisted
 * selection and resolved `prefers-color-scheme`, so handing the live state to
 * `getServerSnapshot` makes React compare it against markup the server
 * rendered from the *fallback* — a mismatch, reported as React error #418,
 * that discards the server HTML and re-renders the whole island.
 *
 * A server has neither a persisted selection (no storage) nor an OS
 * preference (no `matchMedia`), so the server snapshot is exactly the
 * fallback: `options.initial` when the caller resolved one, otherwise the
 * `defaultTheme`/`initialFamily`/`initialMode` resolution with `prefersDark`
 * pinned to `false`.
 *
 * @typeParam T - The theme definition type used by the application.
 *
 * @see {@link ThemeRuntime.initial}
 */
export interface ThemeRuntimeInitial<
  T extends ThemeDefinition,
> extends InitialThemeResolution<T> {
  /** Whether {@link ThemeHistory.undo} would have an effect on the server. */
  canUndo: boolean;
  /** Whether {@link ThemeHistory.redo} would have an effect on the server. */
  canRedo: boolean;
  /**
   * The history a server render produces: a single entry holding the
   * server-resolved theme.
   *
   * @remarks
   * Synthesised rather than read from the live controller, because the live
   * controller has already appended the client-resolved theme. Only the entry
   * count and the theme are meaningful — the timestamp is `0` (a server
   * render has no recorded timestamp to publish).
   */
  history: HistoryEntry<T>[];
}

/**
 * A live configuration change for a runtime.
 *
 * This is the subset of {@link ThemeRuntimeOptions} that can change while the
 * runtime stays mounted. Each framework adapter forwards its changed props here
 * — the runtime owns normalization, validation, precedence and notification, so
 * the adapters share one contract instead of each re-implementing selection.
 *
 * @typeParam T - The theme definition type used by the application.
 *
 * @see {@link ThemeRuntime.configure}
 */
export interface ThemeConfigurationUpdate<T extends ThemeDefinition> {
  /**
   * The effective theme catalog. Omit to leave the current catalog unchanged.
   * An empty or all-invalid array resolves to the canonical neutral fallback.
   */
  themes?: readonly T[] | undefined;
  /** Fallback theme: a variant or family identifier. */
  defaultTheme?: ThemeIdentifier<T> | undefined;
  /**
   * Explicit theme override. Supplied-and-semantically-different applies once;
   * an unchanged override is never re-asserted, so it cannot fight a manual
   * selection. Omit to leave the last applied override in place; `undefined`
   * explicitly does the same (an override is not a value to revert to).
   */
  themeOverride?: ThemeOverride<ThemeIdentifier<T>> | undefined;
  /** Initial family, used when the effective selection is re-resolved. */
  initialFamily?: string | undefined;
  /** Initial mode, used when the effective selection is re-resolved. */
  initialMode?: ThemeMode | undefined;
  /** An explicit initial resolution (SSR-resolved selection). Wins when changed. */
  initial?: InitialThemeResolution<T> | undefined;
  /**
   * Transition configuration. Omit to leave the current setting unchanged;
   * `false` disables transitions from the next theme change on; `true` or an
   * options object enables/reconfigures them. Applied to the runtime's live
   * DOM/CSS bindings without rebuilding them and without touching the current
   * theme.
   */
  transition?: boolean | ThemeTransitionOptions | undefined;
  /**
   * Sunrise/sunset scheduling. Omit to leave the current schedule unchanged;
   * `false` tears it down (`runtime.schedule` becomes `null`); an options
   * object installs one or reconfigures the existing one in place.
   */
  scheduled?: false | ScheduledThemeOptions<T> | undefined;
}

/**
 * A Themvora runtime — the single entry point for theming one application
 * boundary.
 *
 * A runtime owns theme selection, token resolution, persistence bindings,
 * scheduling, lifecycle events, history, DOM/CSS-variable application, and
 * adapter registration. Destroy the runtime when its owning application
 * lifecycle ends.
 *
 * @see {@link createThemeRuntime}
 * @see {@link ThemeRuntimeOptions}
 */
export interface ThemeRuntime<T extends ThemeDefinition> {
  /**
   * The underlying theme store (current theme + subscription).
   */
  store: ThemeStore<T>;

  /**
   * The state a **server render** produces — the value `useSyncExternalStore`
   * needs as its *server* snapshot. Read-only and frozen at creation.
   *
   * @see {@link ThemeRuntimeInitial}
   */
  readonly initial: ThemeRuntimeInitial<T>;

  /**
   * The selection controller (mode/family/system binding, persistence).
   */
  selection: ReturnType<typeof createThemeSelectionController<T>>;

  /**
   * The theme registry holding the registered definitions.
   */
  registry: ThemeRegistry<T>;

  /**
   * Live view of the registered themes.
   *
   * One array, kept in place: a consumer that reads it once and holds the
   * reference still sees a later `configure()`, and a consumer that reads it on
   * every change does not miss one. `configure()` replaces its contents rather
   * than swapping the reference.
   */
  readonly themes: readonly T[];

  /**
   * Undo/redo history of theme changes.
   */
  history: ThemeHistory<T>;

  /**
   * Typed lifecycle event emitter.
   */
  lifecycle: ThemeLifecycle<T>;

  /**
   * The adapter registry (library adapters installed via `runtime.use`).
   */
  adapters: AdapterRegistry<T>;

  /** The sunrise/sunset scheduling controller created from the `scheduled`
   *  runtime option. `null` when the runtime was created without one.
   *
   *  Live: re-read after {@link ThemeRuntime.configure} with a `scheduled`
   *  update — the schedule is created, reconfigured in place, or torn down
   *  depending on the value. */
  readonly schedule: ThemeSchedule | null;

  /** The resolved theme-transition options the runtime was created with
   *  (`undefined` when none were supplied). Components like `ThemeScope` read
   *  this so scoped theme changes inherit the same transition as the provider.
   *
   *  Live: {@link ThemeRuntime.configure} with a `transition` update replaces
   *  this value and pushes it into the runtime's live DOM/CSS bindings. */
  readonly transition?: ThemeTransitionOptions | undefined;

  /**
   * Merges token overrides into the active theme and applies the result.
   *
   * Runs plugin token transforms and token-reference resolution before
   * committing the change.
   *
   * @param tokens Partial tokens to merge into the active theme.
   */
  update(tokens: Partial<ThemeTokens>): void;

  /**
   * Applies a live configuration change without recreating the runtime.
   *
   * Normalizes the catalog (empty/invalid → the canonical neutral fallback),
   * re-resolves the selection using the documented precedence, applies the new
   * theme and notifies subscribers — atomically, so no consumer observes a new
   * catalog with old colors. A no-op when nothing that affects the resolved
   * theme changed.
   *
   * Also reconciles the transition and scheduling subsystems: a `transition`
   * update is pushed into the live DOM/CSS bindings (never resetting the
   * current theme or history), and a `scheduled` update creates, reconfigures,
   * or tears down the schedule. Each subsystem is only touched when its own
   * input changed, so a transition-only update never rebuilds the registry and
   * a scheduling-only update never resets theme history.
   *
   * @param update The changed configuration inputs.
   *
   * @see {@link ThemeConfigurationUpdate}
   */
  configure(update: ThemeConfigurationUpdate<T>): void;

  /**
   * Installs a theme pack (registry `use`) and refreshes the runtime's
   * theme list.
   *
   * @param pack The pack to install.
   */
  use(pack: ThemePack<T>): void;

  /**
   * Runs a callback with all intermediate theme changes coalesced.
   *
   * @param callback Work that performs one or more theme mutations.
   */
  batch(callback: () => void): void;

  /**
   * Captures a deep, serializable snapshot of runtime state.
   *
   * @returns A snapshot restorable via {@link ThemeRuntime.restore}.
   */
  snapshot(): ThemeRuntimeSnapshot<T>;

  /**
   * Restores a snapshot produced by {@link ThemeRuntime.snapshot}.
   *
   * Replaces the registry contents, history, store, and selection in one
   * batch. The snapshot is deep-cloned, so later mutation of the input is
   * safe.
   *
   * @param snapshot The snapshot to restore.
   */
  restore(snapshot: ThemeRuntimeSnapshot<T>): void;

  /**
   * Destroys the runtime and releases owned resources.
   *
   * Unsubscribes store listeners, destroys the selection controller,
   * history, bindings, schedule, adapters, registry, and plugin manager.
   *
   * Idempotent. Calling `destroy()` more than once has no effect. After
   * destruction, mutations become no-ops unless otherwise documented.
   */
  destroy(): void;
}

/**
 * Creates the default persistence adapter: a `localStorage`-backed
 * selection adapter under the `"theme-selection"` key.
 *
 * Returns `null` when `window` is unavailable (SSR) or storage access
 * throws. Cross-tab changes are surfaced through the `storage` event.
 *
 * @returns A persistence adapter, or `null` when storage is unavailable.
 * @see {@link ThemeSelectionPersistenceAdapter}
 * @see {@link createThemePersistence}
 */
export function createDefaultPersistence(): ThemeSelectionPersistenceAdapter | null {
  if (typeof window === "undefined") return null;

  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    return null;
  }

  const key = "theme-selection";

  function parseState(value: string | null): ThemeSelectionState | null {
    if (!value) return null;
    try {
      const p = JSON.parse(value) as Partial<ThemeSelectionState>;
      if (
        (p.mode === "light" || p.mode === "dark" || p.mode === "system") &&
        typeof p.family === "string"
      ) {
        return { mode: p.mode, family: p.family };
      }
    } catch {}
    return null;
  }

  return {
    get() {
      try {
        return parseState(storage!.getItem(key));
      } catch {
        return null;
      }
    },
    set(value) {
      try {
        storage!.setItem(key, JSON.stringify(value));
      } catch {}
    },
    remove() {
      try {
        storage!.removeItem(key);
      } catch {}
    },
    subscribe(listener) {
      const handler = (event: StorageEvent) => {
        if (event.key !== key) return;
        listener(parseState(event.newValue));
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
}

function createDefaultBroadcast(): ThemeSelectionBroadcastAdapter | null {
  return createThemeSelectionBroadcast({ channelName: "theme-selection" });
}

/**
 * Normalize the public `transition` option into the concrete options the
 * bindings consume: `undefined` stays `undefined` (no transition configured),
 * `true` becomes the empty options object (defaults), `false` becomes an
 * explicitly disabled transition, and an object is used as-is.
 *
 * Shared by runtime creation and `configure()` so a live update and the initial
 * value are interpreted identically.
 */
function resolveTransitionConfig(
  value: boolean | ThemeTransitionOptions | undefined,
): ThemeTransitionOptions | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "object") return value;
  return value ? {} : { enabled: false };
}

/**
 * Creates an independent Themvora runtime — the single entry point for
 * theming.
 *
 * The runtime wires together the theme store, selection controller
 * (mode/family/system binding), persistence, broadcast (cross-tab sync),
 * history, scheduling, the DOM + CSS-variable bindings, and the adapter
 * registry.
 *
 * @param options Runtime configuration and initial theme definitions.
 * @returns A new `ThemeRuntime` instance.
 *
 * @example
 * ```ts
 * const runtime = createThemeRuntime({
 *   themes: [lightTheme, darkTheme],
 *   defaultTheme: "light",
 *   initialMode: "system",
 * });
 * runtime.selection.setMode("dark");
 * ```
 *
 * @remarks
 * The returned runtime must be destroyed when its owning application
 * lifecycle ends.
 *
 * @see {@link ThemeRuntime}
 * @see {@link createThemeStore}
 */
export function createThemeRuntime<T extends ThemeDefinition>(
  // Defaulted for the same reason every other factory here is: the options are
  // all optional, so `createThemeRuntime()` should create a runtime over the
  // built-in themes rather than throw on `options.themes`.
  options: ThemeRuntimeOptions<T> = {},
): ThemeRuntime<T> {
  const initialThemes: T[] =
    options.themes !== undefined
      ? [...normalizeThemeCatalog(options.themes as readonly T[])]
      : [...(getBuiltInThemes() as unknown as T[])];

  // A caller who supplied a collection with nothing usable gets the neutral
  // fallback *and* a diagnostic — a silent substitution would hide the mistake.
  if (options.themes !== undefined && !options.themes.some(isUsableTheme)) {
    emitNeutralFallbackDiagnostic();
  }

  // An explicitly requested family that the catalog does not have is reported
  // *after* resolution below, because only then is the family the resolver
  // actually chose known — and the diagnostic names it. Reporting it here would
  // win the dedupe with a less accurate message.
  const registry = createThemeRegistry<T>({ themes: initialThemes });
  // Aliased to the registry's internal array, so `runtime.themes`,
  // `runtime.registry.themes` and a reference a consumer captured earlier are
  // the same array. Every catalog mutation (`configure`, `use`, `restore`, or a
  // direct `registry.register` / `unregister`) writes into it.
  const themes: T[] = registry.themes as T[];

  const pluginManager = createPluginManager<T>();
  if (options.plugins) {
    for (const plugin of options.plugins) {
      pluginManager.use(plugin);
    }
  }

  const persistence =
    options.persistence === undefined
      ? createDefaultPersistence()
      : options.persistence;
  const readPersistenceOnInit = options.readPersistenceOnInit ?? true;

  const view =
    options.view ?? (typeof window !== "undefined" ? window : undefined);

  const prefersDark =
    typeof view?.matchMedia === "function" &&
    view.matchMedia("(prefers-color-scheme: dark)").matches;

  let initialFamily = options.initialFamily;
  let initialMode = options.initialMode as ThemeMode | undefined;

  /** Read the persisted selection, degrading instead of throwing. */
  function readSavedSelection(): ThemeSelectionState | null {
    let value: ThemeSelectionState | null = null;
    runSyncAdapter("createRuntime", "persistence", () => {
      value = persistence?.get() ?? null;
    });
    return value;
  }

  if (readPersistenceOnInit && !options.initial) {
    // A caller-supplied adapter can throw where the built-in ones degrade (a
    // hostile sandbox, a custom adapter with a bug). A failed *read* must not
    // stop the runtime from coming up: the theme falls back to the configured
    // selection and the failure is reported through the usual channel.
    const saved = readSavedSelection();
    if (saved) {
      initialFamily = saved.family;
      initialMode = saved.mode;
    }
  }

  // The bootstrap handoff: read back what the pre-paint script already applied.
  // Client only (`document` is absent on a server), and `null` when there is no
  // `data-theme` or the name is not in this registry.
  //
  // Gated on `data-theme-ready`, which only the bootstrap script writes. A bare
  // `data-theme` is not enough: a previous runtime's DOM binding, a test, or a
  // hand-authored attribute can all leave one behind, and adopting that would
  // silently override the caller's `initial`/persistence with whatever happened
  // to be in the document.
  const bootstrapState =
    typeof document !== "undefined" ? readBootstrapState(themes) : null;
  const adoptBootstrap = bootstrapState?.ready === true ? bootstrapState : null;

  const baseResolution =
    // Client only: adopt the pre-paint bootstrap's state when it is present.
    // By the time a client renders, `<html>` already carries the resolved theme
    // — the blocking script wrote it before first paint — so the DOM is the
    // authority on what the visitor is looking at, and anything that re-derives
    // the theme can disagree with it. Note this overrides `options.initial`:
    // that is the *server's* resolution, which cannot know
    // `prefers-color-scheme`, while the bootstrap can. `runtime.initial` below
    // deliberately keeps the server's value, because React's hydration snapshot
    // has to match the markup the server sent.
    adoptBootstrap
      ? resolveInitialTheme({
          themes,

          ...(options.defaultTheme !== undefined
            ? { defaultTheme: options.defaultTheme }
            : {}),

          family: adoptBootstrap.selection.family,
          mode: adoptBootstrap.selection.mode,
          prefersDark,
        })
      : (options.initial ??
        resolveInitialTheme({
          themes,

          ...(options.defaultTheme !== undefined
            ? { defaultTheme: options.defaultTheme }
            : {}),

          ...(initialFamily !== undefined ? { family: initialFamily } : {}),

          ...(initialMode !== undefined ? { mode: initialMode } : {}),

          prefersDark,
        }));

  // An explicit override outranks everything above: that is its entire purpose.
  // It is resolved through the same registry and the same selection model as
  // every other input — there is no second theme-name resolver — and an
  // unresolvable one is reported and ignored rather than silently replaced by
  // `themes[0]`.
  const overrideSelection = resolveThemeOverrideReporting(
    themes,
    options.themeOverride,
    baseResolution.selection,
  );

  const resolution: InitialThemeResolution<T> = overrideSelection
    ? {
        selection: overrideSelection,
        theme: resolveSelectedTheme(themes, {
          ...overrideSelection,
          mode:
            overrideSelection.mode === "system"
              ? prefersDark
                ? "dark"
                : "light"
              : overrideSelection.mode,
        }),
      }
    : baseResolution;

  // Report an explicitly requested family that the catalog does not contain.
  //
  // This has to happen here rather than inside `resolveInitialTheme`: that
  // function is also how the SSR integrations resolve a *persisted* family from
  // a cookie, and a stale cookie must not raise a configuration error on every
  // request — the fingerprint already covers that case by discarding the cookie.
  // `initialFamily` is therefore only treated as a request when it is still the
  // value the caller passed: not overridden by persistence, not adopted from the
  // pre-paint bootstrap, and not superseded by a caller-supplied `initial`.
  //
  // Without this, the diagnostic existed only on the `configure()` path, so a
  // runtime created with an unregistered `initialFamily` resolved silently to
  // the fallback family while `configure()` with the same value reported it.
  const requestedFamily = options.initialFamily;
  if (
    !options.initial &&
    !adoptBootstrap &&
    // An applied override is a *different* request that deliberately replaced
    // the family; reporting the one it replaced would be noise, not a mistake.
    !overrideSelection &&
    requestedFamily !== undefined &&
    requestedFamily.length > 0 &&
    initialFamily === requestedFamily &&
    // `initialFamily` accepts a variant name too, and that is not a mistake: the
    // resolved family simply differs from the text. Only a reference that names
    // nothing at all is reported.
    resolveThemeReference(themes, requestedFamily) === null &&
    resolution.selection.family !== requestedFamily
  ) {
    emitUnknownFamilyDiagnostic(
      requestedFamily,
      resolution.selection.family,
      themes,
    );
  }

  // The resolution a **server render** produces. Same inputs as above, minus
  // the two things a server does not have: a persisted selection (no storage)
  // and an OS preference (no `matchMedia`). Exposed as `runtime.initial` so
  // `useSyncExternalStore` can be given the value the server actually
  // rendered — see `ThemeRuntimeInitial`.
  const serverBase =
    options.initial ??
    resolveInitialTheme({
      themes,

      ...(options.defaultTheme !== undefined
        ? { defaultTheme: options.defaultTheme }
        : {}),

      ...(options.initialFamily !== undefined
        ? { family: options.initialFamily }
        : {}),

      ...(options.initialMode !== undefined
        ? { mode: options.initialMode }
        : {}),

      prefersDark: false,
    });

  // The override is part of the server's resolution too, so the markup a server
  // sends, the snapshot React hydrates against and the client's first render all
  // agree. Resolved without a second diagnostic: the client path above already
  // reported an unresolvable override once.
  const serverOverride = resolveThemeOverride(
    themes,
    options.themeOverride,
    serverBase.selection,
  );

  const serverResolution: InitialThemeResolution<T> = serverOverride
    ? {
        selection: serverOverride,
        theme: resolveSelectedTheme(themes, {
          ...serverOverride,
          mode:
            serverOverride.mode === "system" ? "light" : serverOverride.mode,
        }),
      }
    : serverBase;

  const initial: ThemeRuntimeInitial<T> = Object.freeze({
    theme: serverResolution.theme,
    selection: serverResolution.selection,
    // A server render starts from an empty history: `createThemeHistory` seeds
    // exactly one entry and the initial `applySelection` re-applies the same
    // theme, so nothing is appended. Synthesised rather than read from the live
    // controller, which has already recorded the client-resolved theme.
    canUndo: false,
    canRedo: false,
    history: Object.freeze([
      { theme: serverResolution.theme, timestamp: 0 },
    ]) as unknown as HistoryEntry<T>[],
  });

  const store = createThemeStore({
    initialTheme: resolution.theme,
  });

  const lifecycleController = createThemeLifecycle<T>();

  // A server render must not read the clock. Next.js's Cache Components refuse
  // to prerender a client component that calls `Date.now()` — and a Next
  // prerender constructs this runtime — so the history is stamped with `0`
  // there, which is the same value the synthesised server history above uses.
  // On a client the clock is the real one.
  const historyController = createThemeHistory(
    store,
    typeof document === "undefined" ? { now: () => 0 } : {},
  );

  // Live: `configure({ transition })` replaces this and pushes it into the
  // bindings, so it is `let`, not `const`.
  let transitionOpt = resolveTransitionConfig(options.transition);

  const domOptions = mergeDOMOptions(options.dom, transitionOpt);
  const cssVarOptions = mergeCSSOptions(options.cssVariables, transitionOpt);

  // A binding's `transition` can come from two places: an explicit
  // `dom.transition` / `cssVariables.transition` (which wins) or the runtime's
  // top-level `transition` (the fallback). Only the fallback is ours to
  // reconcile — an explicit value belongs to the caller and must not be
  // overwritten by a later `transition` update.
  const domTransitionExplicit =
    options.dom !== false && options.dom?.transition !== undefined;
  const cssTransitionExplicit =
    options.cssVariables !== false &&
    options.cssVariables?.transition !== undefined;

  // Live: reconciled by `configure({ scheduled })`.
  let scheduleHandle: ThemeSchedule | null = null;

  /**
   * Whether an explicit `themeOverride` is in force.
   *
   * Tracked separately from `appliedOverrideKey` because the schedule is built
   * before that variable is initialised, and because it answers a different
   * question: not *which* override, but *whether* one outranks the automatic
   * drivers. An override is an explicit request — a preview the developer asked
   * for — so it must survive a sunset, exactly as it already survives a
   * `localStorage` entry.
   */
  let overrideActive = overrideSelection !== null;

  const selectionController = createThemeSelectionController({
    store,
    themes,

    initialFamily: resolution.selection.family,
    initialMode: resolution.selection.mode,

    readPersistenceOnInit: false,
    persistence,

    ...(options.broadcast === undefined
      ? { broadcast: createDefaultBroadcast() }
      : options.broadcast
        ? { broadcast: options.broadcast }
        : {}),
    ...(view ? { view } : {}),
    onSyncApply: () => {
      scheduleHandle?.setLastSyncTime(Date.now());
    },
  });

  // The schedule is created *after* the selection controller and writes through
  // it rather than straight to the store.
  //
  // Two things follow from that, and both were broken when the schedule held the
  // raw store. First, a transition is now an *automatic* apply: the visitor's
  // configured mode survives it, nothing is persisted or broadcast on its
  // behalf, and the effective mode is published so a control showing "the
  // current mode" follows it. Second, the schedule can claim the appearance
  // exclusively — `setAutomaticDriverActive` releases the OS binding, so
  // `prefers-color-scheme` cannot overwrite the scheduled theme. Previously the
  // schedule applied the night theme during construction and the `"system"`
  // binding replaced it with the daytime theme a moment later, so the schedule
  // only took effect at its first tick, a whole `checkInterval` later.
  const scheduleStore: ThemeScheduleStore<T> = {
    get: () => store.get(),
    set: (theme, setOptions) =>
      selectionController.applyAutomaticTheme(theme, setOptions),
    subscribe: (listener) => store.subscribe(listener),
  };

  scheduleHandle = createScheduleController(
    scheduleStore,
    themes,
    options.scheduled,
    // An explicit `themeOverride` outranks the schedule, so a scheduled apply is
    // refused while one is in force. Read live, because the override can arrive
    // or be removed long after the schedule was built.
    () => !overrideActive,
  );

  /**
   * Who owns the appearance right now.
   *
   * One owner at a time, in this order: an explicit `themeOverride`, then the
   * schedule, then `prefers-color-scheme`. Each lower layer is released when a
   * higher one is active, which is what stops two drivers from writing the same
   * store and taking turns.
   */
  function syncAutomaticDriver(): void {
    selectionController.setAutomaticDriverActive(
      !overrideActive && scheduleHandle?.enabled === true,
    );
  }

  syncAutomaticDriver();

  // `schedule.enable()` / `schedule.disable()` are reachable from any framework
  // binding (`useThemeSchedule()` returns the controller), so ownership of the
  // appearance has to follow the schedule's own state, not only `configure()`.
  let unsubscribeScheduleState: (() => void) | null = null;

  function watchScheduleOwnership(): void {
    unsubscribeScheduleState?.();
    unsubscribeScheduleState =
      scheduleHandle?.subscribe(() => {
        syncAutomaticDriver();
      }) ?? null;
  }

  watchScheduleOwnership();

  // Watch for a *user* selection made while an override is active. Removing the
  // override must restore the layer it covered, but not over the top of a choice
  // the visitor made afterwards — that is newer intent than the snapshot.
  //
  // `applyState` from `configure()` (and `restore()`) notifies through the same
  // channel, hence the guard: only a change the runtime did not make counts.
  // An automatic change notifies on `subscribeEffective` instead, precisely so
  // it is not mistaken for the visitor choosing something.
  const unsubscribeManualSelection = selectionController.subscribe(() => {
    if (applyingConfiguration) return;
    if (appliedOverrideKey === null) return;
    manualSelectionSinceOverride = true;
  });

  // Created *after* the selection controller, because both bindings apply the
  // store's current theme the moment they are created, and the selection
  // controller is what resolves it. Creating them first published whatever the
  // store happened to hold — for `"system"` mode that is the fallback theme
  // until the controller binds `prefers-color-scheme`, so a dark-OS visitor got
  // one painted frame of the light theme before the binding it replaced. The
  // order matters only here: nothing else observes the store in between.
  // `selection` is handed to the DOM binding so it also maintains
  // `data-theme-selection-mode` / `data-theme-selection-family`. Those are
  // published by the pre-paint bootstrap and the SSR layouts and, until this
  // wiring existed, were never updated again: after the first client-side change
  // the document advertised a selection the visitor no longer had, and every
  // consumer of that attribute — CSS, a framework-free control,
  // `readBootstrapState` — read the state of the page as it was loaded.
  // Whether the CSS-variables binding will own the DOM write for this runtime.
  //
  // Inline variables (the default) are applied inside a single
  // `document.startViewTransition`, whose update callback runs in a *later
  // task*. The DOM binding must therefore not subscribe to the store itself —
  // it is driven from `onBeforeSwap` instead, so the attributes, the `dark`
  // class, `color-scheme` and the `--theme-*` variables all commit together.
  //
  // Without this, `data-theme` flipped in one task and the palette in the next.
  // A paint landing between them showed the new theme's identity over the old
  // theme's colours: the page announced `oat-light` while still painting the
  // dark background, and a `[data-tv-readout]` label disagreed with the pixels
  // beside it. Because it depends on where the compositor commits, it looked
  // like the theme state was "fluctuating" rather than failing every time.
  //
  // `styleSheet: true` is excluded because that path writes into a `<style>`
  // element and returns before `onBeforeSwap`, so the DOM binding has to keep
  // its own subscription there.
  const cssBindingDrivesDom =
    cssVarOptions !== undefined && cssVarOptions.styleSheet !== true;

  const domBinding = domOptions
    ? createDOMBinding(store, {
        ...domOptions,
        selection: selectionController,
        subscribe: !cssBindingDrivesDom,
      })
    : null;

  const cssVariablesBinding = cssVarOptions
    ? createCSSVariablesBinding(store, {
        ...cssVarOptions,
        ...(domBinding ? { onBeforeSwap: domBinding.apply } : {}),
      })
    : null;

  // Safety net for the one combination the flags above cannot see: an explicit
  // `dom.target` makes the DOM binding possible while the CSS binding still
  // returns `null` (no target and no document). Nothing would then call
  // `onBeforeSwap`, so publish the current state once rather than leaving the
  // attributes unwritten.
  if (domBinding && cssBindingDrivesDom && !cssVariablesBinding) {
    domBinding.apply(store.get(), { suppressTransition: true });
  }

  function wirePluginHooks() {
    for (const plugin of pluginManager.list()) {
      if (plugin.onBeforeThemeChange) {
        lifecycleController.on(
          "beforeThemeChange",
          plugin.onBeforeThemeChange as (data: unknown) => void,
        );
      }
      if (plugin.onAfterThemeChange) {
        lifecycleController.on(
          "afterThemeChange",
          plugin.onAfterThemeChange as (data: unknown) => void,
        );
      }
      if (plugin.onBeforePersist) {
        lifecycleController.on(
          "beforePersist",
          plugin.onBeforePersist as (data: unknown) => void,
        );
      }
      if (plugin.onAfterPersist) {
        lifecycleController.on(
          "afterPersist",
          plugin.onAfterPersist as (data: unknown) => void,
        );
      }
      if (plugin.onBeforeApply) {
        lifecycleController.on(
          "beforeApply",
          plugin.onBeforeApply as (data: unknown) => void,
        );
      }
      if (plugin.onAfterApply) {
        lifecycleController.on(
          "afterApply",
          plugin.onAfterApply as (data: unknown) => void,
        );
      }
    }
  }

  function use(pack: ThemePack<T>): void {
    // `registry.use` writes into the array `themes` aliases, so there is
    // nothing left to sync.
    registry.use(pack);
  }

  function mergeDOMOptions(
    explicit: false | DOMBindingOptions | undefined,
    fallbackTransition: ThemeTransitionOptions | undefined,
  ): DOMBindingOptions | undefined {
    if (explicit === false) return undefined;

    const base: DOMBindingOptions = explicit ?? {};

    if (base.transition) return base;
    if (fallbackTransition) return { ...base, transition: fallbackTransition };

    return base;
  }

  function mergeCSSOptions(
    explicit: false | CSSVariablesOptions | undefined,
    fallbackTransition: ThemeTransitionOptions | undefined,
  ): CSSVariablesOptions | undefined {
    if (explicit === false) return undefined;

    const base: CSSVariablesOptions = explicit ?? {};

    if (base.transition) return base;
    if (fallbackTransition) return { ...base, transition: fallbackTransition };

    return base;
  }

  function batch(callback: () => void): void {
    store.batch(callback);
  }

  function snapshot(): ThemeRuntimeSnapshot<T> {
    return {
      theme: cloneThemeValue(store.get()),
      selection: { ...selectionController.getSelection() },
      history: [...historyController.getHistory()],
      registry: {
        themes: registry.list().map((t) => cloneThemeValue(t)),
      },
    };
  }

  function restore(snap: ThemeRuntimeSnapshot<T>): void {
    updatingFromRuntime = true;
    // One atomic registry transaction: the clear() + re-register sequence emits a
    // single coherent notification (flushed after the store/selection below are
    // updated), instead of one empty and N partial states.
    registry.batch(() => {
      store.batch(() => {
        // `clear` + `registerMany` write into the array `themes` aliases.
        registry.clear();
        for (const theme of snap.registry.themes) {
          registry.register(theme);
        }

        historyController.clear();

        store.set(cloneThemeValue(snap.theme) as T, { force: true });
        previousTheme = store.get();
        applyingConfiguration = true;
        try {
          selectionController.setMode(snap.selection.mode);
          if (snap.selection.family) {
            selectionController.setFamily(snap.selection.family);
          }
        } finally {
          applyingConfiguration = false;
        }
      });
    });
    updatingFromRuntime = false;
  }

  let updatingFromRuntime = false;
  let previousTheme = store.get();

  // ---- live configuration --------------------------------------------------

  let appliedConfig: ThemeConfigurationUpdate<T> & { themes: readonly T[] } = {
    themes: initialThemes,
    defaultTheme: options.defaultTheme,
    themeOverride: options.themeOverride,
    initialFamily: options.initialFamily,
    initialMode: options.initialMode,
    initial: options.initial,
  };

  // The override the runtime has already honoured, in two forms:
  //
  // - `appliedOverrideKey` — canonical (a name resolved against the catalog), so
  //   `"mint-dark"` and `{ family: "mint", mode: "dark" }` compare equal;
  // - `appliedOverrideRequestKey` — catalog-free, so a catalog change that
  //   removes the named theme does not make an unchanged prop look like a new
  //   request and re-report it.
  //
  // Both are `null` until an override actually resolves: an unresolvable one must
  // be retried when the catalog later gains the theme it names.
  let appliedOverrideKey = overrideSelection
    ? themeOverrideKey(options.themeOverride, themes)
    : null;
  let appliedOverrideRequestKey = overrideSelection
    ? themeOverrideKey(options.themeOverride)
    : null;

  // The selection the override is layered over: what becomes effective again when
  // the override is removed. Captured when an override *starts*, and left alone
  // while it changes, so removing a second override still returns to the state
  // the visitor had before any override existed.
  let overrideBaseSelection: ThemeSelectionState | null = overrideSelection
    ? { ...baseResolution.selection }
    : null;

  // Whether the visitor picked a theme themselves while an override was active.
  // Removing the override must not throw that choice away — the snapshot above is
  // only the right answer when nothing else happened in between.
  let manualSelectionSinceOverride = false;

  // Set while `configure()` applies a selection, so its own `applyState` is not
  // mistaken for a user action by the subscription below.
  let applyingConfiguration = false;

  // The transition/scheduling inputs as last applied. Held separately from the
  // catalog/selection state above because they are independent subsystems:
  // changing one must not read as a change to the other (see `configure`).
  let appliedTransition = transitionOpt;
  let appliedScheduled: false | ScheduledThemeOptions<T> | undefined =
    options.scheduled;

  function sameCatalog(a: readonly T[], b: readonly T[]): boolean {
    return (
      a.length === b.length && a.every((theme, index) => theme === b[index])
    );
  }

  function sameStringList(
    a: readonly string[] | undefined,
    b: readonly string[] | undefined,
  ): boolean {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  }

  function samePreset(
    a: ThemeTransitionOptions["preset"],
    b: ThemeTransitionOptions["preset"],
  ): boolean {
    if (a === b) return true;
    return sameStringList(
      Array.isArray(a) ? a : undefined,
      Array.isArray(b) ? b : undefined,
    );
  }

  /**
   * Structural equality for transition options.
   *
   * Adapters build a fresh options object each render, so identity comparison
   * is useless; comparing the known fields is enough and deliberately avoids a
   * generic deep compare of the whole runtime configuration.
   *
   * Each field is compared against its default so `{}` and
   * `{ duration: 300 }` are treated as equivalent — the planner merges
   * `DEFAULT_THEME_TRANSITION` underneath either way.
   */
  function sameTransition(
    a: ThemeTransitionOptions | undefined,
    b: ThemeTransitionOptions | undefined,
  ): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
      (a.enabled ?? true) === (b.enabled ?? true) &&
      (a.duration ?? DEFAULT_THEME_TRANSITION.duration) ===
        (b.duration ?? DEFAULT_THEME_TRANSITION.duration) &&
      (a.easing ?? DEFAULT_THEME_TRANSITION.easing) ===
        (b.easing ?? DEFAULT_THEME_TRANSITION.easing) &&
      (a.useViewTransition ?? DEFAULT_THEME_TRANSITION.useViewTransition) ===
        (b.useViewTransition ?? DEFAULT_THEME_TRANSITION.useViewTransition) &&
      samePreset(a.preset, b.preset) &&
      sameStringList(
        a.properties ?? DEFAULT_THEME_TRANSITION.properties,
        b.properties ?? DEFAULT_THEME_TRANSITION.properties,
      )
    );
  }

  /** Structural equality for the flat scheduled-options object. */
  function sameScheduled(
    a: false | ScheduledThemeOptions<T> | undefined,
    b: false | ScheduledThemeOptions<T> | undefined,
  ): boolean {
    if (a === b) return true;
    if (a === false || b === false || !a || !b) return false;
    return (
      a.lightTheme === b.lightTheme &&
      a.darkTheme === b.darkTheme &&
      a.latitude === b.latitude &&
      a.longitude === b.longitude &&
      a.timeZone === b.timeZone &&
      a.autoDetectLocation === b.autoDetectLocation &&
      a.checkInterval === b.checkInterval &&
      a.skipApplyMs === b.skipApplyMs &&
      a.enabled === b.enabled
    );
  }

  /**
   * Push a new transition configuration into the live bindings.
   *
   * Touches only `transitionOpt` and the bindings' own transition value — never
   * the store, the selection, or history. A transition change *is not* a theme
   * change: it must not append a history entry or emit a theme-change event.
   */
  function applyTransitionConfig(
    next: ThemeTransitionOptions | undefined,
  ): void {
    transitionOpt = next;
    if (domBinding && !domTransitionExplicit) domBinding.setTransition(next);
    if (cssVariablesBinding && !cssTransitionExplicit) {
      cssVariablesBinding.setTransition(next);
    }
  }

  /**
   * Map the public `scheduled` options onto the schedule controller's canonical
   * `set()` input. `lightTheme`/`darkTheme` are always supplied (presence-based)
   * so an omitted name clears an earlier explicit one and returns to family
   * derivation; coordinates follow `set()`'s explicit-coordinate > timezone >
   * auto-detect precedence.
   */
  function scheduledSetOptions(
    next: ScheduledThemeOptions<T>,
  ): ThemeScheduleSetOptions {
    const opts: ThemeScheduleSetOptions = {
      lightTheme: next.lightTheme,
      darkTheme: next.darkTheme,
    };
    if (next.latitude !== undefined) opts.latitude = next.latitude;
    if (next.longitude !== undefined) opts.longitude = next.longitude;
    if (next.timeZone !== undefined) opts.timeZone = next.timeZone;
    if (next.checkInterval !== undefined)
      opts.checkInterval = next.checkInterval;
    if (next.skipApplyMs !== undefined) opts.skipApplyMs = next.skipApplyMs;
    if (next.enabled !== undefined) opts.enabled = next.enabled;
    const hasCoordinates =
      next.latitude !== undefined ||
      next.longitude !== undefined ||
      next.timeZone !== undefined;
    if (!hasCoordinates && next.autoDetectLocation !== false) {
      opts.autoDetectLocation = true;
    }
    return opts;
  }

  /**
   * Reconcile the schedule against a new `scheduled` input: create it,
   * reconfigure the existing one in place through the controller's canonical
   * `set()` (reusing its live binding and listeners), or tear it down. Never
   * leaves two schedulers active.
   */
  function reconcileSchedule(next: false | ScheduledThemeOptions<T>): void {
    if (next === false) {
      scheduleHandle?.destroy();
      scheduleHandle = null;
      watchScheduleOwnership();
      selectionController.setAutomaticDriverActive(false);
      return;
    }
    if (!scheduleHandle) {
      scheduleHandle = createScheduleController(
        scheduleStore,
        themes,
        next,
      );
      watchScheduleOwnership();
    } else {
      scheduleHandle.set(scheduledSetOptions(next));
    }
    // Enabling, disabling or reconfiguring the schedule changes who owns the
    // appearance, so the OS binding is handed over or taken back here. Routed
    // through `syncAutomaticDriver` rather than read from `enabled` directly:
    // an active `themeOverride` still outranks a freshly installed schedule.
    syncAutomaticDriver();
  }

  /**
   * The first unusable transition option, or `null` when the configuration is
   * usable. Kept to the numeric/string fields the runtime actually reads — no
   * attempt to validate CSS timing-function grammar.
   */
  function invalidTransitionOption(
    options: ThemeTransitionOptions,
  ): InvalidOption | null {
    if (
      options.duration !== undefined &&
      (!Number.isFinite(options.duration) || options.duration < 0)
    ) {
      return {
        property: "transition.duration",
        received: options.duration,
        expected: "a finite number of milliseconds >= 0",
      };
    }
    if (
      options.easing !== undefined &&
      (typeof options.easing !== "string" || options.easing.trim().length === 0)
    ) {
      return {
        property: "transition.easing",
        received: options.easing,
        expected: "a non-empty CSS timing function",
      };
    }
    return null;
  }

  /**
   * The first unusable scheduling option, or `null` when the configuration is
   * usable.
   */
  function invalidScheduledOption(
    options: ScheduledThemeOptions<T>,
  ): InvalidOption | null {
    const { checkInterval, skipApplyMs, latitude, longitude } = options;
    if (
      checkInterval !== undefined &&
      (!Number.isFinite(checkInterval) || checkInterval <= 0)
    ) {
      return {
        property: "scheduled.checkInterval",
        received: checkInterval,
        expected: "a finite number of milliseconds > 0",
      };
    }
    if (
      skipApplyMs !== undefined &&
      (!Number.isFinite(skipApplyMs) || skipApplyMs < 0)
    ) {
      return {
        property: "scheduled.skipApplyMs",
        received: skipApplyMs,
        expected: "a finite number of milliseconds >= 0",
      };
    }
    if (
      latitude !== undefined &&
      (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
    ) {
      return {
        property: "scheduled.latitude",
        received: latitude,
        expected: "a number in [-90, 90]",
      };
    }
    if (
      longitude !== undefined &&
      (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
    ) {
      return {
        property: "scheduled.longitude",
        received: longitude,
        expected: "a number in [-180, 180]",
      };
    }
    return null;
  }

  /**
   * Warn when a reconciled schedule names a theme the catalog does not hold.
   * Only reported when a name was actually supplied and not found — a catalog
   * that simply has no built-in `light`/`dark` pair is a different situation and
   * is not a mistake in the scheduling configuration.
   */
  function reportUnresolvedSchedule(next: ScheduledThemeOptions<T>): void {
    if (!scheduleHandle) return;
    if (scheduleHandle.lightTheme && scheduleHandle.darkTheme) return;
    const missing = (name: string | undefined) =>
      name !== undefined && !themes.some((theme) => theme.name === name);
    if (missing(next.lightTheme) || missing(next.darkTheme)) {
      emitScheduledThemeUnresolvedDiagnostic(next);
    }
  }

  function configure(update: ThemeConfigurationUpdate<T>): void {
    // 1. Normalize the effective catalog. `undefined` means "leave it alone";
    //    an empty or all-invalid collection resolves to the neutral fallback.
    //
    // "Leave it alone" means the *live* catalog, not the last one `configure()`
    // applied: `use(pack)` registers themes without going through `configure`,
    // so `appliedConfig.themes` can be behind the registry. Comparing against it
    // made two mistakes — a selection-only update looked like a catalog change
    // (dropping a pack the caller never touched), and re-supplying the previous
    // catalog after a `use()` looked like a no-op (so a pack could not be
    // removed). The registry is the only honest reference for "what is
    // registered right now".
    let nextThemes: readonly T[];
    if (update.themes === undefined) {
      nextThemes = themes;
    } else {
      const hadUsable = update.themes.some(isUsableTheme);
      nextThemes = normalizeThemeCatalog(update.themes as readonly T[]);
      if (!hadUsable) emitNeutralFallbackDiagnostic();
    }

    const catalogChanged = !sameCatalog(nextThemes, themes);

    // A configuration input is "changed" only when the caller *supplied* it
    // (`hasOwn`), so a provider that omits a prop (or forwards `undefined` for
    // one it never received) does not reset a value the runtime was created
    // with. Supplied-and-different merges over the applied value.
    const has = (key: keyof ThemeConfigurationUpdate<T>) =>
      Object.prototype.hasOwnProperty.call(update, key);

    const nextDefaultTheme = has("defaultTheme")
      ? update.defaultTheme
      : appliedConfig.defaultTheme;
    const nextInitialFamily = has("initialFamily")
      ? update.initialFamily
      : appliedConfig.initialFamily;
    const nextInitialMode = has("initialMode")
      ? update.initialMode
      : appliedConfig.initialMode;

    // Compare `initial` by value, not identity: adapters legitimately build a
    // fresh object each render, and re-applying an identical resolution every
    // render would be churn.
    //
    // A supplied `initial` is only a change when the catalog can actually
    // resolve it. An SSR handoff can legitimately name a theme the client
    // catalog no longer contains (a deploy between the server render and
    // hydration), and the documented contract is that such a selection is
    // *ignored* — it must not be treated as a re-resolution request, or the
    // visitor's current selection is silently replaced by `themes[0]`.
    const initial = update.initial;
    const previousInitial = appliedConfig.initial;
    const initialUsable =
      initial !== undefined &&
      isSelectionResolvable(nextThemes, initial.selection);
    const initialChanged =
      initialUsable &&
      (previousInitial === undefined ||
        String(initial.theme?.name) !== String(previousInitial.theme?.name) ||
        initial.selection.mode !== previousInitial.selection.mode ||
        initial.selection.family !== previousInitial.selection.family);

    const selectionPropsChanged =
      nextDefaultTheme !== appliedConfig.defaultTheme ||
      nextInitialFamily !== appliedConfig.initialFamily ||
      nextInitialMode !== appliedConfig.initialMode;

    // The override is diffed by *semantic* key, not by identity and not against
    // `appliedConfig` alone: it is a one-shot signal, so "already applied" has to
    // survive both re-renders with a rebuilt object and a manual selection that
    // moved the theme away from it.
    const nextOverride = has("themeOverride")
      ? update.themeOverride
      : appliedConfig.themeOverride;
    const nextOverrideKey = themeOverrideKey(nextOverride, nextThemes);
    const nextOverrideRequestKey = themeOverrideKey(nextOverride);
    const overrideChanged =
      nextOverrideKey !== null &&
      nextOverrideKey !== appliedOverrideKey &&
      nextOverrideRequestKey !== appliedOverrideRequestKey;

    // Removal is a transition, not the absence of one. Before this, `undefined`
    // produced `nextOverrideKey === null` and every comparison short-circuited to
    // "unchanged", so the runtime kept the override for the life of the page and
    // only a reload revealed the underlying selection again.
    const overrideRemoved = nextOverrideKey === null && appliedOverrideKey !== null;

    // Resolved here, against the selection that is *currently in effect* — not
    // against a re-resolution of the props. The override is a layer over what the
    // visitor is looking at; a partial request (`{ family }`) completes from it,
    // and the snapshot taken below has to be that same layer.
    const currentSelection = selectionController.getSelection();
    const overrideResolution = overrideChanged
      ? resolveThemeOverrideReporting(nextThemes, nextOverride, currentSelection)
      : null;
    // An override that resolved to nothing is not a state transition: the
    // diagnostic has already been emitted, and applying the re-resolved default
    // would fire a spurious theme change on every render. `overrideResolution`
    // being null is what the early return below checks.

    // Transition/scheduling inputs are diffed independently of the catalog so
    // that, e.g., a transition-only update never looks like a selection change.
    const transitionConfig = has("transition")
      ? resolveTransitionConfig(update.transition)
      : appliedTransition;
    const transitionChanged =
      has("transition") && !sameTransition(transitionConfig, appliedTransition);

    // `undefined` cannot express "remove the schedule" (that is `false`), so an
    // explicitly-undefined value is treated as "not supplied".
    const scheduledSupplied =
      has("scheduled") && update.scheduled !== undefined;
    const scheduledChanged =
      scheduledSupplied && !sameScheduled(update.scheduled, appliedScheduled);

    // Nothing at all changed → no work, no notification.
    if (
      !catalogChanged &&
      !initialChanged &&
      !selectionPropsChanged &&
      !overrideChanged &&
      !overrideRemoved &&
      !transitionChanged &&
      !scheduledChanged
    ) {
      return;
    }

    // Reconcile the independent subsystems first, so a change that also
    // re-resolves the theme adopts the new transition and schedule. Neither
    // call touches the store, the selection, or history — a transition update
    // is not a theme change and must not append a history entry.
    //
    // An unusable option skips *only* its own subsystem and keeps the previous
    // setting there (a defined state), with a deduplicated warning; the update
    // is not partially applied to unrelated subsystems.
    if (transitionChanged) {
      const invalid = invalidTransitionOption(transitionConfig ?? {});
      if (invalid) {
        emitInvalidOptionDiagnostic(invalid);
      } else {
        applyTransitionConfig(transitionConfig);
        appliedTransition = transitionConfig;
      }
    }
    if (scheduledChanged) {
      const nextScheduled = update.scheduled as
        false | ScheduledThemeOptions<T>;
      const invalid =
        nextScheduled === false ? null : invalidScheduledOption(nextScheduled);
      if (invalid) {
        emitInvalidOptionDiagnostic(invalid);
      } else {
        reconcileSchedule(nextScheduled);
        appliedScheduled = update.scheduled;
        if (nextScheduled !== false) reportUnresolvedSchedule(nextScheduled);
      }
    }

    // No catalog/selection work to do → done (e.g. a transition-only update
    // must leave the active theme and history untouched).
    if (
      !catalogChanged &&
      !initialChanged &&
      !selectionPropsChanged &&
      !overrideRemoved &&
      !overrideResolution
    ) {
      return;
    }

    const previous = currentSelection;
    let nextSelection: ThemeSelectionState;

    if (
      initialChanged &&
      update.initial &&
      isSelectionResolvable(nextThemes, update.initial.selection)
    ) {
      nextSelection = update.initial.selection;
    } else {
      // Preserve a still-valid selection when *only* the catalog changed AND no
      // explicit selection was requested — so a catalog update does not silently
      // move the user off their theme, while a requested family that has just
      // become resolvable is still honoured.
      const requestedFamily = nextInitialFamily;
      const preserve =
        catalogChanged &&
        !selectionPropsChanged &&
        !initialChanged &&
        !(requestedFamily !== undefined && requestedFamily !== previous.family);
      nextSelection = resolveEffectiveConfiguration({
        themes: nextThemes,
        defaultTheme: preserve ? undefined : nextDefaultTheme,
        initialFamily: preserve ? undefined : nextInitialFamily,
        initialMode: preserve ? undefined : nextInitialMode,
        prefersDark,
        previousSelection: previous,
        preservePrevious: preserve,
      }).selection;
    }

    // The override wins over whatever the resolution above produced — including a
    // changed `initial` — because it is the more explicit request. It is resolved
    // against the *new* catalog, so an override that names a theme the catalog
    // has just gained starts working on this update.
    let overrideApplied = false;
    let overrideWasRemoved = false;
    if (overrideResolution) {
      // Capture the layer the override is about to cover — but only when an
      // override was not already active, so changing A→B keeps the state that
      // predates *both*.
      if (appliedOverrideKey === null) {
        overrideBaseSelection = { ...previous };
        manualSelectionSinceOverride = false;
      }
      nextSelection = overrideResolution;
      overrideApplied = true;
    } else if (overrideRemoved) {
      // Removing the override reveals the layer underneath. If the visitor chose
      // something themselves while the override was active, that newer intent
      // wins over the snapshot — and "the current selection" is exactly it,
      // because the runtime kept applying their choices over the override.
      nextSelection = manualSelectionSinceOverride
        ? { ...previous }
        : { ...(overrideBaseSelection ?? previous) };
      overrideBaseSelection = null;
      manualSelectionSinceOverride = false;
      overrideWasRemoved = true;
    }

    // 2. Apply atomically: one registry notification, one store notification,
    //    so a consumer never sees the new catalog with the old colors.
    //
    // The registry is only rewritten when the catalog actually changed. A
    // selection-only update (a changed `defaultTheme`, say) used to re-register
    // the whole catalog anyway, which re-stamped every theme's metadata, handed
    // consumers brand-new theme objects with the same names, and fired the
    // registry notification — so a catalog signal was indistinguishable from a
    // configuration churn, and scopes re-resolved on every render.
    updatingFromRuntime = true;
    registry.batch(() => {
      store.batch(() => {
        if (catalogChanged) {
          // `clear` + `registerMany` write straight into the array `themes`
          // aliases, so the live view is current the moment the batch ends.
          registry.clear();
          registry.registerMany(nextThemes);
        }
        applyingConfiguration = true;
        try {
          selectionController.applyState(
            nextSelection,
            // The override must not write to storage or the cross-tab channel: it
            // is a transient preview, and overwriting the visitor's saved choice
            // would make a prop look like a user action. It *should* animate, since
            // it is a visible theme change the consumer asked for. Restoring the
            // underlying selection is not a user action either, so it does not
            // persist — that state is already what storage says, or it is a
            // fallback that was never a choice.
            overrideApplied || overrideWasRemoved
              ? { persist: false, suppressTransition: false }
              : {},
          );
        } finally {
          applyingConfiguration = false;
        }
        previousTheme = store.get();
      });
    });
    updatingFromRuntime = false;

    appliedConfig = {
      themes: nextThemes,
      defaultTheme: nextDefaultTheme,
      themeOverride: nextOverride,
      initialFamily: nextInitialFamily,
      initialMode: nextInitialMode,
      // Only a resolution the catalog accepted is remembered. Storing an
      // unusable one would make the *same* object look "already applied" once
      // the catalog gains that family, so the update would be skipped exactly
      // when it had become valid.
      initial: initialUsable ? initial : appliedConfig.initial,
    };

    // Recorded only when it actually resolved, for the same reason `initial` is:
    // an unresolvable override has to be retried once the catalog can satisfy it.
    if (overrideApplied) {
      appliedOverrideKey = nextOverrideKey;
      appliedOverrideRequestKey = nextOverrideRequestKey;
      overrideActive = true;
    } else if (overrideWasRemoved) {
      // Cleared, so the same override applied again later is a new transition
      // rather than "already honoured".
      appliedOverrideKey = null;
      appliedOverrideRequestKey = null;
      overrideActive = false;
    }

    // The override layer just moved, so the appearance has a different owner:
    // an override suspends the schedule, and removing it hands the appearance
    // back. Without this the schedule either kept writing over a preview or
    // stayed suspended after the preview ended.
    if (overrideApplied || overrideWasRemoved) {
      syncAutomaticDriver();
    }
  }

  const unsubscribeStoreSelection = store.subscribe((theme) => {
    if (updatingFromRuntime) return;
    if (theme === previousTheme) return;
    lifecycleController.emit("beforeThemeChange", {
      current: previousTheme,
      next: theme,
    });
    lifecycleController.emit("beforePersist", {
      selection: selectionController.getSelection(),
    });
    lifecycleController.emit("afterPersist", {
      selection: selectionController.getSelection(),
    });
    lifecycleController.emit("afterThemeChange", { theme });
    previousTheme = theme;
  });

  let adapterRegistry: AdapterRegistry<T> | null = null;

  const runtime: ThemeRuntime<T> = {
    store,
    initial,
    registry,
    get themes(): readonly T[] {
      // The runtime's own list, kept in place. Returning a fresh array per read
      // (`registry.list()`) meant a consumer that captured `runtime.themes`
      // held a snapshot that never reflected a later `configure()` — which is
      // exactly how a scoped theme ended up rendering a theme the catalog no
      // longer had. The registry exposes its internal array the same way, so
      // the two views now agree on identity.
      return themes;
    },
    selection: selectionController,
    history: historyController,
    lifecycle: lifecycleController,
    adapters: null as unknown as AdapterRegistry<T>,
    get schedule(): ThemeSchedule | null {
      return scheduleHandle;
    },
    get transition(): ThemeTransitionOptions | undefined {
      return transitionOpt;
    },

    update(tokens: Partial<ThemeTokens>) {
      const current = store.get();
      const next = { ...current } as T;
      let merged = mergeTokens(current.tokens, tokens as ThemeTokens);
      if (merged) {
        for (const plugin of pluginManager.list()) {
          if (plugin.transformTokens) {
            merged = plugin.transformTokens(merged, { theme: next });
          }
        }
        merged = resolveTokens(merged);
      }
      (next as Record<string, unknown>).tokens = merged ?? current.tokens;

      updatingFromRuntime = true;
      lifecycleController.emit("beforeThemeChange", { current, next });
      lifecycleController.emit("beforePersist", {
        selection: selectionController.getSelection(),
      });
      store.set(next, { force: true });
      previousTheme = next;
      updatingFromRuntime = false;
      lifecycleController.emit("afterPersist", {
        selection: selectionController.getSelection(),
      });
      lifecycleController.emit("afterThemeChange", { theme: next });
    },

    use,

    configure,

    batch,
    snapshot,
    restore,

    destroy() {
      unsubscribeStoreSelection();
      unsubscribeManualSelection();
      unsubscribeScheduleState?.();
      unsubscribeScheduleState = null;
      pluginManager.destroy();
      selectionController.destroy();
      historyController.destroy();
      domBinding?.destroy();
      cssVariablesBinding?.destroy();
      scheduleHandle?.destroy();
      adapterRegistry?.destroy();
      registry.destroy();
      lifecycleController.destroy();
    },
  };

  for (const plugin of pluginManager.list()) {
    plugin.onRuntimeCreated?.(runtime);
  }
  wirePluginHooks();

  adapterRegistry = createAdapterRegistry(runtime);
  runtime.adapters = adapterRegistry;
  for (const adapter of options.adapters ?? []) {
    adapterRegistry.use(adapter);
  }

  return runtime;
}

function createScheduleController<T extends ThemeDefinition>(
  store: ThemeScheduleStore<T>,
  themes: readonly T[],
  scheduled: false | ScheduledThemeOptions<T> | undefined,
  allowApply?: () => boolean,
) {
  if (!scheduled) return null;

  return createThemeSchedule(store, themes, {
    ...(scheduled.lightTheme !== undefined
      ? { lightTheme: scheduled.lightTheme }
      : {}),
    ...(scheduled.darkTheme !== undefined
      ? { darkTheme: scheduled.darkTheme }
      : {}),
    ...(scheduled.latitude !== undefined
      ? { latitude: scheduled.latitude }
      : {}),
    ...(scheduled.longitude !== undefined
      ? { longitude: scheduled.longitude }
      : {}),
    ...(scheduled.timeZone !== undefined
      ? { timeZone: scheduled.timeZone }
      : {}),
    ...(scheduled.autoDetectLocation !== undefined
      ? { autoDetectLocation: scheduled.autoDetectLocation }
      : {}),
    ...(scheduled.checkInterval !== undefined
      ? { checkInterval: scheduled.checkInterval }
      : {}),
    ...(scheduled.skipApplyMs !== undefined
      ? { skipApplyMs: scheduled.skipApplyMs }
      : {}),
    ...(scheduled.enabled !== undefined ? { enabled: scheduled.enabled } : {}),
    ...(scheduled.getTimes !== undefined ? { getTimes: scheduled.getTimes } : {}),
    ...(allowApply ? { onBeforeApply: () => allowApply() } : {}),
  });
}
