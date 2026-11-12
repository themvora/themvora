import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The compiled components and the declared peer range have to agree.
 *
 * Svelte 5.56 changed `rest_props` from an array of excluded names (with
 * `.includes`) to a `Set` (with `.has`). The compiler emits the `Set` form and
 * the 5.56+ runtime no longer accepts an array, so the package cannot support
 * 5.0-5.55. If a future compiler changes the emitted form, the peer floor has
 * to be re-checked against a real runtime instead of silently drifting.
 */
describe("Svelte runtime compatibility", () => {
  it("declares the first runtime that accepts the emitted rest_props form", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.peerDependencies.svelte).toBe("^5.56.0");
  });

  it("compiles every component with the Set-based rest_props argument", () => {
    for (const name of ["theme-provider", "theme-scope", "theme-scrollbar"]) {
      const code = readFileSync(
        join(root, "src", "generated", `${name}.client.js`),
        "utf8",
      );
      expect(code, `${name} must pass an exclude set`).toMatch(
        /rest_props\(\$\$props, rest_excludes\d?\)/,
      );
      expect(code, `${name} must build the exclude set`).toMatch(/new Set\(/);
    }
  });
});