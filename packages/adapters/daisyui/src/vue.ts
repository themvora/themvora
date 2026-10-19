/**
 * Vue composable for the daisyUI adapter (`@themvora/daisyui/vue`).
 *
 * `useDaisyTheme(runtime, options?)` installs the daisyUI adapter onto an
 * explicitly provided Themvora runtime and disposes it on unmount.
 *
 * @packageDocumentation
 */
import { onMounted, onUnmounted } from "vue";
import type {
  AdapterRegistration,
  AdapterStrategy,
  ThemeAdapter,
  ThemeDefinition,
  ThemeRuntime,
} from "@themvora/core";

import { createDaisyAdapter } from "./adapter";

/**
 * Options accepted by the adapter composables (e.g. {@link useDaisyTheme}).
 */
export interface UseAdapterOptions {
  /**
   * The adapter strategy to use. When omitted, the adapter's default strategy
   * applies.
   */
  strategy?: AdapterStrategy;
}

/**
 * Vue composable that installs the daisyUI adapter onto the given Themvora
 * runtime. Maintains a tagged `:root` style element with concrete `--color-*`
 * variables, kept in sync as the active theme changes.
 *
 * Must be called in a component's `setup` scope, passing the runtime from your
 * Themvora provider (e.g. `useThemeRuntime()` from `@themvora/vue`):
 *
 * ```ts
 * import { useDaisyTheme } from "@themvora/daisyui/vue";
 *
 * useDaisyTheme(runtime);
 * ```
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
  onMounted(() => {
    handle = runtime.adapters.use(adapter);
  });
  onUnmounted(() => {
    handle?.dispose();
    handle = null;
  });

  return adapter;
}
