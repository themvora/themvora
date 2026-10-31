/**
 * Drift guard for the registry module paths.
 *
 * `THEME_MODULE_PATHS` repeats two strings that live in
 * `packages/cli/src/init/registry-file.ts`, because that module is internal to
 * the CLI and freezing it into the CLI's public API for two paths would be a
 * worse trade than this test.
 *
 * The test reads the CLI's source directly. It is a monorepo-only check: when
 * the extension is consumed on its own the CLI source is absent and the test
 * skips rather than failing.
 *
 * @packageDocumentation
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { THEME_MODULE_PATHS } from "../src/domain/projectFiles";

/** The CLI module that owns the canonical list. */
const CLI_REGISTRY = fileURLToPath(
  new URL("../../cli/src/init/registry-file.ts", import.meta.url),
);

const present = existsSync(CLI_REGISTRY);

describe.skipIf(!present)("registry module paths", () => {
  it("still matches the paths `init` writes", () => {
    const source = readFileSync(CLI_REGISTRY, "utf8");

    for (const path of THEME_MODULE_PATHS) {
      expect(source, `the CLI no longer writes ${path}`).toContain(`"${path}"`);
    }
  });
});
