// CJS consumer smoke test — verifies the `require` condition of @themvora/core.
const assert = require("node:assert");

// require() must resolve through the exports map "require" condition
const core = require("@themvora/core");
assert.strictEqual(typeof core.createThemeStore, "function");
assert.strictEqual(typeof core.createThemeRuntime, "function");
assert.strictEqual(typeof core.themeToCSSVariables, "function");

const store = core.createThemeStore({
  initialTheme: { name: "light", tokens: {}, meta: { mode: "light" } },
});
assert.strictEqual(typeof store.get, "function");
assert.strictEqual(typeof store.subscribe, "function");
store.destroy();

console.log("✓ @themvora/core resolves via require()");
console.log("\nvanilla-app CJS smoke: ALL PASS");
