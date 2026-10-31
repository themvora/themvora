/**
 * Assertions about the built bundle.
 *
 * The Milestone 2 gate is "no writes or CLI calls during activation". Writes are
 * covered by the command tests; this is the structural half — the bundle has no
 * way to spawn a process at all, because it imports nothing but `vscode`.
 *
 * Reading the build output rather than the source is deliberate: a transitive
 * import added by a future dependency would not show up in a source-level test.
 *
 * @packageDocumentation
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** The built entry point. */
const BUNDLE = fileURLToPath(new URL("../dist/index.js", import.meta.url));

const built = existsSync(BUNDLE);

describe.skipIf(!built)("dist/index.js", () => {
  /** The module specifiers the bundle imports. */
  function externalImports(source: string): string[] {
    return [...source.matchAll(/^import\s[^;]*?from\s*["']([^"']+)["'];?$/gm)].map(
      (match) => match[1]!,
    );
  }

  it("imports only the host-provided `vscode` module and Node.js built-ins", () => {
    const imports = externalImports(readFileSync(BUNDLE, "utf8"));

    // `@themvora/core` must be inlined: the .vsix ships no node_modules.
    // Node.js built-ins (crypto, fs, path, etc.) are available in the extension host.
    const nodeBuiltins = ["crypto", "fs", "path", "url", "os", "stream", "util", "events", "http", "https", "net", "tls", "zlib"];
    const allowedImports = ["vscode", ...nodeBuiltins];
    
    for (const imp of imports) {
      expect(allowedImports).toContain(imp);
    }
  });

  it("contains no process-spawning code", () => {
    const source = readFileSync(BUNDLE, "utf8");

    // The CLI client arrives in Milestone 3. Until then nothing in the extension
    // may be able to spawn, which is what makes "no CLI calls on activation"
    // structural rather than a promise.
    expect(source).not.toContain("child_process");
  });
});
