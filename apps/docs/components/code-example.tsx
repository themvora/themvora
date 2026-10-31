import { CodeBlock } from "./code-block";
import { compatibilityLabel, highlightedVariants } from "../lib/code-variants";
import { highlightCode } from "../lib/highlight";

/**
 * A documentation code example, with its JavaScript counterpart when one exists.
 *
 * Server component on purpose: the derivation needs the TypeScript compiler and
 * Shiki, neither of which belongs in a client bundle. The client receives two
 * pre-highlighted strings and a selector — no parsing, no compiler, no layout
 * shift when a reader switches.
 *
 * Every page that shows application code should use this rather than
 * `CodeBlock` directly, so that a snippet which *can* be shown in both languages
 * always is. `CodeBlock` remains the primitive for the cases where the caller
 * already has markup (the playground, hand-built blocks).
 *
 * ```tsx
 * <CodeExample code={snippet.code} lang={snippet.lang} filename={snippet.title} />
 * ```
 *
 * Snippets that are CSS, shell, JSON, or TypeScript-only render exactly as
 * before: `highlightedVariants` returns `undefined` and no selector is emitted.
 */
export function CodeExample({
  code,
  lang,
  framework,
  filename,
  className,
  bordered,
  collapsible,
  js,
  jsFilename,
}: {
  code: string;
  lang: string;
  /**
   * The framework this example documents, when the page knows it.
   *
   * Passed through so a TypeScript-only framework — Angular — is exempt from the
   * selector and the combined label. `lib/frameworks.tsx` entries, library
   * recipes and the per-framework guides all have it in scope; a page that does
   * not can omit it, and the snippet is then treated as syntax alone.
   */
  framework?: string | undefined;
  filename?: string | undefined;
  className?: string | undefined;
  bordered?: boolean | undefined;
  collapsible?: boolean | undefined;
  /**
   * Hand-authored JavaScript, for the rare snippet whose mechanical counterpart
   * is valid but unidiomatic. Verified like derived output: it must be plain
   * JavaScript, or it is ignored.
   */
  js?: string | undefined;
  jsFilename?: string | undefined;
}) {
  const variants = highlightedVariants(
    {
      code,
      lang,
      ...(framework ? { framework } : {}),
      ...(filename ? { filename } : {}),
      ...(js ? { js } : {}),
      ...(jsFilename ? { jsFilename } : {}),
    },
    highlightCode,
  );

  // The badge answers a different question from the selector: the selector asks
  // whether a JavaScript *rendering* exists, the badge whether this exact source
  // is already valid JavaScript. A snippet can be one and not the other.
  const label = compatibilityLabel(code, lang, framework);

  return (
    <CodeBlock
      code={code}
      html={variants?.[0]?.html ?? highlightCode(code, lang)}
      language={lang}
      {...(filename ? { filename } : {})}
      {...(className ? { className } : {})}
      {...(bordered === undefined ? {} : { bordered })}
      {...(collapsible === undefined ? {} : { collapsible })}
      {...(variants ? { variants } : {})}
      {...(label ? { displayLanguage: label } : {})}
    />
  );
}
