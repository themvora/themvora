/**
 * The app's theme catalog, declared once for both consumers.
 *
 * `themvoraVitePlugin()` discovers this file at build time and embeds it in the
 * blocking pre-paint script, so the first frame is already themed. The runtime
 * then adopts exactly what that script painted (`data-theme-ready`), which is
 * why the page never flashes — including on a cold load, in any mode.
 *
 * Keep this list in step with the `themes` attribute on `<themvora-provider>`
 * in `index.html`: the script and the runtime must resolve the same catalog, or
 * the runtime corrects what the script painted and the visitor sees a flash.
 */
import {
  defineThemvoraConfig,
  getFallbackThemes,
  getPresetThemes,
  type ThemeDefinition,
} from "@themvora/core";

/** The names listed on the provider element. */
const CATALOG = [
  "light",
  "dark",
  "oat-light",
  "oat-dark",
  "citrus-light",
  "citrus-dark",
  "cocoa-light",
  "cocoa-dark",
  "plum-light",
  "plum-dark",
] as const;

const available = [
  ...getFallbackThemes<ThemeDefinition>(),
  ...getPresetThemes(),
];

export const themes: readonly ThemeDefinition[] = CATALOG.flatMap((name) => {
  const theme = available.find((candidate) => String(candidate.name) === name);
  return theme ? [theme] : [];
});

export const defaultTheme = "oat-light";
export const initialMode = "system";

export default defineThemvoraConfig({
  themes,
  defaultTheme,
  initialMode,
});
