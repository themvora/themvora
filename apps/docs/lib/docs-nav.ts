/**
 * Canonical documentation navigation tree.
 *
 * Every destination here is an existing route under `app/`. The tree replaces
 * the flat sidebar lists that used to live inside `components/docs-layout.tsx`
 * without introducing a second route collection: `lib/docs-routes.ts` remains
 * the flat, ordered list used by prev/next pagination, the search index and the
 * sitemap; this module supplies the hierarchy those lists lacked.
 *
 * Both files are read as text by `scripts/docs/audits/audit-page-contracts.mjs`
 * (sidebar coverage), so keep `href` values as literal strings and keep this
 * module free of imports that would make the file expensive to load in Node.
 *
 * Groups are *navigation structure*, not pages. They render as real buttons
 * with `aria-expanded`, never as links with a nested toggle, which is what keeps
 * the tree keyboard-operable without implementing the ARIA treeview pattern.
 */

export type DocsNavLink = {
  kind: "link";
  href: string;
  label: string;
  /**
   * `prefix` keeps an index link active on its descendants (used for
   * data-driven sections such as `/api-reference` and `/blog`). Everything else
   * is exact, so a guide and its nested examples page never both look current.
   */
  match?: "exact" | "prefix";
};

export type DocsNavGroup = {
  kind: "group";
  /** Stable across renders; also the persisted expansion key. */
  id: string;
  label: string;
  children: DocsNavNode[];
};

export type DocsNavNode = DocsNavLink | DocsNavGroup;

export type DocsNavSection = {
  id: string;
  heading: string;
  children: DocsNavNode[];
};

const link = (href: string, label: string, match?: "exact" | "prefix"): DocsNavLink => ({
  kind: "link",
  href,
  label,
  ...(match ? { match } : {}),
});

const group = (id: string, label: string, children: DocsNavNode[]): DocsNavGroup => ({
  kind: "group",
  id,
  label,
  children,
});

const frameworkGuide = (
  guideHref: string,
  examplesHref: string,
  label: string,
  id = `fw-${guideHref.split("/").pop()}`,
): DocsNavGroup =>
  group(id, label, [
    link(guideHref, "Guide"),
    link(examplesHref, "Examples"),
  ]);

/**
 * A library entry: its installation guide and its API examples.
 *
 * Mirrors {@link frameworkGuide} deliberately — the same two things are useful
 * for a library as for a framework, and a reader who has used one section
 * already knows how the other behaves.
 */
const libraryGuide = (
  slug: string,
  label: string,
): DocsNavGroup =>
  group(`lib-${slug}`, label, [
    link(`/libraries/${slug}`, "Guide"),
    link(`/libraries/${slug}/examples`, "Examples"),
  ]);

const libraryLinks: DocsNavNode[] = [
  libraryGuide("shadcn", "shadcn/ui"),
  libraryGuide("bootstrap", "Bootstrap"),
  libraryGuide("daisyui", "daisyUI"),
  libraryGuide("open-props", "Open Props"),
  libraryGuide("mui", "Material UI"),
  libraryGuide("chakra", "Chakra UI"),
  libraryGuide("antd", "Ant Design"),
  libraryGuide("mantine", "Mantine"),
  libraryGuide("unocss", "UnoCSS"),
];

const packageLinks: DocsNavLink[] = [
  link("/packages/react", "@themvora/react"),
  link("/packages/next", "@themvora/next"),
  link("/packages/vue", "@themvora/vue"),
  link("/packages/svelte", "@themvora/svelte"),
  link("/packages/solid", "@themvora/solid"),
  link("/packages/angular", "@themvora/angular"),
  link("/packages/web", "@themvora/web"),
  link("/packages/tailwind", "@themvora/tailwind"),
  link("/packages/astro", "@themvora/astro"),
  link("/packages/nuxt", "@themvora/nuxt"),
  link("/packages/remix", "@themvora/remix"),
  link("/packages/cli", "@themvora/cli"),
  link("/packages/devtools", "@themvora/devtools"),
];

const cliCommandLinks: DocsNavLink[] = [
  link("/cli/generate", "generate"),
  link("/cli/list", "list"),
  link("/cli/validate", "validate"),
  link("/cli/inspect", "inspect"),
  link("/cli/diff", "diff"),
  link("/cli/explain", "explain"),
  link("/cli/audit", "audit"),
  link("/cli/doctor", "doctor"),
  link("/cli/init", "init"),
  link("/cli/add", "add"),
  link("/cli/migrate", "migrate"),
  link("/cli/export", "export"),
  link("/cli/completion", "completion"),
];

const cliRegistryLinks: DocsNavLink[] = [
  link("/cli/presets", "presets"),
  link("/cli/brands", "brands"),
  link("/cli/styles", "styles"),
];

export const DOCS_NAV: DocsNavSection[] = [
  {
    id: "getting-started",
    heading: "Getting Started",
    children: [
      link("/quick-start", "Quick Start"),
      link("/get-started", "Get Started"),
      link("/core-concepts", "Core Concepts"),
      link("/choose-package", "Which package?"),
      link("/migrating-to-2", "Migrating to 2.0"),
    ],
  },
  {
    id: "foundations",
    heading: "Foundations",
    children: [
      group("tokens", "Tokens & Typography", [
        link("/tokens", "Semantic Tokens"),
        link("/tokens/code", "Code Tokens"),
        link("/tokens/semantic-roles", "Semantic Roles"),
      ]),
      link("/architecture", "Architecture"),
      link("/token-resolution", "Token Resolution"),
      link("/reference/compatibility", "Compatibility"),
    ],
  },
  {
    id: "themes",
    heading: "Themes",
    children: [
      link("/custom-themes", "Custom Themes"),
      link("/scoped-theme", "Scoped Theme"),
      group("presets", "Presets", [
        link("/presets/default", "Default Presets"),
        link("/presets/brand", "Brand Presets"),
      ]),
      link("/sunrise-sunset", "Sunrise & Sunset"),
      link("/animation", "Animation & Transition"),
      link("/custom-scrollbar", "Custom Scrollbar"),
      link("/migration", "Migration"),
    ],
  },
  {
    id: "runtime",
    heading: "Runtime",
    children: [
      link("/zero-flash", "Zero Flash"),
      link("/persistence", "Persistence"),
      link("/multi-window-sync", "Multi-Window Sync"),
      link("/theme-inspector", "Theme Inspector"),
      link("/plugins", "Plugins"),
      link("/dom-adapters", "DOM Adapters"),
      link("/vanilla", "Framework-Free"),
      link("/vite-plugin", "Vite Plugin"),
      link("/advanced-features", "Advanced Features"),
    ],
  },
  {
    id: "frameworks",
    heading: "Framework Guides",
    children: [
      link("/framework-guides", "Overview"),
      frameworkGuide("/framework-guides/react", "/framework-guides/react/examples", "React"),
      frameworkGuide("/framework-guides/next", "/framework-guides/next/examples", "Next.js"),
      frameworkGuide("/framework-guides/vue", "/framework-guides/vue/examples", "Vue 3"),
      frameworkGuide("/framework-guides/svelte", "/framework-guides/svelte/examples", "Svelte 5"),
      frameworkGuide("/framework-guides/solid", "/framework-guides/solid/examples", "Solid"),
      frameworkGuide("/framework-guides/angular", "/framework-guides/angular/examples", "Angular"),
      frameworkGuide("/framework-guides/web", "/framework-guides/web/examples", "Web Components"),
      frameworkGuide("/framework-guides/tailwind", "/framework-guides/tailwind/examples", "Tailwind CSS"),
      frameworkGuide("/framework-guides/astro", "/framework-guides/astro/examples", "Astro"),
      frameworkGuide("/framework-guides/nuxt", "/framework-guides/nuxt/examples", "Nuxt"),
      // React Router is the successor root-route integration for the same
      // `@themvora/remix` package, not a separate framework. Keep one Remix
      // entry in the framework list and let the reader choose the target
      // inside it.
      group("fw-remix", "Remix", [
        frameworkGuide(
          "/framework-guides/remix",
          "/framework-guides/remix/examples",
          "Remix v2",
          "fw-remix-v2",
        ),
        frameworkGuide(
          "/framework-guides/remix/react-router",
          "/framework-guides/remix/react-router/examples",
          "React Router",
        ),
      ]),
    ],
  },
  {
    id: "packages",
    heading: "Packages & Adapters",
    children: [
      link("/packages", "Packages Overview"),
      link("/package-map", "Package Map"),
      link("/packages/core", "@themvora/core"),
      group("packages-frameworks", "Framework Packages", packageLinks),
      link("/adapters", "UI Adapters"),
      group("libraries", "Libraries", [link("/libraries", "Overview"), ...libraryLinks]),
      link("/devtools", "DevTools"),
      link("/vscode", "VS Code"),
    ],
  },
  {
    id: "cli",
    heading: "CLI",
    children: [
      link("/cli", "Overview"),
      link("/cli/installation", "Installation"),
      link("/cli/quickstart", "Quick Start"),
      group("cli-commands", "Commands", cliCommandLinks),
      group("cli-registries", "Registries", cliRegistryLinks),
      link("/cli/workflows", "Workflows"),
      link("/cli/ci", "CI & Automation"),
      link("/cli/reference", "Reference"),
    ],
  },
  {
    id: "use-cases",
    heading: "Use Cases",
    children: [
      link("/playground", "Playground"),
      link("/theme-studio", "Theme Studio"),
      link("/examples", "Examples"),
      link("/accessibility", "Accessibility"),
      link("/recipes", "Recipes", "prefix"),
      link("/showcase", "Showcase"),
    ],
  },
  {
    id: "reference",
    heading: "Reference & Resources",
    children: [
      link("/api-reference", "API Reference", "prefix"),
      link("/reference/diagnostics", "Diagnostics"),
      link("/troubleshooting", "Troubleshooting"),
      link("/known-limitations", "Known Limitations"),
      link("/changelog", "Changelog"),
      link("/blog", "Blog", "prefix"),
      link("/roadmap", "Roadmap"),
    ],
  },
];

const stripHashAndQuery = (pathname: string): string => {
  const clean = pathname.split("#")[0]?.split("?")[0] ?? pathname;
  if (clean.length > 1 && clean.endsWith("/")) return clean.replace(/\/+$/, "");
  return clean;
};

/** Boundary-safe active test for one navigation link. */
export function isDocsNavLinkActive(pathname: string, item: DocsNavLink): boolean {
  const current = stripHashAndQuery(pathname);
  if (current === item.href) return true;
  return item.match === "prefix" && current.startsWith(`${item.href}/`);
}

function activeGroupTrail(node: DocsNavNode, pathname: string): string[] | null {
  if (node.kind === "link") {
    return isDocsNavLinkActive(pathname, node) ? [] : null;
  }
  for (const child of node.children) {
    const trail = activeGroupTrail(child, pathname);
    if (trail) return [node.id, ...trail];
  }
  return null;
}

/**
 * Every group/section id that must be open for the active page to be visible,
 * outermost first. Returns an empty array for routes that are not in the tree.
 */
export function getActiveNavAncestorIds(pathname: string): string[] {
  const ids: string[] = [];
  for (const section of DOCS_NAV) {
    for (const child of section.children) {
      const trail = activeGroupTrail(child, pathname);
      if (trail) {
        ids.push(section.id, ...trail);
        break;
      }
    }
  }
  return ids;
}

/**
 * Effective expansion state for a route.
 *
 * The active route's ancestors are always open — a reader must never land on a
 * page whose own link is hidden inside a collapsed group. Manual expansion is
 * layered on top, never replacing the active trail, and is not persisted as
 * part of the trail: navigating from React to Vue closes React's group unless
 * the reader opened it themselves.
 */
export function resolveExpandedNavIds(
  pathname: string,
  manualIds: Iterable<string> = [],
): string[] {
  return [...new Set([...manualIds, ...getActiveNavAncestorIds(pathname)])];
}

/** Flattened links, in document order. Used by audits and tests. */
export function collectDocsNavLinks(): DocsNavLink[] {
  const out: DocsNavLink[] = [];
  const walk = (nodes: DocsNavNode[]) => {
    for (const node of nodes) {
      if (node.kind === "link") out.push(node);
      else walk(node.children);
    }
  };
  for (const section of DOCS_NAV) walk(section.children);
  return out;
}
