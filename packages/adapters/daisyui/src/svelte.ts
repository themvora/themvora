/**
 * Svelte composable for the daisyUI adapter (`@themvora/daisyui/svelte`).
 *
 * `useDaisyTheme(runtime, options?)` installs the daisyUI adapter onto an
 * explicitly provided Themvora runtime and disposes it on unmount.
 *
 * @packageDocumentation
 */
import { onMount } from "svelte";
import type {
  AdapterRegistration,
  AdapterStrategy,
  ThemeAdapter,
  ThemeDefinition,
  ThemeRuntime,
} from "@themvora/core";

import { createDaisyAdapter } from "./adapter";

/**
 * Options accepted by the Svelte adapter composables (e.g.
 * {@link useDaisyTheme}).
 */
export interface UseAdapterOptions {
  /**
   * The adapter strategy to use. When omitted, the adapter's default strategy
   * applies.
   */
  strategy?: AdapterStrategy;
}

/**
 * Svelte composable that installs the daisyUI adapter onto the given Themvora
 * runtime. Maintains a tagged `:root` style element with concrete `--color-*`
 * variables, kept in sync as the active theme changes.
 *
 * Must be called during component initialization, passing the runtime from
 * your Themvora provider (e.g. `getThemeRuntime()` from `@themvora/svelte`):
 *
 * ```ts
 * import { useDaisyTheme } from "@themvora/daisyui/svelte";
 *
 * useDaisyTheme(runtime);
 * ```
 *
 * The adapter installs synchronously (guarded on `window`, so it is SSR-safe)
 * and is disposed via Svelte's effect tree.
 *
 * @param runtime The active Themvora runtime to install the adapter on.
 * @param options Adapter options. Defaults to `{}`.
 * @returns The installed adapter instance.
 *
 * @see `createDaisyAdapter`
 */
export function useDaisyTheme<T extends ThemeDefinition = ThemeDefinition>(
  runtime: ThemeRuntime<T>,
  options: UseAdapterOptions = {},
): ThemeAdapter<T> {
  const adapter = createDaisyAdapter(
    options.strategy ? { strategy: options.strategy } : {},
  ) as ThemeAdapter<T>;

  let handle: AdapterRegistration | null = null;
  if (typeof window !== "undefined") {
    handle = runtime.adapters.use(adapter);
  }

  // Teardown via `onMount` so Svelte's effect tree disposes the adapter in
  // runes mode and in legacy mode (when the parent emits `$.init()`).
  onMount(() => () => {
    handle?.dispose();
    handle = null;
  });

  return adapter;
}
