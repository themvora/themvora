/**
 * Central site configuration — the single source of truth for every URL the
 * docs app renders. Never hardcode `github.com/...`, `npmjs.com/...`, or the
 * site URL in components; import from here instead.
 *
 * After the first Vercel deployment, set:
 *   NEXT_PUBLIC_SITE_URL=https://<your-project>.vercel.app
 * in the Vercel project settings (Environment Variables). When you later own
 * themekit.dev, change the default below (or the env var) — nothing else.
 */

const GH_ORG = "themvora";
const GH_REPO = "themvora";
export const GITHUB_URL = `https://github.com/${GH_ORG}/${GH_REPO}`;
export const GITHUB_SOURCE = `${GITHUB_URL}/blob/main`;
export const GITHUB_SECURITY = `${GITHUB_URL}/security/advisories`;
export const GITHUB_DISCUSSIONS = `${GITHUB_URL}/discussions`;
export const GITHUB_ISSUES = `${GITHUB_URL}/issues`;
export const GITHUB_LICENSE = `${GITHUB_URL}/blob/main/LICENSE`;

export const NPM_ORG_URL = "https://www.npmjs.com/org/themvora";
export const npmPackageUrl = (pkg: string) =>
  `https://www.npmjs.com/package/${pkg}`;

/**
 * The published editor extension.
 *
 * The Marketplace identifier is `publisher.name`, which is **not** the same as
 * the package name or the display name: the package is `themvora-for-vscode`,
 * the listing reads "Themvora Theme Studio for VS Code", and the identifier
 * users search for is `themvora.themvora-for-vscode`. Keeping all four here
 * stops the docs, READMEs and deep links from drifting apart at the next
 * rename.
 */
export const VSCODE_EXTENSION_PACKAGE = "themvora-for-vscode";
export const VSCODE_EXTENSION_NAME = "Themvora Theme Studio for VS Code";
export const VSCODE_EXTENSION_ID = `themvora.${VSCODE_EXTENSION_PACKAGE}`;
export const VSCODE_EXTENSION_PUBLISHER = "Themvora";
/** The exact filter that returns this one extension in the Extensions view. */
export const VSCODE_EXTENSION_SEARCH = `@id:${VSCODE_EXTENSION_ID}`;
export const VSCODE_MARKETPLACE_URL = `https://marketplace.visualstudio.com/items?itemName=${VSCODE_EXTENSION_ID}`;
/**
 * Opens the listing *inside* VS Code, where the Install button lives.
 *
 * This is the URI the Marketplace's own Install button uses. A browser asks the
 * user to confirm opening an external application before handing it to VS Code.
 */
export const VSCODE_OPEN_URL = `vscode:extension/${VSCODE_EXTENSION_ID}`;
export const VSCODE_INSTALL_COMMAND = `code --install-extension ${VSCODE_EXTENSION_ID}`;

const ADAPTER_PACKAGES = new Set([
  "shadcn",
  "mui",
  "chakra",
  "antd",
  "bootstrap",
  "daisyui",
  "open-props",
  "unocss",
]);

/** Repository directory for a package (e.g. "@themvora/shadcn" → "packages/adapters/shadcn"). */
export function repoPathForPackage(pkg: string): string {
  const name = pkg.replace("@themvora/", "");
  if (name === "adapters") return "packages/adapters/shared";
  if (ADAPTER_PACKAGES.has(name)) return `packages/adapters/${name}`;
  return `packages/${name}`;
}

/** GitHub "tree/main" link for a package's source directory. */
export function sourceUrlForPackage(pkg: string): string {
  return `${GITHUB_URL}/tree/main/${repoPathForPackage(pkg)}`;
}

export const CONTACT_EMAIL = "themvoraproductions@gmail.com";
export const CONTACT_URL = `mailto:${CONTACT_EMAIL}`;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://themvora-dev.vercel.app";

export const SITE_NAME = "Themvora";
export const SITE_DESCRIPTION =
  "A powerful, framework-agnostic theming library with theme families, semantic tokens, and a runtime that works everywhere.";

/** Canonical absolute URL for a docs path (e.g. `/get-started`). */
export function docsUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
