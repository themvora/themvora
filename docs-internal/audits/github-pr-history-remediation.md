# GitHub PR History Audit & Manual Repository Remediation

- **Repository:** https://github.com/themvora/themvora (public, default branch `main`)
- **Audit date:** 2026-11-03
- **Base commit audited:** `894b0bce8e2e118d654f7b032942ffda725cf75d` (`main`, "fix(svelte): give each test file its own compiled-fixture directory")
- **Method:** GitHub REST API (unauthenticated, `gh` CLI not installed on this host), local Git object inspection, and local reproduction of every failure. No pull request was merged, closed, reopened, or pushed to.

---

## Summary

The premise that drove this task — a history of closed PRs whose work was never integrated — **does not hold for this repository**. The API returns **two pull requests in total**, both open Dependabot PRs (#12, #13). There are **zero closed PRs, zero merged PRs, and zero human-authored PRs**.

What did need doing was real, and it was done:

1. **PR #12 (actions)** — the four proposed action versions were verified against their upstream tags, every SHA matched, and the bumps were applied manually. CI evidence from the PR itself shows the two substantive jobs (`build · test · preset gates`, `docs release gate`) **passed** with exactly these versions.
2. **PR #13 (dependencies)** — the PR was **not applicable as written**. Two defects were found by reproduction, not by reading its title:
   - It raised **peer dependency ranges** in eight published packages (`@angular/core: >=17.0.0` → `^22.2.4`, `svelte: ^5.0.0` → `^5.57.3`, `solid-js: ^1.8.0` → `^1.9.18`, `react: ^19.0.0` → `^19.3.1`). That is a breaking change to the published contract shipped as a patch bump.
   - It bumped the Angular framework to 22.2.4 but left `@angular/compiler-cli` at 22.0.8. Reproduced locally: `this.tcb.boundTarget.getForeignComponent is not a function`. That is the actual cause of the PR's Build failure — not the dependency versions themselves.
   
   The dev-dependency changes were applied, the peer ranges were left untouched, and the Angular set was completed to 22.2.4 including `compiler-cli`.
3. **Dependency Review** — the failure is a **repository setting**, not code: *"Dependency review is not supported on this repository. Please ensure that Dependency graph is enabled."* It fails identically on the current pin (v4.9.0) and the proposed one (v5.0.0). It cannot be fixed locally.
4. **Labels** — `dependencies` and `ci` do not exist in the repository. Dependabot says so in a comment on both PRs. GitHub-side action required.

One failure was left open by the first pass and has since been resolved: the docs release gate's token-context audit was failing on a file from the homepage redesign (`apps/docs/components/home/hero-preview.tsx`). A focused correction in the final pass brought it to zero without touching the frozen baseline, and the static gate is now green. See §H.1 and §J.

One untracked file left the working tree during the session: `HOMEPAGE-RESPONSIVE-REPORT.md`. The repository owner has confirmed deleting it deliberately, because the homepage responsive work it described was already fixed. It was not restored. See §I.3.

---

## A. PR inventory

### A.1 Complete enumeration

Three independent queries agree on the same total.

| Query | Result |
| --- | --- |
| `GET /repos/themvora/themvora/pulls?state=all&per_page=100` | 2 |
| `GET /repos/themvora/themvora/pulls?state=closed&per_page=100` | 0 |
| `GET /search/issues?q=repo:themvora/themvora+is:pr` | `total_count: 2` |
| `GET /pulls/1` … `/pulls/11` | `404` for all eleven |

Pagination is not a factor: both lists fit in a single page of 100 and the search index reports the same total.

| # | Title | Author | State | Draft | Base ← Head | Created | Changed | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | `chore(ci): bump the actions group with 4 updates` | `dependabot[bot]` | open | no | `main` ← `dependabot/github_actions/actions-372c78cd55` | 2026-11-02T00:26:53Z | 1 file, +8/−8 | **Open, actionable — applied manually** |
| 13 | `chore(deps): bump the production-patch-and-minor group with 11 updates` | `dependabot[bot]` | open | no | `main` ← `dependabot/npm_and_yarn/production-patch-and-minor-0d3724f0e5` | 2026-11-02T00:28:48Z | 27 files, +872/−1031 | **Open, actionable — applied in part, corrected** |

Both are `mergeable: true`, `mergeable_state: unstable` (CI red). Both have exactly one commit. Both have `requested_reviewers: [saugaproductions78-art]`, **zero reviews and zero review comments**, and two issue comments each (Dependabot's label warning; a Vercel bot deployment comment).

### A.2 Orphaned CI runs — evidence of removed PRs

Thirteen `pull_request` workflow runs exist. Ten of them carry an **empty `pull_requests` array**, and their head branches are gone from the remote:

| Branch (deleted) | Run | Result |
| --- | --- | --- |
| `dependabot/npm_and_yarn/next-16.4.3` | 41248556558 | workspace ✅, docs-gate ❌, dependency-review ❌ |
| `dependabot/npm_and_yarn/vue-tsc-3.3.13` | 41248534910 | failed |
| `dependabot/npm_and_yarn/vite-8.3.5` | 41248521060 | failed |
| `dependabot/npm_and_yarn/cross-env-10.1.0` | 41248502865 | failed |
| `dependabot/npm_and_yarn/mantine/hooks-9.7.4` | 41248490484 | failed |
| `dependabot/npm_and_yarn/typescript-6.0.3` | 41248477871 | workspace ❌ Build, docs-gate ❌ Build, dependency-review ❌ |
| `dependabot/npm_and_yarn/mantine/core-9.7.4` | 41248449042 | failed |
| `dependabot/npm_and_yarn/vitest-5.0.5` | 41248434268 | failed |
| `dependabot/npm_and_yarn/development-patch-and-minor-8a3063dbae` | 41248419583 | failed |
| `dependabot/npm_and_yarn/production-patch-and-minor-71da3e51fe` | 41248189371 | failed |

**Interpretation, stated as inference rather than fact:** PR numbers #1–#11 are permanently unassigned (404), while #12 and #13 exist, and CI ran on ten Dependabot branches that no longer have PR records. The most consistent explanation is that earlier PRs were removed from the repository's records rather than closed — a closed PR remains retrievable at `/pulls/N`. This audit therefore **cannot review them**, and does not claim to. Their CI logs are authentication-gated (`GET .../actions/runs/{id}/logs` → `403`), so even the failure text is unavailable; only job/step pass-fail state is readable.

**Consequence for Phase 5:** there is no closed-PR corpus to mine for unfinished work. The requirement was executed against the available data and returned empty, which is a finding, not a skipped step.

### A.3 Remote branch state

`git ls-remote --heads origin` currently reports four Dependabot branches and `main`. Two have **no PR at all**:

- `dependabot/npm_and_yarn/next-16.4.3`
- `dependabot/npm_and_yarn/development-patch-and-minor-8a3063dbae`

Both are stale: diffing them against current `main` shows `main`'s own newer commits in reverse (e.g. `scripts/release/snippet-audit.mjs`, `vercel.json`, `packages/svelte/test/theme-scope.test.ts`). They contain no work that is missing from `main`; they are simply older Dependabot snapshots that never became PRs. Recommended disposition is deletion on the GitHub side (§G), not resurrection.

---

## B. Completed vs unfinished work

| Objective | State in `main` before this task | State after this task |
| --- | --- | --- |
| Actions pinned to Node-20-era releases (v4.x) | Present; emits `Node.js 20 is deprecated` warnings on every run | **Done** — v7.0.1 / v6.1.0 / v7.1.0 / v5.0.0 |
| React 19.3.1 across the workspace | **Partially implemented**: `packages/vscode` was already on `^19.3.1` (commit `c467f32`), everything else on `^19.2.8` — two React copies in one workspace | **Done** — unified at 19.3.1 |
| `@types/react` 19.3.0 | Not implemented | **Done** |
| Svelte 5.57.3, Solid 1.9.18, Astro 7.4.4, `@astrojs/react` 7.1.2, Shiki 4.5.0 | Not implemented | **Done** (devDependencies and fixtures only) |
| Angular 22.2.4 | Not implemented | **Done** — coherent framework set, `compiler-cli` included |
| Peer-range narrowing proposed by #13 | n/a | **Rejected** — 12 changes deliberately not applied |
| Angular toolchain (`@angular/build`, `@angular/cli`) at 22.2.4 | n/a | **Rejected** — unnecessary; `@angular/build@22.0.8` already accepts `@angular/core ^22.0.0`, and bumping it drags Babel 7→8, oxc, lmdb and the Angular CLI's own tree into the lockfile for no benefit |
| Dependency Review green | Blocked by repository setting | **Still blocked** — GitHub-side (§G) |
| Dependabot labels | Missing | **Still missing** — GitHub-side (§G) |
| Docs release gate green | Red because of in-progress work | **Still red** — pre-existing, not PR-related (§H) |

No PR was superseded, and nothing was abandoned by this audit.

---

## C. Manually implemented fixes

### C.1 CI action pins (PR #12 equivalent)

**Problem.** All eight `uses:` references in `.github/workflows/ci.yml` pointed at releases whose runtime is Node 20. GitHub's runner forces them onto Node 24 and annotates every job:

> `Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@11d5960a…, actions/setup-node@49933ea5…`

**Root cause.** The pins were taken when v4 was current; the actions ecosystem has since moved its runtime to `node24`.

**Changes.** Eight references in three jobs:

| Action | From | To | SHA verified |
| --- | --- | --- | --- |
| `actions/checkout` | v4.4.0 `11d5960a…` | v7.0.1 `3d3c42e5aac5ba805825da76410c181273ba90b1` | ✅ tag resolves to the same commit |
| `pnpm/action-setup` | v4.4.0 `fc06bc12…` | v6.1.0 `ea17c68df8912ef543352723c149a84f56e3d413` | ✅ |
| `actions/setup-node` | v4.4.0 `49933ea5…` | v7.1.0 `949feb2413d6458794dcd2491c4babbbce0c15c1` | ✅ |
| `actions/dependency-review-action` | v4.9.0 `2031cfc0…` | v5.0.0 `a1d282b36b6f3519aa1f3fc636f609c47dddb294` | ✅ |

Every reference remains pinned to a full 40-character commit SHA with the version in a trailing comment — the file's stated supply-chain policy is preserved, and no `@v7` style floating tag was introduced.

**Compatibility review** (each verified against the upstream tag's own documentation, not assumed):

- `checkout` v5 = Node 24 runtime (runner ≥ v2.327.1); v6 = credentials persisted to a separate file; v7 = blocks fork checkout under `pull_request_target`/`workflow_run`. This workflow uses `pull_request`, `push` and `workflow_dispatch` with default credentials — none of the three changes apply.
- `setup-node` v7 = ESM internals, "no changes to action inputs, outputs, or behavior", except removal of the dummy `NODE_AUTH_TOKEN` fallback, which only matters when `registry-url` is set. It is not set. v6 stopped auto-enabling caching for pnpm — the workflow already passes `cache: pnpm` explicitly.
- `pnpm/action-setup` v6 states "supports pnpm v12 and earlier" and that `version` may be omitted when `packageManager` is declared. `package.json` declares `pnpm@12.14.0`. The workflow's deliberate omission of `version:` — with a long comment explaining why — stays correct.
- `dependency-review-action` v5.0.0 release notes: "updates the runtime to node24… requires a minimum Actions Runner version v2.327.1". Its `action.yml` at that tag still declares `fail-on-severity` and `comment-summary-in-pr`, so no input was renamed or removed.

**Evidence it works.** PR #12's own CI run `41367201269` executed with exactly these SHAs: `build · test · preset gates` → **success** (all 12 steps), `docs release gate` → **success** (all 7 steps). Only `dependency review` failed, for the unrelated reason in §D.3.

**Files:** `.github/workflows/ci.yml`

### C.2 Dependency updates (PR #13 equivalent, filtered)

**Problem.** PR #13 proposes 11 package updates across 26 manifests plus the lockfile, and its CI fails at `Build` in both substantive jobs.

**Root cause — two distinct defects, both established by reproduction:**

*Defect 1 — peer ranges widened the published contract.* Dependabot classifies `peerDependencies` as production dependencies, so a "patch/minor" bump rewrote lower bounds in eight published packages:

| Package | Peer | PR #13 proposed |
| --- | --- | --- |
| `@themvora/solid` | `solid-js` | `^1.8.0` → `^1.9.18` |
| `@themvora/svelte` | `svelte` | `^5.0.0` → `^5.57.3` |
| `@themvora/astro` | `react`, `react-dom` | `^19.0.0` → `^19.3.1` |
| `@themvora/adapters/{bootstrap,daisyui,open-props,shadcn}` | `svelte` | `^5.0.0` → `^5.57.3` |
| same four | `solid-js` | `^1.8.0` → `^1.9.18` |
| same four | `@angular/core` | `>=17.0.0` → `^22.2.4` |

The last row is the severe one: it would drop Angular 17 through 21 for every consumer of four published adapters, in a commit titled "patch and minor".

*Defect 2 — the Angular bump was internally inconsistent.* Reproduced in a throwaway clone at `82aa2751`:

```
packages/angular build: × Compiling with Angular sources in partial compilation mode.
packages/angular build: this.tcb.boundTarget.getForeignComponent is not a function
[ELIFECYCLE] Command failed with exit code 1.
Error: ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  × "pnpm recursive run" failed in packages/angular
```

Installed versions at that commit: `@angular/compiler@22.2.4` alongside `@angular/compiler-cli@22.0.8`, whose manifest declares `peerDependencies: { "@angular/compiler": "22.0.8" }` — an exact pin. The type-check block in compiler-cli 22.0.8 calls an API that no longer exists in compiler 22.2.4. Dependabot bumped four of the five framework packages and skipped `compiler-cli`, almost certainly because of the exact peer pin it would have violated.

**Changes.** 98 version changes across 26 manifests, restricted by rule:

- `packages/*` → **`devDependencies` only** (peer ranges untouched).
- `examples/*`, `apps/*` → `dependencies` and `devDependencies` (these are fixtures, not published).
- Angular completed to a coherent set: `@angular/common`, `compiler`, `compiler-cli`, `core`, `platform-browser` all at `^22.2.4` / `22.2.4`.

| Package | From | To | Scope |
| --- | --- | --- | --- |
| `react`, `react-dom` | `^19.2.8` / `^19.0.0` | `^19.3.1` | docs app, 3 examples, 9 adapter devDeps, `packages/astro` devDeps — 14 entries each |
| `@types/react` | `^19.2.17` | `^19.3.0` | 18 manifests |
| `@types/react-dom` | `^19.2.3` | `^19.3.0` | 18 manifests |
| `svelte` | `^5.0.0` / `^5.56.8` | `^5.57.3` | `packages/svelte`, 4 adapters, `examples/apps/svelte` |
| `solid-js` | `^1.8.0` / `^1.9.14` | `^1.9.18` | `packages/solid`, 4 adapters, `examples/apps/solid` |
| `astro` | `^7.4.2` | `^7.4.4` | `packages/astro`, 3 examples |
| `@astrojs/react` | `^7.1.1` | `^7.1.2` | `examples/apps/astro-react` |
| `shiki` | `^4.3.1` | `^4.5.0` | docs app |
| `@angular/*` | `^22.0.0` / `22.0.8` | `^22.2.4` / `22.2.4` | `packages/angular`, 4 adapters, `examples/apps/angular` |

**Rejected, with reasons:** the 12 peer-range changes in §C.2 Defect 1; `@angular/build` and `@angular/cli` at 22.2.4 (§B — measured: including them grew the lockfile diff from 1,742 to 4,524 lines by pulling Babel 7→8, `@oxc-parser`, `lmdb`, `@inquirer/prompts` and the CLI's tree, none of which the build needed).

**Lockfile.** Regenerated with `pnpm install` using the repository's own pnpm 12.14.0. Result: **+860 / −882 lines**, 1,832 → 1,833 package entries, **26 upgrades, 0 downgrades**, 3 additions, 2 removals. Every entry is accounted for:

- `@angular/*` 22.0.8 → 22.2.4, and `@angular/animations@22.0.8` removed (`platform-browser@22.2.4` no longer peers on the deprecated package).
- `@babel/*` 7.29.7 → 8.x, `@types/gensync` added: `@angular/compiler-cli@22.2.4` **pins** `@babel/core: 8.0.1` exactly (verified in the registry manifest). This is a hard requirement of the Angular version, not incidental churn, and it is dev-only — the published runtime closure is unchanged.
- `@jridgewell/gen-mapping` 0.3.13 → 0.4.0-beta.0: transitive to Babel 8. Noted as a prerelease in the dev graph; it cannot reach a consumer.
- `@astrojs/*`, `@sveltejs/acorn-typescript`, `esrap`, `seroval-plugins`: transitive to Astro 7.4.4 / Svelte 5.57.3.

**Control experiment.** To prove the lockfile churn came from the manifest edits and not from `pnpm install` re-resolving on its own, `pnpm install` was run on an untouched clone at `894b0bce`: **the lockfile did not change at all**. The same command on the modified tree changed 1,742 lines. The difference is attributable.

**Deliberate non-change.** No `version` field of any `@themvora/*` package was touched; the approved release matrix stands. No public API surface changed.

**Files:** 26 `package.json` files, `pnpm-lock.yaml`

### C.3 Configuration corrections

**`.github/workflows/ci.yml`** — the `dependency-review` job carried a comment asserting the dependency graph is "on by default for public repositories". The CI annotation contradicts it for this repository. The comment was replaced with an accurate statement of the requirement and the observed failure, so the next person does not read the job as misconfigured.

**`.github/dependabot.yml`** — a comment was added recording the peer-range hazard and the review rule ("take the `devDependencies` change and leave `peerDependencies` alone"). **No rule, group, schedule, label, or limit was changed.** Ignore-rules were considered and rejected: they would also suppress legitimate security updates, which this task explicitly forbids weakening.

---

## D. Dependabot resolution

### D.1 PR #12 — GitHub Actions

Handled manually. Versions and SHAs in §C.1. All four SHAs were resolved from the upstream tag objects via `GET /repos/{owner}/{repo}/git/ref/tags/{tag}` (dereferencing annotated tags), and all four matched the SHAs proposed by Dependabot — so the PR's pins were correct; only the Angular-era concerns applied to the *dependency* PR, not this one.

CI evidence is decisive: the PR's run `41367201269` passed both substantive jobs with these exact pins. The PR is **not merged** — its content is now in the working tree.

### D.2 PR #13 — production dependencies

Applied in corrected form. Full detail in §C.2. The two rejected categories and the reasoning are recorded there.

Note on PR #13's `production-patch-and-minor` grouping: the group contains both genuinely safe dev-dependency bumps and the peer-range rewrites. It cannot be merged as-is without changing the published contract of eight packages.

### D.3 Dependency Review failure

**Finding:** environmental, not code.

The check-run annotation on the failing step states it verbatim:

> `Dependency review is not supported on this repository. Please ensure that Dependency graph is enabled, see https://github.com/themvora/themvora/settings/security_analysis`

Corroborating evidence that this is independent of the action version:

| Run | Action version | Result |
| --- | --- | --- |
| `41367415175` (PR #13) | v4.9.0 (current pin) | ❌ same message |
| `41367201269` (PR #12) | v5.0.0 (proposed) | ❌ same message |
| All 10 orphaned runs | v4.9.0 | ❌ same message |

The step fails on the first action step, before any manifest comparison, which is why `comment-summary-in-pr` never runs.

**Conclusion:** the workflow configuration is correct — `if: github.event_name == 'pull_request'`, `contents: read` + `pull-requests: write`, `fail-on-severity: high`. Nothing in the repository should be changed. **Dependency graph must be enabled in repository settings** (§G). Dependency Review was not disabled, downgraded, made non-blocking, or removed.

---

## E. Review feedback

There is **no human review feedback to act on**: both PRs have `reviews: []` and `review_comments: []`. `saugaproductions78-art` is listed as a requested reviewer but has not reviewed.

The feedback that does exist is automated, and each item is addressed:

| Source | Comment | Resolution |
| --- | --- | --- |
| `dependabot[bot]` on #12 | "The following labels could not be found: `ci`, `dependencies`. Please create them before Dependabot can add them to a pull request." | **Valid and outstanding.** GitHub-side (§G). Confirmed independently: the repository has exactly the 10 default labels, and both PRs have `labels: []`. |
| `dependabot[bot]` on #13 | "The following labels could not be found: `dependencies`." | Same as above. |
| CI annotation, all jobs | `Node.js 20 is deprecated…` | **Fixed** (§C.1). |
| CI annotation, dependency-review | Dependency graph not enabled | **Valid, not fixable locally** (§D.3). |
| CI, PR #13 Build | `Process completed with exit code 1` | **Diagnosed and fixed** (§C.2 Defect 2). |
| `vercel[bot]` | Preview deployment comment | Not actionable; deployments are unaffected. |

No reviewer suggestion was applied speculatively.

---

## F. Verification results

Environment: host Node is **v22.22.2**, below the repository's `engines.node: ">=22.23.4"` and `.nvmrc` (`22.23.4`). A portable Node **v22.23.4** was used for every command below, matching CI's `node-version: 22` resolution. pnpm 12.14.0 (the `packageManager` pin).

Two environment workarounds, both recorded because they affect reproducibility:

1. **Portable Node 22.23.4** — the Angular CLI refuses to run on 22.22.2 (`requires a minimum Node.js version of v22.22.3`). On the host Node, `examples/apps/angular` cannot build at all — for `main` as much as for this change.
2. **`CODEBUDDY_SAFE_DELETE_ENABLED=0`** for build/test/audit commands — this sandbox injects a `fs` shim that blocks bulk deletion at 50 files per turn, and `tsup` deletes ~50 stale files from `packages/core/dist` before writing. `dist/` is gitignored build output. Without this, `pnpm -r build` fails inside the sandbox for reasons unrelated to the repository.

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| 1 | `pnpm install --frozen-lockfile` | **0** | "Lockfile is up to date, resolution step is skipped"; supply-chain policy check passed |
| 2 | `pnpm -r build` | **0** | All packages + docs app + examples built (Next.js, Angular, Nuxt, Astro, Remix, Vite) |
| 3 | `pnpm -r test` | **0** | **3,297 tests passed, 0 failed**, across 23 vitest runs |
| 4 | `pnpm test:scripts` | **0** | 80 tests, 80 pass, 0 fail, 0 skipped |
| 5 | `pnpm lint` | **0** | Clean |
| 6 | `pnpm audit:prod` | **0** | "no advisories in the published runtime closure" (closure = `tslib`); 16 advisories outside it (docs app, fixtures, peer trees) — pre-existing and documented in `Themvora Security & Reliability Remediation.md` |
| 7 | `pnpm themvora:audit:presets` | **0** | 30 gated themes, 30 pass, 0 fail |
| 8 | `pnpm themvora:audit:brands` | **0** | 5 brands, 5 preserved anchor exactly, 0 provenance failures |
| 9 | `pnpm release:audit` | **0** | `Failures: 0` (package audit, dependency audit, export inventory, breaking contract, JSDoc, snippets) |
| 10 | `pnpm release:pack` | **0** | **24 packages packed, 0 failed** — `files`, exports, declarations, README/CHANGELOG, prepack all verified per package |
| 11 | `pnpm docs:api:check` | **0** | 56 API reference files, **no drift** |
| 12 | `pnpm apps:typecheck` | **0** | 13 example apps: angular, astro, astro-native, astro-react, nextjs, nuxt, react, remix, solid, svelte, vanilla-js, vue, web |
| 13 | `pnpm apps:build` | **0** | All 13 built |
| 14 | `pnpm docs:release-gate` | **1** | 18 checks: **17 pass, 1 fail** — token-context audit, pre-existing (§H.1) |

**Formatting:** the repository has no format script and no Prettier/EditorConfig/Biome config, despite `prettier` being a devDependency. There is nothing to run and nothing was invented. `pnpm lint` (ESLint over the `.mjs` surface plus the VS Code extension's TypeScript) passes.

**Not run, and why** — none of these run in CI either, and each needs a browser or a live server:

- `pnpm docs:release-gate:full` / `:browser` / `:all`, `pnpm test:browser` — headless browser gates.
- `pnpm verify:astro*`, `pnpm verify:remix-startup`, `pnpm verify:react-first-paint` — need running dev servers and a browser.
- `pnpm release:consumer`, `pnpm release:test:deps` — full tarball-install matrix; `release:pack` covers the packaging half.

**No framework is claimed as tested beyond what ran.** React, Vue, Svelte, Solid, Angular, Web Components (`@themvora/web`), Next.js, Remix, Astro and Nuxt were each built and typechecked as example apps, and each package's own test suite passed. Browser-level behaviour was not exercised.

---

## G. Remaining external actions (GitHub-side only)

These cannot be done from the working tree and were deliberately **not** performed remotely.

1. **Create two repository labels.** Dependabot is blocked on both.
   - `dependencies` — Dependabot's conventional colour `#0366d6`, description "Pull requests that update a dependency file"
   - `ci` — e.g. `#1d76db`, description "Continuous integration and workflow changes"
   
   Until they exist, every future Dependabot PR opens unlabelled and posts the warning comment again.
2. **Enable the dependency graph** — Settings → Code security and analysis → Dependency graph. This is the sole cause of the `dependency review` check failing on every PR. Nothing in the repository needs to change.
3. **Decide the fate of PRs #12 and #13.** Their content now exists, corrected, in the working tree. They should be closed (not merged) once these changes are pushed, otherwise they will conflict or re-introduce the peer-range narrowing. The task forbids closing them from here.
4. **Delete two orphan Dependabot branches** with no PR: `dependabot/npm_and_yarn/next-16.4.3`, `dependabot/npm_and_yarn/development-patch-and-minor-8a3063dbae`.
5. **Optional:** confirm whether the missing PR records (#1–#11) were removed intentionally; if the repository was recreated or its PRs purged, that is worth knowing before relying on PR history for provenance.

---

## H. Remaining blockers

### H.1 Docs release gate — pre-existing, in in-progress work

`pnpm docs:release-gate` fails at the **token context audit**, and the cause is **not** this task's changes.

```
76 non-reading token use(s) across 34 file(s)
  action     49   kept — a button or selected control
  identity   16   kept — logo, icon or gradient
  code        9   kept — syntax highlighting on a code surface
  reading     2   migrate — this is text someone reads

  text-success      1  ->  foreground
  text-destructive  1  ->  foreground

baseline 0  ->  now 2  (+2)
FAIL — reading-context usage went up. `primary` on the canvas is not a supported context.
```

Both occurrences are on one line of one file: **`apps/docs/components/home/hero-preview.tsx:64`**

```tsx
trend === "up" ? "text-success" : "text-destructive"
```

That file is **untracked** — part of the in-progress homepage redesign, alongside `architecture.tsx`, `mouse-trail.tsx`, `install-command.tsx`, `chrome-accent.ts` and the modified `home/*` components.

Attribution, by control experiment: running the same audit on an untouched clone at `894b0bce` yields `reading 0` / `baseline 0 -> now 0 (unchanged)` / exit 0. The two violations arrive entirely with the new file.

It was **left untouched** in the first pass because both available fixes are decisions that belong to the author of that work:

- **Migrate to `foreground`.** The component already renders `▲`/`▼` alongside the delta, so direction survives without colour, and this also removes a likely AA failure (`success`/`destructive` on `background` is not a contracted reading pair). This is the audit's own recommendation.
- **Raise the frozen baseline** with `--update`. This is legitimate for accepted debt, but it lowers a quality gate — not something this audit will do on the author's behalf.

**Resolved in the final pass** by the first option, on the owner's instruction: the delta is now `text-foreground`, the arrows carry direction, the baseline is untouched, and the audit reports `reading 0` / `baseline 0 -> now 0 (unchanged)`. Detail and verification in §J.1.

### H.2 Host Node version

The repository requires Node ≥ 22.23.4. The host has 22.22.2, which cannot build `examples/apps/angular` or run `@angular/cli` at all. Every result in §F used a portable 22.23.4. CI is unaffected (`node-version: 22` resolves to the latest 22.x). Upgrading the host Node, or adopting the `.nvmrc` through a version manager, is advisable before the next local release run.

### H.3 Dependency Review

Blocked until §G.2 is done. No local workaround exists that does not weaken the check.

---

## I. Final working-tree integrity

### I.1 HEAD

| | |
| --- | --- |
| Original HEAD | `894b0bce8e2e118d654f7b032942ffda725cf75d` |
| Final HEAD | `894b0bce8e2e118d654f7b032942ffda725cf75d` (unchanged) |
| Branch | `main` (unchanged) |
| Commits created | none |
| Tags created | none |

Nothing was staged, committed, tagged, pushed, merged, reset, cleaned, restored or stashed.

### I.2 File-level comparison

| Category | Baseline | Final | Delta |
| --- | --- | --- | --- |
| Staged | 0 | 0 | none |
| Unstaged | 46 | 74 | +28 |
| Untracked | 26 (24 user files + 2 audit scratch) | 28 (23 user files + 4 audit scratch + this report) | −1 user file, deleted intentionally by the owner, see I.3 |

All **46** baseline unstaged entries are present in the final set — verified by set comparison of the two name lists, not by inspection. The 28 additions are:

- **25** `package.json` files (§C.2). 26 manifests were edited in total; `apps/docs/package.json` was already modified at baseline and only had its version fields changed, so it adds no new entry.
- **1** `pnpm-lock.yaml`
- **1** `.github/workflows/ci.yml`
- **1** `.github/dependabot.yml`

No file outside this set was modified.

### I.3 One untracked file removed by the repository owner — confirmed

**`HOMEPAGE-RESPONSIVE-REPORT.md` was present at baseline and is no longer on disk. The repository owner has confirmed this deletion was intentional**, made during the session because the homepage responsive work it described had already been fixed and the report was no longer needed. It was not restored, by instruction.

- Present in the initial `git status --short` (`?? HOMEPAGE-RESPONSIVE-REPORT.md`) and in the baseline snapshot `.baseline-untracked.txt`.
- Absent at the end: `ls` reports no such file; it is not in `git check-ignore`; a filesystem search across `D:\Code` and `C:\Users\sauga` finds nothing; the Recycle Bin contains only `desktop.ini`.
- It was untracked, so there is no Git copy and no restoration path. That is expected for a working file that had served its purpose — not a loss of source, and not a defect in the repository.

Recorded for completeness, because the audit observed the change and could not attribute it at the time: no command run in this session targets root-level Markdown, and the repository's only bulk-delete script (`scripts/clean.mjs`) has an explicit allowlist of build-output directory names (`dist`, `.next`, `.nuxt`, …) and was never invoked. The sandbox's deletion report (`%TEMP%\codebuddy-safe-delete\`) contains no record for this session, because that guard was disabled for build/test/audit runs (§F). The owner's confirmation resolves the question the evidence could not.

The other 23 user files are all present and unmodified, including every file of the in-progress homepage redesign and all 13 `homepage-shots/` artefacts.

### I.4 Confirmation

- No staged or unstaged user change was discarded. The 46 baseline modifications — including the deletion of `hero-scene.tsx`, `hero-snippet.ts`, `theme-gallery.tsx`, `hero-scene.ts`, `hero-three.ts`, `probe-hero-scene.mjs` and the `snippet-baseline.json` update — are all still in place.
- No untracked user file was removed by this audit. The single file that left the tree — `HOMEPAGE-RESPONSIVE-REPORT.md` — was deleted intentionally by the repository owner, who confirmed it after the fact (§I.3).
- No user file was replaced with content from an old PR branch. PR #13's manifests were read for their intended versions only, and applied field-by-field to the current files with a check that each expected "from" value was actually present (98/98 matched, 0 mismatches).
- Two local refs were created for inspection (`dependabot-check/next-16`, `dependabot-check/dev-batch`) and are removed at the end of this session. They never touched the working tree.
- `docs-internal/audits/` was created for this report. It contains this file and four `.baseline-*` evidence snapshots; the snapshots can be deleted once this report is reviewed.

---

## Appendix — reproduction commands

```bash
# PR inventory
curl -s "https://api.github.com/repos/themvora/themvora/pulls?state=all&per_page=100"
curl -s "https://api.github.com/search/issues?q=repo:themvora/themvora+is:pr"

# PR #13 failure reproduction (throwaway clone at the PR head)
git clone --no-hardlinks --local . /tmp/tmvora-pr13
git -C /tmp/tmvora-pr13 checkout 82aa2751a838deabc6f20b91b53d1c15c1322d4a
cd /tmp/tmvora-pr13 && pnpm install --frozen-lockfile && pnpm -r build
# -> packages/angular: this.tcb.boundTarget.getForeignComponent is not a function

# Lockfile-churn control (untouched tree at the base commit)
git -C /tmp/tmvora-pr13 checkout 894b0bce && pnpm install && git -C /tmp/tmvora-pr13 diff --stat pnpm-lock.yaml
# -> no change: the churn in the real tree comes from the manifest edits

# Docs-gate attribution control
git -C /tmp/tmvora-pr13 checkout 894b0bce && node scripts/docs/audits/audit-token-contexts.mjs
# -> reading 0, baseline 0 -> now 0, exit 0
```

All GitHub API access in this audit was unauthenticated. `gh` is not installed on this host. Workflow **logs** are authentication-gated (`403`); job and step conclusions and check-run annotations are public and were used instead.

---

## J. Final remediation pass (2026-11-03)

A second pass closed the open docs-gate failure and ran the browser tiers that the first pass could not. Nothing from §C was revisited: the action pins, the 98 dependency updates, the peer ranges, the release matrix and the Dependency Review configuration are untouched.

### J.1 Token-context correction

**File:** `apps/docs/components/home/hero-preview.tsx` (the `Stat` sub-component, previously line 64)

Before:

```tsx
<div
  className={`mt-0.5 flex items-center gap-1 text-[10px] font-medium ${
    trend === "up" ? "text-success" : "text-destructive"
  }`}
>
  <span aria-hidden>{trend === "up" ? "▲" : "▼"}</span>
  {delta}
</div>
```

After:

```tsx
<div className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-foreground">
  <span aria-hidden>{trend === "up" ? "▲" : "▼"}</span>
  {delta}
</div>
```

What changed, and what deliberately did not:

- **Changed:** the colour role only — `text-success` / `text-destructive` → `text-foreground`. The template literal that selected between them is gone with it.
- **Preserved:** `mt-0.5 flex items-center gap-1 text-[10px] font-medium` — layout, spacing, typography and the flex baseline are identical, so nothing reflows.
- **Preserved:** the `▲` / `▼` glyph. Direction is carried by shape, not hue, which is what makes the colour removable without losing meaning. It is also the reason no new markup was needed.
- **Preserved:** the frozen baseline `docs/reference/baselines/token-context-baseline.json` is untouched (`git status` clean for that path). The audit was not weakened, skipped or re-baselined.

**Accessible description — checked, no change made.** The trend delta sits inside the dashboard preview, and that whole panel carries `aria-hidden` on its wrapper (`hero-preview.tsx:108`), with a comment explaining why: it is "a picture of an application, not an application". Its invented figures must not be read out as page content; the `figcaption` outside the hidden subtree carries the part that is true (which theme is applied). Adding `aria-label`s inside an `aria-hidden` subtree would be inert markup, so none was added. For sighted users the arrow glyph carries the direction independently of colour.

Result: `reading 0` (was 2), `baseline 0 -> now 0 (unchanged)`, exit 0.

### J.2 Gate results

Environment as in §F: portable Node **22.23.4**, pnpm **12.14.0**, `CODEBUDDY_SAFE_DELETE_ENABLED=0` for build steps. Commands are exactly the repository's own scripts; none were substituted.

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm docs:release-gate` | **0** | **PASSED** — "All docs gates passed. Release not blocked by docs." 18 static checks green |
| `pnpm docs:release-gate:full` | 1 | Static passed; **audit H** failed at 164/170 routes (see J.3) |
| `pnpm docs:release-gate:browser` | 1 | Astro readouts passed; **React first-paint** blocked by a fixture that has never existed (see J.4) |
| `pnpm test:browser` | **0** | All 5 scenarios in a real browser: cdn-boot, live-attributes, reconnect, fallback-and-diagnostics, cleanup |
| `pnpm --filter @themvora/docs typecheck` | **0** | `tsc --noEmit` clean |
| `pnpm --filter @themvora/docs build` | **0** | Production build, 98 routes |

### J.3 Audit H — environment-limited, not a page defect

`audit-browser-smoke.mjs --strict` walks 170 routes, driving a headless browser over CDP and `fetch`-ing each URL. It fails at a fixed point — 164/170 — with a navigation timeout on `/api-reference/solid`, followed by five `fetch failed` results for the routes after it. It reproduced on a second run at the same index.

Three independent checks show the routes themselves are healthy:

1. **Every route returns 200.** A fresh `next start` plus a sequential walk of the same 170 routes, derived with the audit's own route logic, produced **0 failures**.
2. **The page that "hangs" loads fine alone.** `/api-reference/solid` in a fresh headless browser: `readyState complete` in **849 ms**, 26,623 characters of body text, **0 console errors, 0 page errors**.
3. **The content assertions hold.** Served HTML for `/api-reference/{solid,svelte,vue,web,unocss,tailwind,core,react}` contains both `@themvora/<slug>` and the "Related docs" section in every case.

The signature — fixed position, a CDP navigation timeout followed by connection failures, healthy pages in isolation — points to resource exhaustion across ~165 browser navigations in one long-lived session on this Windows host, not to a defect in any route. The audit's own failure mode is honest: it reports what it saw. It is recorded here as an environment limitation, not a repo fix, and nothing was changed to make it pass.

### J.4 Browser tier — a stale step removed, a fixture that never existed

Two distinct issues surfaced in the browser tier; only one was mine to fix.

**Fixed — stale gate step.** `scripts/docs/release-gate.mjs` still listed `hero scene (browser, canvas + progressive enhancement)`, running `apps/docs/scripts/probe-hero-scene.mjs`. That probe, the component, `lib/hero-scene.ts` and `lib/hero-three.ts` were all deleted with the homepage redesign (§I.4), so the step failed with `MODULE_NOT_FOUND` before any other browser gate could run. The step and its comment were removed and replaced with a note recording why. This removes a dead check of a deleted feature; it does not weaken a live one. No other reference to those files remains in the repository.

**Not fixed — the React `theme-config` fixture is absent and always has been.** The `React first-paint` gate asserts against `examples/apps/react/dist-theme-config/theme-config.html`, built from `vite.config.theme-config.ts`. That config, the `theme-config.html` entry and `theme.config.ts` **are not in the repository and never were** (`git log --all` returns nothing for any of them; the example ships only `index.html` and `vite.config.ts`). Reconstructing the variant would mean authoring a fixture — an entry HTML, a theme config and a build config — purely to satisfy an assertion whose intended inputs are unknown. That is inventing test scaffolding, not correcting a defect, so it was left alone. The gate's own hint (`vite build --config vite.config.theme-config.ts`) points at a file that does not exist.

### J.5 Responsive verification

Captured and measured in headless Chromium against the production build (`next start`), at 1440, 1024, 768, 390 and 360 px. Screenshots were written to a temporary directory; the owner's `homepage-shots/` was not touched, and no design was changed.

| Width | Page overflow X | Code-block overflow | Grid overflow | Header | Preview placement | Footer |
| --- | --- | --- | --- | --- | --- | --- |
| 1440 | **0 px** | 0 (scrolls in place) | 0 | 65 px, 11 controls | side by side (left 808) | 475 px, visible |
| 1024 | **0 px** | 0 (scrolls in place) | 0 | 65 px, 11 controls | side by side (left 560) | 490 px, visible |
| 768 | **0 px** | 0 | 0 | 65 px, 7 controls + menu | stacked (top 895) | 750 px, visible |
| 390 | **0 px** | 0 | 0 | 65 px, 4 controls + menu | stacked (top 1020) | 1282 px, visible |
| 360 | **0 px** | 0 | 0 | 65 px, 4 controls + menu | stacked (top 1075) | 1311 px, visible |

What the screenshots show, checked against each requirement:

- **Navigation usable.** Full link set at 1440/1024; collapses to a hamburger with theme, search and menu controls at 768 and below. No wrapping or clipping at any width.
- **Hero and preview stack correctly.** Two columns at 1440/1024, single column from 768 down. The preview keeps its aspect (349 px tall at every width, 496 → 432 → 576 → 342 → 312 px wide) and never overlaps the heading.
- **Theme selection works.** The palette exposes 14 radios. Clicking one moved `<html>` from `data-theme="plum-light"` / `data-theme-selection-family="plum"` to `iris-light` / `iris`, with `data-theme-ready="true"` throughout. Selection also persisted across subsequent navigations.
- **Primitive and framework grids readable.** Framework grid renders with icons and labels down to 360 px; no grid reported internal overflow.
- **Code blocks do not cause page-level overflow.** The one block wider than its column at 1024 px is contained by `div.code-block-content { overflow-x: auto }` (client 478, scroll 572) inside `.code-block { overflow-x: hidden }` and a `min-w-0 overflow-x-clip` wrapper. It scrolls within itself; the document stays at viewport width.
- **Footer reachable and complete.** Documentation, Resources, Ecosystem and Legal columns plus copyright and tagline are all present and in-viewport when scrolled to the end at every width.

The elements flagged as extending past the viewport edge are intentional: the closed off-canvas nav drawer (translated to `left: 360/390/768`) and the decorative `hero-aurora` / `hero-orb` layers, all clipped by `overflow-hidden` ancestors — which is why document scroll width never exceeds the viewport.

### J.6 Report correction

§I.3 now records the `HOMEPAGE-RESPONSIVE-REPORT.md` deletion as **intentional and confirmed by the repository owner** — the homepage responsive work it described was already fixed and the file was no longer needed. It was not restored. The evidence trail (baseline snapshot, absent from disk, empty Recycle Bin, no sandbox deletion record) is kept, with the owner's confirmation resolving what the evidence alone could not. The `.baseline-*` snapshots remain in place.

### J.7 Remaining blockers after this pass

1. **React first-paint browser gate** — needs the `theme-config` fixture variant (J.4), which does not exist. Owner decision: author it, or drop the variant from the gate deliberately.
2. **Audit H on this host** — resource-limited at ~165 navigations (J.3). Not reproducible as a page defect; worth re-running on CI or a machine with more headroom before treating it as a release signal.
3. **Dependency Review** — still requires the dependency graph to be enabled (§G.2).
4. **Labels** `dependencies` and `ci` — still to be created (§G.1).

The **static docs gate — the release blocker — is green**, and `test:browser`, the docs typecheck and the docs production build all pass.

### J.8 Working-tree state at the end of the final pass

| | |
| --- | --- |
| HEAD | `894b0bce8e2e118d654f7b032942ffda725cf75d` (unchanged; nothing committed, staged, tagged or pushed) |
| Staged | 0 |
| Unstaged | 75 = 46 baseline modifications + 28 dependency/CI files + `scripts/docs/release-gate.mjs` |
| Untracked | 14 = 9 user source files + 5 files in `docs-internal/audits/` |

All 46 baseline modifications are still present — verified by set comparison against `.baseline-unstaged-names.txt`, which returns no missing entries. The dependency updates, action pins, peer ranges and the token baseline are untouched: `git status` shows the token baseline clean, all 8 action references still carry the §C.1 SHAs, and the published peer ranges still read `solid-js: ^1.8.0`, `svelte: ^5.0.0`, `@angular/core: >=17.0.0`.

**One further untracked directory left the tree during this pass: `homepage-shots/` (12 PNGs and `report.json`).** Recorded for the same reason as §I.3, and with the same limit on what the evidence can prove:

- I did not delete it. Every screenshot this pass wrote went to `%TEMP%\tmvora-audit\shots\`; nothing in this session targeted that directory.
- No repository script references `homepage-shots` or deletes `.png` files — a repository-wide search for both returns nothing.
- It is consistent with the owner's ongoing cleanup of the homepage-responsive artefacts: `homepage-screenshot.mjs` and `HOMEPAGE-RESPONSIVE-REPORT.md` had already been removed before and during this session, and the responsive work is complete. This is an inference, not a confirmation.
- It was untracked, so no Git copy exists. The fresh captures taken for §J.5 are retained in `%TEMP%\tmvora-audit\shots\` if they are wanted.

The untracked count in §I.2 (28) predates this deletion; the figures above supersede it.

---

## K. Browser release-gate reliability (2026-11-03, second pass)

Both browser-gate failures are fixed. The static, full and browser documentation gates all pass. No route was dropped, no assertion was weakened, no timeout was loosened and no gate was removed.

### K.1 Audit H — root cause

The audit walked all 170 routes against **one** `next start` server and **one** browser page. It failed at ~164/170: a navigation timeout on `/api-reference/solid`, then five `fetch failed` results. The previous investigation guessed at browser-session exhaustion; that guess was wrong, and measuring it settled the question.

**The browser was healthy.** Instrumenting the run with `Performance.getMetrics` per 20 routes shows the renderer's JS heap flat for the entire walk:

```
[20]  heap=96.9MB    [100] heap=65.9MB    [160] heap=162.4MB
[40]  heap=33.5MB    [120] heap=58.6MB    [165] FAIL (navigation timeout)
[60]  heap=60.6MB    [140] heap=65.7MB
[80]  heap=73.1MB
```

**The server died.** The same run captured its stderr:

```
FATAL ERROR: Ineffective mark-compacts near heap limit
Allocation failed - JavaScript heap out of memory
[...] 316834 ms: Mark-Compact 4032.0 (4140.8) -> 4029.1 (4139.7) MB
```

The server process exited with **code 134** at route 165. Every later `fetch` failed because there was no server left — the five "connection failures" were a symptom, not five defects.

**The growth is the docs app's, not the browser's.** A plain fetch walk of the same 170 routes with no browser at all measures server RSS directly:

| routes | 20 | 40 | 60 | 80 | 100 | 120 | 140 | 160 | 170 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RSS | 567 MB | 818 MB | 1050 MB | 1291 MB | 1564 MB | 1810 MB | 2117 MB | 2245 MB | **2526 MB** |

That is **~11.5 MB retained per rendered route**, linear, with no browser involved. Browsing multiplies it: Next prefetches the `<Link>`s on each page, so one visited route costs several server renders. Starting from zero, 170 routes at that rate reach the 4 GB default ceiling at roughly route 165 — which is exactly where the walk died.

So the cause is two things together: an unbounded per-render retention in the docs app, and a harness that assumed one server could outlive 170 renders of it.

### K.2 Audit H — fix

The growth is a property of the docs app. Fixing it would mean changing how the site renders, which is outside a release-gate repair and would be a much larger change than this pass should make. What the audit owns is that it must not depend on a server outliving 170 renders, so the walk is bounded:

1. **Batches of 40 routes**, each with a **fresh `next start` generation and a fresh browser**. Memory starts at zero every batch and cannot approach the ceiling. 170 routes = 5 batches.
2. **Page recreated after a failed navigation.** A timed-out navigation leaves the target mid-load; reusing it is what turned one hung route into five cascading failures. The dead page is closed and a clean one opened before the next route.
3. **A deadline on every CDP command** (30 s), on navigation (45 s) and on each `fetch` (20 s). A hang now names its route instead of stalling the run.
4. **Listener and timer cleanup in `finally`.** The navigation-event wait is registered before `Page.navigate` (so the event cannot be missed) and removed in `finally`; a failed navigation also attaches a no-op catch to the companion promise so it cannot surface as an unhandled rejection and kill the process.
5. **Server death reported once.** If the server exits mid-batch, the audit fails that route with "docs server exited" and stops, rather than emitting 40 identical `fetch failed` lines that hide the cause.

Every route, every assertion and every message is unchanged. `--strict` semantics are unchanged.

### K.3 Audit H — results

Three complete walks, all 170 routes, all after the fix:

| Run | Context | Routes | Batches | Wall clock | Failures |
| --- | --- | --- | --- | --- | --- |
| 1 | standalone, `--strict` | **170/170** | 5 | **341.8 s** | **0** |
| 2 | inside `pnpm docs:release-gate:full` (first attempt) | **170/170** | 5 | **361.0 s** | **0** |
| 3 | inside `pnpm docs:release-gate:full` (final) | **170/170** | 5 | **346.5 s** | **0** |

No route failed in any walk. The complete route set, in the order visited, is every `href` in `apps/docs/lib/docs-routes.ts` plus every page generated from `apps/docs/content/api-reference/**/*.md` — 114 listed routes and 56 API-reference pages, deduplicated to 170. The generated API pages are:

```
/api-reference/adapters      /api-reference/core         /api-reference/remix
/api-reference/angular       /api-reference/daisyui      /api-reference/shadcn
/api-reference/antd          /api-reference/devtools     /api-reference/solid
/api-reference/astro         /api-reference/mantine      /api-reference/svelte
/api-reference/bootstrap     /api-reference/mui          /api-reference/tailwind
/api-reference/chakra        /api-reference/next         /api-reference/unocss
/api-reference/cli           /api-reference/nuxt         /api-reference/vue
/api-reference/open-props    /api-reference/react        /api-reference/web
```

plus their sub-pages (`/api-reference/core/*`, `/api-reference/adapters/*`, and the rest), 56 in total.

### K.4 React first-paint — root cause

The gate served `examples/apps/react/dist-theme-config/theme-config.html`, built from `vite.config.theme-config.ts`. **None of those existed, and none ever had**: `git log --all` returns nothing for `vite.config.theme-config.ts`, `theme-config.html` or `theme.config.ts`. The gate was written against a fixture that was never committed.

There was a second, quieter defect: its expectations named a **`mint`** family (`mint-light`, `mint-dark`) that this example does not register. The example's families are `themvora`, `citrus`, `cocoa` and `berry`. So even with the missing files restored, the assertions would have been aimed at a theme the fixture never had.

### K.5 React first-paint — fix

The variant is now real, and it is built from the documented public API rather than invented:

- **`examples/apps/react/theme.config.ts`** — `defineThemvoraConfig({ themes, defaultTheme: "cocoa-light", initialMode: "light", initialFamily: "cocoa" })`. This is the file the docs page shows verbatim (`apps/docs/app/vite-plugin/page.tsx`), pointed at the example's own theme registry so both builds resolve the same theme.
- **`examples/apps/react/vite.config.theme-config.ts`** — `plugins: [react(), tailwindcss(), themvoraVitePlugin()]`, output to `dist-theme-config/` with `theme-config.html` as the input. The plugin discovers `theme.config.ts` by convention, exactly as documented; nothing repeats a theme or a default.
- **`examples/apps/react/theme-config.html`** + **`src/main-theme-config.tsx`** — a `#root` and an entry that renders a bare `<ThemeProvider>`. That is the documented setup: the plugin transports the config to the browser as `window.__THEMVORA_CONFIG__` before application code runs, and the provider builds its registry from it (`packages/react/src/provider.tsx` — "a provider with no theme props still has a registry to build a runtime from").
- **`examples/apps/react/package.json`** — `build` now runs both builds, so `pnpm -r build` and the release gate produce the variant without a special command.
- **`.gitignore`** — `dist-theme-config`, so the second build output is not mistaken for source.

The gate's expectations were corrected to the fixture's real configuration (seeded `{mode:"dark", family:"cocoa"}` → `cocoa-dark`; fresh → `cocoa-light` with selection mode `light`), and the seed family changed from `mint` to `cocoa`. The assertions themselves are untouched: exact `data-theme`, exact selection mode, family presence/absence, mode/theme agreement, no-flicker, console cleanliness.

What the gate now proves, and what it honestly does not:

```
=== REACT FIRST-PAINT GATE ===
  PASS  persisted dark            load 1..6   proves: bootstrap  data-theme=cocoa-dark sel-mode=dark
  PASS  no selection (initialMode) load 7      proves: bootstrap  data-theme=cocoa-light sel-mode=light
  contracts provable by this fixture:
    bootstrap state      YES (data-theme* on <html>)
    sync-first-render    NO — #root is empty in the served HTML (client-rendered build)
    frame-0 readout      NO — no [data-tv-readout] in the served HTML
Failures: 0
```

The pre-paint contract is genuinely verified: `data-theme` is already `cocoa-dark` on `<html>` in the **first frame where the bootstrap reports ready**, before React runs. `sync-first-render` and `frame-0 readout` are not asserted because this fixture cannot prove them — it prerenders no markup and no readouts — and the gate says so out loud rather than implying coverage it does not have. The readout contract remains proven by `verify-astro-readouts.mjs`, which has a prerendering fixture.

Both variants pass: `--variant=theme-config` 7 loads / 0 failures, `--variant=quickstart` 7 loads / 0 failures.

### K.6 A third blocker found and fixed: stale TOC manifest

The first full-gate attempt after the audit fix passed audit H and then failed at a later full-tier step:

```
FAIL — apps/docs/lib/generated/toc-headings.ts is stale.
  ~ /animation — 7 heading(s) -> 9
  ~ /adapters — 7 heading(s) -> 12
```

This is generated-file drift from the in-progress page edits, not from anything in this pass. It was regenerated with the repository's own generator (`node scripts/docs/generate-toc-headings.mjs --prod`, the same command the gate's check uses), producing +9/−2 lines that add the headings the pages now have. The manifest was not hand-edited and the check was not relaxed.

### K.7 Gate results

Every command, run in this order, Node **22.23.4** and pnpm **12.14.0**:

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| 1 | `pnpm docs:release-gate` | **0** | PASSED — "All docs gates passed. Release not blocked by docs." |
| 2 | `pnpm docs:release-gate:full` | **0** | **PASSED** — Static PASSED, Full PASSED, Browser PASSED |
| 3 | `pnpm docs:release-gate:browser` | **0** | PASSED — Astro readouts + React first-paint (both variants) |
| 4 | `pnpm test:browser` | **0** | 5/5 scenarios: cdn-boot, live-attributes, reconnect, fallback-and-diagnostics, cleanup |
| 5 | `pnpm --filter @themvora/docs typecheck` | **0** | `tsc --noEmit` clean |
| 6 | `pnpm --filter @themvora/docs build` | **0** | Production build, 99 route lines |

One honest note on #4: the first attempt in this pass failed `live-attributes` with `catalogMs took 6014.6ms — not an in-frame update`, immediately after the 22-minute full gate had finished. Two consecutive re-runs on an idle machine passed 5/5 with no change to any code, so this was host contention (a 6 s stall is not a plausible in-frame write), not a regression. It is recorded rather than smoothed over; the assertion was not touched.

### K.8 Responsive regression check

Re-measured at all five widths against the rebuilt production server. **Every metric is identical to the previous pass** — no regression from the browser-gate work:

| Width | Page overflow X | Code-block overflow | Grid overflow | Preview | Doc height |
| --- | --- | --- | --- | --- | --- |
| 1440 | 0 px | 0 | 0 | 496×349, side by side | 6908 |
| 1024 | 0 px | 0 | 0 | 432×349, side by side | 7248 |
| 768 | 0 px | 0 | 0 | 576×349, stacked | 10232 |
| 390 | 0 px | 0 | 0 | 342×349, stacked | 14269 |
| 360 | 0 px | 0 | 0 | 312×349, stacked | 14840 |

Mobile navigation still collapses to a hamburger with 4 controls, the framework grid still renders down to 360 px, code blocks still scroll inside `div.code-block-content`, the footer is still complete, and the theme palette still switches (14 radios; `cocoa-light` → `plum-light` on click, `data-theme-ready="true"` throughout).

### K.9 `homepage-shots/` — recorded state, not restored

Checked independently this pass, as asked:

- **The directory does not exist.** `ls homepage-shots` → no such file or directory.
- **Not in Git.** It was untracked, so there is no committed copy and no reflog entry.
- **Not in the Recycle Bin.** A recursive scan of `C:/$Recycle.Bin` for `home-*` / `homepage*` returns 0 matches.
- **Nothing recoverable on disk.** A search under `D:/Code` for `homepage-shots` or `home-1440-vp.png` returns nothing.

Its deletion is therefore still unconfirmed as intentional, and nothing was recreated, overwritten or altered in its place. The captures taken for this audit live in `%TEMP%\tmvora-audit\shots\` and are **not** a substitute: they are a different set (top/bottom/preview at 1440/1024/768/390/360) taken from a later build, whereas the originals were `-full`/`-vp`/`-menu` captures at six widths including 375. They are offered only as fresh evidence for §K.8.

### K.10 Files changed in this pass

| File | Change |
| --- | --- |
| `scripts/docs/audits/audit-browser-smoke.mjs` | Batching, per-batch server + browser, page recreation after failure, command deadlines, guaranteed cleanup, server-death reporting |
| `scripts/release/verify-react-first-paint.mjs` | Expectations and seed family corrected to the fixture's real configuration |
| `examples/apps/react/theme.config.ts` | **new** — documented `defineThemvoraConfig` declaration |
| `examples/apps/react/vite.config.theme-config.ts` | **new** — documented `themvoraVitePlugin()` registration, `dist-theme-config/` |
| `examples/apps/react/theme-config.html` | **new** — entry document for the build-integrated variant |
| `examples/apps/react/src/main-theme-config.tsx` | **new** — bare `<ThemeProvider>` entry |
| `examples/apps/react/package.json` | `build` also builds the theme-config variant |
| `.gitignore` | ignores `dist-theme-config` |
| `apps/docs/lib/generated/toc-headings.ts` | regenerated from the pages' current headings |
| `docs-internal/audits/github-pr-history-remediation.md` | this section |

Untouched, as required: Themvora package versions, published peer ranges, the release version matrix, the curated dependency updates, the CI action pins, the Dependency Review configuration, the token baseline, and the homepage design.

### K.11 Remaining blockers

1. **Docs-server memory growth** — ~11.5 MB retained per rendered route, ~2.5 GB after a single pass over the site, ~4 GB (V8 default ceiling) under browser prefetching. The audit is now immune to it; a real deployment is not. This is the next thing worth fixing in the docs app, and it is the reason `pnpm docs:release-gate:full` needs the batching.
2. **Dependency Review** — still needs the repository's dependency graph enabled (§G.2).
3. **Labels** `dependencies` and `ci` — still to be created (§G.1).
4. **`homepage-shots/`** — deletion still unconfirmed (§K.9).

The **static, full and browser documentation release gates all pass**, with all 170 routes visited and every assertion intact.

---

## L. Next.js server memory growth — investigation and fix (2026-11-03, third pass)

**Verdict: it was an application-level leak, not Next.js caching.** Every route re-read and rebuilt the whole search index, and the result was retained per request through React's request-scoped cache. It is fixed; retained growth roughly halved. A second, architectural contributor remains and is documented in §L.10.

### L.1 What the build actually renders

From the production build's route table: **81 routes are dynamic (`ƒ`)**, 7 are static (`○`), 7 are SSG (`●`). The documentation pages are almost all dynamically rendered, so every request performs a full server render — there is no route cache to absorb the work, and no route cache to explain the growth.

### L.2 Method

Measurements were taken inside the server process, not inferred from the outside:

- **Preload shim** (`NODE_OPTIONS=--require`) sampling `process.memoryUsage()` — `rss`, `heapTotal`, `heapUsed`, `external`, `arrayBuffers` — every 250 ms, plus on-demand V8 heap snapshots and allocation profiles through the `inspector` module.
- **Forced full GC** between passes, so "allocated" could be separated from "retained". Without this the growth looks like lazy collection; with it, the live set is unambiguous.
- **Five scenarios**: one route repeated 170×, 170 distinct routes, 56 API-reference routes, content-heavy routes repeated across three passes, and the browser-driven walk.
- An **isolated build** of the same app was used for the A/B, so the numbers are not affected by other edits in the working tree.

### L.3 Measurements before the fix

All figures are MB. Heap is `heapUsed`.

| Scenario | Requests | RSS | Heap | Retained / request |
| --- | --- | --- | --- | --- |
| Same route 170× | 170 | 299 → 2601 (+2302) | 188 → 2294 | **13.5** |
| 170 distinct routes | 170 | 567 → 2526 (+1959) | — | **11.5** |
| API-reference only | 56 | 257 → 1138 (+881) | 164 → 835 | **15.7** |
| Content-heavy × 3 passes | 20 each | +312, +298, +362 | 149→436, 398→635, 624→897 | **~15.9** |

The same-route result is the decisive one: **170 requests for one URL cost as much as 170 different URLs.** Route-keyed caching is therefore excluded — a cache would have warmed after the first request and flattened. This is per-request retention.

### L.4 Where the memory went

**Allocation profile** (server process, 20 renders, 236 MB sampled):

| MB | Site |
| --- | --- |
| 67.2 | `trim` (native) |
| 61.8 | `readFileSync` |
| 40.8 | `decode` (`node:internal/encoding`) |
| 34.8 | Next `app-page.runtime.prod.js` |
| 1.0 | `@shikijs/vscode-textmate` |

Two thirds of all allocation was **reading and decoding files**, plus string trimming — the signature of re-reading a corpus on every request.

**Heap snapshot diff** (20 renders, after forced GC: 146 → 401 MB, +255 MB):

| Growth | Object |
| --- | --- |
| +17.4 MB | `code:` (V8 compiled code) |
| +13.3 MB | markdown of `/api-reference/web` |
| +12.0 MB | markdown of `/api-reference/nuxt` |
| +10.9 MB | markdown of `/api-reference/core` |
| +7.3 MB | `object:Object` |
| +7.3 MB | API markdown (`ThemvoraScrollbar`) |
| +7.1 MB | API markdown (`ThemvoraInspector`) |

**Retainer chain** for the largest leaked string:

```
string  (page markdown)
  ↑ parent            sliced string
  ↑ property "title"  object:Object
  ↑                   array → object:Array
  ↑ property "v"      object:Object
  ↑                   WeakMap
  ↑ property "cache"  object:ey
  ↑ <symbol kResourceStore>  Promise / JSProxy
```

`kResourceStore` is React's symbol for the request's resource store — the mechanism behind `cache()`. The chain ends in a `Map` with a `cache` property holding `{title, …}` objects: a search index, retained per request.

### L.5 Root cause

`apps/docs/app/layout.tsx` had:

```ts
const getSearchEntries = cache(buildSearchIndex);
```

and the root layout calls `getSearchEntries()` on every render. `buildSearchIndex()` walks `content/`, reads **every** markdown file and returns an array of `{title, route, text, type}` — a few megabytes of strings.

`cache()` is **request-scoped**, so this did not memoize across requests. It rebuilt the entire index per request, and the result stayed reachable through that request's resource store instead of being freed. Every route paid the cost, which is why the growth was independent of which route was requested.

At ~13.5 MB per render, 170 renders is ~2.3 GB on top of the ~0.5 GB baseline — and with browser prefetching multiplying the renders behind each visited route, the 4 GB default heap limit arrives at roughly route 165. That is exactly where audit H used to die.

### L.6 The fix

```ts
let searchEntries: SearchEntry[] | null = null;
const getSearchEntries: () => SearchEntry[] =
  process.env.NODE_ENV === "production"
    ? () => (searchEntries ??= buildSearchIndex())
    : cache(buildSearchIndex);
```

The corpus is static on disk and cannot change while a production server runs, so the index is built once per process and shared. Development keeps `cache()`, because content edits must appear on the next request and a module-level value would not. No caching is disabled, no route is changed, and the index contents are identical.

This is the same reasoning the repository already applies in `lib/code-variants.ts`, where `deriveCache` is a module-level map documented as safe "because the corpus is small and immutable at runtime".

### L.7 Measurements after the fix

Same harness, same isolated build, rebuilt:

| Scenario | Requests | RSS | Heap | Retained / request | Change |
| --- | --- | --- | --- | --- | --- |
| Same route 170× | 170 | 263 → 1356 (+1093) | 172 → 1148 | **6.4** | −53% |
| 170 distinct routes | 170 | 258 → 1270 (+1012) | 152 → 956 | **5.9** | −49% |
| API-reference only | 56 | 255 → 679 (+424) | 152 → 427 | **7.6** | −52% |
| Content-heavy × 3 passes | 20 each | +152, +154, +172 | 173→273, 240→333, 325→425 | **~7.9** | −50% |

Peak RSS on a full 170-route walk falls from **2526 MB to 1270 MB**. The server no longer approaches its heap limit during the audit; the batching in audit H is now a safety margin rather than a necessity.

### L.8 Does it plateau?

**No — before or after.** Three consecutive passes over the same six warmed routes:

| Pass | Before | After |
| --- | --- | --- |
| 1 | +312 MB | +152 MB |
| 2 | +298 MB | +154 MB |
| 3 | +362 MB | +172 MB |

If this were caching, pass 2 would cost nothing. It does not, in either build. The fix halves the slope; it does not make the curve flat, because a second contributor remains (§L.10).

### L.9 Regression coverage

Audit H now measures retained memory per render and fails if it regresses:

```
  retained memory: 258→523 MB over 40 plain renders (6.6 MB/route, ceiling 9)
```

- It runs **40 plain HTTP renders with no browser**, after the walk, on a fresh server. The browser is deliberately excluded: prefetching multiplies the renders behind each visit and pushes the figure to 12–15 MB/route for both the leaking and the fixed server, which cannot be separated reliably.
- The ceiling is **9 MB/route**, between the measured regression (~13.5) and the fixed value (~5.9–6.6).
- `--retention-only` runs the probe alone, so the guard can be exercised in ~20 s instead of after a six-minute walk.
- Both paths were verified: at the shipped ceiling it reports 6.4–6.6 MB/route and passes; with `THEMVORA_MAX_RETAINED_MB_PER_ROUTE=1` it fails with the diagnostic message.
- Where the platform gives no cheap way to read another process's RSS, the guard **skips** rather than fails — a missing measurement is not a regression.

### L.10 What remains: the index is shipped as a client prop

The layout passes the index to a client component:

```tsx
<SearchProvider entries={getSearchEntries()}>
```

so React's Flight serializer writes the entire index (~3 MB) into the RSC payload on **every request**, and retains the serialized rows in `writtenObjects` until the request's context is released. The post-fix retainer chain shows exactly this:

```
string → Object."text" → WeakMap "writtenObjects" → object:ey
       → Context → closure:pull → CallSiteInfo
```

Measured directly: replacing the prop with `[]` and rebuilding drops retention to **+54/+63/+61 MB per 20-request pass (~3.0 MB/route)**, with RSS flat at ~250 MB across 60 requests.

So the remaining cost is structural, not a bug in the fix: **the whole search corpus is serialised into every page response.** Fixing it properly means not shipping the index as a prop — serving it as a static asset and fetching it when the search dialog opens, or shipping titles/routes and fetching text on demand. Both change how search loads, so this is recorded as a decision rather than implemented here.

### L.11 Verification on the repository build

| Check | Result |
| --- | --- |
| `pnpm docs:release-gate` | **PASSED** (static tier, 18 checks) |
| `pnpm docs:release-gate:browser` | **PASSED** — "All docs gates passed" |
| `node scripts/docs/audits/audit-browser-smoke.mjs --strict` | **170/170 routes, 0 failures**, memory guard 6.6 MB/route |
| `pnpm docs:release-gate:full` | **Blocked at the `next build` step by an environment fault — see below** |

**Environment note, not a repo defect.** On this host, `next build` (webpack) intermittently aborts with:

```
uncaughtException [Error: EPERM: operation not permitted, open '…\apps\docs\.next\trace']
```

It occurred before this pass's changes, in a clean temporary directory as well as in the repo, and while no `next dev` was running. Plain `fs` operations on the same path succeed immediately (`open a`, `open w`, `append`, `rename` all OK), and the Turbopack build of the same tree succeeds consistently — so the failure is inside the webpack build's trace write, not in the filesystem or the app. The full tier therefore could not be completed on this machine; the static tier, the browser tier and audit H were each verified independently on the built app.

Because of this, the A/B numbers above were produced on **Turbopack** builds of the same source. That is a fair comparison — the pre-fix Turbopack build reproduced the original webpack measurement almost exactly (567 → 2526 MB, against the 567 → 2526 MB recorded during the release-gate investigation) — but it is stated so the numbers are not over-read.

### L.12 Files changed

| File | Change |
| --- | --- |
| `apps/docs/app/layout.tsx` | Search index built once per process in production; `cache()` retained in development |
| `scripts/docs/audits/audit-browser-smoke.mjs` | Retained-memory probe and ceiling; `--retention-only`; `THEMVORA_DOCS_SITE` override |

Nothing else was modified. Package versions, peer ranges, the release matrix, the dependency updates, the CI pins, the token baseline, the homepage design and the public APIs are untouched.

### L.13 Recommended deployment configuration

Until §L.10 is addressed, the docs server retains roughly **6 MB per rendered request** (down from ~13.5). Practical consequences:

- A single-process `next start` reaches the default 4 GB heap after roughly **600 rendered requests**, not 250. Long-lived instances should still be restarted on a rolling cadence, and the process should run under a supervisor that restarts on OOM.
- The per-request payload includes the search index (~3 MB), so responses are large and largely identical. A CDN in front of static pages mitigates bandwidth but not server memory, because these routes are dynamic.
- If the server must stay up under sustained traffic, prioritise §L.10 — it removes about half of the remaining growth and most of the payload.

### L.14 Remaining risks

1. **Unbounded, but half as steep.** No plateau yet; the remaining slope is the per-request serialisation of the search index (§L.10).
2. **The fix depends on `NODE_ENV === "production"`.** A server started with `NODE_ENV` unset falls back to the per-request path. That is deliberate — it keeps development correct — but it means the guard matters: audit H's memory probe is the thing that would catch a misconfigured deployment.
3. **Webpack `next build` is unreliable on this host.** Unrelated to this work, but it blocks the full gate here; worth reproducing on CI before assuming the full tier is green.
