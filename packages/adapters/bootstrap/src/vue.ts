/**
 * Vue composable for the Bootstrap adapter (`@themvora/bootstrap/vue`).
 *
 * `useBootstrapTheme(runtime, options?)` installs the Bootstrap adapter onto
 * an explicitly provided Themvora runtime and disposes it on unmount.
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

import { createBootstrapAdapter } from "./adapter";

/**
 * Options accepted by the adapter composables (e.g. {@link useBootstrapTheme}).
 */
export interface UseAdapterOptions {
  /**
   * The adapter strategy to use. When omitted, the adapter's default strategy
   * applies.
   */
  strategy?: AdapterStrategy;
}

/**
 * Vue composable that installs the Bootstrap adapter onto the given Themvora
 * runtime. Maintains a tagged `:root` style element with concrete `--bs-*`
 * variables (including `-rgb` triplets), kept in sync as the active theme
 * changes.
 *
 * Must be called in a component's `setup` scope, passing the runtime from your
 * Themvora provider (e.g. `useThemeRuntime()` from `@themvora/vue`):
 *
 * ```ts
 * import { useBootstrapTheme } from "@themvora/bootstrap/vue";
 *
 * useBootstrapTheme(runtime);
 * ```
 *
 * @param runtime The active Themvora runtime to install the adapter on.
 * @param options Adapter options. Defaults to `{}`.
 * @returns The installed adapter instance.
 *
 * @see `createBootstrapAdapter`
 */
export function useBootstrapTheme<T extends ThemeDefinition = ThemeDefinition>(
  runtime: ThemeRuntime<T>,
  options: UseAdapterOptions = {},
): ThemeAdapter<T> {
  const adapter = createBootstrapAdapter(
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
