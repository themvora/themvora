/**
 * Tests for inspection cache service.
 *
 * Verifies inspection caching, invalidation, and source analysis delegation.
 */
import { describe, expect, it, beforeEach } from "vitest";

import {
  createInspectionCacheService,
  type InspectionCacheService,
} from "../src/services/inspectionCache";
import type { ProjectInspection } from "../src/domain/registry";

describe("InspectionCacheService", () => {
  let cache: InspectionCacheService;

  beforeEach(() => {
    cache = createInspectionCacheService();
  });

  describe("source analysis caching", () => {
    it("caches and retrieves source analysis", () => {
      const analysis = { content: "test content", isProvider: false };

      cache.setSourceAnalysis("/test/file.ts", "test content", analysis);
      const cached = cache.getSourceAnalysis("/test/file.ts", "test content");

      expect(cached).toEqual(analysis);
    });

    it("returns undefined for uncached source", () => {
      const result = cache.getSourceAnalysis("/test/file.ts", "content");
      expect(result).toBeUndefined();
    });

    it("invalidates source analysis on content change", () => {
      const analysis = { content: "original" };

      cache.setSourceAnalysis("/test/file.ts", "original", analysis);
      
      // Same content - should hit
      expect(cache.getSourceAnalysis("/test/file.ts", "original")).toBeDefined();
      
      // Different content - should miss
      expect(cache.getSourceAnalysis("/test/file.ts", "modified")).toBeUndefined();
    });
  });

  describe("inspection caching", () => {
    it("caches and retrieves inspection results", () => {
      const inspection: ProjectInspection = {
        root: "/root",
        status: "supported",
        packages: [],
        registries: [],
        notes: [],
        providers: [],
        relationships: [],
      };
      const fileHashes = new Map([["/test/file.ts", "hash1"]]);

      cache.setInspection("/root", inspection, fileHashes);
      const cached = cache.getInspection("/root", fileHashes);

      expect(cached).toBeDefined();
      expect(cached?.inspection).toEqual(inspection);
    });

    it("returns undefined for uncached root", () => {
      const fileHashes = new Map([["/test/file.ts", "hash1"]]);
      const result = cache.getInspection("/root", fileHashes);
      expect(result).toBeUndefined();
    });

    it("invalidates when file hash changes", () => {
      const inspection: ProjectInspection = {
        root: "/root",
        status: "supported",
        packages: [],
        registries: [],
        notes: [],
        providers: [],
        relationships: [],
      };
      const originalHashes = new Map([["/test/file.ts", "hash1"]]);
      const modifiedHashes = new Map([["/test/file.ts", "hash2"]]);

      cache.setInspection("/root", inspection, originalHashes);
      
      // Same hashes - should hit
      expect(cache.getInspection("/root", originalHashes)).toBeDefined();
      
      // Different hash - should miss
      expect(cache.getInspection("/root", modifiedHashes)).toBeUndefined();
    });

    it("invalidates when file is deleted", () => {
      const inspection: ProjectInspection = {
        root: "/root",
        status: "supported",
        packages: [],
        registries: [],
        notes: [],
        providers: [],
        relationships: [],
      };
      const originalHashes = new Map([
        ["/test/file1.ts", "hash1"],
        ["/test/file2.ts", "hash2"],
      ]);
      const afterDeletion = new Map([["/test/file1.ts", "hash1"]]);

      cache.setInspection("/root", inspection, originalHashes);
      
      // File deleted - should miss
      expect(cache.getInspection("/root", afterDeletion)).toBeUndefined();
    });
  });

  describe("invalidation", () => {
    it("invalidates source cache on file change", () => {
      const analysis = { content: "test" };
      cache.setSourceAnalysis("/test/file.ts", "test", analysis);

      cache.invalidateFile("/test/file.ts");

      expect(cache.getSourceAnalysis("/test/file.ts", "test")).toBeUndefined();
    });

    it("invalidates inspection cache on file change", () => {
      const inspection: ProjectInspection = {
        root: "/root",
        status: "supported",
        packages: [],
        registries: [],
        notes: [],
        providers: [],
        relationships: [],
      };
      const fileHashes = new Map([["/test/file.ts", "hash1"]]);

      cache.setInspection("/root", inspection, fileHashes);

      cache.invalidateFile("/test/file.ts");

      expect(cache.getInspection("/root", fileHashes)).toBeUndefined();
    });

    it("invalidates inspection cache for root", () => {
      const inspection: ProjectInspection = {
        root: "/root",
        status: "supported",
        packages: [],
        registries: [],
        notes: [],
        providers: [],
        relationships: [],
      };
      const fileHashes = new Map([["/test/file.ts", "hash1"]]);

      cache.setInspection("/root", inspection, fileHashes);

      cache.invalidateRoot("/root");

      expect(cache.getInspection("/root", fileHashes)).toBeUndefined();
    });

    it("clears all caches", () => {
      const analysis = { content: "test" };
      const inspection: ProjectInspection = {
        root: "/root",
        status: "supported",
        packages: [],
        registries: [],
        notes: [],
        providers: [],
        relationships: [],
      };

      cache.setSourceAnalysis("/test/file.ts", "test", analysis);
      cache.setInspection("/root", inspection, new Map());

      cache.clear();

      expect(cache.getSourceAnalysis("/test/file.ts", "test")).toBeUndefined();
      expect(cache.getInspection("/root", new Map())).toBeUndefined();
    });
  });

  describe("statistics", () => {
    it("reports cache statistics", () => {
      const analysis = { content: "test" };
      cache.setSourceAnalysis("/test/file.ts", "test", analysis);

      // Hit
      cache.getSourceAnalysis("/test/file.ts", "test");
      
      // Miss
      cache.getSourceAnalysis("/test/other.ts", "content");

      const stats = cache.stats();
      expect(stats.sourceCache.hits).toBe(1);
      expect(stats.sourceCache.misses).toBe(1);
      expect(stats.sourceCache.size).toBe(1);
      expect(stats.inspectionCache.size).toBe(0);
    });
  });
});
