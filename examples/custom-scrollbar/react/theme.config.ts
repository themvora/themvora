import { defineThemvoraConfig } from "@themvora/core";
import { themes } from "./src/themes";

/**
 * The application's Themvora configuration — the single declaration.
 *
 * The Vite plugin discovers this file at the project root, derives the pre-paint
 * bootstrap from it, and transports it to the browser for the provider. Neither
 * the plugin nor the provider declares these values, so they cannot drift.
 */
export default defineThemvoraConfig({
  themes,
  defaultTheme: "base-light",
  initialMode: "system",
});
