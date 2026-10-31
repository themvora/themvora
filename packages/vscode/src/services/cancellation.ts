/**
 * Cancellation tokens for long-running operations.
 *
 * A cancellation token is a simple cooperative cancellation mechanism. The
 * operation checks `isCancellationRequested` at safe points and throws
 * `CancellationError` when cancellation is detected.
 *
 * @packageDocumentation
 */

/**
 * Error thrown when an operation is cancelled.
 */
export class CancellationError extends Error {
  constructor() {
    super("Operation was cancelled");
    this.name = "CancellationError";
  }
}

/**
 * A token that can be checked to detect cancellation requests.
 */
export interface CancellationToken {
  /** Whether cancellation has been requested. */
  readonly isCancellationRequested: boolean;
  /** Register a callback to be called when cancellation is requested. */
  onCancellationRequested(callback: () => void): void;
}

/**
 * A source that can create cancellation tokens and request cancellation.
 */
export interface CancellationTokenSource {
  /** The token associated with this source. */
  readonly token: CancellationToken;
  /** Request cancellation. */
  cancel(): void;
  /** Dispose of the source and release resources. */
  dispose(): void;
}

/**
 * Create a new cancellation token source.
 *
 * @returns The source.
 */
export function createCancellationTokenSource(): CancellationTokenSource {
  let cancelled = false;
  const callbacks: Array<() => void> = [];

  const token: CancellationToken = {
    get isCancellationRequested() {
      return cancelled;
    },
    onCancellationRequested(callback: () => void) {
      if (cancelled) {
        callback();
      } else {
        callbacks.push(callback);
      }
    },
  };

  return {
    token,
    cancel() {
      if (cancelled) return;
      cancelled = true;
      for (const callback of callbacks) {
        try {
          callback();
        } catch {
          // Swallow callback errors to ensure all callbacks run
        }
      }
      callbacks.length = 0;
    },
    dispose() {
      callbacks.length = 0;
    },
  };
}

/**
 * A token that is never cancelled.
 */
export const noneCancellationToken: CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested() {
    // Never fires
  },
};

/**
 * Check a cancellation token and throw if cancelled.
 *
 * @param token - The token to check.
 * @throws {CancellationError} If cancellation was requested.
 */
export function throwIfCancelled(token: CancellationToken): void {
  if (token.isCancellationRequested) {
    throw new CancellationError();
  }
}
