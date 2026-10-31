/**
 * Capability-detection tests.
 *
 * Detection inspects the real `@themvora/core` namespace, so the first test is
 * the one that matters: against the installed package, everything the client
 * claims to do is actually exported. The partial-module tests then prove the
 * detection logic degrades honestly rather than throwing.
 */
import * as core from "@themvora/core";
import { describe, expect, it } from "vitest";

import {
  CLI_UNAVAILABLE_REASON,
  CORE_OPERATION_EXPORTS,
  detectCapabilities,
} from "../src/domain/capabilities";

describe("detectCapabilities against the installed core", () => {
  const capabilities = detectCapabilities(core as unknown as Record<string, unknown>);

  it("reports every in-process operation as available", () => {
    expect(capabilities.core.available).toEqual([
      "generate",
      "validate",
      "catalog",
      "diff",
      "exportVariables",
      "cssDocument",
      "migrate",
    ]);
    expect(capabilities.core.unavailable).toEqual([]);
  });

  it("only names exports that really exist", () => {
    // Guards the table itself: a typo here would make an operation look
    // permanently unavailable, which no other test would catch.
    for (const [operation, exports] of Object.entries(CORE_OPERATION_EXPORTS)) {
      for (const name of exports) {
        expect(core, `${operation} needs ${name}`).toHaveProperty(name);
      }
    }
  });

  it("reports the CLI as unavailable, with a reason", () => {
    expect(capabilities.cli.available).toBe(false);
    expect(capabilities.cli.reason).toBe(CLI_UNAVAILABLE_REASON);
    // The reason names the two capabilities the bundle does not have, so a user
    // can tell why the feature is missing rather than assuming it is broken.
    expect(capabilities.cli.reason).toContain("filesystem");
    expect(capabilities.cli.reason).toContain("process spawning");
    expect(capabilities.cli.reason).toContain("MILESTONE-3-CLI-DECISION.md");
  });

  it("marks every CLI operation unavailable individually", () => {
    for (const operation of ["init", "add", "doctor", "listFrameworks", "exportFiles"] as const) {
      const availability = capabilities.cli.operations[operation];
      expect(availability.available).toBe(false);
      expect(availability.reason).toBe(CLI_UNAVAILABLE_REASON);
    }
  });
});

describe("detectCapabilities against an incompatible core", () => {
  it("reports everything unavailable when nothing is exported", () => {
    const capabilities = detectCapabilities({});

    expect(capabilities.core.available).toEqual([]);
    expect(capabilities.core.unavailable).toHaveLength(7);
  });

  it("names the missing exports, so the failure is actionable", () => {
    const capabilities = detectCapabilities({});

    const generate = capabilities.core.operations.generate;
    expect(generate.available).toBe(false);
    expect(generate.reason).toContain("`generateTheme`");
    expect(generate.reason).toContain("cannot run");
  });

  it("degrades per operation rather than all-or-nothing", () => {
    // A core that can generate but cannot diff must still generate.
    const capabilities = detectCapabilities({
      generateTheme: () => undefined,
      validateTheme: () => undefined,
      validateThemeLevels: () => undefined,
      measureThemeContrast: () => undefined,
      getPresetCatalog: () => undefined,
      GENERATION_STYLE_NAMES: [],
      themeToCSSVariables: () => undefined,
      themeToCssDocument: () => "",
      resolveTheme: () => ({}),
      migrateTheme: (theme: unknown) => theme,
    });

    expect(capabilities.core.operations.generate.available).toBe(true);
    expect(capabilities.core.operations.catalog.available).toBe(true);
    expect(capabilities.core.operations.diff.available).toBe(false);
    expect(capabilities.core.unavailable).toEqual(["diff"]);
  });

  it("treats a partially exported operation as unavailable", () => {
    // `validate` needs three exports; two is not enough.
    const capabilities = detectCapabilities({
      validateTheme: () => undefined,
      validateThemeLevels: () => undefined,
    });

    const validate = capabilities.core.operations.validate;
    expect(validate.available).toBe(false);
    expect(validate.reason).toContain("`measureThemeContrast`");
  });
});
