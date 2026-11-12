import { defineThemvoraConfig, getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

export default defineThemvoraConfig({
  themes,
  defaultTheme: "mint-light",
  initialMode: "system",
  initialFamily: "mint",
  transition: { enabled: false },
});
