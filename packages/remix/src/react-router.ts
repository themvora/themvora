/**
 * React Router Framework Mode entry point.
 *
 * React Router's root route owns the document and runs a loader for each
 * request, which is the same contract this package already implements for
 * Remix v2. The runtime layer is framework-neutral — it uses React and the
 * standard `Request` object, never a `@remix-run/*` import — so the same
 * exports apply to both targets. This entry point exists so a React Router
 * project can name its integration explicitly:
 *
 * ```ts
 * import { createThemeDocument } from "@themvora/remix/react-router";
 * ```
 *
 * `createThemeDocument` accepts one static configuration and returns
 * `resolveInitial(request)`, a `Document` component that owns the blocking
 * head script, `<html>` shell and runtime provider, and a standalone
 * `Provider`. Remix v2 consumers can keep importing from `@themvora/remix`.
 *
 * @packageDocumentation
 */
export * from "./index";
