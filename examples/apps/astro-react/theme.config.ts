import { getPresetThemes, defineThemvoraConfig } from "@themvora/core";

export default defineThemvoraConfig({
  themes: getPresetThemes(),
  defaultTheme: "mint-light",
  initialMode: "system",
  initialFamily: "mint",
  transition: { duration: 200, enabled: true, preset: "smooth" },
});
