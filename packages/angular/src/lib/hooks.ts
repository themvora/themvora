import {
  inject,
  DestroyRef,
  computed,
  type Signal,
  signal,
} from "@angular/core";
import type {
  ThemeRuntime,
  ThemeDefinition,
  ThemeMode,
  ThemeRuntimeSnapshot,
  ThemePack,
  HistoryEntry,
  ThemeLifecycleEventName,
  ThemeScheduleState,
  ThemeScheduleSetOptions,
} from "@themvora/core";
import { EMPTY_THEME_SCHEDULE_STATE, resolveGeneratedTheme } from "@themvora/core";
import { THEME_RUNTIME, THEME_SCOPED_RUNTIME } from "./tokens";

function resolveRuntime<T extends ThemeDefinition>(): ThemeRuntime<T> {
  const runtime =
    inject(THEME_SCOPED_RUNTIME, { optional: true }) ??
    inject(THEME_RUNTIME);
  if (!runtime) {
    throw new Error(
      "No Themvora runtime found. Ensure provideTheme() is included in your providers.",
    );
  }
  return runtime as ThemeRuntime<T>;
}

/**
 * Injects the active Themvora runtime.
 *
 * May be called from an Angular injection context. Resolves the scoped runtime
 * when inside a {@link ThemeScopeDirective}, otherwise the environment runtime
 * provided by {@link provideTheme}. Throws if no runtime is provided.
 *
 * @returns The active {@link ThemeRuntime}.
 *
 * @see {@link provideTheme}
 * @see {@link injectTheme}
 */
export function injectThemeRuntime<T extends ThemeDefinition = ThemeDefinition>(): ThemeRuntime<T> {
  return resolveRuntime<T>();
}

/**
 * Reactive state describing the current theme selection.
 *
 * Exposes the active theme, the current mode and theme family, the resolved
 * light/dark mode, and callbacks to change the selection.
 *
 * @see {@link injectTheme}
 */
export interface ThemeState<T extends ThemeDefinition = ThemeDefinition> {
  /** The currently active theme definition. */
  theme: T;
  /** The current theme mode: `"light"`, `"dark"`, or `"system"`. */
  mode: ThemeMode;
  /** The current theme family name. */
  family: string;
  /** The resolved mode (`"light"` or `"dark"`) after applying `"system"`. */
  resolvedMode: "light" | "dark";
  /** Sets the theme mode. */
  setMode: (mode: ThemeMode) => void;
  /** Sets the theme family. */
  setFamily: (family: string) => void;
  /** Toggles between light and dark mode. */
  toggleTheme: () => void;
}

/**
 * Injects a reactive {@link ThemeState} signal for the active runtime.
 *
 * May be called from an Angular injection context. Returns a read-only signal
 * that updates whenever the active theme changes, and unsubscribes
 * automatically when the injector is destroyed.
 *
 * @returns A read-only `Signal<ThemeState<T>>`.
 *
 * @example
 * ```ts
 * const state = injectTheme();
 * effect(() => console.log(state().mode));
 * ```
 *
 * @see {@link injectThemeRuntime}
 * @see {@link ThemeState}
 */
export function injectTheme<T extends ThemeDefinition = ThemeDefinition>(): Signal<ThemeState<T>> {
  const runtime = resolveRuntime<T>();
  const destroyRef = inject(DestroyRef);

  const state = signal<ThemeState<T>>({
    theme: runtime.store.get() as T,
    mode: runtime.selection.getMode(),
    family: runtime.selection.getFamily(),
    resolvedMode:
      runtime.store.get().meta?.mode === "dark" ? "dark" : "light",
    setMode: (m: ThemeMode) => runtime.selection.setMode(m),
    setFamily: (f: string) => runtime.selection.setFamily(f),
    toggleTheme: () => runtime.selection.toggleTheme(),
  });

  const unsub = runtime.store.subscribe((t) => {
    state.set({
      theme: t as T,
      mode: runtime.selection.getMode(),
      family: runtime.selection.getFamily(),
      resolvedMode: t.meta?.mode === "dark" ? "dark" : "light",
      setMode: state().setMode,
      setFamily: state().setFamily,
      toggleTheme: state().toggleTheme,
    });
  });

  destroyRef.onDestroy(unsub);

  return state.asReadonly();
}

/**
 * Injects the theme produced by `generateTheme()` and registered with the
 * provider, as a read-only signal.
 *
 * Resolves the registered theme that carries the generator's origin marker
 * (`meta.generation.kind === "generated"`); shipped presets never qualify. When
 * both halves of one `generateTheme()` call are registered, the signal tracks
 * the theme the active selection resolves to, and unsubscribes automatically
 * when the injector is destroyed.
 *
 * May be called from an Angular injection context.
 *
 * Throws `ThemeError` with code `TV_GENERATION_THEME_NOT_FOUND` when the provider
 * holds no generated theme, and `TV_GENERATION_THEME_AMBIGUOUS` when several are
 * registered and the active selection does not identify one.
 *
 * Re-resolves on every settled change to the registry, store, or selection; if
 * the generated theme is later removed, the same error is raised at the next
 * reactive read rather than a stale theme being returned.
 *
 * @returns A read-only `Signal<T>` holding the registered generated theme.
 * @throws {ThemeError} `TV_GENERATION_THEME_NOT_FOUND` when no generated theme is
 *   registered; `TV_GENERATION_THEME_AMBIGUOUS` when several are and the active
 *   selection does not identify one.
 *
 * @example
 * ```ts
 * const generated = injectGeneratedTheme();
 * effect(() => console.log(generated().name));
 * ```
 *
 * @see {@link injectTheme}
 */
export function injectGeneratedTheme<T extends ThemeDefinition = ThemeDefinition>(): Signal<T> {
  const runtime = resolveRuntime<T>();
  const destroyRef = inject(DestroyRef);
  const version = signal(0);

  // Eager initial resolution preserves the documented inject-time error contract.
  resolveGeneratedTheme<T>(runtime.themes as readonly T[], runtime.store.get() as T);

  // Lazy: recomputes when read after a bump, so a settled missing/ambiguous state
  // throws at the read (render) — never inside a subscription callback.
  const theme = computed<T>(() => {
    version();
    return resolveGeneratedTheme<T>(runtime.themes as readonly T[], runtime.store.get() as T);
  });

  // React to the registry too: a `runtime.use(pack)` install adds generated
  // themes without touching the store or selection.
  const bump = () => version.update((value) => value + 1);
  const unsubStore = runtime.store.subscribe(bump);
  const unsubRegistry = runtime.registry.subscribe(bump);
  destroyRef.onDestroy(() => {
    unsubStore();
    unsubRegistry();
  });

  return theme;
}

/**
 * Reactive state describing whether the runtime history can undo or redo.
 *
 * @see {@link injectThemeHistory}
 */
export interface ThemeHistoryState {
  /** Whether an undo is currently possible. */
  canUndo: boolean;
  /** Whether a redo is currently possible. */
  canRedo: boolean;
}

/**
 * Injects the runtime's history state and controls.
 *
 * May be called from an Angular injection context. Returns a read-only signal
 * of {@link ThemeHistoryState} plus `undo`, `redo`, and `clear` actions. The
 * signal updates on every theme change and unsubscribes automatically when the
 * injector is destroyed.
 *
 * @returns An object with a `history` signal and `undo`/`redo`/`clear` actions.
 *
 * @see {@link injectThemeTimeTravel}
 * @see {@link injectThemeBatch}
 */
export function injectThemeHistory<T extends ThemeDefinition = ThemeDefinition>() {
  const runtime = resolveRuntime<T>();
  const destroyRef = inject(DestroyRef);

  const state = signal<ThemeHistoryState>({
    canUndo: runtime.history.canUndo(),
    canRedo: runtime.history.canRedo(),
  });

  const unsub = runtime.store.subscribe(() => {
    state.set({
      canUndo: runtime.history.canUndo(),
      canRedo: runtime.history.canRedo(),
    });
  });

  destroyRef.onDestroy(unsub);

  return {
    history: state.asReadonly(),
    undo: () => runtime.history.undo(),
    redo: () => runtime.history.redo(),
    clear: () => runtime.history.clear(),
  };
}

/**
 * Injects a batch function that groups multiple selection changes into a
 * single history entry and notification.
 *
 * May be called from an Angular injection context.
 *
 * @returns A function that runs the given callback inside a runtime batch.
 *
 * @see {@link injectTheme}
 */
export function injectThemeBatch() {
  const runtime = resolveRuntime();
  return (callback: () => void) => runtime.batch(callback);
}

/**
 * Injects a function that captures a snapshot of the current runtime state.
 *
 * May be called from an Angular injection context.
 *
 * @returns A function returning a `ThemeRuntimeSnapshot` of the current state.
 *
 * @see {@link injectThemeRestore}
 */
export function injectThemeSnapshot() {
  const runtime = resolveRuntime();
  return () => runtime.snapshot() as ThemeRuntimeSnapshot;
}

/**
 * Injects a function that restores a previously captured runtime snapshot.
 *
 * May be called from an Angular injection context.
 *
 * @returns A function that restores the given snapshot into the runtime.
 *
 * @see {@link injectThemeSnapshot}
 */
export function injectThemeRestore() {
  const runtime = resolveRuntime();
  return (snapshot: ThemeRuntimeSnapshot) => runtime.restore(snapshot);
}

/**
 * Injects the runtime's history timeline and a jump action for time travel.
 *
 * May be called from an Angular injection context. Returns a read-only signal
 * of the full history entries plus a `jump` action that restores a given
 * history index. The signal updates on every theme change and unsubscribes
 * automatically when the injector is destroyed.
 *
 * @returns An object with a `history` signal and a `jump` action.
 *
 * @see {@link injectThemeHistory}
 */
export function injectThemeTimeTravel<T extends ThemeDefinition = ThemeDefinition>() {
  const runtime = resolveRuntime<T>();
  const destroyRef = inject(DestroyRef);

  const historySignal = signal<readonly HistoryEntry<T>[]>(runtime.history.getHistory());

  const unsub = runtime.store.subscribe(() => {
    historySignal.set(runtime.history.getHistory());
  });
  destroyRef.onDestroy(unsub);

  return {
    history: historySignal.asReadonly(),
    jump: (index: number) => runtime.history.jump(index),
  };
}

/**
 * Injects the runtime's lifecycle event emitter.
 *
 * May be called from an Angular injection context.
 *
 * @returns An object with an `on` method that subscribes to lifecycle events.
 *
 * @see {@link injectThemeRuntime}
 * @see {@link injectTheme}
 */
export function injectThemeLifecycle() {
  const runtime = resolveRuntime();
  return {
    on: (event: ThemeLifecycleEventName, listener: (data: unknown) => void) => runtime.lifecycle.on(event, listener),
  };
}

/**
 * Injects a function that applies a theme pack to the runtime.
 *
 * May be called from an Angular injection context.
 *
 * @returns A function that applies the given theme pack to the runtime.
 *
 * @see {@link injectThemeRuntime}
 * @see {@link injectTheme}
 */
export function injectThemePacks() {
  const runtime = resolveRuntime();
  return (pack: ThemePack<any>) => runtime.use(pack);
}

/**
 * Controller for the runtime's sunrise/sunset scheduling.
 *
 * Exposes a reactive signal of the schedule state plus `enable`, `disable`,
 * and `set` actions.
 *
 * @see {@link injectThemeSchedule}
 */
export interface ThemeScheduleController {
  /** Reactive `Signal` of the schedule state: `enabled`, `active`, `status`,
   *  `sunrise`, `sunset`, `nextTransition`, `nextActivation`,
   *  `nextDeactivation`. */
  state: Signal<ThemeScheduleState>;
  /** Turn the schedule on. Applies the correct light/dark theme immediately. */
  enable: () => void;
  /** Turn the schedule off. Leaves the current theme untouched. */
  disable: () => void;
  /** Reposition (latitude/longitude), reconfigure, or toggle enabled state. */
  set: (options: ThemeScheduleSetOptions) => void;
}

/**
 * Reactive access to the runtime's sunrise/sunset scheduling controller.
 * Returns `null` when the runtime was provided without the `scheduled` option.
 *
 * ```ts
 * const schedule = injectThemeSchedule();
 * schedule?.enable();
 * schedule?.disable();
 * schedule?.state().nextTransition;
 * ```
 *
 * @see {@link ThemeScheduleController}
 */
export function injectThemeSchedule<T extends ThemeDefinition = ThemeDefinition>(): ThemeScheduleController | null {
  const runtime = resolveRuntime<T>();
  const schedule = runtime.schedule ?? null;
  const destroyRef = inject(DestroyRef);

  const state = signal<ThemeScheduleState>(
    schedule?.state ?? EMPTY_THEME_SCHEDULE_STATE,
  );

  if (schedule) {
    const unsub = schedule.subscribe((next) => state.set(next));
    destroyRef.onDestroy(unsub);
  }

  if (!schedule) return null;

  return {
    state: state.asReadonly(),
    enable: () => schedule.enable(),
    disable: () => schedule.disable(),
    set: (options: ThemeScheduleSetOptions) => schedule.set(options),
  };
}
