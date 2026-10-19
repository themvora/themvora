/**
 * React hook for the Bootstrap adapter (`@themvora/bootstrap/react`).
 *
 * `useBootstrapTheme(runtime, options?)` installs the Bootstrap adapter onto
 * an explicitly provided Themvora runtime and disposes it on unmount.
 *
 * @packageDocumentation
 */
"use client";

import { useEffect, useRef } from "react";
import type {
  AdapterStrategy,
  ThemeDefinition,
  ThemeRuntime,
} from "@themvora/core";

import { createBootstrapAdapter } from "./adapter";
import { injectBootstrapCSS } from "./index";

/**
 * React hook that installs the Bootstrap adapter onto the given Themvora
 * runtime. The adapter maintains a tagged `:root` style element containing
 * concrete `--bs-*` variables (including `-rgb` triplets) and keeps them in
 * sync as the theme changes.
 *
 * Call once in your app root, passing the runtime from your Themvora
 * provider (e.g. the `useThemeRuntime()` hook from `@themvora/react`):
 *
 * ```tsx
 * import { useBootstrapTheme } from "@themvora/bootstrap/react";
 *
 * function App() {
 *   useBootstrapTheme(runtime);
 *   return <YourApp />;
 * }
 * ```
 *
 * @param runtime The active Themvora runtime to install the adapter on.
 * @param options Adapter options. Defaults to `{}`.
 *
 * @see {@link createBootstrapAdapter}
 */
export function useBootstrapTheme<T extends ThemeDefinition = ThemeDefinition>(
  runtime: ThemeRuntime<T>,
  options?: { strategy?: AdapterStrategy },
): void {
  const adapterRef = useRef<ReturnType<typeof createBootstrapAdapter> | null>(
    null,
  );
  if (!adapterRef.current) {
    adapterRef.current = createBootstrapAdapter(
      options?.strategy ? { strategy: options.strategy } : {},
    );
  }

  useEffect(() => {
    const adapter = adapterRef.current!;
    injectBootstrapCSS();
    const handle = runtime.adapters.use(adapter);
    return () => {
      handle.dispose();
    };
  }, [runtime, options?.strategy]);
}
