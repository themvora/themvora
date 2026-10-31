import {
  createHighlighterCoreSync,
  type ThemeRegistrationAny,
} from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

import js from "shiki/langs/javascript.mjs";
import ts from "shiki/langs/typescript.mjs";
import jsx from "shiki/langs/jsx.mjs";
import tsx from "shiki/langs/tsx.mjs";
import bash from "shiki/langs/bash.mjs";
import sh from "shiki/langs/shellscript.mjs";
import json from "shiki/langs/json.mjs";
import css from "shiki/langs/css.mjs";
import html from "shiki/langs/html.mjs";
import md from "shiki/langs/markdown.mjs";
import vue from "shiki/langs/vue.mjs";
import svelte from "shiki/langs/svelte.mjs";
import astro from "shiki/langs/astro.mjs";
import yaml from "shiki/langs/yaml.mjs";
import diff from "shiki/langs/diff.mjs";

// A single "theme" whose colors are themvora CSS variables. That way the
// exact same markup renders with the active theme's tokens — it follows the
// user's theme (light, dark, preset, brand, scoped, whatever) instead of a
// hardcoded GitHub palette, so syntax stays readable on every surface. The
// concrete colors live in globals.css under `--tv-syntax-*` (one place to
// tweak), and `--tv-code-bg` keeps the code surface subtly on-top of the
// theme's `muted`/`background` tokens.
const themvoraSyntaxTheme = {
  name: "themvora",
  type: "light", // palette is CSS variables, so mode is irrelevant
  fg: "var(--tv-syntax-plain)",
  bg: "var(--tv-code-bg)",
  colors: {},
  tokenColors: [
    // Comments & docs
    {
      scope: ["comment", "punctuation.definition.comment", "markup.quote"],
      settings: { foreground: "var(--tv-syntax-comment)", fontStyle: "italic" },
    },

    // Keywords, control flow, storage modifiers
    {
      scope: [
        "keyword",
        "keyword.control",
        "keyword.control.conditional",
        "keyword.control.loop",
        "keyword.control.import",
        "keyword.control.flow",
        "keyword.other",
        "storage",
        "storage.modifier",
        "storage.type",
        "variable.language",
        "constant.language",
        "keyword.operator.expression",
      ],
      settings: { foreground: "var(--tv-syntax-keyword)", fontStyle: "bold" },
    },

    // Operators & punctuation that aren't keywords stay plain-ish but get a
    // dedicated tone so they don't compete with identifiers.
    {
      scope: ["keyword.operator", "punctuation.separator", "punctuation.delimiter"],
      settings: { foreground: "var(--tv-syntax-operator)" },
    },

    // Strings, templates, escapes, interpolations
    {
      scope: [
        "string",
        "string.quoted",
        "string.quoted.single",
        "string.quoted.double",
        "string.quoted.triple",
        "string.template",
        "string.interpolated",
        "string.regexp",
        "string.other",
        "string.escape",
        "constant.character.escape",
        "constant.character.entity",
        "punctuation.definition.string",
        "punctuation.definition.template-expression",
      ],
      settings: { foreground: "var(--tv-syntax-string)" },
    },

    // Functions, methods, property accessors
    {
      scope: [
        "entity.name.function",
        "entity.name.method",
        "support.function",
        "meta.function-call",
        "meta.method-call",
        "variable.function",
        "support.macro",
        "parameter.function-call",
      ],
      settings: { foreground: "var(--tv-syntax-function)" },
    },

    // Types, classes, interfaces, structs, enums, tags
    {
      scope: [
        "entity.name.type",
        "entity.name.class",
        "entity.name.struct",
        "entity.name.interface",
        "entity.name.enum",
        "support.type",
        "entity.other.inherited-class",
        "meta.type",
      ],
      settings: { foreground: "var(--tv-syntax-type)" },
    },

    // HTML / JSX / Vue / Astro tags — tag name plus the surrounding angle
    // brackets, so markup reads as markup instead of blending into the code.
    {
      scope: [
        "entity.name.tag",
        "entity.name.tag.block",
        "entity.name.tag.other",
        "punctuation.definition.tag",
        "punctuation.definition.tag.begin",
        "punctuation.definition.tag.end",
      ],
      settings: { foreground: "var(--tv-syntax-tag)" },
    },

    // HTML / JSX attribute names get a softer but distinct tone.
    {
      scope: [
        "entity.other.attribute-name",
        "entity.other.attribute-name.html",
        "entity.other.attribute-name.jsx",
      ],
      settings: { foreground: "var(--tv-syntax-attr)" },
    },

    // Variables, properties, and generic identifiers keep the default
    // foreground but bindings get a subtle distinct tone.
    {
      scope: ["variable", "variable.other", "variable.parameter"],
      settings: { foreground: "var(--tv-syntax-variable)" },
    },
    {
      scope: ["variable.object.property", "variable.other.property", "meta.property"],
      settings: { foreground: "var(--tv-syntax-property)" },
    },

    // Numbers & generic constants (true/false/null are handled as keywords
    // via `constant.language` above)
    {
      scope: [
        "constant.numeric",
        "constant.numeric.integer",
        "constant.numeric.float",
        "constant.character",
      ],
      settings: { foreground: "var(--tv-syntax-number)" },
    },

    // Markup (markdown / html / astro inline markup)
    {
      scope: ["markup.heading", "markup.bold", "markup.link", "markup.inserted"],
      settings: { foreground: "var(--tv-syntax-keyword)", fontStyle: "bold" },
    },
    {
      scope: ["markup.italic"],
      settings: { foreground: "var(--tv-syntax-plain)", fontStyle: "italic" },
    },
    {
      scope: ["markup.fenced_code", "markup.raw", "markup.inline.raw", "markup.code"],
      settings: { foreground: "var(--tv-syntax-plain)" },
    },

    // Diff lines get their own dedicated tones so + / - / ! jumps out.
    {
      scope: ["markup.inserted", "diff.inserted"],
      settings: { foreground: "var(--tv-syntax-diff-add)" },
    },
    {
      scope: ["markup.deleted", "diff.deleted"],
      settings: { foreground: "var(--tv-syntax-diff-remove)" },
    },
    {
      scope: ["diff.header", "meta.diff.header"],
      settings: { foreground: "var(--tv-syntax-keyword)", fontStyle: "bold" },
    },

    // Errors / deprecated are the only tokens that deliberately leave the
    // brand palette, so mistakes stay unmistakable.
    {
      scope: ["invalid", "invalid.illegal"],
      settings: { foreground: "var(--tv-syntax-danger)" },
    },
  ],
};

const highlighter = createHighlighterCoreSync({
  // An empty `settings` array makes Shiki strip per-token `tokenColors`, so we
  // omit it and assert the raw shape (TextMate themes don't require `settings`).
  themes: [themvoraSyntaxTheme as unknown as ThemeRegistrationAny],
  langs: [js, ts, jsx, tsx, bash, sh, json, css, html, md, vue, svelte, astro, yaml, diff],
  engine: createJavaScriptRegexEngine(),
});

const ALIASES: Record<string, string> = {
  tsx: "tsx",
  ts: "typescript",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  sh: "shellscript",
  shell: "shellscript",
  zsh: "shellscript",
  bash: "bash",
  console: "bash",
  terminal: "bash",
  json: "json",
  jsonc: "json",
  css: "css",
  scss: "css",
  html: "html",
  md: "markdown",
  markdown: "markdown",
  vue: "vue",
  svelte: "svelte",
  astro: "astro",
  yaml: "yaml",
  yml: "yaml",
  diff: "diff",
  text: "text",
};

const FALLBACK = "text";

export type HighlightOptions = {
  /** 1-based line numbers to visually highlight. */
  highlightLines?: Set<number>;
  /** Class(es) to append to the root `<pre>` element. */
  preClassName?: string;
};

/**
 * The one transformer every highlighted block goes through.
 *
 * It does exactly one thing: mark the lines a fence asked to highlight. It
 * deliberately does **not** wrap each line in a gutter and a `.line-code` body.
 *
 * That wrapper used to exist, and it was the only reason a code block needed to
 * reserve a left column. Removing it here — rather than hiding `.line-number` in
 * CSS — is what makes the code start at the normal content alignment: there is no
 * span to hide and no width to leave behind, and the copied source is the source
 * the highlighter was given.
 *
 * Numbering was also the reason a short snippet and a long one looked different:
 * the gutter appeared only past five lines, so identical snippets spaced their
 * lines differently depending on length.
 */
function themvoraTransformer({ highlightLines }: { highlightLines: Set<number> }) {
  return {
    name: "themvora:syntax",

    line(element: any, lineNo: number) {
      if (!highlightLines.has(lineNo)) return;
      // Shiki writes the line's class as `properties.class`, not `className`.
      // Assigning `className` added a *second* `class` attribute, and an HTML
      // parser keeps the first one — so the mark never reached the DOM. Merging
      // into the existing value is what makes `.highlighted` real.
      const existing = element.properties?.class;
      const classes = Array.isArray(existing)
        ? existing
        : String(existing ?? "")
            .split(/\s+/)
            .filter(Boolean);
      element.properties.class = [...classes, "highlighted"];
    },
  };
}

export function highlightCode(code: string, lang?: string, options?: HighlightOptions): string {
  const language = lang
    ? (ALIASES[lang.toLowerCase()] ?? lang.toLowerCase())
    : FALLBACK;

  const highlightLines = options?.highlightLines ?? new Set<number>();

  const html = highlighter.codeToHtml(code, {
    lang: language,
    theme: "themvora",
    transformers: [themvoraTransformer({ highlightLines })],
  });

  return html;
}
