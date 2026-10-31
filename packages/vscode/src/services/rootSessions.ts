/**
 * Per-root serialisation of operations that touch a project.
 *
 * Two writes against the same root must not interleave: a generator writing a
 * theme file while another operation rewrites the same directory can leave a
 * half-written document. Two operations against *different* roots must not wait
 * for each other, because a slow write in one project has nothing to do with the
 * other.
 *
 * A chain per root gives both properties. The chain never rejects — a failed
 * task would otherwise poison every later task on that root — while the promise
 * returned to the caller still propagates the failure.
 *
 * @packageDocumentation
 */

/** Coordinates work per project root. */
export interface RootSessions {
  /**
   * Run a task once every earlier task on the same root has finished.
   *
   * @param root - The absolute project root. Compared after trimming trailing
   *   separators, so `C:/app` and `C:/app/` are the same root.
   * @param task - The work to run.
   * @returns The task's result, or its rejection.
   */
  run<T>(root: string, task: () => Promise<T>): Promise<T>;

  /**
   * How many tasks are queued or running for a root.
   *
   * @param root - The project root.
   * @returns The count; `0` when the root is idle.
   */
  pending(root: string): number;
}

/**
 * The key a root is tracked under.
 *
 * Trailing separators are stripped so two spellings of one directory cannot
 * acquire two independent locks — which would silently allow exactly the
 * interleaving this module exists to prevent. Case is preserved: lowercasing
 * would merge genuinely distinct paths on a case-sensitive filesystem.
 *
 * @param root - The root as supplied.
 * @returns The key.
 */
export function rootKey(root: string): string {
  const trimmed = root.replace(/[\\/]+$/, "");
  return trimmed === "" ? root : trimmed;
}

/**
 * Create a coordinator.
 *
 * @returns A fresh coordinator with no queued work.
 */
export function createRootSessions(): RootSessions {
  /** The tail of each root's chain; never rejects. */
  const chains = new Map<string, Promise<void>>();
  /** In-flight task counts, for {@link RootSessions.pending}. */
  const counts = new Map<string, number>();

  return {
    run<T>(root: string, task: () => Promise<T>): Promise<T> {
      const key = rootKey(root);
      const previous = chains.get(key) ?? Promise.resolve();

      counts.set(key, (counts.get(key) ?? 0) + 1);

      const result = previous.then(() => task());

      // The chain's tail swallows the outcome so one failure cannot stall the
      // root, and the entry is dropped once it is the last one, so a workspace
      // that is closed does not leave a map entry behind.
      const tail = result.then(
        () => undefined,
        () => undefined,
      );

      chains.set(key, tail);

      const release = (): void => {
        const remaining = (counts.get(key) ?? 1) - 1;
        if (remaining <= 0) {
          counts.delete(key);
          if (chains.get(key) === tail) chains.delete(key);
        } else {
          counts.set(key, remaining);
        }
      };

      tail.then(release, release);

      return result;
    },

    pending(root: string): number {
      return counts.get(rootKey(root)) ?? 0;
    },
  };
}
