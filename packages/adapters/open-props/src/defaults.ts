import type { AdapterStrategy } from "@themvora/core";

export const OPEN_PROPS_STYLE_ID = "@themvora/open-props";
export const OPEN_PROPS_VARIABLES_STYLE_ID = "themvora-open-props-variables";

/**
 * Options for the Open Props adapter.
 *
 * @see {@link createOpenPropsAdapter}
 */
export interface OpenPropsAdapterOptions {
  /** How faithfully the adapter reproduces Open Props' native feel. */
  strategy?: AdapterStrategy;
  /** Whether to inject the Open Props compatibility stylesheet. Defaults to `true`. */
  injectCSS?: boolean;
}

/**
 * Defaults for {@link OpenPropsAdapterOptions}.
 */
export const DEFAULT_OPEN_PROPS_OPTIONS: Required<OpenPropsAdapterOptions> = {
  strategy: "native",
  injectCSS: true,
};