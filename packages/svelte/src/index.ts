/**
 * Themvora Svelte integration.
 *
 * Provides the module-level runtime holder (`setThemeRuntime` /
 * `getThemeRuntime`), the `useTheme*` hooks, the `ThemeProvider`,
 * `ThemeScope`, `ThemeScrollbar`, and `ThemeInspector` components, the
 * `themeInspector` action, the schedule accessors, and the SSR
 * bootstrap-script helper.
 *
 * @packageDocumentation
 */
import {
  createThemeRuntime,
  resolveRuntimeOptions,
  createCSSVariablesBinding,
  createDOMBinding,
  createOverlayScrollbar,
  resolveScopeTransition,
  createScopedThemeBinding,
  createThemeBootstrapScript,
  EMPTY_THEME_SCHEDULE_STATE,
  findGeneratedTheme,
  resolveGeneratedTheme,
  type OverlayScrollbarOptions,
  type ThemeRuntime,
  type ThemeRuntimeOptions,
  type ThemeDefinition,
  type ThemeMode,
  type DOMBindingOptions,
  type CSSVariablesOptions,
  type ThemeRuntimeSnapshot,
  type ThemePack,
  type ThemeLifecycleEventName,
  type ThemeTransitionOptions,
  type ScopedThemeSelection,
  type ThemeSchedule,
  type ThemeScheduleState,
  type ThemeScheduleSetOptions,
  type ThemeBootstrapScriptOptions,
} from "@themvora/core";
import { onMount, setContext } from "svelte";

/**
 * Props accepted by the Svelte `ThemeProvider` component.
 *
 * Extends the core runtime options (themes, default theme, initial mode and
 * family, persistence, transition, scheduling, DOM/CSS binding options). When
 * `runtime` is omitted the provider creates and owns a runtime from the
 * remaining options; when supplied, the provider adopts the given runtime and
 * does not destroy it on unmount.
 *
 * @param runtime An existing {@link ThemeRuntime} to adopt. When omitted, the
 *   provider creates its own runtime from the other props and destroys it on
 *   unmount.
 * @param children The Svelte snippet rendered inside the provider. Must be
 *   provided as a snippet (Svelte 5 `{@snippet}`) so it is instantiated after
 *   the runtime context is set.
 */
export interface ThemeProviderProps<T extends ThemeDefinition = ThemeDefinition>
  extends ThemeRuntimeOptions<T> {
  /** A runtime owned by the caller. When provided, the provider does not
   *  create or destroy it. When omitted, the provider creates its own runtime
   *  from the other props and destroys it on unmount. */
  runtime?: ThemeRuntime<T>;
  /** The Svelte snippet rendered inside the provider. Must be provided as a
   *  snippet (Svelte 5 `{@snippet}`) so it is instantiated after the runtime
   *  context is set. */
  children?: import("svelte").Snippet;
}


type LegacySnippetRender = (anchor: Node, slotProps: Record<string, unknown>) => void;

function renderSnippet(
  children: import("svelte").Snippet | undefined,
  anchor: Node,
) {
  if (!children) return;
  (children as unknown as LegacySnippetRender)(anchor, {});
}

/**
 * Sets the active Themvora runtime in the current Svelte component context.
 *
 * This is the low-level holder used by `ThemeProvider` to expose the runtime
 * to descendant components. It must be called during component initialization
 * (or a `$:` reactive block) so the runtime is available to any `useTheme*`
 * hook in the subtree. Prefer using `ThemeProvider` over calling this
 * directly.
 *
 * @param runtime The runtime to expose to the current component and its
 *   descendants.
 * @see {@link getThemeRuntime}
 */
export function setThemeRuntime<T extends ThemeDefinition>(
  runtime: ThemeRuntime<T>,
) {
  setContext(ThemeKey, runtime);
}

/**
 * Returns the active Themvora runtime from the current Svelte component
 * context.
 *
 * Must be called during component initialization (or a `$:` reactive block)
 * inside a `ThemeProvider` subtree. Throws if no runtime is present.
 *
 * @returns The runtime provided by the nearest ancestor `ThemeProvider`.
 * @throws {Error} When called outside a `ThemeProvider` subtree.
 * @see {@link setThemeRuntime}
 */

function readableStore<T>(getter: () => T, subscribe: (cb: (v: T) => void) => () => void) {
  type Listener = (value: T) => void;
  const listeners = new Set<Listener>();

  let current = getter();

  const unsub = subscribe((val: T) => {
    current = val;
    for (const fn of listeners) {
      fn(current);
    }
  });

  return {
    subscribe(this: void, listener: Listener): () => void {
      listeners.add(listener);
      listener(current);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          unsub();
        }
      };
    },
    get value() {
      return current;
    },
  };
}

/**
 * Returns the active Themvora runtime as a plain object.
 *
 * Unlike the other `useTheme*` hooks this returns the raw runtime (not a
 * store) and is not reactive. Must be called during component initialization
 * inside a `ThemeProvider` subtree.
 *
 * @returns The runtime provided by the nearest ancestor `ThemeProvider`.
 * @throws {Error} When called outside a `ThemeProvider` subtree.
 * @see {@link getThemeRuntime}
 */
export function useThemeRuntime<T extends ThemeDefinition>() {
  return getThemeRuntime<T>();
}

/**
 * Reactive access to the currently selected theme as a readable Svelte store.
 *
 * The store emits the full resolved theme whenever the selection changes.
 * Must be called during component initialization inside a `ThemeProvider`
 * subtree.
 *
 * @returns A readable store whose value is the active theme.
 * @see {@link useThemeRuntime}
 * @see {@link useTheme}
 */
export function useThemeValue<T extends ThemeDefinition>() {
  const runtime = getThemeRuntime<T>();
  return readableStore(
    () => runtime.store.get(),
    (cb) => runtime.store.subscribe((t) => cb(t as T)),
  );
}

/**
 * Reactive access to the active theme's token group as a readable Svelte
 * store.
 *
 * The store emits the resolved tokens whenever the selection changes. Must be
 * called during component initialization inside a `ThemeProvider` subtree.
 *
 * @returns A readable store whose value is the active theme's tokens.
 *
 * @see {@link useThemeRuntime}
 * @see {@link useTheme}
 */
export function useThemeTokens<T extends ThemeDefinition>() {
  const runtime = getThemeRuntime<T>();
  return readableStore(
    () => runtime.store.get().tokens,
    (cb) => runtime.store.subscribe((t) => cb(t.tokens)),
  );
}

/**
 * Reactive access to the theme produced by `generateTheme()` and registered
 * with the provider, as a readable Svelte store.
 *
 * Resolves the registered theme that carries the generator's origin marker
 * (`meta.generation.kind === "generated"`); shipped presets never qualify. When
 * both halves of one `generateTheme()` call are registered, the store tracks the
 * theme the active selection resolves to.
 *
 * Must be called during component initialization inside a `ThemeProvider`
 * subtree.
 *
 * Throws `ThemeError` with code `TV_GENERATION_THEME_NOT_FOUND` when the provider
 * holds no generated theme, and `TV_GENERATION_THEME_AMBIGUOUS` when several are
 * registered and the active selection does not identify one.
 *
 * Re-resolves on every settled change to the registry, store, or selection. If
 * the generated theme is later removed, the store's value is cleared (the theme
 * is no longer readable) rather than retaining a stale one; Svelte's store
 * contract has no read-time getter, so a fresh subscription to a removed theme
 * throws.
 *
 * @returns A readable store whose value is the registered generated theme.
 * @throws {ThemeError} `TV_GENERATION_THEME_NOT_FOUND` when no generated theme is
 *   registered; `TV_GENERATION_THEME_AMBIGUOUS` when several are and the active
 *   selection does not identify one.
 *
 * @see {@link useThemeValue}
 */
export function useGeneratedTheme<T extends ThemeDefinition>() {
  const runtime = getThemeRuntime<T>();

  // Eager initial resolution preserves the documented mount-time error contract.
  resolveGeneratedTheme<T>(runtime.themes as readonly T[], runtime.store.get() as T);

  const readOrNull = () =>
    findGeneratedTheme<T>(runtime.themes as readonly T[], runtime.store.get() as T).theme;

  const listeners = new Set<(value: T) => void>();
  let current: T | null = readOrNull();
  let teardown: (() => void) | null = null;

  const emit = () => {
    // Never throws: a settled missing state is stored and pushed as null, so a
    // subscriber can no longer read a removed theme.
    current = readOrNull();
    for (const fn of listeners) fn(current as T);
  };

  const throwIfMissing = () =>
    resolveGeneratedTheme<T>(runtime.themes as readonly T[], runtime.store.get() as T);

  return {
    subscribe(listener: (value: T) => void): () => void {
      // Svelte's store contract has no read-time getter, so a settled missing
      // state is surfaced on (re)subscription rather than kept stale.
      if (current === null) throwIfMissing();

      if (!teardown) {
        const unsubStore = runtime.store.subscribe(emit);
        const unsubRegistry = runtime.registry.subscribe(emit);
        teardown = () => {
          unsubStore();
          unsubRegistry();
        };
      }
      listeners.add(listener);
      listener(current as T);

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && teardown) {
          teardown();
          teardown = null;
        }
      };
    },
    get value(): T {
      if (current !== null) return current;
      return resolveGeneratedTheme<T>(runtime.themes as readonly T[], runtime.store.get() as T);
    },
  };
}

/**
 * Reactive access to the current theme mode (light/dark/system) as a readable
 * Svelte store.
 *
 * Must be called during component initialization inside a `ThemeProvider`
 * subtree.
 *
 * @returns A readable store whose value is the current theme mode.
 *
 * @see {@link useThemeRuntime}
 * @see {@link useTheme}
 */
export function useThemeMode() {
  const runtime = getThemeRuntime();
  return readableStore(
    () => runtime.selection.getMode(),
    (cb) => runtime.store.subscribe(() => cb(runtime.selection.getMode())),
  );
}

/**
 * Reactive access to the current theme family as a readable Svelte store.
 *
 * Must be called during component initialization inside a `ThemeProvider`
 * subtree.
 *
 * @returns A readable store whose value is the current theme family name.
 *
 * @see {@link useThemeRuntime}
 * @see {@link useTheme}
 */
export function useThemeFamily() {
  const runtime = getThemeRuntime();
  return readableStore(
    () => runtime.selection.getFamily(),
    (cb) => runtime.store.subscribe(() => cb(runtime.selection.getFamily())),
  );
}

/**
 * Reactive access to the full theme selection state as readable Svelte stores
 * plus imperative selection controls.
 *
 * Returns `theme`, `mode` and `family` readable stores together with
 * `setMode`, `setFamily` and `toggleTheme` helpers. Must be called during
 * component initialization inside a `ThemeProvider` subtree.
 *
 * @returns An object of reactive stores and selection helpers.
 *
 * @example
 * ```svelte
 * <script>
 *   const { theme, mode, family, setMode, toggleTheme } = useTheme();
 * </script>
 *
 * <p>{$theme.name} / {$mode}</p>
 * <button onclick={() => toggleTheme()}>Toggle</button>
 * ```
 *
 * @see {@link useThemeRuntime}
 */
export function useTheme<T extends ThemeDefinition>() {
  const runtime = getThemeRuntime<T>();

  const theme = readableStore(
    () => runtime.store.get(),
    (cb) => runtime.store.subscribe((t) => cb(t as T)),
  );

  const mode = readableStore(
    () => runtime.selection.getMode(),
    (cb) => {
      const unsub = runtime.store.subscribe(() => cb(runtime.selection.getMode()));
      return unsub;
    },
  );

  const family = readableStore(
    () => runtime.selection.getFamily(),
    (cb) => {
      const unsub = runtime.store.subscribe(() => cb(runtime.selection.getFamily()));
      return unsub;
    },
  );

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
    family,
    setMode,
    setFamily,
    toggleTheme,
  };
}

/**
 * Reactive access to the theme selection history as readable Svelte stores
 * plus imperative navigation controls.
 *
 * Returns `canUndo`, `canRedo` and `history` readable stores together with
 * `undo`, `redo`, `clear` and `jump` helpers. Must be called during component
 * initialization inside a `ThemeProvider` subtree.
 *
 * @returns An object of reactive history stores and navigation helpers.
 *
 * @see {@link useThemeRuntime}
 * @see {@link useTheme}
 */
export function useThemeHistory<T extends ThemeDefinition>() {
  const runtime = getThemeRuntime<T>();

  const canUndo = readableStore(
    () => runtime.history.canUndo(),
    (cb) => runtime.store.subscribe(() => cb(runtime.history.canUndo())),
  );

  const canRedo = readableStore(
    () => runtime.history.canRedo(),
    (cb) => runtime.store.subscribe(() => cb(runtime.history.canRedo())),
  );

  const history = readableStore(
    () => runtime.history.getHistory(),
    (cb) => runtime.store.subscribe(() => cb(runtime.history.getHistory())),
  );

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
 * Returns a function that batches multiple selection changes into a single
 * runtime update.
 *
 * Must be called during component initialization inside a `ThemeProvider`
 * subtree.
 *
 * @returns A function that runs the given callback inside a runtime batch.
 *
 * @see {@link useThemeRuntime}
 * @see {@link useTheme}
 */
export function useThemeBatch() {
  const runtime = getThemeRuntime();
  return (callback: () => void) => runtime.batch(callback);
}

/**
 * Returns a function that captures the current runtime state as a snapshot.
 *
 * Must be called during component initialization inside a `ThemeProvider`
 * subtree.
 *
 * @returns A function that returns a {@link ThemeRuntimeSnapshot} of the
 *   current runtime state.
 * @see {@link useThemeRestore}
 * @see {@link useThemeRuntime}
 */
export function useThemeSnapshot() {
  const runtime = getThemeRuntime();
  return () => runtime.snapshot();
}

/**
 * Returns a function that restores a previously captured runtime snapshot.
 *
 * Must be called during component initialization inside a `ThemeProvider`
 * subtree.
 *
 * @returns A function that restores the given snapshot into the runtime.
 * @see {@link useThemeSnapshot}
 * @see {@link useThemeRuntime}
 */
export function useThemeRestore() {
  const runtime = getThemeRuntime();
  return (snapshot: ThemeRuntimeSnapshot) => runtime.restore(snapshot);
}

/**
 * Returns a function to subscribe to runtime lifecycle events.
 *
 * Must be called during component initialization inside a `ThemeProvider`
 * subtree.
 *
 * @returns An object with an `on` method that registers a lifecycle listener.
 *
 * @see {@link useThemeRuntime}
 * @see {@link useTheme}
 */
export function useThemeLifecycle() {
  const runtime = getThemeRuntime();
  return {
    on: (event: ThemeLifecycleEventName, listener: (data: unknown) => void) => runtime.lifecycle.on(event, listener),
  };
}

/**
 * Returns a function that installs a theme pack onto the runtime.
 *
 * Must be called during component initialization inside a `ThemeProvider`
 * subtree.
 *
 * @returns A function that applies the given {@link ThemePack} to the runtime.
 *
 * @see {@link useThemeRuntime}
 * @see {@link useTheme}
 */
export function useThemePacks() {
  const runtime = getThemeRuntime();
  return (pack: ThemePack<any>) => runtime.use(pack);
}

/**
 * Direct access to the runtime's sunrise/sunset scheduling controller.
 * Returns `null` when the provider was created without the `scheduled` option.
 *
 * ```svelte
 * const schedule = getThemeSchedule();
 * schedule?.enable();
 * schedule?.disable();
 * ```
 *
 * @see {@link useThemeRuntime}
 */
export function getThemeSchedule<T extends ThemeDefinition = ThemeDefinition>(): ThemeSchedule | null {
  return getThemeRuntime<T>().schedule ?? null;
}

/**
 * Reactive sunrise/sunset schedule state as a readable Svelte store. Returns
 * `null` when the provider has no `scheduled` option configured. The emitted
 * value tracks `enabled`, `active`, `status`, `sunrise`/`sunset` and the next
 * transition.
 *
 * ```svelte
 * const schedule = useThemeSchedule(); // `$schedule.enabled` …
 * ```
 *
 * @see {@link useThemeRuntime}
 */
export function useThemeSchedule<T extends ThemeDefinition = ThemeDefinition>() {
  const schedule = getThemeSchedule<T>();
  return schedule
    ? readableStore<ThemeScheduleState>(
        () => schedule.state,
        (cb) => schedule.subscribe((s) => cb(s)),
      )
    : null;
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** Inject the live global mode into a family-based selection so `family`
 *  scopes follow the provider's light/dark/system selection. */
function withGlobalMode(
  selection: ScopedThemeSelection,
  mode: ThemeMode,
): ScopedThemeSelection {
  if (typeof selection === "string") return selection;
  if ("name" in selection) return selection;
  return { ...selection, mode: selection.mode ?? mode };
}

/**
 * Props accepted by the Svelte `ThemeScope` component.
 *
 * Applies a scoped theme to a subtree without changing the provider's global
 * selection. `theme`/`family`/`mode` are read at mount; family-based and
 * boundary scopes keep following the provider's light/dark/system mode while
 * mounted.
 *
 * @param className CSS class applied to the wrapper `div` created for the
 *   scope.
 * @param children The Svelte snippet rendered inside the scoped wrapper.
 */
export interface ThemeScopeProps {
  /** Exact theme name, family name, or a `{ family, mode }`-style object.
   *  When `family`/`mode` are also passed, `theme` wins (it's the explicit
   *  selection). Omit to follow the global selection inside a new boundary. */
  theme?: string;
  /** Theme family for the scoped subtree. When `mode` is omitted the scope
   *  follows the provider's current mode (light/dark/system). */
  family?: string;
  /** Mode for a family-based scope. Optional — defaults to the provider's
   *  current mode so `family="plum"` flips light/dark with the page. */
  mode?: ThemeMode;
  /** Local theme definitions for genuinely isolated components. Resolved FIRST
   *  (they shadow same-named parent themes), then the provider's registry
   *  falls back — no second runtime is created. */
  themes?: readonly ThemeDefinition[];
  /** Transition for this scope's own theme changes. `undefined` inherits the
   *  `<ThemeProvider/>` transition, `false` disables it, `true` inherits, and
   *  an object is merged over the provider's config (local keys win). */
  transition?: boolean | ThemeTransitionOptions;
  /** CSS class applied to the wrapper `div` created for the scope. */
  className?: string;
  /** The Svelte snippet rendered inside the scoped wrapper. */
  children: import("svelte").Snippet;
  /** Any additional attributes (e.g. `data-testid`) forwarded to the wrapper. */
  [key: string]: unknown;
}


/**
 * The overlay scrollbar component. See {@link ThemeScrollbarProps}.
 *
 * Compiled from `theme-scrollbar.svelte` by `scripts/compile-svelte.mjs` — a
 * runes component, so `$effect` re-runs when an option changes and the overlay
 * is rebuilt with the new value. A plain function component in this `.ts`
 * module could not do that: Svelte never re-runs one, so a changed prop was
 * ignored until the page was reloaded.
 *
 * The two compiled variants are picked at runtime, so an SSR bundle never runs
 * the client component (and vice versa).
 *
 * @see {@link ThemeProvider}
 */
export const ThemeScrollbar: Component<ThemeScrollbarProps> =
  typeof window === "undefined" ? ThemeScrollbarServer : ThemeScrollbarClient;


import type { Component } from "svelte";
import { ThemeKey, getThemeRuntime } from "./context";
import type { ThemeScrollbarProps } from "./scrollbar-options";
import ThemeScrollbarClient from "./generated/theme-scrollbar.client.js";
import ThemeScrollbarServer from "./generated/theme-scrollbar.server.js";
import ThemeProviderClient from "./generated/theme-provider.client.js";
import ThemeProviderServer from "./generated/theme-provider.server.js";
import ThemeScopeClient from "./generated/theme-scope.client.js";
import ThemeScopeServer from "./generated/theme-scope.server.js";

// Re-exported so the public surface is unchanged by the split into modules.
export { getThemeRuntime, ThemeKey } from "./context";
export {
  pickOptions,
  type ThemeScrollbarProps,
} from "./scrollbar-options";



// -- ThemeInspector action ---------------------------------------------------

import { ThemvoraInspector } from "@themvora/web";

/**
 * Build the blocking zero-flash `<head>` script for a Svelte app (SSR or SPA).
 *
 * Inlines core's `createThemeBootstrapScript` with the Svelte defaults
 * (`storageKey: "theme-selection"`, `prefix: "theme-"` — the same values the
 * Svelte `ThemeProvider` persistence and CSS variables use), so the persisted
 * theme is applied before first paint. Emit the returned string as a
 * blocking `<script>` inside `<head>` (e.g. a `<svelte:head>` slot).
 */
export function createSvelteThemeBootstrapScript<T extends ThemeDefinition>(
  options: ThemeBootstrapScriptOptions<T>,
): string {
  return createThemeBootstrapScript(options);
}

/**
 * Props accepted by the Svelte `themeInspector` action.
 *
 * Configures the floating `<themvora-inspector>` custom element mounted into
 * the target node.
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

/**
 * Svelte action that mounts a `<themvora-inspector>` custom element into the
 * target node. Use in any `.svelte` file:
 *
 * ```svelte
 * <div use:themeInspector={{ bottom: 80, right: 24, size: 36, zIndex: 50 }} />
 * ```
 *
 * @see {@link ThemvoraInspector}
 */
export function themeInspector(
  node: HTMLElement,
  props: ThemeInspectorProps = {},
) {
  ThemvoraInspector.define();
  const el = document.createElement("themvora-inspector");
  applyProps(el, props);
  node.appendChild(el);
  return {
    update(p: ThemeInspectorProps) {
      applyProps(el, p);
    },
    destroy() {
      el.remove();
    },
  };
}

function applyProps(el: HTMLElement, props: ThemeInspectorProps) {
  if (props.bottom != null) el.setAttribute("bottom", String(props.bottom));
  else el.removeAttribute("bottom");
  if (props.right != null) el.setAttribute("right", String(props.right));
  else el.removeAttribute("right");
  if (props.size != null) el.setAttribute("size", String(props.size));
  else el.removeAttribute("size");
  if (props.zIndex != null) el.setAttribute("z-index", String(props.zIndex));
  else el.removeAttribute("z-index");
}

/**
 * The Themvora provider component (Svelte 5 runes: `$props` + `$effect`).
 *
 * Compiled from `theme-provider.svelte` by `scripts/compile-svelte.mjs`. A
 * changed configuration prop is forwarded to the shared `runtime.configure()`
 * contract, so the UI updates without a reload. The two compiled variants are
 * picked at runtime, so an SSR bundle never runs the client component.
 *
 * @see {@link ThemeScope}
 */
export const ThemeProvider: Component<ThemeProviderProps<ThemeDefinition>> =
  typeof window === "undefined" ? ThemeProviderServer : ThemeProviderClient;

/**
 * The scoped theming component (Svelte 5 runes).
 *
 * Compiled from `theme-scope.svelte`. A changed `theme`/`family`/`mode`/
 * `themes`/`transition` re-resolves the scope without a remount.
 *
 * @see {@link ThemeProvider}
 */
export const ThemeScope: Component<ThemeScopeProps> =
  typeof window === "undefined" ? ThemeScopeServer : ThemeScopeClient;
