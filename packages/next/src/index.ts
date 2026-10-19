/**
 * Themvora Next.js App Router integration.
 *
 * Provides the SSR-safe `ThemeProvider` (with `ThemeProviderHtmlProps` /
 * `ThemeProviderBodyProps` for zero-flash layout wiring) plus the React
 * `ThemeScope` and `ThemeScrollbar` re-exports.
 *
 * @packageDocumentation
 */
export { ThemeProvider } from "./layout";
export type {
  ThemeProviderProps,
  ThemeProviderHtmlProps,
  ThemeProviderBodyProps,
} from "./layout";

export { ThemeScope, ThemeScrollbar } from "@themvora/react";
export type { ThemeScopeProps } from "@themvora/react";
export type { ThemeScrollbarProps } from "@themvora/react";
