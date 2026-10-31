import ts from "typescript";

// The extension is explicit so `node --experimental-strip-types` can resolve the
// module in `scripts/check-code-variants.mjs`; Next.js and tsc accept it too.
import {
  DERIVABLE_LANGUAGES,
  grammarLabel,
  isTypeScriptOnlySource,
  javascriptFilename,
  javascriptLang,
  pairWithJavaScript,
} from "./code-language.ts";
import type { CodeLanguageId, CodeVariant, VariantSource } from "./code-language.ts";

/**
 * JavaScript counterparts for the documentation's TypeScript snippets.
 *
 * Every code example in `apps/docs` is authored once, in TypeScript, and this
 * module derives the JavaScript variant from it. The derivation is **not** a
 * regular-expression type-stripper: it parses the snippet with the TypeScript
 * compiler, removes only the syntax that has no JavaScript equivalent, and then
 * refuses to return anything it cannot prove is valid JavaScript. A snippet
 * whose types are load-bearing (an `interface` that *is* the documentation, a
 * `defineProps<Props>()` with no runtime argument, an Angular decorator) comes
 * back as `null`, and the UI renders no selector for it.
 *
 * Why derive rather than author twice:
 *
 *   - two hand-written copies of 800 snippets drift, and a drifted JavaScript
 *     example is worse than none — it is wrong code that looks checked;
 *   - the compiler's AST is the only authority on what counts as a type, so the
 *     pair cannot disagree about the API surface, the imports, or the comments;
 *   - a snippet that gains a type in the TypeScript version gains its
 *     JavaScript counterpart in the same edit, with no second file to update.
 *
 * Hand-authored overrides remain available (`js` on a snippet) for the few
 * cases where the mechanical result is correct but reads badly — a provider
 * whose JSX is clearer with an explicit `children` prop, say. Overrides are
 * held to the same post-condition as derived output.
 *
 * One framework is exempt before any of this runs: Angular's documentation is
 * TypeScript-only by decision (`TYPESCRIPT_ONLY_FRAMEWORKS` in
 * `lib/code-language.ts`), so an Angular snippet has no JavaScript variant, no
 * selector and no combined label even when its types could be erased. The
 * exemption is stated by the caller (`VariantSource.framework`) and recognised
 * from the source as a fallback, because a Markdown fence has no page to ask.
 * It is a documentation decision, not a gap: the Angular guide is for a
 * TypeScript project.
 *
 * Server-only: this module imports the TypeScript compiler, which is a build
 * dependency. It must never be reached from a `"use client"` module — the
 * pre-highlighted variants are computed here and passed to `CodeBlock` as
 * plain data. The parts of the feature a client component may import live in
 * `lib/code-language.ts`.
 */

export type { CodeLanguageId, CodeVariant, VariantSource };
export { javascriptFilename, javascriptLang };
export {
  TYPESCRIPT_ONLY_FRAMEWORKS,
  isAngularSource,
  isTypeScriptOnlyFramework,
  isTypeScriptOnlySource,
} from "./code-language.ts";

type Edit = { start: number; end: number; text: string };

/** Modifiers that exist only to describe types. */
const TYPE_MODIFIERS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.ReadonlyKeyword,
  ts.SyntaxKind.PublicKeyword,
  ts.SyntaxKind.PrivateKeyword,
  ts.SyntaxKind.ProtectedKeyword,
  ts.SyntaxKind.AbstractKeyword,
  ts.SyntaxKind.OverrideKeyword,
  ts.SyntaxKind.DeclareKeyword,
]);

/**
 * Call expressions whose entire meaning is their type argument.
 *
 * `defineProps<Props>()` compiles to `defineProps()` — which is not the same
 * component: without the runtime declaration Vue has nothing to declare. Erasing
 * the argument would produce JavaScript that runs and does the wrong thing, so
 * the snippet stays TypeScript-only.
 */
const TYPE_ARGUMENT_ONLY_CALLS = new Set([
  "defineProps",
  "defineEmits",
  "defineSlots",
  "defineModel",
  "withDefaults",
]);

/** The annotation attached to a declaration, when it wrote one. */
function annotationOf(node: ts.Node): ts.TypeNode | undefined {
  const annotation = (node as { type?: ts.Node }).type;
  return annotation && ts.isTypeNode(annotation) ? annotation : undefined;
}

/**
 * The span to delete for an annotation, including the `:` (and any `?`) that
 * introduced it.
 *
 * `node.pos` points *after* the colon — it is the end of the previous token, and
 * the colon is that token — so deleting from `pos` leaves a stray `:` behind and
 * the output fails the post-condition instead of being subtly wrong.
 */
function annotationRange(
  annotation: ts.TypeNode,
  code: string,
): [number, number] {
  let start = annotation.pos;
  let cursor = start - 1;
  while (cursor >= 0 && (code[cursor] === " " || code[cursor] === "\t"))
    cursor--;
  if (code[cursor] === ":") {
    start = cursor;
    let optional = cursor - 1;
    while (optional >= 0 && (code[optional] === " " || code[optional] === "\t"))
      optional--;
    if (code[optional] === "?") start = optional;
  }
  return [start, annotation.end];
}

/**
 * Remove TypeScript-only syntax from a module body.
 *
 * The `reason` is part of the contract, not debug output: the docs check script
 * reports it for every snippet that has no JavaScript counterpart, so "this one
 * stays TypeScript-only because it declares an interface" is a statement the
 * repository can verify instead of a reviewer's guess.
 */
function stripModule(code: string, jsx: boolean): StripResult {
  const sourceFile = ts.createSourceFile(
    jsx ? "snippet.tsx" : "snippet.ts",
    code,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  // A snippet that does not parse as TypeScript is a fragment the page composes
  // with something else. Nothing to derive from, and guessing is not allowed.
  if (parseDiagnostics(sourceFile).length > 0)
    return { js: null, reason: "unparsable" };

  const edits: Edit[] = [];
  let reason: StripReason | null = null;

  /** Stop deriving: this snippet cannot be JavaScript without changing meaning. */
  const fail = (why: StripReason) => {
    reason ??= why;
  };

  const remove = (start: number, end: number, text = "") => {
    if (end > start) edits.push({ start, end, text });
  };

  /** Remove a whole statement, including its own line and any doc comment. */
  const removeStatement = (node: ts.Node) => {
    const fullStart = node.getFullStart();
    const hasComment = /\/[/*]/.test(code.slice(fullStart, node.getStart()));
    let start = hasComment ? fullStart : node.getStart();

    const lineStart = code.lastIndexOf("\n", node.getStart()) + 1;
    if (/^[ \t]*$/.test(code.slice(lineStart, node.getStart())))
      start = lineStart;

    // Never consume the newline that terminates the previous line: doing so
    // joins two statements onto one line.
    while (
      start < node.getStart() &&
      (code[start] === "\n" || code[start] === "\r")
    ) {
      start++;
    }

    let end = node.end;
    while (end < code.length && (code[end] === " " || code[end] === "\t"))
      end++;
    if (code[end] === ";") end++;
    if (code[end] === "\r") end++;
    if (code[end] === "\n") end++;

    remove(start, end);
  };

  /** Remove one element of a comma-separated list, and the separator with it. */
  const removeListElement = (
    elements: readonly ts.Node[],
    element: ts.Node,
  ) => {
    const index = elements.indexOf(element);
    const next = elements[index + 1];
    const previous = elements[index - 1];
    if (next) remove(element.getStart(), next.getStart());
    else if (previous) remove(previous.end, element.end);
    else remove(element.getStart(), element.end);
  };

  /** `<T, U>` → nothing. The closing bracket is not part of the node. */
  const removeTypeList = (nodes: ts.NodeArray<ts.Node>) => {
    let start = nodes.pos;
    while (start > 0 && /[ \t]/.test(code[start - 1] ?? "")) start--;
    if (code[start] !== "<") {
      const open = code.lastIndexOf("<", nodes.pos);
      if (open === -1) return;
      start = open;
    }
    let end = nodes.end;
    // `NodeArray.end` points at the closing `>` of the outermost list.
    if (code[end] === ">") end++;
    remove(start, end);
  };

  const visit = (node: ts.Node): void => {
    if (reason) return;

    // Types are removed whole, by their owning declaration. Descending into one
    // would queue edits *inside* a range that is already being deleted, and the
    // overlap guard would then drop the outer deletion — which is how
    // `{ children }: { children: ReactNode }` once became `{ children: }`.
    if (ts.isTypeNode(node)) return;

    // --- constructs with no JavaScript equivalent -------------------------
    if (
      ts.isEnumDeclaration(node) ||
      ts.isModuleDeclaration(node) ||
      ts.isImportEqualsDeclaration(node) ||
      ts.isNamespaceExport(node) ||
      ts.isIndexSignatureDeclaration(node)
    ) {
      fail("typescript-only-declaration");
      return;
    }

    // Decorators are still not JavaScript outside a transpiler, and the
    // integrations that use them (Angular) are TypeScript-only by design.
    if (ts.isDecorator(node)) {
      fail("decorator");
      return;
    }

    // `export = value` is CommonJS-flavoured TypeScript.
    if (ts.isExportAssignment(node) && node.isExportEquals) {
      fail("export-equals");
      return;
    }

    // A bodyless declaration is an overload signature — documentation of a
    // call shape, not runnable code.
    if (
      ((ts.isFunctionDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isConstructorDeclaration(node)) &&
        !node.body) ||
      ts.isMethodSignature(node)
    ) {
      fail("overload-signature");
      return;
    }

    // `constructor(private runtime: ThemeRuntime)` declares and assigns in one
    // token; erasing the modifier drops the assignment.
    if (ts.isParameter(node) && node.modifiers?.length) {
      fail("parameter-property");
      return;
    }

    // --- statements that exist only to describe types ---------------------
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      removeStatement(node);
      return;
    }

    if (ts.isImportDeclaration(node)) {
      if (node.importClause?.isTypeOnly) {
        removeStatement(node);
        return;
      }
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        const typeOnly = bindings.elements.filter(
          (element) => element.isTypeOnly,
        );
        if (typeOnly.length === bindings.elements.length) {
          removeStatement(node);
          return;
        }
        for (const element of typeOnly) {
          removeListElement(bindings.elements, element);
        }
      }
    }

    if (ts.isExportDeclaration(node)) {
      if (node.isTypeOnly) {
        removeStatement(node);
        return;
      }
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        const typeOnly = node.exportClause.elements.filter(
          (element) => element.isTypeOnly,
        );
        if (typeOnly.length === node.exportClause.elements.length) {
          removeStatement(node);
          return;
        }
        for (const element of typeOnly) {
          removeListElement(node.exportClause.elements, element);
        }
      }
    }

    // --- expressions that wrap a value in a type --------------------------
    if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
      remove(node.expression.end, node.end);
      ts.forEachChild(node.expression, visit);
      return;
    }

    if (ts.isNonNullExpression(node)) {
      remove(node.expression.end, node.end);
      ts.forEachChild(node.expression, visit);
      return;
    }

    if (ts.isTypeAssertionExpression(node)) {
      remove(node.getStart(), node.expression.getStart());
      ts.forEachChild(node.expression, visit);
      return;
    }

    // --- generic arguments ------------------------------------------------
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const name = ts.isIdentifier(node.expression)
        ? node.expression.text
        : undefined;
      if (
        name &&
        TYPE_ARGUMENT_ONLY_CALLS.has(name) &&
        !node.arguments?.length
      ) {
        fail("type-argument-only-call");
        return;
      }
      if (node.typeArguments?.length) removeTypeList(node.typeArguments);
    }

    if (ts.isTaggedTemplateExpression(node) && node.typeArguments?.length) {
      removeTypeList(node.typeArguments);
    }

    const typeParameters = (node as { typeParameters?: ts.NodeArray<ts.Node> })
      .typeParameters;
    if (typeParameters?.length) removeTypeList(typeParameters);

    // `implements Foo` — the interface has no runtime presence.
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      const implementsClause = node.heritageClauses?.find(
        (clause) => clause.token === ts.SyntaxKind.ImplementsKeyword,
      );
      if (implementsClause) remove(implementsClause.pos, implementsClause.end);
    }

    // --- annotations ------------------------------------------------------
    const annotation = annotationOf(node);
    if (annotation) {
      const [start, end] = annotationRange(annotation, code);
      remove(start, end);
    }

    if (ts.isPropertyDeclaration(node) && node.questionToken) {
      remove(node.questionToken.getStart(), node.questionToken.end);
    }
    if (ts.isParameter(node) && node.questionToken && !node.type) {
      remove(node.questionToken.getStart(), node.questionToken.end);
    }
    if ("exclamationToken" in node && node.exclamationToken) {
      const token = node.exclamationToken as ts.Node;
      remove(token.getStart(), token.end);
    }

    for (const modifier of (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined) ?? []) {
      if (TYPE_MODIFIERS.has(modifier.kind)) {
        let end = modifier.end;
        while (end < code.length && (code[end] === " " || code[end] === "\t"))
          end++;
        remove(modifier.getStart(), end);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  if (reason) return { js: null, reason };

  const output = normalise(applyEdits(code, edits));
  return isPlainJavaScript(output, jsx)
    ? { js: output, reason: "derived" }
    : { js: null, reason: "invalid-output" };
}

/** Why a snippet has (or has not) a JavaScript counterpart. */
export type StripReason =
  /** A JavaScript form was produced. */
  | "derived"
  /** The snippet is already JavaScript; a second copy would be identical. */
  | "already-javascript"
  /** Not a TypeScript-bearing language (CSS, HTML, bash, JSON, …). */
  | "not-applicable"
  /**
   * A framework whose documentation is TypeScript-only by decision — Angular.
   * Reported before any syntax is examined, so the inventory says "this
   * framework is exempt" rather than naming whichever construct came first.
   */
  | "typescript-only-framework"
  /** The snippet is a fragment that does not parse on its own. */
  | "unparsable"
  /** A declaration JavaScript cannot express: enum, namespace, index signature. */
  | "typescript-only-declaration"
  /** `@Component({...})` and friends. */
  | "decorator"
  /** `export = value`. */
  | "export-equals"
  /** A bodyless signature: the snippet documents a call shape. */
  | "overload-signature"
  /** `constructor(private x: T)` — erasing the modifier drops the assignment. */
  | "parameter-property"
  /** `defineProps<Props>()` with no runtime argument. */
  | "type-argument-only-call"
  /** The erasure produced something that is not plain JavaScript. */
  | "invalid-output";

type StripResult = { js: string | null; reason: StripReason };
export type { StripResult };

/** Parse diagnostics, which `createSourceFile` keeps off the public type. */
function parseDiagnostics(sourceFile: ts.SourceFile): readonly ts.Diagnostic[] {
  const diagnostics =
    (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] })
      .parseDiagnostics ?? [];
  // 2657 — "JSX expressions must have one parent element". Documentation shows
  // fragments (`<ThemeScope />` twice in one block) on purpose; the missing
  // wrapper says nothing about whether the code is JavaScript, and the erasure
  // is local to each node, so it is not a reason to withhold a variant.
  return diagnostics.filter((diagnostic) => diagnostic.code !== 2657);
}

function applyEdits(code: string, edits: Edit[]): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let output = code;
  let lastStart = Number.POSITIVE_INFINITY;
  for (const edit of sorted) {
    // Overlapping edits are a bug in the walker, not in the snippet: skip the
    // inner one rather than producing interleaved text.
    if (edit.end > lastStart) continue;
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    lastStart = edit.start;
  }
  return output;
}

/**
 * Tidy the blank lines a removed declaration leaves behind.
 *
 * Leading newlines are deliberately preserved: the same routine processes a
 * whole module and the body of an SFC `<script>` block, and eating the newline
 * after `<script setup>` glued the first statement to the tag.
 */
function normalise(code: string): string {
  return code
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n+$/, "\n");
}

/**
 * The post-condition: the output must be JavaScript, not TypeScript that the
 * parser happens to tolerate.
 *
 * TypeScript's parser is deliberately lenient — it reads `const x: string = 1`
 * in a `.js` file without a single parse diagnostic, because the editor wants
 * to keep working on a broken file. So "it parsed" proves nothing. This walk
 * looks for the node kinds that only TypeScript produces, which is the actual
 * contract: nothing a reader pastes into a `.js` file may need a compiler.
 */
function isPlainJavaScript(code: string, jsx: boolean): boolean {
  const sourceFile = ts.createSourceFile(
    jsx ? "snippet.jsx" : "snippet.js",
    code,
    ts.ScriptTarget.Latest,
    true,
    jsx ? ts.ScriptKind.JSX : ts.ScriptKind.JS,
  );
  if (parseDiagnostics(sourceFile).length > 0) return false;

  let clean = true;

  const check = (node: ts.Node): void => {
    if (!clean) return;

    if (
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isModuleDeclaration(node) ||
      ts.isImportEqualsDeclaration(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node) ||
      ts.isDecorator(node) ||
      ts.isIndexSignatureDeclaration(node) ||
      ts.isMethodSignature(node) ||
      ts.isPropertySignature(node) ||
      ts.isTypeParameterDeclaration(node)
    ) {
      clean = false;
      return;
    }

    if (ts.isImportDeclaration(node) && node.importClause?.isTypeOnly)
      clean = false;
    if (ts.isExportDeclaration(node) && node.isTypeOnly) clean = false;

    if (annotationOf(node)) clean = false;
    const typeParameters = (node as { typeParameters?: ts.NodeArray<ts.Node> })
      .typeParameters;
    const typeArguments = (node as { typeArguments?: ts.NodeArray<ts.Node> })
      .typeArguments;
    if (typeParameters?.length) clean = false;
    if (typeArguments?.length) clean = false;

    if (
      (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
      !node.body
    ) {
      clean = false;
      return;
    }

    for (const modifier of (ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined) ?? []) {
      if (TYPE_MODIFIERS.has(modifier.kind)) clean = false;
    }

    ts.forEachChild(node, check);
  };

  check(sourceFile);
  return clean;
}

/** `<script lang="ts">` / `<script setup lang="ts">` */
const SCRIPT_BLOCK = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

/** Astro frontmatter — the leading `---` fenced block. */
const ASTRO_FRONTMATTER = /^(---\r?\n)([\s\S]*?)(\r?\n---)/;

/** Drop `lang="ts"` (and its friends) from a tag's attribute string. */
function withoutLangAttribute(attributes: string): string {
  return attributes
    .replace(/\s+lang\s*=\s*(?:"ts"|'ts'|"typescript"|'typescript')/gi, "")
    .replace(/\s{2,}/g, " ");
}

/**
 * Strip TypeScript syntax from a Vue template expression.
 *
 * Vue template expressions live in attribute values: `@click="(e: Event) => ..."`,
 * `:value="x as string"`, etc. The TypeScript compiler can parse these as
 * expressions, so we reuse `stripModule`'s AST walk on each one.
 */
function stripVueTemplateExpression(expr: string): string {
  const wrapped = `const __x = ${expr};`;
  const sourceFile = ts.createSourceFile(
    "expr.ts",
    wrapped,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const edits: Edit[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node)
    ) {
      const inner = node.expression;
      edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), text: inner.getText(sourceFile) });
    }
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      for (const param of node.parameters) {
        if (param.type) {
          edits.push({ start: param.name.getEnd(), end: param.type.getEnd(), text: "" });
        }
      }
      if (node.type) {
        const arrowToken = node.getFirstToken();
        const fatArrow = node.getChildren().find((c) => c.kind === ts.SyntaxKind.EqualsGreaterThanToken);
        if (fatArrow) {
          edits.push({ start: fatArrow.getEnd(), end: node.type.getEnd(), text: "" });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (!edits.length) return expr;
  edits.sort((a, b) => b.start - a.start);
  let result = wrapped;
  for (const edit of edits) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  return result.slice("const __x = ".length, -1).trim();
}

/**
 * Strip TypeScript from Vue template attribute expressions.
 *
 * Matches `@event="..."`, `:prop="..."`, and `v-bind:prop="..."` attributes,
 * then strips types from each expression value.
 */
function stripVueTemplateExpressions(code: string): string {
  return code.replace(
    /(\s)(@[a-zA-Z][\w-]*|:[a-zA-Z][\w-]*|v-bind:[a-zA-Z][\w-]*|v-on:[a-zA-Z][\w-]*)\s*=\s*"([^"]*)"/g,
    (match, space, attr, expr) => {
      const stripped = stripVueTemplateExpression(expr);
      return `${space}${attr}="${stripped}"`;
    },
  );
}

/**
 * Strip TypeScript from Svelte event handler expressions.
 *
 * Matches `on:event={...}` and `onchange={...}` handlers, then strips types
 * from the handler body.
 */
function stripSvelteExpressions(code: string): string {
  return code.replace(
    /\b(?:on:[a-zA-Z][\w-]*|on[a-zA-Z]+)\s*=\s*\{([^}]*)\}/g,
    (match, body) => {
      const stripped = stripVueTemplateExpression(body.trim());
      return match.replace(body, stripped);
    },
  );
}

/**
 * Strip the TypeScript from a single-file component.
 *
 * Vue, Svelte and Astro all embed a TypeScript module in a markup file, so the
 * variant has two halves: the script body loses its types, and the tag that
 * told the toolchain to compile them loses `lang="ts"`. A file with no typed
 * script block is already JavaScript and gets no selector.
 */
function stripSingleFileComponent(code: string, lang: string): StripResult {
  if (lang === "astro") {
    const match = ASTRO_FRONTMATTER.exec(code);
    if (!match) return { js: null, reason: "already-javascript" };
    const [, open, body, close] = match;
    if (open === undefined || body === undefined || close === undefined) {
      return { js: null, reason: "unparsable" };
    }
    if (!body.trim()) return { js: null, reason: "already-javascript" };
    const stripped = stripModule(body, false);
    if (stripped.js === null) return stripped;
    return {
      js: `${open}${stripped.js.replace(/\n$/, "")}${close}${code.slice(match[0].length)}`,
      reason: "derived",
    };
  }

  let changed = false;
  let failure: StripReason | null = null;
  const output = code.replace(
    SCRIPT_BLOCK,
    (whole, attributes: string, body: string) => {
      if (!/\blang\s*=\s*["']ts["']/i.test(attributes)) return whole;
      const stripped = stripModule(body, false);
      if (stripped.js === null) {
        failure ??= stripped.reason;
        return whole;
      }
      changed = true;
      return `<script${withoutLangAttribute(attributes)}>${stripped.js}</script>`;
    },
  );

  if (failure) return { js: null, reason: failure };
  if (!changed) return { js: null, reason: "already-javascript" };

  // Post-process template expressions for Vue and Svelte.
  let final = output;
  if (lang === "vue") {
    final = stripVueTemplateExpressions(final);
  } else if (lang === "svelte") {
    final = stripSvelteExpressions(final);
  }
  return { js: final, reason: "derived" };
}

/**
 * The JavaScript form of a snippet, or `null` when there is no honest one.
 *
 * `null` is a normal, expected answer: it is what keeps the selector off a CSS
 * block, off a type declaration, and off an Angular component whose dependency
 * injection only exists in TypeScript. The last case is a documentation
 * decision rather than a syntactic one — see `TYPESCRIPT_ONLY_FRAMEWORKS` — and
 * `framework` is how a caller states it.
 */
export function javascriptFor(
  code: string,
  lang: string,
  framework?: string,
): string | null {
  return deriveJavaScript(code, lang, framework).js;
}

/**
 * Derivation cache, keyed by language + source.
 *
 * The docs routes are server-rendered on demand, and a page can carry twenty
 * snippets. Parsing each one on every request would put the compiler on the
 * request path; the corpus is small and immutable at runtime, so a plain map is
 * both bounded (one entry per snippet in the docs) and sufficient. It also keeps
 * `deriveJavaScript` referentially transparent for callers that compare results.
 */
const deriveCache = new Map<string, StripResult>();

/**
 * {@link javascriptFor}, plus the reason when there is no counterpart.
 *
 * The reason is reported by `scripts/check-code-variants.mjs`, which is how the
 * repository keeps an honest inventory of the examples that stay TypeScript-only
 * instead of leaving the question to a reviewer's memory.
 */
export function deriveJavaScript(
  code: string,
  lang: string,
  framework?: string,
): StripResult {
  const key = `${lang.toLowerCase()}\u0000${framework?.toLowerCase() ?? ""}\u0000${code}`;
  const cached = deriveCache.get(key);
  if (cached) return cached;

  const result = deriveUncached(code, lang, framework);
  deriveCache.set(key, result);
  return result;
}

function deriveUncached(
  code: string,
  lang: string,
  framework?: string,
): StripResult {
  // Before the language is even considered: an exempt framework has no
  // JavaScript form, whatever its snippets happen to parse as. Checked first so
  // the reason names the decision instead of the syntax it happens to hit.
  if (isTypeScriptOnlySource(code, framework)) {
    return { js: null, reason: "typescript-only-framework" };
  }

  const normalised = lang.toLowerCase();
  if (!DERIVABLE_LANGUAGES.has(normalised)) return { js: null, reason: "not-applicable" };

  const result =
    normalised === "vue" || normalised === "svelte" || normalised === "astro"
      ? stripSingleFileComponent(code, normalised)
      : stripModule(code, normalised === "tsx");

  // A snippet with no TypeScript in it at all is already the JavaScript
  // version. Offering a selector that switches between two identical blocks is
  // worse than offering none.
  if (result.js !== null && result.js.trim() === code.trim()) {
    return { js: null, reason: "already-javascript" };
  }
  return result;
}

/**
 * The languages the *displayed source* can actually be used in.
 *
 * Distinct from the highlighting grammar: a snippet may be highlighted with the
 * TypeScript grammar, keep a `.ts` filename, and still be plain JavaScript. The
 * badge says so; the grammar does not change.
 *
 * The test is {@link isPlainJavaScript} applied to the original text — the same
 * parse-plus-AST-walk the derivation uses as its post-condition, which is what
 * makes this a claim about syntax rather than about a file extension. It is not
 * "can the source be converted": a snippet that needs erasure is TypeScript-only
 * even though a valid JavaScript rendering of it exists.
 *
 * Returns `null` for languages where a combined label would be meaningless —
 * CSS, shell, JSON, HTML, and the single-file components, whose TypeScript lives
 * inside a `<script>` block and whose file as a whole is not JavaScript.
 *
 * A TypeScript-only framework short-circuits the syntax test entirely: Angular
 * documentation is labelled `TS` or `TSX` even when the snippet would run as
 * JavaScript, because the guide is for a TypeScript project and a combined label
 * would promise a portability the framework does not have.
 */
export function compatibilityLabel(
  code: string,
  lang: string,
  framework?: string,
): string | null {
  const grammar = grammarLabel(lang);
  if (grammar === null) return null;
  if (isTypeScriptOnlySource(code, framework)) return grammar;

  switch (lang.toLowerCase()) {
    case "ts":
    case "mts":
    case "cts":
    case "typescript":
      return isPlainJavaScript(code, false) ? "TS / JS" : "TS";
    case "tsx":
      return isPlainJavaScript(code, true) ? "TSX / JSX" : "TSX";
    default:
      // `js`, `jsx` and the non-code languages: the grammar label is the whole
      // truth, and `grammarLabel` already returned `null` for the ones that have
      // no label at all.
      return grammar;
  }
}

/**
 * {@link compatibilityLabel} as `CodeBlock` props, ready to spread.
 *
 * A page that builds its own blocks would otherwise repeat the same
 * `label === null ? {} : { displayLanguage: label }` dance at every call site,
 * and the null case is the common one — CSS, shell and JSON blocks all take it.
 *
 * ```tsx
 * <CodeBlock code={code} language={lang} {...compatibilityBadge(code, lang)} />
 * ```
 */
export function compatibilityBadge(
  code: string,
  lang: string,
  framework?: string,
): { displayLanguage?: string } {
  const label = compatibilityLabel(code, lang, framework);
  return label === null ? {} : { displayLanguage: label };
}

/**
 * Both variants of a snippet, ready for `CodeBlock`.
 *
 * Returns `undefined` — not an empty array — when only one language applies, so
 * callers can pass the result straight through and the component can treat
 * "no alternatives" as the default case.
 */
export function codeVariants(source: VariantSource): CodeVariant[] | undefined {
  const js = source.js ?? javascriptFor(source.code, source.lang, source.framework);
  if (js === null || js === undefined) return undefined;
  return pairWithJavaScript(source, js);
}

/**
 * `codeVariants` plus the highlighted markup each variant needs.
 *
 * Kept separate from {@link codeVariants} so the pure derivation can be tested
 * without Shiki, and so the browser probe can assert the highlighted language
 * after a switch.
 */
export function highlightedVariants(
  source: VariantSource,
  highlight: (code: string, lang: string) => string,
): CodeVariant[] | undefined {
  const variants = codeVariants(source);
  if (!variants) return undefined;
  return variants.map((variant) => ({
    ...variant,
    html: highlight(variant.code, variant.lang),
  }));
}

/**
 * Everything `CodeBlock` needs to paint one snippet, for a caller that cannot
 * import Shiki itself.
 *
 * The page-level guides are client components, so they receive markup rather
 * than computing it. `html` is required — not optional — because it is the
 * *only* source a block has when `variants` is absent, and a block that
 * receives neither renders an empty pane. Making the fallback part of the type
 * turns that failure into a compile error instead of a blank page.
 *
 * `html` is the TypeScript variant's markup, so a paired block is highlighted
 * exactly once: the fallback and the first variant are the same string.
 */
export type CodeContent = {
  html: string;
  variants?: CodeVariant[] | undefined;
  /**
   * The languages the source is usable in — `TS / JS`, `TSX / JSX`, `TS`…
   *
   * Carried alongside the markup because a client guide cannot compute it: the
   * answer comes from the compiler, and `null` means "keep the plain grammar
   * label" for CSS, shell, JSON and the single-file components.
   */
  displayLanguage?: string | null | undefined;
};

export function codeContent(
  source: VariantSource,
  highlight: (code: string, lang: string) => string,
): CodeContent {
  const variants = highlightedVariants(source, highlight);
  const html = variants?.[0]?.html ?? highlight(source.code, source.lang);
  const displayLanguage = compatibilityLabel(
    source.code,
    source.lang,
    source.framework,
  );
  return variants ? { html, variants, displayLanguage } : { html, displayLanguage };
}

/**
 * The compatibility label for each snippet, keyed by its source text.
 *
 * The companion to {@link javascriptSources} for guides that highlight on the
 * client: the label needs the compiler, the markup does not. Keyed by source for
 * the same reason — the same text always yields the same answer, so no snippet
 * needs an invented id.
 *
 * `framework` travels with each snippet because it is the only thing that can
 * make two identical sources disagree: an Angular snippet and a React snippet
 * with the same text would be labelled differently, and a guide that passed the
 * framework for one and not the other would get whichever ran last. In practice
 * no such pair exists — the corpus is checked for it — but the parameter is
 * required for the label to be a function of the snippet rather than of the
 * order it was listed in.
 */
export function compatibilityLabels(
  snippets: readonly { code: string; lang: string; framework?: string }[],
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const snippet of snippets) {
    const label = compatibilityLabel(snippet.code, snippet.lang, snippet.framework);
    if (label !== null) labels[snippet.code] = label;
  }
  return labels;
}

/**
 * The JavaScript source for each snippet, keyed by its TypeScript source.
 *
 * For a guide that is a client component and highlights as it renders, sending
 * two pre-highlighted variants per snippet roughly triples the props payload for
 * text the browser already has. This sends only what the client cannot compute —
 * the derived source — and lets it reuse the Shiki instance it is already
 * running. Keying by the source itself avoids inventing an id per snippet: the
 * same text always derives the same JavaScript.
 *
 * Snippets with no counterpart are absent, so a lookup miss is the normal
 * "render one form, no selector" case.
 */
export function javascriptSources(
  snippets: readonly { code: string; lang: string; framework?: string }[],
): Record<string, string> {
  const sources: Record<string, string> = {};
  for (const snippet of snippets) {
    const js = javascriptFor(snippet.code, snippet.lang, snippet.framework);
    if (js !== null && js.trim() !== snippet.code.trim()) sources[snippet.code] = js;
  }
  return sources;
}
