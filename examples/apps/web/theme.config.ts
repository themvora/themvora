/**
 * The application's theme catalog, declared once.
 *
 * `themvoraVitePlugin()` reads this file and derives all three pre-paint
 * resources from it:
 *
 * - the render-blocking CSS (default light/dark, system fallback, one rule per
 *   declared theme);
 * - the classic boot script that restores the persisted selection;
 * - `window.__THEMVORA_CONFIG__`, which the provider reads instead of taking
 *   the same values again as attributes.
 *
 * The `<themvora-provider>` in `index.html` is deliberately attribute-free.
 * Adding `default-theme` or `initial-mode` there would be a second declaration,
 * and the plugin fails the build if the two resolve differently.
 */
import {
  defineTheme,
  defineThemvoraConfig,
  generateTheme,
  getBuiltInThemes,
  getPresetThemes,
  type ThemeDefinition,
} from "@themvora/core";

const builtIns = getBuiltInThemes();

function builtIn(name: string): ThemeDefinition {
  const theme = builtIns.find((candidate) => String(candidate.name) === name);
  if (!theme) throw new Error(`The built-in theme "${name}" is missing.`);
  return theme;
}

const mintLight = builtIn("mint-light");
const mintDark = builtIn("mint-dark");

/**
 * A custom family declared in the plugin config, so it is part of the generated
 * CSS and can be restored before first paint like any built-in theme.
 *
 * The tokens are copied from the shipped mint pair to keep this example short;
 * a real custom theme would declare its own palette.
 */
const harborLight = defineTheme({
  name: "harbor-light",
  meta: { family: "harbor", mode: "light", label: "Harbor" },
  tokens: {
    ...mintLight.tokens,
    colors: {
      ...mintLight.tokens?.colors,
      primary: "#0f766e",
      primaryForeground: "#ffffff",
      accent: "#ccfbf1",
      accentForeground: "#134e4a",
    },
  },
});

const harborDark = defineTheme({
  name: "harbor-dark",
  meta: { family: "harbor", mode: "dark", label: "Harbor Dark" },
  tokens: {
    ...mintDark.tokens,
    colors: {
      ...mintDark.tokens?.colors,
      primary: "#2dd4bf",
      primaryForeground: "#042f2e",
      accent: "#134e4a",
      accentForeground: "#ccfbf1",
    },
  },
});

export const { light: indigoLight, dark: indigoDark } = generateTheme({
  seed: "#ef4444",
  family: "maroon",
  style: "editorial",
});

// Hand the pair straight to the provider:
export const maroonThemes = [indigoLight, indigoDark];

export const themes: readonly ThemeDefinition[] = [
  builtIn("light"),
  builtIn("dark"),
  builtIn("mint-light"),
  builtIn("mint-dark"),
  builtIn("plum-light"),
  builtIn("plum-dark"),
  harborLight,
  harborDark,
  ...getPresetThemes(),
  ...maroonThemes,
];

export default defineThemvoraConfig({
  themes,
  defaultTheme: "harbor-light",
  initialMode: "system",
  transition: { enabled: true, duration: 200, easing: "ease-out" },
});
