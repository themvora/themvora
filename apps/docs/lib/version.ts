/**
 * The currently installed version, surfaced in the footer badge.
 * Update this when the packages are released with a new version.
 */
interface PKG_S {
  id: number;
  package: string;
  version: string;
  type: differentiator;
}

export const PKG_VERSION = "3.0.0";
export const PKG_VERSION_BADGE = `v${PKG_VERSION}`;

type differentiator = "framework" | "ui-library" | "tooling" | "other";

const PACKAGE_VERSIONS: readonly PKG_S[] = [
  { id: 1, package: "core", version: "1.6.0", type: "other" },
  { id: 2, package: "web", version: "1.6.0", type: "framework" },
  { id: 3, package: "angular", version: "2.1.1", type: "framework" },
  { id: 4, package: "astro", version: "2.2.0", type: "framework" },
  { id: 5, package: "cli", version: "2.0.0", type: "tooling" },
  { id: 6, package: "devtools", version: "1.3.1", type: "tooling" },
  { id: 7, package: "react", version: "1.4.1", type: "framework" },
  { id: 8, package: "next", version: "2.2.0", type: "framework" },
  { id: 9, package: "nuxt", version: "2.1.1", type: "framework" },
  { id: 10, package: "vue", version: "2.1.1", type: "framework" },
  { id: 11, package: "remix", version: "3.0.0", type: "framework" },
  { id: 12, package: "solid", version: "2.1.1", type: "framework" },
  { id: 13, package: "svelte", version: "3.0.0", type: "framework" },
  { id: 14, package: "tailwind", version: "1.4.0", type: "other" },
  { id: 15, package: "antd", version: "1.4.0", type: "ui-library" },
  { id: 16, package: "bootstrap", version: "2.1.0", type: "ui-library" },
  { id: 17, package: "chakra", version: "1.3.2", type: "ui-library" },
  { id: 18, package: "daisyui", version: "2.0.2", type: "ui-library" },
  { id: 19, package: "mantine", version: "1.4.0", type: "ui-library" },
  { id: 20, package: "mui", version: "1.4.1", type: "ui-library" },
  { id: 21, package: "open-props", version: "2.0.2", type: "ui-library" },
  { id: 22, package: "shadcn", version: "2.0.2", type: "ui-library" },
  { id: 23, package: "unocss", version: "1.4.0", type: "ui-library" },
  // vs-code is not a npm publishable package
  { id: 24, package: "vscode", version: "", type: "tooling" },
];

/** Normalizes package name. */
const normalizePackageName = (pkg: string): string => pkg.trim().toLowerCase();

/**
 * Returns complete data for a specified package.
 */
const getPackage = (
  pkg: string,
  packages: readonly PKG_S[] = PACKAGE_VERSIONS,
): PKG_S | undefined => {
  const packageName = normalizePackageName(pkg);

  if (!packageName) return undefined;

  return packages.find((item) => item.package.toLowerCase() === packageName);
};

/**
 * Returns the version of a specified package.
 *
 * @param pkg - Package name to search for.
 * @param packages - Package list to search.
 * @returns Package version or undefined if not found.
 */
const getPackageVersion = (
  pkg: string,
  packages: readonly PKG_S[] = PACKAGE_VERSIONS,
): string | undefined => {
  return getPackage(pkg, packages)?.version;
};

/**
 * Returns all available packages.
 */
const getAllPackages = (
  packages: readonly PKG_S[] = PACKAGE_VERSIONS,
): readonly PKG_S[] => {
  return packages;
};

export { PACKAGE_VERSIONS, getPackageVersion, getPackage, getAllPackages };
export type { PKG_S };
