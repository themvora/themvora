/**
 * Tests for source analysis cache.
 *
 * Verifies caching behavior, invalidation, and bounds.
 */
import { describe, expect, it, beforeEach } from "vitest";

import {
  createSourceAnalysisCache,
  type SourceAnalysisResult,
} from "../src/services/sourceAnalysisCache";

describe("SourceAnalysisCache", () => {
  let cache: ReturnType<typeof createSourceAnalysisCache>;

  beforeEach(() => {
    cache = createSourceAnalysisCache({ maxEntries: 5, maxAgeMs: 60000 });
  });

  it("returns undefined for uncached paths", () => {
    const result = cache.get("/test/file.ts", "content");
    expect(result).toBeUndefined();
  });

  it("caches and retrieves analysis results", () => {
    const analysis: SourceAnalysisResult = {
      content: "test content",
      isProvider: false,
    };

    cache.set("/test/file.ts", "test content", analysis);
    const cached = cache.get("/test/file.ts", "test content");

    expect(cached).toBeDefined();
    expect(cached?.analysis).toEqual(analysis);
    expect(cached?.path).toBe("/test/file.ts");
  });

  it("invalidates when content changes", () => {
    const analysis: SourceAnalysisResult = {
      content: "original",
    };

    cache.set("/test/file.ts", "original", analysis);
    
    // Same content - should hit
    expect(cache.get("/test/file.ts", "original")).toBeDefined();
    
    // Different content - should miss
    expect(cache.get("/test/file.ts", "modified")).toBeUndefined();
  });

  it("invalidates specific paths", () => {
    const analysis: SourceAnalysisResult = { content: "test" };

    cache.set("/test/file1.ts", "content1", analysis);
    cache.set("/test/file2.ts", "content2", analysis);

    cache.invalidate("/test/file1.ts");

    expect(cache.get("/test/file1.ts", "content1")).toBeUndefined();
    expect(cache.get("/test/file2.ts", "content2")).toBeDefined();
  });

  it("invalidates with predicate", () => {
    const analysis: SourceAnalysisResult = { content: "test" };

    cache.set("/src/file1.ts", "content1", analysis);
    cache.set("/src/file2.ts", "content2", analysis);
    cache.set("/test/file3.ts", "content3", analysis);

    cache.invalidateWhere((path) => path.startsWith("/src/"));

    expect(cache.get("/src/file1.ts", "content1")).toBeUndefined();
    expect(cache.get("/src/file2.ts", "content2")).toBeUndefined();
    expect(cache.get("/test/file3.ts", "content3")).toBeDefined();
  });

  it("evicts oldest entry when at capacity", () => {
    const analysis: SourceAnalysisResult = { content: "test" };

    // Fill cache to capacity
    for (let i = 0; i < 5; i++) {
      cache.set(`/file${i}.ts`, `content${i}`, { ...analysis, content: `content${i}` });
    }

    // All should be cached
    for (let i = 0; i < 5; i++) {
      expect(cache.get(`/file${i}.ts`, `content${i}`)).toBeDefined();
    }

    // Add one more - should evict oldest
    cache.set("/file5.ts", "content5", { ...analysis, content: "content5" });

    // First entry should be evicted
    expect(cache.get("/file0.ts", "content0")).toBeUndefined();
    // Others should still be cached
    expect(cache.get("/file1.ts", "content1")).toBeDefined();
    expect(cache.get("/file5.ts", "content5")).toBeDefined();
  });

  it("clears all entries", () => {
    const analysis: SourceAnalysisResult = { content: "test" };

    cache.set("/file1.ts", "content1", analysis);
    cache.set("/file2.ts", "content2", analysis);

    cache.clear();

    expect(cache.get("/file1.ts", "content1")).toBeUndefined();
    expect(cache.get("/file2.ts", "content2")).toBeUndefined();
  });

  it("tracks hit/miss statistics", () => {
    const analysis: SourceAnalysisResult = { content: "test" };

    cache.set("/file.ts", "content", analysis);

    // Miss (not cached)
    cache.get("/other.ts", "content");
    
    // Hit
    cache.get("/file.ts", "content");
    
    // Miss (content changed, entry deleted)
    cache.get("/file.ts", "modified");

    const stats = cache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(2);
    expect(stats.size).toBe(0); // Entry was deleted after content mismatch
  });

  it("handles null content", () => {
    const analysis: SourceAnalysisResult = { content: null };

    cache.set("/missing.ts", null, analysis);
    const cached = cache.get("/missing.ts", null);

    expect(cached).toBeDefined();
    expect(cached?.analysis.content).toBeNull();
  });
});
