"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { CodeLanguageId } from "../lib/code-variants";

type CodeLanguageState = {
  /** The language every paired example on this page is showing. */
  language: CodeLanguageId;
  /** Switch every paired example on this page at once. */
  setLanguage: (language: CodeLanguageId) => void;
};

const CodeLanguageContext = createContext<CodeLanguageState | null>(null);

/**
 * One language choice per documentation page.
 *
 * A page usually shows the same example several times — the provider setup, the
 * toggle, the scoped panel — and those blocks form one program. Remembering the
 * choice per page means a reader who needs JavaScript picks it once and the rest
 * of the page follows, instead of switching six identical controls and risking a
 * TypeScript setup followed by a JavaScript continuation.
 *
 * Deliberately *not* persisted: a global preference would need a hydration-safe
 * read, a storage key, and a way to explain why one page's choice changed
 * another's. The default is TypeScript, which is what the docs have always
 * shown, and the state resets when the reader opens a new page.
 */
export function CodeLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<CodeLanguageId>("ts");

  const setLanguage = useCallback((next: CodeLanguageId) => {
    setLanguageState(next);
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return <CodeLanguageContext.Provider value={value}>{children}</CodeLanguageContext.Provider>;
}

/**
 * The page's language choice, or `null` outside a provider.
 *
 * `null` is meaningful: a `CodeBlock` rendered outside `DocsLayout` (the
 * playground, the theme studio, a probe harness) keeps its own local choice
 * rather than throwing or silently defaulting to a shared store that is not
 * there.
 */
export function useCodeLanguage(): CodeLanguageState | null {
  return useContext(CodeLanguageContext);
}
