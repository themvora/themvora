import { createContext, useContext } from "react";

/**
 * The demo's theme-override state.
 *
 * `themeOverride` is a provider prop, so the state has to live above
 * `<ThemeProvider>`; this context is how the card inside the app reaches it.
 * In a real application the same state is usually local to whatever previews or
 * tests themes.
 */
export interface ThemeOverrideControl {
  override: string | undefined;
  setOverride: (value: string | undefined) => void;
}

export const ThemeOverrideContext = createContext<ThemeOverrideControl>({
  override: undefined,
  setOverride: () => {},
});

export function useThemeOverrideControl(): ThemeOverrideControl {
  return useContext(ThemeOverrideContext);
}
