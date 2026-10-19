/**
 * Build-time entry: discovery of the application's `theme.config.ts`.
 *
 * Imported from `@themvora/core/config`. Kept out of the main entry because it
 * uses node builtins, which a browser bundle of `@themvora/core` must never
 * pull in — the main entry is runtime code, this is build-time code.
 *
 * @packageDocumentation
 */
export {
  loadThemvoraConfig,
  THEMVORA_CONFIG_FILES,
} from "./config-loader";
