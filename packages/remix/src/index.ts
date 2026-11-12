/**
 * Themvora Remix integration.
 *
 * Provides the SSR-safe `ThemeProvider`, the `ThemeHead` blocking script
 * for zero-flash bootstrapping, `getThemeShellProps` for the `<html>` element
 * Remix owns, `createThemeDocument` for a single-source document setup, and
 * the cookie-backed `createRemixThemePersistence`, plus the React `ThemeScope`,
 * `ThemeScrollbar`, and `ThemeInspector` re-exports.
 *
 * @packageDocumentation
 */
export { createThemeDocument } from "./document";
export type {
  ThemeDocumentBodyProps,
  ThemeDocumentConfig,
  ThemeDocumentHandle,
  ThemeDocumentHeadContent,
  ThemeDocumentHeadElement,
  ThemeDocumentHeadTag,
  ThemeDocumentHtmlProps,
  ThemeDocumentProps,
  ThemeDocumentProviderProps,
} from "./document";
export { ThemeProvider } from "./provider";
export type { ThemeProviderProps } from "./provider";
export { ThemeHead } from "./blocking-script";
export type { ThemeHeadProps } from "./blocking-script";
export { getThemeShellProps } from "./shell";
export type { ThemeShellProps, ThemeShellOptions } from "./shell";
export { createRemixThemePersistence } from "./persistence";
export type { RemixThemePersistenceOptions } from "./persistence";
export { ThemeScope, ThemeScrollbar, ThemeInspector } from "@themvora/react";
export type { ThemeScrollbarProps, ThemeInspectorProps } from "@themvora/react";
export * from "./hooks";
