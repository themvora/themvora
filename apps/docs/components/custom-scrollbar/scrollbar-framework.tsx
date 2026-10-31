"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CodeBlock } from "../code-block";
import { highlightCode } from "../../lib/highlight";
import { pairWithJavaScript } from "../../lib/code-language";
import { useScrollToOnChange } from "../ui/use-scroll-to-on-change";
import type { ScrollbarExample, ScrollbarFramework } from "./snippets";

/**
 * Types only. The snippet maps deliberately are *not* re-exported from here: a
 * value exported by a `"use client"` module reaches a server component as a
 * client reference, not as the object, so `Object.values(MOUNT_SNIPPETS)` on the
 * page would throw. The page imports them from `./snippets` for that reason.
 */
export type { ScrollbarExample, ScrollbarFramework } from "./snippets";

export const SCROLLBAR_FRAMEWORKS: {
  id: ScrollbarFramework;
  label: string;
}[] = [
  { id: "react", label: "React" },
  { id: "next", label: "Next.js" },
  { id: "vue", label: "Vue" },
  { id: "svelte", label: "Svelte" },
  { id: "solid", label: "Solid" },
  { id: "angular", label: "Angular" },
  { id: "astro", label: "Astro" },
  { id: "web", label: "Web Components" },
  { id: "nuxt", label: "Nuxt" },
  { id: "remix", label: "Remix" },
  { id: "vanilla", label: "Vanilla JS" },
];

interface ScrollbarCtx {
  framework: ScrollbarFramework;
  setFramework: (f: ScrollbarFramework) => void;
  /**
   * Derived JavaScript for the snippets on this page, keyed by source text.
   *
   * The TypeScript compiler runs in the page — a server component — so the
   * guide can offer a language selector without shipping a parser to the
   * browser. `undefined` when the page has nothing to derive, which is also the
   * signal to render every block without a selector. Declared as required-and-
   * possibly-undefined rather than optional because the provider always sets
   * the key, and `exactOptionalPropertyTypes` treats the two differently.
   */
  jsSources: Record<string, string> | undefined;
  /**
   * Compatibility badge per source text — `TS / JS`, `TS`, `TSX / JSX`, …
   *
   * Separate from `jsSources` on purpose: the badge describes what the snippet
   * *is*, not what it was converted to. A snippet highlighted with the
   * TypeScript grammar can still be valid JavaScript, and only this map knows
   * that. `undefined` renders the grammar's own label, as before.
   */
  labels: Record<string, string> | undefined;
}

const ScrollbarFrameworkContext = createContext<ScrollbarCtx | null>(null);

export function ScrollbarFrameworkProvider({
  children,
  defaultFramework = "react",
  jsSources,
  labels,
}: {
  children: ReactNode;
  defaultFramework?: ScrollbarFramework;
  jsSources?: Record<string, string>;
  labels?: Record<string, string>;
}) {
  const [framework, setFramework] = useState<ScrollbarFramework>(defaultFramework);
  return (
    <ScrollbarFrameworkContext.Provider value={{ framework, setFramework, jsSources, labels }}>
      {children}
    </ScrollbarFrameworkContext.Provider>
  );
}

export function useScrollbarFramework(): ScrollbarCtx {
  const c = useContext(ScrollbarFrameworkContext);
  if (!c) throw new Error("useScrollbarFramework must be used within ScrollbarFrameworkProvider");
  return c;
}

export function ScrollbarFrameworkSelector({
  scrollToId,
}: {
  scrollToId?: string;
}) {
  const { framework, setFramework } = useScrollbarFramework();

  // Scroll after the framework change commits, so the target's position is
  // measured after any snippet-height changes above it have settled.
  useScrollToOnChange(scrollToId, framework);

  return (
    <div className="flex flex-wrap gap-1.5 mb-4" role="tablist">
      {SCROLLBAR_FRAMEWORKS.map((f) => {
        const active = framework === f.id;
        return (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setFramework(f.id)}
            className={`chip ${active ? "chip-active" : ""}`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

export function ScrollbarFrameworkCode({
  map,
  fallback,
}: {
  map: Partial<Record<ScrollbarFramework, ScrollbarExample>>;
  fallback?: ReactNode;
}) {
  const { framework, jsSources, labels } = useScrollbarFramework();
  const example = map[framework];
  if (!example) return fallback ?? null;

  // Highlighting happens here, with the Shiki instance the page already runs;
  // only the source text crossed the server boundary. `pairWithJavaScript`
  // returns nothing when the JavaScript is identical to the TypeScript, so a
  // snippet with no meaningful counterpart gets no selector.
  const js = jsSources?.[example.code];
  const variants = js
    ? pairWithJavaScript(example, js)?.map((variant) => ({
        ...variant,
        html: highlightCode(variant.code, variant.lang),
      }))
    : undefined;

  const label = labels?.[example.code];

  return (
    <CodeBlock
      html={highlightCode(example.code, example.lang)}
      code={example.code}
      language={example.lang}
      {...(example.filename ? { filename: example.filename } : {})}
      {...(label ? { displayLanguage: label } : {})}
      {...(variants ? { variants } : {})}
      className="rounded-lg m-0"
    />
  );
}
