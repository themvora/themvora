/**
 * Standalone browser entry.
 *
 * Bundled by `tsup` into `dist/cdn.js` as an IIFE with `@themvora/core`
 * inlined, so a plain HTML page can load one `<script>` and use the elements
 * with no import map, no bundler and no bare-specifier resolution:
 *
 * ```html
 * <script src="https://cdn.jsdelivr.net/npm/@themvora/web@1.4.0/dist/cdn.js"></script>
 * ```
 *
 * Importing this module registers the elements and injects the component
 * stylesheet (the side effect of `./index`), and also exposes the public API
 * on `window.ThemvoraWeb` for pages that need the imperative runtime.
 *
 * @packageDocumentation
 */
export * from "./index";
