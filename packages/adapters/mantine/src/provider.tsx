"use client";

import React from "react";
import { MantineProvider } from "@mantine/core";
import type { ThemeDefinition, ThemeRuntime } from "@themvora/core";
import { useRuntimeThemeFactory } from "@themvora/adapters/react";
import { createMantineCssVariables, createMantineTheme } from "./theme";

/**
 * Subscribes to a Themvora runtime and returns a Mantine theme that is rebuilt
 * automatically whenever the active theme changes.
 */
export function useMantineTheme<T extends ThemeDefinition>(runtime: ThemeRuntime<T>) {
  return useRuntimeThemeFactory(runtime, createMantineTheme);
}

/**
 * Subscribes to a Themvora runtime and returns the CSS-variable resolver that
 * puts the theme's surfaces, text and border roles on Mantine's own variables.
 */
export function useMantineCssVariables<T extends ThemeDefinition>(runtime: ThemeRuntime<T>) {
  return useRuntimeThemeFactory(runtime, (theme: T) => createMantineCssVariables(theme));
}

/**
 * Props for {@link MantineThemeProvider}.
 */
export interface MantineThemeProviderProps<T extends ThemeDefinition> {
  /** The Themvora runtime whose active theme drives the Mantine theme. */
  runtime: ThemeRuntime<T>;
  /** The React subtree rendered inside Mantine's `MantineProvider`. */
  children: React.ReactNode;
}

const readMode = (theme: unknown): "light" | "dark" | undefined => {
  const meta = (theme as { meta?: { mode?: string } } | undefined)?.meta;
  return meta?.mode === "light" || meta?.mode === "dark" ? meta.mode : undefined;
};

/**
 * `<MantineThemeProvider runtime={runtime}>` — wraps Mantine's own
 * `MantineProvider` with a theme derived from Themvora's semantic tokens.
 * The Mantine color scheme is forced to match the active Themvora mode so
 * Mantine's built-in dark styles stay in sync.
 *
 * The provider owns the derived Mantine theme: it subscribes to the runtime
 * and rebuilds the theme whenever the active theme changes, so the wrapped
 * subtree always renders with the current theme selection.
 *
 * It also supplies the `cssVariablesResolver`. Mantine paints cards, inputs and
 * borders from its own variables (`--mantine-color-body`,
 * `--mantine-color-default`, `--mantine-color-default-border`, …); without the
 * resolver those stay on Mantine's stock greys no matter what the palette says,
 * which is what made dark-mode surfaces indistinguishable from each other.
 *
 * @example
 * ```tsx
 * import { MantineThemeProvider } from "@themvora/mantine";
 *
 * <MantineThemeProvider runtime={runtime}>
 *   <App />
 * </MantineThemeProvider>
 * ```
 *
 * @see {@link createMantineTheme}
 */
export function MantineThemeProvider<T extends ThemeDefinition>({
  runtime,
  children,
}: MantineThemeProviderProps<T>) {
  const theme = useMantineTheme(runtime);
  const cssVariablesResolver = useMantineCssVariables(runtime);
  const mode = useRuntimeThemeFactory(runtime, readMode);

  return (
    <MantineProvider
      theme={theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="auto"
      {...(mode ? { forceColorScheme: mode } : {})}
    >
      {children}
    </MantineProvider>
  );
}
