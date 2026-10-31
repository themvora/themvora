import { describe, expect, it } from "vitest";

import {
  batchProcess,
  ConcurrencyLimiter,
  createFileParseLimiter,
  createFileReadLimiter,
  processWithLimit,
} from "../src/services/concurrencyLimiter.js";

describe("ConcurrencyLimiter", () => {
  it("runs operations immediately when under limit", async () => {
    const limiter = new ConcurrencyLimiter(3);
    const results = await Promise.all([
      limiter.run(async () => 1),
      limiter.run(async () => 2),
      limiter.run(async () => 3),
    ]);
    expect(results).toEqual([1, 2, 3]);
  });

  it("queues operations when limit is reached", async () => {
    const limiter = new ConcurrencyLimiter(2);
    let running = 0;
    let maxRunning = 0;

    const operation = async (): Promise<number> => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running--;
      return running;
    };

    await limiter.runAll([operation, operation, operation, operation, operation]);
    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it("tracks running count", async () => {
    const limiter = new ConcurrencyLimiter(2);
    expect(limiter.getRunningCount()).toBe(0);

    const promise = limiter.run(async () => {
      expect(limiter.getRunningCount()).toBe(1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "done";
    });

    await promise;
    expect(limiter.getRunningCount()).toBe(0);
  });

  it("tracks queue length", async () => {
    const limiter = new ConcurrencyLimiter(1);
    expect(limiter.getQueueLength()).toBe(0);

    const blocker = new Promise<void>((resolve) => setTimeout(resolve, 50));
    const blocked1 = limiter.run(async () => {
      await blocker;
      return 1;
    });
    const blocked2 = limiter.run(async () => 2);
    const blocked3 = limiter.run(async () => 3);

    // Give the operations time to queue
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(limiter.getQueueLength()).toBe(2);

    await Promise.all([blocked1, blocked2, blocked3]);
    expect(limiter.getQueueLength()).toBe(0);
  });

  it("throws on invalid maxConcurrent", () => {
    expect(() => new ConcurrencyLimiter(0)).toThrow();
    expect(() => new ConcurrencyLimiter(-1)).toThrow();
  });
});

describe("createFileReadLimiter", () => {
  it("creates a limiter with default concurrency", () => {
    const limiter = createFileReadLimiter();
    expect(limiter).toBeInstanceOf(ConcurrencyLimiter);
  });

  it("creates a limiter with custom concurrency", () => {
    const limiter = createFileReadLimiter(20);
    expect(limiter).toBeInstanceOf(ConcurrencyLimiter);
  });
});

describe("createFileParseLimiter", () => {
  it("creates a limiter with default concurrency", () => {
    const limiter = createFileParseLimiter();
    expect(limiter).toBeInstanceOf(ConcurrencyLimiter);
  });
});

describe("batchProcess", () => {
  it("processes items in batches", async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const processed: number[] = [];

    const results = await batchProcess(
      items,
      async (item) => {
        processed.push(item);
        return item * 2;
      },
      3,
    );

    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    expect(processed.length).toBe(10);
  });

  it("handles empty array", async () => {
    const results = await batchProcess([], async (item: number) => item, 5);
    expect(results).toEqual([]);
  });

  it("handles batch size larger than array", async () => {
    const results = await batchProcess([1, 2, 3], async (item) => item * 2, 10);
    expect(results).toEqual([2, 4, 6]);
  });
});

describe("processWithLimit", () => {
  it("processes items with concurrency limit", async () => {
    const limiter = new ConcurrencyLimiter(2);
    const items = [1, 2, 3, 4, 5];
    let running = 0;
    let maxRunning = 0;

    const results = await processWithLimit(
      items,
      async (item) => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
        return item * 2;
      },
      limiter,
    );

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it("calls progress callback", async () => {
    const limiter = new ConcurrencyLimiter(2);
    const items = [1, 2, 3, 4];
    const progressCalls: Array<[number, number]> = [];

    await processWithLimit(
      items,
      async (item) => item,
      limiter,
      (processed, total) => {
        progressCalls.push([processed, total]);
      },
    );

    expect(progressCalls.length).toBe(4);
    expect(progressCalls[3]).toEqual([4, 4]);
  });

  it("handles empty array", async () => {
    const limiter = new ConcurrencyLimiter(2);
    const results = await processWithLimit([], async (item: number) => item, limiter);
    expect(results).toEqual([]);
  });
});
