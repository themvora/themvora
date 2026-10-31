import { createDiagnostic, emitDiagnostic } from "../diagnostics";

/**
 * The adapter that failed while the runtime was synchronising a change.
 *
 * - `persistence` — the storage/cookie adapter (`set`, `remove`).
 * - `broadcast` — the cross-tab channel (`post`).
 */
export type ThemeSyncAdapterKind = "persistence" | "broadcast";

/**
 * Report an adapter failure that the runtime recovered from.
 *
 * @param api - The public API that was synchronising (`"setMode"`,
 *   `"setFamily"`, `"applyState"` or `"storeSync"`).
 * @param adapter - Which adapter threw.
 * @param cause - The thrown value.
 *
 * @remarks
 * A throwing adapter used to abort the rest of the apply, which left the
 * runtime half-updated: `getMode()` reported the new mode while the store still
 * held the old theme and no listener had fired. The call sites now isolate each
 * adapter, apply the change locally, and report the failure here — so the
 * failure is visible without pretending the selection was persisted.
 *
 * `level: "warning"` rather than `"error"`: the user-visible theme is correct,
 * and a blocked `localStorage` is an expected condition in private-mode and
 * sandboxed-iframe browsing, not a bug in the caller.
 */
export function emitSyncFailedDiagnostic(
  api: string,
  adapter: ThemeSyncAdapterKind,
  cause: unknown,
): void {
  emitDiagnostic(
    createDiagnostic({
      code: "TV_SYNC_FAILED",
      level: "warning",
      message:
        adapter === "persistence"
          ? `The ${adapter} adapter threw while ${api}() was applying a selection; ` +
            "the theme was applied but the selection was not persisted."
          : `The ${adapter} adapter threw while ${api}() was applying a selection; ` +
            "the theme was applied locally but other tabs were not notified.",
      context: { api, property: adapter },
      hint:
        adapter === "persistence"
          ? "Storage may be blocked (private mode, a sandboxed iframe, a full quota). " +
            "Pass a persistence adapter that tolerates that, or expect the selection to reset on reload."
          : "A BroadcastChannel throws after close() or when the value cannot be cloned. " +
            "Recreate the adapter after destroying it.",
      cause,
    }),
  );
}

/**
 * Run one adapter call, reporting a failure instead of propagating it.
 *
 * @param api - The public API being synchronised, for the diagnostic context.
 * @param adapter - Which adapter is being called.
 * @param run - The adapter call.
 *
 * @remarks
 * Only the adapter call is inside the `try`. Everything the runtime does with
 * the result — applying the resolved theme, notifying listeners — stays
 * outside it, so a genuine programming error in the runtime is still thrown
 * rather than being reported as "storage is blocked".
 */
export function runSyncAdapter(
  api: string,
  adapter: ThemeSyncAdapterKind,
  run: () => void,
): void {
  try {
    run();
  } catch (cause) {
    emitSyncFailedDiagnostic(api, adapter, cause);
  }
}
