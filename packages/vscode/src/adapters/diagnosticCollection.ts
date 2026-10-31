/**
 * Theme diagnostics in the Problems panel.
 *
 * The adapter owns three things and nothing else: which documents qualify, when
 * to recompute, and where to draw. Every judgement about *what* is wrong comes
 * from `domain/themeDiagnostics`, which comes from core.
 *
 * Two decisions worth stating:
 *
 * - **A malformed edit clears, it does not complain.** Half-typed JSON is not a
 *   theme yet; a red squiggle on every keystroke while the user types is noise,
 *   and core has nothing to say about a document it cannot read.
 * - **Computation is synchronous.** Core validation is sub-millisecond, so there
 *   is no in-flight result that could land after a newer edit. The debounce reads
 *   the live buffer at fire time, which is why a stale publish is structurally
 *   impossible rather than merely unlikely.
 *
 * @packageDocumentation
 */
import {
  Diagnostic,
  DiagnosticSeverity,
  Range,
  languages,
  workspace,
  type Disposable,
  type OutputChannel,
  type TextDocument,
} from "vscode";

import { TOKEN_GROUPS } from "@themvora/core";

import { indexThemeDocument, splitPath, type Location } from "../domain/diagnosticLocator.js";
import { diagnoseThemes } from "../domain/themeDiagnostics.js";
import { parseThemeDocument } from "../domain/themeDocument.js";

/** How long to wait after an edit before recomputing. */
const DEBOUNCE_MS = 200;

/** The languages the extension understands. */
const LANGUAGES = new Set(["json", "jsonc"]);

/** What the collection needs. */
export interface DiagnosticsDeps {
  /** Where unresolved locations are reported. */
  readonly output: OutputChannel;
}

/**
 * A cheap pre-check.
 *
 * `parseThemeDocument` is not expensive, but this runs on *every* JSON edit in
 * the editor, so it must not parse files that cannot be themes. Both accepted
 * shapes are covered: a single theme has `tokens`, and a pair has `light` and
 * `dark`. It deliberately does not require `tokens`, because a document whose
 * themes are missing their tokens entirely is still one this should diagnose.
 *
 * @param text - The document text.
 * @returns `true` when a full parse is worth attempting.
 */
function mayBeThemeDocument(text: string): boolean {
  if (/"tokens"\s*:/.test(text)) return true;
  return /"light"\s*:/.test(text) && /"dark"\s*:/.test(text);
}

/**
 * Turn a core issue path into a path into the document.
 *
 * Core reports token paths relative to `theme.tokens` — `colors.primary`, not
 * `tokens.colors.primary`. Anything that starts with a token group is prefixed;
 * a path that does not (a hypothetical `meta.*` issue) is used as-is.
 *
 * @param path - The path core reported.
 * @returns Segments rooted at the document.
 */
function documentSegments(path: string): string[] {
  const segments = splitPath(path);
  const first = segments[0];

  if (first !== undefined && (TOKEN_GROUPS as readonly string[]).includes(first)) {
    return ["tokens", ...segments];
  }

  return segments;
}

/**
 * Convert a located span to a range.
 *
 * @param document - The document the offsets belong to.
 * @param location - The located span.
 * @returns The range, or `null` when nothing could be located.
 */
function toRange(document: TextDocument, location: Location): Range | null {
  if (location.status === "unresolved") return null;

  return new Range(
    document.positionAt(location.range.start),
    document.positionAt(location.range.end),
  );
}

/**
 * Register the diagnostic collection.
 *
 * @param deps - The output channel.
 * @returns The registration, to be disposed with the extension.
 */
export function registerThemeDiagnostics(deps: DiagnosticsDeps): Disposable {
  const collection = languages.createDiagnosticCollection("themvora");
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const subscriptions: Disposable[] = [];

  /**
   * Recompute one document and publish the result.
   *
   * @param document - The document, read from its live buffer.
   */
  function evaluate(document: TextDocument): void {
    if (!LANGUAGES.has(document.languageId)) return;

    const text = document.getText();

    if (!mayBeThemeDocument(text)) {
      collection.delete(document.uri);
      return;
    }

    const parsed = parseThemeDocument(text);
    if (parsed.shape !== "themes") {
      // Not (yet) a theme. Clear rather than report a parse error.
      collection.delete(document.uri);
      return;
    }

    // The masked source: same length as the document, so its offsets address
    // the original text even when comments sit above a token.
    const index = indexThemeDocument(parsed.source);
    if (index === null) {
      // `parseThemeDocument` accepted it, so this should be unreachable; clearing
      // is the honest response if the two ever disagree.
      deps.output.appendLine(`Could not index ${document.uri.fsPath} for diagnostics.`);
      collection.delete(document.uri);
      return;
    }

    const diagnostics: Diagnostic[] = [];

    for (const issue of diagnoseThemes(parsed.themes)) {
      const location = issue.path === null
        ? { status: "unresolved" as const }
        : index.locate(documentSegments(issue.path), issue.half);

      const range = toRange(document, location);
      if (range === null) {
        // Never underline an unrelated property to have somewhere to point.
        deps.output.appendLine(
          `No source location for ${issue.path ?? "(no path)"} in ${document.uri.fsPath}.`,
        );
        continue;
      }

      const diagnostic = new Diagnostic(
        range,
        issue.message,
        issue.severity === "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
      );
      diagnostic.code = issue.code;
      diagnostic.source = "Themvora";
      diagnostics.push(diagnostic);
    }

    collection.set(document.uri, diagnostics);
  }

  /**
   * Schedule a recompute.
   *
   * The timer stores which version it was scheduled for so a superseded run can
   * be recognised; the run itself always reads the live buffer, which is what
   * keeps the published result current.
   *
   * @param document - The document that changed.
   */
  function schedule(document: TextDocument): void {
    const key = document.uri.toString();

    const existing = timers.get(key);
    if (existing !== undefined) clearTimeout(existing);

    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);

        // The document may have closed while the timer was pending.
        const current = workspace.textDocuments.find(
          (candidate) => candidate.uri.toString() === key,
        );
        if (current === undefined) return;

        evaluate(current);
      }, DEBOUNCE_MS),
    );
  }

  /** Cancel a pending recompute for one document. */
  function cancel(key: string): void {
    const timer = timers.get(key);
    if (timer === undefined) return;
    clearTimeout(timer);
    timers.delete(key);
  }

  subscriptions.push(
    workspace.onDidOpenTextDocument((document) => evaluate(document)),

    workspace.onDidChangeTextDocument((event) => schedule(event.document)),

    workspace.onDidCloseTextDocument((document) => {
      cancel(document.uri.toString());
      collection.delete(document.uri);
    }),
  );

  // Activation can happen after documents are already open, so the existing ones
  // are evaluated too.
  for (const document of workspace.textDocuments) evaluate(document);

  return {
    dispose(): void {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      for (const subscription of subscriptions) subscription.dispose();
      collection.dispose();
    },
  };
}
