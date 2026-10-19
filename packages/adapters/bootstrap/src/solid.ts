/**
 * Solid composable for the Bootstrap adapter (`@themvora/bootstrap/solid`).
 *
 * `useBootstrapTheme(runtime, options?)` installs the Bootstrap adapter onto
 * an explicitly provided Themvora runtime and disposes it on cleanup.
 *
 * @packageDocumentation
 */
import { onMount, onCleanup } from "solid-js";
import type {
  AdapterRegistration,
  AdapterStrategy,
  ThemeAdapter,
  ThemeDefinition,
  ThemeRuntime,
} from "@themvora/core";

import { createBootstrapAdapter } from "./adapter";

/**
 * Options accepted by the Solid adapter composables
 * (e.g. {@link useBootstrapTheme}).
 */
export interface UseAdapterOptions {
  /**
   * The adapter strategy to use. When omitted, the adapter's default strategy
   * applies.
   */
  strategy?: AdapterStrategy;
}

/**
 * Solid composable that installs the Bootstrap adapter onto the given Theme
 * Kit runtime. Maintains a tagged `:root` style element with concrete
 * `--bs-*` variables (including `-rgb` triplets), kept in sync as the active
 * theme changes.
 *
 * Must be called within a Solid reactive root, passing the runtime from your
 * Themvora provider (e.g. `useThemeRuntime()` from `@themvora/solid`):
 *
 * ```tsx
 * import { useBootstrapTheme } from "@themvora/bootstrap/solid";
 *
 * function App() {
 *   useBootstrapTheme(runtime);
 *   return <YourApp />;
 * }
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
  onMount(() => {
    handle = runtime.adapters.use(adapter);
  });
  onCleanup(() => {
    handle?.dispose();
    handle = null;
  });

  return adapter;
}
