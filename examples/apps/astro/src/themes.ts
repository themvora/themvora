// Re-exported so `theme.config.ts` stays the single declaration the Astro
// integration discovers: it reads `themes` from here.
export {
  themes,
  brandThemes,
  presetThemes,
  selection,
  defaultTheme,
  initialMode,
  transition,
  modes,
  previewColors,
  scopedTheme,
} from "@themvora/app-shared/themes";
