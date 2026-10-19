/**
 * The framework-adapter registry.
 *
 * One entry per `init`-supported framework. The set is asserted against
 * `INIT_FRAMEWORKS` by the test suite, so a framework cannot be `init`-supported
 * in the registry and missing an adapter — which would otherwise surface as a
 * crash on the one code path a user reaches first.
 *
 * @packageDocumentation
 */
import { nextAdapter } from "./next.js";
import { reactAdapter } from "./react.js";
import { solidAdapter } from "./solid.js";
import { svelteAdapter } from "./svelte.js";
import { vueAdapter } from "./vue.js";
import type { FrameworkAdapter } from "./context.js";

/** Every `init` integration, in the order `list frameworks` documents them. */
export const FRAMEWORK_ADAPTERS: readonly FrameworkAdapter[] = [
  reactAdapter,
  nextAdapter,
  vueAdapter,
  svelteAdapter,
  solidAdapter,
];

/**
 * Find an adapter by framework id.
 *
 * @param id - The `--framework` value.
 * @returns The adapter, or `undefined` when the framework is not `init`-supported.
 */
export function findAdapter(id: string): FrameworkAdapter | undefined {
  const needle = id.trim().toLowerCase();
  return FRAMEWORK_ADAPTERS.find((adapter) => adapter.id === needle);
}
