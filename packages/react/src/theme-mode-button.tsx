"use client";

import { useEffectiveThemeMode, useSetThemeMode, useThemeMode } from "./hooks";

/**
 * A minimal demo-style button that cycles the theme mode:
 * `light → dark → system → light`.
 *
 * Renders a `<button>` whose label is the mode **actually applied**, with the
 * configured mode shown alongside it while that is `"system"`. Cycling always
 * follows the configured mode, so a visitor who picked "system" stays on it.
 *
 * Use it for demos and prototypes, or build your own control with
 * {@link useTheme}.
 *
 * @remarks
 * The label reads {@link useEffectiveThemeMode} rather than {@link useThemeMode}
 * on purpose. With a sunrise/sunset schedule running, the configured mode is the
 * visitor's standing request — `"system"`, or whichever mode they last picked —
 * and it does not move at sunset. A label bound to it therefore kept announcing
 * the old mode while the page changed colour. The effective mode moves with the
 * page.
 *
 * @example
 * ```tsx
 * <ThemeModeButton />
 * ```
 *
 * @see {@link useTheme}
 * @see {@link useEffectiveThemeMode}
 */
export function ThemeModeButton() {
  const mode = useThemeMode();
  const effectiveMode = useEffectiveThemeMode();
  const setMode = useSetThemeMode();
  const nextMode =
    mode === "light" ? "dark" : mode === "dark" ? "system" : "light";

  return (
    <button type="button" onClick={() => setMode(nextMode)}>
      Mode: {effectiveMode}
      {mode === "system" ? " (system)" : null}
    </button>
  );
}
