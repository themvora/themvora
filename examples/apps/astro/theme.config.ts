import { defineThemvoraConfig } from "@themvora/core";
import { themes, defaultTheme, initialMode } from "./src/themes";

export default defineThemvoraConfig({
  themes,
  defaultTheme,
  initialMode,
  transition: { enabled: false },
  scrollbar: true,
});
