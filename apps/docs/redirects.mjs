/**
 * Permanent redirects for legacy and commonly guessed URLs.
 *
 * This file is plain JavaScript because `next.config.ts` imports it directly at
 * config load time, before the app's TypeScript pipeline is involved.
 * `lib/redirects.ts` re-exports it with the `RedirectRule` type for app code,
 * and `scripts/check-redirects.mjs` reads the same array.
 *
 * Each destination is a real canonical page listed in `DOCS_ROUTES` or
 * `app/sitemap.ts`; there are no redirect-to-redirect chains. Internal links
 * must point at the canonical URL, never at a source here — the source exists
 * for bookmarks and external references.
 */

export const REDIRECTS = [
  {
    // The top navigation labels its docs link "Docs"; /docs is the URL a reader
    // types when they skip the menu. The canonical landing page is /get-started.
    source: "/docs",
    destination: "/get-started",
    permanent: true,
  },
  {
    // A legacy alias for the Quick Start page. The canonical route is the
    // top-level /quick-start that the header and sidebar link to.
    source: "/framework-guides/quick-start",
    destination: "/quick-start",
    permanent: true,
  },
  {
    // "Web Components" is the package name; the guide slug is "web".
    source: "/framework-guides/web-components",
    destination: "/framework-guides/web",
    permanent: true,
  },
  {
    // React Router is the successor root-route integration for the Remix
    // package, so its canonical pages live under Remix.
    source: "/framework-guides/react-router",
    destination: "/framework-guides/remix/react-router",
    permanent: true,
  },
  {
    source: "/framework-guides/react-router/examples",
    destination: "/framework-guides/remix/react-router/examples",
    permanent: true,
  },
  {
    // No Flash SSR was folded into Zero Flash. Keep old bookmarks working
    // without restoring the separate page or its sidebar entry.
    source: "/no-flash-ssr",
    destination: "/zero-flash",
    permanent: true,
  },
  {
    source: "/default-presets",
    destination: "/presets/default",
    permanent: true,
  },
  {
    source: "/brand-presets",
    destination: "/presets/brand",
    permanent: true,
  },
];
