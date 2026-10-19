/**
 * ESLint flat config.
 *
 * ## Why this is scoped to `.mjs`
 *
 * The repository has shipped `eslint` as a devDependency with no config and no
 * script, so "lint" was not a runnable gate. This makes it one — but deliberately
 * for the **JavaScript** surface only.
 *
 * Linting the TypeScript packages would need `@typescript-eslint/parser`, which is
 * not installed, and adding a parser is a dependency decision rather than a
 * config decision. Meanwhile the 57 `.mjs` files under `scripts/` and
 * `apps/docs/scripts/` are where the release machinery lives — the export
 * inventory, the preset and brand audits, the docs gate, the codegen — and they
 * are plain ESM, so ESLint parses them with no extra dependency at all.
 *
 * ## What it checks
 *
 * Correctness rules only. No formatting, no style opinions: a lint gate that
 * argues about quotes is a lint gate people learn to ignore. Every rule here
 * catches something that is a *bug* in a build script — an unused binding that
 * means a step was dropped, a `case` that falls through, a `==` against a string
 * that coerces, a variable declared and never used.
 *
 * @see docs/reference/capabilities.ts — the gates these scripts implement
 */

/** Node globals the scripts use. Listed rather than pulled from a `globals` package. */
const nodeGlobals = {
  process: "readonly",
  console: "readonly",
  Buffer: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  TextEncoder: "readonly",
  TextDecoder: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  structuredClone: "readonly",
  fetch: "readonly",
  WebSocket: "readonly",
  AbortSignal: "readonly",
};

export default [
  // Global ignores. This has to be its own object containing *only* `ignores` —
  // combined with `files` it filters that object's matches instead of excluding
  // the paths outright, which is how the first version of this config ended up
  // linting the whole of `apps/docs/.next`.
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/*.min.js",
      "examples/apps/_tools/**",
      // Generated build output carries inline `eslint-disable` comments naming
      // plugins this repo does not install, which ESLint reports as
      // "Definition for rule ... was not found".
      "**/.output/**",
      "packages/**",
      "apps/**",
    ],
  },
  {
    files: ["scripts/**/*.mjs", "apps/docs/scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: nodeGlobals,
    },
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
    },
    rules: {
      // -- real bugs -----------------------------------------------------------
      "no-unused-vars": ["error", { args: "after-used", ignoreRestSiblings: true }],
      "no-undef": "error",
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-unreachable": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-fallthrough": "error",
      "no-self-compare": "error",
      "no-unsafe-negation": "error",
      "no-cond-assign": ["error", "except-parens"],
      "require-atomic-updates": "error",
      "no-async-promise-executor": "error",
      "no-await-in-loop": "off",

      // -- things that are almost always a mistake -----------------------------
      eqeqeq: ["error", "smart"],
      "no-var": "error",
      "prefer-const": "error",
      "no-throw-literal": "error",
      "no-return-await": "error",
      "no-template-curly-in-string": "error",
      "no-console": "off",
    },
  },
];
