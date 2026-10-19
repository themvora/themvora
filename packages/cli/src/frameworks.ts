/**
 * The framework capability registry.
 *
 * One list, three consumers:
 *
 * - `themvora list frameworks` — the `init`-supported subset;
 * - `themvora init --framework` (Stage 3) — the same subset, plus the strategy
 *   contracts that attach to it;
 * - `themvora doctor` — detection from a project's dependencies, across **every**
 *   published integration.
 *
 * `init` support is deliberately narrower than library support: Angular, Nuxt,
 * Astro and Remix are fully supported by their packages and docs, but they are
 * not scaffold targets yet. That distinction is a field (`initSupported`), not a
 * second list, so a framework cannot be in one place and missing from the other.
 *
 * @packageDocumentation
 */

/**
 * The core package every integration builds on.
 *
 * Named once because generated code imports it and the framework registry
 * declares it; two spellings of the same package name is exactly the drift the
 * registry exists to prevent.
 */
export const CORE_PACKAGE = "@themvora/core";

/** What the first `init` release can do for a framework. */
export interface InitFrameworkSupport {
  /** `init <dir> --framework <id>` can scaffold a new project. */
  freshProject: boolean;
  /** `init . --framework <id>` can integrate into an existing project. */
  existingProject: boolean;
}

/** One framework Themvora publishes an integration for. */
export interface FrameworkIntegration {
  /** The value accepted by `--framework`. */
  id: string;
  /** Human-readable name. */
  displayName: string;
  /** The npm dependency that indicates this framework is in use. */
  dependency: string;
  /**
   * Which framework wins when several match.
   *
   * A Next.js app also depends on `react`, and a Nuxt app on `vue`, so detection
   * cannot simply take the first match — the more specific framework must win.
   */
  detectionPriority: number;
  /** The build system the official scaffold uses. */
  buildSystem: string;
  /** Whether the generated app renders on the server. */
  ssr: boolean;
  /** Whether the integration uses the Vite bootstrap plugin. */
  vite: boolean;
  /** What the first release supports for this framework. */
  supports: InitFrameworkSupport;
  /** The Themvora packages the integration installs. */
  packages: readonly string[];
  /** Whether `themvora init` can scaffold it in this release. */
  initSupported: boolean;
}

/** A framework `init` supports. Same shape as its integration entry. */
export type InitFramework = FrameworkIntegration;

/**
 * Every published integration, `init`-supported ones first.
 *
 * React, Vue, Svelte and Solid share one Vite-compatible bootstrap
 * architecture. Next.js has its own server-first integration and is never
 * pushed through the Vite path.
 */
export const FRAMEWORK_INTEGRATIONS: readonly FrameworkIntegration[] = [
  {
    id: "react",
    displayName: "React",
    dependency: "react",
    detectionPriority: 50,
    buildSystem: "Vite",
    ssr: false,
    vite: true,
    supports: { freshProject: true, existingProject: true },
    packages: ["@themvora/core", "@themvora/react"],
    initSupported: true,
  },
  {
    id: "next",
    displayName: "Next.js",
    dependency: "next",
    detectionPriority: 100,
    buildSystem: "Next",
    ssr: true,
    vite: false,
    supports: { freshProject: true, existingProject: true },
    packages: ["@themvora/next"],
    initSupported: true,
  },
  {
    id: "vue",
    displayName: "Vue 3",
    dependency: "vue",
    detectionPriority: 60,
    buildSystem: "Vite",
    ssr: false,
    vite: true,
    supports: { freshProject: true, existingProject: true },
    packages: ["@themvora/core", "@themvora/vue"],
    initSupported: true,
  },
  {
    id: "svelte",
    displayName: "Svelte 5",
    dependency: "svelte",
    detectionPriority: 70,
    buildSystem: "Vite",
    ssr: false,
    vite: true,
    supports: { freshProject: true, existingProject: true },
    packages: ["@themvora/core", "@themvora/svelte"],
    initSupported: true,
  },
  {
    id: "solid",
    displayName: "Solid",
    dependency: "solid-js",
    detectionPriority: 68,
    buildSystem: "Vite",
    ssr: false,
    vite: true,
    supports: { freshProject: true, existingProject: true },
    packages: ["@themvora/core", "@themvora/solid"],
    initSupported: true,
  },
  {
    id: "nuxt",
    displayName: "Nuxt",
    dependency: "nuxt",
    detectionPriority: 95,
    buildSystem: "Nuxt",
    ssr: true,
    vite: false,
    supports: { freshProject: false, existingProject: false },
    packages: ["@themvora/nuxt"],
    initSupported: false,
  },
  {
    id: "angular",
    displayName: "Angular",
    dependency: "@angular/core",
    detectionPriority: 80,
    buildSystem: "Angular",
    ssr: false,
    vite: false,
    supports: { freshProject: false, existingProject: false },
    packages: ["@themvora/angular"],
    initSupported: false,
  },
  {
    id: "astro",
    displayName: "Astro",
    dependency: "astro",
    detectionPriority: 85,
    buildSystem: "Astro",
    ssr: true,
    vite: false,
    supports: { freshProject: false, existingProject: false },
    packages: ["@themvora/astro"],
    initSupported: false,
  },
  {
    id: "remix",
    displayName: "Remix",
    dependency: "@remix-run/react",
    detectionPriority: 90,
    buildSystem: "Remix",
    ssr: true,
    vite: false,
    supports: { freshProject: false, existingProject: false },
    packages: ["@themvora/remix"],
    initSupported: false,
  },
];

/**
 * The frameworks `init` supports, in the order they are documented.
 *
 * Derived, never re-listed — adding an integration with `initSupported: true`
 * makes it an `init` target everywhere at once.
 */
export const INIT_FRAMEWORKS: readonly InitFramework[] = FRAMEWORK_INTEGRATIONS.filter(
  (framework) => framework.initSupported,
);

/** Every framework id `--framework` accepts. */
export function frameworkIds(): string[] {
  return INIT_FRAMEWORKS.map((framework) => framework.id);
}

/**
 * Find an `init`-supported framework by id.
 *
 * @param id - The value the user typed.
 * @returns The framework, or `undefined` when it is not `init`-supported.
 */
export function findFramework(id: string): InitFramework | undefined {
  const needle = id.trim().toLowerCase();
  return INIT_FRAMEWORKS.find(
    (framework) =>
      framework.id === needle || framework.displayName.toLowerCase() === needle,
  );
}

/**
 * The framework a set of dependency names indicates, most specific first.
 *
 * @param dependencies - The dependency names a project declares.
 * @returns The matching integration, or `undefined` for an unrecognised project.
 */
export function detectFramework(
  dependencies: readonly string[],
): FrameworkIntegration | undefined {
  const present = new Set(dependencies);
  return [...FRAMEWORK_INTEGRATIONS]
    .sort((a, b) => b.detectionPriority - a.detectionPriority)
    .find((framework) => present.has(framework.dependency));
}

/**
 * Find an integration by its id, `init`-supported or not.
 *
 * @param id - The framework id.
 * @returns The integration, or `undefined`.
 */
export function findIntegration(id: string): FrameworkIntegration | undefined {
  const needle = id.trim().toLowerCase();
  return FRAMEWORK_INTEGRATIONS.find((framework) => framework.id === needle);
}
