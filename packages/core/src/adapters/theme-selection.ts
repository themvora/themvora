import type {
  ThemeDefinition,
  ThemeEffectiveSelection,
  ThemeMode,
} from "../model";
import {
  getThemeFamilies,
  getThemeFamily,
  getThemeMode,
  normalizeThemeFamily,
  type ThemeSelectionState,
} from "../model";
import { resolveSelectionTheme } from "../resolver";
import { createSystemThemeBinding } from "./system";
import type { ThemeStore } from "../types";
import { isThemeMode } from "../diagnostics";
import { emitInvalidModeDiagnostic } from "./mode-diagnostic";
import { runSyncAdapter } from "./sync-diagnostic";

export interface ThemeSelectionPersistenceAdapter {
  get(): ThemeSelectionState | null;
  set(value: ThemeSelectionState): void;
  remove(): void;
  subscribe(listener: (value: ThemeSelectionState | null) => void): () => void;
}

export interface ThemeSelectionBroadcastAdapter {
  post(value: ThemeSelectionState): void;
  subscribe(listener: (value: ThemeSelectionState) => void): () => void;
  destroy(): void;
}

export interface ThemeSelectionControllerOptions<T extends ThemeDefinition> {
  store: ThemeStore<T>;
  themes: readonly T[];
  initialMode?: ThemeMode;
  initialFamily?: string;
  persistence?: ThemeSelectionPersistenceAdapter | null;
  broadcast?: ThemeSelectionBroadcastAdapter | null;
  view?: Window;
  readPersistenceOnInit?: boolean;
  onSyncApply?: () => void;
}

export function createThemeSelectionController<T extends ThemeDefinition>(
  options: ThemeSelectionControllerOptions<T>,
) {
  const persistence = options.persistence ?? null;
  const broadcast = options.broadcast ?? null;
  const readPersistenceOnInit = options.readPersistenceOnInit ?? true;

  const initialTheme = options.themes[0];

  if (!initialTheme) {
    throw new Error("At least one theme must be provided.");
  }

  const saved = readPersistenceOnInit ? persistence?.get() : null;

  // A persisted family can be stale: a cookie or `localStorage` entry written
  // before the registry changed its family set. Left as-is it matches no theme,
  // so the store falls back to `themes[0]` while the selection keeps naming the
  // old family — and every readout of the selection then contradicts the theme
  // actually on screen. Normalise against the registry, the same invariant
  // `resolveSelection` enforces. The mode is always valid on its own, so a saved
  // mode still wins untouched.
  let state: ThemeSelectionState = {
    mode: saved?.mode ?? options.initialMode ?? "system",
    family: normalizeThemeFamily(
      options.themes,
      saved?.family ?? options.initialFamily,
      initialTheme,
    ),
  };

  let systemBinding: { destroy(): void } | null = null;
  let unsubscribePersistence: (() => void) | null = null;
  let unsubscribeBroadcast: (() => void) | null = null;
  let unsubscribeStore: (() => void) | null = null;
  let destroyed = false;
  let applyingFromController = false;
  /**
   * Whether an automatic driver other than the OS — the sunrise/sunset
   * schedule — is currently deciding the appearance.
   *
   * Both drivers write the same store, so without this flag they take turns
   * overwriting each other: the schedule applied the night theme during
   * construction and the OS binding immediately replaced it with the daytime
   * one, so a visitor with `mode: "system"` saw the wrong theme until the next
   * schedule tick. While an external driver is active the OS binding is not
   * created, and the OS preference cannot move the store.
   */
  let externalAutomaticDriver = false;

  const selectionListeners = new Set<(selection: ThemeSelectionState) => void>();
  const effectiveListeners = new Set<
    (selection: ThemeEffectiveSelection) => void
  >();

  /** The appearance the store currently holds. */
  function deriveEffective(): ThemeEffectiveSelection {
    const theme = options.store.get();
    return {
      family: getThemeFamily(theme),
      mode: getThemeMode(theme) === "dark" ? "dark" : "light",
    };
  }

  let effective: ThemeEffectiveSelection = deriveEffective();

  function notifySelectionListeners() {
    const current = { ...state };
    for (const listener of selectionListeners) {
      listener(current);
    }
  }

  /**
   * Publish the appearance actually on screen, if it moved.
   *
   * A separate channel from {@link notifySelectionListeners} on purpose: the
   * configured selection and the effective one change for different reasons.
   * An OS appearance change, or a schedule transition, moves the effective mode
   * while the visitor's choice stands — and a consumer that treats "the
   * selection changed" as "the visitor just chose something" (the runtime's
   * manual-override bookkeeping does) must not be woken by it.
   */
  function publishEffective(next: ThemeEffectiveSelection = deriveEffective()) {
    if (next.family === effective.family && next.mode === effective.mode) {
      return;
    }
    effective = next;
    for (const listener of effectiveListeners) {
      listener({ ...effective });
    }
  }

  function stopSystemBinding() {
    systemBinding?.destroy();
    systemBinding = null;
  }

  /**
   * Follow `prefers-color-scheme` for `nextState.family`.
   *
   * `applyOnCreate` is what makes handing the appearance back from a schedule
   * safe: re-creating the binding with the initial apply suppressed resumes
   * listening without changing the theme the schedule left behind.
   */
  function bindSystemTheme(nextState: ThemeSelectionState, applyOnCreate = true) {
    systemBinding = createSystemThemeBinding(options.store, {
      lightTheme: resolveSelectionTheme({
        themes: options.themes,
        selection: {
          family: nextState.family,
          mode: "light",
        },
      }).theme,

      darkTheme: resolveSelectionTheme({
        themes: options.themes,
        selection: {
          family: nextState.family,
          mode: "dark",
        },
      }).theme,

      applyOnCreate,
      ...(options.view ? { view: options.view } : {}),
    });

    return systemBinding !== null;
  }

  function applySelection(
    nextState: ThemeSelectionState,
    sync = true,
    api = "applyState",
    // A configuration-driven change (`sync: false`) is not a user action and is
    // applied without animating by default. An explicit override *is* a visible
    // theme change, so the runtime can ask for the transition to run while still
    // keeping persistence and broadcast out of it.
    suppressTransition = !sync,
  ) {
    // After destroy() the controller is a safe no-op: setMode/setFamily/toggle
    // must not touch persistence or the (now closed) broadcast channel.
    if (destroyed) return;
    stopSystemBinding();

    if (sync) {
      // Isolated per adapter, and *before* the notify/apply below, so neither a
      // blocked storage write nor a closed broadcast channel can skip them.
      // Previously an exception here left the controller half-updated: `state`
      // had already been replaced by the caller, so `getSelection()` reported
      // the new selection while the store still held the old theme and no
      // listener had fired — React kept rendering the old theme until something
      // else triggered a render.
      runSyncAdapter(api, "persistence", () => persistence?.set(nextState));
      runSyncAdapter(api, "broadcast", () => broadcast?.post(nextState));
    }

    notifySelectionListeners();

    if (nextState.mode === "system") {
      // An external automatic driver (the schedule) owns the appearance while
      // it runs. Creating the OS binding here would apply `prefers-color-scheme`
      // over whatever the schedule just chose, which is exactly the bug that
      // made a `"system"` visitor see the daytime theme at night.
      if (!externalAutomaticDriver) {
        const bound = bindSystemTheme(nextState);

        if (!bound) {
          applyingFromController = true;
          options.store.set(
            resolveSelectionTheme({
              themes: options.themes,
              selection: {
                family: nextState.family,
                mode: "light",
              },
            }).theme,
            { suppressTransition },
          );
          applyingFromController = false;
        }
      }

      publishEffective();
      return;
    }

    const resolution = resolveSelectionTheme({
      themes: options.themes,
      selection: nextState,
    });

    applyingFromController = true;
    options.store.set(resolution.theme, { suppressTransition });
    applyingFromController = false;

    publishEffective();
  }

  function setMode(nextMode: ThemeMode) {
    if (state.mode === nextMode) return;

    // Refuse a mode the runtime cannot represent. `ThemeMode` keeps this out of
    // TypeScript, but `setMode` is reachable from plain JavaScript, from a
    // framework binding forwarding a prop, and from anything that read a mode
    // out of storage — none of which the compiler can check. Accepting it would
    // put an unrunnable mode into the selection: no theme matches, so the store
    // silently falls back to the family's light theme while `getMode()` and
    // every readout keep reporting the invalid value. Ignoring the call keeps
    // the selection honest, the same way `setFamily` refuses an unregistered
    // family below.
    if (!isThemeMode(nextMode)) {
      emitInvalidModeDiagnostic(nextMode);
      return;
    }

    state = {
      ...state,
      mode: nextMode,
    };

    applySelection(state, true, "setMode");
  }

  function setFamily(nextFamily: string) {
    if (state.family === nextFamily) return;

    // Refuse a family the registry does not have. Accepting it would leave the
    // selection naming a family that is not on screen — the store falls back to
    // `themes[0]` — so `data-theme-selection-family` and any
    // `data-tv-readout="family"` would contradict `data-theme-family`. Ignoring
    // the request keeps the selection honest; silently switching the visitor to
    // a *different* family than the one requested would be worse, and a caller
    // that passes an unregistered family has a bug that a no-op does not hide
    // from the readout.
    if (!getThemeFamilies(options.themes).includes(nextFamily)) return;

    state = {
      ...state,
      family: nextFamily,
    };

    applySelection(state, true, "setFamily");
  }

  function getAppliedMode(): "light" | "dark" {
    return getThemeMode(options.store.get()) === "dark" ? "dark" : "light";
  }

  function toggleTheme() {
    setMode(getAppliedMode() === "dark" ? "light" : "dark");
  }

  /**
   * Apply a resolved selection wholesale (used by the runtime's configuration
   * update). Unlike `setMode`/`setFamily`, it does not compare against the
   * current state — a catalog change can require re-resolving the *same*
   * family/mode to a different theme object — and it does not persist by
   * default, because a configuration-driven change is not a user choice.
   */
  function applyState(
    nextState: ThemeSelectionState,
    opts: { persist?: boolean; suppressTransition?: boolean } = {},
  ) {
    if (destroyed) return;
    if (!isThemeMode(nextState.mode)) {
      emitInvalidModeDiagnostic(nextState.mode);
      return;
    }
    const family = normalizeThemeFamily(options.themes, nextState.family, options.themes[0]);
    state = { family, mode: nextState.mode };
    const persist = opts.persist ?? false;
    applySelection(state, persist, "applyState", opts.suppressTransition ?? !persist);
  }

  const onSyncApply = options.onSyncApply ?? null;

  /**
   * Apply a theme chosen by an **automatic** driver — the sunrise/sunset
   * schedule — without rewriting the visitor's selection.
   *
   * This is the one entry point an automatic driver may use. It differs from
   * every other apply path in four ways, each of which the schedule previously
   * got wrong by writing to the store directly:
   *
   * - The configured selection is untouched. A schedule decides which
   *   appearance is on screen *now*; it does not decide what the visitor asked
   *   for. Previously a sunset transition rewrote `mode` from `light` to
   *   `dark`, so the visitor's explicit choice was destroyed and the control
   *   that reads it silently changed under them.
   * - Nothing is persisted. An automatic change is not a choice, so saving it
   *   would freeze the visitor on the scheduled mode the next time they load
   *   the page with the schedule gone.
   * - Nothing is broadcast. Cross-tab peers run their own schedule from their
   *   own clock; announcing this as a selection would hand them a manual choice
   *   they never made.
   * - The OS binding is released, because two automatic drivers writing one
   *   store is what made the schedule lose at load time.
   *
   * The effective mode is published to {@link subscribeEffective}, which is what
   * lets a control showing "the current mode" follow a transition.
   */
  function applyAutomaticTheme(
    theme: T,
    opts: { suppressTransition?: boolean } = {},
  ) {
    if (destroyed) return;

    stopSystemBinding();

    applyingFromController = true;
    try {
      options.store.set(theme, {
        suppressTransition: opts.suppressTransition ?? false,
      });
    } finally {
      applyingFromController = false;
    }

    publishEffective();
  }

  /**
   * Hand the appearance to, or take it back from, an external automatic driver.
   *
   * `active: true` releases the OS binding so the schedule's writes survive.
   * `active: false` re-creates it **without** applying it, so turning the
   * schedule off does not itself change the theme — the next real
   * `prefers-color-scheme` change does.
   */
  function setAutomaticDriverActive(active: boolean) {
    if (destroyed) return;
    if (active === externalAutomaticDriver) return;

    externalAutomaticDriver = active;

    if (active) {
      stopSystemBinding();
      return;
    }

    if (state.mode === "system") {
      bindSystemTheme(state, false);
    }
  }

  function handleSyncUpdate(nextState: ThemeSelectionState) {
    applySelection(nextState, false);
    onSyncApply?.();
  }

  if (persistence) {
    unsubscribePersistence = persistence.subscribe((nextState) => {
      if (!nextState) return;

      if (nextState.mode === state.mode && nextState.family === state.family) {
        return;
      }

      state = nextState;
      handleSyncUpdate(nextState);
    });
  }

  if (broadcast) {
    unsubscribeBroadcast = broadcast.subscribe((nextState) => {
      if (nextState.mode === state.mode && nextState.family === state.family) {
        return;
      }

      state = nextState;
      handleSyncUpdate(nextState);
    });
  }

  unsubscribeStore = options.store.subscribe((theme) => {
    if (applyingFromController) return;
    const themeFamily = getThemeFamily(theme);
    const themeMode = getThemeMode(theme);
    const applied: ThemeEffectiveSelection = {
      family: themeFamily,
      mode: themeMode === "dark" ? "dark" : "light",
    };

    // While "system" is selected the store legitimately resolves to the
    // family's light or dark theme as the OS preference changes. That is not
    // a mode switch — keep the explicit "system" selection and its binding,
    // otherwise every OS change would silently downgrade the choice to
    // light/dark and leave the toggle stuck on a concrete mode.
    if (
      themeMode &&
      state.mode !== "system" &&
      (themeFamily !== state.family || themeMode !== state.mode)
    ) {
      state = { family: themeFamily, mode: themeMode };
      // The store was changed from outside the controller (a theme object
      // applied directly). Mirror it, but do not let a failing adapter escape
      // into the store's own subscriber list — that would surface as a failure
      // of `store.set()` to a caller who only changed a theme.
      runSyncAdapter("storeSync", "persistence", () => persistence?.set(state));
      runSyncAdapter("storeSync", "broadcast", () => broadcast?.post(state));
      // The configured selection moved, and it moved without passing through
      // `applySelection`, so nothing has told subscribers yet. Without this the
      // documented `subscribe` channel went silent for every out-of-controller
      // change: `getMode()` reported the new value while every listener kept
      // the old one, and only a re-read (or a reload) revealed the difference.
      notifySelectionListeners();
    }

    // The appearance moved even when the configured selection did not — an OS
    // change or a schedule transition while `mode` is `"system"`. That is
    // precisely the state a control displaying "the current mode" has to see,
    // so it is published on its own channel.
    publishEffective(applied);
  });

  applySelection(state, false);

  return {
    getMode() {
      return state.mode;
    },

    getFamily() {
      return state.family;
    },

    getSelection() {
      return {
        ...state,
      };
    },

    /**
     * The appearance actually applied — `"light"` or `"dark"`, never
     * `"system"`.
     *
     * Differs from {@link getMode} while an automatic driver is deciding the
     * appearance: `mode` stays `"system"` because that is what the visitor
     * asked for, while this reports what is on screen. Read this to display the
     * current mode; read `mode` to edit the choice.
     *
     * Computed from the store on every read rather than cached, so it cannot go
     * stale between the store's notification and this controller's own.
     */
    getEffectiveMode(): "light" | "dark" {
      return deriveEffective().mode;
    },

    /** The applied family and mode, as one snapshot. */
    getEffectiveSelection(): ThemeEffectiveSelection {
      return deriveEffective();
    },

    /**
     * Subscribe to changes in the appearance actually applied.
     *
     * Fires whenever the store resolves to a different family or mode — a
     * manual change, an OS appearance change while the selection is `"system"`,
     * or a schedule transition. Separate from {@link subscribe}, which reports
     * the configured selection and therefore stays quiet through an automatic
     * change.
     */
    subscribeEffective(listener: (selection: ThemeEffectiveSelection) => void) {
      effectiveListeners.add(listener);
      return () => {
        effectiveListeners.delete(listener);
      };
    },

    setMode,

    setFamily,

    applyState,

    applyAutomaticTheme,

    setAutomaticDriverActive,

    toggleTheme,

    subscribe(listener: (selection: ThemeSelectionState) => void) {
      selectionListeners.add(listener);
      return () => {
        selectionListeners.delete(listener);
      };
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;

      stopSystemBinding();

      unsubscribePersistence?.();
      unsubscribePersistence = null;

      unsubscribeBroadcast?.();
      unsubscribeBroadcast = null;

      // The controller owns the broadcast adapter it subscribed to; without
      // this the underlying BroadcastChannel is never closed and keeps the
      // Node event loop alive (and leaks the port in browsers).
      broadcast?.destroy();

      unsubscribeStore?.();
      unsubscribeStore = null;

      selectionListeners.clear();
      effectiveListeners.clear();
    },
  };
}
