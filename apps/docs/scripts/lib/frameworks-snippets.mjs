/**
 * Reads the Web Components snippets out of `lib/frameworks.tsx`.
 *
 * The guide pages, the quick-start page and `content/framework-guides.md` all
 * render from that one array, so a snippet's *text* is the documentation. The
 * guards around it (`check-quickstart-snippets.mjs`, `check-web-consumer.mjs`)
 * need the same text, and neither can import a `.tsx` module directly.
 *
 * This module is the one place that turns the array into `{ title, code }`
 * pairs, so a guard cannot drift from the source by parsing it differently.
 * It reads the file as text rather than evaluating it: the array is a literal,
 * and the only non-literal values are `icons.<name>` (stubbed) and two shared
 * `const` strings.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The text between the opening backtick of a `const NAME = \`…\`;`. */
export function canonicalStyles(frameworksSrc) {
  const marker = "export const CANONICAL_STYLES = `";
  const start = frameworksSrc.indexOf(marker);
  if (start === -1) throw new Error("could not locate CANONICAL_STYLES");
  const bodyStart = start + marker.length;
  const end = frameworksSrc.indexOf("`;", bodyStart);
  if (end === -1) throw new Error("could not find the end of CANONICAL_STYLES");
  return frameworksSrc.slice(bodyStart, end);
}

/**
 * The source text of one framework entry: from `slug: "<slug>"` to the next
 * entry's `slug:` (or the end of the array).
 */
export function entrySource(frameworksSrc, slug, nextSlug) {
  const start = frameworksSrc.indexOf(`slug: "${slug}"`);
  if (start === -1) throw new Error(`could not locate slug "${slug}"`);
  const end = nextSlug
    ? frameworksSrc.indexOf(`slug: "${nextSlug}"`, start)
    : frameworksSrc.indexOf("\n];", start);
  if (end === -1) throw new Error(`could not find the end of slug "${slug}"`);
  return frameworksSrc.slice(start, end);
}

/**
 * `{ title, code }` for a snippet whose `code:` is either a backtick literal or
 * `CANONICAL_STYLES`.
 *
 * Reading a reference as if it were a literal silently attributes the *next*
 * snippet's code to this one, which makes every downstream check vacuous — so
 * an unresolvable `code:` throws instead of guessing.
 */
export function snippetAt(src, at, label, styles) {
  const codeIdx = src.indexOf("code:", at);
  if (codeIdx === -1) throw new Error(`no "code:" property for ${label}`);
  const titleMatch = src.slice(at, codeIdx).match(/title:\s*"([^"]*)"/);
  if (!titleMatch) throw new Error(`no "title:" for ${label}`);

  const rest = src.slice(codeIdx + "code:".length);
  const literal = rest.match(/^\s*`([\s\S]*?)`/);
  if (literal) return { title: titleMatch[1], code: literal[1] };

  const identifier = rest.match(/^\s*([A-Za-z_$][\w$]*)/);
  if (identifier?.[1] === "CANONICAL_STYLES") {
    return { title: titleMatch[1], code: styles };
  }
  throw new Error(`unresolvable "code:" for ${label} (not a literal or CANONICAL_STYLES)`);
}

/** `{ title, code }` for a `slot: { … }` block inside an entry. */
export function slot(src, name, styles) {
  const at = src.indexOf(`\n    ${name}: {`);
  if (at === -1) throw new Error(`slot "${name}" not found`);
  return snippetAt(src, at, name, styles);
}

/** Every Web Components snippet the guides render, keyed by a readable label. */
export function readWebSnippets(repoRoot) {
  const frameworksSrc = readFileSync(
    join(repoRoot, "apps", "docs", "lib", "frameworks.tsx"),
    "utf8",
  );
  const styles = canonicalStyles(frameworksSrc);
  const web = entrySource(frameworksSrc, "web", "tailwind");
  return {
    styles,
    quickStart: slot(web, "quickStart", styles),
    setupExtra: slot(web, "setupExtra", styles),
    noTheme: slot(web, "noTheme", styles),
    snippet: slot(web, "snippet", styles),
    snippet2: slot(web, "snippet2", styles),
    snippet3: slot(web, "snippet3", styles),
  };
}
