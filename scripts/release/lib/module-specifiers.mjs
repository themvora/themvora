/**
 * Real module specifiers, extracted with the TypeScript parser.
 *
 * The dependency audit is a *boundary* check: it must see every `@themvora/*`
 * import in a package's source, and nothing else. A regular expression cannot
 * make that distinction. A specifier inside a string literal is textually
 * identical to a real one, and two of the packages that this audit guards are
 * code *generators*: `@themvora/cli` builds framework scaffolds and
 * `themvora-vscode` builds patch snippets, so their sources are full of quoted
 * `import { ThemeProvider } from "@themvora/react"` lines that are **output**,
 * not dependency edges. Matching those as imports reported 16 violations that
 * did not exist, and — worse — the same blind spot silently *satisfied* the
 * unused-peer check for any package that merely mentioned a peer in a template
 * literal.
 *
 * This module parses instead of matching, so the result is the set of
 * specifiers a compiler would actually resolve:
 *
 *  - static `import ... from "x"` / `export ... from "x"`
 *  - `import x = require("x")`
 *  - dynamic `import("x")` and `require("x")` with a literal argument
 *  - `import("x")` in type position (`typeof import("x").Foo`)
 *
 * Comments, string contents, template literals (including `${...}`
 * substitutions) and regular-expression literals are invisible to it by
 * construction, because none of them are `ImportDeclaration` nodes.
 *
 * `.vue` and `.svelte` are handled by extracting their `<script>` blocks, and
 * `.astro` by extracting its `---` frontmatter, so framework components keep
 * exactly the coverage they had under the old text scan. A block that fails to
 * parse is reported through `unparsed` rather than quietly contributing nothing
 * — an audit that cannot read a file must fail, not pass.
 */

import { extname } from "node:path";
import ts from "typescript";

/** Extensions the compiler parses directly, and the script kind for each. */
const SCRIPT_KINDS = new Map([
  [".ts", ts.ScriptKind.TS],
  [".mts", ts.ScriptKind.TS],
  [".cts", ts.ScriptKind.TS],
  [".tsx", ts.ScriptKind.TSX],
  [".js", ts.ScriptKind.JS],
  [".jsx", ts.ScriptKind.JSX],
  [".mjs", ts.ScriptKind.JS],
  [".cjs", ts.ScriptKind.JS],
]);

/** A `<script>` element and its body, for SFC-style components. */
const SCRIPT_BLOCK_RE = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;

/**
 * Astro's leading `---` frontmatter block, which holds its imports.
 *
 * Leading whitespace is tolerated: a file that starts with a blank line still
 * has its frontmatter at the top, and failing to match would drop the file's
 * imports without reporting anything.
 */
const ASTRO_FRONTMATTER_RE = /^\uFEFF?\s*---\r?\n([\s\S]*?)\r?\n---/;

/** Extensions whose imports live inside a script block rather than the file. */
const SFC_EXTENSIONS = new Set([".vue", ".svelte", ".astro"]);

/**
 * Every extension {@link extractModuleSpecifiers} understands.
 *
 * The audit uses this to decide whether a file is readable, so it must stay in
 * sync with the branches below.
 */
export const SUPPORTED_EXTENSIONS = new Set([...SCRIPT_KINDS.keys(), ...SFC_EXTENSIONS]);

/**
 * Extract the script blocks of a single-file component.
 *
 * @param text - The whole file.
 * @returns One string per `<script>` element, in source order.
 */
function scriptBlocks(text) {
  return [...text.matchAll(SCRIPT_BLOCK_RE)].map((match) => match[1]);
}

/**
 * Extract Astro's frontmatter block.
 *
 * @param text - The whole file.
 * @returns The frontmatter, or an empty list when the file has none.
 */
function astroFrontmatter(text) {
  const match = ASTRO_FRONTMATTER_RE.exec(text);
  return match ? [match[1]] : [];
}

/**
 * Add every module specifier in one TypeScript/JavaScript source to `sink`.
 *
 * @param text - The source to parse.
 * @param kind - The script kind, which decides whether JSX is legal.
 * @param sink - The set to add specifiers to.
 * @param problems - Collects one message per file that could not be parsed.
 * @param label - The file name used in `problems`.
 */
function collect(text, kind, sink, problems, label) {
  const source = ts.createSourceFile(label, text, ts.ScriptTarget.Latest, false, kind);

  // `createSourceFile` recovers from syntax errors instead of throwing, so a
  // broken file would otherwise yield a partial specifier list that looks like
  // a clean result. Report it instead.
  const diagnostics = source.parseDiagnostics ?? [];
  if (diagnostics.length > 0) {
    const first = diagnostics[0];
    const message = ts.flattenDiagnosticMessageText(first.messageText, " ");
    problems.push(`${label}: ${message}`);
    return;
  }

  /**
   * Record a specifier when the node is a literal.
   *
   * @param node - A candidate expression or type node.
   */
  const add = (node) => {
    if (node && ts.isStringLiteralLike(node)) sink.add(node.text);
  };

  /**
   * Walk one node and its children.
   *
   * @param node - The node to visit.
   */
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      add(node.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(node)) {
      // `import x = require("y")` — the reference carries the specifier.
      const reference = node.moduleReference;
      if (ts.isExternalModuleReference(reference)) add(reference.expression);
    } else if (ts.isImportTypeNode(node)) {
      // `typeof import("y").Foo`
      const literal = node.argument?.literal;
      if (literal) add(literal);
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      // A computed argument (`require(name)`) has no static target; the audit
      // cannot resolve it and neither can a bundler.
      if ((isDynamicImport || isRequire) && node.arguments.length === 1) {
        add(node.arguments[0]);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
}

/**
 * List the module specifiers a compiler would resolve for a source file.
 *
 * @param filePath - The path, used for its extension and in problem messages.
 * @param text - The file's contents.
 * @returns The unique specifiers, and any parse problems.
 */
export function extractModuleSpecifiers(filePath, text) {
  const extension = extname(filePath).toLowerCase();
  const specifiers = new Set();
  const unparsed = [];

  if (extension === ".astro") {
    for (const block of astroFrontmatter(text)) {
      collect(block, ts.ScriptKind.TS, specifiers, unparsed, filePath);
    }
  } else if (SFC_EXTENSIONS.has(extension)) {
    for (const block of scriptBlocks(text)) {
      collect(block, ts.ScriptKind.TS, specifiers, unparsed, filePath);
    }
  } else {
    const kind = SCRIPT_KINDS.get(extension);
    if (kind === undefined) {
      unparsed.push(`${filePath}: unsupported extension "${extension}"`);
    } else {
      collect(text, kind, specifiers, unparsed, filePath);
    }
  }

  return { specifiers: [...specifiers], unparsed };
}
