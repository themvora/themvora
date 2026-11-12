#!/usr/bin/env node
/**
 * Regression tests for the CSS snippet audit.
 *
 * The check must catch invalid unit spacing without turning valid CSS,
 * comments, strings or non-CSS code blocks into failures.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  extractCssSnippets,
  findInvalidUnitSpacing,
  isCssSnippet,
} from "../lib/css-snippets.mjs";

test("accepts conventional CSS unit syntax", () => {
  const css = `.card {
  gap: 10px;
  max-width: 22rem;
  border: 1px solid var(--theme-color-border);
  margin: 0.5em auto;
  width: 100%;
}`;
  assert.deepEqual(findInvalidUnitSpacing(css), []);
});

test("reports whitespace between a number and its unit", () => {
  const issues = findInvalidUnitSpacing(`.card {
  gap: 10 px;
  max-width: 22 rem;
  border: 1 px solid;
}`);
  assert.deepEqual(
    issues.map((issue) => issue.value),
    ["10 px", "22 rem", "1 px"],
  );
});

test("accepts negative units without whitespace and reports spaced ones", () => {
  assert.deepEqual(findInvalidUnitSpacing(`.x { margin: -10px; }`), []);
  const spaced = findInvalidUnitSpacing(`.x { margin: -10 px; }`);
  assert.equal(spaced.length, 1);
  assert.equal(spaced[0].value, "-10 px");
});

test("accepts decimal units without whitespace and reports spaced ones", () => {
  assert.deepEqual(findInvalidUnitSpacing(`.x { line-height: 1.5rem; }`), []);
  const spaced = findInvalidUnitSpacing(`.x { line-height: 1.5 rem; }`);
  assert.equal(spaced.length, 1);
  assert.equal(spaced[0].value, "1.5 rem");
});

test("ignores CSS comments", () => {
  const css = `/* gap: 10 px; max-width: 22 rem; */
.x { gap: 10px; }`;
  assert.deepEqual(findInvalidUnitSpacing(css), []);
});

test("checks CSS custom properties", () => {
  const issues = findInvalidUnitSpacing(`:root { --card-gap: 2 rem; }`);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].property, "--card-gap");
});

test("ignores quoted strings that contain units", () => {
  const css = `.x::after { content: "10 px"; }`;
  assert.deepEqual(findInvalidUnitSpacing(css), []);
});

test("does not inspect non-CSS snippets", () => {
  const source = `
const docs = {
  title: "example.ts",
  lang: "ts",
  code: \`const gap = "10 px";\`,
};
const css = {
  title: "style.css",
  lang: "css",
  code: \`.x { gap: 10 px; }\`,
};
`;
  const snippets = extractCssSnippets("docs.ts", source);
  assert.equal(snippets.length, 1);
  assert.equal(snippets[0].lang, "css");
  assert.equal(findInvalidUnitSpacing(snippets[0].code).length, 1);
});

test("reads fenced Markdown CSS and ignores other fences", () => {
  const markdown = `
\`\`\`ts
const gap = "10 px";
\`\`\`

\`\`\`css
.x { gap: 10 px; }
\`\`\`
`;
  const snippets = extractCssSnippets("guide.md", markdown);
  assert.equal(snippets.length, 1);
  assert.equal(snippets[0].lang, "css");
  assert.equal(findInvalidUnitSpacing(snippets[0].code).length, 1);
});

test("recognises CSS by language or declared filename", () => {
  assert.equal(isCssSnippet({ lang: "css" }), true);
  assert.equal(isCssSnippet({ lang: "ts", title: "style.css" }), true);
  assert.equal(isCssSnippet({ lang: "ts", title: "app.ts" }), false);
});
