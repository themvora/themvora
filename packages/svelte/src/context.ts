import { getContext } from "svelte";
import type { ThemeDefinition, ThemeRuntime } from "@themvora/core";

/**
 * Context key the provider installs the runtime under.
 *
 * Kept in its own module so the `.svelte` components can read the runtime
 * without importing the barrel — a component that imported `index.ts` would
 * create a cycle, since the barrel exports the component.
 */
export const ThemeKey = Symbol("themvora");

/**
 * Reads the runtime the nearest `ThemeProvider` installed.
 *
 * @throws If called outside a `ThemeProvider`.
 */
export function getThemeRuntime<T extends ThemeDefinition>() {
  const runtime = getContext<ThemeRuntime<T>>(ThemeKey);
  if (!runtime) {
    throw new Error("getThemeRuntime must be used within a ThemeProvider");
  }
  return runtime;
}
