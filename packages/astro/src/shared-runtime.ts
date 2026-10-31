import type { ThemeDefinition, ThemeRuntime } from "@themvora/core";

let globalRuntime: ThemeRuntime<ThemeDefinition> | null = null;

/**
 * Installs the given runtime as the app-wide global runtime and, in the
 * browser, publishes it where the rest of Themvora looks for it.
 *
 * @param runtime - The theme runtime to install globally.
 *
 * @remarks
 * Three publications, all of them the same runtime:
 *
 * 1. the module-level `globalRuntime` — what this package's hooks read;
 * 2. `window.__themvoraRuntime` — the documented escape hatch;
 * 3. `document.documentElement.__themvoraRuntime` plus a `theme-ready` event —
 *    which is how `@themvora/web`'s custom elements (`<themvora-scrollbar>`,
 *    `<themvora-inspector>`, `<themvora-toggle>`, …) find a runtime. They
 *    resolve it by walking **DOM ancestors** for that property, and they only
 *    fall back to waiting for `theme-ready`, which until now was dispatched
 *    solely by `<themvora-provider>`. Without these two lines an Astro app
 *    that installs its runtime from a React island had no way to use the
 *    framework-neutral elements at all — the runtime existed, but nothing in
 *    the element tree could see it.
 *
 * @see {@link getGlobalRuntime}
 */
export function setGlobalRuntime<T extends ThemeDefinition>(
  runtime: ThemeRuntime<T>,
) {
  // Cast at the boundary, not at every call site: the installed runtime is one
  // per document, and its concrete definition type is whatever the app declared
  // — which the module-level slot cannot express. `ThemeRuntime<T>` is
  // invariant in `T` (`applyAutomaticTheme(theme: T)` is a property, so
  // `strictFunctionTypes` compares it contravariantly), so the narrowing has to
  // go through `unknown`; that is the honest statement that this store is
  // type-erased and the generic accessors re-assert it.
  globalRuntime = runtime as unknown as ThemeRuntime<ThemeDefinition>;
  if (typeof window === "undefined") return;

  (window as unknown as Record<string, unknown>).__themvoraRuntime = runtime;

  const root = document.documentElement as unknown as Record<string, unknown> | null;
  if (root) root.__themvoraRuntime = runtime;

  // Elements that mounted before the runtime existed are parked on this event.
  document.dispatchEvent(new CustomEvent("theme-ready", { detail: { runtime } }));
}

/**
 * Withdraws a runtime from the app-wide slot, if it is the installed one.
 *
 * @param runtime - The runtime being torn down.
 *
 * @remarks
 * **Call this after `runtime.destroy()`.** A destroyed runtime is not a runtime
 * any more: its DOM binding is gone, so it can still answer `getFamily()` and
 * still persist a selection, but nothing it is told will ever reach `<html>`.
 *
 * Without this, `<ClientRouter />` navigation between two pages that each mount
 * an island produced exactly that: the outgoing island destroyed the runtime on
 * unmount, the slot kept pointing at it, and the incoming island **adopted** it
 * — `ThemeProviderClient` prefers an existing runtime to creating a second one —
 * so the destination page rendered controls that changed the selection and
 * painted nothing. Measured on the example app: the family select moved to
 * `ocean` and `data-theme` stayed `mint-light`.
 *
 * Guarded by identity rather than clearing unconditionally: a caller tearing
 * down a runtime that is not the installed one — a test's, a storybook's, one a
 * previous island already replaced — must not take the document's runtime away.
 *
 * @internal
 */
export function releaseGlobalRuntime<T extends ThemeDefinition>(
  runtime: ThemeRuntime<T>,
): void {
  const typed = runtime as unknown as ThemeRuntime<ThemeDefinition>;
  if (globalRuntime !== typed) return;

  globalRuntime = null;
  if (typeof window === "undefined") return;

  const win = window as unknown as Record<string, unknown>;
  if (win.__themvoraRuntime === runtime) delete win.__themvoraRuntime;

  const root = document.documentElement as unknown as Record<string, unknown> | null;
  if (root && root.__themvoraRuntime === runtime) delete root.__themvoraRuntime;
}

/**
 * Returns the app-wide global runtime, or `null` when none has been installed
 * yet (e.g. before `ThemeProviderClient` mounts).
 *
 * @typeParam T - The theme definition type used by the application.
 * @returns The installed runtime, or `null`.
 *
 * @see {@link setGlobalRuntime}
 */
export function getGlobalRuntime<T extends ThemeDefinition>(): ThemeRuntime<T> | null {
  return globalRuntime as unknown as ThemeRuntime<T> | null;
}

/**
 * Returns the app-wide global runtime, throwing when none has been installed.
 *
 * @typeParam T - The theme definition type used by the application.
 * @returns The installed runtime.
 *
 * @throws {Error} When no runtime has been initialized (no `ThemeProviderClient` mounted).
 *
 * @see {@link getGlobalRuntime}
 * @see {@link setGlobalRuntime}
 */
export function requireGlobalRuntime<T extends ThemeDefinition>(): ThemeRuntime<T> {
  if (!globalRuntime) {
    throw new Error(
      "ThemeRuntime not initialized. useTheme*() and ThemeScope must run inside the island that owns the runtime: render them as children/siblings of <ThemeProviderClient> in the SAME island. Mounting them as separate client:only islands races, because Astro hydrates islands in an unspecified order and the consuming island may render before the provider island installs the runtime.",
    );
  }
  return globalRuntime as unknown as ThemeRuntime<T>;
}
