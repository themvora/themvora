/**
 * Themvora Vue integration.
 *
 * Provides the `ThemeProvider`, `ThemeScope`, `ThemeScrollbar` and
 * `ThemeInspector` components, the `provideThemeRuntime` helper, the
 * `ThemeScheduleController`, the `useTheme*` composables, and the SSR
 * bootstrap-script helper.
 *
 * @packageDocumentation
 */
import type { App, InjectionKey, Component } from "vue";
import {
  createThemeRuntime,
  resolveRuntimeOptions,
  createCSSVariablesBinding,
  createDOMBinding,
  createScopedThemeBinding,
  resolveScopedThemePrePaint,
  resolveScopeTransition,
  createOverlayScrollbar,
  createPrePaintScrollbarScript,
  createThemeBootstrapScript,
  providedThemesSourceFor,
  normalizeProvidedThemes,
  EMPTY_THEME_SCHEDULE_STATE,
  resolveGeneratedTheme,
  type OverlayScrollbarOptions,
  type ThemeRuntime,
  type ThemeRuntimeOptions,
  type ThemeDefinition,
  type ThemeMode,
  type ScopedThemeSelection,
  type DOMBindingOptions,
  type CSSVariablesOptions,
  type ThemeLifecycleEventName,
  type ThemeTransitionOptions,
  type ThemeSchedule,
  type ThemeScheduleState,
  type ThemeScheduleSetOptions,
  type ThemeBootstrapScriptOptions,
  type ProvidedThemeFamily,
  type ThemeOverride,
} from "@themvora/core";
import {
  resolveIconOptions,
  resolveScrollbarOptions,
  type ScrollbarAppearanceOptions,
  type ScrollbarBehaviorOptions,
  type ScrollbarGroupedOptions,
  type ScrollbarIconOptions,
  type ScrollbarScopeOptions,
} from "@themvora/core";
import {
  provide,
  inject,
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  defineComponent,
  h,
  type PropType,
  type Ref,
} from "vue";

/**
 * Attach Vue's plugin `install` to a component **without erasing its type**.
 *
 * The obvious spelling is a cast:
 *
 * ```ts
 * defineComponent({ … }) as unknown as Component & { install(app: App): void }
 * ```
 *
 * and that is what this package used to do. It costs the props. `Component` is
 * Vue's props-less component type, so every editor — Volar in a `.vue` file
 * above all — saw `<ThemeProvider>` as a component that accepts no props and
 * offered only generic attributes. The components were correctly typed in
 * source and untyped in the one place it mattered.
 *
 * `Object.assign` returns `T & { install(…) }`, so the `DefineComponent` type
 * survives and prop completions work.
 *
 * @param component - The component to make installable.
 * @param name - The name to register it under.
 * @returns The same component, with `install` attached.
 */
function withInstall<T extends Component>(component: T, name: string) {
  return Object.assign(component, {
    install(app: App) {
      app.component(name, component);
    },
  });
}

/**
 * Props accepted by the Vue `<ThemeProvider>` component.
 *
 * Extends {@link ThemeRuntimeOptions} with an optional pre-built runtime. When
 * `runtime` is omitted, the provider creates and owns its own runtime from the
 * remaining props and destroys it on unmount.
 */
export interface ThemeProviderProps<T extends ThemeDefinition = ThemeDefinition>
  extends ThemeRuntimeOptions<T> {
  /**
   * An existing runtime to provide. When omitted, the provider creates and
   * owns a runtime from the other props.
   */
  runtime?: ThemeRuntime<T> | undefined;
}

/**
 * Vue `InjectionKey` used to provide and inject the active Themvora runtime.
 *
 * @see {@link provideThemeRuntime}
 * @see {@link useThemeRuntime}
 */
export const ThemeSymbol: InjectionKey<ThemeRuntime<any>> =
  Symbol("themvora");

/**
 * Provides a Themvora runtime to the current Vue component subtree.
 *
 * Call inside a component's `setup` scope (typically the app root) so
 * descendant composables can resolve it via {@link useThemeRuntime}.
 *
 * @param runtime The runtime to make available to the subtree.
 *
 * @see {@link useThemeRuntime}
 * @see {@link ThemeProvider}
 */
export function provideThemeRuntime<T extends ThemeDefinition>(
  runtime: ThemeRuntime<T>,
) {
  provide(ThemeSymbol, runtime);
}

/**
 * Resolves the active Themvora runtime from the Vue injection context.
 *
 * Call inside Vue `setup` scope, within a component that is a descendant of a
 * `<ThemeProvider>` (or after {@link provideThemeRuntime}).
 *
 * @returns The injected runtime.
 * @throws {Error} When no runtime has been provided in the current context.
 *
 * @example
 * ```ts
 * const runtime = useThemeRuntime();
 * runtime.selection.setMode("dark");
 * ```
 *
 * @see {@link provideThemeRuntime}
 * @see {@link ThemeProvider}
 * @see {@link useThemeValue}
 */
export function useThemeRuntime<T extends ThemeDefinition>() {
  const runtime = inject(ThemeSymbol) as ThemeRuntime<T> | undefined;
  if (!runtime) {
    throw new Error("useThemeRuntime must be used within a ThemeProvider");
  }
  return runtime;
}

/**
 * Reactive ref of the currently selected theme definition.
 *
 * Call inside Vue `setup` scope within a `<ThemeProvider>`. The returned ref
 * updates whenever the active theme changes and is cleaned up on unmount.
 *
 * @returns A `Ref` holding the active theme.
 *
 * @see {@link useTheme}
 * @see {@link useThemeTokens}
 */
export function useThemeValue<T extends ThemeDefinition>() {
  const runtime = useThemeRuntime<T>();
  const theme: Ref<T> = ref(runtime.store.get()) as Ref<T>;

  onMounted(() => {
    const unsub = runtime.store.subscribe((t) => {
      theme.value = t as T;
    });
    onUnmounted(unsub);
  });

  return theme;
}

/**
 * Reactive ref of the themes this provider was given, grouped by family.
 *
 * Returns exactly the collection supplied to the nearest `<ThemeProvider>` —
 * not the built-in catalog, and not every theme in the project. The ref updates
 * when the provider's `themes` prop changes, when a theme pack is installed, or
 * when the registry is mutated, and it is cleaned up on unmount.
 *
 * ```vue
 * <script setup>
 * const families = useProvidedThemes();
 * </script>
 *
 * <template>
 *   <section v-for="family in families" :key="family.id">
 *     <h3>{{ family.name }}</h3>
 *     <button v-for="variant in family.variants" :key="variant.name">
 *       {{ variant.mode }}
 *     </button>
 *   </section>
 * </template>
 * ```
 *
 * @typeParam T - The theme definition type used by the application.
 * @returns A ref holding the provider's theme families, in supplied order.
 *
 * @see {@link useTheme}
 */
export function useProvidedThemes<T extends ThemeDefinition>() {
  const runtime = useThemeRuntime<T>();
  const source = providedThemesSourceFor(runtime);
  const families = ref<readonly ProvidedThemeFamily<T>[]>(
    source.get() as readonly ProvidedThemeFamily<T>[],
  ) as Ref<readonly ProvidedThemeFamily<T>[]>;

  onMounted(() => {
    families.value = source.get() as readonly ProvidedThemeFamily<T>[];
    const unsub = source.subscribe(() => {
      families.value = source.get() as readonly ProvidedThemeFamily<T>[];
    });
    onUnmounted(unsub);
  });

  return families;
}

/**
 * Reactive ref of the active theme's token group.
 *
 * Call inside Vue `setup` scope within a `<ThemeProvider>`. The returned ref
 * updates as the active theme changes and is cleaned up on unmount.
 *
 * @returns A `Ref` holding the active theme's tokens, or `undefined` when the
 *   theme defines none.
 *
 * @see {@link useThemeValue}
 */
export function useThemeTokens<T extends ThemeDefinition>() {
  const runtime = useThemeRuntime<T>();
  const tokens: Ref<import("@themvora/core").ThemeTokens | undefined> = ref(runtime.store.get().tokens);

  onMounted(() => {
    const unsub = runtime.store.subscribe((t) => {
      tokens.value = t.tokens;
    });
    onUnmounted(unsub);
  });

  return tokens;
}

/**
 * Reactive ref of the theme produced by `generateTheme()` and registered with
 * the provider.
 *
 * Resolves the registered theme that carries the generator's origin marker
 * (`meta.generation.kind === "generated"`); shipped presets never qualify. When
 * both halves of one `generateTheme()` call are registered, the ref tracks the
 * theme the active selection resolves to and updates on selection changes.
 *
 * Call inside a Vue `setup` scope within a `<ThemeProvider>`.
 *
 * Throws `ThemeError` with code `TV_GENERATION_THEME_NOT_FOUND` when the provider
 * holds no generated theme, and `TV_GENERATION_THEME_AMBIGUOUS` when several are
 * registered and the active selection does not identify one.
 *
 * Re-resolves on every settled change to the registry, store, or selection; if
 * the generated theme is later removed, the same error is raised at the next
 * reactive read rather than a stale theme being returned.
 *
 * @returns A `Ref` holding the registered generated theme.
 * @throws {ThemeError} `TV_GENERATION_THEME_NOT_FOUND` when no generated theme is
 *   registered; `TV_GENERATION_THEME_AMBIGUOUS` when several are and the active
 *   selection does not identify one.
 *
 * @see {@link useThemeValue}
 */
export function useGeneratedTheme<T extends ThemeDefinition>(): Ref<T> {
  const runtime = useThemeRuntime<T>();
  const version = ref(0);

  // Eager initial resolution preserves the documented setup-time error contract.
  resolveGeneratedTheme<T>(runtime.themes as readonly T[], runtime.store.get() as T);

  // Lazy: the getter re-runs when the consumer reads `theme.value` (render), so
  // a settled missing/ambiguous state throws there — never inside a subscription
  // callback. `version` is bumped at each transaction boundary.
  const theme = computed<T>(() => {
    void version.value;
    return resolveGeneratedTheme<T>(runtime.themes as readonly T[], runtime.store.get() as T);
  });

  onMounted(() => {
    // React to the registry too: a `runtime.use(pack)` install adds generated
    // themes without touching the store or selection.
    const bump = () => {
      version.value += 1;
    };
    const unsubStore = runtime.store.subscribe(bump);
    const unsubRegistry = runtime.registry.subscribe(bump);
    onUnmounted(() => {
      unsubStore();
      unsubRegistry();
    });
  });

  return theme as Ref<T>;
}

/**
 * Reactive ref of the current theme mode (`system`, `light`, or `dark`).
 *
 * Call inside Vue `setup` scope within a `<ThemeProvider>`. The returned ref
 * tracks both store and selection changes and is cleaned up on unmount.
 *
 * @returns A `Ref` holding the current mode.
 *
 * @see {@link useThemeFamily}
 * @see {@link useTheme}
 */
export function useThemeMode() {
  const runtime = useThemeRuntime();
  const mode: Ref<ThemeMode> = ref(runtime.selection.getMode());

  onMounted(() => {
    const unsubStore = runtime.store.subscribe(() => {
      mode.value = runtime.selection.getMode();
    });
    const unsubSelection = runtime.selection.subscribe
      ? runtime.selection.subscribe((s) => {
          mode.value = s.mode;
        })
      : () => {};
    onUnmounted(() => {
      unsubStore();
      unsubSelection();
    });
  });

  return mode;
}

/**
 * Reactive ref of the mode actually **applied** — `"light"` or `"dark"`, never
 * `"system"`.
 *
 * Render this when a control states the current appearance. {@link useThemeMode}
 * reports what the visitor asked for, which does not move at a sunrise/sunset
 * transition and stays `"system"` for as long as that choice stands — so a label
 * bound to it kept announcing the old mode while the page changed colour.
 *
 * Call inside Vue `setup` scope within a `<ThemeProvider>`. Subscribes to the
 * appearance (store and effective-selection channels) and is cleaned up on
 * unmount.
 *
 * @returns A `Ref` holding the applied mode.
 *
 * @see {@link useThemeMode}
 * @see {@link useThemeSchedule}
 */
export function useEffectiveThemeMode(): Ref<"light" | "dark"> {
  const runtime = useThemeRuntime();
  const mode: Ref<"light" | "dark"> = ref(runtime.selection.getEffectiveMode());

  onMounted(() => {
    const sync = () => {
      mode.value = runtime.selection.getEffectiveMode();
    };
    const unsubStore = runtime.store.subscribe(sync);
    const unsubEffective = runtime.selection.subscribeEffective(sync);
    onUnmounted(() => {
      unsubStore();
      unsubEffective();
    });
  });

  return mode;
}

/**
 * Reactive ref of the current theme family.
 *
 * Call inside Vue `setup` scope within a `<ThemeProvider>`. The returned ref
 * tracks both store and selection changes and is cleaned up on unmount.
 *
 * @returns A `Ref` holding the current theme family.
 *
 * @see {@link useThemeMode}
 * @see {@link useTheme}
 */
export function useThemeFamily() {
  const runtime = useThemeRuntime();
  const family: Ref<string> = ref(runtime.selection.getFamily());

  onMounted(() => {
    const unsubStore = runtime.store.subscribe(() => {
      family.value = runtime.selection.getFamily();
    });
    const unsubSelection = runtime.selection.subscribe
      ? runtime.selection.subscribe((s) => {
          family.value = s.family;
        })
      : () => {};
    onUnmounted(() => {
      unsubStore();
      unsubSelection();
    });
  });

  return family;
}

/**
 * Reactive access to the active theme, mode, and family plus selection
 * controls.
 *
 * Call inside Vue `setup` scope within a `<ThemeProvider>`. Returns reactive
 * refs for `theme`, `mode`, and `family`, along with `setMode`, `setFamily`,
 * and `toggleTheme` helpers that operate on the runtime's selection.
 *
 * @returns An object of reactive state and selection helpers.
 *
 * @example
 * ```ts
 * const { theme, mode, family, setMode, toggleTheme } = useTheme();
 * ```
 *
 * @see {@link useThemeValue}
 * @see {@link useThemeMode}
 * @see {@link useEffectiveThemeMode}
 * @see {@link useThemeFamily}
 */
export function useTheme<T extends ThemeDefinition>() {
  const runtime = useThemeRuntime<T>();

  const theme: Ref<T> = ref(runtime.store.get()) as Ref<T>;
  const mode: Ref<ThemeMode> = ref(runtime.selection.getMode());
  const effectiveMode: Ref<"light" | "dark"> = ref(
    runtime.selection.getEffectiveMode(),
  );
  const family: Ref<string> = ref(runtime.selection.getFamily());

  let unsubTheme: (() => void) | null = null;
  let unsubSelection: (() => void) | null = null;
  let unsubEffective: (() => void) | null = null;

  onMounted(() => {
    unsubTheme = runtime.store.subscribe((t) => {
      theme.value = t as T;
      effectiveMode.value = runtime.selection.getEffectiveMode();
    });
    if (runtime.selection.subscribe) {
      unsubSelection = runtime.selection.subscribe((s) => {
        mode.value = s.mode;
        family.value = s.family;
      });
    }
    unsubEffective = runtime.selection.subscribeEffective(() => {
      effectiveMode.value = runtime.selection.getEffectiveMode();
    });
  });

  onUnmounted(() => {
    unsubTheme?.();
    unsubSelection?.();
    unsubEffective?.();
  });

  function setMode(nextMode: ThemeMode) {
    runtime.selection.setMode(nextMode);
  }

  function setFamily(nextFamily: string) {
    runtime.selection.setFamily(nextFamily);
  }

  function toggleTheme() {
    runtime.selection.toggleTheme();
  }

  return {
    theme,
    mode,
    effectiveMode,
    family,
    setMode,
    setFamily,
    toggleTheme,
  };
}

/**
 * Reactive access to the runtime's theme history (undo/redo).
 *
 * Call inside Vue `setup` scope within a `<ThemeProvider>`. Returns reactive
 * `canUndo`, `canRedo`, and `history` refs plus `undo`, `redo`, `clear`, and
 * `jump` actions that operate on the runtime's history.
 *
 * @returns An object of reactive history state and actions.
 *
 * @see {@link useThemeSnapshot}
 * @see {@link useThemeRestore}
 * @see {@link useThemeBatch}
 */
export function useThemeHistory<T extends ThemeDefinition>() {
  const runtime = useThemeRuntime<T>();

  const canUndo: Ref<boolean> = ref(runtime.history.canUndo());
  const canRedo: Ref<boolean> = ref(runtime.history.canRedo());
  const history = ref<readonly import("@themvora/core").HistoryEntry<T>[]>(runtime.history.getHistory());

  onMounted(() => {
    const unsub = runtime.store.subscribe(() => {
      canUndo.value = runtime.history.canUndo();
      canRedo.value = runtime.history.canRedo();
      history.value = runtime.history.getHistory();
    });
    onUnmounted(unsub);
  });

  function undo() {
    runtime.history.undo();
  }

  function redo() {
    runtime.history.redo();
  }

  function clear() {
    runtime.history.clear();
  }

  function jump(index: number) {
    runtime.history.jump(index);
  }

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    jump,
    history,
  };
}

/**
 * Returns a function that batches multiple runtime mutations into a single
 * history entry and notification.
 *
 * Call inside Vue `setup` scope within a `<ThemeProvider>`.
 *
 * @returns A batch function taking a callback to run inside the batch.
 *
 * @see {@link useThemeSnapshot}
 * @see {@link useTheme}
 */
export function useThemeBatch() {
  const runtime = useThemeRuntime();
  return (callback: () => void) => runtime.batch(callback);
}

/**
 * Returns a function that captures a serializable snapshot of the runtime's
 * current state.
 *
 * Call inside Vue `setup` scope within a `<ThemeProvider>`.
 *
 * @returns A function returning the current runtime snapshot.
 *
 * @see {@link useThemeRestore}
 */
export function useThemeSnapshot() {
  const runtime = useThemeRuntime();
  return () => runtime.snapshot();
}

/**
 * Returns a function that restores the runtime to a previously captured
 * snapshot.
 *
 * Call inside Vue `setup` scope within a `<ThemeProvider>`.
 *
 * @returns A function taking a snapshot to restore.
 *
 * @see {@link useThemeSnapshot}
 */
export function useThemeRestore() {
  const runtime = useThemeRuntime();
  return (snapshot: import("@themvora/core").ThemeRuntimeSnapshot) => runtime.restore(snapshot);
}

/**
 * Returns an object for subscribing to runtime lifecycle events.
 *
 * Call inside Vue `setup` scope within a `<ThemeProvider>`.
 *
 * @returns An object with an `on` method to register a lifecycle listener.
 *
 * @see {@link useThemeRuntime}
 * @see {@link useTheme}
 */
export function useThemeLifecycle() {
  const runtime = useThemeRuntime();
  return {
    on: (event: ThemeLifecycleEventName, listener: (data: unknown) => void) => runtime.lifecycle.on(event, listener),
  };
}

/**
 * Returns a function that installs a theme pack onto the runtime.
 *
 * Call inside Vue `setup` scope within a `<ThemeProvider>`.
 *
 * @returns A function taking a theme pack to install.
 *
 * @see {@link useThemeRuntime}
 * @see {@link useTheme}
 */
export function useThemePacks() {
  const runtime = useThemeRuntime();
  return (pack: import("@themvora/core").ThemePack<any>) => runtime.use(pack);
}

/**
 * Controller returned by {@link useThemeSchedule} for the runtime's
 * sunrise/sunset scheduling engine.
 *
 * @see {@link useThemeRuntime}
 */
export interface ThemeScheduleController {
  /** The underlying controller (`null` when the provider has no `scheduled`
   *  option). Methods below are safe no-ops in that case. */
  schedule: ThemeSchedule | null;
  /** Reactive state snapshot: `enabled`, `active`, `status`, `sunrise`,
   *  `sunset`, `nextTransition`, `nextActivation`, `nextDeactivation`. */
  state: Ref<ThemeScheduleState>;
  /** Enables the schedule engine. */
  enable: () => void;
  /** Disables the schedule engine. */
  disable: () => void;
  /** Updates the schedule configuration. */
  set: (options: ThemeScheduleSetOptions) => void;
}

/**
 * Reactive access to the runtime's sunrise/sunset scheduling controller.
 *
 * Requires the runtime (or `<ThemeProvider>`) to be created with the
 * `scheduled` option. The returned `state` ref tracks `enabled`, `status`,
 * `active`, `sunrise`/`sunset` and the next transition; `enable()`/`disable()`
 * /`set()` control the engine.
 *
 * ```vue
 * <script setup lang="ts">
 * const schedule = useThemeSchedule();
 * </script>
 * ```
 */
export function useThemeSchedule<T extends ThemeDefinition = ThemeDefinition>(): ThemeScheduleController {
  const runtime = useThemeRuntime<T>();
  const schedule = runtime.schedule ?? null;

  // The schedule state is resolved per-visitor on the client (timezone
  // auto-detection and auto-derived themes), so it can differ between the
  // server render and the hydrated client. Hydrate with the stable empty
  // snapshot and let the subscription fill in the real state after mount —
  // this keeps SSR HTML deterministic and avoids a hydration mismatch.
  const state: Ref<ThemeScheduleState> = ref(EMPTY_THEME_SCHEDULE_STATE);

  onMounted(() => {
    if (!schedule) return;
    state.value = schedule.state;
    const unsub = schedule.subscribe((next) => {
      state.value = next;
    });
    onUnmounted(unsub);
  });

  return {
    schedule,
    state,
    enable: () => schedule?.enable(),
    disable: () => schedule?.disable(),
    set: (options: ThemeScheduleSetOptions) => schedule?.set(options),
  };
}

interface Props extends Record<string, any> {
  runtime?: ThemeRuntime<any> | undefined;
  themes?: ThemeDefinition[];
  defaultTheme?: string;
  themeOverride?: ThemeOverride<string>;
  initialMode?: ThemeMode;
  initialFamily?: string;
  persistence?: any;
  broadcast?: any;
  view?: Window;
  readPersistenceOnInit?: boolean;
  dom?: false | DOMBindingOptions;
  cssVariables?: false | CSSVariablesOptions;
  transition?: boolean | ThemeTransitionOptions;
  scheduled?: false | import("@themvora/core").ScheduledThemeOptions<ThemeDefinition>;
}

/**
 * Build the blocking zero-flash `<head>` script for a Vue app (SSR or SPA).
 *
 * Inlines core's `createThemeBootstrapScript` with the Vue defaults
 * (`storageKey: "theme-selection"`, `prefix: "theme-"` — the same values the
 * Vue `ThemeProvider` persistence and CSS variables use), so the persisted
 * theme is applied before first paint. Emit the returned string as a
 * blocking `<script>` inside `<head>`.
 *
 * @see `buildThemeCssMap`
 */
export function createVueThemeBootstrapScript<T extends ThemeDefinition>(
  options: ThemeBootstrapScriptOptions<T>,
): string {
  return createThemeBootstrapScript(options);
}

const ThemeProviderBase = defineComponent({
  name: "ThemeProvider",
  inheritAttrs: false,
  props: {
    runtime: { type: Object, required: false, default: undefined },
    themes: { type: Array, required: false },
    defaultTheme: { type: String, required: false },
    themeOverride: { type: [String, Object], required: false, default: undefined },
    initial: { type: Object, required: false, default: undefined },
    initialMode: { type: String, required: false },
    initialFamily: { type: String, required: false },
    persistence: { type: Object, required: false },
    broadcast: { type: Object, required: false },
    view: { type: Object, required: false },
    // `default: undefined` (not Vue's implicit `false` for Boolean props) is
    // deliberate: an absent prop must stay `undefined` so `createThemeRuntime`
    // falls back to its own `readPersistenceOnInit ?? true` default and reads
    // the persisted selection on init. Without this, Vue coerces the absent
    // Boolean prop to `false`, silently disabling on-init persistence restore.
    readPersistenceOnInit: { type: Boolean, required: false, default: undefined },
    dom: { type: [Boolean, Object], required: false, default: undefined },
    cssVariables: { type: [Boolean, Object], required: false, default: undefined },
    transition: { type: [Boolean, Object], required: false, default: undefined },
    scheduled: { type: [Boolean, Object], required: false, default: undefined },
  },
  setup(props: Props, { slots }) {
    const ownsRuntime = !props.runtime;
    const runtimeRef = ref<ThemeRuntime<any> | null>(props.runtime ?? null);

    if (ownsRuntime && !runtimeRef.value) {
      const { runtime, dom, cssVariables, ...coreOptions } = props;
      // Merges the configuration a build integration transported under these
      // props, so a provider with no `themes` still has a registry. Undefined
      // props are dropped by the helper — Vue hands us every declared prop, so
      // an absent one would otherwise clobber the transported value.
      runtimeRef.value = createThemeRuntime({
        ...resolveRuntimeOptions(coreOptions),
        dom: false,
        cssVariables: false,
      } as any);
    }

    const resolvedRuntime = runtimeRef.value! as any;

    provide(ThemeSymbol, resolvedRuntime);

    // See the React provider: once this provider has supplied `themeOverride` it
    // owns the input and must report its removal, or the runtime never learns the
    // prop went away.
    let overrideSupplied = props.themeOverride !== undefined;

    // Live configuration: forward changed props to the runtime, which
    // re-resolves centrally and no-ops when nothing relevant changed. Only
    // *supplied* props are forwarded, so an absent prop cannot reset a value the
    // runtime was created with.
    watch(
      () =>
        [
          props.themes,
          props.defaultTheme,
          props.themeOverride,
          props.initialFamily,
          props.initialMode,
          props.initial,
          props.transition,
          props.scheduled,
        ] as const,
      () => {
        const update: Record<string, unknown> = {};
        if (props.themes !== undefined) update.themes = props.themes;
        if (props.defaultTheme !== undefined) update.defaultTheme = props.defaultTheme;
        if (props.themeOverride !== undefined) overrideSupplied = true;
        if (overrideSupplied) update.themeOverride = props.themeOverride;
        if (props.initialFamily !== undefined) update.initialFamily = props.initialFamily;
        if (props.initialMode !== undefined) update.initialMode = props.initialMode;
        if (props.initial !== undefined) update.initial = props.initial;
        if (props.transition !== undefined) update.transition = props.transition;
        if (props.scheduled !== undefined) update.scheduled = props.scheduled;

        // The runtime owns validation/comparison; an identity change on
        // `runtime.transition` means the new value was applied, so the
        // provider's own bindings (created on mount) are pushed it too.
        const transitionBefore = resolvedRuntime.transition;
        resolvedRuntime.configure(update);
        if (resolvedRuntime.transition !== transitionBefore) {
          domBinding?.setTransition?.(resolvedRuntime.transition);
          cssBinding?.setTransition?.(resolvedRuntime.transition);
        }
      },
      { flush: "post" },
    );

    let domBinding: {
      apply(theme: any, emitOptions?: any): void;
      setTransition?(transition: any): void;
      destroy(): void;
    } | null = null;
    let cssBinding: { setTransition?(transition: any): void; destroy(): void } | null = null;

    onMounted(() => {
      const domOpts = props.dom;
      const cssOpts = props.cssVariables;

      // Flash-proofing: inject a blocking bootstrap script that reads the
      // persisted selection and applies the theme before first paint.
      if (
        ownsRuntime &&
        typeof document !== "undefined" &&
        document.head &&
        props.persistence !== null &&
        props.themes?.length &&
        !document.getElementById("themvora-bootstrap")
      ) {
        const bootstrap = createThemeBootstrapScript({
          themes: props.themes as any,
          ...(props.defaultTheme !== undefined ? { defaultTheme: props.defaultTheme } : {}),
          ...(props.initialMode !== undefined ? { initialMode: props.initialMode } : {}),
          ...(props.initialFamily !== undefined ? { initialFamily: props.initialFamily } : {}),
          ...(props.themeOverride !== undefined ? { themeOverride: props.themeOverride } : {}),
        });
        if (bootstrap) {
          const script = document.createElement("script");
          script.id = "themvora-bootstrap";
          script.textContent = bootstrap;
          document.head.appendChild(script);
        }
      }

      // Resolve the transition config the same way the React provider does.
      const transitionOption = props.transition;
      const resolvedTransition =
        transitionOption === undefined
          ? undefined
          : typeof transitionOption === "object"
            ? transitionOption
            : transitionOption === true
              ? {}
              : { enabled: false };

      const cssBindingDrivesDom =
        cssOpts !== false &&
        (cssOpts === undefined || cssOpts.styleSheet !== true);

      if (domOpts !== false) {
        domBinding = createDOMBinding(resolvedRuntime.store, {
          ...(domOpts !== undefined ? (domOpts as DOMBindingOptions) : {}),
          // When the CSS binding is present and applying inline variables, it
          // drives the DOM updates inside its single View Transition lightswitch
          // via `onBeforeSwap`. Subscribing here too would fire a second,
          // competing `startViewTransition`. Otherwise the DOM binding owns its
          // updates.
          subscribe: !cssBindingDrivesDom,
          ...(resolvedTransition !== undefined
            ? { transition: resolvedTransition }
            : {}),
        });
      }

      if (cssOpts !== false) {
        cssBinding = createCSSVariablesBinding(resolvedRuntime.store, {
          ...(cssOpts !== undefined ? (cssOpts as CSSVariablesOptions) : {}),
          ...(resolvedTransition !== undefined
            ? { transition: resolvedTransition }
            : {}),
          ...(domBinding ? { onBeforeSwap: domBinding.apply } : {}),
        });
      }
    });

    onUnmounted(() => {
      domBinding?.destroy();
      cssBinding?.destroy();

      if (ownsRuntime && resolvedRuntime) {
        resolvedRuntime.destroy();
      }
    });

    return () => slots.default?.();
  },
});

/**
 * Vue component that provides a Themvora runtime to its subtree and applies
 * the active theme to the DOM.
 *
 * Renders only its default slot (no wrapper element). When no `runtime` prop
 * is given, it creates and owns a runtime from the other props, injects a
 * blocking zero-flash bootstrap script, and binds DOM/CSS variables on mount.
 * The owned runtime is destroyed on unmount. Can be registered globally via
 * `app.use(ThemeProvider)`.
 *
 * @remarks
 * SSR-safe: the runtime is created in `setup` and DOM/CSS bindings are applied
 * only in `onMounted`, so server rendering produces deterministic markup.
 *
 * @example
 * ```vue
 * <ThemeProvider :themes="themes" default-theme="light">
 *   <App />
 * </ThemeProvider>
 * ```
 *
 * @see {@link ThemeProviderProps}
 * @see {@link useThemeRuntime}
 * @see {@link ThemeScope}
 */
export const ThemeProvider = withInstall(ThemeProviderBase, "ThemeProvider");


/**
 * Props accepted by the Vue `<ThemeScope>` component.
 */
export interface ThemeScopeProps {
  /** Exact theme name or family name. When `family`/`mode` are also set,
   *  `theme` wins. Omit to follow the provider's selection inside a boundary. */
  theme?: string;
  /** Theme family for the scoped subtree. Without `mode`, follows the
   *  provider's current mode. */
  family?: string;
  /** Mode for a family-based scope. Defaults to the provider's current mode. */
  mode?: ThemeMode;
  /** Local theme definitions — resolved first, parent registry falls back.
   *  No second runtime is created. */
  themes?: readonly ThemeDefinition[];
  /** Transition for this scope. `undefined` inherits the provider's,
   *  `false` disables it, an object is merged over the provider config. */
  transition?: boolean | ThemeTransitionOptions;
}

let scopeIdCounter = 0;

const ThemeScopeBase = defineComponent({
  name: "ThemeScope",
  props: {
    theme: { type: String, required: false, default: undefined },
    family: { type: String, required: false, default: undefined },
    mode: { type: String as PropType<ThemeMode>, required: false, default: undefined },
    themes: { type: Array as PropType<readonly ThemeDefinition[]>, required: false, default: undefined },
    transition: {
      type: [Boolean, Object] as PropType<boolean | ThemeTransitionOptions>,
      default: undefined,
    },
  },
  slots: Object as any,
  setup(props, { slots }) {
    const runtime = useThemeRuntime();
    const elRef = ref<HTMLDivElement | null>(null);
    let binding: ReturnType<typeof createScopedThemeBinding> | null = null;
    const scopeId = `scope-${scopeIdCounter++}`;
    const prePaint = resolveScopedThemePrePaint(
      [...(props.themes ?? []), ...runtime.themes],
      toSelection(),
      { selector: `[data-v-tv-scope="${scopeId}"]` },
    );

    function effectiveMode(): ThemeMode {
      if (props.mode != null) return props.mode;
      return runtime.selection.getMode();
    }

    function toSelection(): ScopedThemeSelection {
      if (props.theme != null) return props.theme;
      if (props.family != null) {
        return { family: props.family, mode: effectiveMode() };
      }
      return { family: runtime.selection.getFamily() ?? "default", mode: runtime.selection.getMode() };
    }

    function createBinding() {
      const transition = resolveScopeTransition(runtime.transition, props.transition);
      binding = createScopedThemeBinding(runtime.themes, elRef.value!, toSelection(), {
        ...(props.themes != null ? { localThemes: props.themes } : {}),
        ...(transition != null ? { transition } : {}),
      });
    }

    // Create the binding once mounted so `elRef.value` is available — a watch
    // with `immediate: true` runs during setup, before the element exists, and
    // would never create the binding. Selection changes run through the
    // binding's diff → plan → animate pipeline (no rebuild), while
    // transition/local-theme config changes are swapped on the live binding.
    onMounted(() => {
      if (binding == null) createBinding();
    });

    watch(
      () => [props.theme, props.family, props.mode, props.transition, props.themes] as const,
      () => {
        if (!elRef.value) return;
        if (binding == null) {
          createBinding();
          return;
        }
        binding.setTransition(resolveScopeTransition(runtime.transition, props.transition));
        binding.setLocalThemes(props.themes);
        binding.update(toSelection());
      },
      { flush: "post" },
    );

    // Follow the provider's mode for family/boundary scopes.
    //
    // A subscription rather than a `watch` on `selection.getMode()`: that
    // getter reads plain runtime state, so Vue had nothing reactive to track
    // and the scope never flipped when the mode changed. The store is the one
    // signal every other adapter uses for the same job.
    //
    // `toSelection()` already carries the effective mode, so it is forwarded
    // as-is: a selection that pins its own mode re-resolves to the same theme,
    // which is cheaper than guarding on it.
    const unsubscribeStore = runtime.store.subscribe(() => {
      if (props.theme != null) return;
      binding?.update(toSelection());
    });

    // Follow the provider's catalog. A `themes` change that preserves the
    // active theme never reaches the store subscription above, so without this
    // the scope keeps rendering a theme the runtime has dropped.
    const unsubscribeThemes = runtime.registry.subscribe(() => {
      binding?.refresh();
    });

    onUnmounted(() => {
      unsubscribeStore();
      unsubscribeThemes();
      binding?.destroy();
    });

    return () =>
      h(
        "div",
        {
          ref: elRef,
          "data-v-tv-scope": scopeId,
          ...(prePaint.systemBased ? {} : { style: prePaint.lightVariables }),
        },
        [prePaint.css ? h("style", { innerHTML: prePaint.css }) : null, slots.default?.()],
      );
  },
});

/**
 * Vue component that applies a scoped theme to its subtree.
 *
 * Renders a `div` wrapper carrying a `data-v-tv-scope` attribute and applies
 * the resolved theme's CSS variables to that element, overriding the
 * provider's selection for the subtree. Supports an exact theme, a theme
 * family, local theme definitions, and per-scope transitions. Can be
 * registered globally via `app.use(ThemeScope)`.
 *
 * @remarks
 * The scope follows the provider's mode for family/boundary scopes and
 * re-applies when the provider's selection changes. Local themes are resolved
 * first, falling back to the parent registry; no second runtime is created.
 *
 * @example
 * ```vue
 * <ThemeScope family="brand" mode="dark">
 *   <Dashboard />
 * </ThemeScope>
 * ```
 *
 * @see {@link ThemeScopeProps}
 * @see {@link useTheme}
 */
export const ThemeScope = withInstall(ThemeScopeBase, "ThemeScope");

/**
 * Props accepted by the Vue `<ThemeScrollbar>` component.
 *
 * Extends {@link OverlayScrollbarOptions} with an optional custom element tag.
 */
export interface ThemeScrollbarProps extends ScrollbarGroupedOptions {
  /** Arrow button icons: the arrow entry covers all four directions
   *  (per-direction entries win), plus the shared glyph size in CSS px. */
  icons?: ScrollbarIconOptions<string>;
  /**
   * The element tag to apply the overlay scrollbar to. Defaults to the
   * provider's scroll container.
   */
  tag?: string;
}

function pickDefined(prefs: ThemeScrollbarProps): OverlayScrollbarOptions {
  // The public API is the groups; the icons group maps onto the engine's
  // arrow options. A flat option is no longer part of the surface.
  return {
    ...resolveScrollbarOptions({
      behavior: prefs.behavior,
      appearance: prefs.appearance,
      scope: prefs.scope,
    }),
    ...resolveIconOptions(prefs.icons),
  };
}

const ThemeScrollbarBase = defineComponent({
  name: "ThemeScrollbar",
  props: {
    // Grouped settings (canonical). A flat option wins over its group.
    behavior: { type: Object, required: false, default: undefined },
    appearance: { type: Object, required: false, default: undefined },
    scope: { type: Object, required: false, default: undefined },
    icons: { type: Object, required: false, default: undefined },
  },
  setup(props: ThemeScrollbarProps) {
    const runtime = useThemeRuntime();
    let handle: { destroy(): void } | null = null;

    // Phase 1 — hide the native scrollbar before the first paint. `setup` runs
    // synchronously during mount (before the browser paints the app), so the
    // blocking script's `tv-scrollbar` class + <style> are in place before the
    // native bar could ever render — the custom overlay is the only scrollbar
    // from the first frame (matching the Next.js/Nuxt SSR experience).
    // Idempotent: when the Vite plugin or an SSR adapter already emitted it,
    // this no-ops.
    if (typeof document !== "undefined" && document.head) {
      if (!document.getElementById("tv-scrollbar-style")) {
        const script = document.createElement("script");
        script.textContent = createPrePaintScrollbarScript();
        document.head.appendChild(script);
      }
    }

    onMounted(() => {
      handle = createOverlayScrollbar(runtime.store as any, pickDefined(props));
    });

    // The engine resolves its options once, when the overlay is created, so a
    // changed prop only takes effect if the overlay is rebuilt — otherwise the
    // new value is ignored until the page is reloaded.
    watch(
      () => JSON.stringify(pickDefined(props)),
      () => {
        if (!handle) return; // not mounted yet; onMounted uses the latest props
        handle.destroy();
        handle = createOverlayScrollbar(runtime.store as any, pickDefined(props));
      },
    );

    onUnmounted(() => {
      handle?.destroy();
      handle = null;
    });

    return () => null;
  },
});

/**
 * Vue component that replaces the native scrollbar with a themed overlay
 * scrollbar.
 *
 * Renders nothing (returns `null`) and instead installs an overlay scrollbar
 * on the target element (see {@link ThemeScrollbarProps.tag}) once mounted.
 * Injects the pre-paint hiding CSS synchronously during `setup` so the native
 * bar never flashes. Can be registered globally via `app.use(ThemeScrollbar)`.
 *
 * @remarks
 * The pre-paint injection is idempotent: when the Vite plugin or an SSR
 * adapter already emitted it, this no-ops.
 *
 * @example
 * ```vue
 * <ThemeScrollbar :thickness="10" hover-expand />
 * ```
 *
 * @see {@link ThemeScrollbarProps}
 * @see {@link ThemeProvider}
 */
export const ThemeScrollbar = withInstall(ThemeScrollbarBase, "ThemeScrollbar");

// ── ThemeInspector ──────────────────────────────────────────────────────────

import { ThemvoraInspector } from "@themvora/web";

/**
 * Props accepted by the Vue `<ThemeInspector>` component.
 */
export interface ThemeInspectorProps {
  /** Distance from the bottom of the viewport, in px. Default 104. */
  bottom?: number;
  /** Distance from the right edge of the viewport, in px. Default 32. */
  right?: number;
  /** Toggle button size, in px. Default 40. */
  size?: number;
  /** Z-index for the floating toggle and panel. Default 9999. */
  zIndex?: number;
}

const ThemeInspectorBase = defineComponent({
  name: "ThemeInspector",
  props: {
    bottom: { type: Number, required: false, default: undefined },
    right: { type: Number, required: false, default: undefined },
    size: { type: Number, required: false, default: undefined },
    zIndex: { type: Number, required: false, default: undefined },
  },
  setup(props) {
    onMounted(() => ThemvoraInspector.define());
    return () =>
      h("themvora-inspector", {
        ...(props.bottom != null ? { bottom: String(props.bottom) } : {}),
        ...(props.right != null ? { right: String(props.right) } : {}),
        ...(props.size != null ? { size: String(props.size) } : {}),
        ...(props.zIndex != null ? { "z-index": String(props.zIndex) } : {}),
      });
  },
});

/**
 * Vue component that renders the framework-agnostic Theme Inspector.
 *
 * Renders a `<themvora-inspector>` custom element (defined on mount) that
 * shows a floating toggle opening a panel inspecting the active theme —
 * identity, selection, tokens, and resolved CSS variables. Can be registered
 * globally via `app.use(ThemeInspector)`.
 *
 * @example
 * ```vue
 * <ThemeInspector :bottom="24" :right="24" />
 * ```
 *
 * @see {@link ThemeInspectorProps}
 * @see {@link useTheme}
 */
export const ThemeInspector = withInstall(ThemeInspectorBase, "ThemeInspector");
