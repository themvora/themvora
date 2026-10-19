import type { AdapterPluginContext, AdapterStrategy } from "@themvora/core";

export function createShadcnRefineContext(
  mode: "light" | "dark" | "system" | undefined,
  strategy: AdapterStrategy,
): AdapterPluginContext {
  return { strategy, mode };
}

export type ShadcnRefineState = Record<string, unknown>;

export type { AdapterPluginContext, AdapterStrategy };
