/**
 * The client-safe half of the code-language feature.
 *
 * `lib/code-variants.ts` derives JavaScript from TypeScript with the TypeScript
 * compiler, which makes it a server-only module. This file holds everything
 * about the *pair* that does not need the compiler: the ids, the labels, the
 * language mapping, the file-extension mapping, and the assembly of two
 * variants from a source plus its already-derived JavaScript.
 *
 * It exists so a client component that highlights its own snippets — several of
 * the long guides do — can build the same `CodeVariant[]` shape without pulling
 * a 9 MB parser into the browser. The server derives the JavaScript and sends
 * only the source; the client highlights it with the Shiki instance it already
 * has.
 */

export type CodeLanguageId = "ts" | "js";

/** One selectable form of a snippet, ready to render. */
export type CodeVariant = {
  /** Stable id used by the selector and by tests. */
  id: CodeLanguageId;
  /** Human label shown in the selector. */
  label: string;
  /** Shiki language id for the highlighted `html`. */
  lang: string;
  /** The source the reader copies. */
  code: string;
  /** Precomputed Shiki output for `code`. */
  html: string;
  /** File name to show in the toolbar — the extension follows the language. */
  filename?: string;
};

/** A snippet as the docs declare it. */
export type VariantSource = {
  code: string;
  /** Shiki language id — `ts`, `tsx`, `vue`, `svelte`, `astro`, `css`, … */
  lang: string;
  /**
   * The framework the snippet documents, when the caller knows it — `angular`,
   * `react`, `Angular`, …
   *
   * Only consulted to honour {@link TYPESCRIPT_ONLY_FRAMEWORKS}. A snippet's
   * language cannot answer the question: Angular's examples are TypeScript
   * because Angular is, and several of them are also valid JavaScript, so
   * "what language is this?" and "does this framework get a JavaScript variant?"
   * are two different questions.
   */
  framework?: string;
  /** Declared file name, e.g. `src/App.tsx`. */
  filename?: string;
  /**
   * Hand-authored JavaScript, used instead of the derived form.
   *
   * Only for snippets where the mechanical result is valid but unidiomatic.
   * Verified exactly like derived output: it must parse as plain JavaScript.
   */
  js?: string;
  /** File name for the JavaScript variant, when it is not the mapped one. */
  jsFilename?: string;
};

export const CODE_LANGUAGE_LABEL: Record<CodeLanguageId, string> = {
  ts: "TypeScript",
  js: "JavaScript",
};

/**
 * Languages whose snippets carry TypeScript syntax and therefore have a
 * meaningful JavaScript form.
 *
 * Everything else — CSS, HTML, JSON, YAML, bash, diff, markdown — is
 * language-neutral documentation. Attaching a language selector to a shell
 * command would be a control that changes nothing.
 */
export const DERIVABLE_LANGUAGES: ReadonlySet<string> = new Set([
  "ts",
  "tsx",
  "mts",
  "cts",
  "typescript",
  "vue",
  "svelte",
  "astro",
]);

/**
 * Frameworks whose documentation is TypeScript-only **by decision**.
 *
 * This is not a list of frameworks that happen to be TypeScript: it is the set
 * of integrations whose docs are authored in TypeScript and stay that way. The
 * distinction matters, because the conversion pipeline is otherwise
 * syntax-driven — it offers a JavaScript pane whenever a snippet's types can be
 * erased without changing what the code does. Angular is the explicit exception:
 * its examples are built on decorators, `inject()` and DI tokens, the Angular
 * toolchain compiles TypeScript, and a reader following the Angular guide has a
 * TypeScript project. A JavaScript pane would document a configuration Angular
 * does not accept, and a `TS / JS` badge would claim a portability the framework
 * does not have.
 *
 * The consequence is a deliberate asymmetry the docs keep on purpose:
 *
 *   - no JavaScript variant is derived for an Angular snippet;
 *   - no selector is rendered for one;
 *   - no combined label (`TS / JS`, `TSX / JSX`) is shown for one — **even when
 *     the snippet is technically valid JavaScript**, which several are;
 *   - the badge stays the grammar label (`TS`, `TSX`), which is the convention
 *     Angular documentation already used.
 *
 * Every other framework keeps the syntax-based rules. Adding a framework here is
 * a documentation decision, not a mechanical one, which is why the set is short
 * and named.
 */
export const TYPESCRIPT_ONLY_FRAMEWORKS: ReadonlySet<string> = new Set([
  "angular",
]);

/** Whether a framework's documentation is TypeScript-only by decision. */
export function isTypeScriptOnlyFramework(
  framework?: string | null,
): boolean {
  if (!framework) return false;
  return TYPESCRIPT_ONLY_FRAMEWORKS.has(framework.trim().toLowerCase());
}

/**
 * Angular documentation, recognised from the snippet's own source.
 *
 * The authoritative signal is the framework identity a page already knows (see
 * `VariantSource.framework`), and every Angular call site passes it. This
 * detector exists for the paths where that identity genuinely is not available —
 * a Markdown fence in `content/framework-guides.md`, a generated
 * `content/api-reference/angular.md`, a file read off disk by the examples
 * explorer — and as a safety net, so an Angular snippet that reaches the
 * pipeline without being marked cannot acquire a JavaScript pane by omission.
 *
 * It matches the four things every Angular example in this corpus contains:
 * an `@angular/*` import, an import of an `/angular` subpath (the integration
 * and the library adapters for it), one of Angular's decorators, or the
 * standalone bootstrap API. `provideTheme()` is included because it is the
 * Angular integration's own entry point — a `main.ts` snippet that only calls it
 * is still Angular documentation.
 *
 * Deliberately not matched: the bare word "Angular" in prose or a comment. A
 * React snippet may legitimately explain how it differs from Angular, and a
 * keyword match on prose would strip that snippet's variant for no reason.
 */
const ANGULAR_SOURCE = new RegExp(
  [
    // `@angular/core`, `@angular/platform-browser`, …
    String.raw`["']@angular/`,
    // `@themvora/angular`, `@themvora/shadcn/angular`, … — the integration and
    // every library adapter written for it.
    String.raw`["']@?[\w@./-]*\/angular["']`,
    // Decorators: only Angular's documentation writes these.
    String.raw`@(?:Component|Directive|Injectable|NgModule|Pipe|Input|Output|ViewChild|ViewChildren|ContentChild|ContentChildren|HostListener|HostBinding|Inject|Optional|Self|SkipSelf|Attribute)\s*[({]`,
    // The standalone bootstrap API.
    String.raw`\bbootstrapApplication\s*\(`,
    String.raw`\bApplicationConfig\b`,
    // The Angular integration's entry point.
    String.raw`\bprovideTheme\s*\(`,
  ].join("|"),
);

/** Whether a snippet's source is Angular documentation. */
export function isAngularSource(code: string): boolean {
  return ANGULAR_SOURCE.test(code);
}

/**
 * Whether a snippet is outside the conversion and label pipeline.
 *
 * One predicate for the whole policy, so the derivation, the selector and the
 * badge cannot disagree about whether Angular is exempt: they all ask this.
 */
export function isTypeScriptOnlySource(
  code: string,
  framework?: string | null,
): boolean {
  return isTypeScriptOnlyFramework(framework) || isAngularSource(code);
}

/**
 * The label a source carries when it gets no combined one — `TS`, `TSX`, `JS`,
 * `JSX`, or `null` for a language a language label does not describe.
 *
 * Split out from `compatibilityLabel` because two callers need the grammar half
 * without the "is it also JavaScript?" half: the TypeScript-only branch, and the
 * docs gate that asserts Angular never gets anything else.
 */
export function grammarLabel(lang: string): string | null {
  switch (lang.toLowerCase()) {
    case "ts":
    case "mts":
    case "cts":
    case "typescript":
      return "TS";
    case "tsx":
      return "TSX";
    case "js":
    case "mjs":
    case "cjs":
      return "JS";
    case "jsx":
      return "JSX";
    default:
      return null;
  }
}

/**
 * Shiki language id for the derived JavaScript.
 *
 * A single-file component keeps its own grammar: a `.vue` file is still Vue
 * after its script block stops being TypeScript, and highlighting it as
 * `javascript` would lose the template.
 */
export function javascriptLang(lang: string): string {
  const normalised = lang.toLowerCase();
  if (normalised === "tsx") return "jsx";
  if (normalised === "vue") return "vue";
  if (normalised === "svelte") return "svelte";
  if (normalised === "astro") return "astro";
  return "javascript";
}

/**
 * `src/App.tsx` → `src/App.jsx`, `theme.ts` → `theme.js`.
 *
 * The extension is part of the example's meaning: a reader who copies a
 * `.tsx` file into a JavaScript project has to rename it, and a snippet header
 * that keeps saying `.tsx` while showing JavaScript is the kind of small
 * inconsistency that makes documentation feel untrustworthy.
 */
export function javascriptFilename(filename?: string): string | undefined {
  if (!filename) return undefined;
  return filename.replace(/\.(tsx|ts|mts|cts)\b/, (_match, ext: string) => {
    if (ext === "tsx") return ".jsx";
    if (ext === "ts") return ".js";
    if (ext === "mts") return ".mjs";
    return ".cjs";
  });
}

/**
 * The two variants of a snippet, given its derived JavaScript.
 *
 * `html` is left empty: whoever calls this fills it in with the highlighter it
 * has — the server's Shiki instance for server-rendered blocks, the client's for
 * a guide that highlights as it renders. Returns `undefined` when the two
 * sources are identical, because a selector that toggles between two identical
 * blocks is worse than no selector, and when the snippet belongs to a
 * TypeScript-only framework (see {@link TYPESCRIPT_ONLY_FRAMEWORKS}).
 */
export function pairWithJavaScript(
  source: VariantSource,
  js: string,
): CodeVariant[] | undefined {
  if (!DERIVABLE_LANGUAGES.has(source.lang.toLowerCase())) return undefined;
  if (isTypeScriptOnlySource(source.code, source.framework)) return undefined;
  if (js.trim() === source.code.trim()) return undefined;

  const jsFilename = source.jsFilename ?? javascriptFilename(source.filename);

  return [
    {
      id: "ts",
      label: CODE_LANGUAGE_LABEL.ts,
      lang: source.lang,
      code: source.code,
      html: "",
      ...(source.filename ? { filename: source.filename } : {}),
    },
    {
      id: "js",
      label: CODE_LANGUAGE_LABEL.js,
      lang: javascriptLang(source.lang),
      code: js,
      html: "",
      ...(jsFilename ? { filename: jsFilename } : {}),
    },
  ];
}
