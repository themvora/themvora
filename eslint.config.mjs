/**
 * ESLint flat config.
 *
 * ## Why this is scoped to `.mjs`
 *
 * The repository has shipped `eslint` as a devDependency with no config and no
 * script, so "lint" was not a runnable gate. This makes it one — but deliberately
 * for the **JavaScript** surface only.
 *
 * The **TypeScript surface is the VS Code extension** (`packages/vscode`), which
 * ships a webview and an extension host and therefore carries the most
 * hand-written TypeScript that no other gate parses for style-level mistakes.
 * It is linted with `@typescript-eslint/parser` and the plugin's recommended
 * rules; type correctness stays with `tsc`, which already runs over both
 * `src` and `webview` (`tsconfig.json`, `tsconfig.webview.json`).
 *
 * The other framework packages are deliberately **not** in scope yet: turning
 * them on would surface a backlog that belongs to their own milestones, and a
 * lint gate nobody can get green is a gate people disable. `apps/**` stays
 * ignored for the same reason — its build output is generated.
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
import tseslint from "typescript-eslint";

/**
 * The parser and plugin come from the `typescript-eslint` meta package rather
 * than from `@typescript-eslint/parser` / `@typescript-eslint/eslint-plugin`
 * directly: only the meta package is a declared devDependency, so importing the
 * sub-packages works only while pnpm happens to hoist them.
 */
const tsParser = tseslint.parser;
const tsPlugin = tseslint.plugin;

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

/** Browser globals the webview uses. Listed for the same reason as `nodeGlobals`. */
const browserGlobals = {
  window: "readonly",
  document: "readonly",
  MessageEvent: "readonly",
  HTMLElement: "readonly",
  CustomEvent: "readonly",
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
      // Nuxt's generated app directory: same class of build output, and its
      // `dev/index.mjs` ships its own `eslint-disable` directives.
      "**/.nuxt/**",
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

  /**
   * The VS Code extension: extension host, webview and tests.
   *
   * `no-undef` is off because TypeScript already rejects unknown identifiers, and
   * the rule misfires on type-only references. `no-unused-vars` is replaced by
   * the TypeScript-aware version for the same reason: it understands type
   * positions and would otherwise flag every imported type.
   */
  {
    files: ["packages/vscode/**/*.ts", "packages/vscode/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...nodeGlobals, ...browserGlobals },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,

      // -- TypeScript replaces these -------------------------------------------
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { args: "after-used", ignoreRestSiblings: true, varsIgnorePattern: "^_" },
      ],

      // -- real bugs -----------------------------------------------------------
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-fallthrough": "error",
      "no-self-compare": "error",
      "no-unsafe-negation": "error",
      "no-cond-assign": ["error", "except-parens"],
      "require-atomic-updates": "error",
      "no-async-promise-executor": "error",

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
