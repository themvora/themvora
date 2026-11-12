import { DOCS_ROUTES } from "./docs-routes.ts";
import type { SearchEntry } from "./search.ts";

export type SearchCategoryId =
  | "api"
  | "guides"
  | "examples"
  | "packages"
  | "adapters"
  | "docs"
  | "cli"
  | "presets"
  | "reference"
  | "blog";

export type ApiKind = "Hook" | "Function" | "Component" | "Type" | "Class";

export type SearchLeaf = {
  /** Stable id for `aria-activedescendant` and DOM lookups. */
  id: string;
  /** Position in the ranked results array, used for navigation. */
  resultIndex: number;
  /** Position in the rendered leaf sequence (what ArrowUp/Down moves through). */
  position: number;
  entry: SearchEntry;
  title: string;
  symbol?: string | undefined;
  kind?: ApiKind | undefined;
  signature?: string | undefined;
  excerpt: string;
  breadcrumb: string[];
  framework?: string | undefined;
  package?: string | undefined;
  /** True for a framework variant under a shared API symbol header. */
  grouped: boolean;
};

export type SearchSymbolGroup = {
  symbol: string;
  kind?: ApiKind | undefined;
  variants: SearchLeaf[];
};

export type SearchCategory = {
  id: SearchCategoryId;
  label: string;
  count: number;
  /** Present for the API category. */
  symbols?: SearchSymbolGroup[];
  /** Present for every non-API category. */
  leaves?: SearchLeaf[];
};

export type SearchPresentation = {
  categories: SearchCategory[];
  /** Every selectable result in rendered order. */
  leaves: SearchLeaf[];
  total: number;
};

export const SEARCH_CATEGORY_LABELS: Record<SearchCategoryId, string> = {
  api: "API Reference",
  guides: "Framework Guides",
  examples: "Framework Examples",
  packages: "Packages",
  adapters: "UI Adapters",
  docs: "Core Documentation",
  cli: "CLI",
  presets: "Presets and Themes",
  reference: "Troubleshooting and Reference",
  blog: "Blog",
};

type Identity = { name: string; pkg?: string };

const IDENTITIES: Record<string, Identity> = {
  core: { name: "Core", pkg: "@themvora/core" },
  react: { name: "React", pkg: "@themvora/react" },
  next: { name: "Next.js", pkg: "@themvora/next" },
  vue: { name: "Vue 3", pkg: "@themvora/vue" },
  svelte: { name: "Svelte 5", pkg: "@themvora/svelte" },
  solid: { name: "Solid", pkg: "@themvora/solid" },
  angular: { name: "Angular", pkg: "@themvora/angular" },
  web: { name: "Web Components", pkg: "@themvora/web" },
  tailwind: { name: "Tailwind CSS", pkg: "@themvora/tailwind" },
  astro: { name: "Astro", pkg: "@themvora/astro" },
  nuxt: { name: "Nuxt", pkg: "@themvora/nuxt" },
  remix: { name: "Remix", pkg: "@themvora/remix" },
  "remix/react-router": { name: "React Router", pkg: "@themvora/remix" },
  devtools: { name: "DevTools", pkg: "@themvora/devtools" },
  adapters: { name: "Adapters" },
  shadcn: { name: "shadcn/ui", pkg: "@themvora/shadcn" },
  bootstrap: { name: "Bootstrap", pkg: "@themvora/bootstrap" },
  daisyui: { name: "daisyUI", pkg: "@themvora/daisyui" },
  "open-props": { name: "Open Props", pkg: "@themvora/open-props" },
  mui: { name: "Material UI", pkg: "@themvora/mui" },
  chakra: { name: "Chakra UI", pkg: "@themvora/chakra" },
  antd: { name: "Ant Design", pkg: "@themvora/antd" },
  mantine: { name: "Mantine", pkg: "@themvora/mantine" },
  unocss: { name: "UnoCSS", pkg: "@themvora/unocss" },
};

const ROUTE_LABELS = new Map(DOCS_ROUTES.map((route) => [route.href, route.label]));

function titleCase(segment: string): string {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function packageLabel(slug: string): string {
  return slug === "package-map" ? "Package Map" : `@themvora/${slug}`;
}

export type RouteContext = {
  category: SearchCategoryId;
  breadcrumb: string[];
  framework?: string | undefined;
  package?: string | undefined;
};

/** Human-readable category and breadcrumb for a canonical docs route. */
export function routeContext(route: string): RouteContext {
  const segments = route.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  const top = segments[0] ?? "";
  const rest = segments.slice(1);

  if (top === "api-reference") {
    if (rest.length === 0) {
      return { category: "api", breadcrumb: ["API Reference"] };
    }

    const full = rest.join("/");
    const fullIdentity = IDENTITIES[full];
    const firstIdentity = IDENTITIES[rest[0]!] ?? {
      name: titleCase(rest[0]!),
    };
    const identity = fullIdentity ?? firstIdentity;
    const tail = rest.slice(1).map((segment) => {
      const nested = IDENTITIES[`${rest[0]}/${segment}`];
      return nested?.name ?? titleCase(segment);
    });
    // A nested target (React Router) keeps its parent’s branch in the
    // breadcrumb while carrying its own identity in the result row.
    const head =
      fullIdentity && rest.length > 1 ? firstIdentity.name : identity.name;

    return {
      category: "api",
      breadcrumb: ["API Reference", head, ...tail],
      framework: identity.name,
      package: identity.pkg,
    };
  }

  if (top === "framework-guides") {
    if (rest.length === 0) {
      return { category: "guides", breadcrumb: ["Framework Guides"] };
    }

    const isExamples = rest[rest.length - 1] === "examples";
    const slug = isExamples ? rest.slice(0, -1) : rest;
    const full = slug.join("/");
    const identity = IDENTITIES[full] ?? IDENTITIES[slug[0]!];
    const name = identity?.name ?? titleCase(slug[0]!);

    // React Router is the successor integration for the Remix package, so it
    // stays under the Remix branch in the hierarchy.
    const parts =
      full === "remix/react-router"
        ? ["Framework Guides", "Remix", "React Router"]
        : ["Framework Guides", name];

    if (isExamples) parts.push("Examples");

    return {
      category: isExamples ? "examples" : "guides",
      breadcrumb: parts,
      framework: identity?.name,
      package: identity?.pkg,
    };
  }

  if (top === "packages") {
    if (rest.length === 0) {
      return { category: "packages", breadcrumb: ["Packages"] };
    }
    const pkg = packageLabel(rest.join("/"));
    return { category: "packages", breadcrumb: ["Packages", pkg], package: pkg };
  }

  if (top === "package-map") {
    return {
      category: "packages",
      breadcrumb: ["Packages", "Package Map"],
    };
  }

  if (top === "libraries") {
    if (rest.length === 0) {
      return { category: "adapters", breadcrumb: ["Libraries"] };
    }
    const identity = IDENTITIES[rest[0]!] ?? {
      name: titleCase(rest[0]!),
    };
    return {
      category: "adapters",
      breadcrumb: ["Libraries", identity.name],
      framework: identity.name,
      package: identity.pkg,
    };
  }

  if (top === "adapters") {
    return {
      category: "adapters",
      breadcrumb: ["Adapters", ...rest.map(titleCase)],
    };
  }

  if (top === "cli") {
    const label = ROUTE_LABELS.get(route) ?? (rest.length ? titleCase(rest.join(" ")) : "CLI");
    return {
      category: "cli",
      breadcrumb: rest.length ? ["CLI", label] : ["CLI"],
    };
  }

  if (top === "presets") {
    const label = ROUTE_LABELS.get(route) ?? titleCase(rest.join(" ") || "Presets");
    return { category: "presets", breadcrumb: ["Themes", label] };
  }

  if (
    top === "reference" ||
    top === "troubleshooting" ||
    top === "known-limitations" ||
    top === "changelog" ||
    top === "roadmap"
  ) {
    const label = ROUTE_LABELS.get(route) ?? titleCase(segments.join(" "));
    return { category: "reference", breadcrumb: ["Reference", label] };
  }

  if (top === "blog") {
    const label = rest.length ? titleCase(rest[rest.length - 1]!) : "Blog";
    return {
      category: "blog",
      breadcrumb: rest.length ? ["Blog", label] : ["Blog"],
    };
  }

  const label = ROUTE_LABELS.get(route) ?? titleCase(top || "Documentation");
  return { category: "docs", breadcrumb: ["Documentation", label] };
}

/**
 * The public symbol a generated API title documents.
 *
 * Typedoc emits titles as full signatures (`useProvidedThemes<T>(...): ...`).
 * Cutting at the first generic or parameter list keeps the identity stable
 * across framework variants while leaving distinct symbols distinct.
 */
export function apiSymbol(title: string): string {
  const bare = title.replace(/^class\s+/i, "").trim();
  const cut = bare.search(/[<(]/);
  const symbol = (cut >= 0 ? bare.slice(0, cut) : bare).trim();
  return symbol.replace(/[.:]+$/, "") || bare;
}

/** A short, meaningful kind label for an API entry. */
export function apiKind(title: string): ApiKind {
  if (/^class\s+/i.test(title)) return "Class";

  const symbol = apiSymbol(title);
  const hasCall = title.includes("(");

  if (!hasCall) {
    // Typedoc emits some components without a call signature
    // (`ThemeProvider`, `ThemeScope`), so name shape is the remaining signal.
    return /(?:Provider|Scope|Toggle|Select|Scrollbar|Inspector|Boundary|Card|Panel|Button|Readout|Directive|Component)$/.test(
      symbol,
    )
      ? "Component"
      : "Type";
  }

  if (/^use[A-Z0-9_]/.test(symbol)) return "Hook";

  if (
    /:\s*(?:React\.)?(?:Element|ReactNode|JSX\.Element|null)\b/.test(title) ||
    /(Provider|Toggle|Scope|Select|Scrollbar|Inspector|Boundary|Card|Panel|Button)/.test(
      symbol,
    )
  ) {
    return "Component";
  }

  return "Function";
}

/** Display title for an API entry: the symbol, not the full signature. */
export function apiDisplayTitle(title: string): string {
  const symbol = apiSymbol(title);
  const kind = apiKind(title);
  return kind === "Hook" || kind === "Function" ? `${symbol}()` : symbol;
}

/** Cut a snippet at a word boundary instead of mid-word. */
export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max).trimEnd()}…`;
}

/**
 * The descriptive part of an entry, without repeating its title or signature.
 *
 * API entries store `title` as the full signature and `text` as
 * `signature + description`; section entries store `title + " — " + desc`.
 * Either way the title is presentation, not excerpt content.
 */
export function searchExcerpt(entry: SearchEntry, max = 160): string {
  let text = entry.text.trim();

  if (text.startsWith(entry.title)) {
    text = text.slice(entry.title.length);
  } else {
    const symbol = apiSymbol(entry.title);
    if (symbol && text.startsWith(symbol)) text = text.slice(symbol.length);
  }

  const frontmatter = /^---\s*([\s\S]*?)\s*---\s*/i.exec(text);
  if (frontmatter) {
    const description = /description:\s*"([^"]*)"/i.exec(frontmatter[1]!);
    text = description?.[1] ?? frontmatter[1]!;
  }

  text = text
    .replace(/^title:\s*"[^"]*"\s*/i, "")
    .replace(/^date:\s*\S+\s*/i, "")
    .replace(/^description:\s*/i, "")
    .replace(/\s+\|\s*(?:Member|Type|Description)\b[\s\S]*$/i, "")
    .replace(/\s+\|\s*-{3,}[\s\S]*$/, "")
    .replace(/^"([\s\S]*)"$/, "$1")
    .replace(/^[\s—–:.,|·-]+/, "")
    .trim();

  // A title-only section or a bare API table has no useful excerpt. Returning
  // the stored text would repeat the title or expose raw table markup.
  if (!text || text.startsWith("|") || /^Member\s+\|/i.test(text)) return "";

  return truncateText(text, max);
}

function makeLeaf(
  entry: SearchEntry,
  resultIndex: number,
  context: RouteContext,
): SearchLeaf {
  const isApi = context.category === "api";
  const title = isApi ? apiDisplayTitle(entry.title) : entry.title;

  return {
    id: `search-result-${resultIndex}`,
    resultIndex,
    position: -1,
    entry,
    title,
    ...(isApi
      ? {
          symbol: apiSymbol(entry.title),
          kind: apiKind(entry.title),
          signature: entry.title,
        }
      : {}),
    excerpt: searchExcerpt(entry),
    breadcrumb: context.breadcrumb,
    framework: context.framework,
    package: context.package,
    grouped: false,
  };
}

/**
 * Turn the ranked results into rendered categories and a leaf sequence.
 *
 * Ranking is untouched: results arrive already sorted, and every group keeps
 * that order. Categories are ordered by their best-ranked result, and API
 * symbols are grouped by exact public symbol so unrelated names never merge.
 */
export function buildSearchPresentation(
  results: readonly SearchEntry[],
): SearchPresentation {
  const categoryBuckets = new Map<
    SearchCategoryId,
    { best: number; leaves: SearchLeaf[] }
  >();
  const apiSymbolBuckets = new Map<
    string,
    {
      symbol: string;
      best: number;
      kind?: ApiKind | undefined;
      variants: SearchLeaf[];
    }
  >();

  results.forEach((entry, resultIndex) => {
    const context = routeContext(entry.route);
    const leaf = makeLeaf(entry, resultIndex, context);

    const bucket = categoryBuckets.get(context.category);
    if (bucket) {
      bucket.best = Math.min(bucket.best, resultIndex);
      bucket.leaves.push(leaf);
    } else {
      categoryBuckets.set(context.category, {
        best: resultIndex,
        leaves: [leaf],
      });
    }

    if (context.category === "api" && leaf.symbol) {
      // A symbol can be documented as both a type and a class in different
      // packages (ThemeRegistry), so kind is part of the identity too.
      const key = `${leaf.symbol}\u0000${leaf.kind ?? ""}`;
      const symbolBucket = apiSymbolBuckets.get(key);
      if (symbolBucket) {
        symbolBucket.best = Math.min(symbolBucket.best, resultIndex);
        symbolBucket.variants.push(leaf);
      } else {
        apiSymbolBuckets.set(key, {
          symbol: leaf.symbol,
          best: resultIndex,
          kind: leaf.kind,
          variants: [leaf],
        });
      }
    }
  });

  const orderedCategoryIds = [...categoryBuckets.entries()]
    .sort((a, b) => a[1].best - b[1].best)
    .map(([id]) => id);

  const leaves: SearchLeaf[] = [];

  const categories: SearchCategory[] = orderedCategoryIds.map((id) => {
    const bucket = categoryBuckets.get(id)!;

    if (id === "api") {
      const symbols: SearchSymbolGroup[] = [...apiSymbolBuckets.values()]
        .sort((a, b) => a.best - b.best)
        .map((symbolBucket) => {
          const variants = [...symbolBucket.variants].sort(
            (a, b) => a.resultIndex - b.resultIndex,
          );
          const isGroup = variants.length > 1;
          for (const variant of variants) variant.grouped = isGroup;
          leaves.push(...variants);
          return {
            symbol: symbolBucket.symbol,
            kind: symbolBucket.kind,
            variants,
          };
        });

      return {
        id,
        label: SEARCH_CATEGORY_LABELS[id],
        count: symbols.reduce((sum, group) => sum + group.variants.length, 0),
        symbols,
      };
    }

    const flat = [...bucket.leaves].sort(
      (a, b) => a.resultIndex - b.resultIndex,
    );
    leaves.push(...flat);

    return {
      id,
      label: SEARCH_CATEGORY_LABELS[id],
      count: flat.length,
      leaves: flat,
    };
  });

  leaves.forEach((leaf, position) => {
    leaf.position = position;
  });

  return { categories, leaves, total: leaves.length };
}
