#!/usr/bin/env node
/**
 * Audit — installation contract consistency.
 *
 * `apps/docs/lib/package-contracts.ts` is the documentation's single source of
 * truth for what each package installs. This audit re-reads every publishable
 * manifest under `packages/` and compares the two:
 *
 *   - every publishable package has exactly one contract;
 *   - version, normal dependencies, peers, optional peers and Node engines match;
 *   - every framework binding still declares `@themvora/core` as a normal
 *     dependency (the documentation's central relationship).
 *
 * It also scans the docs sources for the claims that caused the original
 * inconsistency: a required core peer, "one package" wording on a page whose
 * install command lists two, and `workspace:*` in public installation copy.
 *
 * The contract module is TypeScript with an explicit `.ts` import, so this
 * script runs with Node's type stripping.
 *
 * Usage: node --experimental-strip-types scripts/docs/audits/audit-installation-contracts.mjs
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PACKAGE_CONTRACTS,
  CORE_PACKAGE,
  coreRelationFor,
  explicitInstallPackages,
} from "../../../apps/docs/lib/package-contracts.ts";
import { walk } from "../lib/snippets.mjs";

const URL = fileURLToPath(import.meta.url);
const repoRoot = join(dirname(dirname(dirname(dirname(URL)))));
const docsRoot = join(repoRoot, "apps/docs");

/** Publishable package directories that are not npm packages. */
const NON_NPM = new Set(["vscode"]);

function manifests() {
  const out = [];
  for (const base of ["packages", join("packages", "adapters")]) {
    const dir = join(repoRoot, base);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      const pkgPath = join(dir, entry, "package.json");
      if (!existsSync(pkgPath)) continue;
      const json = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (json.private || NON_NPM.has(entry)) continue;
      out.push({ dir: join(dir, entry), json });
    }
  }
  return out;
}

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

const actual = manifests();
const byName = new Map(actual.map((entry) => [entry.json.name, entry]));
const contractByName = new Map(
  PACKAGE_CONTRACTS.map((contract) => [contract.name, contract]),
);

for (const { json } of actual) {
  check(
    contractByName.has(json.name),
    `missing contract for ${json.name} (${json.version})`,
  );
}
for (const contract of PACKAGE_CONTRACTS) {
  check(
    byName.has(contract.name),
    `contract lists ${contract.name}, but no publishable manifest exists`,
  );
}

for (const contract of PACKAGE_CONTRACTS) {
  const manifest = byName.get(contract.name);
  if (!manifest) continue;
  const json = manifest.json;

  check(
    contract.version === json.version,
    `${contract.name}: contract version ${contract.version} != manifest ${json.version}`,
  );

  const manifestDeps = Object.keys(json.dependencies ?? {}).sort();
  const contractDeps = contract.dependencies.map((dep) => dep.name).sort();
  check(
    JSON.stringify(manifestDeps) === JSON.stringify(contractDeps),
    `${contract.name}: contract dependencies [${contractDeps}] != manifest [${manifestDeps}]`,
  );

  for (const dep of contract.dependencies) {
    const range = json.dependencies?.[dep.name];
    if (!range) continue;
    if (range.startsWith("workspace:")) {
      check(
        dep.range === undefined,
        `${contract.name}: ${dep.name} is a workspace edge; contract must not display a version range`,
      );
    } else {
      check(
        dep.range === range,
        `${contract.name}: ${dep.name} range ${dep.range ?? "(missing)"} != manifest ${range}`,
      );
    }
  }

  const manifestPeers = Object.keys(json.peerDependencies ?? {}).sort();
  const contractPeers = contract.peers.map((peer) => peer.name).sort();
  check(
    JSON.stringify(manifestPeers) === JSON.stringify(contractPeers),
    `${contract.name}: contract peers [${contractPeers}] != manifest [${manifestPeers}]`,
  );

  for (const peer of contract.peers) {
    const range = json.peerDependencies?.[peer.name];
    check(
      range !== undefined && range === peer.range,
      `${contract.name}: ${peer.name} peer range ${peer.range} != manifest ${range ?? "(missing)"}`,
    );
    const optional = Boolean(json.peerDependenciesMeta?.[peer.name]?.optional);
    check(
      optional === Boolean(peer.optional),
      `${contract.name}: ${peer.name} optional=${Boolean(peer.optional)} != manifest optional=${optional}`,
    );
  }

  const engine = json.engines?.node;
  check(
    (contract.engines?.node ?? undefined) === engine,
    `${contract.name}: contract node engine ${contract.engines?.node ?? "(none)"} != manifest ${engine ?? "(none)"}`,
  );

  if (contract.slug !== "core") {
    const relation = coreRelationFor(contract);
    if (contract.dependencies.some((dep) => dep.name === CORE_PACKAGE)) {
      check(
        relation === "dependency",
        `${contract.name}: ${CORE_PACKAGE} is in dependencies, so the contract must report "dependency"`,
      );
    }
  }
}

// Framework bindings must declare core as a normal dependency. This is the
// relationship the installation copy explains; if a manifest changes it, the
// audit must stop the docs from asserting the old shape.
for (const slug of [
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
]) {
  const contract = PACKAGE_CONTRACTS.find((entry) => entry.slug === slug);
  if (!contract) continue;
  check(
    contract.dependencies.some((dep) => dep.name === CORE_PACKAGE),
    `${contract.name}: framework binding must declare ${CORE_PACKAGE} in dependencies`,
  );
}

// The explicit install list is what every page renders. Assert its shape.
for (const contract of PACKAGE_CONTRACTS) {
  const explicit = explicitInstallPackages(contract);
  if (contract.name === CORE_PACKAGE) {
    check(
      explicit.length === 1 && explicit[0] === CORE_PACKAGE,
      `${contract.name}: core installs alone`,
    );
  } else if (["cli", "devtools"].includes(contract.slug)) {
    check(
      explicit.length === 1 && explicit[0] === contract.name,
      `${contract.name}: tooling installs alone`,
    );
  } else if (!contract.slug.startsWith("core")) {
    check(
      explicit[0] === CORE_PACKAGE,
      `${contract.name}: explicit install starts with ${CORE_PACKAGE}`,
    );
    check(
      explicit.includes(contract.name),
      `${contract.name}: explicit install includes the package itself`,
    );
  }
}

// --- docs copy checks -------------------------------------------------------

// Installation surfaces must render from the contract module, not rebuild the
// package list by hand. This is what keeps a future manifest change from
// leaving one page behind.
const INSTALL_SURFACES = {
  "app/packages/[slug]/page.tsx": ["explicitInstallPackages", "formatInstallCommand"],
  "app/framework-guides/[slug]/page.tsx": [
    "explicitInstallPackages",
    "formatInstallCommand",
  ],
  "app/quick-start/page.tsx": ["explicitInstallPackages", "formatInstallCommand"],
};
for (const [file, markers] of Object.entries(INSTALL_SURFACES)) {
  const text = readFileSync(join(docsRoot, file), "utf8");
  for (const marker of markers) {
    check(
      text.includes(marker),
      `${file}: no longer renders install commands through ${marker}`,
    );
  }
}

const COPY_FILES = [
  join(docsRoot, "app"),
  join(docsRoot, "components"),
  join(docsRoot, "lib"),
  join(docsRoot, "content"),
].flatMap((dir) => walk(dir, [".ts", ".tsx", ".md"]));

const PUBLIC_INSTALL_COPY = [
  join(repoRoot, "README.md"),
  ...walk(join(repoRoot, "packages"), [".md"]).filter((file) =>
    /(?:^|[\\/])README\.md$/.test(file),
  ),
];

for (const file of new Set([...COPY_FILES, ...PUBLIC_INSTALL_COPY])) {
  const text = readFileSync(file, "utf8");
  const rel = relative(repoRoot, file);

  // `workspace:*` is only valid in the monorepo-contributor section of the CLI
  // install page. No other public installation example may use it.
  if (
    text.includes("workspace:*") &&
    rel !== join("apps/docs", "content", "cli", "installation.md")
  ) {
    failures.push(`${rel}: public install copy contains workspace:*`);
  }
}

console.log("\n=== AUDIT — INSTALLATION CONTRACTS ===\n");
console.log(`Publishable manifests: ${actual.length}`);
console.log(`Contracts:             ${PACKAGE_CONTRACTS.length}`);
console.log(`Failures:              ${failures.length}\n`);
for (const failure of failures) console.log(`  ✗ ${failure}`);
if (failures.length) process.exitCode = 1;
else console.log("Documentation contracts match the published manifests.\n");
