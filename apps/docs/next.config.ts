import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { REDIRECTS } from "./redirects.mjs";

// Expose the Themvora version to the client so badges and footers always
// reflect the real version instead of a stale hardcoded string.
let themvoraVersion = "1.0.0";
try {
  // process.cwd() during `next build` is the docs dir, so we go
  // up two levels to reach the workspace packages/core.
  const pkgPath = join(process.cwd(), "../../packages/core/package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  themvoraVersion = pkg.version ?? themvoraVersion;
} catch {
  /* use fallback */
}

const nextConfig: NextConfig = {
  transpilePackages: [
    "@themvora/core",
    "@themvora/react",
    "@themvora/next",
    "@themvora/tailwind",
    "@themvora/devtools",
  ],
  env: {
    NEXT_PUBLIC_THEMVORA_VERSION: themvoraVersion,
  },
  // Permanent redirects for aliases that are not canonical pages. The list is
  // shared with the route audit, so a destination cannot drift from the app.
  async redirects() {
    return REDIRECTS.map((rule) => ({
      source: rule.source,
      destination: rule.destination,
      permanent: rule.permanent,
    }));
  },
  allowedDevOrigins: ["http://192.168.100.11:3000"],
};

export default nextConfig;
