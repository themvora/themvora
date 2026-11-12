import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["test/**/*.test.ts"],
    // `test/ssr-import.test.ts` cold-imports `../src/index` — the whole package
    // module graph — to prove it evaluates without a DOM. That import is the
    // slowest thing in the suite and its cost is not a contract, so the 5 s
    // default turned a loaded machine into a failure: `pnpm -r test` runs four
    // vitest processes at once, and the same test passes in isolation. A
    // generous ceiling keeps the assertion (evaluation must not touch `window`)
    // and drops the machine-speed dependency; a genuine hang still fails.
    testTimeout: 30_000,
  },
});
