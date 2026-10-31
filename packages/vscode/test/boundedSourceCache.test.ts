import { describe, expect, it } from "vitest";

import { MINIMAL_BOUNDS } from "../src/domain/resourceBounds.js";
import { createBoundedSourceCache } from "../src/services/boundedSourceCache.js";

describe("BoundedSourceCache", () => {
  it("tracks cache entries against resource bounds", () => {
    const cache = createBoundedSourceCache({ maxEntries: 100 }, MINIMAL_BOUNDS);
    
    cache.set("/file1.ts", "content1", { content: "content1" });
    cache.set("/file2.ts", "content2", { content: "content2" });
    
    const stats = cache.stats();
    expect(stats.size).toBe(2);
    expect(stats.memoryEstimateMb).toBeGreaterThan(0);
  });

  it("retrieves cached results", () => {
    const cache = createBoundedSourceCache({ maxEntries: 100 }, MINIMAL_BOUNDS);
    const analysis = { content: "test content", isProvider: true };
    
    cache.set("/test.ts", "test content", analysis);
    const { result } = cache.get("/test.ts", "test content");
    
    expect(result).toEqual(analysis);
  });

  it("returns undefined for cache miss", () => {
    const cache = createBoundedSourceCache({ maxEntries: 100 }, MINIMAL_BOUNDS);
    const { result } = cache.get("/missing.ts", "content");
    
    expect(result).toBeUndefined();
  });

  it("invalidates on content change", () => {
    const cache = createBoundedSourceCache({ maxEntries: 100 }, MINIMAL_BOUNDS);
    const analysis = { content: "old content" };
    
    cache.set("/test.ts", "old content", analysis);
    const { result } = cache.get("/test.ts", "new content");
    
    expect(result).toBeUndefined();
  });

  it("invalidates specific files", () => {
    const cache = createBoundedSourceCache({ maxEntries: 100 }, MINIMAL_BOUNDS);
    
    cache.set("/file1.ts", "content1", { content: "content1" });
    cache.set("/file2.ts", "content2", { content: "content2" });
    cache.invalidate("/file1.ts");
    
    const { result: result1 } = cache.get("/file1.ts", "content1");
    const { result: result2 } = cache.get("/file2.ts", "content2");
    
    expect(result1).toBeUndefined();
    expect(result2).toBeDefined();
  });

  it("invalidates files matching predicate", () => {
    const cache = createBoundedSourceCache({ maxEntries: 100 }, MINIMAL_BOUNDS);
    
    cache.set("/src/file1.ts", "content1", { content: "content1" });
    cache.set("/test/file2.ts", "content2", { content: "content2" });
    cache.set("/src/file3.ts", "content3", { content: "content3" });
    
    cache.invalidateWhere((path) => path.startsWith("/src/"));
    
    const { result: result1 } = cache.get("/src/file1.ts", "content1");
    const { result: result2 } = cache.get("/test/file2.ts", "content2");
    const { result: result3 } = cache.get("/src/file3.ts", "content3");
    
    expect(result1).toBeUndefined();
    expect(result2).toBeDefined();
    expect(result3).toBeUndefined();
  });

  it("clears all entries and resets counters", () => {
    const cache = createBoundedSourceCache({ maxEntries: 100 }, MINIMAL_BOUNDS);
    
    cache.set("/file1.ts", "content1", { content: "content1" });
    cache.set("/file2.ts", "content2", { content: "content2" });
    cache.clear();
    
    const stats = cache.stats();
    expect(stats.size).toBe(0);
    expect(stats.memoryEstimateMb).toBe(0);
    expect(stats.limitsHit.length).toBe(0);
  });

  it("reports when within bounds", () => {
    const cache = createBoundedSourceCache({ maxEntries: 100 }, MINIMAL_BOUNDS);
    
    cache.set("/file1.ts", "content1", { content: "content1" });
    
    expect(cache.isWithinBounds()).toBe(true);
  });

  it("tracks limits hit", () => {
    // Use very small bounds to trigger limit
    const smallBounds = { ...MINIMAL_BOUNDS, maxCacheEntries: 100 };
    const cache = createBoundedSourceCache({ maxEntries: 100 }, smallBounds);
    
    // Add many entries to exceed limit
    for (let i = 0; i < 150; i++) {
      cache.set(`/file${i}.ts`, `content${i}`, { content: `content${i}` });
    }
    
    const limits = cache.getLimitsHit();
    expect(limits.length).toBeGreaterThan(0);
  });

  it("provides comprehensive statistics", () => {
    const cache = createBoundedSourceCache({ maxEntries: 100 }, MINIMAL_BOUNDS);
    
    cache.set("/file1.ts", "content1", { content: "content1" });
    cache.get("/file1.ts", "content1"); // hit
    cache.get("/missing.ts", "content"); // miss
    
    const stats = cache.stats();
    expect(stats.size).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
    expect(stats.memoryEstimateMb).toBeGreaterThanOrEqual(0);
    expect(stats.limitsHit).toBeDefined();
    expect(stats.anyExceeded).toBeDefined();
  });
});
