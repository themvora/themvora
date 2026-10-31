import React, { type ReactNode } from "react";
import type { ThemeDefinition } from "@themvora/core";
import { useThemeFamily, useThemeMode, useThemeValue } from "./hooks";

/**
 * Which bootstrap-owned value a {@link ThemeReadout} displays.
 *
 * @remarks
 * These are exactly the text kinds `data-tv-readout` defines — the same set the
 * pre-paint bootstrap and the controller resolve (see `readoutValue` in
 * `dom.ts`), plus the raw `var:<custom-property>` form, which this component
 * does not wrap.
 *
 * `"label"` was missing for one release while the contract, the bootstrap and
 * the controller all supported it. A React app that wanted the human label
 * therefore had to hand-write `data-tv-readout="label"` *and*
 * `suppressHydrationWarning` — precisely the pair this component exists so that
 * nobody has to know — and the obvious workaround, rendering `useTheme().theme`
 * as text, is the one that fluctuates on load. A component that wraps "the
 * contract" has to cover it whole, or callers route around it and rediscover
 * the bug it was written for.
 *
 * @see {@link ThemeReadout}
 */
export type ThemeReadoutKind = "theme" | "label" | "mode" | "family";

/**
 * Props for {@link ThemeReadout}.
 *
 * @see {@link ThemeReadout}
 */
export interface ThemeReadoutProps {
  /** The value to display. */
  kind: ThemeReadoutKind;
  /** Rendered when the value is not available. Defaults to nothing. */
  fallback?: ReactNode;
  /** Class applied to the wrapping `<span>`. */
  className?: string;
}

/**
 * Renders a theme-derived value that the **server cannot know**, without the
 * post-hydration settle — and without the caller having to remember the
 * contract that makes it work.
 *
 * @param props - The readout props (see {@link ThemeReadoutProps}).
 * @returns A `<span>` carrying the bootstrap-readout contract.
 *
 * @example
 * ```tsx
 * Active theme <ThemeReadout kind="theme" fallback="—" />
 * ```
 *
 * @remarks
 * For `mode: "system"` the server renders a fallback it cannot verify (it cannot
 * read `prefers-color-scheme`). The pre-paint bootstrap resolves the real value
 * and patches this element's text before the first paint, so the readout is
 * correct from frame one instead of correcting itself after hydration.
 *
 * Two attributes make that work, and this component is the reason callers do not
 * have to know about them:
 *
 * - `data-tv-readout` marks the node as bootstrap-owned, so the end-of-body
 *   patch script (see `createThemeReadoutScript`) writes the resolved value into
 *   it.
 * - `suppressHydrationWarning` tells React that this text node is intentionally
 *   divergent: React renders its own (server) value, sees the DOM already
 *   differs, and neither warns nor rewrites it. Its post-hydration render then
 *   produces the live value — the same value the script wrote — so nothing
 *   moves.
 *
 * Drop either one and the settle comes back: without the marker nothing patches
 * the text, and without the suppression React rewrites the server's fallback
 * over the patched value and then corrects it again.
 *
 * It degrades safely. If the bootstrap is not present (for example
 * `injectBootstrap: false` with no replacement) the patch script returns
 * immediately, the server-rendered fallback stays on screen, and no exception is
 * thrown — so this is progressive enhancement, not a hard runtime dependency.
 *
 * A value that is not one of the four semantic kinds — a resolved CSS variable,
 * say — is not covered here. Use the raw contract for that:
 * `data-tv-readout="var:--theme-color-primary"` plus `suppressHydrationWarning`
 * on the element that renders the value.
 *
 * **This is the only supported way to display a theme value in a React island.**
 * `useTheme()` and its siblings read through `useSyncExternalStore`, so during
 * hydration they return `runtime.initial` — the resolution the *server*
 * produced, which cannot know the persisted selection or
 * `prefers-color-scheme`. Rendering that as text paints a value the document
 * does not have and corrects it once hydration commits; the visitor sees the
 * same line change from one theme name to another for a frame or three. Values
 * from those hooks are for behaviour — comparing, deriving, deciding — and a
 * displayed one belongs in a readout.
 *
 * @see {@link ThemeReadoutKind}
 * @see {@link ThemeReadoutProps}
 */
export function ThemeReadout({ kind, fallback = null, className }: ThemeReadoutProps) {
  const theme = useThemeValue<ThemeDefinition>();
  const mode = useThemeMode();
  const family = useThemeFamily();

  const value =
    kind === "theme"
      ? String(theme.name)
      : kind === "label"
        ? // The same rule `readoutValue` applies, because both writers must
          // agree: the pre-paint script patches this element from the theme's
          // `meta.label`, and a theme with none leaves the element alone. Falling
          // back to the machine name here would turn "no label" into a silent
          // content change the moment hydration took over.
          typeof theme.meta?.label === "string" && theme.meta.label
          ? theme.meta.label
          : null
        : kind === "mode"
          ? mode
          : family;

  return (
    <span className={className} data-tv-readout={kind} suppressHydrationWarning>
      {value ?? fallback}
    </span>
  );
}

export default ThemeReadout;
