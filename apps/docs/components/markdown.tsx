import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components, ExtraProps } from "react-markdown";

import { highlightCode } from "../lib/highlight";
import { compatibilityLabel, highlightedVariants } from "../lib/code-variants";
import { CodeBlock } from "./code-block";

function extractLanguage(className?: string): string | undefined {
  const match = /language-([\w-]+)/.exec(className ?? "");
  return match?.[1];
}

type CodeProps = ComponentProps<"code"> & ExtraProps;

function Code({ className, children, ...rest }: CodeProps) {
  return (
    <code className={className} {...rest}>
      {children}
    </code>
  );
}

/** Parse the meta string on a fenced code block, e.g.
 * ` ```ts {1,3-5} title="themes.ts" ` → highlighted lines + filename. */
function parseMeta(meta?: string): {
  highlightLines: Set<number>;
  filename: string;
} {
  const highlightLines = new Set<number>();
  let filename = "";

  if (meta) {
    const linesMatch = /\{([\d,\s-]+)\}/.exec(meta);
    if (linesMatch?.[1]) {
      for (const part of linesMatch[1].split(",")) {
        const trimmed = part.trim();
        const range = /^(\d+)\s*-\s*(\d+)$/.exec(trimmed);
        if (range) {
          const start = Number(range[1]);
          const end = Number(range[2]);
          for (let i = start; i <= end; i++) highlightLines.add(i);
        } else if (/^\d+$/.test(trimmed)) {
          highlightLines.add(Number(trimmed));
        }
      }
    }

    const titleMatch = /(?:title\s*=\s*)?["']([^"']+)["']/.exec(meta);
    if (titleMatch?.[1]) filename = titleMatch[1];
  }

  return { highlightLines, filename };
}

/**
 * The renderer for fenced blocks.
 *
 * Two variants rather than a boolean threaded through `pre`: `components` is a
 * stable object identity, and `react-markdown` re-creates the whole tree when it
 * changes. Building both once keeps that identity fixed per mode.
 */
function createComponents(withLanguageChoice: boolean): Components {
  return {
    /**
     * Tables are wrapped, not restyled.
     *
     * The generated API reference emits member tables whose min-content width
     * (long generic types in the `Type` column) is several times a phone's
     * column, and `overflow` on the `<table>` box is not a scroll container, so
     * the last column was clipped and unreachable. The wrapper is the scroll
     * container; the table keeps its own layout so columns stay aligned.
     */
    table({ children }) {
      return (
        <div className="prose-table-scroll">
          <table>{children}</table>
        </div>
      );
    },
    pre({ children }) {
      const child = Children.toArray(children)[0];

      if (isValidElement(child) && child.type === Code) {
        const { className, children: codeChildren, node } = child.props as CodeProps;
        const language = extractLanguage(className);
        const raw = String(codeChildren ?? "").replace(/\n$/, "");
        const meta = node?.data?.meta as string | undefined;
        const { highlightLines, filename } = parseMeta(meta);
        const html = highlightCode(raw, language, { highlightLines });
        // Fenced blocks in the guides are the same application code the pages
        // show in components, so they get the same treatment: both languages
        // when both exist, no selector when only one does. Highlighted lines are
        // preserved in both, because the mark applies to the same lines in
        // either language — only the annotations were removed.
        const variants = withLanguageChoice
          ? highlightedVariants(
              {
                code: raw,
                lang: language ?? "text",
                ...(filename ? { filename } : {}),
              },
              (source, lang) => highlightCode(source, lang, { highlightLines }),
            )
          : undefined;

        const label = compatibilityLabel(raw, language ?? "text");

        return (
          <CodeBlock
            html={variants?.[0]?.html ?? html}
            code={raw}
            language={language ?? "text"}
            {...(filename ? { filename } : {})}
            {...(variants ? { variants } : {})}
            {...(label ? { displayLanguage: label } : {})}
          />
        );
      }

      return <pre>{children}</pre>;
    },
    code: Code,
  };
}

const components = createComponents(true);
const signatureComponents = createComponents(false);

export function Markdown({
  content,
  codeExamples = true,
}: {
  content: string;
  /**
   * Whether fenced TypeScript blocks get a JavaScript alternative.
   *
   * Off for the generated API reference, whose `ts` fences are *signatures* —
   * `function setTheme(theme: Theme): void` — not code a reader pastes into an
   * application. A JavaScript rendering of a signature is a syntax error, so the
   * honest answer there is TypeScript only.
   */
  codeExamples?: boolean;
}) {
  const active = codeExamples ? components : signatureComponents;
  return (
    <div className="prose-doc">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={active}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
