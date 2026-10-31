/**
 * Smart defaults for patch target files.
 *
 * Tests the suggestion logic for target files, provider files, and component
 * files based on project inspection and framework detection.
 */
import { describe, expect, it } from "vitest";

import type { FrameworkId } from "../src/domain/projectProfile";
import type { ProjectInspection } from "../src/domain/registry";
import {
  suggestComponentFiles,
  suggestProviderFiles,
  suggestTargetFiles,
} from "../src/domain/smartDefaults";

/** A minimal inspection for testing. */
function inspection(overrides: Partial<ProjectInspection> = {}): ProjectInspection {
  return {
    root: "/app",
    status: "supported",
    packages: [],
    notes: [],
    registries: [],
    providers: [],
    relationships: [],
    ...overrides,
  };
}

describe("suggestTargetFiles", () => {
  it("suggests existing theme files first", () => {
    const result = suggestTargetFiles(
      inspection({
        registries: [
          {
            kind: "theme-module",
            path: "src/theme.ts",
            status: "supported",
            detail: "src/theme.ts — 2 themes.",
            themes: [],
          },
        ],
      }),
    );

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.path).toBe("src/theme.ts");
    expect(result[0]?.exists).toBe(true);
    expect(result[0]?.priority).toBe(1);
  });

  it("suggests common locations when no theme files exist", () => {
    const result = suggestTargetFiles(inspection());

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => !s.exists)).toBe(true);
    expect(result.some((s) => s.path === "src/theme.ts")).toBe(true);
  });

  it("sorts suggestions by priority", () => {
    const result = suggestTargetFiles(
      inspection({
        registries: [
          {
            kind: "theme-module",
            path: "src/theme.ts",
            status: "supported",
            detail: "src/theme.ts — 2 themes.",
            themes: [],
          },
        ],
      }),
    );

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]!.priority).toBeLessThanOrEqual(result[i]!.priority);
    }
  });
});

describe("suggestProviderFiles", () => {
  it("suggests existing provider files first", () => {
    const result = suggestProviderFiles(
      inspection({
        providers: [
          {
            path: "src/ThemeProvider.tsx",
            names: ["myTheme"],
            api: "ThemeProvider",
            integration: "react",
          },
        ],
      }),
      "react",
    );

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.path).toBe("src/ThemeProvider.tsx");
    expect(result[0]?.exists).toBe(true);
    expect(result[0]?.priority).toBe(1);
  });

  it("suggests framework-specific paths for React", () => {
    const result = suggestProviderFiles(inspection(), "react");

    expect(result.some((s) => s.path === "src/ThemeProvider.tsx")).toBe(true);
    expect(result.some((s) => s.path.includes("providers"))).toBe(true);
  });

  it("suggests framework-specific paths for Vue", () => {
    const result = suggestProviderFiles(inspection(), "vue");

    expect(result.some((s) => s.path === "src/ThemeProvider.vue")).toBe(true);
  });

  it("suggests framework-specific paths for Next.js", () => {
    const result = suggestProviderFiles(inspection(), "next");

    expect(result.some((s) => s.path === "src/ThemeProvider.tsx")).toBe(true);
  });

  it("does not duplicate existing providers", () => {
    const result = suggestProviderFiles(
      inspection({
        providers: [
          {
            path: "src/ThemeProvider.tsx",
            names: ["myTheme"],
            api: "ThemeProvider",
            integration: "react",
          },
        ],
      }),
      "react",
    );

    const paths = result.map((s) => s.path);
    const uniquePaths = new Set(paths);
    expect(paths.length).toBe(uniquePaths.size);
  });
});

describe("suggestComponentFiles", () => {
  it("suggests React entry points", () => {
    const result = suggestComponentFiles(inspection(), "react");

    expect(result.some((s) => s.path === "src/main.tsx")).toBe(true);
    expect(result.some((s) => s.path === "src/App.tsx")).toBe(true);
  });

  it("suggests Next.js entry points", () => {
    const result = suggestComponentFiles(inspection(), "next");

    expect(result.some((s) => s.path === "app/layout.tsx")).toBe(true);
    expect(result.some((s) => s.path === "pages/_app.tsx")).toBe(true);
  });

  it("suggests Vue entry points", () => {
    const result = suggestComponentFiles(inspection(), "vue");

    expect(result.some((s) => s.path === "src/main.ts")).toBe(true);
    expect(result.some((s) => s.path === "src/App.vue")).toBe(true);
  });

  it("suggests Svelte entry points", () => {
    const result = suggestComponentFiles(inspection(), "svelte");

    expect(result.some((s) => s.path === "src/main.ts")).toBe(true);
    expect(result.some((s) => s.path === "src/App.svelte")).toBe(true);
  });

  it("suggests layout files", () => {
    const result = suggestComponentFiles(inspection(), "react");

    expect(result.some((s) => s.path.includes("Layout"))).toBe(true);
  });

  it("prioritizes existing files", () => {
    const result = suggestComponentFiles(
      inspection({
        providers: [
          {
            path: "src/main.tsx",
            names: [],
            api: "ThemeProvider",
            integration: "react",
          },
        ],
      }),
      "react",
    );

    const mainEntry = result.find((s) => s.path === "src/main.tsx");
    expect(mainEntry?.exists).toBe(true);
    expect(mainEntry?.priority).toBe(1);
  });

  it("sorts suggestions by priority", () => {
    const result = suggestComponentFiles(inspection(), "react");

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]!.priority).toBeLessThanOrEqual(result[i]!.priority);
    }
  });
});

describe("framework-specific suggestions", () => {
  const frameworks: FrameworkId[] = [
    "react",
    "vue",
    "svelte",
    "next",
    "nuxt",
    "astro",
    "angular",
    "solid",
    "remix",
  ];

  for (const framework of frameworks) {
    it(`provides suggestions for ${framework}`, () => {
      const targetFiles = suggestTargetFiles(inspection());
      const providerFiles = suggestProviderFiles(inspection(), framework);
      const componentFiles = suggestComponentFiles(inspection(), framework);

      expect(targetFiles.length).toBeGreaterThan(0);
      expect(providerFiles.length).toBeGreaterThan(0);
      expect(componentFiles.length).toBeGreaterThan(0);
    });
  }
});
