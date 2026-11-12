/**
 * The @themvora/cli package version, surfaced by `themvora --version`.
 *
 * Must stay in sync with the `"version"` field in `packages/cli/package.json`;
 * `scripts/release/audit-packages.mjs` fails the release gate if they drift.
 */
export const VERSION = "2.0.0";
