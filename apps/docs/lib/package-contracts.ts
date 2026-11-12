/**
 * Canonical package installation contracts for the documentation.
 *
 * Every install command, prerequisite line and dependency table on the docs
 * site reads from this module. The data mirrors the published manifests under
 * `packages/`; `scripts/docs/audits/audit-installation-contracts.mjs` re-reads
 * those manifests and fails the release gate when this file drifts.
 *
 * ## The core relationship
 *
 * `@themvora/core` is a **normal dependency** of every framework binding, not a
 * peer dependency. Installing `@themvora/react` already brings the core runtime
 * with it. The documentation still shows the explicit pair
 *
 *     pnpm add @themvora/core @themvora/react
 *
 * because a framework guide that teaches the architecture should name both
 * pieces, and pinning the runtime explicitly keeps the resolved core version
 * visible in the application's own manifest. The copy must say that the binding
 * also declares core as a dependency — it must never claim a peer relationship
 * that the manifests do not have.
 *
 * This file is intentionally plain data plus pure functions: it is imported by
 * both server pages and client components (`lib/frameworks.tsx`).
 */

import { getPackageVersion } from "./version.ts";

export const CORE_PACKAGE = "@themvora/core";

export type DependencyEdge = {
  name: string;
  /** Version range as published. Internal workspace edges are omitted. */
  range?: string;
};

export type PeerEdge = DependencyEdge & {
  optional?: boolean;
};

export type PackageContract = {
  slug: string;
  name: string;
  version: string;
  /** Normal `dependencies` — installed automatically with this package. */
  dependencies: DependencyEdge[];
  /** `peerDependencies`; `optional` mirrors `peerDependenciesMeta`. */
  peers: PeerEdge[];
  engines?: { node?: string };
};

/** Packages that wrap the core runtime in a framework's own idiom. */
export const FRAMEWORK_SLUGS = new Set([
  "react",
  "next",
  "vue",
  "svelte",
  "solid",
  "angular",
  "web",
  "tailwind",
  "astro",
  "nuxt",
  "remix",
]);

/** Packages installed as development tooling rather than runtime code. */
export const DEV_TOOL_SLUGS = new Set(["cli", "devtools"]);

const version = (slug: string) => getPackageVersion(slug) ?? "0.0.0";

export const PACKAGE_CONTRACTS: readonly PackageContract[] = [
  {
    slug: "core",
    name: CORE_PACKAGE,
    version: version("core"),
    dependencies: [],
    peers: [],
    engines: { node: ">=18" },
  },
  {
    slug: "react",
    name: "@themvora/react",
    version: version("react"),
    dependencies: [{ name: CORE_PACKAGE }],
    peers: [
      { name: "react", range: "^19.0.0" },
      { name: "react-dom", range: "^19.0.0" },
    ],
  },
  {
    slug: "next",
    name: "@themvora/next",
    version: version("next"),
    dependencies: [{ name: CORE_PACKAGE }, { name: "@themvora/react" }],
    peers: [
      { name: "next", range: "^15.5.22 || ^16" },
      { name: "react", range: "^19.0.0" },
      { name: "react-dom", range: "^19.0.0" },
    ],
  },
  {
    slug: "vue",
    name: "@themvora/vue",
    version: version("vue"),
    dependencies: [{ name: CORE_PACKAGE }, { name: "@themvora/web" }],
    peers: [{ name: "vue", range: "^3.4.0" }],
  },
  {
    slug: "svelte",
    name: "@themvora/svelte",
    version: version("svelte"),
    dependencies: [{ name: CORE_PACKAGE }, { name: "@themvora/web" }],
    peers: [{ name: "svelte", range: "^5.56.0" }],
  },
  {
    slug: "solid",
    name: "@themvora/solid",
    version: version("solid"),
    dependencies: [{ name: CORE_PACKAGE }, { name: "@themvora/web" }],
    peers: [{ name: "solid-js", range: "^1.8.0" }],
  },
  {
    slug: "angular",
    name: "@themvora/angular",
    version: version("angular"),
    dependencies: [
      { name: CORE_PACKAGE },
      { name: "@themvora/web" },
      { name: "tslib", range: "^2.8.0" },
    ],
    peers: [
      { name: "@angular/core", range: ">=17.0.0" },
      { name: "@angular/common", range: ">=17.0.0" },
    ],
  },
  {
    slug: "web",
    name: "@themvora/web",
    version: version("web"),
    dependencies: [{ name: CORE_PACKAGE }],
    peers: [],
  },
  {
    slug: "tailwind",
    name: "@themvora/tailwind",
    version: version("tailwind"),
    dependencies: [{ name: CORE_PACKAGE }],
    peers: [{ name: "tailwindcss", range: "^4.0.0" }],
  },
  {
    slug: "astro",
    name: "@themvora/astro",
    version: version("astro"),
    dependencies: [{ name: CORE_PACKAGE }, { name: "@themvora/web" }],
    peers: [
      { name: "astro", range: "^5.0.0 || ^6.0.0 || ^7.0.0" },
      { name: "react", range: "^19.0.0", optional: true },
      { name: "react-dom", range: "^19.0.0", optional: true },
    ],
  },
  {
    slug: "nuxt",
    name: "@themvora/nuxt",
    version: version("nuxt"),
    dependencies: [{ name: CORE_PACKAGE }, { name: "@themvora/vue" }],
    peers: [
      { name: "nuxt", range: ">=3.10.0" },
      { name: "vue", range: "^3.4.0" },
    ],
  },
  {
    slug: "remix",
    name: "@themvora/remix",
    version: version("remix"),
    dependencies: [{ name: CORE_PACKAGE }, { name: "@themvora/react" }],
    peers: [
      { name: "@remix-run/react", range: "^2.16.0", optional: true },
      { name: "react", range: "^19.0.0" },
      { name: "react-dom", range: "^19.0.0" },
    ],
  },
  {
    slug: "cli",
    name: "@themvora/cli",
    version: version("cli"),
    // The interactive `init` experience is built on these five: the spinner,
    // the colour helper, the banner, the prompt library and the summary panel.
    // They are normal dependencies — the CLI is an application, not a library —
    // so `npx @themvora/cli` installs them with the package.
    dependencies: [
      { name: CORE_PACKAGE },
      { name: "boxen", range: "^9.0.0" },
      { name: "chalk", range: "^6.0.1" },
      { name: "figlet", range: "^1.12.0" },
      { name: "inquirer", range: "^14.2.5" },
      { name: "ora", range: "^10.0.0" },
    ],
    peers: [],
    engines: { node: ">=18" },
  },
  {
    slug: "devtools",
    name: "@themvora/devtools",
    version: version("devtools"),
    dependencies: [{ name: CORE_PACKAGE }],
    peers: [],
  },
  {
    slug: "adapters-shared",
    name: "@themvora/adapters",
    version: "1.3.0",
    dependencies: [{ name: CORE_PACKAGE }],
    peers: [],
    engines: { node: ">=18" },
  },
  // Library adapters. These live under /libraries/*, not /packages/*.
  {
    slug: "shadcn",
    name: "@themvora/shadcn",
    version: version("shadcn"),
    dependencies: [
      { name: "@themvora/adapters" },
      { name: CORE_PACKAGE },
    ],
    peers: [
      { name: "react", range: "^19.0.0", optional: true },
      { name: "react-dom", range: "^19.0.0", optional: true },
      { name: "vue", range: "^3.4.0", optional: true },
      { name: "svelte", range: "^5.0.0", optional: true },
      { name: "solid-js", range: "^1.8.0", optional: true },
      { name: "@angular/core", range: ">=17.0.0", optional: true },
    ],
  },
  {
    slug: "bootstrap",
    name: "@themvora/bootstrap",
    version: version("bootstrap"),
    dependencies: [
      { name: "@themvora/adapters" },
      { name: CORE_PACKAGE },
    ],
    peers: [
      { name: "react", range: "^19.0.0", optional: true },
      { name: "react-dom", range: "^19.0.0", optional: true },
      { name: "vue", range: "^3.4.0", optional: true },
      { name: "svelte", range: "^5.0.0", optional: true },
      { name: "solid-js", range: "^1.8.0", optional: true },
      { name: "@angular/core", range: ">=17.0.0", optional: true },
    ],
  },
  {
    slug: "daisyui",
    name: "@themvora/daisyui",
    version: version("daisyui"),
    dependencies: [
      { name: "@themvora/adapters" },
      { name: CORE_PACKAGE },
    ],
    peers: [
      { name: "react", range: "^19.0.0", optional: true },
      { name: "react-dom", range: "^19.0.0", optional: true },
      { name: "vue", range: "^3.4.0", optional: true },
      { name: "svelte", range: "^5.0.0", optional: true },
      { name: "solid-js", range: "^1.8.0", optional: true },
      { name: "@angular/core", range: ">=17.0.0", optional: true },
    ],
  },
  {
    slug: "open-props",
    name: "@themvora/open-props",
    version: version("open-props"),
    dependencies: [
      { name: "@themvora/adapters" },
      { name: CORE_PACKAGE },
    ],
    peers: [
      { name: "react", range: "^19.0.0", optional: true },
      { name: "react-dom", range: "^19.0.0", optional: true },
      { name: "vue", range: "^3.4.0", optional: true },
      { name: "svelte", range: "^5.0.0", optional: true },
      { name: "solid-js", range: "^1.8.0", optional: true },
      { name: "@angular/core", range: ">=17.0.0", optional: true },
    ],
  },
  {
    slug: "mui",
    name: "@themvora/mui",
    version: version("mui"),
    dependencies: [
      { name: "@themvora/adapters" },
      { name: CORE_PACKAGE },
    ],
    peers: [
      { name: "@emotion/react", range: "^11.0.0" },
      { name: "@emotion/styled", range: "^11.0.0" },
      { name: "@mui/material", range: "^9.0.0" },
      { name: "react", range: "^19.0.0" },
      { name: "react-dom", range: "^19.0.0" },
    ],
  },
  {
    slug: "chakra",
    name: "@themvora/chakra",
    version: version("chakra"),
    dependencies: [
      { name: "@themvora/adapters" },
      { name: CORE_PACKAGE },
    ],
    peers: [
      { name: "@chakra-ui/react", range: "^3.0.0" },
      { name: "react", range: "^19.0.0" },
      { name: "react-dom", range: "^19.0.0" },
    ],
  },
  {
    slug: "antd",
    name: "@themvora/antd",
    version: version("antd"),
    dependencies: [
      { name: "@themvora/adapters" },
      { name: CORE_PACKAGE },
    ],
    peers: [
      { name: "antd", range: "^6.0.0" },
      { name: "react", range: "^19.0.0" },
      { name: "react-dom", range: "^19.0.0" },
      // `@themvora/antd/next` serialises Ant Design's cssinjs cache into the
      // server HTML; only a project using that subpath needs the package.
      { name: "@ant-design/cssinjs", range: "^2.0.0" },
      // The same subpath uses `useServerInsertedHTML`. Optional: a Remix or Vite
      // app installs neither.
      { name: "next", range: ">=15", optional: true },
    ],
  },
  {
    slug: "mantine",
    name: "@themvora/mantine",
    version: version("mantine"),
    dependencies: [
      { name: "@themvora/adapters" },
      { name: CORE_PACKAGE },
    ],
    peers: [
      { name: "@mantine/core", range: "^7.0.0 || ^9.0.0" },
      { name: "@mantine/hooks", range: "^7.0.0 || ^9.0.0" },
      { name: "react", range: "^19.0.0" },
      { name: "react-dom", range: "^19.0.0" },
    ],
  },
  {
    slug: "unocss",
    name: "@themvora/unocss",
    version: version("unocss"),
    dependencies: [
      { name: "@themvora/adapters" },
      { name: CORE_PACKAGE },
    ],
    peers: [
      { name: "@unocss/core", range: "^66.0.0" },
      { name: "unocss", range: "^66.0.0" },
    ],
  },
] as const;

const BY_SLUG = new Map(PACKAGE_CONTRACTS.map((contract) => [contract.slug, contract]));
const BY_NAME = new Map(PACKAGE_CONTRACTS.map((contract) => [contract.name, contract]));

export function contractForSlug(slug: string): PackageContract | undefined {
  return BY_SLUG.get(slug);
}

export function contractForPackage(name: string): PackageContract | undefined {
  return BY_NAME.get(name);
}

/** How `@themvora/core` relates to a package: itself, dependency or peer. */
export function coreRelationFor(
  contract: PackageContract,
): "self" | "dependency" | "peer" | "none" {
  if (contract.name === CORE_PACKAGE) return "self";
  if (contract.dependencies.some((dependency) => dependency.name === CORE_PACKAGE)) {
    return "dependency";
  }
  if (contract.peers.some((peer) => peer.name === CORE_PACKAGE)) return "peer";
  return "none";
}

/** Format one install command for a package manager. */
export function installCommand(
  packages: readonly string[],
  manager: string,
  options: { dev?: boolean } = {},
): string {
  const list = packages.join(" ");
  if (manager === "npm") {
    return `npm install${options.dev ? " -D" : ""} ${list}`;
  }
  if (manager === "bun") {
    return `bun add${options.dev ? " -d" : ""} ${list}`;
  }
  return `${manager} add${options.dev ? " -D" : ""} ${list}`;
}

/**
 * The packages a reader explicitly adds for this integration.
 *
 * Framework bindings get the explicit core + binding pair described in this
 * file's header. CSS-only Tailwind adds Tailwind itself through the framework
 * entry's `extraPackages`. Tooling is installed alone — its core dependency is
 * an implementation detail, not something the reader should manage.
 */
export function explicitInstallPackages(
  contract: PackageContract,
  options: { extraPackages?: readonly string[] } = {},
): string[] {
  if (contract.name === CORE_PACKAGE) return [CORE_PACKAGE];
  if (DEV_TOOL_SLUGS.has(contract.slug)) return [contract.name];
  if (FRAMEWORK_SLUGS.has(contract.slug)) {
    return [CORE_PACKAGE, contract.name, ...(options.extraPackages ?? [])];
  }
  // Library adapters always run on core and the reader's framework binding.
  return [CORE_PACKAGE, contract.name];
}

/** Whether the package's documented install should be a devDependency. */
export function isDevDependency(contract: PackageContract): boolean {
  return contract.slug === "cli";
}

export { installCommand as formatInstallCommand };
