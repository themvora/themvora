/**
 * The verified theme-API table.
 *
 * The extension recognizes catalog calls only when their binding comes from a
 * package in this table. If a name is added here that the package does not
 * export — or a re-export is removed — recognition becomes a lie. These tests
 * hold the table against the shipped modules and the one source re-export.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import * as core from "@themvora/core";
import * as vanilla from "@themvora/core/vanilla";
import { describe, expect, it } from "vitest";

import { VERIFIED_THEME_APIS } from "../src/domain/themeApis";

describe("verified theme API surface", () => {
  it("names functions core actually exports", () => {
    for (const name of VERIFIED_THEME_APIS["@themvora/core"] ?? []) {
      expect(typeof (core as Record<string, unknown>)[name], name).toBe("function");
    }
  });

  it("claims only generateTheme from the vanilla entry", () => {
    expect(VERIFIED_THEME_APIS["@themvora/core/vanilla"]).toEqual(["generateTheme"]);

    for (const name of VERIFIED_THEME_APIS["@themvora/core/vanilla"] ?? []) {
      expect(typeof (vanilla as Record<string, unknown>)[name], name).toBe("function");
    }
  });

  it("follows Nuxt's core re-export", () => {
    const source = readFileSync(
      fileURLToPath(new URL("../../nuxt/src/index.ts", import.meta.url)),
      "utf8",
    );

    expect(source).toContain('export * from "@themvora/core"');
    expect(VERIFIED_THEME_APIS["@themvora/nuxt"]).toEqual(VERIFIED_THEME_APIS["@themvora/core"]);
  });

  it("does not claim @themvora/web exports core theme APIs", () => {
    expect(VERIFIED_THEME_APIS["@themvora/web"]).toBeUndefined();
  });
});
