/**
 * Tests for `scripts/release/lib/module-specifiers.mjs`.
 *
 * The extractor exists because the dependency audit cannot distinguish a real
 * import from the *text* of an import, and two guarded packages generate
 * framework code. So the tests are mostly negative: a specifier inside a
 * string, a template literal, a comment, or a regex must not be reported, while
 * every real form must be. If this file ever starts failing in the "reports
 * quoted text" direction, the audit has regressed to a text scan.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { extractModuleSpecifiers } from "./lib/module-specifiers.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Extract from an in-memory file.
 *
 * @param text - The source.
 * @param name - The file name, which selects the parsing strategy.
 * @returns The reported specifiers.
 */
function specs(text, name = "probe.ts") {
  return extractModuleSpecifiers(name, text).specifiers;
}

describe("real module specifiers", () => {
  it("reports a static import", () => {
    assert.deepEqual(specs(`import { a } from "@themvora/react";`), ["@themvora/react"]);
  });

  it("reports a type-only import", () => {
    assert.deepEqual(specs(`import type { T } from "@themvora/vue";`), ["@themvora/vue"]);
  });

  it("reports a re-export", () => {
    assert.deepEqual(specs(`export { a } from "@themvora/svelte";`), ["@themvora/svelte"]);
  });

  it("reports a side-effect import", () => {
    assert.deepEqual(specs(`import "@themvora/web";`), ["@themvora/web"]);
  });

  it("reports a dynamic import", () => {
    assert.deepEqual(specs(`const m = await import("@themvora/solid");`), ["@themvora/solid"]);
  });

  it("reports require", () => {
    assert.deepEqual(specs(`const m = require("@themvora/tailwind");`), ["@themvora/tailwind"]);
  });

  it("reports import-equals require", () => {
    assert.deepEqual(specs(`import m = require("@themvora/core");`), ["@themvora/core"]);
  });

  it("reports a type-position import", () => {
    assert.deepEqual(specs(`type M = typeof import("@themvora/next");`), ["@themvora/next"]);
  });

  it("keeps subpaths and reports each once", () => {
    const text = `
      import { a } from "@themvora/core/config";
      import { b } from "@themvora/core";
      import { c } from "@themvora/core";
    `;
    assert.deepEqual(specs(text).sort(), ["@themvora/core", "@themvora/core/config"]);
  });
});

describe("quoted text that is not an import", () => {
  it("ignores a specifier inside a string literal", () => {
    assert.deepEqual(specs(`const snippet = 'import { a } from "@themvora/react";';`), []);
  });

  it("ignores a specifier inside a template literal", () => {
    assert.deepEqual(specs("const file = `import { a } from \"@themvora/react\";`;"), []);
  });

  it("ignores a specifier inside a template substitution's surrounding text", () => {
    // Written as a template literal so the `${...}` here is escaped source
    // text, not an interpolation of this test.
    const text = `const out = \`\${header}import { a } from "@themvora/react";\\n\${body}\`;`;
    assert.deepEqual(specs(text), []);
  });

  it("ignores a specifier in a line comment", () => {
    assert.deepEqual(specs(`// import { a } from "@themvora/react";`), []);
  });

  it("ignores a specifier in a block comment", () => {
    assert.deepEqual(specs(`/* import { a } from "@themvora/react"; */`), []);
  });

  it("ignores CSS @import inside a template literal", () => {
    // The CLI ships Tailwind entry CSS as generated text.
    assert.deepEqual(specs('const css = `@import "@themvora/tailwind";`;'), []);
  });

  it("ignores a specifier in a JSX string attribute", () => {
    const text = `const el = <pre data-code={'import x from "@themvora/react";'} />;`;
    assert.deepEqual(specs(text, "probe.tsx"), []);
  });

  it("is not desynchronised by a regex literal containing quotes", () => {
    const text = `
      const QUOTED = /["']@themvora\\/react["']/;
      import { a } from "@themvora/core";
    `;
    assert.deepEqual(specs(text), ["@themvora/core"]);
  });

  it("does not treat a computed require as a dependency", () => {
    assert.deepEqual(specs(`const m = require(name);`), []);
  });
});

describe("single-file components", () => {
  it("reads a Vue script block and ignores the template", () => {
    const text = `
      <template><div>import { x } from "@themvora/evil";</div></template>
      <script setup lang="ts">
      import { a } from "@themvora/vue";
      </script>
    `;
    assert.deepEqual(specs(text, "Theme.vue"), ["@themvora/vue"]);
  });

  it("reads every Svelte script block", () => {
    const text = `
      <script context="module" lang="ts">
      import { a } from "@themvora/core";
      </script>
      <script lang="ts">
      import { b } from "@themvora/web";
      </script>
      <p>import { x } from "@themvora/evil";</p>
    `;
    assert.deepEqual(specs(text, "Theme.svelte").sort(), ["@themvora/core", "@themvora/web"]);
  });

  it("reads Astro frontmatter and ignores the markup", () => {
    const text = `
---
import { a } from "@themvora/web";
---
<div>import { x } from "@themvora/evil";</div>
`;
    assert.deepEqual(specs(text, "Theme.astro"), ["@themvora/web"]);
  });

  it("reports no specifiers for an Astro file without frontmatter", () => {
    assert.deepEqual(specs(`<div>import { a } from "@themvora/web";</div>`, "Theme.astro"), []);
  });
});

describe("unreadable sources", () => {
  it("reports a syntax error instead of a partial result", () => {
    const { specifiers, unparsed } = extractModuleSpecifiers("probe.ts", `import { from ;`);
    assert.deepEqual(specifiers, []);
    assert.equal(unparsed.length, 1);
    assert.match(unparsed[0], /^probe\.ts: /);
  });

  it("reports an unsupported extension", () => {
    const { unparsed } = extractModuleSpecifiers("probe.css", `@import "@themvora/tailwind";`);
    assert.equal(unparsed.length, 1);
  });
});

describe("the two code generators that exposed the false positives", () => {
  // These are the real files that made the audit report 16 violations. Both
  // *generate* framework code, so both are full of quoted `import ... from
  // "@themvora/<framework>"` text. A text scan reports those; a parse does not.
  // Pinned against the real sources so a return to regex matching fails here
  // immediately, with a message that says which file and which specifier.
  //
  // The CLI adapters import nothing at all — every framework name in them is
  // generated text. The VS Code patch builder imports exactly one thing, the
  // type it builds against.
  const CASES = [
    ["packages/cli/src/init/adapters/react.ts", []],
    ["packages/cli/src/init/adapters/next.ts", []],
    ["packages/cli/src/init/adapters/vue.ts", []],
    ["packages/cli/src/init/adapters/svelte.ts", []],
    ["packages/cli/src/init/adapters/solid.ts", []],
    ["packages/cli/src/init/adapters/showcase-css.ts", []],
    ["packages/vscode/src/domain/patchProposal.ts", ["@themvora/core"]],
  ];

  for (const [relativePath, expected] of CASES) {
    it(`reports ${expected.length ? expected.join(", ") : "no workspace import"} for ${relativePath}`, () => {
      const file = join(REPO_ROOT, relativePath);
      const { specifiers } = extractModuleSpecifiers(file, readFileSync(file, "utf8"));
      const workspace = specifiers.filter((spec) => spec.startsWith("@themvora/"));
      assert.deepEqual(workspace, expected, `${relativePath} reported ${workspace.join(", ") || "nothing"}`);
    });
  }
});
