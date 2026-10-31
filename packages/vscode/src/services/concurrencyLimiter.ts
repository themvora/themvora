/**
 * Concurrency control for large-workspace reliability.
 *
 * Limits the number of parallel operations to prevent resource exhaustion.
 * Uses a semaphore pattern to queue operations when the limit is reached.
 *
 * @packageDocumentation
 */

/** A concurrency limiter that queues operations when the limit is reached. */
export class ConcurrencyLimiter {
  private running = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {
    if (maxConcurrent < 1) {
      throw new Error(`maxConcurrent must be at least 1, got ${maxConcurrent}`);
    }
  }

  /**
   * Run an operation with concurrency limiting.
   *
   * If the limit is reached, the operation is queued and runs when a slot opens.
   *
   * @param operation - The async operation to run.
   * @returns The operation result.
   */
  async run<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await operation();
    } finally {
      this.release();
    }
  }

  /**
   * Run multiple operations with concurrency limiting.
   *
   * Operations run in parallel up to the limit, then queue.
   *
   * @param operations - The operations to run.
   * @returns The operation results in the same order.
   */
  async runAll<T>(operations: ReadonlyArray<() => Promise<T>>): Promise<T[]> {
    return Promise.all(operations.map((op) => this.run(op)));
  }

  /**
   * Get the number of currently running operations.
   *
   * @returns The running count.
   */
  getRunningCount(): number {
    return this.running;
  }

  /**
   * Get the number of queued operations waiting to run.
   *
   * @returns The queue length.
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Acquire a slot, waiting if necessary.
   */
  private async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }

    // Queue this operation until a slot opens
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * Release a slot and start the next queued operation if any.
   */
  private release(): void {
    const next = this.queue.shift();
    if (next !== undefined) {
      // Start the next queued operation (running count stays the same)
      next();
    } else {
      // No queued operations, decrement running count
      this.running--;
    }
  }
}

/**
 * Create a concurrency limiter for file reads.
 *
 * @param maxConcurrent - Maximum concurrent reads (default: 10).
 * @returns A ConcurrencyLimiter.
 */
export function createFileReadLimiter(maxConcurrent: number = 10): ConcurrencyLimiter {
  return new ConcurrencyLimiter(maxConcurrent);
}

/**
 * Create a concurrency limiter for file parsing.
 *
 * @param maxConcurrent - Maximum concurrent parses (default: 5).
 * @returns A ConcurrencyLimiter.
 */
export function createFileParseLimiter(maxConcurrent: number = 5): ConcurrencyLimiter {
  return new ConcurrencyLimiter(maxConcurrent);
}

/**
 * Batch operations into chunks that respect a concurrency limit.
 *
 * @param items - The items to process.
 * @param processor - The async processor for each item.
 * @param batchSize - The batch size (default: 10).
 * @returns The processed results.
 */
export async function batchProcess<T, R>(
  items: readonly T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Process items with a concurrency limit and progress callback.
 *
 * @param items - The items to process.
 * @param processor - The async processor for each item.
 * @param limiter - The concurrency limiter.
 * @param onProgress - Optional progress callback (processed, total).
 * @returns The processed results.
 */
export async function processWithLimit<T, R>(
  items: readonly T[],
  processor: (item: T) => Promise<R>,
  limiter: ConcurrencyLimiter,
  onProgress?: (processed: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = [];
  let processed = 0;

  const operations = items.map(async (item) => {
    const result = await limiter.run(() => processor(item));
    processed++;
    if (onProgress !== undefined) {
      onProgress(processed, items.length);
    }
    return result;
  });

  results.push(...(await Promise.all(operations)));
  return results;
}
