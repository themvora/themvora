/**
 * React hook for the Open Props adapter (`@themvora/open-props/react`).
 *
 * `useOpenPropsTheme(runtime, options?)` installs the Open Props adapter onto
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

import { createOpenPropsAdapter } from "./adapter";
import { injectOpenPropsCSS } from "./index";

/**
 * React hook that installs the Open Props adapter onto the given Themvora
 * runtime. The adapter maintains a tagged `:root` style element containing
 * concrete `--color-*` / `--brand` / `--size-*` / `--shadow-*` variables in
 * sync as the theme changes.
 *
 * Call once in your app root, passing the runtime from your Themvora
 * provider (e.g. the `useThemeRuntime()` hook from `@themvora/react`):
 *
 * ```tsx
 * import { useOpenPropsTheme } from "@themvora/open-props/react";
 *
 * function App() {
 *   useOpenPropsTheme(runtime);
 *   return <YourApp />;
 * }
 * ```
 *
 * @param runtime The active Themvora runtime to install the adapter on.
 * @param options Adapter options. Defaults to `{}`.
 *
 * @see {@link createOpenPropsAdapter}
 */
export function useOpenPropsTheme<T extends ThemeDefinition = ThemeDefinition>(
  runtime: ThemeRuntime<T>,
  options?: { strategy?: AdapterStrategy },
): void {
  const adapterRef = useRef<ReturnType<typeof createOpenPropsAdapter> | null>(
    null,
  );
  if (!adapterRef.current) {
    adapterRef.current = createOpenPropsAdapter(
      options?.strategy ? { strategy: options.strategy } : {},
    );
  }

  useEffect(() => {
    const adapter = adapterRef.current!;
    injectOpenPropsCSS();
    const handle = runtime.adapters.use(adapter);
    return () => {
      handle.dispose();
    };
  }, [runtime, options?.strategy]);
}
