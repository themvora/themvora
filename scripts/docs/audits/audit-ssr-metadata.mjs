#!/usr/bin/env node
/**
 * Audit — SSR, zero-flash and framework compatibility metadata.
 *
 * The Compatibility Matrix is the canonical vocabulary. This audit makes sure
 * every other surface that repeats it agrees:
 *
 *   - each framework binding has exactly one matrix row;
 *   - the matrix's framework version equals the manifest's peer range;
 *   - SSR values are drawn from the matrix's own union and zero-flash values
 *     from `Auto | Manual | None | N/A`;
 *   - the guide header renders the matrix's labels verbatim rather than
 *     translating `Client-only` into `No` and `Manual` into `Partial`;
 *   - the matrix's verified release matches `lib/version.ts`;
 *   - the old contradictory copy is gone.
 *
 * Usage: node --experimental-strip-types scripts/docs/audits/audit-ssr-metadata.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  frameworkCompatibilityData,
  VERIFIED_VERSION,
  VERIFIED_DATE,
} from "../../../apps/docs/lib/compatibility-data.ts";
import {
  FRAMEWORK_SLUGS,
  PACKAGE_CONTRACTS,
  contractForPackage,
} from "../../../apps/docs/lib/package-contracts.ts";
import { PKG_VERSION } from "../../../apps/docs/lib/version.ts";
import { walk } from "../lib/snippets.mjs";

const URL = fileURLToPath(import.meta.url);
const repoRoot = join(dirname(dirname(dirname(dirname(URL)))));
const docsRoot = join(repoRoot, "apps/docs");

const SSR_VALUES = new Set(["Full", "Helpers", "Client-only", "N/A"]);
const ZERO_FLASH_VALUES = new Set(["Auto", "Manual", "None", "N/A"]);

/** The manifest peer that defines each integration's framework version. */
const FRAMEWORK_PEER = {
  "@themvora/react": "react",
  "@themvora/next": "next",
  "@themvora/vue": "vue",
  "@themvora/svelte": "svelte",
  "@themvora/solid": "solid-js",
  "@themvora/angular": "@angular/core",
  "@themvora/tailwind": "tailwindcss",
  "@themvora/astro": "astro",
  "@themvora/nuxt": "nuxt",
  "@themvora/remix": "@remix-run/react",
};

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

// A package may have more than one integration target: @themvora/remix serves
// Remix v2 and React Router Framework Mode through different entry points. The
// matrix is therefore keyed by package *and* framework, not package alone.
const rows = frameworkCompatibilityData;

/**
 * The version the React Router example actually installed. Framework Mode has
 * no package peer to compare against — the adapter is framework-neutral — so the
 * example's manifest is the verification authority.
 */
function reactRouterExampleRange() {
  const manifest = JSON.parse(
    readFileSync(
      join(repoRoot, "examples", "apps", "react-router", "package.json"),
      "utf8",
    ),
  );
  return manifest.dependencies?.["react-router"];
}

for (const contract of PACKAGE_CONTRACTS) {
  if (!FRAMEWORK_SLUGS.has(contract.slug)) continue;
  const packageRows = rows.filter((row) => row.package === contract.name);
  check(
    packageRows.length > 0,
    `${contract.name}: no compatibility matrix row`,
  );

  for (const row of packageRows) {
    check(
      SSR_VALUES.has(row.ssr),
      `${contract.name} (${row.framework}): SSR "${row.ssr}" is not one of ${[...SSR_VALUES].join(", ")}`,
    );
    check(
      ZERO_FLASH_VALUES.has(row.zeroFlash),
      `${contract.name} (${row.framework}): zero-flash "${row.zeroFlash}" is not one of ${[...ZERO_FLASH_VALUES].join(", ")}`,
    );
  }

  const peerName = FRAMEWORK_PEER[contract.name];
  if (peerName) {
    const peer = contract.peers.find((entry) => entry.name === peerName);
    check(
      Boolean(peer),
      `${contract.name}: manifest has no ${peerName} peer, so the matrix version cannot be verified`,
    );
    if (peer) {
      // The framework-peer row is the package's native target; a second row for
      // a framework the adapter supports without that peer is verified against
      // its example manifest instead.
      const nativeRows = packageRows.filter(
        (row) => row.framework !== "React Router",
      );
      check(
        nativeRows.some((row) => row.frameworkVersion === peer.range),
        `${contract.name}: no matrix row carries the manifest peer "${peer.range}"`,
      );
    }
  } else {
    for (const row of packageRows) {
      check(
        row.frameworkVersion === "N/A",
        `${contract.name} (${row.framework}): no framework peer, so the matrix should say N/A`,
      );
    }
  }

  for (const row of packageRows.filter((entry) => entry.framework === "React Router")) {
    const exampleRange = reactRouterExampleRange();
    check(
      Boolean(exampleRange),
      `${contract.name}: the React Router example declares no react-router dependency`,
    );
    check(
      row.frameworkVersion === exampleRange,
      `${contract.name} (React Router): matrix frameworkVersion "${row.frameworkVersion}" != example dependency "${exampleRange ?? "(missing)"}"`,
    );
  }
}

for (const row of rows) {
  if (row.package === "@themvora/core") continue;
  const contract = contractForPackage(row.package);
  if (!contract) {
    failures.push(`${row.package} (${row.framework}): matrix row has no package contract`);
    continue;
  }
  if (!FRAMEWORK_SLUGS.has(contract.slug)) {
    failures.push(
      `${row.package} (${row.framework}): matrix row is not a framework binding contract`,
    );
  }
}

check(
  VERIFIED_VERSION === PKG_VERSION,
  `matrix VERIFIED_VERSION ${VERIFIED_VERSION} != docs PKG_VERSION ${PKG_VERSION}`,
);
check(Boolean(VERIFIED_DATE), "matrix VERIFIED_DATE is empty");

// The guide header must render the matrix's own labels. Translating the
// canonical value into a different word is how `Client-only` became `No`.
const guidePage = readFileSync(
  join(docsRoot, "app/framework-guides/[slug]/page.tsx"),
  "utf8",
);
check(
  guidePage.includes("ssrLabel: compatibility.ssr"),
  "framework guide no longer renders the matrix SSR label",
);
check(
  guidePage.includes("zeroFlashLabel: compatibility.zeroFlash"),
  "framework guide no longer renders the matrix zero-flash label",
);

// Contradictory copy that the audit found. These are plain strings, so a
// targeted search is the right tool; they are not generated at runtime.
const COPY_FILES = [
  join(docsRoot, "app"),
  join(docsRoot, "components"),
  join(docsRoot, "lib"),
  join(docsRoot, "content"),
].flatMap((dir) => walk(dir, [".ts", ".tsx", ".md"]));

const FORBIDDEN = [
  {
    pattern: /@themvora\/core\s*\(peer dependency\)/i,
    reason: "core is a normal dependency, not a peer dependency",
  },
  {
    pattern: /Every framework package pulls the core runtime/i,
    reason: "install copy must explain the dependency relationship precisely",
  },
  {
    pattern: /pulled in automatically as a dependency/i,
    reason: "use the package contract wording instead of a generic claim",
  },
  {
    pattern: /SSR:\s*No\b/,
    reason: "use the matrix value `Client-only`",
  },
];

for (const file of COPY_FILES) {
  const text = readFileSync(file, "utf8");
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(text)) {
      failures.push(`${relative(repoRoot, file)}: ${rule.reason}`);
    }
  }
}

console.log("\n=== AUDIT — SSR / ZERO-FLASH METADATA ===\n");
console.log(`Matrix rows: ${frameworkCompatibilityData.length}`);
console.log(`Failures:    ${failures.length}\n`);
for (const failure of failures) console.log(`  ✗ ${failure}`);
if (failures.length) process.exitCode = 1;
else console.log("SSR, zero-flash and version metadata agree across the docs.\n");
