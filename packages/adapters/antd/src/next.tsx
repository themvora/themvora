"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { StyleProvider, createCache, extractStyle } from "@ant-design/cssinjs";

/** Id of the server-emitted style element. */
export const ANTD_SSR_STYLE_ID = "antd-cssinjs";

/**
 * Cascade layer holding the server-rendered snapshot.
 *
 * Ant Design's client styles are inserted **unlayered**, and an unlayered rule
 * always outranks a layered one regardless of specificity or document order.
 * That is exactly the precedence this needs: the server snapshot styles the
 * first frame, where nothing else exists, and stops applying the moment the
 * live cache produces a rule for the same element.
 *
 * Without the layer the snapshot wins permanently. It is emitted by
 * `useServerInsertedHTML`, so it sits *after* the client's `prependQueue` blocks
 * with equal specificity — later wins — and every later theme change is
 * overridden by the colours of the first render. Removing the element instead
 * does not work either: the client cache does not re-register component rules
 * for a tree it has already hydrated, so the styles are lost outright.
 */
const SSR_LAYER = "themvora-antd-ssr";

/**
 * Serialises Ant Design's CSS-in-JS cache into the server HTML.
 *
 * ## Why this is needed
 *
 * Ant Design does not ship a stylesheet — every rule lives in a cssinjs cache
 * that only exists at runtime. Without serialising it, the server HTML carries
 * the markup but none of the styling, and the first frame after a reload is
 * unstyled: no card surfaces, native form controls, stacked text.
 *
 * ## Why the layer matters
 *
 * See {@link SSR_LAYER}. The short version: this block must never outrank the
 * live cache, or theme switching silently stops working for every component
 * whose colours come from antd tokens.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { AntdStyleRegistry } from "@themvora/antd/next";
 *
 * <ThemeProvider>
 *   <AntdStyleRegistry>{children}</AntdStyleRegistry>
 * </ThemeProvider>
 * ```
 */
export function AntdStyleRegistry({ children }: { children: ReactNode }) {
  const cache = useMemo(() => createCache(), []);
  const flushed = useRef(false);

  // `useServerInsertedHTML` fires once per streamed segment; without this guard
  // the whole cache is re-emitted each time, which produced five megabytes of
  // duplicated CSS in the document.
  useServerInsertedHTML(() => {
    if (flushed.current) return null;
    flushed.current = true;
    return (
      <style
        id={ANTD_SSR_STYLE_ID}
        dangerouslySetInnerHTML={{
          __html: `@layer ${SSR_LAYER} {\n${extractStyle(cache, true)}\n}`,
        }}
      />
    );
  });

  return <StyleProvider cache={cache}>{children}</StyleProvider>;
}
