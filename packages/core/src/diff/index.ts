/**
 * Semantic theme diff — public surface.
 *
 * `diffThemes()` is the only public function. `ThemeSnapshot`,
 * `createThemeSnapshot`, `resolveInheritance`, `resolveConcreteTheme` and
 * `diffSnapshots` are internal: the snapshot is a comparison projection rather
 * than an authoring format, so publishing it would invite consumers to build
 * against a shape that exists to serve one algorithm.
 *
 * @packageDocumentation
 */
export { diffThemes } from "./diff";
export type {
  ThemeDiffOptions,
  ThemeDiffProvenance,
  ThemeDiffReport,
  ThemeDiffSide,
  ThemeGenerationProvenance,
  ThemeModeDiff,
  ThemeModeDiffCounts,
  ThemeModeGroupCounts,
  ThemeSet,
  ThemeTokenChange,
  ThemeTokenChangeStatus,
} from "./types";
