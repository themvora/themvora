/**
 * Unit tests for the docs navigation tree.
 *
 * Run: pnpm --filter @themvora/docs nav:test
 *
 * The tree is also covered end-to-end by `scripts/probe-docs-nav.mjs`; these
 * tests pin the pure route-matching and ancestor rules that make the browser
 * behavior possible.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  DOCS_NAV,
  collectDocsNavLinks,
  getActiveNavAncestorIds,
  isDocsNavLinkActive,
  resolveExpandedNavIds,
} from "../lib/docs-nav.ts";
import { DOCS_ROUTES } from "../lib/docs-routes.ts";
import { resolveDocsContentWidth } from "../lib/docs-content-width.ts";

const links = collectDocsNavLinks();

function linkTo(href) {
  const found = links.find((item) => item.href === href);
  assert.ok(found, `no navigation link for ${href}`);
  return found;
}

function groups() {
  const out = [];
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.kind === "group") {
        out.push(node);
        walk(node.children);
      }
    }
  };
  for (const section of DOCS_NAV) walk(section.children);
  return out;
}

test("exact links do not leak into nested routes", () => {
  assert.equal(isDocsNavLinkActive("/quick-start", linkTo("/quick-start")), true);
  assert.equal(isDocsNavLinkActive("/framework-guides/react", linkTo("/framework-guides/react")), true);
  assert.equal(
    isDocsNavLinkActive("/framework-guides/react/examples", linkTo("/framework-guides/react")),
    false,
    "the guide must not stay current on its examples page",
  );
  assert.equal(
    isDocsNavLinkActive("/framework-guides/react/examples", linkTo("/framework-guides/react/examples")),
    true,
  );
});

test("prefix links keep their section index current", () => {
  assert.equal(isDocsNavLinkActive("/api-reference", linkTo("/api-reference")), true);
  assert.equal(isDocsNavLinkActive("/api-reference/core", linkTo("/api-reference")), true);
  assert.equal(isDocsNavLinkActive("/blog/hello-world", linkTo("/blog")), true);
  assert.equal(isDocsNavLinkActive("/recipes/hero", linkTo("/recipes")), true);
});

test("route matching is boundary safe and ignores hash/query/trailing slash", () => {
  assert.equal(isDocsNavLinkActive("/framework-guides/react-extra", linkTo("/framework-guides/react")), false);
  assert.equal(isDocsNavLinkActive("/quick-start/", linkTo("/quick-start")), true);
  assert.equal(isDocsNavLinkActive("/blog/a", linkTo("/blog")), true);
  assert.equal(isDocsNavLinkActive("/blogroll", linkTo("/blog")), false);
  assert.equal(isDocsNavLinkActive("/quick-start#install", linkTo("/quick-start")), true);
  assert.equal(isDocsNavLinkActive("/quick-start?x=1", linkTo("/quick-start")), true);
});

test("active ancestors open every parent in order", () => {
  assert.deepEqual(getActiveNavAncestorIds("/framework-guides/react/examples"), [
    "frameworks",
    "fw-react",
  ]);
  assert.deepEqual(getActiveNavAncestorIds("/cli/generate"), ["cli", "cli-commands"]);
  assert.deepEqual(getActiveNavAncestorIds("/tokens/code"), ["foundations", "tokens"]);
  assert.deepEqual(getActiveNavAncestorIds("/libraries/shadcn"), ["packages", "libraries", "lib-shadcn"]);
  assert.deepEqual(getActiveNavAncestorIds("/libraries/shadcn/examples"), ["packages", "libraries", "lib-shadcn"]);
  assert.deepEqual(getActiveNavAncestorIds("/packages/core"), ["packages"]);
});

test("the active trail is open and unrelated defaults stay closed", () => {
  assert.deepEqual(resolveExpandedNavIds("/quick-start"), ["getting-started"]);
  assert.deepEqual(resolveExpandedNavIds("/framework-guides/react"), [
    "frameworks",
    "fw-react",
  ]);
  assert.deepEqual(resolveExpandedNavIds("/framework-guides/react/examples"), [
    "frameworks",
    "fw-react",
  ]);
});

test("manual expansion layers on top of the active trail", () => {
  const expanded = new Set(
    resolveExpandedNavIds("/framework-guides/vue", ["getting-started"]),
  );
  assert.ok(expanded.has("getting-started"));
  assert.ok(expanded.has("frameworks"));
  assert.ok(expanded.has("fw-vue"));
  assert.ok(!expanded.has("fw-react"), "a previously active framework does not linger");
});

test("unknown routes open nothing automatically", () => {
  assert.deepEqual(getActiveNavAncestorIds("/not-a-docs-page"), []);
  assert.deepEqual(resolveExpandedNavIds("/not-a-docs-page"), []);
});

test("every docs route is reachable from the tree", () => {
  const navHrefs = new Set(links.map((item) => item.href));
  for (const route of DOCS_ROUTES) {
    assert.ok(navHrefs.has(route.href), `${route.href} is missing from lib/docs-nav.ts`);
  }
});

test("the tree adds no links outside the canonical route list", () => {
  const routeHrefs = new Set(DOCS_ROUTES.map((route) => route.href));
  for (const item of links) {
    assert.ok(routeHrefs.has(item.href), `${item.href} is linked but missing from lib/docs-routes.ts`);
  }
});

test("no duplicate destinations and no duplicate group ids", () => {
  const hrefs = links.map((item) => item.href);
  assert.equal(new Set(hrefs).size, hrefs.length, "duplicate navigation destination");

  const ids = groups().map((group) => group.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate group id");
});

test("every node has a readable label and every section a heading", () => {
  for (const section of DOCS_NAV) {
    assert.ok(section.heading.trim().length > 0, `section ${section.id} has no heading`);
    assert.ok(section.children.length > 0, `section ${section.id} is empty`);
  }
  for (const item of links) {
    assert.ok(item.label.trim().length > 0, `${item.href} has no label`);
  }
  for (const group of groups()) {
    assert.ok(group.label.trim().length > 0, `group ${group.id} has no label`);
    assert.ok(group.children.length > 0, `group ${group.id} is empty`);
  }
});

test("framework examples are nested under their guide", () => {
  for (const route of DOCS_ROUTES.filter(
    (item) => item.href.startsWith("/framework-guides/") && item.href.endsWith("/examples"),
  )) {
    const guideHref = route.href.replace(/\/examples$/, "");
    const guide = groups().find((group) => group.label && group.children.some((child) => child.kind === "link" && child.href === guideHref));
    assert.ok(guide, `${guideHref} has no group`);
    assert.ok(
      guide.children.some((child) => child.kind === "link" && child.href === route.href),
      `${route.href} is not a child of ${guideHref}`,
    );
    // Most guides are one group deep; Remix and React Router sit inside the
    // shared "Remix" group, so the trail must end at the guide's own group
    // rather than assuming a fixed depth.
    const trail = getActiveNavAncestorIds(route.href);
    assert.equal(trail[0], "frameworks");
    assert.equal(trail.at(-1), guide.id);
    assert.ok(trail.length >= 2, `${route.href} has no group trail`);
  }
});

test("Remix groups Remix v2 and React Router under one framework entry", () => {
  assert.deepEqual(getActiveNavAncestorIds("/framework-guides/remix"), [
    "frameworks",
    "fw-remix",
    "fw-remix-v2",
  ]);
  assert.deepEqual(getActiveNavAncestorIds("/framework-guides/remix/examples"), [
    "frameworks",
    "fw-remix",
    "fw-remix-v2",
  ]);
  assert.deepEqual(getActiveNavAncestorIds("/framework-guides/remix/react-router"), [
    "frameworks",
    "fw-remix",
    "fw-react-router",
  ]);
  assert.deepEqual(
    getActiveNavAncestorIds("/framework-guides/remix/react-router/examples"),
    ["frameworks", "fw-remix", "fw-react-router"],
  );
});

test("content width policy resolves route families", () => {
  assert.equal(resolveDocsContentWidth("/core-concepts"), "standard");
  assert.equal(resolveDocsContentWidth("/troubleshooting"), "standard");
  assert.equal(resolveDocsContentWidth("/blog/a-post"), "standard");
  assert.equal(resolveDocsContentWidth("/quick-start"), "wide");
  assert.equal(resolveDocsContentWidth("/framework-guides/react"), "wide");
  assert.equal(resolveDocsContentWidth("/framework-guides/react/examples"), "wide");
  assert.equal(resolveDocsContentWidth("/cli/generate"), "wide");
  assert.equal(resolveDocsContentWidth("/api-reference"), "full");
  assert.equal(resolveDocsContentWidth("/api-reference/core"), "full");
  assert.equal(resolveDocsContentWidth("/reference/compatibility"), "full");
  assert.equal(resolveDocsContentWidth("/packages/core"), "full");
  assert.equal(resolveDocsContentWidth("/tokens/code"), "full");
  assert.equal(resolveDocsContentWidth("/libraries/shadcn"), "full");
  assert.equal(resolveDocsContentWidth("/not-a-docs-page"), "wide");
});
