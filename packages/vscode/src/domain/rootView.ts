/**
 * One workspace folder and what the inspector read from it.
 *
 * The type lives in the domain because four surfaces consume it — the sidebar,
 * the Studio, the decorations and the status bar — and none of them should
 * depend on a view adapter to name their input.
 *
 * @packageDocumentation
 */
import type { ProjectInspection } from "./registry.js";

/** One workspace folder and what was read from it. */
export interface RootView {
  /** The folder's display name. */
  readonly name: string;
  /** The inspection result for it. */
  readonly inspection: ProjectInspection;
}
