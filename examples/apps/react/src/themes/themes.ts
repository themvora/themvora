// The reference app consumes the suite's canonical theme fixtures so no palette
// is declared twice. `themvora` is the custom brand light/dark pair; presets come
// from the core catalog (see @themvora/app-shared/themes).
export {
  brandThemes as themvora,
  presetThemes,
  selection,
  themes,
  defaultTheme,
  initialMode,
  transition,
} from "@themvora/app-shared/themes";
